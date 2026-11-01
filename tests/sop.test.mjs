/**
 * Protocol Prime and the SOP (docs/reverse/23 §1, §3).
 *
 * Kept out of `npm test` for the same reason as the tags: the original never
 * ran any of this. What must hold is that it is advice — warnings and a reading
 * view — and that the objective default leaves every event, file and result
 * exactly as it was.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { runOphis } from '../src/core/ophis/run.js';
import {
  makeIsoEvent, makeXDate, addTodayAsXDate, isSubjective, PROJECTION_KIND, ISO_EVENT_KEYS,
  PP_FIELD, protocolPrimeIndex,
} from '../src/state/iso-event.js';
import { parseDocument, serialiseDocument, serialiseDocumentV12 } from '../src/io/oph.js';
import { utcMidnight } from '../src/core/ophis/calendar.js';
import { MILLIS_PER_DAY } from '../src/core/ophis/constants.js';
import {
  sopWarnings, groupIntoWindows, SOP_MIN_DAYS_BETWEEN, SOP_MAX_AGE_YEARS, WINDOW_DAYS,
} from '../src/core/ophis/sop.js';
import { DEFAULT_OPTIONS } from '../src/state/ophis-store.js';

const NOW = Date.UTC(2026, 9, 21, 15, 30);   // mid-afternoon: "today" is still the 21st
const ev = (dates, extra = {}) =>
  makeIsoEvent(0, { x_dates: dates.map(([y, m, d]) => makeXDate(y, m, d)), ...extra });
const ids = (w) => w.map((x) => x.id);

/* ------------------------------------------------------- Protocol Prime -- */

test('objective is the default, and is absent from the event and the file', () => {
  const e = ev([[2026, 1, 1], [2026, 3, 1]]);
  assert.equal(isSubjective(e), false);
  assert.ok(!ISO_EVENT_KEYS.includes('projection_kind'));
  const doc = { iso_events: [e] };
  assert.ok(!serialiseDocument(doc).includes('projection_kind'));
  assert.ok(!serialiseDocument(doc, { minify: true }).includes('projection_kind'));
});

test('subjective round-trips through .oph, full and minified', () => {
  const e = ev([[2026, 1, 1], [2026, 3, 1]], { projection_kind: PROJECTION_KIND.SUBJECTIVE });
  for (const minify of [false, true]) {
    const text = serialiseDocument({ iso_events: [e] }, { minify });
    const back = parseDocument(text).document.iso_events[0];
    assert.equal(back.projection_kind, PROJECTION_KIND.SUBJECTIVE);
  }
});

test('an unknown projection kind loads as objective, with a warning', () => {
  const { document, warnings } = parseDocument(JSON.stringify({
    iso_events: [{ x_dates: [], projection_kind: 'sideways' }],
  }));
  assert.equal(isSubjective(document.iso_events[0]), false);
  assert.ok(warnings.some((w) => /projection kind/.test(w)));
});

test('the v12 writer says it cannot carry the label', () => {
  const e = ev([[2026, 1, 1], [2026, 3, 1]], { projection_kind: PROJECTION_KIND.SUBJECTIVE });
  const { text, notes } = serialiseDocumentV12({ iso_events: [e] });
  assert.ok(!text.includes('projection_kind'));
  assert.ok(notes.some((n) => /Objective \/ Subjective/.test(n)));
});

test('subjective adds today as the last X-Date, using the ☉ Today path', () => {
  const e = ev([[2025, 6, 1], [2025, 9, 1], [2026, 2, 1]]);
  const { added, index } = addTodayAsXDate(e, NOW);
  assert.equal(added, true);
  assert.equal(index, 3, 'last');
  assert.deepEqual(
    [e.x_dates[3].y, e.x_dates[3].m, e.x_dates[3].d],
    [2026, 10, 21]
  );
  // A second press refuses the duplicate.
  assert.deepEqual(addTodayAsXDate(e, NOW), { added: false, index: 3, replaced: null });
  assert.equal(e.x_dates.length, 4);
});

