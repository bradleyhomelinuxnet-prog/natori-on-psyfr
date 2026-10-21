/**
 * The `.oph` document format — read and write.
 *
 * A document is `{ app_version, schema, iso_events }`, and a bare `IsoEvent[]`
 * is also accepted because early files were written that way. Reading is
 * all-or-nothing: any error yields a null document and the caller keeps what it
 * had. Warnings never block; they go to the activity log.
 *
 * Two of the original's behaviours are deliberately NOT reproduced:
 *
 *   - v12 post-processed its JSON with `replaceAll(",", ", ")`, which rewrote
 *     commas inside string values as well as between them. A note containing a
 *     comma grew a space on every save/load cycle, permanently. Removed.
 *   - v12's minifier deleted `notes` whenever the day-scope start time happened
 *     to be at its default — an unrelated field, plainly a copy-paste slip.
 *     Not reproduced: minifying must never lose text a user typed.
 */

import {
  EVENT_SCOPE,
  EVENT_TYPE,
  SCORING_SYSTEM,
  SORT_TYPE,
} from '../core/ophis/constants.js';
import { normaliseSortType } from '../core/ophis/sort.js';
import {
  makeIsoEvent, makeXDate, clampDayStart, ISO_EVENT_KEYS, CHART_OPTIONS, PROJECTION_KIND, isSubjective,
} from '../state/iso-event.js';
import { FILTER_DEFAULTS } from '../core/ophis/filters.js';
import { packOperations, DEFAULT_OPHIS_PACK } from '../data/packs-ophis.js';

export const APP_VERSION = '13.0.0';

/**
 * A short stamp shown on the About screen, so "is the build I uploaded the one
 * I meant?" is answerable by looking at the app.
 *
 * This exists because it was not. A deployed copy had to be checked by reading
 * view-source for a function name, which is fragile, needs developer tools, and
 * tells you nothing when it fails. Bump this whenever you ship a build.
 */
export const BUILD_TAG = '2026-10-21 · Save As button';
export const SCHEMA_VERSION = 1;

/** `strict` rejects anything unrecognised; `loose` repairs and warns. */
export const VALIDATION = { STRICT: 'strict', LOOSE: 'loose' };

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Resolve an impossible calendar day the way Date would, and say so.
 *
 * A file carrying 02/30 would otherwise enter the model verbatim and roll over
 * silently inside the calendar at cast time — the projection would be computed
 * from March 1st while every surface still displayed February 30th. Loose-mode
 * philosophy: repair, and put the repair in the warnings.
 */
function normalisedDay(y, m, d, out) {
  const probe = new Date(Date.UTC(y, m - 1, d));
  const ny = probe.getUTCFullYear();
  const nm = probe.getUTCMonth() + 1;
  const nd = probe.getUTCDate();
  if (ny !== y || nm !== m || nd !== d) {
    out.warnings.push(`${m}/${d}/${y} is not a real calendar day; reading it as ${nm}/${nd}/${ny}`);
  }
  return { y: ny, m: nm, d: nd };
}

/** Read one X-Date, accepting both the `MM/DD/YYYY` string form and the object form. */
function readXDate(raw, out) {
  if (typeof raw === 'string') {
    const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{1,4})\s*$/.exec(raw);
    if (!m) {
      out.errors.push(`"${raw}" is not a date in MM/DD/YYYY form`);
      return null;
    }
    const n = normalisedDay(Number(m[3]), Number(m[1]), Number(m[2]), out);
    return makeXDate(n.y, n.m, n.d);
  }
  if (!isObj(raw)) {
    out.errors.push('an X-Date was neither a string nor an object');
    return null;
  }

  // The v12 form carries `date` as MM/DD/YYYY plus an optional `time`.
  if (typeof raw.date === 'string') {
    const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{1,4})\s*$/.exec(raw.date);
    if (!m) {
      out.errors.push(`"${raw.date}" is not a date in MM/DD/YYYY form`);
      return null;
    }
    const n = normalisedDay(Number(m[3]), Number(m[1]), Number(m[2]), out);
    return makeXDate(n.y, n.m, n.d, {
      enabled: raw.enabled !== false,
      time: typeof raw.time === 'string' ? raw.time : '00:00',
    });
  }

  const y = Number(raw.y);
  const mo = Number(raw.m);
  const d = Number(raw.d);
  if (![y, mo, d].every(Number.isFinite)) {
    out.errors.push('an X-Date was missing its year, month or day');
    return null;
  }
  const n = normalisedDay(y, mo, d, out);
  return makeXDate(n.y, n.m, n.d, {
    enabled: raw.enabled !== false,
    time: typeof raw.time === 'string' ? raw.time : '00:00',
  });
}

