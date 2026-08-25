# 09 — `ophis_view__settings.js` — Settings / Controls UI

**Subsystem:** view-settings
**Primary source:** `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/src/ophis_view__settings.js` (984 lines, read in full)
**Status of source:** un-obfuscated, real names, live TODOs and commented-out dead code preserved.

---

## 0. SCOPE CORRECTION — READ THIS FIRST

The assignment for this document assumed `ophis_view__settings.js` contains the whole settings/controls
UI (all user-facing settings, the settings panel layout, the X-Date/T-Date editor, the chart-option
family, presets and import/export). **It does not.** I read every line; the file contains exactly three
things:

1. **`ISO_EVENT_SETTINGS`** — a two-entry registry of per-Iso-Event settings (Misc. Notes,
   Day-Scope Event Start Time). This *is* the "Event Settings" screen's content, but the screen's
   table chrome is rendered by `renderEventSettings()` in `ophis_view.js:439-475`, which is **not**
   in this file.
2. **`ISO_EVENT_DATA_TRANSFERS`** + the whole **Iso-Event "swap" screen** — a bulk copy-settings-from-one-
   event-to-others screen. This is the file's largest feature.
3. **The Operations editor screen** — `renderOperations()` / `refreshOperationRows()`.

Everything else named in the assignment lives elsewhere. Verified locations (dependencies, **not** guesses):

| Assignment topic | Actual owner |
|---|---|
| X-Date / T-Date editor rows, add/remove/enable, flatpickr per-row wiring | `ophis_view__rebuild.js` (`rebuildXDateTableRowsInternal()` @ `:668`, `rebuildXDateTableRows()` @ `:948`); shared date-input machinery in `ophis_view__utils.js:setUpDateInput()` @ `:62` |
| Filter checkbox panel + `chart_option__*` checkbox panel (the actual controls) | `ophis_view__utils.js:setUpIsoEventFieldCheckboxEventListeners()` @ `:762-812`; containers `#iso-event-filter-container` / `#iso-event-chart-options-container` declared in `OPHIS.html` |
| Filter / chart-option field *definitions* (labels, defaults, ids) | `ophis_config.js:122-266` (`SERIALIZED_FILTER_FIELDS`, `SERIALIZED_CHART_OPTION_FIELDS`) |
| Import / export of settings (`.oph` files, paste-code) | `ophis_view.js:renderImport()` @ `:477`, `renderExportXDates()`; `ophis_view__export.js`; `ophis_model__persistence.js` |
| Global options / screen selector | `ophis_main.js`, `ophis_view__config.js` |

This document specifies **only** what `ophis_view__settings.js` owns, exhaustively, plus the exact
contracts it needs from its dependencies. Section 8 lists every external symbol it consumes with the
resolved definition, so a reimplementer does not have to guess.

---

## 1. MODULE INVENTORY

Plain `<script>`-tag module. No IIFE, no exports — everything is a global `var`/`function`.
Load order matters: it reads `SERIALIZED_FILTER_FIELDS` and `SERIALIZED_CHART_OPTION_FIELDS` from
`ophis_config.js` and `getRowShortNameHtml` from `ophis_view__strings.js` **at module-evaluation time**
(`:33`, `:49`, `:59`), so those files must be loaded first.

### Globals defined

| Symbol | Line | Kind |
|---|---|---|
| `newIsoEventDataTransferObject(elemId, readableName, applyToEvent)` | `:2` | factory |
| `newIsoEventSetting(readableName, generateHtml, setUpListeners)` | `:11` | factory |
| `ISO_EVENT_DATA_TRANSFER__NAME` | `:19` | DTO const |
| `ISO_EVENT_DATA_TRANSFER__SCOPE` | `:22` | DTO const |
| `ISO_EVENT_DATA_TRANSFER__LOCATION` | `:25` | DTO const |
| `ISO_EVENT_DATA_TRANSFER__X_DATES` | `:29` | DTO const |
| `ISO_EVENT_DATA_TRANSFER__FILTERS` | `:32` | DTO const |
| `ISO_EVENT_DATA_TRANSFER__T_DATES` | `:42` | DTO const |
| `ISO_EVENT_DATA_TRANSFER__OPERATIONS` | `:45` | DTO const |
| `ISO_EVENT_DATA_TRANSFER__CHART_CONFIG` | `:48` | DTO const |
| `ISO_EVENT_DATA_TRANSFER__NOTES` | `:55` | DTO const |
| `ISO_EVENT_DATA_TRANSFER__DAY_SCOPE_START_TIME` | `:59` | DTO const |
| `ISO_EVENT_DATA_TRANSFERS` (array of the 10 above) | `:63` | registry |
| `ISO_EVENT_SETTING__X_DATE_OFFSET__DAY_SCOPE` | `:76` | setting const |
| `ISO_EVENT_SETTING__NOTES` | `:146` | setting const |
| `ISO_EVENT_SETTINGS` (array, 2 entries) | `:166` | registry |
| `refreshIsoEventSwapRows()` | `:172` | fn |
| `refreshIsoEventSwapMaxWidths()` | `:250` | fn |
| `isAtLeastOneEventCheckedForSwapSource()` | `:266` | fn |
| `refreshIsoEventSwapApplyButton()` | `:280` | fn |
| `renderIsoEventDataTransfer()` | `:315` | fn (screen entry point) |
| `refreshOperationRows()` | `:577` | fn |
| `renderOperations()` | `:641` | fn (screen entry point) |

### Entry points (who calls in)

| Caller | Line | Calls |
|---|---|---|
| `ophis_view.js:261` | screen `OPHIS_SCREEN__OPERATIONS`, `callClearOutputContainer === true` | `renderOperations()` |
| `ophis_view.js:263` | screen `OPHIS_SCREEN__OPERATIONS`, `callClearOutputContainer === false` | `refreshOperationRows()` |
| `ophis_view.js:267` | screen `OPHIS_SCREEN__EVENT_SWAP`, `callClearOutputContainer === true` | `renderIsoEventDataTransfer()` |
| `ophis_view.js:457-474` | screen `OPHIS_SCREEN__EVENT_SETTINGS` (via `renderEventSettings()`) | iterates `ISO_EVENT_SETTINGS`, calls `.generateHtml()` then `.setUpListeners()` |
| `ophis_main.js:713` | window resize handler, only when `getCurrentScreen() == OPHIS_SCREEN__EVENT_SWAP` | `refreshIsoEventSwapRows()` |
| `ophis_view__config.js:276, 290` | master-checkbox completion callbacks | `refreshIsoEventSwapRows()` |
| `ophis_view__config.js:286` | swap-setting master checkbox child callback | reads `ISO_EVENT_DATA_TRANSFERS[rowIndex].checkboxEnabled` |

Screen enum values (from `ophis_view__config.js:120-142`):
`"OPHIS_SCREEN__OPERATIONS"`, `"OPHIS_SCREEN__EVENT_SETTINGS"`, `"OPHIS_SCREEN__EVENT_SWAP"`.

---

## 2. DATA STRUCTURES

### 2.1 `IsoEventDataTransfer` (the "Data" rows on the swap screen)

```ts
// ophis_view__settings.js:2-9
type IsoEventDataTransfer = {
  elemId: string;          // DEAD FIELD — never read anywhere in the codebase. See GOTCHA G-1.
  readableName: string;    // rendered as raw HTML into <div class="event_name_destination">
  applyToEvent: (sourceIsoEvent: IsoEvent, targetIsoEvent: IsoEvent) => void;  // mutates target
  checkboxEnabled: boolean; // MODULE-LEVEL MUTABLE UI STATE, init false. Not per-event, not persisted.
};
```

`checkboxEnabled` is initialised to `false` by the factory (`:7`) and is mutated by
`MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP_SETTING.onChildNowCheckedOrNot`
(`ophis_view__config.js:285-288`). It is **global to the app, not per Iso-Event**, and is never
serialised — it resets only on page reload.

### 2.2 `IsoEventSetting` (the rows on the Event Settings screen)

```ts
// ophis_view__settings.js:11-17
type IsoEventSetting = {
  readableName: string;                 // rendered as raw HTML into the "Setting Name" cell
  generateHtml: () => string;           // returns the innerHTML of the "Setting Value" cell
  setUpListeners: () => void;           // called AFTER the row is inserted into the DOM
};
```

Contract: `generateHtml()` must emit elements with fixed, unique DOM ids;
`setUpListeners()` looks them up with `document.getElementById`. There is **no** teardown hook —
listeners are re-attached on every full re-render of the screen (the DOM nodes are discarded, so no
leak, but any module-level state a setting keeps must be idempotent).

### 2.3 `Operation` (edited by the Operations screen)

Defined by `newOperation()` in `ophis_utils.js:1006-1012`:

```ts
type Operation = {
  equation: string;   // e.g. "X2+YxOPH_PHI", "X1+(Y/2.0)xOPH_CRV", "X2+oph_flip(oph_round(Y))"
  weight: number;     // >= 1 => "Alpha" operation; 0 < w < 1 => "Beta". Default 0.5.
  enabled: boolean;
};
```

