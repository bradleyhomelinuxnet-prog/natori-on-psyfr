/**
 * The results table — six columns, fixed order.
 *
 * Three behaviours worth knowing before reading the code:
 *
 *   - The Z-label is CHRONOLOGICAL and is assigned before the display sort, so
 *     sorting by Score yields Z3, Z1, Z9… That looks wrong and is not: the label
 *     identifies the date, the row position reflects the sort, and the chart
 *     uses the same labels so the two can be read together.
 *   - Detail lives in tooltips on the pills, not in expanding rows. A row that
 *     grows on click reflows the table under the pointer; a tooltip does not.
 *   - When inputs change the rows are NOT re-rendered. The container dims and
 *     the badge reads Stale, so nothing on screen is ever half-updated.
 */

import { el, replace } from '../dom.js';
import { state, currentEvent, touch } from '../../state/ophis-store.js';
import { SORT_TYPE } from '../../core/ophis/constants.js';
import { round2, intToDecimalString } from '../../core/ophis/numeric.js';
import { fmtDate, fmtDateTime } from '../../core/ophis/calendar.js';
import { EVENT_SCOPE } from '../../core/ophis/constants.js';
import { operationClass } from '../../core/ophis/scoring.js';
import { tooltip, goto } from './shell.js';

/** The table renders at most this many rows; the counter says so when it bites. */
const MAX_ROWS = 500;

/** Hit-count glyphs. The shape carries the count without relying on colour. */
const GLYPH = { 2: '♊', 3: '▲', 4: '◆' };
const glyphFor = (n) => (n >= 5 ? '●' : GLYPH[n] ?? '');

const COLUMNS = [
  { key: null, label: '', sort: null, hide: null },
  { key: 'date', label: 'Z-Dates', sort: SORT_TYPE.DATE, hide: 'hide_date_col',
    tip: 'Click to sort by Z-Date, soonest to furthest. Z-Dates are future dates on which the event may reoccur.' },
  { key: 'hits', label: 'Hits', sort: SORT_TYPE.HIT_COUNT, hide: 'hide_hits_col',
    tip: 'Click to sort by number of Hits, highest to lowest, determined by adding number of Operations plus number of MSRF matches.' },
  { key: 'score', label: 'Score', sort: SORT_TYPE.SCORE, hide: 'hide_score_col',
    tip: 'Click to sort by Score, highest to lowest. See the About page for more on this calculation.' },
  { key: 'msrf', label: 'MSRF', sort: SORT_TYPE.MSRF, hide: 'hide_msrf_col',
    tip: 'Click to sort by MSRF importance. Note that under the v8 scoring system the strongest match is excluded from the subscore, so this orders by the raw magnitude of the matched numbers. Hover a pill for detail.' },
  { key: 'ops', label: 'Operations', sort: SORT_TYPE.OPERATIONS, hide: 'hide_operations_col',
    tip: 'Click to sort by number of Operations, highest to lowest.' },
];

/** Substitute the actual Y into an equation, for the tooltip's second row. */
function substituted(equation, Y) {
  // Only a standalone Y is the variable; OPH_PHI and friends must not be touched.
  return equation.replace(/(^|[^A-Za-z0-9_])Y(?![A-Za-z0-9_])/g, (m, pre) => `${pre}${Y}`);
}

function operationPill(match, z) {
  const r = match.operation_result;
  const ys = match.y_struct;
  const ev = currentEvent();
  const op = ev.operations[r.operation_ordinal];
  const cls = operationClass(op).toLowerCase();

  const pill = el('span', { class: `pill ${cls}`, tabindex: '0' }, [
    `O${r.operation_ordinal + 1}`,
    el('sub', { text: `(X${ys.x_1_ordinal + 1}→X${ys.x_2_ordinal + 1})` }),
  ]);

  tooltip(pill, () => [
    ['Equation', r.operation.equation],
    ['Substituted', substituted(r.operation.equation, intToDecimalString(r.rotation_count_y))],
    ['Type', operationClass(op)],
    ['Weight', String(op?.weight ?? r.operation.weight)],
    ['Anchor', `${r.anchor} — ${fmtDate(r.x_instant_base)}`],
    ['Y', intToDecimalString(r.rotation_count_y)],
    ['Z-Value', String(r.z_value)],
    ['Rotations to Z', intToDecimalString(r.rotation_count_z)],
    ['Contributes', `${match.points ?? op?.weight ?? 0} to the base score of ${round2(z.base_score_pre_multiply)}`],
  ]);

  return pill;
}

