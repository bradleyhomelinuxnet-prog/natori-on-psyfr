/**
 * II · The Wheels — one dialled moment, read on seven reckonings.
 *
 * The dial (year/era/month/day + slider) and `state.dial` are the same value in
 * two places, so every edit has to travel one way without bouncing back. The
 * `origin` flag below marks which control started the in-flight change; the
 * writer then skips that control's own group. Without it, typing "2" into the
 * year field would immediately be overwritten by the normalised "2".
 */

import { $, el, replace, setActive, toggleGroup } from '../dom.js';
import { set, state, subscribe } from '../../state/store.js';
import { eraYear, fmtYear, isPalindrome, jdn, toAstroYear } from '../../core/jdn.js';
import {
  am,
  anunnaTurnings,
  isMetonic,
  mayaInfo,
  moonInfo,
  nemesisInfo,
  nerInfo,
  phoenixInfo,
} from '../../core/cycles.js';
import {
  MAY_NODES,
  METONIC,
  NEMESIS_INNER,
  NEMESIS_PERIOD,
  NER_PERIOD,
  PHOENIX_PERIOD,
} from '../../data/lattice.js';

/** The earliest Phoenix node the Chronicon numbers from; node #1. */
const FIRST_PHOENIX_NODE = -4308;

/** A Draconian year is 360 turnings, so a NER is 600 of those and a baktun 144000 days. */
const DRACONIAN_DAYS = 360;
const NER_DAYS = NER_PERIOD * DRACONIAN_DAYS;
const BAKTUN_DAYS = 144000;

/** AM years the Chronicon calls out by name. */
const AM_FLOOD = 1656;
const AM_HORIZON = 6000;

/** MAY_NODES holds boundaries, so the count has one fewer baktun than entries. */
const BAKTUN_COUNT = MAY_NODES.length - 1;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const num = (raw, fallback) => (raw !== '' && Number.isFinite(+raw) ? +raw : fallback);

const small = (text) => el('small', { text });
const b = (text) => el('b', { text });

/* ---------------------------------------------------------------- the faces */

function phoenixFace({ ay }) {
  const ph = phoenixInfo(ay);
  const node = Math.round((ph.last - FIRST_PHOENIX_NODE) / PHOENIX_PERIOD) + 1;
  return {
    big: ph.node ? ['◉ NODE YEAR'] : [String(ph.to), small(' yr to node')],
    meta: [
      ['last ', b(fmtYear(ph.last)), ' · next ', b(fmtYear(ph.next))],
      `node #${node} · ${ph.into} yr in`,
    ],
    bar: ph.into / PHOENIX_PERIOD,
  };
}

function nemesisFace({ ay }) {
  const nm = nemesisInfo(ay);
  const outerArc = NEMESIS_PERIOD - NEMESIS_INNER;
  return {
    big: nm.inner
      ? [`INNER · yr ${nm.off}`]
      : [String(nm.next - ay), small(' yr to return')],
    meta: nm.inner
      ? [
          ['entered ', b(fmtYear(nm.enter)), ' · exits ', b(fmtYear(nm.exit))],
          [`${NEMESIS_INNER}-yr inner arc, ${nm.off} yr in · returns `, b(fmtYear(nm.next))],
        ]
      : [
          `outside Sol · ${outerArc}-yr arc`,
          [`${NEMESIS_INNER}-yr inner arc opens `, b(fmtYear(nm.next))],
        ],
    // One bar for the whole 792-yr orbit. The original swapped denominators
    // between the inner and outer legs, so the fill jumped on crossing.
    bar: nm.off / NEMESIS_PERIOD,
  };
}

function nerFace({ ay }) {
  const nr = nerInfo(ay);
  return {
    big: [`PERIOD ${nr.num}`],
    meta: [
      ['began ', b(fmtYear(nr.start)), ` · ${nr.next - ay} yr to next`],
      'ten 60-yr decans apiece',
    ],
    bar: nr.off / NER_PERIOD,
  };
}

