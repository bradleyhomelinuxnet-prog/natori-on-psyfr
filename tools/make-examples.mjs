#!/usr/bin/env node
/**
 * Write the pre-worked `.oph` documents in `examples/` that docs/MANUAL.md
 * walks through. Run with `npm run examples`; `tests/ophis.test.mjs` re-reads
 * every file through the importer and pins what it casts, so an example can
 * never quietly disagree with the manual that quotes it.
 *
 * The Current date is not part of a `.oph` -- it is whatever "today" is when
 * the file is opened. Every example therefore ships with F3 ("hide before the
 * current date") switched OFF, which is the one filter that reads the clock.
 * With it off, a file casts the same rows on any day it is opened.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeIsoEvent, makeXDate } from '../src/state/iso-event.js';
import { serialiseDocument } from '../src/io/oph.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'examples');

const CLOCK_FREE = { iso_event_filter_before_current_date: false };

/** One Iso-Event per example; `notes` is what the reader sees under Settings → S1. */
export const EXAMPLES = [
  {
    file: '01-worked-example.oph',
    name: 'Worked example',
    dates: [[2026, 7, 4], [2026, 8, 20], [2027, 3, 9], [2027, 3, 16], [2027, 7, 17]],
    notes:
      'The five dates the app seeds on first run, and the run MANUAL §5 and §6 dissect. ' +
      'Expect 114 Z-Dates, 39 hidden. Sort by SCORE: the top row is 09/29/2027 at 3.',
  },
  {
    file: '02-job-changes.oph',
    name: 'Started a new job',
    dates: [[2016, 3, 14], [2019, 9, 6], [2022, 1, 11]],
    notes:
      'Three real-shaped job changes -- MANUAL §8, "When nothing lights up". ' +
      'Expect 23 Z-Dates, 24 hidden, a top score of 2 (05/18/2024) and no MSRF chip anywhere. ' +
      'That is the honest, normal outcome.',
  },
  {
    file: '03-job-changes-protocol-prime.oph',
    name: 'Started a new job + Protocol Prime',
    dates: [[2016, 3, 14], [2019, 9, 6], [2022, 1, 11], [2026, 9, 2]],
    notes:
      'The same three jobs with the day of asking (09/02/2026) added as a fourth control -- MANUAL §7. ' +
      'Expect 6 pairs, 25 Z-Dates, 70 hidden. A longer list; still no MSRF chip.',
  },
  {
    file: '04-even-spacing-19-138.oph',
    name: 'Evenly spaced: 138 days from the 19th',
    dates: [[2019, 1, 19], [2019, 6, 6], [2019, 10, 22]],
    notes:
      'Three dates exactly 138 days apart, starting 01/19/2019 -- MANUAL §8, "Why evenly spaced input lights up". ' +
      'The gaps are 138 and 276 = 2 x 138, so "half the long gap" IS the short gap and the formulas agree by construction. ' +
      'Expect a top score of 4.5 on 06/01/2020 with green chips. The agreement was put in, not found.',
  },
];

function eventFor(ex, index) {
  return makeIsoEvent(index, {
    name: ex.name,
    notes: ex.notes,
    x_dates: ex.dates.map(([y, m, d]) => makeXDate(y, m, d)),
    ...CLOCK_FREE,
  });
}

/** Every example as one document, E1..E4, for switching between them in-app. */
export const ALL_IN_ONE = 'manual-examples.oph';

export function buildExamples() {
  const files = EXAMPLES.map((ex) => [ex.file, serialiseDocument({ iso_events: [eventFor(ex, 0)] })]);
  files.push([ALL_IN_ONE, serialiseDocument({ iso_events: EXAMPLES.map(eventFor) })]);
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(OUT, { recursive: true });
  for (const [name, text] of buildExamples()) {
    writeFileSync(join(OUT, name), text + '\n');
    console.log(`  examples/${name}`);
  }
}
