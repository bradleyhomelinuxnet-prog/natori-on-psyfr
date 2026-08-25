// The tiered MSRF table — Multidimensional Spatial Recognition Filters.
// Transcribed verbatim from reference/docs/"Ophis MSRF Details.txt", the
// "MSRF Tiers" section (pages 5-7), in the order the source lists them.
//
// A number's TIER is how many "dimensions of arithmetic" it appears in — i.e.
// across how many of the six filters (Annular Chronometric, Geodetic
// Chronometry, Hydrogen Spacing Angle, Fibonacci Sequence, Intra-Decimal
// Matrix, Vortex Holography). Tier I = 2 dimensions, rising to Tier VII = 8 or
// more, which the source calls the Apex Projections.
//
// Two irregularities are IN THE SOURCE and are preserved here rather than
// silently corrected — the counts below are the source's own and they only
// reconcile with the duplicates left in place:
//   - Tier I lists 468 twice.
//   - 480 is listed under BOTH Tier I and Tier III.
// The lookup index de-duplicates; see MSRF_TIER_INDEX for how it resolves 480.
//
// This file is DATA. Edit it freely — nothing else needs to change.

/**
 * @typedef {object} MsrfTier
 * @property {string} tier      stable id, e.g. 'III' or 'VII.alpha'
 * @property {number} dimensions how many dimensions of arithmetic
 * @property {string} label     long form, for headings
 * @property {string} short     compact form, for the results-table tag
 * @property {boolean} [apex]   true for Tier VII, the Apex Projections
 * @property {number[]} numbers in source order, duplicates included
 */

