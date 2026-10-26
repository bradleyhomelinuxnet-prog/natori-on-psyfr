/**
 * The Lab — the author's working notes, read against a finished run.
 *
 * Every function here takes an OphisResults that `runOphis` already produced,
 * plus the event it came from, and returns a reading of it. None of them writes
 * back: no score, hit count, rank or row of the run changes. Same contract as
 * ./tags.js, for the same reason — the parity suite pins the engine, and only
 * the engine.
 *
 * Sources, read in docs/reverse/24:
 *   - *Programmer Instructions* — one column per X-date counting the Earth's
 *     rotations to each projection, showing only the MSRF Tier (§1, matrix);
 *     the beta / ALPHA validity rule (§1, validity); and how far ahead to look
 *     given how recent and how close the X-dates are (§1, horizon).
 *   - *The Metonic Cycle* folio — the moon's long returns (§4, dials, gaps). The
 *     numbers come from the mean synodic month the app already uses, not from
 *     the folio: Metonic is 235 lunations, Saros 223, Callippic 940, Exeligmos 669.
 *
 * Pure: no DOM, no clock. `now` is passed in.
 */

import { MILLIS_PER_DAY, SYNODIC_MONTH } from './constants.js';
import { toInstant } from './calendar.js';
import { msrfTier } from '../../data/msrf-tiers.js';
import { HOLOFLECTIVE } from '../../data/holoflective.js';

const SLACK = 1e-9;

/* ---------------------------------------------------- the anchor matrix -- */

/**
 * Rotations from EVERY enabled X-date to each surviving Z-date, with the MSRF
 * tier of each count.
 *
 * The engine probes one number per projection: the distance from that
 * operation's own anchor. The Programmer Instructions ask for a column per
 * X-date — "if 7 X-dates are entered then there must be seven columns" — so a
 * Z-date can resonate with an anchor that did not project it. Counts are whole
 * days in Days scope; a fractional count (HH:MM scope) has no tier.
 *
 * @returns {{xs: {index: number, at: number}[], rows: {key: string, z: object,
 *   cells: ({days: number, tier: ?object}|null)[], tiers: number, apex: boolean}[]}}
 */
export function anchorMatrix(results, ev) {
  const xs = (ev.x_dates ?? [])
    .map((x, index) => ({ x, index, at: toInstant(x, ev) }))
    .filter(({ x, at }) => x.enabled === true && Number.isFinite(at));

  const rows = (results?.processed_z_dates ?? []).map((z) => {
    const cells = xs.map(({ at }) => {
      const days = Math.round(((z.zStart - at) / MILLIS_PER_DAY) * 10) / 10;
      if (!(days > 0)) return null;
      const tier = Number.isInteger(days) ? msrfTier(days) : null;
      return { days, tier };
    });
    const tiered = cells.filter((c) => c?.tier);
    return { key: z.key, z, cells, tiers: tiered.length, apex: tiered.some((c) => c.tier.apex) };
  });

  return { xs: xs.map(({ index, at }) => ({ index, at })), rows };
}

/* ---------------------------------------------------- the validity rule -- */

const ISO_OR_HOLO = /^X[12]\+(?:oph_flip\()?oph_round\(Y\)\)?$/;

/** The isometric (#1) and holofractal (#2) projections, on either anchor. */
export const isIsometricOrHolo = (equation) => ISO_OR_HOLO.test(String(equation).replace(/\s+/g, ''));

/**
 * The author's validity rule (Programmer Instructions):
 *
 *   - the isometric and holofractal dates "have no significance unless their
 *     projected dates also appear on the MSRF";
 *   - "beta dates need to be supported by either a second beta projection hit
 *     or by a hit on the MSRF to be valid";
 *   - "ALPHA dates need no correspondence with another Core Algorithm
 *     projection or the MSRF to be valid".
 *
 * So a Z-date stands if it has an MSRF match, or an ALPHA hit (weight 1 or
 * more) from any operation but those two, or two or more hits from operations
 * other than those two.
 *
 * @returns {{valid: boolean, why: string}}
 */
export function validity(z) {
  if (z.resonance_matches?.length) return { valid: true, why: 'an MSRF match' };
  const core = z.operation_match_structs.filter((m) => !isIsometricOrHolo(m.operation_result.operation.equation));
  if (core.some((m) => m.operation_result.operation.weight >= 1)) return { valid: true, why: 'an ALPHA operation' };
  if (core.length >= 2) return { valid: true, why: 'two core operations agree' };
  if (!core.length) return { valid: false, why: 'only the isometric or holofractal projection, and no MSRF match' };
  return { valid: false, why: 'one beta operation alone, and no MSRF match' };
}

/**
 * The run with the rule applied, for display only.
 *
 * A shallow copy whose `processed_z_dates` keeps the rows that stand; the run
 * itself is untouched. `set_aside` says how many went, so the table can say so.
 */
