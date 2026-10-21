/**
 * The author's standard operating procedure, as advice — never as a guard.
 *
 * *Ophis Definitions & SOP* and *Protocol Prime* (docs/reverse/23 §1, §3) set
 * operating limits the original program never checked. The engine still casts
 * exactly what it always cast; these only say when a cast is outside the
 * author's intended use. Nothing here can stop a run or change a result.
 */

import { MILLIS_PER_DAY } from './constants.js';
import { toInstant, span, fmtDate } from './calendar.js';

/** X1 and X2 should be at least this many days apart (the engine needs only 1). */
export const SOP_MIN_DAYS_BETWEEN = 6;

/** Best on X-Dates within this many years of the day the projection is run. */
export const SOP_MAX_AGE_YEARS = 3;

/** Older dates need at least this many X-Dates. */
export const SOP_MIN_X_DATES_WHEN_OLD = 5;

/** Results from older dates are read as windows of about this many days. */
export const WINDOW_DAYS = 7;

const YEAR_MS = 365.25 * MILLIS_PER_DAY;

/**
 * Non-blocking warnings for an event, in the order a reader should meet them.
 *
 * @param {object} ev        an IsoEvent
 * @param {number} nowMs     the engine's injected now
 * @param {{subjective?: boolean}} opts
 * @returns {{id: string, text: string}[]}
 */
export function sopWarnings(ev, nowMs, { subjective = false } = {}) {
  const out = [];
  const enabled = (ev.x_dates ?? [])
    .map((x, i) => ({ x, i, t: toInstant(x, ev) }))
    .filter(({ x, t }) => x.enabled === true && Number.isFinite(t));

  // 1 — spacing. Adjacent enabled anchors are the closest pairs; every pair is
  // an X1→X2 to the engine, so a short gap anywhere is a short Y somewhere.
  for (let n = 1; n < enabled.length; n++) {
    const a = enabled[n - 1];
    const b = enabled[n];
    const y = span(a.t, b.t, ev);
    if (y > 0 && y < SOP_MIN_DAYS_BETWEEN) {
      out.push({
        id: 'spacing',
        text:
          `X${a.i + 1} and X${b.i + 1} are ${y} day${y === 1 ? '' : 's'} apart. The SOP asks for at ` +
          `least ${SOP_MIN_DAYS_BETWEEN}: 6 days apart gives a window of about 39–42 days after the ` +
          'later date, 15 days about 3 months.',
      });
    }
  }

  // 2 — age. Measured from the day the projection is run, not from the clock,
  // so the Current-date override moves it too.
  const old = enabled.filter(({ t }) => nowMs - t > SOP_MAX_AGE_YEARS * YEAR_MS);
  if (old.length) {
    const oldest = old.reduce((p, q) => (q.t < p.t ? q : p));
    const few = enabled.length < SOP_MIN_X_DATES_WHEN_OLD;
    out.push({
      id: 'age',
      text:
        `${old.length} X-Date${old.length === 1 ? ' is' : 's are'} more than ${SOP_MAX_AGE_YEARS} years ` +
        `old (oldest: X${oldest.i + 1}, ${fmtDate(oldest.t)}). The SOP says the method is best within ` +
        `${SOP_MAX_AGE_YEARS} years; older dates need ${SOP_MIN_X_DATES_WHEN_OLD} or more X-Dates` +
        (few ? ` (this event has ${enabled.length})` : '') +
        ', the MSRF does not apply to them, and results should be read as windows of about a week, ' +
        'not exact days.',
    });
  }

  // 3 — Protocol Prime. A subjective projection must END with the day it is run.
  if (subjective) {
    const d = new Date(nowMs);
    const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const last = enabled.at(-1);
    const lastDay = last ? Date.UTC(last.x.y, last.x.m - 1, last.x.d) : null;
    if (lastDay !== today) {
      const has = enabled.some(({ x }) => Date.UTC(x.y, x.m - 1, x.d) === today);
      out.push({
        id: 'protocol-prime',
        text: has
          ? `Subjective: today (${fmtDate(today)}) is an X-Date but not the last one. Protocol Prime ` +
            'wants the day the projection is run as the LAST X-Date, so later dates are outside it.'
          : `Subjective: today (${fmtDate(today)}) is not an X-Date. Protocol Prime wants the day the ` +
            'projection is run as the last X-Date; ☉ Today adds it.',
      });
    }
  }

  return out;
}

/**
 * Group Z-Dates into windows of WINDOW_DAYS, for reading results as periods.
 *
 * Chronological; a window opens at its first Z-Date and takes every later one
 * that starts less than `days` days after it, so no window is wider than a
 * week. A reading aid only: nothing is re-scored or re-ranked, and each window
 * reports its members' own numbers.
 *
 * @param {object[]} zDates processed Z-Dates (any order)
 * @returns {{start: number, end: number, members: object[], hits: number, best: number}[]}
 */
export function groupIntoWindows(zDates, days = WINDOW_DAYS) {
  const sorted = [...zDates].sort((a, b) => a.zStart - b.zStart);
  const out = [];
  for (const z of sorted) {
    const cur = out.at(-1);
    if (cur && z.zStart - cur.start < days * MILLIS_PER_DAY) {
      cur.members.push(z);
      cur.end = z.zStart;
      cur.hits += z.hit_count;
      cur.best = Math.max(cur.best, z.score);
    } else {
      out.push({ start: z.zStart, end: z.zStart, members: [z], hits: z.hit_count, best: z.score });
    }
  }
  return out;
}