/** @type {MsrfTier[]} */
export const MSRF_TIERS = [
  {
    tier: 'I',
    dimensions: 2,
    label: 'Tier I',
    short: 'I',
    numbers: [
      27, 30, 33, 40, 45, 48, 129, 135, 140, 150, 160, 51, 54, 69, 80, 81, 90, 96, 99, 102, 196,
      198, 200, 207, 218, 222, 225, 232, 105, 116, 238, 253, 259, 273, 279, 294, 312, 320, 324,
      343, 348, 350, 351, 354, 357, 364, 365, 394, 400, 408, 423, 433, 440, 444, 450, 451, 465,
      468, 468, 480, 492, 501, 509, 513, 525, 528, 537, 546, 549, 563, 570, 581, 591, 603, 627,
      633, 640, 645, 657, 663, 670, 674, 677, 679, 680, 681, 698, 700, 701, 708, 728, 730, 750,
      759, 760, 791, 798, 800, 814, 825, 846, 858, 861, 867, 870, 873, 880, 885, 888, 891, 897,
      903, 910, 1062, 1095, 1111, 1116, 1128, 1130, 1146, 1160, 1163, 1184, 1190, 1197, 1215, 1290,
      1315, 1318, 1323, 920, 936, 954, 957, 969, 1019, 1023, 1046, 1218, 1221, 1230, 1240, 1170,
      1254, 1275, 1280, 1173, 1182, 1287, 1326, 1330, 1335, 1354, 1360, 1365, 1368, 1395, 1401,
      1410, 1416, 1419, 1441, 1452, 1460, 1461, 1479, 1540, 1551, 1557, 1559, 1577, 1580, 1581,
      1590, 1600, 1610, 1632, 1640, 1641, 1674, 1710, 1715, 1716, 1720, 1722, 1480, 1486, 1513,
      1617, 1628, 1734, 1736, 1744, 1749, 1750, 1755, 1760, 1773, 1776, 1782, 1786, 1794, 1815,
      1820, 1825, 1827, 1830, 1840, 1947, 1950, 1953, 1854, 1861, 1863, 1880, 1881, 1887, 1899,
      1914, 1938, 1974, 1977, 1995, 1998, 2000, 2010, 2013, 2025, 2030, 2047, 2052, 2058, 2088,
      2091, 2093, 2103, 2120, 2124, 2130, 2133, 2145, 2151, 2191, 2193, 2200, 2210, 2226, 2250,
      2257, 2271, 2293, 2320, 2322, 2326, 2331, 2343, 2360, 2363, 2415, 2421, 2440, 2447, 2450,
      2511, 2532, 2541, 2555, 2370, 2388, 2391, 2397, 2457, 2475, 2480, 2490, 2401, 2409, 2412,
      2499, 2502, 2508,
    ],
  },
  {
    tier: 'II',
    dimensions: 3,
    label: 'Tier II',
    short: 'II',
    numbers: [
      8, 12, 13, 168, 180, 226, 231, 24, 34, 36, 55, 60, 70, 89, 98, 108, 114, 186, 204, 223, 233,
      315, 336, 462, 476, 510, 520, 561, 588, 610, 363, 526, 618, 777, 810, 816, 1000, 1035, 1040,
      831, 1089, 1092, 675, 855, 1147, 1152, 1554, 1575, 1279, 1596, 1300, 1597, 1350, 1638, 1650,
      1359, 165, 234, 280, 286, 300, 301, 372, 377, 390, 429, 434, 447, 453, 459, 463, 531, 534,
      544, 552, 555, 558, 560, 686, 714, 726, 732, 735, 765, 770, 900, 918, 952, 966, 972, 980,
      987, 1096, 1104, 1120, 1122, 1140, 1377, 1400, 1446, 1500, 138, 1701, 1738, 1740, 1770, 1785,
      1806, 1826, 1872, 1904, 1944, 1960, 1989, 2031, 2079, 2080, 2112, 2170, 2184, 2190, 2304,
      2340, 2550, 2556, 2208, 2211, 2220, 2240, 2277, 2288, 2346, 2352, 2380, 2394, 2418, 2442,
      2460, 2483,
    ],
  },
  {
    tier: 'III',
    dimensions: 4,
    label: 'Tier III',
    short: 'III',
    numbers: [
      42, 72, 120, 176, 495, 576, 594, 828, 868, 924, 189, 255, 270, 276, 297, 396, 405, 621, 660,
      669, 702, 960, 1020, 1071, 1155, 1177, 460, 744, 774, 801, 480, 490, 819, 1188, 1332, 1386,
      1449, 1485, 2046, 1488, 1518, 1560, 1764, 2178, 2205, 2244, 2280, 1848, 1860, 1920, 1932,
      2292, 2295, 2430, 2436, 2478, 693, 1320, 210, 240, 252, 441, 540, 600, 780, 792, 882, 945,
      1050, 1056, 1520, 1620, 1683, 1836, 1980,
    ],
  },
  {
    tier: 'IV',
    dimensions: 5,
    label: 'Tier IV',
    short: 'IV',
    numbers: [
      21, 63, 66, 132, 144, 153, 330, 378, 414, 432, 264, 288, 612, 648, 666, 672, 1074, 1176,
      1200, 306, 690, 1302, 2040, 2070, 2142, 2232, 2484,
    ],
  },
  {
    tier: 'V',
    dimensions: 6,
    label: 'Tier V',
    short: 'V',
    numbers: [84, 126, 216, 567, 2376, 2400, 630, 756, 864, 1380, 1470, 1728, 2268, 2448],
  },
  {
    tier: 'VI',
    dimensions: 7,
    label: 'Tier VI',
    short: 'VI',
    numbers: [360, 420, 720, 990, 1110, 1344, 1404, 1428, 1584, 1656, 1890, 2100, 2310],
  },
  // Tier VII — "Apex Projections", 8 or more dimensions of arithmetic. The
  // source spells the lesser rank "ceta", which is not a Greek letter name, so
  // it is left as the word rather than given a symbol like its two siblings.
  {
    tier: 'VII.ceta',
    dimensions: 8,
    label: 'Tier VII · ceta',
    short: 'VII ceta',
    apex: true,
    numbers: [930, 1080, 1134, 1440, 1800],
  },
  {
    tier: 'VII.beta',
    dimensions: 8,
    label: 'Tier VII · beta',
    short: 'VII β',
    apex: true,
    numbers: [840, 1242, 1296, 1680, 2160],
  },
  {
    tier: 'VII.alpha',
    dimensions: 8,
    label: 'Tier VII · alpha',
    short: 'VII α',
    apex: true,
    numbers: [504, 1008, 1224, 1260, 1512, 2016, 2520],
  },
];

/**
 * number -> the tier record it belongs to.
 *
 * 480 is listed under two tiers in the source; the higher one wins, because a
 * tier is a claim about how many filters the number was found in and the larger
 * count is the one that cannot be explained away by an omission.
 *
 * @type {Map<number, {tier: string, dimensions: number, apex: boolean, label: string, short: string}>}
 */
export const MSRF_TIER_INDEX = new Map();
for (const { tier, dimensions, label, short, apex = false, numbers } of MSRF_TIERS) {
  for (const n of numbers) {
    const prior = MSRF_TIER_INDEX.get(n);
    if (prior && prior.dimensions >= dimensions) continue;
    MSRF_TIER_INDEX.set(n, { tier, dimensions, apex, label, short });
  }
}

/** Every number in the tiered table, de-duplicated. */
export const MSRF_FULL = new Set(MSRF_TIER_INDEX.keys());

/** @returns {?{tier: string, dimensions: number, apex: boolean, label: string, short: string}} */
export function msrfTier(n) {
  return MSRF_TIER_INDEX.get(n) ?? null;
}
