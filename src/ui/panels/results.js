/**
 * The results table — the centrepiece.
 *
 * Casts the oracle, then filters, sorts and draws the projections. Every cell is
 * built with el(), so anchor labels and equation text arrive as text nodes.
 */

import { $, $$, el, emptyRow, replace, setActive, toggleGroup } from '../dom.js';
import { toast } from '../chrome.js';
import { set, state, subscribe } from '../../state/store.js';
import { cast } from '../../core/cast.js';
import { fmtYear, isPalindrome, jdn } from '../../core/jdn.js';
import { exportResultsCsv } from '../../io/csv.js';

const COLSPAN = 7;

/** A cap on the DOM, not on the data: a wide cast runs to thousands of rows. */
const RENDER_CAP = 500;

/** State keys that change what the table contains, as opposed to which row is lit. */
const REDRAW_KEYS = ['results', 'filter', 'sort', 'lens', 'hasCast'];

const pad = (n) => String(n).padStart(2, '0');
const hasTag = (cls) => (r) => r.tags.some((t) => t[1] === cls);

const FILTERS = {
  all: () => true,
  novel: (r) => !r.echo,
  phx: hasTag('phx'),
  ev: hasTag('ev'),
  pal: hasTag('pal'),
  met: (r) => r.met,
  ecl: (r) => Boolean(r.solar || r.lunar),
  // The original compared calendar years, which dropped the rest of the current
  // year. Comparing Julian Days makes "future" mean strictly after today.
  future: (r, todayJD) => r.zjd > todayJD,
};

const SORTERS = {
  score: (a, b) => a.score - b.score,
  date: (a, b) => a.zjd - b.zjd,
  am: (a, b) => a.am - b.am,
  lc: (a, b) => a.lc - b.lc,
  op: (a, b) => a.op.localeCompare(b.op),
  y: (a, b) => a.Y - b.Y,
};

/** Rows from the last draw, paired with their date, so selection needn't rebuild. */
let drawn = [];

/* ---------- deriving what to show ---------- */

function visibleRows() {
  const pass = FILTERS[state.filter] ?? FILTERS.all;
  const todayJD = jdn(state.today.y, state.today.m, state.today.d);
  const rows = state.results.filter((r) => pass(r, todayJD));

  const compare = SORTERS[state.sort.key] ?? SORTERS.score;
  const dir = state.sort.dir === 'asc' ? 1 : -1;
  // zjd ascending as the tie-break in either direction — the engine's own ordering.
  rows.sort((a, b) => dir * compare(a, b) || a.zjd - b.zjd);
  return rows;
}

/** Floor of 5 so a weak cast doesn't draw every bar full. */
const maxScore = () => state.results.reduce((m, r) => Math.max(m, r.score), 5);

function emptyMessage() {
  if (!state.hasCast) return 'Seed at least two anchors and cast the oracle.';
  if (!state.results.length) return 'That cast produced nothing in range — try other operations.';
  return 'No projections match this filter.';
}

/* ---------- cells ---------- */

const palMark = () => el('span.pal', { text: ' ⮌', title: 'palindrome' });

function scoreCell(r, max) {
  const tone = r.score >= 7 ? 'var(--red)' : r.score >= 4 ? 'var(--gold2)' : 'var(--dim)';
  const pct = Math.max(0, Math.min(100, (r.score / max) * 100));
  return el('td.sc', { style: `color:${tone}` }, [
    String(r.score),
    el('span.scorebar', {}, [el('i', { style: `width:${pct}%` })]),
  ]);
}

function dateCell(r) {
  return el('td.dt', {}, [
    fmtYear(r.ay),
    el('span', { style: 'color:var(--dim)', text: ` · ${pad(r.m)}/${pad(r.d)}` }),
  ]);
}

function amCell(r) {
  return el('td', {}, [String(r.am), isPalindrome(r.am) && palMark()]);
}

function lcCell(r) {
  if (r.lc <= 0) return el('td', { style: 'color:var(--dim)', text: '—' });

  // 138 inside the Long Count is the signal the thesis reads, so it stays lit.
  const parts = [];
  String(r.lc)
    .split('138')
    .forEach((chunk, i) => {
      if (i) parts.push(el('span', { style: 'color:var(--red)', text: '138' }));
      if (chunk) parts.push(chunk);
    });
  return el('td', {}, [...parts, isPalindrome(r.lc) && palMark()]);
}

function opCell(r) {
  return el('td', {}, [el('small.mono', { style: 'color:var(--cyan)', text: r.op })]);
}

function pairLine(r) {
  const from = (r.x1 ?? '').trim();
  const to = (r.x2 ?? '').trim();
  if (!from && !to) return null;
  return el('small', {
    style: 'display:block;color:var(--dim)',
    text: `${from || '·'} → ${to || '·'}`,
  });
}

