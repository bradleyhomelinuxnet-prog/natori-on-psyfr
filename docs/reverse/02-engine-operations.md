# Ophis v12 — Subsystem Spec: `engine-operations` (The Projection Pipeline)

**Primary source:** `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/src/ophis_model__operations.js` (601 lines, read in full)

**Directly-called collaborators read for this spec:**

| File | Why |
|---|---|
| `src/ophis_config.js` | every constant / enum used below |
| `src/ophis_model__params.js` | MSRF number sets, operation weights, default operation table |
| `src/ophis_model__sorting.js` | `filterZDates`, `sortZDates`, `sortMsrfMatches`, `sortOperationMatches` |
| `src/ophis_model__validation.js` | `normalizeOperationEquationString`, `validateOperationString`, `validateXDateSpread`, load-time defaulting |
| `src/ophis_utils.js` | `getMsrfMatch`, `axialRotationsBetweenNativeDates`, rounding, `oph_*` math functions, sunset helpers |
| `src/ophis_view__strings.js` | `newXDate`, `nativeDateToXDate`, `cloneNativeDate`, readable-string formatting |
| `src/ophis_dependencies.js` | `convertStandardLocalDateStringToNativeUtcDate`, `getTimezone`, sunset libraries |
| `src/ophis_controller.js` | `createNewIsoEvent` (the canonical iso_event shape) |
| `src/ophis_view__config.js` | `DEFAULT_LAT`, `DEFAULT_LONG`, `NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT` |
| `src/ophis_view__export.js` | `OPH_OUTPUT_ERROR_STATUS__*` |

Everything below is what the code *does*, not what it ought to do. Bugs, dead code and
self-contradictions are called out inline and re-listed in **GOTCHAS**.

---

## 0. One-paragraph mental model

An **iso_event** holds an ordered array of **X-Dates** (anchors). The engine forms **every unordered
pair** of *enabled* X-Dates `(X1 = earlier index, X2 = later index)`, computes a whole-ish day span
**Y** between them, and feeds Y into every enabled, compiling **operation** (a tiny arithmetic
expression string). Each operation yields a day offset **Z-value**, which is added to either X1 or X2
(whichever the equation names) to produce a **Z-Date**. Z-Dates that land on the same instant-key are
merged into one **z_struct**; each contributing operation is one "hit", and every Z-value that also
matches an **MSRF** resonance number contributes a second hit. The merged z_struct is scored, then the
full dictionary is filtered and sorted twice.

---

## 1. Data model

### 1.1 `x_date` (also used verbatim for `t_date`)

Constructed by `newXDate(date, time)` — `src/ophis_view__strings.js:150-156`.

```ts
type XDate = {
  date: string;   // "MM/DD/YYYY", zero-padded, delimiter DATE_DELIMITER = "/" (ophis_config.js:273)
  time: string;   // "HH:mm" 24h, zero-padded. For non-HH:MM scopes this is ignored at
                  // conversion time and TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE = "00:00" is used
                  // (ophis_config.js:271, ophis_utils.js:737-746)
  enabled: boolean; // MUST be strictly `true` to participate — see GOTCHA G1
};
```

Serialization minification (`src/ophis_model__validation.js:437-459`) drops `time` for
`EVENT_SCOPE__DAYS` and drops `enabled` when it is `true`. Load-time (`validateNewWouldBeLoadDate`,
`src/ophis_model__validation.js:277-284`) restores `enabled = true` when it is neither `true` nor
`false`.

### 1.2 `iso_event`

Canonical constructor: `createNewIsoEvent` — `src/ophis_controller.js:117-146`.

```ts
type IsoEvent = {
  name: string;                 // "" if missing (ensureValidEventName, validation.js:749-756)
  notes: string;                // "" if missing
  x_dates: XDate[];             // ORDER IS SEMANTIC — index == the "X₁, X₂, X₃…" label
  t_dates: XDate[];             // "Target Dates". [] if missing (validation.js:958-960)
  lat: number;                  // decimal degrees, |lat| <= LAT_LIMIT = 65 (config.js:426)
  long: number;                 // decimal degrees, |long| <= LONG_LIMIT = 180 (config.js:427)
  location_enabled: boolean;    // see §8
  scope: EventScope;            // EVENT_SCOPE__* string, default EVENT_SCOPE__DAYS
  type: EventType;              // EVENT_TYPE__* string, default EVENT_TYPE__PERSONAL
  operations: Operation[];
  scoring_system: "SCORING_SYSTEM__LTE_V7" | "SCORING_SYSTEM__GTE_V8";  // default GTE_V8

  // ---- filter flags & values, keys derived mechanically (see §7.1) ----
  iso_event_filter_before_last_x_date: boolean;        // default true
  iso_event_filter_on_last_x_date: boolean;            // default true
  iso_event_filter_before_current_date: boolean;       // default true
  iso_event_filter_on_current_date: boolean;           // default false
  iso_event_filter_beyond_max_days: boolean;           // default true
  iso_event_filter_beyond_max_days_value: number;      // default 2559
  iso_event_filter_min_hit_count: boolean;             // default false
  iso_event_filter_min_hit_count_value: number;        // default 2
  iso_event_filter_min_score: boolean;                 // default false
  iso_event_filter_min_score_value: number;            // default 1
  iso_event_filter_msrf_match: boolean;                // default false

  // ---- chart display flags, not used by this subsystem ----
  chart_option__show_chart: boolean;            // default true
  chart_option__show_dates: boolean;            // default true
  chart_option__show_new_moons: boolean;        // default false
  chart_option__show_first_quarter_moons: boolean;
  chart_option__show_full_moons: boolean;
  chart_option__show_third_quarter_moons: boolean;
  chart_option__show_waxing_crescent_moons: boolean;
  chart_option__show_waning_crescent_moons: boolean;
  chart_option__show_waxing_gibbous_moons: boolean;
  chart_option__show_waning_gibbous_moons: boolean;
  chart_option__full_solar_eclipses: boolean;
  chart_option__partial_solar_eclipses: boolean;
  chart_option__full_lunar_eclipses: boolean;
  chart_option__partial_lunar_eclipses: boolean;
  chart_x_min?: number; chart_x_max?: number;
  chart_y_min?: number; chart_y_max?: number;

  z_date_sort_type?: ZSortType;             // "SORT_TYPE__*" — NOTE the value prefix differs
                                            // from the variable name (config.js:440-444)
  day_scope_start_time_in_millis: number;   // default 0; clamped to
                                            // MILLIS_PER_DAY - MILLIS_PER_MINUTE = 86_340_000
                                            // (validation.js:767-781)

  // ---- written by the engine at run time, deleted before save ----
  effective_operations?: Operation[];       // ophis_model__operations.js:92; deleted in
                                            // sanitizeIsoEventsForSaveOperation (validation.js:472)
};
```

A real, minified-ish `.oph` payload lives at
`C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/test-bradley.oph` and matches this shape exactly.
The file wrapper is `{ "app_version": "12", "iso_events": [ IsoEvent, … ] }`
(`SERIALIZED_FIELD__ISO_EVENTS = "iso_events"`, `SERIALIZED_FIELD__APP_VERSION = "app_version"`,
`ophis_config.js:104-105`). A bare top-level JSON array is also accepted
(`validation.js:887`).

### 1.3 `operation`

Constructed by `newOperation(equation, weight, enabled = true)` — `src/ophis_utils.js:1006-1012`.

```ts
type Operation = {
  equation: string;   // e.g. "X2+YxOPH_PHI", "X1+(Y/2.0)xOPH_CRV", "X2+oph_flip(oph_round(Y))"
  weight: number;     // POINTS__ALPHA_OPERATION_MATCH = 1  (alpha)
                      // POINTS__BETA_OPERATION_MATCH  = 0.5 (beta)
                      // ophis_model__params.js:2-3, 48-54
  enabled: boolean;
  cached_operation_function?: (Y: number) => number;  // attached by getEffectiveOperations()
};
```

**BUG (B1):** `newOperation` ignores its own `enabled` parameter and hard-codes `enabled: true`
(`ophis_utils.js:1010`). The only in-repo caller that passes `false`
(`newOperation("X1+YxOPH_HEP", POINTS__ALPHA_OPERATION_MATCH, OPERATION_ENABLED_FALSE)`,
`ophis_model__params.js:109`) therefore silently produces an **enabled** operation.

`isAlphaOperation(op)` is `op.weight >= 1`; `isBetaOperation(op)` is `op.weight < 1`
(`ophis_model__params.js:48-54`).

### 1.4 `operation_result` (one operation applied to one (X1,X2) pair)

Built in `runOperations` — `src/ophis_model__operations.js:392-410`.

```ts
type OperationResult = {
  z_value: number;               // raw operation output, rounded to DECIMAL_PRECISION__TIME = 2 dp
                                 // (source comment flags the name as a misnomer, line 393)
  rotation_count_y: number;      // the (CLAMPED) Y fed to the operation — see GOTCHA G4
  rotation_count_z: number;      // z_value rounded to DECIMAL_PRECISION__AXIAL_ROTATIONS = 1 dp.
                                 // THIS is the number matched against MSRF sets.
  z_date_native: Date;           // raw X + zValue*MILLIS_PER_DAY, un-normalised.
                                 // Source comment: "Only used for debugging at this point."
  z_date_native_start: Date;     // canonical Z instant (dedup key source)
  z_date_native_end: Date;       // == start unless HH:MM scope w/ sunset window
  z_date_readable_start: string; // may contain HTML (<span class='has_clock_font'>)
  z_date_readable_end: string;
  z_date_readable_start_no_html: string;
  z_date_readable_end_no_html: string;
  x_date_native_start: Date;     // the X-Date the Z-value was added to (post day-start shift)
  x_date_native_other: Date;     // the other X-Date of the pair
  operation_ordinal: number;     // index into effective_operations (== index into isoEvent.operations)
  operation: Operation;          // reference into the effective_operations array
  hash: string;                  // see GOTCHA G9
  hash_without_ordinal: string;
  z_date_dict_key: number;       // z_date_native_start.getTime()  (NUMBER, while the dict key
                                 //  used by tagZDates is the STRING form — see G8)
};
```

### 1.5 `y_struct` (one (X1,X2) pair)

Built in `generateYAndZStructs` — `src/ophis_model__operations.js:202-209`.

```ts
type YStruct = {
  y_ordinal: number;            // 0-based, in pair-generation order (see §2)
  rotation_count_y: number;     // UNCLAMPED Y — see GOTCHA G4
  x_1_ordinal: number;          // index into isoEvent.x_dates of the EARLIER anchor
  x_2_ordinal: number;          // index into isoEvent.x_dates of the LATER anchor
  operation_results: OperationResult[];
};
```

### 1.6 `operation_match_struct` / `msrf_match_struct` ("hits")

`ophis_model__operations.js:586-599`, `src/ophis_utils.js:152-178`.

```ts
type OperationMatchStruct = {
  y_struct: YStruct;
  operation_result: OperationResult;
  points?: number;   // written LATER by getOperationScore() == operation.weight (operations.js:538)
};

type MsrfMatchStruct = {
  msrf_filter: number[];   // === one of MSRF_FILTER__NORMAL | __IMPORTANT | __VORTEX
                           // (a REFERENCE to the array constant; identity is the discriminator)
  msrf_number: number;     // the matched resonance number
  points: number;          // 1 (normal) | 2 (important) | 2 (vortex)
  css_class: "msrf_normal" | "msrf_important" | "msrf_vortex";
  readable_name: "Normal" | "Important" | "Vortex";
  y_struct: YStruct;           // attached in tagZDates (operations.js:596)
  operation_result: OperationResult;  // attached in tagZDates (operations.js:597)
};
```

### 1.7 `z_struct` (a merged Z-Date)

Created in `tagZDates` — `ophis_model__operations.js:564-579`; completed in `scoreZDates`
(`:451-458`) and `sortAndFilterResults` (`:163`).

