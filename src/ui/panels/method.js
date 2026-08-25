/**
 * The moment strip and the Method documentation.
 *
 * Two read-only panels, so this module has no event listeners of its own.
 *
 * The strip reads TODAY. The reference build drove it from the dial, which made
 * the header restate whatever the wheels already showed; here it is a fixed
 * "where we are standing" band and the wheels own the dial.
 *
 * The documentation is generated from LENSES, CONSTANTS and FUNCTIONS rather
 * than written out in the markup — the reference hand-wrote it and it had
 * already drifted from the code by the time it shipped.
 */

import { $, el, replace } from '../dom.js';
import { state, subscribe } from '../../state/store.js';
import { fmtYear, eraYear, isPalindrome, jdn } from '../../core/jdn.js';
import { am, lcYear, sinceCataclysm, phoenixInfo } from '../../core/cycles.js';
import { lensList, TRAIT_META } from '../../core/scoring/index.js';
import {
  CONSTANTS,
  CONSTANT_NOTES,
  FUNCTIONS,
  FUNCTION_NOTES,
} from '../../core/equation/index.js';
import { EVENT_YEARS } from '../../data/ledger.js';
import { PHOENIX_PERIOD, NEMESIS_PERIOD, NER_PERIOD, METONIC } from '../../data/lattice.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** How much of a ledger entry fits in the strip before it needs an ellipsis. */
const EVENT_CHARS = 40;

const mono = (text) => el('span.mono', { style: 'color:var(--cyan)', text });

function setText(id, value) {
  const node = $(id);
  if (node) node.textContent = String(value);
}

function setFlag(id, on, label, title) {
  const node = $(id);
  if (!node) return;
  node.classList.toggle('on', on);
  if (label) node.textContent = label;
  if (title) node.title = title;
}

const hasDigits = (needle, ...numbers) => numbers.some((n) => String(n).includes(needle));

