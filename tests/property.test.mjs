/**
 * Property tests for the equation engine and the scoring arithmetic.
 *
 * The parity fixtures pin known points; these pin the SPACE between them.
 * A seeded generator builds random equation trees, prints each one two ways —
 * fully parenthesised, and with only the parentheses precedence requires —
 * and asserts that compiling the printed string evaluates bit-identically to
 * walking the tree directly. The direct walker below shares no code with the
 * engine's evaluator, so the two agreeing over hundreds of random shapes is a
 * differential check on the tokeniser, the parser, its precedence and
 * associativity, and the evaluator at once.
 *
 * Everything is seeded. A failure prints the equation that caused it, and the
 * run that found it is reproducible forever.
 *
 * NOTE: this is internal-consistency evidence, not agreement with the
 * original binary — the differential-against-the-original claim still rests
 * on the parity fixtures and the golden casts.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compileOperation, EquationError } from '../src/core/equation/index.js';
import { getReckoning } from '../src/core/equation/reckonings.js';
import { scoreZStruct } from '../src/core/ophis/scoring.js';
import { runOphis } from '../src/core/ophis/run.js';
import { makeIsoEvent, makeXDate } from '../src/state/iso-event.js';
import { round2 } from '../src/core/ophis/numeric.js';
import { FILTER_ROWS } from '../src/core/ophis/filters.js';
import { SCORING_SYSTEM } from '../src/core/ophis/constants.js';

/* ------------------------------------------------------------------ PRNG -- */

/** xorshift32 — tiny, seeded, good enough to explore a grammar. */
function prng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

/* ------------------------------------------------------- random equations -- */

const OPHIS = getReckoning('ophis');
const CONSTANT_NAMES = Object.keys(OPHIS.constants);
// oph_exp is excluded by construction: `x` is the multiplication operator, so
// the name cannot survive the lexer. That exclusion is itself asserted below.
const FUNCTION_NAMES = Object.keys(OPHIS.functions).filter((n) => !n.includes('x'));

/** A random expression tree, depth-bounded. */
function genAst(rnd, depth) {
  const leafy = depth <= 0 ? 1 : rnd();
  if (leafy > 0.45) {
    const kind = rnd();
    if (kind < 0.4) return { t: 'var' };
    if (kind < 0.7) {
      // Magnitudes chosen so String(n) never needs an exponent.
      const n = rnd() < 0.5 ? Math.floor(rnd() * 1000) : Math.round(rnd() * 9999) / 100;
      return { t: 'num', v: n };
    }
    return { t: 'const', name: pick(rnd, CONSTANT_NAMES) };
  }
  const kind = rnd();
  if (kind < 0.15) return { t: 'neg', arg: genAst(rnd, depth - 1) };
  if (kind < 0.35) return { t: 'call', name: pick(rnd, FUNCTION_NAMES), arg: genAst(rnd, depth - 1) };
  return {
    t: 'bin',
    op: pick(rnd, ['+', '-', '*', '/']),
    l: genAst(rnd, depth - 1),
    r: genAst(rnd, depth - 1),
  };
}

/**
 * The independent evaluator. Deliberately re-derived from the grammar rather
 * than imported — sharing the engine's walker would make the comparison
 * circular.
 */
function evalAst(node, Y) {
  switch (node.t) {
    case 'num': return node.v;
    case 'var': return Y;
    case 'const': return OPHIS.constants[node.name];
    case 'neg': return -evalAst(node.arg, Y);
    case 'call': return OPHIS.functions[node.name](evalAst(node.arg, Y));
    case 'bin': {
      const l = evalAst(node.l, Y);
      const r = evalAst(node.r, Y);
      if (node.op === '+') return l + r;
      if (node.op === '-') return l - r;
      if (node.op === '*') return l * r;
      return l / r;
    }
    default: throw new Error('unreachable');
  }
}

