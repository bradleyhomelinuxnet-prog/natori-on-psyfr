/**
 * The Start here page's reading of a run.
 *
 * Not in the parity count: start.html is a new way in, not something the
 * original did. What it must prove is that it only READS the engine — every
 * date and score it shows is one runOphis produced — and that its plain-English
 * coaching says what MANUAL.md and the SOP say.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEvent, coach, readRun, describeEquation, platesFor, phoenixPlates, todayUTC, tidyDates,
} from '../src/start/plain.js';
import { runOphis } from '../src/core/ophis/run.js';
import {
  packOperations, DEFAULT_OPHIS_PACK, newDocumentOperations, isShippedTable, withNewDocumentPacks,
} from '../src/data/packs-ophis.js';
import { PROJECTION_KIND } from '../src/state/iso-event.js';

const NOW = Date.UTC(2026, 9, 26, 15, 30);
const d = (y, m, day) => ({ y, m, d: day });
const DATES = [d(2025, 3, 10), d(2025, 11, 2), d(2026, 6, 20)];

test('every operation in the 36-row table reads in words', () => {
  const ops = newDocumentOperations();
  assert.equal(ops.length, 36);
  for (const op of ops) {
    assert.ok(describeEquation(op.equation), `no words for ${op.equation}`);
  }
  assert.equal(describeEquation('X1+Yx1.38'), 'the gap × the Phoenix number (1.38, from 138)');
  assert.equal(describeEquation('X1+(Y/2.0)xOPH_PI'), 'half the gap × π (3.14)');
  assert.equal(describeEquation('X2+oph_flip(oph_round(Y))'), 'the gap with its digits reversed');
  assert.equal(describeEquation('X1+sqrt(Y)'), null, 'an unknown shape is left for the page to show as written');
});

test('a new document runs 36 operations, with the shipped sixteen first and unchanged', () => {
  const shipped = packOperations(DEFAULT_OPHIS_PACK);
  const full = newDocumentOperations();
  assert.equal(full.length, 36);
  assert.ok(full.every((o) => o.enabled === true), 'all 36 cast');
  full.slice(0, 16).forEach((o, i) => {
    assert.equal(o.equation, shipped[i].equation);
    assert.equal(o.weight, shipped[i].weight);
    assert.equal(o.ordinal, shipped[i].ordinal, 'appending never renumbers a shipped row');
  });
  assert.equal(new Set(full.map((o) => o.equation)).size, 36, 'no duplicates');

  assert.equal(isShippedTable(shipped), true);
  assert.equal(isShippedTable(full), false);
  assert.deepEqual(withNewDocumentPacks(full).length, 36, 'adding twice adds nothing');

  const edited = shipped.map((o, i) => (i === 3 ? { ...o, enabled: false } : o));
  assert.equal(isShippedTable(edited), false, 'an edited table is the user’s own');
});

test('the dates are sorted and de-duplicated before they reach the engine', () => {
  const tidy = tidyDates([d(2026, 6, 20), d(2025, 3, 10), d(2026, 6, 20)]);
  assert.deepEqual(tidy, [d(2025, 3, 10), d(2026, 6, 20)]);
});

test('counting today adds it last and marks the event subjective', () => {
  const ev = buildEvent({ name: ' Moved house ', dates: DATES, includeToday: true, now: NOW });
  assert.equal(ev.name, 'Moved house');
  assert.equal(ev.projection_kind, PROJECTION_KIND.SUBJECTIVE);
  const last = ev.x_dates.at(-1);
  assert.equal(Date.UTC(last.y, last.m - 1, last.d), todayUTC(NOW));
  assert.equal(ev.x_dates.length, 4);

  const plain = buildEvent({ dates: DATES, now: NOW });
  assert.equal(plain.projection_kind, undefined, 'an objective event stays byte-identical to the default');
  assert.equal(plain.name, 'My pattern');
});

test('coaching stops on what cannot work, and warns on what works badly', () => {
  const levels = (dates, opts) => coach(dates, NOW, opts).notes.map((n) => n.level);

  assert.equal(coach([], NOW).ok, false);
  assert.equal(coach([d(2025, 1, 1)], NOW).ok, false, 'one date has no gap');
  assert.equal(coach([d(2025, 1, 1)], NOW, { includeToday: true }).ok, true, 'today makes the second date');
  assert.equal(coach([d(2025, 1, 1), d(2025, 1, 1)], NOW).ok, false, 'a duplicate');
  assert.equal(coach([d(2025, 1, 1), d(2027, 1, 1)], NOW).ok, false, 'the future has not happened');

  assert.ok(levels([d(2025, 1, 1), d(2025, 1, 4)]).includes('warn'), 'three days apart');
  assert.ok(
    coach([d(2025, 1, 1), d(2025, 3, 2), d(2025, 5, 1)], NOW).notes.some((n) => /evenly spaced/.test(n.text)),
    'evenly spaced dates line up by construction (MANUAL §8)'
  );
  assert.ok(
    coach([d(2020, 1, 1), d(2021, 6, 1)], NOW).notes.some((n) => /years old/.test(n.text)),
    'old dates need more of them (SOP)'
  );
  assert.deepEqual(levels(DATES), ['tip']);
  assert.ok(
    coach([d(2026, 5, 1), d(2026, 10, 10)], NOW).notes.some((n) => /5 months ahead/.test(n.text)),
    'recent dates get the Programmer Instructions’ look-ahead (docs/reverse/24 §1)'
  );
});

test('the reading shows only what the engine produced, ahead of today, best first', () => {
  const ev = buildEvent({ name: 'Moved house', dates: DATES, includeToday: true, now: NOW });
  const read = readRun(ev, NOW);
  const engine = runOphis(ev, { now: NOW });
  const byKey = new Map(engine.processed_z_dates.map((z) => [z.key, z]));

  assert.deepEqual(read.errors, []);
  assert.equal(read.picks.length, 5);
  for (const p of read.picks) {
    const z = byKey.get(p.key);
    assert.ok(z, 'every pick is an engine row that survived the filters');
    assert.equal(p.score, z.score);
    assert.equal(p.hits, z.hit_count);
    assert.ok(p.at > todayUTC(NOW), 'only dates still ahead');
    assert.equal(p.workings.length, z.operation_match_structs.length);
    assert.ok(p.beats >= 0 && p.beats <= 100);
  }
  const scores = read.picks.map((p) => p.score);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
  assert.equal(read.total, engine.processed_z_dates.filter((z) => z.zStart > todayUTC(NOW)).length);
});

test('a run the engine refuses comes back as its errors, not as picks', () => {
  const read = readRun(buildEvent({ dates: [d(2025, 1, 1)], now: NOW }), NOW);
  assert.ok(read.errors.length);
  assert.deepEqual(read.picks, []);
});

test('Chronotecture plates are found by year, by Annus Mundi, and by resonance numbers over 100', () => {
  const in2027 = platesFor(Date.UTC(2027, 6, 2), [], { limit: 10 });
  assert.ok(in2027.some((p) => p.plate === 44), 'Chart X·c names 2027');

  const in2106 = platesFor(Date.UTC(2106, 0, 1), [], { limit: 50 });
  assert.ok(in2106.some((p) => p.why.some((w) => /6000 AM/.test(w))), '2106 AD is 6000 AM');

  const small = platesFor(Date.UTC(2031, 0, 1), [52, 24], { limit: 50 });
  assert.ok(small.every((p) => p.why.every((w) => !/number (52|24)\b/.test(w))), 'small numbers match nothing');

  for (const p of phoenixPlates()) assert.match(p.url, /Chronotecture-Charts\/pages\/p11[4-7]\.html$/);
});
