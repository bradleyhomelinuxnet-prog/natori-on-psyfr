/**
 * The v12-format copies of the examples (`examples/v12/*_v12.oph`).
 *
 * Not in the parity count -- the original never had these files -- but they
 * are what a reader opens in the original Ophis v12 desktop app, so they must
 * stay current with `examples/*.oph` and must be in the exact shape v12 wrote.
 * Regenerate with `npm run examples:v12`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { buildV12Examples, V12_DIR, EXAMPLES_DIR } from '../tools/examples-v12.mjs';
import { parseDocument } from '../src/io/oph.js';

/**
 * Key order of one v12 Iso-Event, copied from `v12Event` in src/io/oph.js
 * (itself v12's `createNewIsoEvent` order: the literal fields, then
 * `ALL_SERIALIZED_FIELDS` -- FILTER_DEFAULTS order -- then V12_CHART_ORDER,
 * the chart bounds, the sort type and the day start).
 */
const V12_EVENT_KEYS = [
  'name', 'notes', 'x_dates', 't_dates', 'lat', 'long', 'location_enabled',
  'scope', 'type', 'operations', 'scoring_system',
  'iso_event_filter_before_last_x_date',
  'iso_event_filter_on_last_x_date',
  'iso_event_filter_before_current_date',
  'iso_event_filter_on_current_date',
  'iso_event_filter_beyond_max_days',
  'iso_event_filter_beyond_max_days_value',
  'iso_event_filter_min_hit_count',
  'iso_event_filter_min_hit_count_value',
  'iso_event_filter_min_score',
  'iso_event_filter_min_score_value',
  'iso_event_filter_msrf_match',
  'chart_option__show_chart', 'chart_option__show_dates',
  'chart_option__show_new_moons', 'chart_option__show_first_quarter_moons',
  'chart_option__show_full_moons', 'chart_option__show_third_quarter_moons',
  'chart_option__show_waxing_crescent_moons', 'chart_option__show_waning_crescent_moons',
  'chart_option__show_waxing_gibbous_moons', 'chart_option__show_waning_gibbous_moons',
  'chart_option__full_solar_eclipses', 'chart_option__partial_solar_eclipses',
  'chart_option__full_lunar_eclipses', 'chart_option__partial_lunar_eclipses',
  'chart_x_min', 'chart_x_max', 'chart_y_min', 'chart_y_max',
  'z_date_sort_type', 'day_scope_start_time_in_millis',
];
const V12_DATE_KEYS = ['date', 'time', 'enabled'];
const V12_OPERATION_KEYS = ['equation', 'weight', 'enabled'];

const built = buildV12Examples();

test('there is one v12 copy per example, and no strays', () => {
  const sources = readdirSync(EXAMPLES_DIR).filter((n) => n.endsWith('.oph')).sort();
  assert.ok(sources.length >= 5, 'expected the five shipped examples');
  assert.deepEqual(built.map((b) => b.source), sources);
  const onDisk = readdirSync(V12_DIR).filter((n) => n.endsWith('.oph')).sort();
  assert.deepEqual(onDisk, built.map((b) => b.file).sort(),
    'examples/v12/ does not match examples/; run npm run examples:v12');
});

for (const { source, file, text } of built) {
  test(`examples/v12/${file} is current with examples/${source}`, () => {
    const committed = readFileSync(join(V12_DIR, file), 'utf8');
    assert.equal(committed, text, `examples/v12/${file} is stale; run npm run examples:v12`);
  });

  test(`examples/v12/${file} is in v12's on-disk shape`, () => {
    const doc = JSON.parse(readFileSync(join(V12_DIR, file), 'utf8'));
    assert.deepEqual(Object.keys(doc), ['app_version', 'iso_events'], 'v12 writes no schema field');
    assert.equal(doc.app_version, '12');
    assert.ok(Array.isArray(doc.iso_events) && doc.iso_events.length > 0);

    const original = parseDocument(readFileSync(join(EXAMPLES_DIR, source), 'utf8')).document;
    assert.equal(doc.iso_events.length, original.iso_events.length);

    doc.iso_events.forEach((ev, i) => {
      const where = `${file} event ${i + 1}`;
      assert.deepEqual(Object.keys(ev), V12_EVENT_KEYS, `${where}: key set or order differs from v12`);

      const src = original.iso_events[i];
      for (const [list, srcList] of [[ev.x_dates, src.x_dates], [ev.t_dates, src.t_dates]]) {
        assert.equal(list.length, srcList.length, `${where}: a date went missing`);
        list.forEach((x, j) => {
          assert.deepEqual(Object.keys(x), V12_DATE_KEYS, `${where}: a date is not {date, time, enabled}`);
          assert.match(x.date, /^\d{2}\/\d{2}\/\d{4}$/, `${where}: ${x.date} is not MM/DD/YYYY`);
          assert.match(x.time, /^\d{2}:\d{2}$/);
          assert.equal(typeof x.enabled, 'boolean');
          const s = srcList[j];
          const [m, d, y] = x.date.split('/').map(Number);
          assert.deepEqual([y, m, d], [s.y, s.m, s.d], `${where}: ${x.date} is not the source date`);
        });
      }
      assert.ok(ev.x_dates.length > 0, `${where}: no X-Dates`);
      ev.operations.forEach((o) => assert.deepEqual(Object.keys(o), V12_OPERATION_KEYS));
    });
  });
}
