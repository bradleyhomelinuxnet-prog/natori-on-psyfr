/**
 * Parity fixtures for the `ophis` reckoning.
 *
 * Every expected value here came out of the teardown of the original engine or
 * out of the author's own documents, not out of this implementation. A failure
 * means the rebuild has drifted, not that the fixture needs updating.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MSRF_FILTER__NORMAL,
  MSRF_FILTER__IMPORTANT,
  MSRF_FILTER__VORTEX,
  MSRF_FILTER__FINAL,
} from '../src/data/msrf-ophis.js';
import { getMsrfMatch } from '../src/core/ophis/msrf-match.js';
import { round1, round2 } from '../src/core/ophis/numeric.js';
import { span, utcMidnight, normaliseWindow, fmtDate } from '../src/core/ophis/calendar.js';
import { scoreZStruct } from '../src/core/ophis/scoring.js';
import { sortAndLabel, normaliseSortType } from '../src/core/ophis/sort.js';
import { runOphis } from '../src/core/ophis/run.js';
import { makeIsoEvent, makeXDate, parseXDate } from '../src/state/iso-event.js';
import { packOperations, OPHIS_PACKS } from '../src/data/packs-ophis.js';
import { compileOperation } from '../src/core/equation/index.js';
import { SORT_TYPE, EVENT_SCOPE } from '../src/core/ophis/constants.js';
import {
  lunarPhase, phaseName, phaseGapDays, toJD, LUNAR_MATCH_DAYS, ECLIPSE_MATCH_DAYS,
} from '../src/core/ophis/moon.js';
import { eclipseNear } from '../src/core/eclipses.js';

/* ---------------------------------------------------------------- Group A --
 * The filter arrays, and the three structural properties the original's own
 * startup self-check asserted.
 */

test('MSRF arrays have the shipped lengths', () => {
  assert.equal(MSRF_FILTER__NORMAL.length, 325);
  assert.equal(MSRF_FILTER__IMPORTANT.length, 53);
  assert.equal(MSRF_FILTER__VORTEX.length, 12);
  assert.equal(MSRF_FILTER__FINAL.length, 390);
});

test('1574 sits out of order at index 248, as in the source', () => {
  assert.equal(MSRF_FILTER__NORMAL.indexOf(1574), 248);
  assert.equal(MSRF_FILTER__NORMAL[247], 1641);
  assert.equal(MSRF_FILTER__NORMAL[249], 1680);
});

test('IMPORTANT is disjoint from NORMAL and strictly ascending', () => {
  const normal = new Set(MSRF_FILTER__NORMAL);
  for (const n of MSRF_FILTER__IMPORTANT) assert.ok(!normal.has(n), `${n} is in both tiers`);
  for (let i = 1; i < MSRF_FILTER__IMPORTANT.length; i++) {
    assert.ok(MSRF_FILTER__IMPORTANT[i] > MSRF_FILTER__IMPORTANT[i - 1]);
  }
});

test('FINAL is the concatenation, sorted, with the tier arrays left alone', () => {
  for (let i = 1; i < MSRF_FILTER__FINAL.length; i++) {
    assert.ok(MSRF_FILTER__FINAL[i] >= MSRF_FILTER__FINAL[i - 1]);
  }
  assert.equal(MSRF_FILTER__NORMAL[248], 1574, 'sorting FINAL must not reorder NORMAL');
});

/* ---------------------------------------------------------------- Group B --
 * Match precedence. Order is the whole behaviour.
 */

test('the match table reproduces, including the vortex steal', () => {
  const rows = [
    [21.7, 'VORTEX', 21.7],
    [43.5, 'VORTEX', 43.5],
    [21.4, 'NORMAL', 21],
    [21.0, 'NORMAL', 21],
    [12.4, 'NORMAL', 12],
    [84, 'IMPORTANT', 84],
    [76.2, 'VORTEX', 76.2],
    [76.3, 'VORTEX', 76.2],
  ];
  for (const [probe, tier, number] of rows) {
    const m = getMsrfMatch(probe);
    assert.ok(m, `${probe} should match`);
    assert.equal(m.tier, tier, `${probe} tier`);
    assert.equal(m.number, number, `${probe} number`);
  }
});

