# Ophis v12 / PSYFR — Subsystem Spec 03: Scoring, MSRF Matching, Filtering & Sorting

**Scope of this document.** Everything that turns a set of computed Z-Date candidates into a
scored, filtered, ordered result table. Implementation-grade: a competent engineer should be able
to reimplement this subsystem from this document alone.

**Primary sources read in full**

| File | Lines | Role |
|---|---|---|
| `src/ophis_model__params.js` | 1–143 | MSRF number sets, points, multipliers, alpha/beta predicates, default operation table |
| `src/ophis_model__sorting.js` | 1–349 | `filterZDates`, `sortZDates`, `sortMsrfMatches`, `sortOperationMatches` |

**Secondary sources read for cross-module contracts**

| File | Lines cited | Role |
|---|---|---|
| `src/ophis_model__operations.js` | 17–23, 127–170, 263–416, 418–602 | `scoreZDates`, `tagZDates`, `runOperations`, multiplier helpers |
| `src/ophis_utils.js` | 148–219, 221–230, 308–316, 815–817, 987–1004, 1006–1012, 1050–1070 | `getMsrfMatch`, rounding, `newOperation`, `oph_round`, `oph_flip` |
| `src/ophis_config.js` | 16–21, 47–55, 96, 100, 112–120, 122–174, 367–372, 410–413, 430–431, 440–456 | All named constants and enum string values |
| `src/ophis_view__output.js` | 190–698, 763–923 | How score / MSRF / hits are rendered; sort-header wiring |
| `src/ophis_view__strings.js` | 82–92, 139–148 | Readable MSRF strings |
| `src/ophis_view.js` | 595–748 | About-page description of the scoring system |
| `src/ophis_model__validation.js` | 620–674, 1041–1088 | Scoring-system import validation; MSRF self-check |
| `src/ophis_unit_tests.js` | 70–119 | MSRF self-check unit tests |
| `src/ophis_view__export.js` | 293–338 | CSV column contract |
| `src/ophis_controller.js` | 117–146, 241–261 | Default iso-event, default new operation |
| `src/ophis_view__settings.js` | 707–801 | Operation weight editing / clamping |
| `src/ophis.css`, `src/ophis_view__config.js` | 86–142 / 21–29 | CSS class names and colours crossing module boundaries |

---

## 0. Ten-second summary of the pipeline

```
X-Dates ──pairwise──► Y (whole days)
   └── for each enabled operation O_i:  zValue = f_i(Y)          [days offset]
        ├── rotationCountZ = round1(round2(zValue))              [the MSRF probe number]
        ├── Z-Date          = startingXDate + zValue*86 400 000  [uses UNROUNDED zValue]
        └── bucket by Z-Date-start-millis into zStructsDict
zStructsDict[key] = { operation_match_structs[], msrf_match_structs[], ... }
   ├── scoreZDates()  → score, base_score_pre_multiply, hit_count, operation_score, operation_hit_count
   ├── filterZDates() → subset of keys
   └── sortZDates()   → ordered array of keys
```

**The number tested against the MSRF sets is `rotation_count_z`** — the *day-offset from the
operation's own starting X-Date to the Z-Date*, i.e. the operation's own output. It is **not** Y,
**not** the absolute date, **not** the offset from the last X-Date.
(`ophis_model__operations.js:366`, `:549`, `:593`.)

---

## 1. MSRF

### 1.1 What the acronym means

**It is never expanded anywhere in the codebase or in the repo's own docs.** Stated plainly so a
reimplementer does not go looking:

* No source file defines it. The only occurrences are the identifier prefixes
  `MSRF_FILTER__*`, `POINTS__*_MSRF_MATCH`, `SCORE_MULTIPLIER__*_MSRF_MATCH`, `getMsrfMatch`,
  the struct field `msrf_filter` / `msrf_number`, and the CSS classes `msrf_normal` /
  `msrf_important` / `msrf_vortex`.
* The prior reverse-engineering write-up in this repo explicitly declines to commit to an
  expansion: `Ophis_v9_DeepDive_Addendum.md:532` — *"The acronym 'MSRF' is never defined in the
  source files provided"* — and rejects both "Momentum/Spin/Rotation/Frequency" and
  "Magnetic Solar Reference Frame" as unconfirmable.
* `README.md:11` and `Ophis_v12_ReverseEngineering_Report.md:127` describe the sets only as
  **"resonance number-sets ('MSRF')"**.
* The owner's spreadsheet `MSRF Magnitude Calc-v2.xlsx` (a companion artifact, not code) uses the
  column headers `MSRF Filter: Number`, `Ophis App MSRF #`, `MSRF Score`, `MSRF Cat`,
  `Magnitude`, `Magnitude Scale`, `FIB Number`, `FIB True`. This associates MSRF with a
  *magnitude* scale and with Fibonacci numbers but still does not expand the acronym.

**Reimplementation guidance:** treat `MSRF` as an opaque project-internal label for
"resonance filter number set". Do not invent an expansion in the rebuild's UI.

### 1.2 The classification tiers

Three disjoint tiers, ordered by increasing significance:

| Tier | Array | Cardinality | Points on match | Score multiplier | CSS class | `readable_name` | Colour |
|---|---|---|---|---|---|---|---|
| Normal | `MSRF_FILTER__NORMAL` | 325 elements (324 numeric literals + `HIGHEST_MSRF_NUMBER`) | `POINTS__NORMAL_MSRF_MATCH = 1` | `SCORE_MULTIPLIER__NORMAL_MSRF_MATCH = 1.5` | `msrf_normal` | `"Normal"` | `#2ede69` |
| Important | `MSRF_FILTER__IMPORTANT` | 53 | `POINTS__IMPORTANT_MSRF_MATCH = 2` | `SCORE_MULTIPLIER__IMPORTANT_MSRF_MATCH = 2.0` | `msrf_important` | `"Important"` | `#b80b0b` |
| Vortex | `MSRF_FILTER__VORTEX` | 12 | `POINTS__VORTEX_MSRF_MATCH = POINTS__IMPORTANT_MSRF_MATCH = 2` | `SCORE_MULTIPLIER__VORTEX_MSRF_MATCH = 2.0` | `msrf_vortex` | `"Vortex"` | `purple` |

Points: `ophis_model__params.js:4-6`. Multipliers: `:10-12`. CSS classes & readable names:
`ophis_utils.js:157-169`. Colours: `ophis.css:97,107,132`, `ophis_view__config.js:27-29`
(`COLOR__MSRF_NORMAL`, `COLOR__MSRF_IMPORTANT`, `COLOR__MSRF_VORTEX` — used for chart borders,
`ophis_view__chart_datasets.js:686-692`).

`HIGHEST_MSRF_NUMBER = 2559` is defined in **`ophis_config.js:119`**, *not* in the params file.
It is used twice:
1. As the final element of `MSRF_FILTER__NORMAL` (`ophis_model__params.js:35`).
2. As the `numericDefault` of the *"beyond N days"* filter field (`ophis_config.js:152`) — i.e.
   the default "hide Z-Dates more than N days after the last X-Date" value is 2559 days.

### 1.3 `MSRF_FILTER__NORMAL` — complete, verbatim

Source: `ophis_model__params.js:17-36`. Reproduced **exactly** in source order (the array is
*mostly* ascending; see the ordering defect in §1.7).

```js
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
    2484, 2506, 2556, 2558, HIGHEST_MSRF_NUMBER   // HIGHEST_MSRF_NUMBER === 2559
];
```

Flattened literal form (325 values, `HIGHEST_MSRF_NUMBER` resolved to `2559`), for a direct
copy-paste into a rebuild:

```
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
2556, 2558, 2559
```

> **Correction to prior repo documentation.** `Ophis_v9_DeepDive_Addendum.md:542` and
> `Ophis_v12_ReverseEngineering_Report.md:332` both state NORMAL has **276** integers. That is
> **wrong** for the v12 source in `src/`. Machine-counted length of the v12 array is **325**
> (324 numeric literals + the `HIGHEST_MSRF_NUMBER` symbol). Use 325.

### 1.4 `MSRF_FILTER__IMPORTANT` — complete, verbatim

Source: `ophis_model__params.js:38-42`. 53 elements, strictly ascending, no defects found.

```js
var MSRF_FILTER__IMPORTANT = [
    84, 126, 132, 153, 176, 186, 189, 210, 216, 252, 270, 306, 360, 378, 420, 432, 504, 540, 567, 612, 630,
    648, 669, 693, 756, 780, 840, 864, 882, 945, 1008, 1080, 1134, 1224, 1260, 1296, 1344, 1404, 1428, 1440,
    1512, 1584, 1656, 1728, 1800, 1890, 1980, 2016, 2070, 2160, 2268, 2448, 2520
];
```

**Verified disjoint from NORMAL** — the intersection `IMPORTANT ∩ NORMAL` is empty (checked
programmatically over the v12 arrays). This matters: `getMsrfMatch` checks IMPORTANT *before*
NORMAL, so if they ever overlap, IMPORTANT silently wins.

### 1.5 `MSRF_FILTER__VORTEX` — complete, verbatim

Source: `ophis_model__params.js:44-46`. 12 elements, all with exactly one decimal digit.

```js
var MSRF_FILTER__VORTEX = [
    21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4, 762.3, 871.2
];
```

Note the internal structure (not enforced by code, but useful for validation): the set is
two families of the digital-root pattern `{7,6,5,3,2,1} × k` —
`21.7, 32.6, 43.5, 65.3, 76.2, 87.1` and their ×10.0364-ish counterparts
`217.8, 326.7, 435.6, 653.4, 762.3, 871.2`. Each pair sums the integer part digits to 9 or 18.
Do not derive them; hard-code the twelve literals.

### 1.6 `MSRF_FILTER__FINAL` (derived)

`ophis_model__params.js:57`:

```js
var MSRF_FILTER__FINAL = MSRF_FILTER__NORMAL
    .concat(MSRF_FILTER__IMPORTANT)
    .concat(MSRF_FILTER__VORTEX)
    .sort(function(a, b) { return a - b; });
```

Length **390** (325 + 53 + 12). Numerically ascending. **`MSRF_FILTER__FINAL` is never used by the
scoring path.** Its only consumers are:

* `ophis_model__validation.js:1041-1088` — `selfCheckMsrfOnStartup(errors_out)` startup integrity check.
* `ophis_unit_tests.js:100,103-118` — `selfCheckMsrfFilter`.
* `ophis_view.js:709-736` — the About screen's coloured listing of every MSRF number.

Because `.sort()` mutates in place and `MSRF_FILTER__FINAL` is built from `concat()` (which copies),
the three tier arrays are **not** re-ordered by this line. Good — reference-equality on those
arrays is load-bearing (see §7 GOTCHA-6).

### 1.7 Known defects in the number sets

1. **`1574` is out of sort order.** `ophis_model__params.js:30` reads
   `… 1585, 1620, 1641, 1574, 1680, …`. `1574` sits at index 248, between `1641` and `1680`.
   Nothing in the code depends on NORMAL being sorted (`checkExactMatch` is a linear scan,
   `ophis_utils.js:188-198`), so this is cosmetic — but it is almost certainly a transcription
   error for a value in the 1640–1680 range. `selfCheckMsrfOnStartup` only checks
   *positive-integer-ness* and *duplication*, never ordering (`ophis_model__validation.js:1047-1087`).
   **Reproduce the array verbatim including `1574` at its literal position** — reordering it would
   change nothing functionally, but "fixing" it to a different value would change results.
2. **No duplicates.** Machine-checked: `MSRF_FILTER__FINAL` contains zero duplicate values, so
   `selfCheckMsrfOnStartup` currently reports no errors.
