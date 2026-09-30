/**
 * The development server, checked against the things a static server gets wrong.
 *
 *   npm run test:serve
 *
 * Deliberately NOT part of `npm test`. That suite is the parity contract — it
 * pins the engine against the original program and its count is quoted in the
 * documentation — and a web server has no business raising or lowering that
 * number. This runs beside it.
 *
 * What is worth pinning here is not "it serves a file". It is the content type
 * on an ES module (the wrong one and the app does not boot at all), the
 * trailing-slash redirect (without it every relative URL under docs/html
 * resolves one directory too high), and the traversal refusals, which are the
 * kind of thing everyone believes is handled until someone checks.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, contentType } from '../tools/serve.mjs';

/** Start the server on an ephemeral port; returns a fetcher and a stop(). */
async function serving(root) {
  const server = createServer({ root, quiet: true });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const { port } = server.address();
  return {
    get: (path, init) => fetch(`http://127.0.0.1:${port}${path}`, { redirect: 'manual', ...init }),
    stop: () => new Promise((ok) => {
      // fetch() holds the socket open; without this every close waits out the
      // keep-alive timeout and the suite takes seconds instead of milliseconds.
      server.closeAllConnections();
      server.close(ok);
    }),
  };
}

/**
 * A throwaway tree with a secret one level above the root, so an escape is
 * provable rather than assumed. Serving the repository itself could not tell
 * the difference between "refused" and "there was nothing there anyway".
 */
async function fixture() {
  const base = await mkdtemp(join(tmpdir(), 'ophis-serve-'));
  const root = join(base, 'root');
  await mkdir(join(root, 'sub'), { recursive: true });
  await writeFile(join(base, 'secret.txt'), 'ESCAPED\n');
  await writeFile(join(root, 'index.html'), '<!doctype html><title>root</title>\n');
  await writeFile(join(root, 'app.js'), 'export const x = 19;\n');
  await writeFile(join(root, 'mod.mjs'), 'export const y = 138;\n');
  await writeFile(join(root, 'tokens.css'), ':root { --a: 1; }\n');
  await writeFile(join(root, 'tile.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  await writeFile(join(root, 'sub', 'index.html'), '<!doctype html><title>sub</title>\n');
  return { base, root };
}

test('the repository root serves index.html as HTML', async () => {
  const { root } = await fixture();
  const s = await serving(root);
  try {
    const res = await s.get('/');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.match(await res.text(), /<title>root<\/title>/);
  } finally {
    await s.stop();
  }
});

test('scripts and stylesheets go out as types a browser will execute', async () => {
  const { root } = await fixture();
  const s = await serving(root);
  try {
    // The one that matters: a module served as text/plain or octet-stream is
    // refused by the module loader and the app never boots.
    for (const path of ['/app.js', '/mod.mjs']) {
      const res = await s.get(path);
      assert.equal(res.status, 200, path);
      assert.equal(res.headers.get('content-type'), 'text/javascript; charset=utf-8', path);
    }
    assert.equal((await s.get('/tokens.css')).headers.get('content-type'), 'text/css; charset=utf-8');
    assert.equal((await s.get('/tile.jpg')).headers.get('content-type'), 'image/jpeg');
  } finally {
    await s.stop();
  }
});

test('an unknown extension is not guessed at', () => {
  assert.equal(contentType('a/b/notes.oph'), 'application/octet-stream');
  assert.equal(contentType('assets/map/0/0/0.JPG'), 'image/jpeg');
});

test('a directory without the trailing slash redirects instead of serving', async () => {
  const { root } = await fixture();
  const s = await serving(root);
  try {
    const res = await s.get('/sub');
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/sub/');

    const followed = await s.get('/sub/');
    assert.equal(followed.status, 200);
    assert.match(await followed.text(), /<title>sub<\/title>/);
  } finally {
    await s.stop();
  }
});

test('nothing outside the root is reachable', async () => {
  const { base, root } = await fixture();
  await symlink(join(base, 'secret.txt'), join(root, 'link.txt'));
  const s = await serving(root);
  try {
    for (const path of [
      '/../secret.txt',
      '/%2e%2e/secret.txt',
      '/sub/%2e%2e/%2e%2e/secret.txt',
      '/..%5csecret.txt',
      '/link.txt', // a symlink pointing out of the tree
    ]) {
      const res = await s.get(path);
      assert.ok(res.status === 403 || res.status === 404, `${path} answered ${res.status}`);
      assert.doesNotMatch(await res.text(), /ESCAPED/, `${path} served the file above the root`);
    }
  } finally {
    await s.stop();
  }
});

test('a missing file is a 404, and a directory is never listed', async () => {
  const { root } = await fixture();
  await mkdir(join(root, 'empty'));
  const s = await serving(root);
  try {
    assert.equal((await s.get('/nope.html')).status, 404);
    assert.equal((await s.get('/empty/')).status, 404);
  } finally {
    await s.stop();
  }
});

test('HEAD answers with the headers and no body; other methods are refused', async () => {
  const { root } = await fixture();
  const s = await serving(root);
  try {
    const body = await (await s.get('/')).text();
    const head = await s.get('/', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-length'), String(Buffer.byteLength(body)));
    assert.equal(await head.text(), '');

    const post = await s.get('/', { method: 'POST' });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get('allow'), 'GET, HEAD');
  } finally {
    await s.stop();
  }
});

test('responses are not cached, so an edit is one reload away', async () => {
  const { root } = await fixture();
  const s = await serving(root);
  try {
    const res = await s.get('/app.js');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  } finally {
    await s.stop();
  }
});

test('the real repository boots: index.html, an engine module, a map tile', async () => {
  const s = await serving(process.cwd());
  try {
    const page = await s.get('/index.html');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<title>OPHIS/);

    const engine = await s.get('/src/core/ophis/run.js');
    assert.equal(engine.status, 200);
    assert.equal(engine.headers.get('content-type'), 'text/javascript; charset=utf-8');

    const tile = await s.get('/assets/map/0/0/0.jpg');
    assert.equal(tile.status, 200);
    assert.equal(tile.headers.get('content-type'), 'image/jpeg');
  } finally {
    await s.stop();
  }
});