```ts
type ZStruct = {
  z_date_native: Date;                  // copied from the FIRST contributing operation result
  z_date_native_start: Date;            // ditto
  z_date_native_end: Date;              // ditto
  z_date_readable_start: string;
  z_date_readable_end: string;
  z_date_readable_start_no_html: string;
  z_date_readable_end_no_html: string;
  operation_match_structs: OperationMatchStruct[];  // sorted by sortOperationMatches()
  msrf_match_structs: MsrfMatchStruct[];            // sorted by sortMsrfMatches()

  score: number;                 // final, rounded to 2 dp
  hit_count: number;             // operation_match_structs.length + msrf_match_structs.length
  operation_score: number;       // sum of contributing operation weights
  operation_hit_count: number;   // operation_match_structs.length
  base_score_pre_multiply: number;  // score BEFORE the MSRF multiplier (unrounded)
  z_ordinal: number;             // 0-based index in the DATE-sorted, filtered list
};
```

A verbatim example is preserved as a comment at `src/ophis_view__export.js:265-278`.

### 1.8 `results` (return value of `runOphisOnEvent`)

`ophis_model__operations.js:134-150`.

```ts
type Results = {
  errors: (string | OphError)[];        // strings from runOphisOnEvent; OphError only after
                                        // runOphisOnEventForExport() post-processing
  y_structs: YStruct[];                 // ARRAY, despite the `_out` param being named "Dict"
  z_structs: { [zStartMillisAsString: string]: ZStruct };
  selected_y_struct_for_details: number; // always 0 here; mutated by the UI (view__output.js:918)

  processed_z_dates: string[];                 // dict keys, sorted by isoEvent.z_date_sort_type
  processed_z_dates__sorted_by_date: string[]; // dict keys, always sorted by date ascending

  stale?: boolean;   // set by the controller, not the engine (ophis_controller.js:493/500/502)
};

type OphError = {                       // newOphErrorObject(), operations.js:52-57
  error_status: "NO_RESULTS" | "GENERAL_FAILURE";  // ophis_view__export.js:6-7
  error_message: string;
};
```

---

## 2. X-Date pairing — EXACTLY which pairs are formed

**ALL unordered pairs of enabled X-Dates**, i.e. `C(n, 2)`. Not adjacent-only, not
everything-vs-last. `generateYAndZStructs`, `ophis_model__operations.js:172-218`:

```js
var effectiveXDates = isoEvent.x_dates;            // NOT filtered — the full array
for ( var i = 1; i < effectiveXDates.length; i++ ) {
    var ithXDate = effectiveXDates[i];
    var ithNativeDate = xDateToNativeDate(isoEvent.scope, ithXDate, isoEvent.lat, isoEvent.long);
    for ( var k = 0; k < effectiveXDates.length; k++ ) {
        if ( k < i ) {
            var kthXDate = effectiveXDates[k];
            if ( kthXDate.enabled === true && ithXDate.enabled === true ) {
                var kthNativeDate = xDateToNativeDate(isoEvent.scope, kthXDate, isoEvent.lat, isoEvent.long);
                var x1NativeDate = kthNativeDate;   // EARLIER index
                var x2NativeDate = ithNativeDate;   // LATER index
                …
            }
        }
    }
}
```

Consequences a reimplementation must reproduce:

* `X1` is always the **lower array index**, `X2` the **higher**. There is no chronological
  re-ordering — the engine trusts `validateXDateSpread` to have already rejected out-of-order dates.
* `x_1_ordinal` / `x_2_ordinal` are indices into the **unfiltered** `x_dates` array, so the UI labels
  (`X₁`, `X₂`, …) remain stable when a middle X-Date is disabled.
* `y_ordinal` assignment order is `(0,1), (0,2), (1,2), (0,3), (1,3), (2,3), …` — i.e. the outer
  loop is the **later** date. With 5 enabled X-Dates you get 10 y_structs.
* `ithNativeDate` is computed even when `ithXDate.enabled !== true` (line 179) — wasted work only.
* `alreadyCalculatedSunsets` (line 175) is a single array **shared across all pairs and all
  operations** for the whole run.

**Per-pair setup** (`:191-200`):

```js
var rotationCountY = axialRotationsBetweenNativeDates(isoEvent.scope, x1NativeDate, x2NativeDate,
                                                     isoEvent.lat, isoEvent.long);
var dayScopeStartTimeInMillis = isNonNegIntOrStringThereof(isoEvent.day_scope_start_time_in_millis)
        ? isoEvent.day_scope_start_time_in_millis
        : DEFAULT_DAY_SCOPE_START_TIME_MILLIS;   // 0
var operationResultsOnRotationCountY = runOperations(effectiveOperations, isoEvent.scope,
        x1NativeDate, x2NativeDate, rotationCountY, isoEvent.lat, isoEvent.long,
        alreadyCalculatedSunsets, dayScopeStartTimeInMillis);
```

### 2.1 How Y is computed — `axialRotationsBetweenNativeDates` (`ophis_utils.js:904-981`)

Non-HH:MM scopes (this is the common path, `DEFAULT_EVENT_SCOPE = EVENT_SCOPE__DAYS`):

```js
var millisDifferenceManual = newerNativeDate.getTime() - olderNativeDate.getTime();
dayDifferenceManual = roundNumberToAxialRotationPrecision(millisDifferenceManual / MILLIS_PER_DAY);
```

i.e. `Y = round((X2ms - X1ms) / 86_400_000, 1 decimal)`.

HH:MM scope walks back to the **prior sunset** of each anchor first, then does a bespoke
floor/ceil-with-half-day-bias:

```js
var olderNativeDate_priorSunset = getSunsetNativeUtcDateBefore_withCache(olderNativeDate, lat, long);
var newerNativeDate_priorSunset = getSunsetNativeUtcDateBefore_withCache(newerNativeDate, lat, long);
var millisDifferenceManual = newer_priorSunset.getTime() - older_priorSunset.getTime();

if      ( millisDifferenceManual == 0 )                 dayDifferenceManual = 0;
else if ( millisDifferenceManual < 0 ) {
    if ( millisDifferenceManual >= -MILLIS_PER_DAY )    return -1;               // hard early return
    var remainder = millisDifferenceManual % MILLIS_PER_DAY;
    var roundDown = remainder < (-MILLIS_PER_DAY/2);
    dayDifferenceManual = (millisDifferenceManual - remainder) / MILLIS_PER_DAY;
    if ( roundDown ) dayDifferenceManual -= 1;
    dayDifferenceManual = roundNumberToAxialRotationPrecision(dayDifferenceManual);
}
else if ( millisDifferenceManual <= MILLIS_PER_DAY )    dayDifferenceManual = 1;
else {
    var remainder = millisDifferenceManual % MILLIS_PER_DAY;
    var roundUp = remainder > (MILLIS_PER_DAY/2);
    dayDifferenceManual = (millisDifferenceManual - remainder) / MILLIS_PER_DAY;
    if ( roundUp ) dayDifferenceManual += 1;
    dayDifferenceManual = roundNumberToAxialRotationPrecision(dayDifferenceManual);
}
```

So in HH:MM scope **Y is always an integer** (day-boundary counting between sunsets), whereas in
DAYS scope Y is a 1-dp float that in practice is an integer because both anchors resolve to UTC
midnight.

---

## 3. Top-level control flow

### 3.1 `runOphisOnEvent(isoEvent) -> Results` (`operations.js:83-151`)

1. `errors = []`, `yStructsArray = []`, `zStructsDict = {}`.
2. **try {**
   1. `effectiveXDateCount = getEffectiveXDateCount(isoEvent)` — count of `x_dates[i].enabled === true`
      (`:2-15`).
   2. `effectiveOperations = getEffectiveOperations(isoEvent)` (§4) and
      `isoEvent.effective_operations = effectiveOperations` — **mutates the event object**.
   3. `enabledOperationCount` = number of effective operations with `enabled === true`
      **and** a truthy `cached_operation_function` (`:96-102`).
   4. Mutually-exclusive validation cascade — **at most one error family is produced**:
      * `effectiveXDateCount < MINIMUM_NUMBER_OF_X_DATES (2)` →
        push `"At least 2 X-Dates are required."`
      * else if `isoEvent.scope == EVENT_SCOPE__MONTHS` →
        push `"Month-based projections may be supported in a future version."`
      * else if `isoEvent.scope == EVENT_SCOPE__YEARS` →
        push `"Year-based projections may be supported in a future version."`
      * else if `enabledOperationCount < MINIMUM_OPERATIONS_REQUIRED (1)` →
        push `"At least 1 Operation is required."`
      * else `validateXDateSpread(isoEvent, dateSpreadErrors)`; if it returns `false`,
        **`errors = dateSpreadErrors`** (assignment, not concat — line 119; harmless because
        `errors` is provably empty here).
      * else `generateYAndZStructs(isoEvent, effectiveOperations, yStructsArray, zStructsDict)`.
   5. `scoringSystem = getScoringSystem(isoEvent)` (§3.3).
   6. `scoreZDates(isoEvent.effective_operations, scoringSystem, zStructsDict)` — **runs
      unconditionally**, even on the error paths (where `zStructsDict` is empty).
3. **} catch (error) { errors.push("" + error); }** — stringified, no stack.
4. Build `results` (§1.8) with `selected_y_struct_for_details: 0`.
5. If `errors.length > 0` → `processed_z_dates = []` and `processed_z_dates__sorted_by_date = []`
   (the comment says error handling is downstream in UI or CLI).
   Else → `sortAndFilterResults(isoEvent, results)`.
6. Return `results`.

### 3.2 `runOphisOnEventForExport(isoEvent)` (`operations.js:59-81`)

Wrapper used by CSV/PDF/Excel export (`ophis_view__export.js:45`, `:108`).

* If there were errors: for each `errors[k]`, if `isObjectString(kthError)` (i.e. it is a string)
  replace it with `newOphErrorObject(OPH_OUTPUT_ERROR_STATUS__GENERAL_FAILURE, kthError)` —
  which runs `convertHtmlToPlainText` on the message (`ophis_view__strings.js:111-123`, DOM-based;
  a headless port must substitute a real HTML→text step). Otherwise plain-text the existing
  `error_message` in place.
* If there were **no** errors but `processed_z_dates__sorted_by_date.length == 0`, push
  `newOphErrorObject("NO_RESULTS", NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT, /*convert=*/false)` where
  the literal is `"No results. You probably have to loosen up a filter."`
  (`ophis_view__config.js:12`).

### 3.3 `getScoringSystem(isoEvent)` (`operations.js:17-23`)

Returns `isoEvent.scoring_system` if it is in
`SCORING_SYSTEMS = ["SCORING_SYSTEM__LTE_V7","SCORING_SYSTEM__GTE_V8"]`, else
`SCORING_SYSTEM__GTE_V8`.

### 3.4 `sortAndFilterResults(isoEvent, results)` (`operations.js:153-170`)

```js
var zStructsDict     = results.z_structs;
var scoringSystem    = getScoringSystem(isoEvent);
var currentLocalDate = getCurrentLocalTime(appState.globalOptions.local_time_offset_in_millis);
var filteredZDates   = filterZDates(isoEvent, zStructsDict, currentLocalDate);
var zDatesSortedByDate = sortZDates(filteredZDates, zStructsDict, Z_DATE_SORT_TYPE__DATE, scoringSystem);

for (i…) results.z_structs[ zDatesSortedByDate[i] ].z_ordinal = i;   // 0-based

var sortedAndFilteredZDates = isoEvent.z_date_sort_type == Z_DATE_SORT_TYPE__DATE
        ? deepClone(zDatesSortedByDate)
        : sortZDates(filteredZDates, zStructsDict, isoEvent.z_date_sort_type, scoringSystem);

results.processed_z_dates              = sortedAndFilteredZDates;
results.processed_z_dates__sorted_by_date = zDatesSortedByDate;
```

Note `z_ordinal` is assigned **after** filtering, so it numbers only surviving Z-Dates, in date
order, regardless of the user's chosen sort. `getCurrentLocalTime` (`ophis_utils.js:650-662`) returns
`appState.headless_current_epoch_millis` when headless and that value exceeds
`DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS = Number.MIN_SAFE_INTEGER`; otherwise
`moment().add(millisOffset,'milliseconds').toDate()` **rounded to the nearest minute**
(`roundDateToNearestMinute`, `ophis_utils.js:893-902`).

