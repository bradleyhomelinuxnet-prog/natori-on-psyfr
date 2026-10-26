/**
 * Chronotecture plates, for linking a projected date to the chart that names it.
 *
 * Copied from Chronotecture-Charts tools/plates.tsv (labelled chart plates only)
 * on 2026-10-26. Each entry is the plate number, the label its page shows, and
 * the search keywords the atlas uses. The plates are Jason M. Breshears'
 * Chronotecture (2017); this file holds only their numbers and labels.
 *
 * MOD POINT: when the atlas gains or relabels a plate, refresh this list from
 * plates.tsv. The mirror URL is the one the project owner publishes.
 */

export const CHRONOTECTURE_URL = 'https://hollywood-rogue-ai-ventures.w3spaces.com/Chronotecture-Charts/';

/**
 * The GitHub Pages copy, which publishes on every push; the mirror above is
 * updated by hand. Used for pages newer than the mirror -- the 3D Pyramid
 * Chronograph first of all.
 */
export const CHRONOTECTURE_PAGES_URL = 'https://bradleyhomelinuxnet-prog.github.io/Chronotecture-Charts/';

/**
 * The Pyramid Chronograph with these dates on its Great Step chronometer.
 * They go in the #fragment, which the browser never sends to the server.
 */
export const pyramidUrl = (isoDates = []) =>
  `${CHRONOTECTURE_PAGES_URL}redesign/pyramid-3d.html${isoDates.length ? `#dates=${isoDates.join(',')}` : ''}`;

/** The four Phoenix Chronometry plates — the 138-year cycle, drawn on the Great Pyramid. */
export const PHOENIX_PLATES = [114, 115, 116, 117];

