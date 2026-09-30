
var POINTS__ALPHA_OPERATION_MATCH = 1;
var POINTS__BETA_OPERATION_MATCH = .5;
var POINTS__IMPORTANT_MSRF_MATCH = 2;
var POINTS__NORMAL_MSRF_MATCH = 1;
var POINTS__VORTEX_MSRF_MATCH = POINTS__IMPORTANT_MSRF_MATCH;
var MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES = 2;


var SCORE_MULTIPLIER__NORMAL_MSRF_MATCH = 1.5;
var SCORE_MULTIPLIER__IMPORTANT_MSRF_MATCH = 2.0;
var SCORE_MULTIPLIER__VORTEX_MSRF_MATCH = 2.0;


// NOTE: Filter numbers 21 and 76 have been commented out since rounded down vortex numbers match these.
// UPDATE: Re-enabled 21 and 76 after discussion with Jason to match a vortex number within a certain tolerance.
var MSRF_FILTER__NORMAL = [
    12, 21, 24, 36, 40, 42, 48, 49, 51, 52, 54, 56, 59, 60, 63, 66, 70, 71, 72, 74, 76, 77, 80, 88, 90,
    96, 98, 104, 105, 108, 110, 114, 116, 119, 120, 129, 133, 135, 138, 140, 144, 147, 154, 162, 168,
    180, 182, 196, 204, 207, 218, 222, 223, 226, 231, 234, 238, 253, 255, 259, 260, 264, 276, 279,
    280, 286, 288, 294, 297, 301, 308, 312, 315, 324, 330, 336, 343, 351, 354, 363, 364, 365, 372, 385,
    390, 394, 396, 405, 414, 433, 434, 441, 444, 447, 453, 459, 460, 463, 468, 476, 480, 490, 493, 495,
    509, 520, 525, 526, 531, 534, 539, 544, 552, 555, 558, 563, 565, 572, 573, 576, 582, 588, 591, 594,
    600, 618, 621, 640, 657, 660, 666, 670, 672, 674, 675, 679, 681, 686, 690, 691, 701, 702, 708, 720,
    726, 728, 730, 732, 735, 744, 765, 770, 774, 777, 789, 791, 792, 800, 801, 807, 810, 816, 819, 828,
    831, 846, 855, 861, 866, 868, 888, 918, 920, 930, 936, 952, 954, 960, 966, 972, 980, 990, 1000, 1019,
    1035, 1040, 1042, 1050, 1052, 1056, 1062, 1071, 1074, 1083, 1089, 1092, 1096, 1104, 1110, 1111, 1116,
    1130, 1147, 1152, 1155, 1176, 1177, 1184, 1188, 1190, 1200, 1242, 1253, 1279, 1292, 1300, 1302, 1315,
    1318, 1320, 1332, 1335, 1350, 1359, 1372, 1380, 1401, 1416, 1441, 1446, 1449, 1461, 1470, 1485, 1486,
    1488, 1513, 1518, 1530, 1534, 1554, 1557, 1559, 1560, 1577, 1585, 1620, 1641, 1574, 1680, 1683, 1701,
    1715, 1736, 1738, 1764, 1770, 1776, 1785, 1786, 1794, 1826, 1829, 1836, 1854, 1855, 1860, 1872, 1899,
    1904, 1905, 1920, 1932, 1944, 1960, 1972, 1998, 2046, 2047, 2080, 2100, 2103, 2112, 2124, 2133, 2142,
    2151, 2170, 2178, 2184, 2191, 2205, 2208, 2232, 2235, 2244, 2269, 2277, 2288, 2292, 2293, 2294, 2295,
    2304, 2310, 2322, 2333, 2346, 2352, 2376, 2380, 2388, 2400, 2401, 2415, 2418, 2430, 2447, 2478, 2483,
    2484, 2506, 2556, 2558, HIGHEST_MSRF_NUMBER
];

var MSRF_FILTER__IMPORTANT = [
    84, 126, 132, 153, 176, 186, 189, 210, 216, 252, 270, 306, 360, 378, 420, 432, 504, 540, 567, 612, 630,
    648, 669, 693, 756, 780, 840, 864, 882, 945, 1008, 1080, 1134, 1224, 1260, 1296, 1344, 1404, 1428, 1440,
    1512, 1584, 1656, 1728, 1800, 1890, 1980, 2016, 2070, 2160, 2268, 2448, 2520
];

var MSRF_FILTER__VORTEX = [
    21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4, 762.3, 871.2
];

function isAlphaOperation(operation) {
    return operation.weight >= POINTS__ALPHA_OPERATION_MATCH;
}

function isBetaOperation(operation) {
    return operation.weight < POINTS__ALPHA_OPERATION_MATCH;
}

// Combine the three filter arrays into a master array that is sorted.
var MSRF_FILTER__FINAL = MSRF_FILTER__NORMAL.concat(MSRF_FILTER__IMPORTANT).concat(MSRF_FILTER__VORTEX).sort(function(a, b) { return a - b; });

