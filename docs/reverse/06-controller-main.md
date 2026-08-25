# 06 — Controller / Main: App Bootstrap, Controller API, Lifecycle

**Subsystem:** `controller-main`
**Primary sources (read in full):**
- `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/src/ophis_main.js` (747 lines)
- `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/src/ophis_controller.js` (508 lines)

**Scope note.** This document specifies *only* those two files, plus exact signatures/return
shapes of the cross-module functions they call (verified by reading the definitions, cited
below). Model internals (`runOphisOnEvent` math), view rendering internals
(`refreshCurrentPage` beyond its dispatch table), validation internals, and chart internals are
specified in their own documents; here they are named, their contracts pinned, and their
side effects on `appState` recorded.

---

## 0. ONE-PARAGRAPH ORIENTATION

`ophis_main.js` is not a module. It is a classic-script file that (a) declares one mutable
global object `appState`, (b) defines a six-step init waterfall `init_step1..init_step6` plus a
finalization step, (c) wires every top-level DOM listener in one function
`initTopLevelListeners()`, and (d) at the very bottom, conditionally self-boots by calling
`init()` when *not* running under Electron. `ophis_controller.js` is the mutation layer: every
function that changes `appState.isoEvents` or `appState.globalOptions` and then decides *how
much* of the UI to rebuild. The single choke point for "recalculate + repaint" is
`refreshXDates(refreshType, preserveScrollPosition, ophisInputChange)` in
`ophis_controller.js:433`. Essentially every user interaction in the entire program funnels
into that one function.

---

## 1. GLOBAL STATE: `appState`

Declared at `ophis_main.js:4-31` at file scope with `var`, so it is `window.appState`.

```ts
// ophis_main.js:4-31
var appState = {
  startupErrors: [],              // string[]  — filled by init_step4, later concatenated into
                                  //   results.errors on EVERY page refresh (ophis_view.js:194)
  hasUnsavedChanges: false,       // boolean
  isSignedIn: false,              // boolean — set true in init_step3_loadImages (main.js:200)
  isoEvents: [],                  // IsoEvent[] — THE document model
  mostRecentIsoEventMapClick: 0,  // number — index of the event whose map pin is being edited
  chart: null,                    // Chart.js instance; "Created lazily just-in-time, per event."
  map: FEATURE_FLAG__SHOW_LOCATION == true
        ? L.map('map').setView([0, 0], DEFAULT_MAP_SELECTION_ZOOM)   // <-- RUNS AT PARSE TIME
        : null,
  mapMarkerLayer: FEATURE_FLAG__SHOW_LOCATION == true ? L.layerGroup() : null,
  loadedFromDisk: false,          // boolean — set true by swapInNewIsoEventArray()
  viewUpdateCount: 0,             // number — incremented by refreshCurrentPage; ==1 drives the
                                  //   one-shot splash fade-out (ophis_view.js:97-99)
  justChangedField: {},           // { [serializedField.varName]: boolean }
  globalOptions: {},              // see §1.2
  intialized: false,              // *** DEAD FIELD — typo, never read or written anywhere else
  blockChartFlushToDisk: false,   // boolean — suppresses persistence of chart zoom/pan
  externalFilePath: null,         // string|null — .oph path handed in by OS file association
  initialized: false,             // boolean — the live one; set true in initAppStateFinalization
  needToFinalizeAppState: false,  // boolean — "the async file open still owes me a finalize"
  previousScreen: null,           // OPHIS_SCREEN__* | null
  headless: false,                // boolean
  headless_output_type: OPH_HEADLESS_OUTPUT_TYPE__DEFAULT,  // *** WRITE-ONLY, see GOTCHA G-11
  headless_output_path: "",       // string
  headless_current_epoch_millis: DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS, // Number.MIN_SAFE_INTEGER
  headless_multiple_files: false, // boolean
  filePathFromMainArgs: null,     // string|null
  fileInputValidationMode: FILE_INPUT_VALIDATION_MODE__LOOSE,
  latestResults: {}               // OphisResults — see §3.4. NOTE: starts as {} not null.
}
```

### 1.1 Constants referenced by the initializer (all from other files)

| Constant | Value | Defined at |
|---|---|---|
| `FEATURE_FLAG__SHOW_LOCATION` | `true` | `ophis_config.js:313` |
| `DEFAULT_MAP_SELECTION_ZOOM` | `4` | `ophis_view__config.js:43` |
| `MAP_MAX_ZOOM` | `5` | `ophis_view__config.js:45` |
| `MAP_MIN_ZOOM` | `0` | `ophis_view__config.js:44` |
| `OPH_HEADLESS_OUTPUT_TYPE__DEFAULT` | `"OPH_HEADLESS_OUTPUT_TYPE__CSV"` | `ophis_config.js:26-27` |
| `DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS` | `Number.MIN_SAFE_INTEGER` | `ophis_config.js:23` |
| `FILE_INPUT_VALIDATION_MODE__LOOSE` | `"FILE_INPUT_VALIDATION_MODE__LOOSE"` | `ophis_config.js:338` |
| `DEFAULT_SKIN_MODE` | `SKIN_MODE__CLASSIC` = `"SKIN_MODE__CLASSIC"` | `ophis_view__config.js:5,8` |
| `OPHIS_SCREEN__ABOUT` | `"OPHIS_SCREEN__ABOUT"` | `ophis_view__config.js:120` |
| `LAT_LIMIT` / `LONG_LIMIT` | `65` / `180` | `ophis_config.js:426-427` |

### 1.2 `appState.globalOptions` seeding (module scope, `ophis_main.js:34-47`)

Runs immediately after the `appState` literal, before any function is called:

```js
appState.globalOptions[GLOBAL_OPTION__LOCAL_TIME_OFFSET_IN_MILLIS] = 0;   // "local_time_offset_in_millis"
appState.globalOptions[GLOBAL_OPTION__START_SCREEN]  = OPHIS_SCREEN__ABOUT; // "start_screen"
appState.globalOptions[GLOBAL_OPTION__SKIN_MODE]     = DEFAULT_SKIN_MODE;   // "skin_mode"
appState.globalOptions[GLOBAL_OPTION__CURRENT_FILE_PATH] = "";              // "current_file_path"

for ( var i = 0; i < GLOBAL_BOOLEAN_OPTIONS.length; i++ ) {
    var ithGlobalBooleanOption = GLOBAL_BOOLEAN_OPTIONS[i];
    if ( ithGlobalBooleanOption == GLOBAL_OPTION__AUTO_RECALCULATE_Z_DATES
      || ithGlobalBooleanOption == GLOBAL_OPTION__PRETTIFY_OPH_FILES ) {
        appState.globalOptions[ithGlobalBooleanOption] = true;
    } else {
        appState.globalOptions[ithGlobalBooleanOption] = false;
    }
}
```

`GLOBAL_BOOLEAN_OPTIONS` (`ophis_config.js:76-84`) is, in order:

```
blur_about_screen, hide_operations_col_completely, prettify_x_date_export_output,
minify_x_date_export_output, auto_recalculate_z_dates, prettify_oph_files, minify_oph_files,
hide_date_col, hide_hits_col, hide_score_col, hide_msrf_col, hide_operations_col
```

So the resulting default map is: everything `false` **except** `auto_recalculate_z_dates: true`
and `prettify_oph_files: true`.

**Note the missing key.** `current_iso_event_index` is *never* seeded here. It first materializes
lazily inside `getCurrentIsoEvent()` (`ophis_controller.js:6-10`). See GOTCHA **G-1**.

**Exact string keys** (`ophis_config.js:29-45`) — these cross module boundaries and are also
the on-disk `.oph` / localStorage keys:

```
"start_screen"  "skin_mode"  "current_file_path"  "local_time_offset_in_millis"
"auto_recalculate_z_dates"  "blur_about_screen"  "hide_date_col"  "hide_hits_col"
"hide_score_col"  "hide_msrf_col"  "hide_operations_col"  "hide_operations_col_completely"
"prettify_x_date_export_output"  "minify_x_date_export_output"
"prettify_oph_files"  "minify_oph_files"
plus (lazily) "current_iso_event_index"
```

---

## 2. STARTUP SEQUENCE — first executed line to interactive app

### 2.0 Pre-init: module-scope side effects (BEFORE any init function)

Because these are plain classic scripts concatenated by `<script>` tags, module-scope code runs
in file order at parse time. The load order is dictated by the host `index.html`, **which is NOT
present in this repository** (see §8, Missing Artifacts). From the code, the required order is
at minimum: third-party `lib/*` → `ophis_logging.js` → `ophis_config.js` →
`ophis_view__config.js` / `ophis_view__chart_config.js` / `ophis_model__params.js` →
`ophis_utils.js` → `ophis_view*.js` / `ophis_model*.js` → `ophis_controller.js` →
`ophis_main.js` (last, since it self-boots).

Module-scope side effects that matter, in the order they must occur:

1. `ophis_logging.js:5-7` — captures `self.originalConsoleLog/Warn/Error` before anything can
   overwrite them.
2. `ophis_config.js`, `ophis_view__config.js`, `ophis_model__params.js` — build every constant
   table, including `SERIALIZED_FILTER_FIELDS`, `SERIALIZED_CHART_OPTION_FIELDS`,
   `ALL_SERIALIZED_FIELDS`, `MASTER_CHECKBOX_CONFIGS`, `MSRF_FILTER__FINAL`,
   `DEFAULT_OPHIS_OPERATIONS_LTE_V7`.
3. `ophis_view__output.js:68` — `clockRefreshLoop();` starts a **perpetual 500 ms
   `setTimeout` loop** that calls `updateLocalTime()` forever. It starts before init and is
   never cancelled. (`ophis_view__output.js:59-68`.)
4. `ophis_main.js:4-31` — the `appState` literal. **Line 11 constructs the Leaflet map
   eagerly**: `L.map('map').setView([0,0], DEFAULT_MAP_SELECTION_ZOOM)`. This requires the DOM
   element `#map` to already exist when `ophis_main.js` is parsed, i.e. the script tag must be
   at the end of `<body>` (or the whole thing throws). See GOTCHA **G-2**.
5. `ophis_main.js:34-47` — globalOptions seeding (§1.2).
6. `ophis_main.js:743-747` — the boot decision:

```js
// ophis_main.js:743-747
if ( isRunningElectron() ) {
    // Electron calls init();
} else {
    init();
}
```

`isRunningElectron()` is `return window.electronBridge ? true : false;` (`ophis_utils.js:646-648`).
Under Electron, the preload/main process is expected to call `window.init(filePath)` itself,
passing the `.oph` path from `process.argv`. In a browser, init runs immediately with
`filePathFromMainArgs === null`.

### 2.1 `init(filePathFromMainArgs = null)` — `ophis_main.js:49-51`

Pure delegation: `init_step1_getAppVersion(filePathFromMainArgs)`.

### 2.2 STEP 1 — `init_step1_getAppVersion(filePathFromMainArgs)` — `ophis_main.js:53-119`

Establishes: headless mode, logging pipe, CLI-ish options, and `APP_VERSION`.

Ordered steps:

1. `console.log("init_step1_getAppVersion()")`.
2. `appState.headless = getQueryParamBool("headless", false)` — parsed **first**, per the
   comment *"The headless flag has to be parsed first, to route logging pipes appropriately."*
   (`ophis_main.js:57`).
3. `toggleConsoleLogOverride()` (`ophis_logging.js:48-61`). Overrides `console.log/warn/error`
   with wrappers that forward to `ophisLog()` → `electronBridge.logToCli(message)` **only when
   `isRunningHeadless() && isRunningElectron()`**; otherwise restores the originals.
   The wrapper forwards only `args[0]`.
4. `appState.filePathFromMainArgs = filePathFromMainArgs`.
5. `appState.headless_output_path = getQueryParamString("headless_output_path", "")`.
6. `appState.headless_output_type = getHeadlessOutputTypeFromQueryParams()`
   (`ophis_view__export.js:174-183`): reads query param `headless_output_type` defaulting to
   `"csv"`; `"csv"` → `OPH_HEADLESS_OUTPUT_TYPE__CSV`, anything else warns and returns the
   default. **The stored value is never read again** (GOTCHA G-11).
7. `appState.fileInputValidationMode = getInputValidationModeFromQueryParams()`
   (`ophis_view__export.js:146-172`). Reads query param `input_validation_mode`:
   - `"loose"` → `FILE_INPUT_VALIDATION_MODE__LOOSE`
   - `"original"` → `FILE_INPUT_VALIDATION_MODE__ORIGINAL`
   - `"strict"` → `FILE_INPUT_VALIDATION_MODE__STRICT`
   - any other non-empty value → warns, `STRICT`
   - empty/absent → `STRICT` if headless, else `LOOSE`
8. `appState.headless_multiple_files = getQueryParamBool("headless_multiple_files", false)`.
9. `console.log("Using file input validation mode: " + appState.fileInputValidationMode)`.
10. Epoch-override parse and validation:

```js
// ophis_main.js:69-77
var rawHeadlessCurrentEpochTimeMillis = getQueryParamString("headless_current_epoch_millis");
appState.headless_current_epoch_millis =
    getQueryParamInt("headless_current_epoch_millis", DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS);

if ( rawHeadlessCurrentEpochTimeMillis && rawHeadlessCurrentEpochTimeMillis != "" ) {
    if ( appState.headless_current_epoch_millis == DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS ) {
         exitHeadlessWithError("--current-epoch-millis had an invalid value: " + rawHeadlessCurrentEpochTimeMillis);
         return;   // <-- EARLY RETURN. Init stops dead here.
    }
}
```

This value later drives `getCurrentLocalTime()` (`ophis_utils.js:650-662`): when headless *and*
`headless_current_epoch_millis > Number.MIN_SAFE_INTEGER`, "now" is frozen to that epoch,
making headless runs deterministic. Otherwise `moment().add(millisOffset,'milliseconds').toDate()`
rounded to the nearest minute.

11. **Version fetch (async, XHR).**

```js
// ophis_main.js:79-118
var cacheBuster = Math.floor(Math.random() * 99999999);
getFileContents("./package.json?v="+cacheBuster, function(contents) { ... });
```

`getFileContents(path, callback)` (`ophis_utils.js:710-726`) is a bare `XMLHttpRequest` GET;
`callback(xhr.responseText)` on HTTP 200, `callback(null)` on anything else.

Inside the callback:
- `versionFromFile = APP_VERSION` (the compile-time literal `"12.0"`, `ophis_config.js:3`).
- If `contents` truthy → `JSON.parse`; on throw, `printWarning("Error parsing package.json.")`;
  else `versionFromFile = packageJson.version || versionFromFile`.
- If `contents` falsy → `printWarning("Could not get version from package.json.")`. (The
  `document.title = "Ophis"` and `alert(...)` fallbacks are commented out at
  `ophis_main.js:92-93`.)
- Version compaction:
```js
var firstComponent  = getComponentOfSemVer(versionFromFile, 0);  // ophis_utils.js:697-708
var secondComponent = getComponentOfSemVer(versionFromFile, 1);
if ( secondComponent && secondComponent != "0" ) { APP_VERSION = firstComponent + "." + secondComponent; }
else { APP_VERSION = firstComponent; }
```
  `getComponentOfSemVer` splits on `"."` and returns `"X"` if the component is missing/falsy.
  With `package.json` `"version": "12.0.0"` → first `"12"`, second `"0"` → **`APP_VERSION`
  becomes `"12"`**, not `"12.0"`. This is deliberate display compaction.
