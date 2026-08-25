/**
 * The nine output filters.
 *
 * Every predicate can only ever set `include = false`. There are no early exits
 * and nothing is mutated, so the order they run in is functionally irrelevant —
 * which is the property that makes them safe to reorder, add to, or evaluate in
 * parallel. Scoring must already have run: filters 6, 7 and 9 read the score.
 *
 * Eight are user-facing flags. The ninth — the T-Date whitelist — has no flag:
 * it turns itself on as soon as there is at least one enabled T-Date, which is
 * why the UI copy explains T-Dates as "only show Z-Dates for the future dates
 * you are interested in" rather than as a filter to switch on.
 */

import { MILLIS_PER_DAY, EVENT_SCOPE } from './constants.js';

/** Defaults for the three companion values, and the flags' own defaults. */
export const FILTER_DEFAULTS = {
  iso_event_filter_before_last_x_date: true,
  iso_event_filter_on_last_x_date: true,
  iso_event_filter_before_current_date: true,
  iso_event_filter_on_current_date: false,
  iso_event_filter_beyond_max_days: true,
  iso_event_filter_beyond_max_days_value: 2559,
  iso_event_filter_min_hit_count: false,
  iso_event_filter_min_hit_count_value: 2,
  iso_event_filter_min_score: false,
  iso_event_filter_min_score_value: 1,
  iso_event_filter_msrf_match: false,
};

/**
 * Read a companion value, replacing a negative with the field default.
 *
 * The original compared Date objects against numbers and only got away with it
 * through `valueOf()` coercion; everything here is a number up front.
 */
function numeric(isoEvent, key) {
  const v = Number(isoEvent[key]);
  if (!Number.isFinite(v) || v < 0) return FILTER_DEFAULTS[key];
  return v;
}

/** The ordered filter descriptors — the UI renders F1…F8 straight off this. */
export const FILTER_ROWS = [
  { id: 1, flag: 'iso_event_filter_before_last_x_date', label: 'Hide Z-Dates before the last X-Date' },
  { id: 2, flag: 'iso_event_filter_on_last_x_date', label: 'Hide Z-Dates on the last X-Date' },
  { id: 3, flag: 'iso_event_filter_before_current_date', label: 'Hide Z-Dates before the current date' },
  { id: 4, flag: 'iso_event_filter_on_current_date', label: 'Hide Z-Dates on the current date' },
  { id: 5, flag: 'iso_event_filter_beyond_max_days', value: 'iso_event_filter_beyond_max_days_value',
    label: 'Hide Z-Dates beyond', suffix: 'days from the last X-Date' },
  { id: 6, flag: 'iso_event_filter_min_hit_count', value: 'iso_event_filter_min_hit_count_value',
    label: 'Hide Z-Dates with fewer than', suffix: 'hits' },
  { id: 7, flag: 'iso_event_filter_min_score', value: 'iso_event_filter_min_score_value',
    label: 'Hide Z-Dates scoring below', suffix: '' },
  { id: 8, flag: 'iso_event_filter_msrf_match', label: 'Hide Z-Dates with no MSRF match' },
];

/**
 * @param {Array<object>} zStructs scored z-structs
 * @param {object} isoEvent
 * @param {object} ctx `{ now }` — epoch millis, always injected, never read from a clock
 * @param {Array<number>} xInstants enabled anchors' instants, in list order
 * @param {Array<number>} tInstants enabled T-Dates' instants
 * @returns {{kept: Array<object>, hidden: number}}
 */
export function applyFilters(zStructs, isoEvent, ctx, xInstants, tInstants = []) {
  const hhmm = isoEvent.scope === EVENT_SCOPE.HH_MM;

  // The LAST enabled anchor, by list order — not the latest date.
  const lastX = xInstants.length ? xInstants[xInstants.length - 1] : null;

  // "Today" is the start of the day containing the injected now.
  const cutoff = Math.floor(ctx.now / MILLIS_PER_DAY) * MILLIS_PER_DAY;

  const maxDays = numeric(isoEvent, 'iso_event_filter_beyond_max_days_value');
  const minHits = numeric(isoEvent, 'iso_event_filter_min_hit_count_value');
  const minScore = numeric(isoEvent, 'iso_event_filter_min_score_value');

  const kept = [];
  for (const z of zStructs) {
    let include = true;
    const { zStart, zEnd } = z;

    if (isoEvent.iso_event_filter_before_last_x_date && lastX !== null) {
      if (hhmm ? zEnd <= lastX : zStart < lastX) include = false;
    }
    if (isoEvent.iso_event_filter_on_last_x_date && lastX !== null) {
      if (hhmm ? lastX >= zStart && lastX < zEnd : zStart === lastX) include = false;
    }
    if (isoEvent.iso_event_filter_before_current_date) {
      if (hhmm ? zEnd <= cutoff : zStart < cutoff) include = false;
    }
    if (isoEvent.iso_event_filter_on_current_date) {
      if (hhmm ? cutoff >= zStart && cutoff < zEnd : zStart === cutoff) include = false;
    }

    // The implicit whitelist. Active only when there is something to whitelist.
    if (tInstants.length) {
      const hit = hhmm
        ? tInstants.some((t) => t >= zStart && t < zEnd)
        : tInstants.some((t) => t === zStart);
      if (!hit) include = false;
    }

    if (isoEvent.iso_event_filter_min_score && z.score < minScore) include = false;
    if (isoEvent.iso_event_filter_min_hit_count && z.hit_count < minHits) include = false;

    if (isoEvent.iso_event_filter_beyond_max_days && lastX !== null) {
      if (Math.round((zStart - lastX) / MILLIS_PER_DAY) > maxDays) include = false;
    }

    if (isoEvent.iso_event_filter_msrf_match && z.resonance_matches.length === 0) include = false;

    if (include) kept.push(z);
  }

  return { kept, hidden: zStructs.length - kept.length };
}