test('today goes in date order, so an event with future anchors still casts', () => {
  const e = ev([[2026, 7, 4], [2027, 3, 9]]);
  const { index } = addTodayAsXDate(e, NOW);
  assert.equal(index, 1);
  assert.equal(runOphis(e, { now: NOW }).errors.filter((x) => typeof x === 'string').length, 0);
});

/* ------------------- Protocol Prime is only the day it is run (7 Aug 2025) -- */

const LATER = Date.UTC(2026, 9, 28, 9, 0);   // a week after NOW
const days = (e) => e.x_dates.map((x) => `${x.m}/${x.d}/${x.y}`);

test('the PP record is not a default key, so old files gain nothing', () => {
  assert.ok(!ISO_EVENT_KEYS.includes(PP_FIELD));
  assert.equal(makeIsoEvent(0)[PP_FIELD], undefined);
});

test('a re-run on a later day replaces the old PP date, never keeps both', () => {
  const e = ev([[2025, 6, 1], [2025, 9, 1], [2026, 2, 1]], { projection_kind: PROJECTION_KIND.SUBJECTIVE });
  addTodayAsXDate(e, NOW);
  assert.equal(e[PP_FIELD], '10/21/2026');
  assert.equal(protocolPrimeIndex(e), 3);

  const r = addTodayAsXDate(e, LATER);
  assert.deepEqual(r, { added: true, index: 3, replaced: '10/21/2026' });
  assert.deepEqual(days(e), ['6/1/2025', '9/1/2025', '2/1/2026', '10/28/2026']);
  assert.equal(e[PP_FIELD], '10/28/2026');
  assert.equal(protocolPrimeIndex(e), 3);
});

test('a same-day re-run changes nothing', () => {
  const e = ev([[2025, 6, 1], [2026, 2, 1]]);
  addTodayAsXDate(e, NOW);
  const before = JSON.stringify(e);
  assert.deepEqual(addTodayAsXDate(e, NOW + 3600e3), { added: false, index: 2, replaced: null });
  assert.equal(JSON.stringify(e), before);
});

test('a file with no record adds today and records it, guessing nothing', () => {
  // An older file: the last X-Date may well have been an earlier PP, but
  // nothing says so, so it stays.
  const e = ev([[2025, 6, 1], [2026, 2, 1], [2026, 10, 14]], { projection_kind: PROJECTION_KIND.SUBJECTIVE });
  const r = addTodayAsXDate(e, NOW);
  assert.deepEqual(r, { added: true, index: 3, replaced: null });
  assert.deepEqual(days(e), ['6/1/2025', '2/1/2026', '10/14/2026', '10/21/2026']);
  assert.equal(e[PP_FIELD], '10/21/2026');
});

test('a PP date the user has since edited is theirs, and is not removed', () => {
  const e = ev([[2025, 6, 1], [2026, 2, 1]]);
  const { index } = addTodayAsXDate(e, NOW);
  Object.assign(e.x_dates[index], { y: 2026, m: 10, d: 19 });   // the user retypes it
  assert.equal(protocolPrimeIndex(e), -1, 'no badge on an edited date');

  const r = addTodayAsXDate(e, LATER);
  assert.equal(r.replaced, null);
  assert.deepEqual(days(e), ['6/1/2025', '2/1/2026', '10/19/2026', '10/28/2026']);
  assert.equal(e[PP_FIELD], '10/28/2026');
});

test('a Current-date override set back never moves PP backwards', () => {
  const e = ev([[2025, 6, 1], [2026, 2, 1]]);
  addTodayAsXDate(e, LATER);
  const r = addTodayAsXDate(e, NOW);
  assert.equal(r.replaced, null);
  assert.equal(e[PP_FIELD], '10/28/2026');
});

test('the PP record round-trips for a subjective event, full and minified', () => {
  const e = ev([[2026, 1, 1], [2026, 3, 1]], { projection_kind: PROJECTION_KIND.SUBJECTIVE });
  addTodayAsXDate(e, NOW);
  for (const minify of [false, true]) {
    const back = parseDocument(serialiseDocument({ iso_events: [e] }, { minify })).document.iso_events[0];
    assert.equal(back[PP_FIELD], '10/21/2026');
    assert.equal(protocolPrimeIndex(back), 2);
  }
});