var OPERATION_ENABLED_TRUE = true;
var OPERATION_ENABLED_FALSE = false;

var OPERATION_EQUATION_FOR_RADIUS_PROJECTION = "X1+YxOPH_PI";
var OPERATION_EQUATION_FOR_ORIGINAL_BETA_PHI_6 = "X2+(Y/2.0)xOPH_PHI";

var DEFAULT_OPHIS_OPERATIONS_LTE_V7 = [
    // 2. Y + X2 + Isometric Date
    newOperation("X2+oph_round(Y)", POINTS__ALPHA_OPERATION_MATCH, OPERATION_ENABLED_TRUE),

    // 3. Y reversed + X2 (Holo-)
    newOperation("X2+oph_flip(oph_round(Y))", POINTS__ALPHA_OPERATION_MATCH, OPERATION_ENABLED_TRUE),

    // 4. Y div. 5.08 + X2
    newOperation("X2+Y/OPH_CRV", POINTS__BETA_OPERATION_MATCH, OPERATION_ENABLED_TRUE),

    // 5. Y div. 2 X 3.14 + X1
    newOperation("X1+(Y/2.0)xOPH_PI", POINTS__BETA_OPERATION_MATCH, OPERATION_ENABLED_TRUE),

    // 6. Y div. 1.618 + X2
    newOperation("X2+Y/OPH_PHI", POINTS__ALPHA_OPERATION_MATCH, OPERATION_ENABLED_TRUE),

    // 7. Y div. 2 X 1.618 + X2
    newOperation(OPERATION_EQUATION_FOR_ORIGINAL_BETA_PHI_6, POINTS__BETA_OPERATION_MATCH, OPERATION_ENABLED_TRUE),

    // 8. Y div. 2 X 5.08 + X1
    newOperation("X1+(Y/2.0)xOPH_CRV", POINTS__BETA_OPERATION_MATCH, OPERATION_ENABLED_TRUE),

    // 9. Y div. 2 X 3.14 + X2
    newOperation("X2+(Y/2.0)xOPH_PI", POINTS__BETA_OPERATION_MATCH, OPERATION_ENABLED_TRUE),

    // 10. Y X1.618 + X2
    newOperation("X2+YxOPH_PHI", POINTS__ALPHA_OPERATION_MATCH, OPERATION_ENABLED_TRUE),

    // 11. Y X3.14 + X1
    newOperation(OPERATION_EQUATION_FOR_RADIUS_PROJECTION, POINTS__BETA_OPERATION_MATCH, OPERATION_ENABLED_TRUE),

    // 12. Y div. 2 X 5.08 + X2
    newOperation("X2+(Y/2.0)xOPH_CRV", POINTS__BETA_OPERATION_MATCH, OPERATION_ENABLED_TRUE),

    // 13. Y X3.14 + X2
    newOperation("X2+YxOPH_PI", POINTS__BETA_OPERATION_MATCH, OPERATION_ENABLED_TRUE),

    // 14. Y X 5.08 + X1
    newOperation("X1+YxOPH_CRV", POINTS__BETA_OPERATION_MATCH, OPERATION_ENABLED_TRUE),

    // 15. Y X 5.08 + X2
    newOperation("X2+YxOPH_CRV", POINTS__BETA_OPERATION_MATCH, OPERATION_ENABLED_TRUE),

    // New Hepta-Cycle Operation from Jason, Early-August 2025
    newOperation("X1+YxOPH_HEP", POINTS__ALPHA_OPERATION_MATCH, OPERATION_ENABLED_FALSE)
];

// New Hepta-Cycle Operation from Jason but for this one Z-Value is added to X2, Late-December 2025
var OPH_HEP_OPERATION_FOR_X2 = newOperation("X2+YxOPH_HEP", POINTS__ALPHA_OPERATION_MATCH, OPERATION_ENABLED_TRUE)

function cloneDefaultOperationsForAppVersionLte7() {
    return deepClone(DEFAULT_OPHIS_OPERATIONS_LTE_V7);
}

function cloneDefaultOperationsForAppVersionGte8() {
    var operations = deepClone(DEFAULT_OPHIS_OPERATIONS_LTE_V7);

    for ( var i = 0; i < operations.length; i++ ) {
        var ithOperation = operations[i];

        ithOperation.enabled = true;

        if ( ithOperation.equation == OPERATION_EQUATION_FOR_RADIUS_PROJECTION ) {
            ithOperation.weight = POINTS__ALPHA_OPERATION_MATCH;
        } else if ( ithOperation.equation == OPERATION_EQUATION_FOR_ORIGINAL_BETA_PHI_6 ) {
            ithOperation.weight = POINTS__ALPHA_OPERATION_MATCH;
        }
    }

    return operations;
}

function cloneDefaultOperationsForAppVersionGte10() {
    var operations = cloneDefaultOperationsForAppVersionGte8();

    operations.push(deepClone(OPH_HEP_OPERATION_FOR_X2));

    return operations;
}