test('76.1 is Normal 76, not Vortex — the tolerance is literal IEEE-754', () => {
  // 76.2 - 76.1 is 0.100000000000001, which FAILS <= 0.1. Adding an epsilon
  // here would flip this row and silently move every projection near it.
  assert.ok(Math.abs(76.2 - 76.1) > 0.1);
  const m = getMsrfMatch(76.1);
  assert.equal(m.tier, 'NORMAL');
  assert.equal(m.number, 76);
});

test('the ".5" dead zone bites only after vortex has had its turn', () => {
  assert.equal(getMsrfMatch(100.5), null, 'ordinary .5 is dead');
  assert.equal(getMsrfMatch(43.5).tier, 'VORTEX', '43.5 IS a vortex number');
});

test('points and multipliers are per tier', () => {
  assert.deepEqual(
    ['NORMAL', 'IMPORTANT', 'VORTEX'].map((t) => {
      const m = getMsrfMatch({ NORMAL: 12, IMPORTANT: 84, VORTEX: 21.7 }[t]);
      return [m.points, m.multiplier];
    }),
    [[1, 1.5], [2, 2], [2, 2]]
  );
});

/* ---------------------------------------------------------------- Group C --
 * Numeric primitives, including the two the original gets wrong for negatives.
 */

test('rounding reproduces the original, negatives included', () => {
  assert.equal(round2(9.251968503937007), 9.25);
  assert.equal(round1(9.25), 9.3);
  // The EPSILON nudge is wrong below zero and is preserved deliberately.
  assert.equal(round1(-1.25), -1.2);
  assert.ok(Object.is(round1(-0.05), -0));
});

/* ---------------------------------------------------------------- Group D --
 * Y, and the HH:MM asymmetry.
 */

test('Y is exclusive elapsed days and keeps its sign', () => {
  const ev = { scope: EVENT_SCOPE.DAYS };
  assert.equal(span(utcMidnight(2026, 7, 4), utcMidnight(2026, 8, 20), ev), 47);
  assert.equal(span(utcMidnight(2026, 1, 1), utcMidnight(2026, 1, 2), ev), 1);
  assert.equal(span(utcMidnight(2026, 8, 20), utcMidnight(2026, 7, 4), ev), -47);
});

test('HH:MM +1 and -1 are asymmetric by construction', () => {
  const ev = { scope: EVENT_SCOPE.HH_MM, lat: 31.7, long: 35.2 };
  const a = Date.UTC(2026, 6, 4, 10, 0);
  const b = Date.UTC(2026, 6, 5, 10, 0);
  assert.equal(span(a, a, ev), 0);
  assert.equal(span(a, b, ev), 1);
  // The negative branch returns -1 before any rounding happens.
  assert.equal(span(b, a, ev), -1);
});

test('a DAYS window is a single point on the day', () => {
  const ev = { scope: EVENT_SCOPE.DAYS };
  const w = normaliseWindow(utcMidnight(2026, 8, 20) + 1234, ev);
  assert.equal(w.zStart, w.zEnd);
  assert.equal(fmtDate(w.zStart), '08/20/2026');
});

/* ---------------------------------------------------------------- Group E --
 * GTE_V8 scoring — the spec's eight worked examples, verbatim.
 */

