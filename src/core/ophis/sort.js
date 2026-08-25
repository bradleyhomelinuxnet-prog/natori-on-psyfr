/**
 * Sorting the results table.
 *
 * Five types shipped; a sixth is added here. Every comparator bottoms out on
 * date ascending, so the order is total and reproducible.
 *
 * Two documented defects in the original, and what this does about them:
 *
 *   - `OPERATIONS` never sorted by operation score. Both arms of the original's
 *     if/else assigned the COUNT, so the column tooltip promised something the
 *     code never did. Reproduced for parity, the tooltip corrected to say
 *     "number of Operations", and the behaviour the tooltip promised is exposed
 *     as a separate `OPERATION_SCORE` type.
 *   - No original comparator ever returned 0: `(a > b ? -1 : 1)` returns 1 in
 *     both directions for equal values, which makes ties non-transitive and the
 *     result dependent on input order. These return 0 and rely on a stable sort,
 *     which can reorder tied rows relative to v12. Anything ordered by a genuine
 *     key is unaffected.
 */

import { SORT_TYPE } from './constants.js';

const byDateAsc = (a, b) => a.zStart - b.zStart;

const COMPARATORS = {
  [SORT_TYPE.DATE]: byDateAsc,

  [SORT_TYPE.SCORE]: (a, b) =>
    b.score - a.score || b.hit_count - a.hit_count || byDateAsc(a, b),

  [SORT_TYPE.HIT_COUNT]: (a, b) => b.hit_count - a.hit_count || byDateAsc(a, b),

  // Primary key is the GTE_V8 subscore — the strongest match already excluded —
  // so a row whose only resonance is its multiplier ranks below one that also
  // carries points. Both keys are stamped during scoring, never recomputed here.
  [SORT_TYPE.MSRF]: (a, b) =>
    b.resonance_subscore - a.resonance_subscore ||
    b.resonance_number_sum - a.resonance_number_sum ||
    byDateAsc(a, b),

  [SORT_TYPE.OPERATIONS]: (a, b) =>
    b.operation_hit_count - a.operation_hit_count || byDateAsc(a, b),

  [SORT_TYPE.OPERATION_SCORE]: (a, b) =>
    b.operation_score - a.operation_score || byDateAsc(a, b),
};

/** An unrecognised sort type is coerced to DATE rather than producing a garbage order. */
export function normaliseSortType(id) {
  return Object.hasOwn(COMPARATORS, id) ? id : SORT_TYPE.DATE;
}

export const getComparator = (id) => COMPARATORS[normaliseSortType(id)];

/**
 * Sort twice, deliberately.
 *
 * The first pass is always by DATE and exists only to stamp `z_ordinal`, so the
 * Z1, Z2, … row labels stay chronological no matter which column the user sorts
 * by. Sorting by Score therefore yields Z3, Z1, Z9… — which looks wrong and is
 * not: the label identifies the date, the row position reflects the sort. The
 * chart shares the same labels, which is what makes cross-highlighting legible.
 *
 * @returns {Array<object>} a new array; the input is not reordered
 */
export function sortAndLabel(zStructs, sortTypeId) {
  const chronological = zStructs.slice().sort(byDateAsc);
  chronological.forEach((z, i) => {
    z.z_ordinal = i;
  });
  return chronological.slice().sort(getComparator(sortTypeId));
}
