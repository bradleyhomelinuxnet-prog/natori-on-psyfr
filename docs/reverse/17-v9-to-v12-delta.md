# 17 · The Ophis v9 → v12 delta

Implementation-grade diff of the two shipped, unpacked Electron trees.

| | Path |
|---|---|
| **v9** | `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/reference/asar9/unpacked` |
| **v12** | `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/reference/asar/unpacked` |

All line citations below are **absolute line numbers in the file named**, in the tree named.
Nothing in this document was executed; both `.exe`s were left alone and only the unpacked bytes were
read.

One useful control fact established while doing this: the v12 unpacked `src/ophis_model__params.js`
is **byte-identical** to `Ophis_v12_Browser/src/ophis_model__params.js`. The "browser study folder"
*is* v12. There is no third variant.

---

## 1 · File-level summary

### 1.1 Root

| File | v9 bytes | v12 bytes | Verdict |
|---|---:|---:|---|
| `README.txt` | 829 | 829 | **identical** |
| `main.js` | 13 373 | 22 008 | changed (350 changed lines) |
| `ophis.html` | 28 140 | 39 970 | changed (161) |
| `package.json` | 103 | 412 | changed |
| `preload.js` | 678 | 1 306 | changed |

### 1.2 `src/`

| File | v9 | v12 | Δ lines | Verdict |
|---|---:|---:|---:|---|
| `ophis_logging.js` | — | 1 926 | +71 | **ADDED** |
| `ophis.css` | 15 844 | 17 541 | 63 | changed |
| `ophis_config.js` | 18 407 | 20 686 | 87 | changed |
| `ophis_controller.js` | 13 572 | 18 663 | 230 | changed |
| `ophis_dependencies.js` | 7 047 | 10 567 | 118 | changed (rewritten) |
| `ophis_main.js` | 19 733 | 29 009 | 288 | changed |
| `ophis_model__operations.js` | 20 071 | 24 214 | 192 | changed |
| `ophis_model__params.js` | 6 201 | 6 642 | 13 | changed |
| `ophis_model__persistence.js` | 12 370 | 13 212 | 22 | changed |
| `ophis_model__sorting.js` | 13 015 | 14 895 | 49 | changed |
| `ophis_model__validation.js` | 30 268 | 48 431 | 601 | changed (largest) |
| `ophis_unit_tests.js` | 2 626 | 4 205 | 34 | changed |
| `ophis_utils.js` | 27 028 | 34 923 | 286 | changed |
| `ophis_view.js` | 31 141 | 38 298 | 218 | changed |
| `ophis_view__chart.js` | 31 258 | 31 847 | 41 | changed |
| `ophis_view__chart_config.js` | 8 060 | 8 060 | 0 | **identical** |
| `ophis_view__chart_datasets.js` | 66 443 | 64 383 | 61 | changed |
| `ophis_view__config.js` | 3 914 | 10 498 | 157 | changed |
| `ophis_view__export.js` | 21 971 | 31 672 | 251 | changed |
| `ophis_view__output.js` | 50 305 | 51 103 | 40 | changed |
| `ophis_view__rebuild.js` | 34 170 | 47 187 | 452 | changed |
| `ophis_view__settings.js` | 16 250 | 47 213 | 782 | changed (largest %) |
| `ophis_view__strings.js` | 9 707 | 11 595 | 56 | changed |
| `ophis_view__utils.js` | 25 673 | 35 124 | 292 | changed |
| `scratchpad.js` | 55 | 114 | 1 | changed (comment only) |

**Nothing was removed from `src/`.** Every v9 file survives into v12.

### 1.3 `lib/` and `img/`

`diff -rq` over both directories:

```
Only in asar/unpacked/lib:  suncalc.js          (9 285 bytes)
Only in asar/unpacked/img:  notes_icon.png      (4 027 bytes)
Only in asar/unpacked/img:  notes_icon_orig.png (3 115 bytes)
```

Every other vendored library — `astronomy.browser.min.js`, `chart.js`, `flatpickr`, `jquery`,
`jspdf`, `leaflet`, `luxon`, `math.js`, `meuusjs`, `moment*`, `papaparse`, `purify.min.js`,
`sha512.min.js`, `write-excel-file`, the two 5–6 MB eclipse blobs, `lunar.csv`, `solar.csv`,
`tz_lookup_oss.js` — is **byte-identical** across the two versions. No dependency was upgraded.
Both `notes_icon*.png` files are **dead assets** in v12 (see §6.3).

Note that `astronomy.browser.min.js` was already *present* in v9's `lib/` (116 496 bytes, identical)
but was **not loaded** — v9's `ophis.html` had its `<script>` tag commented out. v12 turns it on.
That single change is the largest behavioural difference in the whole delta (see §2.5).

---

## 2 · What actually changed, by subsystem

### 2.1 Electron main process (`main.js`)

v9's `main.js` is a 13 KB single-purpose launcher. v12's is a 22 KB launcher *plus* a CLI batch
driver. The additions:

**Argument parsing (v12 `main.js:11-23`, `35-111`).** v9 had exactly one arg helper,
`getFilePathFromArgs(inputArgs)` (`main.js:20-33`), which sliced `app.isPackaged ? 1 : 2` and
returned the first argument ending in `.oph`. v12 factors that into
`getNormalizedArgsArray(argv)` (`main.js:39-51`, now deep-cloning `process.argv` captured once into
`originalArgV` at `main.js:23`) and adds:

- `hasArgFlagDeclared(flagNameWithDashes, argv, normalize)` (`main.js:67-86`) — exact match, or
  prefix match when the flag name ends in `*`.
- `isRunningDebug(argv = originalArgV)` (`main.js:88-91`) — `--inspect*`, **normalize = false**, so
  it scans raw `process.argv` including `argv[0]`.
- `isRunningHeadless(argv = null)` (`main.js:93-95`) — `--headless`.
- `getArgFlagValue(flag, defaultValue, argv)` (`main.js:97-111`) — returns the *next* argument.

**The CLI surface (v12 `main.js:489-529`).** On `ready`:

| Flag | Variable | Default | Read at |
|---|---|---|---|
| `--headless` | (predicate) | off | `main.js:93` |
| `--output-type` | `headlessOutputType` | `"csv"` | `main.js:490` |
| `--output-path` | `headlessOutputPath` | `""` | `main.js:491` |
| `--input-validation-mode` | `inputValidationMode` | `""` | `main.js:492` |
| `--current-epoch-millis` | `headlessCurrentEpochMillis` | `""` | `main.js:493` |
| `--multiple-files` | `headlessMultipleFiles` | `false` | `main.js:494` |
| `--inspect…` | debug | off | `main.js:88` |

`--output-type` is parsed but **only `csv` is implemented** (`ophis_view__export.js:174-182`);
anything else warns and falls back to CSV.

**Exit codes (v12 `main.js:13-14`, `142-155`).** New:

```js
var STATUS_CODE__SUCCESS = 0;
var STATUS_CODE__ERROR = 1;
```

`exitAppWithStatusCode(statusCode)` removes the `before-quit` / `close` / `beforeunload`
interceptors, prints a blank line, then `app.exit(statusCode)`. v9 had this logic inline inside the
`confirmCloseApp` handler and always called bare `app.exit()`.

**Single-instance lock (v12 `main.js:219-226`).** v9:

```js
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) { app.quit(); }
```

v12:

```js
const gotSingleInstanceLock = isRunningHeadless() ? false : app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  if ( isRunningHeadless() === false ) {
    app.quit();
  }
}
```

Headless instances deliberately never take the lock. The code comment (`main.js:236-239`) explains
why: taking it "turned out to stall the execution by several seconds." The consequence is that
**N concurrent headless runs are permitted**, but a headless run started while a GUI instance holds
the lock also does not hand its file to the GUI — it runs its own hidden window.

**Window creation (v12 `main.js:350-378`).** `show: showWindow` was added to the `BrowserWindow`
options. `showWindow` is false only when `--headless` is set *and* `--inspect` is not
(`main.js:351-359`). A `did-fail-load` listener was added (`main.js:380-394`) that logs and does
nothing else — its redirect body is commented out, so it is a pure diagnostic.

**Query-string handoff (v12 `main.js:415-433`).** v9 loaded `file://…/ophis.html` with no query.
v12 loads `urlToOpen` (`main.js:11`, still `"ophis.html"`) with:

```js
var urlQueryParams = {
  headless: isRunningHeadless(),
  headless_output_type: headlessOutputType,
  headless_output_path: headlessOutputPath,
  headless_multiple_files: headlessMultipleFiles,
  input_validation_mode: inputValidationMode
};
if ( headlessCurrentEpochMillis ) {
  urlQueryParams.headless_current_epoch_millis = headlessCurrentEpochMillis;
}
```

The renderer reads these back through `getQueryParamBool/String/Int`
(`ophis_utils.js:840-878`, all new) in `init_step1_getAppVersion`.

**`init()` result handling (v12 `main.js:442-471`).** v9 fired `executeJavaScript('init();')` and
ignored the promise. v12 attaches `.then`/`.catch`; on rejection, `onProblemExecutingInit` calls
`exitAppWithStatusCode(STATUS_CODE__ERROR)` unless running under `--inspect`. This is what makes a
renderer-side crash a non-zero CLI exit status.

**`saveToFile` now creates directories (v12 `main.js:267-273`).** New at the top of the function:

```js
var dirName = path.dirname(filePath);
if (!fs.existsSync(dirName)){
    fs.mkdirSync(dirName, { recursive: true });
}
```

v9 would simply fail the write. See §7 for why this matters.

**Menu (v12 `main.js:591-724`).** `refreshMenu(signedIn)` becomes
`refreshMenu(signedIn, operationsColVisibleChecked, prettifyOphFilesChecked, minifyOphFilesChecked)`.

- **File menu gains** a separator, `Prettify .oph Files` (checkbox → `togglePrettifyOphFiles()`),
  `Minify .oph Files` (checkbox → `toggleMinifyOphFiles()`), another separator, and
  `Reset Program` (→ `factoryReset()`).
- **View menu loses** `Reset Program` (it moved to File) and its
  `Toggle Operations Col Visible` item is renamed to `Operations Col Visible` and converted from a
  plain item to a `type: 'checkbox'` whose `checked` reflects `operationsColVisibleChecked`.

**`logToRenderer` is muted when headless (v12 `main.js:575-587`)** — it still `console.log`s to the
parent process, but skips the `executeJavaScript('console.log(…)')` round-trip.

### 2.2 Preload / IPC

v9's `preload.js` exposed six methods. v12 adds five (`preload.js:22-36`):