3. **The re-enablement of 21 and 76 is deliberate.** `ophis_model__params.js:15-16`:
   ```
   // NOTE: Filter numbers 21 and 76 have been commented out since rounded down vortex numbers match these.
   // UPDATE: Re-enabled 21 and 76 after discussion with Jason to match a vortex number within a certain tolerance.
   ```
   `21` is at NORMAL index 1, `76` at index 20. They collide with `floor(21.7) = 21` and
   `floor(76.2) = 76`. The historical duplicate check used `Math.floor` on both sides
   (`ophis_model__validation.js:1071-1074`, now commented out); with flooring removed, the
   values coexist legitimately. **See §2.6 for the actual, surprising runtime consequences.**

---

## 2. MSRF matching — `getMsrfMatch`

**Location:** `src/ophis_utils.js:148-219`.
**Signature:** `getMsrfMatch(axialRotationCount: number) -> MsrfMatchStruct | null`
**Pure.** No side effects. Called once per operation-result at tag time
(`ophis_model__operations.js:593`) and again, redundantly, for UI tooltips
(`ophis_view__output.js:456`, `:842`) and the About page (`ophis_view.js:722`).

### 2.1 Return shape

```ts
type MsrfMatchStruct = {
  msrf_filter:   number[];   // *reference* to MSRF_FILTER__NORMAL | __IMPORTANT | __VORTEX
  msrf_number:   number;     // the filter element that matched (NOT the probe value)
  points:        1 | 2;      // 1 normal, 2 important, 2 vortex
  css_class:     "msrf_normal" | "msrf_important" | "msrf_vortex";
  readable_name: "Normal" | "Important" | "Vortex";

  // The two fields below are NOT set by getMsrfMatch. They are grafted on by
  // tagZDates() immediately after (ophis_model__operations.js:596-597):
  y_struct?:         YStruct;
  operation_result?: OperationResult;
};
```

### 2.2 Algorithm, exact order

```js
function getMsrfMatch(axialRotationCount) {
    // STEP 0 — normalise the probe to one decimal place.
    axialRotationCount = roundNumberToAxialRotationPrecision(axialRotationCount);

    function newFilterMatchStruct(msrfFilter, msrfNumber) { /* table in §2.1 */ }

    // STEP 1 — VORTEX, checked FIRST, with tolerance.
    for ( var i = 0; i < MSRF_FILTER__VORTEX.length; i++ ) {
        var ithFilterNumber = MSRF_FILTER__VORTEX[i];
        if ( areEqualWithinTolerance(ithFilterNumber, axialRotationCount, VORTEX_FILTER_MATCH_TOLERANCE) ) {
            return newFilterMatchStruct(MSRF_FILTER__VORTEX, ithFilterNumber);
        }
    }

    function checkExactMatch(filter, axialRotationCountRoundedInner) {
        for ( var i = 0; i < filter.length; i++ ) {
            var ithFilterNumber = filter[i];
            if ( ithFilterNumber == axialRotationCountRoundedInner ) {
                return newFilterMatchStruct(filter, ithFilterNumber);
            }
        }
        return null;
    }

    // STEP 2 — the ".5 is a dead zone" rule (STRING test, not numeric).
    // As per Jason, numbers "right in the middle" are counted as no match.
    // Must trend towards either the floor or the ceiling.
    var axialRotationCountAsString = axialRotationCount + "";
    if ( axialRotationCountAsString.endsWith(".5") ) {
        return null;
    }

    // STEP 3 — round to nearest integer.
    var axialRotationCountRounded = oph_round(axialRotationCount);   // Math.round
    var toReturn = null;

    // STEP 4 — IMPORTANT exact match (checked BEFORE normal).
    toReturn = checkExactMatch(MSRF_FILTER__IMPORTANT, axialRotationCountRounded);
    if ( toReturn != null ) { return toReturn; }

    // STEP 5 — NORMAL exact match.
    toReturn = checkExactMatch(MSRF_FILTER__NORMAL, axialRotationCountRounded);
    return toReturn;   // may be null
}
```

Supporting primitives:

```js
// ophis_utils.js:308-316 — INCLUSIVE, symmetric
function areEqualWithinTolerance(value1, value2, tolerance) {
    var absDelta = Math.abs(value1 - value2);
    return absDelta <= tolerance;
}

// ophis_utils.js:995-1004
function roundNumberToAxialRotationPrecision(value) {
    return roundNumberToPrecision(value, DECIMAL_PRECISION__AXIAL_ROTATIONS); // precision = 1
}
function roundNumberToPrecision(value, precision) {
    var factor = Math.pow(10, precision);
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

// ophis_utils.js:1050-1053
function oph_round(value) { return Math.round(value); }
```

Constants: `VORTEX_FILTER_MATCH_TOLERANCE = .1` (**`ophis_config.js:367`**),
`DECIMAL_PRECISION__AXIAL_ROTATIONS = 1` (`ophis_config.js:371`).

### 2.3 The vortex tolerance, precisely

**Tolerance = `0.1`, inclusive (`<=`), applied to `|vortexNumber − probe|`, where the probe has
already been rounded to one decimal place.**

An integer day count *never* matches a vortex number: `|21.7 − 21| = 0.7 > 0.1`,
`|21.7 − 22| = 0.3 > 0.1`. The vortex numbers are reachable **only** because
`rotation_count_z` is a *one-decimal* quantity, not an integer. Operations divide/multiply Y by
π, φ, π·φ, 7.01 etc., so fractional day offsets like `21.7` are the norm, not the exception.

> The About screen states this: `ophis_view.js:600` —
> *"The exception to MSRF integers are the Vortex Numbers which DO have a decimal component and are
> matched if the Z-Value is equal +/- 0.1"*.

**But the ±0.1 window is NOT symmetric in practice, because IEEE-754 double subtraction of
one-decimal values lands on either side of exactly 0.1.** This is not theoretical — it changes
results. Machine-computed exhaustive table of *every* one-decimal probe value that matches each
vortex number:

| Vortex number | Probe values that match (1-dp) | −0.1 side | +0.1 side |
|---|---|---|---|
| `21.7`  | `21.6, 21.7`   | ✅ (Δ = 0.09999999999999787) | ❌ (Δ = 0.10000000000000142) |
| `32.6`  | `32.6`         | ❌ (Δ = 0.10000000000000142) | ❌ (Δ = 0.10000000000000142) |
| `43.5`  | `43.5`         | ❌ (Δ = 0.10000000000000142) | ❌ (Δ = 0.10000000000000142) |
| `65.3`  | `65.2, 65.3`   | ✅ (Δ = 0.09999999999999432) | ❌ (Δ = 0.10000000000000853) |
| `76.2`  | `76.2, 76.3`   | ❌ (Δ = 0.10000000000000853) | ✅ (Δ = 0.09999999999999432) |
| `87.1`  | `87.0, 87.1`   | ✅ (Δ = 0.09999999999999432) | ❌ (Δ = 0.10000000000000853) |
| `217.8` | `217.8, 217.9` | ❌ (Δ = 0.10000000000002274) | ✅ (Δ = 0.09999999999999432) |
| `326.7` | `326.6, 326.7` | ✅ (Δ = 0.0999999999999659)  | ❌ (Δ = 0.10000000000002274) |
| `435.6` | `435.6, 435.7` | ❌ (Δ = 0.10000000000002274) | ✅ (Δ = 0.0999999999999659)  |
| `653.4` | `653.4`        | ❌ (Δ = 0.10000000000002274) | ❌ (Δ = 0.10000000000002274) |
| `762.3` | `762.2, 762.3` | ✅ (Δ = 0.09999999999990905) | ❌ (Δ = 0.10000000000002274) |
| `871.2` | `871.2, 871.3` | ❌ (Δ = 0.10000000000002274) | ✅ (Δ = 0.09999999999990905) |

So of 12 vortex numbers: **3 match only themselves** (`32.6`, `43.5`, `653.4`),
**5 also match probe−0.1**, **4 also match probe+0.1**. Never both.

**Reimplementation directive:** to be bit-compatible with Ophis v12, implement the comparison as
literal IEEE-754 `Math.abs(v1 - v2) <= 0.1` on JS doubles. Do **not** "fix" it with an epsilon,
integer-cents arithmetic, or `<= 0.1 + 1e-9` — that would widen 7 of the 12 windows and change
scores. If you deliberately want the symmetric behaviour, expose it as a mod/config flag and
document the divergence.

### 2.4 The `.5` dead-zone rule

`ophis_utils.js:200-205`. After the vortex pass fails, the probe's **decimal string
representation** is tested for the suffix `".5"`; if present, `getMsrfMatch` returns `null`
immediately.

* This is a **string** test on `value + ""`, not `value % 1 === 0.5`.
* It runs **after** the vortex pass, which matters because **`43.5` is itself a vortex number** —
  a probe of exactly `43.5` returns a *Vortex* match at Step 1 and never reaches the dead-zone
  test. Every other `x.5` probe (`11.5`, `12.5`, `2519.5`, …) returns `null`.
* Negative probes: `(-12.5) + ""` is `"-12.5"`, which ends with `".5"` → `null`.
  (Note `Math.round(-12.5)` would be `-12` in JS — half-up, not half-away-from-zero — but the
  dead-zone rule short-circuits before that ever matters for `.5` values.)
* Because Step 0 already rounded to 1 dp, the string is always of the form `"<int>"` or
  `"<int>.<one digit>"` for the values reachable here (max magnitude 36 500 — no exponential
  notation).

The About page phrases it as: *"Z-Values like 11.5 or 12.5 will never match an MSRF integer since
they are 'right in the middle'"* (`ophis_view.js:600`).

### 2.5 Integer rounding for the NORMAL / IMPORTANT tiers

`oph_round` is a thin wrapper over `Math.round` (`ophis_utils.js:1050-1053`), i.e. **half-up**
(`Math.round(2.5) === 3`, `Math.round(-2.5) === -2`). Given the dead-zone rule strips every
`x.5`, half-up vs. half-even is unobservable for positive probes.

Effective integer match window: a probe `p` (1-dp) matches integer `n` iff
`p ∈ {n-0.4, n-0.3, n-0.2, n-0.1, n, n+0.1, n+0.2, n+0.3, n+0.4}`.
Documented example from `ophis_view.js:600`: *"Z=12.4 matches 12 and 20.6 matches 21."*
Unit-tested at `ophis_unit_tests.js:73-74`: `getMsrfMatch(12.5) === null`,
`getMsrfMatch(12.4).msrf_filter === MSRF_FILTER__NORMAL`.

### 2.6 Tier precedence and the 21 / 76 collision — actual behaviour

Precedence is **VORTEX → (dead-zone) → IMPORTANT → NORMAL**.

Consequences of the vortex-first ordering, combined with the asymmetric windows of §2.3 and the
re-enabled NORMAL entries `21` and `76`:

| Probe | Result | Why |
|---|---|---|
| `21.6` | **Vortex 21.7** (2 pts, ×2.0) | vortex window includes −0.1 side |
| `21.7` | **Vortex 21.7** | exact |
| `21.8` | **no match** | vortex Δ > 0.1; `round(21.8) = 22`, and 22 ∉ any set |
| `21.4` | **Normal 21** | vortex fails; `round(21.4) = 21` ∈ NORMAL |
| `21.0` | **Normal 21** | vortex fails; `round(21) = 21` ∈ NORMAL |
| `76.1` | **no match** | vortex Δ > 0.1 (the −0.1 side fails for 76.2); `round(76.1) = 76` ∈ NORMAL → **Normal 76** |
| `76.2` | **Vortex 76.2** | exact |
| `76.3` | **Vortex 76.2** | vortex window includes +0.1 side, *and it wins over* `round(76.3) = 76` ∈ NORMAL |
| `76.4` | **Normal 76** | vortex fails; `round(76.4) = 76` |

Row `76.1` corrects itself: vortex fails, then NORMAL 76 matches — so `76.1` is a **Normal**
match. The genuinely surprising cell is **`76.3` → Vortex**, where the vortex pass steals a probe
that would otherwise be a Normal 76 match, upgrading it from 1 point/×1.5 to 2 points/×2.0.
Similarly `217.9` → Vortex `217.8` steals from Normal `218`.

