# Ophis v12 / PSYFR — Persistence & `.oph` File Format — Implementation Spec

**Scope of this document:** the `.oph` on-disk file format, the browser-side
`localStorage` autosave, the save/serialize path, the load/parse/validate path,
version handling, and date/time string formats. Written so a competent engineer
can reimplement the subsystem without reading the original source.

**Primary source files read in full for this spec:**

- `src/ophis_model__persistence.js` (377 lines) — the save/load orchestration.
- `src/ophis_model__params.js` (143 lines) — default operation sets and version deltas.
- `src/ophis_config.js` — all serialization keys, constants, formats, enums.
- `src/ophis_model__validation.js` — the entire load/validate/serialize-sanitize pipeline.
- `src/ophis_utils.js` — `deepClone`, `newOperation`, date helpers, parsers.
- `src/ophis_view__strings.js` — date/time string formatting on disk.
- `src/ophis_dependencies.js` — moment.js parse/format bridge.
- `src/ophis_controller.js` — `createNewIsoEvent`, `swapInNewIsoEventArray`.
- `src/ophis_main.js` — `appState` shape, boot load path, `resetAllIsoEvents`.
- `src/ophis_view__settings.js`, `src/ophis_view__export.js`, `src/ophis_view.js` — file export / import UI paths.
- Sample files: `test-bradley.oph`, `test-file-bradley-rogue-dates.oph`, `7-4-26-8-20-26-3-9-27-3-16-27-8-19-27-4-1-28.oph`.

**Dependencies defined outside this subsystem (named, not re-specified here):**

- `runOphisOnEvent` / `getEffectiveOperations` (in `ophis_model__operations.js`) — consume the loaded model. Load path only touches `effective_operations` to delete it before save.
- `xDateToNativeDate`, `axialRotationsBetweenNativeDates`, `getTimezone`, `moment` / `moment-timezone` — used by validation to prove a date string is loadable. Their timezone behaviour is specified in the date/time section only as far as persistence relies on it.
- `refreshIsoEvents`, `rebuildIsoEventTableRows`, `showToast`, `flatpickr` — UI reactions to a load; not part of the format.

---

## 0. TL;DR mental model

An `.oph` file is **UTF-8 JSON** with three top-level fields:

```jsonc
{
  "app_version": "12",          // string; used only to pick default scoring / int compare
  "iso_events": [ /* IsoEvent[] */ ],
  "global_options": { /* only ever written to localStorage, never to .oph on-disk saves */ }
}
```

- On-disk `.oph` files written by the app contain **only** `app_version` + `iso_events`
  (mode `SAVE_BLOB_MODE__JUST_THE_EVENTS`). `global_options` is written **only** into the
  browser `localStorage` blob (mode `SAVE_BLOB_MODE__EVERYTHING`). See §5.
- The JSON is post-processed after `JSON.stringify` by a `replaceAll(",", ", ")` — so every
  comma in the file is followed by a space, including commas inside string values (a GOTCHA, §5.3).
- Load is **lenient by default** in the GUI (`FILE_INPUT_VALIDATION_MODE__LOOSE`): missing
  fields are auto-filled, invalid dates are dropped, unknown enums are coerced to defaults.
  Headless CLI defaults to `STRICT`. See §4.
- **Security-critical:** each IsoEvent carries an `operations[].equation` string that is
  ultimately compiled with `new Function(...)` (in the operations subsystem). The load
  validator does **not** content-check these strings; a crafted `.oph` reaches code execution.
  See §8 GOTCHAS / SECURITY.

---

## 1. THE COMPLETE `.oph` SCHEMA

### 1.1 Top-level document

```ts
interface OphDocument {
  app_version: string;      // e.g. "12", "9", "12.0". Optional in practice; see §2.
  iso_events: IsoEvent[];   // key = SERIALIZED_FIELD__ISO_EVENTS = "iso_events"
  global_options?: GlobalOptions; // key = "global_options"; present only in localStorage blob
}
```

Serialization key constants (`ophis_config.js:104-109`):

```js
SERIALIZED_FIELD__ISO_EVENTS            = "iso_events"
SERIALIZED_FIELD__APP_VERSION           = "app_version"
SERIALIZED_FIELD__GLOBAL_OPTIONS        = "global_options"
SERIALIZED_FIELD__UI_STATE              = "ui_state"            // DEAD: never read or written
SERIALIZED_FIELD__UI_STATE__CURRENT_ISO_EVENT = "current_iso_event" // DEAD
SERIALIZED_FIELD__LOCAL_STORAGE_SAVE_BLOB = "save_blob"         // localStorage key name
```

GOTCHA: `ui_state` / `current_iso_event` are defined but **never referenced** anywhere in
persistence — dead constants. Do not implement them.

**Loader tolerance for the root shape** (`validatePotentialIsoEventImportAssumingValidJsonSyntax`,
`ophis_model__validation.js:885-887`):

```js
var newIsoEventArray = Array.isArray(importDict) ? importDict : importDict[SERIALIZED_FIELD__ISO_EVENTS];
```

So the top-level JSON may itself be a **bare array of IsoEvents** (no wrapper object). In that
case `importDict.app_version` is `undefined` and the version defaults to the app version (§2).

### 1.2 IsoEvent

Full shape as produced by `createNewIsoEvent` (`ophis_controller.js:117-146`) plus the serialized
filter/chart fields injected by the loop over `ALL_SERIALIZED_FIELDS`. Annotated:

