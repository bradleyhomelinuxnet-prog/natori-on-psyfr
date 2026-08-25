/**
 * The Vortex Holography Filter.
 *
 * These pin the decode in docs/VORTEX.md: the MSRF "vortex numbers" are
 * four-digit multiples of 99 in the 2178 reverse-and-subtract orbit, written at
 * a decimal scaling. Reproduced with tools/vortex-analysis.mjs.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const reverse = (n) => Number(String(n).split('').reverse().join(''));

/**
 * Iterate |n - reverse(n)| to zero or to a cycle; return the cycle's low member.
 *
 * The cycle is the tail of the visited sequence from the repeat onward — NOT the
 * whole trajectory, which usually dips below the cycle on the way in.
 */
function attractor(n) {
  const order = [];
  const index = new Map();
  let cur = n;
  while (cur !== 0) {
    if (index.has(cur)) return Math.min(...order.slice(index.get(cur)));
    index.set(cur, order.length);
    order.push(cur);
    cur = Math.abs(cur - reverse(cur));
  }
  return 0;
}

test('2178 and 6534 form a closed reverse-and-subtract cycle', () => {
  assert.equal(Math.abs(2178 - reverse(2178)), 6534);
  assert.equal(Math.abs(6534 - reverse(6534)), 2178);
});

test('the loop family is 99 x {22, 44, 66, 88} with digital root 9', () => {
  for (const [n, k] of [[2178, 22], [4356, 44], [6534, 66], [8712, 88]]) {
    assert.equal(n, 99 * k, `${n} = 99 x ${k}`);
    assert.equal(((n - 1) % 9) + 1, 9, `${n} has digital root 9`);
  }
});

test('636 four-digit numbers collapse to 2178, all divisible by 11', () => {
  const basin = [];
  for (let n = 1000; n <= 9999; n++) if (attractor(n) === 2178) basin.push(n);

  assert.equal(basin.length, 637, 'the basin, counting 2178 itself');
  assert.equal(basin.filter((n) => n !== 2178).length, 636, 'the published figure excludes 2178');
  assert.equal(basin.filter((n) => n % 11 !== 0).length, 0, 'every member divides by 11');

  const gaps = new Set();
  for (let i = 1; i < basin.length; i++) gaps.add(basin[i] - basin[i - 1]);
  assert.deepEqual([...gaps].sort((a, b) => a - b), [11, 22, 33]);
});

test('a palindrome multiple of 99 is correctly NOT immortal', () => {
  // 5445 = 99 x 55 collapses immediately, which is why it is absent from the table.
  assert.equal(attractor(5445), 0);
});

test('every MSRF vortex number is a 99-multiple in the 2178 orbit', () => {
  const trunc1 = (x) => Math.trunc(x * 10) / 10;
  const VORTEX = [21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4, 762.3, 871.2];

  const resolved = VORTEX.map((v) => {
    for (let m = 1089; m <= 9999; m += 99) {
      for (const scale of [100, 10]) if (trunc1(m / scale) === v) return m;
    }
    return null;
  });

  assert.equal(resolved.filter(Boolean).length, 12, 'all twelve resolve');
  assert.deepEqual(
    [...new Set(resolved)].sort((a, b) => a - b),
    [2178, 3267, 4356, 6534, 7623, 8712],
    'six distinct numbers: 99 x {22, 33, 44, 66, 77, 88}'
  );
  for (const m of new Set(resolved)) {
    assert.equal(m % 99, 0, `${m} is a multiple of 99`);
    assert.equal(attractor(m), 2178, `${m} reaches the 2178 loop`);
  }
});
