/**
 * The optional tags (docs/reverse/23 §2).
 *
 * Kept out of `npm test` on purpose: that suite's count is the contract with
 * the original engine, and these rules were never in the original. What they
 * must prove is the opposite of a parity claim — that switching a tag on adds a
 * label and changes nothing the engine produced.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { runOphis } from '../src/core/ophis/run.js';
import { makeIsoEvent, makeXDate } from '../src/state/iso-event.js';
import { MILLIS_PER_DAY } from '../src/core/ophis/constants.js';
import { utcMidnight } from '../src/core/ophis/calendar.js';
import {
  FIBONACCI, fibonacciTags, describeFibonacci,
  GEODETIC, DIURNAL, LIST_CEILING, TAG_TOLERANCE_DAYS, listTags, describeListHit, shownValue,
} from '../src/core/ophis/tags.js';
import { DEFAULT_OPTIONS } from '../src/state/ophis-store.js';

const NOW = Date.UTC(2020, 0, 1);

/** Two anchors and a hand-picked operation table, with every filter at its default. */
const pair = (x1, x2, equations) =>
  makeIsoEvent(0, {
    x_dates: [makeXDate(...x1), makeXDate(...x2)],
    operations: equations.map((equation) => ({ equation, weight: 1, enabled: true })),
  });

/** What the engine's run looks like, minus anything a tag could not touch anyway. */
const fingerprint = (r) =>
  JSON.stringify(r.processed_z_dates.map((z) => [z.key, z.score, z.hit_count, z.z_ordinal]));

const worked = () =>
  makeIsoEvent(0, {
    x_dates: [[2026, 7, 4], [2026, 8, 20], [2027, 3, 9], [2027, 3, 16], [2027, 7, 17]]
      .map(([y, m, d]) => makeXDate(y, m, d)),
  });

test('F is the author’s set, starting at 8', () => {
  assert.deepEqual([...FIBONACCI], [8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]);
  for (let i = 2; i < FIBONACCI.length; i++) {
    assert.equal(FIBONACCI[i], FIBONACCI[i - 1] + FIBONACCI[i - 2]);
  }
});

test('Op 1 fires when Y is in F, and projects F from X2', () => {
  // Y = 13. "X2+Y" lands on X2 + 13, which is also X2 + a member of F.
  const ev = pair([2026, 1, 1], [2026, 1, 14], ['X2+Y']);
  const r = runOphis(ev, { now: NOW });
  assert.equal(r.y_structs[0].rotation_count_y, 13);

  const key = String(utcMidnight(2026, 1, 27));
  assert.ok(r.processed_z_dates.some((z) => z.key === key));

  const hits = fibonacciTags(r, ev).get(key);
  assert.ok(hits, 'the Z-Date is tagged');
  assert.deepEqual(
    hits.filter((t) => t.op === 1),
    [{ op: 1, x1: 0, x2: 1, from: 'X2', n: 13, y: 13 }]
  );
  assert.equal(describeFibonacci(hits.find((t) => t.op === 1)), 'Y(X1→X2) = 13, in F · X2 + 13 days');
});

test('Op 1 does not fire when Y is not in F; Op 2 still does', () => {
  // Y = 14, not in F. "X2+Y-1" lands on X2 + 13.
  const ev = pair([2026, 1, 1], [2026, 1, 15], ['X2+Y-1']);
  const r = runOphis(ev, { now: NOW });
  const hits = fibonacciTags(r, ev).get(String(utcMidnight(2026, 1, 28)));
  assert.deepEqual(hits, [{ op: 2, x1: 0, x2: 1, from: 'X2', n: 13, y: 14 }]);
  assert.equal(describeFibonacci(hits[0]), 'X1→X2 · X2 + 13 days');
});