/** Read one operation, keeping a bad weight out of the score rather than propagating NaN. */
function readOperation(raw, out) {
  if (typeof raw === 'string') return { equation: raw, weight: 0.5, enabled: true };
  if (!isObj(raw)) {
    out.errors.push('an operation was neither a string nor an object');
    return null;
  }
  const equation = String(raw.equation ?? '');
  if (!equation) {
    out.errors.push('an operation had no equation');
    return null;
  }
  let weight = Number(raw.weight);
  if (!Number.isFinite(weight) || weight <= 0) {
    out.warnings.push(`operation "${equation}" had an unusable weight; using 0.5`);
    weight = 0.5;
  }
  return { equation, weight, enabled: raw.enabled !== false, packId: raw.packId ?? null };
}

const enumOr = (value, allowed, fallback, label, out, mode) => {
  if (allowed.includes(value)) return value;
  if (value === undefined) return fallback;
  if (mode === VALIDATION.STRICT) {
    out.errors.push(`unrecognised ${label}: ${JSON.stringify(value)}`);
    return fallback;
  }
  out.warnings.push(`unrecognised ${label} ${JSON.stringify(value)}; using the default`);
  return fallback;
};

/** Read one IsoEvent, in the field order the original processed them. */
function readIsoEvent(raw, index, out, mode) {
  if (!isObj(raw)) {
    out.errors.push(`event ${index + 1} was not an object`);
    return null;
  }

  const ev = makeIsoEvent(index);

  if (typeof raw.name === 'string') ev.name = raw.name;
  if (typeof raw.notes === 'string') ev.notes = raw.notes;
  ev.day_scope_start_time_in_millis = clampDayStart(raw.day_scope_start_time_in_millis ?? 0);

  ev.scope = enumOr(raw.scope, Object.values(EVENT_SCOPE), EVENT_SCOPE.DAYS, 'event scope', out, mode);
  ev.type = enumOr(raw.type, Object.values(EVENT_TYPE), EVENT_TYPE.PERSONAL, 'event type', out, mode);

  // The eleven filter fields and the fourteen chart flags are copied by name,
  // so a file from a future version carrying an unknown flag simply keeps the
  // default for it rather than failing to load.
  for (const key of Object.keys(FILTER_DEFAULTS)) {
    if (raw[key] === undefined) continue;
    ev[key] = typeof FILTER_DEFAULTS[key] === 'boolean' ? raw[key] === true : Number(raw[key]);
  }
  for (const { key } of CHART_OPTIONS) {
    if (raw[key] !== undefined) ev[key] = raw[key] === true;
  }
  for (const key of ['chart_x_min', 'chart_x_max', 'chart_y_min', 'chart_y_max']) {
    const v = Number(raw[key]);
    if (Number.isFinite(v)) ev[key] = v;
  }

  if (raw.operations !== undefined) {
    if (!Array.isArray(raw.operations)) {
      if (mode === VALIDATION.STRICT) out.errors.push('operations was not an array');
      else out.warnings.push('operations was not an array; using the default pack');
    } else {
      const ops = raw.operations.map((o) => readOperation(o, out)).filter(Boolean);
      if (ops.length < 1) {
        if (mode === VALIDATION.STRICT) out.errors.push('at least one operation is required');
        else out.warnings.push('the file carried no usable operations; using the default pack');
      } else {
        ev.operations = ops;
      }
    }
  }

  ev.scoring_system = enumOr(
    raw.scoring_system, Object.values(SCORING_SYSTEM), SCORING_SYSTEM.GTE_V8, 'scoring system', out, mode
  );

  // v12 accepted any string here and produced a constant comparator and a
  // garbage order. Validated now.
  if (raw.z_date_sort_type !== undefined) {
    const wanted = String(raw.z_date_sort_type);
    const coerced = normaliseSortType(wanted);
    if (coerced !== wanted) out.warnings.push(`unrecognised sort type ${wanted}; using the date sort`);
    ev.z_date_sort_type = coerced;
  }

  const lat = Number(raw.lat);
  const long = Number(raw.long);
  if (Number.isFinite(lat)) ev.lat = lat;
  if (Number.isFinite(long)) ev.long = long;
  ev.location_enabled = ev.scope === EVENT_SCOPE.HH_MM;

  ev.x_dates = Array.isArray(raw.x_dates)
    ? raw.x_dates.map((x) => readXDate(x, out)).filter(Boolean)
    : [];

  // Absent means objective; only a subjective event carries the field.
  if (raw.projection_kind === PROJECTION_KIND.SUBJECTIVE) {
    ev.projection_kind = PROJECTION_KIND.SUBJECTIVE;
  } else if (raw.projection_kind !== undefined && raw.projection_kind !== PROJECTION_KIND.OBJECTIVE) {
    out.warnings.push(`unrecognised projection kind ${raw.projection_kind}; reading it as objective`);
  }
  ev.t_dates = Array.isArray(raw.t_dates)
    ? raw.t_dates.map((x) => readXDate(x, out)).filter(Boolean)
    : [];

  return ev;
}