test('the eight worked scoring examples reproduce', () => {
  const ops = [{ weight: 1 }, { weight: 0.5 }];
  const N = { points: 1, multiplier: 1.5, number: 204 };
  const I = { points: 2, multiplier: 2.0, number: 84 };
  const V = { points: 2, multiplier: 2.0, number: 21.7 };

  const build = (opOrdinals, resonance) => ({
    operation_match_structs: opOrdinals.map((o) => ({
      operation_result: { operation_ordinal: o, rotation_count_z: 1 },
      y_struct: { x_1_ordinal: 0, x_2_ordinal: 1 },
    })),
    resonance_matches: resonance.map((r) => ({ ...r, operation_result: { rotation_count_z: 1 } })),
  });

  //          ops        resonance   M     subscore base  score   hits
  const cases = [
    [[0], [], 1.0, 0, 1.0, 1, 1],
    [[1], [], 1.0, 0, 0.5, 0.5, 1],
    [[0], [N], 1.5, 0, 1.0, 1.5, 2],
    [[0], [N, N], 1.5, 1, 2.0, 3, 3],
    [[0], [I], 2.0, 0, 1.0, 2, 2],
    [[0], [I, N], 2.0, 1, 2.0, 4, 3],
    [[0], [V, I], 2.0, 2, 3.0, 6, 3],
    [[0, 0, 1, 1, 1], [N], 1.5, 0, 3.5, 5.25, 6],
  ];

  for (const [opOrdinals, resonance, M, subscore, base, score, hits] of cases) {
    const z = build(opOrdinals, resonance);
    scoreZStruct(z, ops);
    const label = `${opOrdinals.length} ops + ${resonance.length} resonance`;
    assert.equal(z.score_multiplier, M, `${label}: M`);
    assert.equal(z.resonance_subscore, subscore, `${label}: subscore`);
    assert.equal(z.base_score_pre_multiply, base, `${label}: base`);
    assert.equal(z.score, score, `${label}: score`);
    assert.equal(z.hit_count, hits, `${label}: hits`);
  }
});

test('M is a max, never a product', () => {
  const ops = [{ weight: 1 }];
  const I = (n) => ({ points: 2, multiplier: 2.0, number: n, operation_result: { rotation_count_z: 1 } });
  const z = {
    operation_match_structs: [
      { operation_result: { operation_ordinal: 0, rotation_count_z: 1 }, y_struct: { x_1_ordinal: 0, x_2_ordinal: 1 } },
    ],
    resonance_matches: [I(84), I(126), I(132)],
  };
  scoreZStruct(z, ops);
  assert.equal(z.score_multiplier, 2.0, 'three Important matches still multiply once');
  assert.equal(z.resonance_subscore, 4, 'two of the three contribute points');
  assert.equal(z.score, 10);
});

/* ---------------------------------------------------------------- Group F --
 * Sorting.
 */

test('z_ordinal is chronological whatever the display sort', () => {
  const z = (zStart, score) => ({
    zStart, score, hit_count: 1, resonance_subscore: 0,
    resonance_number_sum: 0, operation_hit_count: 1, operation_score: 1,
  });
  const rows = [z(300, 2), z(100, 9), z(200, 5)];
  const sorted = sortAndLabel(rows, SORT_TYPE.SCORE);
  assert.deepEqual(sorted.map((r) => r.score), [9, 5, 2], 'ordered by score');
  assert.deepEqual(sorted.map((r) => r.z_ordinal), [0, 1, 2], 'labelled by date');
});

test('an unrecognised sort type is coerced, not obeyed', () => {
  assert.equal(normaliseSortType('SORT_TYPE__NONSENSE'), SORT_TYPE.DATE);
  assert.equal(normaliseSortType(undefined), SORT_TYPE.DATE);
});

/* ---------------------------------------------------------------- Group G --
 * The shipped operation packs.
 */

test('every shipped equation compiles under the ophis reckoning', () => {
  for (const pack of Object.values(OPHIS_PACKS)) {
    for (const op of pack.operations) {
      assert.doesNotThrow(() => compileOperation(op.equation, 'ophis'), `${pack.id}: ${op.equation}`);
    }
  }
});

test('the reckonings disagree about phi, and that is deliberate', () => {
  assert.equal(compileOperation('X2+YxOPH_PHI', 'ophis').fn(1000), 1618);
  assert.equal(compileOperation('X2+YxOPH_PHI', 'chronicon').fn(1000), 1618.03398875);
});

