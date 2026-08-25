/**
 * The anchor panel — the seed dates the whole cast is built from.
 *
 * Anchors are held in LIST order, never sorted. `cast()` pairs anchors by index
 * and binds `X1+` to the lower-indexed one, so the order the user builds the
 * list in is part of the input. The original build sorted by Julian Day on
 * every add, which silently re-bound every X1 operation; that sort is gone.
 */

import { $, el, replace, toggleGroup } from '../dom.js';
import { toast } from '../chrome.js';
import { state, subscribe, touch, makeAnchor } from '../../state/store.js';
import { fmtYear, toAstroYear } from '../../core/jdn.js';
import { am } from '../../core/cycles.js';
import { LEDGER, eventSeedDate } from '../../data/ledger.js';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const pad2 = (n) => String(n).padStart(2, '0');
const clip = (s, n) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

/** Proleptic Gregorian, on ASTRONOMICAL years — so 1 BC (astro 0) is a leap year. */
const isLeap = (ay) => ay % 4 === 0 && (ay % 100 !== 0 || ay % 400 === 0);
const daysInMonth = (ay, m) => (m === 2 && isLeap(ay) ? 29 : MONTH_LENGTHS[m - 1]);

/** A number input's value as a whole number, or NaN for blank/partial entry. */
function readInt(input) {
  const raw = input.value.trim();
  return /^\d+$/.test(raw) ? Number(raw) : NaN;
}

const anchorName = (a) => a.label || fmtYear(a.ay);

/** `Great Flood · 2239 BC · 05/15 · JD 1,000,000 · AM 1656` */
function anchorRow(a, index, onToggle, onRemove) {
  const name = anchorName(a);
  return el('div.arow', { class: a.enabled ? null : 'off' }, [
    el('div.ord', { text: String(index + 1) }),
    el('div.lbl', {}, [
      name,
      el('small', {}, [
        `${fmtYear(a.ay)} · ${pad2(a.m)}/${pad2(a.d)} · `,
        el('span.mono', { text: `JD ${a.jd.toLocaleString()}` }),
        ` · AM ${am(a.ay)}`,
      ]),
    ]),
    el('div.ctrls', {}, [
      el('button.chk', {
        type: 'button',
        class: a.enabled ? 'on' : null,
        'aria-pressed': String(a.enabled),
        'aria-label': `${a.enabled ? 'Disable' : 'Enable'} ${name}`,
        title: a.enabled ? 'disable' : 'enable',
        text: a.enabled ? '✓' : '',
        onclick: () => onToggle(a.id),
      }),
      el('button.xbtn', {
        type: 'button',
        'aria-label': `Remove ${name}`,
        title: 'remove',
        text: '✕',
        onclick: () => onRemove(a.id),
      }),
    ]),
  ]);
}

/** `2239 BC 05/15 · THE GREAT FLOOD — May, Annus Mundi 1656` */
function seedOptionLabel(row) {
  const { m, d } = eventSeedDate(row);
  return `${fmtYear(row[0])} ${pad2(m)}/${pad2(d)} · ${clip(row[2], 46)}`;
}

/** The gist of an event, short enough to read in a row: text up to the first dash or semicolon. */
function seedAnchorLabel(row) {
  const gist = row[2].split('—')[0].split(';')[0].slice(0, 22).trim();
  return `${fmtYear(row[0])} ${gist}`;
}

export function initAnchors() {
  const list = $('anchorList');
  if (!list) return;

  const countOut = $('anchorCount');
  const errOut = $('anchorErr');
  const yearIn = $('aYear');
  const eraBox = $('aEra');
  const monIn = $('aMon');
  const dayIn = $('aDay');
  const labelIn = $('aLabel');
  const addBtn = $('addAnchor');
  const seedSel = $('seedSel');

  const showError = (msg) => {
    if (errOut) errOut.textContent = `✕ ${msg}`;
  };
  const clearError = () => {
    if (errOut) errOut.textContent = '';
  };

  /** Append only — see the note at the top of this file about list order. */
  const appendAnchor = (ay, m, d, label) => {
    state.anchors.push(makeAnchor(ay, m, d, label || fmtYear(ay)));
    touch('anchors');
  };

  const toggleAnchor = (id) => {
    const a = state.anchors.find((x) => x.id === id);
    if (!a) return;
    a.enabled = !a.enabled;
    touch('anchors');
  };

  const removeAnchor = (id) => {
    const i = state.anchors.findIndex((a) => a.id === id);
    if (i < 0) return;
    state.anchors.splice(i, 1);
    touch('anchors');
  };

  function render() {
    replace(
      list,
      state.anchors.length
        ? state.anchors.map((a, i) => anchorRow(a, i, toggleAnchor, removeAnchor))
        : [el('div.empty', { text: 'No anchors yet — type a date below, or seed one from the ledger.' })],
    );
    if (countOut) {
      countOut.textContent = `${state.anchors.filter((a) => a.enabled).length} ACTIVE`;
    }
  }

  /* --- the add bar --- */

  // The markup owns the initial era; read it rather than assuming CE.
  let era = eraBox?.querySelector('button.on')?.dataset.era ?? 'ad';
  toggleGroup(eraBox, 'era', (value) => {
    era = value;
  });

  function handleAdd() {
    if (!yearIn || !monIn || !dayIn) return;

    const year = readInt(yearIn);
    if (!Number.isFinite(year) || year < 1 || year > 9999) {
      showError('Year must be a whole number from 1 to 9999.');
      return;
    }

    const month = readInt(monIn);
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      showError('Month must be a whole number from 1 to 12.');
      return;
    }

    // The original clamped bad input to 1–31 and added the anchor anyway, so
    // "February 31" quietly became March 3. Refuse it instead.
    const ay = toAstroYear(year, era === 'bc' ? 'BC' : 'CE');
    const last = daysInMonth(ay, month);
    const day = readInt(dayIn);
    if (!Number.isFinite(day) || day < 1 || day > last) {
      showError(`${MONTHS[month - 1]} ${fmtYear(ay)} has ${last} days — day must be 1 to ${last}.`);
      return;
    }

    clearError();
    appendAnchor(ay, month, day, labelIn ? labelIn.value.trim() : '');
    if (labelIn) labelIn.value = '';
  }

  addBtn?.addEventListener('click', handleAdd);

  for (const input of [yearIn, monIn, dayIn, labelIn]) {
    input?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      handleAdd();
    });
  }

  /* --- the ledger seed menu --- */

  if (seedSel) {
    // The original hid `note` rows from this menu; they are dated events like
    // any other and seed perfectly well, so all 69 rows are offered.
    seedSel.append(
      ...LEDGER.map((row, i) => el('option', { value: String(i), text: seedOptionLabel(row) })),
    );

    seedSel.addEventListener('change', () => {
      const picked = seedSel.value;
      if (picked === '') return;
      seedSel.value = '';

      const row = LEDGER[Number(picked)];
      if (!row) return;

      const { m, d } = eventSeedDate(row);
      clearError();
      appendAnchor(row[0], m, d, seedAnchorLabel(row));
      toast(`Seeded: ${fmtYear(row[0])}`);
    });
  }

  /* --- first run --- */

  if (state.anchors.length === 0) {
    const t = state.today;
    state.anchors.push(
      makeAnchor(-2238, 5, 15, 'Great Flood'),
      makeAnchor(t.y, t.m, t.d, 'Today'),
      makeAnchor(2040, 5, 15, 'Phoenix 2040'),
    );
    touch('anchors');
  }

  subscribe((_s, keys) => {
    if (keys.includes('anchors')) render();
  });

  render();
}
