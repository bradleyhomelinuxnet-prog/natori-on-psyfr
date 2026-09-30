/**
 * Build the single-file distribution from `index.html` and `src/`.
 *
 *   npm run bundle                      -> ophis-single.html
 *   node tools/bundle.mjs --out X.html  -> X.html
 *   node tools/bundle.mjs --check       -> exit 1 if the output is stale
 *
 * WHY THIS EXISTS
 *
 * Two single-file builds were in circulation and they had quietly diverged: one
 * pointed its map at `assets/map/…jpg`, the other at `img/offline_map/map/…png`;
 * one linked the docs relatively, the other at a Pages site that no longer
 * carries them. Both were hand-made snapshots, so nothing kept them honest, and
 * a defect fixed in `src/` stayed live in both of them.
 *
 * Every single-file build is now generated. There is no second copy of the
 * logic to forget about.
 *
 * WHY esbuild RATHER THAN CONCATENATION
 *
 * The modules collide on names — `hit` in msrf-match.js against `hit` in
 * eclipses.js, `span`, `now`, `COLUMNS`, `panel`. Pasting the files together in
 * dependency order yields a file that parses and then misbehaves, which is the
 * worst possible failure. esbuild renames the collisions (this is where the
 * `hit2` / `span2` / `COLUMNS2` in the output come from) and orders the graph.
 *
 * It is a devDependency, used only here. The app itself still has no
 * dependencies, no build step for ordinary use, and runs from `index.html`
 * straight off disk. This produces a *distributable*, not the app.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHELL = resolve(ROOT, 'index.html');
const ENTRY = resolve(ROOT, 'src/ophis-app.js');

const args = process.argv.slice(2);
const check = args.includes('--check');
const outArg = args.indexOf('--out');
const OUT = resolve(ROOT, outArg !== -1 ? args[outArg + 1] : 'ophis-single.html');

/** Read the shell, and pull out the stylesheet hrefs it declares. */
function readShell() {
  const html = readFileSync(SHELL, 'utf8');
  const sheets = [...html.matchAll(/<link rel="stylesheet" href="(src\/[^"]+)">\s*/g)];
  if (!sheets.length) throw new Error('index.html declares no src/ stylesheets — has the shell changed?');
  return { html, sheets };
}

/**
 * Inline the CSS in the order the shell declares it. Order is load-bearing:
 * ophis-app.css resolves tokens that ophis-tokens.css defines.
 */
function inlineStyles(html, sheets) {
  let out = html;
  const blocks = sheets.map(([, href]) => {
    const css = readFileSync(resolve(ROOT, href), 'utf8');
    return `<style>\n${css}</style>`;
  });
  // Replace the first link with every style block, and drop the rest.
  out = out.replace(sheets[0][0], `${blocks.join('\n')}\n`);
  for (const [tag] of sheets.slice(1)) out = out.replace(tag, '');
  return out;
}

/**
 * A single file has no separate script to point at, so the policy has to permit
 * an inline one. 'unsafe-eval' is NOT added: the equation engine is still a
 * tokeniser and a parser, and the CI guard still forbids code generation.
 */
function relaxCspForInlineScript(html) {
  const before = html;
  const out = html.replace(
    /(content="[^"]*?)script-src 'self'([^"]*")/,
    "$1script-src 'self' 'unsafe-inline'$2"
  );
  if (out === before) throw new Error("could not find \"script-src 'self'\" in the shell's CSP");
  return out.replace(
    /<meta http-equiv="Content-Security-Policy"/,
    `<!-- Single-file build: script and style are inline, so the policy must allow\n` +
      `     'unsafe-inline' where the multi-file build did not. There is still no\n` +
      `     'unsafe-eval' - the equation engine is a real tokeniser and parser. -->\n` +
      `<meta http-equiv="Content-Security-Policy"`
  );
}

/** Swap the module <script src> for the bundled source, inline. */
function inlineScript(html, code) {
  const tag = /<script type="module" src="src\/[^"]+"><\/script>/;
  if (!tag.test(html)) throw new Error('index.html has no <script type="module" src="src/…"> to replace');
  return html.replace(tag, `<script>\n${code}</script>`);
}

const { html: shell, sheets } = readShell();

const result = await build({
  entryPoints: [ENTRY],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  charset: 'utf8',
  legalComments: 'inline',
  write: false,
});
if (result.warnings.length) {
  for (const w of result.warnings) console.warn(`esbuild: ${w.text}`);
}

let html = shell;
html = inlineStyles(html, sheets);
html = relaxCspForInlineScript(html);
html = inlineScript(html, result.outputFiles[0].text);

// The favicon is a separate file the single build cannot carry.
html = html.replace(/<link rel="icon"[^>]*>\s*/, '');

if (check) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null;
  if (current === html) {
    console.log(`bundle: ${OUT.replace(`${ROOT}/`, '')} is up to date`);
    process.exit(0);
  }
  console.error(
    `bundle: ${OUT.replace(`${ROOT}/`, '')} is STALE — run \`npm run bundle\` and commit the result`
  );
  process.exit(1);
}

writeFileSync(OUT, html);
const kb = (html.length / 1024).toFixed(0);
console.log(`bundle: ${OUT.replace(`${ROOT}/`, '')}  ${kb} KB, ${html.split('\n').length} lines`);
