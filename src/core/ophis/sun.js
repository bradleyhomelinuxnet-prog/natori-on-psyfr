/**
 * Sunset, for the HH:MM event scope.
 *
 * The original shipped three sunset libraries totalling ~150 KB and reached
 * exactly one of them (cosinekitty Astronomy Engine); the other two were dead
 * fallbacks. This is the SunCalc algorithm — the same standard Meeus solar
 * position reduction — written out directly, because the whole of what the app
 * consumes is `getTimes(...).sunset` and that is sixty lines of arithmetic.
 * It agrees with the heavier engine to about a minute, which the teardown noted
 * is well inside what the day-bucketing can notice.
 *
 * Everything here is UTC. The original resolved a timezone from lat/long and
 * then did its arithmetic in UTC anyway; skipping the lookup removes a 1 MB
 * dependency and a class of DST bug without changing a result.
 */

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2440588;
const J2000 = 2451545;

/** Obliquity of the ecliptic. */
const E = RAD * 23.4397;

/** Standard refraction-corrected sunset altitude, in degrees. */
const SUNSET_ALTITUDE = -0.833;

/** The observer elevation the original passed to every sunset library. */
export const DEFAULT_HEIGHT_IN_METERS = 2;

const toJulian = (ms) => ms / DAY_MS - 0.5 + J1970;
const fromJulian = (j) => (j + 0.5 - J1970) * DAY_MS;
const toDays = (ms) => toJulian(ms) - J2000;

const solarMeanAnomaly = (d) => RAD * (357.5291 + 0.98560028 * d);

function eclipticLongitude(M) {
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372;
  return M + C + P + Math.PI;
}

const declination = (l, b) =>
  Math.asin(Math.sin(b) * Math.cos(E) + Math.cos(b) * Math.sin(E) * Math.sin(l));

const J0 = 0.0009;
const julianCycle = (d, lw) => Math.round(d - J0 - lw / (2 * Math.PI));
const approxTransit = (Ht, lw, n) => J0 + (Ht + lw) / (2 * Math.PI) + n;
const solarTransitJ = (ds, M, L) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

const hourAngle = (h, phi, d) =>
  Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));

/** Dip of the horizon for an observer `height` metres up, in degrees. */
const observerAngle = (height) => (-2.076 * Math.sqrt(height)) / 60;

/**
 * Sunset on the UTC day containing `ms`, at `lat`/`long`.
 *
 * Returns NaN inside a polar day or night, where the hour angle has no solution.
 * The original clamped latitude to +/-65 precisely so this could not happen —
 * the author's comment was that every library "starts freaking out once you get
 * too arctic" — but a caller that bypasses the clamp gets NaN rather than a
 * plausible-looking wrong answer.
 *
 * @param {number} ms  epoch millis anywhere in the target UTC day
 * @param {number} lat degrees north
 * @param {number} long degrees east
 * @param {number} [height] observer elevation in metres
 * @returns {number} epoch millis of sunset, or NaN
 */
export function sunsetMs(ms, lat, long, height = DEFAULT_HEIGHT_IN_METERS) {
  const lw = RAD * -long;
  const phi = RAD * lat;
  const dh = observerAngle(height);

  const d = toDays(ms);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);

  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L, 0);

  const h0 = (SUNSET_ALTITUDE + dh) * RAD;
  const w = hourAngle(h0, phi, dec);
  if (Number.isNaN(w)) return NaN;

  return fromJulian(solarTransitJ(approxTransit(w, lw, n), M, L));
}

/** The original rounded every sunset to the nearest minute before using it. */
export const roundToNearestMinute = (ms) => Math.round(ms / 60_000) * 60_000;