- Release-candidate suffix:
```js
var indexOfRc = versionFromFile.indexOf("rc");
if ( indexOfRc >= 0 ) {
    var rcComponent = versionFromFile.substring(indexOfRc, versionFromFile.length);
    if ( rcComponent ) { rcComponent = rcComponent.replaceAll(".", ""); APP_VERSION += rcComponent; }
}
```
  For `"10.0.0-rc1"` the `.indexOf("rc")` finds the `rc` in `-rc1` and appends `"rc1"`.
  **Bug surface:** `indexOf("rc")` matches the substring `rc` anywhere, so a version string
  containing `rc` for other reasons would corrupt the label. Cosmetic only — `APP_VERSION` is
  used for the window title (`ophis_view.js:64`), the `#app-version` badge
  (`ophis_view.js:88-90`), and the `app_version` field written into every save blob
  (`ophis_model__persistence.js:121`).
- Finally: `init_step2_signIn(filePathFromMainArgs)`.

**Because the version fetch is async, everything from step 2 onward is deferred to an XHR
callback.** In a rewrite: `await fetch()` or just hard-code the version.

### 2.3 STEP 2 — `init_step2_signIn(filePathFromMainArgs, account = "", errorMessage = "")` — `ophis_main.js:121-179`

See §5 for the full auth discussion. Control flow:

```js
// ophis_main.js:125-128 — THE BYPASS
if ( isRunningHeadless() || isRunningElectron() == false || isFlagEnabled(FEATURE_FLAG__REQUIRE_SIGN_IN) == false ) {
    init_step3_loadImages(filePathFromMainArgs);
    return;
}
```

`FEATURE_FLAG__REQUIRE_SIGN_IN = false` (`ophis_config.js:291`), so **in v12 the third clause is
always true and the sign-in gate is unconditionally skipped**. In a browser the second clause is
also always true. The gate is dead code in shipped v12.

If it *were* reached: hide `#initial-loading-container`, build a password prompt dialog, and on
"Sign In" compare `sha512(account)` against a 5-entry hard-coded array. Detail in §5.

### 2.4 STEP 3 — `init_step3_loadImages(filePathFromMainArgs)` — `ophis_main.js:196-220`

Establishes: `isSignedIn`, splash visible, all chart raster assets decoded.

```js
console.log("init_step3_loadImages()");
appState.isSignedIn = true;                                   // ophis_main.js:200

if ( isRunningHeadless() ) {
    console.log("Skipping image load for headless mode.");
    init_step4_selfCheck(filePathFromMainArgs);
} else {
    if ( isRunningElectron() ) { window.electronBridge.onSignedIn(); }   // main.js:207-209
    document.getElementById("initial-loading-container").style.visibility = "visible";
    loadAstroIndicators(function() { init_step4_selfCheck(filePathFromMainArgs); });
}
```

`loadAstroIndicators(onAllImagesLoaded)` (`ophis_view__chart_config.js:137-176`) constructs
`new Image()` for every moon phase in `MOON_PHASE_DICT`, four eclipse PNGs, and four hit-count
symbol PNGs, keying them into the global `CHART_IMAGES` dict by `imgElem.astro_indicator`. It
invokes the callback **only** when `getDictionarySize(CHART_IMAGES) == CHART_IMAGE_COUNT`, where
`CHART_IMAGE_COUNT = getDictionarySize(MOON_PHASE_DICT) + 4 + 4`
(`ophis_view__chart_config.js:119`).

Image paths (relative, all bundled):
```
img/astro_indicators/<moonPhaseObject.imagePath>   (per MOON_PHASE_DICT entry)
img/astro_indicators/solar_eclipse_full.png
img/astro_indicators/solar_eclipse_partial.png
img/astro_indicators/lunar_eclipse_full.png
img/astro_indicators/lunar_eclipse_partial.png
img/hit_symbols/gemini.png     (CHART_SYMBOL_IMAGE_SRC__GEMINI)
img/hit_symbols/triangle.png   (CHART_SYMBOL_IMAGE_SRC__TRIANGLE)
img/hit_symbols/diamond.png    (CHART_SYMBOL_IMAGE_SRC__DIAMOND)
img/hit_symbols/circle.png     (CHART_SYMBOL_IMAGE_SRC__CIRCLE)
```

**There is no `onerror` handler.** If any one image 404s, the counter never reaches
`CHART_IMAGE_COUNT`, the callback never fires, and **startup hangs forever on the splash
screen**. See GOTCHA **G-3**.

### 2.5 STEP 4 — `init_step4_selfCheck(filePathFromMainArgs)` — `ophis_main.js:222-243`

Establishes: `appState.startupErrors`.

```js
appState.startupErrors = [];
selfCheckMsrfOnStartup(appState.startupErrors);   // ophis_model__validation.js:1041
runUnitTests(appState.startupErrors);             // ophis_unit_tests.js:2

if ( isRunningHeadless() && appState.startupErrors.length > 0 ) {
    for (...) console.error(ithError);
    exitHeadlessWithError("Self-check failed.");   // TERMINAL — no further init
} else {
    init_step5_dependencies(filePathFromMainArgs);
}
```

`selfCheckMsrfOnStartup` walks `MSRF_FILTER__FINAL` and asserts each entry is either a positive
integer or a recognised vortex number. `runUnitTests` (`ophis_unit_tests.js:2-12`) wraps three
checks in a try/catch: `checkFeatureFlags` (currently a no-op — its only assertion is commented
out at `ophis_unit_tests.js:66`), `selfCheckMsrfFilters`, `spotCheckFilterMatches`
(asserts `getMsrfMatch(12.5) == null` and `getMsrfMatch(12.4)` matches `MSRF_FILTER__NORMAL`).
Any throw is caught and pushed as `"Encountered error while running unit tests: " + e`.

**Non-headless behaviour is surprising:** startup errors do NOT block init. They are stashed
and then, on *every* subsequent page refresh,
`results.errors = results.errors.concat(appState.startupErrors)` (`ophis_view.js:194`) — so a
self-check failure permanently poisons every result set with an error banner. See GOTCHA **G-4**.

### 2.6 STEP 5 — `init_step5_dependencies(filePathFromMainArgs)` — `ophis_main.js:245-267`

Establishes: Chart.js plugin registration, all global DOM listeners, tooltips, the Leaflet map
interactions, and chart click/drag handlers.

```js
if ( isRunningHeadless() ) {
    console.log("Skipping UI dependency init for headless mode.");
    init_step6_appState(filePathFromMainArgs);
} else {
    Chart.register(ChartDataLabels);                  // main.js:254
    initTopLevelListeners();                          // main.js:256  → §7
    initDependencies();                               // main.js:257  → tooltips (no-op body today)
    if ( isFlagEnabled(FEATURE_FLAG__SHOW_LOCATION) ) { initMap(); }   // main.js:259-261
    doChartInitialSetup();                            // main.js:263  → chart mouse handlers
    init_step6_appState(filePathFromMainArgs);
}
```

- `initDependencies()` (`ophis_dependencies.js:189-191`) calls `initToolTips()`, whose entire
  body is commented out (`ophis_dependencies.js:193-219`). **Effectively a no-op** — keep the
  call site or drop it, but know it does nothing.
- `doChartInitialSetup()` (`ophis_view__chart.js:65-118`) attaches to the chart canvas:
  `click` on `#recenter-chart-button` → `allowChartFlushToDisk(); recenterChart();`;
  `dblclick` on the chart → same; `mousedown`/`mouseup` → `allowChartFlushToDisk()` plus a
  **click-vs-drag discriminator**: it records `GeoPoint`s and treats the gesture as a click only
  if `mouseDownPoint.calcDistanceTo(mouseUpPoint) <= 5` pixels, then calls
  `doChartHitTests(appState.chart, e, /*isClick=*/true)`.

### 2.7 STEP 6 — `init_step6_appState(filePathFromMainArgs)` — `ophis_main.js:384-458`

Establishes: the document model — either loaded from disk / localStorage, or a single fresh
Iso-Event.

```js
var savedJsonBlob = localStorage.getItem(SERIALIZED_FIELD__LOCAL_STORAGE_SAVE_BLOB); // key "save_blob"
var filePathToLoad = null;
```

Three mutually exclusive branches:

**(a) Headless** (`main.js:392-397`)
```js
if ( filePathFromMainArgs ) { filePathToLoad = filePathFromMainArgs; }
else { exitHeadlessWithError("Could not find input file from args."); }
```
Note: on the error path execution **falls through** — there is no `return`. `filePathToLoad`
stays `null`, so it proceeds into the else-branch below and tries to load localStorage. Under
Electron `exitHeadlessWithError` calls `electronBridge.closeAppWithHeadlessError()` which
presumably terminates first, masking this. See GOTCHA **G-5**.

**(b) Electron, non-headless** (`main.js:398-425`)
1. If no `filePathFromMainArgs`, adopt `appState.externalFilePath` (set by
   `onOphFileOpenedFromOutsideApp` when the OS opens a `.oph` before init finished —
   `ophis_model__persistence.js:185`) and null it out.
2. Load *only* the global options out of localStorage:
```js
var globalOptionsOnly = true;
var validationResult = validatePotentialDiskLoadOrImport(savedJsonBlob, globalOptionsOnly);
loadSavedGlobalOptions(validationResult.global_options);
```
   `validatePotentialDiskLoadOrImport(jsonString, globalOptionsOnly=false)`
   (`ophis_model__validation.js:1000-1038`) returns
   `{ result: IsoEvent[]|null, errors: string[], global_options: object|undefined }`.
   With `globalOptionsOnly === true` the event array is intentionally left `null`, which then
   trips its own sanity check and pushes the error string
   `"Blob import made it past the gauntlet with zero errors, yet a null event array."`.
   `init_step6_appState` **ignores `.errors` entirely** here, so it is harmless — but a
   reimplementation should not copy the sanity check without the exemption. See GOTCHA **G-6**.
3. Choose the file to open:
```js
if ( filePathFromMainArgs ) { filePathToLoad = filePathFromMainArgs; }
else if ( isFlagEnabled(FEATURE_FLAG__OPEN_PREVIOUS_FILE_UNDER_ELECTRON) ) {
    filePathToLoad = appState.globalOptions[GLOBAL_OPTION__CURRENT_FILE_PATH];
} else {
    filePathToLoad = null;
    setGlobalOption(GLOBAL_OPTION__CURRENT_FILE_PATH, "", /*shouldFlushChangesToDisk=*/false);
}
```
   `FEATURE_FLAG__OPEN_PREVIOUS_FILE_UNDER_ELECTRON = false` (`ophis_config.js:317`), so v12
   **never** auto-reopens the last file; it clears the remembered path instead.

**(c) Browser** (`main.js:426-428`): `filePathToLoad = null`.

Then the terminal dispatch:

```js
// ophis_main.js:430-457
if ( filePathToLoad ) {
    appState.needToFinalizeAppState = true;
    electronBridge.openOphFile(filePathToLoad);   // ASYNC — finalization happens in the callback
} else {
    var loadBlobFromLocalStorage = isRunningElectron() === true ? false : true;

    if ( loadBlobFromLocalStorage === true && savedJsonBlob
         && loadSavedBlobFromProgrammaticAction(savedJsonBlob) ) {
        // Successfully loaded previous session — nothing else to do.
    } else {
        addIsoEvent();          // ophis_controller.js:148 — creates "Event 1"
    }
    initAppStateFinalization();
}
```

Key asymmetry: **localStorage restore happens only in the browser.** Under Electron the app
always starts empty (or from an explicit file). `loadSavedBlobFromProgrammaticAction`
(`ophis_model__persistence.js:359-378`) validates the blob, applies global options via
`loadSavedGlobalOptions`, and on success calls `swapInNewIsoEventArray(result, "")` returning
`true`; on error shows a toast (only if the blob was a truthy string) and returns `false`.

`loadSavedGlobalOptions(globalOptions)` (`ophis_model__persistence.js:324-357`) has two
side effects that belong in the startup narrative:
- It **forces the screen select to `DEFAULT_STARTING_SCREEN` (`OPHIS_SCREEN__Z_DATES`)**, not to
  the persisted `start_screen`. The line that would honour the saved value is commented out at
  `ophis_model__persistence.js:338`. So the persisted `start_screen` is written but never
  restored. See GOTCHA **G-7**.
- It injects the "Auto" checkbox HTML into `#auto-recalculate-z-dates-container` and hooks it to
  `GLOBAL_OPTION__AUTO_RECALCULATE_Z_DATES`, with an on-check callback that immediately calls
  `recalculateZDatesHandler()`.

### 2.8 FINALIZE — `initAppStateFinalization()` — `ophis_main.js:269-288`

Called from exactly two places: `ophis_main.js:456` (synchronous path) and
`ophis_model__persistence.js:205` (after an async `.oph` open completes, guarded by
`appState.needToFinalizeAppState`).

```js
function initAppStateFinalization() {
    if ( isRunningHeadless() ) {
        handleHeadlessOutput();               // ophis_view__export.js:9 — writes CSV, exits app
    } else {
        setSkinModeBasedOnCurrentEventType(); // ophis_view.js:27
        initGlobalToolTips();                 // main.js:290
        var isoEventRows = document.getElementsByClassName("iso_event_row");
        isoEventRows[appState.globalOptions.current_iso_event_index].scrollIntoView({block:"center"});
        disableTabIndeces();                  // main.js:191
        markFreshSaveStatus();                // persistence.js:290 → markChangesSaved(false)
    }
    appState.initialized = true;
    refreshMenuOptions();                     // controller.js:29
}
```

- `setSkinModeBasedOnCurrentEventType()` maps `currentIsoEvent.type` →
  `EVENT_TYPE__PERSONAL`→`SKIN_MODE__CLASSIC`, `EVENT_TYPE__ASTROLOGICAL`→`SKIN_MODE__ASTROLOGICAL`,
  `EVENT_TYPE__MARKETS`→`SKIN_MODE__MARKETS`, with `shouldFlushChangesToDisk=false`. `setSkinMode`
  swaps `#header-image` src (`img/header.png` for classic/astro, `img/header_markets.png` for
  markets) and calls `refreshWindowTitle()`.
- `initGlobalToolTips()` (`ophis_main.js:290-293`) = `applyToolTipToCssClass("tool_tippable_cursor")`
  + `applyToolTipToElemId("current-screen")`. Both go through jQuery `.tipsy()`
  (`ophis_dependencies.js:237-243`) with `TOOL_TIP_DELAY_IN_MILLISECONDS = 750`
  (`ophis_view__config.js:47`).
- The `scrollIntoView` line will throw `TypeError` if `current_iso_event_index` exceeds the
  rendered row count. It is unguarded. See GOTCHA **G-8**.
- `disableTabIndeces()` (`ophis_main.js:191-194`) sets `tabIndex = -1` on **every `<button>`**
  and **every `input[type="checkbox"]`** in the document. This is a deliberate accessibility
  regression (keyboard tabbing is disabled app-wide) that a rewrite should probably drop.
- `refreshMenuOptions()` is a no-op outside Electron.

**Important:** nothing in `initAppStateFinalization()` triggers the first render. The first
render is a side effect of `addIsoEvent()` / `swapInNewIsoEventArray()` calling
`refreshIsoEvents(...)` before finalization. `refreshCurrentPage` then sees
`appState.viewUpdateCount == 1` and schedules the splash fade-out
(`ophis_view.js:99-123`, 500 ms delay + a nested 1000 ms delay before removing
`#initial-loading-container` from the DOM, plus `recenterChartOnStartup()` which itself is a
50 ms `setTimeout` — `ophis_view.js:13-16`).

### 2.9 Startup timeline summary

