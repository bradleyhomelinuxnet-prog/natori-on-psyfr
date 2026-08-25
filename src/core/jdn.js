/**
 * Julian Day Numbers and the proleptic Gregorian calendar.
 *
 * Years here are ASTRONOMICAL years: 1 BC is year 0, 2 BC is -1, and so on.
 * "2239 BC" is astronomical -2238. Getting this wrong shifts every result by a
 * year, so anchors are stored astronomically and converted only for display.
 */

/** Modulo that always returns a non-negative result. */
export function mod(n, m) {
  return ((n % m) + m) % m;
}

/** Astronomical year + month + day -> Julian Day Number. */
export function jdn(astroYear, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = astroYear + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** Julian Day Number -> { year, month, day }, year astronomical. */
export function jdToDate(J) {
  J = Math.round(J);
  const a = J + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    year: 100 * b + d - 4800 + Math.floor(m / 10),
    month: m + 3 - 12 * Math.floor(m / 10),
    day: e - Math.floor((153 * m + 2) / 5) + 1,
  };
}

/** Astronomical year -> the era-qualified year people read. -2238 -> "2239 BC". */
export function fmtYear(astroYear) {
  return astroYear <= 0 ? `${1 - astroYear} BC` : `${astroYear} CE`;
}

/** Astronomical year -> the positive year number in its era. -2238 -> 2239. */
export function eraYear(astroYear) {
  return astroYear <= 0 ? 1 - astroYear : astroYear;
}

/** { year, era, month, day } from the UI -> astronomical year. */
export function toAstroYear(year, era) {
  return era === 'BC' ? 1 - year : year;
}

/** True for a numeric palindrome of two or more digits. Sign and fraction are dropped. */
export function isPalindrome(n) {
  const s = String(Math.abs(Math.round(n)));
  return s.length > 1 && s === s.split('').reverse().join('');
}

/** Today, as an astronomical date, read from the system clock. */
export function today() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}