function yCell(r) {
  return el('td', {}, [r.Y.toLocaleString(), pairLine(r)]);
}

function tagsCell(r) {
  const chips = r.tags.length
    ? r.tags.map(([label, cls]) => el('span.rt', { class: cls, text: label }))
    : [el('span', { style: 'color:var(--dim)', text: '—' })];
  return el('td', {}, [el('div.restags', {}, chips)]);
}

function resultRow(r, max) {
  const flags = [r.echo && 'echo', r.zjd === state.selectedZ && 'sel'].filter(Boolean);
  return el(
    'tr.zr',
    { class: flags.join(' ') || null, onclick: () => selectRow(r) },
    [scoreCell(r, max), dateCell(r), amCell(r), lcCell(r), opCell(r), yCell(r), tagsCell(r)]
  );
}

/* ---------- rendering ---------- */

function renderCount(shownCount, total) {
  const node = $('resCount');
  if (!node) return;
  if (!state.hasCast) {
    node.textContent = '';
    return;
  }
  const n = (v) => v.toLocaleString();
  // Say "shown" only when it is true — past the cap the table is a window onto
  // the matches, and CSV export still takes every one of them.
  node.textContent =
    shownCount > RENDER_CAP
      ? `${n(shownCount)} of ${n(total)} match · drawing the first ${n(RENDER_CAP)}`
      : `${n(shownCount)} of ${n(total)} shown`;
}

function syncHeaders() {
  const table = $('resTable');
  if (!table) return;
  for (const th of $$('th[data-sort]', table)) {
    if (th.dataset.sort === state.sort.key) {
      th.setAttribute('aria-sort', state.sort.dir === 'asc' ? 'ascending' : 'descending');
    } else {
      th.removeAttribute('aria-sort');
    }
  }
}

function render() {
  syncHeaders();

  const body = $('resBody');
  if (!body) return;

  const rows = visibleRows();
  renderCount(rows.length, state.results.length);

  if (!rows.length) {
    drawn = [];
    replace(body, emptyRow(COLSPAN, emptyMessage()));
    return;
  }

  const max = maxScore();
  const page = rows.slice(0, RENDER_CAP);
  drawn = page.map((r) => [resultRow(r, max), r.zjd]);
  replace(
    body,
    drawn.map(([tr]) => tr)
  );
}

/** Selection alone only changes one class — no need to rebuild hundreds of rows. */
function markSelection() {
  for (const [tr, zjd] of drawn) tr.classList.toggle('sel', zjd === state.selectedZ);
}

/* ---------- actions ---------- */

function selectRow(r) {
  set({ selectedZ: r.zjd, dial: { ay: r.ay, m: r.m, d: r.d } });
  $('wheels')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function runCast() {
  if (state.anchors.filter((a) => a.enabled).length < 2) {
    toast('Two active anchors are needed — the cast measures the span between them.');
    return;
  }
  if (!state.operations.filter((o) => o.enabled).length) {
    toast('Enable at least one operation before casting.');
    return;
  }

  const results = cast(state.anchors, state.operations, state.lens, state.referenceYear);
  set({ results, hasCast: true });
  toast(`${results.length} projections cast`);
}

function exportVisible() {
  // "Visible" means filtered and sorted; the render cap is a drawing limit, not a filter.
  const rows = visibleRows();
  if (!rows.length) {
    toast('Nothing to export — cast the oracle first.');
    return;
  }
  toast(`Exported ${exportResultsCsv(rows)} projections`);
}

function sortBy(key) {
  if (!SORTERS[key]) return;
  const dir =
    state.sort.key === key
      ? state.sort.dir === 'asc'
        ? 'desc'
        : 'asc'
      : key === 'score'
        ? 'desc'
        : 'asc';
  set({ sort: { key, dir } });
}

function wireHeaders(table) {
  for (const th of $$('th[data-sort]', table)) {
    // The markup uses plain <th>; make them reachable without a mouse.
    th.tabIndex = 0;
    th.addEventListener('click', () => sortBy(th.dataset.sort));
    th.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      sortBy(th.dataset.sort);
    });
  }
}

/* ---------- init ---------- */

export function initResults() {
  $('castBtn')?.addEventListener('click', runCast);
  $('exportCsv')?.addEventListener('click', exportVisible);

  const filt = $('resFilt');
  if (filt) {
    toggleGroup(filt, 'k', (value) => set({ filter: value }));
    setActive(filt, 'k', state.filter);
  }

  const table = $('resTable');
  if (table) wireHeaders(table);

  subscribe((_, keys) => {
    if (keys.some((k) => REDRAW_KEYS.includes(k))) render();
    else if (keys.includes('selectedZ')) markSelection();
  });

  render();
}