function annusMundiFace({ ay }) {
  const A = am(ay);
  const mirror = isPalindrome(A) ? null : nextPalindrome(A);
  return {
    big: [String(A), small(' AM')],
    meta: [
      `Flood node AM ${AM_FLOOD} · ${A >= AM_HORIZON ? 'past' : `${AM_HORIZON - A} to`} AM ${AM_HORIZON}`,
      isPalindrome(A)
        ? [el('span.pal', { text: '⮌ palindromic AM year' })]
        : `next mirror AM ${mirror ?? '—'}`,
    ],
    bar: null,
  };
}

function mayaFace({ ay }) {
  const bi = mayaInfo(ay);
  const closed = MAY_NODES[BAKTUN_COUNT];

  if (bi < 0) {
    return {
      big: ['PRE-COUNT'],
      meta: [`before 0.0.0.0.0 (${fmtYear(MAY_NODES[0])})`],
      bar: 0,
    };
  }
  if (bi === BAKTUN_COUNT) {
    return {
      big: ['COUNT CLOSED'],
      meta: [
        [`${BAKTUN_COUNT}.0.0.0.0 sealed `, b(fmtYear(closed))],
        [b(String(ay - closed)), ' yr since the count closed'],
      ],
      bar: 1,
    };
  }

  const start = MAY_NODES[bi];
  const end = MAY_NODES[bi + 1];
  return {
    big: [`BAKTUN ${bi + 1}`, small(`/${BAKTUN_COUNT}`)],
    meta: [
      `${fmtYear(start)} → ${fmtYear(end)}`,
      [b(String(end - ay)), ` yr to ${bi + 1 === BAKTUN_COUNT ? `${BAKTUN_COUNT}.0.0.0.0` : 'next baktun'}`],
    ],
    bar: (ay - start) / (end - start),
  };
}

function anunnaFace({ J }) {
  const turnings = anunnaTurnings(J);
  const T = Math.abs(turnings);
  const sign = turnings < 0 ? '−' : '';
  const node = turningsNode(T);
  return {
    big: [sign + T.toLocaleString(), small(' turnings')],
    meta: [
      `${sign}${(T / DRACONIAN_DAYS).toFixed(1)} Draconian yr · ${sign}${(T / NER_DAYS).toFixed(2)} NER`,
      [`${sign}${(T / BAKTUN_DAYS).toFixed(2)} baktun`, node && ' ', node && b(node)],
    ],
    bar: null,
  };
}

/** Turning counts the Chronicon marks: 432000 and 864000 come before the generic baktun test. */
function turningsNode(T) {
  if (T === 432000) return '✦ antediluvian total';
  if (T === 864000) return '✦ Foundation of Time';
  if (T > 0 && T % BAKTUN_DAYS === 0) return `✦ ${T / BAKTUN_DAYS}× baktun`;
  return null;
}

function moonFace({ ay, m, d, referenceYear }) {
  const mo = moonInfo(ay, m, d);
  const drift = referenceYear - ay;
  // Symmetric truncation both ways. The original floored the signed difference,
  // so 20 years ahead read as "2 cycles ahead" while 20 back read as "1 back".
  const cycles = Math.floor(Math.abs(drift) / METONIC);
  const same = isMetonic(ay, referenceYear);
  return {
    big: [mo.name],
    meta: [
      ['age ', b(`${mo.age.toFixed(1)}d`), ' · illum ', b(`${Math.round(mo.illum * 100)}%`)],
      [
        `Metonic ${cycles} ${drift >= 0 ? 'back' : 'ahead'} · `,
        same
          ? el('span.rt.met', { text: '★ same phase as today' })
          : `lunation ${mo.lun}`,
      ],
    ],
    bar: null,
  };
}

const WHEELS = [
  { key: 'phx', name: 'Phoenix · Sky Dragon · 138 yr', read: phoenixFace },
  { key: 'nem', name: 'Nemesis X · 792 yr', read: nemesisFace },
  { key: 'ner', name: 'Anunnaki NER · 600 yr', read: nerFace },
  { key: 'am', name: 'Annus Mundi · from 3895 BC', read: annusMundiFace },
  { key: 'may', name: 'Mayan Long-Count', read: mayaFace },
  { key: 'anu', name: 'Anunna Turnings · šar = a day', read: anunnaFace },
  { key: 'moon', name: 'Metonic Moon · 19 yr = 235 moons', read: moonFace },
];

