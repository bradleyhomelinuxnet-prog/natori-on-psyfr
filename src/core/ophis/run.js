/**
 * `runOphis` — the projection pipeline.
 *
 * The engine reads no globals and no clock. `now` is injected through `ctx`,
 * which is what makes a run reproducible and testable: the same event and the
 * same `now` always produce the same output, on any machine, in any timezone.
 *
 * The shape of the calculation:
 *
 *   for every unordered PAIR of enabled anchors (X1 = the LOWER array index)
 *     Y = the span between them
 *     for every enabled, compiling operation
 *       offset = fn(Y)
 *       Z      = the operation's named anchor + offset
 *   then bucket every Z landing on the same day, score the bucket, filter, sort.
 *
 * Details that are easy to get wrong and are load-bearing:
 *
 *   - X1 is the lower-INDEXED anchor, not the earlier date. Reordering the
 *     anchor list is therefore a deliberate control, not a no-op.
 *   - Pairing is ALL pairs, not adjacent ones. n anchors give n(n-1)/2 pairs.
 *   - The offset is converted to milliseconds BEFORE it is rounded for display.
 *     Rounding first moves projections by up to half a day.
 *   - `rotation_count_z` is round1 OF the round2 value — a double rounding, and
 *     it is the number the resonance filters probe. Probing the raw value finds
 *     different matches.
 */

import {
  MILLIS_PER_DAY,
  MAXIMUM_ROTATION_COUNT_Y,
  MAXIMUM_ROTATION_COUNT_Z,
  MINIMUM_NUMBER_OF_X_DATES,
  MINIMUM_DAYS_BETWEEN_X_DATES,
  EVENT_SCOPE,
  SCORING_SYSTEM,
  ERRORS,
} from './constants.js';
import { round1, round2 } from './numeric.js';
import { toInstant, span, normaliseWindow, fmtDate, fmtDateTime } from './calendar.js';
import { compileOperation } from '../equation/index.js';
import { getMsrfMatch, describeMatch } from './msrf-match.js';
import { scoreAll } from './scoring.js';
import { applyFilters } from './filters.js';
import { sortAndLabel, normaliseSortType } from './sort.js';

/** Collect diagnostics without letting them become exceptions. */
class Diagnostics {
  constructor() {
    this.byKind = new Map();
  }

  record(kind, detail, extra = {}) {
    const key = `${kind}|${detail}`;
    const found = this.byKind.get(key);
    if (found) {
      found.count += 1;
      return;
    }
    this.byKind.set(key, { kind, detail, count: 1, ...extra });
  }

  list() {
    return Array.from(this.byKind.values());
  }
}

/**
 * Compile every operation, keeping each at its original index.
 *
 * A disabled or broken operation stays in the array as a hole rather than being
 * filtered out, because `operation_ordinal` indexes this array AND the saved
 * one. Compacting here would renumber every `O<n>` label the moment a row was
 * disabled.
 */
export function compileOperations(operations, diagnostics = new Diagnostics()) {
  return operations.map((op, i) => {
    if (op.enabled !== true) return { ...op, ordinal: i, ok: false, errors: [] };
    try {
      const c = compileOperation(op.equation, 'ophis');
      return { ...op, ordinal: i, ok: true, anchor: c.start, fn: c.fn, ast: c.ast, errors: [] };
    } catch (e) {
      diagnostics.record('OPERATION_INVALID', e.message, { operation_ordinal: i });
      return { ...op, ordinal: i, ok: false, errors: [e.message] };
    }
  });
}

/**
 * Enabled anchors must be strictly ascending, with at least a day between them.
 *
 * Returns the error list; empty means valid. The engine relies on this having
 * run, and does no re-ordering of its own.
 */
export function validateXDateSpread(isoEvent) {
  const errors = [];
  const enabled = isoEvent.x_dates
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => x.enabled === true);

  for (let n = 1; n < enabled.length; n++) {
    const prev = enabled[n - 1];
    const cur = enabled[n];
    const y = span(toInstant(prev.x, isoEvent), toInstant(cur.x, isoEvent), isoEvent);
    const a = `X${prev.i + 1}`;
    const b = `X${cur.i + 1}`;

    if (y < 0) {
      errors.push(`${b} must be greater than ${a}`);
    } else if (y === 0) {
      errors.push(
        isoEvent.scope === EVENT_SCOPE.HH_MM
          ? `${a} and ${b} must be different days, or before/after sunset.`
          : `${a} and ${b} must be different days.`
      );
    } else if (y < MINIMUM_DAYS_BETWEEN_X_DATES) {
      errors.push(
        `${b} must be at least ${MINIMUM_DAYS_BETWEEN_X_DATES} day(s) after ${a}, found: ${y}`
      );
    }
  }
  return errors;
}