```ts
interface IsoEvent {
  // --- Identity / metadata ---
  name: string;              // required-ish; "" allowed. Default "Event 1"/"Event N".
  notes: string;             // free text; default "". Personal notes, do not affect results.

  // --- Input dates ---
  x_dates: XDate[];          // >= 2 enabled required to run. May be [] on disk in LOOSE mode.
  t_dates: XDate[];          // "target dates" filter; default []. Same shape as XDate.

  // --- Location (only meaningful when scope == HH_MM) ---
  lat: number;               // decimal degrees. Default DEFAULT_LAT = 32.8 (Dallas).
  long: number;              // decimal degrees. Default DEFAULT_LONG = -96.8.
  location_enabled: boolean; // forced true when scope==HH_MM, false otherwise. Default false.

  // --- Projection config ---
  scope: EventScope;         // "EVENT_SCOPE__DAYS" (default) | HH_MM | MONTHS | YEARS
  type: EventType;           // "EVENT_TYPE__PERSONAL" (default) | EVENT_TYPE__MARKETS. Feature never shipped.
  operations: Operation[];   // >= 1 required. Default = cloneDefaultOperationsForAppVersionGte10() (16 ops).
  scoring_system: ScoringSystem; // "SCORING_SYSTEM__GTE_V8" (default) | "SCORING_SYSTEM__LTE_V7"
  z_date_sort_type?: ZSortType;  // "SORT_TYPE__MSRF" | SORT_TYPE__DATE | SORT_TYPE__SCORE | SORT_TYPE__HIT_COUNT | SORT_TYPE__OPERATIONS
  day_scope_start_time_in_millis: number; // ms into the day the Z-value is added to. Default 0 (midnight).

  // --- Filter fields (from SERIALIZED_FILTER_FIELDS; booleans + a few *_value numbers) ---
  iso_event_filter_before_last_x_date: boolean;          // default true
  iso_event_filter_on_last_x_date: boolean;              // default true
  iso_event_filter_before_current_date: boolean;         // default true
  iso_event_filter_on_current_date: boolean;             // default false
  iso_event_filter_beyond_max_days: boolean;             // default true
  iso_event_filter_beyond_max_days_value: number;        // default HIGHEST_MSRF_NUMBER = 2559
  iso_event_filter_min_hit_count: boolean;               // default false
  iso_event_filter_min_hit_count_value: number;          // default 2
  iso_event_filter_min_score: boolean;                   // default false
  iso_event_filter_min_score_value: number;              // default 1
  iso_event_filter_msrf_match: boolean;                  // default false

  // --- Chart option fields (from SERIALIZED_CHART_OPTION_FIELDS; all booleans) ---
  chart_option__show_chart: boolean;                     // default true
  chart_option__show_dates: boolean;                     // default true
  chart_option__show_new_moons: boolean;                 // default false
  chart_option__show_first_quarter_moons: boolean;       // default false
  chart_option__show_full_moons: boolean;                // default false
  chart_option__show_third_quarter_moons: boolean;       // default false
  chart_option__show_waxing_crescent_moons: boolean;     // default false
  chart_option__show_waning_crescent_moons: boolean;     // default false
  chart_option__show_waxing_gibbous_moons: boolean;      // default false
  chart_option__show_waning_gibbous_moons: boolean;      // default false
  chart_option__full_solar_eclipses: boolean;            // default false
  chart_option__partial_solar_eclipses: boolean;         // default false
  chart_option__full_lunar_eclipses: boolean;            // default false
  chart_option__partial_lunar_eclipses: boolean;         // default false

  // --- Chart viewport (persisted convenience only; stripped on minify) ---
  chart_x_min: number;  // default 0
  chart_x_max: number;  // default 0
  chart_y_min: number;  // default 0
  chart_y_max: number;  // default 0

  // --- Runtime-only, MUST NOT be on disk (deleted before save) ---
  effective_operations?: Operation[];   // computed
  checked_for_swap_target?: any;        // UI transient
  checked_for_swap_source?: any;        // UI transient
}
```

The exact serialization keys for the filter/chart booleans are generated at runtime by
`newSerializedFieldObject` (`ophis_utils.js:124-146`):

```js
serializationKey       = varName.replace("SERIALIZED_FIELD__", "").toLowerCase()
serializationKeyForValue = serializationKey + "_value"
```

So `"SERIALIZED_FIELD__ISO_EVENT_FILTER_BEYOND_MAX_DAYS"` →
key `"iso_event_filter_beyond_max_days"` and value key `"iso_event_filter_beyond_max_days_value"`.
The complete field table is defined in `SERIALIZED_FILTER_FIELDS` (`ophis_config.js:122-174`) and
`SERIALIZED_CHART_OPTION_FIELDS` (`ophis_config.js:200-266`); `ALL_SERIALIZED_FIELDS` is their
concatenation (`:268`).

Only these filter fields have a `numericDefault` (and therefore a companion `_value` key):

| serializationKey | numericDefault | enabledByDefault |
|---|---|---|
| `iso_event_filter_beyond_max_days` | `2559` (`HIGHEST_MSRF_NUMBER`) | `true` |
| `iso_event_filter_min_hit_count` | `2` | `false` |
| `iso_event_filter_min_score` | `1` | `false` |

All chart-option fields are booleans with **no** numeric companion.

### 1.3 XDate (and TDate — identical shape)

Produced by `newXDate` (`ophis_view__strings.js:150-156`):

```ts
interface XDate {
  date: string;     // calendar date, format "MM/DD/YYYY" (see §3). e.g. "07/04/2026"
  time: string;     // "HH:mm" 24-hour, e.g. "00:00". Also accepts "0:00" (see §3/§7).
  enabled: boolean; // default true
}
```

- For `EVENT_SCOPE__DAYS` (the common case) `time` is present in the samples but is ignored
  at compute time — `xDateToNativeDate` substitutes `TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE = "00:00"`
  for any non-HH:MM scope (`ophis_utils.js:737-746`).
- On minified save (§5.4) `time` is stripped for DAYS scope and `enabled` is stripped when true.

### 1.4 Operation

Produced by `newOperation` (`ophis_utils.js:1006-1012`):

```ts
interface Operation {
  equation: string;  // e.g. "X2+YxOPH_PHI". MUST start with "X1+" or "X2+". See §6 for grammar.
  weight: number;    // 1 = "Alpha" (>= POINTS__ALPHA_OPERATION_MATCH=1), 0.5 = "Beta". Any number allowed on load.
  enabled: boolean;  // whether this op runs. GOTCHA: newOperation() always writes true (see §8).
  // runtime-only, never serialized:
  cached_operation_function?: Function; // compiled Y->Z function
}
```

GOTCHA — `newOperation` bug (`ophis_utils.js:1006-1012`): the third parameter `enabled` is
accepted but the returned object hardcodes `enabled: true`. So the LTE_V7 default table's
`OPERATION_ENABLED_FALSE` for the Hepta op is silently ignored — it comes out enabled. A
reimplementation that honours the parameter would diverge from the original's default set.

### 1.5 GlobalOptions (localStorage-only; NOT in on-disk `.oph`)

Written under `global_options` only in the `SAVE_BLOB_MODE__EVERYTHING` /
`SAVE_BLOB_MODE__JUST_THE_GLOBAL_OPTIONS` blobs, i.e. only to `localStorage`. Shape is the live
`appState.globalOptions` object serialized verbatim (`ophis_model__persistence.js:128`).

```ts
interface GlobalOptions {
  // string enums
  start_screen: string;         // GLOBAL_OPTION__START_SCREEN; e.g. "OPHIS_SCREEN__Z_DATES"
  skin_mode: string;            // GLOBAL_OPTION__SKIN_MODE; default "SKIN_MODE__CLASSIC"
  current_file_path: string;    // GLOBAL_OPTION__CURRENT_FILE_PATH; "" if none (electron only)

  // numbers
  local_time_offset_in_millis: number;  // default 0
  current_iso_event_index: number;      // which event is selected

  // booleans (GLOBAL_BOOLEAN_OPTIONS)
  blur_about_screen: boolean;                 // default false
  hide_operations_col_completely: boolean;    // default false
  prettify_x_date_export_output: boolean;     // default false
  minify_x_date_export_output: boolean;       // default false
  auto_recalculate_z_dates: boolean;          // default TRUE (see ophis_main.js:42-46)
  prettify_oph_files: boolean;                // default TRUE
  minify_oph_files: boolean;                  // default false
  hide_date_col: boolean;                     // default false
  hide_hits_col: boolean;                     // default false
  hide_score_col: boolean;                    // default false
  hide_msrf_col: boolean;                     // default false
  hide_operations_col: boolean;               // default false
}
```

Only two boolean options default to `true`: `auto_recalculate_z_dates` and `prettify_oph_files`
(`ophis_main.js:39-47`).

