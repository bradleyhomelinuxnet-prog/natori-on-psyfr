/**
 * The Ophis operation packs.
 *
 * ORDINAL ORDER IS LOAD-BEARING. `operation_ordinal` indexes this array
 * everywhere — in the score attribution, in the `O<n>` pill labels, in the audit
 * trace and in the saved file. Inserting a row in the middle renumbers every
 * result that follows it.
 *
 * `weight` is what actually feeds the score, and it doubles as the operation's
 * class: >= 1 is Alpha, < 1 is Beta. Two rows carry weights that changed across
 * versions — #5 and #9 were promoted from 0.5 to 1 at v8 — which is why the
 * historical packs exist rather than being reconstructible from a flag.
 *
 * This file is DATA. Edit it freely — nothing else needs to change.
 */

/** The live default: all sixteen. */
const GTE_V10 = [
  ['X2+oph_round(Y)', 1, 'Isometric Date'],
  ['X2+oph_flip(oph_round(Y))', 1, 'Holo-date'],
  ['X2+Y/OPH_CRV', 0.5, ''],
  ['X1+(Y/2.0)xOPH_PI', 0.5, ''],
  ['X2+Y/OPH_PHI', 1, ''],
  ['X2+(Y/2.0)xOPH_PHI', 1, 'originally beta phi 6, promoted at v8'],
  ['X1+(Y/2.0)xOPH_CRV', 0.5, ''],
  ['X2+(Y/2.0)xOPH_PI', 0.5, ''],
  ['X2+YxOPH_PHI', 1, ''],
  ['X1+YxOPH_PI', 1, 'radius projection, promoted at v8'],
  ['X2+(Y/2.0)xOPH_CRV', 0.5, ''],
  ['X2+YxOPH_PI', 0.5, ''],
  ['X1+YxOPH_CRV', 0.5, ''],
  ['X2+YxOPH_CRV', 0.5, ''],
  ['X1+YxOPH_HEP', 1, 'hepta-cycle, added Aug 2025'],
  ['X2+YxOPH_HEP', 1, 'hepta-cycle for X2, added Dec 2025'],
];

const row = (packId) => ([equation, weight, note], i) => ({
  equation,
  weight,
  enabled: true,
  packId,
  ordinal: i,
  note,
});

/** The ten hand-written extras that never shipped enabled. Bare literals, no named constants. */
const XTRAS = [
  ['X1+Yx2.718', 0.5, 'e'],
  ['X2+Yx2.718', 0.5, 'e'],
  ['X1+Yx1.38', 0.5, 'Phoenix / 100'],
  ['X2+Yx1.38', 0.5, 'Phoenix / 100'],
  ['X1+Yx5.52', 0.5, '138 x 4 / 100'],
  ['X2+Yx5.52', 0.5, '138 x 4 / 100'],
  ['X1+(Y/2.0)x5.52', 0.5, '138 x 4 / 100'],
  ['X1+Yx2.178', 0.5, 'vortex 217.8 / 100'],
  ['X2+Yx2.178', 0.5, 'vortex 217.8 / 100'],
  ['X2+Yx0.360', 0.5, '360 / 1000'],
];

export const OPHIS_PACKS = {
  'ophis-gte-v10': {
    id: 'ophis-gte-v10',
    label: 'Ophis v10+ · 16 operations',
    note: 'The live default. Adds the two hepta-cycle operations to the v8 table.',
    operations: GTE_V10.map(row('ophis-gte-v10')),
  },

  'ophis-gte-v8': {
    id: 'ophis-gte-v8',
    label: 'Ophis v8-v9 · 15 operations',
    note: 'The v8 table: the first fifteen, with #5 and #9 already promoted to Alpha.',
    operations: GTE_V10.slice(0, 15).map(row('ophis-gte-v8')),
  },

  'ophis-lte-v7': {
    id: 'ophis-lte-v7',
    label: 'Ophis v7 and earlier · 15 operations',
    note: 'The v7 table: the first fifteen, with #5 and #9 still at weight 0.5.',
    operations: GTE_V10.slice(0, 15)
      .map(([eq, w, note], i) => [eq, i === 5 || i === 9 ? 0.5 : w, note])
      .map(row('ophis-lte-v7')),
  },

  'ophis-xtras': {
    id: 'ophis-xtras',
    label: 'Extras · 10 operations',
    note: 'Hand-written variants that never shipped. Ship disabled; enable to experiment.',
    operations: XTRAS.map(row('ophis-xtras')).map((o) => ({ ...o, enabled: false })),
  },
};

export const DEFAULT_OPHIS_PACK = 'ophis-gte-v10';

/** A fresh copy — callers mutate operation rows, so never hand out the module's own objects. */
export function packOperations(packId = DEFAULT_OPHIS_PACK) {
  const pack = OPHIS_PACKS[packId];
  return pack ? pack.operations.map((o) => ({ ...o })) : null;
}

/** What the "add operation" button seeds. */
export const newOperation = () => ({ equation: 'X1+Y', weight: 0.5, enabled: true, packId: null });
