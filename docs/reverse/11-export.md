# Ophis v12 — Subsystem Spec: EXPORT / REPORTING

**Primary source (read 100%, 785 lines):**
`C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/src/ophis_view__export.js`

**Third-party libraries inspected at call sites only:**

| Library | File | Version | How it is reached |
|---|---|---|---|
| jsPDF (UMD, minified) | `lib/jspdf.umd.min.js` | **2.5.2**, built 2024-09-17 | `new jspdf.jsPDF('l','pt')` — `ophis_view__export.js:479` |
| jsPDF-AutoTable | `lib/jspdf.plugin.autotable.js` | **3.8.3** | **NEVER CALLED.** Zero occurrences of `autoTable` anywhere in `src/`. Dead dependency. |
| write-excel-file | `lib/write-excel-file.2.3.2.min.js` | **2.3.2** | global `writeXlsxFile(rows, opts)` — `ophis_view__export.js:444` |
| html2canvas | `lib/html2canvas.min.js` | **1.4.1** | **Never called by first-party code.** jsPDF's `.html()` resolves the *global* `window.html2canvas` (`jspdf.umd.min.js`: `r.html2canvas?Promise.resolve(r.html2canvas):…require("html2canvas")`). It is a hard runtime prerequisite for the PDF path. |
| Papa Parse | `lib/papaparse.min.js` | **5.4.1** | `Papa.unparse(csvRows)` — `ophis_view__export.js:93` and `:372` |

> **Dependency note:** the HTML page that loads these `<script>` tags is *not present in the repo* (`src/` and `lib/` are git-ignored; there is no `index.html` and no Electron `main.js`/`preload.js`). Script load order must therefore be inferred: `papaparse`, `jspdf.umd.min`, `html2canvas.min`, `write-excel-file.2.3.2.min` must all be loaded and must have installed their globals (`Papa`, `jspdf`, `html2canvas`, `writeXlsxFile`) **before** any export runs. `jspdf.plugin.autotable.js` can be dropped entirely.

---

## 0. Scope and module boundary

`ophis_view__export.js` owns **two unrelated things** that happen to share a file:

1. **Headless / CLI CSV output** (Electron-only, no UI).
2. **The "Export Z-Dates" UI screen** and its three interactive exporters (PDF, CSV, XLSX).

It *also* contains one function that does not belong to export at all —
`getInputValidationModeFromQueryParams()` (`:146-172`) parses the `input_validation_mode`
query param for the **file-loading** subsystem. It is called from `ophis_main.js:64`.
Flagged as misplaced; reimplementers should move it to the persistence/validation module.

The **`.oph` "Export Events" screen** (`OPHIS_SCREEN__EXPORT_X_DATES`) lives in
`ophis_view.js:361` (`renderExportXDates()`), **not** in this file — but it reuses this
file's `writeStringToFile()` helper (`ophis_view.js:435`). Documented in §7 for completeness.

### Global symbols this module *defines* (all are bare `var`/`function` globals — no modules, no IIFE)

```
OPH_OUTPUT_NONE_KEYWORD
OPH_OUTPUT_ERROR_STATUS__SUCCESS
OPH_OUTPUT_ERROR_STATUS__NO_RESULTS
OPH_OUTPUT_ERROR_STATUS__GENERAL_FAILURE
handleHeadlessOutput()
newCsvRowForError(currentIsoEvent, error)
exportHeadlessSingleCsv()
exportHeadlessMultipleCsvs()
getInputValidationModeFromQueryParams()
getHeadlessOutputTypeFromQueryParams()
renderExportZDates()
validateOutputBeforeExport(continuation)
writeStringToFile(stringToWrite, fileName)
newCsvRowForZDate(currentIsoEvent, zDateTags)
convertResultsToCsvString(currentIsoEvent, results)
getFileNameFromPath(filePath)
getCsvFileNameForExport(currentIsoEvent)
exportCsv(currentIsoEvent, results)
newExcelRowForDate(zDateTags)
exportExcel()
getFileNameForExport(currentIsoEvent = getCurrentIsoEvent())
exportPdf()
```

### Global symbols this module *consumes* (defined elsewhere — do not guess, these are the real homes)

| Symbol | Defined in |
|---|---|
| `appState` (mutable global object) | `ophis_main.js:4` |
| `runOphisOnEventForExport(isoEvent)` | `ophis_model__operations.js:59` |
| `getCurrentIsoEvent()` | `ophis_controller.js:3` |
| `refreshXDates(refreshType, preserveScrollPosition, ophisInputChange)` | `ophis_controller.js:433` |
| `REFRESH_TYPE__SOFT` = `"REFRESH_TYPE__SOFT"` | `ophis_config.js:434` |
| `OPHIS_INPUT_CHANGE__FORCE` = `"OPHIS_INPUT_CHANGE__FORCE"` | `ophis_config.js:62` |
| `OPH_HEADLESS_OUTPUT_TYPE__CSV` = `"OPH_HEADLESS_OUTPUT_TYPE__CSV"` | `ophis_config.js:26` |
| `OPH_HEADLESS_OUTPUT_TYPE__DEFAULT` (=== `__CSV`) | `ophis_config.js:27` |
| `FILE_INPUT_VALIDATION_MODE__STRICT / __ORIGINAL / __LOOSE` | `ophis_config.js:336-338` |
| `Z_DATE_SHORTHAND` = `"Z"`, `X_DATE_SHORTHAND` = `"X"` | `ophis_config.js:465`, `:464` |
| `DATE_DELIMITER` = `"/"` | `ophis_config.js:273` |
| `getQueryParamString(name, default="")` | `ophis_utils.js:843` |
| `toLowerCase(s)` (null-safe, returns `""` for falsy) | `ophis_utils.js:116` |
| `isRunningHeadless()` → `appState.headless === true` | `ophis_main.js:187` |
| `isRunningElectron()` → `!!window.electronBridge` | `ophis_utils.js:646` |
| `exitHeadlessWithError(msg)` | `ophis_main.js:295` |
| `sanitizeFileName(fileName)` | `ophis_utils.js:819` |
| `getCurrentLocalTime(millisOffset=0)` | `ophis_utils.js:650` |
| `nativeDateToXDate(nativeDate, lat?, long?)` | `ophis_view__strings.js:162` |
| `addOutputRow()` → `#output-container`.insertRow(-1) | `ophis_view__utils.js:276`, `:326` |
| `showToast(message)` | `ophis_view__utils.js:390` |
| `showOkDialog(message)` | `ophis_view__utils.js:457` |
| `showDialog(message, noOrOkText, yesText, onYes, onNo, onPreNo, cancelable=true)` | `ophis_view__utils.js:461` |
| `getHitCountSymbolImage(hitCount, srcOnly)` | `ophis_view__utils.js:238` |
| `isChartNotCentered()` → `appState.chart.isZoomedOrPanned()` | `ophis_view__chart.js:120` |
| `recenterChart()` → `appState.chart.resetZoom("none")` | `ophis_view__chart.js:55` |
| `getChartElem()` → `document.getElementById('timeline-chart')` | `ophis_view__chart.js:195` |
| `electronBridge.*` (preload-injected) | Electron main process — **source not in repo** |

---

## 1. Data structures

### 1.1 `appState` fields read by this module (`ophis_main.js:4-30`)

```ts
appState = {
  isoEvents: IsoEvent[],            // all events loaded from the .oph file
  latestResults: OphisResults | {}, // set at ophis_view.js:137 by refreshCurrentPage()
  headless: boolean,                // query param ?headless=true
  headless_output_type: string,     // parsed but NEVER READ by the export path (dead)
  headless_output_path: string,     // "" when unset; a DIRECTORY path
  headless_multiple_files: boolean, // ?headless_multiple_files=true
  headless_current_epoch_millis: number, // default Number.MIN_SAFE_INTEGER
  filePathFromMainArgs: string|null,     // absolute path of the .oph file, from Electron argv
  fileInputValidationMode: string,       // FILE_INPUT_VALIDATION_MODE__*
  chart: Chart|null,                     // Chart.js instance, created lazily
  globalOptions: { current_iso_event_index: number, ... }
}
```

### 1.2 `IsoEvent` (only the fields the exporter touches)

```ts
IsoEvent = {
  name: string,             // used for filenames and PDF titles
  x_dates: XDate[],         // ALL anchor dates, enabled and disabled alike
  scope: string,            // EVENT_SCOPE__DAYS | __HH_MM | __MONTHS | __YEARS
  lat: number, long: number,
  z_date_sort_type: string, // IGNORED by every exporter — see GOTCHA G-11
  chart_x_min/chart_x_max/chart_y_min/chart_y_max: number
}

XDate = { date: "MM/DD/YYYY", time: "HH:mm", enabled: boolean }   // ophis_view__strings.js:153
```

### 1.3 `OphisResults` (produced by `runOphisOnEvent` / `runOphisOnEventForExport`)