The exact option key strings (`ophis_config.js:29-45`): `start_screen`, `skin_mode`,
`current_file_path`, `local_time_offset_in_millis`, `auto_recalculate_z_dates`,
`blur_about_screen`, `hide_date_col`, `hide_hits_col`, `hide_score_col`, `hide_msrf_col`,
`hide_operations_col`, `hide_operations_col_completely`, `prettify_x_date_export_output`,
`minify_x_date_export_output`, `prettify_oph_files`, `minify_oph_files`.

---

## 2. VERSION HANDLING & MIGRATION

### 2.1 How `app_version` is written

`APP_VERSION` starts as `"12.0"` (`ophis_config.js:3`), then is normalized at boot by
`init_step1_getAppVersion` (`ophis_main.js:53-119`), which fetches `package.json` (version
`"12.0.0"`) and rewrites `APP_VERSION`:

- Take major (`getComponentOfSemVer(v,0)`) and minor (`index 1`) components split on `"."`.
- If minor is present and `!= "0"` → `APP_VERSION = "<major>.<minor>"`.
- Else → `APP_VERSION = "<major>"`.
- If the version string contains `"rc"`, append the rc suffix with dots removed.

For the shipped `12.0.0`: minor is `"0"`, so `APP_VERSION` becomes the string **`"12"`**. That is
exactly what `getSaveBlob` writes to `app_version` — hence the samples show `"app_version": "12"`.

`getSaveBlob` (`ophis_model__persistence.js:119-139`):

```js
saveObject[SERIALIZED_FIELD__APP_VERSION] = APP_VERSION;   // "12"
```

### 2.2 How `app_version` is read

Only in `validatePotentialIsoEventImportAssumingValidJsonSyntax`
(`ophis_model__validation.js:889-900`):

```js
var appVersionForImportString = importDict.app_version;
var appVersionForImportAsInt = -1;
if ( appVersionForImportString ) {
    appVersionForImportAsInt = parseInt(appVersionForImportString);   // "12"->12, "9"->9, "12.0"->12
    if ( appVersionForImportAsInt <= 0 ) {
        appVersionForImportAsInt = parseInt(APP_VERSION);
    }
} else {
    appVersionForImportAsInt = parseInt(APP_VERSION);                 // missing -> current app version
}
```

`parseInt("12.0")` = `12`, `parseInt("9")` = `9`. The **only** consumer** of the parsed int is
`parseScoringSystemForLoadedIsoEvent` (`:647-674`):

- If `scoring_system` is missing or unrecognized: set to `SCORING_SYSTEM__GTE_V8` **regardless of
  version**. The `appVersionForImportAsInt >= 8` branch and the `< 8` branch both resolve to
  `GTE_V8` — the LTE_V7 branch is commented out. So version does **not** actually change scoring
  today; the int is effectively vestigial. Document as: *`app_version` currently influences
  nothing except a dead code path; both branches default to GTE_V8.*

GOTCHA: There is **no schema migration** — the loader never rewrites events based on version. It
only fills defaults. The version number is essentially informational.

### 2.3 Default operation sets and the v7 / v8 / v10 deltas

Defined in `ophis_model__params.js`. Three factory functions produce default operation arrays.
Base table `DEFAULT_OPHIS_OPERATIONS_LTE_V7` (`:65-110`) is 15 operations:

| # | equation | weight (LTE_V7) | enabled arg |
|---|---|---|---|
| 1 | `X2+oph_round(Y)` | 1 (Alpha) | true |
| 2 | `X2+oph_flip(oph_round(Y))` | 1 | true |
| 3 | `X2+Y/OPH_CRV` | 0.5 (Beta) | true |
| 4 | `X1+(Y/2.0)xOPH_PI` | 0.5 | true |
| 5 | `X2+Y/OPH_PHI` | 1 | true |
| 6 | `X2+(Y/2.0)xOPH_PHI` (`OPERATION_EQUATION_FOR_ORIGINAL_BETA_PHI_6`) | 0.5 | true |
| 7 | `X1+(Y/2.0)xOPH_CRV` | 0.5 | true |
| 8 | `X2+(Y/2.0)xOPH_PI` | 0.5 | true |
| 9 | `X2+YxOPH_PHI` | 1 | true |
| 10 | `X1+YxOPH_PI` (`OPERATION_EQUATION_FOR_RADIUS_PROJECTION`) | 0.5 | true |
| 11 | `X2+(Y/2.0)xOPH_CRV` | 0.5 | true |
| 12 | `X2+YxOPH_PI` | 0.5 | true |
| 13 | `X1+YxOPH_CRV` | 0.5 | true |
| 14 | `X2+YxOPH_CRV` | 0.5 | true |
| 15 | `X1+YxOPH_HEP` | 1 | **false** (arg ignored by bug → true) |

`POINTS__ALPHA_OPERATION_MATCH = 1`, `POINTS__BETA_OPERATION_MATCH = 0.5`
(`ophis_model__params.js:2-3`).

**`cloneDefaultOperationsForAppVersionLte7()`** (`:115-117`): `deepClone` of the base table (15 ops).
Because of the `newOperation` bug, op 15 is enabled anyway (see §8).

**`cloneDefaultOperationsForAppVersionGte8()`** (`:119-135`): deep-clone base, then for every op:
- `enabled = true` (force-enable all);
- if `equation == "X1+YxOPH_PI"` (radius projection) → `weight = 1` (Alpha, was 0.5);
- if `equation == "X2+(Y/2.0)xOPH_PHI"` (original beta phi 6) → `weight = 1` (Alpha, was 0.5).

