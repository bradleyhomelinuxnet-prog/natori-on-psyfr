/**
 * Functions callable inside an operation equation.
 *
 * MOD POINT — add a function here and it becomes available in equations at once.
 * Keep them pure, single-argument, and total (never throw, never return NaN for
 * ordinary input); the evaluator rejects non-finite results anyway.
 */

/**
 * Digit reversal, as Ophis defines it.
 *
 * The decimal point is re-inserted at the index it occupied in the ORIGINAL
 * string, not at the mirrored position — so this is not simply "reverse the
 * number". A trailing `|| 0` also folds NaN to 0. Both quirks are load-bearing
 * for parity with the original; do not "fix" them.
 *
 *   oph_flip(123)    -> 321
 *   oph_flip(120)    -> 21     (leading zero collapses)
 *   oph_flip(12.5)   -> 5.21   (point stays at index 2)
 */
export function oph_flip(v) {
  const s = String(v);
  const dot = s.indexOf('.');
  const r = s.replace('.', '').split('').reverse();
  if (dot > 0) r.splice(dot, 0, '.');
  return Number(r.join('')) || 0;
}

export const FUNCTIONS = {
  oph_round: (v) => Math.round(v),
  oph_floor: (v) => Math.floor(v),
  oph_ceil: (v) => Math.ceil(v),
  oph_abs: (v) => Math.abs(v),
  oph_sqrt: (v) => Math.sqrt(Math.abs(v)), // abs first, so negatives never yield NaN
  oph_flip,
};

/** Human-readable notes, shown in the equation editor. */
export const FUNCTION_NOTES = {
  oph_round: 'Round to nearest integer',
  oph_floor: 'Round down',
  oph_ceil: 'Round up',
  oph_abs: 'Absolute value',
  oph_sqrt: 'Square root of the absolute value',
  oph_flip: 'Reverse the digits (decimal point keeps its position)',
};