```
parse: logging shims → constants → clockRefreshLoop() starts (500ms forever)
       → appState literal (Leaflet map built HERE, needs #map in DOM)
       → globalOptions defaults
       → if (!electron) init()
init_step1  headless flag, console pipe, query params, epoch freeze
            └─ async XHR ./package.json?v=<rand> ──┐
init_step2  sign-in gate (DEAD in v12: flag false) │
init_step3  isSignedIn=true; electronBridge.onSignedIn(); show splash
            └─ async image preload (N moon + 4 eclipse + 4 symbol) ──┐
init_step4  selfCheckMsrfOnStartup + runUnitTests → appState.startupErrors
init_step5  Chart.register(ChartDataLabels); initTopLevelListeners();
            initDependencies(); initMap(); doChartInitialSetup()
init_step6  localStorage "save_blob" → global options → events, OR addIsoEvent()
            (this triggers the FIRST refreshXDates → first runOphisOnEvent → first paint)
finalize    skin, tooltips, scroll to current row, tabIndex=-1, markFreshSaveStatus,
            initialized=true, refreshMenuOptions()
+500ms      splash fade-out begins;  +50ms recenterChartOnStartup;  +1500ms splash removed
```

---

## 3. THE CONTROLLER API

### 3.1 Function-by-function reference — `ophis_controller.js`

---

#### `getCurrentIsoEvent()` — `ophis_controller.js:3-13`
```js
function getCurrentIsoEvent() {
    var currentIndex = 0;
    if ( appState.globalOptions.current_iso_event_index ) {
        currentIndex = appState.globalOptions.current_iso_event_index;
    } else {
        appState.globalOptions.current_iso_event_index = 0;
    }
    return appState.isoEvents[currentIndex];
}
```
**Returns:** the current `IsoEvent` object (by reference — mutating it mutates the model).
**Side effect:** lazily writes `current_iso_event_index = 0` when the key is absent *or* `0`
(truthiness test). Harmless but it means the branch runs on every call while index is 0.
**Can return `undefined`** if `isoEvents` is empty. No guard.

---

#### `factoryReset()` — `ophis_controller.js:15-27`
```js
if ( confirm('Are you sure you want to reset the entire program and clear all data?')) {
    localStorage.clear();
    if ( isRunningElectron() ) { electronBridge.resetProgram(); }
    else { window.location.reload(true); }
}
```
Uses native `confirm()`. `window.location.reload(true)` — the boolean force-reload argument is
non-standard and ignored by modern browsers. **Has no caller in `src/`** other than the
commented-out `ipcRenderer.on('factoryReset', ...)` block at `ophis_main.js:462-470`. It is
therefore only reachable if the Electron main process invokes `window.factoryReset()` directly
(likely from an app menu item). See GOTCHA **G-9**.

---

#### `refreshMenuOptions()` — `ophis_controller.js:29-36`
```js
if ( isRunningElectron() ) {
   var operationsColVisibleChecked = appState.globalOptions[GLOBAL_OPTION__HIDE_OPERATIONS_COL_COMPLETELY] === false;
   var prettifyOphFilesChecked = appState.globalOptions[GLOBAL_OPTION__PRETTIFY_OPH_FILES];
   var minifyOphFilesChecked   = appState.globalOptions[GLOBAL_OPTION__MINIFY_OPH_FILES];
   window.electronBridge.refreshMenuOptions(operationsColVisibleChecked, prettifyOphFilesChecked, minifyOphFilesChecked);
}
```
Pushes three checkbox states up to the native menu bar. **No-op in a browser.** Note the
inversion: `operationsColVisibleChecked` is `true` when the *hide* option is `false`.

---

#### `toggleGlobalBooleanOptionWithNoFileChangeRequired(globalOption)` — `ophis_controller.js:38-43`
```js
var shouldFlushChangesToDisk = false;
setGlobalOption(globalOption, appState.globalOptions[globalOption] === false, shouldFlushChangesToDisk);
refreshMenuOptions();
```
The new value is `oldValue === false` — a strict-equality flip. If the stored value were
`undefined` or `null` (never `false`), this sets `false`, not `true`. So the first toggle of a
never-initialised option silently does nothing visible. All three call sites use options that
*are* seeded, so this is latent only.
`shouldFlushChangesToDisk=false` means the change does **not** mark the document dirty — but
`setGlobalOption` still writes through to `appState.globalOptions`, and the next unrelated
`flushChangesToDisk()` persists it.

---

#### `toggleOperationsColVisible()` — `ophis_controller.js:45-50`
Toggles `GLOBAL_OPTION__HIDE_OPERATIONS_COL_COMPLETELY` then
`refreshXDates(REFRESH_TYPE__SOFT, false, OPHIS_INPUT_CHANGE__NO_CHANGE)`.
No caller in `src/` — invoked from the Electron menu.

---

#### `togglePrettifyOphFiles()` — `ophis_controller.js:52-54`
Toggles `GLOBAL_OPTION__PRETTIFY_OPH_FILES`. No view refresh. Electron-menu-only.

---

#### `toggleMinifyOphFiles()` — `ophis_controller.js:56-64`
```js
if ( appState.globalOptions[GLOBAL_OPTION__MINIFY_OPH_FILES] === false ) {
    showMinifyWarningDialog(function() { toggleGlobalBooleanOptionWithNoFileChangeRequired(...); });
} else {
    toggleGlobalBooleanOptionWithNoFileChangeRequired(...);
}
```
Turning minify **on** requires confirming a warning dialog
(`ophis_view__utils.js:440-449`, text: minified files drop anything matching current defaults,
so future default changes alter output). Turning it **off** is immediate. Electron-menu-only.

---

#### `getLastIsoEvent()` — `ophis_controller.js:66-72`
Returns `appState.isoEvents[length-1]`, or `null` if `appState.isoEvents` is falsy. Returns
`undefined` (not `null`) for an empty-but-present array — callers must handle both.

---

#### `swapInNewIsoEventArray(newIsoEvents, successMessage)` — `ophis_controller.js:74-93`
Replaces the whole document model. **This is the load/import entry point.**
```js
appState.isoEvents = newIsoEvents;
if ( appState.globalOptions.current_iso_event_index > appState.isoEvents.length-1 ) {
    appState.globalOptions.current_iso_event_index = 0;      // clamp, no setGlobalOption → no flush
}
if ( isRunningHeadless() == false ) {
    refreshIsoEvents(REFRESH_TYPE__HARD, OPHIS_INPUT_CHANGE__FORCE);
    markChangesSaved();
    var forceFlush = false;
    flushChangesToDisk(forceFlush);
    if ( successMessage ) { showToast(successMessage); }
}
appState.loadedFromDisk = true;
```
Order matters: `markChangesSaved()` (sets `hasUnsavedChanges=false`) is followed by
`flushChangesToDisk()` which **immediately sets `hasUnsavedChanges = true` again**
(`ophis_model__persistence.js:238`) before possibly clearing it when it writes to localStorage.
In the browser it does write, so it ends `false`. Under Electron with autosave off it ends
`true`. Callers: `ophis_model__persistence.js:200` (`onOphFileOpened`), `:314`
(`importIsoEventsFromUserInteraction`), `:374` (`loadSavedBlobFromProgrammaticAction`).

---

#### `refreshIsoEvents(refreshType, ophisInputChange)` — `ophis_controller.js:95-104`
```js
if ( refreshType == REFRESH_TYPE__HARD ) { rebuildIsoEventTableRows(); }
updateLatLongInputElemValues();
var preserveScrollPosition = false;
refreshXDates(refreshType, preserveScrollPosition, ophisInputChange);
```
The left-panel (events list) refresh wrapper. **Always** forces
`preserveScrollPosition = false`. `updateLatLongInputElemValues()` (`ophis_view.js:750+`)
walks the parallel DOM class collections `lat_input`, `long_input`, `open_map_icon`,
`timezone_display`, `location_enabled_checkbox` by index against `appState.isoEvents[i]` —
i.e. it assumes those five collections are the same length as `isoEvents`.

---

#### `refreshXDateCounts()` — `ophis_controller.js:106-115`
Writes `ithIsoEvent.x_dates.length` into every `.x_date_count` element and sets
`title = "This Iso-Event has " + xDateCount + " X-Dates"`. Index-parallel with `isoEvents`.

---

#### `createNewIsoEvent(startingName, eventScope, startingLat, startingLong, locationEnabled)` — `ophis_controller.js:117-146`

**Returns a fresh `IsoEvent`:**
```ts
{
  name: string,                    // e.g. "Event 1"
  notes: "",
  x_dates: XDate[],                // [] unless FEATURE_FLAG__ADD_INITIAL_X_DATES_TO_NEW_ISO_EVENTS
  t_dates: XDate[],                // []
  lat: number,
  long: number,
  location_enabled: boolean,
  scope: "EVENT_SCOPE__HH_MM" | "EVENT_SCOPE__DAYS" | "EVENT_SCOPE__MONTHS" | "EVENT_SCOPE__YEARS",
  type: DEFAULT_EVENT_TYPE,        // "EVENT_TYPE__PERSONAL"  (ophis_config.js:355,359)
  operations: Operation[],         // cloneDefaultOperationsForAppVersionGte10()
  scoring_system: "SCORING_SYSTEM__GTE_V8",
  // …plus one key per ALL_SERIALIZED_FIELDS entry, see below
}
```

Then, `ophis_controller.js:132-139`:
```js
for ( var i = 0; i < ALL_SERIALIZED_FIELDS.length; i++ ) {
    var ithFilterField = ALL_SERIALIZED_FIELDS[i];
    newIsoEvent[ithFilterField.serializationKey] = ithFilterField.enabledByDefault;
    if ( ithFilterField.numericDefault ) {          // NOTE: truthiness, not != null
        newIsoEvent[ithFilterField.serializationKeyForValue] = ithFilterField.numericDefault;
    }
}
```
`newSerializedFieldObject(varName, ...)` (`ophis_utils.js:124-146`) derives keys mechanically:
```
serializationKey         = varName.replace("SERIALIZED_FIELD__","").toLowerCase()
serializationKeyForValue = serializationKey + "_value"
elemId                   = serializationKey.replaceAll("_","-") + "-checkbox"
elemIdForInput           = serializationKey.replaceAll("_","-") + "-input"
```
So e.g. `SERIALIZED_FIELD__ISO_EVENT_FILTER_MIN_HIT_COUNT` →
key `iso_event_filter_min_hit_count`, value key `iso_event_filter_min_hit_count_value`,
DOM ids `iso-event-filter-min-hit-count-checkbox` / `-input`.

The filter fields and their `enabledByDefault` / `numericDefault`
(`ophis_config.js:122-174`), in array order:

| # | varName suffix | enabledByDefault | numericDefault |
|---|---|---|---|
| 0 | `ISO_EVENT_FILTER_BEFORE_LAST_X_DATE` | `true` | – |
| 1 | `ISO_EVENT_FILTER_ON_LAST_X_DATE` | `true` | – |
| 2 | `ISO_EVENT_FILTER_BEFORE_CURRENT_DATE` | `true` | – |
| 3 | `ISO_EVENT_FILTER_ON_CURRENT_DATE` | `false` | – |
| 4 | `ISO_EVENT_FILTER_BEYOND_MAX_DAYS` | `true` | `HIGHEST_MSRF_NUMBER` = **2559** |
| 5 | `ISO_EVENT_FILTER_MIN_HIT_COUNT` | `false` | `2` |
| 6 | `ISO_EVENT_FILTER_MIN_SCORE` | `false` | `1` |
| 7 | `ISO_EVENT_FILTER_MSRF_MATCH` | `false` | – |

Chart-option fields (`ophis_config.js:200-266`), all with `numericDefault = undefined`:
`SHOW_CHART` (true), `SHOW_DATES` (true), then eight moon-phase options (all `false`), then
`FULL_SOLAR_ECLIPSES`, `PARTIAL_SOLAR_ECLIPSES`, `FULL_LUNAR_ECLIPSES`,
`PARTIAL_LUNAR_ECLIPSES` (all `false`).

Finally `if ( isFlagEnabled(FEATURE_FLAG__ADD_INITIAL_X_DATES_TO_NEW_ISO_EVENTS) ) addInitialDatesToIsoEvent(newIsoEvent);`
— that flag is **`false`** in v12 (`ophis_config.js:298`), so new events start with **zero
X-Dates** and immediately produce the error *"At least 2 X-Dates are required."*
(`ophis_model__operations.js:105`).

`cloneDefaultOperationsForAppVersionGte10()` (`ophis_model__params.js:137-143`) =
`deepClone(DEFAULT_OPHIS_OPERATIONS_LTE_V7)` with every `enabled` forced `true` and the two
equations `"X1+YxOPH_PI"` and `"X2+(Y/2.0)xOPH_PHI"` promoted from Beta (0.5) to Alpha (1)
weight, plus `OPH_HEP_OPERATION_FOR_X2` = `newOperation("X2+YxOPH_HEP", 1, true)` pushed on the
end. Result: **16 operations, all enabled**.

---

#### `addIsoEvent(autoSelectNewEvent = true)` — `ophis_controller.js:148-205`

**Name derivation** (`:150-169`), from `getLastIsoEvent()` (NOT the *current* event):
```js
var nameSplit = currentIsoEvent.name.split(" ");
var lastNameComponent = nameSplit[nameSplit.length-1];
if ( isNonNegIntOrStringThereof(lastNameComponent) ) {
    var lastNameComponentAsInt = parseInt(lastNameComponent) + 1;
    nameSplit[nameSplit.length-1] = lastNameComponentAsInt;
    startingName = nameSplit.join(" ");        // "Event 3" → "Event 4"
} else {
    startingName = nameSplit.join(" ") + " 2"; // "Chicago Fire" → "Chicago Fire 2"
}
// and if there is no last event at all:  startingName = "Event 1";
```
Note the variable shadowing wart: `var startingName = "Event";` at `:152` is always overwritten.

**Location/scope inheritance** (`:171-190`):
```js
var startingLat = DEFAULT_LAT;    //  32.8   (Dallas, ophis_view__config.js:40)
var startingLong = DEFAULT_LONG;  // -96.8
var locationEnabledByDefault = true;
var eventScope = EVENT_SCOPE__DAYS;

if ( appState.isoEvents.length > 0 ) {
    var latestEvent = appState.isoEvents[appState.isoEvents.length-1];
    startingLat  = latestEvent.lat;
    startingLong = latestEvent.long;
    locationEnabledByDefault = latestEvent.scope == EVENT_SCOPE__HH_MM && latestEvent.location_enabled;
    eventScope = latestEvent.scope;
} else {
    locationEnabledByDefault = eventScope == EVENT_SCOPE__HH_MM;   // → false, since default is DAYS
}

if ( locationEnabledByDefault === false ) { startingLat = 0; startingLong = 0; }
```
So the **very first event created by the app has lat/long 0,0, not Dallas** — the Dallas default
is discarded by the zeroing branch because `EVENT_SCOPE__DAYS != EVENT_SCOPE__HH_MM`.
See GOTCHA **G-10**.

**Commit** (`:192-204`):
```js
var newIsoEvent = createNewIsoEvent(startingName, eventScope, startingLat, startingLong, locationEnabledByDefault);
appState.isoEvents.push(newIsoEvent);
if ( autoSelectNewEvent === true ) {
    appState.globalOptions.current_iso_event_index = appState.isoEvents.length - 1;  // direct write, no setGlobalOption
    setSkinModeBasedOnCurrentEventType();
}
flushChangesToDisk();
refreshIsoEvents(REFRESH_TYPE__HARD, autoSelectNewEvent ? OPHIS_INPUT_CHANGE__FORCE : OPHIS_INPUT_CHANGE__NO_CHANGE);
```
The `#add-iso-event-button` handler passes `autoSelectNewEvent = false` (`ophis_main.js:595-596`),
so clicking "Add" appends without switching and without recalculating. The programmatic call in
`init_step6_appState` / `resetAllIsoEvents` uses the default `true`.

