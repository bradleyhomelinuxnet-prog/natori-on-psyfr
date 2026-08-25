/**
 * The Vortex Holography Filter, tested.
 *
 * The Ophis documentation says the numbers 1..15000 were each "subtracted from a
 * holographic reflection of itself"; ~95% collapse to zero and the rest "reduce
 * to a very astonishing series of numbers that continually loop upon themselves",
 * "patterned in 9 and 11-dimensional distributions".
 *
 * That describes reverse-and-subtract: n -> |n - reverse(n)|, iterated.
 * This script runs it and checks every claim made about the result.
 *
 *   node tools/vortex-analysis.mjs
 */

const LIMIT = 15000;

const reverse = (n) => Number(String(n).split('').reverse().join(''));

/** Iterate |n - reverse(n)| until it reaches 0 or revisits a value. */
function trajectory(n) {
  const seen = new Map();
  let cur = n;
  let steps = 0;
  while (true) {
    if (cur === 0) return { end: 0, steps, cycle: null };
    if (seen.has(cur)) {
      const start = seen.get(cur);
      const cycle = [...seen.keys()].slice(start);
      return { end: Math.min(...cycle), steps, cycle };
    }
    seen.set(cur, seen.size);
    cur = Math.abs(cur - reverse(cur));
    steps++;
    if (steps > 500) return { end: null, steps, cycle: null }; // runaway guard
  }
}

const toZero = [];
const basins = new Map(); // smallest cycle member -> [n, ...]
const stepsFor = new Map();

for (let n = 1; n <= LIMIT; n++) {
  const t = trajectory(n);
  if (t.end === 0) {
    toZero.push(n);
  } else if (t.end !== null) {
    if (!basins.has(t.end)) basins.set(t.end, []);
    basins.get(t.end).push(n);
    stepsFor.set(n, t.steps);
  }
}

const pct = (a, b) => ((a / b) * 100).toFixed(2) + '%';

console.log(`=== reverse-and-subtract over 1..${LIMIT} ===\n`);
console.log(`collapse to zero : ${toZero.length} (${pct(toZero.length, LIMIT)})`);
const nonZero = LIMIT - toZero.length;
console.log(`do NOT collapse  : ${nonZero} (${pct(nonZero, LIMIT)})`);
console.log(`\ndocumentation says "about 95%" collapse to zero.\n`);

console.log(`=== attractors found ===`);
for (const [end, members] of [...basins].sort((a, b) => b[1].length - a[1].length)) {
  const t = trajectory(end);
  console.log(`  basin ${end}: ${members.length} numbers · cycle [${t.cycle.join(' -> ')}]`);
}

const basin2178 = basins.get(2178) ?? [];
console.log(`\n=== the 2178 basin ===`);
console.log(`members in 1..${LIMIT}: ${basin2178.length}   (claim: 636)`);

const notDiv11 = basin2178.filter((n) => n % 11 !== 0);
console.log(`divisible by 11    : ${basin2178.length - notDiv11.length}/${basin2178.length}` +
  (notDiv11.length ? `  EXCEPTIONS: ${notDiv11.slice(0, 12).join(', ')}` : '  (all)'));

const steps = basin2178.map((n) => stepsFor.get(n));
const stepHist = {};
for (const s of steps) stepHist[s] = (stepHist[s] ?? 0) + 1;
console.log(`permutations to reach the loop:`,
  Object.entries(stepHist).map(([k, v]) => `${k}:${v}`).join('  '),
  `  (claim: every member takes 1-4)`);

const gaps = new Set();
for (let i = 1; i < basin2178.length; i++) gaps.add(basin2178[i] - basin2178[i - 1]);
console.log(`gaps between members: {${[...gaps].sort((a, b) => a - b).join(', ')}}` +
  `   (claim: 11, 22 or 33)`);

console.log(`\n=== the loop itself ===`);
for (const n of [2178, 4356, 6534, 8712]) {
  const r = reverse(n);
  const digitRoot = (x) => ((x - 1) % 9) + 1;
  console.log(`  ${n} = 99 x ${n / 99}  ·  reverse ${r}  ·  |n-rev| = ${Math.abs(n - r)}` +
    `  ·  digital root ${digitRoot(n)}`);
}

