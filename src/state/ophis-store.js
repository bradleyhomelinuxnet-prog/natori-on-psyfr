/**
 * Application state for the Ophis working surface.
 *
 * A plain object plus subscribe/notify — no framework, no build step. Panels
 * subscribe and re-render; `set()` shallow-merges and notifies once.
 *
 * The engine is pure and reads nothing from here directly: `recalculate()` hands
 * it an event and a `now`, and stores what comes back. That separation is what
 * lets the whole pipeline run headless under node in the test suite.
 */

import { runOphis } from '../core/ophis/run.js';
import { makeIsoEvent, makeXDate } from './iso-event.js';
import { APP_VERSION, SCHEMA_VERSION } from '../io/oph.js';

const KEY = {
  document: 'psyfr:document',
  legacyDocument: 'save_blob',
  theme: 'psyfr:theme',
  zoom: 'psyfr:zoom',
  density: 'psyfr:density',
  options: 'psyfr:options',
};

/** Options that live only in localStorage — never in a `.oph`. */
export const DEFAULT_OPTIONS = {
  start_screen: 'work',
  local_time_offset_in_millis: 0,
  current_iso_event_index: 0,
  auto_recalculate_z_dates: true,
  prettify_oph_files: true,
  minify_oph_files: false,
  hide_operations_col_completely: false,
  hide_date_col: false,
  hide_hits_col: false,
  hide_score_col: false,
  hide_msrf_col: false,
  hide_operations_col: false,
  theme: 'dark',
  density: 'full',
  text_zoom: 1,
};

const listeners = new Set();

/** A brand-new document: one event, seeded with nothing. */
function blankDocument() {
  return {
    app_version: APP_VERSION,
    schema: SCHEMA_VERSION,
    iso_events: [makeIsoEvent(0)],
  };
}

export const state = {
  document: blankDocument(),
  currentEventIndex: 0,
  screen: 'work',
  options: { ...DEFAULT_OPTIONS },

  /** OphisResults for the current event, or null before the first run. */
  results: null,
  /** True when inputs have changed since `results` was computed. */
  stale: false,
  /** True when the document matches what was last saved or loaded. */
  saved: true,

  /** Rows the user has expanded, and the row currently cross-highlighted. */
  highlightKey: null,

  /** Free-running feedback channel. Toasts are mirrored here so nothing is lost. */
  activity: [],
};

/** The event every screen is currently working on. */
export const currentEvent = () =>
  state.document.iso_events[state.currentEventIndex] ?? state.document.iso_events[0];

/**
 * "Now", as the engine should see it.
 *
 * Read from the clock and shifted by the user's offset, so the Current-time
 * field on the work surface can move the date filters without lying about the
 * system clock. The engine never reads a clock itself.
 */
export const now = () => Date.now() + (Number(state.options.local_time_offset_in_millis) || 0);

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let depth = 0;
export function notify() {
  if (depth > 0) return;
  for (const fn of listeners) {
    try {
      fn(state);
    } catch (err) {
      console.error('[ophis] a subscriber threw', err);
    }
  }
}

/** Batch several mutations into one notification. */
export function batch(fn) {
  depth += 1;
  try {
    fn();
  } finally {
    depth -= 1;
  }
  notify();
}

export function set(patch) {
  Object.assign(state, patch);
  notify();
}

let dirtyHook = null;

/** The shell registers a lightweight badge update here; see markDirty. */
export function setDirtyHook(fn) {
  dirtyHook = fn;
}

/**
 * The document changed in a way the ENGINE does not care about — a note, a
 * name, a chart overlay. The results on screen are still exactly right, so
 * this must not mark them stale; and it is called on every keystroke, so it
 * must not trigger a full re-render, which would destroy the field being
 * typed in. It flips the saved flag and lets the shell patch the badge.
 */
export function markDirty() {
  state.saved = false;
  dirtyHook?.();
}

/** Record something worth keeping. Toasts call through here too. */
export function log(kind, message) {
  state.activity.unshift({ kind, message, at: new Date().toISOString() });
  if (state.activity.length > 500) state.activity.length = 500;
}

/**
 * Mark the document changed.
 *
 * Recalculation is deliberately NOT automatic when `auto_recalculate_z_dates` is
 * off: the original's habit of recomputing on every keystroke made a large
 * anchor list unusable. Instead the results dim and the badge reads Stale, so
 * what is on screen is always honestly labelled.
 */