---

#### `addInitialDatesToIsoEvent(isoEvent)` — `ophis_controller.js:207-213`
Calls `addXDate(isoEvent, -1, false, false)` twice (no refresh, no flush). Reachable only when
`FEATURE_FLAG__ADD_INITIAL_X_DATES_TO_NEW_ISO_EVENTS` is true — **dead in v12**.

---

#### `resetIsoEventFieldOptions(fieldArray)` — `ophis_controller.js:215-233`
```js
for each ithFilterField in fieldArray:
    currentIsoEvent[ithFilterField.serializationKey] = ithFilterField.enabledByDefault;
    if ( ithFilterField.numericDefault != null ) {        // NOTE: != null, unlike createNewIsoEvent
        currentIsoEvent[ithFilterField.serializationKeyForValue] = ithFilterField.numericDefault;
    }
flushChangesToDisk();
refreshXDates(REFRESH_TYPE__SOFT, /*preserveScrollPosition=*/false, OPHIS_INPUT_CHANGE__CHANGED);
```
**Inconsistency worth replicating carefully:** `createNewIsoEvent` guards with truthiness
(`if (ithFilterField.numericDefault)`), this one with `!= null`. For chart-option fields whose
`numericDefault` is `UNDEFINED_FIELD_INPUT_NUMBER = undefined` (`ophis_config.js:120`), both
skip. They would diverge only for a `numericDefault` of literal `0`. No field currently has one.

Called from the two reset buttons with `SERIALIZED_FILTER_FIELDS` and
`SERIALIZED_CHART_OPTION_FIELDS` respectively.

---

#### `xDateToNativeDateForController(eventScope, xDate, lat_nullable=null, long_nullable=null)` — `ophis_controller.js:235-239`
```js
var nullTimezone = null;
var lockDayScopeToGmt = false;
return xDateToNativeDate(eventScope, xDate, lat_nullable, long_nullable, [], nullTimezone, lockDayScopeToGmt);
```
A thin adapter that **deliberately passes `lockDayScopeToGmt = false`**, overriding the global
default `FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT = true` (`ophis_config.js:297`,
`ophis_utils.js:729`). It also swallows errors by passing a throwaway `[]`. Used *only* by
`addXDate` for computing the default date of the next row, i.e. for UI convenience — not for
the actual Y/Z math, which uses the GMT-locked path. **Do not unify these two call paths.**

---

#### `addOperation(currentIsoEvent, insertIndex = -1)` — `ophis_controller.js:241-261`
```js
if ( Array.isArray(currentIsoEvent.operations) ) { /* all good */ } else { currentIsoEvent.operations = []; }
var pushToEnd = insertIndex == -1;
var operationToAdd = newOperation("X1+Y", POINTS__BETA_OPERATION_MATCH, OPERATION_ENABLED_TRUE);
if ( pushToEnd === true ) { currentIsoEvent.operations.push(operationToAdd); }
else { currentIsoEvent.operations.splice(insertIndex, 0, operationToAdd); }
flushChangesToDisk();
refreshXDates(REFRESH_TYPE__SOFT, false, OPHIS_INPUT_CHANGE__CHANGED);
```
New operation seed: equation `"X1+Y"`, weight `POINTS__BETA_OPERATION_MATCH = 0.5`
(`ophis_model__params.js:3`), enabled `true`.

`newOperation(equation, weight, enabled = true)` (`ophis_utils.js:1006-1012`) returns
`{ equation, weight, enabled: true }` — **it hard-codes `enabled: true` and ignores the third
parameter entirely.** This is a real bug. It is masked for the default table because
`cloneDefaultOperationsForAppVersionGte8()` re-sets `enabled = true` explicitly
(`ophis_model__params.js:125`), but it means the authored intent at
`ophis_model__params.js:109` — `newOperation("X1+YxOPH_HEP", POINTS__ALPHA_OPERATION_MATCH,
OPERATION_ENABLED_FALSE)` — never takes effect. See GOTCHA **G-12**.

Called by the Operations screen row buttons (outside this file).

---

#### `addXDate(currentIsoEvent, insertIndex = -1, refreshView = true, flushChanges = true, inputDateType = INPUT_DATE_TYPE__X_DATE)` — `ophis_controller.js:263-343`

Adds one date row to `x_dates` or `t_dates` with a computed default value.

**Step 1 — pick the array** (`:265-266`):
```js
var isForXDates = inputDateType == INPUT_DATE_TYPE__X_DATE;   // "INPUT_DATE_TYPE__X_DATE"
var inputDateArray = isForXDates ? currentIsoEvent.x_dates : currentIsoEvent.t_dates;
```

