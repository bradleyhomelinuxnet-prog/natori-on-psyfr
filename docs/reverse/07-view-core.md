# 07 — VIEW LAYER CORE

Implementation-grade specification of the Ophis v12 ("PSYFR"/"CYPHR") view-layer core.

**Files covered (read 100%, line-by-line):**

| File | Lines | Role |
|---|---|---|
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/src/ophis_view.js` | 798 | Screen router + 5 screen renderers + skin/title + global-option checkbox plumbing |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/src/ophis_view__config.js` | 302 | View-level constants, screen enum, flatpickr configs, master-checkbox registry |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/src/ophis_view__utils.js` | 957 | Generic DOM/render/dialog/toast/map/date-input helpers |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/src/ophis_view__strings.js` | 317 | Copy deck + small HTML/format string generators |

**Not covered here (named as dependencies only, never guessed at):**
`ophis_view__rebuild.js` (left/top panel construction, `setPanelMaxDimensions`, `setOverflowOnScrollContainers`, `refreshMasterCheckboxBasedOnChildChange`, `focusOphisInput`), `ophis_view__output.js` (Z-Dates + Debug rendering, `enableStandardButton`/`disableStandardButton`), `ophis_view__settings.js` (Operations + Event-Data-Transfer screens, `ISO_EVENT_SETTINGS`, `ISO_EVENT_DATA_TRANSFERS`), `ophis_view__export.js` (Export Z-Dates screen, `writeStringToFile`), `ophis_view__chart*.js`, `ophis_controller.js`, `ophis_model__*.js`, `ophis_utils.js`, `ophis_dependencies.js` (tipsy tooltips, timezone lookup, flatpickr string parsing), `ophis_main.js` (`appState`, boot, event wiring).

> **CRITICAL STRUCTURAL FACT:** the static HTML shell (the `index.html` / entry document that declares `#panel-container`, `#current-screen`, `#output-container`, etc.) **is not present in this repository**. Only `dist/PSYFR1.html` / `dist/PSYFR2.html` (unrelated derived artefacts) and `src/*.js` + `src/ophis.css` ship. The DOM contract in §2 is therefore reconstructed from every `getElementById` / `getElementsByClassName` / class literal in the JS, plus `src/ophis.css`. Any id in §2 marked **[STATIC]** must exist in the shell before the JS runs, or the code throws.

---

## 1. SCREEN INVENTORY

### 1.1 The screen enum

Screens are plain string constants whose value equals their variable name (`ophis_view__config.js:120-128`):

```js
var OPHIS_SCREEN__ABOUT          = "OPHIS_SCREEN__ABOUT";
var OPHIS_SCREEN__Z_DATES        = "OPHIS_SCREEN__Z_DATES";
var OPHIS_SCREEN__OPERATIONS     = "OPHIS_SCREEN__OPERATIONS";
var OPHIS_SCREEN__DEBUG          = "OPHIS_SCREEN__DEBUG";
var OPHIS_SCREEN__EXPORT_X_DATES = "OPHIS_SCREEN__EXPORT_X_DATES";
var OPHIS_SCREEN__EXPORT_Z_DATES = "OPHIS_SCREEN__EXPORT_Z_DATES";
var OPHIS_SCREEN__IMPORT_X_DATES = "OPHIS_SCREEN__IMPORT_X_DATES";
var OPHIS_SCREEN__EVENT_SETTINGS = "OPHIS_SCREEN__EVENT_SETTINGS";
var OPHIS_SCREEN__EVENT_SWAP     = "OPHIS_SCREEN__EVENT_SWAP";
```

These exact strings are also the `value` attributes of the `<option>`s in `#current-screen` and the persisted value of the `start_screen` global option — they cross module boundaries verbatim. Do not rename them without also migrating `.oph` files.

### 1.2 The navigable list

`ophis_view__config.js:132-142`:

```js
var OPHIS_SCREENS = [
    OPHIS_SCREEN__ABOUT,
    OPHIS_SCREEN__Z_DATES,
    OPHIS_SCREEN__OPERATIONS,
    // OPHIS_SCREEN__DEBUG,            <-- commented out; Debug is UNREACHABLE from the UI
    OPHIS_SCREEN__IMPORT_X_DATES,
    OPHIS_SCREEN__EXPORT_X_DATES,
    OPHIS_SCREEN__EXPORT_Z_DATES,
    OPHIS_SCREEN__EVENT_SETTINGS,
    OPHIS_SCREEN__EVENT_SWAP,
];
```

`var DEFAULT_STARTING_SCREEN = OPHIS_SCREEN__Z_DATES;` (`ophis_view__config.js:130`).

### 1.3 Screen table

| Enum | Dropdown label (`getScreenName`, `ophis_view__strings.js:291-317`) | Renderer | Renderer lives in | Purpose |
|---|---|---|---|---|
| `OPHIS_SCREEN__ABOUT` | `"About "` | `renderAbout(results)` | **`ophis_view.js:574-748`** | Static explainer: implementation details, security claims, scoring system, full MSRF number list. |
| `OPHIS_SCREEN__Z_DATES` | `"Z-Dates "` | `setUpCondensedOutputOptionsControls(results)` then `renderCondensedOutputElseErrors(results)` | `ophis_view__output.js` (dependency) | Main output: projected Z-Dates, scores, hits. |
| `OPHIS_SCREEN__OPERATIONS` | `"Operations "` | `renderOperations()` / `refreshOperationRows()` | `ophis_view__settings.js` (dependency) | Edit the operation equation table. |
| `OPHIS_SCREEN__DEBUG` | `"Debug "` | `renderDebugOutput(results)` or `renderErrors(results.errors)` | `ophis_view__output.js` / **`ophis_view.js:345-359`** | Auditability dump. **Not in `OPHIS_SCREENS`, so unreachable.** |
| `OPHIS_SCREEN__IMPORT_X_DATES` | `"Import Events "` | `renderImport()` | **`ophis_view.js:477-527`** | Paste-a-blob importer for Iso-Events. |
| `OPHIS_SCREEN__EXPORT_X_DATES` | `"Export Events "` | `renderExportXDates()` | **`ophis_view.js:361-437`** | Show/copy/export the input-only save blob. |
| `OPHIS_SCREEN__EXPORT_Z_DATES` | `"Export Z-Dates "` | `renderExportZDates()` | `ophis_view__export.js` (dependency) | Export computed output. |
| `OPHIS_SCREEN__EVENT_SETTINGS` | `"Event Settings "` | `renderEventSettings()` | **`ophis_view.js:439-475`** | Per-Iso-Event settings rows driven by `ISO_EVENT_SETTINGS`. |
| `OPHIS_SCREEN__EVENT_SWAP` | `"Event Data Transfer "` | `renderIsoEventDataTransfer()` / `refreshIsoEventSwapRows()` | `ophis_view__settings.js` (dependency) | Copy settings from one Iso-Event to others. |

> Every label from `getScreenName` has a **trailing space** appended (`toReturn += " ";`, `ophis_view__strings.js:315`). This is deliberate padding for `adjustSelectElemWidth`. Reproduce it or the dropdown width computation drifts.

### 1.4 Non-screen surfaces (modals / overlays / transient UI)

These are *not* screens; they are created imperatively and layered over whatever screen is showing.

| Surface | Created by | Ids/classes | Notes |
|---|---|---|---|
| **Yes/No or OK dialog** | `showDialog(...)` `ophis_view__utils.js:461-535` | `#yes-no-dialog-wrapper`, `#yes-no-dialog`, `#yes-no-dialog-background`, `#dialog-no-button`, `#dialog-yes-button` | Full-viewport scroll container, `z-index:100`, 70%-black scrim. |
| **OK-only dialog** | `showOkDialog(message)` `ophis_view__utils.js:457-459` | same | Thin wrapper: `showDialog(message, "OK")`. |
| **Minify warning dialog** | `showMinifyWarningDialog(cont)` `ophis_view__utils.js:440-449` | same | Fixed copy, see §4.3. |
| **Toast** | `showToast(message)` `ophis_view__utils.js:390-405` | `.toast_wrapper` > `.toast.show` | Auto-removed after **2900 ms**. `z-index:10000`. |
| **Map overlay** | `showMap(isoEvent)` / `hideMap()` `ophis_view__utils.js:407-431` | `#map-container`, `#map`, `#map-current-lat-long`, `#map-close-button`, `#map-background-close-capture` | Toggled via `style.visibility`, never removed from DOM. Leaflet. |
| **Tooltips** | `applyToolTip` / `applyToolTipToElemId` (`ophis_dependencies.js`) | `.tipsy`, `.tipsy-inner`, `.tipsy-arrow` | jQuery-tipsy, `html:true`, `delayIn = TOOL_TIP_DELAY_IN_MILLISECONDS` (750). |
| **Initial loading splash** | faded out by `refreshCurrentPage` on first update | `#initial-loading-container`, `.fade_out_loading_image`, `.loading_image` | Removed from DOM 1000 ms after fade starts. |
| **Notes pop-up** | `ophis_view__rebuild.js` (dependency) | `#notes-pop-up-wrapper` | Out of scope. |

### 1.5 Navigation model

There is **one navigation control**: a `<select id="current-screen">`.

* Populated once at boot: `fillInSelectElem(currentScreenSelectElem, OPHIS_SCREENS, getScreenName)` (`ophis_main.js:655`, helper at `ophis_view__utils.js:690-703`).
* `change` handler → `setCurrentScreen(this.value)` (`ophis_main.js:657-659`).
* `setCurrentScreen(screenEnum)` (`ophis_main.js:722-739`): sets `select.value`, persists `GLOBAL_OPTION__START_SCREEN` (`"start_screen"`), calls `adjustSelectElemWidth`, then `refreshIsoEvents(REFRESH_TYPE__RIGHT_PANEL_ONLY, ...)`. If auto-recalc is on **and** the new screen is Z-Dates, it passes `OPHIS_INPUT_CHANGE__CHANGED` (forcing recompute); otherwise `OPHIS_INPUT_CHANGE__NO_CHANGE`.
* `getCurrentScreen()` (`ophis_view.js:327-332`) is the **single source of truth** for "which screen am I on" — it reads `document.getElementById("current-screen").value`. The DOM is the state store; there is no JS mirror.

**Two forced-navigation paths:**

1. **Error bounce** (`ophis_view.js:205-215`). If `results.errors.length > 0` and the current screen is *not* one of `{Z_DATES, DEBUG, OPERATIONS, EVENT_SWAP, EXPORT_X_DATES, EVENT_SETTINGS}`, **and** `refreshType != REFRESH_TYPE__RIGHT_PANEL_ONLY`, **and** `callUpdateChartDatasets === true`, the app force-switches to `OPHIS_SCREEN__Z_DATES`, persists it, and writes the select's `.value`. Note the allow-list **excludes ABOUT, IMPORT_X_DATES and EXPORT_Z_DATES**.
2. **Boot** — see the contradiction in §12.1: the persisted `start_screen` is loaded into `appState` but the select is *always* set to `DEFAULT_STARTING_SCREEN` (`ophis_model__persistence.js:339` and `:343`), so the app always opens on Z-Dates.