| Method | Channel | Main-process handler |
|---|---|---|
| `logToCli(message)` | `logToCli` | `main.js:201-203` — `console.log(message)` |
| `closeAppWithHeadlessError()` | `closeAppWithHeadlessError` | `main.js:163-165` — exit(1) |
| `closeAppWithHeadlessSuccess()` | `closeAppWithHeadlessSuccess` | `main.js:167-169` — exit(0) |
| `resetProgram()` | `resetProgram` | `main.js:171-199` — `win.reload()` |
| `refreshMenuOptions(a, b, c)` | `refreshMenuOptions` | `main.js:210-213` — rebuild menu |

`contextBridge.exposeInMainWorld` is used in both versions. Neither version registers an
`ipcRenderer.on`/`invoke` — the bridge is strictly renderer → main, fire-and-forget.

### 2.3 Bootstrap (`ophis.html`)

| Change | Lines (v12) |
|---|---|
| `astronomy.browser.min.js` **uncommented and loaded** | 38 |
| `suncalc.js` **added** | 44 |
| Comment `<!-- FEATURE_FLAG__USE_COSINE_KITTY_ASTRONOMY -->` removed | — |
| `<meta http-equiv="Content-Security-Policy" …>` added **after** all `<script src>` tags | 72 |
| `?` help buttons on Iso-Events / X-Dates / Filters panels | 103, 165, 291 |
| `Reset` buttons on Iso-Events and X-Dates panels **commented out**, replaced by a ✖ `row_delete_button_master` in the column header | 111-113, 168-170, 135-137, 187-189 |
| **New T-Dates panel** — `#t-date-container`, `#add-t-date-button`, `#reset-t-dates-button`, `#t-dates-help-button` | 318-364 |
| **New Recalc bar** — `#z-dates-up-to-date`, `#recalculate-z-dates-button`, `#auto-recalculate-z-dates-container` | 202-224 |
| **New Notes pop-up** — `#notes-pop-up-wrapper` with Clear/Done buttons and a textarea | 464-503 |
| `#panel-cell-with-table-output-for-events` id added | 92 |
| Header text: "Output Filters" → "Filters", "Chart Options" → "Chart Config" | 287, 372 |
| `ophis_logging` prepended to the `srcFiles` load list | 519 |
| Each injected `<script>` now also gets `.defer = true` (it already had `.async = false`) | 548 |

The `srcFiles` order in v12 is `ophis_logging` first, then the v9 order unchanged. `ophis_logging.js`
must load first because `toggleConsoleLogOverride()` is called before anything else in
`init_step1_getAppVersion` (`ophis_main.js:59`).

### 2.4 Engine — operations & scoring (`ophis_model__operations.js`)

**Results now include sorting and filtering.** In v9 `runOphisOnEvent` returned raw
`z_structs` and the *view* (`ophis_view.js:220-238`) did the filtering, ordinal assignment and
sorting inline. v12 extracts that into `sortAndFilterResults(isoEvent, results)`
(`ophis_model__operations.js:153-171`) and calls it from `runOphisOnEvent` itself
(`:141-149`). The arithmetic is unchanged — same `filterZDates`, same `sortZDates`, same
`z_ordinal` assignment — but it now runs in the model, so headless mode and CSV export get the same
ordering the UI does. `results.processed_z_dates` is now a `deepClone` when the sort type is by date
(`:168`).

**Everything is wrapped in try/catch.** `runOphisOnEvent` (`:110-136`) now catches and pushes
`""+error` into `errors`. v9 would have thrown out to the caller.

**Errors no longer drop operations from the list.** v9's `getEffectiveOperations`:

```js
if ( validationErrors.length > 0 ) {
    // skip
} else {
    ithOperation.cached_operation_function = operationFunction;
    toReturn.push(ithOperation);
}
```

v12 (`:36-48`) pushes the operation **either way**, and also pushes disabled ones. The gate moved
down into `runOperations` (`:272-285`), which `continue`s on `enabled == false` or a missing
`cached_operation_function`. Consequence: **operation ordinals are stable in v12.** In v9, disabling
or breaking operation #4 renumbered #5…#15 down by one, changing every `OP…` label and every
`operation_ordinal` in the output. In v12 the indices are the raw array indices.

**Disabled X-Dates no longer compact the array.** v9 had `getEffectiveXDates(isoEvent)` returning a
new, compacted array. v12 replaces it with `getEffectiveXDateCount(isoEvent)` (`:2-15`) which only
counts, and every consumer now iterates the raw `isoEvent.x_dates` and skips
`enabled !== true` in place:

| Consumer | v9 | v12 |
|---|---|---|
| `generateYAndZStructs` | `getEffectiveXDates(isoEvent)` | `isoEvent.x_dates`, guarded by `kthXDate.enabled === true && ithXDate.enabled === true` (`:184`) |
| `validateXDateSpread` | compacted, `i-1` | raw, scans backwards for the previous *enabled* date and reports its true index (`ophis_model__validation.js:205-221`) |
| `filterZDates` | `xDateArray[len-1]` | explicit backwards scan for the last enabled (`ophis_model__sorting.js:7-15`) |
| chart X-Date points | `i+1` | `ithXDatePoint.ordinal`, computed only for enabled dates (`ophis_view__chart_datasets.js`) |

The **set of (X₁, X₂) pairs is identical** either way; only the labels and error text differ.

**Score is now rounded (`:454-456`).** New:

```js
var finalScoreRounded = roundNumberToPrecision(finalScore, DECIMAL_PRECISION__SCORE);
tagsDictForIthZDate.score = finalScoreRounded;
```

with `DECIMAL_PRECISION__SCORE = 2` (`ophis_config.js:372`, new). `base_score_pre_multiply` is
still stored unrounded. Everything upstream — `getOperationScore`, `sumUpMsrfMatchSubscore`,
`getMsrfScoreMultiplier`, `getMsrfScoreMultiplierForFilter` — is **byte-identical** between the two
versions. This is a pure output-rounding change, but it is a real one: it affects both display and
the "Score is below N" filter, because `filterZDates` reads `tagsDictForIthZDate.score`.

**Sunset lookups switched to the cached wrappers (`:311-312`, `:327-329`).**
`getSunsetNativeUtcDateBefore` → `getSunsetNativeUtcDateBefore_withCache`, and likewise `…After`.
Also, when the sunset feature flag is off, v12 now takes a **clone**:

```js
var dateToWhichToAddZValue_native = isFlagEnabled(FEATURE_FLAG__SUNSET__ADD_Z_VALUE_TO_X_DATE_PRIOR_SUNSET)
    ? getSunsetNativeUtcDateBefore_withCache(startingXDate_native, lat, long)
    : cloneNativeDate(startingXDate_native);
```

v9 aliased `startingXDate_native` directly. The clone is **required** by the new Day-Scope start-time
offset, which mutates that date in place (`:311-315`).

**Hash construction fixed (`:369-370`).** v9:

```js
var hashWithoutOrdinal = "" + dateToWhichToAddZValue_native.getTime() + zDateNativeToMillis;
var fullUniqueHash = "" + i + x1NativeDate.getTime() + x2NativeDate.getTime() + zDateNativeToMillis;
```

v12 inserts `""` between every component. Because all the operands after the first `""` are
**numbers**, v9's expression was already left-to-right string concatenation and produced the same
string. The change is cosmetic/defensive, not a behaviour fix.

**New: `runOphisOnEventForExport` and `newOphErrorObject` (`:53-83`).** Wraps `runOphisOnEvent`,
converts every error to `{error_status, error_message}` with the HTML stripped by
`convertHtmlToPlainText` (new, `ophis_view__strings.js:110-122`), and turns an empty result set into
an explicit `OPH_OUTPUT_ERROR_STATUS__NO_RESULTS` row. This is what headless CSV consumes.

### 2.5 Astronomy — the sunset library swap

This is the single largest *numeric* change in the delta and it is easy to miss because it hides in a
feature flag that was deleted.

**v9.** `ophis_config.js:284` declared `var FEATURE_FLAG__USE_COSINE_KITTY_ASTRONOMY = false;`, and
`ophis.html` had the corresponding `<script>` commented out. So v9's
`getSunsetOnNativeUtcDate_private` (`ophis_dependencies.js:9-45`) fell straight past the dead
CosineKitty branch into **Meeus** (`getSunTimesMeeus`), and on failure returned the input date
unchanged.

**v12.** The flag is gone. `ophis_dependencies.js` is rewritten around a
`newSunsetLibrary(name, enabled, execute)` record (`:3-11`) with three instances:

| Constant | Line | Backing library |
|---|---|---|
| `SUNSET_LIBRARY__COSINE_KITTY` | `:17-27` | `Astronomy.SearchRiseSet('Sun', observer, -1, date, 300)` |
| `SUNSET_LIBRARY__MEEUS` | `:30-40` | `getSunTimesMeeus(...).setJS` |
| `SUNSET_LIBRARY__SUN_CALC` | `:43-48` | `SunCalc.getTimes(...).sunset` — the newly-added `lib/suncalc.js` |

and `getSunsetOnNativeUtcDate` (`:57-68`) hard-codes **CosineKitty**:

```js
var nativeDateUtcSunset = getSunsetOnNativeUtcDate_fromLibraryOrItsCacheWithNearestMinuteRounding(SUNSET_LIBRARY__COSINE_KITTY, nativeUtcDate, lat, long);
// var nativeDateUtcSunset = ... (SUNSET_LIBRARY__MEEUS, ...);
// var nativeDateUtcSunset = ... (SUNSET_LIBRARY__SUN_CALC, ...);
```

**So: every HH:MM-scope sunset in v12 comes from CosineKitty; in v9 it came from Meeus.** For an
event with `scope == EVENT_SCOPE__HH_MM`, `axialRotationsBetweenNativeDates` uses prior-sunset
boundaries (`ophis_utils.js:906-913`), so **Y itself can differ** between v9 and v12 for the same
inputs. This is not a rounding difference; it is a different ephemeris.

Three defects live in this rewrite:

1. **`SUNSET_LIBRARIES` is not a fallback chain, despite its comment.** `ophis_dependencies.js:50-56`
   declares it as "In order of preference. If one library fails us for whatever reason … then we try
   the next one." `getSunsetOnNativeUtcDate` never iterates it. The array's *only* consumer is
   `getSunsetSampling` (`ophis_utils.js:346-375`), which does iterate it and does validate each
   sampling with `validateSunsetSequence`. So the fallback exists for *sampling* and not for
   *single-date lookup*. Single-date lookup just returns `nativeUtcDate` unchanged on failure
   (`ophis_dependencies.js:66`). The `enabled` field on every `newSunsetLibrary` record is set but
   **never read anywhere**.

