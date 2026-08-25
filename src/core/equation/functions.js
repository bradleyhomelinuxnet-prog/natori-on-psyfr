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

/** Greatest common divisor of two whole numbers. */
function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) [a, b] = [b, a % b];
  return a;
}

/**
 * Arity is read from `fn.length`, so declare parameters explicitly — a rest
 * parameter or a default value would report the wrong count to the parser.
 */
export const FUNCTIONS = {
  /* --- the original six --- */
  oph_round: (v) => Math.round(v),
  oph_floor: (v) => Math.floor(v),
  oph_ceil: (v) => Math.ceil(v),
  oph_abs: (v) => Math.abs(v),
  oph_sqrt: (v) => Math.sqrt(Math.abs(v)), // abs first, so negatives never yield NaN
  oph_flip,

  /* --- arithmetic --- */
  oph_mod: (a, b) => (b === 0 ? 0 : ((a % b) + b) % b), // always non-negative
  oph_pow: (a, b) => a ** b,
  oph_log: (v) => (v > 0 ? Math.log(v) : 0),
  oph_gcd: (a, b) => gcd(a, b),
  oph_lcm: (a, b) => {
    const g = gcd(a, b);
    return g === 0 ? 0 : Math.abs(Math.round(a) * Math.round(b)) / g;
  },
  /** Snap a value to the nearest whole multiple of `step` — the cycle-snap idiom. */
  oph_snap: (v, step) => (step === 0 ? v : Math.round(v / step) * step),

  /* --- trigonometric, arguments in radians --- */
  oph_sin: (v) => Math.sin(v),
  oph_cos: (v) => Math.cos(v),
  oph_tan: (v) => Math.tan(v),
  oph_atan2: (y, x) => Math.atan2(y, x),
};

/** Human-readable notes, shown in the equation editor and under Method. */
export const FUNCTION_NOTES = {
  oph_round: 'Round to nearest integer',
  oph_floor: 'Round down',
  oph_ceil: 'Round up',
  oph_abs: 'Absolute value',
  oph_sqrt: 'Square root of the absolute value',
  oph_flip: 'Reverse the digits (decimal point keeps its position)',
  oph_mod: 'Remainder, always non-negative — oph_mod(a, b)',
  oph_pow: 'a raised to the power b — oph_pow(a, b)',
  oph_log: 'Natural logarithm (0 for non-positive input)',
  oph_gcd: 'Greatest common divisor — oph_gcd(a, b)',
  oph_lcm: 'Lowest common multiple — oph_lcm(a, b)',
  oph_snap: 'Snap to the nearest multiple — oph_snap(Y, 138)',
  oph_sin: 'Sine (radians)',
  oph_cos: 'Cosine (radians)',
  oph_tan: 'Tangent (radians)',
  oph_atan2: 'Angle of the point (x, y) — oph_atan2(y, x)',
};
