/**
 * Pulls the data tables out of the reference PSYFR1 build and emits them as clean ES modules.
 * Run once; the generated files under src/data/ are then the editable source of truth.
 *
 *   node tools/extract-data.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'reference', 'extracted', 'psyfr1.js');
const OUT = join(ROOT, 'src', 'data');
mkdirSync(OUT, { recursive: true });

const text = readFileSync(SRC, 'utf8');

/** Grab a `const NAME = <literal>;` initialiser by balancing brackets from the `=`. */
function grab(name) {
  const m = new RegExp(`\\bconst\\s+${name}\\s*=`).exec(text);
  if (!m) throw new Error(`could not find const ${name}`);
  let i = m.index + m[0].length;
  while (/\s/.test(text[i])) i++;
  const open = text[i];
  const close = { '[': ']', '{': '}', '(': ')' }[open];
  if (!close) {
    // simple literal — read to the terminating semicolon or comma at depth 0
    const end = text.indexOf(';', i);
    return text.slice(i, end).trim();
  }
  let depth = 0, inStr = null, out = i;
  for (; out < text.length; out++) {
    const c = text[out];
    if (inStr) { if (c === '\\') out++; else if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) { out++; break; } }
  }
  return text.slice(i, out);
}

const banner = (what, note) =>
  `// ${what}\n// Extracted verbatim from the reference PSYFR1 build by tools/extract-data.mjs.\n` +
  (note ? `// ${note}\n` : '') + `// This file is DATA. Edit it freely — nothing else needs to change.\n\n`;

/* ---------------------------------------------------------------- eclipses */
const eclipses =
  banner(
    'Precomputed solar & lunar eclipse tables (~1–3000 CE).',
    'Delta-encoded: each D string is a comma-separated list of day gaps from BASE; each T string is one type letter per record.'
  ) +
  `export const ECL_TYPE_NAME = ${grab('ECL_TYPE_NAME')};\n\n` +
  `export const ECL_S_BASE = ${grab('ECL_S_BASE')};\n` +
  `export const ECL_S_D = ${grab('ECL_S_D')};\n` +
  `export const ECL_S_T = ${grab('ECL_S_T')};\n\n` +
  `export const ECL_L_BASE = ${grab('ECL_L_BASE')};\n` +
  `export const ECL_L_D = ${grab('ECL_L_D')};\n` +
  `export const ECL_L_T = ${grab('ECL_L_T')};\n`;
writeFileSync(join(OUT, 'eclipses.data.js'), eclipses);

/* -------------------------------------------------------------------- msrf */
writeFileSync(
  join(OUT, 'msrf.js'),
  banner(
    'MSRF resonance number set.',
    'Ophis NORMAL+IMPORTANT key members, plus 19. A projected date scores an MSRF hit when either the interval Y or the day-offset appears here.'
  ) + `export const MSRF_NUMBERS = ${grab('MSRF')
    .replace(/^new\s+Set\(/, '')
    .replace(/\)$/, '')};\n\nexport const MSRF = new Set(MSRF_NUMBERS);\n`
);

/* ------------------------------------------------------------------ ledger */
writeFileSync(
  join(OUT, 'ledger.js'),
  banner(
    'The Chronicon documented-event ledger.',
    'Row shape: [astronomicalYear, kind, text, [month, day]?]. Default date is 5/15 when omitted. kind ∈ key|phx|nem|ner|may|note.'
  ) +
    `export const LEDGER = ${grab('E')};\n\n` +
    `/** Index of documented years, used by the scoring lenses. */\n` +
    `export const EVENT_YEARS = new Map(LEDGER.map((e) => [e[0], e]));\n\n` +
    `/** Events default to 15 May unless the row carries its own [month, day]. */\n` +
    `export function eventSeedDate(e) {\n` +
    `  return e[3] && e[3].length === 2 ? { m: e[3][0], d: e[3][1] } : { m: 5, d: 15 };\n}\n`
);

/* ------------------------------------------------------------------- packs */
writeFileSync(
  join(OUT, 'packs.js'),
  banner(
    'Operation packs — the primary mod surface.',
    'Add a pack by adding a key here. Nothing else in the app needs to change.'
  ) +
    `export const DEFAULT_OPS = ${grab('DEFAULT_OPS')};\n\n` +
    `export const PACKS = ${grab('PACKS')};\n\n` +
    `export const DEFAULT_PACK_NAME = 'Default 19';\n`
);

/* ----------------------------------------------------------------- lattice */
writeFileSync(
  join(OUT, 'lattice.js'),
  banner('The Breshears cycle lattice + calendar epochs.') +
    `/** Annus Mundi year = astronomical year + AM_OFFSET. */\nexport const AM_OFFSET = 3894;\n` +
    `/** Long-Count year = astronomical year + LC_OFFSET. */\nexport const LC_OFFSET = 3112;\n` +
    `/** Years from the Nemesis Cataclysm to astro year 0. */\nexport const CAT_OFFSET = 5238;\n\n` +
    `/** Phoenix / Sky Dragon cycle, years. A node lands where mod(year,138) === PHOENIX_PHASE. */\n` +
    `export const PHOENIX_PERIOD = 138;\nexport const PHOENIX_PHASE = 108;\n\n` +
    `/** Nemesis X: 792-yr orbit with a 60-yr inner arc, phased from astro year 462. */\n` +
    `export const NEMESIS_PERIOD = 792;\nexport const NEMESIS_INNER = 60;\nexport const NEMESIS_PHASE = 462;\n\n` +
    `/** Anunnaki NER: 600-yr period phased from astro year 162. */\n` +
    `export const NER_PERIOD = 600;\nexport const NER_PHASE = 162;\n\n` +
    `/** Metonic cycle, years. */\nexport const METONIC = 19;\n\n` +
    `/** Mean synodic month, days, and a reference new moon JD. */\n` +
    `export const SYNODIC = 29.530588853;\nexport const NEWMOON_J2000 = 2451550.1;\n` +
    `/** Lunation-number epoch (Brown lunation 1). */\nexport const LUNATION_EPOCH_JD = 2423436.40347;\n\n` +
    `/** Mayan baktun boundaries, astronomical years. */\n` +
    `export const MAY_NODES = ${grab('MAY_NODES')};\n`
);

console.log('wrote:');
for (const f of ['eclipses.data.js', 'msrf.js', 'ledger.js', 'packs.js', 'lattice.js']) {
  const { size } = statSync(join(OUT, f));
  console.log(`  src/data/${f}  ${(size / 1024).toFixed(1)} KB`);
}
