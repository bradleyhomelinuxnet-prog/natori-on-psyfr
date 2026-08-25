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
import { makeIsoEvent, makeXDate, clampDayStart, ISO_EVENT_KEYS, CHART_OPTIONS } from '../state/iso-event.js';
import { FILTER_DEFAULTS } from '../core/ophis/filters.js';
import { packOperations, DEFAULT_OPHIS_PACK } from '../data/packs-ophis.js';

export const APP_VERSION = '13.0.0';
export const SCHEMA_VERSION = 1;

/** `strict` rejects anything unrecognised; `loose` repairs and warns. */
export const VALIDATION = { STRICT: 'strict', LOOSE: 'loose' };

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Read one X-Date, accepting both the `MM/DD/YYYY` string form and the object form. */
function readXDate(raw, out) {
  if (typeof raw === 'string') {
    const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{1,4})\s*$/.exec(raw);
    if (!m) {
      out.errors.push(`"${raw}" is not a date in MM/DD/YYYY form`);
      return null;
    }
    return makeXDate(Number(m[3]), Number(m[1]), Number(m[2]));
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
    return makeXDate(Number(m[3]), Number(m[1]), Number(m[2]), {
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
  return makeXDate(y, mo, d, {
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
  ev.t_dates = Array.isArray(raw.t_dates)
    ? raw.t_dates.map((x) => readXDate(x, out)).filter(Boolean)
    : [];

  return ev;
}

/**
 * Parse a `.oph` document.
 *
 * @returns {{document: object|null, errors: string[], warnings: string[]}}
 */
export function parseDocument(text, mode = VALIDATION.LOOSE) {
  const out = { errors: [], warnings: [] };

  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { document: null, errors: [`Could not parse JSON due to error: ${e.message}`], warnings: [] };
  }

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

  // Notes are user text. v12 dropped them here by accident; they stay.
  if (ev.notes) out.notes = ev.notes;
  if (ev.name) out.name = ev.name;

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