```ts
OphisResults = {
  errors: (string | OphError)[],   // string form only survives inside runOphisOnEvent;
                                   // runOphisOnEventForExport normalises all to OphError
  z_structs: { [zDateDictKeyMillisString: string]: ZStruct },
  processed_z_dates: string[],              // filtered, sorted by isoEvent.z_date_sort_type
  processed_z_dates__sorted_by_date: string[], // filtered, ALWAYS date-ascending  <-- exporters use THIS
  stale: boolean
}

OphError = {                       // ophis_model__operations.js:52
  error_status: string,            // OPH_OUTPUT_ERROR_STATUS__*
  error_message: string            // HTML already converted to plain text
}
```

### 1.4 `ZStruct` — the per-Z-date record (`ophis_model__operations.js:564-579`, `:425-445`, `:162`)

The export file even carries a literal sample in a comment block (`ophis_view__export.js:265-278`):

```ts
ZStruct = {
  z_date_native:            Date,   // debug only
  z_date_native_start:      Date,
  z_date_native_end:        Date,
  z_date_readable_start:    string, // MAY CONTAIN HTML when scope == EVENT_SCOPE__HH_MM:
                                    //   "07/05/2025<span style='margin-left:3px;'
                                    //     class='has_clock_font'>03:21</span>"
  z_date_readable_end:      string,
  z_date_readable_start_no_html: string, // "07/05/2025" or "07/05/2025 03:21"
  z_date_readable_end_no_html:   string,
  operation_match_structs: OperationMatchStruct[],
  msrf_match_structs:      MsrfMatchStruct[],
  score:     number,
  hit_count: number,
  z_ordinal: number         // 0-based index into processed_z_dates__sorted_by_date
                            // assigned in sortAndFilterResults, ophis_model__operations.js:163
}

OperationMatchStruct = {           // ophis_model__operations.js:586
  y_struct: {...},
  operation_result: {
     operation_ordinal: number,    // 0-based index into isoEvent.effective_operations
     z_date_readable_start_no_html: string,
     ... (see 04-operations spec)
  }
}

MsrfMatchStruct = {                // ophis_utils.js:171
  msrf_filter:   number[],
  msrf_number:   number,
  points:        number,
  css_class:     string,
  readable_name: "Normal" | "Important" | "Vortex",
  y_struct:         {...},         // attached at ophis_model__operations.js:597
  operation_result: {...}          // attached at ophis_model__operations.js:598
}
```

### 1.5 The canonical CSV row shape

Emitted by both `newCsvRowForZDate` (`:328-337`) and `newCsvRowForError` (`:28-37`).
**Key order matters** — Papa Parse derives the CSV header from `Object.keys()` of the *first*
row object only.

```ts
CsvRow = {
  IsoEvent:     string,   // isoEvent.name, verbatim (NOT sanitised, NOT trimmed)
  Date:         string,   // z_date_readable_start_no_html  |  "None" on error rows
  Hits:         number,   // hit_count                      |  0 on error rows
  Score:        number,   // score                          |  0 on error rows
  MSRF:         string,   // "37, 19, 11"  descending        |  "None"
  Operations:   string,   // "OP01, OP07, OP12" ascending    |  "None"
  ErrorStatus:  string,   // "None" on success | "NO_RESULTS" | "GENERAL_FAILURE"
  ErrorMessage: string    // "None" on success | plain-text error message
}
```

---

## 2. Constants defined in this file

```js
var OPH_OUTPUT_NONE_KEYWORD                  = "None";              // :2
var OPH_OUTPUT_ERROR_STATUS__SUCCESS         = "None";              // :5  (alias of the above)
var OPH_OUTPUT_ERROR_STATUS__NO_RESULTS      = "NO_RESULTS";        // :6
var OPH_OUTPUT_ERROR_STATUS__GENERAL_FAILURE = "GENERAL_FAILURE";   // :7
```

PDF-local constants (all inside `exportPdf()`):

```js
var TITLE_FONT_SIZE          = 20;                        // :466  (px, inside the HTML)
var BODY_FONT_SIZE           = 14;                        // :467  (px, inside the HTML)
var MARGIN                   = 20;                        // :468  (pt, jsPDF html() margin)
var MARGIN_2                 = 40;                        // :469  MARGIN*2
var TABLE_WIDTH              = NaN;                       // :470  <-- BUG, see G-1
var TAB                      = "&nbsp;&nbsp;&nbsp;";      // :471
var MARGIN_INNER             = 0;                         // :472
var QUALITY                  = 0.95;                      // :508  JPEG quality for the chart
var MAX_DATE_ROWS_PER_PAGE   = 15;                        // :617
var ORDINAL_BACKGROUND_COLOR = "#dddddd";                 // :618
var DARKER_BACKGROUND_COLOR  = "#bbbbbb";                 // :619
var TABLE_PADDING            = 5;                         // :620  (px)
var BORDER                   = "1px solid black";         // :622
var imageSymbolWidth         = 16;                        // :737  (px)
```

Implied by `new jspdf.jsPDF('l','pt')` (format defaults to A4):
`pageWidth ≈ 841.89 pt`, `pageHeight ≈ 595.28 pt`.

---

## 3. Export format catalogue

Exactly **three** interactive formats plus **one** headless format. There is **no PNG export,
no clipboard export, and no JSON export on this screen.** (Clipboard + `.oph` live on the
separate "Export Events" screen — §7.)

| # | Format | Trigger | Entry point | Save mechanism |
|---|---|---|---|---|
| 1 | **PDF** | click `#pdf-export-link` | `exportPdf()` `:465` | `pdfDoc.save(name + '.pdf')` (jsPDF internal Blob + anchor) |
| 2 | **CSV** | click `#csv-export-link` | `exportCsv()` `:391` | `writeStringToFile()` `:280` — Blob + `URL.createObjectURL` + `<a download>` |
| 3 | **XLSX** | click `#excel-export-link` | `exportExcel()` `:413` | `writeXlsxFile(..., {fileName})` → library's bundled `saveAs` |
| 4 | **CSV (headless)** | `?headless=true` at startup | `handleHeadlessOutput()` `:9` | `electronBridge.autoSaveToFile(absPath, string)` |

### 3.1 User flow to reach the interactive exports

1. Screen selector (`<select id="current-screen">`) → choose **"Export Z-Dates"**
   (`getScreenName(OPHIS_SCREEN__EXPORT_Z_DATES)` returns the literal `"Export Z-Dates "`,
   `ophis_view__strings.js:304`; the enum string is `"OPHIS_SCREEN__EXPORT_Z_DATES"`,
   `ophis_view__config.js:125`).
2. `refreshCurrentPage()` dispatches to `renderExportZDates()` (`ophis_view.js:257-258`).
3. Three anchor links are drawn; each click first runs `validateOutputBeforeExport()`.

Note that the Chart.js canvas (`#timeline-chart`) **is visible on this screen** —
`ophis_view__utils.js:44` lists `OPHIS_SCREEN__EXPORT_Z_DATES` among the screens that have
room for the chart. This is what makes the PDF chart snapshot possible.

---

## 4. `renderExportZDates()` — the Export screen (`:185-249`)

### 4.1 DOM produced

Two rows appended to `#output-container` via `addOutputRow()`.

**Header row** (`:186-187`), verbatim:

```html
<td class="col_sub_header_format" style="width:50%;">
  <table style="width:100%;">
    <tr>
      <td style="width:20%;"></td>
      <td style="text-align:center; width:60%;">Export Z-Dates to Various Formats</td>
      <td style="width:20%; text-align:right; padding-right:10px;"></td>
    </tr>
  </table>
</td>
```

**Content row** (`:192-209`), verbatim structure:

```html
<td style='' class='col_format'>
  <div id='about-screen-text' class='col_output_text'>
    <div style='text-align:center;' class='warning_color about_body'>NOTE: The below export options are provided as a Proof of Concept and can be improved depending on use cases.</div>
    <div class='about_body'>
      <a id='pdf-export-link'   class='export_link'>Export PDF for Currently Selected Iso-Event</a><br><br>
      <a id='csv-export-link'   class='export_link'>Export CSV for Currently Selected Iso-Event</a><br><br>
      <a id='excel-export-link' class='export_link'>Export Excel Sheet for Currently Selected Iso-Event</a>
    </div>
  </div>
</td>
```

**Cross-module DOM ids / classes (exact strings):**