/**
 * A run that stopped at a guard.
 *
 * Diagnostics are carried through rather than dropped. Without that, an event
 * whose every operation failed to compile reports only "At least 1 Operation is
 * required" — which is true, and says nothing about the six parse errors that
 * caused it. The Audit screen would then read "Clean".
 */
const emptyResults = (errors, diagnostics = []) => ({
  errors,
  y_structs: [],
  z_structs: {},
  effective_operations: [],
  processed_z_dates: [],
  processed_z_dates__sorted_by_date: [],
  diagnostics,
  hidden: 0,
});

/**
 * @param {object} isoEvent
 * @param {{now: number}} ctx
 * @returns {object} OphisResults
 */
export function runOphis(isoEvent, ctx) {
  const diagnostics = new Diagnostics();
  const now = ctx?.now ?? 0;
  const scope = isoEvent.scope ?? EVENT_SCOPE.DAYS;
  const hhmm = scope === EVENT_SCOPE.HH_MM;

  // STEP 1 — compile.
  const effectiveOperations = compileOperations(isoEvent.operations ?? [], diagnostics);
  const runnable = effectiveOperations.filter((o) => o.enabled === true && o.ok === true);

  // STEP 2 — guards. Mutually exclusive: the first that fires ends the run.
  const enabledAnchors = (isoEvent.x_dates ?? []).filter((x) => x.enabled === true);
  if (enabledAnchors.length < MINIMUM_NUMBER_OF_X_DATES) return emptyResults([ERRORS.MIN_X_DATES], diagnostics.list());
  if (scope === EVENT_SCOPE.MONTHS) return emptyResults([ERRORS.SCOPE_MONTHS], diagnostics.list());
  if (scope === EVENT_SCOPE.YEARS) return emptyResults([ERRORS.SCOPE_YEARS], diagnostics.list());
  if (runnable.length < 1) return emptyResults([ERRORS.MIN_OPERATIONS], diagnostics.list());

  const spreadErrors = validateXDateSpread(isoEvent);
  if (spreadErrors.length) return emptyResults(spreadErrors, diagnostics.list());

  // STEP 3 — pair enumeration. The OUTER loop is the later date, so the emission
  // order is (0,1),(0,2),(1,2),(0,3)… and the ordinals index the UNFILTERED
  // array, keeping the X-labels stable when a middle anchor is disabled.
  const xDates = isoEvent.x_dates;
  const yStructs = [];
  for (let i = 1; i < xDates.length; i++) {
    for (let k = 0; k < i; k++) {
      if (xDates[k].enabled !== true || xDates[i].enabled !== true) continue;
      const X1 = toInstant(xDates[k], isoEvent);
      const X2 = toInstant(xDates[i], isoEvent);
      yStructs.push({
        y_ordinal: yStructs.length,
        rotation_count_y: span(X1, X2, isoEvent),
        x_1_ordinal: k,
        x_2_ordinal: i,
        x_1_instant: X1,
        x_2_instant: X2,
        operation_results: [],
      });
    }
  }

  // STEP 4/5 — project, then bucket every result landing on the same window start.
  const zStructs = new Map();
  const dayStart = scope === EVENT_SCOPE.DAYS ? Number(isoEvent.day_scope_start_time_in_millis) || 0 : 0;

  for (const ys of yStructs) {
    const Yc = Math.min(ys.rotation_count_y, MAXIMUM_ROTATION_COUNT_Y);
    if (Yc !== ys.rotation_count_y) {
      diagnostics.record('CLAMPED_Y', `Y clamped to ${MAXIMUM_ROTATION_COUNT_Y}`, { y_ordinal: ys.y_ordinal });
    }

    for (const op of effectiveOperations) {
      if (op.enabled !== true || !op.ok) continue;

      let raw;
      try {
        raw = op.fn(Yc);
      } catch (e) {
        diagnostics.record('OPERATION_INVALID', e.message, { operation_ordinal: op.ordinal });
        continue;
      }

      // The original let a non-finite offset through and produced an Invalid
      // Date that silently vanished later. Counted here instead.
      if (!Number.isFinite(raw)) {
        diagnostics.record('NON_FINITE_Z', `${op.equation} produced a non-finite offset`, {
          operation_ordinal: op.ordinal,
        });
        continue;
      }

      if (raw > MAXIMUM_ROTATION_COUNT_Z) {
        diagnostics.record('CLAMPED_Z', `offset clamped to ${MAXIMUM_ROTATION_COUNT_Z}`, {
          operation_ordinal: op.ordinal,
        });
        raw = MAXIMUM_ROTATION_COUNT_Z;
      }

      // Milliseconds from the RAW offset, before any rounding for display.
      const offsetInMillis = raw * MILLIS_PER_DAY;
      const zValue = round2(raw);
      const rotationCountZ = round1(zValue);

      const isX1 = op.anchor === 'X1';
      let baseInstant = isX1 ? ys.x_1_instant : ys.x_2_instant;
      const otherInstant = isX1 ? ys.x_2_instant : ys.x_1_instant;
      if (dayStart > 0) baseInstant += dayStart;

      const zRaw = baseInstant + offsetInMillis;
      const { zStart, zEnd } = normaliseWindow(zRaw, isoEvent);
      if (!Number.isFinite(zStart)) {
        diagnostics.record('OUT_OF_CALENDAR_RANGE', `${op.equation} projected outside the calendar`, {
          operation_ordinal: op.ordinal,
        });
        continue;
      }

      const result = {
        operation_ordinal: op.ordinal,
        operation: { equation: op.equation, weight: op.weight, enabled: op.enabled },
        anchor: op.anchor,
        rotation_count_y: Yc,
        z_value: zValue,
        rotation_count_z: rotationCountZ,
        z_instant_raw: zRaw,
        z_start: zStart,
        z_end: zEnd,
        x_instant_base: baseInstant,
        x_instant_other: otherInstant,
        id: `${op.ordinal}|${ys.x_1_ordinal}|${ys.x_2_ordinal}|${zStart}`,
      };
      ys.operation_results.push(result);

      const key = String(zStart);
      let z = zStructs.get(key);
      if (!z) {
        // Display fields are frozen at the FIRST contributor, so a bucket reads
        // consistently no matter how many operations land in it afterwards.
        z = {
          key,
          zStart,
          zEnd,
          z_start: zStart,
          z_end: zEnd,
          z_instant_raw: zRaw,
          readable_start: hhmm ? fmtDateTime(zStart) : fmtDate(zStart),
          readable_end: hhmm ? fmtDateTime(zEnd) : fmtDate(zEnd),
          operation_match_structs: [],
          resonance_matches: [],
        };
        zStructs.set(key, z);
      }
      z.operation_match_structs.push({ y_struct: ys, operation_result: result });

      // The ophis reckoning has exactly one resonance provider, and it yields at
      // most one match per operation result.
      const match = getMsrfMatch(rotationCountZ);
      if (match) {
        z.resonance_matches.push({
          providerId: 'msrf',
          tier: match.tier,
          label: describeMatch(match),
          cssClass: match.cls,
          number: match.number,
          points: match.points,
          multiplier: match.multiplier,
          y_struct: ys,
          operation_result: result,
        });
      }
    }
  }

  // STEP 6 — score.
  const all = Array.from(zStructs.values());
  scoreAll(all, effectiveOperations, isoEvent.scoring_system ?? SCORING_SYSTEM.GTE_V8);

  // STEP 7 — filter.
  const xInstants = xDates.filter((x) => x.enabled === true).map((x) => toInstant(x, isoEvent));
  const tInstants = (isoEvent.t_dates ?? [])
    .filter((t) => t.enabled === true)
    .map((t) => toInstant(t, isoEvent));
  const { kept, hidden } = applyFilters(all, isoEvent, { now }, xInstants, tInstants);

  // STEP 8 — sort twice: DATE to stamp z_ordinal, then the user's choice.
  const sortType = normaliseSortType(isoEvent.z_date_sort_type);
  const processed = sortAndLabel(kept, sortType);
  const byDate = kept.slice().sort((a, b) => a.zStart - b.zStart);

  const errors = [];
  if (all.length && !kept.length) {
    errors.push({
      error_status: 'NO_RESULTS',
      error_message: 'No results. You probably have to loosen up a filter.',
    });
  }

  return {
    errors,
    y_structs: yStructs,
    z_structs: Object.fromEntries(zStructs),
    effective_operations: effectiveOperations,
    processed_z_dates: processed,
    processed_z_dates__sorted_by_date: byDate,
    diagnostics: diagnostics.list(),
    hidden,
    sort_type: sortType,
  };
}