test('an objective event never writes the record, even after ☉ Today', () => {
  const e = ev([[2026, 1, 1], [2026, 3, 1]]);
  addTodayAsXDate(e, NOW);
  for (const minify of [false, true]) {
    assert.ok(!serialiseDocument({ iso_events: [e] }, { minify }).includes(PP_FIELD));
  }
});

test('files without the field still round-trip byte-identically', () => {
  const plain = ev([[2025, 6, 1], [2026, 2, 1]]);
  const subj = ev([[2025, 6, 1], [2026, 2, 1], [2026, 10, 21]], { projection_kind: PROJECTION_KIND.SUBJECTIVE });
  for (const doc of [{ iso_events: [plain] }, { iso_events: [subj] }, { iso_events: [plain, subj] }]) {
    for (const minify of [false, true]) {
      const text = serialiseDocument(doc, { minify });
      assert.ok(!text.includes(PP_FIELD));
      const again = serialiseDocument(parseDocument(text).document, { minify });
      assert.equal(again, text);
    }
  }
});

test('a malformed PP record is ignored with a warning', () => {
  const { document, warnings } = parseDocument(JSON.stringify({
    iso_events: [{ x_dates: [], projection_kind: 'subjective', [PP_FIELD]: 'yesterday' }],
  }));
  assert.equal(document.iso_events[0][PP_FIELD], undefined);
  assert.ok(warnings.some((w) => /Protocol Prime date/.test(w)));
});

test('the v12 writer leaves the PP record out, and says so', () => {
  const e = ev([[2026, 1, 1], [2026, 3, 1]], { projection_kind: PROJECTION_KIND.SUBJECTIVE });
  addTodayAsXDate(e, NOW);
  const { text, notes } = serialiseDocumentV12({ iso_events: [e] });
  assert.ok(!text.includes(PP_FIELD));
  assert.ok(notes.some((n) => /Protocol Prime/.test(n)));
});

test('the SOP warning names a stale PP date, and clears once it is replaced', () => {
  const e = ev([[2025, 6, 1], [2026, 2, 1]], { projection_kind: PROJECTION_KIND.SUBJECTIVE });
  addTodayAsXDate(e, NOW);
  const w = sopWarnings(e, LATER, { subjective: true });
  assert.deepEqual(ids(w), ['protocol-prime']);
  assert.match(w[0].text, /Protocol Prime date is still 10\/21\/2026/);
  assert.match(w[0].text, /replaces the old date with today/);
  addTodayAsXDate(e, LATER);
  assert.deepEqual(sopWarnings(e, LATER, { subjective: true }), []);
});

/* ------------------------------------------------------------- warnings -- */

test('X-Dates under 6 days apart warn; 6 days does not', () => {
  assert.equal(SOP_MIN_DAYS_BETWEEN, 6);
  const near = sopWarnings(ev([[2026, 1, 1], [2026, 1, 6]]), NOW);
  assert.deepEqual(ids(near), ['spacing']);
  assert.match(near[0].text, /X1 and X2 are 5 days apart/);
  assert.deepEqual(sopWarnings(ev([[2026, 1, 1], [2026, 1, 7]]), NOW), []);
});

test('the spacing check names the pair, wherever it is', () => {
  const w = sopWarnings(ev([[2025, 1, 1], [2025, 6, 1], [2025, 6, 2]]), NOW);
  assert.match(w.find((x) => x.id === 'spacing').text, /X2 and X3 are 1 day apart/);
});

test('an X-Date over 3 years old warns, and suggests 5+ dates and windows', () => {
  assert.equal(SOP_MAX_AGE_YEARS, 3);
  const w = sopWarnings(ev([[2020, 5, 1], [2026, 1, 1]]), NOW);
  assert.deepEqual(ids(w), ['age']);
  assert.match(w[0].text, /1 X-Date is more than 3 years old \(oldest: X1, 05\/01\/2020\)/);
  assert.match(w[0].text, /5 or more X-Dates \(this event has 2\)/);
  assert.match(w[0].text, /windows of about a week/);

  // With five dates it still warns, but no longer counts them as too few.
  const five = sopWarnings(ev([[2019, 1, 1], [2020, 1, 1], [2021, 1, 1], [2022, 1, 1], [2026, 1, 1]]), NOW);
  assert.doesNotMatch(five[0].text, /this event has/);
});