**Step 2 — normalise "now"** (`:268-277`):
```js
var currentDate = getCurrentNativeDate();     // ophis_utils.js:447 → new Date()
if ( currentIsoEvent.scope != EVENT_SCOPE__HH_MM ) {
    currentDate.setHours(HOURS_IN_DAY_TO_USE_WITHOUT_HH_MM_SCOPE);  // 0
    currentDate.setMinutes(0);
    currentDate.setSeconds(0);
}
```
`HOURS_IN_DAY_TO_USE_WITHOUT_HH_MM_SCOPE = 0` (`ophis_config.js:270`). Note **milliseconds are
not cleared** — the sub-second component of `new Date()` survives. Harmless downstream because
`nativeDateToXDate` only formats to minute precision, but it is a latent inconsistency.
Note also: `getCurrentNativeDate()` is a raw `new Date()`; it does **not** honour the headless
epoch freeze (that's `getCurrentLocalTime()`), so headless date-adding is non-deterministic.

**Step 3 — compute the default date** (`:282-314`), with
`MINIMUM_DAYS_BETWEEN_FIRST_TWO_X_DATES = 1` and
`MINIMUM_DAYS_BETWEEN_SUBSEQUENT_X_DATES = 1` (`ophis_config.js:91-92`), and
`MILLIS_PER_DAY = 86_400_000` (`ophis_config.js:98-100`):

*Append (`insertIndex == -1`):*
| array length | default date |
|---|---|
| `0` | `now − 1 day` |
| `1` | `last + 1 day` |
| `>1` | `last + 1 day` (using `MINIMUM_DAYS_BETWEEN_SUBSEQUENT_X_DATES`) |

*Insert at `insertIndex`:*
| insertIndex | default date |
|---|---|
| `0` | `arr[0] − 1 day` |
| `1` | `arr[0] + 1 day` |
| `>1` | `arr[insertIndex] − 1 day` |

The "last" native date is obtained via `xDateToNativeDateForController(currentIsoEvent.scope,
xDate, null, null)` — **lat/long deliberately null**, so it uses the operator's local computer
timezone rather than the event's location.

**Step 4 — materialise and commit** (`:316-342`):
```js
var newXDateAsNative = nativeDateToXDate(defaultDate, null, null);  // ophis_view__strings.js:162
newXDateAsNative.enabled = true;
// ... finishXDateAdd():
//   push or splice into inputDateArray
//   if (flushChanges) flushChangesToDisk();
//   if (refreshView)  refreshXDates(REFRESH_TYPE__HARD, /*preserveScrollPosition=*/true, OPHIS_INPUT_CHANGE__CHANGED);
```
`nativeDateToXDate` returns `newXDate(dateString, timeString)`; the display formats are
`X_DATE_CAL_DISPLAY_FORMAT = "m/d/Y"` and `X_DATE_TIME_DISPLAY_FORMAT = "H:i"`
(`ophis_config.js:273-278`). So an `XDate` is roughly `{ date: "03/16/2027", time: "00:00",
enabled: true }`.

**Dead branch** (`:336-342`):
```js
if ( inputDateArray.length == 2 ) {
    // alert("Please confirm that you have chosen the correct Type ...");   <- commented out
    finishXDateAdd();
} else {
    finishXDateAdd();
}
```
Both arms are identical. Collapse it in a rewrite.

---

#### `refreshXDateSunsets(inputDateType)` — `ophis_controller.js:345-377`
Guarded by `isPriorSunsetDisplayEnabled()` (`ophis_utils.js:19`). Writes the prior-sunset
readable string into `.prior_sunset_display_x_date` / `.prior_sunset_display_t_date` elements
(index-parallel with the date array). Only meaningful when
`currentIsoEvent.scope == EVENT_SCOPE__HH_MM`; otherwise, and only if
`FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_IN_SEPARATE_COL` is enabled
(**`false` in v12** — `ophis_config.js:302`), it writes the literal string `"(not applicable)"`.
Per-cell cost is `getSunsetNativeUtcDateBefore_withCache(...)` — an astronomical computation
with a global memo (`CACHE__SUNSET_BEFORE`, `ophis_utils.js:451`).
It is called **twice on every single `refreshXDates`** (once for X, once for T).

---

#### `refreshIsoEventFiltersAndChartOptions()` — `ophis_controller.js:379-402`
Pushes model → DOM for all 20 serialized fields:
```js
for each ithFilterField in ALL_SERIALIZED_FIELDS:
    document.getElementById(ithFilterField.elemId).checked = (currentIsoEvent[key] === true);
    if ( ithFilterField.numericDefault ) {
        var currentValue = parseFloatElseNeg1(currentIsoEvent[ithFilterField.serializationKeyForValue]);
        document.getElementById(ithFilterField.elemIdForInput).value =
            currentValue >= 0 ? currentValue : ithFilterField.numericDefault;
    }
```
`parseFloatElseNeg1` (`ophis_utils.js:251`) returns `-1` for unparseable input, so a negative
stored value is silently replaced with the default on display. **A user cannot enter a negative
filter threshold** — it round-trips back to the default.

---

#### `refreshIsoEventRowBackgrounds(isoEventIndex)` — `ophis_controller.js:404-415`
Sets the attribute `row_selected="true"|"false"` on every `.iso_event_row`. Note the guard:
```js
if ( isoEventRows.length > 1 && i == isoEventIndex ) { ... "true" } else { ... "false" }
```
— with a **single** event, no row is ever marked selected (highlighting is suppressed when
there's nothing to choose between).

---

#### `selectIsoEvent(isoEventIndex)` — `ophis_controller.js:417-431`
```js
setGlobalOption("current_iso_event_index", isoEventIndex);   // literal string key; DOES flush
var radioElems = document.getElementsByClassName("row_radio_button");
radioElems[isoEventIndex].checked = true;
setSkinModeBasedOnCurrentEventType();
var preserveScrollPosition = false;
// Originally forced a recalc when switching events, but it's kind of a pain if you're e.g. just checking X-Dates.
// refreshXDates(REFRESH_TYPE__HARD, preserveScrollPosition, OPHIS_INPUT_CHANGE__FORCE);
refreshXDates(REFRESH_TYPE__HARD, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
refreshIsoEventRowBackgrounds(isoEventIndex);
```
Note the raw string `"current_iso_event_index"` — there is no `GLOBAL_OPTION__*` constant for
it, and `setGlobalOption` will `printWarning("Global option 'current_iso_event_index' was
undefined, setting anyway.")` the very first time (because it was never seeded, §1.2).

Because the input-change is `CHANGED` rather than `FORCE`, switching events recalculates **only
if** auto-recalc is on and the Z-Dates screen is showing (see §3.3 decision table). Otherwise
the previous event's results stay on screen, marked *Stale*.

---

#### `refreshXDates(refreshType, preserveScrollPosition = false, ophisInputChange = OPHIS_INPUT_CHANGE__CHANGED)` — `ophis_controller.js:433-509`

**THE central function.** Full body specified in §3.3.

---

### 3.2 UI event → controller → model → view table

`ophis_main.js` wires these DOM handlers inside `initTopLevelListeners()`.

| UI event (DOM id / trigger) | Controller fn | Model call(s) | View refresh | Source |
|---|---|---|---|---|
| `#add-x-date-button` click | `addXDate(getCurrentIsoEvent())` | mutate `x_dates`; `flushChangesToDisk()` | `refreshXDates(HARD, preserve=true, CHANGED)`; then `scrollPanelToBottom(getXDateContainer())` | main.js:482-485 |
| `#add-t-date-button` click | `addXDate(evt,-1,true,true,INPUT_DATE_TYPE__T_DATE)` | mutate `t_dates`; flush | `refreshXDates(HARD, true, CHANGED)`; `scrollPanelToBottom(getTDateContainer())` | main.js:487-494 |
| `#reset-iso-event-filters-button` click | confirm → `resetIsoEventFieldOptions(SERIALIZED_FILTER_FIELDS)` | reset 8 keys; flush | `refreshXDates(SOFT, false, CHANGED)` | main.js:496-500 |
| `#reset-iso-event-chart-options-button` click | confirm → `resetIsoEventFieldOptions(SERIALIZED_CHART_OPTION_FIELDS)` | reset 12 keys; flush | `refreshXDates(SOFT, false, CHANGED)` | main.js:502-506 |
| `#reset-iso-event-chart-help-button` click | — | — | `showOkDialog(<moon/eclipse help>)` | main.js:508-517 |
| `#x-dates-help-button` click | — | — | `showOkDialog(HELP_MESSAGE__X_DATES_PANEL)` | main.js:522-527 |
| `#t-dates-help-button` click | — | — | `showOkDialog(HELP_MESSAGE__T_DATES_PANEL)` | main.js:529-534 |
| `#iso-events-help-button` click | — | — | `showOkDialog(HELP_MESSAGE__ISO_EVENTS_PANEL)` | main.js:536-541 |
| `#iso-event-filters-help-button` click | — | — | `showOkDialog(HELP_MESSAGE__FILTERS_PANEL)` | main.js:543-548 |
| `#chart-help-button` click | — | — | `showOkDialog(<hit-count symbol table>)` | main.js:550-592 |
| `#add-iso-event-button` click | `addIsoEvent(false)` | push new event; flush | `refreshIsoEvents(HARD, NO_CHANGE)`; `scrollPanelToBottom(getIsoEventContainer())` | main.js:594-598 |
| `#reset-iso-events-button` click | confirm → `resetAllIsoEvents()` | truncate `isoEvents`; `addIsoEvent()`; `localStorage.removeItem("save_blob")`; `markChangesSaved()`; `flushChangesToDisk()` | via `addIsoEvent` → `refreshIsoEvents(HARD, FORCE)` | main.js:600-605, 371-377 |
| `#reset-x-dates-button` click | `deleteAllInputDatesHandler(X_DATE)` | `currentIsoEvent.x_dates = []`; `markChangesSaved()`; `flushChangesToDisk()` | `refreshXDates(HARD, false, CHANGED)`; `recenterChart()` | main.js:607-633 |
| `#reset-t-dates-button` click | `deleteAllInputDatesHandler(T_DATE)` | `currentIsoEvent.t_dates = []`; same | same | main.js:635-637 |
| `#recalculate-z-dates-button` click | `recalculateZDatesHandler()` | — | `refreshXDates(SOFT, preserve=true, **FORCE**)` → unconditional `runOphisOnEvent` | main.js:379-382, 639-643 |
| `#current-screen` `change` | `setCurrentScreen(this.value)` | `setGlobalOption(START_SCREEN, v)` (flushes) | `refreshIsoEvents(RIGHT_PANEL_ONLY, CHANGED\|NO_CHANGE)` | main.js:657-659, 722-740 |
| `#recenter-chart-button` click | — | `allowChartFlushToDisk()` | `recenterChart()` (`chart.resetZoom("none")`) | chart.js:66-69 |
| chart canvas `dblclick` | — | `allowChartFlushToDisk()` | `recenterChart()` | chart.js:83-86 |
| chart canvas `mouseup` (≤5px drag) | — | `allowChartFlushToDisk()` | `doChartHitTests(chart, e, true)` | chart.js:102-117 |
| `#map-background-close-capture` click | — | — | `hideMap()` | main.js:308-310 |
| `#map-close-button` click | — | — | `hideMap()` | main.js:312-314 |
| Leaflet map `mousemove` | — | — | `updateMapLatLongHud(lat,long)` | main.js:321-326 |
| Leaflet map `click` | inline (see §4.3) | set `isoEvent.lat/long`; `flushChangesToDisk()` | `refreshIsoEvents(SOFT, CHANGED)` (+ `selectIsoEvent` if a different event); `hideMap()`; `showToast(...)` | main.js:328-361 |
| `document.onkeydown` = Escape | — | — | `hideDialog(#yes-no-dialog-wrapper)`; `hideMap()` | main.js:472-480 |
| `window.beforeunload` (browser only) | — | — | returns confirm string iff `hasUnsavedChanges` | main.js:674-687 |
| `window.onresize` | — | `allowChartFlushToDisk()` | DPR change → `refreshCurrentPage(RIGHT_PANEL_ONLY, latestResults, true,true,true)`; else `setPanelMaxDimensions()`; plus `refreshIsoEventSwapRows()` on the Event-Swap screen | main.js:689-715 |
| `window.scroll` | — | — | `updateOutputPanelScrollIfNeeded()` | main.js:717-719 |
| Master checkbox `#<base>-master` change | per-config `onChildNowCheckedOrNot` for every child, then `onMasterCheckboxChangeComplete` | mutates `x_dates[i].enabled` / `t_dates[i].enabled` / filter keys / `operations[i].enabled` / `checked_for_swap_target`; flush | X/T: `refreshXDates(HARD, true, CHANGED)`; filters/chart opts: `refreshXDates(SOFT, false, CHANGED\|FORCE)`; operations: `refreshXDates(RIGHT_PANEL_ONLY, false, CHANGED)` | main.js:647-651, view__config.js:156-303, view__utils.js:728-759 |
| Individual filter/chart-option checkbox | `setUpIsoEventFieldCheckboxEventListeners` handler | same as above for one index | `refreshXDates(SOFT, false, CHANGED\|FORCE)` | main.js:645, view__utils.js:761-773 |
| Electron menu: toggle operations column | `toggleOperationsColVisible()` | `setGlobalOption(..., false)`; `refreshMenuOptions()` | `refreshXDates(SOFT, false, NO_CHANGE)` | controller.js:45-50 |
| Electron menu: prettify `.oph` | `togglePrettifyOphFiles()` | `setGlobalOption`; `refreshMenuOptions()` | none | controller.js:52-54 |
| Electron menu: minify `.oph` | `toggleMinifyOphFiles()` | warning dialog then `setGlobalOption`; `refreshMenuOptions()` | none | controller.js:56-64 |
| Electron menu: Reset Program | `factoryReset()` | `localStorage.clear()`; `electronBridge.resetProgram()` | full app reload | controller.js:15-27 |

**The five master-checkbox configs** (`ophis_view__config.js:295-303`) and their DOM contract:
each has `baseElemId`, and `setUpMasterCheckbox` (`ophis_view__utils.js:728-759`) injects an
`<input type=checkbox id="<baseElemId>-master" class="<baseClassName>_master">` into
`#<baseElemId>-header`, iterating children by `document.getElementsByClassName(baseClassName)`:

| baseElemId | baseClassName | header elem it fills |
|---|---|---|
| `x-date-checkbox` | `x_date_checkbox` | `#x-date-checkbox-header` |
| `t-date-checkbox` | `t_date_checkbox` | `#t-date-checkbox-header` |
| `iso-event-filter-checkbox` | `iso_event_filter_checkbox` | `#iso-event-filter-checkbox-header` |
| `iso-event-chart-option-checkbox` | `iso_event_chart_option_checkbox` | `#iso-event-chart-option-checkbox-header` |
| `operation-checkbox` | `operation_checkbox` | `#operation-checkbox-header` |
| `iso-event-swap-checkbox` | `iso_event_swap_checkbox` | `#iso-event-swap-checkbox-header` |
| `iso-event-swap-setting-checkbox` | `iso_event_swap_setting_checkbox` | `#iso-event-swap-setting-checkbox-header` |

`setUpMasterCheckbox` silently no-ops if the header element is absent — that is how the same
`MASTER_CHECKBOX_CONFIGS` loop works on screens where only some tables exist.

### 3.3 `refreshXDates` — full specification (`ophis_controller.js:433-509`)

Signature:
```ts
function refreshXDates(
  refreshType: "REFRESH_TYPE__HARD" | "REFRESH_TYPE__SOFT" | "REFRESH_TYPE__RIGHT_PANEL_ONLY",
  preserveScrollPosition: boolean = false,
  ophisInputChange: "OPHIS_INPUT_CHANGE__NO_CHANGE" | "OPHIS_INPUT_CHANGE__CHANGED" | "OPHIS_INPUT_CHANGE__FORCE"
      = "OPHIS_INPUT_CHANGE__CHANGED"
): void
```
(Enum values: `ophis_config.js:60-62`, `ophis_config.js:433-435`.)

**Step A — always** (`:434-436`): `getCurrentIsoEvent()`, then
`refreshIsoEventFiltersAndChartOptions()` (20 DOM writes).

**Step B — HARD only** (`:438-450`):
```js
rebuildXDateTableRows(preserveScrollPosition, INPUT_DATE_TYPE__X_DATE);
rebuildXDateTableRows(preserveScrollPosition, INPUT_DATE_TYPE__T_DATE);

var currentIsoEventShortName = getRowShortNameHtml("E", appState.globalOptions.current_iso_event_index);
document.getElementById("x-dates-col-header").innerHTML          = currentIsoEventShortName + " X-Dates";
document.getElementById("t-dates-col-header").innerHTML          = currentIsoEventShortName + " T-Dates";
document.getElementById("iso-event-filter-header").innerHTML     = currentIsoEventShortName + " Filters";
document.getElementById("iso-event-chart-options-header").innerHTML = currentIsoEventShortName + " Chart Config";
refreshXDateCounts();
```
`getRowShortNameHtml("E", i)` (`ophis_view__strings.js:58-68`) returns `"E<sub>" + (i+1) + "</sub>"`.
So event 0's headers read `E₁ X-Dates`, `E₁ T-Dates`, `E₁ Filters`, `E₁ Chart Config`.
`rebuildXDateTableRows` is the expensive DOM teardown/rebuild including flatpickr instantiation
per row — this is why `REFRESH_TYPE__SOFT` exists.

**Step C — always** (`:452-461`): enable/disable `#reset-x-dates-button` based on
`currentIsoEvent.x_dates.length > 0` (`enableRowButton`/`disableRowButton`,
`ophis_view__strings.js:70,94`), then `refreshXDateSunsets(X_DATE)` and
`refreshXDateSunsets(T_DATE)`. **Note the missing symmetry:** `#reset-t-dates-button` is never
enabled/disabled here — only the X-Dates button is. A minor bug.

**Step D — the recalc decision** (`:463-487`). Quoted verbatim because it is load-bearing:
```js
var hasLatestResults = false;
if ( appState.latestResults && getDictionarySize(appState.latestResults) > 0 ) {
    hasLatestResults = true;
} else {
    hasLatestResults = false;
}

var actuallyRunOphis = true;

if ( ophisInputChange === OPHIS_INPUT_CHANGE__FORCE ) {
    actuallyRunOphis = true;
} else if ( hasLatestResults === false ) {
    actuallyRunOphis = true;
} else {
    if ( getCurrentScreen() == OPHIS_SCREEN__Z_DATES ) {
        if ( ophisInputChange == OPHIS_INPUT_CHANGE__NO_CHANGE ) {
            actuallyRunOphis = false;
        } else {
            actuallyRunOphis = appState.globalOptions[GLOBAL_OPTION__AUTO_RECALCULATE_Z_DATES];
        }
    } else {
        actuallyRunOphis = false;
    }
}
```

As a decision table (`AUTO` = `globalOptions.auto_recalculate_z_dates`):

| `ophisInputChange` | has prior results? | current screen | AUTO | run engine? |
|---|---|---|---|---|
| `FORCE` | any | any | any | **YES** |
| any | no (`latestResults` empty) | any | any | **YES** |
| `NO_CHANGE` | yes | `Z_DATES` | any | no |
| `CHANGED` | yes | `Z_DATES` | `true` | **YES** |
| `CHANGED` | yes | `Z_DATES` | `false` | no |
| `CHANGED` / `NO_CHANGE` | yes | any non-Z_DATES screen | any | no |

`getCurrentScreen()` (`ophis_view.js:327-332`) reads `document.getElementById("current-screen").value`
— the **DOM select is the source of truth for the current screen**, not `appState`.

**Step E — run or reuse** (`:489-504`):
```js
var results = null;
if ( actuallyRunOphis === true ) {
    results = runOphisOnEvent(currentIsoEvent);
    results.stale = false;
} else {
    console.log("Skipping Ophis run and using previous results.");
    var wasAlreadyStale = appState.latestResults.stale;
    results = appState.latestResults;              // SAME OBJECT, not a copy
    if ( ophisInputChange == OPHIS_INPUT_CHANGE__NO_CHANGE ) {
        results.stale = wasAlreadyStale;           // sticky
    } else {
        results.stale = true;                      // mark dirty
    }
}
```
Note `results` aliases `appState.latestResults` on the reuse path, and `refreshCurrentPage`
then re-assigns `appState.latestResults = results` (`ophis_view.js:137`) — a self-assignment.
Also `results.errors = results.errors.concat(appState.startupErrors)` (`ophis_view.js:194`)
**re-concatenates the startup errors onto the same array object every refresh**, so on the
reuse path startup errors accumulate without bound across refreshes. See GOTCHA **G-4**.

**Step F** (`:506-508`): `refreshCurrentPage(refreshType, results)` then
`removeAllDisplayedToolTips()` (`ophis_dependencies.js:126`).

`refreshCurrentPage(refreshType, results, callUpdateChartDatasets = true,
setOverflowForScrollContainers = true, forceRedraw = false)` — note `refreshXDates` calls it
with only two arguments, so the last three take their defaults.

### 3.4 `OphisResults` shape (`ophis_model__operations.js:134-150`, plus mutations)

```ts
interface OphisResults {
  errors: (string | OphErrorObject)[];   // strings from runOphisOnEvent; objects only via
                                         //   runOphisOnEventForExport()
  y_structs: YStruct[];                  // one per (X1,X2) pair
  z_structs: { [zDateKey: string]: ZStruct };   // dictionary, keys are date strings
  selected_y_struct_for_details: number; // 0
  processed_z_dates: string[];           // filtered + sorted by isoEvent.z_date_sort_type
  processed_z_dates__sorted_by_date: string[]; // filtered, always date-sorted
  stale?: boolean;                       // ADDED BY refreshXDates, not by the model
}
```
`stale` is injected by the controller (`ophis_controller.js:493` / `:500` / `:502`) and consumed
by the view to grey out the output panel and enable the Recalculate button
(`ophis_view.js:282-316`).

---

## 4. THE RECALCULATION FLOW, END TO END

### 4.1 Explicit "Recalculate Z-Dates" click

```
click #recalculate-z-dates-button                        (ophis_main.js:640)
  → recalculateZDatesHandler()                           (ophis_main.js:379-382)
      preserveScrollPosition = true
      refreshXDates(REFRESH_TYPE__SOFT, true, OPHIS_INPUT_CHANGE__FORCE)
        A. getCurrentIsoEvent()
        B. refreshIsoEventFiltersAndChartOptions()          ~20 getElementById + writes
        C. (SOFT → skip rebuildXDateTableRows entirely)
        D. enable/disable #reset-x-dates-button
        E. refreshXDateSunsets(X_DATE); refreshXDateSunsets(T_DATE)   [EXPENSIVE, cached]
        F. FORCE ⇒ actuallyRunOphis = true
        G. results = runOphisOnEvent(currentIsoEvent)                 [THE EXPENSIVE STEP]
           results.stale = false
        H. refreshCurrentPage(REFRESH_TYPE__SOFT, results)
        I. removeAllDisplayedToolTips()
```

### 4.2 Inside `runOphisOnEvent(isoEvent)` — `ophis_model__operations.js:83-151`

(Detailed in the operations spec; summarised here because the controller depends on the
error strings and the early-outs.)

1. `getEffectiveXDateCount(isoEvent)`.
2. `getEffectiveOperations(isoEvent)` — `deepClone(isoEvent.operations)`, and for each enabled
   op, `validateOperationString(...)` → attaches `cached_operation_function`. **Assigned back to
   `isoEvent.effective_operations`** — i.e. the model object is mutated as a side effect of a
   "read" (`ophis_model__operations.js:92`).
3. Count `enabled === true && cached_operation_function` → `enabledOperationCount`.
4. Error gates, in order (each is a terminal `errors.push` for this run):
   - `effectiveXDateCount < MINIMUM_NUMBER_OF_X_DATES` (=2, `ophis_config.js:16`)
     → `"At least 2 X-Dates are required."`
   - `scope == EVENT_SCOPE__MONTHS` → `"Month-based projections may be supported in a future version."`
   - `scope == EVENT_SCOPE__YEARS` → `"Year-based projections may be supported in a future version."`
   - `enabledOperationCount < MINIMUM_OPERATIONS_REQUIRED` (=1, `ophis_config.js:96`)
     → `"At least 1 Operation is required."`
   - `validateXDateSpread(...)` fails → `errors = dateSpreadErrors` (**replaces**, not appends).
   - otherwise `generateYAndZStructs(...)` — the O(n²) pair loop over X-Dates.
5. `scoreZDates(isoEvent.effective_operations, getScoringSystem(isoEvent), zStructsDict)` —
   runs **even when errors were pushed**, since it is outside the else-chain
   (`ophis_model__operations.js:129`).
6. Whole body is wrapped in `try/catch`; a throw becomes `errors.push(""+error)`.
7. If `errors.length > 0` → `processed_z_dates = []`, `processed_z_dates__sorted_by_date = []`;
   else `sortAndFilterResults(isoEvent, results)` which filters, date-sorts, assigns
   `z_ordinal` to every `ZStruct`, and produces the user-chosen sort.

**Cost profile.** `generateYAndZStructs` is `O(X² · Ops)` with `X` = enabled X-Dates and
`Ops` ≈ 16 by default; each cell also does `axialRotationsBetweenNativeDates` and, for HH:MM
scope, sunset computations. `MAXIMUM_ROTATION_COUNT_Y = MAXIMUM_ROTATION_COUNT_Z = 36500`
(`ophis_config.js:20-21`) cap the projection horizon at ~100 years of days.

### 4.3 Async / debounce inventory (there is essentially none)

**`runOphisOnEvent` is fully synchronous and blocks the main thread.** There is no worker, no
chunking, no `requestIdleCallback`. Confirmed by exhaustive grep: the only `debounce()`
(`ophis_utils.js:804-813`, 100 ms default) is used for Chart.js zoom/pan completion
(`ophis_view__chart.js:776`, `:799`), never for recalculation. The complete async inventory
touching this subsystem:

| Where | Mechanism | Delay | Purpose |
|---|---|---|---|
| `ophis_main.js:80` | XHR callback | network | `package.json` version fetch — gates all of init |
| `ophis_main.js:216` | image `onload` | decode | astro indicator preload — gates init steps 4-6 |
| `ophis_main.js:699` | `requestAnimationFrame` | 1 frame | DPR-change re-render on resize |
| `ophis_view.js:13` | `setTimeout` | 50 ms | `recenterChartOnStartup` — "can't be below 40 ms" |
| `ophis_view.js:100` | `setTimeout` | 500 ms | splash fade-out (first refresh only) |
| `ophis_view.js:105` | nested `setTimeout` | +1000 ms | remove `#initial-loading-container` from DOM |
| `ophis_view.js:109,126` | `requestAnimationFrame` | 1 frame | `setOverflowOnScrollContainers` (called **twice** at :129-130 as a layout hack) |
| `ophis_view__chart.js:865` | `setTimeout` | 500 ms | un-hide chart after "extreme curve" jitter |
| `ophis_view__output.js:59-68` | recursive `setTimeout` | 500 ms | perpetual clock refresh loop |
| `ophis_view__utils.js:401` | `setTimeout` | 2900 ms | toast auto-dismiss |

**Implication for a rewrite:** typing in a date field triggers a synchronous full recalc plus a
`REFRESH_TYPE__HARD` DOM rebuild on every committed change. With `auto_recalculate_z_dates`
enabled and many X-Dates, the UI visibly stalls. The mitigation shipped in v12 is the
`auto_recalculate_z_dates` **off** switch plus the `stale` flag, not debouncing. A rewrite
should keep the stale/recalc UX but move `runOphisOnEvent` into a Web Worker and/or debounce
input commits.

### 4.4 What "stale" means visually (`ophis_view.js:276-316`)

```
zDatesUpToDate.style.width = "101px";           // fixed so the label swap doesn't shift layout

if ( results.stale === true ) {
    outputContainer.style.opacity = (screen == Z_DATES) ? OPACITY__DISABLED (0.5) : OPACITY__ENABLED (1.0);
    enableStandardButton(#recalculate-z-dates-button);
    #z-dates-up-to-date .className = "error_color";  .innerHTML = "Stale";
    if ( results.errors.length > 0 ) hideChartElem(); else chartElem.style.opacity = 0.5;
    chartErrorMessageWrapper.style.opacity = 0.5;
} else {
    outputContainer.style.opacity = 1.0;
    disableStandardButton(#recalculate-z-dates-button);
    #z-dates-up-to-date .className = "green_color";  .innerHTML = "Up-to-date";
    chartElem.style.opacity = 1.0;
    if ( callUpdateChartDatasets ) updateChartDatasets(results);
    chartErrorMessageWrapper.style.opacity = 1.0;
}
```
`OPACITY__DISABLED = 0.5`, `OPACITY__ENABLED = 1.0` (`ophis_view__config.js:117-118`).
DOM ids that cross the boundary: `#z-dates-up-to-date`,
`#scrollable-container-for-output-container`, `#recalculate-z-dates-button`.

---

## 5. MULTI-EVENT HANDLING

### 5.1 Which state is per-event vs global

**Per-event (lives on the `IsoEvent` object, serialized into `.oph` / `save_blob`):**
```
name, notes, x_dates[], t_dates[], lat, long, location_enabled, scope, type,
operations[], scoring_system, z_date_sort_type,
day_scope_start_time_in_millis,
chart_x_min, chart_x_max, chart_y_min, chart_y_max,     (written by refreshZoomRelatedUi)
effective_operations,                                    (transient, written by runOphisOnEvent)
checked_for_swap_target,                                 (transient, Event-Swap screen only)
+ 8  iso_event_filter_* keys (and *_value for 3 of them)
+ 12 chart_option_* keys
```

**Global (`appState.globalOptions`, serialized under `global_options`):**
```
start_screen, skin_mode, current_file_path, local_time_offset_in_millis,
auto_recalculate_z_dates, blur_about_screen,
hide_date_col, hide_hits_col, hide_score_col, hide_msrf_col, hide_operations_col,
hide_operations_col_completely,
prettify_x_date_export_output, minify_x_date_export_output,
prettify_oph_files, minify_oph_files,
current_iso_event_index
```

**Global but NOT persisted (`appState` only):** `startupErrors`, `hasUnsavedChanges`,
`isSignedIn`, `chart`, `map`, `mapMarkerLayer`, `latestResults`, `viewUpdateCount`,
`previousScreen`, `justChangedField`, `blockChartFlushToDisk`, `loadedFromDisk`,
`needToFinalizeAppState`, `mostRecentIsoEventMapClick`, everything `headless_*`,
`fileInputValidationMode`, `filePathFromMainArgs`, `externalFilePath`, `initialized`.

**Crucially: `appState.latestResults` is a single global slot, not per-event.** Switching
events does not stash the previous event's results; they are simply overwritten (or, when
`actuallyRunOphis === false`, reused *as if they belonged to the new event* and merely flagged
stale). Column headers already show the new event (`E₂ X-Dates`) while the output panel still
shows event 1's Z-Dates, dimmed. That is by design (see the comment at
`ophis_controller.js:426`) but is a real trap for a reimplementation.