2. **The "round before handing to the library" step is dead code.**
   `getSunsetOnNativeUtcDate_fromLibraryOrItsCacheWithNearestMinuteRounding`
   (`ophis_dependencies.js:70-93`) contains:

   ```js
   const nativeUtcDateCloned = new Date(nativeUtcDate.getTime());
   roundDateToNearestMinute(nativeUtcDateCloned);

   var nativeDateUtcSunset = getSunsetOnNativeUtcDate_fromLibraryOrItsCache(sunsetLibrary, nativeUtcDate, lat, long);
   ```

   `nativeUtcDateCloned` is computed and then never used — the **unrounded** date goes to the library
   and becomes the cache key. Only the rounding on the way out actually happens. The comment above
   it ("This hopefully reduces chance for rounding/tolerance discrepencies … and also increases the
   chance of a cache hit") describes behaviour the code does not implement.

3. **The cache stores `Date` objects in a slot named `sunsetInMillis`.** `addToSunsetCache`
   (`ophis_utils.js:459-464`) is called with `toReturn`, a `Date`
   (`ophis_dependencies.js:105-108`), and `getFromSunsetCache`'s result is passed to
   `utcMillisToNativeDate` (`ophis_dependencies.js:99`), i.e. `new Date(aDate)`. That happens to
   clone correctly in modern V8, so it is benign — but the type is wrong and the truthiness guard
   for "millis could legitimately be 0" (`ophis_utils.js:471-473`) is guarding against a case that
   can never occur with the actual value type.

Two further live changes:

- **`FEATURE_FLAG__USE_PER_LIBRARY_SUNSET_CACHE = true`** (`ophis_config.js:308`) — a per-library
  memo keyed `utcMillis_lat_long` (`ophis_utils.js:453-456`). Live.
- **`FEATURE_FLAG__BEFORE_N_AFTER_SUNSET_CACHE = false`** (`ophis_config.js:309`) — the
  `CACHE__SUNSET_BEFORE` / `CACHE__SUNSET_AFTER` dictionaries at `ophis_utils.js:449-450` are
  **never populated**. `getSunsetNativeUtcDateBefore_withCache` / `…After_withCache`
  (`ophis_utils.js:483-533`) therefore reduce to "clone, round to nearest minute, delegate". The
  rounding-to-nearest-minute of the *input* is unconditional and *is* a behaviour change from v9,
  which passed the raw date through.

- **The sampling fall-through changed.** v9's `getSunsetNativeUtcDateBefore` printed
  `"Didn't find a sunset before."` and dropped out to a final
  `return getSunsetOnNativeUtcDate(nativeUtcDate, …)`. v12 (`ophis_utils.js:535-577`) instead falls
  *through* into the 600-iteration half-day step loop that in v9 was the `else` branch of the
  sampling flag. Under the same flag settings v12 therefore does strictly more work and can return a
  different (more correct) answer when the sampling misses.

- `getSunsetSampling`'s `sunsetSampling` parameter became an **out-parameter**,
  `sunsetSampling_elseOut`, filled with `push(...)` and reused across the before/after pair
  (`ophis_utils.js:546-552`, `:583-590`; caller `ophis_model__operations.js:326-329` passes a fresh
  `[]`). v9 computed the sampling twice.

### 2.6 Persistence & file format

**Prettify/Minify replace a hard-coded flag.** v9 `ophis_config.js:284` had
`var FEATURE_FLAG__PRETTY_PRINT_OPH_FILES = true;`, read at two sites in
`ophis_model__persistence.js`. v12 **deletes the flag** and replaces it with four global options
(`ophis_config.js:42-45`):

```js
var GLOBAL_OPTION__PRETTIFY_X_DATE_EXPORT_OUTPUT = "prettify_x_date_export_output";
var GLOBAL_OPTION__MINIFY_X_DATE_EXPORT_OUTPUT   = "minify_x_date_export_output";
var GLOBAL_OPTION__PRETTIFY_OPH_FILES            = "prettify_oph_files";
var GLOBAL_OPTION__MINIFY_OPH_FILES              = "minify_oph_files";
```

The first pair drives the on-screen **Export Events** code blob; the second pair drives actual
`.oph` writes (File menu checkboxes). Defaults (`ophis_main.js:39-46`): every global boolean is
`false` **except** `GLOBAL_OPTION__AUTO_RECALCULATE_Z_DATES` and `GLOBAL_OPTION__PRETTIFY_OPH_FILES`,
which default to `true`. So out of the box v12 writes prettified, non-minified `.oph` — matching v9.

`getSaveBlob(saveBlobMode, prettify = false, minify = false)`
(`ophis_model__persistence.js:119`) passes `minify` into
`sanitizeIsoEventsForSaveOperation(isoEvents, minify)`.

**Minification (`ophis_model__validation.js:437-459`, `:488-592`).** When minify is on, per event:

- `minifyXDateOrTDateArray` strips every key from each X-/T-Date except `date` (Days scope) or
  `date` + `time` (HH:MM scope), keeping `enabled` only when it is `false`.
- Every `ALL_SERIALIZED_FIELDS` key equal to its `enabledByDefault`, and every numeric field equal
  to its `numericDefault`, is deleted.
- `chart_x_min/max`, `chart_y_min/max` are always deleted.
- Empty `x_dates` / `t_dates` arrays are deleted.
- `type` is always deleted ("never came to anything").
- For Days scope, `location_enabled`, `lat`, `long` are deleted.
- `scope` is deleted when it equals `DEFAULT_EVENT_SCOPE`; `scoring_system` when it equals
  `DEFAULT_SCORING_SYSTEM`.
- `operations` is deleted when the array matches `cloneDefaultOperationsForAppVersionGte10()`
  element-for-element on `equation`, `weight` and `enabled`.

Turning minify on pops a warning dialog first (`ophis_view__utils.js:440-449`):

> "WARNING: Minifying means that all settings, operations, and other configuration which match
> current program defaults will be removed from the file. If defaults ever change in a future
> version and you open your file in that version, it will use the newer defaults, which can result
> in different output."

That is exactly the v9 → v12 hazard described in §8.

**BUG — minify can silently delete `notes`.** `ophis_model__validation.js:543-545`:

```js
if ( ithEventToSave.day_scope_start_time_in_millis == DEFAULT_DAY_SCOPE_START_TIME_MILLIS ) {
    delete ithEventToSave.notes;
}
```

The intent is obviously a duplicate of `:523-525`, which deletes
`day_scope_start_time_in_millis` when it `=== 0`. As written it deletes the wrong key.
Reachability: `:523` uses `===`, so a **string** `"0"` survives it and is still present at `:543`,
where `"0" == 0` is `true` — and the event's notes are dropped. A string `"0"` is exactly what
`ensureValidEventDayScopeStartTime` (`:767-781`) leaves in place, because its guard is
`if ( isoEvent.day_scope_start_time_in_millis )` (the string `"0"` is truthy) and
`isNonNegIntOrStringThereof("0")` returns true. So: hand-edit or generate an `.oph` with
`"day_scope_start_time_in_millis": "0"`, enable Minify, save — the notes are gone. In the normal
UI path the field is a number, `:524` removes it, and `undefined == 0` is false, so the bug does not
fire.

**New event fields on disk.** A v12-written event carries three keys a v9-written one does not:
`notes` (string), `t_dates` (array), `day_scope_start_time_in_millis` (number). All three are
normalised on load by `ensureValidEventNotes` (`:758-765`),
`ensureValidEventDayScopeStartTime` (`:767-781`) and the `t_dates` branch of the import loop
(`:947-961`).

**`app_version` value.** v9 wrote `"9"`. v12 writes `"12"` — not `"12.0"`. `ophis_config.js:3` sets
`APP_VERSION = "12.0"`, but `init_step1_getAppVersion` (`ophis_main.js:79-98`) overwrites it from
`package.json` using the new `getComponentOfSemVer(semVer, index)`:

```js
if ( secondComponent && secondComponent != "0" ) {
    APP_VERSION = firstComponent + "." + secondComponent;
} else {
    APP_VERSION = firstComponent;
}
```

With `"12.0.0"` the second component is `"0"`, so `APP_VERSION` becomes `"12"`. The `rc` suffix
branch (`:87-97`) appends e.g. `rc1` for `"13.0.0-rc1"`. The sample files in
`Ophis_v12_Browser/*.oph` confirm `"app_version": "12"`.

**Global-options load is now scoped.** `validatePotentialDiskLoadOrImport(jsonString,
globalOptionsOnly = false)` (`:1000`); `init_step6_appState` passes `true`
(`ophis_main.js:410-412`) so a localStorage blob no longer competes with the file being opened.

### 2.7 Input validation modes

New in v12 (declared as introduced "in v11" by the source comment at
`ophis_config.js:332-334`):

```js
var FILE_INPUT_VALIDATION_MODE__STRICT   = "FILE_INPUT_VALIDATION_MODE__STRICT";
var FILE_INPUT_VALIDATION_MODE__ORIGINAL = "FILE_INPUT_VALIDATION_MODE__ORIGINAL";
var FILE_INPUT_VALIDATION_MODE__LOOSE    = "FILE_INPUT_VALIDATION_MODE__LOOSE";
```

`ORIGINAL` is explicitly described as "the strictness that was the non-configurable default in
versions <= v10" — i.e. **v9's behaviour**. Selection
(`ophis_view__export.js:159-186`): `--input-validation-mode` maps `loose`/`original`/`strict`
case-insensitively; an unrecognised value warns and uses `STRICT`; an absent value uses `STRICT`
when headless and **`LOOSE` when interactive**.

So opening a marginal `.oph` in the v12 GUI is *more* forgiving than v9, while feeding the same file
to `--headless` is *less* forgiving. Three predicates gate it:
`isFileInputValidationOriginalOrStrict` / `isFileInputValidationStrict` / `isFileInputValidationLoose`
(`ophis_model__validation.js:676-686`).

Under LOOSE, `smoothOutXDatesForLoadedEvent` (`:821-866`) *removes* invalid X-Dates rather than
erroring, and `smoothOutTDatesForLoadedEvent` (`:868-883`) does the same for T-Dates.
`FEATURE_FLAG__AUTO_FILL_X_DATES_DURING_FILE_LOAD = false` (`ophis_config.js:319`) means the
"replace with a fresh X-Date" branch is **off**, so a loaded event can legitimately end up with
zero X-Dates — which the new UI supports (see the empty-panel help message,
`ophis_main.js:519-520`).

### 2.8 Recalculation model (`refreshXDates`)

v9's `refreshXDates(refreshType, preserveScrollPosition = false)` ran `runOphisOnEvent` on **every**
call. v12's signature is
`refreshXDates(refreshType, preserveScrollPosition = false, ophisInputChange = OPHIS_INPUT_CHANGE__CHANGED)`
(`ophis_controller.js:437`) and the engine run is conditional
(`ophis_controller.js:472-504`):

```js
if ( ophisInputChange === OPHIS_INPUT_CHANGE__FORCE )      actuallyRunOphis = true;
else if ( hasLatestResults === false )                     actuallyRunOphis = true;
else if ( getCurrentScreen() == OPHIS_SCREEN__Z_DATES ) {
    if ( ophisInputChange == OPHIS_INPUT_CHANGE__NO_CHANGE ) actuallyRunOphis = false;
    else actuallyRunOphis = appState.globalOptions[GLOBAL_OPTION__AUTO_RECALCULATE_Z_DATES];
}
else                                                       actuallyRunOphis = false;
```

When it does not run, the previous `appState.latestResults` is reused and marked `stale = true`.
`refreshCurrentPage` (`ophis_view.js:262-320`) then dims `#scrollable-container-for-output-container`
and the chart to `OPACITY__DISABLED`, sets `#z-dates-up-to-date` to red "Stale", and enables
`#recalculate-z-dates-button`. When fresh, the badge reads green "Up-to-date" and the button is
disabled. `REFRESH_TYPE__SCREEN_CHANGE` was renamed to `REFRESH_TYPE__RIGHT_PANEL_ONLY`
(`ophis_config.js:433`).

`validateOutputBeforeExport` (`ophis_view__export.js:251-256`) forces a recalculation first if
`appState.latestResults.stale === true`, so exports never emit stale numbers.

**This is a pure performance/UX change — it does not alter any computed value.** The engine, when it
runs, runs identically.

### 2.9 Operation-string validation

`validateOperationString(operationEquationString, errors_out)` (v9 `:104`) became
`validateOperationString(operationEquationString, indexInOperationArray, otherOperations, errors_out)`
(v12 `:131`). The arithmetic validation, the `new Function("Y", "return …")` compile and the
`SAMPLE_Y_VALUE_FOR_VALIDATION` smoke test are unchanged. The addition is a **uniqueness check**
(`:174-185`):

```js
for( var i = indexInOperationArray-1; i >= 0; i-- ) {
    var ithOtherOperation = otherOperations[i];
    var ithNormalizedOperationEquation = normalizeOperationEquationString(ithOtherOperation.equation, doReplacements);
    if ( ithNormalizedOperationEquation == normalizedOperationEquationString ) {
        errors_out.push("Indentical to Operation " + (i+1) + " and each Operation must be unique.");
    }
}
```

The comparison is against the *normalised* form, so `X2+Y*OPH_PI` and `X2+YxOPH_PI` collide. Note
the shipped typo, **"Indentical"**. Also note the braces are mis-indented at `:174-185` — the
`if ( errors_out.length == 0 ) {` opens a block whose body is indented one level short and whose
closing brace sits on its own line at `:185`; it parses correctly but reads as a mistake.

`isValidOperationEquationResult`, `normalizeOperationEquationString`,
`stripOperationEquationString`, `stripXDateFromOperationEquationString`,
`validateSimpleArithmeticString`, `DEFAULT_OPERATION_FUNCTION` and `SAMPLE_Y_VALUE_FOR_VALIDATION`
are all unchanged.

### 2.10 View, UI plumbing, CSS

- **Master checkboxes.** `newMasterCheckbox(baseElemId, baseClassName, title,
  onChildNowCheckedOrNot, onMasterCheckboxChangeComplete)` (`ophis_view__config.js:143-151`) and
  seven configurations (`:153-297`) for X-Dates, T-Dates, Filters, Chart Options, Operations, Event
  Swap targets and Event Swap settings, collected in `MASTER_CHECKBOX_CONFIGS` (`:295-303`). Wired
  by `setUpMasterCheckbox` (`ophis_view__utils.js:728-759`), which injects the master `<input>` into
  `<baseElemId>-header` and, on change, walks `getAllChildCheckboxes(baseClassName)` calling the
  per-row callback. Refreshed on every page refresh by `refreshMasterCheckboxBasedOnChildChange`
  (`ophis_view__rebuild.js:616`).
- **`appState.justClickedField` → `appState.justChangedField`** (`ophis_main.js:15`), and the inline
  "no nearby dates found for indicator" loop that lived in `ophis_view__chart_datasets.js` was
  extracted to `handleJustChangedFields(isoEvent, indicatorsThatOverlappedDates = null)`
  (`ophis_view__utils.js`) and is now called from `refreshCurrentPage` as well.
- **Chart draw guarded.** `doBeforeOrAfterDraw()` (`ophis_view__chart.js:471-477`) plus
  `shouldHideChart(currentIsoEvent)` (`:720-725`) short-circuit the custom `beforeDraw`/`afterDraw`
  plugin when the Show-Chart option is off. The source comment explains why: "beforeDraw() and
  afterDraw() get called even if the chart is hidden/disabled."
- **Operation pills-per-row is now measured, not constant.** v9 used
  `OPERATION_PILLS_PER_ROW` (3). v12 (`ophis_view__output.js:333-346`) computes
  `Math.floor(operationHeaderElemWidth / PILL_WIDTH_IN_PX)` with the new
  `PILL_WIDTH_IN_PX = 100` (`ophis_view__config.js:19`), clamped to ≥ 1. `OPERATION_PILLS_PER_ROW`
  survives only as a trailing comment.
- **Flatpickr instances are now destroyed** before a container is cleared —
  `destroyFlatPickrInstance` / `destroyFlatPickrInstances` (new in `ophis_view__utils.js`), called
  from `refreshCurrentPage` (`ophis_view.js:191`) and `clearOutputContainer` (`:337`). v9 leaked
  them.
- **`beforeunload` is now Electron-gated** (`ophis_main.js:673-686`). The v12 comment states the
  reason plainly: "having this function here doesn't let Electron reload or navigate away from the
  window, e.g. when performing `Reset Program` from the menu."
- **DPI-change handling.** `window.onresize` (`ophis_main.js:690-717`) now compares
  `window.devicePixelRatio` against the previous value and, on change, forces a full
  `refreshCurrentPage(REFRESH_TYPE__RIGHT_PANEL_ONLY, …, forceRedraw = true)` inside a
  `requestAnimationFrame`.
- **`factoryReset` under Electron** (`ophis_controller.js:16-27`) now calls
  `electronBridge.resetProgram()` (main-process `win.reload()`) instead of
  `window.location.reload()`.
- **Screen names.** "Export X-Dates" → "Export Events", "Import X-Dates" → "Import Events"
  (`ophis_view__strings.js:300-304`). The underlying enum names
  `OPHIS_SCREEN__EXPORT_X_DATES` / `…IMPORT_X_DATES` are unchanged, so the persisted
  `start_screen` value is compatible.
- **CSS bug.** `ophis.css` — the master-checkbox `margin-top:5px` rule lists
  `… .iso_event_swap_checkbox_master .iso_event_swap_setting_checkbox_master` with a **missing
  comma**, making it a descendant selector; `.iso_event_swap_setting_checkbox_master` never gets the
  margin.

### 2.11 Logging (`ophis_logging.js`, new)

71 lines. Saves the three original console methods onto `self`
(`ophis_logging.js:5-7`), defines `consoleLogOverride` / `consoleWarnOverride` /
`consoleErrorOverride` which forward `args[0]` to `ophisLog(message, level)` and then delegate to
the original. `toggleConsoleLogOverride()` (`:48-61`) installs the overrides only when
`isRunningHeadless() && isRunningElectron()`, otherwise restores the originals. `ophisLog`
(`:64-71`) prefixes `OPH_INFO: ` / `OPH_WARN: ` / `OPH_ERROR: ` and calls
`electronBridge.logToCli(message)`.

The file carries its own warning at `:63`:

> `// WARNING: DO NOT put any console.log/warn/error statements downstream because it will cause infinite recursion.`

Only `args[0]` is forwarded — a multi-argument `console.log("a", b, c)` loses everything after the
first argument in the CLI transcript.

---

## 3 · The operation table

**Yes, it changed.** v12 adds a sixteenth default operation. Nothing else in the table moved.

### 3.1 The base table (identical in both versions)

Both versions carry the same fifteen-entry base list, with the same equations, the same weights and
the same `enabled` flags. The only change is its **name**: `DEFAULT_OPHIS_OPERATIONS` in v9 became
`DEFAULT_OPHIS_OPERATIONS_LTE_V7` in v12 (`ophis_model__params.js:65` in v12, `:65` in v9).

Weights: `POINTS__ALPHA_OPERATION_MATCH = 1`, `POINTS__BETA_OPERATION_MATCH = .5`
(`ophis_model__params.js:2-3`, identical). `isAlphaOperation(op)` is `op.weight >= 1` (`:48-50`).

| # | Comment in source | Equation | ≤v7 weight | ≤v7 enabled |
|---:|---|---|---:|---|
| 1 | `// 2. Y + X2 + Isometric Date` | `X2+oph_round(Y)` | 1 (α) | true |
| 2 | `// 3. Y reversed + X2 (Holo-)` | `X2+oph_flip(oph_round(Y))` | 1 (α) | true |
| 3 | `// 4. Y div. 5.08 + X2` | `X2+Y/OPH_CRV` | .5 (β) | true |
| 4 | `// 5. Y div. 2 X 3.14 + X1` | `X1+(Y/2.0)xOPH_PI` | .5 (β) | true |
| 5 | `// 6. Y div. 1.618 + X2` | `X2+Y/OPH_PHI` | 1 (α) | true |
| 6 | `// 7. Y div. 2 X 1.618 + X2` | `X2+(Y/2.0)xOPH_PHI` *(= `OPERATION_EQUATION_FOR_ORIGINAL_BETA_PHI_6`)* | .5 (β) | true |
| 7 | `// 8. Y div. 2 X 5.08 + X1` | `X1+(Y/2.0)xOPH_CRV` | .5 (β) | true |
| 8 | `// 9. Y div. 2 X 3.14 + X2` | `X2+(Y/2.0)xOPH_PI` | .5 (β) | true |
| 9 | `// 10. Y X1.618 + X2` | `X2+YxOPH_PHI` | 1 (α) | true |
| 10 | `// 11. Y X3.14 + X1` | `X1+YxOPH_PI` *(= `OPERATION_EQUATION_FOR_RADIUS_PROJECTION`)* | .5 (β) | true |
| 11 | `// 12. Y div. 2 X 5.08 + X2` | `X2+(Y/2.0)xOPH_CRV` | .5 (β) | true |
| 12 | `// 13. Y X3.14 + X2` | `X2+YxOPH_PI` | .5 (β) | true |
| 13 | `// 14. Y X 5.08 + X1` | `X1+YxOPH_CRV` | .5 (β) | true |
| 14 | `// 15. Y X 5.08 + X2` | `X2+YxOPH_CRV` | .5 (β) | true |
| 15 | `// New Hepta-Cycle Operation from Jason, Early-August 2025` | `X1+YxOPH_HEP` | 1 (α) | **false** |

`OPH_HEP = 7.01` — `ophis_config.js:413` (v12), `ophis_config.js:367` (v9). **Identical.**
`OPH_PI`, `OPH_PHI`, `OPH_CRV` and the whole `FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION`
resolution block are byte-identical between the versions
(v12 `ophis_config.js:410-412`, v9 `:364-366`).

### 3.2 The two clone functions that existed in v9

```js
function cloneDefaultOperationsForAppVersionLte7() {
    return deepClone(DEFAULT_OPHIS_OPERATIONS_LTE_V7);   // v9: DEFAULT_OPHIS_OPERATIONS
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
```

Byte-identical in both versions except for the renamed constant (v12 `:115-135`, v9 `:112-132`).
`Gte8` therefore does two things: **enables all fifteen** (which turns the Hepta-Cycle operation on)
and **promotes exactly two to ALPHA** — `X1+YxOPH_PI` (#10) and `X2+(Y/2.0)xOPH_PHI` (#6).

### 3.3 What v12 adds

`ophis_model__params.js:112-113` and `:137-143`:

```js
// New Hepta-Cycle Operation from Jason but for this one Z-Value is added to X2, Late-December 2025
var OPH_HEP_OPERATION_FOR_X2 = newOperation("X2+YxOPH_HEP", POINTS__ALPHA_OPERATION_MATCH, OPERATION_ENABLED_TRUE)

function cloneDefaultOperationsForAppVersionGte10() {
    var operations = cloneDefaultOperationsForAppVersionGte8();
    operations.push(deepClone(OPH_HEP_OPERATION_FOR_X2));
    return operations;
}
```

### 3.4 The resulting default tables, side by side

| | v9 default | v12 default |
|---|---|---|
| Factory function | `cloneDefaultOperationsForAppVersionGte8()` | `cloneDefaultOperationsForAppVersionGte10()` |
| Total operations | **15** | **16** |
| All enabled? | yes | yes |
| ALPHA (weight 1) | 6 — #1, #2, #5, #6↑, #9, #10↑, #15 … *see below* | 7 |
| beta (weight .5) | 8 | 8 |
| Called from | `ophis_controller.js:128`, `ophis_model__validation.js:499`, `ophis_view__settings.js:95` | `ophis_controller.js:128`, `ophis_model__validation.js:465, 638, 642`, `ophis_view__settings.js:660` |

Exact ALPHA/beta split after the `Gte8` promotion:

| Weighting | ALPHA members | count | beta count | total |
|---|---|---:|---:|---:|
| ≤ v7 | #1 Isometric, #2 Holofractal, #5, #9, #15 Hepta(X1, disabled) | 5 | 10 | 15 (14 enabled) |
| **v9 default (Gte8)** | #1, #2, #5, **#6**, #9, **#10**, #15 Hepta(X1) | **7** | **8** | **15** |
| **v12 default (Gte10)** | the same seven **+ #16 Hepta(X2)** | **8** | **8** | **16** |

Restricted to the **twelve Core Algorithm formulas** (#3–#14, i.e. excluding the Isometric, the
Holofractal and both Hepta-Cycle entries), the split is **4 ALPHA / 8 beta** under `Gte8` and
therefore under both v9 *and* v12 defaults — matching the Procedural Notes. The Hepta-Cycle
operations sit outside the twelve, which is why the documented 4/8 count is unchanged by the v12
addition.

**The complete v12 default table, in array order, is:**

| idx | Equation | Weight | Enabled | Rôle |
|---:|---|---:|---|---|
| 0 | `X2+oph_round(Y)` | 1 | ✔ | Isometric |
| 1 | `X2+oph_flip(oph_round(Y))` | 1 | ✔ | Holofractal |
| 2 | `X2+Y/OPH_CRV` | .5 | ✔ | Core Algo I |
| 3 | `X1+(Y/2.0)xOPH_PI` | .5 | ✔ | Core Algo II |
| 4 | `X2+Y/OPH_PHI` | 1 | ✔ | Core Algo III |
| 5 | `X2+(Y/2.0)xOPH_PHI` | **1** ← promoted | ✔ | Core Algo IV |
| 6 | `X1+(Y/2.0)xOPH_CRV` | .5 | ✔ | Core Algo V |
| 7 | `X2+(Y/2.0)xOPH_PI` | .5 | ✔ | Core Algo VI |
| 8 | `X2+YxOPH_PHI` | 1 | ✔ | Core Algo VII |
| 9 | `X1+YxOPH_PI` | **1** ← promoted | ✔ | Core Algo VIII |
| 10 | `X2+(Y/2.0)xOPH_CRV` | .5 | ✔ | Core Algo IX |
| 11 | `X2+YxOPH_PI` | .5 | ✔ | Core Algo X |
| 12 | `X1+YxOPH_CRV` | .5 | ✔ | Core Algo XI |
| 13 | `X2+YxOPH_CRV` | .5 | ✔ | Core Algo XII |
| 14 | `X1+YxOPH_HEP` | 1 | ✔ ← enabled by `Gte8` | Hepta-Cycle → X1 (Aug 2025) |
| 15 | `X2+YxOPH_HEP` | 1 | ✔ | **Hepta-Cycle → X2 (Dec 2025) — NEW IN v12** |

The `Lte7` factory is still declared in both versions but is **dead code**: every call site is
commented out (`ophis_model__validation.js:500` in v9, `:643` in v12) and no live caller exists.

---

## 4 · The MSRF sets

**They did not change. At all.**

`ophis_model__params.js` is the only file that declares them, and the complete diff of that file
between v9 and v12 is thirteen lines, none of which touch a number: the `DEFAULT_OPHIS_OPERATIONS`
rename, the new `OPH_HEP_OPERATION_FOR_X2`, and the new `cloneDefaultOperationsForAppVersionGte10`.

Mechanically confirmed by extracting all three arrays from both trees and sorting:

| | v9 | v12 |
|---|---:|---:|
| `MSRF_FILTER__NORMAL` | 325 | 325 |
| `MSRF_FILTER__IMPORTANT` | 53 | 53 |
| `MSRF_FILTER__VORTEX` | 12 | 12 |
| **total** | **390** | **390** |
| distinct | 390 | 390 |
| **added in v12** | — | **none** |
| **removed in v12** | — | **none** |

`HIGHEST_MSRF_NUMBER = 2559` — `ophis_config.js:119` (v12), `:94` (v9). Identical. It is the last
element of `MSRF_FILTER__NORMAL` (`ophis_model__params.js:35`).

Scoring weights, also identical (`ophis_model__params.js:4-12`):

```js
var POINTS__IMPORTANT_MSRF_MATCH = 2;
var POINTS__NORMAL_MSRF_MATCH = 1;
var POINTS__VORTEX_MSRF_MATCH = POINTS__IMPORTANT_MSRF_MATCH;
var MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES = 2;

var SCORE_MULTIPLIER__NORMAL_MSRF_MATCH = 1.5;
var SCORE_MULTIPLIER__IMPORTANT_MSRF_MATCH = 2.0;
var SCORE_MULTIPLIER__VORTEX_MSRF_MATCH = 2.0;
```

`MSRF_FILTER__VORTEX` is exactly `[21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4,
762.3, 871.2]` in both. `MSRF_FILTER__FINAL` is the concatenation of all three, numerically sorted
(`:57`), in both.

`selfCheckMsrfOnStartup` — which checks every member is a positive integer or a recognised vortex
number, and that no number appears twice — is **byte-identical** between v9
(`ophis_model__validation.js:577-624`) and v12 (`:1041-1088`), including the same commented-out
"UPDATE: Now no longer flooring" branch. It passes cleanly on the 390-number set (0 duplicates).

Note the two comment lines above `MSRF_FILTER__NORMAL` (`ophis_model__params.js:15-16`) also survive
verbatim:

> `// NOTE: Filter numbers 21 and 76 have been commented out since rounded down vortex numbers match these.`
> `// UPDATE: Re-enabled 21 and 76 after discussion with Jason to match a vortex number within a certain tolerance.`

---

## 5 · The scoring system

### 5.1 Enumeration

| Version | Constants | `SCORING_SYSTEMS` array | Named default constant |
|---|---|---|---|
| **v9** | `SCORING_SYSTEM__LTE_V7`, `SCORING_SYSTEM__GTE_V8` (`ophis_config.js:36-37`) | `[LTE_V7, GTE_V8]` (`:39-42`) | **none** |
| **v12** | same two (`ophis_config.js:47-48`) | same two (`:52-55`) | `var DEFAULT_SCORING_SYSTEM = SCORING_SYSTEM__GTE_V8;` (`:50`) — **new** |

**No scoring system was added, removed or renamed.** The only structural change is the introduction
of `DEFAULT_SCORING_SYSTEM`, whose sole consumer is the minifier
(`ophis_model__validation.js:558-560`): `scoring_system` is stripped from a minified `.oph` when it
equals the default.

### 5.2 Selection at runtime — identical

v9 `ophis_model__operations.js:18-24`, v12 `:17-23` — **byte-identical**:

```js
function getScoringSystem(isoEvent) {
    if ( SCORING_SYSTEMS.includes(isoEvent.scoring_system) ) {
        return isoEvent.scoring_system;
    } else {
        return SCORING_SYSTEM__GTE_V8;
    }
}
```

An unset, unrecognised or corrupted `scoring_system` resolves to **GTE_V8** in both versions.

### 5.3 The community "v8 typo" claim — the v9 code shows the corrected default

The claim is that a v8 build shipped with a typo that defaulted to the old, MSRF-multiplier-free
scoring system. **The v9 source shows the correction, in four places, with the buggy line retained
as a comment.** From `ophis_model__validation.js:503-523` (v9):

```js
if ( ithEventToLoad.scoring_system  ) {
    if ( SCORING_SYSTEMS.includes(ithEventToLoad.scoring_system) ) {
        // All good
    } else {
        if ( appVersionForImportAsInt >= 8 ) {
            ithEventToLoad.scoring_system = SCORING_SYSTEM__GTE_V8;
        } else {
            // Based on PR feedback, default to newest scoring system, regardless.
            ithEventToLoad.scoring_system = SCORING_SYSTEM__GTE_V8;
            // ithEventToLoad.scoring_system = SCORING_SYSTEM__LTE_V7;
        }
    }
} else {
    if ( appVersionForImportAsInt >= 8 ) {
        ithEventToLoad.scoring_system = SCORING_SYSTEM__GTE_V8;
    } else {
        // Based on PR feedback, default to newest scoring system, regardless.
        ithEventToLoad.scoring_system = SCORING_SYSTEM__GTE_V8;
        // ithEventToLoad.scoring_system = SCORING_SYSTEM__LTE_V7;
    }
}
```

Both branches of the `appVersionForImportAsInt >= 8` test assign the **same** value. The dead
`else` branch, the commented-out `LTE_V7` assignment, and the comment "Based on PR feedback, default
to newest scoring system, regardless" are the fossil of the fix. v12 preserves this **verbatim** —
same lines, same comments, same commented-out assignment — in `parseScoringSystemForLoadedIsoEvent`
(`ophis_model__validation.js:647-674`), with only two additions: the strict-mode branch now pushes
`"Unrecognized scoring system … for event: <name>"` as a hard error instead of silently correcting,
and the non-strict branch `console.warn`s first.

So: **v9 already carries the corrected default; v12 changes nothing about it.** The commented-out
line at v9 `:512` / `:521` and v12 `:661` / `:671` is the closest thing to a surviving trace of the
reported v8 defect. Every path in both versions lands on `SCORING_SYSTEM__GTE_V8` — the system
*with* MSRF multipliers.

The same "the dead branch is retained as documentation" pattern appears for the operations table at
v9 `ophis_model__validation.js:499-500` and v12 `:642-643`.

### 5.4 The scoring arithmetic

`scoreZDates`, `getOperationScore`, `sumUpMsrfMatchSubscore`, `getMsrfScoreMultiplier`,
`getMsrfScoreMultiplierForFilter` — **all byte-identical** between the two versions. The only
difference in the whole scoring path is the two-decimal rounding described in §2.4, at
`ophis_model__operations.js:454-456`.

---

## 6 · New features in v12

### 6.1 Event Settings screen (`OPHIS_SCREEN__EVENT_SETTINGS`)

New screen enum (`ophis_view__config.js:127`), added to `OPHIS_SCREENS` (`:139`), named
`"Event Settings"` (`ophis_view__strings.js:311-312`), rendered by `renderEventSettings()`
(`ophis_view.js:439-475`). It is a two-column table over `ISO_EVENT_SETTINGS`
(`ophis_view__settings.js:166-169`) with rows labelled `S₁`, `S₂` via `getRowShortNameHtml("S", i)`.

`newIsoEventSetting(readableName, generateHtml, setUpListeners)` — `ophis_view__settings.js:11-17`.

Only two settings ship:

| idx | `readableName` | Backing field |
|---:|---|---|
| 0 | `"Misc. Notes"` | `isoEvent.notes` |
| 1 | `"Day Scope Event Start Time"` | `isoEvent.day_scope_start_time_in_millis` |

`scratchpad.js` gains a commented-out `// DEFAULT_STARTING_SCREEN = OPHIS_SCREEN__EVENT_SETTINGS;`
line — a developer shortcut, inert.

### 6.2 Day Scope Event Start Time

`ISO_EVENT_SETTING__X_DATE_OFFSET__DAY_SCOPE` — `ophis_view__settings.js:76-143`. The on-screen
explanation is the authoritative description of the semantics:

> "Every Operation generates a Z-Value in axial rotations (Days). This Z-value is added to an X-Date
> to get the final Z-Date. For Day Scope, the default time to which the Z-Value is added, is the very
> start of the day, i.e. midnight. You can override that behavior with this setting to start at e.g.
> noon."

Storage: `isoEvent.day_scope_start_time_in_millis`, milliseconds since midnight.
Default: `DEFAULT_DAY_SCOPE_START_TIME_MILLIS = 0` (`ophis_config.js:352`).

Validation on both save and load — `ensureValidEventDayScopeStartTime`
(`ophis_model__validation.js:767-781`): accepts a non-negative integer or a string thereof; clamps
`>= MILLIS_PER_DAY` down to `MILLIS_PER_DAY - MILLIS_PER_MINUTE` (23:59); anything else resets to 0.

Application — `ophis_model__operations.js:196-199` and `:314-318`:

```js
var dayScopeStartTimeInMillis = isNonNegIntOrStringThereof(isoEvent.day_scope_start_time_in_millis)
    ? isoEvent.day_scope_start_time_in_millis
    : DEFAULT_DAY_SCOPE_START_TIME_MILLIS;

var operationResultsOnRotationCountY = runOperations(..., dayScopeStartTimeInMillis);
```

then inside `runOperations`:

```js
if ( eventScope == EVENT_SCOPE__DAYS ) {
    if ( dayScopeStartTimeMillis > 0 ) {
        dateToWhichToAddZValue_native.setTime(dateToWhichToAddZValue_native.getTime() + dayScopeStartTimeMillis);
    }
}
```

**Only `EVENT_SCOPE__DAYS` is affected.** The offset is applied to the anchor *before* the Z-Value
in millis is added, so it shifts every Z-Date by exactly that amount within the day. Note that
`runOperations`'s parameter default is `dayScopeStartTimeMillis = 0` (`:263`), so any caller that
omits it gets v9 behaviour.

The value passed through is whatever `isNonNegIntOrStringThereof` approved — which includes a
**string**. `getTime() + "43200000"` would produce string concatenation and then `setTime` would
coerce it to `NaN`. In practice `ensureValidEventDayScopeStartTime` runs on every load and save and
the flatpickr handler always writes a number (`ophis_view__settings.js:114-116`), so a string only
survives if it came in as `"0"` — which adds nothing. Latent, not live.

The UI is a flatpickr time-only input using the new
`FLATPICKR_BASE_DATE_CONFIG__HH_MM__TIME_ONLY()` (`ophis_view__config.js:51-59`) and the new
`MIN_TIME_FIELD_WIDTH = "65px"` (`:115`). The calendar half of the widget is hidden by hand
(`ophis_view__settings.js:130-141`) with the comment "Seems like a bug in flatpickr, that it's still
showing the calendar and not just the time." Note the config key is misspelled
`noCalender` (`ophis_view__config.js:54`) — flatpickr's option is `noCalendar`, so **the option
never took effect**, which is precisely why the manual hiding is needed. That is the real bug, not
flatpickr.

### 6.3 Per-event notes

Storage: `isoEvent.notes` (string). Normalised by `ensureValidEventNotes`
(`ophis_model__validation.js:758-765`) on both load and save. Stripped by the minifier only when
empty (`:537-541`) — plus the erroneous `:543-545` described in §2.6.

Editing UI: `ISO_EVENT_SETTING__NOTES` (`ophis_view__settings.js:146-164`), a `<textarea
id="event-notes-text-area" rows=10>` on the Event Settings screen, with placeholder

> "Write down anything about this event that may be relevant to the input or output. These notes are
> for personal use only and do not affect results."

writing back on `change` and calling `flushChangesToDisk()`.

**The pop-up version of this feature is dead code in v12.** `ophis.html:464-503` defines
`#notes-pop-up-wrapper` (Clear / Done buttons, a textarea), `ophis.css` styles it
(`display: none` by default), and `img/notes_icon.png` + `img/notes_icon_orig.png` were added to
ship it — but:

- The per-row notes button in the Iso-Events table is **commented out**
  (`ophis_view__rebuild.js:308`).
- `showNotesPopUp(rowElem)` and `hideNotesPopUp()` are **entirely commented out**
  (`ophis_view__rebuild.js:596-614`).
- `notesButtonElem` is still looked up (`:318`) and every use is null-guarded (`:380`, `:396`,
  `:510`, `:574`), so nothing throws — the element simply never exists.

So the shipped notes feature is Event-Settings-only, and three assets plus ~60 lines of markup and
CSS are inert.

### 6.4 T-Dates (Target Dates) — the biggest undocumented v12 addition

The community log did not mention this one. `t_dates` is a **second, parallel date array on every
Iso-Event** that acts as a whitelist on the output.

Help text (`ophis_view__strings.js:7`):

> "T-Dates (Target Dates) are a way to only show Z-Dates for the future dates that you are
> interested in, e.g. when a team will actually play again."

Mechanics — `filterZDates`, `ophis_model__sorting.js:34-52` and `:119-142`:

```js
if ( tDatesInMillis.length > 0 ) {
    var overlappingAtLeastOneTDate = false;
    for ( var i = 0; i < tDatesInMillis.length; i++ ) {
        var ithTDateInMillis = tDatesInMillis[i];
        if ( isoEvent.scope == EVENT_SCOPE__HH_MM ) {
            if ( ithTDateInMillis >= nativeUtcDateZInMillis_start && ithTDateInMillis < nativeUtcDateZInMillis_end ) {
                overlappingAtLeastOneTDate = true; break;
            }
        } else {
            if ( nativeUtcDateToUseForZInMillis == ithTDateInMillis ) {
                overlappingAtLeastOneTDate = true; break;
            }
        }
    }
    if ( overlappingAtLeastOneTDate === false ) {
        includeInOutput = false;
    }
}
```

An **empty** `t_dates` array (or one with no enabled members) is a no-op, so existing behaviour is
preserved. Note `xDateToNativeDate(isoEvent.scope, ithTDate)` at `:44` is called **without lat/long**,
unlike every X-Date conversion in the same function — for HH:MM-scope events the T-Date is therefore
interpreted without the event's timezone. That looks like an oversight.

Plumbing:
- `INPUT_DATE_TYPE__X_DATE` / `INPUT_DATE_TYPE__T_DATE` (`ophis_config.js:57-58`) thread the
  distinction through `addXDate(currentIsoEvent, insertIndex, refreshView, flushChanges,
  inputDateType)` (`ophis_controller.js:290`), `refreshXDateSunsets(inputDateType)` (`:345`),
  `rebuildXDateTableRows(preserveScrollPosition, inputDateType)`
  (`ophis_view__rebuild.js:948`) — i.e. the same code drives both panels.
- New DOM: `#t-date-container`, `#add-t-date-button`, `#reset-t-dates-button`,
  `#t-dates-help-button`, `#t-date-checkbox-header`, `#t-date-container-starting-message`.
- New master checkbox `MASTER_CHECKBOX_CONFIG__T_DATES` (`ophis_view__config.js:168-181`).
- New CSS classes `.t_date_checkbox`, `.t_date_scrollable_container`,
  `.prior_sunset_display_t_date`.
- Minified and validated alongside X-Dates (§2.6, §2.7).

### 6.5 Headless / CLI mode

Covered in §2.1 for the main process. Renderer side:

- `appState` gains `headless`, `headless_output_type`, `headless_output_path`,
  `headless_current_epoch_millis`, `headless_multiple_files`, `filePathFromMainArgs`,
  `fileInputValidationMode`, `latestResults` (`ophis_main.js:22-30`).
- `isRunningHeadless()` (`ophis_main.js:187-189`) simply reads `appState.headless === true`.
- Init skips sign-in (`:125`), image loading (`:201-205`), Chart.js registration, listeners, map and
  chart setup (`:236-241`).
- Self-check failure is now **fatal** when headless (`ophis_main.js:231-243`): every startup error
  is printed and `exitHeadlessWithError("Self-check failed.")` runs. Note this makes headless mode
  hostage to `selfCheckMsrfOnStartup` and `runUnitTests`, which the GUI merely collects into
  `appState.startupErrors`.
- `initAppStateFinalization` routes to `handleHeadlessOutput()` instead of any UI work
  (`ophis_main.js:307-310`).
- **Deterministic "now".** `getCurrentLocalTime(millisOffset)` (`ophis_utils.js:650-661`):

  ```js
  if ( isRunningHeadless() && appState.headless_current_epoch_millis > DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS ) {
      return new Date(appState.headless_current_epoch_millis);
  }
  ```

  with `DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS = Number.MIN_SAFE_INTEGER` (`ophis_config.js:23`).
  Because the "past dates" filter is keyed on this value, `--current-epoch-millis` makes headless
  output reproducible. Note the headless path **skips** `roundDateToNearestMinute`, which the normal
  path applies.

- **CSV output** (`ophis_view__export.js:8-158`). Single-file
  (`exportHeadlessSingleCsv`, `:37-108`) writes `<input>.csv` beside the input, or into
  `--output-path`; `--multiple-files` (`exportHeadlessMultipleCsvs`, `:110-157`) writes one CSV per
  Iso-Event into a directory named after the input file. Row shape
  (`newCsvRowForZDate`, `:293-337`):

  | Column | Source |
  |---|---|
  | `IsoEvent` | `currentIsoEvent.name` |
  | `Date` | `zDateTags.z_date_readable_start_no_html` |
  | `Hits` | `zDateTags.hit_count` |
  | `Score` | `zDateTags.score` (now 2-dp rounded) |
  | `MSRF` | matched numbers, descending, comma-joined, else `"None"` |
  | `Operations` | `OP01`…`OPnn` from `operation_ordinal + 1`, ascending, else `"None"` |
  | `ErrorStatus` | `"None"` \| `"NO_RESULTS"` \| `"GENERAL_FAILURE"` |
  | `ErrorMessage` | plain-text error, else `"None"` |

  Errors become rows rather than being dropped (`newCsvRowForError`, `:20-36`).
  **Minor bug** at `:314-317`: `if ( opNum < 10 ) { opNum = "0" + opNum; }` runs before the null
  check, so a missing `operation_ordinal` yields the literal string `"OP0null"` instead of being
  filtered out (`null < 10` is `true`).

  This also **changed the interactive CSV export**: v9's `newCsvRowForZDate(zDateTags)` emitted only
  `Date`, `Hits`, `Score`. v12 emits all eight columns, for both the headless and the on-screen
  export path.

### 6.6 Event Data Transfer screen (`OPHIS_SCREEN__EVENT_SWAP`)

Also unmentioned in the community log. New screen (`ophis_view__config.js:128`), named
`"Event Data Transfer"` (`ophis_view__strings.js:309-310`), help text at `:9`:

> "This screen makes it easy to apply Settings from one Iso-Event to one or more other Iso-Events."

Model: `newIsoEventDataTransferObject(elemId, readableName, applyToEvent)`
(`ophis_view__settings.js:2-9`) and ten transfer definitions collected in
`ISO_EVENT_DATA_TRANSFERS` (`:63-74`):

| # | Label | Copies |
|---:|---|---|
| 1 | Name | `name` |
| 2 | Scope | `scope` |
| 3 | Location | `lat`, `long` |
| 4 | X-Dates | `deepClone(x_dates)` |
| 5 | Filters | every `SERIALIZED_FILTER_FIELDS` key + its numeric value |
| 6 | T-Dates | `deepClone(t_dates)` |
| 7 | Operations | `deepClone(operations)` |
| 8 | Chart Config | every `SERIALIZED_CHART_OPTION_FIELDS` key |
| 9 | Notes | `notes` |
| 10 | `S₂ Start Time` | `day_scope_start_time_in_millis` |

One radio-selected source event, N checkbox-selected targets, driven by
`MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP` and `MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP_SETTING`
(`ophis_view__config.js:257-292`). Transient selection state lives on the event objects as
`checked_for_swap_source` / `checked_for_swap_target` and is explicitly deleted before saving
(`ophis_model__validation.js:473-474`).

### 6.7 Auto-Recalculate + Recalc

`GLOBAL_OPTION__AUTO_RECALCULATE_Z_DATES = "auto_recalculate_z_dates"` (`ophis_config.js:33`),
**defaults to `true`** (`ophis_main.js:42-44`). UI: a "Recalc" button and an "Auto" checkbox in a new
bar under the X-Dates panel (`ophis.html:202-224`), wired in
`ophis_model__persistence.js:348-356`. Turning "Auto" on triggers an immediate
`recalculateZDatesHandler()` (`ophis_main.js:379-382`). See §2.8.

### 6.8 In-app help buttons

Four new `?` buttons — Iso-Events, X-Dates, T-Dates, Filters (`ophis.html:103`, `165`, `326`, `291`)
— plus the empty-panel messages `#x-date-container-starting-message` and
`#t-date-container-starting-message`. Strings at `ophis_view__strings.js:6-10`.

### 6.9 Content-Security-Policy

`ophis.html:72` — see §7.

---

## 7 · Security-relevant changes

`escapeString` is **byte-identical** in both versions (v9 `main.js:11-18`, v12 `main.js:26-33`):

```js
function escapeString(someString) {
  var toReturn = someString;
  toReturn = toReturn.replace(/\\/g, '\\\\');
  toReturn = toReturn.replace(/"/g,'\\"');
  return toReturn;
}
```

Still backslash and double-quote only — no `\n`, no `\r`, no U+2028/U+2029. Every
`executeJavaScript` string-concatenation sink from v9 survives unchanged.

`webPreferences` is **unchanged**: `nodeIntegration: true` plus a `preload` in both
(v9 `main.js:182-188`, v12 `main.js:362-369`). Neither version sets `contextIsolation`,
`sandbox`, or `webSecurity`. The only addition to the options object is `show: showWindow`.

| # | Change | Direction | Detail |
|---|---|---|---|
| 1 | **CSP meta tag added** | hardening, partial | `ophis.html:72`: `default-src 'self' 'unsafe-inline' data: gap: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval';`. It closes remote fetch/XHR/WebSocket and remote script/image loads — meaningful for an app whose own README asks users to run it air-gapped. It does **not** constrain script execution: `'unsafe-eval'` is mandatory here because `validateOperationString` compiles user equations with `new Function` (`ophis_model__validation.js:158`), and `'unsafe-inline'` is required by the several hundred inline `onmouseover=` / `onclick=` attributes the view code generates. It is also placed **after** every `<script src="./lib/…">` tag in `<head>`, so those loads are not covered; only the `src/*.js` files appended to `<body>` afterwards are. Net: a real but narrow win. |
| 2 | **Renderer can now create directories** | **weakening** | `main.js:267-273`. The `autoSaveToFile` IPC has always given the renderer arbitrary-path file write; v12 adds `fs.mkdirSync(dirName, { recursive: true })` so a write to a non-existent path now succeeds instead of failing. Combined with `exportHeadlessMultipleCsvs`, which constructs paths by string concatenation from `--output-path` and the **event name** (`ophis_view__export.js:120-131`), a crafted event name in an `.oph` file can create directories and files outside the intended tree. `sanitizeFileName` (`ophis_utils.js:819-830`) exists and does strip `..` and slashes — but it is applied only to `getCsvFileNameForExport`'s leaf name, not to `appState.headless_output_path` or the base directory. |
| 3 | **`logToCli` channel added** | weakening, low | `preload.js:22-24` / `main.js:201-203`: the renderer can write arbitrary text to the parent process's stdout. That stdout is now the machine-readable CLI transcript, so a hostile `.oph` (via an event name or an operation-error message echoed by `console.error`) can inject fabricated `OPH_ERROR:` lines into whatever parses the output. |
| 4 | **`resetProgram` channel added** | neutral | `main.js:171-199` — `win.reload()`. No parameters, no path handling. |
| 5 | **`refreshMenuOptions` channel added** | neutral | Three booleans, used only to set `checked` on menu items. |
| 6 | **`closeAppWithHeadless{Error,Success}` added** | neutral | Renderer can terminate the app with a chosen exit code. |
| 7 | **Single-instance lock disabled for headless** | weakening, situational | `main.js:219`. Any number of concurrent instances; the file-handoff protection that v9 relied on is bypassed whenever `--headless` is present in argv. |
| 8 | **`beforeunload` guard removed under Electron** | weakening, minor | `ophis_main.js:673-675`. The renderer no longer intercepts navigation away; the main process's `before-quit` interception remains, but `exitAppWithStatusCode` removes even that (`main.js:143-151`). Unsaved-work protection now rests entirely on the auto-save path. |
| 9 | **New `executeJavaScript` sink** | neutral | `main.js:222` logs `JSON.stringify(argv)` from a second instance through `logToRenderer` → `escapeString` → `console.log("main.js: …")`. `JSON.stringify` already escapes quotes and newlines and `escapeString` re-escapes the backslashes, so this composes safely; it is nonetheless one more attacker-influenced string entering a `executeJavaScript` template. |
| 10 | **`did-fail-load` diagnostics** | neutral | `main.js:380-394`. Logs to the main-process console only. |
| 11 | **New `onOphFileOpenError` path** | neutral / improvement | `main.js:309-322`. When headless it writes to `console.error` and exits 1 rather than injecting into the renderer, removing one injection surface in that mode. |

`FEATURE_FLAG__REQUIRE_SIGN_IN = false` and the five SHA-512 `ACCOUNT_HASHES` are **identical** in
both versions (v9 `ophis_config.js:5-14`, `:268`; v12 `:5-14`, `:291`). No change to the sign-in
gate. v12 additionally short-circuits it for headless (`ophis_main.js:125`).

---

## 8 · Version migration, and what a v9 `.oph` does in v12

### 8.1 The migration functions

| Function | v9 | v12 | Live callers |
|---|---|---|---|
| `cloneDefaultOperationsForAppVersionLte7()` | `ophis_model__params.js:112` | `:115` | **none** in either version — every call site is commented out |
| `cloneDefaultOperationsForAppVersionGte8()` | `:116` | `:119` | v9: 3 live. v12: 0 direct — only via `Gte10` |
| `cloneDefaultOperationsForAppVersionGte10()` | — | `:137` | v12: `ophis_controller.js:128`, `ophis_model__validation.js:465, 638, 642`, `ophis_view__settings.js:660` |

`appVersionForImportAsInt` (v9 `ophis_model__validation.js:421-432`, v12 `:889-900`) is derived
identically in both:

```js
var appVersionForImportString = importDict.app_version;
var appVersionForImportAsInt = -1;
if ( appVersionForImportString ) {
    appVersionForImportAsInt = parseInt(appVersionForImportString);
    if ( appVersionForImportAsInt <= 0 ) {
        appVersionForImportAsInt = parseInt(APP_VERSION);
    }
} else {
    appVersionForImportAsInt = parseInt(APP_VERSION);
}
```

Its **only** consumer, in both versions, is `parseScoringSystemForLoadedIsoEvent`. And as §5.3
shows, both of that function's branches assign the same value. **So `app_version` in an `.oph` file
has no observable effect on load in either v9 or v12.** There is no version-keyed migration of
operations, weights, MSRF, or anything else.

### 8.2 Opening a v9 `.oph` in v12 — step by step

A v9-written file looks like:

```json
{ "app_version": "9",
  "iso_events": [ { "name": …, "x_dates": [{date, time, enabled}…], "lat": …, "long": …,
                    "location_enabled": …, "scope": "EVENT_SCOPE__…", "type": "EVENT_TYPE__…",
                    "operations": [ …15 entries… ], "scoring_system": "SCORING_SYSTEM__GTE_V8",
                    …serialized filter/chart keys…, "chart_x_min": …, … } ] }
```

v12 runs `validatePotentialIsoEventImportAssumingValidJsonSyntax`
(`ophis_model__validation.js:885-998`) over it, per event:

| Step | Function | Result for a v9 file |
|---|---|---|
| 1 | `ensureValidEventName` (`:749`) | unchanged |
| 2 | `ensureValidEventNotes` (`:758`) | **`notes` injected as `""`** |
| 3 | `ensureValidEventDayScopeStartTime` (`:767`) | **`day_scope_start_time_in_millis` injected as `0`** — i.e. v9 behaviour |
| 4 | `ensureValidEventScope` (`:802`) | v9 always wrote `scope`, so kept |
| 5 | `ensureValidEventType` (`:783`) | kept |
| 6 | `parseSerializedFieldsForLoadedIsoEvent` (`:603`) | any missing serialized field gets its `enabledByDefault` |
| 7 | `parseOperationsForLoadedIsoEvent` (`:620`) | array present and `length >= 1` → **"be pretty permissive"**, kept verbatim |
| 8 | `parseScoringSystemForLoadedIsoEvent` (`:647`) | `GTE_V8` recognised, kept |
| 9 | `parseLatLongForLoadedIsoEvent` (`:692`) | unchanged unless out of range |
| 10 | X-Dates (`:927-946`) | validated; under LOOSE (the interactive default) bad ones are removed rather than rejected |
| 11 | T-Dates (`:947-961`) | absent → **`t_dates` set to `[]`** |

**The critical line is step 7.** A v9 file carries fifteen operations, so v12 keeps fifteen. The
sixteenth default operation, `X2+YxOPH_HEP`, is **not** added. A v9 event opened in v12 therefore
produces a *different* result set from a freshly-created v12 event with the same X-Dates — the v9
event is missing an entire ALPHA-weighted projection, which changes the Z-Date set, every affected
`hit_count`, and every affected `score`.

There is **no upgrade prompt, no migration notice, and no `app_version`-keyed backfill**. The only
way to acquire the 16th operation on an old event is to add it by hand on the Operations screen, or
to press the Operations screen's reset control (`ophis_view__settings.js:660`, which calls
`cloneDefaultOperationsForAppVersionGte10()` and discards any customisation).

### 8.3 What else differs for a v9 file in v12, even with the operations untouched

1. **Sunset ephemeris.** HH:MM-scope events use CosineKitty in v12, Meeus in v9 (§2.5). Y itself can
   change.
2. **Score rounding.** Two decimals in v12 (§2.4), affecting both display and the min-score filter.
3. **X-Date and operation ordinals.** Stable in v12, compacted in v9, whenever anything is disabled
   or invalid (§2.4). Labels and CSV `OP…` values shift.
4. **Duplicate operations now error.** A v9 file with two equivalent operations loads, but the second
   is excluded from `runOperations` and shows a validation error (§2.9). In v9 both ran and both
   scored.
5. **CSV export columns.** Three in v9, eight in v12 (§6.5).
6. **Default validation strictness.** Interactive v12 is LOOSE (more forgiving than v9's fixed
   behaviour); headless v12 is STRICT (less forgiving). `--input-validation-mode original` reproduces
   v9 (§2.7).
7. **`scope` absent** (hand-written files only) resolves to `EVENT_SCOPE__DAYS` in v12
   (`ophis_config.js:350`) versus `EVENT_SCOPE__HH_MM` in v9 (`ophis_config.js:325`, via
   `FEATURE_FLAG__SHOW_LOCATION == true`). The v12 comment records why: "Based on user feedback, the
   default scope, if it's missing from an `.oph` file, should be Days."
8. **`operations` absent** (hand-written files only) is backfilled with sixteen in v12, fifteen in
   v9.

### 8.4 Writing back out

Re-saving a v9-loaded event from v12 (defaults: Prettify on, Minify off) produces a file with
`"app_version": "12"`, the three new keys populated with their defaults, and the fifteen original
operations preserved. Re-opening that in v9 is safe: v9 ignores `notes`, `t_dates` and
`day_scope_start_time_in_millis` as unknown keys, and `parseInt("12") >= 8` in the scoring branch
lands on the same value it always does.

**Unless Minify was enabled.** A minified v12 file can omit `scope`, `scoring_system`, `type`,
`lat`/`long`, `operations` and every default-valued filter/chart field. Opening such a file in v9
yields: `scope` → `EVENT_SCOPE__HH_MM` (v9's `DEFAULT_EVENT_SCOPE`, **not** the Days the file was
saved with — silent scope corruption), and `operations` → `cloneDefaultOperationsForAppVersionGte8()`,
i.e. **fifteen**, silently dropping the 16th. The minify warning dialog (§2.6) warns about exactly
this in the forward direction; nothing warns about the backward one.

---

## 9 · Defects found in the delta

Ordered by consequence.

| # | Location | Description |
|---|---|---|
| 1 | `ophis_model__validation.js:543-545` (v12) | Copy-paste bug: tests `day_scope_start_time_in_millis` and deletes `notes`. Fires when the field is the string `"0"`, silently destroying user notes on a minified save. Clearly intended to be a duplicate of `:523-525`. |
| 2 | `ophis_dependencies.js:75-76` (v12) | `nativeUtcDateCloned` is rounded and then never used; the unrounded date reaches the library and becomes the cache key. The documented purpose of the function is not implemented. |
| 3 | `ophis_dependencies.js:50-56` (v12) | `SUNSET_LIBRARIES` is documented as an ordered fallback chain for `getSunsetOnNativeUtcDate`, but that function hard-codes CosineKitty. The chain is only honoured for *sampling*. The per-library `enabled` field is never read. |
| 4 | `ophis_view__config.js:54` (v12) | `noCalender` — misspelt flatpickr option (`noCalendar`), which is why the calendar has to be hidden by hand at `ophis_view__settings.js:130-141`. The source blames flatpickr for it. |
| 5 | `ophis.html:72` (v12) | CSP meta tag placed after every `<script src>` in `<head>`; those loads are not covered by it. |
| 6 | `ophis_view__export.js:314-317` (v12) | `if ( opNum < 10 ) opNum = "0" + opNum;` runs before the null check, producing `"OP0null"` for a missing `operation_ordinal`. |
| 7 | `ophis_model__sorting.js:44` (v12) | T-Dates are converted with `xDateToNativeDate(scope, ithTDate)` — no lat/long — while X-Dates in the same function pass `isoEvent.lat, isoEvent.long`. Wrong for HH:MM-scope events. |
| 8 | `ophis_utils.js:459-464`, `ophis_dependencies.js:99-108` (v12) | The sunset cache stores `Date` objects in a parameter named `sunsetInMillis` and reads them back through `utcMillisToNativeDate`. Works only because `new Date(aDate)` clones. |
| 9 | `ophis_model__validation.js:182` (v12) | Shipped typo in a user-visible string: **"Indentical** to Operation N and each Operation must be unique." |
| 10 | `main.js:509-520` (v12) | `if ( isRunningHeadless() === false \|\| isRunningHeadless() === true && inputFilePath )` then logs `"Will process .oph file in headless mode: " + inputFilePath` — printed even in GUI mode, where `inputFilePath` is usually `null`. Also, `exitAppWithStatusCode(STATUS_CODE__ERROR)` on a missing `--output-path` is not followed by a `return`, so `createWindow()` is still reached in source order. |
| 11 | `ophis_view__rebuild.js:308`, `:596-614`; `ophis.html:464-503`; `img/notes_icon*.png` | The entire notes **pop-up** feature is dead — markup, CSS, two shipped PNGs, and two commented-out functions. |
| 12 | `ophis.css` (v12) | Missing comma in the master-checkbox selector list: `… .iso_event_swap_checkbox_master .iso_event_swap_setting_checkbox_master` is a descendant selector, so the second class never receives `margin-top:5px`. |
| 13 | `ophis_model__validation.js:174-185` (v12) | The uniqueness-check block's braces are indented one level short of its body; the closing brace sits alone at `:185`. Parses fine, reads as a mistake. |
| 14 | `ophis_model__params.js:115-117` (v12), `:112-114` (v9) | `cloneDefaultOperationsForAppVersionLte7()` is dead in both versions — every call site is a comment. |
| 15 | `ophis_main.js:231-243` (v12) | Headless mode treats **any** entry in `appState.startupErrors` as fatal, including cosmetic self-check and unit-test findings that the GUI merely records. A future MSRF edit that trips `selfCheckMsrfOnStartup` would take the CLI offline while leaving the GUI working. |

---

## 10 · Nothing changed here

Recorded so a future reader does not re-derive it.

- **MSRF numbers** — all 390, in all three filters, in the same order. Identical bytes.
- **MSRF points and multipliers** — `1 / 2 / 2` and `1.5 / 2.0 / 2.0`. Identical.
- **`HIGHEST_MSRF_NUMBER = 2559`.**
- **`selfCheckMsrfOnStartup`** — byte-identical.
- **The equation constants** — `OPH_PI`, `OPH_PHI`, `OPH_CRV`, `OPH_HEP = 7.01`, and the whole
  `FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION` resolution block.
- **`ALL_OPH_CONSTANTS`** — the same four names.
- **The scoring arithmetic** — `scoreZDates` body, `getOperationScore`, `sumUpMsrfMatchSubscore`,
  `getMsrfScoreMultiplier`, `getMsrfScoreMultiplierForFilter`. Only the final 2-dp rounding is new.
- **`escapeString`** — byte-identical.
- **`webPreferences.nodeIntegration = true`** — unchanged.
- **`ACCOUNT_HASHES`** (five SHA-512 values) and **`FEATURE_FLAG__REQUIRE_SIGN_IN = false`.**
- **`MINIMUM_NUMBER_OF_X_DATES = 2`, `MINIMUM_OPERATIONS_REQUIRED = 1`,
  `MINIMUM_DAYS_BETWEEN_FIRST_TWO_X_DATES = 1`, `MINIMUM_DAYS_BETWEEN_SUBSEQUENT_X_DATES = 1`,
  `MAXIMUM_ROTATION_COUNT_Y = MAXIMUM_ROTATION_COUNT_Z = 36500`.**
- **`ophis_view__chart_config.js`** — byte-identical.
- **`README.txt`** — byte-identical.
- **Every vendored library** except the newly added `suncalc.js`.