> **External bug worth knowing:** `newOperation(equation, weight, enabled = true)` **ignores its
> `enabled` argument** and hardcodes `enabled: true` (`ophis_utils.js:1006-1012`). So the
> `OPERATION_ENABLED_FALSE` entry in the LTE-V7 default table is silently enabled. This matters to
> the Operations screen's **Reset** button, which installs those defaults.

### 2.4 IsoEvent fields touched by this file

```ts
// subset of the IsoEvent record (created in ophis_controller.js:117-141)
type IsoEvent = {
  name: string;
  notes: string;                          // default "" (ophis_controller.js:120)
  scope: string;                          // e.g. EVENT_SCOPE__HH_MM = "EVENT_SCOPE__HH_MM"
  lat: number; long: number;
  x_dates: XDate[];
  t_dates: XDate[];
  operations: Operation[];
  day_scope_start_time_in_millis?: number; // default DEFAULT_DAY_SCOPE_START_TIME_MILLIS = 0
  // ---- transient swap-screen UI state, DELETED before save (ophis_model__validation.js:473-474)
  checked_for_swap_source?: boolean;
  checked_for_swap_target?: boolean;
  // ---- one boolean per SERIALIZED_FILTER_FIELDS / SERIALIZED_CHART_OPTION_FIELDS entry, keyed by
  //      field.serializationKey, plus optional field.serializationKeyForValue numbers
  [serializationKey: string]: any;
};
```

`day_scope_start_time_in_millis` normalisation (external, `ophis_model__validation.js:768-780`):
if present and a non-negative int, clamp `>= MILLIS_PER_DAY` down to `MILLIS_PER_DAY - MILLIS_PER_MINUTE`
(= 86 340 000); otherwise reset to `DEFAULT_DAY_SCOPE_START_TIME_MILLIS` (`0`). It is stripped from the
save blob when equal to the default (`ophis_model__validation.js:523-524`, `:543`).

---

## 3. SETTING-BY-SETTING TABLE (everything this file exposes to the user)

This is the exhaustive control inventory for `ophis_view__settings.js`. Three families:
**(A)** Event Settings screen rows, **(B)** Event Swap screen controls, **(C)** Operations screen controls.

### A. Event Settings screen (`OPHIS_SCREEN__EVENT_SETTINGS`) — from `ISO_EVENT_SETTINGS`

| # | Label ("Setting Name" cell) | Control | DOM id | Model field | Default | Valid range | Validation | Effect / side effects |
|---|---|---|---|---|---|---|---|---|
| S₁ | `Misc. Notes` | `<textarea rows=10>`, `class="text_area"`, `resize:none`, placeholder `"Write down anything about this event that may be relevant to the input or output. These notes are for personal use only and do not affect results."` | `event-notes-text-area` | `currentIsoEvent.notes` | `""` | free text | none | On DOM `change` (i.e. blur after edit) → `notes = value`; `flushChangesToDisk()`. **No** `refreshXDates` — notes never affect results. (`:146-164`) |
| S₂ | `Day Scope Event Start Time` | `<input type=text>` (no `type` attr; flatpickr time picker attached), `class="date_input_common general_input"`, `width:65px` (`MIN_TIME_FIELD_WIDTH`), `text-align:center`, `padding-right:5px`, `tabindex=-1` | `event-day-scope-start-time` | `currentIsoEvent.day_scope_start_time_in_millis` | `0` (midnight) | `0 .. MILLIS_PER_DAY-1`, clamped on load to ≤ `86 340 000` | flatpickr `H:i` + `validateXDateTime()`; invalid input reverts to `fallbackDateString()` = current model value re-rendered | On valid entry → write millis, `flushChangesToDisk()`, `refreshXDates(REFRESH_TYPE__SOFT, false, OPHIS_INPUT_CHANGE__CHANGED)`. (`:76-143`) |

**S₂'s explanatory copy** (rendered verbatim next to the input, `:80`):

> `&nbsp;&nbsp;<u>Explanation</u>: Every Operation generates a Z-Value in axial rotations (Days). This Z-value is added to an X-Date to get the final Z-Date. For Day Scope, the default time to which the Z-Value is added, is the very start of the day, i.e. midnight. You can override that behavior with this setting to start at e.g. noon.`

**Row rendering (in `ophis_view.js:439-475`, reproduced because it defines the layout):**
Header row = 3 cells: spacer (`width:0%`, white) · `Setting Name` (`width:0%`, id `event-source-header`)
· `Setting Value` (`width:100%`, id `event-source-header` — **duplicate id, sic**).
Each setting row = `<tr class="iso_event_setting_row">` with
`[ div.input_row_name = "S<sub>i+1</sub>" ] [ readableName, padding:5px, centered ] [ generateHtml(), padding:10px, width:100% ]`.
Screen title area (`#screen-specific-area`) = `"E<sub>n+1</sub> Settings"` where n =
`appState.globalOptions.current_iso_event_index`.

### B. Event Swap screen (`OPHIS_SCREEN__EVENT_SWAP`)

| Control | Type | DOM id / class | Bound state | Default | Enable rule | Effect |
|---|---|---|---|---|---|---|
| `?` help | button, `class="square_button add_button large_font bordered small_border_radius"` | `#event-swap-help-button` | — | — | always | `showOkDialog("" + HELP_MESSAGE__EVENT_SWAP)` (`:326-331`) |
| `Apply` | button, `class="operation_click_element add_button large_font bordered small_border_radius"`, `title="Apply the choices below."`, `tabindex=-1` | `#apply-event-swap-button` | — | disabled | enabled ⇔ (≥1 event has `checked_for_swap_target===true`) **AND** (≥1 `ISO_EVENT_DATA_TRANSFERS[i].checkboxEnabled===true`) — `refreshIsoEventSwapApplyButton()` `:280-313` | opens confirm dialog, then performs the transfer (§4.3) |
| Source radio (one per event row) | `<input type=radio name="selected_iso_event_for_swap">`, `class="row_radio_button_for_swap"`, wrapped in `<label class="row_radio_button_for_swap_label">`, `title="Select Event as Source"`, `tabindex=-1` | — (`row_index` attr = i) | `isoEvent.checked_for_swap_source` | row 0 gets literal `checked` attr at render; `refreshIsoEventSwapRows()` then forces row 0 if nothing else is source | always | exclusive select; see §4.2 for the "promote previous source to target" rule |
| Data checkbox (one per `ISO_EVENT_DATA_TRANSFERS` row) | `<input type=checkbox>`, `class="operation_click_element iso_event_swap_setting_checkbox"`, `title="Enable/Disable this Setting"`, `tabindex=-1` | — (`row_index` attr = i) | `ISO_EVENT_DATA_TRANSFERS[i].checkboxEnabled` | `false` | always | toggles which data categories are copied |
| Data master checkbox | `<input type=checkbox>` injected by `setUpMasterCheckbox` | id `iso-event-swap-setting-checkbox-master`, class `iso_event_swap_setting_checkbox_master`, mounted into `#iso-event-swap-setting-checkbox-header`, `title="Enable/Disable all Settings"` | all `checkboxEnabled` | unchecked | present only when `isoEvents.length > 1` (header cell only exists then) | sets every `checkboxEnabled` to its own state |
| Target checkbox (one per event row) | `<input type=checkbox>`, `class="operation_click_element iso_event_swap_checkbox "` (**note trailing space in the class string**, `:474`), `title="Enable/Disable this Iso-Event as a target for the changes."`, `tabindex=-1` | — (`row_index` attr = i) | `isoEvent.checked_for_swap_target` | `false` | **disabled** whenever that row's source radio is checked | marks an event as a copy destination |
| Target master checkbox | injected by `setUpMasterCheckbox` | id `iso-event-swap-checkbox-master`, class `iso_event_swap_checkbox_master`, mounted into `#iso-event-swap-checkbox-header`, `title="Enable/Disable all Destination Iso-Events"` | all `checked_for_swap_target` | unchecked | as above | sets every event's `checked_for_swap_target` (including the source's — immediately re-cleared by `refreshIsoEventSwapRows`) |

**The 10 "Data" rows (D₁ … D₁₀), in exact registry order** (`:63-74`). `elemId` is dead; `readableName`
is what the user sees:

| Row | `readableName` | `elemId` (unused) | What `applyToEvent` copies | Line |
|---|---|---|---|---|
| D₁ | `Name` | `iso-event-source-name` | `target.name = source.name` | `:19-21` |
| D₂ | `Scope` | `iso-event-source-scope` | `target.scope = source.scope` | `:22-24` |
| D₃ | `Location` | `iso-event-source-location` | `target.lat = source.lat; target.long = source.long` | `:25-28` |
| D₄ | `X-Dates` | `iso-event-source-x-dates` | `target.x_dates = deepClone(source.x_dates)` | `:29-31` |
| D₅ | `Filters` | `iso-event-source-filters` | for each `f` in `SERIALIZED_FILTER_FIELDS`: `target[f.serializationKey] = source[f.serializationKey]`; **and if `f.numericDefault != null`** also `target[f.serializationKeyForValue] = source[f.serializationKeyForValue]` | `:32-41` |
| D₆ | `T-Dates` | `iso-event-source-t-dates` | `target.t_dates = deepClone(source.t_dates)` | `:42-44` |
| D₇ | `Operations` | `iso-event-source-operations` | `target.operations = deepClone(source.operations)` | `:45-47` |
| D₈ | `Chart Config` | `iso-event-source-chart-config` | for each `c` in `SERIALIZED_CHART_OPTION_FIELDS`: `target[c.serializationKey] = source[c.serializationKey]` — **`serializationKeyForValue` is NOT copied here** (asymmetric with D₅) | `:48-53` |
| D₉ | `Notes` | `iso-event-source-notes` | `target.notes = source.notes` | `:55-57` |
| D₁₀ | `S<sub>2</sub> Start Time` (literally `getRowShortNameHtml("S", 1) + " Start Time"`) | `iso-event-source-day-scope-start-time` | `target.day_scope_start_time_in_millis = source.day_scope_start_time_in_millis` | `:59-61` |