Only `76`, `218`, `21` and `87` are near-vortex NORMAL entries; machine-checked:
`round(vortex)` lands inside NORMAL only for `76.2 → 76` and `217.8 → 218`; no vortex rounds
into IMPORTANT.

---

## 3. Alpha vs Beta operations

### 3.1 Definition

`src/ophis_model__params.js:48-54`:

```js
function isAlphaOperation(operation) {
    return operation.weight >= POINTS__ALPHA_OPERATION_MATCH;   // weight >= 1
}
function isBetaOperation(operation) {
    return operation.weight < POINTS__ALPHA_OPERATION_MATCH;    // weight <  1
}
```

with `POINTS__ALPHA_OPERATION_MATCH = 1` and `POINTS__BETA_OPERATION_MATCH = .5`
(`ophis_model__params.js:2-3`).

The About screen restates it verbatim: *"Alpha Operations are those with a 'weight' >= 1,
otherwise it's a Beta Operation."* (`ophis_view.js:635`). The Operations settings screen tooltip
repeats it: *"Weight >= 1 is considered an Alpha Operation, otherwise Beta."*
(`ophis_view__settings.js:713`).

### 3.2 Every place the alpha/beta distinction changes behaviour

There are **exactly four**, and only one of them touches the number crunching:

1. **Score contribution (the only numeric effect).** `getOperationScore`
   (`ophis_model__operations.js:530-543`) adds `operation.weight` — the *raw float*, not a
   bucketed 1-or-0.5. Alpha/beta is therefore **not** consulted by the scorer at all; it is a
   *presentation label* derived from the same weight the scorer already sums. Reimplementers
   frequently get this wrong and branch on alpha/beta inside the scorer. **Do not.**
2. **Operation-match sort order.** `sortOperationMatches`
   (`ophis_model__sorting.js:314-348`) sorts weight-descending first, so all alpha pills precede
   all beta pills within a Z-Date's operation column.
3. **Rendering.** CSS class `operation_alpha` (`darkgoldenrod`, `ophis.css:102-105`) vs.
   `operation_beta` (`#00c0ff`, `:92-95`); pill border via the `operation_type="alpha"|"beta"`
   attribute (`ophis.css:112-122`); tooltip label `"Alpha Operation"` / `"Beta Operation"`
   (`ophis_view__output.js:449`); debug-screen "Type" column text `"Alpha"` / `"Beta"`
   (`ophis_view__output.js:878-879`); chart line colours `COLOR__OPERATION_ALPHA =
   "rgba(184, 134, 11, 1.0)"` / `COLOR__OPERATION_BETA = "rgba(0, 192, 255, 1.0)"`
   (`ophis_view__config.js:21-22`).
4. **Chart z-ordering.** `ophis_view__chart_datasets.js:842,867-868` — alpha operations get
   `dataSetOrder = CHART_DATASET_ORDER__ALPHA_OPERATION` (`= 7`,
   `ophis_view__chart_config.js:71`), drawing them above beta lines.

Note `isBetaOperation` itself is **dead code** in v12 — its only occurrences are inside a
commented-out block at `ophis_view.js:662`. Every live call site uses
`isAlphaOperation(x) ? A : B`.

### 3.3 Weight editing and clamping

`ophis_view__settings.js:780-801` — `onWeightInputUpdate`:

```js
var parsedFloat = parseFloatString(targetElem.value, 0, "");
if ( parsedFloat == null || parsedFloat <= 0 ) {
    parsedFloat = POINTS__BETA_OPERATION_MATCH;   // 0.5
}
currentIsoEvent.operations[rowIndex].weight = parsedFloat;
```

So a user cannot set weight ≤ 0; anything invalid or non-positive silently becomes `0.5` (beta).
There is **no upper bound** — a weight of `1000` is accepted and multiplies straight through the
score. A newly added operation defaults to `newOperation("X1+Y", POINTS__BETA_OPERATION_MATCH,
OPERATION_ENABLED_TRUE)` (`ophis_controller.js:249`) — equation `"X1+Y"`, weight `0.5`.

### 3.4 `MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES` — DEAD CONSTANT

`ophis_model__params.js:7`:

```js
var MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES = 2;
```

**This identifier appears exactly once in the entire v12 tree — at its own declaration.**
Verified by grep over `src/` and `dist/`: zero read sites. It is vestigial.

The rule it once implemented survives only as commented-out UI copy at
`ophis_view.js:634`:

```
// contentRowInnerHtml += "<li>"+readablePointsString(POINTS__BETA_OPERATION_MATCH)+" for every
//   <span class='operation_beta'>Beta Operation</span> that generated it.</li>";
//   , as long as one or more of the following conditions are met:
//     <ul><li>At least one other <span class='operation_alpha'>Alpha</span> match.</li>
//         <li>At least one other <span class='operation_beta'>Beta</span> match.</li>
//         <li>At least one MSRF match.</li></ul>
```

**Historical semantics (inferred from the constant name + that comment, NOT from live code):** a
lone beta operation hit used to earn nothing; a Z-Date needed either ≥1 alpha hit, or ≥2 beta
hits, or ≥1 MSRF match before beta hits counted.

**In v12 this gating does not exist.** A single beta hit with no other hits produces
`score = 0.5`, `hit_count = 1`. A rebuild that implements the historical rule will not match
v12 output. If you want it as a mod, gate it behind a flag and default it OFF.

### 3.5 The default operation table (weights ⇒ alpha/beta at defaults)

`ophis_model__params.js:65-143`. Three ladder functions produce the defaults; only the
`Gte10` variant is reachable in v12 (`ophis_controller.js:128`,
`ophis_model__validation.js:638,642`).

`DEFAULT_OPHIS_OPERATIONS_LTE_V7` (the base table, `:65-110`), in array order — the index is the
`operation_ordinal` used everywhere downstream:

| # (ordinal) | Equation | Base weight | Source comment |
|---|---|---|---|
| 0 | `X2+oph_round(Y)` | 1 (α) | "2. Y + X2 + Isometric Date" |
| 1 | `X2+oph_flip(oph_round(Y))` | 1 (α) | "3. Y reversed + X2 (Holo-)" |
| 2 | `X2+Y/OPH_CRV` | .5 (β) | "4. Y div. 5.08 + X2" |
| 3 | `X1+(Y/2.0)xOPH_PI` | .5 (β) | "5. Y div. 2 X 3.14 + X1" |
| 4 | `X2+Y/OPH_PHI` | 1 (α) | "6. Y div. 1.618 + X2" |
| 5 | `X2+(Y/2.0)xOPH_PHI` ⟵ `OPERATION_EQUATION_FOR_ORIGINAL_BETA_PHI_6` | .5 (β) | "7. Y div. 2 X 1.618 + X2" |
| 6 | `X1+(Y/2.0)xOPH_CRV` | .5 (β) | "8. Y div. 2 X 5.08 + X1" |
| 7 | `X2+(Y/2.0)xOPH_PI` | .5 (β) | "9. Y div. 2 X 3.14 + X2" |
| 8 | `X2+YxOPH_PHI` | 1 (α) | "10. Y X1.618 + X2" |
| 9 | `X1+YxOPH_PI` ⟵ `OPERATION_EQUATION_FOR_RADIUS_PROJECTION` | .5 (β) | "11. Y X3.14 + X1" |
| 10 | `X2+(Y/2.0)xOPH_CRV` | .5 (β) | "12. Y div. 2 X 5.08 + X2" |
| 11 | `X2+YxOPH_PI` | .5 (β) | "13. Y X3.14 + X2" |
| 12 | `X1+YxOPH_CRV` | .5 (β) | "14. Y X 5.08 + X1" |
| 13 | `X2+YxOPH_CRV` | .5 (β) | "15. Y X 5.08 + X2" |
| 14 | `X1+YxOPH_HEP` | 1 (α) | "New Hepta-Cycle Operation from Jason, Early-August 2025" — passed `OPERATION_ENABLED_FALSE` |

The two named equation constants (`ophis_model__params.js:62-63`):

```js
var OPERATION_EQUATION_FOR_RADIUS_PROJECTION      = "X1+YxOPH_PI";
var OPERATION_EQUATION_FOR_ORIGINAL_BETA_PHI_6    = "X2+(Y/2.0)xOPH_PHI";
```

**`cloneDefaultOperationsForAppVersionGte8()`** (`:119-135`) deep-clones the base table, forces
`enabled = true` on **every** entry, and **promotes ordinals 9 and 5 from beta (0.5) to alpha (1)**
by matching on those two equation strings. Result: default alpha set becomes
`{0, 1, 4, 5, 8, 9, 14}`, default beta set `{2, 3, 6, 7, 10, 11, 12, 13}`.

**`cloneDefaultOperationsForAppVersionGte10()`** (`:137-143`) = the Gte8 table plus
`deepClone(OPH_HEP_OPERATION_FOR_X2)` appended as **ordinal 15**:

```js
// ophis_model__params.js:112-113
// New Hepta-Cycle Operation from Jason but for this one Z-Value is added to X2, Late-December 2025
var OPH_HEP_OPERATION_FOR_X2 = newOperation("X2+YxOPH_HEP", POINTS__ALPHA_OPERATION_MATCH, OPERATION_ENABLED_TRUE)
```

Final v12 default: **16 operations, ordinals 0–15, all `enabled: true`**, alphas =
`{0,1,4,5,8,9,14,15}` (weight 1), betas = `{2,3,6,7,10,11,12,13}` (weight 0.5).
Confirmed against a real saved preset: `test-bradley.oph` lines 112–120 show
`X1+YxOPH_HEP` and `X2+YxOPH_HEP` both `"weight": 1, "enabled": true`.

**`cloneDefaultOperationsForAppVersionLte7()`** (`:115-117`) is **dead** — its only reference is a
commented-out line at `ophis_model__validation.js:643`.

Constants used by the equations (`ophis_config.js:410-413`, with
`FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION = true` at `:287`):
`OPH_PI = 3.14`, `OPH_PHI = 1.618`, `OPH_CRV = 5.08`, `OPH_HEP = 7.01`.
(`OPH_PHI` deliberately keeps 3 dp while `DECIMAL_PRECISION__TIME = 2` — see the comment at
`ophis_config.js:394-398`.)

### 3.6 BUG: `newOperation` ignores its `enabled` argument

`ophis_utils.js:1006-1012`:

```js
function newOperation(equation, weight, enabled = true) {
    return {
        equation: equation,
        weight: weight,
        enabled: true          // <-- hard-coded; the `enabled` parameter is never read
    };
}
```

Therefore `newOperation("X1+YxOPH_HEP", POINTS__ALPHA_OPERATION_MATCH, OPERATION_ENABLED_FALSE)`
(`ophis_model__params.js:109`) produces `{enabled: true}`. Ordinal 14 is **enabled by default**
despite the author's evident intent. `cloneDefaultOperationsForAppVersionGte8` would have forced
it on anyway (`:125`), so the observable effect is confined to any direct consumer of
`DEFAULT_OPHIS_OPERATIONS_LTE_V7` — of which there are none in v12.

`OPERATION_ENABLED_TRUE = true` / `OPERATION_ENABLED_FALSE = false`
(`ophis_model__params.js:59-60`) are thus effectively decorative.

---

## 4. Scoring systems

### 4.1 The enum

`ophis_config.js:47-55` — **the string values equal the identifier names**:

```js
var SCORING_SYSTEM__LTE_V7 = "SCORING_SYSTEM__LTE_V7";
var SCORING_SYSTEM__GTE_V8 = "SCORING_SYSTEM__GTE_V8";
var DEFAULT_SCORING_SYSTEM = SCORING_SYSTEM__GTE_V8;
var SCORING_SYSTEMS = [ SCORING_SYSTEM__LTE_V7, SCORING_SYSTEM__GTE_V8 ];
```

**There are exactly two.** Serialized on the iso-event under key `scoring_system`
(confirmed in `test-bradley.oph`: `"scoring_system": "SCORING_SYSTEM__GTE_V8"`).

Resolution (`ophis_model__operations.js:17-23`):