/* ---------------------------------------------------------------------------
 * The claims above are stated without a domain. Test the obvious candidate:
 * FOUR-DIGIT numbers only, where reverse-and-subtract is closed and the
 * classical Kaprekar-style results live.
 * ------------------------------------------------------------------------- */
console.log(`\n\n=== restricted to 4-digit numbers (1000..9999) ===\n`);

const four = { zero: [], basin: new Map(), steps: new Map() };
for (let n = 1000; n <= 9999; n++) {
  const t = trajectory(n);
  if (t.end === 0) four.zero.push(n);
  else if (t.end !== null) {
    if (!four.basin.has(t.end)) four.basin.set(t.end, []);
    four.basin.get(t.end).push(n);
    four.steps.set(n, t.steps);
  }
}
const TOTAL4 = 9000;
console.log(`collapse to zero : ${four.zero.length} (${pct(four.zero.length, TOTAL4)})`);
console.log(`do NOT collapse  : ${TOTAL4 - four.zero.length} (${pct(TOTAL4 - four.zero.length, TOTAL4)})`);

const b4 = four.basin.get(2178) ?? [];
console.log(`\n2178 basin       : ${b4.length}   (claim: 636)`);
const nd11 = b4.filter((n) => n % 11 !== 0);
console.log(`divisible by 11  : ${b4.length - nd11.length}/${b4.length}` +
  (nd11.length ? `  EXCEPTIONS: ${nd11.slice(0, 10).join(', ')}` : '  — all of them'));

const h4 = {};
for (const n of b4) h4[four.steps.get(n)] = (h4[four.steps.get(n)] ?? 0) + 1;
console.log(`permutations     : ` + Object.entries(h4).map(([k, v]) => `${k} step${k === '1' ? '' : 's'}: ${v}`).join(' · ') +
  `   (claim: 1-4)`);

const g4 = new Set();
for (let i = 1; i < b4.length; i++) g4.add(b4[i] - b4[i - 1]);
console.log(`gaps             : {${[...g4].sort((a, b) => a - b).join(', ')}}   (claim: 11, 22, 33)`);

console.log(`\n=== the MSRF "vortex numbers" decoded ===`);
// The desktop build's MSRF_FILTER__VORTEX, from src/ophis_model__params.js.
// These read as TRUNCATED decimal scalings of the 99-family: 21.7 <- 21.78 <- 2178.
const VORTEX = [21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4, 762.3, 871.2];
const LOOP = new Set([2178, 4356, 6534, 8712]);
/** Truncate (not round) x to `dp` decimal places, the way the table was written. */
const trunc = (x, dp) => Math.trunc(x * 10 ** dp) / 10 ** dp;

for (const v of VORTEX) {
  // Every entry is a 4-digit multiple of 99, shifted by a power of ten and
  // TRUNCATED to one decimal: 2178 -> 21.78 -> "21.7".
  let found = null;
  let how = '';
  outer: for (let m = 99 * 11; m <= 9999; m += 99) {
    for (const [scale, dp] of [[100, 1], [10, 1]]) {
      if (trunc(m / scale, dp) === v || m / scale === v) {
        found = m;
        how = `${m}/${scale}`;
        break outer;
      }
    }
  }
  const tag = found ? (LOOP.has(found) ? '[loop member]' : '[99-family]') : '';
  console.log(
    `  ${String(v).padStart(6)}  ->  ${String(found ?? '?').padStart(4)}  = 99 x ${found ? String(found / 99).padStart(2) : '??'}` +
      `   via ${how.padEnd(9)} ${tag}`
  );
}

console.log(`
CONCLUSION
  The MSRF "vortex numbers" are the 2178 orbit family — the 4-digit multiples of
  99 that survive reverse-and-subtract — written at two decimal scalings and
  truncated to one place. They are not arbitrary constants, and they were never
  meant to match a raw day count: 217.8 is 2178 wearing a decimal point.`);
