/**
 * The Lab screen — the author's working notes, made visible against this run.
 *
 * Reads `state.results` through ../../core/ophis/lab.js and changes nothing:
 * the two switches here are browser preferences like the optional tags, and the
 * validity rule they turn on filters the table's VIEW, never the run.
 * Sources: docs/reverse/24.
 */

import { el, replace } from '../dom.js';
import { state, currentEvent, notify, now } from '../../state/ophis-store.js';
import { fmtDate } from '../../core/ophis/calendar.js';
import { anchorMatrix, validity, gapReadings, moonDials, horizon } from '../../core/ophis/lab.js';
import { OPTIONAL_TAGS, tagToggle } from './screens.js';
import { goto } from './shell.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MATRIX_ROWS = 40;

/** el() for SVG: attributes only, no markup, same as dom.js. */
function svg(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  for (const c of children) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
}

const section = (title, children) =>
  el('section.panel.lab', {}, [
    el('header', {}, [el('h3', { text: title })]),
    el('div.body', {}, children),
  ]);

/** A switch that also re-renders, so the effect shows at once. */
function liveToggle(spec) {
  const row = tagToggle(spec);
  row.querySelector('input').addEventListener('change', notify);
  return row;
}

const VALIDITY_SWITCH = {
  key: 'lab_validity',
  label: 'Author’s validity rule',
  note:
    'From the Programmer Instructions. A Z-Date stands if it has an MSRF match, or an ALPHA hit ' +
    'from any operation but the isometric and holofractal ones, or two or more hits from those ' +
    'other operations. Rows that fail are set aside in the results table; the run, the chart and ' +
    'the exports keep them.',
};

function tierChip(tier) {
  return el('span.tierchip', {
    data: { apex: String(tier.apex === true) },
    title: `${tier.label} · ${tier.dimensions} dimensions of arithmetic`,
    text: tier.short,
  });
}

/* -------------------------------------------------------------- sections -- */

function switches() {
  const holo = OPTIONAL_TAGS.find((t) => t.key === 'tag_holoflective');
  return section('L1 · Switches', [
    el('p.note', {
      text:
        'Both are remembered by this browser and never saved in the .oph. Neither changes a score, ' +
        'a hit count or a rank. The other optional tags are in Settings → S3.',
    }),
    el('div.rowlist.full', {}, [liveToggle(holo), liveToggle(VALIDITY_SWITCH)]),
  ]);
}

function lookAhead(ev) {
  const h = horizon(ev, now());
  return section('L2 · How far ahead to look', [
    el('p', {
      text: h
        ? h.text
        : 'None of the three cases applies to these dates: the latest is not within 60 days before ' +
          'today, and no two are within 5 days of each other. Read the results as they come.',
    }),
    el('p.note', {
      text:
        'The Programmer Instructions’ rule of thumb: X-dates within 30 days of the run point a few days ' +
        'to about 5 months ahead; within 60 days, a week to a year; dates 5 days apart, 5 days to a month.',
    }),
  ]);
}

function matrix(r, ev, showAll) {
  const { xs, rows } = anchorMatrix(r, ev);
  const sorted = [...rows].sort((a, b) => b.z.score - a.z.score || b.tiers - a.tiers || a.z.zStart - b.z.zStart);
  const shown = showAll ? sorted : sorted.slice(0, MATRIX_ROWS);

  const body = shown.map((row) => {
    const v = validity(row.z);
    const tr = el('tr.hit', { tabindex: '0', role: 'button', 'aria-label': `Audit Z${row.z.z_ordinal + 1}` }, [
      el('td.zlabel', { text: `Z${row.z.z_ordinal + 1}` }),
      el('td', {}, [el('span.datepill', { text: fmtDate(row.z.zStart) })]),
      el('td.mono', { text: String(row.z.score) }),
      ...row.cells.map((c) =>
        el('td.mono.matrixcell', { data: { tier: String(Boolean(c?.tier)) } },
          c ? [String(c.days), c.tier ? ' ' : null, c.tier ? tierChip(c.tier) : null] : ['·'])
      ),
      el('td', { title: v.why, text: v.valid ? '✓' : '✕', class: v.valid ? 'ok' : 'faint' }),
    ]);
    const audit = () => {
      state.auditKey = row.key;
      goto('audit');
    };
    tr.addEventListener('click', audit);
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        audit();
      }
    });
    return tr;
  });

  const apex = rows.filter((x) => x.apex).length;
  const more = sorted.length > MATRIX_ROWS
    ? el('button.btn.sm', {
        type: 'button',
        text: showAll ? `Show the top ${MATRIX_ROWS}` : `Show all ${sorted.length}`,
        onclick: () => {
          state.labShowAll = !showAll;
          notify();
        },
      })
    : null;

  return section('L3 · Every anchor’s count', [
    el('p.note', {
      text:
        'The Earth’s rotations from each X-date to each Z-Date, with the MSRF Tier wherever the count ' +
        'is on it, as the Programmer Instructions lay out their H and I columns. The engine only probes ' +
        'the anchor that made a projection; this shows the others too. Tiers are the source’s seven, ' +
        'I to VII, with Tier VII (the Apex Projections) split into ceta, beta and alpha.',
    }),
    el('p', { text: `${apex} Z-Date${apex === 1 ? '' : 's'} reach an Apex tier from at least one anchor. Sorted by score; click a row to audit it.` }),
    el('div.tablewrap', {}, [
      el('table.matrix', {}, [
        el('thead', {}, [el('tr', {}, [
          el('th', { scope: 'col', text: '' }),
          el('th', { scope: 'col', text: 'Date' }),
          el('th', { scope: 'col', text: 'Score' }),
          ...xs.map((x) => el('th', { scope: 'col', title: fmtDate(x.at), text: `from X${x.index + 1}` })),
          el('th', { scope: 'col', title: 'The author’s validity rule', text: 'Valid' }),
        ])]),
        el('tbody', {}, body),
      ]),
    ]),
    more,
  ]);
}

