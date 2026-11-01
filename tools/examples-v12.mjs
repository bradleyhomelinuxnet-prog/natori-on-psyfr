#!/usr/bin/env node
/**
 * Write v12-format copies of the pre-worked examples, so the original Ophis
 * v12 desktop app can open them too.
 *
 * Every `examples/*.oph` is in this app's own (v13) form, with X-Dates as
 * `{y, m, d}`. v12 only reads `{date: "MM/DD/YYYY"}` and, in its default loose
 * mode, silently drops every date it cannot parse -- the event opens empty. So
 * each file is read with `parseDocument` and re-written with
 * `serialiseDocumentV12`, the same writer as Export → "Save for Ophis v12", to
 * `examples/v12/<name>_v12.oph`.
 *
 * Run with `npm run examples:v12` after `npm run examples`.
 * `tests/examples-v12.test.mjs` regenerates these in memory and fails if a
 * committed copy is out of date.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDocument, serialiseDocumentV12 } from '../src/io/oph.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const EXAMPLES_DIR = join(ROOT, 'examples');
export const V12_DIR = join(EXAMPLES_DIR, 'v12');

/** `01-worked-example.oph` → `01-worked-example_v12.oph`. */
export const v12Name = (name) => name.replace(/\.oph$/, '_v12.oph');

/**
 * Every v12 copy, built in memory.
 *
 * @returns {Array<{source: string, file: string, text: string, notes: string[]}>}
 */
export function buildV12Examples() {
  return readdirSync(EXAMPLES_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.oph'))
    .map((e) => e.name)
    .sort()
    .map((source) => {
      const { document, errors } = parseDocument(readFileSync(join(EXAMPLES_DIR, source), 'utf8'));
      if (!document) throw new Error(`examples/${source} did not parse: ${errors.join('; ')}`);
      const { text, notes } = serialiseDocumentV12(document);
      return { source, file: v12Name(source), text: text + '\n', notes };
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(V12_DIR, { recursive: true });
  for (const { file, text, notes } of buildV12Examples()) {
    writeFileSync(join(V12_DIR, file), text);
    console.log(`  examples/v12/${file}`);
    for (const note of notes) console.log(`    note: ${note}`);
  }
}
