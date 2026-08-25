/**
 * Parity tests against the original PSYFR1 build.
 *
 * Every expected value here was read out of the ORIGINAL engine running in a
 * browser (see docs/reverse/15-live-engine-extraction.md), not derived from this
 * code. If one of these fails, the rewrite has drifted.
 *
 *   node --test tests/
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { jdn, jdToDate, fmtYear, isPalindrome, mod } from '../src/core/jdn.js';
import { compileOperation, oph_flip } from '../src/core/equation/index.js';
import { cast } from '../src/core/cast.js';
import { findConvergences } from '../src/core/convergence.js';
import { phoenixInfo, nemesisInfo, nerInfo, am, lcYear } from '../src/core/cycles.js';
import { eclipseNear, coverage } from '../src/core/eclipses.js';
import { DEFAULT_OPS, PACKS } from '../src/data/packs.js';
import { MSRF } from '../src/data/msrf.js';
import { LEDGER, EVENT_YEARS } from '../src/data/ledger.js';

/** The reference build hardcoded 2026 as "today"; pin it so tests never drift. */
const REF_YEAR = 2026;

const GOLDEN_ANCHORS = [
  { enabled: true, label: 'Great Flood', jd: jdn(-2238, 5, 15) },
  { enabled: true, label: 'Today', jd: jdn(2026, 8, 25) },
  { enabled: true, label: 'Phoenix 2040', jd: jdn(2040, 5, 15) },
];

const goldenOps = () =>
  DEFAULT_OPS.map((eq) => {
    const c = compileOperation(eq);
    return { enabled: true, eq, start: c.start, fn: c.fn };
  });

/* ------------------------------------------------------------------ calendar */

test('JDN matches the reference for the three golden anchors', () => {
  assert.equal(jdn(-2238, 5, 15), 903782, 'Great Flood, 2239 BC');
  assert.equal(jdn(2026, 8, 25), 2461278, 'Today');
  assert.equal(jdn(2040, 5, 15), 2466290, 'Phoenix 2040');
});

test('JDN round-trips through jdToDate', () => {
  for (const [y, m, d] of [
    [-5238, 5, 15],
    [-2238, 5, 15],
    [1, 1, 1],
    [1582, 10, 15],
    [2026, 8, 25],
    [2178, 5, 15],
  ]) {
    const back = jdToDate(jdn(y, m, d));
    assert.deepEqual(back, { year: y, month: m, day: d }, `${y}-${m}-${d}`);
  }
});

test('astronomical years display with the right era', () => {
  assert.equal(fmtYear(-2238), '2239 BC');
  assert.equal(fmtYear(0), '1 BC');
  assert.equal(fmtYear(2026), '2026 CE');
});

test('mod is always non-negative', () => {
  assert.equal(mod(-1, 138), 137);
  assert.equal(mod(-138, 138), 0);
});

test('palindromes need two or more digits', () => {
  assert.equal(isPalindrome(7), false);
  assert.equal(isPalindrome(22), true);
  assert.equal(isPalindrome(19138), false);
  assert.equal(isPalindrome(831138), true, '831138 reads the same both ways');
  assert.equal(isPalindrome(2112), true);
});

/* ----------------------------------------------------------------- equations */

test('oph_flip keeps the decimal point at its original index', () => {
  assert.equal(oph_flip(123), 321);
  assert.equal(oph_flip(120), 21, 'leading zero collapses');
  // The point is re-inserted at index 2 of the REVERSED digits ("521" -> "52.1"),
  // which is why this is not simply 5.21.
  assert.equal(oph_flip(12.5), 52.1);
  assert.equal(oph_flip(1000), 1);
  assert.equal(oph_flip(0), 0);
});

test('every shipped operation compiles', () => {
  for (const eq of new Set(Object.values(PACKS).flat())) {
    assert.doesNotThrow(() => compileOperation(eq), `${eq} should compile`);
  }
});

