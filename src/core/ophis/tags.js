/**
 * Optional tags — read a finished run, never change it.
 *
 * Everything here takes an OphisResults that `runOphis` has already produced
 * and returns labels keyed by Z-Date. Nothing is written back onto the run:
 * no score, hit count, rank or row moves when a tag is switched on. That is the
 * whole contract, and it is why these live outside `run.js` — the parity suite
 * pins the engine, and a tag that could reach the score would have to be pinned
 * there too.
 *
 * Source: the author's *Other MSRA Filters*, read in docs/reverse/23 §2.
 */

import { MILLIS_PER_DAY, EVENT_SCOPE } from './constants.js';
import { normaliseWindow } from './calendar.js';

/** The author's Fibonacci set, F. It starts at 8, not 1. */
export const FIBONACCI = Object.freeze([8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]);

/**
 * The Z-Date bucket a day count from an anchor lands in.
 *
 * Mirrors the engine's own projection exactly — the Days-scope start time is
 * added to the base, and the window is normalised the same way — so a
 * Fibonacci projection and an operation's projection that land on the same
 * day share a key.
 */
function bucketKey(baseInstant, days, isoEvent) {
  const dayStart =
    (isoEvent.scope ?? EVENT_SCOPE.DAYS) === EVENT_SCOPE.DAYS
      ? Number(isoEvent.day_scope_start_time_in_millis) || 0
      : 0;
  const { zStart } = normaliseWindow(baseInstant + (dayStart > 0 ? dayStart : 0) + days * MILLIS_PER_DAY, isoEvent);
  return Number.isFinite(zStart) ? String(zStart) : null;
}

/**
 * The Fibonacci Sequence Filter, Operations 1 and 2.
 *
 *   Op 1: if Y (X1→X2) is in F, project every member of F forward from X2.
 *   Op 2: project every member of F forward from X1 and from X2.
 *
 * A projection that lands on a SURVIVING Z-Date tags it. Op 2 from X2 covers
 * the same days as Op 1 whenever Op 1 fires; both are reported, because the
 * author names them as separate operations and the tooltip says which fired.
 *
 * @param {object} results  OphisResults from runOphis
 * @param {object} isoEvent the event the run was made from
 * @returns {Map<string, {op: 1|2, x1: number, x2: number, from: 'X1'|'X2', n: number, y: number}[]>}
 *          keyed by Z-Date key; ordinals are 0-based like y_structs
 */
export function fibonacciTags(results, isoEvent) {
  const out = new Map();
  const survivors = new Set((results?.processed_z_dates ?? []).map((z) => z.key));
  if (!survivors.size) return out;

  const seen = new Set();
  const hit = (ys, op, from, n) => {
    const base = from === 'X1' ? ys.x_1_instant : ys.x_2_instant;
    const key = bucketKey(base, n, isoEvent);
    if (key === null || !survivors.has(key)) return;
    const id = `${key}|${op}|${ys.x_1_ordinal}|${ys.x_2_ordinal}|${from}|${n}`;
    if (seen.has(id)) return;
    seen.add(id);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push({
      op, x1: ys.x_1_ordinal, x2: ys.x_2_ordinal, from, n, y: ys.rotation_count_y,
    });
  };

  for (const ys of results.y_structs ?? []) {
    if (FIBONACCI.includes(ys.rotation_count_y)) {
      for (const n of FIBONACCI) hit(ys, 1, 'X2', n);
    }
    for (const n of FIBONACCI) {
      hit(ys, 2, 'X1', n);
      hit(ys, 2, 'X2', n);
    }
  }
  return out;
}

/**
 * One Fibonacci hit, in words, for a tooltip whose row is already labelled with
 * the op. The anchor is named by its own X-label, not "X2": in pair X1→X5 the
 * pair's second anchor is X5, and "X2 + 34" would point at the wrong date.
 */
