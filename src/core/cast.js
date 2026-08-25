/**
 * The cast: anchors + operations -> scored, ranked projections.
 *
 * The shape of the calculation, which the original fixed and this preserves:
 *
 *   for every unordered PAIR of enabled anchors (x1 = the earlier in LIST order)
 *     Y = |x2.jd - x1.jd|                       whole days, no time of day
 *     for every enabled operation
 *       offset = op.fn(Y)
 *       base   = the anchor named by the operation's X1+/X2+ prefix
 *       ZJD    = round(base.jd + offset)
 *
 * Two details are easy to get wrong and are load-bearing:
 *   - Pairing is ALL pairs, not adjacent ones. N anchors give N(N-1)/2 pairs.
 *   - x1 is the lower-INDEXED anchor, not the chronologically earlier one, so
 *     reordering the anchor list changes which date `X1+` binds to.
 */

import { jdToDate } from './jdn.js';
import { am, lcYear } from './cycles.js';
import { scoreDate, tagFor, getLens } from './scoring/index.js';
import { eclipseNear, coverage, ECL_TYPE_NAME } from './eclipses.js';
import { MSRF } from '../data/msrf.js';

/** Guard rails, so a pathological equation cannot spin the loop forever. */
export const LIMITS = {
  minY: 1,
  maxY: 3_000_000,
  minYear: -5400,
  maxYear: 4000,
  /** Days either side of a projection that still counts as an eclipse hit. */
  eclipseTolerance: 1,
  /** Days either side of an input anchor that make a projection an echo. */
  echoTolerance: 1,
};

/**
 * @param {Array<{enabled:boolean, jd:number, label:string}>} anchors
 * @param {Array<{enabled:boolean, eq:string, start:'X1'|'X2', fn:(Y:number)=>number}>} operations
 * @param {string} lensId
 * @param {number} referenceYear the "today" the Metonic test measures from
 * @returns {Array<object>} results, ranked
 */
export function cast(anchors, operations, lensId, referenceYear) {
  const A = anchors.filter((a) => a.enabled);
  const O = operations.filter((o) => o.enabled);
  const lens = getLens(lensId);
  const anchorJDs = A.map((a) => a.jd);
  const { min: eclMin, max: eclMax } = coverage();

  const results = [];
  const seen = new Set();

  for (let i = 0; i < A.length; i++) {
    for (let k = 0; k < i; k++) {
      const x1 = A[k];
      const x2 = A[i];
      const Y = Math.abs(x2.jd - x1.jd);
      if (Y < LIMITS.minY || Y > LIMITS.maxY) continue;

      for (const op of O) {
        let off;
        try {
          off = op.fn(Y);
        } catch {
          continue;
        }
        if (!Number.isFinite(off)) continue;

        const baseJD = op.start === 'X1' ? x1.jd : x2.jd;
        const ZJD = Math.round(baseJD + off);
        const zd = jdToDate(ZJD);
        if (zd.year < LIMITS.minYear || zd.year > LIMITS.maxYear) continue;

        // Keyed on the pair too, so the same date from the same operation via a
        // different pair is kept — those repeats are signal, not noise.
        const key = `${ZJD}|${op.eq}|${x1.jd}|${x2.jd}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const sc = scoreDate(zd.year, ZJD, lens.id, referenceYear);

        // MSRF resonance matches on EITHER the interval or the offset.
        const offAbs = Math.abs(Math.round(off));
        if (MSRF.has(Y) || MSRF.has(offAbs)) {
          sc.pts += lens.msrf;
          sc.tags.push(tagFor('msrf'));
        }

        const echo = anchorJDs.some((jd) => Math.abs(jd - ZJD) <= LIMITS.echoTolerance);
        if (echo) sc.tags.push(tagFor('echo'));

        let solar = null;
        let lunar = null;
        if (ZJD >= eclMin && ZJD <= eclMax) {
          const ecl = eclipseNear(ZJD, LIMITS.eclipseTolerance);
          if (ecl.solar) {
            solar = ECL_TYPE_NAME[ecl.solar];
            sc.pts += lens.solar;
            sc.tags.push(tagFor('sol', solar));
          }
          if (ecl.lunar) {
            lunar = ECL_TYPE_NAME[ecl.lunar];
            sc.pts += lens.lunar;
            sc.tags.push(tagFor('lun', lunar));
          }
        }

        results.push({
          zjd: ZJD,
          ay: zd.year,
          m: zd.month,
          d: zd.day,
          am: am(zd.year),
          lc: lcYear(zd.year),
          op: op.eq,
          Y,
          x1: x1.label,
          x2: x2.label,
          score: sc.pts,
          tags: sc.tags,
          met: sc.met,
          echo,
          solar,
          lunar,
        });
      }
    }
  }

  results.sort((a, b) => b.score - a.score || a.zjd - b.zjd);
  return results;
}