So **v8 delta vs v7**: two operations promoted Beta→Alpha (#6 and #10), and all ops explicitly
enabled. Still 15 ops.

**`cloneDefaultOperationsForAppVersionGte10()`** (`:137-142`): start from the Gte8 set, then
`push` a deep clone of `OPH_HEP_OPERATION_FOR_X2`:

```js
OPH_HEP_OPERATION_FOR_X2 = newOperation("X2+YxOPH_HEP", POINTS__ALPHA_OPERATION_MATCH, OPERATION_ENABLED_TRUE)
```

So **v10 delta vs v8**: append a 16th operation `X2+YxOPH_HEP` (weight 1, enabled true). This is the
current default (16 ops) used by `createNewIsoEvent`, by the loader when operations are
missing/invalid, and as the minify comparison baseline.

Summary of default-set evolution:

```
v<=7 : 15 ops, #6 & #10 are Beta (0.5), #15 (X1+YxOPH_HEP) nominally disabled
v>=8 : 15 ops, #6 & #10 promoted to Alpha (1.0), all enabled
v>=10: 16 ops, adds X2+YxOPH_HEP (Alpha, enabled)
```

GOTCHA: Despite the names, the loader **always** clones the **Gte10** set when it needs a default
operations array (`parseOperationsForLoadedIsoEvent`, `ophis_model__validation.js:638,642`). The
Lte7 clone is only reachable via a commented-out line. Version-appropriate defaulting is therefore
**not** actually performed on load — everything defaults to the 16-op v10 set.

`OPH_HEP = 7.01`; other constants used inside equations: `OPH_PI = 3.14`, `OPH_PHI = 1.618`,
`OPH_CRV = 5.08` (`ophis_config.js:410-413`; see the operations spec for full derivation).

---

## 3. DATE / TIME STRING FORMATS ON DISK

### 3.1 Formats

Constants (`ophis_config.js:270-283`):

```js
DATE_DELIMITER = "/"
STANDARD_DATE_DELIMITER = "-"
X_DATE_CAL_DISPLAY_FORMAT = "m/d/Y"    // MM/DD/YYYY  (month-first, US)
X_DATE_TIME_DISPLAY_FORMAT = "H:i"     // hours:minutes, 24h
X_DATE_MOMENT_PARSING_FORMAT = "YYYY-MM-DD HH:mm"   // internal "standard" form for moment
TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE = "00:00"
HOURS_IN_DAY_TO_USE_WITHOUT_HH_MM_SCOPE = 0
```

On disk the `XDate.date` is **`MM/DD/YYYY`** with `/` delimiters and **zero-padded** month/day and a
4-digit year (e.g. `07/04/2026`). `XDate.time` is **`HH:mm`** 24-hour. The samples show `"00:00"`
(padded) in v12 files and `"0:00"` (unpadded hour) in the older v9 file — both parse; see §7.

### 3.2 Formatting code (model → string)

`nativeDateToXDate` → `nativeDateToReadableString_dateOnly` / `_timeOnly`
(`ophis_view__strings.js:162-217`):

- Date: `dateComponentsToReadableString(year, month, day)` =
  `padWithLeadingZeroIfLessThan10(month) + "/" + padWithLeadingZeroIfLessThan10(day) + "/" + year`
  (`:231-233`). So month & day are 2-digit, year is raw (4-digit expected).
- Time: `padWithLeadingZeroIfLessThan10(hours) + ":" + padWithLeadingZeroIfLessThan10(minutes)`
  (`:195-217`). Both padded → `"HH:mm"`.
- `padWithLeadingZeroIfLessThan10(v)` = `v < 10 ? "0"+v : v` (`:252-254`).

The "standard" internal form (used to hand a date to moment) is `YYYY-MM-DD HH:mm`
(`dateAndTimeComponentsToStandardString`, `:227-246`).

### 3.3 Parsing code (string → native Date)

Validation-time parsing, `xDateToNativeDate` (`ophis_utils.js:729-802`):

1. Pick `dateToUse`/`timeToUse` per scope; for non-HH:MM, `timeToUse = "00:00"`.
2. `validateXDateCalendarDate(dateToUse)` (`ophis_model__validation.js:1106-1169`):
   - split on `"/"`, must have exactly 3 parts;
   - each part must be a non-negative integer string (`isNonNegIntOrStringThereof`);
   - index 0 = month, 1 = day, 2 = year (**month-first**);
   - month & day must parse `> 0`; year must be `>= 0`; if year `> MAX_CALENDAR_YEAR (9999)` it is
     clamped to `"9999"`;
   - year string length `<= 4`, month `<= 2`, day `<= 2`;
   - returns `{year, month, day, year_orig, month_orig, day_orig}` or `null` with an error pushed.
3. `validateXDateTime(timeToUse)` (`:1171-1197`):
   - split on `":"`, must have exactly 2 parts, both non-negative integer strings;
   - hours `0..23`, minutes `0..59`;
   - returns `{hours, minutes}` or `null`.
4. Build standard string `YYYY-MM-DD HH:mm`, then `convertStandardLocalDateStringToNativeUtcDate`
   (`ophis_dependencies.js:253-269`):
   - If lat/long valid or a timezone given → `moment.tz(standardString, timezone).utc().toDate()`.
   - Else → `moment(standardString, "YYYY-MM-DD HH:mm").toDate()` (parses in the machine's local tz).
5. For `EVENT_SCOPE__DAYS` with `FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT = true` (the default,
   `ophis_config.js:297`), lat/long are forced to `0,0` and timezone left null so the day is
   anchored to GMT (`ophis_utils.js:766-782`). This is why a Days-scope `.oph` is timezone-stable.

GOTCHA: `flatPickrStringToXDate` (`ophis_dependencies.js:291-323`) is the UI path that turns picker
strings into XDates; for HH:MM it splits on `" "` into `[date, time]`. Not part of file parsing but
shares the format.

---

## 4. LOAD PATH — parse → validate → populate

### 4.1 Entry points

| Trigger | Function | Notes |
|---|---|---|
| Electron opens an `.oph` file | `onOphFileOpened(filePath, fileContents, checkForUnsavedChanges=false)` (`persistence.js:189-220`) | fileContents already read by main process |
| Restore previous browser session | `loadSavedBlobFromProgrammaticAction(saveBlob)` (`persistence.js:359-378`) | reads localStorage blob |
| Paste-to-import in the UI | `importIsoEventsFromUserInteraction(importBlob)` (`persistence.js:301-316`) | textarea value |
| Boot | `init_step6_appState` (`ophis_main.js:384-458`) | chooses file vs localStorage |

All funnel into `validatePotentialDiskLoadOrImport(jsonString, globalOptionsOnly=false)`
(`ophis_model__validation.js:1000-1039`).

### 4.2 `validatePotentialDiskLoadOrImport` — the gauntlet

Returns `{ result: IsoEvent[] | null, errors: string[], global_options: GlobalOptions | undefined }`.

Steps:

1. If `jsonString` is falsy → push `"Saved JSON blob was a falsey string."`, return with null result.
2. `JSON.parse(jsonString)` inside try/catch. On throw → push `"Could not parse JSON due to error: <e>"`.
3. If `globalOptionsOnly === false` → `newIsoEventArray = validatePotentialIsoEventImportAssumingValidJsonSyntax(importDict, importErrors)`.
4. `globalOptions = importDict[SERIALIZED_FIELD__GLOBAL_OPTIONS]` — extracted **without validation**
   (may be null/undefined/garbage; consumers guard).
5. Consistency cross-check (`:1026-1032`):
   - `errors.length == 0 && result == null` → push `"Blob import made it past the gauntlet with zero errors, yet a null event array."`
   - `errors.length > 0 && result != null` → push `"Blob import had one or more errors and also a non-null event array."` **and force `result = null`.**

**Failure semantics:** any non-empty `errors` array means the whole load is rejected (result null).
Callers show the errors (`onOphFileOpenError`, toast, or inline error rows). There is no partial load.

### 4.3 `validatePotentialIsoEventImportAssumingValidJsonSyntax` (`:885-998`)

1. `newIsoEventArray = Array.isArray(importDict) ? importDict : importDict.iso_events` (§1.1).
2. Compute `appVersionForImportAsInt` (§2.2).
3. If `newIsoEventArray` is a non-empty array, for each event `ithEventToLoad` run **in order**:
   1. `ensureValidEventName` — if falsy, set `name = ""` (`:749-756`).
   2. `ensureValidEventNotes` — if falsy, set `notes = ""` (`:758-765`).
   3. `ensureValidEventDayScopeStartTime` (`:767-781`):
      - if truthy and `isNonNegIntOrStringThereof`: clamp `>= MILLIS_PER_DAY` to `MILLIS_PER_DAY - MILLIS_PER_MINUTE` (86400000-60000 = 86340000);
      - if truthy but not a valid non-neg int → `0`;
      - if falsy → `0` (`DEFAULT_DAY_SCOPE_START_TIME_MILLIS`).
   4. `ensureValidEventScope(ithEventToLoad, importErrors_out)` (`:802-819`):
      - present & in `EVENT_SCOPES` → keep;
      - present & unknown → STRICT pushes error; else warn + coerce to `EVENT_SCOPE__DAYS`;
      - absent → `EVENT_SCOPE__DAYS` (`DEFAULT_EVENT_SCOPE`).
   5. `ensureValidEventType` (`:783-799`): same pattern, coerce/default to `EVENT_TYPE__PERSONAL`.
      Valid set is `EVENT_TYPES = [PERSONAL, MARKETS]` (ASTROLOGICAL commented out).
   6. `parseSerializedFieldsForLoadedIsoEvent` (`:603-618`): for each of `ALL_SERIALIZED_FIELDS`:
      - if the boolean key is exactly `true`/`false`, keep; else set to `enabledByDefault`;
      - if the field has a truthy `numericDefault`, read `parseFloatElseNeg1(value)`; keep it if `>= 0`,
        else set to `numericDefault`.
      GOTCHA: the numeric-default branch is guarded by `if (jthField.numericDefault)` — a
      `numericDefault` of `0` would be skipped, but none of the three numeric fields default to 0, so
      no live bug.
   7. `parseOperationsForLoadedIsoEvent(ithEventToLoad, importErrors_out)` (`:620-645`):
      - `operations` present & array & `length >= MINIMUM_OPERATIONS_REQUIRED (1)` → accept **as-is,
        no content validation** ("be pretty permissive");
      - present & array but `length < 1` → STRICT error, else warn (keeps the short array);
      - present but not an array → STRICT error, else warn + replace with Gte10 defaults;
      - absent → set to `cloneDefaultOperationsForAppVersionGte10()`.
      SECURITY GOTCHA: this is where an untrusted `operations[].equation` string is accepted verbatim,
      then later handed to `new Function(...)` by the operations subsystem (§8).
   8. `parseScoringSystemForLoadedIsoEvent` — see §2.2; always defaults to GTE_V8.
   9. `parseLatLongForLoadedIsoEvent(ithEventToLoad, i, latLongErrors_out)` (`:692-747`):
      - For non-HH:MM scope, missing lat/long is treated as valid (no location needed).
      - Otherwise `isValidLatOrLong` with limits `LAT_LIMIT=65`, `LONG_LIMIT=180`
        (note: error text says "-90 and 90" but the code enforces ±65; a message/behaviour mismatch).
      - Valid → for non-HH:MM force `location_enabled=false`; for HH:MM force `location_enabled=true`;
        fill missing lat/long with `DEFAULT_LAT/DEFAULT_LONG`.
      - Invalid → ORIGINAL/STRICT push error and skip the event (`continue`); LOOSE warns + coerces to
        defaults and continues.
   10. X-Dates (`:927-946`):
      - if `x_dates` is an array with `>= MINIMUM_NUMBER_OF_X_DATES (2)`:
        `validateNewWouldBeLoadDates` — validate each; if any error **and** LOOSE →
        `smoothOutXDatesForLoadedEvent` (drop the bad dates in place); else push the errors.
      - else (fewer than 2 / not array): ORIGINAL/STRICT push `"<i>th event must have two or more
        x_dates defined."`; LOOSE coerces `x_dates` to `[]` then `smoothOutXDatesForLoadedEvent`
        (which, with `FEATURE_FLAG__AUTO_FILL_X_DATES_DURING_FILE_LOAD=false`, just leaves it as-is).
   11. T-Dates (`:948-960`): if `t_dates` is an array, validate; LOOSE drops bad ones
       (`smoothOutTDatesForLoadedEvent`), else push errors. If `t_dates` missing/not-array → `[]`.
4. If `newIsoEventArray` is an empty array / not an array / missing:
   - ORIGINAL/STRICT push a specific error;
   - LOOSE sets `createNewIsoEventArray = true` and, at the end, builds a single fresh event via
     `createNewIsoEvent("Event 1", EVENT_SCOPE__DAYS, 0, 0, false)` (`:988-995`).

`validateNewWouldBeLoadDate` (`:277-314`) additionally **mutates** each XDate: if `enabled` is not
strictly boolean it's set to `true`; in LOOSE HH:MM mode a missing `time` is set to `"00:00"`. It then
proves the date is parseable via `xDateToNativeDate` and reconciles error/return consistency.

### 4.4 Validation modes

`FILE_INPUT_VALIDATION_MODE__{STRICT|ORIGINAL|LOOSE}` (`ophis_config.js:336-344`). Selected by
`getInputValidationModeFromQueryParams` (`ophis_view__export.js:146-172`):

- URL/CLI param `input_validation_mode` = loose/original/strict picks it explicitly (unknown → STRICT
  with a warning);
- no param + headless → **STRICT**;
- no param + GUI → **LOOSE** (`appState.fileInputValidationMode` default is also LOOSE,
  `ophis_main.js:29`).

Predicates: `isFileInputValidationStrict`, `isFileInputValidationOriginalOrStrict`,
`isFileInputValidationLoose` (`:676-686`).

SECURITY GOTCHA: LOOSE (the GUI default) **auto-repairs** hostile files instead of rejecting them,
maximizing the chance a crafted event is loaded and its operation string reaches `new Function`.

### 4.5 Populating the model after a successful load

`swapInNewIsoEventArray(newIsoEvents, successMessage)` (`ophis_controller.js:74-93`):

```js
appState.isoEvents = newIsoEvents;
if ( current_iso_event_index > isoEvents.length-1 ) current_iso_event_index = 0;
if (!headless) { refreshIsoEvents(HARD, FORCE); markChangesSaved(); flushChangesToDisk(false); if(successMessage) showToast(...); }
appState.loadedFromDisk = true;
```

`loadSavedGlobalOptions(globalOptions)` (`persistence.js:324-357`) applies the localStorage
`global_options`: it type-checks each option before copying (`loadGlobalOption` only copies when
`typeof matches expectedType`, `:318-322`). Booleans via `GLOBAL_BOOLEAN_OPTIONS`; then
`start_screen`/`skin_mode`/`current_file_path` as strings, `local_time_offset_in_millis` and
`current_iso_event_index` as numbers. GOTCHA: the current-screen `<select>` is then forced to
`DEFAULT_STARTING_SCREEN` (= `OPHIS_SCREEN__Z_DATES`) regardless of the saved `start_screen`
(`:339,343`) — the persisted start screen is loaded into state but not actually applied to the UI.

---

## 5. SAVE PATH — model → serialize → write

### 5.1 `getSaveBlob(saveBlobMode, prettify=false, minify=false)` (`persistence.js:119-139`)

```js
var saveObject = {};
saveObject["app_version"] = APP_VERSION;                       // always first
if (mode == EVERYTHING || mode == JUST_THE_EVENTS)
    saveObject["iso_events"] = sanitizeIsoEventsForSaveOperation(appState.isoEvents, minify);
if (mode == EVERYTHING || mode == JUST_THE_GLOBAL_OPTIONS)
    saveObject["global_options"] = appState.globalOptions;    // raw, no sanitization
var saveBlob = JSON.stringify(saveObject, /*replacer*/null, /*spaces*/ prettify ? 2 : null);
saveBlob = saveBlob.replaceAll(",", ", ");                    // <-- post-processing, see 5.3
return saveBlob;
```

Modes (`ophis_config.js:64-66`):
- `SAVE_BLOB_MODE__JUST_THE_EVENTS` — `{app_version, iso_events}`. Used for **on-disk `.oph`** (Save/Save As, Electron autosave, UI export).
- `SAVE_BLOB_MODE__JUST_THE_GLOBAL_OPTIONS` — `{app_version, global_options}`. localStorage-only.
- `SAVE_BLOB_MODE__EVERYTHING` — `{app_version, iso_events, global_options}`. localStorage-only.

### 5.2 Key ordering

Insertion order (JSON preserves it): `app_version`, then `iso_events`, then `global_options`.
Within each IsoEvent the key order is whatever the live object has — for a freshly created event
that is the `createNewIsoEvent` order (name, notes, x_dates, t_dates, lat, long, location_enabled,
scope, type, operations, scoring_system, then all `ALL_SERIALIZED_FIELDS` in
filter-then-chart order, each boolean immediately followed by its `_value` if numeric). The samples
confirm this order and also show trailing `chart_x_min/max`, `chart_y_min/max`, `z_date_sort_type`,
`day_scope_start_time_in_millis` (these get added to the object over the session lifecycle).

### 5.3 Formatting / whitespace GOTCHA

After `JSON.stringify`, `saveBlob.replaceAll(",", ", ")` inserts a space after **every** comma,
including commas inside string values. The commented-out sibling line
`saveBlob.replaceAll(":", ": ")` is disabled. Consequences:

- In **prettified** output (`spaces=2`), array/object commas are already followed by newlines, so
  this produces `",\n  "` → `", \n  "`, i.e. a **trailing space after commas at end of line**. This
  is exactly what the three sample files show (every line ending in `, `).
- Any comma that appears literally inside a string field (e.g. `notes: "a, b"`) becomes `"a,  b"` on
  reload? No — it becomes `"a, b"` on save (one space added). But if the value already had `", "`, it
  becomes `",  "` (two spaces). This is **lossy for string fields containing commas**: repeated
  save/load cycles accrete spaces after commas inside `name`/`notes`. Flag this as a real data-fidelity
  bug for the rewrite; prefer not to mangle string contents.
- The output is still valid JSON (extra whitespace is insignificant outside strings; inside strings it
  only alters string content).

### 5.4 `sanitizeIsoEventsForSaveOperation(isoEvents, minify=false)` (`validation.js:461-601`)

Always (even non-minify):

1. `deepClone` the events (JSON round-trip) so the live model is untouched.
2. For each event delete runtime-only keys: `effective_operations`, `checked_for_swap_target`,
   `checked_for_swap_source`.
3. `ensureValidEventName`, `ensureValidEventNotes`, `ensureValidEventDayScopeStartTime`,
   `ensureValidEventScope` (coerce/fill as in §4.3).
4. Validate lat/long; replace invalid with `DEFAULT_LAT`/`DEFAULT_LONG`.

When `minify === true` (compute `defaultOperations = cloneDefaultOperationsForAppVersionGte10()`):

5. `minifyXDateOrTDateArray` for `x_dates` and `t_dates` (`:437-459`): for DAYS scope keep only
   `["date"]` (+ `"enabled"` if it's `false`); for HH:MM keep `["date","time"]` (+ `"enabled"` if
   false). i.e. drop `time` for day-scope, drop `enabled` when true.
6. For each `ALL_SERIALIZED_FIELDS`: delete the boolean key when it equals `enabledByDefault`; delete
   the `_value` key when it equals `numericDefault` (compared via `parseFloatElseNeg1`).
7. Delete `chart_x_min/max`, `chart_y_min/max` unconditionally.
8. Delete `x_dates` if empty; delete `day_scope_start_time_in_millis` if default (0); delete `t_dates`
   if empty.
9. Delete `name` if falsy; delete `notes` if falsy.
10. **BUG** (`:543-545`): `if (day_scope_start_time_in_millis == DEFAULT) delete ithEventToSave.notes;`
    — this deletes **notes** (again) keyed on the day-scope-start-time being default. Almost certainly
    meant to be a no-op or to delete a different field. Net effect: notes are dropped whenever start
    time is default even if notes were non-empty (they were already conditionally deleted in step 9,
    so the practical damage is limited to re-deleting). **Do not replicate; note it.**
11. Delete `type` unconditionally (feature never shipped).
12. For DAYS scope delete `location_enabled`, `lat`, `long`.
13. If scope == `DEFAULT_EVENT_SCOPE` (DAYS) delete `scope`.
14. If `scoring_system == DEFAULT_SCORING_SYSTEM` (GTE_V8) delete `scoring_system`.
15. Operations: if the event's operations array is element-for-element identical to the 16-op Gte10
    default (same `equation`, `weight`, `enabled` for each, same length), delete `operations` entirely
    (`:564-592`).

GOTCHA: minify's "identical to default" test is strict positional equality against the **Gte10**
default. A user who merely reorders operations, or whose file predates the 16-op set, keeps the full
array. On reload, a minified event with `operations` absent gets the Gte10 default injected — so a
minified round-trip of a default event silently upgrades it to v10 defaults.

### 5.5 Write sinks

- **Electron "Save As"** — `electronBridgeIncoming_onSaveAsClickedFromFileMenu` (`persistence.js:51-61`):
  builds a `JUST_THE_EVENTS` blob honouring `prettify_oph_files`/`minify_oph_files`, calls
  `window.electronBridge.saveFileAs(saveBlob)`. On success `onSaveAsSuccess(filePath)` sets
  `current_file_path` and marks saved.
- **Electron "Save"** — `electronBridgeIncoming_onSaveClickedFromFileMenu` (`:40-49`): if a
  `current_file_path` exists → `flushChangesToDisk(forceFlush=true)`; else falls back to Save As.
- **Electron autosave** — inside `flushChangesToDisk` (`:263-268`): when
  `FEATURE_FLAG__AUTOSAVE_UNDER_ELECTRON` (default **false**) or force, and a `current_file_path` is
  set, calls `window.electronBridge.autoSaveToFile(path, saveBlobWithoutOptions)`.
  SECURITY GOTCHA: per SECURITY.md, `autoSaveToFile(path, contents)` in the main process does
  `fs.mkdirSync(recursive)` + `fs.writeFile` with **no path validation** → arbitrary-path write.
- **Browser UI export** — `renderExportXDates` builds a `JUST_THE_EVENTS` blob and
  `writeStringToFile(saveBlob, "Export.oph")` (`ophis_view.js:435`). `writeStringToFile`
  (`ophis_view__export.js:280-291`) makes a `Blob` (`type:'text/csv;charset=utf-8;'` — note: mislabeled
  MIME for an `.oph`), object URL, hidden `<a download>` click. Encoding is UTF-8.
- **Error paths**: `onSaveToFileError(message)` toasts + logs (`persistence.js:63-66`).

### 5.6 Encoding & extension

UTF-8 text. Extension `.oph`, registered via `package.json` `fileAssociations`
(ext `oph`, name `"Ophis File"`, role `Editor`). No BOM, no binary framing — plain JSON text.

---

## 6. OPERATION EQUATION STRING GRAMMAR (as relevant to load validation)

`operations[].equation` is a string; the file loader does **not** validate its content (§4.3.7).
Content validation happens later in `validateOperationString`
(`ophis_model__validation.js:131-191`) when operations are compiled:

- Normalize (`normalizeOperationEquationString`, `:30-63`): strip spaces; temporarily uppercase all
  `oph_*` function names; replace `x`→`*`; replace each `OPH_PI/OPH_PHI/OPH_CRV/OPH_HEP` token with its
  numeric value via `window[constName]`; restore function names to lowercase.
- Must start with `X1+` or `X2+` (`getStartingX`), else error `"Must start with 'X1 + …' or 'X2 + …'"`.
- A stripped skeleton (prefix removed, `oph_*` names deleted, `Y`→`SAMPLE_Y_VALUE_FOR_VALIDATION=10`)
  is checked with math.js `math.parse`/`math.evaluate` for a positive numeric result.
- Separately, the **un-stripped** body (prefix removed only) is compiled:
  `new Function("Y", "return " + body + ";")` (`:158`), then called with `Y=10`; result must be
  a positive number.

SECURITY GOTCHA (matches SECURITY.md finding #1): the math.js validation inspects a *different*
(stripped) string than what `new Function` compiles — validator ≠ executor. A body such as
`X2+oph_round(Y)+(SIDE_EFFECT())` can pass the stripped arithmetic check while the compiled function
runs arbitrary JS. Load never blocks it (LOOSE default). Reimplementation MUST replace `new Function`
with a real sandboxed expression parser and validate the *executed* string.

`ALL_OPH_CONSTANTS = ["OPH_PI","OPH_PHI","OPH_CRV","OPH_HEP"]` (`ophis_config.js:415-420`).
`ALL_OPH_FUNCTIONS = [oph_sqrt, oph_abs, oph_floor, oph_ceil, oph_log, oph_sin, oph_cos, oph_tan,
oph_round, oph_flip, oph_exp]` (`ophis_utils.js:1075+`). `oph_flip` reverses the decimal digits of a
number (`ophis_utils.js:1055-1073`).

---

## 7. THE THREE SAMPLE FILES — TABULATED DIFFERENCES

| Property | `test-bradley.oph` | `test-file-bradley-rogue-dates.oph` | `7-4-26-...-4-1-28.oph` |
|---|---|---|---|
| `app_version` | `"12"` | `"9"` | `"12"` |
| # of iso_events | 1 | **2** | 1 |
| event has `notes` field | yes (`""`) | **no** | yes (`""`) |
| event has `t_dates` field | yes (`[]`) | **no** | yes (`[]`) |
| # x_dates (event 1) | 5 | 7 | 6 |
| x_date `time` format | `"00:00"` (padded) | **`"0:00"`** (unpadded hour) | `"00:00"` |
| # operations | **16** (includes `X2+YxOPH_HEP`) | **15** (ends at `X1+YxOPH_HEP`) | 16 |
| `scoring_system` | GTE_V8 | GTE_V8 | GTE_V8 |
| all 11 filter fields present | yes | yes | yes |
| all 14 chart-option fields present | yes | yes (event 1); **event 2 omits** `chart_x/y_*` and `z_date_sort_type` | yes |
| `chart_x_min/max`, `chart_y_min/max` | yes (all 0) | event 1 yes; **event 2 omits all four** | yes (all 0) |
| `z_date_sort_type` | `"SORT_TYPE__MSRF"` | event 1 `"SORT_TYPE__MSRF"`; **event 2 omits** | **omitted** |
| `day_scope_start_time_in_millis` | `0` | **omitted** (both events) | `0` |
| `lat`/`long`/`location_enabled` | 0 / 0 / false | 0 / 0 / false | 0 / 0 / false |
| `scope` / `type` | DAYS / PERSONAL | DAYS / PERSONAL | DAYS / PERSONAL |

Key observations:

- The **v9 file** (`test-file-bradley-rogue-dates.oph`) predates the notes/t_dates/day-scope-start-time
  features and the 16th operation, and uses the unpadded `"0:00"` time. It is a good regression fixture
  for the loader's defaulting: on load it gains `notes:""`, `t_dates:[]`,
  `day_scope_start_time_in_millis:0`, keeps its 15 operations (not upgraded — only *missing*
  operations get the 16-op default), and `scoring_system` stays GTE_V8.
- Its **event 2** is a partially-serialized event: it stops after the chart-option booleans and omits
  `chart_x/y_*` and `z_date_sort_type`. The loader fills the missing serialized fields from
  `parseSerializedFieldsForLoadedIsoEvent`; `z_date_sort_type` is left undefined and consumers fall
  back to `DEFAULT_Z_DATE_SORT_TYPE` (`SORT_TYPE__DATE`) at read time.
- None of the samples contain a `global_options` block — confirming on-disk `.oph` files never carry
  global options (§1.5, §5.1). `global_options` lives only in the localStorage `save_blob`.
- All three are **prettified** (2-space indent) with the trailing-space-after-comma artifact (§5.3),
  consistent with the default `prettify_oph_files=true` and no minify.
- `"0:00"` parses fine because `validateXDateTime` splits on `":"` and `parseInt("0")=0` (§3.3) — the
  padded/unpadded distinction is a save-side formatting detail, not a load requirement.

---

## 8. GOTCHAS (things a naive reimplementation gets wrong)

1. **`newOperation` ignores its `enabled` argument** (`ophis_utils.js:1006-1012`) — always writes
   `enabled:true`. The nominal "disabled by default" Hepta op in the LTE_V7 table is therefore enabled.
   A faithful clone must replicate this or consciously fix it (and know it changes the default set).
2. **`replaceAll(",", ", ")` on the serialized blob** (§5.3) rewrites commas *inside string values*,
   accreting spaces in `name`/`notes` across save/load cycles. It also puts trailing spaces at line
   ends in prettified output. Valid JSON, but lossy for string data. Don't blindly copy.
3. **On-disk files never contain `global_options`.** Only the localStorage `save_blob` does. Putting
   `global_options` into an exported `.oph` would be non-standard (though the loader would tolerate and
   extract it).
4. **`global_options` is extracted without any validation** (`validation.js:1015`) — arbitrary
   attacker-controlled values flow into `appState.globalOptions` via `loadSavedGlobalOptions`, which
   *does* type-check each known key. Unknown keys are simply ignored (never copied). But
   `current_file_path` (a string) from a hostile localStorage blob could point the app at any path.
5. **Version does not drive migration.** `app_version` only feeds a dead scoring-default branch;
   missing operations always default to the **v10 16-op** set, not a version-appropriate set. Two
   `cloneDefaultOperationsForAppVersionLte7/Gte8` are essentially unreachable from the load path.
6. **Minify's operations comparison is strict positional equality vs the v10 default.** A minified
   default event loses its `operations` key; reloading re-injects the v10 default. So a v7/v8 event
   saved minified and reloaded is silently upgraded to v10 operations.
7. **LOOSE is the GUI default** (`ophis_main.js:29`; `getInputValidationModeFromQueryParams`), so bad
   files are auto-repaired, not rejected — the opposite of what headless STRICT does. Security posture
   depends on this mode.
8. **Operation strings reach `new Function()`** and the load validator does no content check on them
   (§4.3.7, §6). This is the core RCE chain (SECURITY.md #1). A rebuild MUST parse equations with a
   sandboxed evaluator and validate the actually-executed expression.
9. **Buggy `delete ithEventToSave.notes` keyed on day-scope-start-time** during minify
   (`validation.js:543-545`) — drops notes when start time is default. Almost certainly a copy-paste
   bug; do not replicate.
10. **Lat/long limits are ±65 / ±180** (`LAT_LIMIT=65`, `LONG_LIMIT=180`), but the error message says
    "-90 and 90". Enforcement follows the code, not the message.
11. **`current-screen` select is forced to `OPHIS_SCREEN__Z_DATES`** after load regardless of the
    persisted `start_screen` (`persistence.js:339,343`). Persisted start screen is effectively ignored
    for the initial UI even though it round-trips in state.
12. **`ensureValidEventDayScopeStartTime` clamps values `>= 86400000` to `86340000`** (one minute
    before end of day), and coerces non-integers to 0.
13. **A top-level bare JSON array is a valid `.oph`** (no wrapper object). Then `app_version` is
    absent and defaults to the current app version.
14. **`resetAllIsoEvents`** (`ophis_main.js:371-377`) clears events, adds one default event, and
    `localStorage.removeItem("save_blob")` — i.e. "new session" nukes the persisted blob.
15. **`deepClone` is `JSON.parse(JSON.stringify(obj))`** (`ophis_utils.js:815-817`) — drops functions
    (like `cached_operation_function`) and `undefined` fields. Sanitize-for-save relies on this to
    shed runtime function references.

---

## 9. PUBLIC INTERFACE (signatures other subsystems depend on)

```ts
// Serialize current model to a JSON string (post-processed with replaceAll(",", ", ")).
getSaveBlob(saveBlobMode: "SAVE_BLOB_MODE__JUST_THE_EVENTS"
                        | "SAVE_BLOB_MODE__JUST_THE_GLOBAL_OPTIONS"
                        | "SAVE_BLOB_MODE__EVERYTHING",
            prettify = false, minify = false): string

// Full parse+validate. Returns {result, errors, global_options}.
validatePotentialDiskLoadOrImport(jsonString: string, globalOptionsOnly = false):
    { result: IsoEvent[] | null, errors: string[], global_options: GlobalOptions | undefined }

// Deep-clone + strip runtime fields + (optional) minify. Pure w.r.t. live model.
sanitizeIsoEventsForSaveOperation(isoEvents: IsoEvent[], minify = false): IsoEvent[]

// Persist. In browser: writes localStorage "save_blob". In electron: optional autosave to file.
flushChangesToDisk(forceFlush = false, showSaveStatus = true): void

// Apply a validated event array to appState + refresh UI + mark saved.
swapInNewIsoEventArray(newIsoEvents: IsoEvent[], successMessage: string): void

// Apply localStorage global options (type-checked per key).
loadSavedGlobalOptions(globalOptions: GlobalOptions | undefined): void

// Load restore from localStorage blob; returns success boolean.
loadSavedBlobFromProgrammaticAction(saveBlob: string): boolean

// Electron file-open callback (fileContents already read by main process).
onOphFileOpened(filePath: string, fileContents: string, checkForUnsavedChanges = false): void

// Default operation factories (params).
cloneDefaultOperationsForAppVersionLte7(): Operation[]   // 15 ops (see §2.3)
cloneDefaultOperationsForAppVersionGte8(): Operation[]   // 15 ops, #6/#10 Alpha, all enabled
cloneDefaultOperationsForAppVersionGte10(): Operation[]  // 16 ops (adds X2+YxOPH_HEP) — the live default

// Default fresh event.
createNewIsoEvent(name: string, eventScope: EventScope, lat: number, long: number,
                  locationEnabled: boolean): IsoEvent

// localStorage key
const SERIALIZED_FIELD__LOCAL_STORAGE_SAVE_BLOB = "save_blob";
```

---

## 10. BROWSER-SIDE PERSISTENCE (localStorage)

- **Key:** `"save_blob"` (`SERIALIZED_FIELD__LOCAL_STORAGE_SAVE_BLOB`, `ophis_config.js:109`).
- **Value:** a `getSaveBlob(...)` string. In pure-browser mode this is
  `SAVE_BLOB_MODE__EVERYTHING` (`{app_version, iso_events, global_options}`,
  `persistence.js:277`). When Electron is running without autosave/force, only the options are
  written: `SAVE_BLOB_MODE__JUST_THE_GLOBAL_OPTIONS` (`:283-284`).
- **Written by** `flushChangesToDisk` (`persistence.js:235-288`). Decision tree:
  - `appState.hasUnsavedChanges = true` at entry.
  - `generateBlob`: force → true; else Electron → `FEATURE_FLAG__AUTOSAVE_UNDER_ELECTRON` (false)
    → false; else (browser) → true.
  - Browser: always `writeBlobToLocalStorage=true` → writes EVERYTHING blob, then
    `hasUnsavedChanges=false`.
  - Electron: writes localStorage only on force/autosave (EVERYTHING) and additionally calls
    `autoSaveToFile` when a `current_file_path` exists; otherwise writes just the options blob.
- **Read by** `init_step6_appState` (`ophis_main.js:388`) via `localStorage.getItem("save_blob")`.
  - Browser boot: if a blob exists, `loadSavedBlobFromProgrammaticAction(savedJsonBlob)` restores the
    session (events + options).
  - Electron boot: only the options are extracted (`validatePotentialDiskLoadOrImport(blob, /*globalOptionsOnly*/true)`);
    events come from a file path instead.
- **Cleared by** `resetAllIsoEvents` (`localStorage.removeItem("save_blob")`, `ophis_main.js:374`)
  and `factoryReset` (`localStorage.clear()`, `ophis_controller.js:17`).
- No `sessionStorage`, no `IndexedDB`, no cookies are used anywhere in the codebase.

---

## 11. QUICK REPRODUCTION CHECKLIST FOR A REWRITE

1. Parse JSON; accept `{app_version, iso_events}` or a bare `IsoEvent[]`.
2. For each event apply the defaulting pipeline (§4.3) in order; choose STRICT vs LOOSE behaviour.
3. Dates are `MM/DD/YYYY` + `HH:mm` (accept unpadded hour); Days-scope anchors to GMT.
4. Fill missing operations with the 16-op v10 default; **do not** execute equation strings with
   `eval`/`new Function` — use a sandboxed parser and validate the executed expression.
5. On save: emit `{app_version:"12", iso_events:[...]}`, key order app_version→iso_events; pretty =
   2-space; **drop** the `replaceAll(",", ", ")` mangling (it is a fidelity bug).
6. Keep `global_options` out of on-disk `.oph`; persist it (and events) to `localStorage["save_blob"]`
   for browser session restore.
7. Honour minify semantics only if you need byte-compatibility; otherwise prefer a lossless save.
