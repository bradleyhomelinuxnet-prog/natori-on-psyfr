/**
 * The plain-English reading of a run, for the Start here page.
 *
 * Nothing here computes a date or a score. It builds an ordinary IsoEvent, hands
 * it to runOphis like the working surface does, and then only READS the result:
 * picks the rows worth showing, ranks each against the rest of its own run
 * (docs/MANUAL.md §6), and says why it scored in words a newcomer can follow.
 * The coaching is MANUAL.md §2 and §8 and the SOP warnings, rephrased.
 *
 * Two kinds of context ride along, and neither moves a score: where the day
 * sits in the long cycles (the Natorion / Cyphr side), and which Chronotecture
 * plates name its year or its resonance numbers.
 *
 * Pure: no DOM, no clock. `now` is always passed in, so it runs under node.
 */

import { runOphis } from '../core/ophis/run.js';
import { MILLIS_PER_DAY } from '../core/ophis/constants.js';
import { lunarPhase, phaseGapDays, toJD, LUNAR_MATCH_DAYS, ECLIPSE_MATCH_DAYS } from '../core/ophis/moon.js';
import { SOP_MIN_DAYS_BETWEEN, SOP_MAX_AGE_YEARS, SOP_MIN_X_DATES_WHEN_OLD } from '../core/ophis/sop.js';
import { eclipseNear, ECL_TYPE_NAME } from '../core/eclipses.js';
import { phoenixInfo, isMetonic, am } from '../core/cycles.js';
import { jdn, isPalindrome } from '../core/jdn.js';
import { makeIsoEvent, makeXDate, PROJECTION_KIND } from '../state/iso-event.js';
import { PLATES, PHOENIX_PLATES, plateUrl } from '../data/chronotecture.js';
import { newDocumentOperations } from '../data/packs-ophis.js';

const YEAR_MS = 365.25 * MILLIS_PER_DAY;

/** Thresholds from MANUAL.md §6: 1.0 and below is background, 1.5 a second look, above 2 rare. */
export const STRENGTH = { BACKGROUND: 1, WORTH_A_LOOK: 1.5, RARE: 2 };

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
export const ordinal = (i) => ORDINAL[i] ?? `${i + 1}th`;

const dayOf = ({ y, m, d }) => Date.UTC(y, m - 1, d);