```js
function getScoringSystem(isoEvent) {
    if ( SCORING_SYSTEMS.includes(isoEvent.scoring_system) ) { return isoEvent.scoring_system; }
    else { return SCORING_SYSTEM__GTE_V8; }
}
```

Import validation (`ophis_model__validation.js:647-674`): under `FILE_INPUT_VALIDATION_MODE__STRICT`
an unrecognised value is a hard import error; otherwise it is coerced to `SCORING_SYSTEM__GTE_V8`
**regardless of the file's `app_version`** — the `appVersionForImportAsInt >= 8` branch and its
`else` branch both assign `GTE_V8`, with the `LTE_V7` assignment commented out at `:661` and `:671`
("Based on PR feedback, default to newest scoring system, regardless").

New events are created with `scoring_system: SCORING_SYSTEM__GTE_V8` (`ophis_controller.js:129`).

**Practical consequence: `SCORING_SYSTEM__LTE_V7` is only reachable if an `.oph` file explicitly
carries that exact string.** The GUI has no control that sets it. It is legacy-compat only.

### 4.2 Ingredients shared by both systems

`operationSubscore` — `getOperationScore(effectiveOperations, operationMatchStructs)`
(`ophis_model__operations.js:530-543`):

```js
function getOperationScore(effectiveOperations, operationMatchStructs) {
    var toReturn = 0;
    for ( var i = 0; i < operationMatchStructs.length; i++ ) {
        var ithOperationMatchStruct = operationMatchStructs[i];
        var ithOperationOrdinal = ithOperationMatchStruct.operation_result.operation_ordinal;
        var ithOperation = effectiveOperations[ithOperationOrdinal];
        var weight = ithOperation.weight;
        ithOperationMatchStruct.points = weight;   // SIDE EFFECT: writes .points onto the struct
        toReturn += weight;
    }
    return toReturn;
}
```

*Side effect:* stamps `points` on each operation-match struct (consumed by the tooltip at
`ophis_view__output.js:447,478`). It re-reads the weight from `effectiveOperations` by ordinal
rather than from the cached operation on the result, so **live weight edits are picked up on the
next scoring pass**.

`msrfMultiplier` — `getMsrfScoreMultiplier(msrfMatches)` (`:478-492`): the **maximum** multiplier
across all of the Z-Date's MSRF matches, floor `1.0`.

```js
function getMsrfScoreMultiplier(msrfMatches) {
    var toReturn = 1.0;
    for ( var i = 0; i < msrfMatches.length; i++ ) {
        var ithMultiplier = getMsrfScoreMultiplierForFilter(msrfMatches[i].msrf_filter);
        if ( ithMultiplier > toReturn ) { toReturn = ithMultiplier; }
    }
    return toReturn;
}
```

`getMsrfScoreMultiplierForFilter(msrfFilter)` (`:463-476`) maps by **reference identity**
(`==` against the module-level arrays), default `1.0`:
NORMAL → `1.5`, IMPORTANT → `2.0`, VORTEX → `2.0`.

So multiplier is `1.0` (no MSRF), `1.5` (normal-only), or `2.0` (any important or vortex present).

`msrfMatchSubscore` — `sumUpMsrfMatchSubscore(msrfMatches, scoringSystem)` (`:494-516`):

```js
function sumUpMsrfMatchSubscore(msrfMatches, scoringSystem) {
    var overallScoreMultiplier = getMsrfScoreMultiplier(msrfMatches);
    var toReturn = 0;
    var alreadyFoundScoreMultiplier = false;

    for ( var i = 0; i < msrfMatches.length; i++ ) {
        var ithMsrfMatchStruct = msrfMatches[i];
        var ithScoreMultiplier = getMsrfScoreMultiplierForFilter(ithMsrfMatchStruct.msrf_filter);

        if ( alreadyFoundScoreMultiplier == false
             && ithScoreMultiplier == overallScoreMultiplier
             && scoringSystem == SCORING_SYSTEM__GTE_V8 ) {
            alreadyFoundScoreMultiplier = true;
            // Don't add this MSRF number into the base points equation, since it will be the multiplier.
        } else {
            toReturn += ithMsrfMatchStruct.points;
        }
    }
    return toReturn;
}
```

Reading: under GTE_V8, **exactly one** MSRF match — the *first in array order* whose multiplier
equals the maximum — is *withheld from the additive base* because it is "spent" as the multiplier.
Under LTE_V7 the guard fails, so **all** matches are added and no multiplier is applied later.

Because `scoreZDates` runs `sortMsrfMatches` **before** calling this (`:426` then `:429`), and
`sortMsrfMatches` orders multiplier-descending, the withheld element is always
`msrf_match_structs[0]` in practice.

### 4.3 `SCORING_SYSTEM__LTE_V7` — complete formula

```
opScore      = Σ over operation_match_structs of  effectiveOperations[ordinal].weight
msrfSubscore = Σ over msrf_match_structs      of  match.points        // ALL of them
finalScore   = opScore + msrfSubscore                                  // no multiplier
score        = roundNumberToPrecision(finalScore, 2)
```

Step by step (`ophis_model__operations.js:428-456`):

1. `sortOperationMatches(operation_match_structs)` (in place).
2. `sortMsrfMatches(msrf_match_structs)` (in place).
3. `operationSubscore = getOperationScore(effectiveOperations, operation_match_structs)`.
4. `msrfMatchSubscore = sumUpMsrfMatchSubscore(msrf_match_structs, LTE_V7)` — the exclusion guard
   short-circuits on the `scoringSystem == GTE_V8` clause, so every match's `points` is added.
5. `operationHitCount = operation_match_structs.length`;
   `msrfHitCount = msrf_match_structs.length`;
   `finalHitCount = operationHitCount + msrfHitCount`.
6. `finalScore = operationSubscore + msrfMatchSubscore`.
7. `baseScorePreMultiply = finalScore` (captured **before** the branch, `:439`).
8. Branch: LTE_V7 → *"Nothing more to do."* (`:441-442`).
9. `finalScoreRounded = roundNumberToPrecision(finalScore, DECIMAL_PRECISION__SCORE /* 2 */)`.
10. Write back: `operation_score`, `operation_hit_count`, `score`, `base_score_pre_multiply`
    (**unrounded**), `hit_count`.

Worked example — Z-Date hit by α(1) + β(0.5) + β(0.5) with one Important and one Normal MSRF:
`opScore = 2.0`, `msrfSubscore = 2 + 1 = 3`, `score = 5.00`, `hit_count = 3 + 2 = 5`.

### 4.4 `SCORING_SYSTEM__GTE_V8` — complete formula

```
opScore      = Σ over operation_match_structs of  effectiveOperations[ordinal].weight
M            = max multiplier over msrf_match_structs, floor 1.0    (1.0 | 1.5 | 2.0)
msrfSubscore = Σ over msrf_match_structs of match.points,
               EXCLUDING the first struct whose own multiplier == M
base         = opScore + msrfSubscore
finalScore   = base * M
score        = roundNumberToPrecision(finalScore, 2)
```

Steps 1–7 identical to §4.3 (with `sumUpMsrfMatchSubscore(..., GTE_V8)`). Then:

8. `msrfMultiplier = getMsrfScoreMultiplier(msrf_match_structs)`; `finalScore *= msrfMultiplier`
   (`ophis_model__operations.js:443-446`).
9. `finalScoreRounded = roundNumberToPrecision(finalScore, 2)`.
10. Same write-back. `base_score_pre_multiply` holds the **pre-multiplication, unrounded** value —
    this is exactly what the UI tooltips quote (`ophis_view__output.js:478,601,603`).

Any other `scoringSystem` string falls through to
`console.warn("Unhandled scoring system: " + scoringSystem)` (`:447-449`) and behaves like LTE_V7
(no multiplier). Unreachable via `getScoringSystem`, which coerces unknowns to GTE_V8.

Worked examples (GTE_V8):

| Operation hits | MSRF matches | M | msrfSubscore | base | final | rounded `score` | `hit_count` |
|---|---|---|---|---|---|---|---|
| 1 α (1.0) | none | 1.0 | 0 | 1.0 | 1.0 | `1` | 1 |
| 1 β (0.5) | none | 1.0 | 0 | 0.5 | 0.5 | `0.5` | 1 |
| 1 α (1.0) | 1× Normal | 1.5 | 0 (the only Normal is withheld) | 1.0 | 1.5 | `1.5` | 2 |
| 1 α (1.0) | 2× Normal | 1.5 | 1 (second Normal added) | 2.0 | 3.0 | `3` | 3 |
| 1 α (1.0) | 1× Important | 2.0 | 0 | 1.0 | 2.0 | `2` | 2 |
| 1 α (1.0) | 1× Important + 1× Normal | 2.0 | 1 (Important withheld, Normal added) | 2.0 | 4.0 | `4` | 3 |
| 1 α (1.0) | 1× Vortex + 1× Important | 2.0 | 2 (first max-multiplier struct withheld; the other, also ×2.0, is added) | 3.0 | 6.0 | `6` | 3 |
| 2 α + 3 β (3.5) | 1× Normal | 1.5 | 0 | 3.5 | 5.25 | `5.25` | 6 |
| none | none | 1.0 | 0 | 0 | 0 | `0` | 0 |

The final row is achievable only in theory — a z-struct is created only when an operation result
lands on it (`tagZDates`, `ophis_model__operations.js:561-591`), so `operation_hit_count ≥ 1`
always.

**A ×2.0 tier match is worth *more as a multiplier* than as points once base > 2.** For
`base = 3.5`, spending an Important as a multiplier yields `7.0`; adding it as 2 points would
yield `5.5`. The design deliberately picks the multiplier interpretation for the single strongest
match and the additive interpretation for the rest.

### 4.5 The rounding rule

`DECIMAL_PRECISION__SCORE = 2` (`ophis_config.js:372`).

```js
function roundNumberToPrecision(value, precision) {
    var factor = Math.pow(10, precision);          // 100
    return Math.round((value + Number.EPSILON) * factor) / factor;
}
```

`Number.EPSILON` (≈ 2.22e-16) is added **before** scaling to nudge exact-half representations up
(`roundNumberToPrecision(1.005, 2) === 1.01`, whereas naive `Math.round(1.005*100)/100 === 1`).
Reproduce this literally.

Only `score` is rounded. `base_score_pre_multiply` is stored raw and rendered raw in tooltips
(`ophis_view__output.js:478`, `:601`, `:603`), so a base like `5.699999999999999` can appear
verbatim in a tooltip string.

---

## 5. Filtering — `filterZDates`

**Location:** `src/ophis_model__sorting.js:3-204`.
**Signature:** `filterZDates(isoEvent, zStructsDict, nativeDateUtcCutoff = null) -> string[]`
(array of z-struct dictionary keys — the Z-Date-start epoch-millis, **as strings**).
**Pure w.r.t. its inputs** (reads only; no mutation).
**Called from:** `sortAndFilterResults` (`ophis_model__operations.js:157`) with
`currentLocalDate = getCurrentLocalTime(appState.globalOptions.local_time_offset_in_millis)`.

**Requires scoring to have already run** — it reads `.score` and `.hit_count`.
`runOphisOnEvent` guarantees this (`scoreZDates` at `:129`, `sortAndFilterResults` at `:147`).

### 5.1 Preamble

1. **Find the last enabled X-Date** by scanning `isoEvent.x_dates` **backwards**, taking the first
   entry with `enabled === true` (`:9-15`). If none is enabled, `lastXDate` stays `null` and the
   subsequent `xDateToNativeDate(...)` call is made with `null` — reachable only if the caller
   skipped the `effectiveXDateCount < MINIMUM_NUMBER_OF_X_DATES` guard (`MINIMUM_NUMBER_OF_X_DATES
   = 2`, `ophis_config.js:16`). In the live flow it cannot happen.