**`appState.chart`** is likewise a single global slot; the comment at `ophis_main.js:10` says
"Created lazily just-in-time, per event", meaning it is destroyed/recreated when the event
changes, not kept per event.

### 5.2 Adding an event

Two entry points, differing only in `autoSelectNewEvent`:
- `#add-iso-event-button` → `addIsoEvent(false)` → appended, **not** selected,
  `refreshIsoEvents(HARD, NO_CHANGE)` → no recalc.
- Programmatic (`init_step6_appState:453`, `resetAllIsoEvents:373`) → `addIsoEvent()` →
  `autoSelectNewEvent = true` → index moved to the new last entry, skin re-derived,
  `refreshIsoEvents(HARD, FORCE)` → unconditional recalc.

New-event field inheritance from the **last** event (not the current one): `lat`, `long`,
`scope`; `location_enabled` only if the last event was `EVENT_SCOPE__HH_MM` *and* had location
enabled. Name incremented per §3.1.

### 5.3 Removing / resetting events

- **Delete all events:** `#reset-iso-events-button` → confirm dialog → `resetAllIsoEvents()`
  (`ophis_main.js:371-377`):
```js
appState.isoEvents.length = 0;                        // in-place truncate; keeps the array identity
addIsoEvent();                                        // → "Event 1", auto-selected, FORCE refresh
localStorage.removeItem(SERIALIZED_FIELD__LOCAL_STORAGE_SAVE_BLOB);   // key "save_blob"
markChangesSaved();
flushChangesToDisk();
```
  Note the ordering: `localStorage.removeItem` happens *after* `addIsoEvent()` already called
  `flushChangesToDisk()` (which wrote a blob), and then `flushChangesToDisk()` is called again,
  writing the blob back. Net effect: localStorage ends up holding the fresh single-event state.
  The `removeItem` is effectively pointless.
- **Delete an individual event:** not in these two files. Handled by
  `ophis_view__rebuild.js:542-544` (`refreshIsoEvents(HARD, FORCE)` after removal, or
  `resetAllIsoEvents()` when the last one is removed).
- **Delete all X-Dates / T-Dates for the current event:**
  `deleteAllInputDatesHandler(inputDateType)` (`ophis_main.js:607-629`), an inner function of
  `initTopLevelListeners`:
```js
var readableName = isForXDates ? "X-Dates" : "T-Dates";
showDialog("Are you sure you want to delete all "+readableName+" for this Iso-Event?",
           "NO, keep existing "+readableName, "YES, delete all "+readableName, function() {
    var currentIsoEvent = getCurrentIsoEvent();
    if ( isForXDates ) { currentIsoEvent.x_dates = []; } else { currentIsoEvent.t_dates = []; }
    markChangesSaved();
    refreshXDates(REFRESH_TYPE__HARD, /*preserveScrollPosition=*/false, OPHIS_INPUT_CHANGE__CHANGED);
    recenterChart();
    flushChangesToDisk();
});
```
  `markChangesSaved()` before the mutation is persisted is an ordering wart — it clears the
  dirty flag, then `flushChangesToDisk()` sets it again and (in browser) clears it after
  writing. Under Electron with autosave off it would end dirty, which is the correct outcome by
  accident.

### 5.4 Switching events

`selectIsoEvent(isoEventIndex)` (§3.1). Callers: `ophis_view__rebuild.js:470,488,588`
(clicking a row / its radio), `ophis_view__utils.js:595,627`, and `ophis_main.js:353` (map
click on a non-current event).

Sequence: persist index → check the row radio → re-derive skin → `refreshXDates(HARD, false,
CHANGED)` → repaint row backgrounds. The skin change can swap the header image and window title
mid-switch.

### 5.5 Bulk event mutation

`swapInNewIsoEventArray(newIsoEvents, successMessage)` (§3.1) is the only wholesale replacement.
It clamps `current_iso_event_index` **downward to 0** if out of range — it does not clamp to
`length-1`. So loading a 3-event file while index is 7 lands you on event 1, not event 3.

---

## 6. SIGN-IN / AUTH PATH

> **Recommendation up front: a browser rewrite should omit this entirely.** It is client-side
> theatre — every check runs in the renderer, the accepted digests ship in the source, and the
> whole gate is already disabled by a feature flag in v12. It provides no security property.
> This section documents control flow only; no attempt is made (or should be made) to recover
> any password.

### 6.1 Where it lives

`init_step2_signIn(filePathFromMainArgs, account = "", errorMessage = "")` —
`ophis_main.js:121-179`.

### 6.2 The bypass (v12 state)

```js
// ophis_main.js:125-128
if ( isRunningHeadless() || isRunningElectron() == false || isFlagEnabled(FEATURE_FLAG__REQUIRE_SIGN_IN) == false ) {
    init_step3_loadImages(filePathFromMainArgs);
    return;
}
```
`FEATURE_FLAG__REQUIRE_SIGN_IN = false` at `ophis_config.js:291`. `isFlagEnabled(false)` is
false, so the third disjunct is unconditionally true → **the dialog is never shown in v12,
under any runtime**. Additionally the second disjunct means it could never fire in a plain
browser even if the flag were flipped. It is dead code.

### 6.3 Control flow if it *were* live

1. Hide the splash: `document.getElementById("initial-loading-container").style.visibility = "hidden"`.
2. Build the dialog body:
```js
var message = "<div>Please enter account password:</div>";
message += "<input value='"+account+"' type='password' style='box-sizing:border-box; margin-top:30px;' class='password_input' id='account-password-input'/>";
errorMessage = errorMessage ? errorMessage : "&nbsp;";
message += "<div style='' class='error_color'>"+errorMessage+"</div>";
```
   The previous attempt's value is interpolated straight back into an HTML string
   (`value='"+account+"'`) with no escaping — a self-XSS surface, and another reason to drop it.
3. `showDialog(message, "Sign In", /*yesButtonText=*/null, /*onYes=*/null, onNoOrOk, onPreNo,
   /*cancelable=*/false)` (`ophis_view__utils.js:461-535`). With `yesButtonText === null` only
   the single `#dialog-no-button` is rendered, labelled `"Sign In"`; `cancelable=false` means
   clicking the backdrop does not dismiss it. On click, `showDialog` runs `onPreNo()` → hide →
   `onNo()`.
4. `onPreNo` reads the field into a closure variable:
   `account = document.getElementById("account-password-input").value;`
5. `onNoOrOk` (`ophis_main.js:152-176`):
```js
if ( account ) {
    var hash = hashAccount(account);                  // ophis_utils.js:664-666 → sha512(account)
    var hashMatches = false;
    for ( var i = 0; i < ACCOUNT_HASHES.length; i++ ) {
        if ( hash == ACCOUNT_HASHES[i] ) { hashMatches = true; break; }
    }
    if ( hashMatches === true ) { init_step3_loadImages(filePathFromMainArgs); }
    else { init_step2_signIn(filePathFromMainArgs, account, "Invalid password, try again."); }
} else {
    init_step2_signIn(filePathFromMainArgs, account, "Password cannot be empty.");
}
```
   Recursion on failure re-renders the dialog with the previous value pre-filled.

### 6.4 Structural properties (no secrets restated)

- `ACCOUNT_HASHES` is a **5-element array of hex digests declared in plain source** at
  `ophis_config.js:5-11`. Each is 128 hex characters (SHA-512 output, 64 bytes).
- The digest function is `sha512(account)` from `lib/sha512.min.js`. There is **no salt, no
  iteration count, no KDF, and no per-user parameter** — it is a single raw hash of the input.
- Comparison is a plain `==` string compare, non-constant-time (irrelevant here, since the
  attacker already has both sides).
- There is no server, no session, no token. Success merely calls the next init step.
- The only downstream consumer of the outcome is `appState.isSignedIn`, set unconditionally to
  `true` at `ophis_main.js:200` — i.e. **`isSignedIn` is set on the success path *and* on every
  bypass path**, so `isSignedIn()` (`ophis_utils.js:642-644`) is effectively a constant `true`
  after init. It is consulted only by the Electron file-menu handlers
  (`ophis_model__persistence.js:20, 41, 52, 94`) as a "has init finished" proxy.

### 6.5 Rewrite guidance

Delete `init_step2_signIn`, `ACCOUNT_HASHES`, `hashAccount`, `isSignedIn`,
`FEATURE_FLAG__REQUIRE_SIGN_IN`, and `lib/sha512.min.js`. Replace the `isSignedIn()` guards in
the persistence layer with an `appState.initialized` check, which is what they actually mean.
Do not reimplement a client-side password gate under any framing; if access control is ever
needed it belongs on a server, not in the renderer.

---

## 7. ELECTRON COUPLING — complete inventory and browser substitutions

`isRunningElectron()` = `window.electronBridge ? true : false` (`ophis_utils.js:646-648`). The
preload script that defines `window.electronBridge` is **not present in this repository**
(§8), so the bridge surface below is reconstructed from call sites.

### 7.1 Renderer → main (outgoing calls)

| Call | Args | Call site | What a browser rewrite substitutes |
|---|---|---|---|
| `electronBridge.onSignedIn()` | – | `ophis_main.js:208` | Delete. Was a "renderer is alive, show the window / enable menus" ping. |
| `electronBridge.openOphFile(filePath)` | `string` | `ophis_main.js:432`, `ophis_model__persistence.js:169` | **File System Access API**: `showOpenFilePicker({types:[{accept:{"application/json":[".oph"]}}]})` → `getFile()` → `text()`. Fallback: hidden `<input type="file" accept=".oph">`. Note: the current design is *asynchronous with a callback into `onOphFileOpened`* — keep that shape or convert to `await`. |
| `electronBridge.saveFileAs(saveBlob)` | `string` (JSON) | `ophis_model__persistence.js:58` | `showSaveFilePicker({suggestedName:"...oph"})` → `createWritable()` → `write()`. Fallback: `new Blob([json],{type:"application/json"})` + `URL.createObjectURL` + `<a download>`. |
| `electronBridge.autoSaveToFile(path, contents)` | `string, string` | `ophis_model__persistence.js:267`, `ophis_view__export.js:95,129` | Retain a `FileSystemFileHandle` from the initial save and re-`createWritable()`. Requires a one-time user permission grant; there is no silent path-based write in a browser. |
| `electronBridge.openFileExplorer()` | – | `ophis_model__persistence.js:22` | Same as `openOphFile` — a browser has no separate "reveal in explorer". |
| `electronBridge.confirmCloseApp()` | – | `ophis_model__persistence.js:5` | `beforeunload` (already implemented for the browser path at `ophis_main.js:678-686`). |
| `electronBridge.resetProgram()` | – | `ophis_controller.js:20` | `localStorage.clear(); location.reload();` (the browser branch already does this). |
| `electronBridge.refreshMenuOptions(opsColVisible, prettify, minify)` | `bool ×3` | `ophis_controller.js:34` | Delete, or render an in-page settings menu bound to the same three global options. |
| `electronBridge.closeAppWithHeadlessError()` | – | `ophis_main.js:299` | Headless mode is Electron-only; drop it, or map to `process.exit(1)` in a Node CLI build. |
| `electronBridge.closeAppWithHeadlessSuccess()` | – | `ophis_view__export.js:97,140` | Same. |
| `electronBridge.logToCli(message)` | `string` | `ophis_logging.js:70` | Drop the override; keep native `console.*`. |