`sortAndFilterResults` is re-invoked standalone by the UI when the sort column changes
(`ophis_view__output.js:680`).

---

## 4. Operation compilation — `getEffectiveOperations` (`operations.js:25-50`)

```js
var toReturn = [];
var operationsCloned = deepClone(isoEvent.operations);     // JSON round-trip: strips any stale
                                                           // cached_operation_function
for ( var i = 0; i < operationsCloned.length; i++ ) {
    var ithOperation = operationsCloned[i];
    if ( ithOperation.enabled === true ) {
        var validationErrors = [];
        var operationFunction = validateOperationString(ithOperation.equation, i, operationsCloned, validationErrors);
        if ( validationErrors.length > 0 ) {
            toReturn.push(ithOperation);                    // pushed WITHOUT a cached function
        } else {
            ithOperation.cached_operation_function = operationFunction;
            toReturn.push(ithOperation);
        }
    } else {
        toReturn.push(ithOperation);
    }
}
return toReturn;
```

**Every** operation is pushed, enabled or not, valid or not — so
`effective_operations.length === isoEvent.operations.length` and `operation_ordinal` indexes both
arrays identically. That invariant is what makes `getOperationScore`'s
`effectiveOperations[ithOperationOrdinal]` lookup correct (`operations.js:536`).

### 4.1 `normalizeOperationEquationString(str, doReplacements = true)` (`validation.js:30-63`)

Returns `""` for falsy input. Otherwise, in order:

1. Coerce to string; `replaceAll(" ", "")` — **all** whitespace-spaces removed.
2. For each of `ALL_OPH_FUNCTIONS` (`ophis_utils.js:1075-1087`):
   `oph_sqrt, oph_abs, oph_floor, oph_ceil, oph_log, oph_sin, oph_cos, oph_tan, oph_round, oph_flip, oph_exp`
   → `replaceAll(name, name.toUpperCase())`. This exists solely so step 3's `x`→`*` cannot corrupt
   `oph_exp` (source comment, lines 35-37).
3. If `doReplacements === true`:
   * `replaceAll("x", "*")` — the user-facing multiplication sign is a lowercase `x`.
   * For each of `ALL_OPH_CONSTANTS = ["OPH_PI","OPH_PHI","OPH_CRV","OPH_HEP"]` (in that order):
     `replaceAll(name, window[name])` — textual substitution of the numeric literal.
4. For each oph function name: `replaceAll(UPPER, lower)` — restore.

**Constant values actually substituted** (`ophis_config.js:369-419`, with
`DECIMAL_PRECISION__TIME = 2` and `FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION = true`):

| Token | Substituted value | Notes |
|---|---|---|
| `OPH_PI` | **3.14** | not `Math.PI` |
| `OPH_PHI` | **1.618** | deliberately 3 dp even though time precision is 2 dp — see the comment at `ophis_config.js:394-397` |
| `OPH_CRV` | **5.08** | *not* `3.14 * 1.618 = 5.08052`; it is the hard-coded `CURVATURE_TO_2_DECIMAL_PLACES_AS_EXPECTED` |
| `OPH_HEP` | **7.01** | `ophis_config.js:413` |

Raw (unused-at-runtime) values for reference: `PI_RAW = Math.PI`, `PHI_RAW = 1.61803398875`,
`CURVATURE_RAW = PI_RAW * PHI_RAW`.

### 4.2 `getStartingX(equationString, needsNormalizing = true)` (`operations.js:228-241`)

Normalizes first if asked, then: `startsWith("X1+")` → `STARTING_X1` (`"STARTING_X1"`);
`startsWith("X2+")` → `STARTING_X2`; otherwise **`null`**.

### 4.3 `validateOperationString(eq, indexInOperationArray, otherOperations, errors_out)` (`validation.js:131-191`)

Returns a `(Y) => number` function. Default return is
`DEFAULT_OPERATION_FUNCTION = new Function("Y", "return Y;")` (`validation.js:1`) — the identity
function — which is returned on *every* failure path.

1. `errors_out = Array.isArray(errors_out) ? errors_out : []`.
2. Falsy equation → push `"Cannot be empty."`, return identity.
3. `normalized = normalizeOperationEquationString(eq, true)`.
4. `startingX = getStartingX(normalized, /*needsNormalizing=*/false)`.
   If neither X1 nor X2 → push `"Must start with 'X1 + &hellip;' or 'X2 + &hellip;'"` (HTML entity
   in the literal) and skip to the duplicate check.
5. Else build a validation-only string, `stripOperationEquationString` (`validation.js:104-121`):
   * `slice(3)` — drops the leading `X1+` / `X2+`;
   * remove all `oph_*` function **names** (keeping their parentheses — legal because every
     `oph_*` takes exactly one argument; source comment lines 110-113);
   * `replaceAll("Y", SAMPLE_Y_VALUE_FOR_VALIDATION)` where `SAMPLE_Y_VALUE_FOR_VALIDATION = 10`
     (`ophis_config.js:422`).
6. `validateSimpleArithmeticString` (`validation.js:67-95`):
   * if it contains `"="` → push `"Cannot include '=' in the equation."`;
   * `math.parse(str)` (mathjs, `lib/`); on throw push `error.message`;
   * `math.evaluate(str, {})`; on throw push `error.message`;
   * result must satisfy `isValidOperationEquationResult`: `typeof === 'number' && !NaN && > 0`
     (`validation.js:123-129`). Else push
     `Z_VALUE_MUST_BE_GREATER_THAN_ZERO_MESSAGE = "Z-value must resolve to a number > 0."`
7. If errors so far → **early return the identity function** (line 152).
8. Build the real function: `new Function("Y", "return " + normalized.slice(3) + ";")`.
   Evaluate at `Y = 10`; if the result is not a positive number push the same
   `"Z-value must resolve to a number > 0."`; any throw → push `"" + e`.
9. If `errors_out.length == 0`, scan **backwards** over `otherOperations[indexInOperationArray-1 … 0]`
   and, for each whose normalized equation equals this one, push
   `"Indentical to Operation " + (i+1) + " and each Operation must be unique."`
   (note the typo *Indentical*, and the 1-based operation number).

### 4.4 The `oph_*` function library (`ophis_utils.js:1014-1073`)

`oph_sqrt/abs/floor/ceil/log/sin/cos/tan/exp` are thin `Math.*` wrappers. `oph_round` is
`Math.round`. `oph_flip` is bespoke and load-bearing (default operation #2 uses it):

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
    return new Number(joinArray).valueOf();
}
```

Semantics: digits are reversed, then the decimal point is re-inserted **at the same index from the
left**, not mirrored. Verified by execution:

| input | output | note |
|---|---|---|
| `123.45` | `543.21` | point re-inserted at index 3, not mirrored to index 2 |
| `100` | `1` | leading zeros of the reversal are eaten by `Number()` |
| `46` | `64` | |
| `10` | `1` | |
| `-12` | `NaN` | `"-12"` → `"21-"` → `Number("21-")` is NaN — **negative Y/Z poisons the pipeline** |

A `NaN` z-value propagates unchecked: `NaN > MAXIMUM_ROTATION_COUNT_Z` is `false` so it is not
clamped, `NaN * MILLIS_PER_DAY` is `NaN`, `new Date(NaN)` is an Invalid Date, `getTime()` returns
`NaN`, and the dictionary key becomes the string `"NaN"` — one bucket that swallows every NaN result
across every pair and operation. `getMsrfMatch(NaN)` returns `null` (all comparisons against NaN are
false), so such a Z-Date scores on operation weight alone. This is reachable: `X1+oph_flip(11-Y)`
passes validation (the mathjs pre-check sees `(11-10) = 1 > 0`, and the real function at Y=10 gives
`oph_flip(1) = 1`) but yields `oph_flip(-35) = NaN` at Y=46. `oph_sqrt` and `oph_log` of negatives
behave the same way.

### 4.5 Default operation table (`ophis_model__params.js:65-143`)

`cloneDefaultOperationsForAppVersionGte10()` is what `createNewIsoEvent` uses and what a missing /
malformed `operations` field falls back to (`validation.js:638`, `:642`). It is
`cloneDefaultOperationsForAppVersionGte8()` (= the LTE_V7 table with every `enabled` forced true and
the two equations `"X1+YxOPH_PI"` and `"X2+(Y/2.0)xOPH_PHI"` promoted from beta 0.5 to alpha 1.0)
plus `OPH_HEP_OPERATION_FOR_X2`. Final 16-entry list, in order (ordinal 0…15):

| # | equation | weight |
|---|---|---|
| 0 | `X2+oph_round(Y)` | 1 |
| 1 | `X2+oph_flip(oph_round(Y))` | 1 |
| 2 | `X2+Y/OPH_CRV` | 0.5 |
| 3 | `X1+(Y/2.0)xOPH_PI` | 0.5 |
| 4 | `X2+Y/OPH_PHI` | 1 |
| 5 | `X2+(Y/2.0)xOPH_PHI` | 1 |
| 6 | `X1+(Y/2.0)xOPH_CRV` | 0.5 |
| 7 | `X2+(Y/2.0)xOPH_PI` | 0.5 |
| 8 | `X2+YxOPH_PHI` | 1 |
| 9 | `X1+YxOPH_PI` | 1 |
| 10 | `X2+(Y/2.0)xOPH_CRV` | 0.5 |
| 11 | `X2+YxOPH_PI` | 0.5 |
| 12 | `X1+YxOPH_CRV` | 0.5 |
| 13 | `X2+YxOPH_CRV` | 0.5 |
| 14 | `X1+YxOPH_HEP` | 1 |
| 15 | `X2+YxOPH_HEP` | 1 |

(Confirmed against `test-bradley.oph:40-121`.) A user-added operation defaults to
`newOperation("X1+Y", POINTS__BETA_OPERATION_MATCH, …)` (`ophis_controller.js:249`).

---

## 5. The per-pair, per-operation projection loop — `runOperations`

`operations.js:263-416`.

```
runOperations(operations, eventScope, x1NativeDate, x2NativeDate, axialRotationCountY,
              lat, long, alreadyCalculatedSunsets, dayScopeStartTimeMillis = 0)
  -> OperationResult[]
