# 08 — Results Rendering & DOM Rebuild Cycle

**Subsystem:** `view-output`
**Primary sources (read in full, line-by-line):**

- `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/src/ophis_view__output.js` (922 lines)
- `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/src/ophis_view__rebuild.js` (1030 lines)

**Supporting sources consulted for cross-module contracts** (cited but *not* my assignment — treat their internals as another spec's responsibility):
`ophis_config.js`, `ophis_view__config.js`, `ophis_view__strings.js`, `ophis_view__utils.js`,
`ophis_view.js`, `ophis_controller.js`, `ophis_model__operations.js`, `ophis_model__params.js`,
`ophis_model__sorting.js`, `ophis_model__validation.js`, `ophis_utils.js`, `ophis_dependencies.js`, `ophis.css`.

> **Note on the host page.** No HTML file in the repository defines the DOM ids these two modules
> address (`grep -rl "output-container" --include=*.html` over the repo tree returns nothing;
> `dist/PSYFR1.html`, `dist/PSYFR2.html`, and root `OPHIS.html` do **not** contain them). The DOM
> skeleton must be reconstructed from the id/class strings enumerated in §0 below. This is a real
> gap, not an omission on my part.

---

## 0. DOM CONTRACT — every id and class these two files touch

### 0.1 Element ids read/written by `ophis_view__output.js`

| id | Type | Used at | Purpose |
|---|---|---|---|
| `current-local-time` | `<input>` | output.js:4, 90 | "Current Time" field; flatpickr-attached |
| `reset-time-button` | `<button>` | output.js:48, 139 | Resets the local-time offset to 0 |
| `current-time-help-button` | `<button>` | output.js:81, 149 | Opens the Current Time help dialog |
| `screen-specific-area` | container | output.js:84, 765 | Per-screen toolbar strip above the output table |
| `output-container` | `<table>` | via `getOutputContainer()` / `addOutputRow()` (`ophis_view__utils.js:276,326`) | The results table itself |
| `z-date-filter-checkbox-label` | (absent) | output.js:161 | Tooltip target that is **never created** — see GOTCHA G-14 |
| `SORT_TYPE__DATE` / `SORT_TYPE__HIT_COUNT` / `SORT_TYPE__SCORE` / `SORT_TYPE__MSRF` / `SORT_TYPE__OPERATIONS` | `<table>` inside `<td>` | output.js:257, 333, 675-676 | Sort-header click targets. **The sort-type enum string is literally the element id.** |
| `hide_date_col` / `hide_hits_col` / `hide_score_col` / `hide_msrf_col` / `hide_operations_col` | `<input type=checkbox>` | output.js:219, 688-690 | Show/hide column checkboxes. **The global-option key string is literally the element id.** |

### 0.2 Element ids read/written by `ophis_view__rebuild.js`

| id | Used at | Purpose |
|---|---|---|
| `iso-event-filter-container` | rebuild.js:23, 33, 43 | Filter panel; its `clientHeight` is the master layout unit |
| `panel-container-top-row` | rebuild.js:24, 67, 81, 126 | Ancestor test for "is this a top-row scroll container" |
| `output-container` | rebuild.js:30, 178 | Results table |
| `scrollable-container-for-output-container` | rebuild.js:31, 175-207; utils:23 | Scroll wrapper around the results table |
| `panel-container-bottom-row-table` | rebuild.js:163 | Read but **never used** (dead, see G-21) |
| `col-header-inner-for-output-panel` | rebuild.js:165, 192 | Supplies the pixel width when the output panel is expanded |
| `bottom-row-panel-cell-for-chart` | rebuild.js:167, 195, 209 | Hidden/shown when output panel expands |
| `iso-event-container` | via `getIsoEventContainer()` (utils:320) | Iso-Event `<table>` |
| `x-date-container` / `t-date-container` | via `getXDateContainer()`/`getTDateContainer()` (utils:304,310) | X-Date / T-Date `<table>`s |
| `reset-x-dates-button` / `reset-t-dates-button` | rebuild.js:672, 991 | "Reset all dates" buttons |
| `x-date-input-header` / `t-date-input-header` | rebuild.js:673, 962 | Column header `<td>` whose `.title` carries the tooltip |
| `prior-sunset-header` / `prior-sunset-header-t-dates` | rebuild.js:974-987 | Sunset column headers (hidden by default) |
| `x-date-container-starting-message` / `t-date-container-starting-message` | rebuild.js:953, 997, 1019 | Empty-state help blocks |
| `<baseElemId>-master` (e.g. `x-date-checkbox-master`) | rebuild.js:618 | Master (tri-state) checkboxes |

### 0.3 CSS classes queried by these two files

`scrollable_container`, `col_header_background`, `chart_container`, `chart_options_scrollable_container`,
`bottom_row_panel_cell`, `t_date_scrollable_container`, `x_date_scrollable_container`,
`inner_panel_table`, `inner_panel_table_starting_message`, `x_date_row`, `t_date_row`,
`x_date_row_dummy`, `t_date_row_dummy`, `iso_event_row`, `z_date_output_row`,
`z_match_with_tool_tip`, `date_input_common`, `x_date_calendar_input`, `t_date_calendar_input`,
`x_date_checkbox`, `t_date_checkbox`, `iso_event_name_input`, `operation_equation_input`,
`row_delete_button`, `row_clone_button`, `row_notes_button`, `row_insert_button`,
`row_radio_button`, `row_radio_button_for_swap`, `lat_input`, `long_input`, `open_map_icon`,
`timezone_display`, `x_date_count`, `location_enabled_checkbox`, `scope_display`,
`event_type_display`, `prior_sunset_display`, `prior_sunset_cell`, `prior_sunset_display_wrapper`.

---

## 1. THE RESULTS TABLE

### 1.1 Entry point and dispatch

```
refreshCurrentPage(...)                    // ophis_view.js:93
  └─ if currentScreen == OPHIS_SCREEN__Z_DATES:
       setUpCondensedOutputOptionsControls(results)   // output.js:70
       renderCondensedOutputElseErrors(results)       // output.js:177
            ├─ clearOutputContainer()                 // defensive; ophis_view.js:334
            ├─ if results.errors.length > 0 → renderErrors(errors)
            └─ else → renderCondensedOutput(results)  // output.js:190
```

`renderCondensedOutputElseErrors` (output.js:177-188) calls `clearOutputContainer()` unconditionally
first — the comment at output.js:180 calls it a "Defensive measure. Should be superfluous but calling
just in case of upstream weirdness."

### 1.2 Header rows

Two header rows may be emitted, in this order:

**Row A — "hide columns" header (only when `FEATURE_FLAG__ALL_OPERATOR_HIDE_OUTPUT_COLS` is true).**
That flag is **`false`** in shipping config (`ophis_config.js:311`), so Row A is normally absent.
Built by `hideColHeaderHtml(hideColGlobalOption)` (output.js:198-231). Cells, in order
(output.js:296-305): spacer, Dates, Hits, Score, MSRF, and Operations *only if*
`appState.globalOptions["hide_operations_col_completely"] === false`.

Each cell content is:

```html
<table title='Show/Hide the output in this column.'
       class='tool_tippable_cursor condensed_output_tool_tippable_header'
       style='width:100%; cursor:pointer;'>
 <tr><td class='col_sub_header_format'
         style='text-align:right; border:none; width:100%; padding:0px; padding-right:5px; padding-left:5px;'>
   <label style='display:block; cursor:pointer;margin-left:5px;' for='<OPTION_KEY>' title=''>Show
     <input type='checkbox' style='margin-left:10px; position:relative;top:2px;'
            id='<OPTION_KEY>' class='hide_col_checkbox' title='' />
   </label>
 </td></tr></table>
```

`<OPTION_KEY>` ∈ `hide_date_col | hide_hits_col | hide_score_col | hide_msrf_col | hide_operations_col`
(`ophis_config.js:36-40`).

**Row B — the sortable column header (always emitted).** Built by
`sortableHeaderHtml(headerName, sortType)` (output.js:233-265) and assembled at output.js:312-324:

| # | `<td>` width | Header text | Sort type / element id |
|---|---|---|---|
| 0 | `width:0%; background:white` | *(empty spacer, contains `<div style="width:0px;">`)* | — |
| 1 | `width:0%` | `Z-Dates (<N>)` where N = `results.processed_z_dates.length` | `SORT_TYPE__DATE` |
| 2 | `width:0%` | `Hits` | `SORT_TYPE__HIT_COUNT` |
| 3 | `width:0%` | `Score` | `SORT_TYPE__SCORE` |
| 4 | `width:50%` | `MSRF` | `SORT_TYPE__MSRF` |
| 5 | `width:100%` | `Operations` — **omitted entirely** when `globalOptions["hide_operations_col_completely"] === true` | `SORT_TYPE__OPERATIONS` |

Every sortable header cell carries `class="col_sub_header_format"`; cells 4 and 5 additionally carry
`tool_tippable_cursor condensed_output_tool_tippable_header`. The inner markup is:

```html
<table id='<SORT_TYPE>' title='<generalTitle>'
       class='tool_tippable_cursor condensed_output_tool_tippable_header'
       style='width:100%; cursor:pointer;'>
 <tr>
  <td style='width:33%;'></td>
  <td class='col_sub_header_format' style='border:none; width:33%; padding:0px; padding-right:5px; padding-left:5px;'>HEADER_NAME</td>
  <td style='text-align:right; vertical-align:middle; width:33%;'>
    <table style='width:100%;'><tr><td style='width:100%;'></td>
      <td style='vertical-align:middle;'><img style='<ACTIVE_STYLE>' src='./img/sort_icon.png' class='sort_icon'/></td>
    </tr></table>
  </td>
 </tr></table>
```

`<ACTIVE_STYLE>` is `"top:1px; left:1px; box-shadow: none;"` when this sort type is the event's
current sort, otherwise `""` (output.js:250). That is the **only** visual indication of the active
sort — a "pressed button" look on the sort icon. `.sort_icon` base style is
`box-shadow: 1px 1px 2px rgba(0,0,0,1); border-radius:4px; border:1px solid black; background-color:white; width:25px; height:25px; cursor:pointer` (ophis.css:179-192, 443-449).

Active sort resolution: `getCurrentIsoEvent().z_date_sort_type ? … : DEFAULT_Z_DATE_SORT_TYPE`
(output.js:249) where `DEFAULT_Z_DATE_SORT_TYPE = Z_DATE_SORT_TYPE__DATE = "SORT_TYPE__DATE"`
(ophis_config.js:441,445).

**Exact header tooltip strings** (output.js:237-247):

| Sort type | Tooltip |
|---|---|
| `SORT_TYPE__DATE` | `Click to sort by Z-Date, soonest to furthest. Z-Dates are future dates on which the event may reoccur.` |
| `SORT_TYPE__SCORE` | `Click to sort by Score, highest to lowest. See About page for more info on this calculation.` |
| `SORT_TYPE__MSRF` | `Click to sort by MSRF importance, determined based on the MSRF number(s) that matched the day count from an X-Date to a Z-Date. Hover over each pill to display more details.` |
| `SORT_TYPE__HIT_COUNT` | `Click to sort by number of Hits, highest to lowest, determined by adding number of Operations plus number of MSRF matches.` |
| `SORT_TYPE__OPERATIONS` | `Click to sort by number of Operations, highest to lowest, determined by how much the Operations contribtued to the overall Score.` *(sic — "contribtued" is a typo in the source)* |

After emitting Row B: `applyToolTipToCssClass("condensed_output_tool_tippable_header")` (output.js:326).

### 1.3 Data rows — complete column table

One row per entry of `results.processed_z_dates` (an array of **string** dict keys), looked up in
`results.z_structs`. Loop at output.js:350-672. `addOutputRow()` appends
`<tr>` to `#output-container`; the row then gets `classList.add("z_date_output_row")` and
`setAttribute("z_date_key", <dictKey>)` (output.js:656-659).

| # | Header | `<td>` attributes | Value shown | Derivation | Formatting | Alignment |
|---|---|---|---|---|---|---|
| 0 | *(none)* | `style='width:0%'` `class='col_sub_header_format_for_row'` | `Z₍n₎` label | `getRowShortNameHtml("Z", zStruct.z_ordinal)` → `Z<sub>z_ordinal+1</sub>` | `.input_row_name` wrapper div | `text-align:left` (from `.col_sub_header_format_for_row`, ophis.css:550) |
| 1 | `Z-Dates (N)` | `style='text-align:center; padding:5px;'` `class='<blur> col_format algo_output_in_col'` | Date pill(s) | see §1.4 | see §5 | center |
| 2 | `Hits` | `style='text-align:center;'` `class='<blur> col_format algo_output_in_col'` | 24×24 symbol icon + integer | `zStruct.hit_count`; icon from `getHitCountSymbolImage(hitCount, true)` | raw integer, no padding | center (inner table `margin:auto`) |
| 3 | `Score` | `style='text-align:center;'` `class='<blur> col_format algo_output_in_col'` | numeric score | `zStruct.score` | **raw JS number-to-string** — no fixed decimals (see G-1) | center |
| 4 | `MSRF` | `style='text-align:center; padding:5px;'` `class='<blur> col_format algo_output_in_col'` | stack of MSRF pills, or a `none` box | see §1.6 | see §1.6 | center |
| 5 | `Operations` | `style='text-align:right; padding:5px;'` `class='<blur> col_format algo_output_in_col'` | grid of operation pills | see §1.5 | see §1.5 | `text-align:right` on the cell; pills centered inside their own `<td>`s |

Columns 2 and 3 wrap their content in `<div class="algo_output_in_col condensed_score">`
(`.condensed_score { font-weight:600 }`, `.algo_output_in_col { margin:5px }` — ophis.css:41-47).

Column 5 is omitted from the row entirely when
`appState.globalOptions["hide_operations_col_completely"] === true` (output.js:652). Note the
**strict `=== false`** test for emitting it (output.js:319, 652) — an `undefined` value means the
column is *not* rendered.

`<blur>` is `"blurred_output_column"` when the matching global option is `=== true`, else `""`
(output.js:638-643). Mapping: col 1→`hide_date_col`, 2→`hide_hits_col`, 3→`hide_score_col`,
4→`hide_msrf_col`, 5→`hide_operations_col`.

**Hit-count symbol table** (`getHitCountSymbolImage`, `ophis_view__utils.js:238-253`):

| `hit_count` | Image constant | Meaning |
|---|---|---|
| `0`, `1`, or anything not below | `TRANSPARENT_PIXEL_DATA_URI` | no symbol (a 1×1 transparent GIF data URI, `ophis_view__config.js:2`) |
| `2` | `CHART_SYMBOL_IMAGE_SRC__GEMINI` | Gemini glyph |
| `3` | `CHART_SYMBOL_IMAGE_SRC__TRIANGLE` | Triangle |
| `4` | `CHART_SYMBOL_IMAGE_SRC__DIAMOND` | Diamond |
| `>= 5` | `CHART_SYMBOL_IMAGE_SRC__CIRCLE` | Circle |

The `<img>` is emitted as
`<img style='margin-top:5px; width:24px;height:24px;' src='...' />&nbsp;` (output.js:634), wrapped in
`<table style='margin-left:auto; margin-right:auto;'><tr><td style='vertical-align:middle;'>IMG</td><td style='vertical-align:middle;'>COUNT</td></tr></table>`
(output.js:636).

### 1.4 Column 1 — the Z-Date cell

Built at output.js:357-371. Two shapes depending on `currentIsoEvent.scope`:

**`EVENT_SCOPE__DAYS`** (output.js:366-369) — a single pill:
```html
<div class='z_date_sunset_pill'>MM/DD/YYYY</div>
```

**`EVENT_SCOPE__HH_MM`** (output.js:359-365) — a two-row `from:`/`to:` table:
```html
<table>
 <tr><td style='text-align:right; padding-right:2px;'>from: </td>
     <td><div style='margin-bottom:4px;' class='z_date_sunset_pill'>START</div></td>
 <tr><td style='text-align:right;  padding-right:2px;'>to:</td>
     <td><div class='z_date_sunset_pill'>END</div></td></tr>
</table>
```
(Note the missing `</tr>` after the first row — output.js:364 — browsers auto-close it.)

`START`/`END` are `zStruct.z_date_readable_start` / `z_date_readable_end`. Either shape is then
wrapped by output.js:371:
```html
<table style='white-space:nowrap; margin-left: auto; margin-right:auto; height:100%;'>
  <tr><td style='vertical-align:middle;'>…</td></tr></table>
```

`.z_date_sunset_pill` = `border:1.5px solid black; border-radius:5px; padding:4px; padding-top:0; padding-bottom:0; background-color:#ffbcbc` (ophis.css:75-84).

**No other scope is handled.** `EVENT_SCOPE__MONTHS` / `EVENT_SCOPE__YEARS`
(`ophis_config.js:323-324`) fall through both branches leaving `ithDateRangeInnerHtml == ""` — the
Z-Date cell renders empty. This is a genuine hole (G-2).

### 1.5 Column 5 — the Operations pill grid

**Pills-per-row calculation (output.js:333-346):**

```js
var operationHeaderElem = document.getElementById(Z_DATE_SORT_TYPE__OPERATIONS); // "SORT_TYPE__OPERATIONS"
var operationHeaderElemWidth = operationHeaderElem ? operationHeaderElem.clientWidth : 0;
var operationPillsPerRow = Math.floor(operationHeaderElemWidth / PILL_WIDTH_IN_PX); // PILL_WIDTH_IN_PX = 100
if ( currentIsoEvent.scope == EVENT_SCOPE__HH_MM ) {
    operationPillsPerRow--;
    if ( operationPillsPerRow == 0 ) { operationPillsPerRow = 1; }
}
operationPillsPerRow = operationPillsPerRow > 0 ? operationPillsPerRow : 1;
```

`PILL_WIDTH_IN_PX = 100` (`ophis_view__config.js:19`). The `OPERATION_PILLS_PER_ROW = 3` constant in
the same file (line 17) is **dead** — the reference is commented out at output.js:335.

**Container (output.js:376-382):**
```js
var pillContainerMaxHeight = "max-height: 60px;";
if ( shouldExpandMainOutputPanel() ) { pillContainerMaxHeight = "max-height: 108px;"; }
```
```html
<div class='pill_results_table_wrapper' style='max-height:60px;overflow-y: scroll;'>
  <table class='pill_results_table'><tr> … </tr></table>
</div>
```
Note: the operations wrapper uses `overflow-y: scroll` (always-visible scrollbar); the MSRF wrapper
(output.js:519) uses `overflow-y: auto`. Inconsistent by design or accident — reproduce as-is.

`shouldExpandMainOutputPanel()` (`ophis_view__utils.js:34-48`) returns `true` when the event's
`SERIALIZED_FIELD__CHART_OPTION__SHOW_CHART` is `=== false`, or when the current screen is not one of
`OPHIS_SCREEN__IMPORT_X_DATES | OPHIS_SCREEN__Z_DATES | OPHIS_SCREEN__EXPORT_Z_DATES`.

**Per-pill loop (output.js:386-499).** Each `<td>` gets `style='width:<100/N>%'` and
`class='pill_results_table_col'`. A new `<tr>` is opened when `k > 0 && k % operationPillsPerRow == 0`.

Per operation-match struct the code computes:

```js
kthOperationResult = kthOperationMatchStruct.operation_result;
kthOperationOrdinal = kthOperationResult.operation_ordinal;
kthOperation        = currentIsoEvent.effective_operations[kthOperationOrdinal];
operationEquation   = normalizeOperationEquationString(kthOperation.equation, /*doReplacements=*/false);
oShortName          = getRowShortNameHtml("O", kthOperationOrdinal);   // O<sub>n+1</sub>
zShortName          = getRowShortNameHtml("Z", kthOperationOrdinal);   // Z<sub>n+1</sub>  (see G-6)
cssClassName        = isAlphaOperation(kthOperation) ? "operation_alpha" : "operation_beta";
```

`isAlphaOperation(op)` ⇔ `op.weight >= POINTS__ALPHA_OPERATION_MATCH` where
`POINTS__ALPHA_OPERATION_MATCH = 1` and `POINTS__BETA_OPERATION_MATCH = .5`
(`ophis_model__params.js:2-3, 48-50`).

The starting-X substitution (output.js:415-431):

```js
startingX = getStartingX(kthOperation.equation);              // "STARTING_X1" | "STARTING_X2" | null
if (startingX == STARTING_X1) { startingXShortName = x1ShortName; xStringToReplaceInEquation = "X1"; }
else                          { startingXShortName = x2ShortName; xStringToReplaceInEquation = "X2"; }

operationEquation = operationEquation.replace(xStringToReplaceInEquation, startingXShortName);

operationEquationWithoutXPart = operationEquation
    .replace(startingXShortName + "+", "")        // strip the leading "X₂+"
    ;
operationEquationWithoutXPart = replaceOperationConstants(operationEquationWithoutXPart);
operationEquationWithoutXPart = operationEquationWithoutXPart
    .replace("Y", intToDecimalString(yStruct.rotation_count_y));
```

`replaceOperationConstants` (`ophis_view__strings.js:50-56`) does a **single** `.replace()` of each of
`OPH_CRV`, `OPH_PI`, `OPH_PHI` with their numeric values — first occurrence only.
`.replace("Y", …)` likewise replaces only the first `Y`.

**Pill markup (output.js:486-490):**
```html
<div operation_result_hash='<HASH>'
     operation_type='alpha|beta'
     title='<TOOLTIP_HTML>'
     style='cursor:help;'
     onmouseover='onMouseOverPill(this);' onmouseout='onMouseOutPill();'
     class='operation_alpha|operation_beta z_match_with_tool_tip'>
  <div style='text-align:center;'>O<sub>k</sub><span class="parenthetical_equation">(X<sub>a</sub>&rarr;X<sub>b</sub>)</span></div>
</div>
```

`operation_result_hash` comes from `generateZDatePillAttributes(operationResult)` (output.js:328-331)
and equals `operationResult.hash`, which is
`"" + operationOrdinal + x1.getTime() + x2.getTime() + zDateStartMillis`
(`ophis_model__operations.js:370, 407`). This attribute is the cross-module join key used by the
chart hit-testing code (`ophis_view__chart.js:412`).

**Operation pill tooltip** — 9 rows, built by `generateTableToolTip(titles, values)`
(`ophis_view__strings.js:31-48`, output.js:469-482):

| Title | Value |
|---|---|
| `Type` | `<span class="operation_alpha\|operation_beta">Alpha Operation\|Beta Operation</span>` |
| `Label` | `O<sub>k</sub>` |
| `X-Range` | `X<sub>a</sub> &rarr; X<sub>b</sub>` |
| `Equation` | `Z-Date = ` + normalized equation with the leading `X1`/`X2` replaced by the subscripted short name |
| `Y` + spinning-globe icon (`getRotationLabelHtml("Y", /*isWhite=*/true)`) | `X<sub>a</sub>&rarr;X<sub>b</sub> = ` + `readableAxialRotations(yStruct.rotation_count_y)` |
| `Z-Value` | `operationEquationWithoutXPart` + ` = ` + `getZValueReadable(zValue, ordinal)` |
| `Z` + globe icon | `X<sub>start</sub>&rarr;Z-Date = ` + `readableAxialRotations(rotation_count_z)` |
| `Score` | `Contributes <points> to the base score of <base_score_pre_multiply>` |
| `MSRF` | `<span class="<msrfCssClass>"><msrfString></span>` |

where `points = kthOperationMatchStruct.points` — set by `getOperationScore` to the operation's
`weight` (`ophis_model__operations.js:537-538`).

The MSRF sub-line is computed by an *independent* lookup (output.js:453-466):
```js
filterMatch = getMsrfMatch(rotationCountZ);
if (filterMatch != null) { msrfClassName = filterMatch.css_class;
                           msrfString = readableMsrfMatchString(rotationCountZ, filterMatch); }
else                     { msrfString = rotationCountZ + " = No Match"; }
```

`generateTableToolTip` emits:
```html
<table style="border:1px solid white; white-space:nowrap;">
 <tr><td class="tool_tip_table_border tool_tip_table_left_row">TITLE</td>
     <td class="tool_tip_table_border">VALUE</td></tr>…
</table>
```
and returns `""` outright when `FEATURE_FLAG__SHOW_MSRF_AND_OPERATION_PILL_TOOL_TIPS !== true`
(currently `true`, `ophis_config.js:293`).

**Row padding (output.js:503-507).** After the pill loop, dummy `<td>`s are appended until
`k % operationPillsPerRow == 0`:
```js
var dummyMatchPill = "<div operation_type='"+""+"' style='visibility:visible; cursor:help;' class='"+cssClassName+"><div style='text-align:center;'>"+""+"</div></div>";
```
**This string is malformed** — see G-3.

**Side-effect string built during the loop.** `xToZStringToShowIfNoMsrfMatches` accumulates
`", "`-joined entries of the form
`O<sub>k</sub><span class="parenthetical_equation">(X<sub>a</sub>&rarr;X<sub>b</sub>)</span> = <span style="font-weight:600;">ROT_Z</span>`
(output.js:494-498), and is used only in the MSRF "none" tooltip (§1.6).

### 1.6 Column 4 — the MSRF pill stack

**Empty case (`msrf_match_structs.length == 0`, output.js:516-517):**
```html
<table class='msrf_no_matches'
       onmouseover='onMouseOverPill(this);' onmouseout='onMouseOutPill();'
       title='There were no matches against the MSRF filter for the day count:<br><xToZStringToShowIfNoMsrfMatches>'>
  <tr><td>none</td></tr></table>
```
`.msrf_no_matches { width:100%; height:100%; cursor:help }` (ophis.css:86-90).
Note this element has **no** `operation_result_hash`, so `onMouseOverPill` clears the pill
highlight (output.js:750-758).

**Non-empty case (output.js:519-628).** Wrapper is the same `pill_results_table_wrapper` /
`pill_results_table` structure but with `overflow-y: auto` and **`MSRF_PILLS_PER_ROW = 1`**
(a function-local `var` at output.js:536 shadowing the global of the same name and value in
`ophis_view__config.js:18`) — i.e. **one MSRF pill per row, always**.

Before the pill loop the code finds `multiplyingMsrfMatchStruct` (output.js:521-534): the first
struct in `msrf_match_structs` whose per-filter multiplier equals the overall multiplier
`getMsrfScoreMultiplier(ithMsrfMatchStructs)`. Because `sortMsrfMatches`
(`ophis_model__sorting.js:292-312`) sorts multiplier-descending, this is always index 0 when the
array is non-empty.

**Pill markup (output.js:617):**
```html
<div operation_result_hash='<HASH>'
     msrf_type='msrf_normal|msrf_important|msrf_vortex'
     title='<TOOLTIP_HTML>'
     onmouseover='onMouseOverPill(this);' onmouseout='onMouseOutPill();'
     style='cursor:help;'
     class='msrf_normal|msrf_important|msrf_vortex z_match_with_tool_tip'>
  <div style='text-align:center;'><MSRF_NUMBER></div></span></div>
```
(The stray `</span>` at output.js:617 is a source defect; harmless in practice.)

The displayed text is `kthMsrfMatchStruct.msrf_number` — the *matched filter number*, **not** the
raw `rotation_count_z`. For vortex numbers that is a decimal such as `21.7`.

**MSRF pill tooltip** — 3 rows (output.js:606-613):

| Title | Value |
|---|---|
| `Type` | `<span class="<cssClass>"><readableMsrfMatchString(rotation_count_z, struct)></span>` |
| `Source` | `O<sub>k</sub><span class="parenthetical_equation">(X<sub>a</sub>&rarr;X<sub>b</sub>)` *(unclosed `</span>` — source defect)* |
| `Score` | if `scoringSystem == SCORING_SYSTEM__GTE_V8` **and** this is `multiplyingMsrfMatchStruct`: `Multiplies base score of <base> by <mult>`; otherwise `Contributes <points> to the base score of <base>` |

### 1.7 ASCII mock of rendered rows

Scope = `EVENT_SCOPE__DAYS`, sorted by Score, `hide_operations_col_completely = false`,
operations column ≈ 320 px wide ⇒ `operationPillsPerRow = 3`.

```
┌──────┬──────────────────────┬───────────┬───────┬───────────────┬──────────────────────────────────────────────┐
│      │ Z-Dates (17)      [⇅]│ Hits   [⇅]│Score  │ MSRF       [⇅]│ Operations                              [⇅] │
├──────┼──────────────────────┼───────────┼───────┼───────────────┼──────────────────────────────────────────────┤
│ Z₃   │  ┌────────────────┐  │  ◆   4    │  9    │ ┌───────────┐ │  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│      │  │  08/14/2026    │  │           │       │ │   126     │ │  │ O₁(X₁→X₂)│ │ O₂(X₁→X₂)│ │ O₅(X₂→X₃)│      │
│      │  └────────────────┘  │           │       │ └───────────┘ │  └─────────┘ └─────────┘ └─────────┘        │
│      │   (pink pill,        │           │ bold  │ ┌───────────┐ │  ┌─────────┐ ┌ dummy ─┐ ┌ dummy ─┐          │
│      │    1.5px black bdr)  │           │       │ │    84     │ │  │ O₇(X₂→X₃)│ │        │ │        │          │
│      │                      │           │       │ └───────────┘ │  └─────────┘ └────────┘ └────────┘          │
├──────┼──────────────────────┼───────────┼───────┼───────────────┼──────────────────────────────────────────────┤
│ Z₁   │  ┌────────────────┐  │  △   3    │  4.5  │ ┌───────────┐ │  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│      │  │  03/02/2026    │  │           │       │ │   21.7    │ │  │ O₁(X₁→X₂)│ │ O₃(X₁→X₃)│ │ O₄(X₂→X₃)│      │
│      │  └────────────────┘  │           │       │ └── purple ─┘ │  └─ gold ──┘ └─ cyan ──┘ └─ cyan ──┘        │
├──────┼──────────────────────┼───────────┼───────┼───────────────┼──────────────────────────────────────────────┤
│ Z₉   │  ┌────────────────┐  │      1    │  1    │ ┌───────────┐ │  ┌─────────┐ ┌ dummy ─┐ ┌ dummy ─┐          │
│      │  │  11/28/2026    │  │(transparent)      │ │   none    │ │  │ O₁(X₁→X₂)│ │        │ │        │          │
│      │  └────────────────┘  │           │       │ └───────────┘ │  └─────────┘ └────────┘ └────────┘          │
└──────┴──────────────────────┴───────────┴───────┴───────────────┴──────────────────────────────────────────────┘
```

Same three rows with `EVENT_SCOPE__HH_MM`, column 1 only:

```
│ Z₃   │   from: ┌───────────────────────┐  │
│      │         │ 08/14/2026  19:42     │  │   (time rendered in .has_clock_font)
│      │         └───────────────────────┘  │
│      │   to:   ┌───────────────────────┐  │
│      │         │ 08/15/2026  19:41     │  │
│      │         └───────────────────────┘  │
```

Note that `Z₃` sorts above `Z₁` here: the subscript is the **chronological** ordinal, not the row
position (see G-6).

---

## 2. CONDITIONAL STYLING — exact predicates

### 2.1 Operation pill colour

| Predicate | class on `<div>` | attribute | Visual |
|---|---|---|---|
| `kthOperation.weight >= 1` | `operation_alpha` | `operation_type='alpha'` | text `darkgoldenrod`, `font-weight:500`; **border `2px solid darkgoldenrod`** |
| `kthOperation.weight < 1` | `operation_beta` | `operation_type='beta'` | text `#00c0ff`, `font-weight:500`; **border `2px solid #00c0ff`** |

CSS: ophis.css:92-95 (`.operation_beta`), 102-105 (`.operation_alpha`), 112-114 and 120-122
(the attribute-selector borders). Note the border comes from the **attribute**, the text colour from
the **class** — both are set (output.js:484, 488), so a reimplementation must set both.

### 2.2 MSRF pill colour — this is the "important / vortex" signal

`getMsrfMatch(axialRotationCount)` (`ophis_utils.js:148-…`) decides the tier:

| Tier | Match rule | `css_class` | `readable_name` | `points` | score multiplier | Colour |
|---|---|---|---|---|---|---|
| **Vortex** | `areEqualWithinTolerance(filterNum, rounded, 0.1)` against `MSRF_FILTER__VORTEX` — **checked FIRST, wins over the others** (`ophis_utils.js:180-186`) | `msrf_vortex` | `Vortex` | `2` | `2.0` | `purple` text; border `2px solid purple` |
| **Important** | exact `==` against `MSRF_FILTER__IMPORTANT` | `msrf_important` | `Important` | `2` | `2.0` | `#b80b0b` text; border `2px solid #b80b0b` |
| **Normal** | exact `==` against `MSRF_FILTER__NORMAL` | `msrf_normal` | `Normal` | `1` | `1.5` | `#2ede69` text; border `2px solid #2ede69` |
| *(no match)* | — | `""` | — | — | `1.0` | no pill emitted for this operation result |

Constants: `VORTEX_FILTER_MATCH_TOLERANCE = .1` (`ophis_config.js:367`);
`POINTS__NORMAL_MSRF_MATCH = 1`, `POINTS__IMPORTANT_MSRF_MATCH = 2`,
`POINTS__VORTEX_MSRF_MATCH = POINTS__IMPORTANT_MSRF_MATCH = 2`;
`SCORE_MULTIPLIER__NORMAL_MSRF_MATCH = 1.5`, `SCORE_MULTIPLIER__IMPORTANT_MSRF_MATCH = 2.0`,
`SCORE_MULTIPLIER__VORTEX_MSRF_MATCH = 2.0` (`ophis_model__params.js:4-12`).
`MSRF_FILTER__VORTEX = [21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4, 762.3, 871.2]`
(`ophis_model__params.js:44-46`). The rotation count is first rounded to
`DECIMAL_PRECISION__AXIAL_ROTATIONS = 1` decimal (`ophis_utils.js:150, 995-1004`;
`ophis_config.js:371`).

CSS: ophis.css:97-100, 107-110, 132-135, 116-118, 124-130.

### 2.3 Hover / cross-highlight styling

```css
.z_match_with_tool_tip:hover,
.z_match_with_tool_tip[chart_hover="true"] { outline:3px solid red; border:2px solid red; }   /* ophis.css:140-143 */

.z_date_output_row:hover > td,
.z_date_output_row[chart_hover="true"] > td,
.iso_event_row[row_selected="true"] > td { background-color: rgb(115 255 130); z-index:10; }  /* ophis.css:435-441 */
```

`chart_hover="true"` is set **from the chart module**, not from these files:
`ophis_view__chart.js:444` (on the `<tr>`, matched by `z_date_key`) and `:413` (on the pill, matched
by `operation_result_hash`). `clearChartHovers` (`ophis_view__chart.js:207-233`) resets both to
`"false"` for every `.z_date_output_row` and every `.z_match_with_tool_tip` on the page.

### 2.4 Blur / hide columns

`.blurred_output_column * { visibility: hidden; }` (ophis.css:473-476). **Despite the name it is not
a blur** — the original `filter: blur(8px)` is commented out on line 475. The class is applied to the
`<td>`, so all descendants become invisible while the cell keeps its box.

### 2.5 Base pill geometry

`.z_match_with_tool_tip { padding:4px; padding-top:0; padding-bottom:2px; border-radius:5px; height:25px; width:85px; display:inline-block; background-color:white; }` (ophis.css:63-73).
`.parenthetical_equation { font-size:14px }` (ophis.css:59-61).

### 2.6 Badges / icons summary

| Icon | Where | Predicate |
|---|---|---|
| `./img/sort_icon.png` (`.sort_icon`, 25×25) | every sortable header | always; "pressed" style iff it is the active sort |
| `./img/spinning_globe.png` / `./img/spinning_globe_white.png` (30px wide) | rotation labels in tooltips and the debug table | `getRotationLabelHtml(letter, isWhite, centered)` — white variant used inside tooltips (output.js:469), dark variant in the debug header (output.js:814) |
| Gemini / Triangle / Diamond / Circle | Hits column | `hit_count` = 2 / 3 / 4 / ≥5 |
| transparent 1×1 GIF | Hits column | `hit_count` ≤ 1 |
| `./img/location.png` (`.open_map_icon`, 30×30) | Iso-Event row | `FEATURE_FLAG__SHOW_LOCATION` |
| `./img/clone.png` | Iso-Event row | always |
| `./img/notes_icon.png` | Iso-Event row | **dead** — markup commented out (rebuild.js:308) |
| `./img/left_arrow.png` (`.row_insert_button`) | X/T-Date row | always; `top:-31px` when inline sunset is shown |
| `./img/sunset.png` (24×24, `opacity:.5`) | X/T-Date row | `scope == HH_MM && FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_INLINE` (true) |
| `&#10006;` (✖) | delete buttons | always; coloured `red` by `enableRowButton` (`ophis_view__strings.js:102-104`) |

---

## 3. GROUPING / SECTIONING / PAGINATION

**There is none.** Concretely:

- No pagination, no virtualization, no "load more". Every entry of `results.processed_z_dates` gets a
  `<tr>` in a single `<table id="output-container">` (output.js:350-672).
- No grouping headers, no collapsible sections, no accordion. The only two structural rows are the
  optional hide-columns header (§1.2 Row A) and the sortable header (Row B).
- Volume control is achieved **upstream** by the filter stage, not by the view:
  `sortAndFilterResults` → `filterZDates(...)` (`ophis_model__operations.js:153-170`,
  `ophis_model__sorting.js:154, 176`). The count of suppressed rows is surfaced in
  `#z-dates-hidden` by `refreshDatesHidden(count)` (`ophis_view__utils.js:818-829`), rendering
  `<b>Z-Dates hidden: N</b>` — or `<b>Z-Dates hidden: -</b>` when `appState.latestResults.stale === true`.
- "Collapsed by default" behaviour exists only *within* a cell: the operations and MSRF pill grids are
  clipped to `max-height: 60px` (or `108px` when the output panel is expanded) with their own
  scrollbar. Overflowing pills are reachable only by scrolling that inner div.
- Row ordering is entirely determined by `results.processed_z_dates`, which
  `sortAndFilterResults` builds via `sortZDates(filteredZDates, zStructsDict, isoEvent.z_date_sort_type, scoringSystem)`
  (`ophis_model__operations.js:166`). When the sort type is `SORT_TYPE__DATE` it is a `deepClone` of
  the date-sorted array.

**Sort click handler (output.js:674-685):**
```js
Z_DATES_SORT_TYPES.forEach(function(ith) {
    if ( document.getElementById(ith) ) {
        document.getElementById(ith).addEventListener("click", function() {
            getCurrentIsoEvent().z_date_sort_type = ith;
            flushChangesToDisk();
            sortAndFilterResults(getCurrentIsoEvent(), appState.latestResults);
            refreshCurrentPage(REFRESH_TYPE__RIGHT_PANEL_ONLY, results);
        });
    }
});
```
`Z_DATES_SORT_TYPES = [SCORE, DATE, MSRF, HIT_COUNT, OPERATIONS]` (`ophis_config.js:447-453`).
**There is no ascending/descending toggle** — each sort type has one fixed direction. Clicking the
already-active header re-sorts identically.

**Hide-column handler (output.js:687-697):**
```js
GLOBAL_HIDE_COL_OPTIONS.forEach(function(ith) {
    if ( document.getElementById(ith) ) {
        document.getElementById(ith).checked = appState.globalOptions[ith] === false;   // inverted!
        document.getElementById(ith).addEventListener("change", function(e) {
            var shouldNowBeHidden = this.checked == false;                              // inverted!
            setGlobalOption(ith, shouldNowBeHidden);
            refreshCurrentPage(REFRESH_TYPE__SOFT, results);
        });
    }
});
```

---

## 4. THE PER-Z-DATE DETAIL / EXPANSION VIEW

There is **no row-expansion UI on the Z-Dates screen**. Per-Z-Date detail is delivered by three
mechanisms:

### 4.1 Hover tooltips (the real "detail view")

Every operation pill and every MSRF pill carries a full HTML table in its `title` attribute, rendered
by tipsy. Contents are enumerated in §1.5 and §1.6. Tipsy config
(`ophis_dependencies.js:222-234`):
```js
{ fade:false, offset:5, gravity:tipsyGravityCallback, opacity:1,
  trigger:'hover', html:true, delayIn: TOOL_TIP_DELAY_IN_MILLISECONDS /* = 750 */ }
```

`onMouseOverPill(element)` (output.js:738-761):
1. If `FEATURE_FLAG__SHOW_MSRF_AND_OPERATION_PILL_TOOL_TIPS === true`: `applyToolTip(element)`, then
   after `750 ms` re-check `element.isConnected && element.matches(':hover')` and, if still true,
   `$(element).tipsy('show')`.
2. Read `operation_result_hash`; if present and `appState.latestResults` exists, resolve it with
   `getOperationResultFromHash(appState.latestResults, hash)` and store the result in
   `appState.latestResults.highlighted_operation_result_pill`; otherwise set it to `null`.
3. `updateChartDatasetsFromRowHighlightingChange()` → `updateChartDatasets(appState.latestResults)`.

`onMouseOutPill()` (output.js:732-736) clears
`highlighted_operation_result_pill` and rebuilds chart datasets.

`getOperationResultFromHash(results, hash)` (output.js:708-730) is an **O(Z × ops) linear scan** over
every z-struct's `operation_match_structs`, returning the first `operation_result` whose `.hash`
matches, else `null`.

### 4.2 Row hover → chart cross-highlight

Per row (output.js:661-671):
```js
row.addEventListener("mouseenter", function() {
    appState.latestResults.highlighted_z_date_row = this.getAttribute("z_date_key");
    clearChartHovers(/*callUpdateChartDatasets=*/false);
    updateChartDatasetsFromRowHighlightingChange();
});
row.addEventListener("mouseleave", function() {
    appState.latestResults.highlighted_z_date_row = null;
    updateChartDatasetsFromRowHighlightingChange();
});
```
Consumers of `highlighted_z_date_row`: `ophis_view__chart_datasets.js:409, 426, 602, 873`.

### 4.3 `renderDebugOutput(results)` — the operation-contribution breakdown (output.js:763-923)

This is the only screen that lays out "which operation produced which hit" as a table. **It is
unreachable from the UI**: `OPHIS_SCREEN__DEBUG` is commented out of `OPHIS_SCREENS`
(`ophis_view__config.js:136`), so the screen `<select>` never offers it. Dispatch still exists at
`ophis_view.js:241-246`.

`screenSpecificArea.innerHTML = "For validation purposes, may be removed."` (output.js:766).

**Header row (output.js:775-786):**

| # | Text | Tooltip | width |
|---|---|---|---|
| 0 | *(empty, `background:white`)* | — | 0% |
| 1 | `X-Range` | `All the permutations of past X-Date to a future X-Date.` | 0% |
| 2 | `Y` + globe icon | `The number of days between the X-Date range.` | 0% |
| 3 | *(empty, `background:white`)* | — | 0% |
| 4 | `Z-Operations` | — | 50% |

Header cells 1-2 carry `class="detail_col_header col_sub_header_format"`;
`applyToolTipToCssClass("detail_col_header")` follows (output.js:788).

**One row per `results.y_structs[i]` (output.js:790-922):**

| # | Content |
|---|---|
| 0 | `<div class='input_row_name'>Y<sub>i+1</sub></div>` in `.col_sub_header_format_for_row` |
| 1 | `X<sub>a</sub><span class='date_range_arrow'>&rarr;</span>X<sub>b</sub>` in `<div style="margin:5px; white-space:nowrap;" class="col_output_text">`, cell `text-align:center` |
| 2 | `intToDecimalString(yStruct.rotation_count_y)` in `<div style="font-weight:600;" class="col_output_text algo_output_in_col">`, centered |
| 3 | Radio button `<label class='row_radio_button_label'><input title='Select Range' [checked] name='selected_y_for_detail' class='row_radio_button y_detail_radio_button' type='radio'/></label>`. Cell gets `border-right:none;` + class `selected_detailed_output_cell` when `i == results.selected_y_struct_for_details`, otherwise `border-right:1.5px solid black;` |
| 4 | **Only on `i == 0`**: `<td rowspan="<yStructs.length>" style="border-bottom:none; border-left:none; text-align:center;" class="selected_detailed_output_cell col_format">` containing the Z-Operations table |

**Z-Operations sub-table (output.js:816-893)** — `<table style='height:500px;margin:10px;'>` inside
`<div style='display:inline-block;'>`; header row has `border-bottom: 1px solid black`, all cells but
the last have `border-right: 1px solid black`:

| Col | Header | Tooltip | Cell class | Value |
|---|---|---|---|---|
| 1 | `Label` | `Shorthand label for the operation.` | `z_op_detail_cell z_op_details_label_cell` | `O<sub>k+1</sub>` |
| 2 | `Type` | `Operation Type, which affects importance and number of points.` | `z_op_detail_cell operation_alpha\|operation_beta` | `Alpha` / `Beta` |
| 3 | `&nbsp;X<sub><i>i</i>&nbsp;</sub>` | `The starting X-Date. The Z-Value (in days) is added to this X-Date to determine the Z-Date.` | `z_op_detail_cell z_op_details_label_cell` | `X<sub>a</sub>` |
| 4 | `Z-Equation` | `Equation without constants replaced.` | `z_op_detail_cell` (`text-align:left`) | normalized equation, `X1+` stripped, spaces → `&nbsp;` |
| 5 | `Z` + globe icon (centered) | `The number of Axial Rotation from the starting X-Date to the Z-Date, calculated from the Z-Equation.` | `z_op_detail_cell <msrfCssClass>` | `intToDecimalString(rotation_count_z)` |
| 6 | `MSRF` | `The MSRF match, if any, of the days between X and Z.` | `z_op_detail_cell <msrfCssClass>` | `filterMatch.readable_name` or `none` |

A commented-out `Z-Value` column sits between 4 and 5 (output.js:824, 887).

The loop iterates `selectedYStruct.operation_results` where
`selectedYStruct = yStructs[results.selected_y_struct_for_details]` (output.js:829).

**Radio wiring (output.js:905-921):**
```js
var radioButtonElem = ithNewRow.getElementsByClassName("row_radio_button")[0];
if ( yStructs.length <= 1 ) { disableRowButton(radioButtonElem); } else { enableRowButton(radioButtonElem); }
radioButtonElem.setAttribute("row_index", i);
radioButtonElem.addEventListener("click", function(jsEvent) {
    results.selected_y_struct_for_details = getClickedRowIndex(jsEvent);
    refreshCurrentPage(REFRESH_TYPE__SOFT, results);
});
```

`applyToolTipToCssClass("z_op_detail_header_cell")` and `applyToolTipToCssClass("y_detail_radio_button")`
are called **inside** the per-row loop (output.js:902-903) — O(n²) re-binding, see G-16.

`.selected_detailed_output_cell` is defined at ophis.css:838.
`.z_op_detail_header_cell, .z_op_details_label_cell { font-weight:600 }`;
`.z_op_detail_cell, .z_op_detail_header_cell { padding:5px }` (ophis.css:149-155).

---

## 5. NUMBER AND DATE FORMATTING RULES

### 5.1 Numbers

| Function | Definition | Rule |
|---|---|---|
| `intToDecimalString(n)` (`ophis_view__utils.js:316-318`) | `isNonNegIntOrStringThereof(n) ? n + ".0" : n` | Appends `.0` **only for non-negative integers**. `84 → "84.0"`, `21.7 → 21.7` (unchanged, returned as a *number*), `-5 → -5`, `0 → "0.0"` |
| `readableAxialRotations(n)` (`ophis_view__strings.js:125-133`) | `intToDecimalString(n) + " days"` | Always the word "days", never "day". Commented-out code shows an earlier "Axial Rotation(s)" wording |
| `getZValueReadable(z, ordinal)` (`ophis_view__strings.js:19-29`) | `intToDecimalString(z) + (z == 1 ? "&nbsp;day" : "&nbsp;days")` | Non-breaking space; singular only for exactly `1` |
| `readableMsrfMatchString(rotZ, m)` (`ophis_view__strings.js:82-92`) | see below | |
| Score cell | raw `zStruct.score` interpolated into HTML (output.js:649) | value was produced by `roundNumberToPrecision(finalScore, DECIMAL_PRECISION__SCORE=2)` (`ophis_model__operations.js:454`; `ophis_config.js:372`). **JS number→string**: `9 → "9"`, `4.5 → "4.5"`, `13.25 → "13.25"`. **No trailing zeros, no fixed 2dp.** |
| Hits cell | raw integer (output.js:636) | no formatting |
| MSRF pill text | raw `msrf_number` (output.js:615) | `126`, `21.7` |

`readableMsrfMatchString`:
```js
if ( rotationCountZ === filterMatch.msrf_number ) readableMatchString = "= " + filterMatch.readable_name;
else                                             readableMatchString = "&asymp; " + filterMatch.msrf_number + " (" + filterMatch.readable_name + ")";
return rotationCountZ + " " + readableMatchString;
```
So: `"126 = Important"` for an exact hit, `"21.8 ≈ 21.7 (Vortex)"` for a tolerance hit.
The comparison is `===` on numbers after `roundNumberToAxialRotationPrecision`.

**No thousands separators are used anywhere in output.** `numberWithCommas`
(`ophis_view__utils.js:831-833`) exists but is never called from these two files.

### 5.2 Dates

Produced upstream, consumed verbatim here.

| Format constant | Value | Where |
|---|---|---|
| `DATE_DELIMITER` | `"/"` | `ophis_config.js:273` |
| `X_DATE_CAL_DISPLAY_FORMAT` | `"m/d/Y"` | `ophis_config.js:275` |
| `X_DATE_CAL_DISPLAY_FORMAT__MONTHS` | `"m/Y"` | `ophis_config.js:276` |
| `X_DATE_CAL_DISPLAY_FORMAT__YEARS` | `"Y"` | `ophis_config.js:277` |
| `X_DATE_TIME_DISPLAY_FORMAT` | `"H:i"` (24-hour) | `ophis_config.js:278` |
| `X_DATE_INPUT_DISPLAY_FORMAT` | `"m/d/Y H:i"` | `ophis_config.js:279` |

`dateComponentsToReadableString(y, m, d)` (`ophis_view__strings.js:231-233`):
`pad2(m) + "/" + pad2(d) + "/" + y` — **month and day zero-padded, year unpadded 4-digit**.
`padWithLeadingZeroIfLessThan10(v) = v < 10 ? "0" + v : v` (`ophis_view__strings.js:252-254`).

`nativeDateToReadableString_dateAndTime(d, lat, long, includeHtmlForTime = true)`
(`ophis_view__strings.js:219-225`):
```
<dateOnly> + (includeHtmlForTime ? "<span style='margin-left:3px;' class='has_clock_font'>" : " ")
           + <timeOnly HH:MM 24h zero-padded>
           + (includeHtmlForTime ? "</span>" : "")
```
`.has_clock_font { font-family: alarm_clock; font-size:100% }` (ophis.css:36-39) — the time renders in
a seven-segment display font.

The results table uses the **HTML** variants (`z_date_readable_start` / `_end`). The `_no_html`
variants exist for exports only (`ophis_view__export.js:330, 403`).

**No relative-day display anywhere.** There is no "in 42 days", no "today"/"tomorrow" labelling in
either file. Everything is absolute.

### 5.3 The "Current Time" field (output.js:3-19, 70-175)

```js
if ( GLOBAL_DATE_SCOPE == EVENT_SCOPE__HH_MM ) elem.value = getLocalTimeAsPickrValue(offset);   // "m/d/Y H:i"
else                                           elem.value = getLocalDateAsPickrValue(offset);   // "m/d/Y"
```
`GLOBAL_DATE_SCOPE = isFlagEnabled(FEATURE_FLAG__SHOW_LOCATION) ? EVENT_SCOPE__HH_MM : EVENT_SCOPE__DAYS`
(`ophis_config.js:346`); the flag is `true`, so the field shows date **and** time.

Field width: `MIN_DATE_AND_TIME_FIELD_WIDTH = "155px"` for HH:MM, `MIN_DATE_FIELD_WIDTH = "103px"`
otherwise (`ophis_view__config.js:113-114`).

---

## 6. THE FULL REBUILD CYCLE (`ophis_view__rebuild.js`)

### 6.1 Function inventory

| Function | Signature | Side effects |
|---|---|---|
| `setOverflowOnScrollContainers(overflow)` | `overflow: string` | Sets `style.overflowY` on `.scrollable_container[0]` to `overflow`, on all others to `"auto"`; then calls `setPanelMaxDimensions()`. Returns nothing. |
| `setPanelMaxDimensions()` | — | Full layout pass: writes `minHeight`/`maxHeight`/`paddingTop`/`position`/`zIndex`/`width`/`visibility` across many elements. Ends with `document.body.clientHeight;` and `recenterChartIfNeeded()`. |
| `focusOphisInput(inputElem)` | `inputElem: HTMLInputElement` | `focus(); focus(); select();` — the double `focus()` is deliberate (comment rebuild.js:219-220: works around a date-input popup in Brave). |
| `toggleIsoEventLocationEnabled(isoEvent, enabled)` | `(object, boolean)` | Sets `location_enabled = enabled` **and unconditionally resets `lat = 0; long = 0`** regardless of direction (rebuild.js:226-232). |
| `rebuildIsoEventTableRows()` | — | Full teardown + rebuild of `#iso-event-container` rows. |
| `refreshMasterCheckboxBasedOnChildChange(baseElemId, baseClassName)` | `(string, string)` | Updates `checked`/`indeterminate` on `#<baseElemId>-master`. |
| `rebuildXDateTableRowsInternal(inputDateArray, inputDateType, isDummyRow = false)` | `(XDate[], "INPUT_DATE_TYPE__X_DATE"\|"INPUT_DATE_TYPE__T_DATE", boolean)` | Patch-or-create rows; attaches flatpickr; prunes surplus rows. |
| `rebuildXDateTableRows(preserveScrollPosition, inputDateType)` | `(boolean, string)` | Empty-state handling + scroll preservation; delegates to `…Internal`. |

### 6.2 What triggers a rebuild

```
selectIsoEvent(i)                  (ophis_controller.js:417)  → refreshXDates(HARD, false, CHANGED)
delete Iso-Event                   (rebuild.js:542)           → refreshIsoEvents(HARD, FORCE)
clone Iso-Event                    (rebuild.js:566)           → refreshIsoEvents(HARD, NO_CHANGE)
rename Iso-Event (on blur)         (rebuild.js:253)           → refreshIsoEvents(SOFT,  NO_CHANGE)
location checkbox change           (rebuild.js:440)           → refreshIsoEvents(SOFT,  CHANGED)
scope dropdown change              (rebuild.js:470)           → updateLatLongInputElemValues(); selectIsoEvent(row)
X/T-Date delete                    (rebuild.js:933)           → refreshXDates(HARD, preserveScroll=true, CHANGED)
X/T-Date insert                    (rebuild.js:920)           → addXDate(...) → refreshXDates(...)
X/T-Date value entered             (rebuild.js:906)           → refreshXDates(SOFT, false, CHANGED)
X/T-Date enable checkbox           (rebuild.js:855-856)       → master config → refreshXDates(HARD, true, CHANGED)
"Current Time" changed / reset     (output.js:132, 145)       → refreshXDates(SOFT, false, CHANGED)
sort header click                  (output.js:682)            → refreshCurrentPage(RIGHT_PANEL_ONLY, results)
hide-column checkbox               (output.js:694)            → refreshCurrentPage(SOFT, results)
Y-detail radio (debug screen)      (output.js:920)            → refreshCurrentPage(SOFT, results)
```

`refreshIsoEvents(refreshType, ophisInputChange)` (`ophis_controller.js:95-104`):
```js
if ( refreshType == REFRESH_TYPE__HARD ) rebuildIsoEventTableRows();
updateLatLongInputElemValues();
refreshXDates(refreshType, /*preserveScrollPosition=*/false, ophisInputChange);
```

`refreshXDates(refreshType, preserveScrollPosition, ophisInputChange)` (`ophis_controller.js:433-509`):
1. `refreshIsoEventFiltersAndChartOptions()`
2. if `HARD`: `rebuildXDateTableRows(preserve, X_DATE)`, `rebuildXDateTableRows(preserve, T_DATE)`,
   rewrite `#x-dates-col-header`, `#t-dates-col-header`, `#iso-event-filter-header`,
   `#iso-event-chart-options-header` to `E<sub>n</sub> …`, then `refreshXDateCounts()`
3. enable/disable `#reset-x-dates-button` based on `x_dates.length > 0`
4. `refreshXDateSunsets(X_DATE)`, `refreshXDateSunsets(T_DATE)`
5. Decide whether to actually re-run the engine:
   - `FORCE` → yes
   - no previous results → yes
   - current screen is Z-Dates and change is `NO_CHANGE` → no
   - current screen is Z-Dates and change is `CHANGED` → `globalOptions["auto_recalculate_z_dates"]`
   - any other screen → no
6. `results = runOphisOnEvent(currentIsoEvent); results.stale = false;` **or** reuse
   `appState.latestResults` and set `.stale = true` (or preserve prior staleness for `NO_CHANGE`)
7. `refreshCurrentPage(refreshType, results)`
8. `removeAllDisplayedToolTips()`

### 6.3 `refreshCurrentPage` — torn down vs. patched (`ophis_view.js:93-325`)

Decision variable `callClearOutputContainer`, default `true`. It is set to `false` only when
`forceRedraw === false` **and** the screen did not change **and**:

- `refreshType == REFRESH_TYPE__RIGHT_PANEL_ONLY` and screen ∉ {ABOUT, EXPORT_X_DATES} → `false`
- screen is Z_DATES and `results.stale === true`:
  - `RIGHT_PANEL_ONLY` → forced back to `true`
  - otherwise → `false`
- screen is EVENT_SETTINGS → forced to `true`

When `callClearOutputContainer === true` (`ophis_view.js:188-192`):
```js
destroyFlatPickrInstance(document.getElementById("current-local-time"));
screenSpecificArea.innerHTML = "";
clearOutputContainer();     // destroys #event-day-scope-start-time flatpickr, sets outputContainer.innerHTML = "",
                            // and removeAllDisplayedToolTips()
```

**Order matters and is documented in the source** (`ophis_view.js:143-152`): the screen-specific area
must be cleared *before* `clearOutputContainer()`, because blanking it fires a `blur` on the
`#current-local-time` field which used to recurse back into `refreshCurrentPage` and render every
output row twice. The recursion was fixed with an `onValidDateEntered_calling` guard, but the
ordering was kept as belt-and-braces.

Then, for the Z-Dates screen (`ophis_view.js:230-240`):
```js
setUpCondensedOutputOptionsControls(results);       // ALWAYS runs — even when the container was not cleared
if ( previousScreenSameAsCurrentScreen ) {
    var doRender = forceRedraw === true
                || results.stale === false
                || (results.stale === true && refreshType == REFRESH_TYPE__RIGHT_PANEL_ONLY);
    if ( doRender ) renderCondensedOutputElseErrors(results);
} else {
    renderCondensedOutputElseErrors(results);
}
```
So a **stale** result set on a non-`RIGHT_PANEL_ONLY` refresh leaves the previously-rendered rows in
place and merely dims them (§7.3). That is the "patched, not recreated" path.

### 6.4 `rebuildIsoEventTableRows()` — full teardown (rebuild.js:234-594)

Order of operations:

1. `getIsoEventContainer()`
2. `setOverflowOnScrollContainers("hidden")` — the comment at rebuild.js:3-4 explains why: with
   enough Iso-Events to scroll, leaving overflow on lets the filter panel overlap the event panel
   during relayout.
3. `clearRowsFromTableExceptTopRow(container)` — `while (rows.length > 1) deleteRow(1)`
   (`ophis_view__utils.js:349-353`). **All rows and their listeners are destroyed.** No flatpickr
   instances live in these rows, so none are destroyed.
4. For each `appState.isoEvents[i]`, build `newRowHtml` and `insertRow(-1)` with class `iso_event_row`.
   Cell order:
   - `E<sub>i+1</sub>` (`col_sub_header_format_for_row`, `width:0%`)
   - name `<input class='iso_event_name_input general_input'>` (`width:50%`, `height:26px`, `min-width:188px`)
   - scope `<select class='scope_display bordered small_border_radius'>` — only if `FEATURE_FLAG__SHOW_SCOPE`
   - location `<table>` with lat input, long input, `./img/location.png` — only if `FEATURE_FLAG__SHOW_LOCATION`
   - timezone `<div class='algo_output_in_col timezone_display'>` — only if `FEATURE_FLAG__SHOW_LOCATION`
   - delete `<div class='row_delete_button'>&#10006;</div>` in a `error_color col_format` cell
   - clone `<div class='row_clone_button'><img src='./img/clone.png'></div>` in a `green_color col_format` cell
   - radio `<input tabindex='-1' name='selected_iso_event' class='row_radio_button' type='radio'/>`
5. Populate selects via `fillInSelectElem(scopeDropdown, EVENT_SCOPES, getEventScopeName)` and set
   `.value = ithIsoEvent.scope`.
6. **Name is assigned by property, never by attribute** — `eventNameEscaped` is hardcoded `""`
   (rebuild.js:278-280) and the real value is set at rebuild.js:371-372:
   ```js
   inputNameElem.title = ithIsoEvent.name;
   inputNameElem.value = ithIsoEvent.name;
   ```
   The comment explains this avoids cross-browser quoting quirks. **Reproduce this** — building the
   attribute from user text would be an injection hole.
7. `applyToolTip(...)` on 8-10 elements per row (each a jQuery/tipsy bind).
8. `setAttribute("row_index", i)` on every interactive element — this is how handlers recover their
   row (`getRowIndex` walks to `parentElement` if the attribute is missing:
   `ophis_view__utils.js:362-373`).
9. Wire listeners:
   - name `keydown`: `removeAllDisplayedToolTips()`; on `Tab`, `preventDefault()` and move focus to
     the next `.iso_event_name_input`, or to `.x_date_calendar_input[0]` if this was the last.
   - name `focus`: `removeAllDisplayedToolTips()`
   - name `input`: **no-op** — auto-update on keystroke is deliberately disabled (rebuild.js:492-495)
   - name `keydown` (2nd listener): Enter (`KEY_CODE__ENTER = 13`) or Escape → `this.blur()`
   - name `blur`: `onNameInputUpdate` — writes the name only if changed, updates `.title`,
     `flushChangesToDisk()`, `refreshIsoEvents(SOFT, NO_CHANGE)`
   - lat/long: `addEventListenersToLatOrLongInput(...)`
   - map icon `click`: if `scope == HH_MM` → `showMap(isoEvent)` else
     `showToast("Location is only relevant to HH:MM Scope.")`
   - location checkbox `change`: if `HH_MM` → toggle + flush + `refreshIsoEvents(SOFT, CHANGED)`;
     else `preventDefault()`, `this.checked = false`,
     `showToast("Location is only applicable to HH:MM scope.")` *(note the two toast strings differ)*
   - scope `change`: set `isoEvent.scope`, force `location_enabled` on iff HH:MM (which also zeroes
     lat/long), flush, `updateLatLongInputElemValues()`, `selectIsoEvent(rowIndex)`
   - delete `click`: `showDialog("Are you sure you want to delete event <b>E<sub>n</sub></b> named <b>NAME</b>? It has <b>K</b> X-Dates.", "NO, don't delete", "YES, delete", cb)`.
     Callback: if `isoEvents.length > 1` splice, fix `current_iso_event_index`
     (clamp to last index if out of range; decrement if the removed row was before it), flush,
     `refreshIsoEvents(HARD, FORCE)`. Else `resetAllIsoEvents()`.
   - clone `click`: `deepClone`, name += `" copy"`, clear `checked_for_swap_source` /
     `checked_for_swap_target`, push, flush, `refreshIsoEvents(HARD, NO_CHANGE)`,
     `scrollPanelToBottom(getIsoEventContainer())`,
     `showToast("Cloned 'X' to end of list, named 'X copy'")`
   - radio `click`: `selectIsoEvent(rowIndex)` only if index differs **and** `isoEvents.length > 1`
10. Button state: clone always enabled and forced `style.color = "green"` (rebuild.js:507-508 —
    overriding `enableRowButton`'s black); delete **always enabled** (rebuild.js:523); radio disabled
    when `isoEvents.length <= 1`.
11. `refreshIsoEventRowBackgrounds(currentIsoEventIndex)` (`ophis_controller.js:404-415`) —
    sets `row_selected="true"` on the current row (only when there is more than one row),
    `"false"` on all others.

### 6.5 `rebuildXDateTableRows(preserveScrollPosition, inputDateType)` (rebuild.js:948-1031)

1. Resolve `isForXDates`, container, starting-message element, input class name.
2. If `preserveScrollPosition === true`, capture `inputDateContainer.parentElement.scrollTop`.
3. Set the column-header `.title`:
   - X-Dates, `HH_MM` scope: `"When an individual instance of an Iso-Event ENDED.<br>This time must be LOCAL to the timezone. e.g. for an NFL game this would be the end time of the game as a spectator in the stands would see on his watch, when the score is final. The hour:minute is used as the starting point for adding a Z-Value to an X-Date in order to find a Z-Date."`
   - X-Dates, other scopes: `"The calendar date of an event, e.g. one of several dates when Bitcoin reached an all time high. "`
   - T-Dates: `"A specific date in the future that you're interested in."`
4. Show/hide the prior-sunset header columns: `display = FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_IN_SEPARATE_COL ? "table-cell" : "none"`
   (the flag is `false`, `ophis_config.js:302`).
5. **Empty branch** (`inputDateArray.length == 0`, rebuild.js:995-1016):
   ```js
   startingMessageElem.style.display = "block";
   inputDateContainer.style.display    = "block";
   inputDateContainer.style.maxHeight  = "0px";
   inputDateContainer.style.visibility = "hidden";
   destroyFlatPickrInstances(inputClassName);
   clearRowsFromTableExceptTopRow(inputDateContainer);
   disableRowButton(resetAllXDatesButton);
   rebuildXDateTableRowsInternal([nativeDateToXDate(new Date()) with .enabled = true], inputDateType, /*isDummyRow=*/true);
   ```
   The dummy row exists purely so `setPanelMaxDimensions` has a real row height to measure
   (`.x_date_row` is queried at rebuild.js:47). It is invisible and zero-height because of the
   container styles. Its input/delete/insert elements get `disabled = true` (rebuild.js:798-803).
6. **Non-empty branch**: restore `display:table`, `maxHeight:unset`, `visibility:unset`, hide the
   starting message, call `…Internal(inputDateArray, inputDateType, false)`.
7. Restore `scrollTop` if requested.

### 6.6 `rebuildXDateTableRowsInternal(...)` — the patch-vs-recreate core (rebuild.js:668-946)

**Teardown decision (rebuild.js:681-712):**
```js
existingXDateRowsContainer = inputDateContainer.getElementsByClassName(rowClassName);   // LIVE collection

if ( isDummyRow === false && existingXDateRowsContainer.length > 0 ) {
    if ( existingXDateRowsContainer[0].classList.contains(rowClassName + "_dummy") ) {
        destroyFlatPickrInstances(inputClassName);
        clearRowsFromTableExceptTopRow(inputDateContainer);      // empties the live collection
    }
}
for (...) existingXDateRows.push(existingXDateRowsContainer[i]);  // snapshot into a real array

var clearExistingRows = false;
if ( existingXDateRows.length == 0 ) {
    clearExistingRows = true;                                     // help message was showing
} else if ( existingXDateRows[0].getAttribute("event_scope") != currentIsoEvent.scope ) {
    clearExistingRows = true;                                     // scope changed → markup differs
}
if ( clearExistingRows === true ) {
    existingXDateRows = [];
    destroyFlatPickrInstances(inputClassName);
    clearRowsFromTableExceptTopRow(inputDateContainer);
}
```

So rows are **destroyed and recreated** only when (a) transitioning dummy→real, (b) there were no
rows, or (c) the event scope changed. Otherwise rows are **patched in place**.

**Patch path (rebuild.js:725-740)** — for `i < existingXDateRows.length`:
```js
dateInputElem.value       = xDateToInputElementValue(ithXDate, currentIsoEvent.scope);
xDateCheckboxElem.checked = ithXDate.enabled;
if ( dateInputElem._flatpickr ) dateInputElem._flatpickr.setDate(xDateAsInputValue);
continue;                                   // listeners and flatpickr instance are REUSED
```

**Create path (rebuild.js:742-935)** — cells in order:

| # | Content | Width |
|---|---|---|
| 0 | `<div class='input_row_name'>X<sub>i+1</sub></div>` (or `T<sub>i+1</sub>`) | `0%` |
| 1 | `<input class='date_input_common x_date_calendar_input general_input'>` + optional inline-sunset table | `33.33%`, centered |
| 2 | prior-sunset cell — only if `HH_MM && FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_IN_SEPARATE_COL` (**broken, see G-4**) | `0%` |
| 3 | `<input type="checkbox" class="x_date_checkbox" tabindex="-1" title="Enable/Disable this X-Date">` | `0%` |
| 4 | `<div title='Delete This X-Date' class='row_delete_button'>&#10006;</div>` | `0%` |
| 5 | `<img class='row_insert_button' src='./img/left_arrow.png' title='Insert New X-Date here.'/>` | `0%` |

`minDateFieldWidth` by scope (rebuild.js:749-757): `HH_MM` → `"155px"`, `DAYS` → `"103px"`,
`MONTHS` → `"85px"`, `YEARS` → `"100px"`.

Inline sunset is shown when `scope == HH_MM && FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_INLINE`
(`true`). When shown, the insert button gets `top:-31px` and the date input gets `margin-top:4px`.
Inline sunset markup:
```html
<table style='display:inline-block; margin-top:2px;' class='prior_sunset_display_wrapper'
       title='The most recent sunset before the X-Date, which may be the day before the X-Date.<br>The time of the sunset is relative to the timezone of the location.'>
 <tr><td><img style='opacity:.5; width:24px; height:24px;' src='./img/sunset.png'/></td>
     <td><div style='margin:0px; margin-left:2px; width:100%;' class='algo_output_in_col prior_sunset_display prior_sunset_display_x_date'></div></td></tr>
</table>
```

The row gets `setAttribute("event_scope", currentIsoEvent.scope)` (rebuild.js:790) — this is the
sentinel the teardown check reads.

**Flatpickr wiring (rebuild.js:861-912):**
```js
flatPickrBaseConfig = FLATPICKR_BASE_DATE_CONFIG__{HH_MM|DAYS|MONTHS|YEARS}();  // fresh object per row
flatPickrConfig = flatPickrBaseConfig;          // NOT deepCloned — see the commented-out deepClone
flatPickrConfig.inline   = false;
flatPickrConfig.position = "custom custom";
flatPickrConfig.defaultDate = xDateToInputElementValue(ithXDate, currentIsoEvent.scope);
dateInputElem.value = flatPickrConfig.defaultDate;
setUpDateInput(flatPickrConfig, dateInputElem, currentIsoEvent.scope, /*timezone=*/null, fallbackDateString, onValidDateEntered);
flatpickr(dateInputElem, flatPickrConfig);
```

`onValidDateEntered(inputElem, parsedNativeDate, xDate)`:
```js
inputDateArrayInner[rowIndex].date = xDate.date;
inputDateArrayInner[rowIndex].time = xDate.time;
flushChangesToDisk();
refreshXDates(REFRESH_TYPE__SOFT, /*preserveScrollPosition=*/false, OPHIS_INPUT_CHANGE__CHANGED);
```
`fallbackDateString(inputElem)` re-reads the model value for that row and re-renders it — the
"revert on invalid input" path.

**Tab handling (rebuild.js:805-835):** on `Tab`, `preventDefault()` + `stopPropagation()` +
`removeAllDisplayedToolTips()`, then focus the next `.x_date_calendar_input`; if this was the last,
focus `.operation_equation_input[0]`, and if there are none, `.iso_event_name_input[0]`.

**Surplus-row pruning (rebuild.js:937-945)** — runs *after* the create/patch loop:
```js
for ( var k = inputDateArray.length; k < existingXDateRows.length; k++ ) {
    destroyFlatPickrInstance(existingXDateRows[k].getElementsByClassName(inputClassName)[0]);
    existingXDateRows[k].remove();
}
```

### 6.7 `setPanelMaxDimensions()` — the layout pass (rebuild.js:19-216)

Constants: `borderSpacing = 1.5` (hardcoded local, rebuild.js:35);
`OPHIS_PANEL_BORDER_SPACING = 10` (`ophis_view__config.js:31`).

Order:

1. `windowHeight = document.body.clientHeight` — *"force layout again, I think"* (rebuild.js:21).
2. Query: `#iso-event-filter-container`, `#panel-container-top-row`, `.col_header_background[0]`,
   `.chart_container[0]`, `.chart_options_scrollable_container[0]`, `.scrollable_container` (live),
   `#output-container`, `#scrollable-container-for-output-container`.
3. `isoEventFilterContainerHeight = isoEventFilterContainer.clientHeight`;
   `colHeaderHeight = sampleColHeaderBackground.clientHeight`.
4. If `.t_date_scrollable_container[0]` exists → `maxHeight = isoEventFilterContainerHeight + "px"`.
5. `isoEventFilterContainer.parentElement.style.minHeight = isoEventFilterContainerHeight + "px"`.
6. **X-Date row height heuristic (rebuild.js:45-58):**
   ```js
   xDateRows = document.getElementsByClassName("x_date_row");
   if      (xDateRows.length == 1) xDateRowHeight = xDateRows[0].clientHeight;
   else if (xDateRows.length  > 1) xDateRowHeight = xDateRows[0].clientHeight * 2;   // exactly 2 rows' worth, never more
   if (xDateRows.length > 0) {
       var xDateHeaderRowHeight = xDateRows[0].parentElement.firstChild.clientHeight;
       xDateHeaderRowHeight -= borderSpacing * 2;
       xDateRowHeight += xDateHeaderRowHeight;
   }
   ```
   i.e. the top panels are sized to show **at most two X-Date rows plus the header**.
7. ```js
   maxHeightForTopScrollContainers =
       windowHeight - (colHeaderHeight*3 + OPHIS_PANEL_BORDER_SPACING*3 + borderSpacing*2 + isoEventFilterContainerHeight);
   ```
8. **First pass** over `.scrollable_container`: for each whose ancestor is `#panel-container-top-row`
   (via `elementHasAncestor`, `ophis_view__utils.js:51-60`), read
   `.inner_panel_table_starting_message[0].clientHeight` and keep the maximum
   (`biggestStartingMessageHeight`).
9. **Second pass** over the same set:
   ```js
   maxHeightBetweenStartingMessageAndXDateRows = Math.max(xDateRowHeight, biggestStartingMessageHeight);
   if ( maxHeightForTopScrollContainers < maxHeightBetweenStartingMessageAndXDateRows ) {
       finalMinHeight = finalMaxHeight = maxHeightBetweenStartingMessageAndXDateRows;
   } else {
       finalMinHeight = maxHeightBetweenStartingMessageAndXDateRows;
       finalMaxHeight = maxHeightForTopScrollContainers;
   }
   if ( isForXDates === false ) {                      // .x_date_scrollable_container test
       finalMaxHeight += (colHeaderHeight - borderSpacing);
       if ( finalMinHeight > innerClientHeight ) finalMinHeight = innerClientHeight;
   }
   container.style.minHeight = finalMinHeight + "px";
   container.style.maxHeight = finalMaxHeight + "px";
   ```
   `maxHeightForMessageOrInnerContainer` (rebuild.js:109) is computed and **never used** — dead.
10. ```js
    bottomEmptySpace = windowHeight - (panelContainerTopRow.clientHeight + isoEventFilterContainerHeight
                                       + colHeaderHeight + OPHIS_PANEL_BORDER_SPACING*3 + 1);
    ```
    The `+ 1` is unexplained: *"Not sure why the +1 is required on the end. It's just what I saw in web inspector."* (rebuild.js:125).
11. ```js
    chartContainerMaxHeight = isoEventFilterContainerHeight + colHeaderHeight + borderSpacing;
    chartOptionsContainer.style.maxHeight = isoEventFilterContainerHeight + "px";
    chartContainer.style.maxHeight        = chartContainerMaxHeight + "px";
    ```
    A superseded alternative that gave the bottom row more room is commented out at rebuild.js:130-141
    with the reason *"things jump around too much when toggling output filters."*
12. Every `.bottom_row_panel_cell` gets `paddingTop = (bottomEmptySpace > 0 ? bottomEmptySpace : 0) + "px"`.
13. **Expanded-output branch** (`shouldExpandMainOutputPanel() === true`, rebuild.js:171-197):
    ```js
    maxHeightWithoutChart = windowHeight - (colHeaderHeight + OPHIS_PANEL_BORDER_SPACING*2) - borderSpacing*2;
    outputContainerWrapper.style.maxHeight            = maxHeightWithoutChart + "px";
    outputContainerWrapper.parentElement.style.position = "fixed";
    outputContainerWrapper.parentElement.style.zIndex   = "3";
    outputContainerWrapper.parentElement.style.width    = colHeaderForOutputPanel.clientWidth + "px";
    bottomRowPanelCellForChart.style.visibility          = "hidden";
    updateOutputPanelScrollIfNeeded();
    ```
    `bottomOfOutputPanelActual` / `bottomOfOutputPanelMax` / `bottomOfOutputPanel` /
    `bottomRowTopOffset` are computed and **never used** — dead (rebuild.js:178-187).
    `updateOutputPanelScrollIfNeeded` (`ophis_view__utils.js:19-32`) counteracts window scrolling on
    a `position:fixed` element by applying
    `transform: translateY(-window.scrollY px) translateX(-window.scrollX px)`.
14. **Else branch** (rebuild.js:198-210): resets `position`, `zIndex`, `width`, `transform` to
    `"unset"` and `bottomRowPanelCellForChart.style.visibility = "inherit"`.
15. `document.body.clientHeight;` again (*"Don't think this actually does anything now, but doesn't seem to hurt."*), then `recenterChartIfNeeded()`.

### 6.8 Performance-sensitive parts

| Location | Cost |
|---|---|
| `setPanelMaxDimensions` as a whole | **Forced synchronous reflow, repeatedly.** It interleaves `clientHeight`/`clientWidth` reads with `style.minHeight`/`maxHeight`/`width` writes across two loops over a live `HTMLCollection`. Each write invalidates layout; the next read forces it. With N top-row scroll containers this is O(N) full layouts. |
| `refreshCurrentPage` → `setOverflowOnScrollContainers` called **twice in a row** inside one `requestAnimationFrame` (`ophis_view.js:126-131`) | Two full `setPanelMaxDimensions` passes per refresh. The comment admits it: *"Have to call this twice, prolly cause layout code just got too scrambled as far as order or operations, dependencies, whatever."* |
| `renderCondensedOutput` reading `operationHeaderElem.clientWidth` (output.js:334) | Forces layout immediately after inserting the header row, before any data row exists. |
| Per-row `mouseenter`/`mouseleave` → `updateChartDatasets(appState.latestResults)` (output.js:661-671, 700-706) | A **full chart dataset rebuild on every row hover**. The comment at output.js:701-704 explains why it cannot be cheaper: dataset z-order is not scriptable in Chart.js, so datasets must be regenerated from scratch. |
| `onMouseOverPill` → `getOperationResultFromHash` (output.js:708-730) | Linear scan of every z-struct × every operation match, on every pill hover, followed by a full chart dataset rebuild. |
| `applyToolTipToCssClass(...)` inside loops (output.js:902-903; rebuild.js:840-841) | Re-binds tipsy to *all* matching elements on every iteration → O(n²) jQuery work. |
| `rebuildXDateTableRowsInternal` patch path | The one genuine optimization: existing rows and their flatpickr instances are reused (`continue` at rebuild.js:739) instead of being destroyed. Preserve this — flatpickr construction is the dominant cost when there are many X-Dates. |
| `clockRefreshLoop` (output.js:59-68) | A 500 ms `setTimeout` chain started at module load, forever. Cheap (writes one input value + toggles one button) but it never stops and is never cancelled. It does **not** re-render results. |
| `flushChangesToDisk()` on every sort click, name blur, checkbox toggle | Serialization on each interaction. |

---

## 7. EMPTY, LOADING, AND ERROR STATES

### 7.1 Empty state — no Z-Dates survive the filters

`renderCondensedOutput` (output.js:271-277):
```js
if ( sortedAndFilteredZDates.length == 0 ) {
    var softErrors = [];
    softErrors.push(NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT);
    var clearDatesHidden = false;
    renderErrors(softErrors, clearDatesHidden);
    return;
}
```
`NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT = "No results. You probably have to loosen up a filter."`
(`ophis_view__config.js:12`). It is rendered by `renderErrors` under a header literally reading
**`Errors`** and styled `error_color` — a soft empty state wearing an error costume. Passing
`clearDatesHidden = false` preserves the `Z-Dates hidden: N` counter so the user can see how many
rows the filters removed.

`renderErrors` output shape (`ophis_view.js:345-359`):
```html
<tr><td class="col_sub_header_format" style="width:50%;">Errors</td></tr>
<tr><td style='width:33.33%;' class='col_format'><div class='col_output_text error_color'>MESSAGE</div></td></tr>
…
```

### 7.2 Empty state — no X-Dates / T-Dates

Handled in `rebuildXDateTableRows` §6.5 step 5: `#x-date-container-starting-message` (or the T-Date
equivalent) is shown, the table is collapsed to `max-height:0px; visibility:hidden`, the reset button
is disabled, and one invisible dummy row is created for layout measurement.
The intended copy lives in `ophis_view__strings.js:6-7`:

- `HELP_MESSAGE__X_DATES_PANEL` = `"X-Dates are the primary type of Input data to the Ophis algorithms. At least 2 X-Dates are required to generate Output. Click the Add button above to get started."`
- `HELP_MESSAGE__T_DATES_PANEL` = `"T-Dates (Target Dates) are a way to only show Z-Dates for the future dates that you are interested in, e.g. when a team will actually play again."`

The code that injected them into a table row is **commented out** (rebuild.js:1013-1016); the message
now lives in the static `#…-starting-message` element instead.

### 7.3 Stale state

Set by `refreshXDates` when the engine was not re-run. Rendered by `refreshCurrentPage`
(`ophis_view.js:275-316`):

| | `stale === true` | `stale === false` |
|---|---|---|
| `#scrollable-container-for-output-container` opacity | `0.5` (`OPACITY__DISABLED`) — **only on the Z-Dates screen**; `1.0` elsewhere | `1.0` |
| `#recalculate-z-dates-button` | `enableStandardButton` | `disableStandardButton` |
| `#z-dates-up-to-date` | `class="error_color"`, text `Stale` | `class="green_color"`, text `Up-to-date` |
| chart | `hideChartElem()` if there are errors, else chart opacity `0.5` | chart opacity `1.0`; `updateChartDatasets(results)` runs |
| chart error wrapper | opacity `0.5` | opacity `1.0` |
| `#z-dates-hidden` | `Z-Dates hidden: -` | `Z-Dates hidden: N` |

`#z-dates-up-to-date` is forced to `width: 101px` first (`ophis_view.js:280`) with the TODO
*"This is here so that Stale vs. Up-to-date don't shift the UI at all. Do that by having both states as separate elements and hide/show them."*

`enableStandardButton` / `disableStandardButton` (output.js:35-45):
```js
disable: opacity = 0.5;  cursor = "default";  disabled = true;
enable:  opacity = 1.0;  cursor = "pointer";  disabled = false;
```

### 7.4 Loading state (first paint only)

`refreshCurrentPage` on `appState.viewUpdateCount == 1` (`ophis_view.js:99-123`):
```
t = 0     ms : schedule the block below
t = 500   ms : #initial-loading-container gets class "fade_out_loading_image"
               #panel-container: visibility = "visible", class "fade_in_panels" added
               requestAnimationFrame: blockChartFlushToDiskUntilUserInteraction();
                                      setOverflowOnScrollContainers("scroll");
                                      if appState.loadedFromDisk and no current_file_path:
                                          showToast("Successfully loaded previous session.")
               recenterChartOnStartup()
t = 1500  ms : #initial-loading-container removed from the DOM
```
`OVERFLOW_FOR_SCROLL_ENABLED = "scroll"` (`ophis_view.js:3`).

### 7.5 Hard error state

`results.errors` is concatenated with `appState.startupErrors` (`ophis_view.js:194`). If non-empty:

1. If the current screen is not one of Z_DATES / DEBUG / OPERATIONS / EVENT_SWAP / EXPORT_X_DATES /
   EVENT_SETTINGS, and the refresh is not `RIGHT_PANEL_ONLY`, and `callUpdateChartDatasets === true`,
   the app **force-navigates to the Z-Dates screen** — writing `GLOBAL_OPTION__START_SCREEN` and
   setting `#current-screen`'s value (`ophis_view.js:206-215`).
2. `results.processed_z_dates = []` and `results.processed_z_dates__sorted_by_date = []`.
3. `refreshDatesHidden(0)`.
4. `renderCondensedOutputElseErrors` then takes the `renderErrors(errors)` branch.

Engine exceptions are converted to error strings, not thrown: `catch (error) { errors.push(""+error); }`
(`ophis_model__operations.js:130-132`).

`appState.justFixedErrors` is set to `true` when the previous results had errors and the current ones
do not (`ophis_view.js:196-203`), then reset to `false` at `ophis_view.js:273` — a one-refresh-long
flag that neither of my two files reads.

### 7.6 Current-Time help dialog (output.js:150-157)

Exact body, joined with `<br><br>`:
1. `Current Time is automatically set to reflect your current computer time and time zone. The time can be overridden but currently the time zone cannot.`
2. `Your time zone appears to be: <b>` + `getBrowserTimezone()` (`moment.tz.guess()`) + `</b>`
3. `Current Time is used for the F3 and F4 Output Filters. Please note that even if you override Current Time, it will keep incrementing. It won't stay fixed to the time you set.`
4. `This feature is intended as a convenience to automatically hide unactionable Output Dates. If doing backtesting however, then F3/F4 should probably both be turned off.`

---

## 8. DATA STRUCTURE SHAPES

```ts
// results — produced by runOphisOnEvent (ophis_model__operations.js:134-150)
type Results = {
  errors: string[];
  y_structs: YStruct[];
  z_structs: { [zDateStartUtcMillisAsString: string]: ZStruct };
  selected_y_struct_for_details: number;          // index into y_structs; default 0
  processed_z_dates: string[];                    // keys into z_structs, in DISPLAY order
  processed_z_dates__sorted_by_date: string[];    // keys into z_structs, chronological
  stale?: boolean;                                // set by refreshXDates, not by the engine

  // Transient view state, written by ophis_view__output.js and the chart module:
  highlighted_z_date_row?: string | null;             // z_date_key of the hovered <tr>   (output.js:662,669)
  highlighted_operation_result_pill?: OperationResult | null;  //                          (output.js:755,757)
  highlighted_z_date_point?: string | null;           // set by the chart
  highlighted_operation_result_curve?: OperationResult | null; // set by the chart
};

// ZStruct — tagZDates + scoreZDates (ophis_model__operations.js:564-579, 451-458; :163)
type ZStruct = {
  z_date_native: Date;
  z_date_native_start: Date;
  z_date_native_end: Date;
  z_date_readable_start: string;        // HTML; "MM/DD/YYYY" or "MM/DD/YYYY<span class='has_clock_font'>HH:MM</span>"
  z_date_readable_end: string;
  z_date_readable_start_no_html: string;
  z_date_readable_end_no_html: string;
  operation_match_structs: OperationMatchStruct[];   // sorted by sortOperationMatches
  msrf_match_structs: MsrfMatchStruct[];             // sorted by sortMsrfMatches (multiplier DESC)
  score: number;                        // roundNumberToPrecision(finalScore, 2)
  base_score_pre_multiply: number;
  operation_score: number;
  operation_hit_count: number;          // == operation_match_structs.length
  hit_count: number;                    // operation_hit_count + msrf_match_structs.length
  z_ordinal: number;                    // 0-based CHRONOLOGICAL index; drives the Z₍n₎ row label
};

type OperationMatchStruct = {
  y_struct: YStruct;
  operation_result: OperationResult;
  points?: number;                      // = operation.weight, injected by getOperationScore
};

type MsrfMatchStruct = {                // from getMsrfMatch(), then decorated by tagZDates
  msrf_filter: number[];                // identity-compared against MSRF_FILTER__{NORMAL,IMPORTANT,VORTEX}
  msrf_number: number;                  // the matched filter entry — what the pill DISPLAYS
  points: 1 | 2;
  css_class: "msrf_normal" | "msrf_important" | "msrf_vortex";
  readable_name: "Normal" | "Important" | "Vortex";
  y_struct: YStruct;
  operation_result: OperationResult;
};

type OperationResult = {                // ophis_model__operations.js:392-410
  z_value: number;                      // raw day offset
  rotation_count_y: number;
  rotation_count_z: number;             // roundNumberToAxialRotationPrecision(z_value) → 1 dp
  z_date_native: Date;
  z_date_native_start: Date;
  z_date_native_end: Date;
  z_date_readable_start / _end / _start_no_html / _end_no_html: string;
  x_date_native_start: Date;
  x_date_native_other: Date;
  operation_ordinal: number;            // index into currentIsoEvent.effective_operations
  operation: Operation;                 // { equation, weight, enabled }
  hash: string;                         // ordinal + x1ms + x2ms + zStartMs — the pill's operation_result_hash
  hash_without_ordinal: string;
  z_date_dict_key: number;              // zDateNativeToMillis
};

type YStruct = {                        // fields observed from the view side
  y_ordinal: number;
  x_1_ordinal: number;
  x_2_ordinal: number;
  rotation_count_y: number;             // "Y" = whole days between X1 and X2
  operation_results: OperationResult[];
};
```

---

## 9. GOTCHAS

**G-1 — Score is not fixed-decimal.** `zStruct.score` is `roundNumberToPrecision(v, 2)`, a *number*,
interpolated straight into HTML (output.js:649). A score of `9` renders `9`, not `9.00`; `4.5`
renders `4.5`, not `4.50`. Do **not** apply `toFixed(2)` — column widths and existing screenshots
depend on the ragged form.

**G-2 — `MONTHS` and `YEARS` scopes render an empty Z-Date cell.** `renderCondensedOutput` only
branches on `EVENT_SCOPE__HH_MM` and `EVENT_SCOPE__DAYS` (output.js:359-369). For the other two
scopes, which the scope dropdown *does* offer (`ophis_config.js:323-324`, rebuild.js:753-757 sizes
their inputs), `ithDateRangeInnerHtml` stays `""` and the Z-Date column is blank. Real bug.

**G-3 — The dummy padding pill is malformed HTML and reuses a stale variable.** output.js:504:
```js
var dummyMatchPill = "<div operation_type='"+""+"' style='visibility:visible; cursor:help;' class='"+cssClassName+"><div style='text-align:center;'>"+""+"</div></div>";
```
The `class='` attribute is never closed, so the parsed class value swallows `><div style=` etc. Also
`cssClassName` is the loop variable left over from the *last* operation pill — for a Z-Date whose
`operation_match_structs` is empty it would be `undefined` or leak in from the previous row's loop.
A faithful reimplementation should emit an empty `<td>` (or a properly-quoted invisible spacer)
instead; the observable effect today is an unstyled empty box.

**G-4 — `sunsetColDisplay` is a ReferenceError waiting to happen.** rebuild.js:773 reads
`sunsetColDisplay` inside `rebuildXDateTableRowsInternal`, but the variable is only declared inside
`rebuildXDateTableRows` (rebuild.js:978) — a different function, so it is not in scope and is not a
global. The line is reachable only when
`FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_IN_SEPARATE_COL` is true; the flag is `false`
(`ophis_config.js:302`), so the code is dead today and would throw the moment it is enabled.

**G-5 — The T-Date reset button ends up enabled when there are zero T-Dates.**
`rebuildXDateTableRows` disables the reset button (rebuild.js:1005) and *then* calls
`rebuildXDateTableRowsInternal` for the dummy row (rebuild.js:1011), which unconditionally calls
`enableRowButton(resetAllXDatesButton)` (rebuild.js:714). For X-Dates the mistake is masked because
`refreshXDates` re-disables `#reset-x-dates-button` afterwards (`ophis_controller.js:452-458`) —
but that correction only ever touches the X-Date button. `#reset-t-dates-button` stays enabled.

**G-6 — The `Z₍n₎` row label is chronological, not positional.** `z_ordinal` is assigned from
`zDatesSortedByDate` (`ophis_model__operations.js:160-164`), before the display sort is applied.
Sorting by Score therefore produces rows labelled `Z₃, Z₁, Z₉, …`. This is intentional (the label is
a stable identity shared with the chart), and a reimplementation that renumbers per display order
will break cross-references. Separately, output.js:401 and :554 compute a `zShortName` from
`kthOperationOrdinal` — that is the **operation** ordinal, not a Z ordinal, so `zShortName` there
means something entirely different from the row label. `zShortName` is unused in the operations
tooltip (output.js:436 substitutes the literal `"Z-Date"` instead) but *is* used in the MSRF block
(output.js:586, into `xToZStringWithArrow`, which is itself then unused there).

**G-7 — `renderDebugOutput` always reports X₂ as the starting X.** output.js:864 calls
`getStartingX(operationStruct)` with the operation **object**, not `operationStruct.equation`.
`getStartingX` stringifies it to `"[object Object]"`, neither `startsWith("X1+")` nor
`startsWith("X2+")` matches, so it returns `null`, the `== STARTING_X1` test fails, and the else
branch always fires. Compare the correct call at output.js:417 and :568, which pass
`kthOperation.equation`.

**G-8 — `renderDebugOutput` fails to strip the `X2+` prefix.** output.js:874-875:
```js
originalEquationWithSubscriptsForX = originalEquationWithSubscriptsForX.replace("X1+", "");
originalEquationWithSubscriptsForX = originalEquationWithSubscriptsForX.replace("X2+ ", "");   // trailing space
```
`normalizeOperationEquationString` strips **all** spaces (`ophis_model__validation.js:33`), so
`"X2+ "` can never match. X2-based equations keep their `X2+` prefix in the debug Z-Equation column.
Also `xStringToReplaceInEquation` is computed at output.js:863-871 and never used in that block.

**G-9 — `renderDebugOutput` is unreachable.** `OPHIS_SCREEN__DEBUG` is commented out of
`OPHIS_SCREENS` (`ophis_view__config.js:136`), so the screen selector never offers it. The dispatch
at `ophis_view.js:241-246` still exists. Treat this whole function as reference documentation for the
detail view rather than shipping UI.

**G-10 — Hide-column checkbox semantics are inverted twice.** The label reads **"Show"**, the
checkbox id is the **hide** option key, `checked = globalOptions[key] === false`, and
`shouldNowBeHidden = this.checked == false`. Two inversions that cancel out. Get one of them wrong
and the UI silently means the opposite.

**G-11 — `blurred_output_column` does not blur.** It is `visibility: hidden` on descendants
(ophis.css:473-476). The `filter: blur(8px)` on line 475 is commented out.

**G-12 — The hide-column *controls* ship disabled but the *effect* does not.**
`FEATURE_FLAG__ALL_OPERATOR_HIDE_OUTPUT_COLS = false` (`ophis_config.js:311`) suppresses the header
row that contains the checkboxes, but output.js:638-643 still reads the five global options on every
row. A persisted `hide_score_col: true` from another build would hide the column with no way to
un-hide it through the UI.

**G-13 — `MSRF_PILLS_PER_ROW` is shadowed and its wrap logic is dead.** output.js:536 declares a
function-local `var MSRF_PILLS_PER_ROW = 1;` shadowing the identical global
(`ophis_view__config.js:18`). With the value 1, `k % 1 == 0` for all `k`, so the trailing pad at
output.js:624 (`length % MSRF_PILLS_PER_ROW != 0`) can never fire. MSRF pills are always one per row.

**G-14 — Two tooltip targets that do not exist.** `applyToolTipToElemId("z-date-filter-checkbox-label")`
(output.js:161) refers to a label whose generating HTML is commented out (output.js:87-88); it resolves
to `null` and `applyToolTip` no-ops on the `if (element)` guard. Likewise `applyToolTip(xDateCountElem)`
(rebuild.js:385) targets a `.x_date_count` cell whose markup is commented out (rebuild.js:285).

**G-15 — Y-value formatting differs between the two pill tooltips.** The operations tooltip uses
`intToDecimalString(yStruct.rotation_count_y)` (output.js:431) → `"84.0"`; the MSRF tooltip
interpolates the raw value (output.js:582) → `"84"`. Same field, two renderings. Reproduce both if
you want byte-identical tooltips.

**G-16 — Tooltip binding inside render loops is quadratic.** `applyToolTipToCssClass` is
`$("." + cssClass).tipsy(cfg)` — it re-binds every existing matching element. Calling it once per row
(output.js:902-903; rebuild.js:840-841) means row *n* re-binds *n* elements. Hoist these out of the
loop when reimplementing; behaviour is unchanged, cost drops from O(n²) to O(n).

**G-17 — `setUpCondensedOutputOptionsControls` can orphan a flatpickr instance.**
`refreshCurrentPage` destroys the `#current-local-time` flatpickr only when
`callClearOutputContainer === true` (`ophis_view.js:189`). But `setUpCondensedOutputOptionsControls`
runs on *every* Z-Dates refresh (`ophis_view.js:231`) and blanks `screenSpecificArea.innerHTML`
(output.js:85) regardless. On a `RIGHT_PANEL_ONLY` refresh the old input is removed from the DOM with
its flatpickr calendar still attached — a leak plus a possible detached-calendar popup.

**G-18 — `.replace()` is used where `.replaceAll()` is meant.** Every X1/X2 substitution
(output.js:426, 442-443, 577, 589-590, 874-875), the `"Y"` substitution (output.js:431, 582), and
`replaceOperationConstants` (`ophis_view__strings.js:51-53`) replace only the **first** occurrence.
Any future equation grammar with two constants of the same name, or two `Y` terms, will render wrong.
Note the contrast with `normalizeOperationEquationString`, which correctly uses `replaceAll`.

**G-19 — Tooltip HTML is injected into single-quoted attributes with no escaping.** The pill `title`
attributes (output.js:488, 517, 617) are built as `title='<HTML>'` where the HTML contains escaped
double quotes but nothing escapes a single quote. `generateTableToolTip` values include
operation equations. An equation or event name containing `'` breaks the attribute. The Iso-Event
name path deliberately avoids this by assigning `.value`/`.title` as properties
(rebuild.js:278-280, 371-372) — apply that discipline everywhere.

**G-20 — `operationPillsPerRow` can transiently go negative.** Under `HH_MM` with a header narrower
than 100 px, `Math.floor(w/100)` is `0`, the decrement makes it `-1`, and the `== 0` guard at
output.js:340 misses it. The final `> 0 ? … : 1` clamp at output.js:346 catches it, so the guard on
line 340 is redundant. Keep the clamp; the guard can go.

**G-21 — Dead reads and unused locals to not carry forward.**
`ophis_view__rebuild.js`: `bottomRowTable` (:163), `maxHeightForMessageOrInnerContainer` (:109),
`bottomOfOutputPanelActual`/`bottomOfOutputPanelMax`/`bottomOfOutputPanel`/`bottomRowTopOffset`
(:178-182), `notesButtonElem` and the whole notes feature (:304, 308, 318, 380-382, 396-398, 510-513,
574-582, 596-614), `eventTypeDropdown` (`typeSelectHtml` is hardcoded `""` at :274 so the branch never
fires), `effectiveLengthForCheckedOrNotLogic` is used but only in the swap-target path (:652-658).
`ophis_view__output.js`: `errors` (:74), `someOtherHtmlThatCouldBeUsedForSomethingEventually` (:72),
`titleForHidingCol = "TODO"` (:254, never inserted), `readableType`/`msrfClassName` declared twice
(:453-455 vs :594-596), `isThereATimeOffset`'s commented-out DOM comparison (:22-30).

**G-22 — `newRowHtml` leaks a global in `rebuildXDateTableRowsInternal`.** rebuild.js:768 assigns
`newRowHtml = "";` with no `var`. In non-strict mode this creates `window.newRowHtml`. It happens to
work because `rebuildIsoEventTableRows` declares its own `var newRowHtml` (rebuild.js:281). Under
`"use strict"` this throws. Add the `var`.

**G-23 — `headerRow` survives only because of `var` hoisting.** output.js:307 declares
`var headerRow` inside an `if` block that normally does not execute (feature flag off), yet
output.js:323 assigns `headerRow = addOutputRow();` unqualified. Function-scoped `var` hoisting makes
this legal. A `let`/`const` port must move the declaration out.

**G-24 — `xDateInputHeader.title` is reassigned after tipsy has already bound.**
rebuild.js:966-971 writes `.title` on a header cell that other code has bound with tipsy. tipsy moves
`title` into `original-title` at bind time, so a later `.title =` may not change the displayed
tooltip until the element is re-bound. I did not observe the binding site for this specific element,
so treat this as a caution, not a confirmed defect — but verify it in any port.

**G-25 — `toggleIsoEventLocationEnabled` always zeroes lat/long.** rebuild.js:226-232, with an
explicit comment: *"Always reset lat/long, regardless of whether we're enabling or disabling here."*
Switching an event's scope away from HH:MM and back therefore **loses the coordinates**
(rebuild.js:461-465 calls it on every scope change). Intentional, surprising, and easy to
"helpfully fix" into a regression.

**G-26 — The X-Date panel is deliberately sized for exactly two rows.** rebuild.js:48-52 uses
`clientHeight * 2` for any count > 1. Not a bug; a fixed design constraint that the whole layout math
downstream depends on.

**G-27 — Live `HTMLCollection` used as a snapshot source.**
`inputDateContainer.getElementsByClassName(rowClassName)` (rebuild.js:682) is live. The code calls
`clearRowsFromTableExceptTopRow` at :687 *before* copying it into an array at :691-693 — which is
correct only because the clear empties the collection and the copy loop then finds nothing. Reorder
those statements and the pruning loop at :938 will operate on detached nodes.

**G-28 — `getStartingX` returning `null` silently means "X2".** In every call site the result is
tested with `if (startingX == STARTING_X1) … else …`. A malformed equation that starts with neither
`X1+` nor `X2+` is therefore rendered as if it were X2-based rather than flagged.

**G-29 — Vortex beats Important beats Normal, and the check order is load-bearing.**
`getMsrfMatch` (`ophis_utils.js:180-186`) tests the vortex list **first** with a ±0.1 tolerance, and
returns immediately on a hit. Only afterwards does it do exact-equality checks. The source comment at
`ophis_model__params.js:15-16` records that filter numbers 21 and 76 were once removed because rounded
vortex numbers collided with them, then re-added once the tolerance match was introduced. Preserve
both the order and the tolerance.