/**
 * Normalise an already-parsed document object.
 *
 * Split out of `parseDocument` because the restore path has an object, not
 * text, and must go through exactly the same normalisation. Adopting a stored
 * blob raw was a real defect: the original program's X-Dates carry `date` and
 * `time` where this one carries `y`/`m`/`d`, so a raw adopt produced anchors
 * whose instants were NaN, a Y clamped to the maximum, and sixteen non-finite
 * offsets — an empty table with no error shown.
 *
 * @returns {{document: object|null, errors: string[], warnings: string[]}}
 */
export function readDocument(raw, mode = VALIDATION.LOOSE) {
  const out = { errors: [], warnings: [] };

  const events = Array.isArray(raw) ? raw : raw?.iso_events;
  if (!Array.isArray(events)) {
    return { document: null, errors: ['The file contains no iso_events array.'], warnings: [] };
  }
  if (!events.length) {
    return { document: null, errors: ['The file contains no events.'], warnings: [] };
  }

  const isoEvents = events.map((e, i) => readIsoEvent(e, i, out, mode)).filter(Boolean);

  // All-or-nothing: a partially-read document is worse than no document, because
  // the user cannot see what was dropped.
  if (out.errors.length) return { document: null, errors: out.errors, warnings: out.warnings };

  return {
    document: {
      app_version: typeof raw?.app_version === 'string' ? raw.app_version : APP_VERSION,
      schema: Number(raw?.schema) || SCHEMA_VERSION,
      iso_events: isoEvents,
    },
    errors: [],
    warnings: out.warnings,
  };
}

/**
 * Parse a `.oph` document.
 *
 * @returns {{document: object|null, errors: string[], warnings: string[]}}
 */
export function parseDocument(text, mode = VALIDATION.LOOSE) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { document: null, errors: [`Could not parse JSON due to error: ${e.message}`], warnings: [] };
  }
  return readDocument(raw, mode);
}

/** Every default an event could be compared against, for the minifier. */
function defaultsFor(index) {
  return makeIsoEvent(index);
}

const sameOperations = (ops) => {
  const def = packOperations(DEFAULT_OPHIS_PACK);
  if (ops.length !== def.length) return false;
  return ops.every(
    (o, i) => o.equation === def[i].equation && o.weight === def[i].weight && o.enabled === def[i].enabled
  );
};

