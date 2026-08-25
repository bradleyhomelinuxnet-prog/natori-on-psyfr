/**
 * I·b · The Convergence — where independent operations land on the same date.
 *
 * Ranked by strength (distinct equations that concur), echoes always excluded:
 * a projection that lands back on its own anchor is not agreement.
 */

import { $, el, emptyRow, replace } from '../dom.js';
import { set, state, subscribe } from '../../state/store.js';
import { WINDOWS, findConvergences } from '../../core/convergence.js';
import { fmtYear, isPalindrome } from '../../core/jdn.js';

const COLSPAN = 6;
const MAX_ROWS = 200;
const WATCH = ['results', 'convTol', 'lens', 'hasCast', 'selectedZ'];

const pad2 = (n) => String(n).padStart(2, '0');

function strengthCell(c, maxNOps) {
  return el('td', {}, [
    el('span.convstrength', {}, [
      el('b', { text: c.nOps }),
      el('span.cbar', {}, [el('i', { style: `width:${(c.nOps / maxNOps) * 100}%` })]),
    ]),
    el('div.cpairs', {
      text: `${c.nPairs} pair${c.nPairs === 1 ? '' : 's'} · ${c.count} hits`,
    }),
    // The day window chains transitively: with ±30 days, hits 30 days apart
    // daisy-chain into one cluster that can span far more than 30 days. The
    // span line states the real spread instead of letting the window imply it.
    c.spanDays > 0 && el('div.cspan', { text: `spans ${c.spanDays} d` }),
  ]);
}

function dateCell(c) {
  return el('td.dt', {}, [
    fmtYear(c.ay),
    el('span', { style: 'color:var(--dim)', text: ` · ${pad2(c.m)}/${pad2(c.d)}` }),
  ]);
}

function amCell(c) {
  return el('td', {}, [String(c.am), isPalindrome(c.am) && el('span.pal', { text: ' ⮌' })]);
}

/** Long Count reads as a plain number, but a 138 inside it is the sigil — mark it. */
function lcCell(c) {
  if (c.lc <= 0) return el('td', { text: '—' });
  const s = String(c.lc);
  const at = s.indexOf('138');
  if (at < 0) return el('td', { text: s });
  return el('td', {}, [
    s.slice(0, at),
    el('span', { style: 'color:var(--red)', text: '138' }),
    s.slice(at + 3),
  ]);
}

function tagsCell(c) {
  const chips = c.tags.map(([label, cls]) => el('span', { class: `rt ${cls}`, text: label }));
  return el('td', {}, [
    el('div.restags', {}, chips.length ? chips : el('span', { style: 'color:var(--dim)', text: '—' })),
  ]);
}

function opsCell(c) {
  return el('td', {}, [
    el('div.opchips', {}, c.ops.map((eq) => el('span.opchip', { text: eq }))),
  ]);
}

function sendToWheels(c) {
  set({ selectedZ: c.centerJD, dial: { ay: c.ay, m: c.m, d: c.d } });
  $('wheels')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function convRow(c, maxNOps) {
  return el(
    'tr.zr',
    { class: state.selectedZ === c.centerJD ? 'sel' : null, onclick: () => sendToWheels(c) },
    [strengthCell(c, maxNOps), dateCell(c), amCell(c), lcCell(c), tagsCell(c), opsCell(c)]
  );
}

function render(sel, body, count) {
  const want = String(state.convTol);
  if (sel.value !== want) sel.value = want;

  if (!state.hasCast) {
    // The original announced "0 convergences" before anything had been cast,
    // which reads as a result. Nothing has been counted yet, so say nothing.
    count.textContent = '';
    replace(body, emptyRow(COLSPAN, 'Cast the oracle to reveal where operations agree.'));
    return;
  }

  const clusters = findConvergences(
    state.results.filter((r) => !r.echo),
    state.convTol
  );

  count.textContent = clusters.length
    ? `${clusters.length} convergence${clusters.length === 1 ? '' : 's'}`
    : 'no operations agree at this window';

  if (!clusters.length) {
    replace(
      body,
      emptyRow(
        COLSPAN,
        'No convergences at this window — widen the agreement window, or add more operations / anchors.'
      )
    );
    return;
  }

  const maxNOps = Math.max(...clusters.map((c) => c.nOps));
  replace(body, clusters.slice(0, MAX_ROWS).map((c) => convRow(c, maxNOps)));
}

export function initConvergence() {
  const sel = $('convTolSel');
  const body = $('convBody');
  const count = $('convCount');
  if (!sel || !body || !count) return;

  replace(sel, WINDOWS.map((w) => el('option', { value: w.id, text: w.label })));

  sel.addEventListener('change', () => {
    set({ convTol: sel.value === 'year' ? 'year' : Number(sel.value) });
  });

  const draw = () => render(sel, body, count);
  subscribe((_, keys) => keys.some((k) => WATCH.includes(k)) && draw());
  draw();
}