test('operation outputs match the reference engine exactly', () => {
  // Captured from the original build; see spec 15.
  const cases = [
    ['X2+oph_round(Y)', 5012, 5012],
    ['X2+oph_flip(oph_round(Y))', 5012, 2105],
    ['X2+Y/OPH_PHI', 1000, 618.0339887498548],
    ['X1+(Y/2)*OPH_PI', 1000, 1570],
    ['X2+Y/OPH_CRV', 1000, 196.8503937007874],
    ['X1+Y*360/365.2422', 5012, 4940.064428480608],
    ['X1+oph_round(Y/19)*19', 1562508, 1562503],
    ['X2+oph_round(Y/OPH_PHI/OPH_PHI)', 1557496, 594911],
    ['X1+oph_flip(oph_round(Y/OPH_PHI))', 1562508, 386569],
    ['X1+Y-138', 7, -131],
  ];
  for (const [eq, Y, expected] of cases) {
    assert.equal(compileOperation(eq).fn(Y), expected, `${eq} at Y=${Y}`);
  }
});

test('the X1+/X2+ prefix selects the base anchor', () => {
  assert.equal(compileOperation('X1+Y').start, 'X1');
  assert.equal(compileOperation('X2+Y').start, 'X2');
});

test('x and × are multiplication, as the original wrote them', () => {
  assert.equal(compileOperation('X2+YxOPH_PHI').fn(1000), compileOperation('X2+Y*OPH_PHI').fn(1000));
  assert.equal(compileOperation('X2+Y×2').fn(21), 42);
});

test('malformed equations are rejected, not executed', () => {
  const bad = [
    'Y+1', // no anchor prefix
    'X3+Y', // unknown anchor
    'X1+', // empty body
    'X1+Y+', // dangling operator
    'X1+(Y', // unclosed paren
    'X1+fetch(Y)', // unknown name
    'X1+Y;alert(1)', // statement injection
    'X1+globalThis', // unknown name
    'X1+oph_round', // function without argument
    'X1+Y/0', // non-finite
  ];
  for (const eq of bad) {
    assert.throws(() => compileOperation(eq), `${eq} must be rejected`);
  }
});

test('multi-argument functions parse and evaluate', () => {
  assert.equal(compileOperation('X1+oph_mod(Y,138)').fn(1000), 34);
  assert.equal(compileOperation('X1+oph_mod(-Y,138)').fn(1), 137, 'remainder stays non-negative');
  assert.equal(compileOperation('X1+oph_pow(Y,2)').fn(12), 144);
  assert.equal(compileOperation('X1+oph_gcd(Y,138)').fn(1656), 138);
  assert.equal(compileOperation('X1+oph_lcm(Y,19)').fn(138), 2622);
  assert.equal(compileOperation('X1+oph_snap(Y,138)').fn(1000), 966);
  assert.equal(compileOperation('X1+oph_atan2(0,1)').fn(0), 0);
});

test('function arity is enforced at compile time', () => {
  assert.throws(() => compileOperation('X1+oph_mod(Y)'), /takes 2 arguments, got 1/);
  assert.throws(() => compileOperation('X1+oph_round(Y,2)'), /takes 1 argument, got 2/);
});

test('the roadmap constants are available and correctly valued', () => {
  assert.equal(compileOperation('X1+OPH_SAROS').fn(0), 6585.3211);
  assert.equal(compileOperation('X1+OPH_SOTHIC').fn(0), 1461);
  assert.equal(compileOperation('X1+OPH_PRECESSION').fn(0), 25772);
  assert.equal(compileOperation('X1+oph_round(OPH_E*1000)').fn(0), 2718);
  // The snap idiom the themed packs are built from, now expressible directly.
  assert.equal(
    compileOperation('X1+oph_snap(Y,138)').fn(5012),
    compileOperation('X1+oph_round(Y/138)*138').fn(5012)
  );
});

test('operator precedence and unary minus behave normally', () => {
  assert.equal(compileOperation('X1+2+3*4').fn(0), 14);
  assert.equal(compileOperation('X1+(2+3)*4').fn(0), 20);
  assert.equal(compileOperation('X1+-Y').fn(5), -5);
  assert.equal(compileOperation('X1+10/2/5').fn(0), 1);
});

