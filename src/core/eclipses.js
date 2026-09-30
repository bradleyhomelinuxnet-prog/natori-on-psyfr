/**
 * Eclipse lookup over the precomputed tables.
 *
 * The tables ship delta-encoded (a base JD plus a list of day-gaps) because the
 * raw arrays are ~12k numbers. They are decoded once, lazily, on first use, and
 * each source caches independently so switching back and forth is free.
 *
 * TWO TABLES, AND WHY BOTH ARE KEPT
 *
 * `original` is what the desktop program shipped. It carries that program's
 * errors -- a TD clock read as UT, a UT instant re-expressed as a New York
 * calendar day, a two-digit-year bug across much of 1969-2068, and pre-reform
 * rows sitting on the Julian axis. It is the DEFAULT and must stay so: it is
 * what the parity fixtures pin, and it is what anyone's saved work was scored
 * against.
 *
 * `canon` is the same eclipses rebuilt from NASA's canon with those corrected,
 * checked against NASA's published UT dates -- 7686 of 7686 umbral lunar days
 * match, none missing, none invented. It also reaches far further back: solar
 * coverage starts at JD 991085 (~2000 BC) against `original`'s 1721231 (~1 CE).
 *
 * Thales' eclipse (-584-05-22) is in `canon` and has no counterpart within 40
 * days in `original`. Henry I's (1133) is in BOTH -- a hand-made build's note
 * claiming otherwise is wrong -- but they date it seven days apart, which is
 * exactly the Julian/Gregorian offset for that century. That gap, and the six
 * days at Thales, are the axis difference showing through, and are pinned.
 *
 * This is a whole-app preference, beside theme -- not a per-event one. It is
 * NOT a free choice for the engine: Chronicon's cast scores eclipse hits
 * (`sc.pts += lens.solar`), so switching source changes its numbers. That is
 * the user's decision to make knowingly, which is why it is off by default and
 * labelled in the UI rather than inferred.
 *
 * NOTE ON THE CALENDAR AXIS. A hand-made build additionally lifted `original`'s
 * pre-1582 rows onto the Gregorian axis. That is deliberately NOT done here: it
 * moves 46% of rows by up to 10 days and shifts `coverage()`, which parity pins.
 * See docs/DEVIATIONS.md.
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
import {
  CANON_S_BASE,
  CANON_S_D,
  CANON_S_T,
  CANON_L_BASE,
  CANON_L_D,
  CANON_L_T,
} from '../data/eclipses-canon.data.js';

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

/**
 * Keyed by the value persisted in `options.eclipse_table`, so the stored option
 * IS the key. No translation table, and an unrecognised value is caught by
 * `isEclipseSource` rather than silently coerced to one of them.
 */
const SOURCES = {
  original: {
    solar: [ECL_S_BASE, ECL_S_D, ECL_S_T],
    lunar: [ECL_L_BASE, ECL_L_D, ECL_L_T],
  },
  canon: {
    solar: [CANON_S_BASE, CANON_S_D, CANON_S_T],
    lunar: [CANON_L_BASE, CANON_L_D, CANON_L_T],
  },
};

/** The selectable source names, in display order. */
export const ECLIPSE_SOURCES = Object.keys(SOURCES);

export const isEclipseSource = (name) => Object.hasOwn(SOURCES, name);

let _source = 'original';
const _cache = { original: {}, canon: {} };

export const eclipseSource = () => _source;

/** @throws if `name` is not a known source — guard with `isEclipseSource`. */
export function setEclipseSource(name) {
  if (!isEclipseSource(name)) throw new Error(`unknown eclipse source "${name}"`);
  _source = name;
  return _source;
}

export function solarTable() {
  const c = _cache[_source];
  if (!c.solar) c.solar = decode(...SOURCES[_source].solar);
  return c.solar;
}

export function lunarTable() {
  const c = _cache[_source];
  if (!c.lunar) c.lunar = decode(...SOURCES[_source].lunar);
  return c.lunar;
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