function truncate(text, max) {
  return text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`;
}

/** Split a number's digits so an embedded run reads in the lattice colour. */
function highlight(text, needle) {
  const out = [];
  text.split(needle).forEach((part, i) => {
    if (i) out.push(el('span', { style: 'color:var(--red)', text: needle }));
    if (part) out.push(part);
  });
  return out;
}

/* ------------------------------------------------------------------ *
 * A · the moment strip
 * ------------------------------------------------------------------ */

function renderMoment() {
  const { y, m, d } = state.today;
  const annus = am(y);
  const longCount = lcYear(y);
  const era = eraYear(y);
  const cataclysm = sinceCataclysm(y);

  setText('mY', fmtYear(y));
  setText('mAM', annus);

  const lcNode = $('mLC');
  if (lcNode) replace(lcNode, highlight(String(longCount), '138'));

  setText('mCat', `${cataclysm} yr`);

  const event = EVENT_YEARS.get(y);
  const evNode = $('mEv');
  if (evNode) {
    replace(
      evNode,
      event ? ['⟶ ', el('b', { style: 'color:var(--gold2)', text: truncate(event[2], EVENT_CHARS) })] : []
    );
  }

  // A Phoenix NODE and the digits 138 are different claims, and the Phoenix wheel
  // on the same page is the authority on nodes — so the flag says which one it
  // means rather than lighting "138 NODE" on a digit match.
  const node = phoenixInfo(y).node;
  const digits138 = hasDigits('138', longCount, annus, era);
  setFlag(
    'flag138',
    node || digits138,
    node ? '138 NODE' : '138 LATTICE',
    node
      ? `${fmtYear(y)} is a Phoenix node — one every 138 years.`
      : '138 appears in the Long-Count year, the Annus Mundi year, or the era year.'
  );

  // The reference tested mod(today − dialYear, 19), which is trivially true once
  // the strip reads today. The digit test is the one that still says something.
  setFlag('flag19', hasDigits('19', era, annus), null, '19 appears in the era year or the Annus Mundi year.');
  setFlag(
    'flagPal',
    isPalindrome(era) || isPalindrome(annus) || isPalindrome(jdn(y, m, d)),
    null,
    'The era year, the Annus Mundi year, or the Julian day reads the same both ways.'
  );
  setFlag('flagEv', EVENT_YEARS.has(y), null, 'This year is named in the documented ledger.');

  setText(
    'youAreHere',
    `${d} ${MONTHS[m - 1]} ${fmtYear(y)} = AM ${annus} = LC ${longCount} = ${cataclysm} yr after the Nemesis Cataclysm.`
  );
}

/* ------------------------------------------------------------------ *
 * B · the Method documentation
 * ------------------------------------------------------------------ */

/**
 * One line of plain English per trait. Cycle lengths come from the lattice; the
 * digit tests are spelled out literally because that is what the trait pass
 * matches on — they are not derived from the periods.
 */
function traitHints() {
  return {
    phx: `a Phoenix node, one every ${PHOENIX_PERIOD} yr`,
    near: 'within two years of a node',
    doc: 'the year is named in the ledger',
    pal: 'era year, Annus Mundi or Julian day reads the same reversed',
    met: `a whole number of ${METONIC}-yr Metonic cycles from ${state.referenceYear}`,
    s138: '"138" in the digits of the year, the AM year or the Long-Count year',
    s19: '"19" in the digits of the year or the AM year',
    nem: `inside the inner transit of the ${NEMESIS_PERIOD}-yr Nemesis orbit`,
    ner: `on a ${NER_PERIOD}-yr NER boundary`,
    bak: 'on a Maya baktun edge',
    msrf: 'the interval Y or the offset is an MSRF resonance number',
    sol: 'a solar eclipse within a day of the projection',
    lun: 'a lunar eclipse within a day of the projection',
  };
}

function traitLine(key, points, hint) {
  const meta = TRAIT_META[key];
  return el('li', {}, [
    el('span.rt', { class: meta?.cls, text: meta?.label ?? key }),
    ' ',
    el('b', { text: `+${points}` }),
    hint && ' — ',
    hint && el('span.sysnote', { text: hint }),
  ]);
}

function lensPanel(lens, hints) {
  // Scored by cast.js after the trait pass, so they are not in lens.order.
  const castExtras = [
    ['msrf', lens.msrf],
    ['sol', lens.solar],
    ['lun', lens.lunar],
  ].filter(([, points]) => points);

  return el('div.panel', {}, [
    el('h3', { text: lens.label }),
    el('p.ph-sub', { text: lens.note }),
    el('ul.rulelist', {}, [
      ...lens.order.map(([key, points]) => traitLine(key, points, hints[key])),
      ...castExtras.map(([key, points]) => traitLine(key, points, hints[key])),
    ]),
    el('p.ph-sub', {
      style: 'margin:10px 0 0',
      text: 'MSRF and the eclipse points are added during the cast; every trait above them is read off the projected date alone.',
    }),
  ]);
}

function renderLensDocs() {
  const host = $('lensDocs');
  if (!host) return;
  const hints = traitHints();
  replace(host, lensList().map((lens) => lensPanel(lens, hints)));
}

function sectionLabel(text) {
  return el('div.glabel', { style: 'margin:12px 0 2px', text });
}

function constantRow(name) {
  const note = CONSTANT_NOTES[name];
  return el('div', {}, [mono(name), ` = ${CONSTANTS[name]}`, note && ` · ${note}`]);
}

function functionRow(name) {
  const note = FUNCTION_NOTES[name];
  return el('div', {}, [mono(`${name}(n)`), note && ` · ${note}`]);
}

function renderGrammarDocs() {
  const host = $('grammarDocs');
  if (!host) return;

  replace(host, [
    sectionLabel('Constants'),
    ...Object.keys(CONSTANTS).map(constantRow),

    sectionLabel('Functions'),
    ...Object.keys(FUNCTIONS).map(functionRow),

    sectionLabel('The shape of an equation'),
    el('div', {}, [
      'Every operation begins ',
      mono('X1+'),
      ' or ',
      mono('X2+'),
      ' — which anchor of the pair it projects from. ',
      el('b', { text: 'Y' }),
      ' is the interval between the two anchors, always a whole number of axial rotations (days), so a projection always lands on a whole day.',
    ]),

    el('p.ph-sub', { style: 'margin:8px 0 0' }, [
      'Worth saying plainly, because it surprises people: ',
      mono('OPH_PI'),
      ` is ${CONSTANTS.OPH_PI}, not Math.PI. The truncation is the original's and it is load-bearing — restoring the precise value moves every projection.`,
    ]),
  ]);
}

/* ------------------------------------------------------------------ */

export function initMethod() {
  renderMoment();
  renderLensDocs();
  renderGrammarDocs();

  // Both panels are fixed for the life of the page. The subscription exists so
  // that a store which ever moves the clock — a test harness, a future
  // time-travel mode — moves the strip and the Metonic hint with it.
  subscribe((_, changed) => {
    if (changed.includes('today')) renderMoment();
    if (changed.includes('referenceYear')) renderLensDocs();
  });
}
