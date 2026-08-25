/**
 * The complete test-bradley golden, asserted row for row.
 *
 * `docs/reverse/fixtures/golden-test-bradley.txt` was produced by
 * `generate-golden.mjs` — a from-spec reference implementation written
 * independently of `src/`, sharing none of its code. Two implementations of
 * the same specification agreeing on every field of every one of the 114
 * surviving rows is the strongest differential statement available without
 * the original binary present.
 *
 * The earlier suite asserted the volumes and a handful of named rows. This
 * asserts the whole table: key, date, hit count, score, operation score,
 * multiplier, unrounded base, and the resonance-match sequence per row.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { runOphis } from '../src/core/ophis/run.js';
import { makeIsoEvent, makeXDate } from '../src/state/iso-event.js';
import { fmtDate } from '../src/core/ophis/calendar.js';

const GOLDEN = readFileSync(
  new URL('../docs/reverse/fixtures/golden-test-bradley.txt', import.meta.url),
  'utf8'
);

const TIER = { N: 'NORMAL', I: 'IMPORTANT', V: 'VORTEX' };

/** Parse the FULL SCORED LIST section into structured rows. */
function parseGolden() {
  const rows = [];
  const section = GOLDEN.split('=== FULL SCORED LIST, SORTED BY DATE')[1];
  for (const line of section.split('\n')) {
    const m = /^Z\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([\d/]+)\s*\|\s*(\d+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|(.*)$/.exec(line);
    if (!m) continue;
    const matches = [...m[9].matchAll(/([\d.]+)->([\d.]+)\((N|I|V)\)/g)].map((g) => ({
      probe: Number(g[1]),
      number: Number(g[2]),
      tier: TIER[g[3]],
    }));
    rows.push({
      ordinal: Number(m[1]),
      key: m[2],
      date: m[3],
      hits: Number(m[4]),
      score: Number(m[5]),
      opScore: Number(m[6]),
      mult: Number(m[7]),
      base: Number(m[8]),
      matches,
    });
  }
  return rows;
}

const run = () =>
  runOphis(
    makeIsoEvent(0, {
      x_dates: [
        [2026, 7, 4], [2026, 8, 20], [2027, 3, 9], [2027, 3, 16], [2027, 7, 17],
      ].map(([y, m, d]) => makeXDate(y, m, d)),
    }),
    { now: Date.UTC(2026, 7, 25) }
  );

test('the golden Y-structs reproduce, pair for pair', () => {
  const r = run();
  const golden = [...GOLDEN.matchAll(/^y(\d+): X\d\([\d/]+\) -> X\d\([\d/]+\)\s+Y=(\d+)$/gm)].map(
    (m) => [Number(m[1]), Number(m[2])]
  );
  assert.equal(golden.length, 10);
  for (const [ordinal, Y] of golden) {
    assert.equal(r.y_structs[ordinal].rotation_count_y, Y, `y${ordinal}`);
  }
});

test('all 114 golden rows reproduce, every field', () => {
  const golden = parseGolden();
  assert.equal(golden.length, 114, 'the golden carries the full surviving list');

  const r = run();
  const mine = r.processed_z_dates__sorted_by_date;
  assert.equal(mine.length, golden.length);

  for (const g of golden) {
    const z = mine[g.ordinal - 1];
    const label = `Z${g.ordinal} ${g.date}`;

    assert.equal(z.z_ordinal + 1, g.ordinal, `${label}: ordinal`);
    assert.equal(z.key, g.key, `${label}: bucket key`);
    assert.equal(fmtDate(z.zStart), g.date, `${label}: date`);
    assert.equal(z.hit_count, g.hits, `${label}: hits`);
    assert.equal(z.score, g.score, `${label}: score`);
    assert.equal(z.operation_score, g.opScore, `${label}: operation score`);
    assert.equal(z.score_multiplier, g.mult, `${label}: multiplier`);
    assert.equal(z.base_score_pre_multiply, g.base, `${label}: unrounded base`);

    // The resonance sequence, in the order scoring leaves it: strongest
    // multiplier first, then the longer projection. The probe is the
    // operation result's rotation_count_z — the 1-dp value the filter tested.
    assert.deepEqual(
      z.resonance_matches.map((m) => ({
        probe: m.operation_result.rotation_count_z,
        number: m.number,
        tier: m.tier,
      })),
      g.matches,
      `${label}: resonance matches`
    );
  }
});