test('Op 2 projects F from X1 as well', () => {
  // Y = 14; "X1+Y+7" lands on X1 + 21.
  const ev = pair([2026, 1, 1], [2026, 1, 15], ['X1+Y+7']);
  const r = runOphis(ev, { now: NOW });
  const hits = fibonacciTags(r, ev).get(String(utcMidnight(2026, 1, 22)));
  assert.deepEqual(hits, [{ op: 2, x1: 0, x2: 1, from: 'X1', n: 21, y: 14 }]);
  assert.equal(describeFibonacci(hits[0]), 'X1→X2 · X1 + 21 days');
});

test('the description names the anchor by its own label', () => {
  assert.equal(
    describeFibonacci({ op: 2, x1: 0, x2: 4, from: 'X2', n: 34, y: 378 }),
    'X1→X5 · X5 + 34 days'
  );
});

test('a Z-Date no member of F reaches is not tagged', () => {
  const ev = pair([2026, 1, 1], [2026, 1, 15], ['X2+Y']);   // X2 + 14
  const r = runOphis(ev, { now: NOW });
  assert.equal(fibonacciTags(r, ev).size, 0);
});

test('only surviving Z-Dates are tagged', () => {
  const ev = worked();
  const r = runOphis(ev, { now: NOW });
  const survivors = new Set(r.processed_z_dates.map((z) => z.key));
  const tags = fibonacciTags(r, ev);
  assert.ok(tags.size > 0, 'the worked example has Fibonacci hits');
  for (const key of tags.keys()) assert.ok(survivors.has(key), key);

  // Every hit is really X + n days from the anchor it names.
  for (const [key, hits] of tags) {
    for (const t of hits) {
      const ys = r.y_structs.find((y) => y.x_1_ordinal === t.x1 && y.x_2_ordinal === t.x2);
      const base = t.from === 'X1' ? ys.x_1_instant : ys.x_2_instant;
      assert.equal(String(base + t.n * MILLIS_PER_DAY), key);
      assert.ok(FIBONACCI.includes(t.n));
      if (t.op === 1) assert.ok(FIBONACCI.includes(ys.rotation_count_y));
    }
  }
});

test('the bucket follows the Days-scope start time, as the engine does', () => {
  const ev = pair([2026, 1, 1], [2026, 1, 14], ['X2+Y']);
  ev.day_scope_start_time_in_millis = 18 * 3_600_000;
  const r = runOphis(ev, { now: NOW });
  const key = r.processed_z_dates[0].key;
  assert.ok(fibonacciTags(r, ev).has(key));
});

test('the Fibonacci tag is off by default', () => {
  assert.equal(DEFAULT_OPTIONS.tag_fibonacci, false);
});

test('tagging changes nothing the engine produced', () => {
  const ev = worked();
  const r = runOphis(ev, { now: NOW });
  const before = fingerprint(r);
  const zBefore = JSON.stringify(r.z_structs, (k, v) => (k === 'y_struct' ? undefined : v));
  fibonacciTags(r, ev);
  assert.equal(fingerprint(r), before);
  assert.equal(JSON.stringify(r.z_structs, (k, v) => (k === 'y_struct' ? undefined : v)), zBefore);
  // And a second run is identical, so nothing leaked into the event either.
  assert.equal(fingerprint(runOphis(ev, { now: NOW })), before);
});

/* ------------------------------------------- Geodetic (138) and Diurnal -- */

const r2 = (v) => Math.round(v * 100) / 100;
const valuesOf = (list, id) => list.filter((e) => e.series === id);

test('Geodetic: multiples of 138 run from 138 to 2484', () => {
  const m = valuesOf(GEODETIC, '138').map((e) => e.value);
  assert.equal(m.length, 18);
  assert.equal(m[0], 138);
  assert.equal(m.at(-1), 2484);
  m.forEach((v, i) => assert.equal(v, 138 * (i + 1)));
});

test('Geodetic: 365.25 × 1.38k reproduces the author’s list as written', () => {
  // The author truncates to one decimal: 1008.09 is written 1008.0, 2016.18 is 2016.1.
  assert.deepEqual(valuesOf(GEODETIC, '1.38').map((e) => e.shown), [504.0, 1008.0, 1512.1, 2016.1, 2520.2]);
});