### C. Operations screen (`OPHIS_SCREEN__OPERATIONS`)

| Control | Type | DOM id / class | Bound state | Default | Validation | Effect |
|---|---|---|---|---|---|---|
| `Add` | button, `class="operation_click_element add_button large_font bordered small_border_radius"`, `title="Add new operation to end of list."`, `tabindex=-1` | `#add-operation-button` | — | — | — | `addOperation(getCurrentIsoEvent())` → push `newOperation("X1+Y", 0.5, true)`, flush, `refreshXDates(SOFT,false,CHANGED)`; then `scrollPanelToBottom(getOutputContainer())` (`:679-686`) |
| `Reset` | button, same classes, `title="Clear all operations for this event and start fresh."` | `#reset-operations-button` | — | — | — | confirm dialog → `operations = cloneDefaultOperationsForAppVersionGte10()` (16 operations), `markChangesSaved()`, `refreshXDates(SOFT,false,CHANGED)`, `recenterChart()`, `flushChangesToDisk()` (`:654-677`) |
| Delete-all `✖` | `<div class="row_delete_button_master">&#10006;</div>` inside `<td id="delete-all-operations-button-header">`, `title="Delete all Operations"` | `#delete-all-operations-button` | — | enabled | — | confirm dialog → `operations = []`, `markChangesSaved()`, `refreshXDates(SOFT,false,CHANGED)`, `recenterChart()`, `flushChangesToDisk()` (`:726-751`) |
| Equation | `<input type="text">`, `class="operation_text_input operation_equation_input general_input"`, `width:100%`, `text-align:left`, `tabindex=-1` | `#equation-input-{i}`, `row_index={i}` | `operations[i].equation` | `"X1+Y"` for new rows | live, on every re-render, via `validateOperationString()` (see §5) | on `blur`, if changed: write value, set `elem.title = value`, `flushChangesToDisk()`, `refreshXDates(REFRESH_TYPE__RIGHT_PANEL_ONLY, false, CHANGED)` (`:754-778`, `:885-892`) |
| Result readout | `<div class="operation_validation_result">` (+ `error_color help_cursor` or `green_color`) | — | derived | — | — | shows `"Z=<value>"` for `Y = SAMPLE_Y_VALUE_FOR_VALIDATION` (10), else `"Error"` with the full message in `title` (`:586-635`) |
| Weight | `<input>` **with no `type` attribute** (→ text), `class="operation_text_input operation_weight_input general_input"`, `width:100%`, `text-align:left`, `tabindex=-1` | `#weight-input-{i}`, `row_index={i}` | `operations[i].weight` | `POINTS__BETA_OPERATION_MATCH = 0.5` | `parseFloatString(value, 0, "")`; if `null` **or `<= 0`** → coerced to `0.5` | on `blur`, if changed: write, and **only if there is no follow-on flusher** flush + `refreshXDates(RIGHT_PANEL_ONLY,…)` (`:780-801`, `:926-930`) |
| Enabled | `<input type="checkbox">`, `class="operation_click_element operation_checkbox"`, `title="Enable/Disable this Operation"`, `tabindex=-1` (attribute duplicated in the literal, `:823`) | — (`row_index={i}`) | `operations[i].enabled` | `true` | — | `MASTER_CHECKBOX_CONFIG__OPERATIONS.onChildNowCheckedOrNot(i, checked)` sets `.enabled`, then completion → `flushChangesToDisk()` + `refreshXDates(RIGHT_PANEL_ONLY,false,CHANGED)` (`ophis_view__config.js:247-261`) |
| Operations master checkbox | injected by `setUpMasterCheckbox` | id `operation-checkbox-master`, class `operation_checkbox_master`, mounted into `#operation-checkbox-header`, `title="Enable/Disable all Operations"` | all `.enabled` | — | — | sets every operation's `enabled` |
| Delete row `✖` | `<div class="operation_click_element row_delete_button" tabindex="-1">&#10006;</div>`, `title="Delete This Operation"` | — (`row_index={i}`) | — | enabled (always — the `MINIMUM_OPERATIONS_REQUIRED` guard is commented out, `:952-956`) | — | `operations.splice(i,1)`, `flushChangesToDisk()`, `refreshXDates(SOFT,false,CHANGED)` — **no confirmation** (`:966-975`) |
| Insert-above arrow | `<img class="operation_click_element row_insert_button" src="./img/left_arrow.png">`, `title="Insert New Operation here."`, `tabindex=-1` | — (`row_index={i}`) | — | — | — | `addOperation(getCurrentIsoEvent(), i)` → `splice(i, 0, newOperation("X1+Y", 0.5, true))` (inserts **before** the clicked row) (`:960-964`) |

---

## 4. SCREEN SPECIFICATIONS

### 4.1 Layout — Event Swap screen (`renderIsoEventDataTransfer()`, `:315-575`)

Nine table columns, grouped 3 + 3 + 3. Column 1/4/7 are the row-badge columns, 3/6/9 are the
control columns, and there are zero-width white spacer cells between groups.

Header (`:411-434`), rendered by `addOutputRow()`:

```
[ spacer w:0% white ]
[ #event-source-header  "Source Event"   w:50%  class="event_source_header col_sub_header_format tool_tippable_cursor"
                        title="The Iso-Event to copy Settings from." ]
[ spacer w:0% white ]
[ spacer w:0% white ]
[                       "Data"           w:0%   class="event_setting_header col_sub_header_format tool_tippable_cursor"
                        title="The individual Setting to copy." ]
[ #iso-event-swap-setting-checkbox-header  w:0%  (master checkbox mount) ]
[ spacer w:0% white ]
[                       "Target Events"  w:50%  class="event_target_header col_sub_header_format tool_tippable_cursor"
                        title="The Iso-Events that receive the Settings from the select Iso-Event to the left." ]  // "the select" — sic
[ #iso-event-swap-checkbox-header          w:0%  (master checkbox mount) ]
```

**Special case, exactly one Iso-Event** (`:413-414`): the header is replaced wholesale by
`<td class="col_sub_header_format" style="width:50%;">Error</td>`.

Body (`:436-567`):

- If `isoEvents.length <= 1`: a single `<tr class="iso_event_swap_row">` containing
  `<td class='col_format' colspan='1'><div class='col_output_text error_color panel_error_text'>This screen is for copying various Settings from one Iso-Event to others. Therefore at least two Iso-Events must be created for this screen to have a function.</div></td>`
- Else, `rowLimit = Math.max(isoEvents.length, ISO_EVENT_DATA_TRANSFERS.length)` = `max(n, 10)` rows.
  For each `i`:
  - Group A (source), present iff `isoEvents[i]` exists, else three `<td class="empty_event_swap_cell">`:
    `[ div.input_row_name = "E<sub>i+1</sub>" ] [ div.event_name_source = isoEvent.name ] [ radio ]`
  - Group B (data), present iff `ISO_EVENT_DATA_TRANSFERS[i]` exists, else three empty cells:
    `[ div.input_row_name = "D<sub>i+1</sub>" ] [ div.event_name_destination = readableName ] [ checkbox ]`
  - Group C (target), present iff `isoEvents[i]` exists, else three empty cells; every cell carries
    the extra class `event_swap_target_cell` (used for the opacity dimming):
    `[ div.input_row_name.event_swap_target_cell = "E<sub>i+1</sub>" ] [ div.event_name_target = isoEvent.name ] [ checkbox ]`

Finally (`:569-574`): `applyToolTipToCssClass("tool_tippable_cursor")`,
`setUpMasterCheckbox(MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP)`,
`setUpMasterCheckbox(MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP_SETTING)`, `refreshIsoEventSwapRows()`.

`#screen-specific-area` is set to `helpButton + applySwapButtonHtml` (`:323-324`).

### 4.2 Swap-screen refresh algorithm

**`refreshIsoEventSwapRows()` (`:172-248`)** — exact order:

1. `isoEvents = appState.isoEvents`.
2. **Early return:** `if (isoEvents.length <= 1) { refreshIsoEventSwapApplyButton(); return; }`
   — note this also skips `refreshIsoEventSwapMaxWidths()`, which would otherwise dereference the
   missing `#event-source-header`.
3. `operationRows = document.getElementsByClassName("iso_event_swap_row")` (variable name is a
   copy-paste leftover from the operations code; these are swap rows).
