// Holoflective numbers — a sum and its digit reversal, "what they appear on The
// Other Side". Transcribed from the author's *Holoflective Sums* (3 pages), in
// the order the source lists them. docs/reverse/24 §2 reads it.
//
// Not to be confused with the Holoflective PROJECTION (operation #2, "Holo-date"),
// which reverses Y itself and projects from X2. This is a list of numbers, used
// the way the Geodetic and Diurnal lists are: as a label on a finished run.
//
// `major` is the source's asterisk: "BOTH the sum and its reflection are MAJOR
// numbers [orders of magnitude]". The source is not symmetric about it -- 216
// is starred but 612 is not, 621 is starred but 126 is not -- and that is kept
// as written rather than tidied.
//
// This file is DATA. Edit it freely — nothing else needs to change.

/** [sum, reflection, major] in source order. */
const PAIRS = [
  // page 1
  [12, 21, false], [18, 81, false], [21, 12, true], [24, 42, true], [27, 72, false],
  [36, 63, true], [42, 24, false], [45, 54, false], [48, 84, false], [63, 36, true],
  [69, 96, false], [81, 18, false], [84, 48, false], [96, 69, false], [126, 621, false],
  [216, 612, true],
  // page 2
  [234, 432, false], [255, 552, false], [259, 952, false], [264, 462, false], [273, 372, false],
  [276, 672, true], [279, 972, false], [288, 882, true], [297, 792, false], [351, 153, false],
  [405, 504, true], [423, 324, false], [429, 924, false], [441, 144, true], [447, 744, false],
  [468, 864, false], [492, 294, false], [501, 105, false], [504, 405, false], [513, 315, false],
  [531, 135, false], [537, 735, false], [549, 945, false], [567, 765, false], [576, 675, false],
  [603, 306, false], [612, 216, false], [621, 126, true], [633, 336, false], [645, 546, false],
  [657, 756, false], [669, 966, false],
  // page 3
  [672, 276, true], [674, 476, false], [675, 576, false], [681, 186, false], [801, 108, false],
  [819, 918, false], [831, 138, false], [846, 648, false], [855, 558, false], [861, 168, false],
  [873, 378, false], [882, 288, true], [885, 588, false], [897, 798, false], [954, 459, false],
  [1701, 1071, false], [2031, 1302, false], [2901, 1092, false], [2151, 1512, false],
  [2271, 1722, false], [2322, 2232, false], [2391, 1932, false], [2412, 2142, false],
  [2421, 1242, false], [2502, 2052, false], [2511, 1152, false], [2532, 2352, false],
];

/** The Immortal Loop Number, which the source says this method discovered. */
export const IMMORTAL_LOOP = 2178;

export const HOLOFLECTIVE = Object.freeze(
  PAIRS.map(([sum, mirror, major]) => Object.freeze({ sum, mirror, major }))
);