### 7.2 Main → renderer (incoming, by naming convention `electronBridgeIncoming_*` + friends)

These are global functions the main process is expected to invoke on the renderer window.
None are in my two assigned files except via the `appState` fields they touch, but they are the
other half of the lifecycle contract:

| Renderer function | Defined at | Purpose |
|---|---|---|
| `init(filePathFromMainArgs)` | `ophis_main.js:49` | Boot; Electron calls it instead of self-boot. |
| `onCloseAppRequested()` | `ophis_model__persistence.js:2` | Window-close interception; `confirm()` then `confirmCloseApp()`. |
| `electronBridgeIncoming_openFileExplorer()` | `ophis_model__persistence.js:19` | File → Open. |
| `electronBridgeIncoming_onSaveClickedFromFileMenu()` | `:40` | File → Save. |
| `electronBridgeIncoming_onSaveAsClickedFromFileMenu()` | `:51` | File → Save As. |
| `electronBridgeIncoming_startNewFile()` | `:93` | File → New. |
| `onOphFileOpened(filePath, fileContents, checkForUnsavedChanges)` | `:189` | Result of `openOphFile`. |
| `onOphFileOpenError(filePath, message)` | `:141` | Failure of `openOphFile`. |
| `onOphFileOpenedFromOutsideApp(filePath)` | `:162` | OS file association / double-click. |
| `onSaveAsSuccess(filePath)` | `:68` | Result of `saveFileAs`. |
| `onSaveToFileError(message)` | `:63` | Failure of save. |
| `factoryReset()` | `ophis_controller.js:15` | Menu → Reset Program. |
| `toggleOperationsColVisible()` / `togglePrettifyOphFiles()` / `toggleMinifyOphFiles()` | `ophis_controller.js:45/52/56` | Menu checkbox items. |

### 7.3 Node APIs used directly by the renderer

**None.** The only `require('electron')` is inside a fully commented-out block
(`ophis_main.js:462-470`) that would have wired `ipcRenderer.on('factoryReset', ...)`. Grep
across `src/*.js` finds no other `require(` and no `ipcRenderer` outside that comment. So the
renderer is already contextIsolation-friendly and talks exclusively through the
`window.electronBridge` façade. **This is good news for a browser port:** exactly the twelve
outgoing calls in §7.1 need substitutes.

### 7.4 Runtime-branching behaviour differences to preserve or drop

| Behaviour | Electron | Browser | Recommendation for rewrite |
|---|---|---|---|
| Session restore from localStorage | disabled (`ophis_main.js:436-440`) | enabled | Keep browser behaviour; it is the only persistence a web app has. |
| `beforeunload` guard | not installed (see the comment at `ophis_main.js:675-677`: it "doesn't let Electron reload or navigate away") | installed | Keep. |
| Autosave to file | gated by `FEATURE_FLAG__AUTOSAVE_UNDER_ELECTRON` = **false** | n/a; every flush writes localStorage | Browser model is simpler; keep localStorage/IndexedDB autosave. |
| Reopen previous file at launch | gated by `FEATURE_FLAG__OPEN_PREVIOUS_FILE_UNDER_ELECTRON` = **false** | n/a | Drop. |
| Console piping | overridden to `logToCli` when headless | never | Drop. |
| Sign-in gate | (would be) live | never | Drop entirely (§6). |
| `hasUnsavedChanges` reaching `false` | only on `forceFlush` or autosave | on every flush (localStorage write) | Keep browser semantics. |

---

## 8. KEYBOARD, MENUS, AND GLOBAL EVENT LISTENERS

### 8.1 Keyboard

There is exactly **one** keyboard binding in the whole application, installed in
`initTopLevelListeners()`:

```js
// ophis_main.js:472-480
document.onkeydown = function(evt) {
    evt = evt || window.event;
    if ( isEscapeKey(evt) ) {
        var dialogElemOrNull = document.getElementById("yes-no-dialog-wrapper");
        hideDialog(dialogElemOrNull);
        hideMap();
    }
};
```
`isEscapeKey` (`ophis_view__utils.js:292-302`) checks `evt.key === "Escape" || evt.key === "Esc"`,
falling back to `evt.keyCode === 27`.

**Two traps.** (1) It uses the `document.onkeydown` *property*, not `addEventListener`, so any
other assignment silently clobbers it. (2) `hideDialog(elem)` removes
`elem.parentElement.removeChild(elem)` — but `showDialog` appends a *scroll container* whose
child is the `#yes-no-dialog-wrapper` table. Passing the wrapper removes only the table, leaving
the 100vw×100vh scroll container and the semi-opaque backdrop `#yes-no-dialog-background` in the
DOM. **Escape visually dismisses the dialog text but leaves a full-screen dark overlay
intercepting clicks.** Compare `showDialog`'s own button handlers, which correctly pass
`dialogElemScrollContainer` (`ophis_view__utils.js:510,519,528`). This is a real bug — see
GOTCHA **G-13**.

There is **no** Enter-to-confirm on dialogs, no Ctrl+S, no Ctrl+O, no arrow-key navigation.
`KEY_CODE__ENTER = 13` and `isEnterKey` exist (`ophis_view__config.js:10`,
`ophis_view__utils.js:285`) but are used only by individual input fields elsewhere.

Additionally, `disableTabIndeces()` (`ophis_main.js:191-194`, called during finalization) sets
`tabIndex = -1` on every `<button>` and every `input[type="checkbox"]`, removing them from the
tab order entirely.

### 8.2 Native menus

All menu construction lives in the absent Electron main process. The renderer's only
participation is:
- **Outgoing:** `refreshMenuOptions(operationsColVisibleChecked, prettifyOphFilesChecked,
  minifyOphFilesChecked)` — called from `initAppStateFinalization()` (`ophis_main.js:287`) and
  from `toggleGlobalBooleanOptionWithNoFileChangeRequired()` (`ophis_controller.js:42`).
- **Incoming:** the `electronBridgeIncoming_*` and `toggle*` functions listed in §7.2.

There are no in-page menus. Screen switching is a single `<select id="current-screen">`.

### 8.3 Global listeners installed by `initTopLevelListeners()` (`ophis_main.js:460-720`)

Full list, in installation order:

1. `document.onkeydown` — Escape handling (above).
2. `#add-x-date-button` click.
3. `#add-t-date-button` click.
4. `#reset-iso-event-filters-button` click.
5. `#reset-iso-event-chart-options-button` click.
6. `#reset-iso-event-chart-help-button` click.
7. *(assignment, not a listener)* `#x-date-container-starting-message`.innerHTML =
   `HELP_MESSAGE__X_DATES_PANEL`.
8. *(assignment)* `#t-date-container-starting-message`.innerHTML = `HELP_MESSAGE__T_DATES_PANEL`.
9. `#x-dates-help-button` click.
10. `#t-dates-help-button` click.
11. `#iso-events-help-button` click.
12. `#iso-event-filters-help-button` click.
13. `#chart-help-button` click.
14. `#add-iso-event-button` click.
15. `enableRowButton(#reset-iso-events-button)` then its click listener.
16. `#reset-x-dates-button` click.
17. `#reset-t-dates-button` click.
18. `#recalculate-z-dates-button` click — **guarded** by
    `if ( document.getElementById("recalculate-z-dates-button") )` (`ophis_main.js:639`); the
    only guarded one, implying that element is optional in some layouts.
19. `setUpIsoEventFieldCheckboxEventListeners()` — builds the 20 filter/chart-option rows and
    their per-row `click` listeners (`ophis_view__utils.js:761+`), inserting into
    `#iso-event-filter-container` and `#iso-event-chart-options-container`.
20. `for each MASTER_CHECKBOX_CONFIGS: setUpMasterCheckbox(config)` — 7 configs.
21. `fillInSelectElem(#current-screen, OPHIS_SCREENS, getScreenName)` then its `change` listener.
22. Nine `applyToolTipToElemId(...)` calls: `add-x-date-button`, `reset-x-dates-button`,
    `recalculate-z-dates-button`, `add-iso-event-button`, `reset-iso-events-button`,
    `reset-iso-event-filters-button`, `reset-iso-event-chart-options-button`,
    `reset-iso-event-chart-help-button`, `recenter-chart-button`, `chart-help-button`.
23. `window.beforeunload` — **browser only** (`if ( isRunningElectron() === false )`).
24. `window.onresize` — property assignment, not `addEventListener`.
25. `window.addEventListener('scroll', updateOutputPanelScrollIfNeeded)`.

Plus, installed elsewhere in the startup path: the two map-close click listeners and the two
Leaflet map handlers (`initMap`, `ophis_main.js:303-369`), and the four chart canvas handlers
(`doChartInitialSetup`, `ophis_view__chart.js:65-118`).

### 8.4 `#current-screen` select — the screen enum

`fillInSelectElem` (`ophis_view__utils.js:690-703`) creates one `<option>` per entry of
`OPHIS_SCREENS` with `value = <enum string>` and `text = getScreenName(enum)`.

`OPHIS_SCREENS` (`ophis_view__config.js:132-142`), in display order — note
`OPHIS_SCREEN__DEBUG` is **commented out** of the list but the constant still exists and
`refreshCurrentPage` still has a branch for it (`ophis_view.js:241`):

| value | label (from `getScreenName`, `ophis_view__strings.js:291-318`) |
|---|---|
| `OPHIS_SCREEN__ABOUT` | `"About "` |
| `OPHIS_SCREEN__Z_DATES` | `"Z-Dates "` |
| `OPHIS_SCREEN__OPERATIONS` | `"Operations "` |
| `OPHIS_SCREEN__IMPORT_X_DATES` | `"Import Events "` |
| `OPHIS_SCREEN__EXPORT_X_DATES` | `"Export Events "` |
| `OPHIS_SCREEN__EXPORT_Z_DATES` | `"Export Z-Dates "` |
| `OPHIS_SCREEN__EVENT_SETTINGS` | `"Event Settings "` |
| `OPHIS_SCREEN__EVENT_SWAP` | `"Event Data Transfer "` |
| *(excluded)* `OPHIS_SCREEN__DEBUG` | `"Debug "` |

Every label has a **trailing space** appended (`ophis_view__strings.js:315`, replacing a
commented-out `&nbsp;`) purely so `adjustSelectElemWidth` measures a little extra room.

`setCurrentScreen(screenEnum)` (`ophis_main.js:722-740`):
```js
var currentScreenSelectElem = document.getElementById("current-screen");
currentScreenSelectElem.value = screenEnum;
setGlobalOption(GLOBAL_OPTION__START_SCREEN, screenEnum);      // flushes to disk
adjustSelectElemWidth(currentScreenSelectElem);                // measures text in a temp span, +30px

var autoRecalcEnabled = appState.globalOptions[GLOBAL_OPTION__AUTO_RECALCULATE_Z_DATES] ? true : false;
var assumeSomeInputChanged = autoRecalcEnabled && getCurrentScreen() == OPHIS_SCREEN__Z_DATES;
refreshIsoEvents(REFRESH_TYPE__RIGHT_PANEL_ONLY,
                 assumeSomeInputChanged ? OPHIS_INPUT_CHANGE__CHANGED : OPHIS_INPUT_CHANGE__NO_CHANGE);
```
The author's own comment (`ophis_main.js:730-736`) explains the fudge: switching *to* the
Z-Dates screen with auto-recalc on is treated as "input changed" so the engine re-runs, even
though nothing about the inputs actually changed. It notes `appState.latestResults.stale` could
be trusted instead. `adjustSelectElemWidth` sets `width = (measuredTextWidth + 30) + "px"`
(`ophis_view__utils.js:687` — the code comment says "+20 for padding/arrow" but the value is 30).

### 8.5 `initMap()` — `ophis_main.js:303-369`

Runs only if `FEATURE_FLAG__SHOW_LOCATION` (true in v12).

```js
#map-background-close-capture .click → hideMap()
#map-close-button             .click → hideMap()

L.tileLayer('./img/offline_map/map/{z}/{x}/{y}.png', { maxZoom: MAP_MAX_ZOOM /*5*/, noWrap: true })
    .addTo(appState.map);
```
Tiles are **bundled offline PNGs**, consistent with the no-network design.

`mousemove` handler: `roundNumberToLocationPrecision(e.latlng.lat/lng)` →
`updateMapLatLongHud(lat, long)` which writes `readableLatLong(...)` into `#map-current-lat-long`.

`click` handler (`ophis_main.js:328-361`) — the map's only mutation path:
```js
var isoEventIndex = appState.mostRecentIsoEventMapClick;   // set by showMap(isoEvent)
var errors_out_unused = [];
var checkLimits = false;
var lat  = parseLatOrLongString(e.latlng.lat,  isoEventIndex, COORD_LAT,  errors_out_unused, checkLimits);
var long = parseLatOrLongString(e.latlng.lng, isoEventIndex, COORD_LONG, errors_out_unused, checkLimits);
lat  = constrainLatOrLongValue(lat,  COORD_LAT);
long = constrainLatOrLongValue(long, COORD_LONG);

var isoEvent = appState.isoEvents[isoEventIndex];
if ( isoEvent ) { isoEvent.lat = lat; isoEvent.long = long; }

flushChangesToDisk();

if ( appState.globalOptions.current_iso_event_index == isoEventIndex ) {
    refreshIsoEvents(REFRESH_TYPE__SOFT, OPHIS_INPUT_CHANGE__CHANGED);
} else {
    refreshIsoEvents(REFRESH_TYPE__SOFT, OPHIS_INPUT_CHANGE__CHANGED);
    selectIsoEvent(isoEventIndex);
}

hideMap();
var timezone = getTimezone(isoEvent.lat, isoEvent.long);
showToast("New Coords: " + readableLatLong(lat, long) + ", New Timezone: '" + timezone + "'");
```
Three things to note: (a) the two branches of the if/else share their first statement — the
`refreshIsoEvents` call is duplicated rather than hoisted, so switching events does a *double*
refresh; (b) `checkLimits = false` deliberately skips range validation because
`constrainLatOrLongValue` clamps immediately afterwards; (c) `getTimezone(isoEvent.lat, ...)`
dereferences `isoEvent` **outside** the `if (isoEvent)` guard — if the index were stale this
throws `TypeError`. See GOTCHA **G-14**.

Bounds: `L.latLngBounds(L.latLng(-65,-180), L.latLng(65,180))` from `LAT_LIMIT`/`LONG_LIMIT`,
then `hideMap()` so the map starts hidden.

`showMap(isoEvent)` lives in `ophis_view__utils.js:411-431`; it sets
`appState.mostRecentIsoEventMapClick = index`, makes `#map-container` visible, re-centres at
`DEFAULT_MAP_SELECTION_ZOOM`, and swaps a single marker into `appState.mapMarkerLayer`.

### 8.6 `window.onresize` — `ophis_main.js:689-715`

