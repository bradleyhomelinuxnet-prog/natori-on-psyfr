/**
 * Verify every relative link in the published HTML pages resolves on disk.
 *
 *   node tools/check-links.mjs
 *
 * Exists because the one defect class a static documentation set reliably ships
 * is the dead relative link — invisible in the Markdown, invisible in a spot
 * check, obvious to the first reader who clicks it. This walks every href in
 * every published page, resolves it against the repository, and fails loudly.
 *
 * Run by `npm run docs` after the build, and cheap enough to never skip.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const PAGES = [
  'index.html',
  'field-guide.html',
  'whitepaper.html',
  'chronicon.html',
  'docs/html/index.html',
  'docs/html/HANDOFF.html',
  'docs/html/DEVIATIONS.html',
  'docs/html/MODDING.html',
  'docs/html/DOMAIN.html',
  'docs/html/VORTEX.html',
  'docs/html/00-BUILD-SPEC.html',
  'docs/html/22-author-source-documents.html',
  'docs/html/README.html',
];

let checked = 0;
const broken = [];

for (const pagePath of PAGES) {
  if (!existsSync(pagePath)) {
    broken.push(`${pagePath}  (page itself is missing)`);
    continue;
  }
  const html = readFileSync(pagePath, 'utf8');
  const dir = dirname(pagePath);

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href = match[1];
    // External, in-page, and root-absolute references are out of scope.
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href)) continue;

    const target = normalize(join(dir, href.split('#')[0].split('?')[0]));
    if (target === '.' || target === '') continue;
    checked += 1;
    if (!existsSync(target)) broken.push(`${pagePath}  ->  ${href}`);
  }
}

console.log(`check-links: ${checked} relative references across ${PAGES.length} pages`);
if (broken.length) {
  console.error(`BROKEN (${broken.length}):`);
  for (const b of broken) console.error(`  ${b}`);
  process.exit(1);
}
console.log('all resolve');
