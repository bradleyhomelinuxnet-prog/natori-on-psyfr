/**
 * Named constants available inside an operation equation.
 *
 * MOD POINT — add a constant here and it is immediately usable in equations,
 * in every pack, and in the equation editor's autocomplete. Nothing else changes.
 *
 * These values are the ones the original Ophis shipped. Two of them are not the
 * textbook figures and that is deliberate: OPH_PI is the truncated 3.14 rather
 * than Math.PI, and OPH_CRV is Ophis's own "curve" constant. Substituting more
 * precise values silently changes every projection, so they stay as-is.
 */
export const CONSTANTS = {
  OPH_PHI: 1.61803398875, // golden ratio
  OPH_PI: 3.14, // NOT Math.PI — truncated, as the original
  OPH_CRV: 5.08, // Ophis "curve" constant
  OPH_HEP: 7.83, // hepta-cycle (from the v12 desktop engine)
};

/** Human-readable notes, shown in the equation editor. */
export const CONSTANT_NOTES = {
  OPH_PHI: 'Golden ratio φ',
  OPH_PI: 'π truncated to 3.14 (as the original — not Math.PI)',
  OPH_CRV: 'Ophis curve constant',
  OPH_HEP: 'Hepta-cycle constant',
};