/** The next palindrome at or above `n`, or null if none is close by. */
function nextPalindrome(n) {
  for (let x = n + 1; x < n + 5000; x++) if (isPalindrome(x)) return x;
  return null;
}

/* --------------------------------------------------------------- rendering */

/** Flatten meta lines — each a string or an array of strings/nodes — with <br> between. */
function metaLines(lines) {
  const out = [];
  for (const line of lines) {
    if (out.length) out.push(el('br'));
    out.push(...[].concat(line).filter(Boolean));
  }
  return out;
}

function wheelCard(spec, face) {
  const card = el(`div.clock.c-${spec.key}`, {}, [
    el('div.name', { text: spec.name }),
    el('div.big', {}, face.big),
    el('div.meta', {}, metaLines(face.meta)),
  ]);
  if (face.bar !== null && face.bar !== undefined) {
    const pct = (clamp(face.bar, 0, 1) * 100).toFixed(2);
    card.append(el('div.bar', {}, [el('i', { style: `width:${pct}%` })]));
  }
  return card;
}

/* -------------------------------------------------------------------- panel */

export function initWheels() {
  const grid = $('wheelGrid');
  const yearEl = $('dYear');
  const eraEl = $('dEra');
  const monthEl = $('dMon');
  const dayEl = $('dDay');
  const sliderEl = $('dSlider');
  const presetsEl = $('dialPresets');
  if (!grid || !yearEl || !eraEl || !monthEl || !dayEl || !sliderEl) return;

  const sliderMin = num(sliderEl.min, -2842);
  const sliderMax = num(sliderEl.max, 2178);

  /** Which control started the change now being applied: 'fields', 'slider', or null. */
  let origin = null;

  const push = (dial, from) => {
    origin = from;
    try {
      set({ dial });
    } finally {
      origin = null;
    }
  };

  function readFields() {
    const era = eraEl.querySelector('button.on')?.dataset.era === 'bc' ? 'BC' : 'CE';
    return {
      ay: toAstroYear(Math.abs(+yearEl.value) || 1, era),
      m: clamp(+monthEl.value || 1, 1, 12),
      d: clamp(+dayEl.value || 1, 1, 31),
    };
  }

  function writeInputs({ ay, m, d }) {
    if (origin !== 'fields') {
      setActive(eraEl, 'era', ay <= 0 ? 'bc' : 'ad');
      yearEl.value = String(eraYear(ay));
      monthEl.value = String(m);
      dayEl.value = String(d);
    }
    if (origin !== 'slider') {
      sliderEl.value = String(clamp(ay, sliderMin, sliderMax));
    }
  }

  function render() {
    const { ay, m, d } = state.dial;
    writeInputs(state.dial);
    const ctx = { ay, m, d, J: jdn(ay, m, d), referenceYear: state.referenceYear };
    replace(grid, WHEELS.map((spec) => wheelCard(spec, spec.read(ctx))));
  }

  for (const input of [yearEl, monthEl, dayEl]) {
    input.addEventListener('input', () => push(readFields(), 'fields'));
  }
  toggleGroup(eraEl, 'era', () => push(readFields(), 'fields'));

  sliderEl.addEventListener('input', () => {
    push({ ...state.dial, ay: +sliderEl.value }, 'slider');
  });

  presetsEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !presetsEl.contains(btn)) return;
    if (btn.id === 'dToday') {
      const t = state.today;
      push({ ay: t.y, m: t.m, d: t.d }, null);
    } else if (btn.dataset.jy !== undefined) {
      const era = btn.dataset.je === 'bc' ? 'BC' : 'CE';
      push({ ay: toAstroYear(+btn.dataset.jy, era), m: 5, d: 15 }, null);
    }
  });

  subscribe((_s, keys) => {
    if (keys.includes('dial') || keys.includes('referenceYear')) render();
  });

  render();
}
