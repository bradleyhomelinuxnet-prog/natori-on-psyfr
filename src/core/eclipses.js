/**
 * Eclipse lookup over the precomputed tables.
 *
 * The tables ship delta-encoded (a base JD plus a list of day-gaps) because the
 * raw arrays are ~12k numbers. They are decoded once, lazily, on first use.
 */

import {
  ECL_S_BASE,
  ECL_S_D,
  ECL_S_T,
  ECL_L_BASE,
  ECL_L_D,
  ECL_L_T,
  ECL_TYPE_NAME,
} from '../data/eclipses.data.js';

export { ECL_TYPE_NAME };

function decode(base, deltas, types) {
  const gaps = deltas.split(',');
  const J = new Array(gaps.length + 1);
  const T = new Array(gaps.length + 1);
  let jd = base;
  J[0] = jd;
  T[0] = types[0];
  for (let i = 0; i < gaps.length; i++) {
    jd += +gaps[i];
    J[i + 1] = jd;
    T[i + 1] = types[i + 1];
  }
  return { J, T };
}

let _solar = null;
let _lunar = null;

export function solarTable() {
  if (!_solar) _solar = decode(ECL_S_BASE, ECL_S_D, ECL_S_T);
  return _solar;
}

export function lunarTable() {
  if (!_lunar) _lunar = decode(ECL_L_BASE, ECL_L_D, ECL_L_T);
  return _lunar;
}

/** Inclusive JD bounds of the solar table — outside this, lookups are skipped. */
export function coverage() {
  const s = solarTable();
  return { min: s.J[0], max: s.J[s.J.length - 1] };
}

/**
 * Binary search for a record within `tol` days of `jd`.
 *
 * Returns the type letter, or null. Note this returns the first in-tolerance
 * record the descent happens to land on, which for tol > 1 is not necessarily
 * the nearest one — matching the original's behaviour.
 */
function hit(tbl, jd, tol) {
  let lo = 0;
  let hi = tbl.J.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = tbl.J[mid];
    if (Math.abs(v - jd) <= tol) return tbl.T[mid];
    if (v < jd) lo = mid + 1;
    else hi = mid - 1;
  }
  return null;
}

/**
 * @returns {{solar: string|null, lunar: string|null}} type letters, or nulls.
 *   T total · A annular · P partial · H hybrid (solar); T · P (lunar).
 */
export function eclipseNear(jd, tol = 1) {
  return { solar: hit(solarTable(), jd, tol), lunar: hit(lunarTable(), jd, tol) };
}