test('the default pack is the sixteen v10 operations, in order', () => {
  const ops = packOperations();
  assert.equal(ops.length, 16);
  assert.equal(ops[0].equation, 'X2+oph_round(Y)');
  assert.equal(ops[15].equation, 'X2+YxOPH_HEP');
  assert.equal(ops.filter((o) => o.weight >= 1).length, 8, 'eight Alpha operations');
});

test('the audit trace values at Y=47 reproduce', () => {
  const ops = packOperations();
  assert.equal(compileOperation(ops[0].equation, 'ophis').fn(47), 47);
  assert.equal(compileOperation(ops[1].equation, 'ophis').fn(47), 74);
  assert.equal(round2(compileOperation(ops[2].equation, 'ophis').fn(47)), 9.25);
  assert.equal(round1(9.25), 9.3);
});

/* ---------------------------------------------------------------- Group H --
 * End to end, against the `test-bradley.oph` fixture.
 */

const bradley = () =>
  makeIsoEvent(0, {
    name: 'test-bradley',
    x_dates: [
      [2026, 7, 4], [2026, 8, 20], [2027, 3, 9], [2027, 3, 16], [2027, 7, 17],
    ].map(([y, m, d]) => makeXDate(y, m, d)),
    z_date_sort_type: SORT_TYPE.MSRF,
  });

/** Any `now` before the last anchor gives the same answer; this one is pinned. */
const NOW = Date.UTC(2026, 7, 25);

test('test-bradley reproduces every volume assertion', () => {
  const r = runOphis(bradley(), { now: NOW });
  const opResults = r.y_structs.reduce((n, y) => n + y.operation_results.length, 0);

  assert.equal(r.y_structs.length, 10, 'y-structs');
  assert.equal(opResults, 160, 'operation results (10 pairs x 16 operations)');
  assert.equal(Object.keys(r.z_structs).length, 153, 'distinct Z-Dates before filtering');
  assert.equal(r.processed_z_dates.length, 114, 'surviving the filters');
  assert.equal(r.hidden, 39, 'hidden counter');
  assert.equal(Math.max(...r.processed_z_dates.map((z) => z.score)), 3, 'highest score');
  assert.equal(Math.max(...r.processed_z_dates.map((z) => z.hit_count)), 4, 'max hit count');
});

test('test-bradley: Z14 is the row that exercises every branch', () => {
  const r = runOphis(bradley(), { now: NOW });
  const z14 = r.processed_z_dates__sorted_by_date[13];

  assert.equal(fmtDate(z14.zStart), '09/29/2027');
  assert.equal(z14.zStart, 1822176000000, 'the epoch key');
  assert.equal(z14.operation_score, 1, 'two operations at weight 0.5');
  assert.equal(z14.score_multiplier, 1.5, 'max(1.5, 1.5)');
  assert.equal(z14.resonance_subscore, 1, 'two points, the first withheld');
  assert.equal(z14.base_score_pre_multiply, 2, '1.0 + 1.0');
  assert.equal(z14.score, 3, 'round2(2.0 x 1.5)');
  assert.equal(z14.hit_count, 4, '2 operations + 2 resonance');
  assert.deepEqual(
    z14.resonance_matches.map((m) => m.number).sort((a, b) => a - b),
    [74, 204]
  );
});

test('test-bradley: the head of the date-sorted list', () => {
  const r = runOphis(bradley(), { now: NOW });
  const head = r.processed_z_dates__sorted_by_date.slice(0, 5).map((z) => [
    fmtDate(z.zStart), z.hit_count, z.score,
  ]);
  assert.deepEqual(head, [
    ['07/22/2027', 2, 1.5],
    ['07/28/2027', 1, 0.5],
    ['08/08/2027', 1, 0.5],
    ['08/09/2027', 2, 2],
    ['08/10/2027', 2, 0.75],
  ]);
});