test('Diurnal: the series come from the formulas, up to (365.25 ÷ 3.14) × 22', () => {
  assert.equal(r2(LIST_CEILING), 2559.08);
  assert.deepEqual(valuesOf(DIURNAL, 'year').map((e) => e.value),
    [365.25, 730.5, 1095.75, 1461, 1826.25, 2191.5, 2556.75]);

  const byPi = valuesOf(DIURNAL, '÷pi').map((e) => r2(e.value));
  assert.equal(byPi.length, 22);
  assert.deepEqual(byPi.slice(0, 2), [116.32, 232.64]);
  assert.equal(byPi.at(-1), 2559.08);

  assert.deepEqual(valuesOf(DIURNAL, '×phi').map((e) => r2(e.value)), [590.97, 1181.95, 1772.92, 2363.9]);
  assert.equal(r2(valuesOf(DIURNAL, '÷phi')[0].value), 225.74);
  assert.equal(r2(valuesOf(DIURNAL, '×pi')[0].value), 1146.89);
  for (const e of [...GEODETIC, ...DIURNAL]) assert.ok(e.value <= LIST_CEILING + 1e-9, e.label);
});

test('a rotation count within 0.1 day of a list value tags the Z-Date', () => {
  assert.equal(TAG_TOLERANCE_DAYS, 0.1);
  // Y = 138; "X2+Y" counts exactly 138 from X2.
  const ev = pair([2026, 1, 1], [2026, 5, 19], ['X2+Y', 'X2+Yx2', 'X2+Y+0.2']);
  const r = runOphis(ev, { now: NOW });
  assert.equal(r.y_structs[0].rotation_count_y, 138);

  const tags = listTags(r, GEODETIC);
  const at = (rc) => r.processed_z_dates.find((z) =>
    z.operation_match_structs.some((m) => m.operation_result.rotation_count_z === rc));

  const exact = tags.get(at(138).key);
  assert.equal(exact.length, 1);
  assert.equal(exact[0].entry.value, 138);
  assert.equal(describeListHit(exact[0]), '138 × 1 = 138 · O1(X1→X2) counts 138');

  assert.equal(tags.get(at(276).key)[0].entry.value, 276);
  // 138.2 is 0.2 away: outside the tolerance.
  assert.ok(!(tags.get(at(138.2).key) ?? []).some((h) => h.rc === 138.2));
});

test('the tolerance is decided by the rule, not by IEEE-754', () => {
  // 504.1 - 504.045 and 138.1 - 138 both sit at the 0.1 edge in floating point.
  const fake = (rc) => ({
    processed_z_dates: [{
      key: 'k',
      operation_match_structs: [{
        y_struct: { x_1_ordinal: 0, x_2_ordinal: 1 },
        operation_result: { rotation_count_z: rc, operation_ordinal: 0 },
      }],
    }],
  });
  assert.ok(listTags(fake(138.1), GEODETIC).has('k'));
  assert.ok(listTags(fake(137.9), GEODETIC).has('k'));
  assert.ok(!listTags(fake(138.2), GEODETIC).has('k'));
  assert.ok(listTags(fake(2016.1), GEODETIC).has('k'), '2016.1 against 2016.18');
  assert.ok(listTags(fake(2559.1), DIURNAL).has('k'), '2559.1 against 2559.08');
  assert.equal(shownValue(1008.09), 1008.0);
});

test('Geodetic and Diurnal tags are off by default, and change nothing', () => {
  assert.equal(DEFAULT_OPTIONS.tag_geodetic, false);
  assert.equal(DEFAULT_OPTIONS.tag_diurnal, false);

  const ev = worked();
  const r = runOphis(ev, { now: NOW });
  const before = fingerprint(r);
  const geo = listTags(r, GEODETIC);
  const diu = listTags(r, DIURNAL);
  assert.equal(fingerprint(r), before);

  const survivors = new Set(r.processed_z_dates.map((z) => z.key));
  for (const key of [...geo.keys(), ...diu.keys()]) assert.ok(survivors.has(key));
});
