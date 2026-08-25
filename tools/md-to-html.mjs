/**
 * Render a Markdown document as a styled, self-contained HTML page.
 *
 *   node tools/md-to-html.mjs docs/WHITEPAPER.md --out whitepaper.html
 *   node tools/md-to-html.mjs docs/HANDOFF.md --out-dir docs/html
 *
 * Deliberately small and dependency-free. It handles the subset this project's
 * documents actually use — headings, paragraphs, tables, fenced code, lists,
 * blockquotes, rules and inline emphasis — and nothing else. A document that
 * needs more should say so by rendering wrong, rather than by pulling in a
 * parser nobody reads.
 *
 * The output links the application's own token layer, so a document and the
 * instrument it documents follow the same theme.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, join, dirname, relative } from 'node:path';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Delimiters for the code-span placeholder.
 *
 * Two ASCII control characters, because the placeholder is an index and a bare
 * number would collide with every ordinary number in the document — a year, a
 * count, a version. Markdown source containing a raw U+0001 is not a case worth
 * defending against.
 */
const MARK_OPEN = '\u0001';
const MARK_CLOSE = '\u0002';
const MARK_RE = /\u0001(\d+)\u0002/g;

/**
 * Inline formatting.
 *
 * Code spans are lifted out first and put back last, so that emphasis markers
 * inside a span of code are never interpreted — `a*b*c` must stay `a*b*c`.
 */
function inline(text) {
  const spans = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => {
    spans.push(`<code>${esc(c)}</code>`);
    return `${MARK_OPEN}${spans.length - 1}${MARK_CLOSE}`;
  });

  s = esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,;:)]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s.,;:)]|$)/g, '$1<em>$2</em>');

  return s.replace(MARK_RE, (_, i) => spans[Number(i)]);
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Where each converted document is published, repo-relative.
 *
 * A page's links were written relative to its SOURCE — `docs/HANDOFF.md` says
 * `../README.md` — but the page itself is served from somewhere else, so every
 * relative href must be re-based from the source directory to the page
 * directory. And a link to a document that is itself published should land on
 * the published page, not on raw Markdown. This map is the second half of that;
 * `rebaseLinks` below is the first.
 */
const PUBLISHED = new Map([
  ['WHITEPAPER.md', 'whitepaper.html'],
  ['HANDOFF.md', 'docs/html/HANDOFF.html'],
  ['DEVIATIONS.md', 'docs/html/DEVIATIONS.html'],
  ['MODDING.md', 'docs/html/MODDING.html'],
  ['DOMAIN.md', 'docs/html/DOMAIN.html'],
  ['VORTEX.md', 'docs/html/VORTEX.html'],
  ['00-BUILD-SPEC.md', 'docs/html/00-BUILD-SPEC.html'],
  ['22-author-source-documents.md', 'docs/html/22-author-source-documents.html'],
  ['README.md', 'docs/html/README.html'],
]);

/**
 * Re-base every relative href from the source's directory to the page's.
 *
 * Published Markdown targets go to their published page; everything else —
 * unconverted specs, directories, images — keeps pointing at the real file,
 * now via a path that resolves from where the page actually is.
 */
function rebaseLinks(body, sourceDir, pageDir) {
  return body.replace(/href="([^"]+)"/g, (whole, href) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(href)) return whole;
    const [path, fragment = ''] = href.split(/(?=#)/);
    const repoPath = join(sourceDir, path);
    const target = PUBLISHED.get(basename(repoPath)) ?? repoPath;
    return `href="${relative(pageDir, target) || '.'}${fragment}"`;
  });
}

/** Split a table row into its cells. */
const cells = (row) => row.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

function render(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  const toc = [];
  const para = [];
  let i = 0;

  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];

    // ---- fenced code ----
    if (/^```/.test(line)) {
      flush();
      const lang = line.slice(3).trim();
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push(
        `<pre${lang ? ` data-lang="${esc(lang)}"` : ''}><code>${esc(body.join('\n'))}</code></pre>`
      );
      continue;
    }

    // ---- table: a header row followed by a separator row ----
    if (/^\|/.test(line) && /^\|[\s:|-]+\|?\s*$/.test(lines[i + 1] ?? '')) {
      flush();
      const head = cells(line);
      const align = cells(lines[i + 1]).map((c) =>
        c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left'
      );
      i += 2;
      const body = [];
      while (i < lines.length && /^\|/.test(lines[i])) body.push(cells(lines[i++]));

      const th = head
        .map((c, n) => `<th style="text-align:${align[n] ?? 'left'}">${inline(c)}</th>`)
        .join('');
      const rows = body
        .map(
          (r) =>
            `<tr>${r
              .map((c, n) => `<td style="text-align:${align[n] ?? 'left'}">${inline(c)}</td>`)
              .join('')}</tr>`
        )
        .join('');
      out.push(
        `<div class="tablewrap"><table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`
      );
      continue;
    }

    // ---- heading ----
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      const level = h[1].length;
      const text = h[2].trim();
      const id = slug(text);
      if (level >= 2 && level <= 3) toc.push({ level, text, id });
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    // ---- horizontal rule ----
    if (/^([-*_])\1{2,}\s*$/.test(line)) {
      flush();
      out.push('<hr>');
      i++;
      continue;
    }

    // ---- blockquote ----
    if (/^>\s?/.test(line)) {
      flush();
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${render(body.join('\n')).body}</blockquote>`);
      continue;
    }

    // ---- list ----
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      flush();
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        const item = [lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '')];
        i++;
        // Continuation lines sit indented under their bullet.
        while (
          i < lines.length &&
          /^\s{2,}\S/.test(lines[i]) &&
          !/^\s*([-*]|\d+\.)\s+/.test(lines[i])
        ) {
          item.push(lines[i++].trim());
        }
        items.push(`<li>${inline(item.join(' '))}</li>`);
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    if (!line.trim()) {
      flush();
      i++;
      continue;
    }

    para.push(line.trim());
    i++;
  }
  flush();

  return { body: out.join('\n'), toc };
}