| Id / class | Meaning |
|---|---|
| `output-container` | `<table>` the rows are inserted into (`ophis_view__utils.js:326`) |
| `pdf-export-link`, `csv-export-link`, `excel-export-link` | the three action links |
| `about-screen-text` | **id collision** — the About screen also emits this id (`ophis_view.js:589`) and looks it up at `ophis_view.js:745`. Safe only because the container is cleared on screen switch. |
| `timeline-chart` | the Chart.js `<canvas>` snapshotted into the PDF |
| `screen-specific-area` | left untouched by this screen |
| `.export_link` | `cursor:pointer; color:blue; text-decoration:underline;` (`ophis.css:600-604`) |
| `.about_body` | `margin: 10px 10px 10px 20px; font-size:20px;` (`ophis.css:613`) |
| `.warning_color` | `color: darkorange;` (`ophis.css:555`) |
| `.col_format` | `background:white; font-size:20px;` (`ophis.css:560`) |
| `.col_sub_header_format` | `font-size:20px; text-align:center; font-weight:500; background:#DDDDDD; white-space:nowrap; padding:0 5px;` (`ophis.css:525`) |
| `.col_output_text` | `margin-left:5px;` (`ophis.css:724`) |

### 4.2 Click handlers

**PDF** (`:215-236`):

```js
pdfExportLink.addEventListener("click", function() {
    validateOutputBeforeExport(function() {
        function chartExportContinuation() {
            showToast("Generating report, may take a second...");
            setTimeout(function() { exportPdf(); }, 500);
        }
        if ( isChartNotCentered() ) {
            showDialog("The chart is not centered. Would you like to center it first before taking a snapshot?",
                       "NO, use current position",   // = the "no" button
                       "YES, center it",             // = the "yes" button
                       function() { recenterChart(); chartExportContinuation(); },  // onYes
                       function() { chartExportContinuation(); });                  // onNo
        } else {
            chartExportContinuation();
        }
    });
});
```

The 500 ms `setTimeout` exists so the toast paints and (when "YES" was chosen)
`chart.resetZoom("none")` has a frame to redraw the canvas before `toBlob()` samples it.

**CSV** (`:238-242`): `validateOutputBeforeExport(() => exportCsv(getCurrentIsoEvent(), appState.latestResults))`

**XLSX** (`:244-248`): `validateOutputBeforeExport(() => exportExcel())`

### 4.3 `validateOutputBeforeExport(continuation)` (`:251-263`)

```js
if ( appState.latestResults.stale === true ) {
    var preserveScrollPosition = true;
    refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPosition, OPHIS_INPUT_CHANGE__FORCE);
}
if ( appState.latestResults.errors.length > 0 ) {
    showOkDialog("Please fix errors and try again.");
} else {
    continuation();
}
```

Semantics:
* If results are marked stale, force a full recompute (`OPHIS_INPUT_CHANGE__FORCE` bypasses
  the `AUTO_RECALCULATE_Z_DATES` global option, `ophis_controller.js:472`). `refreshXDates` ends
  by calling `refreshCurrentPage()` which re-assigns `appState.latestResults`
  (`ophis_view.js:137`), so the check on the next line sees fresh data.
* **Side effect:** `refreshCurrentPage()` on this screen re-runs `renderExportZDates()`,
  which destroys and rebuilds the three `<a>` elements. The in-flight click closure keeps
  running because everything here is synchronous — but the element the user clicked is
  already detached by the time `continuation()` fires. See **G-4**.
* `showOkDialog` renders a modal with a single button labelled `"OK"`.

---

## 5. CSV export

### 5.1 `newCsvRowForZDate(currentIsoEvent, zDateTags)` (`:293-338`) — the interesting one

```js
let msrfNumbers = [];
if (Array.isArray(zDateTags.msrf_match_structs)) {
    msrfNumbers = zDateTags.msrf_match_structs
      .map(msrf => msrf.msrf_number)
      .filter(num => num !== undefined)
      .sort((a, b) => b - a);            // DESCENDING numeric
}

let operationNumbers = [];
if (Array.isArray(zDateTags.operation_match_structs)) {
    operationNumbers = zDateTags.operation_match_structs
      .map(op => {
          var opResult = op.operation_result || {};
          var opNum = (opResult.operation_ordinal !== undefined) ? opResult.operation_ordinal + 1 : null;
          if ( opNum < 10 ) { opNum = "0" + opNum; }       // zero-pad to 2 digits
          return opNum ? "OP" + opNum : null;
      })
      .filter(op => op !== null)
      .sort((a, b) => {
          var numA = parseInt(a.replace('OP', ''));
          var numB = parseInt(b.replace('OP', ''));
          return numA - numB;                              // ASCENDING numeric
      });
}
```

Then:

```js
return {
    IsoEvent:     currentIsoEvent.name,
    Date:         zDateTags.z_date_readable_start_no_html,
    Hits:         zDateTags.hit_count,
    Score:        zDateTags.score,
    MSRF:         msrfNumbers.join(', ')      || OPH_OUTPUT_NONE_KEYWORD,
    Operations:   operationNumbers.join(', ') || OPH_OUTPUT_NONE_KEYWORD,
    ErrorStatus:  OPH_OUTPUT_ERROR_STATUS__SUCCESS,   // "None"
    ErrorMessage: OPH_OUTPUT_NONE_KEYWORD             // "None"
};
```

Exact behaviours a reimplementation must copy:
* Separator inside `MSRF` / `Operations` is `", "` (comma **plus space**). Papa Parse will
  therefore quote those two fields: `"37, 19"`.
* Operation label format: `"OP"` + 2-digit-zero-padded ordinal for 1–9, un-padded for ≥ 10.
  So `OP01 … OP09, OP10, OP11 …`. Values ≥ 100 are unpadded too (`OP123`).
* **No de-duplication.** A Z-date reached by the same operation from two different X-date
  pairs contributes two identical `OPnn` entries: `"OP03, OP03"`. Same for repeated MSRF
  numbers. This is real observed behaviour, not an oversight in this document.
* `join('')` on an empty array yields `""`, which is falsy, hence the `|| "None"` fallback.
* See **G-5** for the `"OP0null"` bug in the `operation_ordinal === undefined` branch.

### 5.2 `newCsvRowForError(currentIsoEvent, error)` (`:21-38`)

```js
return {
    IsoEvent:     currentIsoEvent.name,
    Date:         "None",
    Hits:         0,          // NUMBER zero, not the string "None"
    Score:        0,          // NUMBER zero
    MSRF:         "None",
    Operations:   "None",
    ErrorStatus:  error.error_status,
    ErrorMessage: error.error_message
};
```

### 5.3 `convertResultsToCsvString(currentIsoEvent, results)` (`:340-375`)

```
IF results.errors.length > 0:
    console.error("Could not run on event: " + currentIsoEvent.name)
    FOR each error k:
        console.error(JSON.stringify(kthError))
        push newCsvRowForError(currentIsoEvent, kthError)
ELSE:
    FOR each key in results.processed_z_dates__sorted_by_date (in order):
        push newCsvRowForZDate(currentIsoEvent, results.z_structs[key])
RETURN Papa.unparse(csvRows)
```

