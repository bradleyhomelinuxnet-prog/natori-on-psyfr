/**
 * Resonance traits — the yes/no properties a projected date can have.
 *
 * A trait is scored only if the active lens assigns it points, so adding a trait
 * here is safe: existing lenses simply ignore it until you give it a value.
 *
 * MOD POINT — add a trait here, then give it points in ../scoring/lenses.js.
 */

import { mod, isPalindrome } from '../jdn.js';
import { am, lcYear, phoenixInfo, nemesisInfo, nerInfo, isMetonic } from '../cycles.js';
import { MAY_NODES } from '../../data/lattice.js';
import { EVENT_YEARS } from '../../data/ledger.js';

/** Label and CSS class for every trait, including the ones added during a cast. */
export const TRAIT_META = {
  phx: { label: 'PHOENIX NODE', cls: 'phx' },
  near: { label: '≈PHOENIX', cls: 'phx' },
  doc: { label: 'DOCUMENTED', cls: 'ev' },
  pal: { label: 'PALINDROME ⮌', cls: 'pal' },
  met: { label: 'METONIC·19', cls: 'met' },
  s138: { label: '138', cls: 's138' },
  s19: { label: '19', cls: 's19' },
  nem: { label: 'NEMESIS', cls: 'nem' },
  ner: { label: 'NER NODE', cls: 'ner' },
  bak: { label: 'BAKTUN', cls: 'bak' },
  msrf: { label: 'MSRF', cls: 'msrf' },
  echo: { label: 'ECHO', cls: 'echo' },
  sol: { label: '☉ SOLAR', cls: 'sol' },
  lun: { label: '☾ LUNAR', cls: 'lun' },
};

/**
 * Compute every trait a date carries, independent of any lens.
 *
 * @param {number} astroYear
 * @param {number} J Julian Day Number
 * @param {number} referenceYear the "today" the Metonic test is measured from
 * @returns {{active: Set<string>, metonic: boolean}}
 */
export function computeTraits(astroYear, J, referenceYear) {
  const A = am(astroYear);
  const L = lcYear(astroYear);
  const displayYear = astroYear <= 0 ? 1 - astroYear : astroYear;
  const ph = phoenixInfo(astroYear);

  const active = new Set();

  // Phoenix node and its ±2yr neighbourhood are mutually exclusive.
  if (ph.node) active.add('phx');
  else if (Math.min(ph.into, ph.to) <= 2) active.add('near');

  if (EVENT_YEARS.has(astroYear)) active.add('doc');

  // A palindrome in ANY of the three readings of the moment counts.
  if (isPalindrome(displayYear) || isPalindrome(A) || isPalindrome(J)) active.add('pal');

  const metonic = isMetonic(astroYear, referenceYear);
  if (metonic) active.add('met');

  // Digit-presence tests, not divisibility — the thesis reads the numerals.
  if (String(L).includes('138') || String(A).includes('138') || String(displayYear).includes('138')) {
    active.add('s138');
  }
  if (String(displayYear).includes('19') || String(A).includes('19')) active.add('s19');

  if (nemesisInfo(astroYear).inner) active.add('nem');
  if (nerInfo(astroYear).off === 0) active.add('ner');
  if (MAY_NODES.includes(astroYear)) active.add('bak');

  return { active, metonic };
}