function page({ title, body, toc, prefix }) {
  const nav = toc.map((t) => `    <a class="l${t.level}" href="#${t.id}">${esc(t.text)}</a>`).join('\n');

  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'none'; img-src 'self' data:; connect-src 'none'">
<link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;800&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${prefix}src/styles/ophis-tokens.css">
<link rel="stylesheet" href="${prefix}src/styles/ophis-app.css">
<style>
  body { padding-bottom: 96px; }
  .doc-top {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: 20px var(--gutter); max-width: 1180px; margin: 0 auto;
  }
  .paper {
    display: grid; grid-template-columns: 232px minmax(0, 1fr); gap: 48px;
    max-width: 1180px; margin: 0 auto; padding: 0 var(--gutter);
  }
  .paper > nav {
    position: sticky; top: 24px; align-self: start;
    max-height: calc(100vh - 48px); overflow-y: auto;
    padding: 24px 0; font-size: 12.5px;
  }
  .paper > nav a { display: block; color: var(--dim); text-decoration: none; padding: 3px 0; line-height: 1.4; }
  .paper > nav a:hover { color: var(--gold-2); }
  .paper > nav a.l3 { padding-left: 14px; font-size: 11.5px; color: var(--faint); }

  article { padding: 24px 0; max-width: 76ch; }
  article h1 { font-family: var(--font-display); font-size: clamp(28px, 4vw, 40px); color: var(--ink); margin: 0 0 20px; letter-spacing: .01em; }
  article h2 { font-family: var(--font-display); font-size: 24px; color: var(--gold-2); margin: 52px 0 16px; }
  article h3 { font-size: 17px; color: var(--ink); margin: 34px 0 12px; font-weight: 600; }
  article h4 { font-size: 14px; color: var(--gold); margin: 26px 0 10px; font-weight: 600; letter-spacing: .04em; }
  article p { font-size: 15.5px; line-height: 1.68; color: var(--prose); margin: 0 0 15px; max-width: none; }
  article strong { color: var(--ink); }
  article ul, article ol { color: var(--prose); font-size: 15.5px; line-height: 1.68; padding-left: 22px; margin: 0 0 16px; }
  article li { margin-bottom: 6px; }
  article hr { border: 0; border-top: 1px solid var(--line); margin: 40px 0; }
  article blockquote {
    border-left: 3px solid var(--gold); background: var(--panel);
    margin: 20px 0; padding: 12px 20px; border-radius: 0 var(--r-2) var(--r-2) 0;
  }
  article blockquote p:last-child { margin-bottom: 0; }
  article pre {
    background: var(--well); border: 1px solid var(--line); border-radius: var(--r-2);
    padding: 14px 16px; overflow-x: auto; font-family: var(--font-mono);
    font-size: 12px; line-height: 1.55; color: var(--prose); margin: 0 0 18px;
  }
  article pre code { background: none; border: 0; padding: 0; font-size: inherit; }
  article .tablewrap { margin: 0 0 20px; }
  article td, article th { font-size: 12.5px; }
  article td:first-child { color: var(--ink); }

  @media (max-width: 900px) {
    .paper { grid-template-columns: 1fr; gap: 0; }
    .paper > nav { display: none; }
  }
</style>
</head>
<body>

<div class="doc-top">
  <div class="brand">OPHIS <small>${esc(title)}</small></div>
  <a class="btn" href="${prefix}index.html">Open the instrument &rarr;</a>
</div>

<div class="paper">
  <nav aria-label="Contents">
${nav}
  </nav>
  <article>
${body}
  </article>
</div>

</body>
</html>
`;
}

/* -------------------------------------------------------------------- main -- */

const argv = process.argv.slice(2);
const outIdx = argv.indexOf('--out');
const dirIdx = argv.indexOf('--out-dir');
const explicitOut = outIdx > -1 ? argv[outIdx + 1] : null;
const outDir = dirIdx > -1 ? argv[dirIdx + 1] : null;
// Guard the index checks: an absent flag has index -1, and -1 + 1 is 0, which
// would silently drop the first input file.
const consumed = new Set([outIdx > -1 ? outIdx + 1 : -1, dirIdx > -1 ? dirIdx + 1 : -1]);
const inputs = argv.filter((a, n) => !a.startsWith('--') && !consumed.has(n));

if (!inputs.length) {
  console.error('usage: node tools/md-to-html.mjs <file.md ...> [--out page.html | --out-dir dir]');
  process.exit(1);
}

for (const input of inputs) {
  const md = readFileSync(input, 'utf8');
  const { body, toc } = render(md);
  const firstHeading = /^#\s+(.*)$/m.exec(md);
  const title = firstHeading ? firstHeading[1].trim() : basename(input, '.md');

  const target = explicitOut ?? join(outDir ?? dirname(input), `${basename(input, '.md')}.html`);
  mkdirSync(dirname(target), { recursive: true });

  // How far the page sits below the repo root, so the stylesheet link resolves.
  const depth = relative(dirname(target), '.').split(/[\\/]/).filter((p) => p === '..').length;
  const prefix = depth ? '../'.repeat(depth) : '';

  const rebased = rebaseLinks(body, dirname(input), dirname(target));
  writeFileSync(target, page({ title, body: rebased, toc, prefix }));
  console.log(`${String(md.split('\n').length).padStart(5)} lines  ->  ${target}`);
}