export function todayUTC(now) {
  const t = new Date(now);
  return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

/** `[{y,m,d}]` sorted oldest first, duplicates dropped. */
export function tidyDates(dates) {
  const seen = new Set();
  return dates
    .filter((x) => x && Number.isFinite(dayOf(x)))
    .sort((a, b) => dayOf(a) - dayOf(b))
    .filter((x) => {
      const k = dayOf(x);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

/**
 * The event the page casts: the user's dates, plus today when they asked for it.
 * "Count today" is Protocol Prime — a subjective projection ending on the day it
 * is run (docs/reverse/23 §1).
 */
export function buildEvent({ name = '', dates = [], includeToday = false, now }) {
  const list = tidyDates(dates);
  const today = todayUTC(now);
  if (includeToday && !list.some((x) => dayOf(x) === today)) {
    const t = new Date(today);
    list.push({ y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() });
  }
  const overrides = {
    name: name.trim() || 'My pattern',
    x_dates: tidyDates(list).map(({ y, m, d }) => makeXDate(y, m, d)),
    // The same 36-row table a new document gets in the full app, so the handoff
    // opens there with the numbers this page showed.
    operations: newDocumentOperations(),
  };
  if (includeToday) overrides.projection_kind = PROJECTION_KIND.SUBJECTIVE;
  return makeIsoEvent(0, overrides);
}

/**
 * Coaching for the dates as typed.
 *
 * `stop` blocks the button, `warn` is worth reading, `tip` is encouragement.
 * Nothing here is stricter than the engine except future dates, which the
 * engine would cast happily but which cannot be things that already happened.
 */
export function coach(dates, now, { includeToday = false } = {}) {
  const notes = [];
  const today = todayUTC(now);
  const raw = dates.filter(Boolean);
  const list = tidyDates(raw);

  if (raw.length !== list.length) {
    notes.push({ level: 'stop', text: 'The same date is in there twice. Each date should be a different time it happened.' });
  }
  if (list.some((x) => dayOf(x) > today)) {
    notes.push({ level: 'stop', text: 'One of the dates is in the future. Only use times it has already happened.' });
  }

  const count = list.length + (includeToday && !list.some((x) => dayOf(x) === today) ? 1 : 0);
  if (count < 2) {
    notes.push({
      level: 'stop',
      text: list.length === 0 ? 'Add at least 2 dates to begin.' : 'Add at least one more date. It takes two to measure a gap.',
    });
  } else if (count === 2) {
    notes.push({ level: 'tip', text: '2 dates works. A 3rd gives three gaps instead of one, so three times as much to go on.' });
  } else {
    notes.push({ level: 'tip', text: `${count} dates gives ${(count * (count - 1)) / 2} gaps to work with. Good.` });
  }

  for (let n = 1; n < list.length; n++) {
    const gap = Math.round((dayOf(list[n]) - dayOf(list[n - 1])) / MILLIS_PER_DAY);
    if (gap > 0 && gap < SOP_MIN_DAYS_BETWEEN) {
      notes.push({
        level: 'warn',
        text: `Two of your dates are only ${gap} day${gap === 1 ? '' : 's'} apart. Under ${SOP_MIN_DAYS_BETWEEN} days, the results pile up close together and say little.`,
      });
      break;
    }
  }

  const old = list.filter((x) => today - dayOf(x) > SOP_MAX_AGE_YEARS * YEAR_MS);
  if (old.length && count < SOP_MIN_X_DATES_WHEN_OLD) {
    notes.push({
      level: 'warn',
      text: `Some dates are more than ${SOP_MAX_AGE_YEARS} years old. That works best with ${SOP_MIN_X_DATES_WHEN_OLD} or more dates, and the results are better read as "that week" than "that day".`,
    });
  }

  if (list.length >= 3) {
    const gaps = [];
    for (let n = 1; n < list.length; n++) gaps.push((dayOf(list[n]) - dayOf(list[n - 1])) / MILLIS_PER_DAY);
    if (Math.max(...gaps) - Math.min(...gaps) <= 1) {
      notes.push({
        level: 'warn',
        text: 'These dates are evenly spaced. Evenly spaced dates always line up, so the results will look stronger than they are.',
      });
    }
  }

  return { ok: !notes.some((n) => n.level === 'stop'), notes };
}

/* ------------------------------------------------------------- the context -- */

function moonNote(ms) {
  const f = lunarPhase(ms);
  if (phaseGapDays(f, 0.5) <= LUNAR_MATCH_DAYS) return 'Falls on a full moon.';
  if (phaseGapDays(f, 0) <= LUNAR_MATCH_DAYS) return 'Falls on a new moon.';
  return null;
}

function eclipseNote(ms) {
  const near = eclipseNear(toJD(ms + MILLIS_PER_DAY / 2), ECLIPSE_MATCH_DAYS);
  const kind = (letter) => (ECL_TYPE_NAME[letter] ? `${ECL_TYPE_NAME[letter]} ` : '');
  if (near.solar) return `Within a day of a ${kind(near.solar)}solar eclipse.`;
  if (near.lunar) return `Within a day of a ${kind(near.lunar)}lunar eclipse.`;
  return null;
}

/** Where the day sits in the long cycles. Context, not score. */
function cycleNotes(ms, firstYear) {
  const t = new Date(ms);
  const y = t.getUTCFullYear();
  const out = [];
  const ph = phoenixInfo(y);
  out.push(ph.node ? 'A Phoenix-cycle node year: the 138-year cycle turns over.' : `Year ${ph.into} of the 138-year Phoenix cycle.`);
  if (y !== firstYear && isMetonic(y, firstYear)) {
    out.push(`A whole number of 19-year Metonic cycles after your first date (${firstYear}).`);
  }
  const J = jdn(y, t.getUTCMonth() + 1, t.getUTCDate());
  if (isPalindrome(J)) out.push(`Its Julian day number, ${J}, reads the same backwards.`);
  return out;
}

const PLATE_WORDS = PLATES.map((p) => ({ ...p, words: new Set(p.keywords.join(' ').toLowerCase().split(/[\s,]+/)) }));

/**
 * Chronotecture plates that name this year (AD or Annus Mundi) or one of its
 * resonance numbers. Numbers under 100 are left out: "52" and "24" turn up on
 * so many plates that a match would mean nothing.
 */
export function platesFor(ms, resonanceNumbers = [], { limit = 2 } = {}) {
  const y = new Date(ms).getUTCFullYear();
  const wanted = [
    { word: String(y), why: `the year ${y}` },
    { word: String(am(y)), why: `${am(y)} AM, the same year counted from Creation` },
    ...resonanceNumbers.filter((n) => n >= 100).map((n) => ({ word: String(n), why: `the number ${n}` })),
  ];
  return PLATE_WORDS
    .map((p) => ({ plate: p.plate, label: p.label, url: plateUrl(p.plate), why: wanted.filter((w) => p.words.has(w.word)).map((w) => w.why) }))
    .filter((p) => p.why.length)
    .sort((a, b) => b.why.length - a.why.length || a.plate - b.plate)
    .slice(0, limit);
}

export const phoenixPlates = () =>
  PHOENIX_PLATES.map((n) => ({ plate: n, label: PLATES.find((p) => p.plate === n)?.label ?? `Plate ${n}`, url: plateUrl(n) }));

/* ----------------------------------------------------------------- reading -- */

const CONSTANT_WORDS = {
  OPH_PHI: 'the golden ratio (1.618)',
  OPH_PI: 'π (3.14)',
  OPH_CRV: 'the curve number (5.08)',
  OPH_HEP: 'the seven-cycle number (7.01)',
  // The Extras write their constants as literals.
  '2.718': 'e (2.718)',
  '1.38': 'the Phoenix number (1.38, from 138)',
  '5.52': '5.52 (138 × 4 ÷ 100)',
  '2.178': 'the vortex number (2.178)',
  '0.360': '0.36 (360 ÷ 1000)',
};

const GAP_WORDS = {
  'oph_flip(oph_round(Y))': 'the gap with its digits reversed',
  'oph_round(Y)': 'the gap',
  '(Y/2.0)': 'half the gap',
  Y: 'the gap',
};

/**
 * An equation in words — "half the gap × π (3.14)" — or null when it is not
 * one of the shapes the shipped table uses. A user-edited equation stays null
 * and the page shows it as written.
 */
export function describeEquation(equation) {
  const body = String(equation).replace(/^X[12]\+/, '');
  const m = /^(\(Y\/2\.0\)|oph_flip\(oph_round\(Y\)\)|oph_round\(Y\)|Y)(?:([x/])(OPH_[A-Z]+|\d+\.\d+))?$/.exec(body);
  if (!m) return null;
  const gap = GAP_WORDS[m[1]];
  if (!m[2]) return gap;
  const constant = CONSTANT_WORDS[m[3]];
  return constant ? `${gap} ${m[2] === 'x' ? '×' : '÷'} ${constant}` : null;
}

/** One entry per formula that landed on this day, ready to be put in words. */
function workings(row, ev) {
  return row.operation_match_structs.map(({ y_struct: ys, operation_result: r }) => {
    const from = r.anchor === 'X1' ? ys.x_1_ordinal : ys.x_2_ordinal;
    return {
      pair: [ys.x_1_ordinal, ys.x_2_ordinal],
      gap: ys.rotation_count_y,
      from,
      after: Math.round((r.z_start - dayOf(ev.x_dates[from])) / MILLIS_PER_DAY),
      equation: r.operation.equation,
      words: describeEquation(r.operation.equation),
      strong: r.operation.weight >= 1,
    };
  });
}

function strengthOf(score) {
  if (score > STRENGTH.RARE) return { key: 'rare', label: 'Rare' };
  if (score >= STRENGTH.WORTH_A_LOOK) return { key: 'look', label: 'Worth a look' };
  return { key: 'faint', label: 'Faint' };
}

const listing = (words) => words.join(', ').replace(/, ([^,]*)$/, ' and $1');

/**
 * Cast the event and read it.
 *
 * Only dates after today are candidates — "dates worth watching" means ahead of
 * you — and only rows that survived the default filters. Ranking is score, then
 * hits, then soonest; the percentile is against the other future rows in this
 * same run, which is the only comparison MANUAL.md §6 says means anything.
 */
export function readRun(ev, now, { top = 5 } = {}) {
  const results = runOphis(ev, { now });
  if (results.errors.length) return { errors: results.errors, picks: [], total: 0, results };

  const today = todayUTC(now);
  const future = results.processed_z_dates.filter((z) => z.zStart > today);
  const ranked = [...future].sort((a, b) => b.score - a.score || b.hit_count - a.hit_count || a.zStart - b.zStart);
  const firstYear = ev.x_dates.length ? ev.x_dates[0].y : new Date(now).getUTCFullYear();

  const picks = ranked.slice(0, top).map((z) => {
    const below = future.filter((o) => o.score < z.score).length;
    const beats = future.length > 1 ? Math.round((below / (future.length - 1)) * 100) : 0;
    const steps = workings(z, ev);
    const reasons = [];
    reasons.push(steps.length === 1 ? 'One formula from your dates lands here.' : `${steps.length} different formulas from your dates land on this same day.`);
    const pastUsed = [...new Set(steps.flatMap((s) => s.pair))].sort((a, b) => a - b);
    if (pastUsed.length > 1) reasons.push(`Built from your ${listing(pastUsed.map(ordinal))} dates.`);
    const nums = [...new Set(z.resonance_matches.map((m) => m.number))];
    if (nums.length) {
      reasons.push(`Its distance in days matches ${nums.length === 1 ? 'a number' : `${nums.length} numbers`} on the resonance list (${nums.join(', ')}).`);
    }
    for (const note of [moonNote(z.zStart), eclipseNote(z.zStart)]) if (note) reasons.push(note);
    return {
      key: z.key,
      at: z.zStart,
      score: z.score,
      hits: z.hit_count,
      beats,
      strength: strengthOf(z.score),
      reasons,
      cycles: cycleNotes(z.zStart, firstYear),
      plates: platesFor(z.zStart, nums),
      workings: steps,
    };
  });

  const best = ranked[0]?.score ?? 0;
  let verdict;
  if (!ranked.length) verdict = { key: 'none', text: 'Nothing lands ahead of today with these dates.' };
  else if (best <= STRENGTH.BACKGROUND)
    verdict = { key: 'faint', text: 'Nothing stands out. Every date here is one formula on its own, which is the background level. That is a real answer, not a failure.' };
  else if (best < STRENGTH.WORTH_A_LOOK)
    verdict = { key: 'faint', text: 'A few faint overlaps, nothing strong. Treat these as places to keep half an eye on.' };
  else verdict = { key: 'some', text: 'Some dates stand out from the rest of your results. These are where the most agreement piles up.' };

  return { errors: [], picks, total: future.length, verdict, results };
}