/** Strip a field that equals its default. */
function minifyEvent(ev, index) {
  const def = defaultsFor(index);
  const out = {};

  for (const key of ISO_EVENT_KEYS) {
    if (key === 'x_dates' || key === 't_dates' || key === 'operations') continue;
    if (JSON.stringify(ev[key]) === JSON.stringify(def[key])) continue;
    out[key] = ev[key];
  }

  // `type` is cosmetic and inert; it never needs to travel.
  delete out.type;
  if (ev.scope !== EVENT_SCOPE.HH_MM) {
    delete out.lat;
    delete out.long;
    delete out.location_enabled;
  }

  const trimDate = (x) => {
    const d = { y: x.y, m: x.m, d: x.d };
    if (ev.scope === EVENT_SCOPE.HH_MM && x.time && x.time !== '00:00') d.time = x.time;
    if (x.enabled !== true) d.enabled = false;
    return d;
  };
  out.x_dates = ev.x_dates.map(trimDate);
  if (ev.t_dates.length) out.t_dates = ev.t_dates.map(trimDate);

  if (!sameOperations(ev.operations)) {
    out.operations = ev.operations.map((o) => {
      const t = { equation: o.equation, weight: o.weight };
      if (o.enabled !== true) t.enabled = false;
      return t;
    });
  }

  if (isSubjective(ev)) out.projection_kind = PROJECTION_KIND.SUBJECTIVE;

  // Notes and names are user text and are kept by the loop above whenever
  // they differ from the defaults — which is the only case that needs a byte.
  // A default "Event N" name regenerates by position on load. (v12's minifier
  // deleted notes by accident; the loop's default-comparison cannot, because
  // the default is the empty string.)
  return out;
}

/** The full form — every field, so the file is self-describing. */
function fullEvent(ev) {
  const out = {};
  for (const key of ISO_EVENT_KEYS) out[key] = ev[key];
  out.x_dates = ev.x_dates.map((x) => ({ y: x.y, m: x.m, d: x.d, time: x.time, enabled: x.enabled }));
  out.t_dates = ev.t_dates.map((x) => ({ y: x.y, m: x.m, d: x.d, time: x.time, enabled: x.enabled }));
  out.operations = ev.operations.map((o) => ({
    equation: o.equation, weight: o.weight, enabled: o.enabled,
  }));
  // Not in ISO_EVENT_KEYS on purpose; see PROJECTION_KIND.
  if (isSubjective(ev)) out.projection_kind = PROJECTION_KIND.SUBJECTIVE;
  return out;
}

/**
 * Serialise a document.
 *
 * @param {{iso_events: object[]}} doc
 * @param {{prettify?: boolean, minify?: boolean}} opts
 */
export function serialiseDocument(doc, { prettify = true, minify = false } = {}) {
  const body = {
    app_version: APP_VERSION,
    schema: SCHEMA_VERSION,
    iso_events: doc.iso_events.map((ev, i) => (minify ? minifyEvent(ev, i) : fullEvent(ev))),
  };
  return JSON.stringify(body, null, prettify ? 2 : undefined);
}

/* ---------------------------------------------------- the v12 on-disk form -- */

/** The one version string the original wrote ("12.0.0" normalised at boot). */
export const V12_APP_VERSION = '12';

/** The chart flags in the order v12 wrote them (ours are grouped by phase). */
const V12_CHART_ORDER = [
  'chart_option__show_chart', 'chart_option__show_dates',
  'chart_option__show_new_moons', 'chart_option__show_first_quarter_moons',
  'chart_option__show_full_moons', 'chart_option__show_third_quarter_moons',
  'chart_option__show_waxing_crescent_moons', 'chart_option__show_waning_crescent_moons',
  'chart_option__show_waxing_gibbous_moons', 'chart_option__show_waning_gibbous_moons',
  'chart_option__full_solar_eclipses', 'chart_option__partial_solar_eclipses',
  'chart_option__full_lunar_eclipses', 'chart_option__partial_lunar_eclipses',
];