```js
var currentDevicePixelRation = window.devicePixelRatio;   // captured at install time

window.onresize = function() {
    allowChartFlushToDisk();
    var newDevicePixelRatio = window.devicePixelRatio;
    if ( currentDevicePixelRation != newDevicePixelRatio ) {
        currentDevicePixelRation = newDevicePixelRatio;
        requestAnimationFrame(function() {
            refreshCurrentPage(REFRESH_TYPE__RIGHT_PANEL_ONLY, appState.latestResults,
                               /*callUpdateChartDatasets=*/true,
                               /*setOverflowForScrollContainers=*/true,
                               /*forceRedraw=*/true);
        });
    } else {
        setPanelMaxDimensions();
    }
    if ( getCurrentScreen() == OPHIS_SCREEN__EVENT_SWAP ) { refreshIsoEventSwapRows(); }
};
```
DPR change (monitor switch / browser zoom) forces a full right-panel redraw; a plain resize only
recomputes panel dimensions. **Not debounced or rAF-throttled on the common path** —
`setPanelMaxDimensions()` runs on every resize event. The `//TODO` at `ophis_main.js:711`
acknowledges the Event-Swap special case is ad hoc.

---

## 9. MISSING ARTIFACTS (dependencies you cannot read here)

Verified absent from `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/`:

1. **`index.html`** — the host page. Every `document.getElementById(...)` in these two files
   therefore names an element whose markup, nesting, and CSS classes must be inferred. A
   rewrite must recreate at minimum: `#map`, `#map-container`, `#map-background-close-capture`,
   `#map-close-button`, `#map-current-lat-long`, `#initial-loading-container`,
   `#panel-container`, `#screen-specific-area`, `#output-container`,
   `#scrollable-container-for-output-container`, `#current-screen`, `#header-image`,
   `#app-version`, `#unsaved-changes-reminder`, `#z-dates-up-to-date`, `#x-date-container`,
   `#t-date-container`, `#iso-event-container`, `#x-dates-col-header`, `#t-dates-col-header`,
   `#iso-event-filter-header`, `#iso-event-chart-options-header`,
   `#iso-event-filter-container`, `#iso-event-chart-options-container`,
   `#auto-recalculate-z-dates-container`, `#current-local-time`, `#event-day-scope-start-time`,
   the 7 `#<base>-checkbox-header` cells, and every button id listed in §8.3.
   `package.json` `"main": "main.js"` also points at a file that is not present.
2. **The Electron `main.js` and preload script** — so the exact `electronBridge` signatures,
   the menu definitions, and the `.oph` file-association plumbing are reconstructed from call
   sites only (§7).
3. `img/` subtrees referenced by name (`img/astro_indicators/*`, `img/hit_symbols/*`,
   `img/offline_map/map/{z}/{x}/{y}.png`, `img/header.png`, `img/header_markets.png`,
   `img/spinning_globe.png`, `img/spinning_globe_white.png`) — `img/` exists at the repo root
   but its contents were not enumerated for this spec.

---

## 10. GOTCHAS

**G-1 — `current_iso_event_index` is never initialised.**
It is absent from the `globalOptions` seeding block (`ophis_main.js:34-47`). It first appears
either from a loaded blob (`ophis_model__persistence.js:336`) or lazily inside
`getCurrentIsoEvent()` (`ophis_controller.js:9`). Consequently the very first
`setGlobalOption("current_iso_event_index", ...)` emits
`printWarning("Global option 'current_iso_event_index' was undefined, setting anyway.")`
(`ophis_model__persistence.js:225`). Also, `getCurrentIsoEvent` uses a **truthiness** test, so
index `0` takes the else-branch and re-assigns `0` on every call. Harmless, but a naive
"optimise the redundant write" refactor changes nothing and a naive "use `!= null`" refactor
changes nothing either — just seed it to `0` up front.

**G-2 — The Leaflet map is constructed at script-parse time, inside the object literal.**
`ophis_main.js:11`: `map: FEATURE_FLAG__SHOW_LOCATION == true ? L.map('map').setView([0,0], DEFAULT_MAP_SELECTION_ZOOM) : null`.
This runs before `init()`, before `DOMContentLoaded`, and requires both `L` (Leaflet) and a live
`#map` element. The script tag order in `index.html` is therefore load-bearing in a way no
comment mentions. In a rewrite, construct the map inside `initMap()`.

**G-3 — Image preload has no error path; a single 404 hangs startup forever.**
`loadAstroIndicators` (`ophis_view__chart_config.js:137-176`) fires the continuation only when
`getDictionarySize(CHART_IMAGES) == CHART_IMAGE_COUNT`. No `onerror`, no timeout. Add both.

**G-4 — `startupErrors` are re-concatenated onto the live results object on every refresh.**
`ophis_view.js:194`: `results.errors = results.errors.concat(appState.startupErrors);`. On the
*reuse* path `results` **is** `appState.latestResults`, so this mutates a persistent array.
Every refresh appends the startup errors again. With a non-empty `startupErrors`, the error list
grows without bound across a session. In practice `startupErrors` is empty, which is why nobody
noticed.

**G-5 — `exitHeadlessWithError` does not stop execution.**
`ophis_main.js:295-301` just logs and (under Electron) calls
`electronBridge.closeAppWithHeadlessError()`. It has no `return`-forcing effect on its caller.
At `ophis_main.js:396` the caller then falls through and proceeds to the localStorage branch.
Only the actual process teardown masks it. Callers at `:239` and `:74` do return/terminate; this
one does not.

**G-6 — `validatePotentialDiskLoadOrImport(blob, /*globalOptionsOnly=*/true)` always reports an error.**
Because `newIsoEventArray` stays `null`, the check at `ophis_model__validation.js:1026` pushes
`"Blob import made it past the gauntlet with zero errors, yet a null event array."`.
`init_step6_appState` ignores `.errors` on that call (`ophis_main.js:411-412`), so it is
harmless *there* — but any reimplementation that starts checking errors uniformly will
spuriously fail startup.

**G-7 — `start_screen` is persisted but never restored.**
`loadSavedGlobalOptions` reads it into `appState.globalOptions` but then hard-sets the select to
`DEFAULT_STARTING_SCREEN` (`OPHIS_SCREEN__Z_DATES`), with the honouring line commented out at
`ophis_model__persistence.js:338-339`. Meanwhile the module-scope default for the same key is
`OPHIS_SCREEN__ABOUT` (`ophis_main.js:35`). So there are three competing "starting screen"
values and the DOM select wins. Since `getCurrentScreen()` reads the DOM, the app always opens
on Z-Dates.

**G-8 — `initAppStateFinalization` indexes `iso_event_row` unguarded.**
`ophis_main.js:277-278`:
`isoEventRows[appState.globalOptions.current_iso_event_index].scrollIntoView({block:"center"})`.
If the persisted index exceeds the number of rendered rows this throws and finalization aborts
mid-way — `appState.initialized` never becomes `true`, `refreshMenuOptions` never runs, and the
save-status indicator stays hidden (because `refreshUnsavedChangesReminder` gates on
`appState.initialized`, `ophis_view__utils.js:541`). `swapInNewIsoEventArray` clamps the index,
but only on the load path.

**G-9 — `factoryReset()` has no reachable caller in `src/`.**
Its only intended trigger, the `ipcRenderer.on('factoryReset', ...)` wiring, is commented out
(`ophis_main.js:462-470`). It is presumably invoked as `window.factoryReset()` from the Electron
main process. In a browser build it is unreachable dead code unless you wire a button to it.

**G-10 — The first Iso-Event is created at lat/long 0,0, not at `DEFAULT_LAT`/`DEFAULT_LONG`.**
`addIsoEvent` sets Dallas (32.8, −96.8) as the seed, then computes
`locationEnabledByDefault = eventScope == EVENT_SCOPE__HH_MM`. Since the default scope is
`EVENT_SCOPE__DAYS`, that is `false`, and `ophis_controller.js:187-190` zeroes both coordinates.
`DEFAULT_LAT`/`DEFAULT_LONG` are therefore effectively dead for the first event. They matter
only if some other path creates an event with HH:MM scope.

**G-11 — `appState.headless_output_type` is write-only.**
Set at `ophis_main.js:24` and `:63`, read nowhere. `getHeadlessOutputTypeFromQueryParams()` also
warns for any value other than `"csv"` — CSV is the only implemented output. Dead state.

**G-12 — `newOperation()` ignores its `enabled` parameter.**
`ophis_utils.js:1006-1012` returns `{ equation, weight, enabled: true }` — hard-coded. So
`newOperation("X1+YxOPH_HEP", POINTS__ALPHA_OPERATION_MATCH, OPERATION_ENABLED_FALSE)`
(`ophis_model__params.js:109`) produces an *enabled* operation, contradicting the author's
intent. It is masked because `cloneDefaultOperationsForAppVersionGte8()` sets
`enabled = true` on all of them anyway (`ophis_model__params.js:125`) — so fixing the bug alone
changes nothing, but fixing *both* would change default results by adding/removing one Alpha
hepta-cycle operation. Decide deliberately; do not "clean up" one without the other.

**G-13 — Escape leaves the dialog backdrop in the DOM.**
`ophis_main.js:476-477` passes `#yes-no-dialog-wrapper` to `hideDialog`, which removes only that
node from its parent. `showDialog` appended a `dialogElemScrollContainer` (100vw×100vh, fixed,
z-index 100) containing both the wrapper and `#yes-no-dialog-background` (70% black). Escape
removes the table and leaves the overlay. Fix: give the scroll container an id and remove that,
or walk up to it.

**G-14 — Map click dereferences `isoEvent` outside its own null guard.**
`ophis_main.js:342-345` guards `if ( isoEvent ) { ... }`, but `ophis_main.js:358` then calls
`getTimezone(isoEvent.lat, isoEvent.long)` unguarded. Reachable if
`mostRecentIsoEventMapClick` goes stale relative to `isoEvents` (e.g. an event deleted while
the map is open).

**G-15 — `refreshXDates` enables/disables only the X-Dates reset button.**
`ophis_controller.js:452-458` handles `#reset-x-dates-button` but there is no matching block for
`#reset-t-dates-button`, which is left in whatever state the markup gives it.

**G-16 — On the reuse path, `results` aliases `appState.latestResults`.**
`ophis_controller.js:497` assigns the same object, and `ophis_view.js:135-137` then does
`previousResults = appState.latestResults; appState.latestResults = results;` — so
`previousResults === results` on that path, defeating the "did we just fix the errors?" check
at `ophis_view.js:197-203` (`appState.justFixedErrors` can never become true when reusing).

**G-17 — Two spellings of the same flag: `intialized` and `initialized`.**
`ophis_main.js:17` declares `intialized` (missing the second `i`); it is never read or written
anywhere in `src/`. `ophis_main.js:20` declares the real `initialized`. Delete the typo.

**G-18 — `getCurrentNativeDate()` does not honour the headless epoch freeze.**
`addXDate` uses `getCurrentNativeDate()` = raw `new Date()` (`ophis_utils.js:447-449`), whereas
the model uses `getCurrentLocalTime()` which *does* respect
`appState.headless_current_epoch_millis` (`ophis_utils.js:650-662`). Default-date computation is
therefore non-deterministic even in a frozen-clock headless run.

**G-19 — `markChangesSaved()` is called *before* the mutation is flushed in two places.**
`deleteAllInputDatesHandler` (`ophis_main.js:620` then `:627`) and `swapInNewIsoEventArray`
(`ophis_controller.js:82` then `:85`). `flushChangesToDisk()` immediately sets
`hasUnsavedChanges = true` again at its top (`ophis_model__persistence.js:238`) and only clears
it if it actually writes to localStorage. The observable state depends on the Electron/browser
branch. Pick one order and stick to it in a rewrite.

**G-20 — `addXDate` clears hours/minutes/seconds but not milliseconds.**
`ophis_controller.js:274-276`. Invisible at the app's minute display precision, but it means two
"identical" default dates created in the same second can differ in raw millis.

**G-21 — `xDateToNativeDateForController` deliberately disables GMT locking.**
`ophis_controller.js:235-239` passes `lockDayScopeToGmt = false`, overriding
`FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT = true`. It is used only for computing the *default value*
of a newly added date row, in the operator's local timezone, while the Y/Z math uses the
GMT-locked conversion. Unifying these two code paths will change which calendar day a new row
defaults to near midnight.

**G-22 — Every screen change writes to disk.**
`setCurrentScreen` calls `setGlobalOption(GLOBAL_OPTION__START_SCREEN, screenEnum)` with the
default `shouldFlushChangesToDisk = true`, so merely browsing between tabs performs a full
`getSaveBlob(SAVE_BLOB_MODE__EVERYTHING)` → `JSON.stringify` of all events → `localStorage.setItem`.
With many events this is a noticeable synchronous cost per tab switch. Note `getSaveBlob` also
does `saveBlob.replaceAll(",", ", ")` over the whole JSON string
(`ophis_model__persistence.js:135`) — an O(n) pass purely for readability.

**G-23 — `getCurrentScreen()` reads the DOM, not `appState`.**
`ophis_view.js:327-332`. The `<select id="current-screen">` value is the authoritative current
screen; `globalOptions.start_screen` is a lagging copy. Any rewrite that makes `appState` the
source of truth must audit every `getCurrentScreen()` call — there are branches in
`refreshXDates`, `setCurrentScreen`, `refreshCurrentPage`, `refreshZoomRelatedUi`,
`shouldExpandMainOutputPanel`, and `window.onresize`.

**G-24 — `initAppState(...)` does not exist.**
`ophis_model__persistence.js:158` calls `initAppState(filePathFromMainArgsPurposelyNull)` inside
`onOphFileOpenError`, with the comment *"Have to back up a bit and re-run initAppState(),
instead of just calling initAppStateFinalization()."* No such function is defined anywhere in
`src/` — the function was renamed to `init_step6_appState` (`ophis_main.js:384`) and this call
site was not updated. **Opening a corrupt or missing `.oph` file at launch under Electron throws
`ReferenceError: initAppState is not defined` and leaves the app permanently stuck on the splash
screen** (`needToFinalizeAppState` was already reset to `false` at line 153, so no recovery is
possible). Confirmed by exhaustive grep: the identifier appears only at
`ophis_model__persistence.js:157` (comment) and `:158` (the call). A rewrite must call the
step-6 equivalent here.

---

## 11. MINIMAL REIMPLEMENTATION CHECKLIST

1. One global store with the shape in §1; seed `current_iso_event_index: 0` explicitly (G-1).
2. Boot: constants → DOM ready → `initMap` (construct Leaflet *inside* it, G-2) →
   preload images **with error handling** (G-3) → self-checks → listeners → load state → finalize.
   Drop the version XHR (hard-code) and drop step 2 entirely (§6).
3. One `refreshXDates(refreshType, preserveScroll, inputChange)` choke point implementing the
   decision table in §3.3 verbatim, including the `stale` semantics.
4. `REFRESH_TYPE__HARD` = rebuild date tables + headers + counts;
   `REFRESH_TYPE__SOFT` = skip the rebuild;
   `REFRESH_TYPE__RIGHT_PANEL_ONLY` = additionally skip most output clearing (`ophis_view.js:166-186`).
5. Keep `auto_recalculate_z_dates` + explicit Recalculate + the Stale/Up-to-date badge; move
   `runOphisOnEvent` off the main thread and debounce input commits (§4.3).
6. Replace the twelve `electronBridge` calls per §7.1; keep the `beforeunload` guard.
7. Keep exactly one keyboard binding (Escape) but fix the dialog-teardown bug (G-13), and drop
   `disableTabIndeces()` so the app is keyboard-navigable.
8. Fix G-24 before shipping any file-open path.