test('test-bradley: sorting by MSRF opens on Z14, not Z1', () => {
  const r = runOphis(bradley(), { now: NOW });
  const first = r.processed_z_dates[0];
  assert.equal(first.z_ordinal, 13, 'labelled Z14 — the label is the date, not the row');
  assert.equal(fmtDate(first.zStart), '09/29/2027');

  // A 0.75-score row outranks a 1.5-score one here, because the primary key is
  // the subscore (which the multiplier model empties) and the tie-break is the
  // raw magnitude of the matched numbers. Surprising, and correct.
  const second = r.processed_z_dates[1];
  assert.equal(second.score, 0.75);
  assert.equal(second.resonance_number_sum, 1920);
});

test('test-bradley under SORT_TYPE__SCORE', () => {
  const ev = bradley();
  ev.z_date_sort_type = SORT_TYPE.SCORE;
  const r = runOphis(ev, { now: NOW });
  assert.deepEqual(
    r.processed_z_dates.slice(0, 2).map((z) => [fmtDate(z.zStart), z.score]),
    [['09/29/2027', 3], ['02/06/2028', 2.25]]
  );
});

/* ---------------------------------------------------------------- Group I --
 * Guards.
 */

test('the guards fire in order, with their verbatim messages', () => {
  const one = makeIsoEvent(0, { x_dates: [makeXDate(2026, 1, 1)] });
  assert.deepEqual(runOphis(one, { now: NOW }).errors, ['At least 2 X-Dates are required.']);

  const months = bradley();
  months.scope = EVENT_SCOPE.MONTHS;
  assert.deepEqual(runOphis(months, { now: NOW }).errors, [
    'Month-based projections may be supported in a future version.',
  ]);

  const noOps = bradley();
  noOps.operations = noOps.operations.map((o) => ({ ...o, enabled: false }));
  assert.deepEqual(runOphis(noOps, { now: NOW }).errors, ['At least 1 Operation is required.']);
});

test('out-of-order anchors are rejected by the spread check', () => {
  const ev = makeIsoEvent(0, {
    x_dates: [makeXDate(2026, 8, 20), makeXDate(2026, 7, 4)],
  });
  const r = runOphis(ev, { now: NOW });
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /X2 must be greater than X1/);
});

test('anchors on the same day are rejected', () => {
  const ev = makeIsoEvent(0, {
    x_dates: [makeXDate(2026, 7, 4), makeXDate(2026, 7, 4)],
  });
  assert.match(runOphis(ev, { now: NOW }).errors[0], /must be different days\./);
});

/* ---------------------------------------------------------------- Group J --
 * Filters, individually.
 */

test('the T-Date whitelist turns itself on and narrows to the listed days', () => {
  const ev = bradley();
  const r0 = runOphis(ev, { now: NOW });
  const target = r0.processed_z_dates__sorted_by_date[13]; // 09/29/2027

  ev.t_dates = [makeXDate(2027, 9, 29)];
  const r1 = runOphis(ev, { now: NOW });
  assert.equal(r1.processed_z_dates.length, 1);
  assert.equal(r1.processed_z_dates[0].zStart, target.zStart);
});

test('min-hit-count and min-score only ever remove rows', () => {
  const base = runOphis(bradley(), { now: NOW }).processed_z_dates.length;

  const hits = bradley();
  hits.iso_event_filter_min_hit_count = true;
  hits.iso_event_filter_min_hit_count_value = 3;
  const withHits = runOphis(hits, { now: NOW }).processed_z_dates;
  assert.ok(withHits.length < base);
  assert.ok(withHits.every((z) => z.hit_count >= 3));

  const score = bradley();
  score.iso_event_filter_min_score = true;
  score.iso_event_filter_min_score_value = 2;
  const withScore = runOphis(score, { now: NOW }).processed_z_dates;
  assert.ok(withScore.every((z) => z.score >= 2));
});

test('a negative companion value falls back to the field default', () => {
  const ev = bradley();
  ev.iso_event_filter_min_score = true;
  ev.iso_event_filter_min_score_value = -5;
  const r = runOphis(ev, { now: NOW });
  assert.ok(r.processed_z_dates.every((z) => z.score >= 1), 'coerced to the default of 1');
});