/** Print with parentheses around everything — exercises the lexer and shapes. */
function printFull(node, rnd) {
  const sp = () => (rnd() < 0.25 ? ' ' : '');
  switch (node.t) {
    case 'num': return String(node.v);
    case 'var': return 'Y';
    case 'const': return node.name;
    case 'neg': return `(-${sp()}${printFull(node.arg, rnd)})`;
    case 'call': return `${node.name}(${sp()}${printFull(node.arg, rnd)}${sp()})`;
    case 'bin': {
      // `x` and `*` are the same operator; alternate them at random.
      const op = node.op === '*' && rnd() < 0.5 ? 'x' : node.op;
      return `(${printFull(node.l, rnd)}${sp()}${op}${sp()}${printFull(node.r, rnd)})`;
    }
    default: throw new Error('unreachable');
  }
}

/**
 * Print with only the parentheses precedence requires — exercises the
 * parser's precedence and left-associativity directly against the tree.
 */
function printMinimal(node) {
  const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const emit = (n, parentPrec, isRight) => {
    switch (n.t) {
      case 'num': return String(n.v);
      case 'var': return 'Y';
      case 'const': return n.name;
      case 'call': return `${n.name}(${emit(n.arg, 0, false)})`;
      case 'neg': {
        const inner = emit(n.arg, 3, false);
        const body = `-${n.arg.t === 'bin' ? `(${inner})` : inner}`;
        // A leading minus binds like a term; parenthesise inside any binary.
        return parentPrec > 0 ? `(${body})` : body;
      }
      case 'bin': {
        const prec = PREC[n.op];
        const body = `${emit(n.l, prec, false)}${n.op}${emit(n.r, prec, true)}`;
        // Lower precedence than the parent always needs parens; equal
        // precedence needs them on the RIGHT for the non-associative pair.
        const needs = prec < parentPrec || (prec === parentPrec && isRight);
        return needs ? `(${body})` : body;
      }
      default: throw new Error('unreachable');
    }
  };
  return emit(node, 0, false);
}

/* -------------------------------------------------------------- the tests -- */

const PROBE_Y = 1000; // what compileOperation smoke-tests with
const Y_SET = [1, 2, 47, 201, 378, 36500, -47];

test('printed trees compile to the tree, 400 shapes x 2 printers x 7 Ys', () => {
  const rnd = prng(0xB0A710);
  let compiled = 0;
  let rejected = 0;

  for (let i = 0; i < 400; i++) {
    const ast = genAst(rnd, 4);
    for (const source of [printFull(ast, rnd), printMinimal(ast)]) {
      const eq = `X${1 + (i % 2)}+${source}`;
      const probe = evalAst(ast, PROBE_Y);

      if (!Number.isFinite(probe)) {
        // The compiler smoke-tests at Y=1000 and must refuse what it cannot
        // evaluate finitely there — a division by zero, a flip gone NaN.
        assert.throws(() => compileOperation(eq, 'ophis'), EquationError, eq);
        rejected += 1;
        continue;
      }

      const op = compileOperation(eq, 'ophis');
      compiled += 1;
      for (const Y of Y_SET) {
        const want = evalAst(ast, Y);
        const got = op.fn(Y);
        assert.ok(Object.is(got, want), `${eq}\n  Y=${Y}: got ${got}, want ${want}`);
      }
    }
  }

  // The generator must actually be exploring both regimes. The bounds are
  // deliberately loose — they exist to catch a generator collapse, not to
  // demand a distribution.
  assert.ok(compiled > 500, `only ${compiled} compiled`);
  assert.ok(rejected >= 5, `only ${rejected} rejected`);
});

test('oph_exp is unlexable by construction, not by accident', () => {
  // `x` is always the multiplication operator, so the name splits.
  assert.throws(() => compileOperation('X1+oph_exp(Y)', 'ophis'), /oph_e/);
});

test('mutated and garbage input either compiles or raises EquationError — 400 strings', () => {
  const rnd = prng(0xF0221);
  const POOL = 'YX12+-*/x×().,oph_roundflipabs OPH_PIHEC_ '.split('');

  for (let i = 0; i < 400; i++) {
    let s;
    if (rnd() < 0.5) {
      // Mutate a valid print: drop, duplicate or swap a character.
      const base = `X1+${printFull(genAst(rnd, 3), rnd)}`;
      const at = Math.floor(rnd() * base.length);
      const mode = rnd();
      s =
        mode < 0.33 ? base.slice(0, at) + base.slice(at + 1)
        : mode < 0.66 ? base.slice(0, at) + base[at] + base.slice(at)
        : base.slice(0, at) + pick(rnd, POOL) + base.slice(at + 1);
    } else {
      s = `X1+${Array.from({ length: 1 + Math.floor(rnd() * 24) }, () => pick(rnd, POOL)).join('')}`;
    }

    try {
      compileOperation(s, 'ophis');
    } catch (e) {
      assert.ok(e instanceof EquationError, `${JSON.stringify(s)} threw ${e.constructor.name}: ${e.message}`);
    }
  }
});