```

**Step 0 — clamp Y.** If `axialRotationCountY > MAXIMUM_ROTATION_COUNT_Y (36500)` →
`console.warn("axialRotationCountY of X exceeded maximum of 36500. Constraining to maximum.")` and
set the local to 36500. (36500 days ≈ 100 years — see the comment at `ophis_config.js:18-19`.)
There is **no lower clamp**; negative Y flows straight through.

**For each operation `i`:**

1. `if (ithOperation.enabled == false) continue;` — loose `==`.
2. `if (!ithOperation.cached_operation_function) continue;` — silently skips operations that failed
   validation (the warn is commented out at lines 282-283; the comment notes such an operation is
   still present in the *displayed* list).
3. `ithZValue_raw = cached_operation_function(axialRotationCountY)`.
4. If `ithZValue_raw > MAXIMUM_ROTATION_COUNT_Z (36500)` → warn and clamp to 36500. Again no lower
   clamp — a negative Z-value produces a Z-Date *before* the X-Date.
5. `ithZValueInMillis_raw = ithZValue_raw * MILLIS_PER_DAY` — computed **before** rounding
   ("purposely do this before rounding to precision...feels more correct", line 295).
   `MILLIS_PER_DAY = 86_400_000`.
6. `ithZValue_raw = roundNumberToTimePrecision(ithZValue_raw)` → 2 dp. *(The unrounded value was
   already captured in millis.)*
7. `startingX = getStartingX(ithOperation.equation)` — **re-normalizes the equation string on every
   single call**, for every pair and every operation (pure CPU waste; also means the constants are
   substituted again).
   * `STARTING_X1` → `startingXDate_native = x1NativeDate`, `otherXDate_native = x2NativeDate`
   * `STARTING_X2` → `startingXDate_native = x2NativeDate`, `otherXDate_native = x1NativeDate`
   * `null` → both stay `null` and step 8 throws (unreachable in practice, see G3).
8. ```js
   dateToWhichToAddZValue_native = isFlagEnabled(FEATURE_FLAG__SUNSET__ADD_Z_VALUE_TO_X_DATE_PRIOR_SUNSET)
       ? getSunsetNativeUtcDateBefore_withCache(startingXDate_native, lat, long)
       : cloneNativeDate(startingXDate_native);
   otherXDate_native = <same ternary on otherXDate_native>;
   ```
   `FEATURE_FLAG__SUNSET__ADD_Z_VALUE_TO_X_DATE_PRIOR_SUNSET === false` in v12
   (`ophis_config.js:301`, comment: *"After feedback from Jason, Z-Value should be added to the exact
   X-Date and not Prior Sunset"*), so in shipped behaviour this is just a clone.
9. If `eventScope == EVENT_SCOPE__DAYS && dayScopeStartTimeMillis > 0`:
   `dateToWhichToAddZValue_native.setTime(getTime() + dayScopeStartTimeMillis)`.
   Applies to the **DAYS scope only**, and only to the anchor being projected from.
10. `zDateInMillisSinceEpoch = dateToWhichToAddZValue_native.getTime() + ithZValueInMillis_raw;`
    `zDate_native = new Date(zDateInMillisSinceEpoch);`
11. **Normalise into a [start, end) window:**
    * **HH:MM scope AND `FEATURE_FLAG__SUNSET__CALCULATE_BEFORE_N_AFTER === true`** (it is, `config.js:304`):
      ```js
      var sunsetSampling = [];
      var before = getSunsetNativeUtcDateBefore_withCache(zDate_native, lat, long, sunsetSampling);
      var after  = getSunsetNativeUtcDateAfter_withCache (zDate_native, lat, long, sunsetSampling);
      before = findAlreadyCalculatedSunset(before, alreadyCalculatedSunsets);
      after  = findAlreadyCalculatedSunset(after,  alreadyCalculatedSunsets);
      zDate_native_start = before;  zDate_native_end = after;
      ```
      The shared `sunsetSampling` array is filled by the "before" call and reused by the "after" call
      (`ophis_utils.js:540-547`, `:584-591`) so both come from one sampling pass.
    * **Otherwise** (DAYS scope, or HH:MM with the flag off):
      ```js
      lat = null; long = null;
      if ( isFlagEnabled(FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT) ) { lat = 0; long = 0; }   // flag IS true
      var tempZDate = nativeDateToXDate(zDate_native, lat, long);          // -> {date:"MM/DD/YYYY", time:"HH:mm"}
      var zDate_native_timeZero = xDateToNativeDate(eventScope, tempZDate, lat, long);
      zDate_native_start = zDate_native_end = zDate_native_timeZero;
      ```
      Round-tripping through the *string* X-Date representation is how the time-of-day is discarded:
      for `EVENT_SCOPE__DAYS`, `xDateToNativeDate` substitutes
      `TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE = "00:00"` (`ophis_utils.js:737-739`) and, with
      `lockDayScopeToGmt` true, forces `lat = 0, long = 0` (`ophis_utils.js:768-771`), so the result
      is **UTC midnight** — verified: `tzlookup(0, 0)` returns the string `"Etc/GMT"`
      (`lib/tz_lookup_oss.js`), and `moment.tz(s, "Etc/GMT").utc()` is a plain UTC parse.
      ⚠ **This assignment mutates the `lat`/`long` function parameters for the remainder of the loop.**
      See **G5**.
12. `rotationCountZ = roundNumberToAxialRotationPrecision(ithZValue_raw)` → 1 dp. The commented-out
    alternative (`axialRotationsBetweenNativeDates(...)`, lines 358-364) explains why: recomputing
    from dates could walk back through a second prior-sunset.
13. `zDateNativeToMillis = zDate_native_start.getTime()`.
14. Hashes:
    ```js
    var hashWithoutOrdinal = "" + dateToWhichToAddZValue_native.getTime() + "" + zDateNativeToMillis;
    var fullUniqueHash     = "" + i + "" + x1NativeDate.getTime() + "" + x2NativeDate.getTime() + "" + zDateNativeToMillis;
    ```
15. Readable strings:
    * HH:MM: `nativeDateToReadableString_dateAndTime(start|end, lat, long)` for the HTML variants
      and the same with `includeHtmlForTime = false` for the `_no_html` variants
      (`ophis_view__strings.js:219-225`).
    * DAYS: `nativeDateToReadableString_dateOnly(start|end, lat, long)`; the `_no_html` fields are
      assigned the **same** strings.
    * MONTHS / YEARS: **none of the four readable fields is assigned** — they stay `""`. Dead in
      practice because MONTHS/YEARS bail out earlier in `runOphisOnEvent`.
16. Push the `OperationResult` (§1.4).

### 5.1 `findAlreadyCalculatedSunset(sunsetNative, alreadyCalculatedSunsets)` (`operations.js:246-261`)

Sunset snapping. Linear scan; returns the first previously-seen sunset within
`ALREADY_CALCULATED_SUNSET_TOLERANCE_IN_MILLIS = MILLIS_PER_HOUR = 3_600_000` of the candidate
(`numbersEqualWithinTol`, an **inclusive** `[n1-tol, n1+tol]` band, `ophis_utils.js:221-230`);
otherwise pushes the candidate and returns it. Purpose per the source comment (lines 243-245):
trigonometric rounding can make `12/14/23 3:01` and `3:02` resolve to sunsets a minute or two apart,
so whichever was computed first wins. **This makes the result order-dependent** — the array is shared
across the whole run, so the set of Z-Dates depends on pair/operation iteration order.

---

## 6. Deduplication / aggregation — `tagZDates` (`operations.js:545-602`)

Called once per (X1,X2) pair, immediately after `runOperations` and **before** the y_struct is pushed
(`operations.js:211-213`).

```js
for each ithOperationResult in operationResultsOnRotationCountY:
    var ithRotationCountZ = ithOperationResult.rotation_count_z;
    var ithOperationResultDictKey = nativeDateToUtcMillis(ithOperationResult.z_date_native_start) + "";
    //  ^ epoch-millis of the Z window START, coerced to STRING, deliberately
    //    ("force a String-key Dictionary", comment lines 551-552)

    var existingZStruct = zStructsDict_out[ithOperationResultDictKey];
    if ( !existingZStruct ) {
        existingZStruct = zStructsDict_out[key] = {
            z_date_native, z_date_native_start, z_date_native_end,
            z_date_readable_start, z_date_readable_end,
            z_date_readable_start_no_html, z_date_readable_end_no_html,   // all copied from THIS result
            operation_match_structs: [], msrf_match_structs: [],
            score: 0, hit_count: 0
        };
    }

    existingZStruct.operation_match_structs.push({ y_struct: yStruct, operation_result: ithOperationResult });

    var msrfMatchStruct = getMsrfMatch(ithRotationCountZ);
    if ( msrfMatchStruct != null ) {
        msrfMatchStruct.y_struct = yStruct;
        msrfMatchStruct.operation_result = ithOperationResult;
        existingZStruct.msrf_match_structs.push(msrfMatchStruct);
    }