export const PLATES = [
  [13, 'Chart I', 'chart i pyramid inch calendar 3361 3036 1902 giza course'],
  [14, 'Chart I·b', 'passage conjunct axis, 1460 bc, 2435 am, 3361 pyramid inches, 1902 ad, great step, 2815 bc, casing blocks, 365 enoch, 1095, 3894, 144.5 decans, hijrah 622 ad, corpus hermeticum, great flood 2239 bc'],
  [15, 'Chart I·c', 'stonehenge, 414, 6210, 5796 am, 1902 ad, 4309 bc, cursed earth calendar, 2070 years, 1656, great flood 2239 bc, 583 bc sun darkening, philippus 498 bc, abraham 1825 bc, 2046 astroid impact, giza course countdown'],
  [16, 'Chart I·d', 'great step axis, 1902 ad, 5796 am, 144x13, 1572 supernova, nostradamus, 330 ad constantinople, 462 ad nibiru, 1440, 143, 286, 52, tunguska 1908, john greaves 1602, 2046 impact, 2106 6000 am'],
  [17, 'Chart I·e', 'chart ie giza course countdown 1902 2106 2448 months 144 bricks'],
  [18, 'Chart II', 'pyramid inches, 3361, 3036, 325 variance, axis conjunct 1460 bc, 1135 bc, great step, 1700, 34 inches, middle chamber, 442 ad, 4336 am, 1460 grand gallery, 666, 990, 1656 deluge, 2239 bc'],
  [21, 'Chart III', 'pyramid section, axis conjunct, 1135 bc, 994, 1828, 3360, great step, 1688, 5582 am, 1902 ad, lower chamber, 552, seven comets, pyramid inches'],
  [22, 'Chart III·b', '552, 1104, 2208 am, 1656 552x3, 1688 bc comet, darkened sun, nibiru 792, 72x11, 732, 1344, 5239 bc anunnaki, 3000 years, 1151, 2190 365x6, 1314 ad, book of jasher 1613, 2106 6000 am'],
  [23, 'Chart IV', 'pyramid inches, 3036, 1110, 1828, 302, 2760 am, 1135 bc axis conjunct, 3870 am, 25 bc, 5698 am, 1804 ad, 5796 am, 1902 ad, 2106 6000 am, floor joint, giza course countdown, armageddon'],
  [29, 'Chart VI·c', 'vic hijrah palindrome 622 mirror islamic'],
  [30, 'Chart VI·d', 'vid hijrah doublings 622 632 692 711 726 734 islamic'],
  [38, 'Chart VIII', ''],
  [39, 'Chart VIII·b', '1480 bc, 2415 am, mirror, 2559, 2829, 345, 208, 3300, 3330, 4309 bc, preadamic world, anunnaki, 5239 bc, 1821, 1851, 2106 ad'],
  [40, 'Chart IX', 'great pyramid, lower chamber, floor joint, 1699, 2001, 2045, 2207, 4146, 414, mayan long-count, 3114, stonehenge, chronoliths, 204 courses, 666'],
  [41, 'Chart IX·b / IX·c', 'span bars, 2001, 2045, world trade center, alexandrian library, 641, 1360, 720, kublai khan, davidson, vyse, taylor pyramid inch, 208, 2400, 2106'],
  [42, 'Chart X, XI, XII', 'mayan long-count, 5200, 4146, 1054, supernova, taurus, 1356, casing blocks, 1306, 1414, 1110, 3360, 252, tetractys, mene mene tekel'],
  [43, 'Chart X·b', '1054 ad, 4948 am, supernova, taurus, papal split, 3000 years, 1948 bc, abraham, 1447 bc, exodus, 607 bc, 1600, 432, 622 hijrah, 526 dionysius, 1798, 2106'],
  [44, 'Chart X·c', 'iron empires, rome, united states, 1054, mirror, supernova, 919, 992, 1973, 2027, 2038, 2046, asteroid, vesuvius, 2106'],
  [45, 'Chart XI·b', '1356 ad, 5250 am, multiples of 52, 780, 624, 468, 260, 156, 104, 520, 552, 345, 1701 great step, 2046 ad, 666, tunguska, 1908'],
  [46, 'Chart XIII–XVI', 'conjunct, 820, 4714, al mamoun, seth, 5250, 1356, 3706, 440, 6000 am, 2106, 666, 1440, enoch, 3894'],
  [47, 'Chart XIV·b', '820 ad, 4714 am, 758, 246, 1066, 1312, 62 ad, 1578, catacombs, 1080, 1620, 1820, 1900 antikythera, 1920, 5814, pyramid height'],
  [48, 'Chart XIV·c', '1930 ad, 5824 am, mirror, 114, 140, 160, 24, 1816, 1790, 1770, 2044, 2070, 2090, 414, tambora, aztec, ras shamra, pluto, 820 ad'],
  [53, 'Chart XVII', '1776, 5670, 5814, 186, 6000, anunnaki ner, 600, 1962, 1261, exodus, 3036, 1110, 666, 176, 444'],
  [61, 'Chart XIX·c', '1039 bc, 2856 am, king david, anunnaki, 4039 bc, 3895 bc, 1962 ad, 5856 am, 3000, 649, 368, 326, 318, 1776, 2815 bc, 2339 bc, 2337 bc, great flood, 2239 bc, 2106 ad, 7200'],
  [62, 'Chart XIX·d', '1998 ad, 666, 5892 am, 108 years, 6000 am, 2106 ad, 1980, 1976, 1962, 1960, 1950, 1922, 1918, 1906, 2016, 2034, 2046, 2074, 2090, 1478, 1759, 520, 239, 478, tutankhamen, seven comets'],
  [63, 'Chart XX / XXI', '583 bc, 3312 am, 1390, 1110, 1693 bc, 2202 am, draconian years, 6000 am, 2106 ad, 994, 1386, 1624, 340, 1656, great step, eratosthenes'],
  [64, 'Chart XX·b', '583 bc, 3312 am, mirror, 85, 646, 661, 1863, 2517, 2530, 2580, 1776, 1888, 552, great flood, 2239 bc, nibiru, 1998'],
  [69, 'Chart XXII', 'lower chamber, 1414, 744, 670, 4146, 2052 ad, 5946 am, 1800 am, 2075 bc, 414, 4140, 6210, 4639 bc, 4309 bc, anunnaki, 1998'],
  [70, 'Chart XXI·b', '2046 ad, 5940 am, 186x11, usa, countdown, 13th baktun, mayan, 3113 bc, 1776, 1902, 144, 1860, 14400 days, 240 days, nibiru, 2106 ad'],
  [71, 'Chart XXII·c', '2052 ad, 108x19, 5946 am, abaddon, eighth king, 1998, 666x3, 54, 108, 52, 520, 990, 1062, inquisition, 2106 ad'],
  [73, 'Chart XXIII', '5448, 5814, 366, 186, 552, chief cornerstone, isaiah 19:19-20, 204 courses, 808, 1110, 3036, 302, 744, -366, 6000 am, 4261 bc'],
  [74, 'Chart XXIII·b', '1554 ad, 5448 am, 777+777, 5814, 366, 444, 490, 520, 552, 2106 ad, 6000 am, 2815 bc, 4368, solomon’s temple, 2520, armageddon'],
  [80, 'Chart XXIV', 'upper chamber, antechamber, grand gallery, great step, well pit, 204, 1902, 2106, 6000 am, 2046, 7200, 6210, 990, kennedy, 60.96'],
  [81, 'Chart XXV', 'upper chamber, antechamber, granite leaf, triple veil, great step, measurements, 204, 330, 534, 170, 126, 60.96, lower chamber, middle chamber, well pit'],
  [82, 'Chart XXVI', 'great step, grand gallery, 1836, iron empire, 1940, 1962, 104 ad, 126 ad, 52+52, 7920 days, 360-day year, 22 years, key dates'],
  [83, 'Chart XXVII', 'great step, chronometer, 126, 42x3, 1902, 1944, 1986, 2028, 2022, 1440 months, 12.6 decans, passage conjunct 3360, 1945, 2005'],
  [84, 'Chart XXVIII', 'ceiling block, 52, 13x4, 60.96, 1962, 1963, 1975, 1988, 2001, 2014, 2022, 60 years, 1945, 2005, kennedy'],
  [85, 'Chart XXIX', '2016, great step, antechamber, 228, 114, 23, 11½, 2005, 2028, middle chamber, limestone granite joint, chronometry'],
  [86, 'Chart XXX', 'granite leaf, antechamber, great step, seven comets, 1962, 2034, 2035, 2036, 2050, 2106, 6000 am, 72, 144, 16 p″, first seal'],
  [87, 'Chart XXXI', 'granite leaf, seven seals, seven trumpets, antechamber, 84 p″, 52 p″, 2014, 2040, 2046, 2066, 2090, 2130, 24 sk, planet phoenix, enoch elijah'],
  [88, 'Chart XXXII', '270 years, 90 p″, 2052, 1962, 2232, 126 sk, 14 p″, 2014, 2028, 2042, 2056, 2070, 120th jubilee, sixth seal, 4309 bc, 1776'],
  [89, 'Chart XXXIII', 'wellpit axis, 6000 am, 2106, stone kingdom, sk, 102 p″, 34×3, 126 p″, 204 p″, 2232, 2436, 330 sk, 252, 2520, 36×7, 360×7'],
  [90, 'Chart XXXIV', 'geometric chronometry, a/b ruler, 1902, 2106, 204 p″, armageddon, 6000 annus mundi, 92 p″, 3.14, 288.88, 144.44, 2014, 2060, stone kingdom, conclusion'],
  [91, 'Chart XXXV', 'last days, stone kingdom, giza course countdown, 204, 1902, 2106, 6000 am, iron empire, 70 years apocalypse, seven kings, 54 years, 330, 670, 1000 year millennium, 4639 bc, 2239 bc'],
  [110, 'Foundation of Time', '7344, 8640, 1080, 864, 3456, 10800, 1296, 144x9, foundation of time, 8 faces, 2815 bc, 1080 am, sloping corner, mid-plane, pyramis chronicon, plan view'],
  [111, 'Vertical Distances', 'great pyramid, vertical distances, pyramid inches, 5814, 5448, apex, present height, great step, 1700, 4140 mean, 1104, 2760, lower chamber, 552 width, 2070'],
  [112, 'Sloping & Horizontal Distances', 'great pyramid, sloping distances, horizontal distances, central axis, 4554, 1518×3, 4532, 3360, 3361, 1836, 1546, 4146, 3036, 1110, 808'],
  [113, 'Lower Chamber Level', 'lower chamber, descending passage, well pit, 1414, 1412, 1110, 906, 908, 744, 576, 670, 346, 324, 302, 204, 162, great step axis, floor joint'],
  [114, 'Phoenix Chronometry I', 'phoenix chronometry, great pyramid, 138, 3036, 6348, 4968, 2760, 5796, 1902 ad, 4140, 144th course, 4554, 1518, 1380'],
  [115, 'Phoenix Chronometry II', 'phoenix chronometry, lower chamber, great pyramid, 552 width, 138, 1070, 1162, 1414, 2484, 3036, 2070, 2760, 908'],
  [116, 'Phoenix Chronometry III', 'phoenix chronometry, great step, antechamber, upper chamber, grand gallery, 340, 126, 552, 1656, 1700, 2040, 19331040, 35020, 4140, granite'],
  [117, 'Phoenix Chronometry IV', 'phoenix chronometry, plan view, upper chamber, sarcophagus, great step, chief cornerstone, summit platform, 534, 412, 204, 230, 1380, 846, 5448, 6000'],
  [118, 'Rejected Cornerstone', '6354, 4309 bc, 2046 ad, 3927, 33 ad, 1.618, 3927.07, annus mundi, cornerstone, nibiru, phoenix, poleshift, i am the door, gate of the deep, sarcophagus, 2013'],
].map(([plate, label, keywords]) => ({ plate, label, keywords: keywords.split(', ') }));

export const plateUrl = (n) => `${CHRONOTECTURE_URL}pages/p${String(n).padStart(3, '0')}.html`;