export function describeFibonacci(t) {
  const pair = `X${t.x1 + 1}→X${t.x2 + 1}`;
  const anchor = `X${(t.from === 'X1' ? t.x1 : t.x2) + 1}`;
  return t.op === 1
    ? `Y(${pair}) = ${t.y}, in F · ${anchor} + ${t.n} days`
    : `${pair} · ${anchor} + ${t.n} days`;
}

/* ------------------------------------------- Geodetic (138) and Diurnal -- */

/**
 * How close a rotation count must be to a list value to be tagged, in days.
 *
 * One tenth of a day: `rotation_count_z` is itself rounded to one decimal, and
 * the author writes these lists to one decimal too (2016.1 for 2016.18). So a
 * count within one display step of the exact value is the same number as far
 * as either side can tell. The 1e-9 is there so 138.1 against 138 is decided
 * by this rule and not by IEEE-754 — unlike the MSRF's vortex check, which is
 * pinned to raw floating point and must stay that way.
 */
export const TAG_TOLERANCE_DAYS = 0.1;
const SLACK = 1e-9;

/**
 * The largest value any list runs to: (365.25 ÷ 3.14) × 22 = 2559.08, the last
 * entry of the author's own ÷ 3.14 series and the shipped 2559-day window.
 * Every series below is generated up to this and no further, which reproduces
 * the author's ranges without typing them: 138 × 18 = 2484, 365.25 × 1.38 × 5
 * = 2520.2, 365.25 × 7 = 2556.75.
 */
export const LIST_CEILING = (365.25 / 3.14) * 22;

/** Truncate to one decimal, as the author's lists are written (2016.18 → 2016.1). */
export const shownValue = (v) => Math.trunc(v * 10 + SLACK) / 10;

/** Every k × base up to the ceiling. */
function series(id, label, base) {
  const out = [];
  for (let k = 1; k * base <= LIST_CEILING + SLACK; k++) {
    out.push({ series: id, label, k, value: k * base, shown: shownValue(k * base) });
  }
  return out;
}

/** Geodetic Chronometry (138): multiples of 138, and 365.25 × 1.38k. */
export const GEODETIC = Object.freeze([
  ...series('138', '138 × k', 138),
  ...series('1.38', '365.25 × 1.38 × k', 365.25 * 1.38),
]);

/** The Diurnal (Annular Chronometric) series, docs/reverse/23 §4. */
export const DIURNAL = Object.freeze([
  ...series('year', '365.25 × k', 365.25),
  ...series('×phi', '365.25 × 1.618 × k', 365.25 * 1.618),
  ...series('÷phi', '365.25 ÷ 1.618 × k', 365.25 / 1.618),
  ...series('×pi', '365.25 × 3.14 × k', 365.25 * 3.14),
  ...series('÷pi', '365.25 ÷ 3.14 × k', 365.25 / 3.14),
]);

/**
 * Tag every surviving Z-Date one of whose contributors' rotation counts — the
 * days from that operation's anchor to the Z-Date, the very number the MSRF
 * probes — is within TAG_TOLERANCE_DAYS of a list value.
 *
 * @returns {Map<string, {entry: object, rc: number, ordinal: number, x1: number, x2: number}[]>}
 */
export function listTags(results, list) {
  const out = new Map();
  for (const z of results?.processed_z_dates ?? []) {
    const hits = [];
    for (const { y_struct: ys, operation_result: r } of z.operation_match_structs) {
      for (const entry of list) {
        if (Math.abs(r.rotation_count_z - entry.value) <= TAG_TOLERANCE_DAYS + SLACK) {
          hits.push({ entry, rc: r.rotation_count_z, ordinal: r.operation_ordinal, x1: ys.x_1_ordinal, x2: ys.x_2_ordinal });
        }
      }
    }
    if (hits.length) out.set(z.key, hits);
  }
  return out;
}

/** One list hit, in words, for a tooltip. */
export function describeListHit(h) {
  const exact = Math.round(h.entry.value * 100) / 100;
  return `${h.entry.label.replace('k', String(h.entry.k))} = ${exact} · ` +
    `O${h.ordinal + 1}(X${h.x1 + 1}→X${h.x2 + 1}) counts ${h.rc}`;
}
