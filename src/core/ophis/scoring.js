/**
 * Scoring for the `ophis` reckoning.
 *
 * Two systems ship. GTE_V8 is the default and the only one v12's GUI could
 * reach — its import coerced every unrecognised value to it — but LTE_V7 is
 * still in the format, so a file that names it keeps it and the UI exposes it.
 *
 * The one part worth reading twice is the multiplier. `M` is a MAX, never a
 * product: ten Important matches multiply once and add two points each. The
 * subscore then withholds the first match whose own multiplier equals `M`, on
 * the grounds that that match is already being paid for by the multiplication.
 * Because step 2 sorts by multiplier descending, the withheld element is always
 * index 0 — but the rule is written as "the first match whose multiplier is M"
 * rather than "index 0", because that is what makes it correct if the sort ever
 * changes.
 */

import { round2 } from './numeric.js';
import { SCORING_SYSTEM } from './constants.js';

/**
 * Order operation matches: heaviest first, then by position in the tables.
 *
 * The ordering is not cosmetic — it fixes which operation a tooltip attributes
 * a contribution to when two operations land the same Z-Date.
 */
function sortOperationMatches(matches, effectiveOperations) {
  return matches.slice().sort((a, b) => {
    const wa = effectiveOperations[a.operation_result.operation_ordinal]?.weight ?? 0;
    const wb = effectiveOperations[b.operation_result.operation_ordinal]?.weight ?? 0;
    if (wa !== wb) return wb - wa;
    if (a.operation_result.operation_ordinal !== b.operation_result.operation_ordinal) {
      return a.operation_result.operation_ordinal - b.operation_result.operation_ordinal;
    }
    if (a.y_struct.x_1_ordinal !== b.y_struct.x_1_ordinal) {
      return a.y_struct.x_1_ordinal - b.y_struct.x_1_ordinal;
    }
    return a.y_struct.x_2_ordinal - b.y_struct.x_2_ordinal;
  });
}

/** Order resonance matches: strongest multiplier first, then the longest projection. */
function sortResonanceMatches(matches) {
  return matches.slice().sort((a, b) => {
    if (a.multiplier !== b.multiplier) return b.multiplier - a.multiplier;
    return (b.operation_result?.rotation_count_z ?? 0) - (a.operation_result?.rotation_count_z ?? 0);
  });
}

/**
 * Score one z-struct in place.
 *
 * Writes `operation_score`, `resonance_subscore`, `resonance_number_sum`,
 * `base_score_pre_multiply`, `score_multiplier`, `score`, `operation_hit_count`
 * and `hit_count`. The subscore and the number sum are stamped here rather than
 * recomputed in a comparator, because the MSRF sort needs both and a comparator
 * that recomputes is a comparator that gets called O(n log n) times.
 *
 * @param {object} z the z-struct
 * @param {Array<object>} effectiveOperations indexed by operation_ordinal
 * @param {string} systemId SCORING_SYSTEM.*
 */
export function scoreZStruct(z, effectiveOperations, systemId = SCORING_SYSTEM.GTE_V8) {
  z.operation_match_structs = sortOperationMatches(z.operation_match_structs, effectiveOperations);
  z.resonance_matches = sortResonanceMatches(z.resonance_matches);

  // STEP 3 — the operation score is the sum of the WEIGHTS, verbatim. An
  // operation's weight is user-editable and unbounded, so this is not simply
  // "1 per alpha, 0.5 per beta"; it just happens to be that for the defaults.
  let operationScore = 0;
  for (const m of z.operation_match_structs) {
    const w = effectiveOperations[m.operation_result.operation_ordinal]?.weight ?? 0;
    m.points = w; // stamped for the pill tooltip
    operationScore += w;
  }

  const isV7 = systemId === SCORING_SYSTEM.LTE_V7;

  // STEP 4 — M is a max over the matches, floored at 1.0 so "no resonance"
  // multiplies by one rather than by zero.
  let M = 1.0;
  if (!isV7) {
    for (const m of z.resonance_matches) if (m.multiplier > M) M = m.multiplier;
  }

  // STEP 5 — sum the points, withholding the first match that carries M itself.
  let resonanceSubscore = 0;
  let numberSum = 0;
  let withheld = false;
  for (const m of z.resonance_matches) {
    numberSum += m.number;
    if (!isV7 && !withheld && m.multiplier === M) {
      withheld = true;
      continue;
    }
    resonanceSubscore += m.points;
  }

  // STEP 6 — base is stored UNROUNDED. Rounding it here would compound into the
  // multiplied score; the presentation layer rounds it to 2 dp for tooltips.
  const base = operationScore + resonanceSubscore;

  z.operation_score = operationScore;
  z.resonance_subscore = resonanceSubscore;
  z.resonance_number_sum = numberSum;
  z.base_score_pre_multiply = base;
  z.score_multiplier = isV7 ? 1 : M;
  z.score = isV7 ? round2(base) : round2(base * M);

  z.operation_hit_count = z.operation_match_structs.length;
  z.hit_count = z.operation_hit_count + z.resonance_matches.length;

  return z;
}

/** Score every z-struct in a run. */
export function scoreAll(zStructs, effectiveOperations, systemId) {
  for (const z of zStructs) scoreZStruct(z, effectiveOperations, systemId);
  return zStructs;
}

/** `weight >= 1` is Alpha, `< 1` is Beta. The class is derived, never stored. */
export const isAlpha = (op) => (op?.weight ?? 0) >= 1;
export const operationClass = (op) => (isAlpha(op) ? 'Alpha' : 'Beta');
