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
import { FIBONACCI, fibonacciTags, describeFibonacci } from '../src/core/ophis/tags.js';
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