2. `lastXDateAsNative = xDateToNativeDate(isoEvent.scope, lastXDate, isoEvent.lat, isoEvent.long)`.
3. **Cutoff normalisation** (`:19-32`): if `nativeDateUtcCutoff != null`, then
   * scope `EVENT_SCOPE__HH_MM` → `nativeDateUtcCutoffMillis = nativeDateToUtcMillis(cutoff)`;
   * otherwise round-trip through the X-Date representation to strip the time-of-day:
     `nativeDateToXDate(cutoff)` → `xDateToNativeDate(scope, thatXDate)` → `getTime()`.
     The comment at `:25-26` calls this *"the 'old way'… kept just in case, though it can probably
     be simplified."*
4. **T-Date collection** (`:34-51`): for each `isoEvent.t_dates[i]` with `enabled === true`,
   convert via `xDateToNativeDate(isoEvent.scope, ithTDate)` (**no lat/long passed**) and push the
   millis. Conversion failures emit
   `console.warn("Could not convert t_date to native: " + JSON.stringify(ithTDate))` and are skipped.
5. **Prior-sunset anchor** (`:53-54`):
   ```js
   var lastXDatePriorSunset = isFlagEnabled(FEATURE_FLAG__SUNSET__FILTER_BASED_ON_PRIOR_SUNSET)
       ? getSunsetNativeUtcDateBefore_withCache(lastXDateAsNative, isoEvent.lat, isoEvent.long)
       : lastXDateAsNative;
   var lastXDatePriorSunsetInMillis = nativeDateToUtcMillis(lastXDatePriorSunset);
   ```
   `FEATURE_FLAG__SUNSET__FILTER_BASED_ON_PRIOR_SUNSET = false` in v12 (`ophis_config.js:305`),
   so **the variable is simply the last enabled X-Date**, despite the name.

### 5.2 Per-Z-Date predicate chain

Iterate `for (var k in zStructsDict)` guarded by `hasOwnProperty`. Set `includeInOutput = true`,
then apply **every** rule below (no early exit — later rules can still flip it false; nothing ever
flips it back to true).

Local aliases (`:62-67`):
```js
var nativeUtcDateToUseForZ        = z.z_date_native_start;
var nativeUtcDateToUseForZInMillis = nativeDateToUtcMillis(nativeUtcDateToUseForZ);
var nativeUtcDateZInMillis_start   = z.z_date_native_start;   // NOTE: a Date, not millis (see GOTCHA-9)
var nativeUtcDateZInMillis_end     = z.z_date_native_end;     // NOTE: a Date, not millis
```

| # | Enabled by field | Serialized key | Default | Scope `HH_MM` test | Other scopes test | Lines |
|---|---|---|---|---|---|---|
| 1 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_BEFORE_LAST_X_DATE` | `iso_event_filter_before_last_x_date` | **on** | `zEnd <= lastX` → exclude | `zStart < lastX` → exclude | 71–81 |
| 2 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_ON_LAST_X_DATE` | `iso_event_filter_on_last_x_date` | **on** | `lastX ∈ [zStart, zEnd)` → exclude | `zStart == lastX` → exclude | 83–93 |
| 3 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_BEFORE_CURRENT_DATE` | `iso_event_filter_before_current_date` | **on** | `zEnd <= cutoff` → exclude | `zStart < cutoff` → exclude | 95–105 |
| 4 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_ON_CURRENT_DATE` | `iso_event_filter_on_current_date` | off | `cutoff ∈ [zStart, zEnd)` → exclude | `zStart == cutoff` → exclude | 107–117 |
| 5 | *(implicit — active whenever ≥1 enabled T-Date exists)* | `t_dates` | n/a | keep only if some T-Date ∈ `[zStart, zEnd)` | keep only if some T-Date `==` `zStart` | 119–141 |
| 6 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_MIN_SCORE` | `iso_event_filter_min_score` / `..._value` | off, value **1** | `z.score < minScore` → exclude | same | 143–149 |
| 7 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_MIN_HIT_COUNT` | `iso_event_filter_min_hit_count` / `..._value` | off, value **2** | `z.hit_count < minHitCount` → exclude | same | 151–157 |
| 8 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_BEYOND_MAX_DAYS` | `iso_event_filter_beyond_max_days` / `..._value` | **on**, value **2559** | `round((zStart − lastX)/86 400 000) > maxDays` → exclude | same | 159–173 |
| 9 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_MSRF_MATCH` | `iso_event_filter_msrf_match` | off | `z.msrf_match_structs.length == 0` → exclude | same | 175–179 |

Field metadata source: `ophis_config.js:122-174`; key derivation
(`SERIALIZED_FIELD__X` → lowercased `x`, plus `x_value`, plus DOM ids
`x-with-dashes-checkbox` / `x-with-dashes-input`) is `newSerializedFieldObject`
(`ophis_utils.js:124-146`).

Numeric-value lookup: `getIsoEventFilterNumbericValue(isoEvent, varName)`
(`ophis_utils.js:93-114`) — `parseFloat` the stored `*_value`; if the result is `< 0` (which
`parseFloatElseNeg1` also returns for `NaN`), warn and fall back to the field's `numericDefault`.
If the varName isn't in `SERIALIZED_FILTER_FIELDS` at all it prints an error and returns `-1.0`.

Rule 8 detail (`:159-173`):
```js
var maxDays       = getIsoEventFilterNumbericValue(isoEvent, "SERIALIZED_FIELD__ISO_EVENT_FILTER_BEYOND_MAX_DAYS");
var millisDelta   = nativeUtcDateToUseForZInMillis - lastXDatePriorSunsetInMillis;
var dayDelta      = millisDelta / MILLIS_PER_DAY;     // MILLIS_PER_DAY = 86 400 000
var dayDeltaRounded = Math.round(dayDelta);
if ( dayDelta != dayDeltaRounded ) { /* warning intentionally suppressed: "Seems to legitmately spam" */ }
if ( dayDeltaRounded > maxDays ) { includeInOutput = false; }
```

Rule 5 detail: the T-Date test is a *whitelist*. If `tDatesInMillis.length > 0` and no T-Date
overlaps the Z-Date, the Z-Date is dropped — regardless of the other filters' checkbox states.

Finally, `if (includeInOutput === true) toReturn.push(ithSunsetBeforeMillisString);` (`:181-183`).
The iteration order of `for…in` over a JS object with **integer-like string keys is ascending
numeric**, so `filterZDates` happens to return keys already in chronological order — but nothing
relies on that; `sortZDates` is always applied afterwards.

Dead code: lines `188-199` are a commented-out earlier version of the same predicate.

---

## 6. Sorting

### 6.1 The sort-type enum

`ophis_config.js:440-453`. **The JS identifiers are `Z_DATE_SORT_TYPE__*` but the string values
are `SORT_TYPE__*`** — this is the cross-module contract and also the **DOM element id** of each
sortable column header.

```js
var Z_DATE_SORT_TYPE__SCORE      = "SORT_TYPE__SCORE";
var Z_DATE_SORT_TYPE__DATE       = "SORT_TYPE__DATE";
var Z_DATE_SORT_TYPE__MSRF       = "SORT_TYPE__MSRF";
var Z_DATE_SORT_TYPE__HIT_COUNT  = "SORT_TYPE__HIT_COUNT";
var Z_DATE_SORT_TYPE__OPERATIONS = "SORT_TYPE__OPERATIONS";
var DEFAULT_Z_DATE_SORT_TYPE     = Z_DATE_SORT_TYPE__DATE;

var Z_DATES_SORT_TYPES = [ SCORE, DATE, MSRF, HIT_COUNT, OPERATIONS ];   // display/registration order

var SORT_ORDER__ASCENDING  = "SORT_ORDER__ASCENDING";
var SORT_ORDER__DESCENDING = "SORT_ORDER__DESCENDING";
```

Five values. Serialized on the iso-event under key **`z_date_sort_type`**, storing the
`"SORT_TYPE__…"` string (confirmed: `test-bradley.oph` → `"z_date_sort_type": "SORT_TYPE__MSRF"`).

Column headers are `<table id="SORT_TYPE__…">` elements; clicking one sets
`getCurrentIsoEvent().z_date_sort_type = ith`, flushes to disk, re-runs
`sortAndFilterResults`, and re-renders (`ophis_view__output.js:674-685`). Header labels and
tooltips: `ophis_view__output.js:237-247, 281-286`:

| Sort type | Header text | Tooltip |
|---|---|---|
| `SORT_TYPE__DATE` | `Z-Dates (<count>)` | "Click to sort by Z-Date, soonest to furthest…" |
| `SORT_TYPE__HIT_COUNT` | `Hits` | "…by number of Hits, highest to lowest, determined by adding number of Operations plus number of MSRF matches." |
| `SORT_TYPE__SCORE` | `Score` | "…by Score, highest to lowest…" |
| `SORT_TYPE__MSRF` | `MSRF` | "…by MSRF importance, determined based on the MSRF number(s) that matched the day count from an X-Date to a Z-Date…" |
| `SORT_TYPE__OPERATIONS` | `Operations` | "…by number of Operations, highest to lowest, determined by how much the Operations contribtued to the overall Score." *(sic)* |

**`z_date_sort_type` is never validated on import.** Unlike `scoring_system`, there is no
`parseZDateSortTypeForLoadedIsoEvent`. `sortZDates` defaults `sortType` only when *falsy*
(`:207`), so a garbage non-empty string flows through and matches none of the branches — see
GOTCHA-2.

### 6.2 `sortZDates` — full comparator

**Location:** `src/ophis_model__sorting.js:206-290`.
**Signature:** `sortZDates(filteredZDates: string[], zStructsDict, sortType, scoringSystem) -> string[]`
Returns a **new** array (`Array.from(filteredZDates)`), sorted in place. Does not mutate the input
array or the dict.

```js
sortType = sortType ? sortType : DEFAULT_Z_DATE_SORT_TYPE;     // falsy → SORT_TYPE__DATE
var toReturn = Array.from(filteredZDates);

toReturn.sort(function(a, b) {
    var sortValueA = 0, sortValueB = 0;

    var za = zStructsDict[a], zb = zStructsDict[b];
    var score_a = za.score,              score_b = zb.score;
    var hitCount_a = za.hit_count,       hitCount_b = zb.hit_count;
    var msrfScore_a = sumUpMsrfMatchSubscore(za.msrf_match_structs, scoringSystem);
    var msrfScore_b = sumUpMsrfMatchSubscore(zb.msrf_match_structs, scoringSystem);
    var msrfNumberSum_a = sumUpMsrfNumbersThemselves(za.msrf_match_structs);
    var msrfNumberSum_b = sumUpMsrfNumbersThemselves(zb.msrf_match_structs);
    var operationCount_a = za.operation_hit_count, operationCount_b = zb.operation_hit_count;
    var operationScore_a = za.operation_score,     operationScore_b = zb.operation_score;

    var sortOrder = SORT_ORDER__ASCENDING;
    var actualSortTypeToUseForThisPair = sortType;

    // ---- TIE-BREAK RE-DISPATCH ----
    if ( sortType == SCORE && score_a == score_b ) {
        if ( hitCount_a == hitCount_b ) { actualSortTypeToUseForThisPair = DATE; }
        else                            { actualSortTypeToUseForThisPair = HIT_COUNT; }
    } else if ( sortType == MSRF && msrfScore_a == msrfScore_b && msrfNumberSum_a == msrfNumberSum_b ) {
        actualSortTypeToUseForThisPair = DATE;
    } else if ( sortType == OPERATIONS && operationScore_a == operationScore_b && operationCount_a == operationCount_b ) {
        actualSortTypeToUseForThisPair = DATE;
    } else if ( sortType == HIT_COUNT && hitCount_a == hitCount_b ) {
        actualSortTypeToUseForThisPair = DATE;
    }

    // ---- VALUE SELECTION ----
    if ( actualSortTypeToUseForThisPair == SCORE ) {
        sortValueA = score_a; sortValueB = score_b;             sortOrder = DESCENDING;
    } else if ( actualSortTypeToUseForThisPair == DATE ) {
        sortValueA = za.z_date_native_start.getTime();
        sortValueB = zb.z_date_native_start.getTime();          sortOrder = ASCENDING;
    } else if ( actualSortTypeToUseForThisPair == MSRF ) {
        if ( msrfScore_a == msrfScore_b ) { sortValueA = msrfNumberSum_a; sortValueB = msrfNumberSum_b; }
        else                              { sortValueA = msrfScore_a;     sortValueB = msrfScore_b;     }
        sortOrder = DESCENDING;
    } else if ( actualSortTypeToUseForThisPair == OPERATIONS ) {
        if ( operationScore_a == operationScore_b ) { sortValueA = operationCount_a; sortValueB = operationCount_b; }
        else                                       { sortValueA = operationCount_a; sortValueB = operationCount_b; }   // <-- IDENTICAL BRANCHES (BUG)
        sortOrder = DESCENDING;
    } else if ( actualSortTypeToUseForThisPair == HIT_COUNT ) {
        sortValueA = hitCount_a; sortValueB = hitCount_b;       sortOrder = DESCENDING;
    }

    var toReturn = (sortValueA > sortValueB ? -1 : 1);
    return toReturn * (sortOrder == SORT_ORDER__DESCENDING ? 1 : -1);
});
```

