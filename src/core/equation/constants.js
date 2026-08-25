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
  /* --- the original four --- */
  OPH_PHI: 1.61803398875, // golden ratio
  OPH_PI: 3.14, // NOT Math.PI — truncated, as the original
  OPH_CRV: 5.08, // Ophis "curve" constant
  OPH_HEP: 7.83, // hepta-cycle (from the v12 desktop engine)

  /* --- eclipse cycles, in days --- */
  OPH_SAROS: 6585.3211, // 18.03 yr — eclipses repeat in near-identical geometry
  OPH_INEX: 10571.95, // 28.94 yr — the Saros complement
  OPH_LUNATION: 29.530588853, // mean synodic month

  /* --- year lengths, in days --- */
  OPH_YEAR_TROPICAL: 365.24219,
  OPH_YEAR_SIDEREAL: 365.256363,
  OPH_YEAR_ANOMALISTIC: 365.259636,
  OPH_YEAR_IDEAL: 360, // the "ideal" 360-day year of the thesis

  /* --- long cycles, in years --- */
  OPH_SOTHIC: 1461, // Egyptian Sothic cycle
  OPH_PRECESSION: 25772, // one precession of the equinoxes
  OPH_JUPSAT: 19.86, // Jupiter–Saturn great conjunction

  /* --- planetary returns, in years --- */
  OPH_SATURN: 29.4571,
  OPH_JUPITER: 11.862,
  OPH_URANUS: 84.0205,
  OPH_CHIRON: 50.42,

  /* --- mathematics --- */
  OPH_E: 2.718281828459045,
  OPH_TAU: 6.283185307179586,
};

/** Human-readable notes, shown in the equation editor and under Method. */
export const CONSTANT_NOTES = {
  OPH_PHI: 'Golden ratio φ',
  OPH_PI: 'π truncated to 3.14 (as the original — not Math.PI)',
  OPH_CRV: 'Ophis curve constant',
  OPH_HEP: 'Hepta-cycle constant',
  OPH_SAROS: 'Saros eclipse cycle · 6585.32 days (18.03 yr)',
  OPH_INEX: 'Inex eclipse cycle · 10571.95 days (28.94 yr)',
  OPH_LUNATION: 'Mean synodic month · 29.5306 days',
  OPH_YEAR_TROPICAL: 'Tropical year · 365.24219 days',
  OPH_YEAR_SIDEREAL: 'Sidereal year · 365.25636 days',
  OPH_YEAR_ANOMALISTIC: 'Anomalistic year · 365.25964 days',
  OPH_YEAR_IDEAL: 'The ideal 360-day year',
  OPH_SOTHIC: 'Sothic cycle · 1461 years',
  OPH_PRECESSION: 'Precession of the equinoxes · 25772 years',
  OPH_JUPSAT: 'Jupiter–Saturn great conjunction · 19.86 years',
  OPH_SATURN: 'Saturn return · 29.4571 years',
  OPH_JUPITER: 'Jupiter return · 11.862 years',
  OPH_URANUS: 'Uranus return · 84.0205 years',
  OPH_CHIRON: 'Chiron return · 50.42 years',
  OPH_E: "Euler's number e",
  OPH_TAU: 'τ — one full turn in radians',
};