```

**The merge key is `z_date_native_start.getTime()` as a string** — the same Z instant reached by a
different operation and/or a different X-pair merges into one z_struct. In DAYS scope that means
"same UTC calendar day"; in HH:MM scope it means "same sunset-to-sunset window".

**What a "hit" is:** one element of `operation_match_structs` **or** one element of
`msrf_match_structs`. A single operation result therefore contributes **1 or 2 hits** — one for the
operation itself, plus one more if its `rotation_count_z` matched an MSRF number.

**What is kept on merge:** only the arrays grow. The `z_date_*` display fields are those of the
*first* operation result that created the key and are never revisited — harmless when the key
determines them (DAYS: same midnight → same strings; HH:MM: same sunset-before → same start string),
but `z_date_native` and `z_date_native_end`/`z_date_readable_end` are **not** implied by the key.
`z_date_native` in particular is whatever raw un-normalised instant the first contributor produced.
`z_date_native_end` is stable in practice only because "sunset after" is a function of "sunset
before" once snapped by `findAlreadyCalculatedSunset`.

### 6.1 MSRF matching — `getMsrfMatch(axialRotationCount)` (`ophis_utils.js:148-219`)

1. `axialRotationCount = roundNumberToAxialRotationPrecision(axialRotationCount)` (1 dp; idempotent
   here since `rotation_count_z` is already 1 dp).
2. **Vortex first.** For each `ithFilterNumber` of `MSRF_FILTER__VORTEX` in array order, if
   `areEqualWithinTolerance(ithFilterNumber, value, VORTEX_FILTER_MATCH_TOLERANCE = 0.1)`
   (`|a-b| <= tol`, inclusive — `ophis_utils.js:308-316`) → return a Vortex match whose
   `msrf_number` is **the filter number, not the input**.
   `MSRF_FILTER__VORTEX = [21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4, 762.3, 871.2]`
   (`ophis_model__params.js:44-46`).
3. **Half-day rule.** `if ((axialRotationCount + "").endsWith(".5")) return null;` — comment:
   *"As per Jason, numbers 'right in the middle' are counted as no match. Must trend towards either
   the floor or the ceiling."* **This check runs AFTER the vortex scan**, so e.g. `32.5` still
   matches vortex `32.6` (|Δ| = 0.1). See **G6**.
4. `rounded = oph_round(value)` (`Math.round`).
5. Exact scan of `MSRF_FILTER__IMPORTANT` (**53** numbers, `params.js:38-42`) → 2 points,
   `css_class "msrf_important"`, `readable_name "Important"`.
6. Else exact scan of `MSRF_FILTER__NORMAL` (**325** numbers, `params.js:17-36`, last literal is
   `HIGHEST_MSRF_NUMBER = 2559`) → 1 point, `"msrf_normal"`, `"Normal"`.
7. Else `null`.

Verified set properties (counted programmatically from `params.js`): NORMAL = 325 entries, no
duplicates, **not fully ascending** — `1574` appears after `1641` at index 248 (a data-entry slip;
harmless because both scans are linear). IMPORTANT = 53 entries. VORTEX = 12 entries. NORMAL and
IMPORTANT are **disjoint** (zero overlap), so the Important-before-Normal precedence at steps 5-6
never actually changes an outcome. Source comment at `params.js:15-16` notes that `21` and `76` were
once removed from NORMAL because rounded-down Vortex numbers collide with them, then re-enabled once
the Vortex tolerance was introduced.

Points constants (`ophis_model__params.js:2-6`):
`POINTS__NORMAL_MSRF_MATCH = 1`, `POINTS__IMPORTANT_MSRF_MATCH = 2`,
`POINTS__VORTEX_MSRF_MATCH = POINTS__IMPORTANT_MSRF_MATCH = 2`.

`MSRF_FILTER__FINAL` (`params.js:57`) is the numeric sort-merge of all three arrays; it is used only
by the self-test (`ophis_unit_tests.js:100`), never by the engine.

At most **one** MSRF match per operation result — the function returns on the first hit and the
priority order is Vortex → Important → Normal.

### 6.2 Scoring — `scoreZDates(effectiveOperations, scoringSystem, zStructsDict_out)` (`operations.js:418-461`)

For every own-property key of the dict:

1. `sortOperationMatches(z.operation_match_structs)` (`ophis_model__sorting.js:314-348`) — comparator:
   weight **descending**; then `operation_ordinal` ascending; then `x_1_ordinal` ascending; then
   `x_2_ordinal` ascending; full ties return `1`.
2. `sortMsrfMatches(z.msrf_match_structs)` (`sorting.js:292-312`) — comparator: MSRF **multiplier**
   descending; ties broken by `operation_result.rotation_count_z` descending (`>=` → `-1`).
3. `operationSubscore = getOperationScore(effectiveOperations, z.operation_match_structs)`
   (`operations.js:530-543`):
   ```js
   for each match:
       var weight = effectiveOperations[ match.operation_result.operation_ordinal ].weight;
       match.points = weight;      // SIDE EFFECT: writes .points onto the match struct
       toReturn += weight;
   ```
4. `msrfMatchSubscore = sumUpMsrfMatchSubscore(z.msrf_match_structs, scoringSystem)`
   (`operations.js:494-516`):
   ```js
   var overallScoreMultiplier = getMsrfScoreMultiplier(msrfMatches);   // max, floor 1.0
   var alreadyFoundScoreMultiplier = false;
   for each ithMsrfMatchStruct:
       var ithScoreMultiplier = getMsrfScoreMultiplierForFilter(ithMsrfMatchStruct.msrf_filter);
       if ( !alreadyFoundScoreMultiplier && ithScoreMultiplier == overallScoreMultiplier
            && scoringSystem == SCORING_SYSTEM__GTE_V8 ) {
           alreadyFoundScoreMultiplier = true;   // this one becomes the MULTIPLIER, not points
       } else {
           toReturn += ithMsrfMatchStruct.points;
       }
   ```
   Because step 2 already sorted by multiplier descending, the "consumed" element is always
   `msrf_match_structs[0]`. Net effect under GTE_V8: `msrfSubscore = Σpoints − points[0]`.
5. `operationHitCount = z.operation_match_structs.length`;
   `msrfHitCount = z.msrf_match_structs.length`;
   `finalHitCount = operationHitCount + msrfHitCount`.
6. `finalScore = operationSubscore + msrfMatchSubscore`; `baseScorePreMultiply = finalScore`.
7. Scoring-system switch:
   * `SCORING_SYSTEM__LTE_V7` → nothing more.
   * `SCORING_SYSTEM__GTE_V8` → `finalScore *= getMsrfScoreMultiplier(z.msrf_match_structs)`.
   * anything else → `console.warn("Unhandled scoring system: " + scoringSystem)` (unreachable
     because `getScoringSystem` already coerced it).
8. Write back: `operation_score`, `operation_hit_count`, `score = roundNumberToPrecision(finalScore,
   DECIMAL_PRECISION__SCORE = 2)`, `base_score_pre_multiply` (**unrounded**), `hit_count`.

`getMsrfScoreMultiplierForFilter(filter)` (`operations.js:463-476`) maps by **array identity**:

| filter | multiplier |
|---|---|
| `MSRF_FILTER__NORMAL` | `SCORE_MULTIPLIER__NORMAL_MSRF_MATCH = 1.5` |
| `MSRF_FILTER__IMPORTANT` | `SCORE_MULTIPLIER__IMPORTANT_MSRF_MATCH = 2.0` |
| `MSRF_FILTER__VORTEX` | `SCORE_MULTIPLIER__VORTEX_MSRF_MATCH = 2.0` |
| anything else / no matches | `1.0` |

`getMsrfScoreMultiplier(msrfMatches)` (`operations.js:478-492`) = max over matches, floor `1.0`.

`sumUpMsrfNumbersThemselves(msrfMatches)` (`operations.js:518-528`) sums `msrf_number`; used only as
a sort tiebreaker (`sorting.js:224-225`). It contains a harmless stray double semicolon (`;;`, line 524).

**Worked example.** A DAYS-scope Z-Date hit by three operations of weights 1, 1, 0.5, where two of
those three Z-values also matched MSRF numbers — one Important (2 pts) and one Normal (1 pt):

* `operation_score = 2.5`, `operation_hit_count = 3`
* msrf sorted → `[Important(2, mult 2.0), Normal(1, mult 1.5)]`; overall multiplier = 2.0
* GTE_V8: index 0 consumed → `msrfMatchSubscore = 1`
* `base_score_pre_multiply = 3.5`; `score = round(3.5 * 2.0, 2) = 7`
* `hit_count = 3 + 2 = 5`

Under LTE_V7 the same Z-Date scores `round(2.5 + 2 + 1, 2) = 5.5`.

---

## 7. Filtering and sorting

### 7.1 Filter field plumbing

`SERIALIZED_FILTER_FIELDS` (`ophis_config.js:122-174`) is built by
`newSerializedFieldObject(varName, name, title, enabledByDefault, numericDefault = null,
textOnlyName = null, zIndex = 0)` (`ophis_utils.js:124-146`), which derives every key mechanically:

```js
baseName                 = varName.replace("SERIALIZED_FIELD__", "");
serializationKey         = baseName.toLowerCase();
serializationKeyForValue = serializationKey + "_value";
elemId                   = serializationKey.replaceAll("_", "-") + "-checkbox";
elemIdForInput           = serializationKey.replaceAll("_", "-") + "-input";
```

| varName | `.oph` key | value key | DOM checkbox id | DOM input id | default | numeric default |
|---|---|---|---|---|---|---|
| `SERIALIZED_FIELD__ISO_EVENT_FILTER_BEFORE_LAST_X_DATE` | `iso_event_filter_before_last_x_date` | — | `iso-event-filter-before-last-x-date-checkbox` | — | **true** | — |
| `SERIALIZED_FIELD__ISO_EVENT_FILTER_ON_LAST_X_DATE` | `iso_event_filter_on_last_x_date` | — | `iso-event-filter-on-last-x-date-checkbox` | — | **true** | — |
| `SERIALIZED_FIELD__ISO_EVENT_FILTER_BEFORE_CURRENT_DATE` | `iso_event_filter_before_current_date` | — | `iso-event-filter-before-current-date-checkbox` | — | **true** | — |
| `SERIALIZED_FIELD__ISO_EVENT_FILTER_ON_CURRENT_DATE` | `iso_event_filter_on_current_date` | — | `iso-event-filter-on-current-date-checkbox` | — | **false** | — |
| `SERIALIZED_FIELD__ISO_EVENT_FILTER_BEYOND_MAX_DAYS` | `iso_event_filter_beyond_max_days` | `iso_event_filter_beyond_max_days_value` | `iso-event-filter-beyond-max-days-checkbox` | `iso-event-filter-beyond-max-days-input` | **true** | **2559** (`HIGHEST_MSRF_NUMBER`) |
| `SERIALIZED_FIELD__ISO_EVENT_FILTER_MIN_HIT_COUNT` | `iso_event_filter_min_hit_count` | `iso_event_filter_min_hit_count_value` | `iso-event-filter-min-hit-count-checkbox` | `iso-event-filter-min-hit-count-input` | **false** | **2** |
| `SERIALIZED_FIELD__ISO_EVENT_FILTER_MIN_SCORE` | `iso_event_filter_min_score` | `iso_event_filter_min_score_value` | `iso-event-filter-min-score-checkbox` | `iso-event-filter-min-score-input` | **false** | **1** |
| `SERIALIZED_FIELD__ISO_EVENT_FILTER_MSRF_MATCH` | `iso_event_filter_msrf_match` | — | `iso-event-filter-msrf-match-checkbox` | — | **false** | — |

Readers:
* `isIsoEventFieldEnabled(isoEvent, varName)` (`ophis_utils.js:81-91`) — linear scan of
  `ALL_SERIALIZED_FIELDS` (filters ++ chart options), returns `isoEvent[serializationKey]`, else
  `false` if the varName is unknown. Call sites compare with `=== true`.
* `getIsoEventFilterNumbericValue(isoEvent, varName)` (`ophis_utils.js:93-114`) — `parseFloat` of
  `isoEvent[serializationKeyForValue]`; if `>= 0` return it; else `printWarning(...)` and return
  `parseFloat(numericDefault)`. Unknown varName → `printError(...)` and `-1.0`.
  **Negative user values are silently replaced by the default.**

### 7.2 `filterZDates(isoEvent, zStructsDict, nativeDateUtcCutoff = null) -> string[]`

`ophis_model__sorting.js:3-204`. Returns the surviving **dict keys**.

**Prologue:**

1. `lastXDate` = scan `x_dates` from the end for the first `enabled === true`. (If none, the
   subsequent `xDateToNativeDate` returns `null` and `nativeDateToUtcMillis(null)` throws — but this
   is unreachable because `runOphisOnEvent` already required ≥ 2 enabled X-Dates.)
2. `lastXDateAsNative = xDateToNativeDate(isoEvent.scope, lastXDate, isoEvent.lat, isoEvent.long)`.
3. Cutoff normalisation:
   * `EVENT_SCOPE__HH_MM` → `cutoffMillis = nativeDateUtcCutoff.getTime()` (raw "now", minute-rounded).
   * otherwise → round-trip through the string X-Date form:
     `nativeDateToXDate(cutoff)` (no lat/long → uses the **operator's local** `getMonth/getDate/
     getFullYear`) then `xDateToNativeDate(isoEvent.scope, thatXDate)` (lat/long `null` →
     `lockDayScopeToGmt` forces 0/0 → UTC). Net: **UTC midnight of the operator's local calendar
     date**, shifted by `GLOBAL_OPTION__LOCAL_TIME_OFFSET_IN_MILLIS`.
4. `tDatesInMillis` — for each `t_dates[i]` with `enabled === true`:
   `xDateToNativeDate(isoEvent.scope, ithTDate)` — **note: no `lat`/`long` arguments** — then
   `.getTime()`. A `null` conversion logs
   `console.warn("Could not convert t_date to native: " + JSON.stringify(ithTDate))` and is skipped.
   See **G7**.
5. `lastXDatePriorSunset = isFlagEnabled(FEATURE_FLAG__SUNSET__FILTER_BASED_ON_PRIOR_SUNSET)
   ? getSunsetNativeUtcDateBefore_withCache(lastXDateAsNative, lat, long) : lastXDateAsNative;`
   The flag is **false** (`ophis_config.js:305`) so, despite the name,
   `lastXDatePriorSunsetInMillis` is simply the last enabled X-Date's epoch millis.

**Per z_struct** (`for … in` over own properties):

```js
var nativeUtcDateToUseForZ         = z.z_date_native_start;
var nativeUtcDateToUseForZInMillis = nativeDateToUtcMillis(nativeUtcDateToUseForZ);  // number
var nativeUtcDateZInMillis_start   = z.z_date_native_start;   // ⚠ a Date, despite the name
var nativeUtcDateZInMillis_end     = z.z_date_native_end;     // ⚠ a Date, despite the name
var includeInOutput = true;
```

Filters are then applied as a straight sequence of independent `if` blocks, each of which can only
set `includeInOutput = false`. **There are no early exits and no mutation, so the order is
functionally irrelevant** — but the literal source order is:

| # | Filter | HH:MM predicate (exclude when true) | Non-HH:MM predicate (exclude when true) | Source |
|---|---|---|---|---|
| 1 | `iso_event_filter_before_last_x_date` | `z_end <= lastX` | `z_start < lastX` | `sorting.js:71-81` |
| 2 | `iso_event_filter_on_last_x_date` | `lastX >= z_start && lastX < z_end` | `z_start == lastX` | `:83-93` |
| 3 | `iso_event_filter_before_current_date` | `z_end <= cutoff` | `z_start < cutoff` | `:95-105` |
| 4 | `iso_event_filter_on_current_date` | `cutoff >= z_start && cutoff < z_end` | `z_start == cutoff` | `:107-117` |
| 5 | **T-Date gate** (implicit, no flag) | exclude unless ∃ t: `t >= z_start && t < z_end` | exclude unless ∃ t: `z_start == t` | `:119-141` |
| 6 | `iso_event_filter_min_score` | `z.score < value` | same | `:143-149` |
| 7 | `iso_event_filter_min_hit_count` | `z.hit_count < value` | same | `:151-157` |
| 8 | `iso_event_filter_beyond_max_days` | `Math.round((z_start_millis - lastX_millis)/MILLIS_PER_DAY) > value` | same | `:159-173` |
| 9 | `iso_event_filter_msrf_match` | `z.msrf_match_structs.length == 0` | same | `:175-179` |

Surviving keys are pushed onto the return array in `for…in` enumeration order (integer-like string
keys enumerate in ascending numeric order in V8 — but do **not** rely on that; the caller always
sorts).

Filter #8 detail: the code computes `dayDelta` and `dayDeltaRounded` and has a disabled warning when
they disagree ("Seems to legitmately spam", lines 165-168).

Filter #5 detail: the T-Date gate is **only active when at least one enabled T-Date exists**. When
active it is a whitelist, not a blacklist — everything not landing on/inside a T-Date window is
dropped.

Dead code: lines 188-199 are a commented-out earlier version of the whole predicate.

### 7.3 `sortZDates(filteredZDates, zStructsDict, sortType, scoringSystem) -> string[]`

`ophis_model__sorting.js:206-290`. `sortType = sortType || DEFAULT_Z_DATE_SORT_TYPE
(Z_DATE_SORT_TYPE__DATE)`. Copies with `Array.from`, then `.sort(cmp)`.

Sort type constants (`ophis_config.js:440-445`) — **note the value strings drop the `Z_DATE_` prefix**:

```
Z_DATE_SORT_TYPE__SCORE      = "SORT_TYPE__SCORE"
Z_DATE_SORT_TYPE__DATE       = "SORT_TYPE__DATE"       (default)
Z_DATE_SORT_TYPE__MSRF       = "SORT_TYPE__MSRF"
Z_DATE_SORT_TYPE__HIT_COUNT  = "SORT_TYPE__HIT_COUNT"
Z_DATE_SORT_TYPE__OPERATIONS = "SORT_TYPE__OPERATIONS"
```

Per-pair the comparator first *degrades* the sort type on ties:

* `SCORE` and `score_a == score_b` → `HIT_COUNT`, or `DATE` if hit counts also tie.
* `MSRF` and `msrfScore_a == msrfScore_b && msrfNumberSum_a == msrfNumberSum_b` → `DATE`.
* `OPERATIONS` and `operationScore` and `operationCount` both tie → `DATE`.
* `HIT_COUNT` and `hitCount_a == hitCount_b` → `DATE`.

Then:

| effective type | values compared | order |
|---|---|---|
| `SCORE` | `z.score` | descending |
| `DATE` | `z.z_date_native_start.getTime()` | **ascending** |
| `MSRF` | `sumUpMsrfMatchSubscore(...)`, falling back to `sumUpMsrfNumbersThemselves(...)` when the subscores are equal | descending |
| `OPERATIONS` | `operation_hit_count` in **both** branches (see **G10**) | descending |
| `HIT_COUNT` | `z.hit_count` | descending |

Final line:

```js
var toReturn = (sortValueA > sortValueB ? -1 : 1);
return toReturn * (sortOrder == SORT_ORDER__DESCENDING ? 1 : -1);
```

`SORT_ORDER__ASCENDING = "SORT_ORDER__ASCENDING"`, `SORT_ORDER__DESCENDING = "SORT_ORDER__DESCENDING"`
(`ophis_config.js:455-456`).

---

## 8. EVENT_SCOPE and EVENT_TYPE enums

### 8.1 `EVENT_SCOPE__*` (`ophis_config.js:321-331`)

| Value (string literal) | Behaviour in this subsystem |
|---|---|
| `"EVENT_SCOPE__HH_MM"` | X-Dates use both `date` and `time`, converted through the event's `lat/long` timezone. `Y` counts sunset-to-sunset days. Z-Dates become a **[sunset-before, sunset-after) window** (`FEATURE_FLAG__SUNSET__CALCULATE_BEFORE_N_AFTER = true`). All the date filters use interval containment. Readable strings include the time. |
| `"EVENT_SCOPE__DAYS"` | **`DEFAULT_EVENT_SCOPE`.** Time is forced to `"00:00"`; `FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT = true` forces `lat = long = 0` so everything is UTC midnight. `Y = round(Δms / 86 400 000, 1)`. `z_date_native_start == z_date_native_end`. Date filters use `<` / `==`. `day_scope_start_time_in_millis` is applied to the projecting anchor (this is the **only** scope that honours it, `operations.js:314-318`). |
| `"EVENT_SCOPE__MONTHS"` | **Hard-rejected**: `runOphisOnEvent` pushes `"Month-based projections may be supported in a future version."` and produces no Z-Dates. Downstream code paths for it exist (`xDateToNativeDate`, `xDateToInputElementValue` → `xDateToMonthYear`) but are unreachable via the engine. |
| `"EVENT_SCOPE__YEARS"` | Same, message `"Year-based projections may be supported in a future version."` |

`GLOBAL_DATE_SCOPE = EVENT_SCOPE__HH_MM` (because `FEATURE_FLAG__SHOW_LOCATION = true`) is defined at
`ophis_config.js:346` but is **not consulted by the engine** — the per-event `scope` is authoritative.

Display formats: `X_DATE_CAL_DISPLAY_FORMAT = "m/d/Y"`, `..__MONTHS = "m/Y"`, `..__YEARS = "Y"`,
`X_DATE_TIME_DISPLAY_FORMAT = "H:i"`, `X_DATE_MOMENT_PARSING_FORMAT = "YYYY-MM-DD HH:mm"`
(`ophis_config.js:275-283`).

### 8.2 `EVENT_TYPE__*` (`ophis_config.js:355-365`)

| Value | Effect |
|---|---|
| `"EVENT_TYPE__PERSONAL"` | `DEFAULT_EVENT_TYPE`. Skin `SKIN_MODE__CLASSIC`, header `img/header.png`, title `"Ophis v12.0"`. |
| `"EVENT_TYPE__MARKETS"` | Skin `SKIN_MODE__MARKETS`, header `img/header_markets.png`, title `"Ophis Market Prediction Platform"`. |
| `"EVENT_TYPE__ASTROLOGICAL"` | **Commented out of the `EVENT_TYPES` array** (`ophis_config.js:363`), so it fails `ensureValidEventType` and gets rewritten to `EVENT_TYPE__PERSONAL` (or errors in STRICT mode). The skin branch still exists (`ophis_view.js:35-36`, title `"Ophis Astrology Platform"`). |

**`type` has ZERO effect on projection, scoring, filtering or sorting.** It is purely cosmetic
(`setSkinModeBasedOnCurrentEventType`, `ophis_view.js:27-40`) and is deleted entirely on minified
save (`validation.js:548`, with the TODO *"May need to get rid of this regardless as it never came to
anything."*).

---

## 9. T-Dates

* **Shape:** identical to an X-Date (`{date, time, enabled}`), stored in `isoEvent.t_dates`.
  `INPUT_DATE_TYPE__T_DATE = "INPUT_DATE_TYPE__T_DATE"` vs
  `INPUT_DATE_TYPE__X_DATE = "INPUT_DATE_TYPE__X_DATE"` (`ophis_config.js:57-58`) selects the array
  in the shared add/edit UI (`ophis_controller.js:266`, `:354`).
* **They never generate anything.** T-Dates are not paired, do not produce Y, and are not projected.
  `generateYAndZStructs` never reads `t_dates`.
* **They act as a whitelist filter** (§7.2 filter #5). When at least one T-Date is enabled, only
  Z-Dates that coincide with a T-Date survive. Zero enabled T-Dates → the gate is inert.
* **Validation is more permissive** than for X-Dates: `smoothOutTDatesForLoadedEvent`
  (`validation.js:868-883`) walks the array **backwards** and simply splices out any T-Date that
  fails to parse (with `console.warn`), whereas X-Dates go through spread validation, minimum-count
  checks and `MINIMUM_DAYS_BETWEEN_*` rules. There is no minimum T-Date count and no spread rule.
* **Timezone inconsistency** — see **G7**.
* Missing/malformed `t_dates` becomes `[]` on load (`validation.js:959`); an empty array is dropped
  on minified save (`validation.js:527-529`).

---

## 10. Location: `lat`, `long`, `location_enabled`

`DEFAULT_LAT = 32.8`, `DEFAULT_LONG = -96.8` (`ophis_view__config.js:40-41` — Dallas, TX).
Limits `LAT_LIMIT = 65`, `LONG_LIMIT = 180` (`ophis_config.js:426-427`); the source comment explains
the 65° cap: *"Every sunset calculation library I've tested starts freaking out once you get too
arctic!"*. `constrainLatOrLongValue` clamps and rounds to `DECIMAL_PRECISION__LOCATION = 1`
(`ophis_utils.js:622-640`).

**What lat/long actually affect:**

1. **X-Date and T-Date → instant conversion.** `xDateToNativeDate` passes lat/long to
   `convertStandardLocalDateStringToNativeUtcDate` (`ophis_dependencies.js:253-269`), which does
   `getTimezone(lat, long)` (a `tzlookup` call) and `moment.tz(standardString, timezone).utc()`.
   If lat/long are invalid/`null` it falls back to `moment(str, "YYYY-MM-DD HH:mm")` in the
   **browser's** timezone.
2. **Sunset computation** — every `getSunsetNativeUtcDate{Before,After}` call, hence `Y` in HH:MM
   scope and the [start,end) Z window in HH:MM scope. Sunset libraries in preference order:
   `CosineKitty` (astronomy-engine) → `Meeus` → `SunCalc` (`ophis_dependencies.js:52-56`), with
   `DEFAULT_HEIGHT_IN_METERS_FOR_SUN_CALC = 2`.
3. **Readable-string rendering** — `nativeDateToReadableString_dateOnly/_timeOnly` render in the
   lat/long timezone when `isValidLatAndLong(lat, long)`, else in the browser's local timezone
   (`ophis_view__strings.js:171-217`).

**What `location_enabled` affects:** *nothing in the engine.* `runOphisOnEvent`, `runOperations`,
`filterZDates` never read it — they always pass `isoEvent.lat` / `isoEvent.long`. It is a UI
enable/disable flag for the lat/long inputs (`ophis_view.js:775-797`) plus a normalisation hook:

* `toggleIsoEventLocationEnabled(isoEvent, enabled)` (`ophis_view__rebuild.js:226-232`) sets the flag
  **and unconditionally resets `lat = 0; long = 0`**, whether enabling or disabling.
* Changing scope to `EVENT_SCOPE__HH_MM` calls it with `true`; any other scope calls it with `false`
  (`ophis_view__rebuild.js:461-465`).
* Load-time (`parseLatLongForLoadedIsoEvent`, `validation.js:692-747`): non-HH:MM scope →
  `toggleIsoEventLocationEnabled(isoEvent, false)` (⇒ lat/long zeroed); HH:MM scope →
  `location_enabled = true` forced, with the comment *"if HH:MM scope is set, location must also be a
  factor. It can't be selectively turned on and off directly."* Missing lat/long then default to
  `DEFAULT_LAT`/`DEFAULT_LONG` — but note that `toggleIsoEventLocationEnabled` already wrote `0`, and
  `0` is not "null/undefined/empty string", so **for non-HH:MM events lat/long always end up `0/0`.**
* Minified save deletes `location_enabled`, `lat`, `long` entirely for `EVENT_SCOPE__DAYS`
  (`validation.js:550-554`).
* The location-enabled checkbox is present in the DOM (`class='location_enabled_checkbox'`) but is
  **not rendered** in the current row markup — the line that included it is commented out
  (`ophis_view__rebuild.js:268-269`), so the only way to flip it is by changing scope.

Bottom line for a reimplementation: **treat `location_enabled` as `scope === EVENT_SCOPE__HH_MM`,
and treat `lat/long` as meaningful only in HH:MM scope.**

---

## 11. Complete constant reference used by this subsystem

```
MINIMUM_NUMBER_OF_X_DATES                    = 2         config.js:16
MINIMUM_X_DATES_REQUIRED                     = 2         config.js:93   (unused by the engine)
MINIMUM_OPERATIONS_REQUIRED                  = 1         config.js:96
MINIMUM_DAYS_BETWEEN_FIRST_TWO_X_DATES       = 1         config.js:91   (was 6 pre-Telegram-release)
MINIMUM_DAYS_BETWEEN_SUBSEQUENT_X_DATES      = 1         config.js:92
MAX_CALENDAR_YEAR                            = 9999      config.js:94
MAXIMUM_ROTATION_COUNT_Y                     = 36500     config.js:20
MAXIMUM_ROTATION_COUNT_Z                     = 36500     config.js:21
MILLIS_PER_MINUTE                            = 60000     config.js:98
MILLIS_PER_HOUR                              = 3600000   config.js:99
MILLIS_PER_DAY                               = 86400000  config.js:100
SYNODIC_MONTH                                = 29.53058770576             config.js:102
ALREADY_CALCULATED_SUNSET_TOLERANCE_IN_MILLIS= MILLIS_PER_HOUR            config.js:117
HIGHEST_MSRF_NUMBER                          = 2559      config.js:119
VORTEX_FILTER_MATCH_TOLERANCE                = 0.1       config.js:367
DECIMAL_PRECISION__TIME                      = 2         config.js:369
DECIMAL_PRECISION__LOCATION                  = 1         config.js:370
DECIMAL_PRECISION__AXIAL_ROTATIONS           = 1         config.js:371
DECIMAL_PRECISION__SCORE                     = 2         config.js:372
SAMPLE_Y_VALUE_FOR_VALIDATION                = 10        config.js:422
LAT_LIMIT / LONG_LIMIT                       = 65 / 180  config.js:426-427
DEFAULT_HEIGHT_IN_METERS_FOR_SUN_CALC        = 2         config.js:428
DEFAULT_DAY_SCOPE_START_TIME_MILLIS          = 0         config.js:352
DEFAULT_EVENT_SCOPE                          = EVENT_SCOPE__DAYS          config.js:350
DEFAULT_EVENT_TYPE                           = EVENT_TYPE__PERSONAL       config.js:359
DEFAULT_SCORING_SYSTEM                       = SCORING_SYSTEM__GTE_V8     config.js:50
DEFAULT_Z_DATE_SORT_TYPE                     = Z_DATE_SORT_TYPE__DATE     config.js:445
TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE         = "00:00"   config.js:271
HOURS_IN_DAY_TO_USE_WITHOUT_HH_MM_SCOPE      = 0         config.js:270
DATE_DELIMITER / STANDARD_DATE_DELIMITER     = "/" / "-" config.js:273-274
STARTING_X1 / STARTING_X2                    = "STARTING_X1" / "STARTING_X2"   config.js:430-431
OPERATION_SHORTHAND / X_DATE_SHORTHAND / Z_DATE_SHORTHAND = "O" / "X" / "Z"    config.js:463-465
POINTS__ALPHA_OPERATION_MATCH                = 1         params.js:2
POINTS__BETA_OPERATION_MATCH                 = 0.5       params.js:3
POINTS__IMPORTANT_MSRF_MATCH                 = 2         params.js:4
POINTS__NORMAL_MSRF_MATCH                    = 1         params.js:5
POINTS__VORTEX_MSRF_MATCH                    = 2         params.js:6
MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES = 2    params.js:7   *** DEAD — never read ***
SCORE_MULTIPLIER__NORMAL_MSRF_MATCH          = 1.5       params.js:10
SCORE_MULTIPLIER__IMPORTANT_MSRF_MATCH       = 2.0       params.js:11
SCORE_MULTIPLIER__VORTEX_MSRF_MATCH          = 2.0       params.js:12
OPH_PI / OPH_PHI / OPH_CRV / OPH_HEP         = 3.14 / 1.618 / 5.08 / 7.01     config.js:410-413
NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT = "No results. You probably have to loosen up a filter."
                                                          view__config.js:12