test('the msrf-match filter keeps only rows with resonance', () => {
  const ev = bradley();
  ev.iso_event_filter_msrf_match = true;
  const r = runOphis(ev, { now: NOW });
  assert.ok(r.processed_z_dates.length > 0);
  assert.ok(r.processed_z_dates.every((z) => z.resonance_matches.length > 0));
});

test('over-tight filters report as no-results, not as an error', () => {
  const ev = bradley();
  ev.iso_event_filter_min_score = true;
  ev.iso_event_filter_min_score_value = 999;
  const r = runOphis(ev, { now: NOW });
  assert.equal(r.processed_z_dates.length, 0);
  assert.equal(r.errors[0].error_status, 'NO_RESULTS');
  assert.match(r.errors[0].error_message, /loosen up a filter/);
});

/* ---------------------------------------------------------------- Group K --
 * The Protocol Prime reconciliation from docs/reverse/22.
 */

test('three controls give the flow chart its 42 projections', () => {
  // A, B and C — the third being "the date the projection is conducted".
  const ev = makeIsoEvent(0, {
    x_dates: [makeXDate(2026, 1, 10), makeXDate(2026, 4, 20), makeXDate(2026, 8, 25)],
    operations: packOperations('ophis-gte-v8').slice(0, 14),
  });
  const r = runOphis(ev, { now: Date.UTC(2020, 0, 1) });

  assert.equal(r.y_structs.length, 3, 'E, F and G');
  const projections = r.y_structs.reduce((n, y) => n + y.operation_results.length, 0);
  assert.equal(projections, 42, '14 operations x 3 spans');

  // "Though there are 42 projections there is most often only 38 to 39 actual
  // dates. This is because different Ophis operations have targeted the same
  // date." — the flow chart, conclusion to section 1.
  const distinct = Object.keys(r.z_structs).length;
  assert.ok(distinct >= 36 && distinct <= 42, `${distinct} distinct dates from 42 projections`);
});

/* ---------------------------------------------------------------- Group L --
 * Date parsing.
 */

test('parseXDate rejects what Date would silently roll over', () => {
  assert.deepEqual(
    { ...parseXDate('07/04/2026'), time: undefined, enabled: undefined },
    { y: 2026, m: 7, d: 4, time: undefined, enabled: undefined }
  );
  assert.equal(parseXDate('02/30/2026'), null, 'February has no 30th');
  assert.equal(parseXDate('13/01/2026'), null, 'no thirteenth month');
  assert.equal(parseXDate('not a date'), null);
});

/* ---------------------------------------------------------------- Group M --
 * Lunar phase, which decides what the chart's moon row marks.
 *
 * The two eclipse rows are the strongest check available without an ephemeris:
 * a solar eclipse can only happen at new moon and a lunar one only at full, so
 * if the phase maths drifts, those two rows are the first to say so.
 */

test('the phase of five independently known lunations', () => {
  const rows = [
    ['2026-01-03T10:03Z', 'Full'],
    ['2026-01-18T19:52Z', 'New'],
    ['2026-06-29T00:00Z', 'Full'],
    ['2027-08-02T10:07Z', 'New'],   // the total solar eclipse of 2027
    ['2026-03-03T11:38Z', 'Full'],  // the total lunar eclipse of 2026
  ];
  for (const [iso, expected] of rows) {
    assert.equal(phaseName(Date.parse(iso)), expected, iso);
  }
});

test('a solar eclipse falls at new moon, a lunar one at full', () => {
  const solar = Date.UTC(2027, 7, 2, 10, 7);
  const lunar = Date.UTC(2026, 2, 3, 11, 38);
  assert.ok(phaseGapDays(lunarPhase(solar), 0.0) < LUNAR_MATCH_DAYS, 'solar -> new');
  assert.ok(phaseGapDays(lunarPhase(lunar), 0.5) < LUNAR_MATCH_DAYS, 'lunar -> full');

  // And the eclipse tables agree that those are eclipses at all.
  assert.equal(eclipseNear(Math.round(toJD(solar)), ECLIPSE_MATCH_DAYS).solar, 'T');
  assert.equal(eclipseNear(Math.round(toJD(lunar)), ECLIPSE_MATCH_DAYS).lunar, 'T');
});