4. `rowLimit = Math.max(operationRows.length, ISO_EVENT_DATA_TRANSFERS.length)`.
5. `atLeastOneEventCheckedForSwapSource = isAtLeastOneEventCheckedForSwapSource()` — **snapshotted
   once, before the mutating loop**.
6. Cache `allEventSourceElems = getElementsByClassName("event_name_source")`,
   `allEventTargetElems = getElementsByClassName("event_name_target")`.
7. For `i` in `[0, rowLimit)`:
   - If `isoEvents[i]` exists:
     - `allEventSourceElems[i].style.maxWidth = "1px"` and same for target — **collapse first** so that
       step 9's `clientWidth` measurement of the header is not inflated by long event names.
     - `checkTheRadioButton = ithIsoEvent.checked_for_swap_source === true || (atLeastOneEventCheckedForSwapSource === false && i == 0)`
     - Write it back both ways: `radioButton.checked = checkTheRadioButton;
       ithIsoEvent.checked_for_swap_source = checkTheRadioButton` (`:207-214`).
     - If the radio is checked → the row **cannot** be a target:
       `disableRowButton(swapCheckbox)`, `swapCheckbox.checked = false`,
       `ithIsoEvent.checked_for_swap_target = false`,
       every `.event_swap_target_cell` in the row gets `opacity = OPACITY__DISABLED` (`0.5`),
       and then `swapCheckbox.style.opacity = OPACITY__ENABLED` (`1.0`) — explicitly undoing the
       opacity that `disableRowButton` just applied, "so opacity disabled doesn't double up" (`:226`).
     - Else → `enableRowButton(swapCheckbox)`, `swapCheckbox.checked = ithIsoEvent.checked_for_swap_target`,
       all `.event_swap_target_cell` opacity `1.0`.
   - If `ISO_EVENT_DATA_TRANSFERS[i]` exists: `swapSettingCheckbox.checked = ithSetting.checkboxEnabled`.
8. `refreshIsoEventSwapApplyButton()`.
9. `refreshIsoEventSwapMaxWidths()`.

**`refreshIsoEventSwapMaxWidths()` (`:250-264`)**

```js
var headerElemWidth = document.getElementById("event-source-header").clientWidth;
headerElemWidth -= 15;
// then for every .event_name_source and .event_name_target:
//   style.maxWidth = headerElemWidth + "px";
```

The magic `15` is an un-commented gutter allowance. This is a two-pass measure/apply: step 7 shrinks
the name divs to `1px` so the `<td>` collapses to its intrinsic header width, then this function
measures and expands them. Re-run on every window resize while the swap screen is active
(`ophis_main.js:711-714`).

**`isAtLeastOneEventCheckedForSwapSource()` (`:266-278`)** — linear scan, `=== true` strict, returns bool.

**`refreshIsoEventSwapApplyButton()` (`:280-313`)** — as in the table above; uses `enableRowButton` /
`disableRowButton` from `ophis_view__strings.js:79-105`.

**Source radio click handler (`:491-531`)** — this is the subtlest logic in the file:

```js
var rowIndex = getClickedRowIndex(jsEvent);

var allOtherEventsWereChecked = true;
var previousIsoEventThatWasSource = null;

for (k of isoEvents) {
    if (k.checked_for_swap_source === true)      previousIsoEventThatWasSource = k;
    else if (k.checked_for_swap_target === true) { /* continue on. */ }
    else                                          allOtherEventsWereChecked = false;
}

// If every non-source event was already a target, then the OLD source becomes a target too,
// preserving the user's "select all" intent as the source moves.
if (allOtherEventsWereChecked === true && previousIsoEventThatWasSource)
    previousIsoEventThatWasSource.checked_for_swap_target = true;

for (k, index) of isoEvents: k.checked_for_swap_source = (index == rowIndex);

MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP.onChildNowCheckedOrNot(rowIndex, false); // clear new source as target
MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP.onMasterCheckboxChangeComplete();        // -> refreshIsoEventSwapRows + master tri-state
refreshIsoEventSwapRows();                                                      // called a SECOND time
```

Note the double `refreshIsoEventSwapRows()` (once inside `onMasterCheckboxChangeComplete`, once
explicitly) — idempotent, but wasteful.

### 4.3 Apply-swap transaction (`:337-407`)

Clicking `Apply` opens
`showDialog("Are you sure you want to apply the changes?", "NO, keep Iso-Events as they are", "YES, apply the changes", onYes, onNo)`.

`onYes` (`:338-401`), exact order:

1. `currentIsoEvent = getCurrentIsoEvent()`.
2. Partition `isoEvents` in one pass: the first branch wins, so an event that is *both* source and
   target is treated as **source only**:
   ```js
   if (kth.checked_for_swap_source === true) sourceEvent = kth;          // LAST such event wins
   else if (kth.checked_for_swap_target === true) {
       if (kth == currentIsoEvent) isCurrentIsoEventOneOfTheTargets = true;
       targetEvents.push(kth);
   }
   ```
3. `selectedSettings = ISO_EVENT_DATA_TRANSFERS.filter(s => s.checkboxEnabled === true)`.
4. **Guard:** `if (sourceEvent && targetEvents.length > 0 && selectedSettings.length > 0)`; else
   `console.warn("Unselected source and/or target events and/or settings.")` and nothing happens.
5. Nested loop — **targets outer, settings inner**:
   `for each target: for each setting: setting.applyToEvent(sourceEvent, target)`.
   Settings are applied in registry order (D₁ → D₁₀).
6. **Second, separate pass** over targets (`:386-392`): any target whose `scope != EVENT_SCOPE__HH_MM`
   gets `toggleIsoEventLocationEnabled(target, false)` — cleaning up a `lat`/`long` that D₃ may have
   copied onto an event that has no time-of-day and therefore no meaningful location.
7. `markChangesSaved()`.
8. `refreshIsoEvents(REFRESH_TYPE__HARD, isCurrentIsoEventOneOfTheTargets ? OPHIS_INPUT_CHANGE__CHANGED : OPHIS_INPUT_CHANGE__NO_CHANGE)`
   — i.e. only recompute Ophis output if the *currently displayed* event was itself modified.
9. `flushChangesToDisk()`.

`onNo` (`:402-406`): `refreshIsoEvents(REFRESH_TYPE__SOFT, OPHIS_INPUT_CHANGE__CHANGED)`, with the
in-source comment explaining it exists to re-validate an input that had focus when the dialog opened,
and a live TODO questioning whether every dialog needs this.

### 4.4 Layout — Operations screen (`renderOperations()`, `:641-984`)

`#screen-specific-area` = `"E<sub>n+1</sub> Operations"` + Add button + Reset button (`:646-652`).

Header (7 columns, `:715-724`):

```
[ spacer w:0% white ]
[ "Equation"      w:100% padding:0  class="equation_header col_sub_header_format tool_tippable_cursor" title=<equationTitle> ]
[ "If Y=10&hellip;" w:0%             class="col_sub_header_format" ]     // 10 = SAMPLE_Y_VALUE_FOR_VALIDATION
[ "Weight"        w:0%              class="col_sub_header_format tool_tippable_cursor" title=<weightTitle> ]
[ #operation-checkbox-header             w:0%  (master checkbox mount) ]
[ #delete-all-operations-button-header   w:0%  containing #delete-all-operations-button ✖ ]
[ spacer w:0% white colspan=1 ]                                          // insert-arrow column
```

`equationTitle` (`:712`) — built at render time:

> `Equation must start with 'X1 +' or 'X2 +' and must resolve to a positive number. It should also include the variable 'Y' which represents the number of days between two X-Dates. Special constants and functions are allowed:<br>` + `specialConstantsAndFunctions`

`specialConstantsAndFunctions` (`:688-704`) = every `ALL_OPH_CONSTANTS` entry followed by `", "`
(including a trailing one), then every `ALL_OPH_FUNCTIONS[i].name + "(x)"` joined with `", "`.
With the shipped tables that string is exactly:

```
OPH_PI, OPH_PHI, OPH_CRV, OPH_HEP, oph_sqrt(x), oph_abs(x), oph_floor(x), oph_ceil(x), oph_log(x), oph_sin(x), oph_cos(x), oph_tan(x), oph_round(x), oph_flip(x), oph_exp(x)
```

`weightTitle` (`:713`):

> `This is how many points an individual Operation will contribute to the overall Score. Weight >= 1 is considered an Alpha Operation, otherwise Beta.`

**Special case, zero operations** (`:709-710`, `:805-808`): the header collapses to a single
`Error` cell **and no `#operation-checkbox-header` / `#delete-all-operations-button` exist**, and the
body is one row:
`<div class='col_output_text error_color panel_error_text'>An Iso-Event requires at least one Operation. Click the Add Button above to remedy that.</div>`.
`setUpMasterCheckbox` then silently no-ops because it guards on `if (headerElem)`
(`ophis_view__utils.js:735`).

Data row template (`:816-826`), 7 cells:

```
[ td w:0%     class="col_sub_header_format_for_row"  > div.input_row_name              ]  // filled by refreshOperationRows
[ td w:33.33% class="col_format col_with_input_left_right_padding" > input#equation-input-{i} ]  // NB: 33.33% here vs 100% in header
[ td w:0%     class="col_format col_with_input_left_right_padding" > div.operation_validation_result ]
[ td w:0%     class="col_format col_with_input_left_right_padding" > input#weight-input-{i} ]
[ td w:0%     class="col_format" > div > input.operation_checkbox                        ]
[ td w:0%     class="col_format" > div.row_delete_button ✖                               ]
[ td w:0%     class="col_format" > img.row_insert_button                                 ]
```

Row element: `<tr class="operation_row">`.

### 4.5 Keyboard navigation (Operations screen)

Both equation and weight inputs call `removeAllDisplayedToolTips()` on `focus` and on every `keydown`.

| Key | Equation input (`:839-864`) | Weight input (`:899-924`) |
|---|---|---|
| Enter (`KEY_CODE__ENTER = 13`, tested via `event.which`) | `this.blur()` | `this.blur()` |
| Escape (`isEscapeKey(event)`) | `this.blur()` | `this.blur()` |
| Tab | `preventDefault()` + `stopPropagation()`; focus next `.operation_equation_input`; if this was the last one, focus `document.getElementsByClassName("operation_weight_input")[0]` | same pattern down the weight column; if last, focus `document.getElementsByClassName("iso_event_name_input")[0]` — jumping into the **Iso-Events list in the left panel**, which is rendered by `ophis_view__rebuild.js` |

Focus is moved with `focusOphisInput()` (`ophis_view__rebuild.js:218`). Note every generated control
carries `tabindex="-1"`, so native tabbing is disabled app-wide and this hand-rolled ring is the only
tab order.

### 4.6 Blur / flush policy (`getFollowOnFlusher`, `:870-883`)

```js
function getFollowOnFlusher(event) {
    if (event.relatedTarget) {
        if (event.relatedTarget.classList.contains("operation_click_element")) return event.relatedTarget;
        else if (event.relatedTarget.classList.contains("operation_equation_input")) return event.relatedTarget;
    }
    return null;
}
```

Intent: if focus is moving to something that will itself flush (any `operation_click_element`, or
another equation box), skip the flush here to avoid a double screen refresh.

- **Weight input honours it**: `onWeightInputUpdate(event, followOnFlusher == null)` (`:929`).
- **Equation input does NOT**: the blur handler computes `flushChanges` and then throws it away,
  calling `onEquationInputUpdate(event, )` — note the stray trailing comma in the call (`:891`) —
  while `onEquationInputUpdate` hardcodes `var flushChanges = true;` at `:761`. The author documented
  this deliberately at `:755-760`: the old input-event approach "doesn't seem like a robust approach,
  and appears to be a bug even. Much safer to just swallow the occasional double-refresh."
  **The `followOnFlusher`/`flushChanges` locals at `:888-889` are dead code.**

---

## 5. OPERATION VALIDATION AND THE INLINE ERROR FEEDBACK

`refreshOperationRows()` (`:577-639`) re-validates **every** operation on every refresh. Per row `i`:

```js
var operationValidationErrors = [];
var operationFunction = validateOperationString(ithOperation.equation, i, operations, operationValidationErrors);
var isOperationValid = operationValidationErrors.length <= 0;

if (isOperationValid === false) {
    operationResult          = "Error: " + operationValidationErrors[0];   // full text -> title
    operationResultShortened = "Error";                                    // cell text
    resultClass              = "error_color help_cursor";
} else {
    var zValue = runOperationFunction(operationFunction, SAMPLE_Y_VALUE_FOR_VALIDATION); // Y = 10
    operationResult = operationResultShortened = "Z=" + zValue;
    resultClass     = "green_color";
}
```

Then it writes: `operationValidationResultElem.className = "operation_validation_result " + resultClass`,
`inputRowName.innerHTML = getRowShortNameHtml("O", i)` (→ `O<sub>i+1</sub>`),
`inputEquationElem.title = inputEquationElem.value = equation`, `inputWeightElem.value = weight`,
`operationValidationResultElem.innerHTML = operationResultShortened`,
`operationCheckboxElem.checked = (ithOperation.enabled === true)`.

**The tooltip is only assigned in the error branch** (`:629-633`) — see GOTCHA G-6.

### Validator contract (external — `ophis_model__validation.js:131-191`)

`validateOperationString(equationString, indexInOperationArray, otherOperations, errors_out) -> (Y:number)=>number`

Returns `DEFAULT_OPERATION_FUNCTION` (`new Function("Y", "return Y;")`, `ophis_model__validation.js:1`)
on failure. Error strings you must reproduce, in the order they can be produced:

| Condition | Message pushed |
|---|---|
| falsy / empty equation | `"Cannot be empty."` |
| does not normalise to a string starting `X1+` or `X2+` | `"Must start with 'X1 + &hellip;' or 'X2 + &hellip;'"` |
| arithmetic-syntax failure | whatever `validateSimpleArithmeticString()` pushes (early `return` — no further checks) |
| `new Function` threw | `"" + e` (the raw exception text) |
| result at `Y=10` is not a valid positive number | `Z_VALUE_MUST_BE_GREATER_THAN_ZERO_MESSAGE` = `"Z-value must resolve to a number > 0."` |
| equal (after normalisation) to an **earlier** operation | `"Indentical to Operation " + (i+1) + " and each Operation must be unique."` (`Indentical` is misspelled in the source) |

The duplicate check only scans **backwards** (`for (var i = indexInOperationArray-1; i >= 0; i--)`), so
the *later* of two identical operations is the one flagged — the earlier one stays green.

`runOperationFunction(fn, Y)` (`ophis_model__operations.js:220-226`) = `roundNumberToTimePrecision(fn(Y))`.

**Validation is display-only.** An invalid equation is still stored on the model and still flushed to
disk; nothing blocks it. The engine falls back to `DEFAULT_OPERATION_FUNCTION` (identity on Y) at
evaluation time.

---

## 6. THE DAY-SCOPE TIME PICKER (flatpickr configuration)

`ISO_EVENT_SETTING__X_DATE_OFFSET__DAY_SCOPE.setUpListeners()` (`:83-142`), exact sequence:

1. `inputElem = document.getElementById("event-day-scope-start-time")`.
2. `var lat = 0; var long = 0;` — **hardcoded**, closed over by both callbacks.
3. `dayScopeStartTimeInMillis = currentIsoEvent.day_scope_start_time_in_millis ? … : 0` (falsy → 0).
4. `nativeDate = utcMillisToNativeDate(millis)`; `readableTime = nativeDateToReadableString_timeOnly(nativeDate, 0, 0)`
   → an `"HH:MM"` string, zero-padded.
5. `inputElem.value = readableTime`.
6. `flatPickrConfig = FLATPICKR_BASE_DATE_CONFIG__HH_MM__TIME_ONLY()` (`ophis_view__config.js:51-59`):
   ```js
   {
     dateFormat: X_DATE_TIME_DISPLAY_FORMAT,  // "H:i"   (ophis_config.js:278)
     noCalender:  true,                       // *** TYPO: flatpickr's option is `noCalendar` ***
     enableTime:  true,
     time_24hr:   true,
     allowInput:  ALLOW_FLATPICKR_INPUT       // true    (ophis_view__config.js:49)
   }
   ```
   then `flatPickrConfig.defaultDate = readableTime` (`:97`).
7. `fallbackDateString(inputElemForCallback)` (`:99-107`) — re-reads the model (fresh
   `getCurrentIsoEvent()`) and returns the same `"HH:MM"` string. Used by `setUpDateInput` to revert
   unparseable input.
8. `onValidDateEntered(inputElemForCallback, parsedNativeDate, xDate)` (`:109-122`):
   ```js
   currentIsoEvent = getCurrentIsoEvent();                                // re-fetched, not the closure
   parsedNativeDate_millis = nativeDateToUtcMillis(parsedNativeDate);
   currentIsoEvent.day_scope_start_time_in_millis = parsedNativeDate_millis;
   flushChangesToDisk();
   refreshXDates(REFRESH_TYPE__SOFT, /*preserveScrollPosition=*/false, OPHIS_INPUT_CHANGE__CHANGED);
   ```
   The in-source comment at `:113` reads "This value will be midnight of current browser's timezone."
9. `setUpDateInput(flatPickrConfig, inputElem, EVENT_SCOPE__HH_MM, /*timeZone*/null, fallbackDateString, onValidDateEntered, /*timeOnly=*/true)`
   (`ophis_view__utils.js:62`). With `timeOnly === true` the helper parses via `validateXDateTime()`,
   builds `utcMillisToNativeDate(0)` then `setUTCHours(h, m)`, and appends `" 00:00"` as the fallback
   when the string will not validate.
10. `flatpickr(inputElem, flatPickrConfig)`.
11. **Manual calendar suppression** (`:130-141`) — verbatim comment: *"Seems like a bug in flatpickr,
    that it's still showing the calendar and not just the time."* Followed by
    ```js
    if (inputElem._flatpickr) {
        if (inputElem._flatpickr.innerContainer) inputElem._flatpickr.innerContainer.style.display = "none";
        if (inputElem._flatpickr.monthNav)       inputElem._flatpickr.monthNav.style.display       = "none";
    }
    ```
    It is **not** a flatpickr bug — see GOTCHA G-3.

