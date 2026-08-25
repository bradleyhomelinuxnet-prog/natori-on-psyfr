/**
 * Lunar phase.
 *
 * The chart's moon row asks one question per projection: did this date land on
 * a full moon, a new moon, a quarter? That is a mean-lunation calculation — the
 * moon's true phase wanders from the mean by a few hours, which is well inside
 * the one-day window the match uses.
 *
 * Kept in `core` rather than in the chart because it is arithmetic, and because
 * arithmetic that decides what a reader sees deserves a test.
 */

import { MILLIS_PER_DAY, SYNODIC_MONTH } from './constants.js';

/** Julian Day from an epoch instant. */
export const toJD = (ms) => ms / MILLIS_PER_DAY + 2440587.5;

/**
 * A known new moon, as a Julian Day: 2000-01-06 18:14 UTC.
 *
 * Any new moon would do; this one is near enough to the present that the
 * accumulated error of the mean lunation stays small over the range the app
 * projects into.
 */
export const NEW_MOON_EPOCH_JD = 2451550.26;

/**
 * Age of the moon at an instant, as a fraction of one lunation.
 *
 * 0 is new, 0.25 first quarter, 0.5 full, 0.75 last quarter.
 */
export function lunarPhase(ms) {
  const age = ((toJD(ms) - NEW_MOON_EPOCH_JD) % SYNODIC_MONTH + SYNODIC_MONTH) % SYNODIC_MONTH;
  return age / SYNODIC_MONTH;
}

/** The eight named phases, and the fraction each sits at. */
export const PHASE_POINTS = [
  { key: 'chart_option__show_new_moons', at: 0.0, name: 'New' },
  { key: 'chart_option__show_waxing_crescent_moons', at: 0.125, name: 'Waxing Crescent' },
  { key: 'chart_option__show_first_quarter_moons', at: 0.25, name: 'First Quarter' },
  { key: 'chart_option__show_waxing_gibbous_moons', at: 0.375, name: 'Waxing Gibbous' },
  { key: 'chart_option__show_full_moons', at: 0.5, name: 'Full' },
  { key: 'chart_option__show_waning_gibbous_moons', at: 0.625, name: 'Waning Gibbous' },
  { key: 'chart_option__show_third_quarter_moons', at: 0.75, name: 'Third Quarter' },
  { key: 'chart_option__show_waning_crescent_moons', at: 0.875, name: 'Waning Crescent' },
];

/** How near a projection must fall to count as landing on a phase, in days. */
export const LUNAR_MATCH_DAYS = 1;

/** The original's eclipse window was 1.25 days, despite its tooltips saying 1. */
export const ECLIPSE_MATCH_DAYS = 1.25;

/** Days between a phase fraction and the ideal, wrapping across new moon. */
export function phaseGapDays(frac, ideal) {
  const raw = Math.abs(frac - ideal);
  return Math.min(raw, 1 - raw) * SYNODIC_MONTH;
}

/** The name of the phase an instant is nearest to. */
export function phaseName(ms) {
  const f = lunarPhase(ms);
  let best = PHASE_POINTS[0];
  let bestGap = Infinity;
  for (const p of PHASE_POINTS) {
    const gap = phaseGapDays(f, p.at);
    if (gap < bestGap) {
      bestGap = gap;
      best = p;
    }
  }
  return best.name;
}
