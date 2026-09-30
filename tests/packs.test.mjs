/**
 * The operation packs, and adding one to a table rather than replacing it.
 *
 * Separate from the parity suite: that suite's count is the contract with the
 * original program, and the original had one table and no way to merge.
 *
 * Why merging exists at all. The three canonical packs are versions of ONE
 * table — v7 and v8-v9 are strict subsets of v10+ — so loading one over another
 * is the right behaviour and merging them could only duplicate. The Extras pack
 * shares no equation with any of them, so replacing your table to reach it threw
 * away the sixteen you were running, and appending is the only route to all 26.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OPHIS_PACKS, packOperations, mergeOperations, DEFAULT_OPHIS_PACK,
} from '../src/data/packs-ophis.js';

const eqs = (id) => new Set(packOperations(id).map((o) => o.equation));

/* ------------------------------------------------- what the packs contain -- */

test('the canonical packs are versions of one table, not alternatives', () => {
  const v10 = eqs('ophis-gte-v10');
  for (const id of ['ophis-gte-v8', 'ophis-lte-v7']) {
    const older = eqs(id);
    const shared = [...older].filter((e) => v10.has(e)).length;
    assert.equal(shared, older.size, `${id} should be a strict subset of v10+`);
  }
});

/**
 * If this ever fails, merging Extras would start producing duplicate rows and
 * the "additive" flag would be wrong. It is the assumption the whole feature
 * rests on, so it is pinned rather than assumed.
 */
test('Extras shares no equation with the live default', () => {
  const v10 = eqs(DEFAULT_OPHIS_PACK);
  const shared = [...eqs('ophis-xtras')].filter((e) => v10.has(e));
  assert.deepEqual(shared, [], 'Extras must stay disjoint from the shipped table');
});

test('exactly one pack is marked additive', () => {
  const additive = Object.values(OPHIS_PACKS).filter((p) => p.additive).map((p) => p.id);
  assert.deepEqual(additive, ['ophis-xtras']);
});

test('the Extras ship switched off', () => {
  assert.equal(packOperations('ophis-xtras').some((o) => o.enabled), false);
});

/* -------------------------------------------------------------- merging -- */

test('adding Extras to the default gives all 26, keeping the 16', () => {
  const base = packOperations(DEFAULT_OPHIS_PACK);
  const { operations, added, skipped } = mergeOperations(base, 'ophis-xtras');

  assert.equal(base.length, 16);
  assert.equal(added, 10);
  assert.equal(skipped, 0);
  assert.equal(operations.length, 26);
  assert.equal(new Set(operations.map((o) => o.equation)).size, 26, 'no duplicates');

  // The original sixteen are untouched, in order, still enabled.
  for (const [i, op] of base.entries()) {
    assert.equal(operations[i].equation, op.equation);
    assert.equal(operations[i].ordinal, op.ordinal);
    assert.equal(operations[i].enabled, op.enabled);
  }
  // The ten arrive switched off, so nothing that cast before casts differently.
  assert.equal(operations.slice(16).some((o) => o.enabled), false);
});

/**
 * Ordinals decide which anchor an X1+ operation binds to, so renumbering a row
 * the user already has would silently change results on a document that cast
 * correctly. Appending must never touch them.
 */
test('existing ordinals survive untouched, and the new ones continue from the highest', () => {
  const existing = [
    { equation: 'X1+Y',    weight: 1, enabled: true, ordinal: 0 },
    { equation: 'X2+Y',    weight: 1, enabled: true, ordinal: 7 },   // sparse on purpose
    { equation: 'X1+Yx2',  weight: 1, enabled: true, ordinal: 3 },   // and out of order
  ];
  const { operations } = mergeOperations(existing, 'ophis-xtras');

  assert.deepEqual(operations.slice(0, 3).map((o) => o.ordinal), [0, 7, 3], 'untouched');
  assert.deepEqual(
    operations.slice(3).map((o) => o.ordinal),
    [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    'continues from the highest in use, not from the row count'
  );
});

test('adding twice is a no-op the second time', () => {
  const once = mergeOperations(packOperations(DEFAULT_OPHIS_PACK), 'ophis-xtras');
  const twice = mergeOperations(once.operations, 'ophis-xtras');

  assert.equal(twice.added, 0);
  assert.equal(twice.skipped, 10);
  assert.equal(twice.operations.length, 26, 'still 26, not 36');
});

test('a partial overlap adds only what is missing', () => {
  const extras = packOperations('ophis-xtras');
  const base = [...packOperations(DEFAULT_OPHIS_PACK), { ...extras[0], ordinal: 16 }];

  const { added, skipped, operations } = mergeOperations(base, 'ophis-xtras');
  assert.equal(added, 9);
  assert.equal(skipped, 1);
  assert.equal(operations.length, 26);
});

test('an unknown pack changes nothing rather than emptying the table', () => {
  const base = packOperations(DEFAULT_OPHIS_PACK);
  const { operations, added } = mergeOperations(base, 'no-such-pack');
  assert.equal(added, 0);
  assert.equal(operations, base, 'the same array back, not a null or an empty one');
});

/* ------------------------------------------------------ it still casts -- */

/**
 * The point of the feature is not the table, it is the run. Twenty-six
 * operations must produce more projections than sixteen and the engine must
 * stay finite — a hand-written equation that cannot compile would show up here.
 */
test('all 26 enabled cast further than the shipped 16', async () => {
  const { runOphis } = await import('../src/core/ophis/run.js');
  const { makeIsoEvent, makeXDate } = await import('../src/state/iso-event.js');

  const build = (operations) => {
    const ev = makeIsoEvent(0, {
      x_dates: [makeXDate(2026, 1, 1), makeXDate(2026, 7, 4), makeXDate(2027, 3, 9)],
      operations,
    });
    for (const k of Object.keys(ev)) {
      if (k.startsWith('iso_event_filter_') && !k.endsWith('_value')) ev[k] = false;
    }
    return ev;
  };

  const sixteen = runOphis(build(packOperations(DEFAULT_OPHIS_PACK)), { now: Date.UTC(2026, 0, 1) });
  const all26 = mergeOperations(packOperations(DEFAULT_OPHIS_PACK), 'ophis-xtras')
    .operations.map((o) => ({ ...o, enabled: true }));
  const twentySix = runOphis(build(all26), { now: Date.UTC(2026, 0, 1) });

  assert.ok(
    twentySix.processed_z_dates.length > sixteen.processed_z_dates.length,
    `26 ops gave ${twentySix.processed_z_dates.length}, 16 gave ${sixteen.processed_z_dates.length}`
  );
  for (const z of twentySix.processed_z_dates) {
    assert.ok(Number.isFinite(z.z_start), 'every projection resolves to a real instant');
  }
});
