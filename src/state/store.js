/**
 * Application state.
 *
 * Deliberately a plain object plus a subscribe/notify pair — no framework, no
 * build step. Panels subscribe to the keys they care about and re-render when
 * those change. `set()` shallow-merges and notifies once.
 */

import { jdn, today } from '../core/jdn.js';
import { compileOperation } from '../core/equation/index.js';
import { DEFAULT_PACK_NAME, PACKS } from '../data/packs.js';
import { DEFAULT_LENS } from '../core/scoring/lenses.js';

let nextId = 1;
export const uid = () => `id${nextId++}`;

/** Build an anchor record, deriving its Julian Day and display label. */
export function makeAnchor(ay, m, d, label, enabled = true) {
  return { id: uid(), ay, m, d, label: label || '', enabled, jd: jdn(ay, m, d) };
}

/** Compile an equation into an operation record. Never throws; carries `error`. */
export function makeOperation(eq, enabled = true) {
  try {
    const c = compileOperation(eq);
    return { id: uid(), eq: c.eq, start: c.start, fn: c.fn, enabled, error: null };
  } catch (e) {
    return { id: uid(), eq, start: null, fn: null, enabled: false, error: e.message };
  }
}

export function packOperations(name) {
  return (PACKS[name] ?? PACKS[DEFAULT_PACK_NAME]).map((eq) => makeOperation(eq));
}

const T = today();

export const state = {
  /* --- inputs --- */
  anchors: [],
  operations: packOperations(DEFAULT_PACK_NAME),
  packName: DEFAULT_PACK_NAME,
  lens: DEFAULT_LENS,

  /* --- outputs --- */
  results: [],
  hasCast: false,

  /* --- results view --- */
  filter: 'all',
  sort: { key: 'score', dir: 'desc' },
  selectedZ: null,

  /* --- convergence view --- */
  convTol: 30,

  /* --- wheels --- */
  dial: { ay: T.y, m: T.m, d: T.d },

  /* --- ledger --- */
  ledgerFilter: 'all',

  /* --- chrome --- */
  theme: 'dark',
  zoom: 1,
  simple: false,

  /** The year the Metonic test measures from. Read from the clock, not baked in. */
  referenceYear: T.y,
  today: T,
};

const listeners = new Set();

/** Subscribe to changes. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Shallow-merge a patch into state and notify subscribers once. */
export function set(patch) {
  Object.assign(state, patch);
  const keys = Object.keys(patch);
  for (const fn of listeners) fn(state, keys);
}

/** Notify without changing anything — for in-place mutations of arrays. */
export function touch(...keys) {
  for (const fn of listeners) fn(state, keys);
}
