/**
 * Convergence: where independent operations land on the same date.
 *
 * A single projection is a guess; agreement between unrelated operations is the
 * signal. Clusters keep only those where two or more DISTINCT equations concur.
 */

import { jdToDate } from './jdn.js';
import { am, lcYear } from './cycles.js';

/** Windows offered in the UI. `'year'` buckets by calendar year instead of days. */
export const WINDOWS = [
  { id: '0', label: 'Exact day', tol: 0 },
  { id: '1', label: '± 1 day', tol: 1 },
  { id: '7', label: '± 1 week', tol: 7 },
  { id: '30', label: '± 30 days', tol: 30 },
  { id: '90', label: '± 90 days', tol: 90 },
  { id: 'year', label: 'Same year', tol: 'year' },
];

/**
 * @param {Array<object>} results from cast(), usually with echoes removed
 * @param {number|'year'} tol
 * @returns {Array<object>} clusters, strongest first
 */
export function findConvergences(results, tol) {
  let clusters = [];

  if (tol === 'year') {
    const byYear = new Map();
    for (const r of results) {
      if (!byYear.has(r.ay)) byYear.set(r.ay, []);
      byYear.get(r.ay).push(r);
    }
    clusters = [...byYear.values()];
  } else {
    // Greedy chaining. Note this is transitive: with a 30-day window, dates 30
    // days apart daisy-chain into one cluster that can span far more than 30
    // days. `spanDays` on each cluster exposes exactly that.
    const sorted = [...results].sort((a, b) => a.zjd - b.zjd);
    let cur = null;
    for (const r of sorted) {
      if (cur && r.zjd - cur[cur.length - 1].zjd <= tol) cur.push(r);
      else {
        cur = [r];
        clusters.push(cur);
      }
    }
  }

  return clusters
    .map((items) => {
      const opsSet = new Set(items.map((i) => i.op));
      const pairsSet = new Set(items.map((i) => `${i.x1} → ${i.x2}`));
      const jds = items.map((i) => i.zjd);
      const centerJD = Math.round(jds.reduce((a, b) => a + b, 0) / jds.length);
      const cd = jdToDate(centerJD);
      const best = items.reduce((a, b) => (b.score > a.score ? b : a));

      // Union of tags across the cluster, echoes excluded.
      const tagMap = new Map();
      for (const i of items) {
        for (const t of i.tags) if (t[1] !== 'echo') tagMap.set(t[0], t[1]);
      }

      const minJD = Math.min(...jds);
      const maxJD = Math.max(...jds);

      return {
        centerJD,
        ay: cd.year,
        m: cd.month,
        d: cd.day,
        am: am(cd.year),
        lc: lcYear(cd.year),
        nOps: opsSet.size,
        nPairs: pairsSet.size,
        count: items.length,
        minJD,
        maxJD,
        spanDays: maxJD - minJD,
        bestScore: best.score,
        tags: [...tagMap.entries()],
        ops: [...opsSet],
        pairs: [...pairsSet],
        items,
        allEcho: items.every((i) => i.echo),
      };
    })
    .filter((c) => c.nOps >= 2)
    .sort(
      (a, b) =>
        b.nOps - a.nOps ||
        b.bestScore - a.bestScore ||
        a.spanDays - b.spanDays ||
        a.centerJD - b.centerJD
    );
}
