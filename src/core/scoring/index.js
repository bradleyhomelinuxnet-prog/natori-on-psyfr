/**
 * Scoring: turn a projected date into points plus the tags that explain them.
 */

import { computeTraits, TRAIT_META } from './traits.js';
import { getLens } from './lenses.js';

export { TRAIT_META } from './traits.js';
export { LENSES, DEFAULT_LENS, lensList, getLens } from './lenses.js';

/** A tag is [displayLabel, cssClass] — the shape the results table renders. */
export function tagFor(key, suffix) {
  const meta = TRAIT_META[key];
  return [suffix ? `${meta.label} ${suffix}` : meta.label, meta.cls];
}

/**
 * Score one projected date against a lens.
 *
 * @param {number} astroYear
 * @param {number} J Julian Day Number
 * @param {string} lensId
 * @param {number} referenceYear the year the Metonic test measures from
 * @returns {{pts: number, tags: Array<[string,string]>, met: boolean}}
 */
export function scoreDate(astroYear, J, lensId, referenceYear) {
  const lens = getLens(lensId);
  const { active, metonic } = computeTraits(astroYear, J, referenceYear);

  let pts = 0;
  const tags = [];
  for (const [key, points] of lens.order) {
    if (!active.has(key)) continue;
    pts += points;
    tags.push(tagFor(key));
  }

  // `met` drives the 19·METONIC filter chip, which also accepts a bare 19.
  return { pts, tags, met: metonic || active.has('s19') };
}