---

## 7. DEPENDENT / CONDITIONAL CONTROLS

| Trigger | Consequence | Where |
|---|---|---|
| `isoEvents.length <= 1` | Swap screen body replaced by an error row; `refreshIsoEventSwapRows()` early-returns; both swap master checkboxes never mount (their header cells don't exist); Apply stays disabled | `:176-180`, `:413`, `:436-439` |
| Row's source radio checked | That row's target checkbox is `disabled` + `checked=false`, its model flag `checked_for_swap_target=false`, and its three `.event_swap_target_cell` cells drop to `opacity 0.5`; the checkbox itself is forced back to `opacity 1.0` | `:216-227` |
| No event flagged as source | Row 0 is force-selected as source (both DOM and model) | `:207-214` |
| Switching source while *all* other events were targets | The previous source is auto-promoted to target | `:496-515` |
| Target selection empty **or** all Data checkboxes unchecked | `Apply` disabled | `:308-312` |
| Target event's `scope != EVENT_SCOPE__HH_MM` after a swap | `toggleIsoEventLocationEnabled(target, false)` — location silently cleared | `:386-392` |
| `operations.length == 0` | Operations header becomes a single `Error` cell; master checkbox and delete-all button are not created; body shows the "requires at least one Operation" message | `:709-710`, `:805-808` |
| Operation equation invalid | Result cell shows `Error` with `error_color help_cursor` and a `title` carrying `"Error: " + firstError` | `:594-600`, `:629-635` |
| Weight parses to `null` or `<= 0` | Silently coerced to `POINTS__BETA_OPERATION_MATCH` (`0.5`) | `:784-788` |
| Blur target has class `operation_click_element` or `operation_equation_input` | Weight update skips flush + refresh (equation update does not — see §4.6) | `:870-883`, `:929` |

There are **no presets, no defaults-restore for the Event Settings screen, and no settings
import/export in this file.** The only defaults-restore is the Operations **Reset** button
(§3.C), which installs `cloneDefaultOperationsForAppVersionGte10()` =
`cloneDefaultOperationsForAppVersionGte8()` (15 ops, all forced `enabled=true`, with
`X1+YxOPH_PI` and `X2+(Y/2.0)xOPH_PHI` upgraded to weight `1`) plus
`deepClone(OPH_HEP_OPERATION_FOR_X2)` = `newOperation("X2+YxOPH_HEP", 1, true)` → **16 operations**
(`ophis_model__params.js:65-142`).

Bulk *copying* of settings between events (the swap screen) is the closest thing to import/export here;
real file/paste import-export lives in `ophis_view.js` / `ophis_view__export.js`.

### Chart options as they appear in this UI

The `chart_option__*` family is **not editable on any screen this file renders.** It appears only as
transfer row **D₈ "Chart Config"** (`:48-53`), which copies `source[c.serializationKey]` for every
`c` in `SERIALIZED_CHART_OPTION_FIELDS`. For a reimplementer, that array is (from
`ophis_config.js:200-266`; `serializationKey` = `varName` minus the `SERIALIZED_FIELD__` prefix,
lowercased — `ophis_utils.js:124-146`):

| # | `serializationKey` | Visible label | Default on |
|---|---|---|---|
| C₁ | `chart_option__show_chart` | Chart Itself | **true** |
| C₂ | `chart_option__show_dates` | Chart Dates | **true** |
| C₃ | `chart_option__show_new_moons` | New | false |
| C₄ | `chart_option__show_first_quarter_moons` | 1st Quarter | false |
| C₅ | `chart_option__show_full_moons` | Full | false |
| C₆ | `chart_option__show_third_quarter_moons` | 3rd Quarter | false |
| C₇ | `chart_option__show_waxing_crescent_moons` | Wax Crscnt | false |
| C₈ | `chart_option__show_waning_crescent_moons` | Wan Crscnt | false |
| C₉ | `chart_option__show_waxing_gibbous_moons` | Wax Gibb | false |
| C₁₀ | `chart_option__show_waning_gibbous_moons` | Wan Gibb (`textOnlyName` is `"Wax Gibbous"` — **source typo**) | false |
| C₁₁ | `chart_option__full_solar_eclipses` | Full Solar | false |
| C₁₂ | `chart_option__partial_solar_eclipses` | Partial Solar | false |
| C₁₃ | `chart_option__full_lunar_eclipses` | Full Lunar | false |
| C₁₄ | `chart_option__partial_lunar_eclipses` | Partial Lunar | false |

None of these define `numericDefault`, which is why D₈'s omission of `serializationKeyForValue` is
currently harmless (GOTCHA G-2).

For symmetry, the D₅ "Filters" transfer copies these 8 (`ophis_config.js:122-174`), three of which
**do** carry a numeric companion value and therefore rely on the `serializationKeyForValue` branch:

| # | `serializationKey` | Label | Default on | `numericDefault` → `<key>_value` |
|---|---|---|---|---|
| F₁ | `iso_event_filter_before_last_x_date` | before last X-Date | true | — |
| F₂ | `iso_event_filter_on_last_x_date` | on last X-Date | true | — |
| F₃ | `iso_event_filter_before_current_date` | before current date | true | — |
| F₄ | `iso_event_filter_on_current_date` | on current date | false | — |
| F₅ | `iso_event_filter_beyond_max_days` | beyond `[input]` days | true | `HIGHEST_MSRF_NUMBER = 2559` |
| F₆ | `iso_event_filter_min_hit_count` | Hits are below `[input]` | false | `2` |
| F₇ | `iso_event_filter_min_score` | Score is below `[input]` | false | `1` |
| F₈ | `iso_event_filter_msrf_match` | no MSRF matches | false | — |

---

## 8. EXTERNAL DEPENDENCIES (resolved contracts)

Everything `ophis_view__settings.js` reaches for, with the definition site. **None of these are
guesses — each was read.**

### Constants

| Symbol | Value | Defined |
|---|---|---|
| `SAMPLE_Y_VALUE_FOR_VALIDATION` | `10` | `ophis_config.js:422` |
| `POINTS__BETA_OPERATION_MATCH` | `.5` | `ophis_model__params.js:3` |
| `POINTS__ALPHA_OPERATION_MATCH` | `1` | `ophis_model__params.js:2` |
| `OPACITY__DISABLED` / `OPACITY__ENABLED` | `0.5` / `1.0` | `ophis_view__config.js:117-118` |
| `MIN_TIME_FIELD_WIDTH` | `"65px"` | `ophis_view__config.js:115` |
| `KEY_CODE__ENTER` | `13` | `ophis_view__config.js:10` |
| `EVENT_SCOPE__HH_MM` | `"EVENT_SCOPE__HH_MM"` | `ophis_config.js:321` |
| `REFRESH_TYPE__SOFT` / `__HARD` / `__RIGHT_PANEL_ONLY` | self-named strings | `ophis_config.js:433-435` |
| `OPHIS_INPUT_CHANGE__CHANGED` / `__NO_CHANGE` | self-named strings | `ophis_config.js:60-61` |
| `MINIMUM_OPERATIONS_REQUIRED` | `1` | `ophis_config.js:96` — **referenced only inside commented-out code here** |
| `ALL_OPH_CONSTANTS` | `["OPH_PI","OPH_PHI","OPH_CRV","OPH_HEP"]` | `ophis_config.js:415-420` |
| `ALL_OPH_FUNCTIONS` | `[oph_sqrt, oph_abs, oph_floor, oph_ceil, oph_log, oph_sin, oph_cos, oph_tan, oph_round, oph_flip, oph_exp]` | `ophis_utils.js:1075-1087` |
| `HELP_MESSAGE__EVENT_SWAP` | `"This screen makes it easy to apply Settings from one Iso-Event to one or more other Iso-Events."` | `ophis_view__strings.js:10` |
| `SERIALIZED_FILTER_FIELDS` / `SERIALIZED_CHART_OPTION_FIELDS` | see §7 | `ophis_config.js:122` / `:200` |
| `DEFAULT_DAY_SCOPE_START_TIME_MILLIS` | `0` | `ophis_config.js:352` |
| `X_DATE_TIME_DISPLAY_FORMAT` | `"H:i"` | `ophis_config.js:278` |
| `ALLOW_FLATPICKR_INPUT` | `true` | `ophis_view__config.js:49` |

### Master-checkbox configs consumed (`ophis_view__config.js`)

```ts
newMasterCheckbox(baseElemId, baseClassName, title, onChildNowCheckedOrNot, onMasterCheckboxChangeComplete)
// -> { baseElemId, baseClassName, title, onChildNowCheckedOrNot, onMasterCheckboxChangeComplete }
```

| Config | `baseElemId` | `baseClassName` | `title` | child effect | completion effect |
|---|---|---|---|---|---|
| `MASTER_CHECKBOX_CONFIG__OPERATIONS` (`:247`) | `operation-checkbox` | `operation_checkbox` | `Enable/Disable all Operations` | `getCurrentIsoEvent().operations[rowIndex].enabled = nowChecked` | `flushChangesToDisk()`; `refreshXDates(RIGHT_PANEL_ONLY, false, CHANGED)` |
| `MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP` (`:263`) | `iso-event-swap-checkbox` | `iso_event_swap_checkbox` | `Enable/Disable all Destination Iso-Events` | `appState.isoEvents[rowIndex].checked_for_swap_target = nowChecked` | `refreshIsoEventSwapRows()`; `refreshMasterCheckboxBasedOnChildChange(...)` — **no flush** |
| `MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP_SETTING` (`:281`) | `iso-event-swap-setting-checkbox` | `iso_event_swap_setting_checkbox` | `Enable/Disable all Settings` | `ISO_EVENT_DATA_TRANSFERS[rowIndex].checkboxEnabled = nowChecked` | `refreshIsoEventSwapRows()`; `refreshMasterCheckboxBasedOnChildChange(...)` |

`setUpMasterCheckbox(cfg)` (`ophis_view__utils.js:728-759`) looks up `#{baseElemId}-header`, and if it
exists **replaces its innerHTML** with
`<input type="checkbox" id="{baseElemId}-master" class="{baseClassName}_master" title="{title}">`,
then wires `change` → for every child checkbox index `i`, `onChildNowCheckedOrNot(i, this.checked)`,
then `onMasterCheckboxChangeComplete()`. **If the header element is missing it silently does nothing.**

### Functions

| Symbol | Signature / behaviour | Defined |
|---|---|---|
| `getCurrentIsoEvent()` | → current `IsoEvent` | `ophis_controller.js:3` |
| `addOperation(isoEvent, insertIndex = -1)` | pushes (or splices at `insertIndex`) `newOperation("X1+Y", 0.5, true)`; then `flushChangesToDisk()` + `refreshXDates(SOFT,false,CHANGED)` | `ophis_controller.js:241-261` |
| `refreshXDates(refreshType, preserveScrollPosition = false, ophisInputChange = CHANGED)` | full view refresh pipeline | `ophis_controller.js:433` |
| `refreshIsoEvents(refreshType, ophisInputChange)` | rebuilds left-panel Iso-Event list then refreshes | `ophis_controller.js:95` |
| `flushChangesToDisk(forceFlush = false, showSaveStatus = true)` | persists `appState` | `ophis_model__persistence.js:235` |
| `markChangesSaved(showSaveStatus = true)` | clears dirty flag | `ophis_model__persistence.js:295` |
| `validateOperationString(eq, i, otherOps, errors_out)` | see §5 | `ophis_model__validation.js:131` |
| `runOperationFunction(fn, Y)` | `roundNumberToTimePrecision(fn(Y))` | `ophis_model__operations.js:220` |
| `parseFloatString(str, index, serializationKey, loadErrors_out = [])` | `parseFloat` + validity check; `null` on failure | `ophis_model__validation.js:360` |
| `validateXDateTime(xDateTime, errors_out = [])` | → `{hours, minutes}` or `null` | `ophis_model__validation.js:1171` |
| `cloneDefaultOperationsForAppVersionGte10()` | → 16 default `Operation`s (deep-cloned) | `ophis_model__params.js:137-142` |
| `newOperation(equation, weight, enabled = true)` | **ignores `enabled`, always `true`** | `ophis_utils.js:1006` |
| `deepClone(obj)` | structural clone | `ophis_utils.js:815` |
| `utcMillisToNativeDate(ms)` / `nativeDateToUtcMillis(d)` | UTC ↔ Date | `ophis_utils.js:326` / `:320` |
| `nativeDateToReadableString_timeOnly(date, lat = null, long = null)` | → `"HH:MM"`; uses moment/timezone path when `isValidLatAndLong(lat,long)` | `ophis_view__strings.js:195` |
| `getRowShortNameHtml(letter, n, useSubscript = true)` | → `letter + "<sub>" + (n+1) + "</sub>"` when `n` is a non-negative int | `ophis_view__strings.js:58` |
| `enableRowButton(el)` / `disableRowButton(el)` | opacity/cursor/color/`disabled`; radios get `parentElement.style.cursor` instead of opacity | `ophis_view__strings.js:94` / `:79` |
| `setUpDateInput(cfg, elem, scope, tzOrNull, fallbackDateString, onValidDateEntered, timeOnly = false)` | installs `cfg.onChange`, plus `keydown`/`input`/`blur` handlers on the input; re-entrancy guarded by `onValidDateEntered_calling` | `ophis_view__utils.js:62` |
| `getClickedRowIndex(event)` → `getRowIndex(elem)` | `parseInt(elem.getAttribute("row_index"))`, falling back to `elem.parentElement`'s attribute | `ophis_view__utils.js:355-373` |
| `getEventTargetElem(event)` | resolves the event target | `ophis_view__utils.js:383` |
| `getOutputContainer()` / `addOutputRow()` | the `<table>` and a new header row in it | `ophis_view__utils.js:326` / `:276` |
| `scrollPanelToBottom(elem)` | — | `ophis_view__utils.js:2` |
| `showDialog(message, noOrOkButtonText, yesButtonText = null, onYes = null, onNo = null, onPreNo = null, cancelable = true)` | modal | `ophis_view__utils.js:461` |
| `showOkDialog(message)` | `showDialog(message, "OK")` | `ophis_view__utils.js:457` |
| `isEscapeKey(evt)` | — | `ophis_view__utils.js:292` |
| `applyToolTip(el)` / `applyToolTipToCssClass(cls)` / `removeAllDisplayedToolTips()` | tooltip layer | `ophis_dependencies.js:245` / `:237` / `:126` |
| `focusOphisInput(el)` | — | `ophis_view__rebuild.js:218` |
| `toggleIsoEventLocationEnabled(isoEvent, enabled)` | — | `ophis_view__rebuild.js:226` |
| `refreshMasterCheckboxBasedOnChildChange(baseElemId, baseClassName)` | tri-state sync | `ophis_view__rebuild.js:616` |
| `recenterChart()` | — | `ophis_view__chart.js:55` |
| `flatpickr(elem, cfg)` | third-party, `lib/flatpick.min.js` | — |

### Global state read/written

- `appState.isoEvents` — array of `IsoEvent`.
- `appState.globalOptions.current_iso_event_index` — used only for the screen title badge (`:646`).
- `ISO_EVENT_DATA_TRANSFERS[*].checkboxEnabled` — module-level, non-persisted.

### DOM ids / classes that cross module boundaries

Created here, read elsewhere (or by the shared master-checkbox helper):
`screen-specific-area` (read/written), `event-swap-help-button`, `apply-event-swap-button`,
`event-source-header`, `iso-event-swap-setting-checkbox-header`, `iso-event-swap-checkbox-header`,
`add-operation-button`, `reset-operations-button`, `operation-checkbox-header`,
`delete-all-operations-button-header`, `delete-all-operations-button`,
`equation-input-{i}`, `weight-input-{i}`, `event-day-scope-start-time`, `event-notes-text-area`.

Classes: `iso_event_swap_row`, `event_name_source`, `event_name_target`, `event_name_destination`,
`event_swap_target_cell`, `empty_event_swap_cell`, `row_radio_button_for_swap`,
`row_radio_button_for_swap_label`, `iso_event_swap_checkbox`, `iso_event_swap_setting_checkbox`,
`operation_row`, `operation_equation_input`, `operation_weight_input`, `operation_checkbox`,
`operation_validation_result`, `operation_click_element`, `row_delete_button`, `row_insert_button`,
`row_delete_button_master`, `input_row_name`, `tool_tippable_cursor`, `iso_event_setting_row`
(applied in `ophis_view.js`), plus consumed-from-elsewhere `iso_event_name_input` (`:918`).

Image asset: `./img/left_arrow.png` (the insert-above arrow, `:814`).

---

## 9. GOTCHAS

**G-1 — `IsoEventDataTransfer.elemId` is dead.** All ten DTOs carry a hand-written kebab-case id
(`iso-event-source-name`, …) that is stored by the factory (`:4`) and **never read by any file in the
codebase.** The swap checkboxes are addressed by class + `row_index` attribute, not by id. Do not
build a reimplementation around these ids; either drop the field or actually use it.

**G-2 — D₅ and D₈ are asymmetric.** The Filters transfer copies both `serializationKey` *and*
`serializationKeyForValue` when `numericDefault != null` (`:37-39`); the Chart Config transfer copies
only `serializationKey` (`:49-52`). Today no chart-option field has a `numericDefault`, so nothing is
lost — but **the moment someone adds a numeric chart option, D₈ will silently fail to copy its value.**
Note also the truthiness mismatch elsewhere: `createNewIsoEvent` seeds the companion value with
`if (ithFilterField.numericDefault)` (`ophis_controller.js:136`, truthy) while D₅ uses
`!= null` — a `numericDefault` of `0` would be copied but never initialised.

**G-3 — `noCalender` is a typo, not a flatpickr bug.** `FLATPICKR_BASE_DATE_CONFIG__HH_MM__TIME_ONLY()`
sets `noCalender: true` (`ophis_view__config.js:54`); flatpickr's actual option is **`noCalendar`**
(confirmed present in `lib/flatpick.min.js`). The unknown key is ignored, the calendar renders, and
`ophis_view__settings.js:130-141` then hides `innerContainer` and `monthNav` by hand — with a comment
blaming flatpickr. A reimplementation should just spell the option correctly and delete the
workaround; but be aware that fixing the typo changes flatpickr's internal DOM, so the defensive
`if (inputElem._flatpickr…)` hiding must be removed at the same time or it will hide the time picker.

**G-4 — lat/long `0, 0` is *valid*, not "unset".** `setUpListeners` hardcodes `lat = 0; long = 0`
(`:85-86`) and passes them to `nativeDateToReadableString_timeOnly`. `isValidLatAndLong(0,0)` returns
**true** (`ophis_model__validation.js:403-405`; `0` is finite and within `±LAT_LIMIT=65` / `±LONG_LIMIT=180`),
so the function takes the moment/timezone branch (`convertNativeUtcDateToLocalMoment`) rather than the
`getHours()/getMinutes()` branch. Coordinates 0,0 sit in UTC+0, so the displayed time is effectively
the UTC time of the stored millis — which is what's wanted, but only by coincidence. A reimplementer
who "cleans this up" to `null, null` will change the displayed time to the browser's local timezone
and break round-tripping against `nativeDateToUtcMillis`.

**G-5 — Weight/equation edits that don't change the model leave stale text on screen.** Both
`onEquationInputUpdate` (`:767`) and `onWeightInputUpdate` (`:790`) guard the whole body behind
`if (model.value != newValue)`. For weight, `"abc"` coerces to `0.5`; if the weight was already `0.5`,
the guard fails, no refresh runs, and **the input box keeps showing `abc`** until some unrelated
refresh calls `refreshOperationRows()` (which does `inputWeightElem.value = ithOperation.weight`).
Same class of bug for the equation box when the typed string is identical to the stored one after
whitespace differences that `!=` doesn't collapse. Fix: always re-render the row on blur.

**G-6 — The error tooltip is never cleared.** `refreshOperationRows()` sets
`operationValidationResultElem.title = operationResult` **only** in the invalid branch (`:629-633`),
with an explicit `// No tooltip needed.` in the valid branch. Because the result `<div>` is a
persistent DOM node (only its `className`/`innerHTML` are rewritten), an operation that was broken
and is then fixed keeps the stale `title="Error: …"` hovering over a green `Z=…` cell.

**G-7 — `flushChanges` in the equation blur path is dead.** `:888-889` computes it and `:891` calls
`onEquationInputUpdate(event, )` (trailing comma, one argument) into a one-parameter function that
hardcodes `flushChanges = true` at `:761`. This is *intentional* per the comment at `:755-760`, but the
dead locals make it look like a live feature. Weight blur (`:929`) does honour the flag, so the two
inputs genuinely behave differently: tabbing from weight to another operation control leaves the
change unflushed and unrefreshed, relying on the follow-on click to flush.

**G-8 — Zero Iso-Events produces an inconsistent swap screen.** The header branch tests
`appState.isoEvents.length == 1` (`:413`) but the body branch tests `isoEvents.length <= 1` (`:436`).
With **zero** events you get the full nine-column header *and* the "at least two Iso-Events" error row.
`refreshIsoEventSwapRows()` early-returns, so nothing crashes, but the layout is wrong. Use `<= 1` in
both places.

**G-9 — Event names are injected as raw HTML.** `:456` and `:473` interpolate `ithIsoEvent.name`
straight into `innerHTML`, as does `:464` for `ithSetting.readableName` (which legitimately contains
markup — D₁₀'s name is `S<sub>2</sub> Start Time`). An event named `<img onerror=…>` executes. This is
an offline single-user app so it is not a live security boundary, but a rebuild that ever loads a
shared `.oph` file must escape the name.

**G-10 — D₁₀'s label hard-codes another registry's index.** `ISO_EVENT_DATA_TRANSFER__DAY_SCOPE_START_TIME`
names itself `getRowShortNameHtml("S", 1) + " Start Time"` → `"S₂ Start Time"` (`:59`), where the `1`
is the index of `ISO_EVENT_SETTING__X_DATE_OFFSET__DAY_SCOPE` inside `ISO_EVENT_SETTINGS` (`:166-169`).
**Reorder `ISO_EVENT_SETTINGS` and this label silently lies.** Derive it with `indexOf` instead.

**G-11 — `isoEvents` is used before its declaration in the Apply handler.** `:347` reads `isoEvents`
inside the `onYes` closure, but `var isoEvents = appState.isoEvents;` is at `:409`. `var` hoisting to
the enclosing function scope plus the fact that the click fires after render means it works — but the
closure captures the *array reference from render time*. If any code ever replaces
`appState.isoEvents` with a new array without re-rendering the swap screen, Apply operates on the
stale array. `renderIsoEventDataTransfer` should read `appState.isoEvents` inside the handler, the way
`renderOperations`'s dialog callbacks re-fetch `getCurrentIsoEvent()` (`:658`, `:732`).

**G-12 — `renderOperations` closes over `currentIsoEvent` for the input handlers.**
`onEquationInputUpdate`/`onWeightInputUpdate` and the delete handler use the `currentIsoEvent` captured
at `:643`, unlike the dialog callbacks which re-fetch. In practice the screen is fully re-rendered when
the selected Iso-Event changes, so it holds — but it is a latent stale-reference bug and should be
rewritten to `getCurrentIsoEvent()`.

**G-13 — `refreshOperationRows()` assumes DOM/model row parity.** It iterates `operations.length` and
indexes `document.getElementsByClassName("operation_row")[i]` (`:583`, `:610`) with no bounds check. It
is only reachable from `ophis_view.js:263` (the "don't clear the container" path), so parity holds
today; any new caller that mutates `operations` without a re-render will throw
`Cannot read properties of undefined`.

**G-14 — Two `id="event-source-header"` elements exist on the Event Settings screen.**
`ophis_view.js:451` and `:452` both emit that id. `refreshIsoEventSwapMaxWidths()` uses
`getElementById("event-source-header")` (`:251`) — harmless only because the two screens never coexist.
Rename one.

**G-15 — Delete has no confirmation, and the minimum-operations guard is disabled.** The per-row `✖`
deletes immediately (`:966-975`), and the `MINIMUM_OPERATIONS_REQUIRED` check that would keep the first
operation undeletable is commented out in two places (`:561-565`, `:952-956`) in favour of an
unconditional `enableRowButton(deleteButtonElem)` (`:958`). You can empty the list entirely; the UI
then shows the "requires at least one Operation" error state. The bulk **Delete all** button *does*
confirm.

**G-16 — Class string typos to carry over or fix deliberately.** `"iso_event_swap_checkbox "`
has a trailing space (`:474`); the operation checkbox literal contains `tabindex="-1"` **twice**
(`:823`); the validator message says `"Indentical"`; the Target Events tooltip says
`"from the select Iso-Event"`. All are cosmetic, but if you diff a rebuild against the original,
expect them.

**G-17 — Swap selection state is transient but lives on the persisted model object.**
`checked_for_swap_source` / `checked_for_swap_target` are written onto `IsoEvent` records, yet
explicitly `delete`d from the save blob (`ophis_model__validation.js:473-474`) and re-initialised to
`false` when a new event is created (`ophis_view__rebuild.js:559-560`). None of the swap checkbox
handlers call `flushChangesToDisk()`. A rebuild should keep this selection in view state, not on the
model.

**G-18 — `disableRowButton` on a checkbox both dims and disables; the code then un-dims.**
`disableRowButton` sets `opacity = 0.5`, `cursor = not-allowed`, `color = grey`, `disabled = true`
(`ophis_view__strings.js:79-92`). At `:226` the swap code immediately resets `opacity` to `1.0` so the
checkbox is not dimmed twice (its containing cells are already at `0.5`). Reproduce the *net* visual —
cells at 50 %, checkbox at 100 % but `disabled` — not the literal call sequence.

---

## 10. DEAD / COMMENTED-OUT CODE INVENTORY

| Lines | Content |
|---|---|
| `:321` | commented-out `resetOperationButtonHtml` for the swap screen (a "Reset" button that was never shipped there) |
| `:561-565` | commented-out `MINIMUM_OPERATIONS_REQUIRED` guard inside the swap row loop — copy-pasted from the operations loop; references `currentIsoEvent` which is **not in scope there** and would throw if uncommented |
| `:762` | commented-out `console.log("flushChanges=" + flushChanges)` |
| `:792` | commented-out `targetElem.title = parsedFloat` |
| `:888-889` | live-but-dead `followOnFlusher` / `flushChanges` in the equation blur handler (G-7) |
| `:952-956` | second commented-out `MINIMUM_OPERATIONS_REQUIRED` guard, in the operations loop |
| `:269` (`ophis_view.js`) | commented-out `refreshOperationRows()` for the swap screen's non-clearing refresh path — the swap screen therefore has **no** soft-refresh path at all; it only re-renders when the container is cleared |

Live TODOs in the file: `:404` and `:674`/`:748` — all three the same note, questioning whether every
dialog dismissal needs to force a re-validation refresh.