**Per-sort-type comparator summary**

| `sortType` | Primary key | Direction | Tie-break 1 | Tie-break 2 | Tie-break 3 |
|---|---|---|---|---|---|
| `SORT_TYPE__DATE` | `z_date_native_start.getTime()` | ascending | *(none — keys are unique)* | — | — |
| `SORT_TYPE__SCORE` | `score` | descending | `hit_count` descending (when scores equal **and** hit counts differ) | `z_date_native_start` ascending (when both equal) | — |
| `SORT_TYPE__HIT_COUNT` | `hit_count` | descending | `z_date_native_start` ascending | — | — |
| `SORT_TYPE__MSRF` | `sumUpMsrfMatchSubscore(...)` | descending | `sumUpMsrfNumbersThemselves(...)` descending | `z_date_native_start` ascending | — |
| `SORT_TYPE__OPERATIONS` | **`operation_hit_count`** (intended: `operation_score`) | descending | `operation_hit_count` descending (no-op) | `z_date_native_start` ascending | — |
| anything else (incl. an unrecognised string) | — | — | — | — | see GOTCHA-2 |

`sumUpMsrfNumbersThemselves(msrfMatches)` (`ophis_model__operations.js:518-528`) sums
`msrf_number` across all matches — i.e. it prefers the Z-Date whose matched MSRF *values* are
numerically larger. (Note the stray double semicolon at `:524`, harmless.)

**MSRF primary key is the *subscore*, not the raw match count and not the final score.** Under
GTE_V8 that subscore *excludes* the strongest match, so a Z-Date with a single Important match
(subscore 0) ties with a Z-Date having a single Normal match (subscore 0) and with a Z-Date having
no MSRF matches at all (subscore 0) — all three then fall through to `msrfNumberSum` (0 for the
no-match case), then to date. This is arguably not "sort by MSRF importance" as the tooltip
promises. Documented, not fixed.

### 6.3 `sortMsrfMatches` — per-Z-Date MSRF pill order

**Location:** `src/ophis_model__sorting.js:292-312`. Sorts **in place**, returns `undefined`.
Called once per z-struct from `scoreZDates` (`ophis_model__operations.js:426`), **before** the
subscore is computed.

```js
function sortMsrfMatches(msrfMatchStructs) {
    msrfMatchStructs.sort(function(a, b) {
        var rotationCountForA = a.operation_result.rotation_count_z;
        var rotationCountForB = b.operation_result.rotation_count_z;

        var multiplierA = getMsrfScoreMultiplierForFilter(a.msrf_filter);
        var multiplierB = getMsrfScoreMultiplierForFilter(b.msrf_filter);

        if      ( multiplierA > multiplierB ) { return -1; }
        else if ( multiplierA < multiplierB ) { return  1; }
        else {
            if ( rotationCountForA >= rotationCountForB ) { return -1; }
            else                                          { return  1; }
        }
    });
}
```

Order: **multiplier descending** (Important/Vortex ×2.0 first, then Normal ×1.5), then
**`rotation_count_z` descending** (larger day-offset first). Never returns `0`.

Because Important and Vortex share `2.0`, their relative order is decided purely by
`rotation_count_z`. **This determines which struct is "spent" as the multiplier** in
`sumUpMsrfMatchSubscore` — with a Vortex(2 pts) and an Important(2 pts) on the same Z-Date, the one
with the larger `rotation_count_z` is withheld. Since both carry 2 points, the *score* is
unaffected; only the tooltip attribution differs (`ophis_view__output.js:600-604`).

### 6.4 `sortOperationMatches` — per-Z-Date operation pill order

**Location:** `src/ophis_model__sorting.js:314-348`. In place, returns `undefined`. Called from
`scoreZDates` (`ophis_model__operations.js:425`).

```js
function sortOperationMatches(operationMatchStructs) {
    operationMatchStructs.sort(function(a, b) {
        var yStructA = a.y_struct,  operationResultA = a.operation_result;
        var yStructB = b.y_struct,  operationResultB = b.operation_result;

        // 1. weight DESCENDING  (alpha ops before beta ops)
        if      ( operationResultA.operation.weight > operationResultB.operation.weight ) { return -1; }
        else if ( operationResultA.operation.weight < operationResultB.operation.weight ) { return  1; }

        // 2. operation_ordinal ASCENDING, then x_1_ordinal ASCENDING, then x_2_ordinal ASCENDING
        if ( operationResultA.operation_ordinal == operationResultB.operation_ordinal ) {
            if ( yStructA.x_1_ordinal == yStructB.x_1_ordinal ) {
                if      ( yStructA.x_2_ordinal == yStructB.x_2_ordinal ) { return  1; }   // "equal" → 1
                else if ( yStructA.x_2_ordinal >  yStructB.x_2_ordinal ) { return  1; }
                else                                                     { return -1; }
            } else if ( yStructA.x_1_ordinal > yStructB.x_1_ordinal )    { return  1; }
            else                                                          { return -1; }
        } else if ( operationResultA.operation_ordinal > operationResultB.operation_ordinal ) { return  1; }
        else                                                                                   { return -1; }
    });
}
```

Note it reads `operationResult.operation.weight` — the operation object **snapshotted into the
result** at `runOperations` time (`ophis_model__operations.js:406`) — whereas `getOperationScore`
reads the weight from `effectiveOperations[ordinal]`. Within a single `runOphisOnEvent` pass these
are the same objects, so no divergence.

Full ordering: `(−weight, operation_ordinal, x_1_ordinal, x_2_ordinal)`. Never returns `0`.

---

## 7. GOTCHAS

**GOTCHA-1 — No comparator ever returns 0.**
All four comparators (`sortZDates`, `sortMsrfMatches`, `sortOperationMatches`, and the equal-value
paths inside them) collapse "equal" into `1`, i.e. *"a goes after b"*. `Array.prototype.sort` is
only guaranteed correct for a comparator that is a consistent total order; `cmp(a,b) === 1 &&
cmp(b,a) === 1` violates that. In V8 this is not a crash — for arrays ≤ 10 elements V8 uses
insertion sort, above that TimSort — but it makes ties **order-dependent on the input permutation**
and non-stable. A rebuild that "helpfully" returns `0` on ties will produce a different (arguably
better) order and will not match v12 byte-for-byte. Decide deliberately; if you want parity,
return `1`.

**GOTCHA-2 — An unrecognised `z_date_sort_type` silently produces a garbage order.**
`sortZDates` only substitutes the default when `sortType` is *falsy* (`:207`). A non-empty
unrecognised string (e.g. `"SORT_TYPE__FOO"` from a hand-edited `.oph`) matches no tie-break
branch and no value-selection branch, so `sortValueA` and `sortValueB` both stay `0`,
`sortOrder` stays `SORT_ORDER__ASCENDING`, and the comparator returns
`(0 > 0 ? -1 : 1) * -1 === -1` for **every** pair — a constant comparator. There is no
`SCORING_SYSTEMS`-style whitelist check for sort types anywhere in `ophis_model__validation.js`.
**In a rebuild, validate `z_date_sort_type` against `Z_DATES_SORT_TYPES` on import.**

**GOTCHA-3 — `SORT_TYPE__OPERATIONS` never sorts by operation score.**
`ophis_model__sorting.js:268-276`: both arms of the `if (operationScore_a == operationScore_b)`
assign `operationCount_a` / `operationCount_b`. Compare with the correctly-written MSRF branch at
`:258-266`. The column tooltip promises *"determined by how much the Operations contribtued to the
overall Score"* (`ophis_view__output.js:246`) — it actually sorts by **count**. This is a real bug.
Reproduce it for parity; fix it only behind an opt-in flag.

**GOTCHA-4 — The MSRF probe is double-rounded (2 dp, then 1 dp).**
`runOperations` (`ophis_model__operations.js:295-296, 366`):
```js
var ithZValueInMillis_raw = ithZValue_raw * MILLIS_PER_DAY;   // BEFORE rounding (comment: "feels more correct")
ithZValue_raw = roundNumberToTimePrecision(ithZValue_raw);    // 2 dp
...
var rotationCountZ = roundNumberToAxialRotationPrecision(ithZValue_raw);  // 1 dp, applied to the 2-dp value
```
A raw z-value of `12.449` becomes `12.45` (2 dp) and then **`12.5`** (1 dp), which the dead-zone
rule kills — whereas rounding `12.449` straight to 1 dp gives `12.4`, a Normal match on `12`.
Single-rounding a rebuild changes MSRF hits. Reproduce the two-step chain exactly.

**GOTCHA-5 — The Z-Date itself uses the UNROUNDED z-value; only the MSRF probe is rounded.**
Same lines: `ithZValueInMillis_raw` is computed from the pre-rounding value, and
`zDateInMillisSinceEpoch = dateToWhichToAddZValue_native.getTime() + ithZValueInMillis_raw`
(`:320`). So the calendar date and the MSRF probe can disagree by up to half a day of accumulated
rounding. Deliberate; the comment at `:295` says so.

**GOTCHA-6 — `msrf_filter` is compared by REFERENCE, not by value.**
`getMsrfScoreMultiplierForFilter` (`ophis_model__operations.js:463-476`),
`sortMsrfMatches` (`ophis_model__sorting.js:297-298`), the chart colour picker
(`ophis_view__chart_datasets.js:686-692`) and `selfCheckMsrfFilter`
(`ophis_unit_tests.js:110`) all do `msrfFilter == MSRF_FILTER__NORMAL` etc. Since
`deepClone(obj) = JSON.parse(JSON.stringify(obj))` (`ophis_utils.js:815-817`), **any
JSON round-trip of an msrf-match struct silently reduces its multiplier to the `1.0` default and
its chart colour to the fallback.** v12 never clones z-structs (only `isoEvent.operations` and the
already-primitive sorted-key array are cloned), so the bug is latent — but a rebuild that
serialises results to a worker, to `localStorage`, or across a postMessage boundary **will** hit
it. Use a `"NORMAL" | "IMPORTANT" | "VORTEX"` tag string in the rebuild instead of an array
reference.

**GOTCHA-7 — `sumUpMsrfMatchSubscore` is re-computed inside the sort comparator.**
`ophis_model__sorting.js:221-225` calls it (and `sumUpMsrfNumbersThemselves`) for **both** operands
on **every** comparison, even when `sortType` is not MSRF. That is O(n log n · m) redundant work
and, worse, it means `scoringSystem` must be threaded into `sortZDates` purely so the comparator
can recompute a value already stored on the struct. A rebuild should precompute `msrf_subscore`
and `msrf_number_sum` onto each z-struct during `scoreZDates` and have the comparator read fields.
Results are identical.

**GOTCHA-8 — `filterZDates` requires `scoreZDates` to have already run.**
It reads `.score` (`:146`) and `.hit_count` (`:154`), which are only written by `scoreZDates`
(`ophis_model__operations.js:456,458`). Invoke in that order or the min-score / min-hit filters
compare against `undefined` (all comparisons false → nothing filtered).

