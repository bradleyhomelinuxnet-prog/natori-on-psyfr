/**
 * Scoring lenses — how much each resonance trait is worth.
 *
 * MOD POINT — a lens is pure data. Add one here and it appears in the UI's lens
 * selector automatically; no other file changes.
 *
 * `order` is an ordered list of [traitKey, points]. The order controls BOTH the
 * arithmetic and the sequence tags appear in on a result row, which is why the
 * two shipped lenses list the same traits in different orders.
 *
 * Traits not listed score nothing and show no tag.
 */

export const LENSES = {
  V8: {
    id: 'V8',
    label: 'V8 · Chronology-first',
    note: 'V8 weights Phoenix nodes & documented events highest.',
    order: [
      ['phx', 5],
      ['near', 2],
      ['doc', 5],
      ['pal', 3],
      ['met', 2],
      ['s138', 2],
      ['s19', 1],
      ['nem', 1],
      ['ner', 1],
      ['bak', 1],
    ],
    // Applied during the cast, after the trait pass.
    msrf: 2,
    solar: 2,
    lunar: 1,
  },

  V7: {
    id: 'V7',
    label: 'V7 · Numbers-first',
    note: 'V7 weights the numerals — 138, palindromes and 19 — highest.',
    order: [
      ['s138', 4],
      ['pal', 4],
      ['s19', 2],
      ['met', 2],
      ['phx', 2],
      ['near', 1],
      ['doc', 1],
      ['nem', 1],
      ['ner', 1],
      ['bak', 1],
    ],
    msrf: 3,
    solar: 2,
    lunar: 1,
  },
};

export const DEFAULT_LENS = 'V8';

export const lensList = () => Object.values(LENSES);

export function getLens(id) {
  return LENSES[id] ?? LENSES[DEFAULT_LENS];
}
