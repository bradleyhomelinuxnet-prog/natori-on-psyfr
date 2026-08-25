/**
 * Saving and loading setups.
 *
 * Two formats are understood:
 *   - `.json` — this app's native format (round-trips everything).
 *   - `.oph`  — the original Ophis v12 desktop preset, imported best-effort.
 *
 * Nothing loaded from a file is ever executed. Operation equations go through
 * the same parser as anything typed by hand, and one that fails to parse is
 * kept, disabled, and shown with its error rather than silently dropped.
 */

import { jdn } from '../core/jdn.js';
import { state, set, makeAnchor, makeOperation } from '../state/store.js';
import { LENSES, DEFAULT_LENS } from '../core/scoring/lenses.js';
import { DEFAULT_PACK_NAME } from '../data/packs.js';
import { downloadText, stamp } from './download.js';

export const FORMAT = 'natori-on-psyfr/1';

/* ------------------------------------------------------------------ native */

export function serializeConfig() {
  return JSON.stringify(
    {
      format: FORMAT,
      saved: new Date().toISOString(),
      packName: state.packName,
      lens: state.lens,
      convTol: state.convTol,
      anchors: state.anchors.map(({ ay, m, d, label, enabled }) => ({ ay, m, d, label, enabled })),
      operations: state.operations.map(({ eq, enabled }) => ({ eq, enabled })),
    },
    null,
    2
  );
}

export function saveConfig() {
  downloadText(`natori-setup_${stamp()}.json`, serializeConfig(), 'application/json');
}

/* ------------------------------------------------------------- .oph import */

const OPH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/**
 * Convert an Ophis v12 `.oph` preset.
 *
 * Only the first event is imported — this app holds one working set at a time,
 * where the desktop app kept several. The desktop-only fields (lat/long, sunset
 * day-boundaries, chart toggles, MSRF filters) have no equivalent here and are
 * reported as skipped rather than quietly ignored.
 */
function fromOph(doc) {
  const events = Array.isArray(doc.iso_events) ? doc.iso_events : [];
  if (!events.length) throw new Error('this .oph file contains no events');

  const ev = events[0];
  const anchors = [];

  for (const x of ev.x_dates ?? []) {
    const match = OPH_DATE.exec(String(x.date ?? '').trim());
    if (!match) continue;
    const [, mm, dd, yyyy] = match;
    anchors.push(
      makeAnchor(Number(yyyy), Number(mm), Number(dd), String(x.date), x.enabled !== false)
    );
  }

  const operations = (ev.operations ?? []).map((o) =>
    makeOperation(String(o.equation ?? ''), o.enabled !== false)
  );

  const skipped = [];
  if (ev.location_enabled) skipped.push('location / sunset day-boundaries');
  if ((ev.t_dates ?? []).length) skipped.push(`${ev.t_dates.length} T-Date(s)`);
  if (ev.scope && ev.scope !== 'EVENT_SCOPE__DAYS') skipped.push(`scope ${ev.scope}`);
  if (events.length > 1) skipped.push(`${events.length - 1} further event(s)`);

  return {
    anchors,
    operations,
    // The desktop scoring systems don't map onto the Chronicon lenses, so fall
    // back to the default rather than guessing.
    lens: DEFAULT_LENS,
    packName: `Imported · ${ev.name || 'Ophis preset'}`,
    skipped,
    source: 'oph',
  };
}

/* ------------------------------------------------------------------ native */

function fromNative(doc) {
  const anchors = (doc.anchors ?? []).map((a) =>
    makeAnchor(Number(a.ay), Number(a.m), Number(a.d), String(a.label ?? ''), a.enabled !== false)
  );
  const operations = (doc.operations ?? []).map((o) =>
    makeOperation(String(o.eq ?? ''), o.enabled !== false)
  );
  return {
    anchors,
    operations,
    lens: LENSES[doc.lens] ? doc.lens : DEFAULT_LENS,
    packName: doc.packName ?? DEFAULT_PACK_NAME,
    convTol: doc.convTol,
    skipped: [],
    source: 'native',
  };
}

/* -------------------------------------------------------------------- load */

/**
 * Parse either format and apply it.
 * @returns {{loaded: number, operations: number, invalid: number, skipped: string[], source: string}}
 */
export function loadConfigText(text) {
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new Error('that file is not valid JSON');
  }
  if (!doc || typeof doc !== 'object') throw new Error('that file is not a setup');

  const parsed = doc.iso_events ? fromOph(doc) : fromNative(doc);

  if (!parsed.anchors.length && !parsed.operations.length) {
    throw new Error('no anchors or operations found in that file');
  }

  const patch = {
    lens: parsed.lens,
    packName: parsed.packName,
    results: [],
    hasCast: false,
    selectedZ: null,
  };
  if (parsed.anchors.length) patch.anchors = parsed.anchors;
  if (parsed.operations.length) patch.operations = parsed.operations;
  if (parsed.convTol !== undefined) patch.convTol = parsed.convTol;
  set(patch);

  return {
    loaded: parsed.anchors.length,
    operations: parsed.operations.length,
    invalid: parsed.operations.filter((o) => o.error).length,
    skipped: parsed.skipped,
    source: parsed.source,
  };
}

/** Read a File chosen from the picker. */
export async function loadConfigFile(file) {
  return loadConfigText(await file.text());
}

/** Julian day of an anchor record, for callers that only have {ay,m,d}. */
export const anchorJd = (a) => jdn(a.ay, a.m, a.d);