**GOTCHA-9 — Misleadingly named locals in `filterZDates`.**
`nativeUtcDateZInMillis_start` and `nativeUtcDateZInMillis_end` (`ophis_model__sorting.js:66-67`)
are assigned raw `Date` objects, **not** millis. They are then compared with `<=`, `>=`, `<`
against genuine numbers (e.g. `:73`, `:85`, `:97`). JS coerces `Date` to number via `valueOf()`
for relational operators, so the comparisons happen to be correct — but a port to a
strictly-typed language must call `.getTime()` explicitly. Note also `:85` uses
`lastXDatePriorSunsetInMillis >= nativeUtcDateZInMillis_start` where the right operand is a Date;
this works only because of that coercion.

**GOTCHA-10 — `SCORE_MULTIPLIER__VORTEX == SCORE_MULTIPLIER__IMPORTANT == 2.0` and
`POINTS__VORTEX == POINTS__IMPORTANT == 2`.**
The Vortex tier is *numerically indistinguishable* from Important. It differs only in matching
rule (tolerance vs. exact), in `readable_name`/`css_class`, and in `sortMsrfMatches` ordering
(where the tie between them resolves on `rotation_count_z`). `POINTS__VORTEX_MSRF_MATCH` is
literally defined as `POINTS__IMPORTANT_MSRF_MATCH` (`ophis_model__params.js:6`), so changing the
Important points silently changes the Vortex points. In a rebuild, split them into independent
literals with a comment.

**GOTCHA-11 — The multiplier is spent on ONE match, not per-match.**
`getMsrfScoreMultiplier` takes the **max**, never a product. Ten Important matches still multiply
by 2.0 (once); the other nine contribute 2 points each additively. A naive
`Π multipliers` reimplementation explodes scores.

**GOTCHA-12 — `base_score_pre_multiply` is stored unrounded and rendered raw.**
`ophis_model__operations.js:457`. Tooltip strings such as
`"Contributes 0.5 to the base score of 5.699999999999999"` (`ophis_view__output.js:478`) are the
real v12 behaviour. Round at the presentation layer in a rebuild, but be aware the values will
then differ from the original UI.

**GOTCHA-13 — `MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES = 2` is dead.**
See §3.4. Do not implement the gating rule its name implies.

**GOTCHA-14 — Alpha/beta is a *label*, not a scoring branch.**
`getOperationScore` sums raw `weight`. A weight of `0.75` is a beta that contributes `0.75`, not
`0.5`. A weight of `3` is an alpha that contributes `3`, not `1`. See §3.2.

**GOTCHA-15 — `MAXIMUM_ROTATION_COUNT_Z = 36500` clamping poisons the MSRF probe.**
`ophis_model__operations.js:289-293`: if a raw z-value exceeds 36 500 it is *silently clamped*
to exactly 36 500 with a `console.warn`. `36500` is in none of the MSRF sets, so every clamped
result becomes a no-match — and multiple distinct over-limit operations all collapse onto the same
Z-Date bucket, inflating that bucket's hit count. `MAXIMUM_ROTATION_COUNT_Y = 36500` clamps the
input side identically (`:266-270`). Both from `ophis_config.js:20-21`.

**GOTCHA-16 — `HIGHEST_MSRF_NUMBER` does double duty.**
It is both the last NORMAL element **and** the default value of the "beyond N days" filter
(`ophis_config.js:152`). Changing it changes both the resonance set and the default filter window.

**GOTCHA-17 — `newOperation` drops its `enabled` argument.**
See §3.6. `ophis_utils.js:1006-1012`.

**GOTCHA-18 — Both the tier arrays and `MSRF_FILTER__FINAL` are module-level mutable globals.**
`MSRF_FILTER__FINAL` is produced with `.concat().concat().sort()`; because `concat` copies, the
`.sort()` does not disturb the three tier arrays — which is essential given GOTCHA-6. If you
refactor into `[...A, ...B, ...C].sort()`, preserve that property.

**GOTCHA-19 — `1574` sits out of order inside `MSRF_FILTER__NORMAL`.**
See §1.7.1. Copy it verbatim.

**GOTCHA-20 — Prior repo docs undercount NORMAL as 276; the real v12 length is 325.**
See §1.3.

---

## 8. Data structures (annotated)

```ts
// ─────────── input side ───────────

type Operation = {
  equation: string;            // e.g. "X2+YxOPH_PHI"; must start "X1+" or "X2+"
  weight:   number;            // >0. >=1 ⇒ alpha, <1 ⇒ beta. Contributes verbatim to the score.
  enabled:  boolean;           // NOTE: newOperation() always writes true (bug, §3.6)
  cached_operation_function?: (Y: number) => number;   // grafted by getEffectiveOperations()
};

type XDate = { date: string /* "MM/DD/YYYY" */; time: string /* "HH:mm" */; enabled: boolean };

type IsoEvent = {
  name: string; notes: string;
  x_dates: XDate[];  t_dates: XDate[];
  lat: number; long: number; location_enabled: boolean;
  scope: "EVENT_SCOPE__HH_MM" | "EVENT_SCOPE__DAYS" | "EVENT_SCOPE__MONTHS" | "EVENT_SCOPE__YEARS";
  type:  "EVENT_TYPE__PERSONAL" | "EVENT_TYPE__ASTROLOGICAL" | "EVENT_TYPE__MARKETS";
  operations: Operation[];
  scoring_system: "SCORING_SYSTEM__LTE_V7" | "SCORING_SYSTEM__GTE_V8";
  z_date_sort_type?: "SORT_TYPE__SCORE" | "SORT_TYPE__DATE" | "SORT_TYPE__MSRF"
                   | "SORT_TYPE__HIT_COUNT" | "SORT_TYPE__OPERATIONS";   // UNVALIDATED on import

  // filter flags + values, keys derived from SERIALIZED_FIELD__* (ophis_utils.js:124-146)
  iso_event_filter_before_last_x_date:   boolean;   // default true
  iso_event_filter_on_last_x_date:       boolean;   // default true
  iso_event_filter_before_current_date:  boolean;   // default true
  iso_event_filter_on_current_date:      boolean;   // default false
  iso_event_filter_beyond_max_days:      boolean;   // default true
  iso_event_filter_beyond_max_days_value:  number;  // default 2559 (== HIGHEST_MSRF_NUMBER)
  iso_event_filter_min_hit_count:        boolean;   // default false
  iso_event_filter_min_hit_count_value:    number;  // default 2
  iso_event_filter_min_score:            boolean;   // default false
  iso_event_filter_min_score_value:        number;  // default 1
  iso_event_filter_msrf_match:           boolean;   // default false

  effective_operations?: Operation[];   // written by runOphisOnEvent (ophis_model__operations.js:92)
};

// ─────────── intermediate ───────────

type YStruct = {
  y_ordinal:       number;        // index into results.y_structs
  rotation_count_y: number;       // whole days X1→X2 (1-dp rounded)
  x_1_ordinal:     number;        // index of earlier X-Date
  x_2_ordinal:     number;        // index of later X-Date
  operation_results: OperationResult[];
};

type OperationResult = {
  z_value:            number;  // 2-dp rounded day offset
  rotation_count_y:   number;
  rotation_count_z:   number;  // 1-dp round of z_value  ← THE MSRF PROBE
  z_date_native:      Date;    // debug only
  z_date_native_start: Date;   // bucket key source
  z_date_native_end:   Date;
  z_date_readable_start / _end / _start_no_html / _end_no_html: string;
  x_date_native_start: Date;   // the X-Date the offset was added to
  x_date_native_other: Date;
  operation_ordinal:  number;  // index into effective_operations
  operation:          Operation;
  hash:               string;  // `${i}${x1ms}${x2ms}${zStartMs}` — DOM attr operation_result_hash
  hash_without_ordinal: string;
  z_date_dict_key:    number;
};

type OperationMatchStruct = {
  y_struct:         YStruct;
  operation_result: OperationResult;
  points?:          number;   // stamped by getOperationScore == operation.weight
};

type MsrfMatchStruct = { /* see §2.1 */ };

// ─────────── output ───────────

type ZStruct = {
  z_date_native: Date;
  z_date_native_start: Date;  z_date_native_end: Date;
  z_date_readable_start: string;  z_date_readable_end: string;
  z_date_readable_start_no_html: string;  z_date_readable_end_no_html: string;

  operation_match_structs: OperationMatchStruct[];   // sorted by sortOperationMatches
  msrf_match_structs:      MsrfMatchStruct[];        // sorted by sortMsrfMatches

  // written by scoreZDates (ophis_model__operations.js:451-458)
  operation_score:         number;   // Σ weights,             UNROUNDED
  operation_hit_count:     number;   // operation_match_structs.length
  score:                   number;   // final,                 ROUNDED to 2 dp
  base_score_pre_multiply: number;   // opScore + msrfSubscore, UNROUNDED
  hit_count:               number;   // operation_hit_count + msrf_match_structs.length

  // written by sortAndFilterResults (ophis_model__operations.js:163)
  z_ordinal?: number;   // 0-based position in the DATE-sorted, filtered list — drives the "Z₁,Z₂…" labels
};

type ZStructsDict = { [zDateStartEpochMillisAsString: string]: ZStruct };

type OphisResults = {
  errors: (string | {error_status: string; error_message: string})[];
  y_structs: YStruct[];
  z_structs: ZStructsDict;
  selected_y_struct_for_details: number;      // 0
  processed_z_dates: string[];                // filtered + sorted by z_date_sort_type
  processed_z_dates__sorted_by_date: string[];// filtered + sorted by DATE (drives z_ordinal)
};
```

---

## 9. Orchestration — exact call order

`runOphisOnEvent(isoEvent)` — `ophis_model__operations.js:83-151`:

1. `effectiveXDateCount = getEffectiveXDateCount(isoEvent)` — count of `x_dates` with `enabled === true`.
2. `effectiveOperations = getEffectiveOperations(isoEvent)` — deep-clones `isoEvent.operations`,
   attaches `cached_operation_function` where the equation validates. **Returns every operation,
   enabled or not, at its original index**, so `operation_ordinal` indexes both arrays identically.
   Assigned to `isoEvent.effective_operations`.
3. `enabledOperationCount` = count of entries with `enabled === true && cached_operation_function`.
4. Guards, in order (each pushes an error string and skips generation):
   * `effectiveXDateCount < MINIMUM_NUMBER_OF_X_DATES (2)` → `"At least 2 X-Dates are required."`
   * `scope == EVENT_SCOPE__MONTHS` → `"Month-based projections may be supported in a future version."`
   * `scope == EVENT_SCOPE__YEARS`  → `"Year-based projections may be supported in a future version."`
   * `enabledOperationCount < MINIMUM_OPERATIONS_REQUIRED (1)` → `"At least 1 Operation is required."`
   * `validateXDateSpread(...) == false` → **errors are *replaced* wholesale** by `dateSpreadErrors` (`:119`).
   * else → `generateYAndZStructs(...)`.
5. `scoringSystem = getScoringSystem(isoEvent)`.
6. **`scoreZDates(isoEvent.effective_operations, scoringSystem, zStructsDict)` — runs
   unconditionally, even when errors were pushed** (`:129`, outside the guard chain). Harmless when
   the dict is empty.
7. Any thrown exception is caught and `errors.push("" + error)` (`:130-132`).
8. If `errors.length > 0` → `processed_z_dates = []`, `processed_z_dates__sorted_by_date = []`.
   Otherwise → `sortAndFilterResults(isoEvent, results)`.

`sortAndFilterResults(isoEvent, results)` — `:153-170`:

