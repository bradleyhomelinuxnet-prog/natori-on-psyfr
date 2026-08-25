/**
 * The MSRF resonance provider for the `ophis` reckoning.
 *
 * At most ONE match is ever returned, and the order of the checks is the whole
 * behaviour:
 *
 *   0. round the probe to 1 dp
 *   1. VORTEX first, within a literal tolerance of 0.1
 *   2. anything still ending in ".5" is dead — no integer match is attempted
 *   3. round to an integer
 *   4. IMPORTANT before NORMAL
 *
 * Two consequences fall out of that order and are the reason it is written this
 * way rather than "check all three and take the best":
 *
 *   - `43.5` matches, because it IS a vortex number and step 1 runs before the
 *     ".5" dead zone in step 2.
 *   - `76.3` matches Vortex `76.2` and so STEALS what would have been a Normal
 *     `76` match, upgrading it from 1 point/x1.5 to 2 points/x2.0.
 *
 * The tolerance comparison is deliberately plain IEEE-754 with no epsilon.
 * `76.2 - 76.1` is `0.100000000000001` and so FAILS the `<= 0.1` test, while
 * `76.3 - 76.2` is `0.099999999999994` and passes. That asymmetry is the
 * original's behaviour; adding an epsilon here would quietly change results.
 */

import {
  MSRF_FILTER__NORMAL,
  MSRF_FILTER__IMPORTANT,
  MSRF_FILTER__VORTEX,
  MSRF_TIER_WEIGHTS,
  VORTEX_FILTER_MATCH_TOLERANCE,
} from '../../data/msrf-ophis.js';
import { round1 } from './numeric.js';

/**
 * @typedef {object} MsrfMatch
 * @property {'NORMAL'|'IMPORTANT'|'VORTEX'} tier
 * @property {number} number     the matched filter number
 * @property {number} probe      the 1-dp value that was tested
 * @property {number} points     contribution to the resonance subscore
 * @property {number} multiplier candidate for the score multiplier M
 * @property {string} label      'Normal' | 'Important' | 'Vortex'
 * @property {string} cls        semantic colour class
 */

function hit(tier, number, probe) {
  const w = MSRF_TIER_WEIGHTS[tier];
  return { tier, number, probe, points: w.points, multiplier: w.multiplier, label: w.label, cls: w.cls };
}

/**
 * @param {number} probe usually `rotation_count_z`, but the caller decides
 * @returns {MsrfMatch|null}
 */
export function getMsrfMatch(probe) {
  if (!Number.isFinite(probe)) return null;

  const v = round1(probe);

  // STEP 1 — vortex, before everything, on the 1-dp value.
  for (const n of MSRF_FILTER__VORTEX) {
    if (Math.abs(n - v) <= VORTEX_FILTER_MATCH_TOLERANCE) return hit('VORTEX', n, v);
  }

  // STEP 2 — the ".5" dead zone. A half-day never reaches the integer filters.
  if (String(v).endsWith('.5')) return null;

  // STEP 3-5 — integer match, IMPORTANT winning any overlap with NORMAL.
  const r = Math.round(v);
  for (const n of MSRF_FILTER__IMPORTANT) if (n === r) return hit('IMPORTANT', n, v);
  for (const n of MSRF_FILTER__NORMAL) if (n === r) return hit('NORMAL', n, v);

  return null;
}

/**
 * The readable form the results-table pill and its tooltip use.
 * A strict equality reads as "=", anything else as "~".
 */
export function describeMatch(m) {
  if (!m) return '';
  return m.probe === m.number
    ? `${m.probe} = ${m.label}`
    : `${m.probe} ~ ${m.number} (${m.label})`;
}