OPH_OUTPUT_ERROR_STATUS__NO_RESULTS      = "NO_RESULTS"       view__export.js:6
OPH_OUTPUT_ERROR_STATUS__GENERAL_FAILURE = "GENERAL_FAILURE"  view__export.js:7
```

Feature flags read by this subsystem (`ophis_config.js:287-319`; `isFlagEnabled(f)` is strictly
`f === true`, `ophis_utils.js:3-5`):

```
FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION          = true    -> OPH_* use "as spoken" values
FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT                     = true    -> DAYS scope pinned to lat=long=0
FEATURE_FLAG__SUNSET__ADD_Z_VALUE_TO_X_DATE_PRIOR_SUNSET= false   -> add Z to the exact X-Date
FEATURE_FLAG__SUNSET__CALCULATE_BEFORE_N_AFTER          = true    -> HH:MM Z-Dates are sunset windows
FEATURE_FLAG__SUNSET__FILTER_BASED_ON_PRIOR_SUNSET      = false   -> filters use the raw last X-Date
FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_INLINE   = true    (display only)
FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_IN_SEPARATE_COL = false
FEATURE_FLAG__USE_SUNSET_SAMPLING                       = true
FEATURE_FLAG__USE_PER_LIBRARY_SUNSET_CACHE              = true
FEATURE_FLAG__BEFORE_N_AFTER_SUNSET_CACHE               = false   *** disables the before/after cache ***
FEATURE_FLAG__SHOW_LOCATION                             = true
FEATURE_FLAG__SHOW_SCOPE                                = true
FEATURE_FLAG__ADD_INITIAL_X_DATES_TO_NEW_ISO_EVENTS     = false
FEATURE_FLAG__AUTO_FILL_X_DATES_DURING_FILE_LOAD        = false
FEATURE_FLAG__REQUIRE_SIGN_IN                           = false
```

---

## 12. GOTCHAS — things a naive reimplementation gets wrong

**G1 — `enabled` must be compared with `=== true`, but not everywhere.**
`getEffectiveXDateCount` (`operations.js:9`), the pairing guard (`operations.js:185`), `filterZDates`'s
last-X scan (`sorting.js:11`), the T-Date scan (`sorting.js:40`) and `getEffectiveOperations`
(`operations.js:33`) all use strict `=== true`. But `runOperations` uses
`if (ithOperation.enabled == false) continue;` (`operations.js:275`) and `validateXDateSpread` uses
`if (ithXDate.enabled == false) continue;` (`validation.js:201`). An `enabled` value of `1`, `"true"`
or `undefined` therefore behaves **differently in different places**. Load-time normalisation
(`validation.js:277-284`) papers over this for file input, but not for programmatic input.

**G2 — Operation uniqueness is checked against *all* operations, including disabled ones.**
`validateOperationString(eq, i, operationsCloned, …)` (`operations.js:36`) receives the full cloned
array. A **disabled** duplicate earlier in the list will invalidate a later **enabled** one, silently
removing it from projection (no `cached_operation_function`), while it still shows in the UI list.

**G3 — Operations that fail validation are still returned but never run.**
`getEffectiveOperations` pushes them regardless (`operations.js:39`), so `effective_operations` and
`operations` stay index-aligned, but `runOperations` skips them at line 279-285. Two consequences:
`enabledOperationCount` (which requires the cached function, `operations.js:99`) can be `0` while
`operations.length` is 16, producing `"At least 1 Operation is required."`; and
`getStartingX` can never return `null` inside `runOperations` in practice (a `null` start would throw
at `cloneNativeDate(null)`).

**G4 — `y_struct.rotation_count_y` and `operation_result.rotation_count_y` can disagree.**
`runOperations` clamps its *local* `axialRotationCountY` to 36500 (`operations.js:266-270`) and stamps
the clamped value onto every operation result (`:394`). `generateYAndZStructs` then builds the
y_struct from the **caller's unclamped** `rotationCountY` (`:205`). For spans over 100 years the two
fields differ.

**G5 — `runOperations` mutates its own `lat`/`long` parameters mid-loop.**
Lines 343-349 assign `lat = null; long = null;` (then `0/0` under
`FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT`) inside the per-operation loop. Under shipped flags this is
benign (the branch is only reached in DAYS scope, where lat/long are already 0/0), but if
`FEATURE_FLAG__SUNSET__CALCULATE_BEFORE_N_AFTER` were ever turned off, the **first** operation would
clobber lat/long for every subsequent operation in the same pair, corrupting all later sunset and
rendering calls. Reimplement with locals, not by reassigning parameters.

**G6 — The ".5 = no match" rule does not apply to Vortex numbers.**
`getMsrfMatch` scans Vortex *before* the `.endsWith(".5")` bail (`ophis_utils.js:180-205`). Since the
Vortex tolerance is `0.1` **inclusive**, `32.5` matches Vortex `32.6`, `43.4`/`43.6` match `43.5`
(and so does `43.5` itself, which would otherwise be rejected as a half-day), etc. The shipped
unit test only spot-checks `12.5 → null` and `12.4 → NORMAL` (`ophis_unit_tests.js:73-74`).

**G7 — T-Dates are converted without lat/long; X-Dates are not.**
`filterZDates` calls `xDateToNativeDate(isoEvent.scope, ithTDate)` (`sorting.js:41`) with no
`lat_nullable`/`long_nullable`, while X-Dates everywhere else are converted with
`isoEvent.lat, isoEvent.long`. In `EVENT_SCOPE__HH_MM` this means T-Dates are parsed in the
**browser's** timezone while X-/Z-Dates are parsed in the **event location's** timezone. This is a
genuine bug that shifts the T-Date whitelist by the UTC-offset difference. (In DAYS scope both paths
end at UTC midnight, so it is invisible there.)

**G8 — Two different "z date key" representations coexist.**
`tagZDates` keys the dictionary with `nativeDateToUtcMillis(z_date_native_start) + ""` — a **string**
(`operations.js:553`). `runOperations` stamps `z_date_dict_key: zDateNativeToMillis` — a **number**
(`operations.js:409`). `ophis_view__chart.js:396` stores the numeric one into
`highlighted_z_date_point` and later compares against dictionary keys. Any port must pick one and be
consistent, or preserve both.

**G9 — The `hash` / `hash_without_ordinal` fields are delimiter-free concatenations.**
`"" + i + "" + x1ms + "" + x2ms + "" + zms` (`operations.js:370`). Distinct tuples can in principle
collide (e.g. operation ordinal `1` + a timestamp beginning `7…` vs ordinal `17` + a timestamp
beginning `…`). The UI matches chart points to pills by exact string equality on this hash
(`ophis_view__output.js:329`, `ophis_view__chart.js:412`), so a collision would highlight the wrong
pill. Use a delimited or structured key.

**G10 — `sortZDates`' `OPERATIONS` branch is a copy-paste bug.**
```js
} else if ( actualSortTypeToUseForThisPair == Z_DATE_SORT_TYPE__OPERATIONS ) {
    if ( operationScore_a == operationScore_b ) {
        sortValueA = operationCount_a; sortValueB = operationCount_b;
    } else {
        sortValueA = operationCount_a; sortValueB = operationCount_b;   // <-- should be operationScore
    }
```
(`sorting.js:268-277`.) Sorting by "Operations" therefore always sorts by **operation hit count**,
never by weighted operation score, despite the tie-break pre-pass at `:244` explicitly testing
`operationScore_a == operationScore_b`.

**G11 — The sort comparator never returns 0 and is not a consistent ordering.**
`(a > b ? -1 : 1)` (`sorting.js:284`) returns `1` for `cmp(a,b)` *and* `1` for `cmp(b,a)` when
`a === b`. `Array.prototype.sort` with an inconsistent comparator has implementation-defined
behaviour; V8's TimSort will not crash but the relative order of equal elements is arbitrary and can
change with array length. If you need bit-identical output to the original you must reproduce this
comparator **and** V8's sort; otherwise return `0` on ties and accept small ordering differences.

**G12 — `newOperation` ignores its `enabled` argument** (see B1, `ophis_utils.js:1006-1012`). The
"disabled by default" hepta-cycle operation at `ophis_model__params.js:109` is in fact enabled.

**G13 — mathjs pre-validation is weaker than the real function.**
`stripOperationEquationString` deletes `oph_*` names but keeps the parens, so
`oph_flip(oph_round(Y))` is validated as `((10))`. The real behaviour of `oph_flip` (digit reversal)
is never exercised by validation. Also, validation only ever tries `Y = 10`
(`SAMPLE_Y_VALUE_FOR_VALIDATION`), so an operation that is positive at Y=10 but zero/negative at real
Y (e.g. `X1+oph_flip(Y)` at Y=100 → `1`; anything subtractive) passes validation and can project
Z-Dates **before** the anchor. There is no lower clamp on Z (`operations.js:289` only clamps the
upper bound).

**G14 — `normalizeOperationEquationString` is called on the hot path.**
`getStartingX(ithOperation.equation)` at `operations.js:301` re-normalizes (uppercase pass, `x`→`*`,
four constant substitutions, lowercase pass) on **every pair × every operation**. With 5 X-Dates and
16 operations that is 160 normalizations per run. Hoist it.

**G15 — Constant substitution is textual and order-dependent.**
`ALL_OPH_CONSTANTS` is scanned in the order `["OPH_PI","OPH_PHI","OPH_CRV","OPH_HEP"]`
(`ophis_config.js:415-420`) and each is `replaceAll`'d with `window[name]`. `"OPH_PI"` happens *not*
to be a substring of `"OPH_PHI"`, so nothing breaks today — but adding a constant like `OPH_P` would
silently corrupt every other one. Also `window[…]` means a module-scoped port must supply an explicit
lookup table. (`ophis_view__strings.js:50-56`'s `replaceOperationConstants` is a *different*,
display-only routine that uses `replace` — first occurrence only — and handles only PI/PHI/CRV, not
HEP.)

**G16 — `filterZDates` compares `Date` objects against numbers.**
`nativeUtcDateZInMillis_start` / `_end` hold `Date` objects despite their names
(`sorting.js:66-67`). The relational comparisons work only because JS coerces via `valueOf()`. Note
that the `==` comparisons in the non-HH:MM branches use the separate genuinely-numeric
`nativeUtcDateToUseForZInMillis`; if you naively unify the variables you can end up with
`Date == number`, which is `false` for identical instants. Convert everything to millis up front.

**G17 — `getIsoEventFilterNumbericValue` silently substitutes the default for negative values,
and returns `-1.0` for an unknown field name.** A user entering `-1` in "beyond N days" gets 2559,
not −1 (`ophis_utils.js:99-108`). Also note the misspelled function name (`Numberic`).

**G18 — `isObjectString` uses a bitwise `&`.**
`if ( object != null & object != undefined && typeof object === "string" )`
(`ophis_utils.js:272`). It happens to still behave correctly because the `typeof` guard dominates,
but do not copy the expression.

**G19 — `findAlreadyCalculatedSunset` makes the run order-dependent.**
The `alreadyCalculatedSunsets` array is shared across all pairs and operations
(`operations.js:175`, `:331-332`) and snaps any sunset within **one hour** of a previously seen one.
Change the pair iteration order and you can change which sunsets win, which changes the dedup keys,
which changes the Z-Date set. Only affects `EVENT_SCOPE__HH_MM`.

**G20 — Scoring runs on the error paths too.**
`scoreZDates` at `operations.js:129` is outside the `if/else` cascade. Harmless (empty dict) but a
port that moves it inside the success branch is *more* correct, not less.

**G21 — `sortAndFilterResults` reads global `appState`.**
`getCurrentLocalTime(appState.globalOptions.local_time_offset_in_millis)` (`operations.js:156`) is the
only global read in the pipeline. Everything else is a pure function of `isoEvent` plus the module
constants and the sunset caches. Inject the "now" value to make the engine testable.

**G22 — `MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES = 2` is dead.** Declared at
`ophis_model__params.js:7` and never read anywhere in `src/`. It presumably encoded an older scoring
rule ("two beta hits are needed if nothing else matched") that no longer exists. Do not implement it.

**G23 — `runOperations`' MONTHS/YEARS path leaves the readable strings empty.**
Lines 372-390 only handle `EVENT_SCOPE__HH_MM` and `EVENT_SCOPE__DAYS`. Unreachable today, but if you
ever enable month/year scopes you must add those branches or every Z-Date renders blank.

**G24 — `runOperationFunction` is not part of the pipeline.**
Defined at `operations.js:220-226`, its only caller is the settings/preview UI
(`ophis_view__settings.js:602`). The real pipeline calls `cached_operation_function` directly at
`operations.js:287` and does its own rounding. Do not route production projection through it.

**G25 — `NaN` / `Infinity` z-values are never guarded.**
`runOperations` checks only `ithZValue_raw > MAXIMUM_ROTATION_COUNT_Z` (`operations.js:289`). `NaN`
fails that test, survives every subsequent step, and collapses into a single dictionary bucket keyed
`"NaN"` (see §4.4). `-Infinity` (from `oph_log(0)`) produces `new Date(-Infinity)` → Invalid Date →
key `"NaN"` as well. Add an `Number.isFinite(z)` guard in any rebuild.

**G26 — the entire pipeline mutates the input `isoEvent`.**
`runOphisOnEvent` writes `isoEvent.effective_operations` (`operations.js:92`); `getOperationScore`
writes `.points` onto every operation-match struct (`:538`); `sortAndFilterResults` writes
`z_ordinal` onto every surviving z_struct (`:163`); `sortMsrfMatches`/`sortOperationMatches` sort the
match arrays in place. Callers must strip `effective_operations` before serialisation
(`sanitizeIsoEventsForSaveOperation`, `validation.js:472`) or it leaks into the `.oph` file.

---

## 13. Reference pseudocode (whole subsystem, shipped flag values baked in)

```
runOphis(isoEvent, nowMillis):
    errors = []; yStructs = []; zStructs = {}

    enabledXCount = count(x in isoEvent.x_dates where x.enabled === true)
    effOps = compileOperations(isoEvent.operations)          # §4, index-aligned, all pushed
    isoEvent.effective_operations = effOps
    runnableOps = count(o in effOps where o.enabled === true and o.fn)

    if enabledXCount < 2:                errors += "At least 2 X-Dates are required."
    elif scope == MONTHS:                errors += "Month-based projections may be supported in a future version."
    elif scope == YEARS:                 errors += "Year-based projections may be supported in a future version."
    elif runnableOps < 1:                errors += "At least 1 Operation is required."
    elif not validateXDateSpread(...):   errors = spreadErrors
    else:
        snappedSunsets = []
        for i in 1 .. len(x_dates)-1:
            for k in 0 .. i-1:
                if not (x_dates[k].enabled === true and x_dates[i].enabled === true): continue
                X1 = toInstant(x_dates[k]); X2 = toInstant(x_dates[i])
                Y  = axialRotations(scope, X1, X2, lat, long)
                results = runOperations(effOps, scope, X1, X2, Y, lat, long, snappedSunsets,
                                        dayScopeStart)
                y = { y_ordinal: len(yStructs), rotation_count_y: Y,
                      x_1_ordinal: k, x_2_ordinal: i, operation_results: results }
                for r in results:
                    key = str(r.z_date_native_start.getTime())
                    z = zStructs.setdefault(key, newZStruct(r))
                    z.operation_match_structs.append({y_struct: y, operation_result: r})
                    m = msrfMatch(r.rotation_count_z)
                    if m: m.y_struct = y; m.operation_result = r
                          z.msrf_match_structs.append(m)
                yStructs.append(y)

    scoringSystem = isoEvent.scoring_system in SCORING_SYSTEMS ? it : "SCORING_SYSTEM__GTE_V8"
    for z in zStructs.values():                                     # §6.2
        sortOperationMatches(z.operation_match_structs)
        sortMsrfMatches(z.msrf_match_structs)
        opScore  = sum(effOps[m.operation_result.operation_ordinal].weight
                       for m in z.operation_match_structs)   # also writes m.points
        mult     = max([multiplierOf(m.msrf_filter) for m in z.msrf_match_structs] + [1.0])
        msrfSub  = sum(m.points for m in z.msrf_match_structs)
        if scoringSystem == "SCORING_SYSTEM__GTE_V8" and z.msrf_match_structs:
            msrfSub -= z.msrf_match_structs[0].points        # index 0 == the max-multiplier one
        base = opScore + msrfSub
        z.operation_score     = opScore
        z.operation_hit_count = len(z.operation_match_structs)
        z.base_score_pre_multiply = base
        z.score     = round2(base * (scoringSystem == "SCORING_SYSTEM__GTE_V8" ? mult : 1))
        z.hit_count = len(z.operation_match_structs) + len(z.msrf_match_structs)

    results = { errors, y_structs: yStructs, z_structs: zStructs,
                selected_y_struct_for_details: 0 }
    if errors: results.processed_z_dates = results.processed_z_dates__sorted_by_date = []
    else:
        keys       = filterZDates(isoEvent, zStructs, nowMillis)      # §7.2
        byDate     = sortZDates(keys, zStructs, "SORT_TYPE__DATE", scoringSystem)
        for idx, k in enumerate(byDate): zStructs[k].z_ordinal = idx
        results.processed_z_dates = (isoEvent.z_date_sort_type == "SORT_TYPE__DATE")
                                  ? copy(byDate)
                                  : sortZDates(keys, zStructs, isoEvent.z_date_sort_type, scoringSystem)
        results.processed_z_dates__sorted_by_date = byDate
    return results
```

---

## 14. Cross-module dependencies not defined in the assigned file

Named here rather than guessed at; each is defined in the file cited.

| Symbol | Defined in |
|---|---|
| `validateOperationString`, `normalizeOperationEquationString`, `validateXDateSpread`, `isValidNativeDate`, `validateXDateCalendarDate`, `validateXDateTime`, `isValidLatAndLong` | `src/ophis_model__validation.js` |
| `filterZDates`, `sortZDates`, `sortMsrfMatches`, `sortOperationMatches` | `src/ophis_model__sorting.js` |
| `getMsrfMatch`, `axialRotationsBetweenNativeDates`, `roundNumberToTimePrecision`, `roundNumberToAxialRotationPrecision`, `roundNumberToPrecision`, `numbersEqualWithinTol`, `areEqualWithinTolerance`, `nativeDateToUtcMillis`, `utcMillisToNativeDate`, `xDateToNativeDate`, `getSunsetNativeUtcDate{Before,After}_withCache`, `getCurrentLocalTime`, `deepClone`, `isFlagEnabled`, `isNonNegIntOrStringThereof`, `isObjectString`, `isIsoEventFieldEnabled`, `getIsoEventFilterNumbericValue`, `newOperation`, all `oph_*` | `src/ophis_utils.js` |
| `newXDate`, `cloneNativeDate`, `nativeDateToXDate`, `nativeDateToReadableString_dateOnly`, `nativeDateToReadableString_dateAndTime`, `convertHtmlToPlainText`, `getRowShortNameHtml` | `src/ophis_view__strings.js` |
| `convertStandardLocalDateStringToNativeUtcDate`, `getTimezone`, `getSunsetOnNativeUtcDate`, `SUNSET_LIBRARIES` | `src/ophis_dependencies.js` |
| `createNewIsoEvent`, `addXDate`, `addOperation` | `src/ophis_controller.js` |
| `NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT`, `DEFAULT_LAT`, `DEFAULT_LONG` | `src/ophis_view__config.js` |
| `OPH_OUTPUT_ERROR_STATUS__*`, `OPH_OUTPUT_NONE_KEYWORD` | `src/ophis_view__export.js` |
| `printWarning`, `printError`, `print` | `src/ophis_logging.js` |
| `appState`, `isRunningHeadless` | `src/ophis_main.js` |
| `math` (mathjs) | `lib/math.js` |
| `moment` / `moment.tz` | `lib/moment-with-locales.min.js`, `lib/moment-timezone-with-data.js` |
| `tzlookup(lat, long)` | `lib/tz_lookup_oss.js` (returns `"Etc/GMT"` at 0,0) |
| `Astronomy.Observer` / `Astronomy.SearchRiseSet` | `lib/astronomy.browser.min.js` |
| `getSunTimesMeeus` | `lib/meeus-easy.js` / `lib/meuusjs.1.0.3.min.js` |
| `SunCalc.getTimes` | `lib/suncalc.js` |
| `sha512`, jQuery + tipsy | `lib/sha512.min.js`, `lib/jquery.min.js`, `lib/jquery.tipsy.js` |
