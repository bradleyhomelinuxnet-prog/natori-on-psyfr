/**
 * The Lab: readings from the author's later notes (docs/reverse/24).
 *
 * Not in the parity count — the original never ran any of it. What it must
 * prove is the same contract as the optional tags: it reads a finished run and
 * never moves a score, a hit count, a rank or a row of it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { runOphis } from '../src/core/ophis/run.js';
import { makeIsoEvent, makeXDate } from '../src/state/iso-event.js';
import { SYNODIC_MONTH, MILLIS_PER_DAY } from '../src/core/ophis/constants.js';
import {
  anchorMatrix, validity, applyValidity, isIsometricOrHolo, gapReadings, moonDials, horizon, MOON_CYCLES,
} from '../src/core/ophis/lab.js';
import { listTags, HOLOFLECTIVE_LIST } from '../src/core/ophis/tags.js';
import { HOLOFLECTIVE, IMMORTAL_LOOP } from '../src/data/holoflective.js';
import { msrfTier } from '../src/data/msrf-tiers.js';

const NOW = Date.UTC(2026, 7, 25);
const event = () => makeIsoEvent(0, {
  x_dates: [[2026, 7, 4], [2026, 8, 20], [2027, 3, 9], [2027, 3, 16], [2027, 7, 17]]
    .map(([y, m, d]) => makeXDate(y, m, d)),
});
const cast = () => {
  const ev = event();
  return { ev, r: runOphis(ev, { now: NOW }) };
};
const snapshot = (r) => JSON.stringify(r.processed_z_dates.map((z) => [z.key, z.score, z.hit_count]));

test('the Holoflective table is transcribed as digit reversals, 75 pairs', () => {
  assert.equal(HOLOFLECTIVE.length, 75, '16 + 32 + 27 across the three pages');
  for (const { sum, mirror } of HOLOFLECTIVE) {
    assert.equal(String(sum).split('').reverse().join(''), String(mirror), `${sum} ⇄ ${mirror}`);
  }
  assert.equal(new Set(HOLOFLECTIVE.map((h) => h.sum)).size, 75, 'no sum listed twice');
  assert.equal(HOLOFLECTIVE.filter((h) => h.major).length, 12, 'the source’s twelve asterisks');
  assert.equal(String(IMMORTAL_LOOP * 4), String(IMMORTAL_LOOP).split('').reverse().join(''), '2178 × 4 = 8712');
});

test('nothing in the Lab changes the run it reads', () => {
  const { ev, r } = cast();
  const before = snapshot(r);
  anchorMatrix(r, ev);
  applyValidity(r);
  gapReadings(r);
  listTags(r, HOLOFLECTIVE_LIST);
  r.processed_z_dates.forEach(validity);
  assert.equal(snapshot(r), before);
  assert.equal(r.processed_z_dates.length, 114, 'the golden row count is untouched');
});

test('the anchor matrix counts from every enabled X-date and tiers whole counts', () => {
  const { ev, r } = cast();
  const { xs, rows } = anchorMatrix(r, ev);
  assert.equal(xs.length, 5);
  assert.equal(rows.length, r.processed_z_dates.length);

  const best = rows.find((row) => row.z.readable_start === '09/29/2027');
  assert.deepEqual(best.cells.map((c) => c.days), [452, 405, 204, 197, 74]);
  assert.equal(best.cells[1].tier.tier, msrfTier(405).tier);
  assert.equal(best.cells[0].tier, null, '452 is on no tier');

  const disabled = event();
  disabled.x_dates[2].enabled = false;
  assert.equal(anchorMatrix(runOphis(disabled, { now: NOW }), disabled).xs.length, 4, 'a disabled anchor gets no column');
});

test('the validity rule follows the Programmer Instructions', () => {
  assert.ok(isIsometricOrHolo('X2+oph_round(Y)'));
  assert.ok(isIsometricOrHolo('X1+oph_flip(oph_round(Y))'));
  assert.ok(!isIsometricOrHolo('X2+YxOPH_PHI'));

  const hit = (equation, weight) => ({ operation_result: { operation: { equation, weight } } });
  const row = (ops, msrf = 0) => ({ operation_match_structs: ops, resonance_matches: Array(msrf).fill({}) });

  assert.equal(validity(row([hit('X2+YxOPH_PI', 0.5)])).valid, false, 'one beta alone');
  assert.equal(validity(row([hit('X2+YxOPH_PI', 0.5)], 1)).valid, true, 'one beta with an MSRF match');
  assert.equal(validity(row([hit('X2+YxOPH_PI', 0.5), hit('X1+YxOPH_CRV', 0.5)])).valid, true, 'two betas');
  assert.equal(validity(row([hit('X2+YxOPH_PHI', 1)])).valid, true, 'an ALPHA stands alone');
  assert.equal(validity(row([hit('X2+oph_round(Y)', 1)])).valid, false, 'the isometric needs the MSRF, weight or not');
  assert.equal(validity(row([hit('X2+oph_round(Y)', 1), hit('X2+YxOPH_PI', 0.5)])).valid, false, 'isometric plus one beta is still one core hit');

  const { r } = cast();
  const view = applyValidity(r);
  assert.equal(view.processed_z_dates.length + view.set_aside, r.processed_z_dates.length);
  assert.ok(view.processed_z_dates.every((z) => validity(z).valid));
  assert.equal(view.y_structs, r.y_structs, 'the rest of the run is shared, not rebuilt');
});

test('gaps are read in lunations, with the moon’s returns', () => {
  const { r } = cast();
  const gaps = gapReadings(r);
  assert.equal(gaps.length, 10);
  const g = gaps.find((x) => x.x1 === 0 && x.x2 === 3);
  assert.equal(g.Y, 255);
  assert.equal(g.holo.mirror, 552);
  assert.equal(g.tier.tier, msrfTier(255).tier);

  const fake = { y_structs: [{ x_1_ordinal: 0, x_2_ordinal: 1, rotation_count_y: 6940 }] };
  const names = gapReadings(fake)[0].returns.map((c) => c.name);
  assert.ok(names.includes('Metonic'), '6940 days is one Metonic cycle, 235 lunations');
  assert.ok(names.includes('Lunation'));
  assert.ok(!names.includes('Saros'));
});

test('the moon dials are whole lunations from the first date', () => {
  const metonic = MOON_CYCLES.find((c) => c.id === 'metonic');
  assert.equal(metonic.days, 235 * SYNODIC_MONTH);

  const x1 = Date.UTC(2026, 6, 4);
  const at = (days) => moonDials(x1, x1 + days * MILLIS_PER_DAY);
  assert.ok(at(0).every((d) => d.atReturn && d.whole === 0));
  const back = at(metonic.days).find((d) => d.id === 'metonic');
  assert.equal(back.whole, 1);
  assert.ok(back.atReturn);
  const half = at(SYNODIC_MONTH / 2).find((d) => d.id === 'lunation');
  assert.ok(Math.abs(half.fraction - 0.5) < 1e-9);
  assert.equal(half.atReturn, false);
});

test('how far ahead to look follows the three cases, and is silent otherwise', () => {
  const ev = (...ds) => makeIsoEvent(0, { x_dates: ds.map(([y, m, d]) => makeXDate(y, m, d)) });
  const now = Date.UTC(2026, 9, 26);
  assert.equal(horizon(ev([2026, 1, 1], [2026, 1, 4]), now).toDays, 31, 'two dates 3 days apart');
  assert.equal(horizon(ev([2026, 5, 1], [2026, 10, 10]), now).toDays, 152, 'latest within 30 days');
  assert.equal(horizon(ev([2026, 5, 1], [2026, 9, 5]), now).toDays, 365, 'latest within 60 days');
  assert.equal(horizon(ev([2025, 5, 1], [2026, 1, 5]), now), null);
  assert.equal(horizon(ev([2026, 1, 1]), now), null, 'one date has no rule');
});
