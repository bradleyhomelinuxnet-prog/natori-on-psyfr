/**
 * Basic Reader — the same engine, explained in plain English.
 *
 * Opens a .oph file (or a bundled example), runs `runOphis` exactly as the
 * full app does, and tells the story of the strongest dates instead of
 * showing the table. No maths lives here: every number comes from the engine.
 */

import { $, el, replace } from './ui/dom.js';
import { parseDocument } from './io/oph.js';
import { runOphis } from './core/ophis/run.js';
import { fmtDate } from './core/ophis/calendar.js';
import { MILLIS_PER_DAY } from './core/ophis/constants.js';

const EXAMPLES = [
  ['examples/01-worked-example.oph', 'Worked example (5 dates)'],
  ['examples/02-job-changes.oph', 'Job changes'],
  ['examples/03-job-changes-protocol-prime.oph', 'Job changes + today (Protocol Prime)'],
  ['examples/04-even-spacing-19-138.oph', 'Even spacing — 19 & 138'],
];

const CONSTANT_WORDS = {
  OPH_PHI: 'the golden ratio (1.618)',
  OPH_PI: 'π as the lore writes it (3.14)',
  OPH_CRV: 'the curve number (5.08)',
  OPH_HEP: 'the hepta number (7.01)',
};

/** Plain numbers that appear in shared packs, named where the name is known. */
const NUMBER_WORDS = {
  '2.718': "Euler's number e (2.718)",
  '1.38': '1.38 (the 138 cycle ÷ 100)',
  '2.178': '2.178 (the 2178 vortex loop ÷ 1000)',
  '0.360': '0.360 (a 360° circle ÷ 1000)',
};

/** Turn an operation's equation into one sentence. Falls back to the raw text. */
export function explainEquation(eq) {
  const s = eq.replace(/\s+/g, '');
  const from = s.startsWith('X1') ? 'the earlier date' : 'the later date';
  const body = s.slice(3);
  const k = Object.keys(CONSTANT_WORDS).find((c) => body.includes(c));
  const word = k ? CONSTANT_WORDS[k] : null;
  if (body === 'oph_round(Y)') return `Step the same gap forward again from ${from}.`;
  if (body === 'oph_flip(oph_round(Y))') return `Reverse the gap's digits (47 → 74) and step that far from ${from}.`;
  if (word && body === `Y/${k}`) return `Divide the gap by ${word}, step from ${from}.`;
  if (word && body === `Yx${k}`) return `Multiply the gap by ${word}, step from ${from}.`;
  if (word && body === `(Y/2.0)x${k}`) return `Take half the gap, multiply by ${word}, step from ${from}.`;
  const lit = /^(\(Y\/2\.0\)|Y)([x/])(\d+(?:\.\d+)?)$/.exec(body);
  if (lit) {
    const n = NUMBER_WORDS[lit[3]] ?? lit[3];
    const half = lit[1] === 'Y' ? 'the gap' : 'half the gap';
    return `${lit[2] === 'x' ? 'Multiply' : 'Divide'} ${half} by ${n}, step from ${from}.`;
  }
  return `Apply ${body} to the gap, step from ${from}.`;
}

const days = (a, b) => Math.round((b - a) / MILLIS_PER_DAY);

function anchorLine(i, x) {
  return el('li', {}, [el('b', { text: `X${i + 1}` }), ` ${x.m}/${x.d}/${x.y}`, x.enabled ? '' : ' (switched off)']);
}

function protocolPrimeHint(ev, now) {
  const on = ev.x_dates.filter((x) => x.enabled);
  const last = on[on.length - 1];
  if (!last) return null;
  const lastMs = Date.UTC(last.y, last.m - 1, last.d);
  if (Math.abs(days(lastMs, now)) <= 3) return null;
  return el('p.hint', {}, [
    el('b', { text: 'Tip — Protocol Prime. ' }),
    "The author's method adds the date you run the projection (today) as the last control. ",
    "Without it you are running a third of the method. Add today in the full app and re-run.",
  ]);
}

function storyCard(z, rank) {
  const routes = z.operation_match_structs.map(({ y_struct: y, operation_result: o }) =>
    el('li', {}, [
      el('span.pair', { text: `X${y.x_1_ordinal + 1}→X${y.x_2_ordinal + 1}` }),
      ` gap ${y.rotation_count_y} days. `,
      explainEquation(o.operation.equation),
      el('code', { text: o.operation.equation }),
    ])
  );
  const echoes = z.resonance_matches.map((m) =>
    el('li', { text: `${m.label} — a ${m.tier.toLowerCase()} resonance number (+${m.points}, ×${m.multiplier})` })
  );
  return el('article.card', {}, [
    el('h3', {}, [el('span.rank', { text: `#${rank}` }), ` ${fmtDate(z.zStart)}`, el('span.score', { text: `score ${z.score}` })]),
    el('p', {
      text:
        `${z.operation_hit_count} independent route${z.operation_hit_count === 1 ? '' : 's'} land here` +
        (z.resonance_matches.length ? `, and the distance echoes ${z.resonance_matches.length} resonance number${z.resonance_matches.length === 1 ? '' : 's'}.` : '.'),
    }),
    el('h4', { text: 'How the arithmetic gets here' }),
    el('ul', {}, routes),
    echoes.length ? el('h4', { text: 'Why it scores' }) : null,
    echoes.length ? el('ul', {}, echoes) : null,
  ]);
}

function render(doc, name) {
  const now = Date.now();
  const out = $('out');
  const blocks = [];
  for (const ev of doc.iso_events) {
    const r = runOphis(ev, { now });
    blocks.push(el('h2', { text: ev.name || name }));
    if (ev.notes) blocks.push(el('p.notes', { text: ev.notes }));
    blocks.push(el('h4', { text: '1 · Your dates' }), el('ol.anchors', {}, ev.x_dates.map((x, i) => anchorLine(i, x))));
    blocks.push(protocolPrimeHint(ev, now));
    if (r.errors.length) {
      blocks.push(el('p.err', { text: `The engine refused to run: ${r.errors.join('; ')}` }));
      continue;
    }
    const rows = r.processed_z_dates;
    blocks.push(
      el('h4', { text: '2 · What the engine did' }),
      el('p', {
        text:
          `It measured ${r.y_structs.length} gap${r.y_structs.length === 1 ? '' : 's'} between pairs of your dates, ` +
          `ran each through ${r.effective_operations.filter((o) => o.ok).length} operations, ` +
          `and kept ${rows.length} future dates (${r.hidden} filtered out as noise).`,
      }),
      el('h4', { text: '3 · The strongest dates' })
    );
    const top = [...rows].sort((a, b) => b.score - a.score || b.hit_count - a.hit_count || a.zStart - b.zStart).slice(0, 5);
    top.forEach((z, i) => blocks.push(storyCard(z, i + 1)));
  }
  replace(out, blocks);
}

function load(text, name) {
  const { document: doc, errors } = parseDocument(text);
  if (!doc) return replace($('out'), el('p.err', { text: `Could not read ${name}: ${errors.join('; ')}` }));
  render(doc, name);
}

function init() {
  const pick = $('example');
  for (const [href, label] of EXAMPLES) pick.append(el('option', { value: href, text: label }));
  pick.addEventListener('change', async () => {
    if (!pick.value) return;
    const res = await fetch(pick.value);
    load(await res.text(), pick.value);
  });
  $('file').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (f) load(await f.text(), f.name);
  });
}

if (typeof document !== 'undefined') init();