function msrfPill(match, z) {
  const cls = match.tier.toLowerCase();
  const pill = el('span', { class: `pill ${cls}`, tabindex: '0', text: String(match.number) });

  // Exactly one match on a row carries the multiplier; the rest contribute points.
  const carriesMultiplier =
    match.multiplier === z.score_multiplier &&
    z.resonance_matches.find((m) => m.multiplier === z.score_multiplier) === match;

  tooltip(pill, () => [
    ['Match', match.label],
    ['Tier', match.tier[0] + match.tier.slice(1).toLowerCase()],
    [
      'Effect',
      carriesMultiplier
        ? `Multiplies the base score of ${round2(z.base_score_pre_multiply)} by ${z.score_multiplier}`
        : `Contributes ${match.points} to the base score of ${round2(z.base_score_pre_multiply)}`,
    ],
  ]);

  return pill;
}

function headerCell(col, sortType) {
  if (!col.sort) return el('th', { scope: 'col', 'aria-label': 'Row label' });

  const active = sortType === col.sort;
  const th = el('th', { scope: 'col' }, [
    el('button', {
      type: 'button',
      title: col.tip,
      onclick: () => {
        currentEvent().z_date_sort_type = col.sort;
        touch({ recalc: true });
      },
    }, [
      col.key === 'date' ? `${col.label} (${state.results?.processed_z_dates.length ?? 0})` : col.label,
      el('span.arrow', { text: col.sort === SORT_TYPE.DATE ? '↑' : '↓' }),
    ]),
  ]);
  if (active) th.setAttribute('aria-sort', col.sort === SORT_TYPE.DATE ? 'ascending' : 'descending');
  return th;
}

function emptyPanel() {
  return el('div.empty', {}, [
    el('div.mark', { text: '◇' }),
    el('h3', { text: 'No results' }),
    el('p', { text: 'No results. You probably have to loosen up a filter.' }),
    el('button.btn', {
      type: 'button',
      text: 'Loosen filters',
      onclick: () => {
        const ev = currentEvent();
        ev.iso_event_filter_min_score = false;
        ev.iso_event_filter_min_hit_count = false;
        ev.iso_event_filter_msrf_match = false;
        ev.iso_event_filter_beyond_max_days = false;
        touch();
      },
    }),
  ]);
}

function noInputPanel(errors) {
  return el('div.empty', {}, [
    el('div.mark', { text: '⌖' }),
    el('h3', { text: 'Nothing to cast yet' }),
    el('p', { text: errors[0] ?? 'At least 2 X-Dates are required.' }),
    el('p', {
      style: 'color:var(--faint)',
      text:
        'Every pair of anchors gives one Y, and every operation turns that Y into a projection. ' +
        'Two anchors give one pair; three give three.',
    }),
  ]);
}

