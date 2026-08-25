/**
 * Constants for the `ophis` reckoning.
 *
 * Kept separate from the chronicon lattice on purpose: the two reckonings
 * disagree on values that share a name (OPH_PHI, the synodic month), and every
 * previous attempt to unify them moved results. Never unify.
 */

export const MILLIS_PER_MINUTE = 60_000;
export const MILLIS_PER_HOUR = 3_600_000;
export const MILLIS_PER_DAY = 86_400_000;

export const MINIMUM_NUMBER_OF_X_DATES = 2;
export const MINIMUM_OPERATIONS_REQUIRED = 1;
export const MINIMUM_DAYS_BETWEEN_X_DATES = 1;
export const MAX_CALENDAR_YEAR = 9999;

/** Upper clamps only — a negative Y is deliberately not clamped. ~100 years. */
export const MAXIMUM_ROTATION_COUNT_Y = 36_500;
export const MAXIMUM_ROTATION_COUNT_Z = 36_500;

/** The Y an equation is compiled against to prove it evaluates. */
export const SAMPLE_Y_VALUE_FOR_VALIDATION = 10;

export const DECIMAL_PRECISION__TIME = 2;
export const DECIMAL_PRECISION__AXIAL_ROTATIONS = 1;
export const DECIMAL_PRECISION__SCORE = 2;
export const DECIMAL_PRECISION__LOCATION = 1;

export const LAT_LIMIT = 65;
export const LONG_LIMIT = 180;

export const TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE = '00:00';

/** Ophis's own synodic month — NOT the chronicon one (29.530588853). */
export const SYNODIC_MONTH = 29.53058770576;
export const LUNAR_DATE_MATCH_TOLERANCE = 86_400_000;
/** ±1.25 days. The v12 tooltips said "1 day"; the code said this. The code wins. */
export const ECLIPSE_DATE_MATCH_TOLERANCE = 108_000_000;

/** Operation match points, by the type the compiler assigns. */
export const POINTS__ALPHA_OPERATION_MATCH = 1;
export const POINTS__BETA_OPERATION_MATCH = 0.5;

/** Formula constants for this reckoning. OPH_PHI is the short form here. */
export const OPHIS_CONSTANTS = {
  OPH_PI: 3.14,
  OPH_PHI: 1.618,
  OPH_CRV: 5.08,
  OPH_HEP: 7.01,
};

/** Event scopes. MONTHS and YEARS are declared but refuse to run — as in the original. */
export const EVENT_SCOPE = {
  HH_MM: 'EVENT_SCOPE__HH_MM',
  DAYS: 'EVENT_SCOPE__DAYS',
  MONTHS: 'EVENT_SCOPE__MONTHS',
  YEARS: 'EVENT_SCOPE__YEARS',
};

/** Purely cosmetic in the original — kept so a `.oph` round-trips. Inert here. */
export const EVENT_TYPE = {
  PERSONAL: 'EVENT_TYPE__PERSONAL',
  MARKETS: 'EVENT_TYPE__MARKETS',
  ASTROLOGICAL: 'EVENT_TYPE__ASTROLOGICAL',
};

export const SCORING_SYSTEM = {
  GTE_V8: 'SCORING_SYSTEM__GTE_V8',
  LTE_V7: 'SCORING_SYSTEM__LTE_V7',
};

export const SORT_TYPE = {
  DATE: 'SORT_TYPE__DATE',
  SCORE: 'SORT_TYPE__SCORE',
  MSRF: 'SORT_TYPE__MSRF',
  HIT_COUNT: 'SORT_TYPE__HIT_COUNT',
  OPERATIONS: 'SORT_TYPE__OPERATIONS',
  /** New. The behaviour v12's tooltip promised and its code never delivered. */
  OPERATION_SCORE: 'SORT_TYPE__OPERATION_SCORE',
};

/** Error strings the UI depends on. Verbatim — do not reword. */
export const ERRORS = {
  MIN_X_DATES: 'At least 2 X-Dates are required.',
  SCOPE_MONTHS: 'Month-based projections may be supported in a future version.',
  SCOPE_YEARS: 'Year-based projections may be supported in a future version.',
  MIN_OPERATIONS: 'At least 1 Operation is required.',
};
