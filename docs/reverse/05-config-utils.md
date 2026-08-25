# Ophis v12 / PSYFR — Subsystem Spec 05: Config, Utilities, Logging, Dependencies, Unit Tests

**Scope of this document.** Implementation-grade specification of six first-party modules:

| File | Lines | Role |
|---|---|---|
| `src/ophis_config.js` | 464 | All immutable constants, feature flags, enum string literals, serialized-field descriptors |
| `src/ophis_utils.js` | 1086 | Pure helpers: flags, dictionaries, MSRF matching, number parsing, **all date arithmetic**, sunset search, rounding, `deepClone`, `newOperation`, the `oph_*` formula runtime |
| `src/ophis_logging.js` | 70 | `console.*` override → Electron CLI pipe (headless only) |
| `src/ophis_dependencies.js` | 323 | Thin adapters over third-party libs (Astronomy/Meeus/SunCalc, moment-timezone, tz_lookup, jQuery tipsy) |
| `src/ophis_unit_tests.js` | 118 | Startup self-check suite (executable ground truth) |
| `src/scratchpad.js` | 2 | Empty; two commented-out lines only |

Everything below was read line-by-line. Citations are `file:line`. Where behaviour was verified by executing extracted logic in Node, that is marked **[verified]**.

---

## 0. MODULE LOAD ORDER AND COUPLING

### 0.1 The real bootstrap

The application entry point is **`ophis.html`, which lives inside the packaged `app.asar`, not in this repo** (`METHOD.md`, "Notes / gotchas": the repo-root `OPHIS.html` is a v9 field guide, not the loader). A v9-era copy of the true bootstrap was located at
`C:/Users/bradl/OneDrive/Desktop/NEW-STUFF/Mullvad Browser/ophis.html` (413 lines) and is the source for §0.2–§0.3. **Caveat:** that copy is v9. The v12 report cites `ophis.html:39` (astronomy loaded) and `ophis.html:67` (sha512 commented out), whereas the v9 copy has those at `:43` and `:66` — so the v12 bootstrap is a slightly longer file (report says 557 lines) with the same structure. Deltas known from `Ophis_v12_ReverseEngineering_Report.md:115–116,147`:

* v12 **uncomments** `<script src="./lib/astronomy.browser.min.js">` (v9 had it commented).
* v12 still **leaves `lib/sha512.min.js` commented out**.

### 0.2 Third-party library load order (`<head>`, synchronous, in this exact order)

Stylesheets first:

```
./lib/flatpickr.css
./lib/flatpickr-monthSelect.css
./lib/leaflet_1_8_0.css
```

Then scripts, in order (v9 copy line numbers in brackets):