export function touch({ recalc = true } = {}) {
  state.saved = false;
  if (recalc && state.options.auto_recalculate_z_dates) recalculate();
  else {
    state.stale = true;
    notify();
  }
}

/** Run the engine for the current event and store the result. */
export function recalculate() {
  const ev = currentEvent();
  try {
    state.results = runOphis(ev, { now: now() });
    state.stale = false;
    for (const d of state.results.diagnostics) {
      log('diagnostic', `${d.kind}: ${d.detail}${d.count > 1 ? ` (x${d.count})` : ''}`);
    }
  } catch (err) {
    console.error('[ophis] the engine threw', err);
    log('error', `The engine failed: ${err.message}`);
    state.results = null;
  }
  notify();
  return state.results;
}

/* ------------------------------------------------------------------ events -- */

export function addEvent() {
  const ev = makeIsoEvent(state.document.iso_events.length);
  state.document.iso_events.push(ev);
  state.currentEventIndex = state.document.iso_events.length - 1;
  log('event', `Added ${ev.name}`);
  touch();
}

export function removeEvent(index) {
  if (state.document.iso_events.length <= 1) return false;
  const [gone] = state.document.iso_events.splice(index, 1);
  if (state.currentEventIndex >= state.document.iso_events.length) {
    state.currentEventIndex = state.document.iso_events.length - 1;
  }
  log('event', `Deleted ${gone.name}`);
  touch();
  return true;
}

export function cloneEvent(index) {
  const src = state.document.iso_events[index];
  const copy = structuredClone({ ...src, id: undefined });
  copy.id = `e${Date.now()}`;
  copy.name = `${src.name} (copy)`;
  state.document.iso_events.splice(index + 1, 0, copy);
  state.currentEventIndex = index + 1;
  log('event', `Cloned ${src.name}`);
  touch();
}

export function selectEvent(index) {
  if (index === state.currentEventIndex) return;
  state.currentEventIndex = index;
  state.options.current_iso_event_index = index;
  recalculate();
}

/* ---------------------------------------------------------------- storage -- */

const readJSON = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* a private window, or a full quota. Not worth failing a render over. */
  }
};

export function loadOptions() {
  const stored = readJSON(KEY.options);
  if (stored) Object.assign(state.options, DEFAULT_OPTIONS, stored);

  // The earlier single-file build wrote these under its own names.
  const legacy = {
    theme: localStorage.getItem('ophion-theme'),
    zoom: localStorage.getItem('ophion-zoom'),
    density: localStorage.getItem('ophion-mode'),
  };
  if (legacy.theme && !stored?.theme) state.options.theme = legacy.theme;
  if (legacy.zoom && !stored?.text_zoom) state.options.text_zoom = Number(legacy.zoom) || 1;
  if (legacy.density && !stored?.density) state.options.density = legacy.density;

  return state.options;
}

export const saveOptions = () => writeJSON(KEY.options, state.options);

/** Persist the working document so a reload does not lose it. */
export function persistDocument() {
  writeJSON(KEY.document, {
    app_version: APP_VERSION,
    schema: SCHEMA_VERSION,
    iso_events: state.document.iso_events,
    global_options: state.options,
  });
}

/** Restore the working document, accepting the legacy key on first read. */
export function restoreDocument() {
  const blob = readJSON(KEY.document) ?? readJSON(KEY.legacyDocument);
  if (!blob || !Array.isArray(blob.iso_events) || !blob.iso_events.length) return false;
  state.document = {
    app_version: blob.app_version ?? APP_VERSION,
    schema: blob.schema ?? SCHEMA_VERSION,
    iso_events: blob.iso_events,
  };
  state.currentEventIndex = Math.min(
    Number(state.options.current_iso_event_index) || 0,
    state.document.iso_events.length - 1
  );
  return true;
}

/** Replace the document wholesale — used by load and by import. */
export function adoptDocument(doc) {
  state.document = doc;
  state.currentEventIndex = 0;
  state.saved = true;
  recalculate();
}

/**
 * A worked example, so the app is never a blank page on first run.
 *
 * These are the five anchors the teardown's end-to-end fixture uses, which
 * means the numbers a new user sees first are the numbers the test suite pins.
 */
export function seedExample() {
  const ev = currentEvent();
  ev.name = 'Worked example';
  ev.x_dates = [
    [2026, 7, 4], [2026, 8, 20], [2027, 3, 9], [2027, 3, 16], [2027, 7, 17],
  ].map(([y, m, d]) => makeXDate(y, m, d));
  log('event', 'Seeded the worked example');
  touch();
}