/* -------------------------------------------------------------------- cycles */

test('Phoenix nodes land on mod(year,138) === 108', () => {
  assert.equal(phoenixInfo(2040).node, true, '2040 is a Phoenix node');
  assert.equal(phoenixInfo(1902).node, true, '1902 is the previous node');
  assert.equal(phoenixInfo(2178).node, true, '2178 is the next node');
  assert.equal(phoenixInfo(2026).node, false);
  assert.equal(phoenixInfo(2026).last, 1902);
  assert.equal(phoenixInfo(2026).next, 2040);
  assert.equal(phoenixInfo(2026).to, 14, '14 years to the 2040 node');
});

test('Nemesis inner arc and NER nodes', () => {
  assert.equal(nemesisInfo(2046).inner, true);
  assert.equal(nerInfo(1962).off, 0, '1962 opens an NER period');
});

test('Annus Mundi and Long-Count offsets', () => {
  assert.equal(am(2026), 5920);
  assert.equal(lcYear(2026), 5138);
  assert.equal(am(2040), 5934);
});

/* ------------------------------------------------------------------ eclipses */

test('eclipse tables decode to the reference record counts', () => {
  const { min, max } = coverage();
  assert.equal(min, 1721231);
  assert.equal(max, 2817079);
});

test('known eclipse coincidences from the golden cast', () => {
  assert.equal(eclipseNear(2466285, 1).solar, 'P', '2040 CE 5/10 partial solar');
  assert.equal(eclipseNear(2461269, 1).lunar, 'P', '2026 CE 8/16 partial lunar');
  assert.equal(eclipseNear(2468204, 1).solar, 'T', '2045 CE 8/11 total solar');
});

/* ---------------------------------------------------------------------- data */

test('data tables match the reference sizes', () => {
  assert.equal(MSRF.size, 87);
  assert.equal(LEDGER.length, 69);
  assert.equal(EVENT_YEARS.size, 69);
  assert.equal(DEFAULT_OPS.length, 19);
  assert.equal(Object.keys(PACKS).length, 5);
});

/* ------------------------------------------------------- the golden full cast */