/** Values the original knew. Anything else it either coerced or mis-sorted. */
const V12_SORT_TYPES = [SORT_TYPE.SCORE, SORT_TYPE.DATE, SORT_TYPE.MSRF, SORT_TYPE.HIT_COUNT, SORT_TYPE.OPERATIONS];
const V12_EVENT_TYPES = [EVENT_TYPE.PERSONAL, EVENT_TYPE.MARKETS];

const pad = (n, w) => String(n).padStart(w, '0');
const v12Date = (x) => ({
  date: `${pad(x.m, 2)}/${pad(x.d, 2)}/${pad(x.y, 4)}`,
  time: x.time || '00:00',
  enabled: x.enabled !== false,
});

function v12Event(ev, index, notes) {
  const label = ev.name || `Event ${index + 1}`;

  let sort = ev.z_date_sort_type;
  if (!V12_SORT_TYPES.includes(sort)) {
    notes.push(`${label}: v12 has no "${sort}" sort, so the file asks for the date sort instead`);
    sort = SORT_TYPE.DATE;
  }
  if (isSubjective(ev)) {
    notes.push(`${label}: v12 has no Objective / Subjective switch; the file keeps today's X-Date but not the label`);
  }
  let type = ev.type;
  if (!V12_EVENT_TYPES.includes(type)) {
    notes.push(`${label}: v12 has no "${type}" event type, so the file says personal (the type changes no result)`);
    type = EVENT_TYPE.PERSONAL;
  }

  // Key order is v12's createNewIsoEvent order, so a diff against a file the
  // desktop app wrote lines up field for field.
  const out = {
    name: ev.name,
    notes: ev.notes,
    x_dates: ev.x_dates.map(v12Date),
    t_dates: ev.t_dates.map(v12Date),
    lat: ev.lat,
    long: ev.long,
    location_enabled: ev.location_enabled,
    scope: ev.scope,
    type,
    operations: ev.operations.map((o) => ({ equation: o.equation, weight: o.weight, enabled: o.enabled })),
    scoring_system: ev.scoring_system,
  };
  for (const key of Object.keys(FILTER_DEFAULTS)) out[key] = ev[key];
  for (const key of V12_CHART_ORDER) out[key] = ev[key];
  for (const key of ['chart_x_min', 'chart_x_max', 'chart_y_min', 'chart_y_max']) out[key] = ev[key];
  out.z_date_sort_type = sort;
  out.day_scope_start_time_in_millis = ev.day_scope_start_time_in_millis;
  return out;
}

/**
 * Serialise a document in the form the original Ophis v12 desktop app reads.
 *
 * The native form above carries X-Dates as `{y, m, d}`. v12 only knows
 * `{date: "MM/DD/YYYY"}`, and in its default loose mode it drops every date it
 * cannot parse without saying so -- the event opens with no anchors and casts
 * nothing. So this writes `app_version: "12"`, no `schema`, and v12's date form.
 * Always the full form: v12's own defaults are not ours, so a minified file
 * would cast differently there.
 *
 * Returns the text and any notes about values v12 cannot represent, which the
 * caller shows; nothing is dropped silently.
 *
 * @param {{iso_events: object[]}} doc
 * @param {{prettify?: boolean}} opts
 * @returns {{text: string, notes: string[]}}
 */
export function serialiseDocumentV12(doc, { prettify = true } = {}) {
  const notes = [];
  const body = {
    app_version: V12_APP_VERSION,
    iso_events: doc.iso_events.map((ev, i) => v12Event(ev, i, notes)),
  };
  return { text: JSON.stringify(body, null, prettify ? 2 : undefined), notes };
}

/**
 * Make a filename safe, and never return an empty one.
 *
 * v12 could emit a file literally named `.csv`, because a name consisting only
 * of punctuation reduced to nothing and it appended the extension anyway.
 */
export function safeFilename(name, fallback = 'export') {
  let s = String(name ?? '')
    .replaceAll(' ', '_')
    .replace(/[^A-Za-z0-9_.-]/g, '_')
    .replace(/^[. ]+|[. ]+$/g, '')
    .slice(0, 255);
  return s || fallback;
}
