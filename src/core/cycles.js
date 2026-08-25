/**
 * The Breshears cycle lattice, read at a given astronomical year.
 *
 * Every function here is a pure read of one wheel. The periods and phases live
 * in ../data/lattice.js — MOD POINT: retune a cycle there, not here.
 */

import { mod, jdn } from './jdn.js';
import {
  AM_OFFSET,
  LC_OFFSET,
  CAT_OFFSET,
  PHOENIX_PERIOD,
  PHOENIX_PHASE,
  NEMESIS_PERIOD,
  NEMESIS_INNER,
  NEMESIS_PHASE,
  NER_PERIOD,
  NER_PHASE,
  METONIC,
  SYNODIC,
  NEWMOON_J2000,
  LUNATION_EPOCH_JD,
  MAY_NODES,
} from '../data/lattice.js';

/** Annus Mundi year. */
export const am = (astroYear) => astroYear + AM_OFFSET;

/** Mayan Long-Count year. */
export const lcYear = (astroYear) => astroYear + LC_OFFSET;

/** Years elapsed since the Nemesis Cataclysm. */
export const sinceCataclysm = (astroYear) => astroYear + CAT_OFFSET;

/** Phoenix / Sky Dragon, 138 years. A node falls where mod(year,138) === 108. */
export function phoenixInfo(a) {
  const last = a - mod(a - PHOENIX_PHASE, PHOENIX_PERIOD);
  const next = last + PHOENIX_PERIOD;
  return {
    node: mod(a, PHOENIX_PERIOD) === PHOENIX_PHASE,
    last,
    next,
    into: a - last,
    to: next - a,
  };
}

/** Nemesis X, 792-year orbit with a 60-year inner arc. */
export function nemesisInfo(a) {
  const off = mod(a - NEMESIS_PHASE, NEMESIS_PERIOD);
  const enter = a - off;
  return {
    inner: off < NEMESIS_INNER,
    off,
    enter,
    exit: enter + NEMESIS_INNER,
    next: enter + NEMESIS_PERIOD,
  };
}

/** Anunnaki NER, 600 years. `off === 0` marks a node. */
export function nerInfo(a) {
  const off = mod(a - NER_PHASE, NER_PERIOD);
  const start = a - off;
  return {
    num: Math.floor((a + CAT_OFFSET) / NER_PERIOD) + 1,
    start,
    off,
    next: start + NER_PERIOD,
  };
}

/** Index into the baktun boundary list, or -1 before the first. */
export function mayaInfo(a) {
  for (let k = 0; k < MAY_NODES.length - 1; k++) {
    if (a >= MAY_NODES[k] && a < MAY_NODES[k + 1]) return k;
  }
  return a >= MAY_NODES[MAY_NODES.length - 1] ? MAY_NODES.length - 1 : -1;
}

/** True when `a` sits a whole number of Metonic cycles from `reference`. */
export function isMetonic(a, referenceYear) {
  return mod(referenceYear - a, METONIC) === 0;
}

const PHASE_NAMES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
];

/**
 * Mean-synodic moon phase. No observer location and no perturbations — good to
 * within a few hours, which is all the wheels need. The desktop Ophis used real
 * ephemeris libraries for its eclipse/moon overlays; this is the cheap read.
 */
export function moonInfo(astroYear, month, day) {
  const J = jdn(astroYear, month, day);
  const age = mod(J - NEWMOON_J2000, SYNODIC);
  const frac = age / SYNODIC;
  return {
    age,
    frac,
    illum: (1 - Math.cos(2 * Math.PI * frac)) / 2,
    // The 1/16 rotation centres each name on its phase instead of starting it there.
    name: PHASE_NAMES[Math.floor(mod(frac + 1 / 16, 1) * 8) % 8],
    lun: Math.round((J - LUNATION_EPOCH_JD) / SYNODIC),
  };
}

/** Šar reckoned as a turning of the stars (a day), per Archaix. */
export function anunnaTurnings(J) {
  return J - jdn(-3894, 1, 1);
}