test('age is measured from the projection date, so the override moves it', () => {
  const e = ev([[2023, 1, 1], [2026, 1, 1]]);
  assert.deepEqual(ids(sopWarnings(e, NOW)), ['age']);
  assert.deepEqual(sopWarnings(e, Date.UTC(2025, 0, 1)), []);
});

test('disabled X-Dates are not warned about', () => {
  const e = ev([[2010, 1, 1], [2026, 1, 1], [2026, 1, 3]]);
  e.x_dates[0].enabled = false;
  e.x_dates[2].enabled = false;
  assert.deepEqual(sopWarnings(e, NOW), []);
});

test('subjective without today as the last X-Date warns', () => {
  const e = ev([[2026, 1, 1], [2026, 3, 1]]);
  const missing = sopWarnings(e, NOW, { subjective: true });
  assert.deepEqual(ids(missing), ['protocol-prime']);
  assert.match(missing[0].text, /is not an X-Date/);

  addTodayAsXDate(e, NOW);
  assert.deepEqual(sopWarnings(e, NOW, { subjective: true }), []);

  e.x_dates.push(makeXDate(2027, 1, 1));
  assert.match(sopWarnings(e, NOW, { subjective: true })[0].text, /not the last one/);
  assert.deepEqual(sopWarnings(e, NOW), [], 'objective never asks for today');
});

test('warnings never block a cast', () => {
  const e = ev([[2015, 1, 1], [2015, 1, 3]], { projection_kind: PROJECTION_KIND.SUBJECTIVE });
  assert.equal(sopWarnings(e, NOW, { subjective: true }).length, 3);
  const r = runOphis(e, { now: Date.UTC(2014, 0, 1) });
  assert.ok(r.processed_z_dates.length > 0);
});

/* -------------------------------------------------------------- windows -- */

const z = (y, m, d, score = 1, hits = 1, ord = 0) =>
  ({ zStart: utcMidnight(y, m, d), score, hit_count: hits, z_ordinal: ord });

test('Z-Dates within 7 days share a window; the 7th day after opens a new one', () => {
  assert.equal(WINDOW_DAYS, 7);
  const w = groupIntoWindows([
    z(2026, 1, 10, 1.5, 2), z(2026, 1, 1, 1, 1), z(2026, 1, 7, 3, 4), z(2026, 1, 8, 0.5, 1),
  ]);
  assert.equal(w.length, 2);
  assert.deepEqual(w[0].members.map((m) => m.zStart), [1, 7].map((d) => utcMidnight(2026, 1, d)));
  assert.equal(w[0].hits, 5);
  assert.equal(w[0].best, 3);
  assert.equal(w[1].start, utcMidnight(2026, 1, 8));
  assert.equal(w[1].end, utcMidnight(2026, 1, 10));
  for (const x of w) assert.ok(x.end - x.start < WINDOW_DAYS * MILLIS_PER_DAY);
});

test('windows re-score nothing and lose no Z-Date', () => {
  const e = ev([[2026, 7, 4], [2026, 8, 20], [2027, 3, 9], [2027, 3, 16], [2027, 7, 17]]);
  const r = runOphis(e, { now: Date.UTC(2020, 0, 1) });
  const before = JSON.stringify(r.processed_z_dates.map((x) => [x.key, x.score, x.hit_count]));
  const w = groupIntoWindows(r.processed_z_dates);
  assert.equal(w.reduce((n, x) => n + x.members.length, 0), r.processed_z_dates.length);
  assert.equal(JSON.stringify(r.processed_z_dates.map((x) => [x.key, x.score, x.hit_count])), before);
});

test('the Days table is the default view', () => {
  assert.equal(DEFAULT_OPTIONS.results_view, 'days');
});