export function renderResults(host) {
  const r = state.results;
  const ev = currentEvent();
  const opts = state.options;
  const hhmm = ev.scope === EVENT_SCOPE.HH_MM;

  if (!r) {
    replace(host, [el('div.tablewrap', {}, [noInputPanel([])])]);
    return;
  }

  // A hard guard error — too few anchors, an unsupported scope — is about the
  // inputs, not the filters, so it gets its own panel rather than the "loosen a
  // filter" one, which would be misleading advice.
  const guardErrors = r.errors.filter((e) => typeof e === 'string');
  if (guardErrors.length) {
    replace(host, [
      el('div.banner', {}, [
        el('div', {}, [
          el('b', { text: 'This event cannot be cast yet.' }),
          el('ul', {}, guardErrors.map((m) => el('li', { text: m }))),
        ]),
      ]),
      el('div.tablewrap', {}, [noInputPanel(guardErrors)]),
    ]);
    return;
  }

  const rows = r.processed_z_dates;
  if (!rows.length) {
    replace(host, [el('div.tablewrap', {}, [emptyPanel()])]);
    return;
  }

  const shown = rows.slice(0, MAX_ROWS);
  const maxScore = Math.max(5, ...rows.map((z) => z.score));
  const sortType = r.sort_type;

  const visible = COLUMNS.filter(
    (c) => !(c.key === 'ops' && opts.hide_operations_col_completely)
  );

  const body = shown.map((z) => {
    const cells = [
      el('td.zlabel', { text: `Z${z.z_ordinal + 1}` }),

      el('td', { class: opts.hide_date_col ? 'hidden-col' : '' }, [
        hhmm
          ? el('div', {}, [
              el('span.datepill', { text: `from: ${fmtDateTime(z.zStart)}` }),
              el('span.datepill', { style: 'margin-top:3px', text: `to: ${fmtDateTime(z.zEnd)}` }),
            ])
          : el('span.datepill', { text: fmtDate(z.zStart) }),
      ]),

      el('td', { class: opts.hide_hits_col ? 'hidden-col' : '' }, [
        el('span.hits', { data: { n: String(Math.min(z.hit_count, 5)) } }, [
          el('span.glyph', { text: glyphFor(z.hit_count) }),
          String(z.hit_count),
        ]),
      ]),

      el('td', { class: opts.hide_score_col ? 'hidden-col' : '' }, [
        el('div.scorecell', {}, [
          // Verbatim: 9 renders "9", 1.5 renders "1.5". No fixed decimals.
          el('b', { text: String(z.score) }),
          el('div.scoremeter', {}, [
            el('i', { style: `width:${Math.min(100, (z.score / maxScore) * 100)}%` }),
          ]),
        ]),
      ]),

      el('td', { class: opts.hide_msrf_col ? 'hidden-col' : '' }, [
        z.resonance_matches.length
          ? el('div.pills', {}, z.resonance_matches.map((m) => msrfPill(m, z)))
          : el('span', { style: 'color:var(--faint)', text: '—' }),
      ]),
    ];

    if (!opts.hide_operations_col_completely) {
      cells.push(
        el('td', { class: opts.hide_operations_col ? 'hidden-col' : '' }, [
          el('div.pills', {}, z.operation_match_structs.map((m) => operationPill(m, z))),
        ])
      );
    }

    const tr = el('tr', { data: { key: z.key, highlight: String(state.highlightKey === z.key) } }, cells);

    // Cross-highlight with the chart, both ways.
    tr.addEventListener('mouseenter', () => {
      state.highlightKey = z.key;
      document.dispatchEvent(new CustomEvent('ophis:highlight', { detail: z.key }));
    });
    tr.addEventListener('mouseleave', () => {
      state.highlightKey = null;
      document.dispatchEvent(new CustomEvent('ophis:highlight', { detail: null }));
    });
    tr.addEventListener('click', () => {
      state.auditKey = z.key;
      goto('audit');
    });

    return tr;
  });

  const capped = rows.length > MAX_ROWS;

  replace(host, [
    el('div.tablewrap', { class: state.stale ? 'stale' : '' }, [
      el('table', {}, [
        el('caption', {
          text: capped
            ? `Showing ${MAX_ROWS} of ${rows.length} Z-Dates · ${r.hidden} hidden by filters · click a row to audit it`
            : `${rows.length} Z-Date${rows.length === 1 ? '' : 's'} · ${r.hidden} hidden by filters · click a row to audit it`,
        }),
        el('thead', {}, [el('tr', {}, visible.map((c) => headerCell(c, sortType)))]),
        el('tbody', {}, body),
      ]),
    ]),
  ]);
}

/** Column visibility toggles, shown above the table. */
export function renderColumnToggles(host) {
  const opts = state.options;
  const toggles = [
    ['hide_date_col', 'Date'],
    ['hide_hits_col', 'Hits'],
    ['hide_score_col', 'Score'],
    ['hide_msrf_col', 'MSRF'],
    ['hide_operations_col', 'Operations'],
  ].map(([key, label]) =>
    el('button', {
      type: 'button',
      text: label,
      'aria-pressed': String(!opts[key]),
      onclick: () => {
        opts[key] = !opts[key];
        renderResults(document.getElementById('resultsHost'));
        renderColumnToggles(host);
      },
    })
  );

  replace(host, [
    el('span', {
      style: 'font:600 9.5px/1 var(--font-body);letter-spacing:.16em;text-transform:uppercase;color:var(--dim)',
      text: 'Columns',
    }),
    el('div.segmented', {}, toggles),
  ]);
}
