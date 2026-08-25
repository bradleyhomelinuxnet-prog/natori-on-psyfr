/**
 * Numeric primitives for the `ophis` reckoning.
 *
 * The `Number.EPSILON` nudge is the original's, and it is WRONG for negatives:
 * `round1(-1.25)` gives `-1.2` rather than `-1.3`, and `round1(-0.05)` gives
 * `-0`. Both are reachable whenever X2 precedes X1 in the anchor list, which is
 * a supported (if surprising) configuration. Reproduced verbatim — the quirk is
 * `EPSILON_ROUNDING` in the deviation register.
 */

export function roundToPrecision(value, precision) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Y and rotation_count_z. */
export const round1 = (v) => roundToPrecision(v, 1);

/** z_value and score. */
export const round2 = (v) => roundToPrecision(v, 2);

/**
 * The original's display rule for whole numbers: an integer >= 0 gets `.0`
 * appended; negatives and non-integers pass through unchanged.
 */
export function intToDecimalString(v) {
  if (Number.isInteger(v) && v >= 0) return `${v}.0`;
  return String(v);
}