export function applyValidity(results) {
  const rows = results?.processed_z_dates ?? [];
  const kept = rows.filter((z) => validity(z).valid);
  return { ...results, processed_z_dates: kept, set_aside: rows.length - kept.length };
}

/* --------------------------------------------------- gaps and the moon -- */

/** The moon's long returns, as whole lunations. */
export const MOON_CYCLES = Object.freeze([
  { id: 'lunation', name: 'Lunation', lunations: 1, note: 'new moon to new moon' },
  { id: 'saros', name: 'Saros', lunations: 223, note: 'eclipses repeat; 18 years 11 days' },
  { id: 'metonic', name: 'Metonic', lunations: 235, note: 'same phase on the same date; 19 years' },
  { id: 'exeligmos', name: 'Exeligmos', lunations: 669, note: 'three Saros; eclipses repeat at the same hour' },
  { id: 'callippic', name: 'Callippic', lunations: 940, note: 'four Metonic cycles; 76 years' },
].map((c) => ({ ...c, days: c.lunations * SYNODIC_MONTH })));

/** Within a day of a whole number of returns. */
export const MOON_TOLERANCE_DAYS = 1;

/**
 * Each pair of X-dates: the gap Y, in lunations, whether it is a whole number
 * of a moon cycle (so both dates fell at the same phase), its MSRF tier, and its
 * holoflective reflection when the author's table has one.
 */
export function gapReadings(results) {
  const holo = new Map(HOLOFLECTIVE.map((h) => [h.sum, h]));
  return (results?.y_structs ?? []).map((ys) => {
    const Y = ys.rotation_count_y;
    const returns = MOON_CYCLES.filter((c) => {
      const k = Math.round(Y / c.days);
      return k >= 1 && Math.abs(Y - k * c.days) <= MOON_TOLERANCE_DAYS + SLACK;
    }).map((c) => ({ ...c, k: Math.round(Y / c.days) }));
    return {
      x1: ys.x_1_ordinal,
      x2: ys.x_2_ordinal,
      Y,
      lunations: Y / SYNODIC_MONTH,
      returns,
      tier: Number.isInteger(Y) ? msrfTier(Y) : null,
      holo: holo.get(Y) ?? null,
    };
  });
}

/**
 * Where a day sits on each moon cycle, counted from the event's first date —
 * the Antikythera mechanism's back dials, started on your X1.
 *
 * `fraction` 0 means the cycle has come right back round to X1: for the
 * Metonic dial that is the same moon phase on (very nearly) the same calendar
 * date. `nextReturn` is the instant the dial next comes round.
 */
export function moonDials(fromMs, toMs) {
  const elapsed = (toMs - fromMs) / MILLIS_PER_DAY;
  return MOON_CYCLES.map((c) => {
    const turns = elapsed / c.days;
    const whole = Math.floor(turns + SLACK);
    const fraction = Math.max(0, turns - whole);
    const sinceReturn = fraction * c.days;
    const toReturn = c.days - sinceReturn;
    return {
      ...c,
      turns,
      whole,
      fraction,
      atReturn: sinceReturn <= MOON_TOLERANCE_DAYS || toReturn <= MOON_TOLERANCE_DAYS,
      nextReturn: fromMs + (whole + 1) * c.days * MILLIS_PER_DAY,
    };
  });
}

/* ------------------------------------------------- how far ahead to look -- */

/**
 * The Programmer Instructions' rule of thumb for where the results should fall:
 *
 *   - X-dates within 30 days of the run: a few days to about 5 months away;
 *   - within 60 days: about a week to about a year away;
 *   - controls 5 days apart: 5 days to about a month.
 *
 * Read from the latest enabled X-date and the closest pair. Advice only.
 *
 * @returns {?{text: string, fromDays: number, toDays: number}}
 */
export function horizon(ev, now) {
  const at = (ev.x_dates ?? [])
    .filter((x) => x.enabled === true)
    .map((x) => toInstant(x, ev))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (at.length < 2) return null;

  const latestAge = (now - at.at(-1)) / MILLIS_PER_DAY;
  let closest = Infinity;
  for (let i = 1; i < at.length; i++) closest = Math.min(closest, (at[i] - at[i - 1]) / MILLIS_PER_DAY);

  if (closest <= 5) {
    return { text: 'Two of your dates are about 5 days apart: look from about 5 days to a month ahead.', fromDays: 5, toDays: 31 };
  }
  if (latestAge >= 0 && latestAge <= 30) {
    return { text: 'Your latest date is within 30 days: look from a few days to about 5 months ahead.', fromDays: 3, toDays: 152 };
  }
  if (latestAge >= 0 && latestAge <= 60) {
    return { text: 'Your latest date is within 60 days: look from about a week to about a year ahead.', fromDays: 7, toDays: 365 };
  }
  return null;
}