```js
var scoringSystem     = getScoringSystem(isoEvent);
var currentLocalDate  = getCurrentLocalTime(appState.globalOptions.local_time_offset_in_millis);
var filteredZDates    = filterZDates(isoEvent, zStructsDict, currentLocalDate);
var zDatesSortedByDate = sortZDates(filteredZDates, zStructsDict, Z_DATE_SORT_TYPE__DATE, scoringSystem);

for ( var i = 0; i < zDatesSortedByDate.length; i++ ) {         // assign chronological labels
    results.z_structs[zDatesSortedByDate[i]].z_ordinal = i;
}

var sortedAndFilteredZDates = isoEvent.z_date_sort_type == Z_DATE_SORT_TYPE__DATE
    ? deepClone(zDatesSortedByDate)                              // strings — deepClone is safe here
    : sortZDates(filteredZDates, zStructsDict, isoEvent.z_date_sort_type, scoringSystem);

results.processed_z_dates                 = sortedAndFilteredZDates;
results.processed_z_dates__sorted_by_date = zDatesSortedByDate;
```

`z_ordinal` is always assigned from the **date-sorted** list, so the `Z₁, Z₂, Z₃…` row labels stay
chronological no matter which column the user sorted by (`ophis_view__output.js:511`).

`sortAndFilterResults` is also called directly on a sort-header click without re-running the
engine (`ophis_view__output.js:680`) — a cheap re-sort of already-scored results.

---

## 10. Rendering & export contracts (cross-module)

Condensed output table columns, in DOM order (`ophis_view__output.js:312-324, 645-654`):

| Column | Cell content | Blur toggle (global option key) |
|---|---|---|
| row label | `Z<sub>z_ordinal+1</sub>` | — |
| Z-Dates | `z_date_readable_start` (DAYS) or a `from:`/`to:` pair (HH:MM) | `hide_date_col` |
| Hits | symbol image + `hit_count` | `hide_hits_col` |
| Score | `score`, printed verbatim | `hide_score_col` |
| MSRF | one pill per `msrf_match_structs[k]`, label = `msrf_number` | `hide_msrf_col` |
| Operations | one pill per `operation_match_structs[k]`, label = `O<sub>ord+1</sub>(X₁→X₂)` | `hide_operations_col` |

Hit-count symbols (`ophis_view__utils.js:238-253`): `hit_count == 2` → Gemini, `== 3` → Triangle,
`== 4` → Diamond, `>= 5` → Circle, else a transparent pixel.

MSRF pill tooltip third row (`ophis_view__output.js:598-604`):
* if `scoringSystem == SCORING_SYSTEM__GTE_V8` **and** this struct is the multiplier-bearing one →
  `"Multiplies base score of " + base_score_pre_multiply + " by " + overallMsrfMultiplier`
* else → `"Contributes " + points + " to the base score of " + base_score_pre_multiply`

The multiplier-bearing struct is located by the same first-max scan as the scorer (`:521-534`),
so the UI and the scorer always agree.

`readableMsrfMatchString(rotationCountZ, filterMatch)` (`ophis_view__strings.js:82-92`):
```js
if ( rotationCountZ === filterMatch.msrf_number ) {   // strict ===
    return rotationCountZ + " = " + filterMatch.readable_name;          // e.g. "84 = Important"
} else {
    return rotationCountZ + " ≈ " + filterMatch.msrf_number + " (" + filterMatch.readable_name + ")";
}
```
No-match case renders `rotationCountZ + " = No Match"` (`ophis_view__output.js:463`); a Z-Date with
zero MSRF matches renders the word `none` in a `.msrf_no_matches` table (`:517`).

CSV export row (`ophis_view__export.js:293-338`) — column names are the object keys:
`IsoEvent`, `Date` (`z_date_readable_start_no_html`), `Hits` (`hit_count`), `Score` (`score`),
`MSRF` (`msrf_number`s joined `", "`, **sorted descending numerically**, or
`OPH_OUTPUT_NONE_KEYWORD`), `Operations` (`"OP" + zero-padded (ordinal+1)`, sorted ascending, or
`OPH_OUTPUT_NONE_KEYWORD`), `ErrorStatus`, `ErrorMessage`.
Note the padding bug: `if (opNum < 10) opNum = "0" + opNum` runs *before* the `"OP"` prefix, so
ordinal 9 → `"OP10"` and ordinal 0 → `"OP01"`; two-digit values are unpadded (`"OP16"`).

---

## 11. Startup self-checks

`runUnitTests(errors_out)` (`ophis_unit_tests.js:2-12`) → `checkFeatureFlags` (a no-op in v12,
its only assertion commented out at `:66`), `selfCheckMsrfFilters`, `spotCheckFilterMatches`.
Everything is wrapped in a try/catch that pushes
`"Encountered error while running unit tests: " + e`.

* `spotCheckFilterMatches` (`:70-76`): asserts `getMsrfMatch(12.5) === null` and
  `getMsrfMatch(12.4).msrf_filter === MSRF_FILTER__NORMAL`.
* `selfCheckMsrfFilter(filter)` (`:103-118`): every element of each tier array must round-trip
  through `getMsrfMatch` back to **that same array by reference** (`===`), except when the array
  under test is `MSRF_FILTER__FINAL` (where any tier is acceptable). Failures push
  `"Programmer Error: Filter number '<n>' matched against wrong filter starting with: <first>"` or
  `"Programmer Error: Unclassified filter number '<n>' …"`.
  **This test passes only because 21 and 76 are NORMAL entries that are ≥ 0.3 away from every
  vortex number, and because no vortex number is within 0.1 of another** — the invariant to
  preserve if you ever add numbers.
* `selfCheckMsrfOnStartup(errors_out)` (`ophis_model__validation.js:1041-1088`, called from
  `ophis_main.js:228`): O(n²) over `MSRF_FILTER__FINAL`. Each element must be either a positive
  integer or a value that `getMsrfMatch` classifies as **Vortex**; and must appear exactly once.
  It does **not** check ordering (hence the surviving `1574` defect).

---

## 12. Constant reference (single table)

| Constant | Value | File:line |
|---|---|---|
| `POINTS__ALPHA_OPERATION_MATCH` | `1` | `ophis_model__params.js:2` |
| `POINTS__BETA_OPERATION_MATCH` | `.5` | `ophis_model__params.js:3` |
| `POINTS__IMPORTANT_MSRF_MATCH` | `2` | `ophis_model__params.js:4` |
| `POINTS__NORMAL_MSRF_MATCH` | `1` | `ophis_model__params.js:5` |
| `POINTS__VORTEX_MSRF_MATCH` | `2` (aliases IMPORTANT) | `ophis_model__params.js:6` |
| `MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES` | `2` — **DEAD** | `ophis_model__params.js:7` |
| `SCORE_MULTIPLIER__NORMAL_MSRF_MATCH` | `1.5` | `ophis_model__params.js:10` |
| `SCORE_MULTIPLIER__IMPORTANT_MSRF_MATCH` | `2.0` | `ophis_model__params.js:11` |
| `SCORE_MULTIPLIER__VORTEX_MSRF_MATCH` | `2.0` | `ophis_model__params.js:12` |
| `OPERATION_ENABLED_TRUE` / `_FALSE` | `true` / `false` (ignored by `newOperation`) | `ophis_model__params.js:59-60` |
| `OPERATION_EQUATION_FOR_RADIUS_PROJECTION` | `"X1+YxOPH_PI"` | `ophis_model__params.js:62` |
| `OPERATION_EQUATION_FOR_ORIGINAL_BETA_PHI_6` | `"X2+(Y/2.0)xOPH_PHI"` | `ophis_model__params.js:63` |
| `HIGHEST_MSRF_NUMBER` | `2559` | `ophis_config.js:119` |
| `VORTEX_FILTER_MATCH_TOLERANCE` | `.1` | `ophis_config.js:367` |
| `DECIMAL_PRECISION__TIME` | `2` | `ophis_config.js:369` |
| `DECIMAL_PRECISION__LOCATION` | `1` | `ophis_config.js:370` |
| `DECIMAL_PRECISION__AXIAL_ROTATIONS` | `1` | `ophis_config.js:371` |
| `DECIMAL_PRECISION__SCORE` | `2` | `ophis_config.js:372` |
| `MINIMUM_NUMBER_OF_X_DATES` | `2` | `ophis_config.js:16` |
| `MINIMUM_OPERATIONS_REQUIRED` | `1` | `ophis_config.js:96` |
| `MAXIMUM_ROTATION_COUNT_Y` / `_Z` | `36500` / `36500` | `ophis_config.js:20-21` |
| `MILLIS_PER_DAY` | `86 400 000` | `ophis_config.js:100` |
| `SCORING_SYSTEM__LTE_V7` | `"SCORING_SYSTEM__LTE_V7"` | `ophis_config.js:47` |
| `SCORING_SYSTEM__GTE_V8` | `"SCORING_SYSTEM__GTE_V8"` | `ophis_config.js:48` |
| `DEFAULT_SCORING_SYSTEM` | `SCORING_SYSTEM__GTE_V8` | `ophis_config.js:50` |
| `Z_DATE_SORT_TYPE__SCORE` | `"SORT_TYPE__SCORE"` | `ophis_config.js:440` |
| `Z_DATE_SORT_TYPE__DATE` | `"SORT_TYPE__DATE"` | `ophis_config.js:441` |
| `Z_DATE_SORT_TYPE__MSRF` | `"SORT_TYPE__MSRF"` | `ophis_config.js:442` |
| `Z_DATE_SORT_TYPE__HIT_COUNT` | `"SORT_TYPE__HIT_COUNT"` | `ophis_config.js:443` |
| `Z_DATE_SORT_TYPE__OPERATIONS` | `"SORT_TYPE__OPERATIONS"` | `ophis_config.js:444` |
| `DEFAULT_Z_DATE_SORT_TYPE` | `Z_DATE_SORT_TYPE__DATE` | `ophis_config.js:445` |
| `SORT_ORDER__ASCENDING` / `__DESCENDING` | same-named strings | `ophis_config.js:455-456` |
| `STARTING_X1` / `STARTING_X2` | same-named strings | `ophis_config.js:430-431` |
| `OPH_PI` / `OPH_PHI` / `OPH_CRV` / `OPH_HEP` | `3.14` / `1.618` / `5.08` / `7.01` | `ophis_config.js:410-413` |
| `COLOR__MSRF_NORMAL` / `_IMPORTANT` / `_VORTEX` | `"#2ede69"` / `"#b80b0b"` / `"purple"` | `ophis_view__config.js:27-29` |
| `COLOR__OPERATION_ALPHA` / `_BETA` | `"rgba(184, 134, 11, 1.0)"` / `"rgba(0, 192, 255, 1.0)"` | `ophis_view__config.js:21-22` |
| `CHART_DATASET_ORDER__ALPHA_OPERATION` | `7` | `ophis_view__chart_config.js:71` |

---

## 13. Dependencies defined outside this subsystem

Named, not guessed at — these belong to other specs:

* `xDateToNativeDate(scope, xDate, lat?, long?)`, `nativeDateToXDate`, `nativeDateToUtcMillis`,
  `axialRotationsBetweenNativeDates`, `getCurrentLocalTime` — date/scope subsystem (`ophis_utils.js`).
* `getSunsetNativeUtcDateBefore_withCache` / `..._After_withCache` — sunset subsystem
  (gated off in v12 for the filter path by `FEATURE_FLAG__SUNSET__FILTER_BASED_ON_PRIOR_SUNSET = false`).
* `validateOperationString`, `normalizeOperationEquationString`, `validateXDateSpread` —
  equation-validation subsystem (`ophis_model__validation.js`). **This is the module carrying the
  `new Function()` RCE finding (see `SECURITY.md`); treat it as the security-critical boundary.**
* `oph_flip`, `oph_round`, `oph_sqrt`, `oph_abs`, `oph_cos`, `oph_tan`, `oph_exp` and the
  `ALL_OPH_FUNCTIONS` table — operation-DSL subsystem.
* `isFlagEnabled`, `deepClone`, `printWarning`, `printError`, `showToast` — utility layer.
* `getCurrentIsoEvent`, `appState`, `flushChangesToDisk`, `refreshCurrentPage` — controller/state layer.