| # | File | [line] | Global(s) it defines | First-party consumer |
|---|---|---|---|---|
| 1 | `lib/math.js` | 24 | `math` | `ophis_model__validation.js` (`math.parse` / `math.evaluate` of stripped operation strings) |
| 2 | `lib/geo-point.js` | 25 | geo helpers | map / location code |
| 3 | `lib/jquery.min.js` | 26 | `$`, `jQuery` | `ophis_dependencies.js` (tipsy, `$(".tipsy").remove()`), view layer |
| 4 | `lib/jquery.tipsy.js` | 27 | `$.fn.tipsy` | `ophis_dependencies.js:238,249` |
| 5 | `lib/flatpickr.js` | 28 | `flatpickr` | date pickers; `flatPickrStringToXDate` consumes its output |
| 6 | `lib/flatpickr-monthSelect.js` | 29 | monthSelect plugin | MONTHS scope picker |
| 7 | `lib/moment-with-locales.min.js` | 30 | `moment` | `ophis_utils.js:656`, `ophis_dependencies.js:256,262,275,285`, `ophis_utils.js:873` |
| 8 | `lib/moment-timezone-with-data.js` | 31 | `moment.tz` | `getBrowserTimezone` (`moment.tz.guess`), `convertStandardLocalDateStringToNativeUtcDate`, `roundMillisToNearestMidnightInTimeZone` |
| 9 | `lib/lunarphase-js.js` | 32 | lunar phase API | chart moon datasets |
| 10 | `lib/luxon.min.js` | 34 | `luxon` | required **before** the Chart.js luxon adapter |
| 11 | `lib/leaflet_1_8_0.js` | 37 | `L` | **`ophis_main.js:11–12` calls `L.map('map')` at top level** — hard requirement |
| 12 | `lib/meuusjs.1.0.3.min.js` | 39 | `A` (MeeusJs) | `lib/meeus-easy.js` |
| 13 | `lib/meeus-easy.js` | 40 | `getSunTimesMeeus` | `ophis_dependencies.js:32` |
| 14 | `lib/astronomy.browser.min.js` | 43 (**commented in v9, live in v12**) | `Astronomy` | `ophis_dependencies.js:17,22` |
| 15 | `lib/tz_lookup_oss.js` | 45 | `tzlookup` | `ophis_dependencies.js:131` |
| 16 | `lib/papaparse.min.js` | 46 | `Papa` | CSV import/export |
| 17 | `lib/write-excel-file.2.3.2.min.js` | 47 | `writeXlsxFile` | XLSX export |
| 18 | `lib/chart.min.js` | 49 | `Chart` | chart view |
| 19 | `lib/hammer.js` | 50 | `Hammer` | required by chartjs-plugin-zoom |
| 20 | `lib/chartjs-plugin-datalabels.js` | 52 | plugin | chart |
| 21 | `lib/chartjs-plugin-zoom.js` | 53 | plugin | chart |
| 22 | `lib/chartjs-adapter-luxon.js` | 56 | adapter | chart time axis (requires #10 and #18) |
| 23 | `lib/purify.min.js` | 61 | `DOMPurify` | HTML sanitising in view layer |
| 24 | `lib/html2canvas.min.js` | 62 | `html2canvas` | PDF/PNG export |
| 25 | `lib/jspdf.umd.min.js` | 63 | `jspdf` | PDF export |
| 26 | `lib/sha512.min.js` | 66 (**commented out**) | `sha512` | `ophis_utils.js:665` `hashAccount()` |
| 27 | `lib/lunar_eclipses_processed.js` | 68 | lunar eclipse table | chart datasets, scoring |
| 28 | `lib/solar_eclipses_processed.js` | 69 | solar eclipse table | chart datasets, scoring |

**Commented-out / not loaded** (present on disk in `lib/` but never fetched):
`chartjs-plugin-zoom.min.js` (:51), `chartjs-adapter-moment.js` (:55), `lunar_eclipses_orig.js` (:58), `solar_eclipses_orig.js` (:59), `sha512.min.js` (:66), and — critically — **`lib/suncalc.js` appears in no `<script>` tag at all**, yet `ophis_dependencies.js:43–47` defines `SUNSET_LIBRARY__SUN_CALC` with `enabled:true` and calls the global `SunCalc`. See GOTCHA G-14.
(`lib/suncalc.js` has mtime `Jul 6 08:29` vs `Jul 5 05:21` for every other lib file — it was almost certainly added by the researcher after extraction, not shipped.)

### 0.3 First-party load order (dynamic, `<script async=false>` appended to `<body>`)

`ophis.html:368–413` appends one `<script>` per name, with `async = false` (so execution order == array order) and a per-session cache-buster `?v=<random int 0..99999998>`. It also injects `./src/ophis.css?v=<cacheBuster>` as a `<link>` into `<head>` first.

```js
var cacheBuster = Math.floor(Math.random() * 99999999);          // ophis.html:372
// ophis.html:380-404
var srcFiles = [
    "ophis_utils",              //  1  <-- FIRST
    "ophis_config",             //  2
    "ophis_dependencies",       //  3
    "ophis_model__params",      //  4
    "ophis_model__validation",  //  5
    "ophis_model__sorting",     //  6
    "ophis_model__operations",  //  7
    "ophis_model__persistence", //  8
    "ophis_controller",         //  9
    "ophis_view__strings",      // 10
    "ophis_view__config",       // 11
    "ophis_view__utils",        // 12
    "ophis_view__rebuild",      // 13
    "ophis_view__output",       // 14
    "ophis_view__settings",     // 15
    "ophis_view__chart_config", // 16
    "ophis_view__chart",        // 17
    "ophis_view__chart_datasets",//18
    "ophis_view__export",       // 19
    "ophis_view",               // 20
    "ophis_unit_tests",         // 21
    "ophis_main",               // 22  <-- defines appState, runs top-level L.map()
    "scratchpad",               // 23  <-- LAST, intentionally empty
];
```

`src/` contains **24** `.js` files; this v9 list has **23**. The missing name is **`ophis_logging`**, which v12 must insert (it is called from `ophis_main.js:59` and nothing else references it). It must load **before `ophis_main`** and **after `ophis_config`** (it uses `OPHIS_LOG_LEVEL__*` defined in itself but `toggleConsoleLogOverride` calls `isRunningHeadless()` from `ophis_main` — safe because that call happens at runtime, not parse time).

### 0.4 Load-order coupling that a rewrite MUST preserve

**`ophis_config.js` executes utility code at load time and therefore CANNOT be loaded before `ophis_utils.js`.** Concretely, at top level `ophis_config.js` calls:

* `newSerializedFieldObject(...)` — defined `ophis_utils.js:124` — used 8× at `ophis_config.js:123–173` and 14× at `:202–265`.
* `isFlagEnabled(...)` — defined `ophis_utils.js:3` — used at `ophis_config.js:346, 410, 411, 412`.
* `roundNumberToTimePrecision(...)` — defined `ophis_utils.js:987` — used at `ophis_config.js:405–407, 410–412`.

Because all three are function *declarations* in `ophis_utils.js` (hoisted within that file) and `ophis_utils.js` is script #1, they exist by the time `ophis_config.js` runs. **This is the single most fragile ordering constraint in the codebase.** If a rewrite converts these to ES modules, `config` must `import` from `utils`, and `utils` must NOT import from `config` at module-evaluation time (it only reads config constants inside function bodies, which is fine).

Other order dependencies:

* `ophis_model__params.js` (#4) reads `HIGHEST_MSRF_NUMBER` (config:119) and calls `newOperation` (utils:1006) and `deepClone` (utils:815) at top level.
* `ophis_main.js` (#22) evaluates `L.map('map')` and `L.layerGroup()` at top level (`ophis_main.js:11–12`) — Leaflet must already be a global, and a DOM element `#map` must exist. It also reads `FEATURE_FLAG__SHOW_LOCATION`, `DEFAULT_MAP_SELECTION_ZOOM`, `OPH_HEADLESS_OUTPUT_TYPE__DEFAULT`, `DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS`, `FILE_INPUT_VALIDATION_MODE__LOOSE`, `GLOBAL_OPTION__*`, `GLOBAL_BOOLEAN_OPTIONS`, `OPHIS_SCREEN__ABOUT`, `DEFAULT_SKIN_MODE` at top level.
* `ophis_dependencies.js` (#3) reads `DEFAULT_HEIGHT_IN_METERS_FOR_SUN_CALC` (config) only inside function bodies, and `TOOL_TIP_DELAY_IN_MILLISECONDS` — **defined in `ophis_view__config.js:47` (= `750`), which loads at #11, i.e. AFTER dependencies**. Safe only because `newTipsyConfig()` (`ophis_dependencies.js:222`) is never called during parse.

---

## 1. `ophis_config.js` — COMPLETE CONSTANT / FLAG TABLE

File header comment (`:13–14`): *"EVERYTHING IN THIS FILE IS IMMUTABLE, i.e. CONSTANT, not changed at runtime."* — **this is false for `APP_VERSION`**, which `ophis_main.js:100–113` reassigns from `package.json`.

### 1.1 Version and sign-in gate

| Name | Line | Value | Meaning |
|---|---|---|---|
| `APP_VERSION` | 3 | `"12.0"` | Fallback version; overwritten at runtime from `package.json` (`"12.0.0"`). Comment: "need to change in package.json as well." |
| `ACCOUNT_HASHES` | 5–11 | array of **5** 128-hex-char (SHA-512) strings | Whitelist compared against `sha512(password)` when `FEATURE_FLAG__REQUIRE_SIGN_IN` is on. Unsalted, single-round. **Licensing/sign-in gate — but dead by default.** Compare loop: `ophis_main.js:159–166`. |

`ACCOUNT_HASHES` verbatim (order matters only for the loop's early `break`):

```
[0] 598d0282b5dbada84a65203778212f6966144832040e5d9ef2d31b01948f60d51eed0fd847a734f726c29185ae93b579579ef0cd5f03d876f0af914f3a8d81f2
[1] ccc060d1eff8469ea195d09efb4e8181cf5c3bedceef174fe2f17ad5aa20c76d1b51b1dffce5ab032c0b8972b788b63f694e6c2cbb513b4924f5e8b6ce5f22cf
[2] e29133bc63a4bbcc58f0e7827ab8b3a3a80cb6e36b65a56aeb238a487028ef7ec62c542012efef794696fba37c86acc9489fda264aa5a206e1269a7b72dc4fc2
[3] 7c6b8109499d5b298d87c4920f0bfe456f8fa978879888ba450c34c9abde35dbcba9988b007e0ce40dba0dd68a9a0ebdc73fcdea808a2c9570ae5e063f504e4b
[4] 71366dc23c547c28faae478a3a8ba906103ce52601c8e1350a577121a9a65f492154240c7956f26dff9453d11b7c388824f1822f914f376f376aa3d592d26491
```

**A rewrite should delete this entirely.** It is client-side theatre (author's own comment at `:289–290`) and the hashing function it needs is not even loaded (see G-19).

### 1.2 Limits and counts

| Name | Line | Value | Switches / limits |
|---|---|---|---|
| `MINIMUM_NUMBER_OF_X_DATES` | 16 | `2` | Live minimum X-Date count (5 references). |
| `MAXIMUM_ROTATION_COUNT_Y` | 20 | `36500` | Max \|Y\| accepted (≈100 years in DAYS scope). |
| `MAXIMUM_ROTATION_COUNT_Z` | 21 | `36500` | Max Z offset accepted. |
| `MINIMUM_DAYS_BETWEEN_FIRST_TWO_X_DATES` | 91 | `1` | Was `6` historically (`:86–89`: relaxed after Telegram-group feedback). |
| `MINIMUM_DAYS_BETWEEN_SUBSEQUENT_X_DATES` | 92 | `1` | |
| `MINIMUM_X_DATES_REQUIRED` | 93 | `2` | **DEAD** — 1 reference (its own definition). `MINIMUM_NUMBER_OF_X_DATES` is the live one. Duplicate constant. |
| `MAX_CALENDAR_YEAR` | 94 | `9999` | Years above this are silently clamped to `"9999"` (`ophis_model__validation.js:1123–1125`). |
| `MINIMUM_OPERATIONS_REQUIRED` | 96 | `1` | |
| `HIGHEST_MSRF_NUMBER` | 119 | `2559` | Doubles as the last element of `MSRF_FILTER__NORMAL` **and** as the default for the "beyond N days" filter (`:152`). |
| `SAMPLE_Y_VALUE_FOR_VALIDATION` | 422 | `10` | Y substituted into a stripped equation string during math.js validation. |
| `LAT_LIMIT` | 426 | `65` | Comment `:424–425`: every sunset library "starts freaking out once you get too arctic". |
| `LONG_LIMIT` | 427 | `180` | |
| `DEFAULT_HEIGHT_IN_METERS_FOR_SUN_CALC` | 428 | `2` | Observer elevation passed to Astronomy/Meeus. |
| `UNDEFINED_FIELD_INPUT_NUMBER` | 120 | `undefined` | Sentinel passed as `numericDefault` for fields with no numeric input. |

### 1.3 Time constants

| Name | Line | Value (evaluated) |
|---|---|---|
| `MILLIS_PER_MINUTE` | 98 | `60000` |
| `MILLIS_PER_HOUR` | 99 | `3600000` |
| `MILLIS_PER_DAY` | 100 | `86400000` |
| `SYNODIC_MONTH` | 102 | `29.53058770576` (days) |
| `INTRA_MOON_PHASE_DELTA` | 111 | `0.125` (= `1.0/8.0`) |
| `LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS` | 112 | `1` |
| `ECLIPSE_DATE_MATCH_TOLERANCE_IN_DAYS` | 113 | `1.25` |
| `LUNAR_DATE_MATCH_TOLERANCE` | 114 | `86400000` |
| `ECLLIPSE_DATE_MATCH_TOLERANCE` | 115 | `108000000` — **note the misspelling `ECLLIPSE` (two L's). Keep it or rename everywhere; 4 references.** |
| `ALREADY_CALCULATED_SUNSET_TOLERANCE_IN_MILLIS` | 117 | `3600000` (1 hour). Used once, `ophis_model__operations.js:253`. |
| `HOURS_IN_DAY_TO_USE_WITHOUT_HH_MM_SCOPE` | 270 | `0` |
| `TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE` | 271 | `"00:00"` |
| `DEFAULT_DAY_SCOPE_START_TIME_MILLIS` | 352 | `0` |

### 1.4 Date format strings

| Name | Line | Value | Consumer |
|---|---|---|---|
| `DATE_DELIMITER` | 273 | `"/"` | Display/X-Date format |
| `STANDARD_DATE_DELIMITER` | 274 | `"-"` | ISO-ish internal format |
| `X_DATE_CAL_DISPLAY_FORMAT` | 275 | `"m/d/Y"` | flatpickr |
| `X_DATE_CAL_DISPLAY_FORMAT__MONTHS` | 276 | `"m/Y"` | flatpickr monthSelect |
| `X_DATE_CAL_DISPLAY_FORMAT__YEARS` | 277 | `"Y"` | flatpickr |
| `X_DATE_TIME_DISPLAY_FORMAT` | 278 | `"H:i"` | flatpickr |
| `X_DATE_INPUT_DISPLAY_FORMAT` | 279 | `"m/d/Y H:i"` | flatpickr |
| `X_DATE_MOMENT_PARSING_FORMAT` | 283 | `"YYYY-MM-DD HH:mm"` | moment. Comment `:281–282`: cannot reuse the flatpickr string because moment uses `mm` not `i` for minutes. |

### 1.5 Mathematical constants (formula runtime)

```js
PI_RAW        = Math.PI;                  // 3.141592653589793         (:374)
PHI_RAW       = 1.61803398875;            //                            (:375)
CURVATURE_RAW = PI_RAW * PHI_RAW;         // ≈ 5.083203692...           (:376)

PI_TO_2_DECIMAL_PLACES_AS_EXPECTED        = 3.14;   (:378)
PI_TO_3_DECIMAL_PLACES_AS_EXPECTED        = 3.141;  (:379)
PHI_TO_2_DECIMAL_PLACES_AS_EXPECTED       = 1.61;   (:381)
PHI_TO_3_DECIMAL_PLACES_AS_EXPECTED       = 1.618;  (:382)
CURVATURE_TO_2_DECIMAL_PLACES_AS_EXPECTED = 5.08;   (:384)
CURVATURE_TO_3_DECIMAL_PLACES_AS_EXPECTED = 5.083;  (:385)
```

Selection chain (`:391–408`), driven by `DECIMAL_PRECISION__TIME`:

```
if DECIMAL_PRECISION__TIME == 2:
    PI_AS_EXPECTED        = 3.14
    PHI_AS_EXPECTED       = 1.618      // <-- 3 dp ON PURPOSE even at precision 2
    CURVATURE_AS_EXPECTED = 5.08
elif DECIMAL_PRECISION__TIME == 3:
    PI_AS_EXPECTED = 3.141;  PHI_AS_EXPECTED = 1.618;  CURVATURE_AS_EXPECTED = 5.083
else:
    PI_AS_EXPECTED        = roundNumberToTimePrecision(PI_RAW)
    PHI_AS_EXPECTED       = roundNumberToTimePrecision(PHI_RAW)
    CURVATURE_AS_EXPECTED = roundNumberToTimePrecision(CURVATURE_RAW)
```

Author's comment `:394–399`: PHI is intentionally 3 dp because "Jason often says 1.618 in videos", and 2-dp PHI would be `1.62` which "looks wrong".

**Shipped values (`DECIMAL_PRECISION__TIME == 2`, `FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION == true`):**

| Name | Line | Shipped value |
|---|---|---|
| `OPH_PI` | 410 | **`3.14`** |
| `OPH_PHI` | 411 | **`1.618`** |
| `OPH_CRV` | 412 | **`5.08`** |
| `OPH_HEP` | 413 | **`7.01`** (hard-coded, no precision logic) |

```js
var ALL_OPH_CONSTANTS = ["OPH_PI", "OPH_PHI", "OPH_CRV", "OPH_HEP"];   // :415-420 — NAMES, not values
```

`ALL_OPH_CONSTANTS` holds **strings**; the validator/compiler does textual substitution using these names.

### 1.6 Decimal precision

| Name | Line | Value | Used by |
|---|---|---|---|
| `DECIMAL_PRECISION__TIME` | 369 | `2` | `roundNumberToTimePrecision` (utils:987) |
| `DECIMAL_PRECISION__LOCATION` | 370 | `1` | `roundNumberToLocationPrecision` (utils:991) — lat/long snapped to 0.1° |
| `DECIMAL_PRECISION__AXIAL_ROTATIONS` | 371 | `1` | `roundNumberToAxialRotationPrecision` (utils:995) — **Y and Z day counts carry one decimal** |
| `DECIMAL_PRECISION__SCORE` | 372 | `2` | score display |

### 1.7 Enum string literals (cross-module keys — must match exactly)

```js
// Headless output (:26-27)
OPH_HEADLESS_OUTPUT_TYPE__CSV      = "OPH_HEADLESS_OUTPUT_TYPE__CSV";
OPH_HEADLESS_OUTPUT_TYPE__DEFAULT  = OPH_HEADLESS_OUTPUT_TYPE__CSV;
DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS = Number.MIN_SAFE_INTEGER;   // -9007199254740991  (:23)

// Global option keys — these are the LITERAL keys in appState.globalOptions AND in the .oph file (:29-45)
GLOBAL_OPTION__START_SCREEN                    = "start_screen";
GLOBAL_OPTION__SKIN_MODE                       = "skin_mode";
GLOBAL_OPTION__CURRENT_FILE_PATH               = "current_file_path";
GLOBAL_OPTION__LOCAL_TIME_OFFSET_IN_MILLIS     = "local_time_offset_in_millis";
GLOBAL_OPTION__AUTO_RECALCULATE_Z_DATES        = "auto_recalculate_z_dates";
GLOBAL_OPTION__BLUR_ABOUT_SCREEN               = "blur_about_screen";
GLOBAL_OPTION__HIDE_COL__DATES                 = "hide_date_col";        // note: singular "date"
GLOBAL_OPTION__HIDE_COL__HITS                  = "hide_hits_col";
GLOBAL_OPTION__HIDE_COL__SCORE                 = "hide_score_col";
GLOBAL_OPTION__HIDE_COL__MSRF                  = "hide_msrf_col";
GLOBAL_OPTION__HIDE_COL__OPERATIONS            = "hide_operations_col";
GLOBAL_OPTION__HIDE_OPERATIONS_COL_COMPLETELY  = "hide_operations_col_completely";
GLOBAL_OPTION__PRETTIFY_X_DATE_EXPORT_OUTPUT   = "prettify_x_date_export_output";
GLOBAL_OPTION__MINIFY_X_DATE_EXPORT_OUTPUT     = "minify_x_date_export_output";
GLOBAL_OPTION__PRETTIFY_OPH_FILES              = "prettify_oph_files";
GLOBAL_OPTION__MINIFY_OPH_FILES                = "minify_oph_files";

// Scoring system (:47-55)
SCORING_SYSTEM__LTE_V7  = "SCORING_SYSTEM__LTE_V7";
SCORING_SYSTEM__GTE_V8  = "SCORING_SYSTEM__GTE_V8";
DEFAULT_SCORING_SYSTEM  = SCORING_SYSTEM__GTE_V8;
SCORING_SYSTEMS = [SCORING_SYSTEM__LTE_V7, SCORING_SYSTEM__GTE_V8];

// Input date type (:57-58)
INPUT_DATE_TYPE__X_DATE = "INPUT_DATE_TYPE__X_DATE";
INPUT_DATE_TYPE__T_DATE = "INPUT_DATE_TYPE__T_DATE";     // T-Dates are NEW in v12

// Input-change signal (:60-62)
OPHIS_INPUT_CHANGE__NO_CHANGE = "OPHIS_INPUT_CHANGE__NO_CHANGE";
OPHIS_INPUT_CHANGE__CHANGED   = "OPHIS_INPUT_CHANGE__CHANGED";
OPHIS_INPUT_CHANGE__FORCE     = "OPHIS_INPUT_CHANGE__FORCE";

// Save-blob mode (:64-66)
SAVE_BLOB_MODE__JUST_THE_EVENTS         = "SAVE_BLOB_MODE__JUST_THE_EVENTS";
SAVE_BLOB_MODE__JUST_THE_GLOBAL_OPTIONS = "SAVE_BLOB_MODE__JUST_THE_GLOBAL_OPTIONS";
SAVE_BLOB_MODE__EVERYTHING              = "SAVE_BLOB_MODE__EVERYTHING";

// Serialized top-level field names in the .oph JSON (:104-109)
SERIALIZED_FIELD__ISO_EVENTS                    = "iso_events";
SERIALIZED_FIELD__APP_VERSION                   = "app_version";
SERIALIZED_FIELD__GLOBAL_OPTIONS                = "global_options";
SERIALIZED_FIELD__UI_STATE                      = "ui_state";
SERIALIZED_FIELD__UI_STATE__CURRENT_ISO_EVENT   = "current_iso_event";
SERIALIZED_FIELD__LOCAL_STORAGE_SAVE_BLOB       = "save_blob";

// Event scope (:321-331)
EVENT_SCOPE__HH_MM  = "EVENT_SCOPE__HH_MM";
EVENT_SCOPE__DAYS   = "EVENT_SCOPE__DAYS";
EVENT_SCOPE__MONTHS = "EVENT_SCOPE__MONTHS";
EVENT_SCOPE__YEARS  = "EVENT_SCOPE__YEARS";
EVENT_SCOPES = [HH_MM, DAYS, MONTHS, YEARS];

// File-input validation strictness (:336-344) — NEW in v11
FILE_INPUT_VALIDATION_MODE__STRICT   = "FILE_INPUT_VALIDATION_MODE__STRICT";
FILE_INPUT_VALIDATION_MODE__ORIGINAL = "FILE_INPUT_VALIDATION_MODE__ORIGINAL";  // pre-v11 default
FILE_INPUT_VALIDATION_MODE__LOOSE    = "FILE_INPUT_VALIDATION_MODE__LOOSE";
FILE_INPUT_VALIDATION_MODES = [STRICT, ORIGINAL, LOOSE];

// Event type (:355-365)
EVENT_TYPE__PERSONAL     = "EVENT_TYPE__PERSONAL";
EVENT_TYPE__ASTROLOGICAL = "EVENT_TYPE__ASTROLOGICAL";   // defined but COMMENTED OUT of EVENT_TYPES
EVENT_TYPE__MARKETS      = "EVENT_TYPE__MARKETS";
DEFAULT_EVENT_TYPE = EVENT_TYPE__PERSONAL;
EVENT_TYPES = [EVENT_TYPE__PERSONAL, /* EVENT_TYPE__ASTROLOGICAL, */ EVENT_TYPE__MARKETS];

// Which X-Date the operation anchors to (:430-431)
STARTING_X1 = "STARTING_X1";
STARTING_X2 = "STARTING_X2";

// Refresh granularity (:433-435)
REFRESH_TYPE__RIGHT_PANEL_ONLY = "REFRESH_TYPE__RIGHT_PANEL_ONLY";
REFRESH_TYPE__SOFT             = "REFRESH_TYPE__SOFT";
REFRESH_TYPE__HARD             = "REFRESH_TYPE__HARD";

// Coordinate discriminator (:437-438)
COORD_LAT  = "lat";
COORD_LONG = "long";

// Z-Date sort keys (:440-453) -- NOTE: variable prefix is Z_DATE_SORT_TYPE__ but the
// string values are "SORT_TYPE__..." (no Z_DATE). Persisted values use the STRING.
Z_DATE_SORT_TYPE__SCORE      = "SORT_TYPE__SCORE";
Z_DATE_SORT_TYPE__DATE       = "SORT_TYPE__DATE";
Z_DATE_SORT_TYPE__MSRF       = "SORT_TYPE__MSRF";
Z_DATE_SORT_TYPE__HIT_COUNT  = "SORT_TYPE__HIT_COUNT";
Z_DATE_SORT_TYPE__OPERATIONS = "SORT_TYPE__OPERATIONS";
DEFAULT_Z_DATE_SORT_TYPE = Z_DATE_SORT_TYPE__DATE;
Z_DATES_SORT_TYPES = [SCORE, DATE, MSRF, HIT_COUNT, OPERATIONS];

SORT_ORDER__ASCENDING  = "SORT_ORDER__ASCENDING";    // :455
SORT_ORDER__DESCENDING = "SORT_ORDER__DESCENDING";   // :456

// Log tags (:458-460)
LOG_TAG__ERROR   = "OPHIS_ERROR";     // used by printError   (ophis_view__utils.js:663)
LOG_TAG__WARNING = "OPHIS_WARNING";   // used by printWarning (ophis_view__utils.js:667)
LOG_TAG__INFO    = "OPHIS_INFO";      // *** DEAD — never referenced ***

// Display shorthands (:462-465)
CURVATURE_SHORTHAND = "CRVTR";   // *** DEAD — never referenced ***
OPERATION_SHORTHAND = "O";
X_DATE_SHORTHAND    = "X";
Z_DATE_SHORTHAND    = "Z";
```

Derived option groups (`:68–84`):

```js
GLOBAL_HIDE_COL_OPTIONS = [HIDE_COL__DATES, HIDE_COL__HITS, HIDE_COL__SCORE,
                           HIDE_COL__MSRF, HIDE_COL__OPERATIONS];        // 5 entries

GLOBAL_BOOLEAN_OPTIONS  = [BLUR_ABOUT_SCREEN, HIDE_OPERATIONS_COL_COMPLETELY,
                           PRETTIFY_X_DATE_EXPORT_OUTPUT, MINIFY_X_DATE_EXPORT_OUTPUT,
                           AUTO_RECALCULATE_Z_DATES, PRETTIFY_OPH_FILES, MINIFY_OPH_FILES]
                          .concat(GLOBAL_HIDE_COL_OPTIONS);              // 12 entries
```

Boolean-option defaults are set in `ophis_main.js:39–47`: **every** entry of `GLOBAL_BOOLEAN_OPTIONS` defaults to `false` **except** `auto_recalculate_z_dates` and `prettify_oph_files`, which default to `true`.

### 1.8 Scope defaults (both derived from a feature flag)

```js
GLOBAL_DATE_SCOPE   = isFlagEnabled(FEATURE_FLAG__SHOW_LOCATION) ? EVENT_SCOPE__HH_MM : EVENT_SCOPE__DAYS;   // :346
                    // → EVENT_SCOPE__HH_MM  (since SHOW_LOCATION == true)
DEFAULT_EVENT_SCOPE = EVENT_SCOPE__DAYS;                                                                      // :350
```

`:348–349` documents that `DEFAULT_EVENT_SCOPE` used to be derived the same way as `GLOBAL_DATE_SCOPE` but was pinned to `DAYS` after user feedback, because it is the fallback when an `.oph` file omits a scope. **`GLOBAL_DATE_SCOPE` and `DEFAULT_EVENT_SCOPE` therefore disagree by design (HH_MM vs DAYS).**

### 1.9 FEATURE FLAG TABLE (complete)

`isFlagEnabled(x)` is `x === true` (strict). Flags are plain `var`s; nothing writes them at runtime.

| Flag | Line | Value | What it switches | Use sites |
|---|---|---|---|---|
| `FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION` | 287 | **`true`** | Use the hand-written "expected" constants (3.14 / 1.618 / 5.08) instead of `roundNumberToTimePrecision(raw)`. | `ophis_config.js:410–412` only |
| `FEATURE_FLAG__REQUIRE_SIGN_IN` | 291 | **`false`** | **Sign-in / licensing gate.** Comment `:289–290`: *"always just a false sense of security… like having a fake security camera."* When true, `init_step2_signIn` shows a password dialog and compares `sha512(pw)` to `ACCOUNT_HASHES`. | `ophis_main.js:125` |
| `FEATURE_FLAG__SHOW_MSRF_AND_OPERATION_PILL_TOOL_TIPS` | 293 | **`true`** | Tooltips on MSRF / operation "pills" in output. Note: tested with `=== true` directly, not via `isFlagEnabled`. | `ophis_view__output.js:740`, `ophis_view__strings.js:32` |
| `FEATURE_FLAG__SHOW_PAGE_REFRESHES_IN_CONSOLE` | 295 | **`false`** | **Debug switch** — logs each view refresh. | `ophis_view.js:139` |
| `FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT` | 297 | **`true`** | In `EVENT_SCOPE__DAYS`, force lat/long to `0,0` so all day math is GMT. Also default value of `xDateToNativeDate`'s 7th parameter. | `ophis_utils.js:729,768`; `ophis_model__operations.js:346`; `ophis_view__chart.js:769`; `ophis_view__chart_datasets.js:1016,1025,1215` |
| `FEATURE_FLAG__ADD_INITIAL_X_DATES_TO_NEW_ISO_EVENTS` | 298 | **`false`** | Pre-populate new Iso-Events with X-Date rows. | `ophis_controller.js:141` |
| `FEATURE_FLAG__SUNSET__ADD_Z_VALUE_TO_X_DATE_PRIOR_SUNSET` | 301 | **`false`** | Anchor the Z offset at the sunset *before* the X-Date instead of at the X-Date itself. Comment `:300`: *"After feedback from Jason, Z-Value should be added to the exact X-Date and not Prior Sunset."* | `ophis_model__operations.js:311,312`; `ophis_utils.js:10` |
| `FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_IN_SEPARATE_COL` | 302 | **`false`** | Prior-sunset gets its own table column. | `ophis_controller.js:370`; `ophis_view__rebuild.js:772,980`; `ophis_utils.js:12,22` |
| `FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_INLINE` | 303 | **`true`** | Prior-sunset rendered inline in the X-Date cell (HH:MM scope only). | `ophis_view__rebuild.js:760`; `ophis_utils.js:11,21` |
| `FEATURE_FLAG__SUNSET__CALCULATE_BEFORE_N_AFTER` | 304 | **`true`** | For each Z-Date in HH:MM scope, compute the bracketing sunsets before/after. | `ophis_model__operations.js:326`; `ophis_utils.js:13` |
| `FEATURE_FLAG__SUNSET__FILTER_BASED_ON_PRIOR_SUNSET` | 305 | **`false`** | Filter "before last X-Date" uses the X-Date's prior sunset as the cutoff. | `ophis_model__sorting.js:53`; `ophis_utils.js:14` |
| `FEATURE_FLAG__USE_SUNSET_SAMPLING` | 307 | **`true`** | Use the 15-sample sunset-set strategy (see §2.6) instead of stepping the library day by day. | `ophis_utils.js:348,380,538,583` |
| `FEATURE_FLAG__USE_PER_LIBRARY_SUNSET_CACHE` | 308 | **`true`** | Memoize sunset results per library in `sunsetLibrary.cache`. | `ophis_dependencies.js:94,105` |
| `FEATURE_FLAG__BEFORE_N_AFTER_SUNSET_CACHE` | 309 | **`false`** | Memoize `getSunsetNativeUtcDateBefore/After` in `CACHE__SUNSET_BEFORE/AFTER`. **Off ⇒ those two module-level caches are dead.** | `ophis_utils.js:489,500,514,525` |
| `FEATURE_FLAG__ALL_OPERATOR_HIDE_OUTPUT_COLS` | 311 | **`false`** | Extra column-hiding path in output rendering. | `ophis_view__output.js:289` |
| `FEATURE_FLAG__SHOW_LOCATION` | 313 | **`true`** | Master switch for lat/long + Leaflet map. **Also decides whether `appState.map` is constructed at all** (`ophis_main.js:11–12`) and drives `GLOBAL_DATE_SCOPE`. | `ophis_main.js:11,12,259`; `ophis_view.js:602`; `ophis_view__rebuild.js:293,401`; `ophis_config.js:346` |
| `FEATURE_FLAG__SHOW_SCOPE` | 314 | **`true`** | Show the scope selector in the UI. | `ophis_view__rebuild.js:289,333,451` |
| `FEATURE_FLAG__AUTOSAVE_UNDER_ELECTRON` | 316 | **`false`** | Autosave to disk on change (Electron only). Off means only explicit `forceFlush` writes. | `ophis_model__persistence.js:246,260` |
| `FEATURE_FLAG__OPEN_PREVIOUS_FILE_UNDER_ELECTRON` | 317 | **`false`** | Reopen last file on launch. | `ophis_main.js:417` |
| `FEATURE_FLAG__AUTO_FILL_X_DATES_DURING_FILE_LOAD` | 319 | **`false`** | Fabricate missing X-Dates while importing an `.oph`. | `ophis_model__validation.js:832,844,854` |

**Dangling flag name:** the bootstrap contains an HTML comment `<!-- FEATURE_FLAG__USE_COSINE_KITTY_ASTRONOMY -->` (`ophis.html:42`) but **no such variable exists in any `.js` file** — verified by exhaustive grep. Astronomy is selected purely by hard-coding in `getSunsetOnNativeUtcDate` (§4.3).

### 1.10 `SERIALIZED_FILTER_FIELDS` (`ophis_config.js:122–174`)

Eight entries, all constructed with `newSerializedFieldObject(varName, name, title, enabledByDefault, numericDefault?)`. `zIndex` defaults to `0` for all of them.

| # | `varName` | `serializationKey` | `elemId` | default on? | `numericDefault` |
|---|---|---|---|---|---|
| 1 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_BEFORE_LAST_X_DATE` | `iso_event_filter_before_last_x_date` | `iso-event-filter-before-last-x-date-checkbox` | **true** | `null` |
| 2 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_ON_LAST_X_DATE` | `iso_event_filter_on_last_x_date` | `…-checkbox` | **true** | `null` |
| 3 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_BEFORE_CURRENT_DATE` | `iso_event_filter_before_current_date` | `…-checkbox` | **true** | `null` |
| 4 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_ON_CURRENT_DATE` | `iso_event_filter_on_current_date` | `…-checkbox` | false | `null` |
| 5 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_BEYOND_MAX_DAYS` | `iso_event_filter_beyond_max_days` | `iso-event-filter-beyond-max-days-checkbox` | **true** | **`2559`** (`HIGHEST_MSRF_NUMBER`) |
| 6 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_MIN_HIT_COUNT` | `iso_event_filter_min_hit_count` | `…-checkbox` | false | **`2`** |
| 7 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_MIN_SCORE` | `iso_event_filter_min_score` | `…-checkbox` | false | **`1`** |
| 8 | `SERIALIZED_FIELD__ISO_EVENT_FILTER_MSRF_MATCH` | `iso_event_filter_msrf_match` | `…-checkbox` | false | `null` |

Labels 5–7 embed a raw `<input>` in the label HTML; the embedded `id` **must** equal the field's derived `elemIdForInput`:

```html
<!-- :149  field 5 -->
beyond <input tabindex="-1" style="text-align:left; width:51px;"
        id="iso-event-filter-beyond-max-days-input"
        class="filter_text_input general_input" row_index="0" type="text"> days
<!-- :156  field 6 -->
Hits are below <input tabindex="-1" style="text-align:left; width:35px;"
        id="iso-event-filter-min-hit-count-input"
        class="filter_text_input general_input" row_index="0" type="text">
<!-- :163  field 7 -->
Score is below <input tabindex="-1" style="text-align:left; width:35px;"
        id="iso-event-filter-min-score-input"
        class="filter_text_input general_input" row_index="0" type="text">
```

Verbatim `title` (tooltip) strings:

1. `"Checking this box means all output before last X-Date will be hidden."`
2. `"Checking this box means any output on last X-Date will be hidden."`
3. `"Checking this box means any output before the current date (adjustable) will be hidden."`
4. `"Checking this box means any output on the current date (adjustable) will be hidden."`
5. `"Checking this box means any output beyond the given number of days after the last X-Date will be hidden."`
6. `"Checking this box means any output with hit count lower than this will be hidden."`
7. `"Checking this box means any output lower than this score will be hidden. See About page for how score is calculated."`
8. `"Checking this box means any output <i>without</i> MSRF matches will be hidden."`

Plain-text `name` for fields 1–4 and 8: `"before last X-Date"`, `"on last X-Date"`, `"before current date"`, `"on current date"`, `"no MSRF matches"`.

### 1.11 `SERIALIZED_CHART_OPTION_FIELDS` (`ophis_config.js:200–266`)

Sizes: `CHART_MOON_SIZE__HTML = 30` (`:197`); `CHART_ECLIPSE_SIZE__HTML = CHART_MOON_SIZE__HTML` = `30` (`:198`).

Helper (`:180–182`):

```js
function generateChartOptionIconHtml(imagePath, imageSize) {
    return "<img style='display:block; margin-left:2px; margin-top:2px; margin-bottom:2px; width:"
         + imageSize + "px; height:" + imageSize
         + "px;' src='img/astro_indicators/" + imagePath + "' />"
}
```

Helper (`:184–195`):

```js
function newSerializedMoonOption(fieldKey, shortName, longName, image) {
    var readablePluralName = longName + " Moons";
    return newSerializedFieldObject(
        fieldKey,
        "<table class='chart_option_table'><tr><td>" + shortName +
          "</td><td class='chart_option_table_col'>" +
          generateChartOptionIconHtml(image, CHART_MOON_SIZE__HTML) + "</td></tr></table>",
        "Show any " + readablePluralName + " that are within " +
          getDayString(LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS) + " of any X-Date or Z-Date.",
        false,                              // enabledByDefault
        UNDEFINED_FIELD_INPUT_NUMBER,       // numericDefault = undefined
        readablePluralName,                 // textOnlyName
        /*zIndex=*/5
    );
}
```

`getDayString(dayCount)` (`:176–178`): `dayCount == 1 ? "1 day" : dayCount + " days"` (loose `==`).

Full table (14 entries, in array order):

| # | `varName` suffix after `SERIALIZED_FIELD__` | `serializationKey` | `elemId` | short label | image | `textOnlyName` | default | `zIndex` |
|---|---|---|---|---|---|---|---|---|
| 1 | `CHART_OPTION__SHOW_CHART` | `chart_option__show_chart` | `chart-option--show-chart-checkbox` | `Chart Itself` | — | `Chart Itself` | **true** | 10 |
| 2 | `CHART_OPTION__SHOW_DATES` | `chart_option__show_dates` | `chart-option--show-dates-checkbox` | `Chart Dates` | — | `Chart Dates` | **true** | 10 |
| 3 | `CHART_OPTION__SHOW_NEW_MOONS` | `chart_option__show_new_moons` | `chart-option--show-new-moons-checkbox` | `New` | `new_moon.png` | `New Moons` | false | 5 |
| 4 | `CHART_OPTION__SHOW_FIRST_QUARTER_MOONS` | `chart_option__show_first_quarter_moons` | … | `1st Quarter` | `first_quarter_moon.png` | `1st Quarter Moons` | false | 5 |
| 5 | `CHART_OPTION__SHOW_FULL_MOONS` | `chart_option__show_full_moons` | … | `Full` | `full_moon.png` | `Full Moons` | false | 5 |
| 6 | `CHART_OPTION__SHOW_THIRD_QUARTER_MOONS` | `chart_option__show_third_quarter_moons` | … | `3rd Quarter` | `third_quarter_moon.png` | `3rd Quarter Moons` | false | 5 |
| 7 | `CHART_OPTION__SHOW_WAXING_CRESCENT_MOONS` | `chart_option__show_waxing_crescent_moons` | … | `Wax Crscnt` | `waxing_crescent_moon.png` | `Waxing Crescent Moons` | false | 5 |
| 8 | `CHART_OPTION__SHOW_WANING_CRESCENT_MOONS` | `chart_option__show_waning_crescent_moons` | … | `Wan Crscnt` | `waning_crescent_moon.png` | `Waning Crescent Moons` | false | 5 |
| 9 | `CHART_OPTION__SHOW_WAXING_GIBBOUS_MOONS` | `chart_option__show_waxing_gibbous_moons` | … | `Wax Gibb` | `waxing_gibbous_moon.png` | `Waxing Gibbous Moons` | false | 5 |
| 10 | `CHART_OPTION__SHOW_WANING_GIBBOUS_MOONS` | `chart_option__show_waning_gibbous_moons` | … | `Wan Gibb` | `waning_gibbous_moon.png` | **`Wax Gibbous Moons`** ← **BUG, `:228` passes `"Wax Gibbous"` as `longName`** | false | 5 |
| 11 | `CHART_OPTION__FULL_SOLAR_ECLIPSES` | `chart_option__full_solar_eclipses` | `chart-option--full-solar-eclipses-checkbox` | `Full Solar` | `solar_eclipse_full.png` | `Full Solar Eclipses` | false | 10 |
| 12 | `CHART_OPTION__PARTIAL_SOLAR_ECLIPSES` | `chart_option__partial_solar_eclipses` | … | `Partial Solar` | `solar_eclipse_partial.png` | `Partial Solar Eclipses` | false | 8 |
| 13 | `CHART_OPTION__FULL_LUNAR_ECLIPSES` | `chart_option__full_lunar_eclipses` | … | `Full Lunar` | `lunar_eclipse_full.png` | `Full Lunar Eclipses` | false | 9 |
| 14 | `CHART_OPTION__PARTIAL_LUNAR_ECLIPSES` | `chart_option__partial_lunar_eclipses` | … | `Partial Lunar` | `lunar_eclipse_partial.png` | `Partial Lunar Eclipses` | false | 7 |

Eclipse `title` strings (`:233, 242, 251, 260`) all read *"…that are within **1 day** of any X-Date or Z-Date"* because they interpolate `getDayString(LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS)`. **The actual eclipse tolerance used at match time is `ECLIPSE_DATE_MATCH_TOLERANCE_IN_DAYS = 1.25`.** The tooltip lies. Additionally `:251` (Full Lunar) says *"Show any **Partial** Lunar Eclipses…"* — a copy-paste error.

```js
ALL_SERIALIZED_FIELDS = SERIALIZED_FILTER_FIELDS.concat(SERIALIZED_CHART_OPTION_FIELDS);  // :268 — 8 + 14 = 22 entries
```

---

## 2. `ophis_utils.js` — FUNCTION-BY-FUNCTION

Group order below is thematic; `file:line` gives the real position.

### 2.1 Feature-flag predicates

```ts
isFlagEnabled(featureFlag: any): boolean        // :3   → featureFlag === true   (STRICT)
isSunsetCompletelyDisabled(): boolean           // :7
isPriorSunsetDisplayEnabled(): boolean          // :19
```

* `isSunsetCompletelyDisabled()` = AND of `isFlagEnabled(f) === false` over exactly these five flags in this order: `SUNSET__ADD_Z_VALUE_TO_X_DATE_PRIOR_SUNSET`, `SUNSET__SHOW_X_DATE_PRIOR_SUNSET_INLINE`, `SUNSET__SHOW_X_DATE_PRIOR_SUNSET_IN_SEPARATE_COL`, `SUNSET__CALCULATE_BEFORE_N_AFTER`, `SUNSET__FILTER_BASED_ON_PRIOR_SUNSET`. With shipped values → **`false`** (INLINE and CALCULATE_BEFORE_N_AFTER are on).
* `isPriorSunsetDisplayEnabled()` = `INLINE === true || SEPARATE_COL === true` → **`true`**.

### 2.2 Dictionary / object helpers

```ts
removeAllDictKeysExcept(object: object, allowedKeys: string[]): void   // :27 — MUTATES, deletes own keys not in allowedKeys
getDictionarySize(dictionary: object): number                          // :35 — counts own enumerable keys
deepClone<T>(obj: T): T                                                // :815 — return JSON.parse(JSON.stringify(obj))
```

`deepClone` is the **only** clone in the codebase (13 references). Consequences: `undefined`-valued keys are dropped; `Date` becomes an ISO string; `NaN`/`Infinity` become `null`; functions are dropped; prototypes are lost; cyclic graphs throw `TypeError`. The model layer relies on it for operation lists (`ophis_model__params.js:116,120,140`) which are plain `{equation:string, weight:number, enabled:boolean}` — safe there.

### 2.3 Serialized-field lookup helpers

```ts
newSerializedFieldObject(
    varName: string,           // "SERIALIZED_FIELD__..."
    name: string,              // label HTML
    title: string,             // tooltip HTML
    enabledByDefault: boolean,
    numericDefault: number|null|undefined = null,
    textOnlyName: string|null = null,
    zIndex: number = 0
): SerializedField                                                   // :124
```

Derivation (exactly, `:125–129`):

```js
baseName                = varName.replace("SERIALIZED_FIELD__", "");   // FIRST occurrence only
serializationKey        = baseName.toLowerCase();
serializationKeyForValue= serializationKey + "_value";
elemId                  = serializationKey.replaceAll("_", "-") + "-checkbox";
elemIdForInput          = serializationKey.replaceAll("_", "-") + "-input";
```

Returned shape (`:131–143`):

```ts
type SerializedField = {
  varName: string;                  // "SERIALIZED_FIELD__ISO_EVENT_FILTER_MIN_SCORE"
  serializationKey: string;         // "iso_event_filter_min_score"     <-- key in the .oph JSON
  serializationKeyForValue: string; // "iso_event_filter_min_score_value"
  elemId: string;                   // "iso-event-filter-min-score-checkbox"
  elemIdForInput: string;           // "iso-event-filter-min-score-input"
  enabledByDefault: boolean;
  numericDefault: number|null|undefined;
  name: string;                     // may be raw HTML
  title: string;                    // may be raw HTML
  textOnlyName: string|null;
  zIndex: number;
}
```

**Gotcha:** `"CHART_OPTION__SHOW_CHART"` contains a double underscore, so `elemId` becomes `chart-option--show-chart-checkbox` with a **double hyphen**. Preserve it.

```ts
getIsoEventField(varName: string): SerializedField | null              // :47  linear scan of ALL_SERIALIZED_FIELDS
getIsoEventFieldReadableTextOnlyName(varName): string                  // :71  field.textOnlyName, else ""
isIsoEventFieldEnabled(isoEvent, varName): boolean                     // :81  isoEvent[field.serializationKey]; false if varName unknown
getIsoEventFilterNumbericValue(isoEvent, varName): number              // :93  [sic: "Numberic"]
```

`getIsoEventFilterNumbericValue` algorithm (`:93–114`) — scans **`SERIALIZED_FILTER_FIELDS` only** (not chart options):

1. Find field by `varName`.
2. `toReturn = parseFloatElseNeg1(isoEvent[field.serializationKeyForValue])`.
3. If `toReturn >= 0` → return it.
4. Else `printWarning("Could not find numeric value for " + varName + ", returning default of " + field.numericDefault)` and return `parseFloatElseNeg1(field.numericDefault)`.
   *For fields whose `numericDefault` is `null`, `parseFloat(null)` is `NaN` → returns **`-1.0`**.* **[verified]**
5. If `varName` is not found at all → `printError("Could not find numeric value for " + varName)` and return `-1.0`.

### 2.4 String / number helpers

```ts
toLowerCase(string: any): string          // :116 — falsy → ""; else ("" + string).toLowerCase()
isObjectString(object: any): boolean      // :271
parseIntElseNeg1(number: any): number     // :232 — parseIntElse(number, -1)
parseIntElse(number, elseValue): number   // :236
parseFloatElseNeg1(value): number         // :251 — parseFloatElse(value, -1.0)
parseFloatElse(value, defaultValue)       // :255
isNonNegIntOrStringThereof(value): boolean// :279
areEqualWithinTolerance(v1, v2, tol)      // :308 — Math.abs(v1-v2) <= tol   (INCLUSIVE)
numbersEqualWithinTol(n1, n2, tol)        // :221 — n2 >= n1-tol && n2 <= n1+tol  (equivalent, different impl)
sanitizeFileName(fileName: string): string// :819
getComponentOfSemVer(semVer, index)       // :697
```

* `isObjectString` (`:272`) is written `object != null & object != undefined && typeof object === "string"` — **bitwise `&` where `&&` was meant**. Because `&` binds tighter than `&&`, it evaluates as `((a) & (b)) && (typeof … === "string")`, which happens to give the right answer for all inputs. Cosmetic bug; behaviour is "is it a string".
* **`parseIntElse` is BUGGY (`:236–249`).** It checks `if (toReturn != null)`, but `parseInt("abc")` returns `NaN` and `NaN != null` is `true`, so it returns **`NaN`, never `elseValue`**, for unparseable input. **[verified: `parseIntElse("abc",-1) === NaN`, `parseIntElse(undefined,-1) === NaN`, `parseIntElse("12abc",-1) === 12`]** The `try/catch` is dead — `parseInt` does not throw.
  *Downstream consequence:* `getQueryParamInt` inherits this, and the guard in `ophis_main.js:72–77` (`if (headless_current_epoch_millis == DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS) exitHeadlessWithError(...)`) never fires for a garbage `--current-epoch-millis`, because `NaN == Number.MIN_SAFE_INTEGER` is `false`. The app then silently falls through to wall-clock time, since `getCurrentLocalTime` tests `NaN > MIN_SAFE_INTEGER` which is also `false`. **[verified]**
* `parseFloatElse` (`:255–269`) does it correctly (`Number.isNaN(toReturn) === false`). Note `parseFloat("3.5x") === 3.5` — prefix parsing is accepted. **[verified]**
* `isNonNegIntOrStringThereof(value)` (`:279–306`) — the workhorse integer validator used by date parsing:
  1. If `value` is falsy: return `true` only for exactly `"0"` or `0`; else `false`. (So `false`, `null`, `undefined`, `""`, `NaN` → `false`; `0` and `-0` → `true`.)
  2. Else stringify + `trim()`.
  3. Strip leading `"0"` characters while `length > 1`.
  4. `n = Math.floor(Number(value))`; return `n !== Infinity && String(n) === value && n >= 0`.

  **[verified] truth table:** `"0"→true`, `"00"→true`, `"007"→true`, `"0012"→true`, `" 12 "→true`, `" 0 "→true`, `"12"→true`, `0→true`, `7→true`, `"12.0"→false`, `"0.5"→false`, `"-1"→false`, `"1e3"→false`, `"+5"→false`, `"1 2"→false`, `"abc"→false`, `"Infinity"→false`, `""→false`, `"  "→false`, `"9999999999999999999999"→false` (stringifies as `1e+22`), `null/undefined/false/true/NaN→false`.
  Note the `n !== Infinity` check is redundant given `String(n) === value`.
* `sanitizeFileName` (`:819–831`): `replace(/[^a-zA-Z0-9_.-]/g, '_')` → `replace(/^[. ]+|[. ]+$/g, '')` → `substring(0, 255)`. (The second regex can never match a space after the first pass, since spaces were already turned into `_`.)
* `getComponentOfSemVer(semVer, index)` (`:697–708`): split on `"."`, return `parts[index]` or the literal string `"X"` if missing/falsy `semVer`.

### 2.5 MSRF matching — `getMsrfMatch` (`:148–219`)

**The single most load-bearing scoring primitive in the app.** Signature:

```ts
getMsrfMatch(axialRotationCount: number): MsrfMatch | null
```

```ts
type MsrfMatch = {
  msrf_filter: number[];   // IDENTITY reference to MSRF_FILTER__NORMAL | __IMPORTANT | __VORTEX
  msrf_number: number;     // the matched entry from that array
  points: number;          // 1 | 2 | 2
  css_class: string;       // "msrf_normal" | "msrf_important" | "msrf_vortex"
  readable_name: string;   // "Normal" | "Important" | "Vortex"
}
```

`newFilterMatchStruct` (`:152–178`) maps filter → `(points, cssClass, readableName)`:

| filter (identity compare with `==`) | points | css_class | readable_name |
|---|---|---|---|
| `MSRF_FILTER__NORMAL` | `POINTS__NORMAL_MSRF_MATCH` = **1** | `msrf_normal` | `Normal` |
| `MSRF_FILTER__IMPORTANT` | `POINTS__IMPORTANT_MSRF_MATCH` = **2** | `msrf_important` | `Important` |
| `MSRF_FILTER__VORTEX` | `POINTS__VORTEX_MSRF_MATCH` = **2** | `msrf_vortex` | `Vortex` |
| anything else | `0` | `""` | `""` |

(`POINTS__*` live in `ophis_model__params.js:2–7`.)

**Exact algorithm, in order:**

1. `axialRotationCount = roundNumberToAxialRotationPrecision(axialRotationCount)` — snap to 1 dp (`:150`).
2. **VORTEX first** (`:180–186`). Iterate `MSRF_FILTER__VORTEX` in array order; return on the first `areEqualWithinTolerance(vortexNumber, axialRotationCount, VORTEX_FILTER_MATCH_TOLERANCE /* 0.1 */)`. Tolerance is **inclusive** (`<=`).
3. **".5" rejection** (`:200–205`):
   ```js
   var axialRotationCountAsString = axialRotationCount + "";
   if ( axialRotationCountAsString.endsWith(".5") ) { return null; }
   ```
   Comment: *"As per Jason, numbers 'right in the middle' are counted as no match. Must trend towards either the floor or the ceiling."* Note this is a **string** test on the 1-dp-rounded value, so it fires for `12.5`, `-0.5`, `2.5`, … but **not** for `12.50` (impossible after rounding) and **not** for `12.45` (rounds to `12.5` first → then DOES fire). Order matters: vortex is checked **before** the `.5` rejection, so a vortex number ending in `.5` (`43.5`) still matches as Vortex.
4. `axialRotationCountRounded = oph_round(axialRotationCount)` (i.e. `Math.round`, half-up toward `+∞`).
5. `checkExactMatch(MSRF_FILTER__IMPORTANT, rounded)` — **IMPORTANT is tested before NORMAL**; loose `==` comparison; first hit wins.
6. `checkExactMatch(MSRF_FILTER__NORMAL, rounded)`.
7. Return `null` if neither hits.

**Consequence for scoring parity:** a raw Z-offset of `83.6` rounds (axial) to `83.6`, does not end in `.5`, `Math.round(83.6)` = `84`, which is in IMPORTANT → 2 points. A raw offset of `83.5` → rejected outright. Reimplementations that round before checking `.5`, or that check NORMAL before IMPORTANT, will diverge.

### 2.6 Sunset search (utils half)

Constants used: `MILLIS_PER_DAY`, `FEATURE_FLAG__USE_SUNSET_SAMPLING` (true), `FEATURE_FLAG__BEFORE_N_AFTER_SUNSET_CACHE` (false).

```ts
getSunsetSampling(nativeUtcDate: Date, lat: number, long: number): number[] | null      // :346
getSunsetSamplingUsingLibrary(sunsetLibrary, nativeUtcDate, lat, long): number[] | null // :378
getSunsetNativeUtcDateBefore(nativeUtcDate, lat, long, sunsetSampling_elseOut=null): Date  // :533
getSunsetNativeUtcDateAfter (nativeUtcDate, lat, long, sunsetSampling_elseOut=null): Date  // :578
getSunsetNativeUtcDateBefore_withCache(...): Date                                          // :483
getSunsetNativeUtcDateAfter_withCache (...): Date                                          // :508
assertSunsetCalculationsDisabled(): void                                                   // :331 — body fully commented out, NO-OP
```

**`getSunsetSamplingUsingLibrary` (`:378–430`) — exact constants:**

```js
if (!isFlagEnabled(FEATURE_FLAG__USE_SUNSET_SAMPLING)) return null;
var daySliceCount       = 3;
var numberOfDaysToSample= 5;
var timeSlice           = MILLIS_PER_DAY / 3;              // 28 800 000 ms = 8 h
var totalLimit          = 3 * 5;                           // 15 samples
var startDateInMillis   = nativeDateInUtcMillis + (5/2.0) * MILLIS_PER_DAY;   // +2.5 days
for (i = 0; i < 15; i++) {
    offset = timeSlice * i;                                // 0, 8h, 16h, …, 112h
    sample = new Date(startDateInMillis - offset);         // walks BACKWARD from +2.5 d to -2.166 d
    sunset = getSunsetOnNativeUtcDate_fromLibraryOrItsCacheWithNearestMinuteRounding(lib, sample, lat, long);
    if (sunset) sunsetSet.add(sunset.getTime());           // Set<number> dedupes
}
sunsetArray = Array.from(sunsetSet).sort((a,b) => a-b);    // ascending, past → future
// gap filling, iterating BACKWARD from the end:
for (i = sunsetArray.length-1; i >= 1; i--) {
    delta = sunsetArray[i] - sunsetArray[i-1];
    if (delta > MILLIS_PER_DAY * 1.5) {                    // 129 600 000 ms
        sunsetArray.splice(i, 0, sunsetArray[i-1] + Math.round(delta/2));   // fabricate one midpoint
    }
}
return sunsetArray;                                        // array of UTC millis
```

The sampling window therefore spans roughly `[date − 2.17 days, date + 2.5 days]`. Only **one** midpoint is inserted per gap, no matter how large the gap. Rationale comment `:339–345`: MeeusJs would never return certain calendar days, so missing sunsets must be fabricated.

**`getSunsetSampling` (`:346–376`):** iterate `SUNSET_LIBRARIES` in order (CosineKitty, Meeus, SunCalc); for each, build a sampling; if non-empty, push it onto `samplings`, run `validateSunsetSequence(sampling, errs)` (defined `ophis_model__validation.js:3`), and **return that sampling if `errs.length == 0`**; otherwise `continue`. If none validate, return `samplings[0]` or `null`.

`validateSunsetSequence` accepts a list only if consecutive entries' *time-of-day* (`millis % MILLIS_PER_DAY`, with wrap-around handling for the midnight boundary) differ by ≤ `5 * MILLIS_PER_MINUTE` = 300 000 ms.

**`getSunsetNativeUtcDateBefore` (`:533–576`) — exact steps:**

1. `assertSunsetCalculationsDisabled()` (no-op).
2. `nativeDateInUtcMillis = nativeDate.getTime()`.
3. If `USE_SUNSET_SAMPLING`:
   * `sunsetSampling_elseOut = sunsetSampling_elseOut ? … : []` (in/out parameter — callers pass an array to share one sampling across before+after).
   * If it's empty, `sunsetSampling_elseOut.push(...getSunsetSampling(...))` — **spreading `null` throws `TypeError` if all three libraries fail** (see G-13).
   * Walk the sampling **backwards** (`i = len-1 … 0`) and return `new Date(sample)` for the first `nativeDateInUtcMillis >= sample`. Comparison is `>=` (a date exactly at sunset returns that sunset).
4. Fallthrough loop (runs when the sampling produced no hit): `limit = 600`, `step = MILLIS_PER_DAY / 2` = 12 h. For `i` in `0..599`, probe `getSunsetOnNativeUtcDate(new Date(millis - i*step), lat, long)`; return the first result whose millis are `<= nativeDateInUtcMillis`. (Note `var i` is declared twice, `:561` and `:564` — harmless.)
5. Final fallback: `return getSunsetOnNativeUtcDate(nativeUtcDate, lat, long)`.

**`getSunsetNativeUtcDateAfter` (`:578–620`)** is the mirror image: forward scan (`i = 0 … len-1`) returning the first sample with `nativeDateInUtcMillis <= sample` (**`<=`, so a date exactly at sunset returns *that same sunset*, not the next one** — asymmetric with `Before`, which also returns it; a date exactly at a sunset yields `before === after`). Fallthrough loop adds `+i*step` and uses strict `>` (`:613`).

**`*_withCache` wrappers (`:483–531`)**: clone the input date, `roundDateToNearestMinute` it **in place**, then (only if `FEATURE_FLAG__BEFORE_N_AFTER_SUNSET_CACHE`, which is `false`) consult `CACHE__SUNSET_BEFORE` / `CACHE__SUNSET_AFTER`. **With the shipped flag values these wrappers do exactly two things: round the input to the nearest minute, and delegate.** That rounding is *not* a no-op — it is the only place callers get minute-granularity input normalisation.

**Sunset cache primitives (`:451–481`):**

```js
var CACHE__SUNSET_BEFORE = {};    // :451  (dead while the flag is false)
var CACHE__SUNSET_AFTER  = {};    // :452

sunsetCacheKey(utcMillis, lat, long) => utcMillis + "_" + lat + "_" + long        // :454-457
addToSunsetCache(cache, utcMillis, lat, long, sunsetInMillis) : void              // :459  no-op if !cache
getFromSunsetCache(cache, utcMillis, lat, long) : any|null                        // :466
```

`getFromSunsetCache` explicitly handles the `0` value (`:471–473`, comment about "backtesting around 1970"): `if (cacheValue || cacheValue === 0) return cacheValue; else return null;`.

**Naming lie:** every caller stores a **`Date` object**, not millis, into these caches (`ophis_utils.js:502,527`; `ophis_dependencies.js:107`). It works only because `utcMillisToNativeDate(x)` is `new Date(x)` and `new Date(dateObject)` clones. The `=== 0` guard is therefore unreachable.

### 2.7 DATE ARITHMETIC — the off-by-one minefield

#### 2.7.1 Millis ⇄ Date

```ts
nativeDateToUtcMillis(nativeDate: Date): number   // :320 — nativeDate.getTime()
utcMillisToNativeDate(utcMillis: number): Date    // :326 — new Date(utcMillis)
getCurrentNativeDate(): Date                      // :447 — new Date()
```
Both exist purely as named breakpoints (`:318–319, 324–325` TODOs to finish replacing raw `getTime()` / `new Date()`).

#### 2.7.2 `roundDateToNearestMinute(nativeDate)` — `:893–902`

```js
function roundDateToNearestMinute(nativeDate) {
    var seconds = nativeDate.getSeconds();
    if (seconds >= 30) { nativeDate.setMinutes(nativeDate.getMinutes() + 1); }
    nativeDate.setSeconds(0);
    nativeDate.setMilliseconds(0);
}
```
* **MUTATES in place; returns `undefined`.** Every call site relies on the mutation.
* Uses **local-time** accessors (`getSeconds`/`getMinutes`/`setMinutes`). For pure minute rounding this is normally equivalent to UTC, **except** in time zones with sub-hour offsets it is still fine (offsets are whole minutes), but across a DST transition `setMinutes(m+1)` re-resolves a local wall-clock time and can shift the instant by ±1 hour. A rewrite should use `setUTCMinutes`/`setUTCSeconds`/`setUTCMilliseconds` — but note that changes behaviour and would break bit-parity in DST edge cases.
* Rounding is **half-up on seconds only**; milliseconds are truncated, so `:29.999` rounds **down**.

#### 2.7.3 `getNoonOfNativeUtcDate` / `getTimeZeroOfNativeDateMillis` / `daysSinceEpochFromMillis`

```js
function getNoonOfNativeUtcDate(nativeUtcDate) {                    // :432-439  ** DEAD CODE: 0 callers **
    var m = nativeUtcDate.getTime();
    var priorMidnight = m - (m % MILLIS_PER_DAY);
    return new Date(priorMidnight + MILLIS_PER_DAY/2);
}
function getTimeZeroOfNativeDateMillis(nativeUtcDateInMillis) {     // :441-445  ** DEAD: only commented-out callers **
    return nativeUtcDateInMillis - (nativeUtcDateInMillis % MILLIS_PER_DAY);
}
function daysSinceEpochFromMillis(millisSinceEpoch) {               // :983-985  ** DEAD: 0 live callers **
    return (millisSinceEpoch - millisSinceEpoch % MILLIS_PER_DAY) / MILLIS_PER_DAY;
}
```

**All three are WRONG for pre-1970 dates**, because JavaScript's `%` keeps the sign of the dividend. **[verified]**

| input millis | `%`-based "prior midnight" | correct floor |
|---|---|---|
| `-1` | `0` → 1970-01-01T00:00Z (**future**) | 1969-12-31T00:00Z |
| `-86400001` | `-86400000` → 1969-12-31T00:00Z | 1969-12-30T00:00Z |

`getNoonOfNativeUtcDate(new Date("1960-05-05T18:00:00Z"))` returns **`1960-05-06T12:00:00.000Z`** — the wrong day. **[verified]** The correct formula is `Math.floor(m / MILLIS_PER_DAY) * MILLIS_PER_DAY`. Since all three functions are currently dead, this bug does not bite v12 — but a rewrite that revives them (e.g. for backtesting ancient dates, which is exactly what this app is for) must use `Math.floor`.

`getTimeZeroOfNativeDateMillis` also ignores timezone entirely — it floors to UTC midnight regardless of the event's location.

#### 2.7.4 `axialRotationsBetweenNativeDates` — `:904–981` — **THE Y CALCULATION**

```ts
axialRotationsBetweenNativeDates(
  eventScope: string,      // EVENT_SCOPE__*
  olderNativeDate: Date,
  newerNativeDate: Date,
  lat: number, long: number
): number                  // signed "whole days" (Y), rounded to 1 decimal
```

**Branch A — `eventScope == EVENT_SCOPE__HH_MM` (`:908–944`):**

1. Anchor **both** dates to their **prior sunset**:
   `olderPS = getSunsetNativeUtcDateBefore_withCache(older, lat, long)`,
   `newerPS = getSunsetNativeUtcDateBefore_withCache(newer, lat, long)`.
   (Note: each call builds its own sampling — no shared `sunsetSampling_elseOut`.)
2. `d = newerPS.getTime() - olderPS.getTime()`.
3. Comparison chain, verbatim:
   ```js
   if      ( d == 0 )               dayDifferenceManual = 0;
   else if ( d <  0 ) {
       if ( d >= -MILLIS_PER_DAY )  return -1;                  // *** EARLY RETURN, no rounding ***
       else {
           remainder = d % MILLIS_PER_DAY;                      // <= 0
           roundDown = remainder < (-MILLIS_PER_DAY/2);
           dayDifferenceManual = (d - remainder) / MILLIS_PER_DAY;   // trunc toward zero
           if (roundDown) dayDifferenceManual -= 1;
           dayDifferenceManual = roundNumberToAxialRotationPrecision(dayDifferenceManual);
       }
   }
   else if ( d <= MILLIS_PER_DAY )  dayDifferenceManual = 1;    // 0 < d <= 1 day  →  1
   else {
       remainder = d % MILLIS_PER_DAY;                          // >= 0
       roundUp   = remainder > (MILLIS_PER_DAY/2);
       dayDifferenceManual = (d - remainder) / MILLIS_PER_DAY;  // floor
       if (roundUp) dayDifferenceManual += 1;
       dayDifferenceManual = roundNumberToAxialRotationPrecision(dayDifferenceManual);
   }
   ```
   Because both operands are prior-sunset instants, `d` is in practice already a near-multiple of a day; the remainder logic exists to absorb sunset drift.
   **Asymmetry to preserve:** a positive delta of exactly `MILLIS_PER_DAY` yields `1` (via `<=`); a negative delta of exactly `-MILLIS_PER_DAY` yields `-1` (via `>=`, early return). A remainder of exactly half a day rounds **toward zero** in both directions (both tests are strict).
   The `roundNumberToAxialRotationPrecision` calls here are no-ops (the value is already an integer).

**Branch B — every other scope (`:945–948`):**

```js
var millisDifferenceManual = newerNativeDate.getTime() - olderNativeDate.getTime();
dayDifferenceManual = roundNumberToAxialRotationPrecision(millisDifferenceManual / MILLIS_PER_DAY);
```
A plain signed division rounded to **one decimal place**. Under `EVENT_SCOPE__DAYS` with `FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT` the two endpoints are both GMT-midnight, so this yields exact integers. **DST is structurally irrelevant** in this branch because everything is UTC millis — this is why `LOCK_DAY_SCOPE_TO_GMT` exists.

Dead-code notes: `:952–971` retain a commented-out moment.js cross-check and a commented-out `daysSinceEpoch` implementation with the author's note that it *"could give 366 days as output"* for a birthday calculation. `:975–978` retain a commented-out non-negative-integer assertion, disabled because *"Rotation counts are now rounded to one decimal."*

**Live callers:** `ophis_model__operations.js:191` (computes Y from X1→X2), `ophis_model__validation.js:239`.

#### 2.7.5 `xDateToNativeDate` — `:729–802` — **X-Date string → UTC `Date`**

```ts
xDateToNativeDate(
  eventScope: string,
  xDate: {date: string, time: string, enabled?: boolean},
  lat_nullable: number|null = null,
  long_nullable: number|null = null,
  errors_out: string[] = [],
  timezone_nullable: string|null = null,
  lockDayScopeToGmt: boolean = FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT   // default TRUE
): Date | null
```

Whole body is inside `try { … } catch(e) { errors_out.push("Problem parsing xDate '" + JSON.stringify(xDate) + " " + e); return null; }` (`:730, 798–801` — note the unbalanced quote in the message).

Steps:

1. **Scope → which fields to use (`:734–746`):**
   * `HH_MM`: `dateToUse = xDate.date`, `timeToUse = xDate.time`.
   * `DAYS` / `MONTHS` / `YEARS`: `dateToUse = xDate.date`, `timeToUse = TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE` = `"00:00"`.
   * Any other scope string leaves both `null`.
2. If either is `null`: push `"Scope-modified date and/or time came up null. (unhandled case)."` and return `null` (`:748–751`).
3. `calendarDateComponents = validateXDateCalendarDate(dateToUse, errors_out)` — **`ophis_model__validation.js:1106`**. Expects `m/d/Y` split on `DATE_DELIMITER`; returns `{year, month, day, year_orig, month_orig, day_orig}` or `null`. It requires exactly 3 parts, each passing `isNonNegIntOrStringThereof`, month/day `> 0`, year `>= 0`, `year.length <= 4 && month.length <= 2 && day.length <= 2`, and silently clamps year `> 9999` to `"9999"`. **It does NOT validate day-of-month against the month (e.g. `2/31/2025` passes here).**
4. `timeComponents = validateXDateTime(timeToUse, errors_out)` — **`ophis_model__validation.js:1171`**. Expects `HH:MM` (exactly one `:`), `0 <= hours <= 23`, `0 <= minutes <= 59`; returns `{hours, minutes}` or `null`.
5. If both non-null, build `standardString = dateAndTimeComponentsToStandardString(year, month, day, hours, minutes)` — **`ophis_view__strings.js:244`** → `"YYYY-MM-DD HH:mm"` (month/day/hour/minute zero-padded when `< 10` via `padWithLeadingZeroIfLessThan10`, **year NOT padded** — year `50` produces `"50-01-01 00:00"`).
6. **Location override per scope (`:766–782`) — critical:**
   ```
   if scope != HH_MM:
       if scope == DAYS:
           if lockDayScopeToGmt === true:  lat=0, long=0, timezone=null   // → tzlookup(0,0) → "Etc/GMT"
           else:                           lat=null, long=null, timezone=null
       else:                               lat=null, long=null, timezone=null   // MONTHS / YEARS
   ```
   So **only `HH_MM` honours the event's real lat/long.** `DAYS` is pinned to GMT; `MONTHS`/`YEARS` fall through to the browser-local path.
7. `toReturn = convertStandardLocalDateStringToNativeUtcDate(standardString, lat, long, timezone)` — **`ophis_dependencies.js:253`** (see §4.5).
8. `isValidNativeDate(toReturn)` (**`ophis_model__validation.js:1090`**: is a `[object Date]` and not `NaN`). If invalid, `printWarning` + push:
   ```
   "X-Date " + JSON.stringify(xDate) + " passed sniff tests but native date object '"+toReturn+"' is invalid on the raw components " + JSON.stringify(calendarDateComponents) + " and " + JSON.stringify(timeComponents)
   ```
   and return `null`.

#### 2.7.6 `roundMillisToNearestMidnightInTimeZone` — `:872–891`

```ts
roundMillisToNearestMidnightInTimeZone(nativeDateMillisUtc: number, timeZone: string): number
```

```js
var momentInstance = moment(nativeDateMillisUtc).tz(timeZone, true);   // NOTE the `true`
const midnight     = momentInstance.endOf('day');
const lastMidnight = momentInstance.startOf('day');
const timeUntilMidnight = midnight.diff(momentInstance);
const timeSinceMidnight = momentInstance.diff(lastMidnight);
nearestMidnight = (timeUntilMidnight < timeSinceMidnight) ? midnight : lastMidnight;
return nearestMidnight.valueOf();
```

**Two traps:**
* `.tz(timeZone, true)` — the second argument is moment-timezone's `keepLocalTime` flag. It **reinterprets the same wall-clock reading in the target zone** rather than converting the instant. That is deliberate here (chart tick snapping) but is not what "convert to this timezone" means.
* `endOf('day')` and `startOf('day')` **mutate `momentInstance` in place**. After line `const midnight = momentInstance.endOf('day')`, `momentInstance`, `midnight` and (after the next line) `lastMidnight` are **the same object**. Therefore `timeUntilMidnight = midnight.diff(momentInstance)` is computed *after* both mutations and evaluates to **`0`**, and `timeSinceMidnight = momentInstance.diff(lastMidnight)` is **`0`** too. `0 < 0` is false, so the function **always returns `startOf('day')`** — i.e. it always rounds **down** to the start of the day, never to the nearest midnight. **This is a live bug**, used at `ophis_view__chart_datasets.js:1024, 1026, 1214, 1216` for chart tick placement. A rewrite must decide whether to reproduce the floor behaviour (parity) or implement true nearest-midnight (correctness). The two differ for any timestamp after local noon.

#### 2.7.7 Local-time helpers

```ts
getCurrentLocalTime(millisOffset: number = 0): Date          // :650-662
getLocalTimeAsPickrValue(millisOffset): string               // :668-673  → "MM/DD/YYYY HH:mm"
getLocalDateAsPickrValue(millisOffset): string               // :675-680  → "MM/DD/YYYY"
getMillisFromStartOfDayFromNativeDate(date: Date): number    // :682-689  ** DEAD: 0 callers **
xDateToMonthYear(xDateCalendarDate: string): string          // :691-695
```

`getCurrentLocalTime`:
```js
if ( isRunningHeadless() && appState.headless_current_epoch_millis > DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS ) {
    return new Date(appState.headless_current_epoch_millis);      // *** millisOffset IGNORED, NOT rounded ***
} else {
    var toReturn = moment().add(millisOffset, 'milliseconds').toDate();
    roundDateToNearestMinute(toReturn);                            // mutating, in place
    return toReturn;
}
```
`millisOffset` comes from `appState.globalOptions["local_time_offset_in_millis"]` — the user-adjustable "current date" used by the *before/on current date* filters. **In headless replay mode that offset is silently dropped, and the returned date is not minute-rounded** — an asymmetry that will produce different filter results between GUI and headless for the same file.

`getLocalTimeAsPickrValue` / `getLocalDateAsPickrValue` route through `nativeDateToXDate` (**`ophis_view__strings.js:162`**) with **no lat/long**, so they format in the *operator's own* browser timezone (see the comment at `ophis_view__strings.js:184–186`).

`getMillisFromStartOfDayFromNativeDate` uses `getHours()`/`getMinutes()` — **local time**, and drops seconds entirely. Inconsistent with the UTC-centric rest of the file. Dead, but do not resurrect as-is.

`xDateToMonthYear("03/09/2027")` → split on `"/"` → `parts[0] + "/" + parts[2]` → `"03/2027"`.

#### 2.7.8 `xDateToInputElementValue` — `:59–69`

```ts
xDateToInputElementValue(xDate, eventScope): string | undefined
```
* `HH_MM`  → `xDate.date + " " + xDate.time`
* `DAYS`   → `xDate.date`
* `MONTHS` → `xDateToMonthYear(xDate.date)`
* `YEARS`  → `xDate.date` — **with the author's own TODO at `:67`: "Probably a TODO warranted here, to crop just the year off."** So the YEARS-scope input box shows a full `m/d/Y` string. Bug/known gap.
* Unknown scope → falls off the end → `undefined`.

### 2.8 Rounding

```ts
roundNumberToPrecision(value: number, precision: number): number   // :999-1004
roundNumberToTimePrecision(value): number            // :987  precision 2
roundNumberToLocationPrecision(value): number        // :991  precision 1
roundNumberToAxialRotationPrecision(value): number   // :995  precision 1
```

```js
function roundNumberToPrecision(value, precision) {
    var factor = Math.pow(10, precision);
    return Math.round((value + Number.EPSILON) * factor) / factor;
}
```

The `+ Number.EPSILON` is the classic "fix `1.005`" hack. **[verified]** `rnp(1.005,2) = 1.01`, `rnp(2.675,2) = 2.68`, `rnp(1.25,1) = 1.3`, `rnp(1.35,1) = 1.4`, `rnp(0.05,1) = 0.1`.
**It does not work for negatives:** `Math.round` is half-up toward `+∞`, and adding `EPSILON` pushes negatives the wrong way. **[verified]** `rnp(-1.005,2) = -1` (not `-1.01`), `rnp(-1.25,1) = -1.2` (not `-1.3`), `rnp(-0.05,1) = -0` (negative zero!). Negative axial rotations occur whenever X2 precedes X1, so this is reachable. `-0` will also stringify as `"0"`, which matters for the `.5` string test in `getMsrfMatch`.

### 2.9 Lat/long

```ts
constrainLatOrLongValue(latOrLongValue: number, latOrLong: "lat"|"long"): number   // :622-640
```

```js
if (latOrLong == COORD_LAT) {
    if (v < -65) return -65;            // NOT rounded
    else if (v > 65) return 65;         // NOT rounded
} else if (latOrLong == COORD_LONG) {
    if (v < -180) return -180;
    else if (v > 180) return 180;
} else {
    return latOrLongValue;              // unknown discriminator → passthrough, NOT rounded
}
return roundNumberToLocationPrecision(latOrLongValue);   // only in-range values get rounded to 0.1
```
**Gotcha:** out-of-range values return the raw clamp *without* the 0.1° rounding, and an unrecognised `latOrLong` string returns the value untouched. Only the in-range fallthrough is rounded.

### 2.10 Runtime environment / auth

```ts
isSignedIn(): boolean          // :642-644 — appState.isSignedIn === true
isRunningElectron(): boolean   // :646-648 — window.electronBridge ? true : false
hashAccount(account): string   // :664-666 — return sha512(account)   *** sha512 is NOT LOADED ***
```
`appState.isSignedIn` is set to `true` unconditionally at `ophis_main.js:200`, so `isSignedIn()` is `true` for the whole session regardless of the gate.

### 2.11 Query params (the headless CLI surface)

```ts
getQueryParam(name: string, defaultValue: any = null): string|any     // :855-870
getQueryParamBool(name, defaultValue = false): boolean                // :833-841
getQueryParamString(name, defaultValue = ""): string                  // :843-847
getQueryParamInt(name, defaultValue = Number.MIN_SAFE_INTEGER): number// :849-853
```

`getQueryParam` reads `window.location.search` via `URLSearchParams`; an **empty-string** value is falsy and therefore yields `defaultValue`. `getQueryParamBool` returns `true` only when the raw value `== "true"` or `== true`; **anything else returns `defaultValue`, not `false`** — so `?headless=false` with `defaultValue=false` gives `false` (fine), but a call site passing `defaultValue=true` could never be turned off by `=false`.

The full set of query-parameter names the app consumes (from all modules, for completeness):

| Param | Read at | Type |
|---|---|---|
| `headless` | `ophis_main.js:58` | bool |
| `headless_output_path` | `ophis_main.js:62` | string |
| `headless_output_type` | `ophis_view__export.js:175` (default `"csv"`) | string |
| `headless_multiple_files` | `ophis_main.js:65` | bool |
| `headless_current_epoch_millis` | `ophis_main.js:69–70` | string + int |
| `input_validation_mode` | `ophis_view__export.js:147` (default `""`) | string |

### 2.12 Misc

```ts
debounce(callback: () => void, delay: number = 100): () => void       // :804-813
getFileContents(path: string, callback: (text: string|null) => void)  // :710-726
```
* `debounce` returns a closure that **discards its own arguments** and invokes `callback()` with none. Timer is per-closure. No leading-edge call, no cancel handle.
* `getFileContents` is a bare `XMLHttpRequest` GET; `callback(xhr.responseText)` on `status == 200`, `callback(null)` otherwise. Used for `./package.json?v=<cacheBuster>` at `ophis_main.js:80`. Note: only `readyState == 4` is handled, and network errors surface as `status != 200`.

### 2.13 The formula runtime — `oph_*`

```js
// :1014-1053 — thin wrappers, one line each
oph_sqrt(v)  = Math.sqrt(v)
oph_abs(v)   = Math.abs(v)
oph_floor(v) = Math.floor(v)
oph_ceil(v)  = Math.ceil(v)
oph_log(v)   = Math.log(v)          // NATURAL log
oph_sin(v)   = Math.sin(v)          // RADIANS
oph_cos(v)   = Math.cos(v)
oph_tan(v)   = Math.tan(v)
oph_exp(v)   = Math.exp(v)
oph_round(v) = Math.round(v)        // comment :1050: wrapper "in case this needs to be updated quickly"
```

**`oph_flip(value)` — `:1055–1073` — the digit-reversal operator.**

```js
function oph_flip(value) {
    var valueAsString = value + "";
    var indexOfDecimalPlace = valueAsString.indexOf(".");
    valueAsString = valueAsString.replace(".", "");

    var valueAsStringSplit = valueAsString.split("");
    var valueAsStringSplitReversed = valueAsStringSplit.reverse();

    if ( indexOfDecimalPlace > 0 ) {
        valueAsStringSplitReversed.splice(indexOfDecimalPlace, 0, ".");
    }

    var joinArray = valueAsStringSplitReversed.join("");
    var numberObject = new Number(joinArray);
    return numberObject.valueOf();
}
```

Semantics: strip the decimal point, reverse **all** digit characters, then re-insert the point at **the same character index it originally occupied** (counting from the left of the *reversed* string). It is **not** "reverse the integer part and the fraction part separately".

**[verified] behaviour table:**

| input | output | note |
|---|---|---|
| `123` | `321` | |
| `7` | `7` | |
| `0` | `0` | |
| `100` | `1` | leading zeros of `"001"` collapse |
| `1000` | `1` | |
| `12.5` | `52.1` | `"125"` → `"521"` → point at index 2 → `"52.1"` |
| `120.5` | `502.1` | |
| `10.25` | `52.01` | |
| `0.5` | `5` | `"05"` → `"50"` → point at index 1 → `"5.0"` |
| `0.1` | `1` | |
| `-123` | **`NaN`** | the `-` reverses to the end: `"321-"` |
| `-0.5` | **`NaN`** | |
| `1e21` | **`NaN`** | exponential stringification |
| `NaN` / `Infinity` | `NaN` | |

**Any negative Y makes `oph_flip` return `NaN`**, which propagates through the operation into a `NaN` day offset. Operations like `"X2+oph_flip(oph_round(Y))"` (`ophis_model__params.js:70`) are therefore undefined when X2 precedes X1. Reproduce this exactly, or decide explicitly to change it.

```js
var ALL_OPH_FUNCTIONS = [oph_sqrt, oph_abs, oph_floor, oph_ceil, oph_log,
                         oph_sin, oph_cos, oph_tan, oph_round, oph_flip, oph_exp];  // :1075-1087
```
This is an array of **function references** (11 entries); consumers use `fn.name` for textual normalisation (`ophis_model__validation.js:38–41`). **`oph_exp` is last, out of alphabetical/definition order** — and there is a note at `ophis_model__validation.js:35–37` that names are temporarily upper-cased during normalisation specifically because `oph_exp` would otherwise be mangled to `oph_e*p` when `x` is replaced by `*`. Preserve the list contents; order only matters for the replace-loop's determinism.

### 2.14 `newOperation` — `:1006–1012` — **KNOWN BUG**

```js
function newOperation(equation, weight, enabled = true) {
    return {
        equation: equation,
        weight: weight,
        enabled: true          // <-- HARD-CODED. The `enabled` parameter is IGNORED.
    };
}
```

```ts
type Operation = { equation: string; weight: number; enabled: boolean };
```

**Consequence:** `ophis_model__params.js:109` creates the hepta-cycle op with `OPERATION_ENABLED_FALSE`, intending it to ship disabled — it ships **enabled**. (In `cloneDefaultOperationsForAppVersionGte8`, `ophis_model__params.js:125` re-sets `enabled = true` anyway, so the v8+ default set is unaffected; the LTE_V7 default set *is* affected.) `newOperation` is the single factory used by the model layer (18 references). Decide deliberately whether to fix or preserve.

---

## 3. `ophis_logging.js` — THE LOGGING FACILITY

70 lines. Three levels, one sink, one format.

### 3.1 Levels

```js
var OPHIS_LOG_LEVEL__INFO  = "OPH_INFO";     // :1
var OPHIS_LOG_LEVEL__WARN  = "OPH_WARN";     // :2
var OPHIS_LOG_LEVEL__ERROR = "OPH_ERROR";    // :3
```
These are **distinct from** the `LOG_TAG__*` constants in `ophis_config.js:458–460` (`"OPHIS_ERROR"` / `"OPHIS_WARNING"` / `"OPHIS_INFO"`), which are used by `print`/`printError`/`printWarning` in `ophis_view__utils.js:652–668`. **Two parallel tagging schemes exist.**

### 3.2 Saved originals

```js
self.originalConsoleLog   = console.log;     // :5
self.originalConsoleWarn  = console.warn;    // :6
self.originalConsoleError = console.error;   // :7
```
Captured at parse time on `self` (the global). This means `ophis_logging.js` must be parsed **before anything replaces `console.*`**.

### 3.3 Overrides

`consoleLogOverride(...args)` / `consoleWarnOverride` / `consoleErrorOverride` (`:9–46`) are identical apart from level:

1. `var message = args[0];` — **only the first argument is forwarded to the Ophis sink**; extra arguments are dropped from the CLI pipe (they still reach the real console).
2. If `self.ophisLog` exists, call `self.ophisLog(message, <LEVEL>)`.
3. If the saved original exists, `original.apply(console, args)` — full fidelity to the devtools console.

### 3.4 Activation

```js
function toggleConsoleLogOverride() {                          // :48-61
  var doTheOverride = isRunningHeadless() && isRunningElectron();
  if ( doTheOverride === true ) {
    console.log = consoleLogOverride; console.warn = consoleWarnOverride; console.error = consoleErrorOverride;
  } else {
    console.log = self.originalConsoleLog; console.warn = self.originalConsoleWarn; console.error = self.originalConsoleError;
  }
}
```
Called exactly once, from `ophis_main.js:59`, immediately after `appState.headless` is parsed and **before anything else in init**. The override is active **only when both headless and Electron** — in a plain browser it is a no-op.

### 3.5 Sink and format

```js
// WARNING: DO NOT put any console.log/warn/error statements downstream because it will cause infinite recursion.  (:63)
function ophisLog(message, logLevel = OPHIS_LOG_LEVEL__INFO) {   // :64-71
  var logTag = logLevel + ": ";
  message = logTag + message;
  electronBridge.logToCli(message);
}
```

* **Format:** `"<LEVEL>: <message>"`, e.g. `"OPH_ERROR: Self-check failed."`.
* **Sink:** `electronBridge.logToCli(string)` — the preload `contextBridge` API (**defined in `preload.js`, outside `src/`**). There is **no null-guard on `electronBridge`**; `ophisLog` would throw if invoked outside Electron, which is why `toggleConsoleLogOverride` gates on `isRunningElectron()`.
* **Recursion hazard** is real and called out: anything reachable from `ophisLog`/`electronBridge.logToCli` must not call `console.*`.
* No levels are filtered, no severity threshold, no buffering, no timestamps, no file sink.
* Non-string messages are concatenated with `+`, so objects become `"[object Object]"` on the CLI pipe (`print` in `ophis_view__utils.js:657` JSON-stringifies before logging, so most first-party messages arrive already flattened).

**Log forging note** (`Ophis_v12_ReverseEngineering_Report.md:261`, finding #5): file-derived strings flow into `console.error` → `ophisLog` → CLI unescaped, so a hostile `.oph` can inject newlines and fake log lines.

---

## 4. `ophis_dependencies.js` — THIRD-PARTY ADAPTERS

### 4.1 `newSunsetLibrary` factory — `:3–10`

```ts
type SunsetLibrary = {
  name: string;
  enabled: boolean;                                            // *** never read anywhere ***
  execute: (nativeUtcDate: Date, lat: number, long: number) => Date | null;
  cache: { [key: `${millis}_${lat}_${long}`]: Date };           // per-library memo
};
```
`enabled` is set on all three libraries but **no code reads it** — dead field.

### 4.2 The three libraries

| Const | `name` | `enabled` | Global required | Body |
|---|---|---|---|---|
| `SUNSET_LIBRARY__COSINE_KITTY` (`:16–25`) | `"CosineKitty"` | `true` | `Astronomy` | `new Astronomy.Observer(lat, long, 2)`; `Astronomy.SearchRiseSet('Sun', observer, -1, nativeUtcDate, 300)`; returns `.date` or `null` |
| `SUNSET_LIBRARY__MEEUS` (`:30–39`) | `"Meeus"` | `true` | `getSunTimesMeeus` (from `lib/meeus-easy.js`) | `getSunTimesMeeus(date, lat, long, 2)`; returns `sunTimes.setJS` or `null` |
| `SUNSET_LIBRARY__SUN_CALC` (`:43–47`) | `"SunCalc"` | `true` | `SunCalc` (**not loaded — see G-14**) | `SunCalc.getTimes(date, lat, long).sunset` or `null` |

Magic numbers: `-1` = "set" direction; `limitDays = 300` (`:20–21`, comment: *"Not 100% sure what this does, but examples in the library use 300 so I'm going with it."*). `DEFAULT_HEIGHT_IN_METERS_FOR_SUN_CALC = 2` is the observer elevation for both CosineKitty and Meeus.

**Implicit global leak:** `:22` assigns `cosineKittySunset = Astronomy.SearchRiseSet(...)` **without `var`** — creates a global. Harmless but must not be replicated under `"use strict"`.

```js
var SUNSET_LIBRARIES = [SUNSET_LIBRARY__COSINE_KITTY, SUNSET_LIBRARY__MEEUS, SUNSET_LIBRARY__SUN_CALC];  // :52-56
```
Comment `:49–51` claims *"In order of preference. If one library fails us … then we try the next one."* — **that fallback only happens inside `getSunsetSampling` (utils:354)**. See next.

Author's own quality notes: `:12–15` CosineKitty is *"Overall … the best library"* but Meeus was kept as "top choice" for legacy reasons; `:28–29` Meeus has NPEs on extreme lat/long and *"some routine date/lat/long combos provide bad info"*; `:41–42` SunCalc has *"a pretty rough issue list … should only use as last resort"*.

### 4.3 `getSunsetOnNativeUtcDate` — `:58–69` — **hard-coded to one library**

```js
function getSunsetOnNativeUtcDate(nativeUtcDate, lat, long) {
    var nativeDateUtcSunset = getSunsetOnNativeUtcDate_fromLibraryOrItsCacheWithNearestMinuteRounding(
                                  SUNSET_LIBRARY__COSINE_KITTY, nativeUtcDate, lat, long);
    // :61,:62 — commented-out alternates for MEEUS and SUN_CALC
    if ( nativeDateUtcSunset ) return nativeDateUtcSunset;
    else return nativeUtcDate;    // "At least return something."
}
```
**There is no per-call fallback chain.** If CosineKitty fails, the function returns **the input date itself** — i.e. "sunset == the X-Date". Two hazards:
* Silent wrong answers (an X-Date at 09:00 becomes its own "prior sunset").
* **Aliasing**: the caller's own `Date` object is returned, and callers such as `getSunsetOnNativeUtcDate_fromLibraryOrItsCacheWithNearestMinuteRounding:85` then call `roundDateToNearestMinute(result)` — mutating the caller's input in place.

### 4.4 Cache layer — `:71–124`

```js
function getSunsetOnNativeUtcDate_fromLibraryOrItsCacheWithNearestMinuteRounding(sunsetLibrary, nativeUtcDate, lat, long) {
    const nativeUtcDateCloned = new Date(nativeUtcDate.getTime());   // :75
    roundDateToNearestMinute(nativeUtcDateCloned);                   // :76
    var nativeDateUtcSunset = getSunsetOnNativeUtcDate_fromLibraryOrItsCache(
                                  sunsetLibrary, nativeUtcDate, lat, long);   // :78  *** passes the ORIGINAL ***
    if ( nativeDateUtcSunset ) { roundDateToNearestMinute(nativeDateUtcSunset); return nativeDateUtcSunset; }
    else return null;
}
```
**BUG:** `nativeUtcDateCloned` is computed and then **never used** (`:75–78`). The documented intent (`:72–74`: *"Round date to the nearest minute BEFORE giving to library … increases the chance of a cache hit"*) is not realised — the library and the **cache key** both see the unrounded, millisecond-precision date, so cache hit rate is near zero for arbitrary inputs. Only the **output** rounding (`:85`) actually happens.

```js
function getSunsetOnNativeUtcDate_fromLibraryOrItsCache(sunsetLibrary, nativeUtcDate, lat, long) {   // :93-111
    if ( isFlagEnabled(FEATURE_FLAG__USE_PER_LIBRARY_SUNSET_CACHE) ) {          // true
        var utcMillis = nativeDateToUtcMillis(nativeUtcDate);
        var sunsetMillis = getFromSunsetCache(sunsetLibrary.cache, utcMillis, lat, long);
        if ( sunsetMillis ) return utcMillisToNativeDate(sunsetMillis);         // new Date(Date) → clone
    }
    var toReturn = getSunsetOnNativeUtcDate_directFromLibrary(sunsetLibrary, nativeUtcDate, lat, long);
    if ( toReturn && isFlagEnabled(FEATURE_FLAG__USE_PER_LIBRARY_SUNSET_CACHE) ) {
        addToSunsetCache(sunsetLibrary.cache, nativeDateToUtcMillis(nativeUtcDate), lat, long, toReturn);  // stores a DATE
    }
    return toReturn;
}

function getSunsetOnNativeUtcDate_directFromLibrary(sunsetLibrary, nativeUtcDate, lat, long) {  // :113-124
    try   { var d = sunsetLibrary.execute(nativeUtcDate, lat, long); return d ? d : null; }
    catch (error) { printError(error + ""); return null; }
}
```
The `try/catch` at `:120` is what keeps the missing `SunCalc` global from crashing the app — it becomes a logged `ReferenceError` and a `null` return.

Cache is **unbounded and never evicted**; keys are `"<millis>_<lat>_<long>"`.

### 4.5 Timezone / moment adapters

```ts
getTimezone(lat, long): string                                   // :130-132 — tzlookup(lat, long)  (lib/tz_lookup_oss.js)
getBrowserTimezone(): string                                     // :185-187 — moment.tz.guess()
convertStandardLocalDateStringToNativeUtcDate(
    standardLocalDateString: string,   // "YYYY-MM-DD HH:mm"
    lat_nullable, long_nullable,
    timezone_nullable: string|null = null
): Date                                                          // :253-269
convertNativeLocalDateToUtc(nativeDateInLocalTime, lat, long): Date       // :271-279  ** DEAD: 0 callers **
convertNativeUtcDateToLocalMoment(nativeDateInUtcTime, lat, long): Moment // :281-288
```

**`convertStandardLocalDateStringToNativeUtcDate` — the central parse. Two mutually exclusive paths:**

```js
if ( isValidLatAndLong(lat_nullable, long_nullable) || timezone_nullable != null ) {
    var timezone = timezone_nullable != null ? timezone_nullable : getTimezone(lat_nullable, long_nullable);
    return moment.tz(standardLocalDateString, timezone).utc().toDate();
    //  ^ parses the wall-clock string AS local time in `timezone`, converts to the true instant.
    //    NOTE: no explicit format string here -- moment's default ISO-ish parsing of "YYYY-MM-DD HH:mm".
} else {
    // :261 keeps a commented-out moment.utc(...) alternative
    return moment(standardLocalDateString, X_DATE_MOMENT_PARSING_FORMAT).toDate();
    //  ^ parses in the OPERATOR'S BROWSER TIMEZONE, using the explicit "YYYY-MM-DD HH:mm" format.
    //  :265 has a leftover `// debugger;`
}
```

**This is the single biggest source of "same file, different results on a different machine".** When neither lat/long nor an explicit timezone is supplied — which per `xDateToNativeDate:766–782` is exactly the `MONTHS` and `YEARS` scopes, plus `DAYS` when `LOCK_DAY_SCOPE_TO_GMT` is false — the resulting instant depends on the host's timezone. `isValidLatAndLong` lives at `ophis_model__validation.js:403`.

`convertNativeUtcDateToLocalMoment` (`:281–288`) does the inverse in a deliberately roundabout way: format the UTC instant to a `"YYYY-MM-DD HH:mm"` string via `nativeUtcDateToStandardString_dateAndTime` (**`ophis_view__strings.js:248`**, uses `getUTC*` accessors), re-parse with `moment.utc(...)` and `.tz(timezone)`. Because the intermediate string has **minute resolution**, seconds and milliseconds are silently discarded on every round trip.

### 4.6 `flatPickrStringToXDate` — `:291–323`

```ts
flatPickrStringToXDate(eventScope: string, dateString: string):
    { date: string; time: string } | undefined
```
* `HH_MM`: split `dateString` on `" "`; `{date: parts[0], time: parts[1]}`.
* `DAYS` / `MONTHS` / `YEARS`: `{date: dateString, time: "00:00"}`.
* Unrecognised scope → **falls off the end → `undefined`** (no default branch).

Comment `:290`: *"Caller still needs to validate return value."*
**Shape gotcha:** the returned object has **no `enabled` field**, unlike `newXDate` (`ophis_view__strings.js:150–156`) which returns `{date, time, enabled: true}`. Anything that treats a flatpickr-derived X-Date as a full X-Date will see `enabled === undefined` (falsy).

### 4.7 jQuery / tipsy tooltip adapters

```ts
removeAllDisplayedToolTips(): void            // :126-128 — $(".tipsy").remove()
tipsyGravityCallback(): string                // :134-183 — `this` is the tipsy'd element
initDependencies(): void                      // :189-191 — calls initToolTips()
initToolTips(): void                          // :193-219 — ENTIRELY COMMENTED OUT; a no-op
newTipsyConfig(): object                      // :222-234
applyToolTipToCssClass(cssClass: string)      // :237-239 — $("." + cssClass).tipsy(cfg)
applyToolTipToElemId(elemId: string)          // :241-243 — applyToolTip(document.getElementById(elemId))
applyToolTip(element: Element|null)           // :245-251 — null-safe
```

`newTipsyConfig()` returns exactly:

```js
{
  fade: false,
  offset: 5,
  gravity: tipsyGravityCallback,
  opacity: 1,
  trigger: 'hover',
  html: true,                             // <-- tooltips render raw HTML (see the SERIALIZED_FIELD titles)
  delayIn: TOOL_TIP_DELAY_IN_MILLISECONDS  // = 750  (ophis_view__config.js:47)
}
```

`tipsyGravityCallback` — placement heuristic, exact constants:

```js
var tagMaxWidth  = 500;    // :139
var tagMaxHeight = 400;    // :140
var margin       = 0;      // :142
var prefer       = 'nw';   // :143
dir = { ns: 'n', ew: 'w' };                                  // from prefer[0], prefer[1]
boundTop  = $(document).scrollTop()  + margin;
boundLeft = $(document).scrollLeft() + margin;

if ( $this.offset().top - 400 < boundTop )                 { hitNorth = true; dir.ns = 'n'; }
if ( $this.offset().left < boundLeft )                     { dir.ew = 'w'; }
if ( ($(window).width() + $(document).scrollLeft())
       - ($this.offset().left + 500) < margin )            { dir.ew = 'e'; }
if ( $this.offset().top + 400 > $(window).height() + $(document).scrollTop() )
                                                            { hitSouth = true; dir.ns = 's'; }
if ( hitNorth && hitSouth ) { dir.ns = ''; }               // vertically centre when it fits neither way
return dir.ns + (dir.ew ? dir.ew : '');                    // "nw" | "n" | "sw" | "se" | "w" | "e" | ""
```
`:136–137` assign `$document` and `$window` **without `var`** — two more implicit globals. `:176–178` contains an empty `else {}` block.

---

## 5. `ophis_unit_tests.js` — EXECUTABLE GROUND TRUTH

### 5.1 Entry point and wiring

```ts
runUnitTests(errors_out: string[]): void        // :2-12
```

```js
function runUnitTests(errors_out) {
    try {
        checkFeatureFlags(errors_out);
        selfCheckMsrfFilters(errors_out);
        spotCheckFilterMatches(errors_out);
        // auditSunsetCalculations(errors_out);      // :8 — DISABLED
    } catch(e) {
        errors_out.push("Encountered error while running unit tests: " + e);
    }
}
```

Called from `init_step4_selfCheck` (`ophis_main.js:224–239`) **after** `selfCheckMsrfOnStartup(appState.startupErrors)`. In headless mode, any accumulated error is `console.error`'d one per line and then `exitHeadlessWithError("Self-check failed.")` aborts the run. In the GUI, `appState.startupErrors` is surfaced but not fatal.

`assert(condition, message)` (`:57–61`): shows a toast **only when `condition === false`** (strictly false — `undefined`/`0`/`null` do not trip it) via `showToast("ASSERTION FAILED: " + message)` (`ophis_view__utils.js:390`). Used only by the commented-out `assertSunsetCalculationsDisabled` (`ophis_utils.js:336`). Effectively unused.

### 5.2 Test 1 — `checkFeatureFlags` — `:63–68` — **NO-OP**

```js
function checkFeatureFlags(errors_out) {
    if ( isSunsetCompletelyDisabled() === false) {
        // They're back baby!
        // errors_out.push("All sunset feature flags should be off.");
    }
}
```
The only assertion is commented out. **Asserts nothing.** Reproduce as an empty test or drop it.

### 5.3 Test 2 — `selfCheckMsrfFilters` — `:96–118` — **THE MAIN PARITY TEST**

```js
selfCheckMsrfFilter(MSRF_FILTER__NORMAL,    errors_out);
selfCheckMsrfFilter(MSRF_FILTER__IMPORTANT, errors_out);
selfCheckMsrfFilter(MSRF_FILTER__VORTEX,    errors_out);
selfCheckMsrfFilter(MSRF_FILTER__FINAL,     errors_out);
```

`selfCheckMsrfFilter(filter, errors_out)` (`:103–118`) — for every number `n` in `filter`:

```
m = getMsrfMatch(n)
if m != null:
    if (filter == MSRF_FILTER__FINAL) or (m.msrf_filter === filter):
        pass
    else:
        errors_out.push("Programmer Error: Filter number '" + n +
                        "' matched against wrong filter starting with: " + filter[0])
else:
    errors_out.push("Programmer Error: Unclassified filter number '" + n +
                    "' for filter starting with: " + filter[0])
```

**Assertions this pins down (restate as parity tests):**

| # | Assertion |
|---|---|
| T2.1 | For every `n` in `MSRF_FILTER__NORMAL` (325 entries): `getMsrfMatch(n)` is non-null **and** returns the NORMAL filter identity. In particular no NORMAL number may collide with IMPORTANT (checked first) or land within `0.1` of a vortex number. |
| T2.2 | For every `n` in `MSRF_FILTER__IMPORTANT` (53 entries): non-null and returns the IMPORTANT identity. |
| T2.3 | For every `n` in `MSRF_FILTER__VORTEX` (12 entries): non-null and returns the VORTEX identity. Since vortex is checked first with tolerance `0.1`, this holds trivially. |
| T2.4 | For every `n` in `MSRF_FILTER__FINAL` (390 entries = 325+53+12, sorted ascending): `getMsrfMatch(n)` is **non-null** — the identity check is skipped by the `filter == MSRF_FILTER__FINAL` short-circuit. |

**[verified] properties of the shipped data that make T2.1–T2.4 pass** (computed by evaluating `ophis_model__params.js`):

* `|NORMAL| = 325`, `|IMPORTANT| = 53`, `|VORTEX| = 12`, `|FINAL| = 390`.
* `NORMAL ∩ IMPORTANT = ∅`.
* `NORMAL` has **no duplicate values**.
* `NORMAL` is sorted ascending **except for one inversion: `… 1620, 1641, 1574, 1680 …`** (`ophis_model__params.js:30`) — `1574` is out of place. Harmless for `getMsrfMatch` (linear scan) but a data smell; a rewrite that assumes sortedness (e.g. binary search) **will break**.
* The only vortex number within `0.1` of an integer is `87.1` (→ `87`), and `87` is in neither NORMAL nor IMPORTANT, so no false-vortex shadowing occurs.

### 5.4 Test 3 — `spotCheckFilterMatches` — `:70–94`

```js
var NULL_FILTER = null;
spotCheckFilterMatch(12.5, NULL_FILTER,        errors_out);
spotCheckFilterMatch(12.4, MSRF_FILTER__NORMAL, errors_out);
// spotCheckFilterMatch(12.5, NULL_FILTER, errors_out);   // :75 duplicate, commented out
```

`spotCheckFilterMatch(axialRotation, expectedFilter, errors_out)` (`:78–94`):

```
m = getMsrfMatch(axialRotation)
if m != null:
    if m.msrf_filter != null and m.msrf_filter === expectedFilter: pass
    else: errors_out.push("Filter starting with " + m.msrf_filter[0] + " matched for rotation count '" +
                          axialRotation + "' but expected filter startig with " + expectedFilter[0])   // [sic] "startig"
else:
    if expectedFilter === null: pass
    else: errors_out.push("Got a null filter for rotation count '" + axialRotation +
                          "' but expected filter starting with: " + expectedFilter[0])
```

**Parity assertions:**

| # | Assertion | Why |
|---|---|---|
| T3.1 | `getMsrfMatch(12.5) === null` | `12.5` is not within `0.1` of any vortex number, and the string `"12.5"` ends with `".5"` → the "middle number" rejection at `getMsrfMatch:203`. |
| T3.2 | `getMsrfMatch(12.4).msrf_filter === MSRF_FILTER__NORMAL` (and by construction `.msrf_number === 12`, `.points === 1`, `.css_class === "msrf_normal"`, `.readable_name === "Normal"`) | `Math.round(12.4) = 12`; `12` is not in IMPORTANT; `12` is the first element of NORMAL. |

**Latent crash in the failure path (`:85`):** if `expectedFilter` is `null` **and** a match is nevertheless returned, the code does `expectedFilter[0]` → `TypeError`. The outer `try/catch` in `runUnitTests` converts it into `"Encountered error while running unit tests: TypeError…"`, so a regression in T3.1 produces a confusing message rather than the intended one.

### 5.5 Disabled test — `auditSunsetCalculations` — `:14–55`

Commented out at the call site (`:8`) because it is a full lat/long sweep:

```js
for (lat = -LAT_LIMIT /* -65 */; lat <= 65; lat++)
  for (long = -LONG_LIMIT /* -180 */; long <= 180; long++)        // 131 × 361 = 47 291 locations
      console.log("Auditing sunsets for lat="+lat+" long="+long);
      auditSunsetCalculationsForLocation(lat, long, errors_out);
```

`auditSunsetCalculationsForLocation(lat, long, errors_out)` (`:29–55`):

1. `startingXDate = newXDate("01/01/2025", "12:00")` (**`ophis_view__strings.js:150`**).
2. `nativeDate = xDateToNativeDate(EVENT_SCOPE__HH_MM, startingXDate, lat, long)`.
3. `startingDateMillis = nativeDateToUtcMillis(nativeDate)`.
4. `dayLimit = 400`; for `i` in `0..399`: `ithDateMillis = startingDateMillis + i * MILLIS_PER_DAY`; collect `nativeDateToUtcMillis(getSunsetNativeUtcDateBefore(new Date(ithDateMillis), lat, long))` into `sunsetsBefore`.
   (The parallel `sunsetsAfter` collection at `:48–50` is commented out; `var sunsetsAfter = []` at `:38` is therefore always empty and `validateSunsetSequence(sunsetsAfter, …)` at `:54` is likewise commented out.)
5. `validateSunsetSequence(sunsetsBefore, errors_out)` — asserts consecutive sunsets occur within **5 minutes of the same time-of-day**, wrapping at midnight (`ophis_model__validation.js:3–28`).

Useful as an optional deep test in a rewrite; note it depends on `xDateToNativeDate`, `newXDate`, and `getSunsetNativeUtcDateBefore`, and takes ~47k × 400 sunset computations at full sweep.

### 5.6 Companion check (defined elsewhere, runs first)

`selfCheckMsrfOnStartup(errors_out)` — **`ophis_model__validation.js:1041–1088`**, called at `ophis_main.js:228`. Not in this assignment, but it is part of the same startup gate. It asserts, over `MSRF_FILTER__FINAL`:
* every entry is either a positive integer (`isNonNegIntOrStringThereof` + `parseIntElseNeg1(x) > 0`), or matches as a Vortex number;
* no entry appears more than once (exact `==` comparison across the whole array, O(n²) at 390² = 152 100 iterations).

---

## 6. `scratchpad.js`

Entire file (`:1–3`):

```js

// DEFAULT_STARTING_SCREEN = OPHIS_SCREEN__OPERATIONS;
// DEFAULT_STARTING_SCREEN = OPHIS_SCREEN__EVENT_SETTINGS;
```

Zero executable statements. It is loaded **last** so a developer can paste a global override that wins over every module. In the rewrite this becomes either a dev-only override hook or nothing.

---

## 7. GOTCHAS — subtle behaviour a naive reimplementation gets wrong

| ID | Gotcha |
|---|---|
| **G-1** | **`ophis_utils.js` must load before `ophis_config.js`.** Config calls `newSerializedFieldObject`, `isFlagEnabled` and `roundNumberToTimePrecision` at module-evaluation time (`ophis_config.js:123, 346, 405–412`). Inverting the order or converting to ESM with a config→utils cycle breaks the app at boot. |
| **G-2** | **`newOperation` ignores its `enabled` argument** (`ophis_utils.js:1006–1012`, hard-codes `enabled: true`). `OPERATION_ENABLED_FALSE` in `ophis_model__params.js:109` is a no-op. |
| **G-3** | **`parseIntElse` returns `NaN`, not the default**, for unparseable input (`ophis_utils.js:236–249`). This silently disables the `--current-epoch-millis` validation guard in `ophis_main.js:72–77`. `parseFloatElse` does *not* have this bug — the two helpers behave differently. |
| **G-4** | **`roundMillisToNearestMidnightInTimeZone` always rounds DOWN** (`ophis_utils.js:872–891`). `moment.endOf/startOf` mutate in place, so both `diff` values are `0` and the `<` test never selects the upper midnight. Chart ticks are floored, not nearest. |
| **G-5** | **`getNoonOfNativeUtcDate`, `getTimeZeroOfNativeDateMillis` and `daysSinceEpochFromMillis` use `%` on possibly-negative epoch millis** and are therefore off by one full day for any pre-1970 date. Currently all three are dead; do not revive without `Math.floor(m / MILLIS_PER_DAY)`. |
| **G-6** | **`roundNumberToPrecision` mis-rounds negatives.** `+ Number.EPSILON` biases toward `+∞`, and `Math.round` is half-up. `rnp(-1.25, 1) = -1.2`, `rnp(-0.05, 1) = -0`. Negative Y is reachable (X2 before X1). |
| **G-7** | **`oph_flip` on a negative number returns `NaN`** — the minus sign is reversed into the last position. Same for exponential-notation values (`1e21`). Any operation containing `oph_flip` yields a `NaN` day offset when Y < 0. |
| **G-8** | **`oph_flip` re-inserts the decimal point at the ORIGINAL character index**, not by reversing integer and fractional parts separately: `oph_flip(12.5) === 52.1`, `oph_flip(10.25) === 52.01`, `oph_flip(0.5) === 5`, `oph_flip(100) === 1`. |
| **G-9** | **`getMsrfMatch` order is: VORTEX (tolerance 0.1, inclusive) → `.5` string rejection → `Math.round` → IMPORTANT → NORMAL.** Rounding before the `.5` test, or testing NORMAL before IMPORTANT, changes scores. Vortex numbers ending in `.5` (`43.5`) still match because vortex runs *before* the rejection. |
| **G-10** | **The `.5` rejection is a STRING test** (`("" + x).endsWith(".5")`) performed on the value already snapped to 1 decimal. So `12.45` → rounds to `12.5` → rejected, while `12.44` → `12.4` → matches NORMAL 12. |
| **G-11** | **`MSRF_FILTER__NORMAL` is not fully sorted** — `1574` sits between `1641` and `1680` (`ophis_model__params.js:30`). Any binary search or "sorted" assumption is wrong. `MSRF_FILTER__FINAL` *is* sorted (built with an explicit numeric comparator at `:57`). |
| **G-12** | **`MSRF_FILTER__FINAL` contains duplicates by construction?** No — verified there are none among the 390 entries — but `selfCheckMsrfOnStartup` performs an O(n²) duplicate scan anyway, and `selfCheckMsrfFilter(MSRF_FILTER__FINAL, …)` deliberately **skips** the filter-identity assertion. Do not "strengthen" that test; NORMAL numbers reached through FINAL legitimately match NORMAL, and vortex numbers legitimately match VORTEX. |
| **G-13** | **`sunsetSampling_elseOut.push(...getSunsetSampling(...))` throws `TypeError` if `getSunsetSampling` returns `null`** (`ophis_utils.js:546, 590`). That happens when every sunset library fails for the given lat/long. Guard it. |
| **G-14** | **`SUNSET_LIBRARY__SUN_CALC` calls a global `SunCalc` that the bootstrap never loads.** (`lib/suncalc.js` exists on disk but has no `<script>` tag.) It survives only because `getSunsetOnNativeUtcDate_directFromLibrary` wraps `execute` in `try/catch` (`ophis_dependencies.js:114–123`) and turns the `ReferenceError` into `printError` + `null`. Every sampling attempt therefore logs an error for the third library. |
| **G-15** | **`getSunsetOnNativeUtcDate` is hard-wired to CosineKitty only** (`ophis_dependencies.js:60`); the `SUNSET_LIBRARIES` "order of preference / fall back to the next one" comment applies **only** to `getSunsetSampling`. On failure it returns **the input `Date` object itself**, which downstream code then mutates via `roundDateToNearestMinute`. |
| **G-16** | **The "round before calling the library" optimisation in `getSunsetOnNativeUtcDate_fromLibraryOrItsCacheWithNearestMinuteRounding` is dead** — the rounded clone at `ophis_dependencies.js:75–76` is never passed anywhere. Cache keys use the unrounded millis, so the per-library cache almost never hits. |
| **G-17** | **The sunset caches store `Date` objects under names that say millis.** `getFromSunsetCache`'s `cacheValue === 0` guard (`ophis_utils.js:473`) is dead, and `utcMillisToNativeDate(dateObject)` works only because `new Date(date)` happens to clone. |
| **G-18** | **`roundDateToNearestMinute` mutates its argument and returns `undefined`**, and uses **local-time** accessors. Callers depend on the mutation (`ophis_utils.js:487, 512, 658`; `ophis_dependencies.js:85`). |
| **G-19** | **`hashAccount` calls `sha512`, which is not loaded** (`ophis.html:66/67` keeps the script commented out). Flipping `FEATURE_FLAG__REQUIRE_SIGN_IN` to `true` without also uncommenting that `<script>` throws `ReferenceError: sha512 is not defined` inside `init_step2_signIn`, hard-failing boot. Delete the gate rather than fixing it. |
| **G-20** | **`getCurrentLocalTime` ignores `millisOffset` in headless replay mode** and skips the minute rounding on that path (`ophis_utils.js:650–662`), so "before/on current date" filters differ between GUI and headless for the same file. |
| **G-21** | **Only `EVENT_SCOPE__HH_MM` uses the event's real lat/long.** `DAYS` is forced to `0,0` (GMT) when `FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT` is true; `MONTHS` and `YEARS` are forced to the null-location branch, which parses in the **operator's browser timezone** (`ophis_utils.js:766–782` + `ophis_dependencies.js:262`). MONTHS/YEARS results are therefore machine-dependent. |
| **G-22** | **`convertNativeUtcDateToLocalMoment` round-trips through a minute-resolution string**, discarding seconds and milliseconds every time (`ophis_dependencies.js:281–288`). |
| **G-23** | **`axialRotationsBetweenNativeDates` early-returns `-1` for any negative delta within one day**, bypassing all rounding, while the mirror positive case (`0 < d <= 1 day → 1`) goes through the normal path. Exactly-half remainders round toward zero in both directions (both comparisons are strict). |
| **G-24** | **`flatPickrStringToXDate` returns objects without `enabled`**, unlike `newXDate`. And it returns `undefined` for an unrecognised scope. |
| **G-25** | **`xDateToInputElementValue` returns the full `m/d/Y` string in YEARS scope** (author's TODO at `ophis_utils.js:67`). |
| **G-26** | **`elemId` derivation turns `__` into `--`**: `SERIALIZED_FIELD__CHART_OPTION__SHOW_CHART` → `chart-option--show-chart-checkbox`. Any hand-written HTML must match. |
| **G-27** | **Eclipse tooltips advertise a 1-day tolerance but the code uses 1.25 days** (`ECLIPSE_DATE_MATCH_TOLERANCE_IN_DAYS`); and the Full-Lunar tooltip text says "Partial Lunar" (`ophis_config.js:251`). |
| **G-28** | **`newSerializedMoonOption` for waning gibbous is passed `"Wax Gibbous"`** (`ophis_config.js:228`), so its `textOnlyName` is `"Wax Gibbous Moons"` — used in exports and legends. |
| **G-29** | **`Z_DATE_SORT_TYPE__*` variable names do not match their string values** (`"SORT_TYPE__DATE"`, not `"Z_DATE_SORT_TYPE__DATE"`). The **string** is what gets persisted. |
| **G-30** | **`ECLLIPSE_DATE_MATCH_TOLERANCE` is misspelled with two L's** and is referenced by that spelling elsewhere. `getIsoEventFilterNumbericValue` is misspelled too. Renaming requires a full sweep. |
| **G-31** | **`isNonNegIntOrStringThereof` accepts leading zeros and surrounding whitespace** (`"007"`, `" 12 "` → `true`) but rejects `"12.0"`, `"+5"` and `"1e3"`. Date component validation depends on exactly this. |
| **G-32** | **`getQueryParamBool` returns `defaultValue` (not `false`) for any non-`"true"` value**, so a `true` default cannot be overridden from the command line. |
| **G-33** | **`deepClone` is a JSON round trip.** `Date` → ISO string, `undefined` keys vanish, `NaN`/`Infinity` → `null`, cycles throw. |
| **G-34** | **Two parallel log-tag vocabularies exist**: `OPHIS_ERROR`/`OPHIS_WARNING`/`OPHIS_INFO` (`LOG_TAG__*`, used by `print`) and `OPH_INFO`/`OPH_WARN`/`OPH_ERROR` (`OPHIS_LOG_LEVEL__*`, used by `ophisLog`). A headless error line reads `"OPH_ERROR: OPHIS_ERROR: <text>"` when it originates from `printError`. |
| **G-35** | **`console.*` overrides forward only `args[0]` to the CLI sink.** Multi-argument logs lose everything after the first argument in headless output. |
| **G-36** | **Implicit globals**: `cosineKittySunset` (`ophis_dependencies.js:22`), `$document` and `$window` (`ophis_dependencies.js:136–137`). None survive `"use strict"`. |
| **G-37** | **`getSunsetNativeUtcDateAfter` returns the *same* sunset for a date exactly at sunset** (`<=` at `ophis_utils.js:596`), so `before === after` at that instant rather than bracketing it. |
| **G-38** | **`APP_VERSION` is mutated at runtime** despite the file header declaring everything immutable — `ophis_main.js:100–113` rewrites it from `package.json`, collapsing `"12.0.0"` → `"12.0"` and appending any `rc` suffix with dots stripped. |

---

## 8. DEAD CODE INVENTORY (verified by whole-`src/` grep)

Zero live references outside their own definition:

| Symbol | Location |
|---|---|
| `getNoonOfNativeUtcDate` | `ophis_utils.js:432` |
| `getMillisFromStartOfDayFromNativeDate` | `ophis_utils.js:682` |
| `daysSinceEpochFromMillis` | `ophis_utils.js:983` (only a commented reference remains) |
| `getTimeZeroOfNativeDateMillis` | `ophis_utils.js:441` (only commented references at `ophis_view__chart_datasets.js:1119, 1135`) |
| `convertNativeLocalDateToUtc` | `ophis_dependencies.js:271` |
| `MINIMUM_X_DATES_REQUIRED` | `ophis_config.js:93` (superseded by `MINIMUM_NUMBER_OF_X_DATES`) |
| `LOG_TAG__INFO` | `ophis_config.js:460` |
| `CURVATURE_SHORTHAND` | `ophis_config.js:462` |
| `SunsetLibrary.enabled` field | `ophis_dependencies.js:6` — set on all three, read by nothing |
| `assertSunsetCalculationsDisabled` body | `ophis_utils.js:331–337` — entirely commented out; the function is called at `:384, 535, 580` and does nothing |
| `initToolTips` body | `ophis_dependencies.js:193–219` — entirely commented out |
| `checkFeatureFlags` assertion | `ophis_unit_tests.js:63–68` — asserts nothing |
| `auditSunsetCalculations` | `ophis_unit_tests.js:14` — call site commented out at `:8` |
| `CACHE__SUNSET_BEFORE` / `CACHE__SUNSET_AFTER` | `ophis_utils.js:451–452` — gated behind `FEATURE_FLAG__BEFORE_N_AFTER_SUNSET_CACHE = false` |
| `nativeUtcDateCloned` | `ophis_dependencies.js:75` — computed, never used |
| `numbersEqualWithinTol` vs `areEqualWithinTolerance` | `ophis_utils.js:221` / `:308` — functionally identical duplicates, both live (1 caller each) |
| `EVENT_TYPE__ASTROLOGICAL` | `ophis_config.js:356` — defined and referenced by the view layer, but commented out of `EVENT_TYPES` so it is unreachable from the UI |
| `scratchpad.js` | whole file |

---

## 9. EXTERNAL DEPENDENCIES OF THIS SUBSYSTEM (defined outside the six assigned files)

Named, not guessed at:

| Symbol | Defined in | Used by |
|---|---|---|
| `printError`, `printWarning`, `print` | `ophis_view__utils.js:652–668` | utils, dependencies |
| `showToast` | `ophis_view__utils.js:390` | `assert` |
| `TOOL_TIP_DELAY_IN_MILLISECONDS` = `750` | `ophis_view__config.js:47` | `newTipsyConfig` |
| `cloneNativeDate` | `ophis_view__strings.js:158` | `getSunsetNativeUtcDate*_withCache` |
| `newXDate` | `ophis_view__strings.js:150` | unit tests |
| `nativeDateToXDate` | `ophis_view__strings.js:162` | `getLocal*AsPickrValue` |
| `dateAndTimeComponentsToStandardString` | `ophis_view__strings.js:244` | `xDateToNativeDate` |
| `nativeUtcDateToStandardString_dateAndTime` | `ophis_view__strings.js:248` | `convertNative*` adapters |
| `validateXDateCalendarDate`, `validateXDateTime`, `isValidNativeDate`, `isValidLatAndLong`, `validateSunsetSequence` | `ophis_model__validation.js:1106, 1171, 1090, 403, 3` | `xDateToNativeDate`, sampling, dependencies |
| `MSRF_FILTER__NORMAL / __IMPORTANT / __VORTEX / __FINAL`, `POINTS__*` | `ophis_model__params.js:17, 38, 44, 57, 2–7` | `getMsrfMatch`, unit tests |
| `appState` | `ophis_main.js:4` | `isSignedIn`, `getCurrentLocalTime` |
| `isRunningHeadless` | `ophis_main.js:187` | logging, `getCurrentLocalTime` |
| `electronBridge` | **`preload.js`** (Electron `contextBridge`, outside `src/`) | `ophisLog`, `isRunningElectron` |
| `sha512` | `lib/sha512.min.js` — **not loaded** | `hashAccount` |
| `Astronomy` | `lib/astronomy.browser.min.js` | CosineKitty sunset |
| `getSunTimesMeeus` | `lib/meeus-easy.js` (over `lib/meuusjs.1.0.3.min.js`) | Meeus sunset |
| `SunCalc` | `lib/suncalc.js` — **not loaded** | SunCalc sunset |
| `tzlookup` | `lib/tz_lookup_oss.js` | `getTimezone` |
| `moment`, `moment.tz` | `lib/moment-with-locales.min.js` + `lib/moment-timezone-with-data.js` | date conversion, `getCurrentLocalTime`, midnight snapping |
| `$` / `jQuery.fn.tipsy` | `lib/jquery.min.js` + `lib/jquery.tipsy.js` | tooltips |
| `L` (Leaflet) | `lib/leaflet_1_8_0.js` | `appState.map` (top-level in `ophis_main.js`) |
| `OPHIS_SCREEN__ABOUT`, `DEFAULT_SKIN_MODE`, `DEFAULT_MAP_SELECTION_ZOOM` | `ophis_view__config.js` | `ophis_main.js` top level |

---

## 10. REWRITE CHECKLIST FOR THIS SUBSYSTEM

1. Port constants verbatim (§1). Delete `ACCOUNT_HASHES` and the sign-in gate entirely.
2. Make `roundNumberToPrecision` sign-correct, or document that you are preserving G-6 for parity.
3. Fix `parseIntElse` (G-3) — it is a silent-failure generator, and its only observable current effect is disabling a validation guard.
4. Decide explicitly on `newOperation`'s `enabled` (G-2) and `roundMillisToNearestMidnightInTimeZone`'s floor behaviour (G-4).
5. Replace `%`-based day flooring with `Math.floor` before reviving any of the three dead epoch helpers (G-5).
6. Keep `getMsrfMatch`'s exact five-step order and the `.5` string test (G-9, G-10).
7. Keep `oph_flip`'s index-based decimal reinsertion, and decide what to do about negative inputs (G-7, G-8).
8. Replace the two sunset caches and the three-library fallback with a single deterministic sunset provider; the current code has one live library, one dead cache, one un-loaded library and a dead rounding optimisation (G-14 … G-17).
9. Port the unit tests as real parity tests (§5.3, §5.4) — they are the only executable ground truth in the codebase, and T2.1–T2.4 + T3.1 + T3.2 pin down the entire MSRF matcher.
10. Keep the exact serialization key strings (§1.7, §1.10, §1.11) or write a migration for existing `.oph` files.