function gaps(r) {
  const readings = gapReadings(r);
  return section('L4 · Gaps and the moon', [
    el('p.note', {
      text:
        'Each gap Y between two of your dates, measured in lunations. A whole number (within a day) means ' +
        'both dates fell at the same moon phase; a Saros or Metonic return would put them on the same ' +
        'eclipse or the same phase on the same calendar date. The moon here is the app’s own mean ' +
        'lunation, 29.5306 days, which stays within hours of NASA’s phase tables.',
    }),
    el('div.tablewrap', {}, [
      el('table', {}, [
        el('thead', {}, [el('tr', {}, ['Pair', 'Y', 'Lunations', 'Moon return', 'MSRF tier', 'Holoflective']
          .map((h) => el('th', { scope: 'col', text: h })))]),
        el('tbody', {}, readings.map((g) =>
          el('tr', {}, [
            el('td.mono', { text: `X${g.x1 + 1}→X${g.x2 + 1}` }),
            el('td.mono', { text: String(g.Y) }),
            el('td.mono', { text: g.lunations.toFixed(2) }),
            el('td', { text: g.returns.length ? g.returns.map((c) => `${c.name} × ${c.k}`).join(', ') : '—' }),
            el('td', {}, [g.tier ? tierChip(g.tier) : '—']),
            el('td.mono', { text: g.holo ? `⇄ ${g.holo.mirror}${g.holo.major ? ' (both major)' : ''}` : '—' }),
          ])
        )),
      ]),
    ]),
  ]);
}

function dial(d) {
  const R = 34;
  const a = d.fraction * 2 * Math.PI - Math.PI / 2;
  const tip = [44 + R * Math.cos(a), 44 + R * Math.sin(a)];
  return el('figure.dial', { data: { return: String(d.atReturn) } }, [
    svg('svg', { viewBox: '0 0 88 88', width: 88, height: 88, role: 'img', 'aria-label': `${d.name} dial` }, [
      svg('circle', { cx: 44, cy: 44, r: R, class: 'ring' }),
      svg('line', { x1: 44, y1: 10, x2: 44, y2: 4, class: 'zero' }),
      svg('line', { x1: 44, y1: 44, x2: tip[0].toFixed(2), y2: tip[1].toFixed(2), class: 'hand' }),
      svg('circle', { cx: 44, cy: 44, r: 3, class: 'hub' }),
    ]),
    el('figcaption', {}, [
      el('b', { text: d.name }),
      el('span', { text: `${d.whole} turn${d.whole === 1 ? '' : 's'} + ${(d.fraction * 100).toFixed(0)}%` }),
      el('span.sub', { text: d.atReturn ? 'At a return' : `next ${fmtDate(d.nextReturn)}` }),
    ]),
  ]);
}

function dials(r, ev) {
  const first = (ev.x_dates ?? []).find((x) => x.enabled === true);
  const rows = [...r.processed_z_dates].sort((a, b) => b.score - a.score);
  if (!first || !rows.length) return null;
  const x1 = Date.UTC(first.y, first.m - 1, first.d);
  const target = rows.find((z) => z.key === state.labDialKey) ?? rows.find((z) => z.key === state.auditKey) ?? rows[0];

  const pick = el('select', {
    'aria-label': 'Z-Date for the dials',
    onchange: (e) => {
      state.labDialKey = e.target.value;
      notify();
    },
  }, rows.slice(0, 60).map((z) =>
    el('option', { value: z.key, text: `Z${z.z_ordinal + 1} · ${fmtDate(z.zStart)} · score ${z.score}` })
  ));
  pick.value = target.key;

  return section('L5 · The moon’s long returns', [
    el('p.note', {
      text:
        'The Antikythera mechanism’s back dials, started on your first date. Each hand shows how far ' +
        'round its cycle the chosen Z-Date is. A hand at the top is a return: the Metonic dial there ' +
        'means the same moon phase on very nearly the same calendar date as your first date.',
    }),
    el('label.row', {}, [el('span', { text: 'Z-Date' }), pick]),
    el('div.dials', {}, moonDials(x1, target.zStart).map(dial)),
    el('p.note', { text: `Counted from X1, ${fmtDate(x1)}, to ${fmtDate(target.zStart)}.` }),
  ]);
}

function notBuilt() {
  return section('L6 · In the notes, not built', [
    el('ul.note', {}, [
      el('li', { text: 'Hydrogen Spacing Angle (105°). Core Algorithm Operations names it as a filter but gives no rule for turning a date or a count into an angle, so there is nothing to compute without inventing one.' }),
      el('li', { text: 'Holofractal Recognition Projections. Described in prose as following trajectories “through mathematical discontinuities”; no arithmetic is given beyond the Holo-date operation the table already runs.' }),
      el('li', { text: 'Tiers in the H and I columns are the source’s 565-number master (docs/reverse/19), not the 390 the engine scores with. A tier here is a reading; it is not part of the score.' }),
    ]),
  ]);
}

/* ---------------------------------------------------------------- render -- */

export function renderLab(host) {
  const r = state.results;
  const ev = currentEvent();
  if (!r || r.errors.some((e) => typeof e === 'string')) {
    replace(host, [switches(), lookAhead(ev), el('p.note', { text: 'Cast the event first — the Lab reads a finished run.' })]);
    return;
  }
  replace(host, [
    switches(),
    lookAhead(ev),
    matrix(r, ev, state.labShowAll === true),
    gaps(r),
    dials(r, ev),
    notBuilt(),
  ]);
}