test('scoring invariants hold over 300 random match sets, both systems', () => {
  const rnd = prng(0x5C02E);
  const TIERS = [
    { points: 1, multiplier: 1.5, numbers: [12, 74, 204, 660] },
    { points: 2, multiplier: 2.0, numbers: [84, 153, 306, 612] },
    { points: 2, multiplier: 2.0, numbers: [21.7, 65.3, 326.7] },
  ];

  for (let i = 0; i < 300; i++) {
    const ops = Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => ({
      weight: pick(rnd, [0.5, 1, 1, 2, 3.5]),
    }));
    const opHits = Array.from({ length: 1 + Math.floor(rnd() * 5) }, () => ({
      operation_result: { operation_ordinal: Math.floor(rnd() * ops.length), rotation_count_z: rnd() * 999 },
      y_struct: { x_1_ordinal: 0, x_2_ordinal: 1 },
    }));
    const matches = Array.from({ length: Math.floor(rnd() * 5) }, () => {
      const tier = pick(rnd, TIERS);
      return {
        points: tier.points,
        multiplier: tier.multiplier,
        number: pick(rnd, tier.numbers),
        operation_result: { rotation_count_z: rnd() * 999 },
      };
    });
    const system = rnd() < 0.5 ? SCORING_SYSTEM.GTE_V8 : SCORING_SYSTEM.LTE_V7;

    const z = { operation_match_structs: opHits, resonance_matches: matches.slice() };
    scoreZStruct(z, ops, system);

    const opScore = opHits.reduce((n, m) => n + ops[m.operation_result.operation_ordinal].weight, 0);
    const allPoints = matches.reduce((n, m) => n + m.points, 0);
    assert.equal(z.operation_score, opScore, 'operation score is the sum of weights');
    assert.equal(z.hit_count, opHits.length + matches.length, 'hits');

    if (system === SCORING_SYSTEM.LTE_V7) {
      assert.equal(z.score_multiplier, 1, 'v7 never multiplies');
      assert.equal(z.score, round2(opScore + allPoints), 'v7 adds everything');
    } else {
      const M = Math.max(1, ...matches.map((m) => m.multiplier));
      assert.equal(z.score_multiplier, M, 'M is the max multiplier, floored at 1');
      const withheld = matches.length ? z.resonance_matches.find((m) => m.multiplier === M).points : 0;
      assert.equal(z.resonance_subscore, allPoints - withheld, 'exactly one max-carrier withheld');
      assert.equal(z.score, round2(z.base_score_pre_multiply * M), 'score = round2(base x M)');
    }
  }
});

test('every filter only ever removes rows — 40 random flag sets', () => {
  const rnd = prng(0xF117E2);
  const base = () =>
    makeIsoEvent(0, {
      x_dates: [
        [2026, 7, 4], [2026, 8, 20], [2027, 3, 9], [2027, 3, 16], [2027, 7, 17],
      ].map(([y, m, d]) => makeXDate(y, m, d)),
    });
  const NOW = Date.UTC(2026, 7, 25);
  const keptKeys = (ev) => new Set(runOphis(ev, { now: NOW }).processed_z_dates.map((z) => z.key));

  for (let i = 0; i < 40; i++) {
    const ev = base();
    for (const f of FILTER_ROWS) ev[f.flag] = rnd() < 0.4;
    const before = keptKeys(ev);

    // Switching one more filter ON can only shrink the surviving set.
    const extra = pick(rnd, FILTER_ROWS.filter((f) => !ev[f.flag]) );
    if (!extra) continue;
    ev[extra.flag] = true;
    const after = keptKeys(ev);

    assert.ok(after.size <= before.size, `${extra.flag} grew the set`);
    for (const key of after) assert.ok(before.has(key), `${extra.flag} introduced ${key}`);
  }
});
