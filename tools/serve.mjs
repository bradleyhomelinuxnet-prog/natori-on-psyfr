/**
 * Serve the repository over http:// so the instrument can be driven in a browser.
 *
 *   npm run serve                        # http://127.0.0.1:8777/
 *   npm run serve -- --port 9000
 *   node tools/serve.mjs --root docs/html
 *
 * ES modules refuse to load from `file://`, so the app cannot be opened by
 * double-clicking `index.html` — it has to come off a server. This is that
 * server, written here rather than borrowed because of what the project claims
 * about itself: `npx serve` needs a registry, which an air-gapped machine does
 * not have, and `python -m http.server` needs a `python` on PATH, which Debian,
 * Ubuntu and macOS have not shipped in years — `python3`, yes; `python`, no.
 * Node is already required to run the suite, so this asks for nothing the
 * repository did not already need.
 *
 * Development only, and shaped accordingly: it binds loopback, it sends
 * `no-store` so an edit is one reload away rather than one hard-refresh, it
 * will not list a directory, and it cannot serve a byte from outside the root
 * it was given.
 */

import { createServer as createHttpServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, realpath } from 'node:fs/promises';
import { extname, join, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PORT = 8777;
const DEFAULT_HOST = '127.0.0.1';

/**
 * Content types for every extension this repository actually contains, plus the
 * handful a contributor is likely to add. Anything unlisted goes out as
 * `application/octet-stream`: a wrong type that a browser then sniffs is a
 * worse failure than an obvious one, because it only shows up in the one
 * browser that guesses differently.
 */
const TYPES = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.py': 'text/plain; charset=utf-8',
  '.yml': 'text/plain; charset=utf-8',
  '.yaml': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}));

/** The content type for a path, or the deliberately unhelpful default. */
export function contentType(path) {
  return TYPES.get(extname(path).toLowerCase()) ?? 'application/octet-stream';
}

/**
 * Resolve a URL path to a file inside `root`, or `null` if it escapes.
 *
 * Two escapes are refused before the filesystem is touched at all: a percent
 * sequence that decodes to `..`, and a backslash, which is a path separator on
 * Windows and nothing useful here. The `realpath` check downstream closes the
 * third, a symlink pointing out of the tree.
 */
function underRoot(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null; // malformed percent-encoding
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;

  const full = resolve(root, `.${decoded}`);
  const rel = relative(root, full);
  if (rel !== '' && (rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel))) return null;
  return full;
}

/** True if `path` is inside `root` once every symlink has been followed. */
async function realpathUnderRoot(root, path) {
  try {
    const [realRoot, realPath] = await Promise.all([realpath(root), realpath(path)]);
    const rel = relative(realRoot, realPath);
    return rel === '' || !(rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel));
  } catch {
    return false;
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(body);
}

/**
 * A static file server rooted at `root`.
 *
 * Exported separately from the command line so `tests/serve.test.mjs` can bind
 * it to an ephemeral port against a throwaway root and prove the traversal
 * refusals rather than trusting them.
 */