test('the phase fraction wraps rather than jumping at new moon', () => {
  const justBefore = lunarPhase(Date.UTC(2026, 0, 18, 12, 0));
  assert.ok(justBefore > 0.9, 'still late in the old lunation');
  // A fraction of 0.99 is one third of a day from new, not 29 days from it.
  assert.ok(phaseGapDays(justBefore, 0) < 1);
});

test('every phase point is reachable and distinct', () => {
  const seen = new Set();
  for (let d = 0; d < 30; d += 0.25) {
    seen.add(phaseName(Date.UTC(2026, 0, 1) + d * 86_400_000));
  }
  assert.equal(seen.size, 8, 'all eight phases occur within one lunation');
});

/* ---------------------------------------------------------------- Group N --
 * v9 against v12 — the whole operation-table difference between the two
 * versions, pinned so a later edit cannot quietly widen it.
 */

test('the v9 default is the v12 table minus one row', () => {
  const v9 = packOperations('ophis-gte-v8');
  const v12 = packOperations('ophis-gte-v10');

  assert.equal(v9.length, 15);
  assert.equal(v12.length, 16);
  assert.deepEqual(
    v12.slice(0, 15).map((o) => [o.equation, o.weight]),
    v9.map((o) => [o.equation, o.weight]),
    'the first fifteen rows are identical in both versions'
  );
  assert.equal(v12[15].equation, 'X2+YxOPH_HEP', 'v12 adds the X2 hepta-cycle');
  assert.equal(v12[15].weight, 1);
});

test('the Alpha/beta split matches the author across every version', () => {
  const alphas = (id) => packOperations(id).filter((o) => o.weight >= 1).length;
  assert.equal(alphas('ophis-lte-v7'), 5, 'v7: five Alpha');
  assert.equal(alphas('ophis-gte-v8'), 7, 'v9: #6 and #10 promoted');
  assert.equal(alphas('ophis-gte-v10'), 8, 'v12: plus the X2 hepta-cycle');

  // Restricted to the twelve Core Algorithm formulas — excluding the Isometric,
  // the Holofractal and both hepta-cycles — the split is 4/8 under both the v9
  // and v12 defaults, which is what the author's Procedural Notes state.
  for (const id of ['ophis-gte-v8', 'ophis-gte-v10']) {
    const core = packOperations(id).slice(2, 14);
    assert.equal(core.filter((o) => o.weight >= 1).length, 4, `${id}: 4 Core Alpha`);
    assert.equal(core.filter((o) => o.weight < 1).length, 8, `${id}: 8 Core beta`);
  }
});

test('every operation in every version ships enabled', () => {
  // The original's newOperation ignores its `enabled` argument and hard-codes
  // true, so the one row declared disabled is not. Reproduced deliberately.
  for (const id of ['ophis-lte-v7', 'ophis-gte-v8', 'ophis-gte-v10']) {
    assert.ok(packOperations(id).every((o) => o.enabled === true), id);
  }
  // The extras are the exception: they never shipped on.
  assert.ok(packOperations('ophis-xtras').every((o) => o.enabled === false));
});

test('a guard does not swallow the reason the operations failed', () => {
  const ev = makeIsoEvent(0, {
    x_dates: [makeXDate(2026, 1, 1), makeXDate(2026, 6, 1)],
    operations: [
      { equation: 'X1+nonsense(Y)', weight: 1, enabled: true },
      { equation: 'X1+Y/0', weight: 1, enabled: true },
    ],
  });
  const r = runOphis(ev, { now: NOW });

  assert.deepEqual(r.errors, ['At least 1 Operation is required.']);
  assert.equal(r.diagnostics.length, 2, 'both parse failures are reported');
  assert.ok(r.diagnostics.every((d) => d.kind === 'OPERATION_INVALID'));
  assert.match(r.diagnostics[0].detail, /unknown name/);
  assert.match(r.diagnostics[1].detail, /finite/);
});
