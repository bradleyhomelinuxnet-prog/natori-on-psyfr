/**
 * Per-reckoning constant and function tables.
 *
 * The two engines that were fused into this app disagree about values that
 * share a name, and the disagreements are real rather than transcription slips:
 *
 *   - OPH_PHI is 1.618 in the desktop `ophis` engine and 1.61803398875 in the
 *     browser `chronicon` one. Every projection through a phi operation lands on
 *     a different day depending on which is used.
 *   - `ophis` has OPH_HEP; `chronicon` has never heard of it.
 *   - `ophis`'s oph_sqrt returns NaN for a negative, and its oph_flip returns
 *     NaN rather than 0. `chronicon` folds both to a number, and some of its
 *     shipped equations rely on that fallthrough.
 *   - `ophis` has oph_exp; `chronicon` does not.
 *
 * So the tables are kept apart, and `compileOperation` is told which to use.
 * Unifying them is the one refactor guaranteed to move results.
 */

import { CONSTANTS, CONSTANT_NOTES } from './constants.js';
import { FUNCTIONS, FUNCTION_NOTES } from './functions.js';

/** Digit reversal with the strict NaN policy the ophis engine uses. */
export function oph_flip_strict(v) {
  const s = String(v);
  const dot = s.indexOf('.');
  const r = s.replace('.', '').split('').reverse();
  if (dot > 0) r.splice(dot, 0, '.');
  return Number(r.join(''));
}

/** The eleven single-argument functions the desktop engine exposed. */
const OPHIS_FUNCTIONS = {
  oph_sqrt: (v) => Math.sqrt(v),
  oph_abs: (v) => Math.abs(v),
  oph_floor: (v) => Math.floor(v),
  oph_ceil: (v) => Math.ceil(v),
  oph_log: (v) => Math.log(v),
  oph_sin: (v) => Math.sin(v),
  oph_cos: (v) => Math.cos(v),
  oph_tan: (v) => Math.tan(v),
  /**
   * Present for fidelity, but UNREACHABLE — and it was unreachable in the
   * original too. `x` is the multiplication operator, so `oph_exp(Y)` lexes as
   * `oph_e * p(Y)`. The original reached the same dead end from the other
   * direction: it ran `.replace(/x/g, '*')` over the equation body before
   * compiling, turning the name into `oph_e*p`. No shipped equation calls it.
   * Kept so the registry matches the eleven the desktop engine declared; the
   * parser reports a clear unknown-name error rather than silently multiplying.
   */
  oph_exp: (v) => Math.exp(v),
  oph_round: (v) => Math.round(v),
  oph_flip: oph_flip_strict,
};

const OPHIS_CONSTANTS = {
  OPH_PI: 3.14,
  OPH_PHI: 1.618,
  OPH_CRV: 5.08,
  OPH_HEP: 7.01,
};

export const RECKONINGS = {
  /**
   * The browser lineage. Its grammar is a deliberate superset — multi-argument
   * functions and the extra cycle constants — because those were the top two
   * items on the owner's roadmap and each was a data edit. Strictly additive:
   * every equation the original accepted still parses to the same value.
   */
  chronicon: {
    id: 'chronicon',
    label: 'Chronicon',
    constants: CONSTANTS,
    functions: FUNCTIONS,
    constantNotes: CONSTANT_NOTES,
    functionNotes: FUNCTION_NOTES,
  },

  /** The desktop lineage, reproduced exactly as it shipped. */
  ophis: {
    id: 'ophis',
    label: 'Ophis',
    constants: OPHIS_CONSTANTS,
    functions: OPHIS_FUNCTIONS,
    constantNotes: {
      OPH_PI: 'π truncated to 3.14 — the Archaix value',
      OPH_PHI: 'Golden ratio φ, to three places',
      OPH_CRV: 'Curvature · π × φ rounded to 5.08',
      OPH_HEP: 'Hepta-cycle · 7.01',
    },
    functionNotes: {
      oph_sqrt: 'Square root (NaN for a negative)',
      oph_abs: 'Absolute value',
      oph_floor: 'Round down',
      oph_ceil: 'Round up',
      oph_log: 'Natural logarithm',
      oph_sin: 'Sine (radians)',
      oph_cos: 'Cosine (radians)',
      oph_tan: 'Tangent (radians)',
      oph_exp: 'e raised to the power',
      oph_round: 'Round to nearest integer (half up)',
      oph_flip: 'Reverse the digits (decimal point keeps its position)',
    },
  },
};

export const DEFAULT_RECKONING = 'chronicon';

export function getReckoning(id) {
  return RECKONINGS[id] ?? RECKONINGS[DEFAULT_RECKONING];
}