### 1.6 ASCII wireframe of the overall layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  #header-image (img/header.png | img/header_markets.png)          #app-version ("v12")        │
│  #unsaved-changes-reminder  →  "(Saved)" .green_color | "(Not Saved)" .error_color            │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ #panel-container            (style.visibility toggled; .fade_in_panels added on 1st render)   │
│ ┌──────────────────────────── #panel-container-top-row ───────────────────────────────────┐  │
│ │ ┌── Iso-Events ─────┐ ┌── X-Dates ────────┐ ┌── T-Dates ────────┐ ┌── Filters ────────┐ │  │
│ │ │ .col_header_bkgnd │ │ .col_header_bkgnd │ │ .col_header_bkgnd │ │ .col_header_bkgnd │ │  │
│ │ │ [+][reset]        │ │ #add-x-date-button│ │ [+]               │ │ [reset]           │ │  │
│ │ │                   │ │ #reset-x-dates-btn│ │ #reset-t-dates-btn│ │                   │ │  │
│ │ │ .scrollable_      │ │ .scrollable_      │ │ .t_date_scrollable│ │ #iso-event-filter-│ │  │
│ │ │  container        │ │  container        │ │  _container       │ │  container        │ │  │
│ │ │  #iso-event-      │ │  #x-date-container│ │  #t-date-container│ │  (rows built by   │ │  │
│ │ │   container       │ │  (.x_date_row *)  │ │                   │ │  setUpIsoEvent-   │ │  │
│ │ │  (lat/long/tz/map │ │  x_date_calendar_ │ │  t_date_calendar_ │ │  FieldCheckbox-   │ │  │
│ │ │   per row)        │ │  input            │ │  input            │ │  EventListeners)  │ │  │
│ │ │                   │ │                   │ │                   │ │ ┌───────────────┐ │ │  │
│ │ │                   │ │                   │ │                   │ │ │#z-dates-hidden│ │ │  │
│ │ └───────────────────┘ └───────────────────┘ └───────────────────┘ │ └───────────────┘ │ │  │
│ │                                              ┌── Chart Options ──┐ └───────────────────┘ │  │
│ │                                              │ #iso-event-chart- │                       │  │
│ │                                              │  options-container│                       │  │
│ │                                              │ .chart_options_   │                       │  │
│ │                                              │  scrollable_cont. │                       │  │
│ │                                              └───────────────────┘                       │  │
│ └──────────────────────────────────────────────────────────────────────────────────────────┘  │
│ ┌──────────────────── #panel-container-bottom-row-table ───────────────────────────────────┐  │
│ │ ┌── #panel-cell-with-table-output-for-events ───────┐ ┌ #bottom-row-panel-cell-for-chart ┐│  │
│ │ │ #col-header-inner-for-output-panel                │ │  .chart_container                ││  │
│ │ │  [<select #current-screen>]  #screen-specific-area│ │  <canvas>  #recenter-chart-button││  │
│ │ │  #z-dates-up-to-date ("Stale"|"Up-to-date")       │ │            #chart-help-button    ││  │
│ │ │  #recalculate-z-dates-button                      │ │  chart error message wrapper     ││  │
│ │ ├───────────────────────────────────────────────────┤ │                                  ││  │
│ │ │ #scrollable-container-for-output-container        │ │                                  ││  │
│ │ │   <table #output-container>   <-- ALL screen bodies││ │                                  ││  │
│ │ │      row  (addOutputRow())                        │ │                                  ││  │
│ │ │      row                                          │ │                                  ││  │
│ │ └───────────────────────────────────────────────────┘ └──────────────────────────────────┘│  │
│ └──────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

 Overlays (created on demand, appended to <body>):
   .toast_wrapper > .toast.show        bottom:30px, z-index 10000, removed after 2900 ms
   div(100vw/100vh, z-index 100) > #yes-no-dialog-background (scrim) + table#yes-no-dialog-wrapper
                                                              > td > #yes-no-dialog
                                                                     > label(message)
                                                                     > #dialog-no-button
                                                                     > #dialog-yes-button (optional)
   #map-container (visibility hidden/visible) > #map, #map-current-lat-long, #map-close-button
```

**Key insight for the rewrite:** the *entire* screen body for **every** screen is rendered into one shared `<table id="output-container">`, one `<tr>` at a time via `addOutputRow()`. The area immediately right of the screen `<select>` (`#screen-specific-area`) holds that screen's toolbar (buttons, checkboxes). Screens are not separate DOM subtrees; they are successive innerHTML fills of the same two containers.

---

## 2. THE DOM CONTRACT

Naming conventions observed:

* **Element ids: kebab-case, lowercase** (`z-dates-up-to-date`, `export-x-dates-as-oph-file`). Two violations exist: `code_load_area` (`ophis_view.js:496`, `:511`) and `z-dates-hidden` is fine but `#yes-no-dialog*` is generated at runtime.
* **CSS classes: snake_case, lowercase** (`col_sub_header_format`, `x_date_calendar_input`).
* **Derived ids follow suffix rules:**
  * master checkbox: `<baseElemId> + "-master"`, class `<baseClassName> + "_master"` (`ophis_view__utils.js:740-742`).
  * master checkbox mount point: `<baseElemId> + "-header"` (`ophis_view__utils.js:734`).
  * checkbox label: `<elemId> + "-label"` (`ophis_view.js:531`).
  * serialized field ids: `serializationKey.replaceAll("_","-") + "-checkbox"` and `+ "-input"` (`ophis_utils.js:128-129`).

### 2.1 Global chrome — **[STATIC]**, written by `ophis_view.js` / `ophis_view__utils.js`

| Id | Read / Written | Where | What |
|---|---|---|---|
| `header-image` | **W** `.src` | `ophis_view.js:46,48,50` | `"img/header.png"` for CLASSIC + ASTROLOGICAL, `"img/header_markets.png"` for MARKETS. |
| `app-version` | **W** `.innerHTML` (guarded by existence check) | `ophis_view.js:88-90` | `"v" + APP_VERSION`. |
| `unsaved-changes-reminder` | **W** `.style.display`, `.innerHTML`, `.className` | `ophis_view__utils.js:538-556` | `"inline-block"`/`"none"`; text `FILE_NOT_SAVED_TEXT`/`FILE_SAVED_TEXT`; class `error_color`/`green_color`. |
| `initial-loading-container` | **W** `classList.add("fade_out_loading_image")`, then removed from parent | `ophis_view.js:101,106` | Only on `viewUpdateCount == 1`. |
| `panel-container` | **W** `.style.visibility = "visible"`, `classList.add("fade_in_panels")` | `ophis_view.js:102-103` | Only on first render. |
| `document.title` | **W** | `ophis_view.js:86` | See `refreshWindowTitle`. |

### 2.2 Output panel header — **[STATIC]**

| Id | R/W | Where | What |
|---|---|---|---|
| `current-screen` | **R** `.value` / **W** `.value` | `ophis_view.js:211-212, 328-329` | The `<select>`. Its value *is* the current-screen state. |
| `screen-specific-area` | **W** `.innerHTML` | `ophis_view.js:153, 190, 375-376, 444-445, 488-489, 578-579` | Per-screen toolbar. Cleared to `""` whenever `callClearOutputContainer === true`. |
| `z-dates-up-to-date` | **W** `.style.width`, `.className`, `.innerHTML` | `ophis_view.js:276, 280, 292-293, 306-307` | Hard-coded `width = "101px"`; `"Stale"` + `error_color` or `"Up-to-date"` + `green_color`. |
| `recalculate-z-dates-button` | passed to `enableStandardButton` / `disableStandardButton` | `ophis_view.js:290, 304` | Enabled when stale, disabled when fresh. |
| `scrollable-container-for-output-container` | **W** `.style.opacity`; **R** `.parentElement.style.transform` | `ophis_view.js:275, 285, 287, 303`; `ophis_view__utils.js:23-27` | Opacity `OPACITY__DISABLED` (0.5) only when stale AND on Z-Dates; else 1.0. |
| `output-container` | **R** (via `getOutputContainer()`), **W** `.innerHTML = ""`, `.insertRow(-1)` | `ophis_view__utils.js:326-330, 276-282`; `ophis_view.js:191, 341, 440, 469` | The `<table>` all screens render into. |

### 2.3 Top-row panel containers — **[STATIC]**, read by these files

| Id | Accessor | Where |
|---|---|---|
| `x-date-container` | `getXDateContainer()` | `ophis_view__utils.js:304-308` |
| `t-date-container` | `getTDateContainer()` | `ophis_view__utils.js:310-314` |
| `iso-event-container` | `getIsoEventContainer()` | `ophis_view__utils.js:320-324` |
| `iso-event-filter-container` | direct | `ophis_view__utils.js:775` (rows appended), `:814` (trailing row) |
| `iso-event-chart-options-container` | direct | `ophis_view__utils.js:776` |
| `z-dates-hidden` | created *by* `setUpIsoEventFieldCheckboxEventListeners` at `ophis_view__utils.js:815`; written by `refreshDatesHidden` at `:821,828` | |

### 2.4 Screen: EXPORT EVENTS (`renderExportXDates`)

| Selector | Kind | Where | Notes |
|---|---|---|---|
| `.click_to_copy_button` | class, **last element taken** | `ophis_view.js:365, 418-419` | `copyButtons[copyButtons.length-1]`. Click → `navigator.clipboard.writeText(saveBlob)`, toast `"Copied to clipboard!"`, `markChangesSaved()`. |
| `#export-x-dates-as-oph-file` | id | `ophis_view.js:366, 432` | Click → `writeStringToFile(saveBlob, "Export.oph")`. |
| `#prettify-x-date-output` (+ `#prettify-x-date-output-label`) | id, class `prettify_x_date_output` | `ophis_view.js:372, 378` | Bound to `GLOBAL_OPTION__PRETTIFY_X_DATE_EXPORT_OUTPUT` (`"prettify_x_date_export_output"`). |
| `#minify-x-date-output` (+ `-label`) | id, class `minify_x_date_output` | `ophis_view.js:373, 379` | Bound to `GLOBAL_OPTION__MINIFY_X_DATE_EXPORT_OUTPUT` (`"minify_x_date_export_output"`); gated by the minify warning dialog. |
| `.export_pdf_button` | class | `ophis_view.js:367` | **Commented out** — dead. |

### 2.5 Screen: IMPORT EVENTS (`renderImport`)

| Selector | Kind | Where | Notes |
|---|---|---|---|
| `.click_to_load_button` | class, **last element taken** | `ophis_view.js:480, 502-504` | |
| `#code_load_area` | id (snake_case!) | `ophis_view.js:496, 511` | `<textarea class='text_area' rows=10>`. |
| `.load_error_col` | class | `ophis_view.js:505-509` | All such `<td>`s are removed from their parents before each load. They are **created by `ophis_model__persistence.js:309`** — dependency. |

### 2.6 Screen: EVENT SETTINGS (`renderEventSettings`)

| Selector | Where | Notes |
|---|---|---|
| `#event-source-header` | `ophis_view.js:451` **and** `:452` | **DUPLICATE ID BUG** — two `<td>`s in the same header row carry the same id. |
| `.iso_event_setting_row` | `ophis_view.js:470` | Added to every generated `<tr>`. |
| per-setting ids | supplied by `ISO_EVENT_SETTINGS[i].generateHtml()` | `ophis_view__settings.js` — dependency. |
| `#event-day-scope-start-time` | `ophis_view__utils.js` is not the creator; **destroyed** by `clearOutputContainer()` at `ophis_view.js:338` | A flatpickr instance on this settings-screen input is torn down on every clear. |

### 2.7 Screen: ABOUT (`renderAbout`)

| Selector | Where | Notes |
|---|---|---|
| `#about-screen-text` | `ophis_view.js:589, 745-747` | `.style.filter = "blur(8px)"` when `GLOBAL_OPTION__BLUR_ABOUT_SCREEN` (`"blur_about_screen"`) is `true`, else `""`. |
| `#blur-about-screen-checkbox` | `ophis_view.js:575, 581` | **Commented out** — dead. `blurCheckboxHtml` is forced to `""` at `:576`. |
| `.about_header`, `.about_body`, `.about_page_ul`, `.about_screen_points` | throughout | Styling. |
| `.msrf_normal` / `.msrf_important` / `.msrf_vortex` | `:600, 637-639, 712, 733` | Colours `#2ede69`, `#b80b0b`, `purple` (`ophis.css:97,107,132`). |
| `.operation_alpha` / `.operation_beta` | `:635` | `darkgoldenrod`, `#00c0ff`. |

### 2.8 Iso-Event location row (parallel-array contract) — `updateLatLongInputElemValues`

`ophis_view.js:750-798`. Five `getElementsByClassName` collections are walked **in lockstep by index**, and index `i` is assumed to equal `appState.isoEvents[i]`:

| Class | Written |
|---|---|
| `lat_input` | `.value = isoEvent.lat`; `.disabled`; `.style.opacity` |
| `long_input` | `.value = isoEvent.long`; `.disabled`; `.style.opacity` |
| `timezone_display` | `.innerHTML` and `.title` = `getTimezone(lat, long)` |
| `open_map_icon` | `.style.opacity`, `.style.cursor` (`"pointer"` / `"not-allowed"`) |
| `location_enabled_checkbox` | `.checked` (existence-guarded) |

### 2.9 Map overlay

| Id | R/W | Where |
|---|---|---|
| `map-container` | **W** `.style.visibility` = `"hidden"` / `"visible"` | `ophis_view__utils.js:408, 415` |
| `map-current-lat-long` | **W** `.innerHTML` = `readableLatLong(lat,long)` | `ophis_view__utils.js:434-437` |

### 2.10 Dialog (runtime-generated ids)

| Id | Created at | Notes |
|---|---|---|
| `yes-no-dialog-background` | `ophis_view__utils.js:479` | Scrim; click closes if `cancelable`. |
| `yes-no-dialog-wrapper` | `ophis_view__utils.js:484` | The `<table>`. |
| `yes-no-dialog` | `ophis_view__utils.js:488` | The inner box. |
| `dialog-no-button` | `ophis_view__utils.js:493` | Always present (doubles as "OK"). |
| `dialog-yes-button` | `ophis_view__utils.js:495` | Only when `yesButtonText` is truthy. |

### 2.11 Date-input classes read by `setUpDateInput`

| Class | Where | Notes |
|---|---|---|
| `x_date_calendar_input` | `ophis_view__utils.js:204-206` | Enter-key advances focus to the next element of this class. |
| `t_date_calendar_input` | `ophis_view__utils.js:205-206` | The fallback branch — i.e. any input **not** carrying `x_date_calendar_input` is treated as a T-Date input. |
| `#current-local-time` | destroyed as a flatpickr instance in `refreshCurrentPage` at `ophis_view.js:189` | |

### 2.12 Master-checkbox DOM contract (`ophis_view__config.js` + `ophis_view__utils.js:728-759`)

For every entry in `MASTER_CHECKBOX_CONFIGS`, three DOM names are implied:

```
mount point : "<baseElemId>-header"     (must exist statically or the config is silently skipped)
master input: "<baseElemId>-master"     (id, created)
master class: "<baseClassName>_master"  (class, created)
child class : "<baseClassName>"         (children are found ONLY by this class, in DOM order)
```

| Config | baseElemId | baseClassName | ⇒ header id | ⇒ master id | ⇒ master class |
|---|---|---|---|---|---|
| `MASTER_CHECKBOX_CONFIG__X_DATES` | `x-date-checkbox` | `x_date_checkbox` | `x-date-checkbox-header` | `x-date-checkbox-master` | `x_date_checkbox_master` |
| `MASTER_CHECKBOX_CONFIG__T_DATES` | `t-date-checkbox` | `t_date_checkbox` | `t-date-checkbox-header` | `t-date-checkbox-master` | `t_date_checkbox_master` |
| `MASTER_CHECKBOX_CONFIG__ISO_EVENT_FILTERS` | `iso-event-filter-checkbox` | `iso_event_filter_checkbox` | `iso-event-filter-checkbox-header` | … | … |
| `MASTER_CHECKBOX_CONFIG__CHART_OPTIONS` | `iso-event-chart-option-checkbox` | `iso_event_chart_option_checkbox` | … | … | … |
| `MASTER_CHECKBOX_CONFIG__OPERATIONS` | `operation-checkbox` | `operation_checkbox` | … | … | … |
| `MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP` | `iso-event-swap-checkbox` | `iso_event_swap_checkbox` | … | … | … |
| `MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP_SETTING` | `iso-event-swap-setting-checkbox` | `iso_event_swap_setting_checkbox` | … | … | … |

Also referenced by `refreshMasterCheckboxBasedOnChildChange` (dependency, `ophis_view__rebuild.js:616`): class `row_radio_button_for_swap`.

### 2.13 Complete class inventory touched by these four files

Structural / layout: `scrollable_container`, `col_header_background` (read by `setPanelMaxDimensions`, dependency), `col_format`, `col_sub_header_format`, `col_sub_header_format_for_row`, `col_with_input_left_right_padding`, `col_output_text`, `filter_description_col`, `input_row_name`, `iso_event_setting_row`, `tool_tippable_cursor`, `inner_panel_table`, `inner_panel_table_starting_message`.

Buttons/inputs: `add_button`, `general_button`, `large_font`, `bordered`, `small_border_radius`, `click_to_copy_button`, `click_to_load_button`, `export_pdf_button` (dead), `text_area`, `general_input`, `lat_input`, `long_input`, `open_map_icon`, `timezone_display`, `location_enabled_checkbox`, `row_delete_button`, `row_delete_button_master`, `square_button`.

Semantic colour: `error_color` (red), `green_color` (green), `warning_color` (darkorange), `msrf_normal`, `msrf_important`, `msrf_vortex`, `operation_alpha`, `operation_beta`, `about_screen_points`, `has_clock_font`.

About/typography: `about_header`, `about_body`, `about_page_ul`.

Transient: `toast_wrapper`, `toast`, `show`, `fade_in_panels`, `fade_out_loading_image`, `loading_image`, `load_error_col`, `tipsy`, `tipsy-inner`, `tipsy-arrow`.

Tooltip tables: `tool_tip_table_border`, `tool_tip_table_left_row`.

Date inputs: `x_date_calendar_input`, `t_date_calendar_input`, `x_date_row`, `t_date_scrollable_container`, `chart_options_scrollable_container`, `chart_container`.

Custom attribute (non-standard, used as data storage): **`row_index`** — read by `getRowIndex(elem)` (`ophis_view__utils.js:362-373`) from the element, falling back to `elem.parentElement`. Written by the rebuild/settings modules.

---

## 3. `ophis_view__utils.js` — RENDERING HELPERS, FUNCTION BY FUNCTION

### 3.1 Layout / scroll

```ts
scrollPanelToBottom(elem: HTMLElement): void            // :2-4
```
Scrolls `elem.parentElement` to `(0, elem.parentElement.scrollHeight)`. Note it scrolls the **parent**, not the element.

```ts
updateOutputPanelScrollIfNeeded(): void                 // :19-32
```
If `shouldExpandMainOutputPanel()` is true and `#scrollable-container-for-output-container` exists, sets on its **parentElement**:
`style.transform = "translateY(" + (-window.scrollY) + "px) translateX(" + (-window.scrollX) + "px)"`.
This is a manual "position: sticky" emulation, wired to `window.addEventListener('scroll', …)` (`ophis_main.js:717-719`).

```ts
shouldExpandMainOutputPanel(): boolean                  // :34-48
```
1. `currentIsoEvent = getCurrentIsoEvent()`; `showChartField = getIsoEventField("SERIALIZED_FIELD__CHART_OPTION__SHOW_CHART")`.
2. `hideChartCompletely = currentIsoEvent ? currentIsoEvent[showChartField.serializationKey] === false : false`.
   Note the strict `=== false`: an **absent/undefined** value does *not* count as hidden.
3. If `hideChartCompletely` → `true`.
4. Otherwise: `isScreenThatHasRoomForChart = currentScreen ∈ {IMPORT_X_DATES, Z_DATES, EXPORT_Z_DATES}`; return `isScreenThatHasRoomForChart == false`.

```ts
elementHasAncestor(element: Node, ancestor: Node): boolean   // :51-60
```
Walks `parentNode` chain. Returns false if `element === ancestor` (starts at parent).

### 3.2 Date input wiring — `setUpDateInput`

```ts
setUpDateInput(
  flatPickrConfig : object,               // MUTATED: .onChange is assigned
  dateInputElem   : HTMLInputElement,
  eventScope      : EVENT_SCOPE__*,       // HH_MM | DAYS | MONTHS | YEARS
  timeZoneOrNull  : string | null,
  fallbackDateString : (elem) => string,  // callback producing the "revert to" text
  onValidDateEntered : (elem, parsedNativeDate: Date, possibleXDate: XDate) => void,
  timeOnly        : boolean = false
): void                                   // :62-236
```
Side effects: assigns `flatPickrConfig.onChange`; adds `keydown`, `input` (empty), and `blur` listeners to `dateInputElem`. Does **not** itself instantiate flatpickr — the caller does that with the mutated config.

**Reentrancy guard.** Closure variable `onValidDateEntered_calling` (`:64`). `call_onValidDateEntered` (`:70-82`) fires only when `parsedNativeDate != null && onValidDateEntered_calling === false`; it sets the flag, calls in a `try`, clears the flag in both success and `catch` (rethrowing). This exists specifically to break the render→blur→render recursion documented at `ophis_view.js:143-152`.

**`onDateChangeInner(dateString)` (`:66-111`)** — bails entirely if `document.contains(dateInputElem)` is false.
* `timeOnly === true` branch (`:90-102`):
  1. `timeComponents = validateXDateTime(dateString, [])`.
  2. If non-null: `parsedNativeDate = utcMillisToNativeDate(0)`; `parsedNativeDate.setUTCHours(timeComponents.hours, timeComponents.minutes)`; `lat = 0; long = 0`; `possibleXDate = nativeDateToXDate(parsedNativeDate, 0, 0)`; then `call_onValidDateEntered`.
     *(`isValidLatAndLong(0,0)` returns **true** — `ophis_model__validation.js:403-405` — so the readable string is produced through the moment/timezone path at coordinates 0,0.)*
* else branch (`:104-108`): `possibleXDate = flatPickrStringToXDate(eventScope, dateString)`; `parsedNativeDate = xDateToNativeDate(eventScope, possibleXDate, null /*lat*/, null /*long*/, [] /*errors*/, timeZoneOrNull)`; then `call_onValidDateEntered`.

**`onNativeDateInputEvent(event)` (`:113-186`)** — normalises the *text* in the field. Only does work when `event.type == "blur" || isEnterKey(event) || isEscapeKey(event)`; otherwise it falls straight through to `dateInputElem.value = dateString` (a no-op reassignment).

`timeOnly` path (`:119-126`): appends `" HH:MM"` from `validateXDateTime`, or `" 00:00"` if invalid.

Calendar path (`:127-180`), in order:
1. `possibleXDate = flatPickrStringToXDate(eventScope, dateString)`.
2. `calendarComponents = validateXDateCalendarDate(possibleXDate.date, errors_out, DATE_DELIMITER /* "/" */)`.
3. If null, retry with `STANDARD_DATE_DELIMITER` (`"-"`).
4. If still null: split raw `dateString` on `"-"`; **if exactly 3 parts and part[0].length == 4** (i.e. looks like `YYYY-MM-DD`), rewrite to `MM/DD/YYYY` and re-validate with `"/"`.
5. If we now have components:
   * **Year expansion** (`:148-156`) on `calendarComponents.year_orig` stringified:
     * length 1 → `"000" + year`
     * length 2 → `"20" + year`  ← **always assumes the 2000s**
     * length 3 → `"0" + year`
     * length 4 → unchanged
   * `dateString = dateComponentsToReadableString(year, month, day)` → `MM/DD/YYYY`.
   * If `eventScope == EVENT_SCOPE__HH_MM`: append `" HH:MM"` from `validateXDateTime(possibleXDate.time, errors_out)`, else `" 00:00"`.
   * Re-parse; if `xDateToNativeDate(eventScope, possibleXDate)` returns `null`, `dateString = fallbackDateString(dateInputElem)`.
6. Else (no components at all): `dateString = fallbackDateString(dateInputElem)`.
7. `dateInputElem.value = dateString`.

> `onDateChangeInner(dateString)` on the last line of this function is **commented out** (`:185`). Blur/Enter normalisation therefore does **not** re-emit `onValidDateEntered`; the app relies on flatpickr's own `onChange` having already fired.

**Listeners:**
* `keydown` (`:194-222`): Enter → `preventDefault`, `stopPropagation`, `onNativeDateInputEvent(event)`, then advance focus: determine class (`x_date_calendar_input` if present on target, else `t_date_calendar_input`), collect all elements of that class, find self, and `focusOphisInput(allDateInputs[i+1])` if not last. (Loop does not `break` — harmless.) Escape → `inputElem.blur()` and `inputElem._flatpickr.close()`.
* `input` (`:224-227`): registered but **empty** (both statements commented out).
* `blur` (`:229-235`): `preventDefault`, `stopPropagation`, `onNativeDateInputEvent(event)`.

### 3.3 Symbol / formatting helpers

```ts
getHitCountSymbolImage(hitCount: number, srcOnly: boolean): string | null   // :238-253
```
| hitCount | `srcOnly === true` | `srcOnly` falsy |
|---|---|---|
| `< 2` (default) | `TRANSPARENT_PIXEL_DATA_URI` | `null` |
| `== 2` | `"img/hit_symbols/gemini.png"` | `"CHART_SYMBOL_IMAGE__GEMINI"` |
| `== 3` | `"img/hit_symbols/triangle.png"` | `"CHART_SYMBOL_IMAGE__TRIANGLE"` |
| `== 4` | `"img/hit_symbols/diamond.png"` | `"CHART_SYMBOL_IMAGE__DIAMOND"` |
| `>= 5` | `"img/hit_symbols/circle.png"` | `"CHART_SYMBOL_IMAGE__CIRCLE"` |

(src/key constants from `ophis_view__chart_config.js:109-117` — dependency.)

```ts
convertIntToSubscriptUnicode(nonNegInt: number|string): string             // :255-274
```
Maps each decimal digit through `SUBSCRIPT_UNICODE_DIGITS` (`U+2080`…`U+2089`, `:6-17`). Returns `""` if `isNonNegIntOrStringThereof(nonNegInt)` is false.

```ts
intToDecimalString(integer): string|any                                    // :316-318
```
`isNonNegIntOrStringThereof(integer) ? integer + ".0" : integer`. **Negative numbers and decimals pass through untouched** — `-5` stays `-5`, `12.4` stays `12.4`.

```ts
numberWithCommas(value): string                                            // :831-833
```
`value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")`. **Dead code — no call sites anywhere in `src/`.**

### 3.4 Table / row helpers

```ts
addOutputRow(): HTMLTableRowElement            // :276-282
```
`getOutputContainer().insertRow(-1)`. This is the primitive every screen renderer builds on.

```ts
getXDateContainer()   → #x-date-container      // :304-308
getTDateContainer()   → #t-date-container      // :310-314
getIsoEventContainer()→ #iso-event-container   // :320-324
getOutputContainer()  → #output-container      // :326-330
```

```ts
clearRowsFromTableExceptTopRow(tableElem): void   // :349-353
```
`while (tableElem.rows.length > 1) tableElem.deleteRow(1);` — keeps row 0 (the header).

```ts
getClickedRowIndex(event): number   // :355-360
getRowIndex(elem): number           // :362-373
```
`getRowIndex` does `parseInt(elem.getAttribute("row_index"))`; if that is not `>= 0` (covers `NaN`), it retries on `elem.parentElement`. **Only one level of fallback** — a click on a grandchild returns `NaN`.

### 3.5 Keyboard helpers

```ts
isEnterKey(evt): boolean   // :284-290   evt.key === 'Enter' || evt.keyCode === 13
isEscapeKey(evt): boolean  // :292-302   "key" in evt ? (key === "Escape" || key === "Esc") : keyCode === 27
```

```ts
getEventTargetElem(event): Element   // :383-388
```
`event = event ? event : window.event; return event.target ? event.target : event.srcElement;` — silently falls back to the *global* `window.event`, which is what makes the arg-less calls in §3.9 work by accident.

### 3.6 Flatpickr lifecycle

```ts
destroyFlatPickrInstance(inputElem): void        // :332-337
```
If `inputElem && inputElem._flatpickr` → `.destroy()` then `inputElem._flatpickr = null`.

```ts
destroyFlatPickrInstances(className: string): void   // :339-347
```
Loops `getElementsByClassName(className)` calling the above. **Live HTMLCollection is iterated forward while nothing is removed, so this is safe here.**

### 3.7 HTML-producing helper

```ts
getRotationLabelHtml(letter: string, isWhite = false, centered = false): string   // :375-381
```
Output shape:
```html
<table [style="margin-left: auto; margin-right:auto;"]>
  <tr>
    <td style="vertical-align:middle;">{letter}</td>
    <td style="padding-left:2px; vertical-align:middle;">
      <img style="margin-left:-2px;display:block;width:30px;"
           src="./img/spinning_globe.png" />   <!-- or spinning_globe_white.png when isWhite -->
    </td>
  </tr>
</table>
```

### 3.8 Toast, map, dialogs

```ts
showToast(message: string): void   // :390-405
```
Creates `div.toast_wrapper` appended to `document.body`, containing `div.toast.show` whose **`innerHTML`** is `message` (so HTML in messages renders). Removes the wrapper via `setTimeout(..., 2900)`. Comment at `:404` explains 2900 (not 3000) avoids a CSS flicker in Brave.

```ts
hideMap(): void    // :407-409   #map-container.style.visibility = "hidden"
showMap(isoEvent): void   // :411-431
```
`showMap`: `index = appState.isoEvents.indexOf(isoEvent)`; **early return if `index < 0`**. Otherwise: show `#map-container`; `appState.mostRecentIsoEventMapClick = index`; `coords = new L.LatLng(isoEvent.lat, isoEvent.long)`; `appState.map.setView(coords, DEFAULT_MAP_SELECTION_ZOOM /* 4 */)`; if the marker layer is already on the map, `clearLayers()`; add a new `L.marker(coords)` to `appState.mapMarkerLayer`; `appState.map.addLayer(appState.mapMarkerLayer)`; `updateMapLatLongHud(lat, long)`.

```ts
updateMapLatLongHud(lat, long): void   // :433-438
```
Constrains both via `constrainLatOrLongValue`, then `#map-current-lat-long.innerHTML = readableLatLong(lat, long)`.

```ts
showMinifyWarningDialog(continuation: () => void): void   // :440-449
showOkDialog(message: string): void                       // :457-459
hideDialog(dialogElem): void                              // :451-455
showDialog(
  message: string,
  noOrOkButtonText: string,
  yesButtonText: string|null = null,
  onYes: (()=>void)|null = null,
  onNo:  (()=>void)|null = null,
  onPreNo: (()=>void)|null = null,
  cancelable: boolean = true
): void                                                   // :461-535
```

`showDialog` DOM construction, exactly:
1. `dialogElemScrollContainer` = `div` with `width:100vw; height:100vh; overflow:auto; position:fixed; top:0; left:0; zIndex:100`.
2. `dialogBackgroundElem` = `div#yes-no-dialog-background`, `position:absolute; top:0; left:0; 100vw × 100vh; backgroundColor: rgba(0, 0, 0, .7)`.
3. `dialogElem` = `document.createElement("table")` with `id = "yes-no-dialog-wrapper"`; one row inserted.
4. Row `innerHTML` (verbatim structure):
   ```html
   <td style="vertical-align:middle; text-align:center;">
     <div id="yes-no-dialog" style="position:relative;">
       <label> {message} </label>
       <div style="margin-top:15px;">
         <button class="large_font small_border_radius bordered general_button"
                 style="margin:5px;" id="dialog-no-button">{noOrOkButtonText}</button>
         <!-- only if yesButtonText -->
         <button class="large_font small_border_radius bordered general_button"
                 style="margin:5px;" id="dialog-yes-button">{yesButtonText}</button>
       </div>
     </div>
   </td>
   ```
5. `dialogElemScrollContainer.appendChild(dialogElem)`; append container to `document.body`.
6. The scrim is inserted **after** the table exists, via `document.getElementById("yes-no-dialog").parentElement.insertBefore(dialogBackgroundElem, document.getElementById("yes-no-dialog"))` — i.e. the scrim becomes a sibling *inside the `<td>`*, immediately before `#yes-no-dialog`. (Odd, but that's the code.)
7. If `cancelable`, scrim `click` → `hideDialog(dialogElemScrollContainer)`.
8. `#dialog-no-button` click → `onPreNo?.()`, `hideDialog(...)`, `onNo?.()` — **in that order**.
9. `#dialog-yes-button` click (if present) → `hideDialog(...)`, `onYes?.()`.

`hideDialog(dialogElem)` removes `dialogElem` from its parent if both exist.

### 3.9 Lat/long input plumbing

```ts
getLatOrLongFromElem(elem): "lat" | "long"    // :562-572
```
`elem.classList.contains("lat_input") ? COORD_LAT : COORD_LONG`. Anything not carrying `lat_input` is treated as longitude.

```ts
refreshFromLatOrLongInputEvent(latOrLongInputElem, rowIndex): boolean   // :574-586
```
`parseLatOrLongString(elem.value, rowIndex, latOrLong)` (default `checkLimits = true`); on non-null → `bubbleOutLatLongInputEventRefresh(...)`, return `true`; else `false`.

```ts
bubbleOutLatLongInputEventRefresh(floatValue, latOrLong, rowIndex): void   // :588-597
```
1. `appState.isoEvents[rowIndex][latOrLong] = floatValue` (writes model **directly**).
2. `flushChangesToDisk()`.
3. If `appState.globalOptions.current_iso_event_index == rowIndex` → `refreshIsoEvents(REFRESH_TYPE__SOFT, OPHIS_INPUT_CHANGE__CHANGED)`; else `selectIsoEvent(rowIndex)`.

```ts
addEventListenersToLatOrLongInput(latOrLongInputElem): void   // :599-650
```
Inner `finalizeLatLongInput(event)`:
* `rowIndex = getClickedRowIndex(event)`, `targetElem = getEventTargetElem(event)`.
* Try strict parse; if it fails, re-parse with `checkLimits = false`, and if that yields a number, `constrainLatOrLongValue(...)` then bubble; otherwise **revert** `targetElem.value = appState.isoEvents[rowIndex][latOrLong]`.

Listeners:
* `focus` → `selectIsoEvent(getClickedRowIndex(event))`.
* `blur` → `finalizeLatLongInput()` — **called with no argument** (`:631`).
* `keydown` → if `event.which == KEY_CODE__ENTER (13)` → `finalizeLatLongInput()` (again no argument, `:636`) then `this.blur()`.
* `input` → captures `valueBefore`, calls `refreshFromLatOrLongInputEvent(targetElem, rowIndex)` (which may re-render), then **restores** `targetElem.value = valueBefore` so live typing isn't clobbered.

### 3.10 Logging

```ts
print(obj, tag = ""): void        // :652-660
printError(obj): void             // :662-664   tag = LOG_TAG__ERROR   = "OPHIS_ERROR"
printWarning(obj): void           // :666-668   tag = LOG_TAG__WARNING = "OPHIS_WARNING"
```
`print` prefixes `tag + ": "` when a tag is given; numbers/strings printed raw, everything else through `JSON.stringify`.

### 3.11 `<select>` helpers

```ts
adjustSelectElemWidth(selectElement): void   // :670-688
```
Reads the selected option's `.text`, measures it with a temporary `<span>` (`position:fixed; visibility:hidden; white-space:nowrap`) appended to and removed from `document.body`, then sets `selectElement.style.width = (textWidth + 30) + 'px'`. (Comment says `+20`; code says `+30`.)

```ts
fillInSelectElem(selectElem, optionEnumArray, nameFunction): void   // :690-703
```
For each enum: `option.text = nameFunction(ithEnum)`, `option.value = ithEnum`, `selectElem.add(option)`. Contains a vestigial `var actuallyAdd = true; if (actuallyAdd === true)` guard — dead.

### 3.12 Filter numeric-input plumbing

```ts
refreshFromFilterInputEvent(inputElem, rowIndex, serializationKey): boolean   // :705-715
bubbleOutFilterInputEventRefresh(floatValue, serializationKey): void          // :717-722
setUpFilterInputEventListeners(elemId, serializationKeyForValue): void        // :835-878
```
`bubbleOutFilterInputEventRefresh` writes `getCurrentIsoEvent()[serializationKey] = floatValue`, flushes, then `refreshIsoEvents(REFRESH_TYPE__SOFT, OPHIS_INPUT_CHANGE__CHANGED)`.

`setUpFilterInputEventListeners` attaches:
* `blur` → `finalizeIsoEventFilterInput(domEvent, serializationKeyForValue)`; same two-stage parse/revert as lat/long, using `appState.globalOptions.current_iso_event_index` as the row index and reverting to `appState.isoEvents[isoEventIndex][serializationKeyForValue]`.
* `keydown` → Enter (`which == 13`) just calls `this.blur()` (the direct finalize call is commented out at `:863`), relying on blur.
* An `input` handler is present but fully commented out (`:868-877`).

### 3.13 Master checkbox wiring

```ts
getAllChildCheckboxes(baseClassName): HTMLCollection   // :724-726
setUpMasterCheckbox(checkBoxConfig): void              // :728-759
```
`setUpMasterCheckbox`:
1. `headerElem = document.getElementById(baseElemId + "-header")`. **If absent, silently does nothing.**
2. `headerElem.innerHTML = '<input type="checkbox" style="" id="'+baseElemId+'-master" class="'+baseClassName+'_master" title="'+title+'">'`.
3. On master `change`: iterate `getAllChildCheckboxes(baseClassName)` **by index**, calling `checkBoxConfig.onChildNowCheckedOrNot(i, this.checked)` for each; then once `checkBoxConfig.onMasterCheckboxChangeComplete()`.

> The master does **not** set the children's `.checked`; it mutates the model and relies on the subsequent refresh to redraw them.

### 3.14 Filter & chart-option table builder

```ts
setUpIsoEventFieldCheckboxEventListeners(): void   // :761-816
```
Called once at boot (`ophis_main.js:645`). For each field in `ALL_SERIALIZED_FIELDS` (`= SERIALIZED_FILTER_FIELDS.concat(SERIALIZED_CHART_OPTION_FIELDS)`, `ophis_config.js:268`):

1. `indexInFilterFields = SERIALIZED_FILTER_FIELDS.indexOf(ithField)`; `indexInChartOptionFields = SERIALIZED_CHART_OPTION_FIELDS.indexOf(ithField)`.
2. `isFilterField = indexInFilterFields >= 0`.
3. Target table = `#iso-event-filter-container` or `#iso-event-chart-options-container`.
4. `rowShortName = getRowShortNameHtml("F", indexInFilterFields)` for filters, `getRowShortNameHtml("C", indexInChartOptionFields)` for chart options → e.g. `F<sub>1</sub>`, `C<sub>3</sub>`.
5. Checkbox class = `iso_event_filter_checkbox` or `iso_event_chart_option_checkbox`.
6. Row HTML written into a freshly inserted `<tr>` (note the redundant nested `<tr>` wrapper — the parser discards it):
   ```html
   <tr>
     <td class="col_sub_header_format_for_row" style="width:0%;">
       <div class="input_row_name">{rowShortName}</div></td>
     <td class="col_format col_with_input_left_right_padding filter_description_col"
         style="border-top:none;">{ithField.name}</td>
     <td class="col_format col_with_input_left_right_padding filter_description_col"
         style="border-top:none;">
       <input type="checkbox" style="" id="{ithField.elemId}"
              class="{checkboxClass}" title="{ithField.title}"></td>
   </tr>
   ```
7. `applyToolTipToElemId(ithField.elemId)`.
8. `initIsoEventSerializedFieldCheckbox(indexIntoFieldArray, masterCheckboxConfig)` attaches a **`click`** listener (not `change`) that calls `masterCheckboxConfig.onChildNowCheckedOrNot(index, this.checked)` then `masterCheckboxConfig.onMasterCheckboxChangeComplete(index)`.
9. If `ithField.numericDefault != null` → `setUpFilterInputEventListeners(ithField.elemIdForInput, ithField.serializationKeyForValue)`.
   **This will throw if the shell does not contain an `<input id="{elemIdForInput}">`** — the builder never creates one.

Finally, a trailing row is appended **to the filter table only** (`:814-815`):
```html
<td class='filter_description_col' colspan='3'
    style='background-color:#BBBBBB; text-align: center;' colspan='3'>
  <div id='z-dates-hidden'></div></td>
```
(`colspan='3'` is written twice — the duplicate attribute is ignored by the parser.)

```ts
refreshDatesHidden(dateCount: number): void   // :818-829
```
Computes an unused `datesPluralOrSingular` (`:819` — dead), reads `appState.latestResults.stale === true`, and writes to `#z-dates-hidden`:
`"<b>Z-Dates hidden: " + (stale ? "-" : dateCount) + "</b>"`.

### 3.15 Save-status reminder

```ts
refreshUnsavedChangesReminder(showSaveStatus: boolean = true): void   // :537-560
```
1. `showSaveStatus = showSaveStatus === true && appState.initialized === true`.
2. If true: `#unsaved-changes-reminder.style.display = "inline-block"`; text/class = `FILE_NOT_SAVED_TEXT` + `error_color` when `appState.hasUnsavedChanges == true`, else `FILE_SAVED_TEXT` + `green_color`.
3. Else: `display = "none"`.
4. **Always** calls `refreshWindowTitle(showSaveStatus)` — even if the element is missing.

### 3.16 "Just changed field" toast dispatcher

```ts
handleJustChangedFields(
  isoEvent,
  indicatorsThatOverlappedDates: { [varName: string]: boolean } | null = null
): void                                            // :880-957
```

Algorithm:
1. **First pass** — count how many own properties of `appState.justChangedField` are `=== true` → `numberOfJustChangedFields`.
2. **Second pass** — for each such key `ithFieldVarName`:
   * `fieldChangeAcked = false`.
   * `actuallyShowToast = (numberOfJustChangedFields == 1)` — **toasts are suppressed entirely when more than one field changed at once** (`:899`; the `else` at `:948-950` is only a TODO comment).
   * Determine `isChartOptionField` by linear-scanning `SERIALIZED_CHART_OPTION_FIELDS` for a matching `.varName`.
   * `isNowEnabled = isIsoEventFieldEnabled(isoEvent, ithFieldVarName) === true`.
   * **Chart-option field:**
     * Only proceeds if `indicatorsThatOverlappedDates` is non-null. If it *is* null, `fieldChangeAcked` stays `false` and **the flag is never cleared**.
     * If `isNowEnabled` and `indicatorsThatOverlappedDates[varName] !== true`:
       * If varName is neither `"SERIALIZED_FIELD__CHART_OPTION__SHOW_DATES"` nor `"SERIALIZED_FIELD__CHART_OPTION__SHOW_CHART"` → toast:
         `"No nearby dates found for indicator: " + getIsoEventFieldReadableTextOnlyName(varName)`
       * Else if varName is `"SERIALIZED_FIELD__CHART_OPTION__SHOW_DATES"` and `appState.globalOptions[GLOBAL_OPTION__HIDE_COL__DATES] === true` → toast:
         `"Still hiding Chart Dates because 'Z-Dates' column is hidden."`
     * `fieldChangeAcked = true`.
   * **Filter field:** no toast logic remains (the surviving example is commented out at `:936-944`); `fieldChangeAcked = true` unconditionally.
   * If `fieldChangeAcked === true` → `appState.justChangedField[varName] = false`.

Call sites: `ophis_view.js:324` (1 arg → chart-option flags are *not* cleared) and `ophis_view__chart_datasets.js` (2 args).

---

## 4. `ophis_view__strings.js` — THE COPY DECK

### 4.1 Verbatim string constants

| Key | Value (verbatim) |
|---|---|
| `FILE_SAVE_AND_OPEN_SUGGESTION` | `<div class='warning_color about_body'>NOTE: You may find the File->Save As/Open feature more useful for your workflow.</div>` |
| `HELP_MESSAGE__X_DATES_PANEL` | `X-Dates are the primary type of Input data to the Ophis algorithms. At least 2 X-Dates are required to generate Output. Click the Add button above to get started.` |
| `HELP_MESSAGE__T_DATES_PANEL` | `T-Dates (Target Dates) are a way to only show Z-Dates for the future dates that you are interested in, e.g. when a team will actually play again.` |
| `HELP_MESSAGE__FILTERS_PANEL` | `Filters are used to cut down on Output noise to help bring focus to the Z-Dates that are most important.` |
| `HELP_MESSAGE__ISO_EVENTS_PANEL` | `Iso-Event, short for Isometric Event, is an event that has repeated itself 2 or more times in the past, and will likely repeat again in the future.` |
| `HELP_MESSAGE__EVENT_SWAP` | `This screen makes it easy to apply Settings from one Iso-Event to one or more other Iso-Events.` |
| `DISABLED_ELEMENT_SUBSCRIPT` | `&#8709;` (∅) — **DEAD: no consumers.** |

Consumers: `HELP_MESSAGE__X_DATES_PANEL`, `..._T_DATES_PANEL` → `ophis_main.js`, `ophis_view__rebuild.js`; `..._FILTERS_PANEL`, `..._ISO_EVENTS_PANEL` → `ophis_main.js`; `HELP_MESSAGE__EVENT_SWAP` → `ophis_view__settings.js`; `FILE_SAVE_AND_OPEN_SUGGESTION` → `ophis_view.js:399, 494`.

### 4.2 User-facing copy that lives inline in `ophis_view.js`

**Window / document title** (`ophis_view.js:56-91`):

| Condition | Value |
|---|---|
| skin = CLASSIC | `"Ophis v" + APP_VERSION` → at runtime `"Ophis v12"` |
| skin = ASTROLOGICAL | `"Ophis Astrology Platform"` |
| skin = MARKETS | `"Ophis Market Prediction Platform"` |
| + file path present | `" (" + currentFilePath + ")"` appended |
| + save status shown | `" " + FILE_NOT_SAVED_TEXT` or `" " + FILE_SAVED_TEXT` |

**Status / toast strings:**

| Where | String |
|---|---|
| `ophis_view.js:117` | `Successfully loaded previous session.` |
| `ophis_view.js:293` | `Stale` |
| `ophis_view.js:307` | `Up-to-date` |
| `ophis_view.js:347` | `Errors` (errors table header) |
| `ophis_view.js:426` | `Copied to clipboard!` |
| `ophis_view.js:524` | `Nothing to load!` |
| `ophis_view__utils.js:827` | `Z-Dates hidden: {n}` (or `-` when stale) |
| `ophis_view__utils.js:920` | `No nearby dates found for indicator: {fieldName}` |
| `ophis_view__utils.js:926` | `Still hiding Chart Dates because 'Z-Dates' column is hidden.` |
| `ophis_view__config.js:12` | `No results. You probably have to loosen up a filter.` (`NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT`) |
| `ophis_view__config.js:14-15` | `(Not Saved)` / `(Saved)` |

**Export Events screen** (`ophis_view.js:361-437`):

| Element | Copy |
|---|---|
| header | `Paste into any Text Editor` |
| Copy button label | `Copy` |
| Copy button `title` | `Copies the blob of code below to your clipboard, which can then be pasted into a text editor of your choice.` |
| Export button label | `Export File` |
| Export button `title` | `Export an .oph file of the code below` |
| Prettify checkbox label | `Prettify` |
| Prettify checkbox `title` | `Toggle whether exported JSON is nicely formatted, or a big blob.` |
| Minify checkbox label | `Minify` |
| Minify checkbox `title` | `Include the absolute minimum output by stripping out any fields that match current program defaults.` |
| Body note (Electron) | `ALSO NOTE: The below code can be pasted into any text editor. It ONLY contains INPUT like X-Dates, Iso-Event names, lat/long, etc., with ZERO Output Z-Dates, Scores, Hits, etc.` |
| Body note (browser) | Same, prefixed `NOTE: ` instead of `ALSO NOTE: ` |
| Export filename | `Export.oph` |
| Dead (commented out) | button label `Export PDF`, title `Exports a human-readable PDF for the currently selected Iso-Event.` / `Export PDF report with current dates.` |

**Import Events screen** (`ophis_view.js:477-527`):

| Element | Copy |
|---|---|
| header | `Paste Previously Exported Code` |
| button label | `Load` |
| textarea placeholder | `Paste previously exported Iso-Events here then click "Load" above.` |
| dialog (unsaved changes) | message `You have unsaved changes. Are you sure you want to overwrite them?`, no-button `NO, don't overwrite`, yes-button `YES, overwrite` |
| dialog (no unsaved changes) | message `Are you sure you want to overwrite the existing Iso-Events and their X-Dates?`, same buttons |

**Event Settings screen** (`ophis_view.js:439-475`):

| Element | Copy |
|---|---|
| `#screen-specific-area` | `E<sub>{n}</sub> Settings` (via `getRowShortNameHtml("E", current_iso_event_index)`) |
| header col 2 | `Setting Name` |
| header col 3 | `Setting Value` |
| row short name | `S<sub>{i+1}</sub>` |

**About screen** (`ophis_view.js:574-748`) — full body copy, in render order:

| Section | Copy |
|---|---|
| Table header | `Please Read Carefully Before Use` |
| Heading | `Implementation Details` |
| Bullet (only when `isSunsetCompletelyDisabled() === false`) | `Sunset times are calculated using trigonometry based on date, latitude and longitude. These are implementations of algorithms described in the book 'Astronomical Algorithms' by Jean Meeus. Jewish calendar websites generally use these methods.` |
| Bullet | `Distance between calendar X-Dates is in days, which will always be whole numbers/integers (no decimal component). Meanwhile a Z-Value (operation result in days) DOES have a decimal component, rounded to the nearest tenth.` |
| Bullet | `Z-Value days are fuzzily matched against MSRF integers. For example Z=12.4 matches 12 and 20.6 matches 21. Z-Values like 11.5 or 12.5 will never match an MSRF integer since they are "right in the middle". The exception to MSRF integers are the <span class='msrf_vortex'>Vortex Numbers</span> which DO have a decimal component and are matched if the Z-Value is equal +/- {VORTEX_FILTER_MATCH_TOLERANCE} .` — `VORTEX_FILTER_MATCH_TOLERANCE = 0.1` (`ophis_config.js:367`), so the rendered text ends `+/- 0.1 .` |
| Bullet (only if `FEATURE_FLAG__SHOW_LOCATION`, currently `true`) | `If using HH:MM Scope, Input times should be provided relative to the time zone implied by an Iso-Event's lat/long coordinates, NOT in UTC time or local time (unless they happen to match the time zone). If inputting the end time of a game, imagine you're a local, in the stadium, when the game ends. What does your phone say is the date and time? Put that in.` |
| Bullet (same flag) | `Output times like sunsets and Z-Dates (AKA Future Dates) are ALSO displayed relative to every Iso-Event's individual, local timezone.` |
| Heading | `Security` |
| Bullet | `This program uses ZERO external resources. ALL files (code, data, images, etc.) are loaded locally. This can be confirmed by opening Developer Tools and watching network traffic.` |
| Bullet | `The program was originally designed to be run on an air-gapped computer. No Internet connection. Defense-in-depth. And this is another proof that everything is local.` |
| Heading | `Scoring System` |
| Lead | `Every future Z-Date is given a cumulative Score based on the below criteria. Click the '?' on the chart for more information on Scoring and Hits.` |
| Bullet | `{readablePointsString("X")} for every Operation that generated it, customizable on the Operations Screen.` → renders literally **`X points for every Operation…`** (see §12.4) |
| Bullet | `<span class='operation_alpha'>Alpha Operations</span> are those with a "weight" >= 1, otherwise it's a <span class='operation_beta'>Beta Operation</span>.` |
| Bullet | `1 point for every <span class='msrf_normal'>Normal MSRF</span> match.` (`POINTS__NORMAL_MSRF_MATCH = 1`) |
| Bullet | `2 points for every <span class='msrf_important'>Important MSRF</span> match.` (`POINTS__IMPORTANT_MSRF_MATCH = 2`) |
| Bullet | `2 points for every <span class='msrf_vortex'>Vortex MSRF</span> match.` (`POINTS__VORTEX_MSRF_MATCH = POINTS__IMPORTANT_MSRF_MATCH = 2`) |
| Heading | `MSRF Numbers` |
| Legend | `<span class='msrf_normal'>Normal</span> - <span class='msrf_important'>Important</span> - <span class='msrf_vortex'>Vortex</span>` |
| Body | Every element of `MSRF_FILTER__FINAL`, comma-space separated, each wrapped in `<span class='{filterMatch.css_class}'>` |
| Error path | If `getMsrfMatch(n)` returns `null`, the *entire* list is replaced by `Programmer Error: Unclassified filter number: {n}` and the loop `break`s. |
| Dead (commented out) | An `Operations` section listing every `OPHIS_OPERATIONS` equation with constants substituted (`ophis_view.js:646-704`), plus the removed bullets at `:608-609` about pre-last-X-Date Z-Dates and the half-baked Debug screen. |

**Dialogs:**

| Where | Copy |
|---|---|
| `ophis_view__utils.js:442-444` | `WARNING: Minifying means that all settings, operations, and other configuration which match current program defaults will be removed from the file. If defaults ever change in a future version and you open your file in that version, it will use the newer defaults, which can result in different output. Are you sure you want to enable minifying?` |
| `ophis_view__utils.js:446` | no-button `NO, do not enable minifying`, yes-button `YES, enable minifying` |
| `showOkDialog` | no-button `OK` |
| `ophis_main.js:679` (dependency) | `Are you sure you want to leave?` (browser-only `beforeunload`) |

**Master-checkbox tooltips** (`ophis_view__config.js`):

| Config | `title` |
|---|---|
| X-Dates | `Enable/Disable all X-Dates` |
| T-Dates | `Enable/Disable all T-Dates` |
| Iso-Event Filters | `Enable/Disable all Filters` |
| Chart Options | `Enable/Disable all Chart Options` |
| Operations | `Enable/Disable all Operations` |
| Iso-Event Swap | `Enable/Disable all Destination Iso-Events` |
| Iso-Event Swap Setting | `Enable/Disable all Settings` |

**Enum → label tables** (all with a trailing space):

`getEventScopeName` (`ophis_view__strings.js:256-273`): `EVENT_SCOPE__HH_MM`→`"HH:MM "`, `EVENT_SCOPE__DAYS`→`"Days "`, `EVENT_SCOPE__MONTHS`→`"Months "`, `EVENT_SCOPE__YEARS`→`"Years "`, unknown→`"no-name "`.

`getEventTypeName` (`:275-289`): `EVENT_TYPE__PERSONAL`→`"Personal "`, `EVENT_TYPE__ASTROLOGICAL`→`"Astrological "`, `EVENT_TYPE__MARKETS`→`"Markets "`, unknown→`"no-name "`.
*(The parameter is misnamed `eventScope`.)*

`getScreenName` (`:291-317`): see §1.3; unknown→`"no-name "`.

Lat/long input tooltips (`generateLatOrLongInput`, `:14-17`): `Latitude` / `Longitude`.

### 4.3 `ophis_view__strings.js` — function reference

```ts
generateLatOrLongInput(latOrLong: "lat"|"long"): string   // :14-17
```
```html
<input type='text' title='Latitude|Longitude' value=''
       style='height:26px; ' class='lat_input general_input'></input>
```
(`</input>` is invalid but harmless; the class prefix is the raw `COORD_LAT`/`COORD_LONG` value.)

```ts
getZValueReadable(zValueRaw, operationOrdinal = null): string   // :19-29
```
`intToDecimalString(zValueRaw) + (zValueRaw == 1 ? "&nbsp;day" : "&nbsp;days")`. `operationOrdinal` is accepted but unused (the branch that used it is commented out).

```ts
generateTableToolTip(titles: string[], values: string[]): string   // :31-48
```
Returns `""` when `FEATURE_FLAG__SHOW_MSRF_AND_OPERATION_PILL_TOOL_TIPS !== true` (flag is `true`, `ophis_config.js:293`). Otherwise:
```html
<table style="border:1px solid white; white-space:nowrap;">
  <tr><td class="tool_tip_table_border tool_tip_table_left_row">{title}</td>
      <td class="tool_tip_table_border" >{value}</td></tr>   <!-- repeated -->
</table>
```
Iterates on `titles.length`; a shorter `values` array yields `undefined` cells.

```ts
replaceOperationConstants(operationEquation: string): string   // :50-56
```
Three **non-global** `String.replace` calls in order: `"OPH_CRV"` → `OPH_CRV`, `"OPH_PI"` → `OPH_PI`, `"OPH_PHI"` → `OPH_PHI`. **Only the first occurrence of each token is replaced.** Order matters: `OPH_CRV` first, then `OPH_PI` — and because `"OPH_PI"` is not a prefix of `"OPH_PHI"` (`PI` vs `PH`), there is no accidental collision.

```ts
getRowShortNameHtml(letter: string, subscriptOrZeroBasedOrdinal, useSubscript = true): string   // :58-68
```
* `useSubscript === true`: if `isNonNegIntOrStringThereof(ordinal)` then `ordinal = ordinal + 1` (**string `"3"` + 1 → `"31"`**, see §11); returns `letter + "<sub>" + ordinal + "</sub>"`.
* else: returns `letter + ordinal` with **no** +1 applied.

```ts
disableRowButton(rowButtonElem): void   // :70-80
```
If not a radio → `style.opacity = OPACITY__DISABLED (0.5)`; if a radio → `parentElement.style.cursor = "not-allowed"`. Then always: `style.cursor="not-allowed"`, `style.color="grey"`, `disabled = true`.

```ts
enableRowButton(rowButtonElem): void   // :94-109
```
If radio → `parentElement.style.cursor = "pointer"`. Then `opacity = 1.0`, `cursor = "pointer"`, and `color = "red"` if the element carries class `row_delete_button` or `row_delete_button_master`, else `"black"`. `disabled = false`.
**Asymmetry:** `disableRowButton` never resets `parentElement.style.cursor` for non-radios, and `enableRowButton` uses the literal `1.0` rather than `OPACITY__ENABLED`.

```ts
readableMsrfMatchString(rotationCountZ, filterMatch): string   // :82-92
```
* exact (`rotationCountZ === filterMatch.msrf_number`, **strict**): `"{z} = {readable_name}"`
* else: `"{z} &asymp; {msrf_number} ({readable_name})"`
(`readable_name` ∈ `"Normal" | "Important" | "Vortex"`, from `getMsrfMatch`, `ophis_utils.js:157-168`.) Line `:88` has a stray double semicolon.

```ts
convertHtmlToPlainText(htmlString: string): string   // :111-123
```
Creates a detached `<div>`, sets `innerHTML`, returns `textContent || innerText || ""`. **This parses arbitrary HTML** — see §7.

```ts
readableAxialRotations(numericValue): string   // :125-133
```
Returns `intToDecimalString(numericValue) + " days"`. The name is a leftover from an earlier "axial rotations" vocabulary; the pluralisation branch is commented out.

```ts
readableLatLong(lat, long): string   // :135-137
```
`"lat=" + lat + "&nbsp;&nbsp;&nbsp;long=" + long + ""`.

```ts
readablePointsString(numericPoints): string   // :139-148
```
`<span class='about_screen_points'>{n} point</span>` when `numericPoints == 1` (loose `==`), else `{n} points`.

```ts
newXDate(date: string, time: string): XDate   // :150-156
```
```ts
{ date: string, time: string, enabled: true }
```

```ts
cloneNativeDate(nativeDate: Date): Date                 // :158-160   new Date(d.getTime())
nativeDateToXDate(nativeDate, lat = null, long = null): XDate   // :162-169
```

```ts
nativeDateToReadableString_dateOnly(nativeDate, lat = null, long = null): string   // :171-193
nativeDateToReadableString_timeOnly(nativeDate, lat = null, long = null): string   // :195-217
```
Both branch on `isValidLatAndLong(lat, long)`:
* **valid** → `convertNativeUtcDateToLocalMoment(nativeDate, lat, long)` and read `.month()+1 / .date() / .year()` and `.hours() / .minutes()`.
* **invalid/null** → read the *operator's browser-local* components: `getMonth()+1`, `getDate()`, `getFullYear()`, `getHours()`, `getMinutes()`.

```ts
nativeDateToReadableString_dateAndTime(nativeUtcDate, lat, long, includeHtmlForTime = true): string   // :219-225
```
`dateOnly + (includeHtmlForTime ? "<span style='margin-left:3px;' class='has_clock_font'>" : " ") + timeOnly + (includeHtmlForTime ? "</span>" : "")`.

```ts
dateComponentsToStandardString(year, oneBasedMonth, oneBasedDay): string   // :227-229
```
`YYYY-MM-DD` (`STANDARD_DATE_DELIMITER = "-"`), month/day zero-padded.

```ts
dateComponentsToReadableString(year, oneBasedMonth, oneBasedDay): string   // :231-233
```
`MM/DD/YYYY` (`DATE_DELIMITER = "/"`). **Year is NOT zero-padded here.**

```ts
timeComponentsToStandardString(hours_24, minutes): string   // :235-242   "HH:MM"
dateAndTimeComponentsToStandardString(y, m, d, h, min): string   // :244-246   "YYYY-MM-DD HH:MM"
nativeUtcDateToStandardString_dateAndTime(nativeUtcDate): string   // :248-250  uses getUTC* accessors
padWithLeadingZeroIfLessThan10(value): string|number   // :252-254  value < 10 ? "0"+value : value
```

---

## 5. `ophis_view__config.js` — EVERY VIEW-LEVEL CONFIGURATION VALUE

### 5.1 Scalars & literals

| Name | Value | Line | Consumers |
|---|---|---|---|
| `TRANSPARENT_PIXEL_DATA_URI` | `"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"` | 2 | `ophis_view__utils.js` |
| `SKIN_MODE__CLASSIC` | `"SKIN_MODE__CLASSIC"` | 5 | `ophis_view.js`, `ophis_main.js` |
| `SKIN_MODE__ASTROLOGICAL` | `"SKIN_MODE__ASTROLOGICAL"` | 6 | ditto |
| `SKIN_MODE__MARKETS` | `"SKIN_MODE__MARKETS"` | 7 | ditto |
| `DEFAULT_SKIN_MODE` | `SKIN_MODE__CLASSIC` | 8 | `ophis_view.js:59`, `ophis_main.js:36` |
| `KEY_CODE__ENTER` | `13` | 10 | `ophis_view__utils.js:635, 862` |
| `NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT` | `"No results. You probably have to loosen up a filter."` | 12 | `ophis_model__operations.js`, `ophis_view__chart.js`, `ophis_view__output.js` |
| `FILE_NOT_SAVED_TEXT` | `"(Not Saved)"` | 14 | `ophis_view.js:80`, `ophis_view__utils.js:547` |
| `FILE_SAVED_TEXT` | `"(Saved)"` | 15 | `ophis_view.js:82`, `ophis_view__utils.js:551` |
| `OPERATION_PILLS_PER_ROW` | `3` | 17 | `ophis_view__output.js` |
| `MSRF_PILLS_PER_ROW` | `1` | 18 | `ophis_view__output.js` |
| `PILL_WIDTH_IN_PX` | `100` | 19 | `ophis_view__output.js` |
| `COLOR__OPERATION_ALPHA` | `"rgba(184, 134, 11, 1.0)"` (= `darkgoldenrod`) | 21 | `ophis_view__chart_datasets.js` |
| `COLOR__OPERATION_BETA` | `"rgba(0, 192, 255, 1.0)"` (= `#00c0ff`) | 22 | `ophis_view__chart_datasets.js` |
| `COLOR__TRANSPARENT` | `"rgba(0,0,0,0)"` | 23 | `ophis_view__chart_datasets.js` |
| `SCREEN_SPECIFIC_HEADER_MARGIN_LEFT` | `"margin-left:0px;"` | 25 | `ophis_view.js:365, 480`, `ophis_view__output.js` |
| `COLOR__MSRF_NORMAL` | `"#2ede69"` | 27 | `ophis_view__chart_datasets.js` |
| `COLOR__MSRF_IMPORTANT` | `"#b80b0b"` | 28 | `ophis_view__chart_datasets.js` |
| `COLOR__MSRF_VORTEX` | `"purple"` | 29 | `ophis_view__chart_datasets.js` |
| `OPHIS_PANEL_BORDER_SPACING` | `10` | 31 | `ophis_view__rebuild.js` |
| `LAT_INPUT_HTML` | `generateLatOrLongInput(COORD_LAT)` — **evaluated at script-load time** | 33 | `ophis_view__rebuild.js` |
| `LONG_INPUT_HTML` | `generateLatOrLongInput(COORD_LONG)` — ditto | 34 | `ophis_view__rebuild.js` |
| `RIGHT_ARROW_HTML` | `"&rarr;"` | 35 | `ophis_view__output.js` |
| `DOWN_ARROW_HTML` | `"&darr;"` | 36 | **DEAD** |
| `LEFT_ARROW_HTML` | `"&larr;"` | 37 | **DEAD** |
| `DEFAULT_LAT` | `32.8` (comment: "Dallas Texas Area") | 40 | `ophis_controller.js`, `ophis_model__validation.js` |
| `DEFAULT_LONG` | `-96.8` | 41 | ditto |
| `DEFAULT_MAP_SELECTION_ZOOM` | `4` | 43 | `ophis_view__utils.js:419`, `ophis_main.js:11` |
| `MAP_MIN_ZOOM` | `0` (comment: "all the way zoomed out") | 44 | **DEAD** |
| `MAP_MAX_ZOOM` | `5` (comment: "tiles are only generated up to this point") | 45 | `ophis_main.js` |
| `TOOL_TIP_DELAY_IN_MILLISECONDS` | `750` | 47 | `ophis_dependencies.js:230` |
| `ALLOW_FLATPICKR_INPUT` | `true` | 49 | the four flatpickr config factories below |
| `MIN_DATE_AND_TIME_FIELD_WIDTH` | `"155px"` | 113 | `ophis_view__output.js`, `ophis_view__rebuild.js` |
| `MIN_DATE_FIELD_WIDTH` | `"103px"` | 114 | ditto |
| `MIN_TIME_FIELD_WIDTH` | `"65px"` | 115 | `ophis_view__settings.js` |
| `OPACITY__DISABLED` | `0.5` | 117 | `ophis_view.js`, `ophis_view__strings.js`, others |
| `OPACITY__ENABLED` | `1.0` | 118 | ditto |
| `DEFAULT_STARTING_SCREEN` | `OPHIS_SCREEN__Z_DATES` | 130 | `ophis_model__persistence.js:339, 343` |

Also defined in `ophis_view.js` (not the config file): `var OVERFLOW_FOR_SCROLL_ENABLED = "scroll";` (`ophis_view.js:3`).

### 5.2 Flatpickr configuration factories

All four are **functions returning a fresh object** (never shared instances), and all set `allowInput: ALLOW_FLATPICKR_INPUT` (= `true`).

```js
FLATPICKR_BASE_DATE_CONFIG__HH_MM__TIME_ONLY()   // :51-59
{ dateFormat: X_DATE_TIME_DISPLAY_FORMAT /* "H:i" */,
  noCalender: true,          // <-- MISSPELLED; the real flatpickr option is `noCalendar`
  enableTime: true, time_24hr: true, allowInput: true }

FLATPICKR_BASE_DATE_CONFIG__HH_MM()              // :61-68
{ dateFormat: X_DATE_INPUT_DISPLAY_FORMAT /* "m/d/Y H:i" */,
  enableTime: true, time_24hr: true, allowInput: true }

FLATPICKR_BASE_DATE_CONFIG__DAYS()               // :70-77
{ dateFormat: X_DATE_CAL_DISPLAY_FORMAT /* "m/d/Y" */,
  enableTime: false, time_24hr: false, allowInput: true }

FLATPICKR_BASE_DATE_CONFIG__MONTHS()             // :79-94
{ dateFormat: X_DATE_CAL_DISPLAY_FORMAT__MONTHS /* "m/Y" */,
  enableTime: false, time_24hr: false, allowInput: true,
  plugins: [ new monthSelectPlugin({ shorthand: true,
                                     dateFormat: "m/Y",
                                     altFormat: "F Y",
                                     theme: "light" }) ] }

FLATPICKR_BASE_DATE_CONFIG__YEARS()              // :96-111
{ dateFormat: X_DATE_CAL_DISPLAY_FORMAT__YEARS /* "Y" */,
  enableTime: false, time_24hr: false, allowInput: true,
  plugins: [ new monthSelectPlugin({ shorthand: true,
                                     dateFormat: "Y",
                                     altFormat: "F Y",
                                     theme: "light" }) ] }
```

Format constants come from `ophis_config.js:273-279` (dependency):
`DATE_DELIMITER = "/"`, `STANDARD_DATE_DELIMITER = "-"`, `X_DATE_CAL_DISPLAY_FORMAT = "m/d/Y"`, `X_DATE_CAL_DISPLAY_FORMAT__MONTHS = "m/Y"`, `X_DATE_CAL_DISPLAY_FORMAT__YEARS = "Y"`, `X_DATE_TIME_DISPLAY_FORMAT = "H:i"`, `X_DATE_INPUT_DISPLAY_FORMAT = "m/d/Y H:i"`.

> The `YEARS` config still uses `monthSelectPlugin` — a year-only picker built out of a month picker. Not a bug per se, but surprising.

### 5.3 Master-checkbox registry

```ts
newMasterCheckbox(
  baseElemId: string,
  baseClassName: string,
  title: string,
  onChildNowCheckedOrNot: (rowIndex: number, nowChecked: boolean) => void,
  onMasterCheckboxChangeComplete: (indexOrUndefined?) => void
): MasterCheckboxConfig                                  // :146-154
```
Returns `{ baseElemId, baseClassName, title, onChildNowCheckedOrNot, onMasterCheckboxChangeComplete }`.
*(Line 151 uses ES6 shorthand `onChildNowCheckedOrNot,` while the neighbours are explicit — semantically identical, just inconsistent.)*

| Config | `onChildNowCheckedOrNot(i, checked)` | `onMasterCheckboxChangeComplete()` |
|---|---|---|
| **X_DATES** (`:156-170`) | `getCurrentIsoEvent().x_dates[i].enabled = checked` | `flushChangesToDisk()`; `refreshXDates(REFRESH_TYPE__HARD, /*preserveScroll*/ true, OPHIS_INPUT_CHANGE__CHANGED)` |
| **T_DATES** (`:172-186`) | `getCurrentIsoEvent().t_dates[i].enabled = checked` | `flushChangesToDisk()`; `refreshXDates(REFRESH_TYPE__HARD, true, OPHIS_INPUT_CHANGE__CHANGED)` |
| **ISO_EVENT_FILTERS** (`:227-235`) | `serializedFieldMasterCheckboxConfig_onChildNowCheckedOrNot(i, checked, MASTER_CHECKBOX_CONFIG__ISO_EVENT_FILTERS)` | `serializedFieldMasterCheckboxConfig_onMasterCheckboxChangeComplete` |
| **CHART_OPTIONS** (`:237-245`) | same helper with `MASTER_CHECKBOX_CONFIG__CHART_OPTIONS` | same helper |
| **OPERATIONS** (`:247-261`) | `getCurrentIsoEvent().operations[i].enabled = checked` | `flushChangesToDisk()`; `refreshXDates(REFRESH_TYPE__RIGHT_PANEL_ONLY, /*preserveScroll*/ false, OPHIS_INPUT_CHANGE__CHANGED)` |
| **ISO_EVENT_SWAP** (`:263-279`) | `appState.isoEvents[i].checked_for_swap_target = checked` | `refreshIsoEventSwapRows()`; `refreshMasterCheckboxBasedOnChildChange(baseElemId, baseClassName)` — **no disk flush** (commented out) |
| **ISO_EVENT_SWAP_SETTING** (`:281-293`) | `ISO_EVENT_DATA_TRANSFERS[i].checkboxEnabled = checked` | `refreshIsoEventSwapRows()`; `refreshMasterCheckboxBasedOnChildChange(...)` |

**Shared helpers:**

```ts
serializedFieldMasterCheckboxConfig_onChildNowCheckedOrNot(index, nowChecked, masterCheckboxConfig): void   // :188-199
```
1. Pick array: `masterCheckboxConfig == MASTER_CHECKBOX_CONFIG__ISO_EVENT_FILTERS ? SERIALIZED_FILTER_FIELDS : SERIALIZED_CHART_OPTION_FIELDS` — **identity comparison, not a type tag**.
2. `ithFilterField = serializedFieldArray[index]`.
3. `wasAlreadyChecked = currentIsoEvent[serializationKey] ? true : false` (truthiness, not `=== true`).
4. `currentIsoEvent[serializationKey] = nowChecked`.
5. If `wasAlreadyChecked != nowChecked` → `appState.justChangedField[ithFilterField.varName] = true`.

```ts
serializedFieldMasterCheckboxConfig_onMasterCheckboxChangeComplete(): void   // :201-225
```
1. `removeAllDisplayedToolTips()`.
2. `flushChangesToDisk()`.
3. `showCartField = getIsoEventField("SERIALIZED_FIELD__CHART_OPTION__SHOW_CHART")` *(sic: "Cart")*.
4. `isShowChartFieldChecked = currentIsoEvent[showCartField.serializationKey] ? true : false`.
5. `didShowChartFieldJustChange = appState.justChangedField[showCartField.varName] ? true : false`.
6. `forceInputChange = didShowChartFieldJustChange && isShowChartFieldChecked`.
7. `refreshXDates(REFRESH_TYPE__SOFT, /*preserveScrollPosition*/ false, forceInputChange ? OPHIS_INPUT_CHANGE__FORCE : OPHIS_INPUT_CHANGE__CHANGED)`.

`MASTER_CHECKBOX_CONFIGS` (`:295-303`) lists all seven, in the order above. `refreshCurrentPage` walks this array on every render (`ophis_view.js:318-322`) calling `refreshMasterCheckboxBasedOnChildChange(baseElemId, baseClassName)`.

---

## 6. `ophis_view.js` — FUNCTION BY FUNCTION

### 6.1 `recenterChartOnStartup()` — `:5-17`

```js
setTimeout(function() {
    blockChartFlushToDiskUntilUserInteraction();
    recenterChartIfNeeded();
}, 50);
```
The 50 ms is load-bearing per the comment: "can't be below 40 milliseconds … otherwise the recentering doesn't take." The comment also notes `chartjs.resizeDelay` already fixed the underlying issue, but the workaround was kept.

### 6.2 `setSkinModeBasedOnCurrentEventType()` — `:27-40`

Reads `getCurrentIsoEvent().type` and maps:

| `type` | skin |
|---|---|
| `EVENT_TYPE__PERSONAL` | `SKIN_MODE__CLASSIC` |
| `EVENT_TYPE__ASTROLOGICAL` | `SKIN_MODE__ASTROLOGICAL` |
| `EVENT_TYPE__MARKETS` | `SKIN_MODE__MARKETS` |

Always with `shouldFlushChangesToDisk = false`. Unknown types leave the skin unchanged.

### 6.3 `setSkinMode(skinMode, shouldFlushChangesToDisk = true)` — `:42-54`

1. `setGlobalOption(GLOBAL_OPTION__SKIN_MODE /* "skin_mode" */, skinMode, shouldFlushChangesToDisk)`.
2. Set `#header-image.src`: `"img/header.png"` for CLASSIC **and** ASTROLOGICAL (identical branches, `:46` and `:48`), `"img/header_markets.png"` for MARKETS.
3. `refreshWindowTitle()`.

### 6.4 `refreshWindowTitle(showSaveStatus = true)` — `:56-91`

1. `skinMode = appState.globalOptions["skin_mode"] || DEFAULT_SKIN_MODE`.
2. Base title per §4.2.
3. If `appState.globalOptions["current_file_path"]` is truthy → append `" (" + path + ")"`.
4. `showSaveStatus = showSaveStatus === true && appState.initialized === true`.
5. If showing: append `" (Not Saved)"` when `appState.hasUnsavedChanges == true`, else `" (Saved)"`.
6. `document.title = documentTitle`.
7. If `#app-version` exists → `.innerHTML = "v" + APP_VERSION`.

`APP_VERSION` starts as `"12.0"` (`ophis_config.js:3`) but `ophis_main.js:96-115` rewrites it from `package.json`: `"12.0.0"` → second semver component is `"0"` → `APP_VERSION = "12"`. Rendered title: **"Ophis v12"**.

### 6.5 `refreshCurrentPage(...)` — `:93-325` — THE ROUTER

```ts
refreshCurrentPage(
  refreshType: REFRESH_TYPE__RIGHT_PANEL_ONLY | REFRESH_TYPE__SOFT | REFRESH_TYPE__HARD,
  results: ResultsBundle,
  callUpdateChartDatasets: boolean = true,
  setOverflowForScrollContainers: boolean = true,
  forceRedraw: boolean = false
): void
```

**Step 1 — first-render bootstrap (`:97-133`).**
`appState.viewUpdateCount += 1`. If it is now exactly `1`, schedule `setTimeout(..., 500)`:
* `#initial-loading-container.classList.add("fade_out_loading_image")`
* `#panel-container.style.visibility = "visible"`, `classList.add("fade_in_panels")`
* nested `setTimeout(..., 1000)` removing `#initial-loading-container` from its parent
* `requestAnimationFrame`: `blockChartFlushToDiskUntilUserInteraction()`; `setOverflowOnScrollContainers("scroll")`; if `appState.loadedFromDisk` **and** `GLOBAL_OPTION__CURRENT_FILE_PATH` is falsy → `showToast("Successfully loaded previous session.")` (when a file path exists, the startup toast was already shown elsewhere)
* `recenterChartOnStartup()`

Else (`viewUpdateCount > 1`), if `setOverflowForScrollContainers === true`, in a `requestAnimationFrame` call `setOverflowOnScrollContainers("scroll")` **twice in a row** — the comment at `:127-128` says "Have to call this twice, prolly cause layout code just got too scrambled."

**Step 2 — results bookkeeping (`:135-137`).**
`previousResults = appState.latestResults`; `appState.latestResults = results`.

**Step 3 — debug log (`:139-141`).** `if (isFlagEnabled(FEATURE_FLAG__SHOW_PAGE_REFRESHES_IN_CONSOLE)) console.log("Refreshing Page...")` — flag is `false`.

**Step 4 — decide whether to clear (`:153-192`).**
```js
var screenSpecificArea = document.getElementById("screen-specific-area");
var currentScreen  = getCurrentScreen();
var previousScreen = appState.previousScreen;
appState.previousScreen = currentScreen;
var currentIsoEvent = getCurrentIsoEvent();

var callClearOutputContainer = true;
var previousScreenSameAsCurrentScreen = previousScreen == currentScreen;

if ( forceRedraw === false ) {
    if ( previousScreenSameAsCurrentScreen ) {
        if ( refreshType == REFRESH_TYPE__RIGHT_PANEL_ONLY ) {
            if ( currentScreen != OPHIS_SCREEN__ABOUT && currentScreen != OPHIS_SCREEN__EXPORT_X_DATES ) {
                callClearOutputContainer = false;
            }
        }
        if ( currentScreen == OPHIS_SCREEN__Z_DATES ) {
            if ( results.stale === true ) {
                if ( refreshType == REFRESH_TYPE__RIGHT_PANEL_ONLY ) {
                    callClearOutputContainer = true;
                } else {
                    callClearOutputContainer = false;
                }
            }
        } else if ( currentScreen == OPHIS_SCREEN__EVENT_SETTINGS ) {
            callClearOutputContainer = true;
        }
    }
}

if ( callClearOutputContainer === true) {
    destroyFlatPickrInstance(document.getElementById("current-local-time"));
    screenSpecificArea.innerHTML = "";
    clearOutputContainer();
}
```
The ordering note at `:143-152` is important: the screen-specific area **must** be cleared before `clearOutputContainer()`, otherwise a blur event fired by wiping `screenSpecificArea` re-enters `refreshCurrentPage` and duplicates every output row. The recursion itself was later killed by the `onValidDateEntered_calling` guard in `setUpDateInput`, but the ordering is retained defensively.

**Step 5 — merge startup errors (`:194`).**
```js
results.errors = results.errors.concat(appState.startupErrors);
```
**This mutates `results` in place** — see §12.2.

**Step 6 — "just fixed errors" latch (`:196-203`).**
`appState.justFixedErrors = true` iff `previousResults != null && previousResults.errors && previousResults.errors.length > 0 && results.errors.length == 0`. It is reset to `false` at `:273`, *after* the render dispatch — so renderers can read it, nobody else can.

**Step 7 — error branch (`:205-228`).**
If `results.errors.length > 0`:
* possibly force-navigate to Z-Dates (see §1.5)
* `results.processed_z_dates = []`, `results.processed_z_dates__sorted_by_date = []`
* `refreshDatesHidden(0)`

Else:
* `totalNumberOfZDates = getDictionarySize(results.z_structs)`
* `filteredNumberOfZDates = results.processed_z_dates.length`
* `refreshDatesHidden(totalNumberOfZDates - filteredNumberOfZDates)`

**Step 8 — render dispatch (`:230-271`), in exactly this if/else-if order:**

| Screen | Behaviour |
|---|---|
| `Z_DATES` | `setUpCondensedOutputOptionsControls(results)`. Then if `previousScreenSameAsCurrentScreen`: render only when `forceRedraw === true \|\| results.stale === false \|\| (results.stale === true && refreshType == REFRESH_TYPE__RIGHT_PANEL_ONLY)`. Otherwise (screen changed) always `renderCondensedOutputElseErrors(results)`. |
| `DEBUG` | `results.errors.length > 0 ? renderErrors(results.errors) : renderDebugOutput(results)` |
| `ABOUT` | `renderAbout(results)` |
| `EXPORT_X_DATES` | `renderExportXDates()` |
| `IMPORT_X_DATES` | `renderImport()` |
| `EVENT_SETTINGS` | `renderEventSettings()` **only if `callClearOutputContainer === true`** |
| `EXPORT_Z_DATES` | `renderExportZDates()` |
| `OPERATIONS` | `callClearOutputContainer ? renderOperations() : refreshOperationRows()` |
| `EVENT_SWAP` | `callClearOutputContainer ? renderIsoEventDataTransfer() : /* nothing — refreshOperationRows() is commented out */` |

**Step 9 — stale/fresh chrome (`:275-316`).**
```js
zDatesUpToDate.style.width = "101px";   // TODO at :278-279: should be two elements, not a hardcoded width

if ( results.stale === true ) {
    outputContainer.style.opacity = (currentScreen == OPHIS_SCREEN__Z_DATES) ? 0.5 : 1.0;
    enableStandardButton(#recalculate-z-dates-button);
    zDatesUpToDate.className = "error_color";  zDatesUpToDate.innerHTML = "Stale";
    if ( results.errors.length > 0 ) { hideChartElem(); }
    else { getChartElem().style.opacity = 0.5; }
    getChartErrorMessageWrapperElem().style.opacity = 0.5;
} else {
    outputContainer.style.opacity = 1.0;
    disableStandardButton(#recalculate-z-dates-button);
    zDatesUpToDate.className = "green_color"; zDatesUpToDate.innerHTML = "Up-to-date";
    getChartElem().style.opacity = 1.0;
    if ( callUpdateChartDatasets === true ) { updateChartDatasets(results); }
    getChartErrorMessageWrapperElem().style.opacity = 1.0;
}
```
Note `outputContainer` here is `#scrollable-container-for-output-container`, **not** `#output-container` — the local variable name is misleading (`:275`).
Note also: in the fresh branch the chart element's opacity is restored **before** `updateChartDatasets`, and `hideChartElem()` is never undone in this function — only the opacity is.

**Step 10 — master checkboxes (`:318-322`).** For each of the seven `MASTER_CHECKBOX_CONFIGS`, `refreshMasterCheckboxBasedOnChildChange(cfg.baseElemId, cfg.baseClassName)`.

**Step 11 — `handleJustChangedFields(currentIsoEvent)` (`:324`).** One argument only — see §11.9.

### 6.6 `getCurrentScreen()` — `:327-332`
Returns `document.getElementById("current-screen").value`.

### 6.7 `clearOutputContainer()` — `:334-343`
1. `destroyFlatPickrInstance(document.getElementById("event-day-scope-start-time"))` — the comment at `:337` admits this is "somewhat lazy": it is destroyed unconditionally rather than only when leaving Event Settings.
2. `getOutputContainer().innerHTML = ""`.
3. `removeAllDisplayedToolTips()` (`$(".tipsy").remove()`).

### 6.8 `renderErrors(errors, clearDatesHidden = true)` — `:345-359`
```html
<!-- header row -->
<td class="col_sub_header_format" style="width:50%;">Errors</td>
<!-- one row per error -->
<td style='width:33.33%;' class='col_format'>
  <div class='col_output_text error_color'>{error}</div></td>
```
Then `refreshDatesHidden(0)` when `clearDatesHidden === true`.
Errors are injected as raw HTML (`innerHTML`). The 50% / 33.33% widths are inconsistent — cosmetic only.

### 6.9 `renderExportXDates()` — `:361-437`

1. Header row: `<td class="col_sub_header_format" style="width:50%;"><div style='margin-right:10px;'>Paste into any Text Editor</div></td>`.
2. `#screen-specific-area.innerHTML =` Copy button + Export File button + Prettify checkbox + Minify checkbox (HTML per §4.2 / `createGlobalOptionCheckboxHtml`).
3. `hookUpGlobalOptionCheckbox("prettify-x-date-output", GLOBAL_OPTION__PRETTIFY_X_DATE_EXPORT_OUTPUT)` and `hookUpGlobalOptionCheckbox("minify-x-date-output", GLOBAL_OPTION__MINIFY_X_DATE_EXPORT_OUTPUT)`.
4. Content row, one `<td style='text-align:center;' class='col_format'>` containing:
   * `saveBlob = getSaveBlob(SAVE_BLOB_MODE__JUST_THE_EVENTS, prettify, minify)` (`ophis_model__persistence.js` — dependency).
   * If `isRunningElectron()` → prepend `FILE_SAVE_AND_OPEN_SUGGESTION` and set the note prefix to `"ALSO NOTE: "`; else prefix `"NOTE: "`.
   * `<div class='warning_color about_body'>{prefix}The below code can be pasted into any text editor. It ONLY contains INPUT like X-Dates, Iso-Event names, lat/long, etc., with ZERO Output Z-Dates, Scores, Hits, etc.</div>`
   * If prettified: `<code style='text-align:left;'><pre style=''>{saveBlob}</pre></code>`; else `<code style=''>{saveBlob}</code>`.
5. Copy button: take **the last** `.click_to_copy_button`; if present, `applyToolTip(btn)` and on click → `navigator.clipboard.writeText(saveBlob)`, `showToast("Copied to clipboard!")`, `markChangesSaved()`.
6. `#export-x-dates-as-oph-file`: `applyToolTip`, on click → `writeStringToFile(saveBlob, "Export.oph")`. **Not existence-guarded** — throws if the render was skipped.

### 6.10 `renderEventSettings()` — `:439-475`

1. `#screen-specific-area.innerHTML = getRowShortNameHtml("E", appState.globalOptions.current_iso_event_index) + " Settings"`.
2. Header row (three `<td>`s):
   ```html
   <td style="width:0%; background:white;" class="col_sub_header_format"><div style="width:0px;"></div></td>
   <td id="event-source-header" title="" style="width:0%; white-space:nowrap;"
       class="col_sub_header_format tool_tippable_cursor">Setting Name</td>
   <td id="event-source-header" title="" style="width:100%; white-space:nowrap;"
       class="col_sub_header_format tool_tippable_cursor">Setting Value</td>
   ```
   **Duplicate `id="event-source-header"`.**
3. For each `ISO_EVENT_SETTINGS[i]` (defined in `ophis_view__settings.js:166` — dependency):
   ```html
   <td style='width:0%;' class='col_sub_header_format_for_row'>
     <div class='input_row_name'>S<sub>{i+1}</sub></div></td>
   <td style='padding:5px; text-align:center; width:0%; ' class='col_format col_with_input_left_right_padding'>
     <div class=''>{setting.readableName}</div></td>
   <td style='padding:10px; width:100%;' class='col_format'>{setting.generateHtml()}</td>
   ```
   Row gets `classList.add("iso_event_setting_row")`. Then `setting.setUpListeners()` is invoked **after** the row is in the DOM.

`ISO_EVENT_SETTINGS` item shape (`ophis_view__settings.js:11-17`):
```ts
{ readableName: string, generateHtml: () => string, setUpListeners: () => void }
```

### 6.11 `renderImport()` — `:477-527`

1. Header row: `<td class="col_sub_header_format" style="width:50%;"><div style='margin-right:10px;'>Paste Previously Exported Code</div></td>`.
2. `#screen-specific-area.innerHTML = '<button style="margin-left:0px;margin-right:10px;" class="click_to_load_button add_button large_font bordered small_border_radius">Load</button>'`.
3. Content row `<td style='text-align:center; padding:15px;' class='col_format'>`:
   * `FILE_SAVE_AND_OPEN_SUGGESTION` if `isRunningElectron()`
   * `<textarea class='text_area' style='' rows=10 id='code_load_area' placeholder='Paste previously exported Iso-Events here then click "Load" above.'></textarea>`
4. Take **the last** `.click_to_load_button` and attach a `click` handler:
   * Remove every `.load_error_col` element from its parent (`while (existingErrorCols.length > 0) existingErrorCols[0].parentNode.removeChild(existingErrorCols[0])` — correct handling of the live collection).
   * If the textarea has a value → `showDialog(...)` with the appropriate message per `appState.hasUnsavedChanges`, and on YES → `importIsoEventsFromUserInteraction(textAreaElem.value)`.
   * Else → `showToast("Nothing to load!")`.

### 6.12 `createGlobalOptionCheckboxHtml(elemId, elemClass, checkboxTitle, labelText, margin = 12)` — `:529-534`

```html
<input type='checkbox' style='position:relative;top:2px; margin-left:{margin}px;'
       id='{elemId}' class='{elemClass}' title='{checkboxTitle}' />
<label style='cursor:pointer;margin-left:1px;' title='{checkboxTitle}'
       id='{elemId}-label' for='{elemId}'>{labelText}</label>
```
Also used by `ophis_model__persistence.js:350` for `auto-recalculate-z-dates-checkbox` (label `"Auto"`, class `auto_recalculate_z_dates_checkbox`, margin `7`, title `"Auto-Recalculate Z-Dates on every Input change."`).

### 6.13 `hookUpGlobalOptionCheckbox(elemId, globalOption, onChangeElseRefreshCurrentPage = null)` — `:536-572`

1. Bail silently if `#elemId` is absent.
2. `checkBoxElem.checked = appState.globalOptions[globalOption]`.
3. Define `onChange()`: re-look-up the element by id (avoids stale closures across re-renders), read `.checked`, `setGlobalOption(globalOption, shouldNowBeChecked)`, then either the supplied callback with `shouldNowBeChecked`, or `refreshCurrentPage(REFRESH_TYPE__RIGHT_PANEL_ONLY, appState.latestResults)`.
4. `change` listener with a **minify special case**:
   ```js
   if ( globalOption == GLOBAL_OPTION__MINIFY_X_DATE_EXPORT_OUTPUT
        && appState.globalOptions[GLOBAL_OPTION__MINIFY_X_DATE_EXPORT_OUTPUT] === false ) {
       checkBoxElemInner.checked = false;              // revert visually
       showMinifyWarningDialog(function() {
           checkBoxElemInner.checked = true;           // re-check on confirm
           onChange();
       });
   } else { onChange(); }
   ```
   i.e. the confirmation only appears when turning minify **ON** (stored value currently `false`). Turning it off is immediate. Note the guard uses `=== false`, so an **undefined** stored value skips the dialog entirely.
5. `applyToolTip(checkBoxElem)` and `applyToolTipToElemId(elemId + "-label")`.

### 6.14 `renderAbout(results)` — `:574-748`

`results` is accepted but **never read**.

1. `#screen-specific-area.innerHTML = ""` (the blur checkbox is disabled at `:576`).
2. Header row:
   ```html
   <td class="col_sub_header_format" style="width:50%;">
     <table style="width:100%;"><tr>
       <td style="width:20%;"></td>
       <td style="text-align:center; width:60%;">Please Read Carefully Before Use</td>
       <td style="width:20%; text-align:right; padding-right:10px;"></td>
     </tr></table></td>
   ```
3. Content row: `<td style='' class='col_format'><div id='about-screen-text' class='col_output_text'> … </div></td>` containing the sections in §4.2.
4. MSRF list loop (`:714-735`): for each `MSRF_FILTER__FINAL[i]`, `filterMatch = getMsrfMatch(n)`; if non-null wrap in `<span class='{filterMatch.css_class}'>{n}</span>` joined by `", "`; if null, **replace the whole accumulated string** with `"Programmer Error: Unclassified filter number: " + n` and `break`.
5. `#about-screen-text.style.filter = appState.globalOptions["blur_about_screen"] == true ? "blur(8px)" : ""`.

MSRF source arrays (`ophis_model__params.js:17-57` — dependency): `MSRF_FILTER__NORMAL` (≈320 integers), `MSRF_FILTER__IMPORTANT` (53 integers: `84, 126, 132, 153, 176, 186, 189, 210, 216, 252, 270, 306, 360, 378, 420, 432, 504, 540, 567, 612, 630, 648, 669, 693, 756, 780, 840, 864, 882, 945, 1008, 1080, 1134, 1224, 1260, 1296, 1344, 1404, 1428, 1440, 1512, 1584, 1656, 1728, 1800, 1890, 1980, 2016, 2070, 2160, 2268, 2448, 2520`), `MSRF_FILTER__VORTEX` (12 decimals: `21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4, 762.3, 871.2`). `MSRF_FILTER__FINAL` is the numeric-ascending concat.

### 6.15 `updateLatLongInputElemValues()` — `:750-798`

Walk `i` over `.lat_input`; for each, look up the same index in `.long_input`, `.timezone_display`, `.open_map_icon`, `.location_enabled_checkbox`, and `appState.isoEvents[i]`.

* `latElem.value = isoEvent.lat`; `longElem.value = isoEvent.long`.
* `tz = getTimezone(isoEvent.lat, isoEvent.long)` → `timezoneElem.innerHTML = tz` and `.title = tz`. (The `location_enabled ? … : "Etc/UTC"` variant is commented out at `:769` — location-disabled events still show their coordinate-derived timezone.)
* If `isoEvent.location_enabled` truthy: lat/long `disabled = false`, opacity `1.0`, map icon opacity `1.0` and `cursor = "pointer"`, `locationEnabledCheckbox.checked = true` (guarded).
* Else: `disabled = true`, opacity `0.5` for lat/long/icon, `cursor = "not-allowed"`, `locationEnabledCheckbox.checked = false` (guarded).

---

## 7. TEMPLATING & SANITISATION

**Pattern used: 100% string concatenation into `innerHTML`.** There is no templating engine, no `<template>`, no `textContent` assignment for content (only for reading, in `convertHtmlToPlainText`). The only DOM-API construction is `document.createElement` for structural wrappers (`showToast`, `showDialog`, `adjustSelectElemWidth`, `fillInSelectElem`, `convertHtmlToPlainText`) and `table.insertRow(-1)` for rows — the *contents* of those rows are always assigned as HTML strings.

**Attribute quoting is inconsistent** — the same file mixes `class="x"`, `class='x'`, and (inside `generateTableToolTip`) `class=\"x\"`. No attribute value is ever escaped.

### Sanitisation: **NONE.**

* `lib/purify.min.js` (DOMPurify, 21 537 bytes) **is bundled but never referenced.** Verified: zero occurrences of `DOMPurify` or `purify` in any file under `src/`. The only `sanitize*` identifiers in the codebase are `sanitizeIsoEventsForSaveOperation` (`ophis_model__validation.js:461`, a *field-stripping* routine for the save blob, not HTML sanitisation) and `sanitizeFileName` (`ophis_utils.js:819-825`, `replace(/[^a-zA-Z0-9_.-]/g, '_')` for export filenames).
* **Unescaped injection points inside the four assigned files:**
  1. `renderErrors` — `errorRow.innerHTML = "…<div …>" + ithError + "</div>…"` (`ophis_view.js:353`). Error strings can contain model-derived text.
  2. `renderExportXDates` — `saveBlob` (the full serialised JSON, containing operator-typed Iso-Event names and operation equations) is concatenated into `<code>`/`<pre>` (`ophis_view.js:408, 410`). A name containing `<` or `&` corrupts the displayed blob; a name containing `<img onerror=…>` executes.
  3. `renderEventSettings` — `ithSetting.readableName` and `ithSetting.generateHtml()` output (`ophis_view.js:466-467`).
  4. `showToast(message)` — `newElem.innerHTML = message` (`ophis_view__utils.js:396`). Callers pass HTML deliberately (`getIsoEventFieldReadableTextOnlyName` results).
  5. `showDialog(message, …)` — message inlined into a `<label>` (`ophis_view__utils.js:490`).
  6. `setUpIsoEventFieldCheckboxEventListeners` — `ithField.name` and `ithField.title` inlined; `title` goes into an unescaped `title='…'` attribute (`ophis_view__utils.js:798-799`).
  7. `setUpMasterCheckbox` — `title` inlined into `title="…"` (`ophis_view__utils.js:742`).
  8. `updateLatLongInputElemValues` — `timezoneElem.innerHTML = tz` (`ophis_view.js:772`).
* **Tooltips render HTML too**: tipsy is configured with `html: true` (`ophis_dependencies.js:229`), so every `title` attribute the view writes is parsed as HTML at hover time.
* `convertHtmlToPlainText` (`ophis_view__strings.js:111-123`) sets `innerHTML` on a **detached** div. Detached elements do not run `<script>`, but `<img onerror>` in a detached node does not fire either — this one is effectively safe, though it is a fragile pattern.

**Rewrite recommendation:** replace every `innerHTML` string-build with either (a) template literals passed through an `escapeHtml()` for all interpolated model data, or (b) actual DOM construction. If the string-build approach is kept, wire the already-bundled DOMPurify in at the boundary.

---

## 8. STATE: VIEW-OWNED vs MODEL-READ

### 8.1 State that lives in the DOM (the view layer's real store)

| State | Storage |
|---|---|
| Current screen | `#current-screen` `<select>.value` (read via `getCurrentScreen()`) |
| Row identity | `row_index` attribute on rows/inputs (read via `getRowIndex`) |
| Master-checkbox tri-state | `.checked` / `.indeterminate` on `#<base>-master`, recomputed each render |
| Child checkbox state | `.checked` on the child inputs, rebuilt from the model each render |
| Text being typed | The input's `.value`, with `input` handlers explicitly restoring `valueBefore` after a model round-trip (`ophis_view__utils.js:641-649`) |
| Flatpickr instances | Attached as `elem._flatpickr`; explicitly destroyed on teardown |
| Chart pan/zoom | Chart.js internal (`ophis_view__chart.js` — dependency) |

### 8.2 View-relevant fields of the global `appState` (defined `ophis_main.js:4-31` — dependency)

| Field | Written by these files | Read by these files |
|---|---|---|
| `viewUpdateCount` | `ophis_view.js:97` (`+= 1`) | `:99` (first-render gate) |
| `previousScreen` | `ophis_view.js:157` | `:156` |
| `latestResults` | `ophis_view.js:137` | `ophis_view.js:550`, `ophis_view__utils.js:823` |
| `justFixedErrors` | `ophis_view.js:196, 273` | (renderers in other modules) |
| `justChangedField` (`{[varName]: boolean}`) | `ophis_view__config.js:197`; cleared `ophis_view__utils.js:953` | `ophis_view__config.js:215`; `ophis_view__utils.js:883-895` |
| `globalOptions` (`{[key]: any}`) | via `setGlobalOption` | `ophis_view.js:58, 71, 388-389, 540, 747`; `ophis_view__utils.js:592, 839, 923` |
| `isoEvents[]` | `ophis_view__utils.js:589`; `ophis_view__config.js:269` | `ophis_view.js:764`; `ophis_view__utils.js:412, 620, 852` |
| `hasUnsavedChanges` | (persistence module) | `ophis_view.js:79, 514`; `ophis_view__utils.js:546` |
| `initialized` | (main) | `ophis_view.js:76`; `ophis_view__utils.js:541` |
| `loadedFromDisk` | (main) | `ophis_view.js:113` |
| `startupErrors[]` | (main) | `ophis_view.js:194` |
| `map`, `mapMarkerLayer`, `mostRecentIsoEventMapClick` | `ophis_view__utils.js:416` | `:418-427` |

`appState.intialized` (typo, `ophis_main.js:17`) coexists with `appState.initialized` (`:20`). The view layer consistently reads the correctly-spelled one.

### 8.3 Read fresh from the model on **every** render

`refreshCurrentPage` recomputes, per call: `getCurrentScreen()`, `getCurrentIsoEvent()`, `getDictionarySize(results.z_structs)`, `results.processed_z_dates.length`, and every `appState.globalOptions[...]` it needs. **Nothing is memoised.** Each screen renderer likewise re-reads `getCurrentIsoEvent()`, `ISO_EVENT_SETTINGS`, `MSRF_FILTER__FINAL`, etc. from scratch.

### 8.4 The `results` bundle shape (as consumed here)

```ts
type ResultsBundle = {
  errors: string[];                        // HTML-bearing strings; MUTATED at ophis_view.js:194
  stale: boolean;                          // compared with === true / === false
  z_structs: { [key: string]: ZStruct };   // size via getDictionarySize()
  processed_z_dates: ZDate[];              // emptied at :217 on error
  processed_z_dates__sorted_by_date: ZDate[]; // emptied at :218 on error
  // ...other fields consumed by ophis_view__output.js / ophis_view__chart*.js
};
```
Initial value is `{}` (`ophis_main.js:30`), so any code reading `appState.latestResults.errors` before the first real render sees `undefined`. `refreshDatesHidden` tolerates this (`stale === true` is simply false); `refreshCurrentPage` does not, and must never be called with `{}`.

Other view-layer data shapes:

```ts
type XDate = { date: string /* "MM/DD/YYYY" */, time: string /* "HH:MM" */, enabled: boolean };

type MasterCheckboxConfig = {
  baseElemId: string; baseClassName: string; title: string;
  onChildNowCheckedOrNot: (rowIndex: number, nowChecked: boolean) => void;
  onMasterCheckboxChangeComplete: (index?: number) => void;
};

type SerializedField = {                     // ophis_utils.js:124-146 (dependency)
  varName: string;                           // "SERIALIZED_FIELD__CHART_OPTION__SHOW_CHART"
  serializationKey: string;                  // "chart_option__show_chart"
  serializationKeyForValue: string;          // "chart_option__show_chart_value"
  elemId: string;                            // "chart-option--show-chart-checkbox"
  elemIdForInput: string;                    // "chart-option--show-chart-input"
  enabledByDefault: boolean;
  numericDefault: number | null;             // non-null ⇒ a numeric <input> is expected
  name: string;                              // HTML label
  title: string;                             // tooltip (rendered as HTML by tipsy)
  textOnlyName: string | null;
  zIndex: number;
};

type MsrfMatch = {                           // ophis_utils.js:148-... (dependency)
  msrf_number: number;
  css_class: "msrf_normal" | "msrf_important" | "msrf_vortex";
  readable_name: "Normal" | "Important" | "Vortex";
  points: number;                            // 1 | 2 | 2
};

type IsoEventSetting = { readableName: string; generateHtml: () => string; setUpListeners: () => void };
type IsoEventDataTransfer = { elemId: string; readableName: string;
                              applyToEvent: (src, dst) => void; checkboxEnabled: boolean };
```

---

## 9. SCRIPT LOAD-ORDER REQUIREMENTS

These files are plain `<script>` includes with global `var`s and **top-level side effects**. Required order:

1. `ophis_config.js` — must define `COORD_LAT`, `COORD_LONG`, `X_DATE_*_FORMAT`, `DATE_DELIMITER`, `EVENT_SCOPE__*`, `EVENT_TYPE__*`, `FEATURE_FLAG__*`, `GLOBAL_OPTION__*`, `REFRESH_TYPE__*`, `APP_VERSION`.
2. **`ophis_view__strings.js`** — defines `generateLatOrLongInput`.
3. **`ophis_view__config.js`** — lines 33-34 **call** `generateLatOrLongInput(...)` at load time, and lines 85/103 **call `new monthSelectPlugin(...)` only lazily inside functions** (safe). Lines 156-303 build `MASTER_CHECKBOX_CONFIGS` — the *bodies* reference `MASTER_CHECKBOX_CONFIG__ISO_EVENT_FILTERS` and `ISO_EVENT_DATA_TRANSFERS`, but only at call time, so `ophis_view__settings.js` may load later.
4. `ophis_utils.js`, `ophis_model__*.js`, `ophis_dependencies.js`, remaining `ophis_view__*.js`.
5. `ophis_main.js` last — it constructs `appState` and calls `L.map('map')` at module scope (`:11`), so Leaflet **and** the `#map` element must both already exist.

---

## 10. EXTERNAL SYMBOL INDEX (what these four files call but do not define)

| Symbol | Defined in |
|---|---|
| `appState` | `ophis_main.js:4` |
| `getCurrentIsoEvent`, `selectIsoEvent`, `refreshIsoEvents`, `refreshXDates` | `ophis_controller.js` |
| `setGlobalOption`, `flushChangesToDisk`, `markChangesSaved`, `getSaveBlob`, `importIsoEventsFromUserInteraction` | `ophis_model__persistence.js` |
| `parseLatOrLongString`, `parseFloatString`, `validateXDateTime`, `validateXDateCalendarDate`, `isValidLatAndLong` | `ophis_model__validation.js` |
| `isFlagEnabled`, `getDictionarySize`, `isRunningElectron`, `isSunsetCompletelyDisabled`, `getMsrfMatch`, `constrainLatOrLongValue`, `getIsoEventField`, `isIsoEventFieldEnabled`, `getIsoEventFieldReadableTextOnlyName`, `isNonNegIntOrStringThereof`, `xDateToNativeDate`, `utcMillisToNativeDate` | `ophis_utils.js` |
| `applyToolTip`, `applyToolTipToElemId`, `removeAllDisplayedToolTips`, `getTimezone`, `flatPickrStringToXDate`, `convertNativeUtcDateToLocalMoment` | `ophis_dependencies.js` |
| `setOverflowOnScrollContainers`, `setPanelMaxDimensions`, `refreshMasterCheckboxBasedOnChildChange`, `focusOphisInput` | `ophis_view__rebuild.js` |
| `setUpCondensedOutputOptionsControls`, `renderCondensedOutputElseErrors`, `renderDebugOutput`, `enableStandardButton`, `disableStandardButton` | `ophis_view__output.js` |
| `renderOperations`, `refreshOperationRows`, `renderIsoEventDataTransfer`, `refreshIsoEventSwapRows`, `ISO_EVENT_SETTINGS`, `ISO_EVENT_DATA_TRANSFERS` | `ophis_view__settings.js` |
| `renderExportZDates`, `writeStringToFile` | `ophis_view__export.js` |
| `blockChartFlushToDiskUntilUserInteraction`, `recenterChartIfNeeded`, `updateChartDatasets`, `hideChartElem`, `getChartElem`, `getChartErrorMessageWrapperElem` | `ophis_view__chart.js` |
| `CHART_SYMBOL_IMAGE*`, `CHART_SYMBOL_IMAGE_SRC__*` | `ophis_view__chart_config.js` |
| `MSRF_FILTER__FINAL`, `POINTS__*` | `ophis_model__params.js` |
| `L` (Leaflet), `$` (jQuery + tipsy), `monthSelectPlugin` (flatpickr plugin), `navigator.clipboard` | `lib/` and the browser |

---

## 11. GOTCHAS

A naive reimplementation will get these wrong.

**11.1 — The current screen is stored *only* in a `<select>`.** There is no JS mirror. `getCurrentScreen()` reads the DOM every time, and the error-bounce path at `ophis_view.js:211-212` mutates `.value` directly *without* dispatching a `change` event, so no navigation side effects run. If you introduce a normal state store, replicate that "silent" set precisely or the error bounce will start triggering `setCurrentScreen`'s recalculation logic.

**11.2 — `getRowShortNameHtml` string-concatenates the +1.** `ophis_view__strings.js:60-62`:
```js
if ( isNonNegIntOrStringThereof(subscriptOrZeroBasedOrdinal) ) {
    subscriptOrZeroBasedOrdinal = subscriptOrZeroBasedOrdinal + 1;
}
```
If callers pass the string `"3"`, this yields `"31"`, not `4`. All current call sites pass numbers, but the guard explicitly accepts "string thereof", so the bug is latent. Also, `useSubscript === false` skips the +1 entirely — the two modes disagree about whether the ordinal is 0-based.

**11.3 — `intToDecimalString` only pads non-negative integers.** `-5` → `"-5"`, `12.4` → `"12.4"`. Do not "helpfully" apply `.toFixed(1)` — output would change for negative Z-Values.

**11.4 — `replaceOperationConstants` uses non-global `replace`.** Only the *first* `OPH_CRV`, `OPH_PI`, `OPH_PHI` in an equation is substituted. An equation with two occurrences renders half-substituted. (`ophis_view__strings.js:51-53`.)

**11.5 — Every enum label carries a trailing space.** `getScreenName`, `getEventScopeName`, `getEventTypeName` all end with `toReturn += " ";`. `adjustSelectElemWidth` measures that trailing space. Drop it and every dropdown gets narrower.

**11.6 — `adjustSelectElemWidth` adds 30, not 20.** The comment says `+20 for padding/arrow`; the code is `(textWidth + 30) + 'px'` (`ophis_view__utils.js:687`).

**11.7 — Toast timing is 2900 ms, deliberately.** The CSS animation on `.toast_wrapper` is `fadein 0.5s, fadeout 0.5s 2.5s` (total 3.0 s). Removing at exactly 3000 ms causes a flicker in Brave (comment at `ophis_view__utils.js:404`). Keep 2900.

**11.8 — Multiple simultaneous toasts overlap.** Each `showToast` appends an *independent* `.toast_wrapper` fixed at `bottom:30px`. Two toasts within 2.9 s render on top of each other. `handleJustChangedFields` avoids this by suppressing toasts entirely whenever more than one field changed (`ophis_view__utils.js:899`) — reproduce that suppression or you get a visual pile-up.

**11.9 — `handleJustChangedFields` leaks flags when called with one argument.** `refreshCurrentPage` calls it as `handleJustChangedFields(currentIsoEvent)` (`ophis_view.js:324`), leaving `indicatorsThatOverlappedDates` null. In that case chart-option flags never reach `fieldChangeAcked = true` and stay `true` in `appState.justChangedField` until the chart module calls the two-arg form. That is *load-bearing*: it is how a chart-option toast survives the intermediate page refresh long enough for the chart to report overlaps.

**11.10 — `refreshCurrentPage` must be called with a real results object.** `appState.latestResults` starts as `{}` (`ophis_main.js:30`), and `refreshCurrentPage` dereferences `results.errors.concat(...)` at `:194` with no guard.

**11.11 — Master checkboxes index children by DOM order.** `setUpMasterCheckbox` passes `i` (the position in `getElementsByClassName(baseClassName)`) as `rowIndex` into the model (`appState.isoEvents[i]`, `currentIsoEvent.x_dates[i]`, `ISO_EVENT_DATA_TRANSFERS[i]`). If a class is reused anywhere else on the page, or rows are rendered out of model order, the wrong records are toggled.

**11.12 — Master checkboxes never set children's `.checked`.** They mutate the model and rely on the follow-up refresh to redraw. If your rewrite renders lazily, the children will look unchanged.

**11.13 — Child field checkboxes use `click`, not `change`.** `ophis_view__utils.js:766`. A programmatic `.checked = x` therefore fires nothing; keyboard activation still fires `click` in browsers, so behaviour is close but not identical.

**11.14 — `setUpFilterInputEventListeners` will throw if the numeric input is missing.** `setUpIsoEventFieldCheckboxEventListeners` creates the checkbox but **not** the `<input id="{elemIdForInput}">` for fields with a `numericDefault`; `document.getElementById(elemId).addEventListener` at `ophis_view__utils.js:836-857` is unguarded. Those inputs must come from the static shell or from `ophis_view__rebuild.js`.

**11.15 — `finalizeLatLongInput()` is called with no event.** Both the `blur` (`ophis_view__utils.js:631`) and `keydown` (`:636`) paths call it argument-less; `getEventTargetElem(undefined)` then falls back to the global `window.event`. This works in Chrome/Electron and breaks under strict event models or synthetic dispatch. Rewrite: pass the event.

**11.16 — The lat/long `input` handler deliberately restores the typed text.** It runs the full model refresh (which re-renders and rewrites `.value`) then puts `valueBefore` back (`:644-648`). Skip this and every keystroke gets reformatted out from under the user.

**11.17 — Blur normalisation does not re-emit `onValidDateEntered`.** The call is commented out (`ophis_view__utils.js:185`). The app depends on flatpickr's own `onChange` (with `allowInput: true`) having fired. If you replace flatpickr, you must re-add that emission or typed dates silently never reach the model.

**11.18 — Two-digit years always become 20xx.** `ophis_view__utils.js:152-153`. `"9/14/24"` → `2024`. There is no pivot year.

**11.19 — `noCalender` is misspelled in `FLATPICKR_BASE_DATE_CONFIG__HH_MM__TIME_ONLY`.** (`ophis_view__config.js:54`). flatpickr's option is `noCalendar`, so the calendar is **not** actually hidden in the "time only" config. Fixing the spelling changes rendered behaviour — verify against the shipped app before "correcting" it.

**11.20 — `setOverflowOnScrollContainers` is called twice in a row on purpose.** `ophis_view.js:129-130`, comment at `:127-128`. One call is not enough because of layout ordering.

**11.21 — The 50 ms chart recenter timeout has a hard floor.** `ophis_view.js:13-16`, comment: "can't be below 40 milliseconds".

**11.22 — `zDatesUpToDate.style.width = "101px"` is a magic number.** Set on every render (`ophis_view.js:280`) to stop "Stale" ↔ "Up-to-date" from reflowing the header. There is a TODO to replace it with two hide/show elements.

**11.23 — `renderAbout` is one of only two screens force-cleared on `REFRESH_TYPE__RIGHT_PANEL_ONLY`.** `ophis_view.js:169` exempts `ABOUT` and `EXPORT_X_DATES` from the "don't clear" optimisation, because both embed live global-option checkboxes that must be rebuilt.

**11.24 — `document.getElementsByClassName(...)` results are taken from the END.** `copyButtons[copyButtons.length-1]` (`ophis_view.js:419`), `loadButtons[loadButtons.length-1]` (`:504`). This is defensive against stale duplicates; a rewrite that queries by id must not reintroduce the possibility of duplicates.

**11.25 — `hideChartElem()` is called but never explicitly reversed here.** In the stale+errors branch (`ophis_view.js:296`) the chart element is hidden; the fresh branch only restores `opacity`, not visibility. Un-hiding lives in `ophis_view__chart.js` (dependency).

**11.26 — `showMap` silently no-ops for an Iso-Event not in `appState.isoEvents`.** Identity comparison via `indexOf` (`ophis_view__utils.js:412-414`); a cloned event object will not match.

**11.27 — Nested dialogs collide on fixed ids.** `#yes-no-dialog`, `#dialog-no-button`, `#dialog-yes-button` are hard-coded. Opening a second dialog while the first is up wires the second's handlers to the **first** dialog's buttons (`getElementById` returns the first match). The minify flow (`hookUpGlobalOptionCheckbox` → `showMinifyWarningDialog`) is safe only because it never stacks.

**11.28 — `showDialog`'s scrim is inserted *inside* the `<td>`, before `#yes-no-dialog`,** not as a sibling of the table (`ophis_view__utils.js:506`). It still covers the viewport because of `position:absolute` + `100vw/100vh`, but the stacking is fragile.

**11.29 — The `iso_event_setting_row` and filter-row HTML nests `<tr>` inside `<tr>`.** `ithTableRow.innerHTML = '<tr>…</tr>'` (`ophis_view__utils.js:796-802`). Browsers discard the inner `<tr>` tags and keep the `<td>`s, so it works. A rewrite using `insertAdjacentHTML` or a virtual DOM will *not* silently discard them.

**11.30 — `updateLatLongInputElemValues` assumes five parallel, equal-length, index-aligned collections.** `ophis_view.js:757-762`. A mismatch throws on `ithLongElem.value`.

**11.31 — `getTimezone(lat, long)` is called for location-disabled events too.** `ophis_view.js:770`; the `"Etc/UTC"` variant is commented out at `:769`. The displayed timezone therefore reflects coordinates even when location is off.

**11.32 — `timeOnly` date parsing passes `lat = 0, long = 0`, and `isValidLatAndLong(0,0)` is `true`.** So `nativeDateToXDate` takes the moment/timezone path, at the Gulf of Guinea. Passing `null, null` instead would take the *browser-local* path and change results. (`ophis_view__utils.js:97-99`, `ophis_model__validation.js:403-405`.)

**11.33 — `refreshUnsavedChangesReminder` always calls `refreshWindowTitle`,** even when the reminder element does not exist (`ophis_view__utils.js:559`).

**11.34 — `hookUpGlobalOptionCheckbox`'s minify guard uses `=== false`.** If `minify_x_date_export_output` is `undefined` (never initialised), the warning dialog is skipped and minify is enabled without confirmation.

**11.35 — Tipsy renders `title` attributes as HTML (`html: true`).** Any `title` the view writes — master-checkbox titles, serialized-field titles, the "Copies the blob…" button title — is parsed as markup. Unescaped user data in a `title` is an injection point, not just a display bug.

**11.36 — `#code_load_area` breaks the id naming convention** (snake_case among kebab-case). Keep the literal if you want `.oph`-era muscle memory / any external tooling to keep working; otherwise rename in exactly one place (`ophis_view.js:496` and `:511`).

---

## 12. BUGS, DEAD CODE, AND SELF-CONTRADICTIONS

Called out explicitly rather than papered over.

**12.1 — The persisted start screen is loaded and then thrown away.**
`ophis_model__persistence.js:332` loads `GLOBAL_OPTION__START_SCREEN` into `appState`, and `setCurrentScreen` faithfully persists it on every navigation (`ophis_main.js:726`). But line `338` is commented out:
```js
// currentScreenSelect.value = appState.globalOptions.start_screen;
currentScreenSelect.value = DEFAULT_STARTING_SCREEN;
```
Both the "has global options" and "no global options" branches (`:339`, `:343`) assign `DEFAULT_STARTING_SCREEN`. **The app therefore always boots on Z-Dates**, and the `start_screen` value written into every `.oph` file is inert. Also contradicts `ophis_main.js:35`, which initialises `start_screen` to `OPHIS_SCREEN__ABOUT`.

**12.2 — Startup errors accumulate across refreshes.**
`ophis_view.js:194`: `results.errors = results.errors.concat(appState.startupErrors);` mutates the caller's object. Because most refresh paths pass `appState.latestResults` (the *same* object) — e.g. `hookUpGlobalOptionCheckbox`'s default at `:550`, `window.onresize` at `ophis_main.js:705` — each refresh appends `startupErrors` again. With one startup error, the Errors list grows by one entry per refresh. Fix: `var allErrors = results.errors.concat(appState.startupErrors);` used locally, or de-duplicate.

**12.3 — Duplicate DOM id `event-source-header`.** `ophis_view.js:451` and `:452`. Both `<td>`s also carry `title=""` and class `tool_tippable_cursor`, so they advertise a tooltip that has no content.

**12.4 — The About screen renders the literal text "X points".**
`ophis_view.js:633`: `readablePointsString("X")`. Inside, `"X" == 1` is false → the string becomes `"X points"`. The rendered bullet is *"**X points** for every Operation that generated it, customizable on the Operations Screen."* This is probably intentional ("X" as a placeholder because per-operation weights are configurable), but it reads as a template-substitution failure and should be reworded in the rewrite.

**12.5 — Debug screen is unreachable.** `OPHIS_SCREEN__DEBUG` is commented out of `OPHIS_SCREENS` (`ophis_view__config.js:136`) so it never appears in `#current-screen`, yet `refreshCurrentPage:241-246` still dispatches to it and it still appears in the error allow-list at `:206`. Either restore it or delete the branch.

**12.6 — `renderIsoEventDataTransfer`'s incremental path is a no-op.** `ophis_view.js:265-270`: when `callClearOutputContainer === false`, the else-branch body is a single commented-out `refreshOperationRows()` call. The Event-Swap screen therefore silently does nothing on a right-panel-only refresh that skips clearing. In practice `MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP` calls `refreshIsoEventSwapRows()` directly, papering over it.

**12.7 — `setSkinMode` has two identical branches.** `ophis_view.js:45-48`: CLASSIC and ASTROLOGICAL both set `img/header.png`. The skin concept is explicitly abandoned ("an idea that never panned out really, but no harm keeping it under the hood", `ophis_view__config.js:4`).

**12.8 — Dead constants:** `DOWN_ARROW_HTML` (`ophis_view__config.js:36`), `LEFT_ARROW_HTML` (`:37`), `MAP_MIN_ZOOM` (`:44`), `DISABLED_ELEMENT_SUBSCRIPT` (`ophis_view__strings.js:12`). Zero references anywhere in `src/`.

**12.9 — Dead function:** `numberWithCommas` (`ophis_view__utils.js:831-833`). Zero call sites.

**12.10 — Dead locals / parameters:** `datesPluralOrSingular` in `refreshDatesHidden` (`ophis_view__utils.js:819`); `operationOrdinal` in `getZValueReadable` (`ophis_view__strings.js:19`); `results` in `renderAbout` (`ophis_view.js:574`); `emptyHtml` and `headerHtml` in `renderExportXDates` (`:368-369`) and `renderImport` (`:481-482`); `inputElem` in the flatpickr `onChange` (`ophis_view__utils.js:189`); `actuallyAdd` in `fillInSelectElem` (`ophis_view__utils.js:697-701`); the empty `input` listener in `setUpDateInput` (`:224-227`).

**12.11 — Dead UI:** the Export-PDF button (`ophis_view.js:367`), the blur-About checkbox (`:575, 581`, forced to `""` at `:576` — although `GLOBAL_OPTION__BLUR_ABOUT_SCREEN` is still *read* at `:747`, so the blur can only be turned on by editing the saved file), the About-screen "Operations" section (`:646-704`), the removed About bullets (`:608-609`), the commented-out filter-input `input` handler (`ophis_view__utils.js:868-877`), the commented-out `debugPollLoop` (`ophis_view.js:19-25`).

**12.12 — Duplicate attribute:** `colspan='3'` written twice in the same `<td>` (`ophis_view__utils.js:815`).

**12.13 — Invalid markup:** `generateLatOrLongInput` emits a closing `</input>` tag (`ophis_view__strings.js:16`).

**12.14 — Misleading identifier:** in `refreshCurrentPage`, the local `outputContainer` is `#scrollable-container-for-output-container`, not `#output-container` (`ophis_view.js:275`). Elsewhere in the same file `outputContainer` *does* mean `#output-container` (`:340`, `:440`).

**12.15 — Typo in an identifier:** `showCartField` for the *chart* field (`ophis_view__config.js:213-216`).

**12.16 — Misnamed parameter:** `getEventTypeName(eventScope)` (`ophis_view__strings.js:275`) takes an event **type**.

**12.17 — Stray double semicolon:** `ophis_view__strings.js:88`.

**12.18 — Asymmetric enable/disable:** `disableRowButton` sets `parentElement.style.cursor` only for radios and never resets it for non-radios; `enableRowButton` hard-codes `1.0` instead of `OPACITY__ENABLED`, and re-colours delete buttons red on enable but `disableRowButton` greys everything uniformly (`ophis_view__strings.js:70-109`).

**12.19 — Version string mismatch:** `APP_VERSION = "12.0"` in source, `"12.0.0"` in `package.json`, and the runtime rewrite in `ophis_main.js:96-115` collapses it to `"12"`. The About/title chrome shows "Ophis v12" while the on-disk metadata says 12.0.0.

**12.20 — `renderErrors` mixes column widths.** Header `<td>` is `width:50%`, error `<td>`s are `width:33.33%` (`ophis_view.js:347, 353`) in a table with a single column. Harmless but nonsensical.

---

## 13. REWRITE CHECKLIST (minimum to be behaviour-compatible)

1. Keep the nine `OPHIS_SCREEN__*` string values byte-identical (they are persisted).
2. Keep the seven master-checkbox `baseElemId`/`baseClassName` pairs and the three derived-name rules (`-header`, `-master`, `_master`).
3. Keep `getScreenName`/`getEventScopeName`/`getEventTypeName` trailing spaces and the `+30px` select-width formula, or replace the whole width-measurement approach.
4. Preserve the clear/no-clear decision matrix in `refreshCurrentPage` step 4 — it is the app's only render-skipping optimisation and Z-Dates + Event Settings depend on it.
5. Preserve the error-bounce allow-list `{Z_DATES, DEBUG, OPERATIONS, EVENT_SWAP, EXPORT_X_DATES, EVENT_SETTINGS}`.
6. Preserve the `onValidDateEntered_calling` reentrancy guard (or make rendering non-reentrant by construction).
7. Preserve toast suppression when `numberOfJustChangedFields > 1`.
8. Fix `results.errors` accumulation (§12.2) — this is a real defect, not behaviour to reproduce.
9. Escape every interpolated value, or wire in the already-bundled `lib/purify.min.js`.
10. Decide explicitly whether to keep the always-Z-Dates boot (§12.1) or honour the persisted `start_screen`.