test('the golden cast reproduces the reference exactly', () => {
  const results = cast(GOLDEN_ANCHORS, goldenOps(), 'V8', REF_YEAR);

  assert.equal(results.length, 33, '33 projections');

  const row = (r) => ({
    z: `${fmtYear(r.ay)} ${r.m}/${r.d}`,
    jd: r.zjd,
    am: r.am,
    lc: r.lc,
    Y: r.Y,
    op: r.op,
    score: r.score,
    tags: r.tags.map((t) => t[0]).join('|'),
  });

  // The top of the ranked list, captured from the original engine.
  const expected = [
    { z: '2040 CE 5/10', jd: 2466285, am: 5934, lc: 5152, Y: 1562508, op: 'X1+oph_round(Y/19)*19', score: 12, tags: 'PHOENIX NODE|DOCUMENTED|☉ SOLAR partial' },
    { z: '2040 CE 3/4',  jd: 2466218, am: 5934, lc: 5152, Y: 5012,    op: 'X1+Y*360/365.2422',     score: 10, tags: 'PHOENIX NODE|DOCUMENTED' },
    { z: '2040 CE 5/19', jd: 2466294, am: 5934, lc: 5152, Y: 5012,    op: 'X1+oph_round(Y/19)*19', score: 10, tags: 'PHOENIX NODE|DOCUMENTED' },
    { z: '2040 CE 6/3',  jd: 2466309, am: 5934, lc: 5152, Y: 1562508, op: 'X1+Y+19',               score: 10, tags: 'PHOENIX NODE|DOCUMENTED' },
    { z: '2040 CE 6/3',  jd: 2466309, am: 5934, lc: 5152, Y: 5012,    op: 'X1+Y+19',               score: 10, tags: 'PHOENIX NODE|DOCUMENTED' },
    { z: '2046 CE 2/18', jd: 2468395, am: 5940, lc: 5158, Y: 5012,    op: 'X2+oph_flip(oph_round(Y))', score: 7, tags: 'DOCUMENTED|NEMESIS|BAKTUN' },
    { z: '2046 CE 3/9',  jd: 2468414, am: 5940, lc: 5158, Y: 5012,    op: 'X2+oph_flip(Y)+19',     score: 7, tags: 'DOCUMENTED|NEMESIS|BAKTUN' },
    { z: '2026 CE 8/16', jd: 2461269, am: 5920, lc: 5138, Y: 1557496, op: 'X1+oph_round(Y/19)*19', score: 5, tags: 'METONIC·19|138|☾ LUNAR partial' },
    { z: '2026 CE 9/13', jd: 2461297, am: 5920, lc: 5138, Y: 1557496, op: 'X1+Y+19',               score: 4, tags: 'METONIC·19|138' },
    { z: '2045 CE 8/11', jd: 2468204, am: 5939, lc: 5157, Y: 5012,    op: 'X2+oph_round(Y/OPH_PHI/OPH_PHI)', score: 4, tags: 'METONIC·19|☉ SOLAR total' },
    { z: '2882 CE 6/30', jd: 2773870, am: 6776, lc: 5994, Y: 1562508, op: 'X2+Y/OPH_CRV',          score: 4, tags: 'PALINDROME ⮌|NEMESIS' },
    { z: '2866 CE 1/27', jd: 2767872, am: 6760, lc: 5978, Y: 1557496, op: 'X2+Y/OPH_CRV',          score: 3, tags: '≈PHOENIX|NEMESIS' },
  ];

  assert.deepEqual(results.slice(0, expected.length).map(row), expected);
});

test('the same date via a different anchor pair is kept, not deduplicated', () => {
  const results = cast(GOLDEN_ANCHORS, goldenOps(), 'V8', REF_YEAR);
  const both = results.filter((r) => r.zjd === 2466309 && r.op === 'X1+Y+19');
  assert.equal(both.length, 2, 'one per contributing pair');
  assert.deepEqual(both.map((r) => r.Y).sort((a, b) => a - b), [5012, 1562508]);
});

test('convergence finds the reference cluster', () => {
  const results = cast(GOLDEN_ANCHORS, goldenOps(), 'V8', REF_YEAR);
  const conv = findConvergences(results.filter((r) => !r.echo), 0);

  assert.equal(conv.length, 1);
  assert.equal(`${fmtYear(conv[0].ay)} ${conv[0].m}/${conv[0].d}`, '2048 CE 11/7');
  assert.equal(conv[0].nOps, 2);
  assert.equal(conv[0].nPairs, 1);
  assert.equal(conv[0].bestScore, 1);
});

test('the V7 lens reweights the same cast', () => {
  const v8 = cast(GOLDEN_ANCHORS, goldenOps(), 'V8', REF_YEAR);
  const v7 = cast(GOLDEN_ANCHORS, goldenOps(), 'V7', REF_YEAR);
  assert.equal(v7.length, v8.length, 'the projections are identical');
  assert.notDeepEqual(
    v7.map((r) => r.score),
    v8.map((r) => r.score),
    'only the weighting differs'
  );
});

test('disabled anchors and operations are excluded', () => {
  const anchors = GOLDEN_ANCHORS.map((a, i) => ({ ...a, enabled: i !== 2 }));
  const results = cast(anchors, goldenOps(), 'V8', REF_YEAR);
  const pairs = new Set(results.map((r) => `${r.x1}→${r.x2}`));
  assert.equal(pairs.size, 1, 'two anchors leave exactly one pair');
});

test('fewer than two anchors produces nothing', () => {
  assert.equal(cast([GOLDEN_ANCHORS[0]], goldenOps(), 'V8', REF_YEAR).length, 0);
  assert.equal(cast([], goldenOps(), 'V8', REF_YEAR).length, 0);
});
