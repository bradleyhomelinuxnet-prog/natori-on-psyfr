/**
 * Calendars for the `ophis` reckoning: anchor -> instant, instant -> window,
 * and the span between two anchors (the "Y" every operation is a function of).
 *
 * Two scopes run. DAYS is the default and the one every parity fixture uses;
 * HH_MM is the sunset-bucketed variant. MONTHS and YEARS exist in the schema
 * because a `.oph` file may name them, and are refused by the guard in run.js —
 * exactly as the original refused them.
 */

import { MILLIS_PER_DAY, EVENT_SCOPE, LAT_LIMIT, LONG_LIMIT } from './constants.js';
import { round1 } from './numeric.js';
import { sunsetMs, roundToNearestMinute } from './sun.js';

/**
 * Sunsets within an hour of each other are treated as the same sunset.
 *
 * The original's justification was that the same library can return two
 * different sunset times for one calendar day depending on the sample instant.
 * Collapsing them keeps a Z-window from having a zero-length or inverted span.
 */
const SUNSET_COLLAPSE_TOLERANCE = 3_600_000;

/** Beyond this gap the original fabricated one midpoint sunset. */
const SUNSET_GAP_LIMIT = 1.5 * MILLIS_PER_DAY;

/** DAYS scope pins every anchor to UTC midnight, which is what makes the day arithmetic DST-free. */
export const utcMidnight = (y, m, d) => Date.UTC(y, m - 1, d);

/** Floor an instant to the UTC day that contains it. Correct before 1970, where the original's `%` was not. */
export const floorToDay = (ms) => Math.floor(ms / MILLIS_PER_DAY) * MILLIS_PER_DAY;

export const clampLat = (v) => Math.max(-LAT_LIMIT, Math.min(LAT_LIMIT, Number(v) || 0));
export const clampLong = (v) => Math.max(-LONG_LIMIT, Math.min(LONG_LIMIT, Number(v) || 0));

/**
 * Resolve an XDate record to an epoch instant.
 *
 * In DAYS scope `FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT` is on, so lat/long are
 * forced to 0,0 and the time to 00:00 regardless of what the record carries.
 * That flag is why two people on opposite sides of the planet get identical
 * output from the same file, and it is not configurable here either.
 */
export function toInstant(xDate, isoEvent) {
  const { y, m, d } = xDate;
  if (isoEvent.scope !== EVENT_SCOPE.HH_MM) return utcMidnight(y, m, d);

  const [hh = 0, mm = 0] = String(xDate.time ?? '00:00').split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm);
}

/**
 * The sunset sampling for a neighbourhood of `ms`.
 *
 * Fifteen samples spanning roughly [ms - 2.17 d, ms + 2.5 d], deduped, sorted
 * ascending, with a single fabricated midpoint wherever consecutive sunsets are
 * more than 1.5 days apart. The original needed the fabrication because its
 * Meeus binding would simply not return certain calendar days; it is kept
 * because a missing sunset otherwise produces a Z-window two days wide.
 */
export function sunsetSampling(ms, lat, long) {
  const set = new Set();
  for (let i = -13; i <= 15; i += 2) {
    const t = sunsetMs(ms + (i / 6) * MILLIS_PER_DAY, lat, long);
    if (Number.isFinite(t)) set.add(roundToNearestMinute(t));
  }

  const arr = Array.from(set).sort((a, b) => a - b);
  for (let i = arr.length - 1; i >= 1; i--) {
    const delta = arr[i] - arr[i - 1];
    if (delta > SUNSET_GAP_LIMIT) arr.splice(i, 0, arr[i - 1] + Math.round(delta / 2));
  }
  return arr;
}

/** The last sunset at or before `ms`. A moment exactly at sunset returns that sunset. */
export function sunsetBefore(ms, lat, long, sampling = null) {
  const s = sampling ?? sunsetSampling(ms, lat, long);
  for (let i = s.length - 1; i >= 0; i--) if (ms >= s[i]) return s[i];
  return s.length ? s[0] : ms;
}

/** The next sunset at or after `ms`. Also inclusive, so `before === after` exactly at a sunset. */
export function sunsetAfter(ms, lat, long, sampling = null) {
  const s = sampling ?? sunsetSampling(ms, lat, long);
  for (let i = 0; i < s.length; i++) if (ms <= s[i]) return s[i];
  return s.length ? s[s.length - 1] : ms;
}

/**
 * Y — the span between two anchors, in axial rotations.
 *
 * DAYS is an exact integer expressed at 1 dp, and is EXCLUSIVE: two consecutive
 * calendar days give 1, not 2. Direction matters, because X1 is the lower array
 * index rather than the earlier date, so a mis-ordered anchor list yields a
 * negative Y — which is deliberately NOT clamped.
 *
 * HH_MM is a bespoke bucketing rather than a division. Both half-day tests are
 * strict, so an exact half rounds toward zero, and the negative branch returns
 * -1 before any rounding happens. The two directions are therefore asymmetric by
 * construction: +1 day and -1 day are not mirror images.
 */
export function span(x1Ms, x2Ms, isoEvent) {
  if (isoEvent.scope !== EVENT_SCOPE.HH_MM) {
    return round1((x2Ms - x1Ms) / MILLIS_PER_DAY);
  }

  const lat = clampLat(isoEvent.lat);
  const long = clampLong(isoEvent.long);
  const a = sunsetBefore(x1Ms, lat, long);
  const b = sunsetBefore(x2Ms, lat, long);
  const d = b - a;

  if (d === 0) return 0;
  if (d < 0 && d >= -MILLIS_PER_DAY) return -1;

  if (d < 0) {
    let t = Math.trunc(d / MILLIS_PER_DAY);
    if (d % MILLIS_PER_DAY < -MILLIS_PER_DAY / 2) t -= 1;
    return round1(t);
  }

  if (d <= MILLIS_PER_DAY) return 1;

  let t = Math.floor(d / MILLIS_PER_DAY);
  if (d % MILLIS_PER_DAY > MILLIS_PER_DAY / 2) t += 1;
  return round1(t);
}

/**
 * Turn a raw Z instant into the [zStart, zEnd) window the filters and the
 * bucketing key work against.
 *
 * DAYS collapses to a single day, so zStart === zEnd and the window is a point.
 * HH_MM brackets the instant between the sunsets either side of it, collapsing
 * a pair less than an hour apart so the window can never be degenerate.
 */
export function normaliseWindow(zRawMs, isoEvent) {
  if (isoEvent.scope !== EVENT_SCOPE.HH_MM) {
    const day = floorToDay(zRawMs);
    return { zStart: day, zEnd: day };
  }

  const lat = clampLat(isoEvent.lat);
  const long = clampLong(isoEvent.long);
  const sampling = sunsetSampling(zRawMs, lat, long);
  let zStart = sunsetBefore(zRawMs, lat, long, sampling);
  let zEnd = sunsetAfter(zRawMs, lat, long, sampling);

  if (zEnd - zStart <= SUNSET_COLLAPSE_TOLERANCE) zEnd = zStart + MILLIS_PER_DAY;
  return { zStart, zEnd };
}

/** `MM/DD/YYYY` from an epoch instant, read in UTC. */
export function fmtDate(ms) {
  const dt = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(dt.getUTCMonth() + 1)}/${p(dt.getUTCDate())}/${dt.getUTCFullYear()}`;
}

/** `MM/DD/YYYY HH:MM`, 24-hour, for HH_MM scope. */
export function fmtDateTime(ms) {
  const dt = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${fmtDate(ms)} ${p(dt.getUTCHours())}:${p(dt.getUTCMinutes())}`;
}