export function createServer({ root = process.cwd(), quiet = false } = {}) {
  const rootDir = resolve(root);

  const log = (status, method, path) => {
    if (!quiet) console.log(`${status}  ${method.padEnd(4)} ${path}`);
  };

  return createHttpServer(async (req, res) => {
    const method = req.method ?? 'GET';
    const urlPath = (req.url ?? '/').split(/[?#]/, 1)[0];

    if (method !== 'GET' && method !== 'HEAD') {
      log(405, method, urlPath);
      send(res, 405, `405 method not allowed: ${method}\n`, { Allow: 'GET, HEAD' });
      return;
    }

    const target = underRoot(rootDir, urlPath);
    if (target === null) {
      log(403, method, urlPath);
      send(res, 403, '403 forbidden\n');
      return;
    }

    let info;
    try {
      info = await stat(target);
    } catch {
      log(404, method, urlPath);
      send(res, 404, `404 not found: ${urlPath}\n`);
      return;
    }

    let file = target;
    if (info.isDirectory()) {
      // Without the trailing slash every relative URL on the page below would
      // resolve one directory too high, so redirect rather than serve.
      if (!urlPath.endsWith('/')) {
        const location = `${urlPath}/${(req.url ?? '').slice(urlPath.length)}`;
        log(301, method, urlPath);
        send(res, 301, `301 moved: ${location}\n`, { Location: location });
        return;
      }
      file = join(target, 'index.html');
      try {
        info = await stat(file);
      } catch {
        // No listing: a directory without an index is a missing page, and a
        // file browser is not what this is for.
        log(404, method, urlPath);
        send(res, 404, `404 no index.html in ${urlPath}\n`);
        return;
      }
    }

    if (!info.isFile() || !(await realpathUnderRoot(rootDir, file))) {
      log(403, method, urlPath);
      send(res, 403, '403 forbidden\n');
      return;
    }

    const headers = {
      'Content-Type': contentType(file),
      'Content-Length': info.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    };

    if (method === 'HEAD') {
      log(200, method, urlPath);
      res.writeHead(200, headers);
      res.end();
      return;
    }

    log(200, method, urlPath);
    res.writeHead(200, headers);
    createReadStream(file)
      .on('error', () => res.destroy())
      .pipe(res);
  });
}

/* ------------------------------------------------------------------ */
/* Command line                                                        */
/* ------------------------------------------------------------------ */

const USAGE = `Serve this repository for development.

  npm run serve                     http://${DEFAULT_HOST}:${DEFAULT_PORT}/
  npm run serve -- --port 9000
  node tools/serve.mjs --root docs/html --quiet

  --port N     port to listen on          (default ${DEFAULT_PORT}, or $PORT)
  --host H     interface to bind          (default ${DEFAULT_HOST}, or $HOST)
  --root DIR   directory to serve         (default the current directory)
  --quiet      do not log requests
  --help       this text
`;

function parseArgs(argv) {
  const opts = {
    port: Number(process.env.PORT ?? DEFAULT_PORT),
    host: process.env.HOST ?? DEFAULT_HOST,
    root: process.cwd(),
    quiet: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--quiet' || arg === '-q') opts.quiet = true;
    else if (arg === '--port' || arg === '-p') opts.port = Number(argv[++i]);
    else if (arg === '--host') opts.host = argv[++i];
    else if (arg === '--root') opts.root = argv[++i];
    else if (/^\d+$/.test(arg)) opts.port = Number(arg); // `npm run serve -- 9000`
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!Number.isInteger(opts.port) || opts.port < 0 || opts.port > 65535) {
    throw new Error(`not a port: ${opts.port}`);
  }
  return opts;
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    console.error(`${err.message}\n\n${USAGE}`);
    process.exit(2);
  }

  if (opts.help) {
    console.log(USAGE);
    return;
  }

  const root = resolve(opts.root);
  const server = createServer({ root, quiet: opts.quiet });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `port ${opts.port} is already in use — something else is serving there.\n` +
        `Stop it, or pick another:  npm run serve -- --port ${opts.port + 1}`,
      );
    } else if (err.code === 'EACCES') {
      console.error(`not allowed to bind ${opts.host}:${opts.port} — try a port above 1024.`);
    } else {
      console.error(err.message);
    }
    process.exit(1);
  });

  server.listen(opts.port, opts.host, () => {
    const { port } = server.address();
    const shown = opts.host === '0.0.0.0' || opts.host === '::' ? DEFAULT_HOST : opts.host;
    console.log(`serving ${root}`);
    console.log(`         http://${shown}:${port}/`);
    if (shown !== opts.host) {
      console.log(`         bound to ${opts.host} — reachable from your network`);
    }
    console.log('Ctrl-C to stop');
  });

  process.on('SIGINT', () => {
    console.log('');
    server.close(() => process.exit(0));
    // A browser holding a keep-alive socket would otherwise keep us alive.
    setTimeout(() => process.exit(0), 250).unref();
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
