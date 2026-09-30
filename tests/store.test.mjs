/**
 * The origin's stored state, and the button that clears it.
 *
 * Separate from the parity suite on purpose: that suite's count is the contract
 * with the original program, and browser storage was never part of the original.
 * It still has to pass.
 *
 * The reason any of this exists: localStorage is scoped to an ORIGIN, not a
 * path. Every "it works on this host but not that one" report against this app
 * has come back to a saved document rather than to a different file — and until
 * the About screen grew a Clear saved data button, the only way out of a stuck
 * document was the browser's developer tools.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SOURCE = new URL('../src/state/ophis-store.js', import.meta.url);

/**
 * A fresh module instance over a fresh storage stub.
 *
 * The store is a singleton and `clearStoredState()` disables writing for the
 * life of the module, so a test that needs to write cannot run after one that
 * cleared. The query string is what buys a new instance from node's loader.
 */
let seq = 0;
async function freshStore(seed = {}) {
  const map = new Map(Object.entries(seed));
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    get length() { return map.size; },
  };
  const mod = await import(`../src/state/ophis-store.js?t=${++seq}`);
  return { mod, map };
}

/* ----------------------------------------------------------- what it finds -- */

test('storedKeysInUse reports only the keys that hold something', async () => {
  const { mod } = await freshStore({
    'psyfr:document': '{"iso_events":[]}',
    'ophion-theme': 'dark',
  });

  assert.deepEqual(mod.storedKeysInUse(), ['psyfr:document', 'ophion-theme']);
});

test('storedKeysInUse is empty on an origin that has never run the app', async () => {
  const { mod } = await freshStore();
  assert.deepEqual(mod.storedKeysInUse(), []);
});

/* --------------------------------------------------------------- clearing -- */

test('clearStoredState removes every stored key and names what it removed', async () => {
  const { mod, map } = await freshStore({
    'psyfr:document': '{"iso_events":[]}',
    'psyfr:options': '{"theme":"dark"}',
    'save_blob': '{"legacy":true}',
    'ophion-zoom': '1.2',
  });

  const removed = mod.clearStoredState();

  assert.deepEqual(
    removed.sort(),
    ['ophion-zoom', 'psyfr:document', 'psyfr:options', 'save_blob'].sort()
  );
  assert.equal(map.size, 0, 'nothing is left behind');
});

test('clearing leaves another site’s keys alone', async () => {
  const { mod, map } = await freshStore({
    'psyfr:document': '{"iso_events":[]}',
    'some-other-app:session': 'keep me',
  });

  mod.clearStoredState();

  assert.equal(map.get('some-other-app:session'), 'keep me');
  assert.equal(map.has('psyfr:document'), false);
});

/**
 * Finding nothing is an answer rather than a failure. An empty result is how
 * the About screen can say "nothing was saved under this address", which tells
 * the user that whatever differs between this copy and another one is the file
 * — not the data. Reporting a removal that did not happen would hide that.
 */
test('clearing an empty origin reports that it removed nothing', async () => {
  const { mod } = await freshStore();
  assert.deepEqual(mod.clearStoredState(), []);
});

/* ------------------------------------------------ the beforeunload trap -- */

/**
 * `src/ophis-app.js` persists the document and the options on `beforeunload`.
 * Clearing is followed by a reload to make it visible, which fires that handler
 * — so without the write guard the reset writes back exactly what it just
 * removed and the button does nothing. That is the failure it exists to end, so
 * it is pinned here rather than left to a reviewer's memory.
 */
test('nothing can write storage again after a clear', async () => {
  const { mod, map } = await freshStore({ 'psyfr:document': '{"iso_events":[]}' });

  mod.clearStoredState();
  assert.equal(map.size, 0);

  // Exactly what the beforeunload handler calls, in the same order.
  mod.persistDocument();
  mod.saveOptions();

  assert.equal(map.size, 0, 'the reload must not resurrect the cleared document');
});

test('writes work normally before a clear, so the guard is not always-on', async () => {
  const { mod, map } = await freshStore();

  mod.saveOptions();

  assert.equal(map.has('psyfr:options'), true, 'saving works on an untouched origin');
});

/* ------------------------------------------------------------- coverage -- */

/**
 * A key added to the store's KEY map, or written directly by name, that nobody
 * adds to STORED_KEYS is a key the Clear button silently leaves behind — and
 * one stale key is enough to bring a stuck document back. Read the source and
 * hold the two lists together, so adding a key without clearing it fails here
 * instead of on someone's deployed page.
 */
test('STORED_KEYS covers every key the store actually touches', async () => {
  const { mod } = await freshStore();
  const src = readFileSync(SOURCE, 'utf8');

  const keyMap = src.match(/const KEY = \{([\s\S]*?)\};/);
  assert.ok(keyMap, 'the KEY map is still declared the way this test reads it');
  const declared = [...keyMap[1].matchAll(/:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(declared.length >= 6, `expected the KEY map to hold several keys, saw ${declared.length}`);

  // Keys written or read by literal name rather than through the KEY map.
  const literal = [...src.matchAll(/localStorage\.(?:get|set|remove)Item\(\s*'([^']+)'/g)]
    .map((m) => m[1]);

  for (const key of new Set([...declared, ...literal])) {
    assert.ok(
      mod.STORED_KEYS.includes(key),
      `"${key}" is used by the store but Clear saved data would leave it behind`
    );
  }
});
