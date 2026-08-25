/**
 * The IsoEvent — one "Isometric Event", the unit this whole application works on.
 *
 * The author's own definition, kept verbatim in the UI copy: an event that has
 * repeated itself two or more times in the past, and will likely repeat again.
 * The X-Dates are the past occurrences; the Z-Dates are the projections.
 *
 * Every field here exists in the saved `.oph` format, so this doubles as the
 * schema. Three v12 runtime fields are deliberately absent — `effective_operations`,
 * `checked_for_swap_source` and `checked_for_swap_target` were written onto the
 * event and then had to be deleted again before saving. The engine is pure and
 * swap selection lives in UI state, so they never exist here.
 */

import { EVENT_SCOPE, EVENT_TYPE, SCORING_SYSTEM, SORT_TYPE, MILLIS_PER_DAY, MILLIS_PER_MINUTE } from '../core/ophis/constants.js';
import { FILTER_DEFAULTS } from '../core/ophis/filters.js';
import { packOperations, DEFAULT_OPHIS_PACK } from '../data/packs-ophis.js';

let seq = 0;
export const uid = () => `e${++seq}`;

/** The fourteen chart-option flags, in the order the Chart Config panel lists them. */
export const CHART_OPTIONS = [
  { key: 'chart_option__show_chart', label: 'Chart Itself', def: true },
  { key: 'chart_option__show_dates', label: 'Chart Dates', def: true },
  { key: 'chart_option__show_new_moons', label: 'New', group: 'moon', def: false },
  { key: 'chart_option__show_waxing_crescent_moons', label: 'Waxing Crescent', group: 'moon', def: false },
  { key: 'chart_option__show_first_quarter_moons', label: 'First Quarter', group: 'moon', def: false },
  { key: 'chart_option__show_waxing_gibbous_moons', label: 'Waxing Gibbous', group: 'moon', def: false },
  { key: 'chart_option__show_full_moons', label: 'Full', group: 'moon', def: false },
  { key: 'chart_option__show_waning_gibbous_moons', label: 'Waning Gibbous', group: 'moon', def: false },
  { key: 'chart_option__show_third_quarter_moons', label: 'Third Quarter', group: 'moon', def: false },
  { key: 'chart_option__show_waning_crescent_moons', label: 'Waning Crescent', group: 'moon', def: false },
  { key: 'chart_option__full_solar_eclipses', label: 'Full Solar', group: 'eclipse', def: false },
  { key: 'chart_option__partial_solar_eclipses', label: 'Partial Solar', group: 'eclipse', def: false },
  { key: 'chart_option__full_lunar_eclipses', label: 'Full Lunar', group: 'eclipse', def: false },
  { key: 'chart_option__partial_lunar_eclipses', label: 'Partial Lunar', group: 'eclipse', def: false },
];

const chartDefaults = () =>
  Object.fromEntries(CHART_OPTIONS.map((c) => [c.key, c.def]));

/** An X-Date (T-Dates share the shape exactly). */
export function makeXDate(y, m, d, { enabled = true, time = '00:00' } = {}) {
  return { y, m, d, time, enabled };
}

/** Parse `MM/DD/YYYY` into an XDate, or null if it is not a usable date. */
export function parseXDate(text, opts) {
  const match = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{1,4})\s*$/.exec(String(text ?? ''));
  if (!match) return null;
  const m = Number(match[1]);
  const d = Number(match[2]);
  const y = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1 || y > 9999) return null;
  // Reject a day the month does not have, rather than letting Date roll it over.
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return makeXDate(y, m, d, opts);
}

/**
 * A new Iso-Event, with every field at the default the original shipped.
 *
 * `name` follows the original's "Event 1", "Event 2"… convention; an empty name
 * is allowed, because v12 allowed it and files in the wild carry one.
 */
export function makeIsoEvent(index = 0, overrides = {}) {
  return {
    id: uid(),
    name: `Event ${index + 1}`,
    notes: '',

    x_dates: [],
    t_dates: [],

    scope: EVENT_SCOPE.DAYS,
    /** Cosmetic in the original — a window title and a skin. Inert; kept so files round-trip. */
    type: EVENT_TYPE.PERSONAL,
    lat: 0,
    long: 0,
    location_enabled: false,
    day_scope_start_time_in_millis: 0,

    operations: packOperations(DEFAULT_OPHIS_PACK),
    scoring_system: SCORING_SYSTEM.GTE_V8,
    z_date_sort_type: SORT_TYPE.DATE,

    ...FILTER_DEFAULTS,
    ...chartDefaults(),

    /** 0 is the auto-fit sentinel, not a coordinate. */
    chart_x_min: 0,
    chart_x_max: 0,
    chart_y_min: 0,
    chart_y_max: 0,

    ...overrides,
  };
}

/** `location_enabled` is derived, never independently true. */
export const locationActive = (ev) => ev.scope === EVENT_SCOPE.HH_MM;

/** Clamp a day-scope start time to just under 24 h, as the original did on load. */
export const clampDayStart = (ms) => {
  const v = Number(ms);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.min(v, MILLIS_PER_DAY - MILLIS_PER_MINUTE);
};

/** Every key that belongs in a saved event, so the writer never invents one. */
export const ISO_EVENT_KEYS = Object.keys(makeIsoEvent(0)).filter((k) => k !== 'id');
