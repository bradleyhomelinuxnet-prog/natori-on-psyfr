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
import { toInstant } from '../core/ophis/calendar.js';
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
/**
 * Add an X-Date at its place in date order, and return its index.
 *
 * NEVER append. Enabled anchors must be strictly ascending or the event cannot
 * be cast at all (`validateXDateSpread`), so appending a date that is not the
 * latest bricks the event outright. Protocol Prime hit this on a fresh install:
 * the seeded example ends in 2027, so adding "today" appended an earlier date
 * and turned 114 projections into "X6 must be greater than X5".
 *
 * This does not fight the rule that index order is load-bearing -- `X1+` binds
 * to the lower-INDEXED anchor, not the earlier one. A castable list is already
 * ascending, so for such a list the sorted position is the ONLY one that stays
 * castable. There is no second choice to make.
 */
export function insertXDateInOrder(list, xdate, ev) {
  const at = list.findIndex((x) => toInstant(x, ev) > toInstant(xdate, ev));
  if (at === -1) {
    list.push(xdate);
    return list.length - 1;
  }
  list.splice(at, 0, xdate);
  return at;
}

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

/**
 * Protocol Prime's two kinds of projection (docs/reverse/23 §1).
 *
 * Objective: dates not personally tied to the operator — a market, a team.
 * Subjective: the operator's or client's own dates, which the author says MUST
 * end with the day the projection is run, as the last X-Date.
 *
 * Deliberately NOT in `makeIsoEvent`'s defaults, so it is not in ISO_EVENT_KEYS:
 * an absent field reads as objective, and every file written before this
 * existed — and every objective event written after — stays byte-identical.
 * The writer adds the field only for a subjective event.
 */
export const PROJECTION_KIND = { OBJECTIVE: 'objective', SUBJECTIVE: 'subjective' };

export const isSubjective = (ev) => ev?.projection_kind === PROJECTION_KIND.SUBJECTIVE;

/**
 * Which X-Date is the Protocol Prime date, as `MM/DD/YYYY`.
 *
 * The author's rule (PSYFR tutorial, 7 Aug 2025; docs/reverse/23 §1): PP is
 * ONLY the date the prediction is made. Re-running a subjective prediction on
 * a later day DROPS the old PP date and puts the new day in its place; the two
 * are never kept side by side. To do that without guessing, the event records
 * which date it added. Like `projection_kind` it is not in ISO_EVENT_KEYS, and
 * the writer adds it only for a subjective event, so every other file stays
 * byte-identical.
 */
export const PP_FIELD = 'protocol_prime_date';

const pad2 = (n) => String(n).padStart(2, '0');
/** `MM/DD/YYYY` for an XDate-shaped {y, m, d}. */
export const ppDateText = ({ y, m, d }) => `${pad2(m)}/${pad2(d)}/${String(y).padStart(4, '0')}`;

/** The recorded PP date as {y, m, d}, or null when there is no usable record. */
export function protocolPrimeDate(ev) {
  const p = parseXDate(ev?.[PP_FIELD]);
  return p ? { y: p.y, m: p.m, d: p.d } : null;
}

const sameDay = (a, b) => a.y === b.y && a.m === b.m && a.d === b.d;
const dayNumber = ({ y, m, d }) => Date.UTC(y, m - 1, d);

/** Index of the X-Date that is the recorded PP date, or -1. */
export function protocolPrimeIndex(ev) {
  const pp = protocolPrimeDate(ev);
  return pp ? ev.x_dates.findIndex((x) => sameDay(x, pp)) : -1;
}

/**
 * Protocol Prime: make the day the projection is run an X-Date.
 *
 * "Today" is the engine's injected now, so the Current-date override carries
 * through. Goes in at its place in date order, never appended (see
 * insertXDateInOrder) — which is the LAST place whenever every historical date
 * is in the past, as the author intends.
 *
 * - A recorded PP date earlier than today: that X-Date is removed (only if it
 *   still exists and still carries that date — an X-Date the user has since
 *   edited is theirs, not PP), today goes in, and the record moves to today.
 * - Recorded as today already: nothing changes (unless the user deleted it, in
 *   which case it goes back in).
 * - No record (an older file): today goes in and is recorded. Which existing
 *   date was PP is never guessed.
 * - A recorded date LATER than today (the Current-date override set back)
 *   is left alone: replacing it would move PP backwards in time.
 *
 * @returns {{added: boolean, index: number, replaced: string|null}}
 *   index of today in the list; `replaced` is the old PP date when one was
 *   dropped
 */
export function addTodayAsXDate(ev, nowMs) {
  const t = new Date(nowMs);
  const today = { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  const pp = protocolPrimeDate(ev);

  let replaced = null;
  if (pp && dayNumber(pp) < dayNumber(today)) {
    const at = ev.x_dates.findIndex((x) => sameDay(x, pp));
    if (at !== -1) {
      ev.x_dates.splice(at, 1);
      replaced = ppDateText(pp);
    }
  }
  if (!pp || dayNumber(pp) <= dayNumber(today)) ev[PP_FIELD] = ppDateText(today);

  const at = ev.x_dates.findIndex((x) => x.enabled && sameDay(x, today));
  if (at !== -1) return { added: false, index: at, replaced };
  return {
    added: true,
    index: insertXDateInOrder(ev.x_dates, makeXDate(today.y, today.m, today.d), ev),
    replaced,
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
