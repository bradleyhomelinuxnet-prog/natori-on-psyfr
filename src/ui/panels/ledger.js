/**
 * III · The Ledger — the Chronicon's documented chronology.
 *
 * Read-only apart from two actions per row: seed the event as an anchor, or
 * send its date to the wheels.
 */

import { $, el, emptyRow, replace, setActive, toggleGroup } from '../dom.js';
import { toast } from '../chrome.js';
import { makeAnchor, set, state, subscribe, touch } from '../../state/store.js';
import { eraYear, fmtYear, isPalindrome } from '../../core/jdn.js';
import { am, phoenixInfo } from '../../core/cycles.js';
import { LEDGER, eventSeedDate } from '../../data/ledger.js';

const KINDS = new Set(['key', 'phx', 'nem', 'ner', 'may', 'note']);
const LABEL_MAX = 20;
const COLUMNS = 5;

const palMark = () => el('span.pal', { text: '⮌' });

/** "2239 BC Nemesis Cataclysm" — the head of the event text, to the first clause break. */
function seedLabel(ay, text) {
  const head = text.split('—')[0].split(';')[0];
  return `${fmtYear(ay)} ${head.slice(0, LABEL_MAX).trim()}`;
}

function seedAnchor(ay, m, d, text) {
  state.anchors.push(makeAnchor(ay, m, d, seedLabel(ay, text)));
  touch('anchors');
  toast(`Seeded ${fmtYear(ay)}`);
}

function showOnWheels(ay, m, d) {
  set({ dial: { ay, m, d } });
  $('wheels')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function yearCell(ay, kind) {
  const dot = KINDS.has(kind) ? kind : 'note';
  const pal = isPalindrome(eraYear(ay));
  return el('td.dt', {}, [el('span.dot', { class: `d-${dot}` }), fmtYear(ay), pal && ' ', pal && palMark()]);
}

function amCell(ay) {
  const value = am(ay);
  const pal = isPalindrome(value);
  return el('td', {}, [value, pal && ' ', pal && palMark()]);
}

/**
 * The original painted this column red for every row, so the off-node dots read
 * as dim red. Only a real node is red here; the rest are plain dim.
 */
function phoenixCell(ay) {
  const node = phoenixInfo(ay).node;
  return el('td', {
    style: `text-align:center;color:var(--${node ? 'red' : 'dim'})`,
    text: node ? '●' : '·',
    title: node ? 'Phoenix node year' : null,
  });
}

function ledgerRow(entry) {
  const [ay, kind, text] = entry;
  const { m, d } = eventSeedDate(entry);

  const seed = el('button.seedbtn', {
    type: 'button',
    text: 'seed ⚓',
    title: `Seed ${fmtYear(ay)} as an anchor`,
    onclick: (e) => {
      e.stopPropagation(); // otherwise the row would also throw the date at the wheels
      seedAnchor(ay, m, d, text);
    },
  });

  return el('tr.zr', { onclick: () => showOnWheels(ay, m, d) }, [
    yearCell(ay, kind),
    amCell(ay),
    phoenixCell(ay),
    el('td.ev', { text }),
    el('td', {}, [seed]),
  ]);
}

function render(body, count, shown) {
  const kind = state.ledgerFilter;
  const rows = kind === 'all' ? LEDGER : LEDGER.filter((e) => e[1] === kind);

  // #ledgerCount sits inside "The full dated spine … — N events", so it must stay
  // the size of the whole ledger. The filtered count goes beside the filter chips.
  if (count) count.textContent = String(LEDGER.length);
  if (shown) shown.textContent = kind === 'all' ? '' : `${rows.length} of ${LEDGER.length} listed`;

  replace(body, rows.length ? rows.map(ledgerRow) : [emptyRow(COLUMNS, 'No events match this filter.')]);
}

export function initLedger() {
  const body = $('ledBody');
  if (!body) return;

  const filt = $('ledFilt');
  const count = $('ledgerCount');
  const shown = $('ledShown');

  toggleGroup(filt, 'k', (kind) => set({ ledgerFilter: kind }));
  setActive(filt, 'k', state.ledgerFilter);

  subscribe((_, keys) => {
    if (!keys.includes('ledgerFilter')) return;
    setActive(filt, 'k', state.ledgerFilter);
    render(body, count, shown);
  });

  render(body, count, shown);
}
