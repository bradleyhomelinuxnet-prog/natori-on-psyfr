/**
 * MSRF filters for the `ophis` reckoning — Multidimensional Spatial Recognition Filters.
 *
 * Transcribed verbatim from the original `ophis_model__params.js`. These are the
 * three arrays the scorer actually consults; `src/data/msrf-tiers.js` is the
 * separate Tier I–VII table from the author's MSRF document, used for labelling,
 * and `src/data/msrf.js` is the reduced 87-number set the chronicon cast uses.
 *
 * Three properties are load-bearing and are preserved rather than tidied:
 *
 *   - NORMAL is NOT sorted. `1574` sits at index 248, between `1641` and `1680`.
 *     The original scans linearly, so the order is invisible to the result — but
 *     reordering it would silently break a byte-comparison against the original,
 *     and any future binary search would then be wrong in a way nothing catches.
 *   - IMPORTANT is disjoint from NORMAL, and is checked FIRST. If they ever
 *     overlap, IMPORTANT silently wins.
 *   - VORTEX holds the only non-integer entries, and is checked before both.
 *
 * This file is DATA. Edit it freely — nothing else needs to change.
 */

/** Also the default value of the "beyond N days" filter. */
export const HIGHEST_MSRF_NUMBER = 2559;

/** 325 entries. Source order — deliberately not sorted. */
export const MSRF_FILTER__NORMAL = [
  12, 21, 24, 36, 40, 42, 48, 49, 51, 52, 54, 56, 59, 60, 63, 66, 70, 71, 72, 74, 76, 77, 80, 88,
  90, 96, 98, 104, 105, 108, 110, 114, 116, 119, 120, 129, 133, 135, 138, 140, 144, 147, 154, 162,
  168, 180, 182, 196, 204, 207, 218, 222, 223, 226, 231, 234, 238, 253, 255, 259, 260, 264, 276,
  279, 280, 286, 288, 294, 297, 301, 308, 312, 315, 324, 330, 336, 343, 351, 354, 363, 364, 365,
  372, 385, 390, 394, 396, 405, 414, 433, 434, 441, 444, 447, 453, 459, 460, 463, 468, 476, 480,
  490, 493, 495, 509, 520, 525, 526, 531, 534, 539, 544, 552, 555, 558, 563, 565, 572, 573, 576,
  582, 588, 591, 594, 600, 618, 621, 640, 657, 660, 666, 670, 672, 674, 675, 679, 681, 686, 690,
  691, 701, 702, 708, 720, 726, 728, 730, 732, 735, 744, 765, 770, 774, 777, 789, 791, 792, 800,
  801, 807, 810, 816, 819, 828, 831, 846, 855, 861, 866, 868, 888, 918, 920, 930, 936, 952, 954,
  960, 966, 972, 980, 990, 1000, 1019, 1035, 1040, 1042, 1050, 1052, 1056, 1062, 1071, 1074, 1083,
  1089, 1092, 1096, 1104, 1110, 1111, 1116, 1130, 1147, 1152, 1155, 1176, 1177, 1184, 1188, 1190,
  1200, 1242, 1253, 1279, 1292, 1300, 1302, 1315, 1318, 1320, 1332, 1335, 1350, 1359, 1372, 1380,
  1401, 1416, 1441, 1446, 1449, 1461, 1470, 1485, 1486, 1488, 1513, 1518, 1530, 1534, 1554, 1557,
  1559, 1560, 1577, 1585, 1620, 1641, 1574, 1680, 1683, 1701, 1715, 1736, 1738, 1764, 1770, 1776,
  1785, 1786, 1794, 1826, 1829, 1836, 1854, 1855, 1860, 1872, 1899, 1904, 1905, 1920, 1932, 1944,
  1960, 1972, 1998, 2046, 2047, 2080, 2100, 2103, 2112, 2124, 2133, 2142, 2151, 2170, 2178, 2184,
  2191, 2205, 2208, 2232, 2235, 2244, 2269, 2277, 2288, 2292, 2293, 2294, 2295, 2304, 2310, 2322,
  2333, 2346, 2352, 2376, 2380, 2388, 2400, 2401, 2415, 2418, 2430, 2447, 2478, 2483, 2484, 2506,
  2556, 2558, HIGHEST_MSRF_NUMBER,
];

/** 53 entries, strictly ascending, disjoint from NORMAL. */
export const MSRF_FILTER__IMPORTANT = [
  84, 126, 132, 153, 176, 186, 189, 210, 216, 252, 270, 306, 360, 378, 420, 432, 504, 540, 567,
  612, 630, 648, 669, 693, 756, 780, 840, 864, 882, 945, 1008, 1080, 1134, 1224, 1260, 1296, 1344,
  1404, 1428, 1440, 1512, 1584, 1656, 1728, 1800, 1890, 1980, 2016, 2070, 2160, 2268, 2448, 2520,
];

/**
 * 12 entries, each with exactly one decimal digit.
 *
 * Two families of the digital-root pattern {7,6,5,3,2,1}. Do not derive them —
 * `docs/VORTEX.md` explains where they come from, but the twelve literals are
 * the contract.
 */
export const MSRF_FILTER__VORTEX = [
  21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4, 762.3, 871.2,
];

/**
 * All three, numerically sorted — 390 entries.
 *
 * Built with concat so the tier arrays above are not re-ordered in place. Used
 * ONLY by the startup self-check; the scorer never touches it.
 */
export const MSRF_FILTER__FINAL = MSRF_FILTER__NORMAL
  .concat(MSRF_FILTER__IMPORTANT)
  .concat(MSRF_FILTER__VORTEX)
  .sort((a, b) => a - b);

/** Points and score multiplier per tier. Vortex and Important agree by value, not by aliasing. */
export const MSRF_TIER_WEIGHTS = {
  NORMAL: { points: 1, multiplier: 1.5, label: 'Normal', cls: 'msrf_normal' },
  IMPORTANT: { points: 2, multiplier: 2.0, label: 'Important', cls: 'msrf_important' },
  VORTEX: { points: 2, multiplier: 2.0, label: 'Vortex', cls: 'msrf_vortex' },
};

export const VORTEX_FILTER_MATCH_TOLERANCE = 0.1;