`Papa.unparse` is called with **no config**, so Papa Parse 5.4.1 defaults apply:
* delimiter `","`
* newline `"\r\n"`
* `header: true` (array-of-objects input ⇒ header line emitted from the first row's keys)
* quotes only when the value contains delimiter/quote/newline; `"` escaped by doubling
* **no UTF-8 BOM** — see **G-8**.

Result for a typical file:

```
IsoEvent,Date,Hits,Score,MSRF,Operations,ErrorStatus,ErrorMessage
My Event,07/05/2025,3,2,"37, 19","OP01, OP07, OP12",None,None
```

### 5.4 `exportCsv(currentIsoEvent, results)` (`:391-397`)

```js
var fileName  = getCsvFileNameForExport(currentIsoEvent);   // "<Sanitised_Event_Name>.csv"
var csvString = convertResultsToCsvString(currentIsoEvent, results);
writeStringToFile(csvString, fileName);
```

### 5.5 `writeStringToFile(stringToWrite, fileName)` (`:280-291`) — the browser save path

```js
var blob = new Blob([stringToWrite], { type: 'text/csv;charset=utf-8;' });
var url  = URL.createObjectURL(blob);
var link = document.createElement('a');
link.setAttribute('href', url);
link.setAttribute('download', fileName);
link.style.visibility = 'hidden';
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
URL.revokeObjectURL(url);
```

This is already 100 % browser-native — no Electron involvement. It is the pattern to reuse
for a File System Access API upgrade (`showSaveFilePicker` with a `.csv` accept type).
Note the MIME is hard-coded `text/csv` even when the caller writes a `.oph` JSON blob (§7).

---

## 6. XLSX export

### 6.1 `newExcelRowForDate(zDateTags)` (`:399-411`)

```js
return [
  { type: String, value: zDateTags.z_date_readable_start_no_html },
  { type: Number, value: zDateTags.hit_count },
  { type: Number, value: zDateTags.score }
];
```

`String` / `Number` are the **JS global constructors**, which is exactly write-excel-file's
documented cell-type API. `Date` cells, formulas, and number formats are *not* used anywhere.

### 6.2 `exportExcel()` (`:413-448`)

```js
const headerRow = [
  { value: 'Date',  fontWeight: 'bold' },
  { value: 'Hits',  fontWeight: 'bold' },
  { value: 'Score', fontWeight: 'bold' }
];

var fileName = getFileNameForExport();       // default arg -> getCurrentIsoEvent()
fileName += ".xlsx";

var zDates = appState.latestResults.processed_z_dates__sorted_by_date;

var excelRows = [];
excelRows.push(headerRow);
for ( var i = 0; i < zDates.length; i++ ) {
    excelRows.push(newExcelRowForDate(appState.latestResults.z_structs[zDates[i]]));
}

var columns = null;
writeXlsxFile(excelRows, {
    columns,               // shorthand -> { columns: null }
    fileName: fileName
});
```

**Complete output structure:**

| Property | Value |
|---|---|
| Workbook | one sheet |
| Sheet name | `"Sheet1"` — the library default, because no `sheet` option is passed (`write-excel-file.2.3.2.min.js`: `a\|\|(a=[i\|\|"Sheet1"]…)`) |
| Row 1 | `Date` \| `Hits` \| `Score`, all bold |
| Rows 2..N+1 | text date, numeric hit_count, numeric score |
| Column widths | **none emitted.** `columns: null` is falsy, so the library's `{columnsDescription}` template branch (`if (t\|\|r)`) is skipped and no `<cols>` element is written. Excel uses default width. |
| Fonts | library defaults (Calibri 11). No `fontFamily`/`fontSize` option is passed. |
| Number formats | none. `Hits` and `Score` are plain numbers. |
| Freeze panes / sticky rows | none |
| Formulas | none — all values are pre-computed |
| Filename | `<sanitised event name>.xlsx` |
| Save mechanism | write-excel-file bundles a FileSaver clone: `URL.createObjectURL(blob)` + anchor click, with `setTimeout(revokeObjectURL, 40000)`. Because `fileName` is truthy, the library returns `saveAs(blob, fileName)`; if `fileName` were omitted it would resolve to the Blob instead. |

**The XLSX column set is a strict subset of the CSV column set:** it drops `IsoEvent`,
`MSRF`, `Operations`, `ErrorStatus`, `ErrorMessage`. See **G-9**.

---

## 7. `.oph` / clipboard export (adjacent screen — for boundary clarity)

`renderExportXDates()` in `ophis_view.js:361-436` renders `OPHIS_SCREEN__EXPORT_X_DATES`
("Export Events"). It:

* renders `getSaveBlob(SAVE_BLOB_MODE__JUST_THE_EVENTS, prettify, minify)` into a `<code>`
  block (`ophis_view.js:390`),
* offers a **Copy** button (`.click_to_copy_button`) → `navigator.clipboard.writeText(saveBlob)`
  + `showToast("Copied to clipboard!")` + `markChangesSaved()` (`ophis_view.js:424-427`),
* offers `#export-x-dates-as-oph-file` → `writeStringToFile(saveBlob, "Export.oph")`
  (`ophis_view.js:435`) — **hard-coded filename, not derived from the event name, and
  written with a `text/csv` MIME type.**

This blob contains **input only** — X-dates, event names, lat/long — with zero Z-dates,
scores, or hits. The literal on-screen warning says so (`ophis_view.js:407`).

---

## 8. PDF export — `exportPdf()` (`:465-784`)

This is the largest and most fragile part of the subsystem. It generates a **landscape A4**
PDF whose page composition is:

```
page 1  : title + disclaimer + glossary of terms
page 2  : chart snapshot (JPEG) with a caption, bounded by two horizontal rules
page 3..: paired "Input Dates" / "Output Dates" tables, 15 rows per page
```

### 8.1 Document setup

```js
var currentIsoEvent     = getCurrentIsoEvent();
var currentIsoEventName = currentIsoEvent.name;
var filename            = getFileNameForExport();          // no extension yet

var pdfDoc     = new jspdf.jsPDF('l', 'pt');   // landscape, points, format defaults to A4
var pageWidth  = pdfDoc.internal.pageSize.getWidth();   // ≈ 841.89
var pageHeight = pdfDoc.internal.pageSize.getHeight();  // ≈ 595.28
var currentPage      = 0;
var htmlForDateOutput = [];

pdfDoc.addPage();   // ":485  // for the chart." — page 2 is pre-allocated
```

### 8.2 The `pdfDocConfig` object passed to every `pdfDoc.html()` call (`:496-550`)

```js
var pdfDocConfig = {
    callback: function() { ... },   // see 8.3
    windowWidth: pageWidth,         // virtual viewport width given to html2canvas
    width:       pageWidth,         // target width in pt
    margin:      MARGIN             // 20 pt
    // autoPaging: "text"           // <-- commented out; jsPDF's default (true) applies
};
// pdfDocConfig.y is MUTATED between calls; it starts undefined (jsPDF treats as 0)
```

jsPDF 2.5.2's `html()` default for `autoPaging` is `true`
(`autoPaging=void 0===this.opt.autoPaging||this.opt.autoPaging`), i.e. tall content spills to
new pages automatically. The code drives pagination *manually* by re-invoking `html()` with an
ever-growing `y`.

### 8.3 The state machine in `pdfDocConfig.callback` (`:497-545`)

`html()` invokes `callback` once its render completes. The callback is the pump that drives
the whole document.

```js
callback: function() {
    currentPage++;
    pdfDocConfig.y = currentPage * pageHeight;

    if ( currentPage == 1 ) {
        // ---- capture and place the chart on page 2 ----
        var chartElem   = getChartElem();
        var chartWidth  = chartElem.clientWidth;
        var chartHeight = chartElem.clientHeight;
        var scaling     = pageWidth / chartWidth;
        var QUALITY     = .95;

        function blobCallback(blob) {
            var blobUrl           = URL.createObjectURL(blob);
            var chartHeightScaled = chartHeight * scaling;
            var chartStartY       = pageHeight/2.0 - chartHeightScaled/2.0;

            pdfDoc.setPage(2);
            pdfDoc.addImage(blobUrl, 'JPEG', 0, chartStartY, chartWidth*scaling, chartHeightScaled);
            pdfDoc.line(0, chartStartY,                     pageWidth, chartStartY);
            pdfDoc.line(0, chartStartY + chartHeightScaled, pageWidth, chartStartY + chartHeightScaled);

            var chartTitle = titleHtml("Chart for '" + currentIsoEventName + "'");
            var chartHtml  = PAGE_START_HTML + chartTitle + PAGE_END_HTML;
            pdfDocConfig.y -= MARGIN_2;                    // y = pageHeight - 40
            pdfDoc.html(chartHtml, pdfDocConfig);
        }

        getChartElem().toBlob(blobCallback, "image/jpeg", QUALITY);

    } else if ( currentPage >= 2 ) {
        var pageFlattened = currentPage - 2;
        if ( pageFlattened < htmlForDateOutput.length ) {
            pdfDocConfig.y -= (MARGIN_2*2);                 // -80
            pdfDocConfig.y -= (MARGIN_2*pageFlattened);     // -40 * n
            pdfDocConfig.y += 5;
            pdfDoc.html(htmlForDateOutput[pageFlattened], pdfDocConfig);
        } else {
            pdfDoc.save(filename + '.pdf');
        }
    }
}
```

Resulting `y` values (pt), for the record:

| Render | `currentPage` after `++` | `y` handed to `html()` |
|---|---|---|
| initial call (title page) | — | `undefined` ⇒ 0 |
| chart caption | 1 | `pageHeight − 40` |
| table page 0 | 2 | `2·pageHeight − 75` |
| table page 1 | 3 | `3·pageHeight − 115` |
| table page *n* | *n+2* | `(n+2)·pageHeight − 80 − 40n + 5` |

Those `MARGIN_2` subtractions are empirical fudge factors compensating for jsPDF's own
top-margin insertion on each `html()` render. They are **cumulative in `n`**, which means the
alignment drifts by 40 pt per table page — this is the code as written, not a transcription
error. A rebuild should replace this whole mechanism with per-page `addPage()` + a fresh
`html()` into `y = 0`, or drop `html()` entirely for a native jsPDF table renderer.

### 8.4 Page-wrapper HTML (`:552-557`)

```js
var PAGE_START_HTML = "<table style='width:100%; height:100%;'><tr><td style='padding-right:40px'>"
                    + "<div style='word-spacing:0px; width:100%;font-size:14px;'>";
var PAGE_END_HTML   = "</div></td></tr></table>";
```

(`40` = `MARGIN_2`, `14` = `BODY_FONT_SIZE`.)

`titleHtml(title, useBr = true)` (`:487-494`):

```js
"<div style='text-align:center; font-size:20px; width:100%;'>" + title + "</div>"  + (useBr ? "<br>" : "")
```

### 8.5 Page 1 — title, disclaimer, glossary (`:552-614`)

```js
var currentNativeDate  = getCurrentLocalTime();          // honours headless epoch override
var currentDateAsXDate = nativeDateToXDate(currentNativeDate);   // { date:"MM/DD/YYYY", time:"HH:mm" }

htmlPageOne += titleHtml("Ophis Report for '" + currentIsoEventName + "'", /*useBr=*/false);
htmlPageOne += "<div style='text-align:center; color:grey; font-size:14px; width:100%;'>Generated on "
             + currentDateAsXDate.date + "</div><br>";
```

`nativeDateToXDate` is called **without lat/long**, so the "Generated on" date is the
*operator's local computer* date (`ophis_view__strings.js:186-190`), formatted
`MM/DD/YYYY` with zero padding (`dateComponentsToReadableString`,
`ophis_view__strings.js:231-233`; `DATE_DELIMITER = "/"`).

**Disclaimer paragraph** (`:568-576`), reproduced exactly (`TAB` = three `&nbsp;`):

> `<TAB>`The following Report has been generated using the Ophis Date Sequence Predictive Analytics software, based on Input Dates provided by you. Predicting the future will never be 100% accurate. The content of this report is thus provided for information purposes only. You should not construe any such information or other material generated by this software as legal, investment, financial, or any other type of advice.
>
> `<TAB>`Following is a breakdown of terms to help you interpret the information provided in this Report.

wrapped in `<table style='font-size:14px; width:100%;'><tr><td style='padding-right:0px;'>…</tr></td></table>`
(note the **inverted `</tr></td>` closing tags** at `:576` — malformed HTML that the browser
parser silently repairs).

**Glossary table** (`:586-612`). Container: `<table width='NaN'>` (see **G-1**).
`term(termName, text)` (`:581-583`) emits:

```html
<tr><td style='text-align:right; vertical-align:top;'><b>-</b></td>
    <td style='padding-left:5px;padding-right:0px;'><div><b>{termName}&nbsp;</b>{text}</div></td></tr>
<tr><td>&nbsp;</td></tr>            <!-- TERM_SPACE, :579 -->
```

Six terms, in this order, with these exact names (note the hard `&nbsp;` inside multi-word names):

1. `All&nbsp;Dates` — "in this report are given in the MM/DD/YYYY format."
2. `Input&nbsp;Dates` — "were provided by you and represent a series of significant events, either in your personal life or in the collective. These events must have a similar theme."
3. `Output&nbsp;Dates` — "are generated by the Ophis software, and indicate future dates where either (a) the event related to the Input Dates is likely to reoccur, and/or (b) conditions will be conducive to making it happen again."
4. `Hits` — "are provided for each Output Date, and describe the number of individual Ophis operations and filters that generated the date. This can indicate a higher importance of the date relative to other Output Dates."
5. `Scores` — "are also provided for each Output Date. A Score is similar to the number of Hits, however some Ophis operations and filters are more significant than others. The Score reflects this further breakdown."
6. `Chart Ouput` — **[sic, typo in source at `:608`]** "is provided to give you a visual feel for how the Output Dates ripple into the future. You may notice that some of the individual Output Dates cluster around each other, which strengthens the signal for that time period as a whole, especially when one or more of the clustered dates have a high Score or Hits."

### 8.6 Page 2 — chart image capture

Full mechanism (already quoted in 8.3). Points that matter for a rebuild:

* The source is the **live Chart.js canvas** `#timeline-chart`. **html2canvas is NOT used
  for the chart** — `HTMLCanvasElement.toBlob()` is. html2canvas is only pulled in
  transitively by `pdfDoc.html()` for the text pages.
* Encoding: `"image/jpeg"` at quality `0.95`.
* Scale factor uses **CSS pixel dimensions** (`clientWidth`/`clientHeight`), not the canvas
  backing store (`canvas.width`/`canvas.height`). On a HiDPI display Chart.js sets the backing
  store to `clientWidth * devicePixelRatio`, so the JPEG is higher-resolution than the
  computed placement — which is desirable, and works because `addImage` is given explicit
  target dimensions in pt.
* Placement: full-bleed horizontally (`x = 0`, `w = chartWidth * scaling = pageWidth`),
  vertically centred (`y = pageHeight/2 − h/2`).
* Two full-width hairlines are stroked at the image's top and bottom edges using jsPDF's
  current default line width/colour (never set — jsPDF default `0.200025` line width, black).
* The image is passed to `addImage` as a **`blob:` URL string**. jsPDF handles this: for a
  non-data-URI string it runs `unescape()`, fails base64 decoding, then falls back to
  `loadFile(url, /*sync=*/true)` which performs a **synchronous `XMLHttpRequest`** against the
  blob URL (`jspdf.umd.min.js`, `loadFile=function(t,e,r){…new XMLHttpRequest…n.open("GET",t,!e)…}`).
  It works in Chromium/Electron but is a latent portability hazard; a rebuild should use
  `canvas.toDataURL('image/jpeg', 0.95)` and skip the Blob entirely.
* `URL.revokeObjectURL(blobUrl)` is **never called** — a leaked object URL per export.
* `pdfDoc.setPage(2)` is hard-coded; the chart always lands on the second page.

### 8.7 Pages 3+ — the paired date tables

`tablePageHtml(pageIndex)` (`:632-774`) builds one page; the pages are pre-generated into
`htmlForDateOutput` before the first `html()` call (`:776-780`):

```js
var xDates   = currentIsoEvent.x_dates;                                  // :628 ALL x-dates
var zDates   = appState.latestResults.processed_z_dates__sorted_by_date; // :629
var maxDates = Math.max(xDates.length, zDates.length);                   // :630

var pageCount = maxDates / MAX_DATE_ROWS_PER_PAGE;   // float, NOT ceil'd  :776
for ( var i = 0; i < pageCount; i++ ) { htmlForDateOutput.push(tablePageHtml(i)); }
```

`i < pageCount` with a float behaves as `Math.ceil` for non-multiples and is exact for
multiples, so the page count is correct; `maxDates === 0` yields zero table pages.

**Page layout** (`:763-768`) — three-column outer table, no borders:

```html
<table style='border-collapse:collapse; width:100%;'>
  <td style='vertical-align:top;'>{X-date table}</td>
  <td style='vertical-align:top;'><div style='width:80px;'></div></td>   <!-- spacer -->
  <td style='vertical-align:top;'>{Z-date table}</td>
</tr>
</table>
```

(Again note the missing `<tr>` open tag at `:763-767`; browsers repair it.)

**Visibility gating** (`:637-641`):

```js
var xTableVisible = xDates.length >= pageIndex*MAX_DATE_ROWS_PER_PAGE;
var zTableVisible = zDates.length >= pageIndex*MAX_DATE_ROWS_PER_PAGE;
var xTableVisibility = xTableVisible ? "" : "visibility:hidden;";
var zTableVisibility = zTableVisible ? "" : "visibility:hidden;";
```

Off-by-one — see **G-2**. Note it uses `visibility:hidden`, so the table still occupies
layout space; that is intentional (it keeps the two columns aligned across pages).

**Titles** (`:647-656`): `"Input Dates"` / `"Output Dates"`, each with `" (continued)"`
appended when `pageIndex >= 1` **and** that table is visible.

**X-date table** — 2 columns:

| col | header | content |
|---|---|---|
| 1 | `Chart Label` | ordinal badge, `indexIntoArray + 1` |
| 2 | `MM/DD/YYYY` | `xDates[indexIntoArray].date` (raw string from the model) |

Title row spans `colspan=2`, background `#bbbbbb`; header row background `#dddddd`;
all cells `padding:5px; text-align:center;` and `1px solid black` borders assembled
edge-by-edge.

**Z-date table** — 4 columns:

| col | header | content |
|---|---|---|
| 1 | `Chart Label` | ordinal badge, `zDateTags.z_ordinal + 1` |
| 2 | `MM/DD/YYYY` | `zDateTags.z_date_readable_start` — **the HTML-bearing variant** |
| 3 | `Hits` | 2-cell inner table: hit-symbol `<img>` (16×16 px) then the numeric `hit_count` |
| 4 | `Score` | `zDateTags.score` |

Title row `colspan=4`, background `#bbbbbb`; header row `#dddddd`.

**Ordinal badge** — `ordinalHtml(ordinal, backgroundColor, fontColor, isFirst, isLast)`
(`:679-687`):

```html
<tr><td style='{borderBottom}border-left:1px solid black;padding:5px;{labelBorder}'>
  <table style='border: 1px solid black; border-radius: 2px;background-color:{bg};'>
    <tr><td style='color:{fg};padding-bottom:2px;padding-left:2px;padding-right:2px;'>{ordinal}</td></tr>
  </table>
</td>
```

* X-date badges: `backgroundColor="white"`, `fontColor="black"` (`:718`)
* Z-date badges: `backgroundColor="grey"`, `fontColor="white"` (`:750`)
* `borderBottom` added only when `isLast`; `border-top` added when **not** `isFirst`.
* **The function returns an unclosed `<tr>`** — the caller appends the remaining `<td>`s and
  the `</tr>`. Deliberate but brittle.

**Hit symbol** (`:735-740`):

```js
var hitCountSymbolSrc = getHitCountSymbolImage(hitCount, /*srcOnly=*/true);
var hitCountVisibility = hitCount > 1 ? "" : "visibility:hidden;";
var imageSymbolWidth = 16;
var hitCountImgStyle = "style='"+hitCountVisibility+"position:relative;top:3.5px; width:16px;height:16px;' src='"+hitCountSymbolSrc+"'";
var hitCountSymbolImg = "<img "+hitCountImgStyle+" />&nbsp;";
```

`getHitCountSymbolImage` (`ophis_view__utils.js:238-253`) maps:

| hit_count | src |
|---|---|
| 1 (or 0, or anything unmatched) | `TRANSPARENT_PIXEL_DATA_URI` = `"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"` (`ophis_view__config.js:2`) |
| 2 | `"img/hit_symbols/gemini.png"` |
| 3 | `"img/hit_symbols/triangle.png"` |
| 4 | `"img/hit_symbols/diamond.png"` |
| ≥ 5 | `"img/hit_symbols/circle.png"` |

Paths are **document-relative**, so html2canvas resolves them against the page's base URL.

**Row loop** (`:689-758`):

```js
var limit = Math.min(MAX_DATE_ROWS_PER_PAGE, maxDates);     // NOTE: global maxDates, see G-3
for ( var i = 0; i < limit; i++ ) {
    var indexIntoArray = pageIndex*MAX_DATE_ROWS_PER_PAGE + i;
    var ithXDate       = indexIntoArray < xDates.length ? xDates[indexIntoArray] : null;
    var isFirstRow     = (i == 0);
    ...
    if ( ithXDate ) {
        var xOrdinal    = indexIntoArray + 1;
        var isLastXDate = indexIntoArray == xDates.length-1 || i == limit-1;
        ... emit X row ...
    }
    var ithZDateDictKey = indexIntoArray < zDates.length ? zDates[indexIntoArray] : null;
    if ( ithZDateDictKey ) {
        var ithZDateTags = appState.latestResults.z_structs[ithZDateDictKey];
        var zOrdinal     = ithZDateTags.z_ordinal + 1;
        var isFinalZDate = indexIntoArray == zDates.length-1 || i == limit-1;
        ... emit Z row ...
    }
}
```

**Dead locals inside this function** (compute nothing that reaches output):

* `var zDateLabel = Z_DATE_SHORTHAND + (i+1);` (`:730`) — never referenced. The badge actually
  prints `z_ordinal + 1`, not `"Z" + (i+1)`.
* `var finalZTableCellStyle = tableCellStyle; finalZTableCellStyle += isFinalZDate ? border : "";` (`:743-744`) — never referenced.
* Consequently `tableCellStyle` (`:623`) and `var border` (`:696-700`) are dead.
* `ordinalTableCellStyle = "text-align:center;"` (`:624`) — never referenced anywhere.
* `var htmlPageOne = ""` is declared at `:552` *and* the `MARGIN_INNER`/`TABLE_WIDTH`
  constants at `:470`/`:472` are only used on page 1.

---

## 9. Filename generation

### 9.1 `getFileNameForExport(currentIsoEvent = getCurrentIsoEvent())` (`:450-463`)

```js
var fileName = currentIsoEvent.name.replaceAll(" ", "_");
var fileName_sanitized = sanitizeFileName(fileName);
if ( fileName != fileName_sanitized ) {
    console.warn("Original fileName='"+fileName+"' had to be changed to '"+fileName_sanitized+"'.");
    return fileName_sanitized;
}
return fileName;
```

`sanitizeFileName` (`ophis_utils.js:819-831`):

```js
var sanitized = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');   // everything else -> "_"
var trimmed   = sanitized.replace(/^[. ]+|[. ]+$/g, '');     // strip leading/trailing dots+spaces
var truncated = trimmed.substring(0, 255);
return truncated;
```

Pipeline: `" "` → `"_"`, then any char outside `[A-Za-z0-9_.-]` → `"_"`, then strip
leading/trailing `.`/space, then truncate to 255 chars.
(The trailing-space strip is a no-op because `replaceAll(" ","_")` already ran.)

Extensions are appended by the callers:
* `getCsvFileNameForExport(evt)` (`:384-389`) → `name + ".csv"`
* `exportExcel()` (`:427`) → `name + ".xlsx"`
* `exportPdf()` (`:542`) → `pdfDoc.save(name + '.pdf')`

Edge case: an event named `"..."` sanitises to `""`, producing files literally named
`.csv` / `.xlsx` / `.pdf`.

### 9.2 `getFileNameFromPath(filePath)` (`:377-382`)

```js
const parts = filePath.split(/[/\\]/);
return parts.pop();
```

Handles both `/` and `\` separators. Used only in the headless paths.

---

## 10. Headless / CLI CSV output (Electron-only)

Invoked from `initAppStateFinalization()` (`ophis_main.js:266-271`):

```js
if ( isRunningHeadless() ) { handleHeadlessOutput(); } else { ...normal UI init... }
```

### 10.1 Query-parameter contract (parsed in `ophis_main.js:57-77`)

The Electron main process launches the renderer with these query params on the page URL:

| Param | Reader | Default | Notes |
|---|---|---|---|
| `headless` | `getQueryParamBool` | `false` | parsed first so logging can be re-piped |
| `headless_output_path` | `getQueryParamString` | `""` | a **directory** |
| `headless_output_type` | `getHeadlessOutputTypeFromQueryParams()` **(this file, `:174`)** | `"csv"` | **result is never read** — dead |
| `input_validation_mode` | `getInputValidationModeFromQueryParams()` **(this file, `:146`)** | see below | `loose` / `original` / `strict` |
| `headless_multiple_files` | `getQueryParamBool` | `false` | |
| `headless_current_epoch_millis` | `getQueryParamInt` | `Number.MIN_SAFE_INTEGER` | overrides "now" for reproducible runs |

`getQueryParam` (`ophis_utils.js:855-871`) returns the default when `window.location.search`
is empty **or** when the param is present-but-empty-string (because `if (queryParamValue)`).

### 10.2 `getHeadlessOutputTypeFromQueryParams()` (`:174-183`)

```js
var headlessOutputTypeRaw = getQueryParamString("headless_output_type", "csv");
if ( toLowerCase(headlessOutputTypeRaw) == "csv" ) return OPH_HEADLESS_OUTPUT_TYPE__CSV;
console.warn("Unsupported output type " + headlessOutputTypeRaw + " so assuming " + OPH_HEADLESS_OUTPUT_TYPE__DEFAULT);
return OPH_HEADLESS_OUTPUT_TYPE__DEFAULT;
```

Both branches return the identical value (`__DEFAULT === __CSV`, `ophis_config.js:27`), and
nothing ever reads `appState.headless_output_type`. Pure scaffolding for a future format.

### 10.3 `getInputValidationModeFromQueryParams()` (`:146-172`)

Not an export function; documented because it lives here.

```
raw = getQueryParamString("input_validation_mode", "")
IF raw is truthy:
    lowercase(raw) == "loose"    -> FILE_INPUT_VALIDATION_MODE__LOOSE
    lowercase(raw) == "original" -> FILE_INPUT_VALIDATION_MODE__ORIGINAL
    lowercase(raw) == "strict"   -> FILE_INPUT_VALIDATION_MODE__STRICT
    else -> console.warn("Unrecognized input validation mode, defaulting to: " + STRICT); -> STRICT
ELSE:
    isRunningHeadless() ? STRICT : LOOSE
```

Headless defaults to STRICT; interactive defaults to LOOSE.

### 10.4 `handleHeadlessOutput()` (`:9-19`)

```js
if ( appState.isoEvents.length > 0 ) {
    if ( appState.headless_multiple_files === true ) exportHeadlessMultipleCsvs();
    else                                            exportHeadlessSingleCsv();
} else {
    exitHeadlessWithError("No Iso Events found.");
}
```

`exitHeadlessWithError(msg)` (`ophis_main.js:295-301`) does `console.error(msg)` then, if
running in Electron, `electronBridge.closeAppWithHeadlessError()`.

### 10.5 `exportHeadlessSingleCsv()` (`:40-101`)

One CSV containing **every** iso-event, concatenated.

```
csvRows = []
FOR each isoEvent i in appState.isoEvents:
    results = runOphisOnEventForExport(isoEvent)          // ophis_model__operations.js:59
    IF results.errors.length > 0:
        console.error("Could not run on event: " + isoEvent.name)
        FOR each error: console.error(JSON.stringify(err)); csvRows.push(newCsvRowForError(...))
    ELSE:
        FOR each key in results.processed_z_dates__sorted_by_date:
            csvRows.push(newCsvRowForZDate(isoEvent, results.z_structs[key]))

IF csvRows.length >= 1:
    IF appState.headless_output_path:
        baseFileName = getFileNameFromPath(appState.filePathFromMainArgs).replace(".oph", ".csv")
        fileName     = appState.headless_output_path + "/" + baseFileName
    ELSE:
        fileName     = appState.filePathFromMainArgs.replace(".oph", ".csv")
    console.log("Outputting CSV to " + fileName)
    csvString = Papa.unparse(csvRows)
    electronBridge.autoSaveToFile(fileName, csvString)
    electronBridge.closeAppWithHeadlessSuccess()
ELSE:
    exitHeadlessWithError("Could not produce any CSV output. See above errors.")
```

Because rows from every event share the same key set, the CSV header is stable regardless of
which event happens to be first.

### 10.6 `exportHeadlessMultipleCsvs()` (`:103-144`)

One CSV per iso-event, all inside a directory named after the `.oph` file.

```
numberOfCsvsCreated = 0
FOR each isoEvent i:
    results   = runOphisOnEventForExport(isoEvent)
    eventPart = getCsvFileNameForExport(isoEvent)          // "<Sanitised_Name>.csv"

    IF appState.headless_output_path:
        base     = getFileNameFromPath(appState.filePathFromMainArgs).replace(".oph", "")
        fileName = appState.headless_output_path + "/" + base + "/" + eventPart
    ELSE:
        fileName = appState.filePathFromMainArgs.replace(".oph", "") + "/" + eventPart

    console.log("Outputting CSV to " + fileName)
    csvString = convertResultsToCsvString(isoEvent, results)
    electronBridge.autoSaveToFile(fileName, csvString)
    numberOfCsvsCreated++                                  // unconditional -- see G-13

IF numberOfCsvsCreated >= 1:
    IF numberOfCsvsCreated < appState.isoEvents.length:
        console.warn("Could not produce all CSVs. See above errors. " + numberOfCsvsCreated)
    electronBridge.closeAppWithHeadlessSuccess()
ELSE:
    exitHeadlessWithError("Could not produce any CSV files. See above errors.")
```

Path separators are hard-coded `/` even on Windows (Node normalises them).
The nested directory is assumed to be created by `electronBridge.autoSaveToFile`.

### 10.7 What `runOphisOnEventForExport` adds over `runOphisOnEvent` (`ophis_model__operations.js:59-80`)

```js
var results = runOphisOnEvent(isoEvent);
if ( results.errors.length > 0 ) {
    for each error k:
        if ( isObjectString(kthError) )                   // it's a raw string
             results.errors[k] = newOphErrorObject(OPH_OUTPUT_ERROR_STATUS__GENERAL_FAILURE, kthError);
        else results.errors[k].error_message = convertHtmlToPlainText(results.errors[k].error_message);
} else if ( results.processed_z_dates__sorted_by_date.length == 0 ) {
    results.errors.push(newOphErrorObject(OPH_OUTPUT_ERROR_STATUS__NO_RESULTS,
                        NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT, /*convert=*/false));
}
```

`NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT` = `"No results. You probably have to loosen up a filter."`
(`ophis_view__config.js:12`).

**Crucially, the interactive UI exporters never call this function** — they read
`appState.latestResults`, which came from plain `runOphisOnEvent`. See **G-10**.

---

## 11. Electron surface and browser substitutes

| Electron call | Where | Purpose | Browser substitute |
|---|---|---|---|
| `electronBridge.autoSaveToFile(absPath, string)` | `:95`, `:129` | write a UTF-8 file at an absolute path, creating parent dirs | For a browser rebuild the headless mode has no analogue. Closest: File System Access API `showDirectoryPicker()` + `getFileHandle(name,{create:true})`, or zip the multi-file output with a client-side zipper and hand back one download. |
| `electronBridge.closeAppWithHeadlessSuccess()` | `:97`, `:140` | exit code 0 | n/a — post a `postMessage`/resolve a promise instead |
| `electronBridge.closeAppWithHeadlessError()` | via `exitHeadlessWithError`, `ophis_main.js:299` | exit code ≠ 0 | n/a |
| `appState.filePathFromMainArgs` | `:84`, `:88`, `:116`, `:120` | absolute path of the opened `.oph` file, from Electron argv | browsers have no path; a rebuild must carry only a *name* (from `File.name`) and derive output names from it |

**Everything in the interactive path is already browser-native.** No `fs`, no `dialog`, no
`shell` in `exportPdf` / `exportCsv` / `exportExcel`:

* CSV → `writeStringToFile` (`:280`) = `Blob` + `URL.createObjectURL` + `<a download>` + `revokeObjectURL`.
* XLSX → write-excel-file's bundled FileSaver clone (`createObjectURL` + anchor, revoked after 40 s).
* PDF → `jsPDF.save(name)`, which internally builds a Blob and triggers the same anchor download.

Recommended upgrade for the rebuild: a single `saveBytes(nameHint, mimeType, bytes)` helper
that prefers `window.showSaveFilePicker({suggestedName, types})` and falls back to the anchor
technique. For XLSX, call `writeXlsxFile(rows, {columns})` **without** `fileName` so the library
resolves to a `Blob` you route through your own saver.

---

## 12. Data included vs excluded, and filter/sort fidelity

| Aspect | PDF | CSV | XLSX | Headless CSV |
|---|---|---|---|---|
| Source array | `processed_z_dates__sorted_by_date` | same | same | same |
| **Filters honoured?** | **Yes** | Yes | Yes | Yes — `filterZDates()` already applied inside `sortAndFilterResults` (`ophis_model__operations.js:155`) |
| **User's on-screen sort honoured?** | **No** | **No** | **No** | **No** — everything uses the always-date-ascending array. `isoEvent.z_date_sort_type` drives only `processed_z_dates`, which no exporter touches. |
| Iso-events covered | current only | current only | current only | **all** events |
| X-dates (input) | **yes**, all of them incl. `enabled:false` | no | no | no |
| Date column | `z_date_readable_start` (may carry a `<span class='has_clock_font'>` for HH:MM scope) | `z_date_readable_start_no_html` | `z_date_readable_start_no_html` | `..._no_html` |
| Hits | yes, with symbol image | yes | yes | yes |
| Score | yes | yes | yes | yes |
| MSRF numbers | **no** | yes (`"37, 19"`, descending) | **no** | yes |
| Operation ids | **no** | yes (`"OP01, OP07"`, ascending) | **no** | yes |
| Iso-event name | in titles only | `IsoEvent` column | **no** | `IsoEvent` column |
| Error rows | n/a (blocked upstream) | yes | **no** | yes |
| Eclipse / moon annotations | **no** | **no** | **no** | **no** |
| Chart image | yes (page 2) | no | no | no |
| Y-values / operation equations | **no** | **no** | **no** | **no** |

Nothing about eclipses, moon phases, per-operation equation strings, `y_struct` values,
lat/long, or the scoring system breakdown reaches *any* export. The export surface is far
narrower than the on-screen Z-Dates table.

---

## 13. GOTCHAS

**G-1 — `TABLE_WIDTH` is `NaN` (hoisting bug).**
`var TABLE_WIDTH = pageWidth - MARGIN;` at `:470` runs **before** `var pageWidth = …` at `:480`.
`var` hoisting makes `pageWidth` `undefined` at that point, so `TABLE_WIDTH === NaN` and the
glossary table is emitted as `<table width='NaN'>` (`:586`). Browsers ignore the invalid
attribute and auto-size the table, so the visible damage is cosmetic — but a reimplementation
that "fixes" this by using the real page width will change the page-1 layout.

**G-2 — `xTableVisible` / `zTableVisible` off-by-one.**
`xDates.length >= pageIndex*MAX_DATE_ROWS_PER_PAGE` (`:637-638`). With exactly 15 X-dates and
16 Z-dates, page 1 evaluates `15 >= 15` → true, so a header-only "Input Dates (continued)"
table is rendered with zero rows. The correct predicate is `> pageIndex*15`.

**G-3 — `limit` uses the global `maxDates`, not the per-page remainder.**
`var limit = Math.min(MAX_DATE_ROWS_PER_PAGE, maxDates)` (`:689`). On the final page the loop
still iterates up to 15 times; the `indexIntoArray < length` guards keep it correct, but
`isLastXDate`/`isFinalZDate` fold in `i == limit-1`, so on a short final page the bottom border
can be drawn on a row that isn't actually the last emitted row when one table is longer than
the other.

**G-4 — `validateOutputBeforeExport` can rebuild the DOM out from under the click handler.**
When `latestResults.stale === true`, it calls `refreshXDates(REFRESH_TYPE__SOFT, …)` →
`refreshCurrentPage()` → `renderExportZDates()`, which clears `#output-container` and creates
brand-new `<a>` elements. The clicked element is detached before `continuation()` runs.
Harmless today (all synchronous, no post-click DOM access), but it will bite anyone who adds
a spinner or disables the link during export.

**G-5 — `"OP0null"` in `newCsvRowForZDate`.**
`:313-317`:
```js
var opNum = (opResult.operation_ordinal !== undefined) ? opResult.operation_ordinal + 1 : null;
if ( opNum < 10 ) { opNum = "0" + opNum; }
return opNum ? "OP" + opNum : null;
```
When `operation_ordinal` is `undefined`, `opNum` is `null`; `null < 10` coerces to `0 < 10`
→ **true**, so `opNum = "0" + null = "0null"`, which is truthy, so the function returns
`"OP0null"` and the `.filter(op => op !== null)` never removes it. It then sorts to the front
(`parseInt("0null") === 0`). The intended `null` guard is dead. A faithful rebuild should
reproduce or explicitly fix this — do not silently assume `null` is filtered out.

**G-6 — MSRF and Operation lists are not de-duplicated.**
A Z-date hit by the same operation via two X-date pairs yields `"OP03, OP03"`; the same MSRF
number matched twice yields `"37, 37"`. `hit_count` counts those duplicates too.

**G-7 — MSRF sorts *descending*, Operations sort *ascending*.**
`(a,b) => b - a` at `:303` vs `numA - numB` at `:324`. Easy to get backwards.

**G-8 — CSV has no UTF-8 BOM.**
`writeStringToFile` sets `type: 'text/csv;charset=utf-8;'` but writes no `\uFEFF`. Excel on
Windows will mis-decode non-ASCII event names. Headless CSV goes through
`electronBridge.autoSaveToFile` with no encoding hint at all.

**G-9 — The three formats disagree about what an export *is*.**
CSV = 8 columns including MSRF/Operations/error plumbing. XLSX = 3 columns, no event name,
no error rows. PDF = X-dates + Z-dates + chart, no MSRF, no operations. There is no shared
"report model"; each exporter re-derives its own. The screen's own banner admits this:
*"NOTE: The below export options are provided as a Proof of Concept…"* (`:194`).

**G-10 — The UI exporters bypass `runOphisOnEventForExport`, so `NO_RESULTS` never surfaces.**
`validateOutputBeforeExport` only checks `errors.length`. Plain `runOphisOnEvent` does **not**
push a `NO_RESULTS` error for an empty Z-date set. Therefore, with zero Z-dates:
* CSV → `Papa.unparse([])` returns `""` → a **completely empty file** is downloaded.
* XLSX → a workbook containing only the bold header row.
* PDF → generated normally, with an empty (but visible) "Output Dates" table.
Only the headless path produces the explanatory `NO_RESULTS` row.

**G-11 — Exports always ignore the user's chosen Z-date sort.**
See §12. If the user sorted the on-screen table by Score, the CSV/XLSX/PDF still come out in
date order. Whether this is a bug or a deliberate "reports are chronological" choice is not
stated anywhere in the source.

**G-12 — The PDF lists disabled X-dates.**
`:628` reads `currentIsoEvent.x_dates` directly, with no `enabled === true` filter (compare
`getEffectiveXDateCount`, `ophis_model__operations.js:2-15`, and the chart's own loop at
`ophis_view__chart_datasets.js:1398-1413`, which *does* filter). Ordinals still come from the
raw array index (`indexIntoArray+1` here, `i+1` in the chart), so enabled dates keep matching
ordinals — but the PDF additionally prints disabled dates whose "Chart Label" corresponds to
nothing on the chart.

**G-13 — Two unreachable error paths in the headless code.**
`numberOfCsvsCreated++` at `:131` is unconditional, so it always equals
`appState.isoEvents.length`; the `console.warn("Could not produce all CSVs…")` branch (`:136-138`)
and the `exitHeadlessWithError("Could not produce any CSV files…")` branch (`:141-143`) can never
fire (`handleHeadlessOutput` already guarded `isoEvents.length > 0`). Similarly, in the single-CSV
path, `runOphisOnEventForExport` guarantees at least one row per event, so `csvRows.length >= 1`
at `:78` is always true and `:99` is dead.

**G-14 — `appState.headless_output_type` is parsed and never used.** `handleHeadlessOutput`
branches only on `headless_multiple_files`. Adding a second headless format requires wiring it
in, not just extending `getHeadlessOutputTypeFromQueryParams`.

**G-15 — `.replace(".oph", …)` replaces only the FIRST occurrence and does not require a suffix.**
`:85`, `:88`, `:117`, `:121`. If `filePathFromMainArgs` has no `.oph` extension, no substitution
happens: in single-file mode the CSV path equals the source path and **overwrites the input
file**; in multi-file mode the "directory" path equals the source file path. Also
`/home/user.ophir/data.oph` mangles the directory rather than the extension. Use a proper
extension-stripping routine in the rebuild.

**G-16 — The chart JPEG can come out with a black background.**
`canvas.toBlob(cb, "image/jpeg", .95)` flattens alpha to **black**, not white. If the Chart.js
canvas has a transparent background (no `backgroundColor` plugin), the PDF chart page will be
a dark rectangle. There is no `fillRect` pre-pass anywhere in this file.

**G-17 — No null/failure guards in the chart capture.**
`toBlob` calls back with `null` on encode failure; `URL.createObjectURL(null)` then throws
inside the callback, the promise chain never continues, and `pdfDoc.save()` is never reached —
the export silently hangs after the "Generating report…" toast. Likewise `getChartElem()` is
called twice (`:503` and `:526`) with no existence check, and `isChartNotCentered()` (`:225`)
dereferences `appState.chart` with no null guard (the chart is created lazily at
`ophis_view__chart.js:746`).

**G-18 — The "hide chart" event option is not honoured by the PDF.**
`shouldHideChart(currentIsoEvent)` (`ophis_view__chart.js:720`) can suppress the chart in the UI
and show a "Chart Hidden" overlay, but `exportPdf` unconditionally allocates page 2 and
snapshots the canvas anyway.

**G-19 — The chart-centering dialog is dismissible, and dismissal aborts the export silently.**
`showDialog(..., cancelable = true)` (`ophis_view__utils.js:461`) wires a click on the backdrop to
`hideDialog` **without** invoking `onYes` or `onNo`. Clicking outside the dialog therefore cancels
the PDF export with no message and no toast.

**G-20 — `URL.revokeObjectURL` is never called for the chart blob** (`:510`). One leaked object
URL (holding the whole JPEG in memory) per PDF export.

**G-21 — Malformed HTML in the generated PDF markup.**
`</tr></td>` inverted at `:576`; `<table>` opened at `:763` with `<td>` children but no `<tr>`
open tag (a stray `</tr>` at `:767`); `ordinalHtml` returns an unclosed `<tr>` (`:684-686`).
html2canvas relies on the browser's error-recovery parser, so this happens to render — but any
rebuild that sanitises or templates this HTML strictly (e.g. through a virtual DOM or DOMPurify)
will produce a different layout.

**G-22 — `id='about-screen-text'` is duplicated across two screens** (`:192` here and
`ophis_view.js:589`). `ophis_view.js:745` does a global `getElementById` on it. Safe only because
the output container is cleared on screen change.

**G-23 — jsPDF-AutoTable is loaded but never used.** Do not carry it into the rebuild; it adds
~99 KB for nothing. Conversely, **html2canvas is mandatory** even though no first-party line
references it.

**G-24 — Cumulative `y` drift in the PDF pump.** `pdfDocConfig.y -= (MARGIN_2*pageFlattened)`
(`:533`) shifts each successive table page 40 pt further up relative to the previous one. With
many table pages the content will progressively creep. Treat the entire `y` arithmetic block
(`:499-534`) as tuned magic, not as a formula to generalise.

---

## 14. Minimal reimplementation checklist

1. Build a shared `ReportModel` from `{ isoEvent, results }` containing, per Z-date:
   `dateText`, `dateHtml`, `hits`, `score`, `msrfNumbers[]`, `operationIds[]`, `ordinal`.
   Derive all four exporters from it so §13/G-9 stops being true.
2. Keep the exact CSV column order and the `"None"` sentinel, so downstream `.csv` consumers
   of v12 output keep working. Decide explicitly whether to reproduce the `"OP0null"` bug (G-5).
3. Replace the jsPDF `html()` pump with either
   (a) `autoTable` (already vendored) driven from `ReportModel`, or
   (b) explicit `addPage()` + `html()` at `y = 0` per page.
   Either removes G-1, G-2, G-3, G-24 at once.
4. Chart capture: `canvas.toDataURL('image/jpeg', 0.95)` after compositing onto a
   white-filled offscreen canvas. Removes G-16, G-17, G-20 and the synchronous-XHR
   dependency in jsPDF's `addImage`.
5. Route all three saves through one `saveBytes()` helper (File System Access API with an
   anchor-download fallback) and prepend a UTF-8 BOM to CSV.
6. Keep `sanitizeFileName` semantics verbatim; add a guard for the empty-name case.
7. Drop `jspdf.plugin.autotable.js` **only if** you do not adopt option 3(a); keep
   `html2canvas.min.js` for as long as `pdfDoc.html()` is used.
