# Ophis v12 / PSYFR — Subsystem Spec: `view-chart` (Timeline Chart)

**Assignment files (read in full, 100% coverage):**

| File | Lines | Role |
|---|---|---|
| `src/ophis_view__chart.js` | 876 | Chart lifecycle, Chart.js config object, hit-testing, zoom/pan persistence, error/status states |
| `src/ophis_view__chart_config.js` | 176 | Sizes, colours, z-orders, moon-phase dict, eclipse dict, image preloading |
| `src/ophis_view__chart_datasets.js` | 1598 | Curve dataset generation, collision spreading, fan-out, astro event computation, all custom canvas drawing, eclipse data normalisation |

Citations below are `path:line`. Short forms used in prose:
`CH` = `src/ophis_view__chart.js`, `CC` = `src/ophis_view__chart_config.js`, `CD` = `src/ophis_view__chart_datasets.js`.

---

## 0. Executive summary

The chart is **not** a conventional Chart.js plot. Chart.js v4.4.1 is used almost exclusively as:

1. a **time-axis + linear-axis pixel/value transform engine** (`chart.scales.x.getPixelForValue` / `getValueForPixel`, and the same on `y`),
2. a **line renderer for one geometric primitive only** — a half-ellipse "rainbow arc" per operation result,
3. a **zoom/pan gesture host** (chartjs-plugin-zoom v2.0.1).

Everything else on the canvas — the X axis line, the white page fill, the boxed `X₁`/`Z₇` date labels, the leader lines, the hit-count symbols, the "ruler" measurement callouts, the moon-phase icons and the eclipse icons — is **hand-drawn with raw Canvas 2D calls** from a custom Chart.js plugin's `beforeDraw`/`afterDraw` hooks (`CH:484-500`).

Chart.js's own tooltip is **disabled** (`CH:568-570`), its legend is **disabled** (`CH:598-600`), and there are **no Chart.js annotations plugin** and **no Chart.js tooltip callbacks at all**. All hit testing is bespoke (`CH:245-433`).

---

## 1. What the chart shows

### 1.1 Axes

| Axis | Meaning | Units | Chart.js scale type | Visible? |
|---|---|---|---|---|
| **x** | Absolute calendar time | milliseconds since Unix epoch (UTC), rendered as dates | `'time'` (`CH:662`) with Luxon adapter | Yes — tick labels only, rotated 45° (`CH:631-681`); toggled by `SERIALIZED_FIELD__CHART_OPTION__SHOW_DATES` and by global option `hide_date_col` (`CH:632-643`) |
| **y** | **Arc height only — it is a *derived* quantity, not a measured one.** `y` is in the *same millisecond units as x*: the apex of an arc sits at `y = curve_y_radius`, where `curve_y_radius` starts life as `(zDate − xDate)/2` in milliseconds (`CD:945-946`). | milliseconds (semantically "half the X→Z span") | default `'linear'` (`CH:682-705`) | **No.** `ticks.display: false` (`CH:692`), `grid.display: false` (`CH:700`) |

**`y = 0` is the X axis**, and it is drawn by hand as a solid 2-px black line spanning the *entire canvas width* at `chart.scales.y.getPixelForValue(0)` (`CH:454-469`). Everything below `y = 0` (positive pixel direction) is the "furniture band": date labels, hit-count symbols, moons, eclipses. Everything above `y = 0` is arcs.

There are **no y tick labels ever**, so the reader never sees the millisecond magnitude — `y` is purely a visual encoding of "how far in time this projection reached".

### 1.2 Visual grammar

* One **half-ellipse arc** per *operation result* (one equation applied to one X-date pair producing one Z-date). Its left foot is on the X-Date, its right foot is on the Z-Date, its apex height encodes the span.
* Arcs **fade in** from the X-Date foot (alpha ≈ 0.10) to full opacity at the Z-Date foot (`CD:917-936`) — the visual reads as "flowing toward the prediction".
* Arc **colour encodes the hit count of the Z-Date it lands on** (1–2 hits black, 3 hits cadmium yellow, 4 hits bright blue, 5+ hits cadmium red) — `CD:848-863`.
* Overlapping arcs are **fanned apart vertically** so co-terminal arcs don't superimpose (`CD:1242-1346`).
* Below the axis, each X-Date and Z-Date gets a **boxed ordinal label** (`X₁`, `X₂`, … white box/black text; `Z₁`, `Z₂`, … grey box/white text) connected to its exact axis position by a dotted leader line. Labels that collide are spread horizontally like balloons (`CD:341-448`, `CD:450-502`).
* **Above** the axis, near the top of the canvas, Z-Dates with `hit_count > 1` get a **hit-count symbol** (gemini / triangle / diamond / circle PNG) on a dashed drop-line to the axis (`CD:530-620`).
* **Below** the labels sit two optional icon rows: moon phases at +70 px, eclipses at +100 px from the axis, each with dashed connector lines up to the date labels they matched (`CD:738-797`).
* Clicking a curve or a Z-symbol/label draws two dashed **"rulers"** (measuring-tape callouts) — the upper one measures the X→Z span in days, the lower one measures the X₁→X₂ (Y) span in days (`CD:622-716`).

### 1.3 ASCII sketch

```
 ┌───────────────────────────────────── canvas (white, painted by beforeDraw) ──────────────┐
 │                                                                                          │
 │   ◇  △                    ○                          y = 62.5px   ← hit-count symbols    │
 │   ┊  ┊                    ┊                          (Z_DATE_SYMBOL_SIZE * 2.5)          │
 │   ┊  ┊             .-''''''-.                        dashed drop-lines to axis           │
 │   ┊  ┊          .-'    ▲     '-.        ← arc apex = curve_y_radius (data units = ms)     │
 │   ┊  ┊        .'   [ 512 days ]  '.     ← "Z ruler" label box (only when highlighted)     │
 │   ┊  ┊      ,'  - - - - - - - - -  `.   ← dashed ruler line, 5-5 dash                     │
 │   ┊  ┊     /                        \                                                    │
 │   ┊  ┊    /       .-'''''-.          \        ← a second, shorter arc (fanned)            │
 │   ┊  ┊   /      ,'         `.         \                                                  │
 │   ┊ ╷┊  /   [ 91 days ] ← "Y ruler" at midpoint height                                    │
 │   ┊ │┊ /  - - - - - - -    `.          \                                                  │
 │ ──┴─┴┴┴────────────────────────────────────────────────────────────────────────  y = 0   │
 │      │ │                    │              │                    (2px solid black,        │
 │      ┊ ┊                    ┊              ┊                     full canvas width)      │
 │    ┌───┐ ┌───┐            ┌───┐          ┌───┐          ← +35px (or +52.5px if no astro) │
 │    │X₁ │ │X₂ │            │Z₁ │          │Z₂ │            boxed ordinal labels           │
 │    └───┘ └───┘            └───┘          └───┘            X = white/black, Z = grey/white│
 │      ┊                      ┊                                                            │
 │      ●        ◐             ●                            ← +70px  moon-phase icons (30px)│
 │                             ┊                                                            │
 │                             ☀                            ← +100px eclipse icons (30px)   │
 │                                                                                          │
 │   05-04-26   06-13-26   07-22-26   08-30-26              ← x tick labels, 45° rotation,  │
 │      ╱          ╱          ╱          ╱                     18px font                     │
 └──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Runtime dependencies

### 2.1 Third-party (`lib/`)

| Library | Version | Registration | Used for |
|---|---|---|---|
| **Chart.js** | **4.4.1** — UMD build `lib/chart.min.js` (see note) | global `Chart` | line chart, `'time'` scale, scales pixel/value transforms, `Chart.helpers.getRelativePosition` (`CH:247`) |
| **chartjs-plugin-zoom** | **2.0.1** (`lib/chartjs-plugin-zoom.js:2`) | **self-registers** — the UMD factory calls `chart_js.Chart.register(Zoom)` at its tail | `chart.resetZoom()`, `chart.isZoomedOrPanned()`, `chart.zoomScale()`, wheel/pinch zoom, drag pan |
| **chartjs-plugin-datalabels** | **2.2.0** (`lib/chartjs-plugin-datalabels.js:2`) | `Chart.register(ChartDataLabels)` at `src/ophis_main.js:254` | **effectively dead** — see GOTCHA G-3 |
| **chartjs-adapter-luxon** | **1.3.1** (`lib/chartjs-adapter-luxon.js:2`) | auto-overrides `Chart._adapters._date` | timezone-aware `'time'` scale; hence `displayFormats.day` uses **Luxon** tokens (`"MM-dd-yy"`), not Moment tokens |
| **luxon** | `lib/luxon.min.js` | — | date formatting behind the adapter |
| **hammer.js** | `lib/hammer.js` | — | pinch/pan gestures for the zoom plugin |
| **lunarphase-js** | `lib/lunarphase-js.js` (global `lunarphase`) | — | `lunarphase.Moon.lunarAgePercent(Date)`, `lunarphase.LunarPhase.*` |
| **moment / moment-timezone** | `lib/moment-*.js` | — | only inside `optimizeEclipseData()` (`CD:1586`) |
| **GeoPoint** | `lib/geo-point.js` | global `GeoPoint` | point rotation and ellipse hit tests (see §2.3) |
| Eclipse tables | `lib/solar_eclipses_processed.js`, `lib/lunar_eclipses_processed.js` | globals `SOLAR_ECLIPSES_PROCESSED`, `LUNAR_ECLIPSES_PROCESSED` | `[{date_millis:number, eclipse_type:string}, …]`, **ascending by `date_millis`** |
| Raw eclipse tables | `lib/solar_eclipses_orig.js`, `lib/lunar_eclipses_orig.js` | globals `SOLAR_ECLIPSES_ORIG`, `LUNAR_ECLIPSES_ORIG` | input to `optimizeEclipseData()` — **currently never called at runtime** (`src/ophis_main.js:213-214` are commented out) |

> **Which Chart.js file actually loads:** `lib/chart.js` is the **ESM** build — its first statement is
> `import { … } from './chunks/helpers.segment.js'` plus `import '@kurkle/color'`, and **`lib/chunks/` does not exist**
> in this tree. It is unloadable in a browser and is present for source reading only. The runtime therefore uses
> **`lib/chart.min.js`** (UMD, same `Chart.js v4.4.1` banner, self-assigns `globalThis.Chart`). Line citations into
> `lib/chart.js` below are for *reading* the algorithm; the shipped behaviour is the minified twin.
>
> Chart.js global defaults that matter here (both are the literal `rgba(0,0,0,0.1)`, confirmed present twice in
> `lib/chart.min.js`): `defaults.backgroundColor` and `defaults.borderColor`. Point element defaults
> (`lib/chart.js:7028-7035`): `borderWidth:1, hitRadius:1, hoverBorderWidth:1, hoverRadius:4, pointStyle:'circle',
> radius:3, rotation:0`. Line element default `tension: 0`.

### 2.2 First-party symbols consumed from *outside* the three assigned files

Declared as dependencies, not re-specified here:

`appState` (globals `.chart`, `.latestResults`, `.globalOptions`, `.justFixedErrors`, `.blockChartFlushToDisk`, `.justChangedField`) ·
`getCurrentIsoEvent()` · `getCurrentScreen()` · `refreshCurrentPage()` · `flushChangesToDisk()` ·
`getIsoEventField(varName)` → field descriptor (`src/ophis_utils.js:47`) · `isIsoEventFieldEnabled(isoEvent, varName)` (`src/ophis_utils.js:81`) ·
`handleJustChangedFields(isoEvent, indicatorsThatOverlappedDates)` (`src/ophis_view__utils.js:880`) ·
`getHitCountSymbolImage(hitCount, srcOnly)` (`src/ophis_view__utils.js:238`) ·
`isAlphaOperation(operation)` (`src/ophis_model__params.js:48` — `operation.weight >= POINTS__ALPHA_OPERATION_MATCH`) ·
`convertIntToSubscriptUnicode(n)` (`src/ophis_view__utils.js:255`) · `getDayString(n)` (`src/ophis_config.js:176` — `n==1 ? "1 day" : n+" days"`) ·
`debounce(cb, delay=100)` (`src/ophis_utils.js:804`) · `deepClone(o)` = JSON round-trip (`src/ophis_utils.js:816`) ·
`getDictionarySize(dict)` (`src/ophis_utils.js:35`) · `parseIntElseNeg1(n)` (`src/ophis_utils.js:232`) ·
`getTimezone(lat,long)` · `roundMillisToNearestMidnightInTimeZone(millis, tz)` · `xDateToNativeDate(scope, xDate, lat, long)` ·
`nativeDateToXDate()` · `xDateToNativeDateForController()` · `isFlagEnabled(flag)` · `distanceBetweenXDateAndZDate()` is local (`CH:712`).

**External constant values** (verified, cite where they live):

```
MILLIS_PER_DAY                     = 86_400_000              src/ophis_config.js:100
SYNODIC_MONTH                      = 29.53058770576          src/ophis_config.js:102
INTRA_MOON_PHASE_DELTA             = 1/8 = 0.125             src/ophis_config.js:111
LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS = 1                       src/ophis_config.js:112
ECLIPSE_DATE_MATCH_TOLERANCE_IN_DAYS = 1.25                  src/ophis_config.js:113
LUNAR_DATE_MATCH_TOLERANCE         = 86_400_000              src/ophis_config.js:114
ECLLIPSE_DATE_MATCH_TOLERANCE      = 108_000_000  (sic: 3 L's) src/ophis_config.js:115
X_DATE_SHORTHAND = "X" ; Z_DATE_SHORTHAND = "Z"              src/ophis_config.js:464-465
EVENT_SCOPE__HH_MM = "EVENT_SCOPE__HH_MM"                    src/ophis_config.js:321
EVENT_SCOPE__DAYS  = "EVENT_SCOPE__DAYS"                     src/ophis_config.js:322
FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT = true                   src/ophis_config.js:297
GLOBAL_OPTION__HIDE_COL__DATES = "hide_date_col"             src/ophis_config.js:36
COLOR__TRANSPARENT   = "rgba(0,0,0,0)"                       src/ophis_view__config.js:23
COLOR__MSRF_NORMAL   = "#2ede69"                             src/ophis_view__config.js:27
COLOR__MSRF_IMPORTANT= "#b80b0b"                             src/ophis_view__config.js:28
COLOR__MSRF_VORTEX   = "purple"                              src/ophis_view__config.js:29
OPACITY__DISABLED    = 0.5                                   src/ophis_view__config.js:117
NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT = "No results. You probably have to loosen up a filter."
                                                             src/ophis_view__config.js:12
OPHIS_SCREEN__Z_DATES        = "OPHIS_SCREEN__Z_DATES"       src/ophis_view__config.js:121
OPHIS_SCREEN__EXPORT_X_DATES = "OPHIS_SCREEN__EXPORT_X_DATES" src/ophis_view__config.js:124
REFRESH_TYPE__SOFT           = "REFRESH_TYPE__SOFT"          src/ophis_config.js:434
COLOR__OPERATION_ALPHA = "rgba(184, 134, 11, 1.0)"           src/ophis_view__config.js:21  (unused by chart)
COLOR__OPERATION_BETA  = "rgba(0, 192, 255, 1.0)"            src/ophis_view__config.js:22  (unused by chart)
```

### 2.3 `GeoPoint` API surface actually used

```js
new GeoPoint(x, y, z=0)                       // lib/geo-point.js:9
p.set(x, y, z?)                               // :123
p.getX() / p.getY()                           // :17 / :55
p.calcDistanceTo(other)  -> number            // :90  (3-D euclidean)
p.rotateBy(radians, originPointOrNull)        // :231 standard 2-D rotation about origin
p.hitTestEclipse(cx, cy, halfWidth, halfHeight) -> number  // :213
   //  returns ((x-cx)^2)/(hw^2) + ((y-cy)^2)/(hh^2)
   //  <= 1  ==>  inside the ellipse.   NOTE the misspelling "Eclipse" for "Ellipse".
```

---

## 3. DOM contract (string literals crossing module boundaries)

The packaged `index.html` is not present in this repo checkout (only the `.exe`), so these ids/classes are the authoritative contract:

| Literal | Kind | Where read | Meaning |
|---|---|---|---|
| `"timeline-chart"` | element id | `CH:196` (`getChartElem`), `CD:1266` (direct `getElementById` for `clientWidth`) | the `<canvas>` Chart.js binds to |
| `"chart-error-message"` | element id | `CH:200` | inner element receiving `innerHTML` of the error/status text |
| `"chart-error-message-wrapper"` | element id | `CH:204` | overlay wrapper; `display` toggled between `"table"` and `"none"` |
| `"recenter-chart-button"` | element id | `CH:4` | button; `disabled` toggled by `refreshZoomRelatedUi` |
| `"error_color"` | CSS class | `CH:29,32` | added for real errors, removed for status-only messages |
| `"z_date_output_row"` | CSS class | `CH:217`, `CH:437` | results-table `<tr>`s the chart cross-highlights |
| `"z_match_with_tool_tip"` | CSS class | `CH:225`, `CH:407` | per-operation "pill" elements inside a results row |
| `"chart_hover"` | HTML attribute | `CH:222,230,413,444` | set to `"true"`/`"false"`; CSS in `src/ophis.css:140` and `:435` turns the row green / the pill red-outlined |
| `"z_date_key"` | HTML attribute | `CH:442` | on a results row; value is the Z-date dict key (epoch-ms **string**) |
| `"operation_result_hash"` | HTML attribute | `CH:412` | on a pill; matched against `operationResult.hash` |

Image asset paths (all preloaded at boot, `CC:137-176`):

```
img/astro_indicators/new_moon.png              img/astro_indicators/waxing_crescent_moon.png
img/astro_indicators/first_quarter_moon.png    img/astro_indicators/waxing_gibbous_moon.png
img/astro_indicators/full_moon.png             img/astro_indicators/waning_gibbous_moon.png
img/astro_indicators/third_quarter_moon.png    img/astro_indicators/waning_crescent_moon.png
img/astro_indicators/solar_eclipse_full.png    img/astro_indicators/solar_eclipse_partial.png
img/astro_indicators/lunar_eclipse_full.png    img/astro_indicators/lunar_eclipse_partial.png
img/hit_symbols/gemini.png   img/hit_symbols/triangle.png
img/hit_symbols/diamond.png  img/hit_symbols/circle.png
```

---

## 4. `ophis_view__chart_config.js` — every constant, exact value

### 4.1 Sizes and radii

```js
CHART_MOON_SIZE                 = 30      // px, drawn width & height of a moon PNG      CC:3
CHART_ECLIPSE_SIZE              = 30      // px, drawn width & height of an eclipse PNG  CC:4
Z_DATE_SYMBOL_SIZE              = 25      // px, hit-count symbol PNG                    CC:5
Z_DATE_SYMBOL_PADDING           = 0       // DEAD — never referenced anywhere            CC:6
Z_DATE_SYMBOL_SIZE_DIV_2        = 12.5                                                   CC:7
CHART_SPLINE_TENSION            = 0.333   // INERT under Chart.js v4 — see GOTCHA G-1    CC:39
CHART_CURVE_COMPLEXITY          = 12      // must be even; # of arc segments             CC:40
CHART_POINT_RADIUS__X_DATE      = 5                                                      CC:41
CHART_POINT_RADIUS__Z_DATE      = 7                                                      CC:42
CHART_POINT_RADIUS_HOVER        = 10                                                     CC:43
CHART_NEG_Y_AXIS_PERCENTAGE     = 0.4                                                    CC:44
CHART_POS_Y_AXIS_PERCENTAGE     = 0.05                                                   CC:45
CHART_FAN_OUT_HIT_RADIUS        = 8       // = CHART_POINT_RADIUS__Z_DATE + 1            CC:46
CHART_PIXEL_OFFSET__Z_DELTA_RULER_MIN_Y = 60                                             CC:48
CHART_PIXEL_OFFSET__MOONS       = 70      // px below the X axis                         CC:49
CHART_PIXEL_OFFSET__ECLIPSES    = 100     // = MOONS + CHART_MOON_SIZE                   CC:50
CHART_RULER_LABEL_FONT_SIZE     = 22                                                     CC:52
CHART_DATE_LABEL_FONT_SIZE      = 22                                                     CC:53
CHART_TIMESTAMP_FONT_SIZE       = 18                                                     CC:54
CHART_DATE_LABEL_SUBSCRIPT_FONT_SIZE = 15 // DEAD — never referenced                     CC:55
CHART_DATE_LABEL_PADDING        = 1                                                      CC:56
CHART_DATE_LABEL_SPACING        = 2                                                      CC:57
CHART_DATE_LABEL_PIXEL_OFFSET_FROM_X_AXIS = 35                                           CC:58
CHART_SYMBOL_HIGHLIGHTING_MAGNIFICATION   = 1.5  // DEAD — 1.5 is hard-coded at CD:611   CC:60
CHART_LABEL_HIGHLIGHTING_MAGNIFICATION    = 1.0  // "eh disable for now" (author comment) CC:61
```

### 4.2 Line widths and grid

```js
CHART_COLOR__GRID_LINE  = "#00000000"   // DEAD — never referenced. (Commented-out
                                        //  alternative "#E5E5E5" at CC:10)              CC:11
CHART_COLOR__AXIS_LINE  = "black"       // DEAD — drawXAxis hard-codes "black"           CC:12
CHART_GRID_LINE_WIDTH   = 2             // used at CH:660                                CC:13

CHART_CURVE_WIDTH__ONE_HIT   = 1                                                         CC:15
CHART_CURVE_WIDTH__TWO_HITS  = 1                                                         CC:16
CHART_CURVE_WIDTH__THREE_HITS= 2                                                         CC:17
CHART_CURVE_WIDTH__FOUR_HITS = 2                                                         CC:18
CHART_CURVE_WIDTH__FIVE_HITS = 2                                                         CC:19
CHART_CURVE_WIDTH__GROUP_HIGHLIGHTING      = 4                                           CC:22
CHART_CURVE_WIDTH__INDIVIDUAL_HIGHLIGHTING = 5                                           CC:23
CHART_CURVE_WIDTH__HIT_TESTING             = 7                                           CC:24
```

### 4.3 Curve colours — **exact strings matter**

```js
CHART_CURVE_COLOR__ONE_HIT    = "rgba(0,0,0,1.0)"                                        CC:27
CHART_CURVE_COLOR__TWO_HITS   = CHART_CURVE_COLOR__ONE_HIT   // same object              CC:28
CHART_CURVE_COLOR__THREE_HITS = "rgb(253, 218, 13,1.0)"   // cadmium yellow  (sic: rgb+alpha) CC:29
CHART_CURVE_COLOR__FOUR_HITS  = "rgb(0, 150, 255, 1.0)"   // bright blue     (sic)       CC:30
CHART_CURVE_COLOR__FIVE_HITS  = "rgb(210, 43, 43, 1.0)"   // cadmium red     (sic)       CC:31
CHART_CURVE_COLOR__GROUP_HIGHLIGHTING      = "rgb(91, 202, 102)"  // green               CC:35
CHART_CURVE_COLOR__INDIVIDUAL_HIGHLIGHTING = "red"                                       CC:36
```

Three of these use the `rgb()` function with a **fourth alpha argument**, which is legal only under CSS Color Level 4. They are parsed by `@kurkle/color` bundled with Chart.js. **The trailing `"1.0"` substring is load-bearing** — the per-segment alpha ramp is implemented as a naive `String.replace("1.0", alpha)` (`CD:929`). Verified: none of the three contains an earlier `"1.0"` substring (`"150"`, `"210"`, `"218"` do not match `1` `.` `0`), so the replace always targets the alpha slot.

### 4.4 Dataset draw order (z-order)

```js
// Comment in source: "Highest order is drawn first, i.e. lower z-index."   CC:64
CHART_DATASET_ORDER__Z_DELTA_RULER       = 1   // DEAD — never used         CC:65
CHART_DATASET_ORDER__ASTRO_EVENTS        = 2   // DEAD — never used         CC:66
CHART_DATASET_ORDER__Z_DATE_POINT        = 3   // set on objects that never
CHART_DATASET_ORDER__X_DATE_POINT        = 4   //   reach chart.data.datasets (G-2)
CHART_DATASET_ORDER__HIGHLIGHTED_PILL         = 5                           CC:69
CHART_DATASET_ORDER__HIGHLIGHTED_Z_DATE_ROW   = 6                           CC:70
CHART_DATASET_ORDER__ALPHA_OPERATION          = 7                           CC:71
CHART_DATASET_ORDER__DEFAULT                  = 8                           CC:72
```

The comment is **correct for Chart.js v4**: `_sortedMetasets` sorts ascending by `(order, index)` (`lib/chart.js:5816`), and `_drawDatasets()` iterates that array **backwards** (`lib/chart.js:6084-6087`). So a *larger* `order` is painted *earlier* → further back. Lowest `order` wins the top of the stack. The `paddingDataSet` has **no `order`** → `dataset.order || 0` = **0** (`lib/chart.js:5844`) → painted last, i.e. on top of every arc.

### 4.5 `MOON_PHASE_DICT` — full table

Constructed by `newMoonPhaseDictEntry(serializedField, moonPhasePercentage, imagePath)` (`CC:78-84`).
**Keys are the human-readable `lunarphase.LunarPhase` string values**, not enum symbols (verified in `lib/lunarphase-js.js`: `NEW="New"`, `WAXING_CRESCENT="Waxing Crescent"`, `FIRST_QUARTER="First Quarter"`, `WAXING_GIBBOUS="Waxing Gibbous"`, `FULL="Full"`, `WANING_GIBBOUS="Waning Gibbous"`, `LAST_QUARTER="Last Quarter"`, `WANING_CRESCENT="Waning Crescent"`).

| Dict key (string) | `serialized_field` (varName) | serialization key on the isoEvent | `moon_phase_percentage` | `imagePath` | src |
|---|---|---|---|---|---|
| `"New"` | `SERIALIZED_FIELD__CHART_OPTION__SHOW_NEW_MOONS` | `chart_option__show_new_moons` | **0.0** | `new_moon.png` | CC:86 |
| `"Waxing Crescent"` | `…SHOW_WAXING_CRESCENT_MOONS` | `chart_option__show_waxing_crescent_moons` | **0.125** | `waxing_crescent_moon.png` | CC:87 |
| `"First Quarter"` | `…SHOW_FIRST_QUARTER_MOONS` | `chart_option__show_first_quarter_moons` | **0.25** | `first_quarter_moon.png` | CC:88 |
| `"Waxing Gibbous"` | `…SHOW_WAXING_GIBBOUS_MOONS` | `chart_option__show_waxing_gibbous_moons` | **0.375** | `waxing_gibbous_moon.png` | CC:89 |
| `"Full"` | `…SHOW_FULL_MOONS` | `chart_option__show_full_moons` | **0.5** | `full_moon.png` | CC:90 |
| `"Waning Gibbous"` | `…SHOW_WANING_GIBBOUS_MOONS` | `chart_option__show_waning_gibbous_moons` | **0.625** | `waning_gibbous_moon.png` | CC:91 |
| `"Last Quarter"` | `…SHOW_THIRD_QUARTER_MOONS` | `chart_option__show_third_quarter_moons` | **0.75** | `third_quarter_moon.png` | CC:92 |
| `"Waning Crescent"` | `…SHOW_WANING_CRESCENT_MOONS` | `chart_option__show_waning_crescent_moons` | **0.875** | `waning_crescent_moon.png` | CC:93 |

Note the naming skew: the phase enum says **`LAST_QUARTER`**, the serialized field says **`THIRD_QUARTER`**, and the PNG is **`third_quarter_moon.png`**. All three refer to the same thing.

### 4.6 Eclipse enums and `ECLIPSE_DICT`

```js
ECLIPSE_TYPE__LUNAR        = "ECLIPSE_TYPE__LUNAR"         CC:96
ECLIPSE_TYPE__SOLAR        = "ECLIPSE_TYPE__SOLAR"         CC:97
SOLAR_ECLIPSE_TYPE__FULL   = "SOLAR_ECLIPSE_TYPE__FULL"    CC:99
SOLAR_ECLIPSE_TYPE__PARTIAL= "SOLAR_ECLIPSE_TYPE__PARTIAL" CC:100
LUNAR_ECLIPSE_TYPE__FULL   = "LUNAR_ECLIPSE_TYPE__FULL"    CC:102
LUNAR_ECLIPSE_TYPE__PARTIAL= "LUNAR_ECLIPSE_TYPE__PARTIAL" CC:103
ASTRO_INDICATOR_TYPE__LUNAR_PHASE = "ASTRO_INDICATOR_TYPE__LUNAR_PHASE"  CC:105
ASTRO_INDICATOR_TYPE__ECLIPSE     = "ASTRO_INDICATOR_TYPE__ECLIPSE"      CC:106
```

| `ECLIPSE_DICT` key | `serialized_field` | serialization key | `imagePath` | src |
|---|---|---|---|---|
| `SOLAR_ECLIPSE_TYPE__FULL` | `SERIALIZED_FIELD__CHART_OPTION__FULL_SOLAR_ECLIPSES` | `chart_option__full_solar_eclipses` | `"\u{1F506}"` (🔆) | CC:131 |
| `SOLAR_ECLIPSE_TYPE__PARTIAL` | `…PARTIAL_SOLAR_ECLIPSES` | `chart_option__partial_solar_eclipses` | `"\u{1F506}"` | CC:132 |
| `LUNAR_ECLIPSE_TYPE__FULL` | `…FULL_LUNAR_ECLIPSES` | `chart_option__full_lunar_eclipses` | `"\u{1F506}"` | CC:133 |
| `LUNAR_ECLIPSE_TYPE__PARTIAL` | `…PARTIAL_LUNAR_ECLIPSES` | `chart_option__partial_lunar_eclipses` | `"\u{1F506}"` | CC:134 |

**`ECLIPSE_DICT[*].imagePath` is dead** — the emoji is never rendered. `loadAstroIndicators()` hard-codes the four eclipse PNG paths (`CC:167-170`) and drawing always uses `CHART_IMAGES[key]`.

### 4.7 Hit-count symbol enums

```js
CHART_SYMBOL_IMAGE__GEMINI   = "CHART_SYMBOL_IMAGE__GEMINI"     CC:109
CHART_SYMBOL_IMAGE__TRIANGLE = "CHART_SYMBOL_IMAGE__TRIANGLE"   CC:110
CHART_SYMBOL_IMAGE__DIAMOND  = "CHART_SYMBOL_IMAGE__DIAMOND"    CC:111
CHART_SYMBOL_IMAGE__CIRCLE   = "CHART_SYMBOL_IMAGE__CIRCLE"     CC:112
CHART_SYMBOL_IMAGE_SRC__GEMINI   = "img/hit_symbols/gemini.png"   CC:114
CHART_SYMBOL_IMAGE_SRC__TRIANGLE = "img/hit_symbols/triangle.png" CC:115
CHART_SYMBOL_IMAGE_SRC__DIAMOND  = "img/hit_symbols/diamond.png"  CC:116
CHART_SYMBOL_IMAGE_SRC__CIRCLE   = "img/hit_symbols/circle.png"   CC:117
CHART_IMAGE_COUNT = getDictionarySize(MOON_PHASE_DICT) + 4 + 4 = 8 + 4 + 4 = 16   CC:119
```

Mapping (from `src/ophis_view__utils.js:238-253`):

| `hit_count` | symbol enum | PNG |
|---|---|---|
| `< 2` | `null` (no symbol drawn — `generateZDateSymbolDatasets` filters `hit_count > 1`) | — |
| `2` | `CHART_SYMBOL_IMAGE__GEMINI` | `gemini.png` |
| `3` | `CHART_SYMBOL_IMAGE__TRIANGLE` | `triangle.png` |
| `4` | `CHART_SYMBOL_IMAGE__DIAMOND` | `diamond.png` |
| `>= 5` | `CHART_SYMBOL_IMAGE__CIRCLE` | `circle.png` |

### 4.8 `loadAstroIndicators(onAllImagesLoaded)` — `CC:137-176`

```
loadAstroIndicators(cb: () => void): void            // side effect: fills global CHART_IMAGES
```

1. For each own key `ithPhase` of `MOON_PHASE_DICT`, create an `Image`, stamp `img.astro_indicator = ithPhase`, set `onload = onImageLoaded`, set `src = "img/astro_indicators/" + entry.imagePath`.
2. Then four eclipse `Image`s keyed by `SOLAR_ECLIPSE_TYPE__FULL`, `SOLAR_ECLIPSE_TYPE__PARTIAL`, `LUNAR_ECLIPSE_TYPE__FULL`, `LUNAR_ECLIPSE_TYPE__PARTIAL`.
3. Then four hit-symbol `Image`s keyed by the four `CHART_SYMBOL_IMAGE__*` constants.
4. `onImageLoaded` stores `CHART_IMAGES[img.astro_indicator] = img` and, when `getDictionarySize(CHART_IMAGES) === CHART_IMAGE_COUNT` (16), invokes `cb()`.

**Error path: there is none.** No `onerror` handler. A single missing/failed PNG means the size never reaches 16 and the boot callback (`src/ophis_main.js:216`) **never fires** — the app hangs on the loading screen. Skipped entirely in headless mode (`src/ophis_main.js:202-205`).

---

## 5. The Chart.js configuration object (`newChart()`, `CH:479-710`)

Reproduced with every value the source specifies. Chart.js defaults fill the rest.

```js
new Chart(document.getElementById('timeline-chart'), {

  // ── inline plugins (array form: instance-scoped, not registered globally) ──
  plugins: [
    { id: 'customDrawing',
      beforeDraw: (chart) => { if (doBeforeOrAfterDraw()) drawXAxis(chart); },
      afterDraw:  (chart) => { if (doBeforeOrAfterDraw()) {
                                  drawZDateSymbols(chart);     // CD:530
                                  drawRulers(chart);           // CD:622
                                  drawDateLabels(chart);       // CD:341
                                  drawAstroIndicators(chart);  // CD:738
                              } } },
    { id: 'eventPlugin',
      afterEvent(chart, args, opts) {
          if (args.event.type == "mouseleave") { /* body commented out — NO-OP */ }
      } }
  ],

  type: 'line',
  data: { },                       // populated later by updateChartDatasets()

  options: {
    events: ['mousemove', 'mouseleave'],          // NOTE: 'click' deliberately absent
    onHover: function(event, items) {
        if (event.type == "mousemove") doChartHitTests(event.chart, event, /*isClick=*/false);
    },
    layout: { padding: { right: 18 } },           // room for a 2-digit "Z₁₀" label
    interactions: { mode: null },                 // ⚠ MISSPELLED KEY — see GOTCHA G-4
    hover: { },                                   // empty
    onResize: function(chart) { /* empty body */ },
    responsive: true,
    normalized: true,
    resizeDelay: 5,                               // "has to be greater than zero, otherwise
                                                  //  resize glitching can occur"  CH:553-555
    animation: false,
    maintainAspectRatio: false,
    elements: { point: {}, line: {} },            // both empty

    plugins: {
      eventPlugin: { events: ['mouseleave'] },
      tooltip:  { enabled: false },               // ⚠ NO TOOLTIPS AT ALL
      legend:   { display: false },
      datalabels: {                               // ⚠ effectively dead, see G-3
        align:     function()               { return "bottom"; },
        formatter: function(value, context) { return context.dataset.date_label || null; },
        font:      { weight: 'normal', size: CHART_DATE_LABEL_FONT_SIZE /*22*/ },
        labels:    { title: {}, usePointStyle: true, value: { color: 'black' } }
      },
      zoom: {
        transitions: { zoom: { animation: { duration: 10000, easing: 'easeOutCubic' } } },
        zoom: { wheel: { enabled: true, speed: 0.05 },
                pinch: { enabled: true },
                mode: 'xy' },
        pan:  { enabled: true, mode: 'xy' }
        // onZoom / onPreZoom / onZoomComplete / onPan / onPanComplete are attached
        // imperatively in updateChartDatasets() — see §6.3
      }
      // (a `title` block exists but is fully commented out — CH:625-628)
    },

    scales: {
      x: {
        display: function() {                      // CH:632-643
            const currentIsoEvent = getCurrentIsoEvent();
            const field = getIsoEventField("SERIALIZED_FIELD__CHART_OPTION__SHOW_DATES");
            const hideFromGlobalOptions =
                  appState.globalOptions[GLOBAL_OPTION__HIDE_COL__DATES] === true;
            return currentIsoEvent[field.serializationKey] === true && !hideFromGlobalOptions;
        },
        ticks: { beginAtZero: true,                // meaningless on a time scale
                 sampleSize: 1,
                 minRotation: 45, maxRotation: 45,
                 font: { size: CHART_TIMESTAMP_FONT_SIZE /*18*/ } },
        grid:  { lineWidth: CHART_GRID_LINE_WIDTH /*2*/ },   // colour left at Chart.js default
        type: 'time',
        adapters: { date: { zone: 'Etc/GMT' } },   // MUTATED at runtime, see §6.2
        time: { minUnit: 'day',
                stepSize: 100,
                displayFormats: { day: "MM-dd-yy" } }   // Luxon tokens
      },
      y: {
        position: "left",
        ticks: { padding: 0, display: false, maxTicksLimit: 100 },
        grid:  { display: false, lineWidth: 0 }
        // no min / max: bounds come from the paddingDataSet — see §8
      }
    }
  }
});
```

### 5.1 Tooltips

**There are none.** `options.plugins.tooltip.enabled = false` (`CH:568-570`). There is no `callbacks` block anywhere in the three files. Every piece of "tooltip-like" information the user gets comes from either

* the **ruler callouts** drawn on the canvas when something is highlighted (`drawRulers`, §11), which display `getDayString(rotation_count_z)` (upper) and `getDayString(rotation_count_y)` (lower); or
* the **results table** the chart scrolls into view and highlights (§13), where the "pills" carry `jquery.tipsy` tooltips owned by `ophis_view__output.js` (out of scope).

### 5.2 Legend / annotations

* Legend: `display: false`. No legend is ever built; the colour key is documented only in the app's glossary/PDF export.
* Annotations: **`chartjs-plugin-annotation` is not present in `lib/` and is never referenced.** The "annotation-like" artefacts (rulers, labels, drop-lines) are all hand-drawn.

---

## 6. Lifecycle

### 6.1 `doChartInitialSetup()` — `CH:65-118` (called once, `src/ophis_main.js:263`)

Wires four DOM listeners on the canvas / recenter button:

| Event | Target | Action |
|---|---|---|
| `click` | `#recenter-chart-button` | `allowChartFlushToDisk(); recenterChart();` |
| `dblclick` | `#timeline-chart` | `allowChartFlushToDisk(); recenterChart();` |
| `mousedown` | `#timeline-chart` | `allowChartFlushToDisk(); mouseDownPoint.set(e.clientX, e.clientY);` |
| `mouseup` | `#timeline-chart` | `allowChartFlushToDisk(); mouseUpPoint.set(...)`; compute `dist = mouseDownPoint.calcDistanceTo(mouseUpPoint)`; **`chartClicked = dist <= 5`** (5-pixel drag tolerance, `CH:108`); if clicked → `doChartHitTests(appState.chart, e, /*isClick=*/true)`. Then both points are reset to `Number.MAX_SAFE_INTEGER`. |

Three commented-out `mouseover`/`mousedown`/`mouseup` handlers that would have set `cursor: grab/grabbing` remain at `CH:71-81`.

Note the outer `let chartClicked = false;` at `CH:88` is shadowed by an inner `var chartClicked` at `CH:108` — the outer is dead.

### 6.2 `updateChartDatasets(results)` — `CH:730-870` — the main entry point

Signature: `updateChartDatasets(results: ResultsStruct): void`. Side effects: may destroy/recreate `appState.chart`, mutates `chart.data.datasets` and four custom `chart.*` fields, calls `chart.update()`, may schedule a timeout.

Exact step order:

1. `clearTimeout(sLastChartRefreshTimeoutId)` — cancel a pending "unhide" (module-global, `CH:728`).
2. Capture `lastIsoEventLocal = sLastIsoEvent`; `currentIsoEvent = getCurrentIsoEvent()`; **assign `sLastIsoEvent = currentIsoEvent`**; `isDifferentIsoEvent = currentIsoEvent != lastIsoEventLocal` (**identity** comparison, not id).
3. If `isDifferentIsoEvent`: `chart.destroy()` (if any) and `chart = newChart(); appState.chart = chart;` — i.e. **switching events throws the whole Chart.js instance away**.
4. `hideChartError()`.
5. If `shouldHideChart(currentIsoEvent)` (i.e. `isoEvent["chart_option__show_chart"] === false`, `CH:720-725`): `showChartError(appState.latestResults, "Chart Hidden", /*statusOnly=*/true)` and **return**.
6. `temporarilyHideChart = isDifferentIsoEvent || appState.justFixedErrors`. If true: `showChartError(appState.latestResults, "Loading...", true)`.
7. **Timezone selection for the x scale** (`CH:765-774`):
   * `scope == EVENT_SCOPE__HH_MM` → `chart.options.scales.x.adapters.date.zone = getTimezone(isoEvent.lat, isoEvent.long)`
   * else if `scope == EVENT_SCOPE__DAYS && isFlagEnabled(FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT)` → `= getTimezone(0, 0)`
   * else → `= null`
   (The literal `'Etc/GMT'` from `newChart()` is therefore only the value before the first update.)
8. Attach zoom/pan callbacks (they close over `results`, so they are re-attached on every update):
   ```js
   zoom.zoom.onZoomComplete   = debounce(function(){ onZoomOrPanComplete(results); });  // 100 ms
   zoom.zoom.onPreZoomComplete= function(){};                       // empty
   zoom.zoom.onPreZoom        = function(){ allowChartFlushToDisk(); };
   zoom.zoom.onZoom           = function(){ allowChartFlushToDisk(); refreshZoomRelatedUi(results); };
   zoom.pan.onPanComplete     = function(){ onZoomOrPanComplete(results); };   // NOT debounced
   zoom.pan.onPan             = function(){ refreshZoomRelatedUi(results); };
   ```
   Source comment (`CH:789`): *"It appears that onPreZoom and onZoom only get called from an actual scroll wheel zoom."*
9. If `results.errors.length > 0` → `showChartError(results, "Please fix errors in order to render chart.")` and **return**.
10. If `results.processed_z_dates.length == 0` → `showChartError(results, NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT)` and **return**.
11. `chartUpdateStruct = generateChartUpdateStruct(chart, results)` (§8).
12. Assign:
    ```js
    chart.data.datasets        = chartUpdateStruct.datasets;
    chart.astronomical_points  = chartUpdateStruct.astronomical_points;
    chart.z_date_symbol_points = chartUpdateStruct.z_date_symbol_points;
    chart.date_label_points    = chartUpdateStruct.date_label_points;
    chart.scales.x.min         = chartUpdateStruct.x_min;   // ⚠ see GOTCHA G-5
    chart.scales.x.max         = chartUpdateStruct.x_max;   // ⚠
    ```
    (`chart.x_date_points` / `chart.z_date_points` assignments are commented out, `CH:831-832`.)
13. `updateChart()` → `appState.chart.update()`.
14. If `isDifferentIsoEvent`: restore the persisted viewport —
    ```js
    if (isoEvent.chart_x_min || isoEvent.chart_x_max)
        chart.zoomScale("x", {min: isoEvent.chart_x_min, max: isoEvent.chart_x_max}, "none");
    if (isoEvent.chart_y_min || isoEvent.chart_y_max)
        chart.zoomScale("y", {min: isoEvent.chart_y_min, max: isoEvent.chart_y_max}, "none");
    refreshZoomRelatedUi(results);   // zoomScale() does not fire onZoomComplete
    updateChart();
    ```
    Else if `appState.justFixedErrors` → `recenterChart()`.
15. If `temporarilyHideChart`: `sLastChartRefreshTimeoutId = setTimeout(() => { hideChartError(); showChartElem(); }, 500)` — *"Add a slight delay because with extreme curve situations the chart is still jumping a bit."* (`CH:864`).

### 6.3 Visibility / error helpers

```js
hideChartElem()                    // CH:7   -> canvas.style.opacity = 0
showChartElem()                    // CH:12  -> opacity = OPACITY__DISABLED (0.5) when
                                   //          appState.latestResults.stale === true, else 1
showChartError(results, msg, statusOnly=false)   // CH:23
   hideChartElem();
   wrapper.style.display = "table";
   msgElem.classList.[add|remove]("error_color")   // add when !statusOnly
   msgElem.innerHTML = msg;                        // ⚠ innerHTML — not escaped
   chart.data.labels = []; chart.data.datasets = [];
   if (!statusOnly) { updateChart(); refreshZoomRelatedUi(results); }
hideChartError()                   // CH:48  -> showChartElem() + wrapper.display="none"
recenterChart()                    // CH:55  -> chart.resetZoom("none")   (no-op if !chart)
isChartNotCentered()               // CH:120 -> chart.isZoomedOrPanned()  (zoom plugin)
shouldHideChart(isoEvent)          // CH:720 -> isoEvent["chart_option__show_chart"] === false
doBeforeOrAfterDraw()              // CH:471 -> !shouldHideChart(getCurrentIsoEvent())
updateChart()                      // CH:872 -> appState.chart && appState.chart.update()
distanceBetweenXDateAndZDate(opRes) // CH:712 -> z_date_native_start.getTime() - x_date_native_start.getTime()
```

Status/error strings used (exact literals):
`"Chart Hidden"` · `"Loading..."` · `"Please fix errors in order to render chart."` · `NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT`.

---

## 7. `chart_x_min` / `chart_x_max` / `chart_y_min` / `chart_y_max`

These are **four fields on the persisted `isoEvent` document**, not on the chart. They are the saved viewport.

`refreshZoomRelatedUi(results)` — `CH:126-158`:

```js
const isZoomedOrPanned = chart.isZoomedOrPanned();       // from chartjs-plugin-zoom
const isoEvent = getCurrentIsoEvent();

if (isZoomedOrPanned) {
    isoEvent.chart_x_min = chart.scales.x.min;   // epoch ms
    isoEvent.chart_x_max = chart.scales.x.max;   // epoch ms
    isoEvent.chart_y_min = chart.scales.y.min;   // arc-height units (ms)
    isoEvent.chart_y_max = chart.scales.y.max;
} else {
    isoEvent.chart_x_min = 0;                    // ← 0 is the SENTINEL for "no saved viewport"
    isoEvent.chart_x_max = 0;
    isoEvent.chart_y_min = 0;
    isoEvent.chart_y_max = 0;
}

recenterZoomButton.disabled = !(isZoomedOrPanned && results.processed_z_dates.length > 0);

if (getCurrentScreen() == OPHIS_SCREEN__EXPORT_X_DATES)
    refreshCurrentPage(REFRESH_TYPE__SOFT, results, /*updateChart=*/false,
                       /*setOverflowForScrollContainers=*/false);
```

**`0` means "auto-fit"**, and it is tested with a plain truthy check:

```js
recenterChartIfNeeded()   // CH:160-171
   hasExplicitZoomWindow = !!(chart_x_min || chart_x_max || chart_y_min || chart_y_max);
   if (!hasExplicitZoomWindow) recenterChart();
```

and on restore (`CH:842-848`) the same truthiness gate is used before `zoomScale`.

**Consequence (a real edge case):** because `0` is both the sentinel and a legal epoch-ms value (1970-01-01T00:00:00Z) *and* a legal y bound, a viewport whose `x_min` happens to be exactly 0 is indistinguishable from "unset". More practically: a viewport where `chart_y_min` computes to exactly 0 while `chart_y_max` is non-zero still restores, because the check is an OR across all four.

### 7.1 Flush-to-disk debouncing

```js
appState.blockChartFlushToDisk : boolean
blockChartFlushToDiskUntilUserInteraction()  // CH:173 -> = true
allowChartFlushToDisk()                      // CH:177 -> = false
onZoomOrPanComplete(results)                 // CH:181
    refreshZoomRelatedUi(results);
    if (appState.blockChartFlushToDisk === false) flushChangesToDisk();
```

The block flag is raised on file load / event switch (`src/ophis_model__persistence.js:98,198`, `src/ophis_view.js:14,110`) and lowered by *any* real mouse interaction with the canvas or the recenter button (`CH:67,84,96,103`) and by `onPreZoom`/`onZoom`. Purpose: programmatic viewport restoration must not mark the document dirty.

---

## 8. `generateChartUpdateStruct(chart, results)` — `CD:1388-1518`

Return shape:

```ts
type ChartUpdateStruct = {
  x_min: number;                     // epoch ms
  x_max: number;                     // epoch ms
  y_min: number;                     // = -largestCurveYRadius   (ms)
  y_max: number;                     // = +largestCurveYRadius   (ms)
  datasets: ChartJsDataset[];        // curveDataSets (sorted by order asc) ++ [paddingDataSet]
  astronomical_points: AstroPoint[];
  z_date_symbol_points: ZSymbolPoint[];
  date_label_points: DateLabelPoint[];
}
```

Algorithm, exactly:

1. **X-date collection** (`CD:1396-1414`). For each `isoEvent.x_dates[i]` with `enabled === true`:
   * `native = xDateToNativeDate(isoEvent.scope, ithXDate, isoEvent.lat, isoEvent.long)`; push `native.getTime()` to `xDatesInMillis`.
   * `ordinal = i + 1` — **the index in the full `x_dates` array, including disabled ones** (loop index, not a running counter). So disabling X₂ leaves the remaining labels as `X₁`, `X₃`, …
   * `label = "X" + convertIntToSubscriptUnicode(ordinal)` → e.g. `"X₁"`.
   * `newChartDatePointDataset(millis, label, {}, ordinal)` pushed to `xDatePointDataSets`.
2. **Z-date + curve collection** (`CD:1424-1458`). For each key in `results.processed_z_dates` (an ordered array of epoch-ms **strings**):
   * `zStruct = results.z_structs[key]`; `ordinal = i+1`; `label = "Z"+subscript(ordinal)` — **computed but unused** (the Z point-dataset line is commented out at `CD:1430-1431`).
   * push `zStruct.z_date_native_start.getTime()` to `zDatesInMillis`; track `furthestZDate` = max.
   * for each `operationMatchStruct` in `zStruct.operation_match_structs`: build a curve via `newChartDatasetFromOperationResult(isoEvent.effective_operations, key, opMatch.operation_result, zStruct)` and push to `curveDataSets`; track `longestSpanBetweenXDateAndZDate = max(distanceBetweenXDateAndZDate(opRes))`.
3. **Bounds**:
   ```js
   xMin = xDatesInMillis[0]        - MILLIS_PER_DAY;   // ⚠ FIRST enabled X-date, not the minimum
   xMax = furthestZDate.getTime()  + MILLIS_PER_DAY;
   ```
4. `largestCurveYRadius = fanOutOverlappingCurves(xMin, curveDataSets, longestSpanBetweenXDateAndZDate)` (§10).
5. `yMin = -largestCurveYRadius; yMax = +largestCurveYRadius;`
6. **Sort curves by `order` ascending** (`CD:1471-1478`) with `(a,b) => (a.order > b.order ? 1 : -1)` — note it **never returns 0**, so equal-order curves get an arbitrary but deterministic-enough ordering from V8's sort. This ordering matters twice: Chart.js honours `order` itself, but the array order also drives **hit-test priority** (§12).
7. **Build the padding dataset** (`CD:1481-1495`) — the real bounds mechanism:
   ```js
   paddingDataSet = {
     data: [ {x: xMin, y: yMin * 0.4},                    // = -0.40 * largestCurveYRadius
             {x: xMax, y: yMin * 0.4},
             {x: xMin, y: yMax + yMax * 0.05},            // = +1.05 * largestCurveYRadius
             {x: xMax, y: yMax + yMax * 0.05} ],
     x_min: xMin, x_max: xMax,        // decorative; nothing reads these
     borderColor: "red",
     borderWidth: 0,                  // ⇒ line invisible
     pointRadius: 5,
     pointBackgroundColor: "#00000000",   // 8-digit hex, fully transparent fill
     pointHoverRadius: 0
   }
   ```
   So the **visible y window is roughly `[-0.4·R , +1.05·R]`** where `R` is the tallest fanned arc radius: 40 % of one radius reserved *below* the axis for the label/moon/eclipse furniture, 5 % headroom above the tallest apex.
8. `astronomicalEventDatasets = generateAstronomicalEventDatasets(isoEvent, xDatesInMillis, zDatesInMillis)` (§9).
9. `zDateSymbolDatasets = generateZDateSymbolDatasets()` (`CD:147`).
10. `dateLabelDatasets = generateDateLabelDatasets(chart, xDatePointDataSets)` (`CD:188`).
11. `finalDatasetArray = curveDataSets.concat(paddingDataSet)` — **X/Z point datasets are NOT included** (see G-2).

### 8.1 The arc dataset — `newChartDatasetFromOperationResult()` — `CD:836-953`

```
newChartDatasetFromOperationResult(
    effectiveOperations : Operation[],     // isoEvent.effective_operations
    ithZDateDictKey     : string,          // epoch-ms string of the Z-date
    operationResult     : OperationResult,
    zDateTags           : ZStruct
) -> ChartJsLineDataset
```

Step by step:

```js
xDateStart       = operationResult.x_date_native_start;               // Date
distanceBetween  = zDate.getTime() - xDateStart.getTime();            // ms (signed!)
middleDateMillis = xDateStart.getTime() + distanceBetween / 2;
operation        = effectiveOperations[operationResult.operation_ordinal];
isAlpha          = isAlphaOperation(operation);                       // weight >= ALPHA threshold
```

**Colour / width by hit count** (`CD:848-863`, evaluated in this exact chain):

| condition | `lineColor` | `borderWidth` |
|---|---|---|
| `hit_count <= 1` | `rgba(0,0,0,1.0)` | 1 |
| `== 2` | `rgba(0,0,0,1.0)` | 1 |
| `== 3` | `rgb(253, 218, 13,1.0)` | 2 |
| `== 4` | `rgb(0, 150, 255, 1.0)` | 2 |
| `>= 5` | `rgb(210, 43, 43, 1.0)` | 2 |

**Order / highlight override chain** (order matters — later wins):

```js
dataSetOrder = CHART_DATASET_ORDER__DEFAULT;                    // 8
if (isAlpha) dataSetOrder = CHART_DATASET_ORDER__ALPHA_OPERATION;  // 7

hasSpecialColoring = false;

if (key == results.highlighted_z_date_row || key == results.highlighted_z_date_point) {
    lineColor   = CHART_CURVE_COLOR__GROUP_HIGHLIGHTING;        // "rgb(91, 202, 102)" green
    borderWidth = CHART_CURVE_WIDTH__GROUP_HIGHLIGHTING;        // 4
    dataSetOrder= CHART_DATASET_ORDER__HIGHLIGHTED_Z_DATE_ROW;  // 6
    hasSpecialColoring = true;
}
if (operationResult == results.highlighted_operation_result_pill ||
    operationResult == results.highlighted_operation_result_curve) {
    lineColor   = CHART_CURVE_COLOR__INDIVIDUAL_HIGHLIGHTING;   // "red"
    borderWidth = CHART_CURVE_WIDTH__INDIVIDUAL_HIGHLIGHTING;   // 5
    dataSetOrder= CHART_DATASET_ORDER__HIGHLIGHTED_PILL;        // 5
    hasSpecialColoring = true;
}
```

Note the `hit_count`-based colour is **only used when neither highlight applies** — a highlight replaces it wholesale.

**Arc point generation** (`CD:889-910`) — the geometric core:

```js
rotationPoint       = new GeoPoint(xDateStart.getTime(), 0);
rotationOriginPoint = new GeoPoint(middleDateMillis, 0);
radianIncrement     = -Math.PI / CHART_CURVE_COMPLEXITY;        // = -π/12 = -15°

rotationPoint.rotateBy(-radianIncrement, rotationOriginPoint);  // pre-rotate +15°

data = [];
for (i = 0; i < CHART_CURVE_COMPLEXITY + 3; i++) {              // 15 points
    data.push({ x: rotationPoint.getX(), y: rotationPoint.getY() });
    rotationPoint.rotateBy(radianIncrement, rotationOriginPoint);   // -15° each step
}
```

Resulting geometry, with `R = distanceBetween/2` and `M = middleDateMillis`:

| index | polar angle about `M` | position | note |
|---|---|---|---|
| 0 | 195° | `(M − 0.966R, −0.259R)` | **below** the axis, left of X-date |
| 1 | 180° | `(M − R, 0)` = **exactly the X-Date** | first visible vertex |
| 2..6 | 165°…105° | rising left flank | |
| 7 | 90° | `(M, +R)` — **apex** | |
| 8..12 | 75°…15° | falling right flank | |
| 13 | 0° | `(M + R, 0)` = **exactly the Z-Date** | last visible vertex |
| 14 | −15° | `(M + 0.966R, −0.259R)` | **below** the axis, right of Z-date |

The two out-of-band end points exist purely so the polyline/spline doesn't kink at the axis; their segments are drawn transparent. Author's comment at `CD:895-898`.

**Returned dataset literal** (`CD:912-952`):

```js
{
  lineTension: CHART_SPLINE_TENSION,   // 0.333 — ⚠ INERT under Chart.js v4 (G-1)
  data: data,                          // the 15 {x,y} points above

  borderColor: lineColor,
  segment: {
    borderColor: function(context) {
      if (context.p0DataIndex == 0 || context.p1DataIndex == CHART_CURVE_COMPLEXITY + 2 /*14*/)
          return COLOR__TRANSPARENT;                       // "rgba(0,0,0,0)"
      if (hasSpecialColoring == false) {
          let alpha = (context.p1DataIndex - 1) / CHART_CURVE_COMPLEXITY;   // /12
          alpha = Math.pow(alpha, 1.5);
          const baseAlpha = 0.075;
          alpha = baseAlpha + (1 - baseAlpha) * alpha;
          return lineColor.replace("1.0", alpha);          // ⚠ string surgery
      }
      return lineColor;
    }
  },
  borderWidth: borderWidth,
  order: dataSetOrder,
  pointRadius: 0,
  pointHoverRadius: 0,

  operation_result: operationResult,     // ← custom; hit-testing depends on this
  curve_x_radius: distanceBetween / 2,   // ← custom; ms
  curve_y_radius: distanceBetween / 2,   // ← custom; ms — MUTATED by fanOutOverlappingCurves
  operation_result_hash: operationResult.hash,
  xPoint1: xDateStart.getTime(),
  xPoint2: xDateStart.getTime() + distanceBetween
}
```

**Alpha ramp, tabulated** (`baseAlpha = 0.075`, exponent 1.5, denominator 12):

| segment (p0→p1) | `p1DataIndex` | raw `t=(p1−1)/12` | `t^1.5` | final alpha |
|---|---|---|---|---|
| 0→1 | 1 | — | — | **transparent** (p0==0 branch) |
| 1→2 | 2 | 0.0833 | 0.02406 | **0.0975** |
| 2→3 | 3 | 0.1667 | 0.06804 | 0.1379 |
| 3→4 | 4 | 0.25 | 0.125 | 0.1906 |
| 4→5 | 5 | 0.3333 | 0.19245 | 0.2555 |
| 5→6 | 6 | 0.4167 | 0.26894 | 0.3313 |
| 6→7 | 7 | 0.5 | 0.35355 | 0.4020 → apex segment |
| 7→8 | 8 | 0.5833 | 0.44553 | 0.4871 |
| 8→9 | 9 | 0.6667 | 0.54433 | 0.5785 |
| 9→10 | 10 | 0.75 | 0.64952 | 0.6758 |
| 10→11 | 11 | 0.8333 | 0.76073 | 0.7787 |
| 11→12 | 12 | 0.9167 | 0.87764 | 0.8868 |
| 12→13 | 13 | 1.0 | 1.0 | **1.0** |
| 13→14 | 14 | — | — | **transparent** (p1==14 branch) |

So the arc is nearly invisible at the X-Date foot and fully saturated at the Z-Date foot.

### 8.2 `newChartDatePointDataset()` — `CD:799-834` (DEAD PATH, see G-2)

```
newChartDatePointDataset(dateInMillis:number, label:string, zDateTags:object, ordinal:number)
 -> { xPoint, order, pointBackgroundColor:"black", pointRadius, pointHoverRadius, ordinal, label }
```

* `pointRadius = CHART_POINT_RADIUS__Z_DATE (7)`; overridden to `CHART_POINT_RADIUS_HOVER (10)` when `String(dateInMillis) === results.highlighted_z_date_point`.
* `isXDatePoint = label.includes("X")` (`CD:811`, with the author's own `//TODO Maybe something a little more formal.`). If so `pointRadius = CHART_POINT_RADIUS__X_DATE (5)` and `pointHoverRadius = pointRadius`.
* `xPoint` is assigned **twice** (`CD:824` and `CD:830`) — harmless duplication.
* The dead branch at `CD:816-820` (`if (zDateTags.hit_count > 1) { /* pointRadius = 0; */ }`) is fully commented out.

The only survivors of this function are the returned `xPoint` / `ordinal` values, consumed by `generateDateLabelDatasets` to build the `X₁`, `X₂` labels. **The `pointRadius`, `pointBackgroundColor`, and `order` fields never reach Chart.js.**

---

## 9. Astronomical event generation — `generateAstronomicalEventDatasets()` — `CD:1002-1240`

```
generateAstronomicalEventDatasets(isoEvent, xDatesInMillis:number[], zDatesInMillis:number[])
  -> AstroPoint[]     // sorted ascending by z_index
```

### 9.1 Step 1 — build a dense day-by-day sampling window (`CD:1005-1043`)

```js
allDatesInMillis = xDatesInMillis.concat(zDatesInMillis).sort((a,b)=>a-b);
MOON_SAMPLING_HALF_WINDOW_IN_MILLIS = MILLIS_PER_DAY * 8;          // ±8 days

timeZone = (scope == HH_MM) ? getTimezone(lat,long)
         : (scope == DAYS && FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT) ? getTimezone(0,0)
         : "";                                                     // empty string!

for each kthDateInMillis in allDatesInMillis:
    if (scope == HH_MM || (scope == DAYS && LOCK_DAY_SCOPE_TO_GMT))
        kthDateInMillis = roundMillisToNearestMidnightInTimeZone(kthDateInMillis, timeZone);

    windowStart = kth - 8 days
    windowEnd   = kth + 8 days + 1 day                              // exclusive
    // de-duplicate against the previous window's tail:
    while (windowStart <= lastSample) windowStart += MILLIS_PER_DAY;

    for (t = windowStart; t < windowEnd; t += MILLIS_PER_DAY)
        dateSamplingBasedOnAllDates.push(t);
```

Result: a strictly increasing daily grid covering ±8 days around every X- and Z-date, with overlapping windows merged.

### 9.2 Step 2 — pick the representative day for each moon phase run (`CD:1045-1100`)

```js
currentDate = new Date(0); currentPhase = null; percentageDeltaOfClosestCurrentDate = null;
closestDatesToAstroIndicators = {};   // phaseName -> number[]  (later also eclipseType -> {msStr:true})

for each t in dateSamplingBasedOnAllDates:
    currentDate.setTime(t);
    lunarAgePercent = lunarphase.Moon.lunarAgePercent(currentDate);   // 0..1
    lunarAge        = lunarAgePercent * SYNODIC_MONTH;                // 0..29.53
    phase           = getLunarPhase(lunarAge);                        // CD:955
    ideal           = MOON_PHASE_DICT[phase].moon_phase_percentage;

    // "wrap" so that a New Moon just past 1.0 measures its distance from 0 correctly:
    wrapped = (currentPhase == lunarphase.LunarPhase.NEW && lunarAgePercent > 0.5)
              ? 1.0 - lunarAgePercent : lunarAgePercent;
    distance = Math.abs(ideal - wrapped);

    startNewRun = false;
    if (currentPhase != phase)                              startNewRun = true;
    else if (!closestDates.hasOwnProperty(phase))           startNewRun = true;
    else {
        lastIndicatorDate = closestDates[phase].at(-1);
        if (Math.abs(t - lastIndicatorDate) > MILLIS_PER_DAY * 10) startNewRun = true;
    }

    if (startNewRun) {
        closestDates[phase] ||= [];
        closestDates[phase].push(t);          // provisional
        currentPhase = phase;
        percentageDeltaOfClosestCurrentDate = null;
    }

    if (percentageDeltaOfClosestCurrentDate == null || distance < percentageDeltaOfClosestCurrentDate) {
        percentageDeltaOfClosestCurrentDate = distance;
        closestDates[currentPhase][last] = t;  // replace the run's representative
    }
```

Constants: **±8 day sampling window**, **10-day run-gap threshold** (`CD:1077`), `SYNODIC_MONTH = 29.53058770576`.

`getLunarPhase(lunarAge)` — `CD:955-966` — is a verbatim copy of the lunarphase-js thresholds:

```js
lunarAge <  1.84566173161  -> NEW
         <  5.53698519483  -> WAXING_CRESCENT
         <  9.22830865805  -> FIRST_QUARTER
         < 12.91963212127  -> WAXING_GIBBOUS
         < 16.61095558449  -> FULL
         < 20.30227904771  -> WANING_GIBBOUS
         < 23.99360251093  -> LAST_QUARTER
         < 27.68492597415  -> WANING_CRESCENT
otherwise                  -> NEW
```

### 9.3 Step 3 — eclipse lookup (`CD:1102-1143`)

```js
fullSolarEnabled    = isIsoEventFieldEnabled(isoEvent,"SERIALIZED_FIELD__CHART_OPTION__FULL_SOLAR_ECLIPSES")    === true
partialSolarEnabled = ... "…PARTIAL_SOLAR_ECLIPSES" ...
fullLunarEnabled    = ... "…FULL_LUNAR_ECLIPSES" ...
partialLunarEnabled = ... "…PARTIAL_LUNAR_ECLIPSES" ...

if (any of the four) {
  for each ithDateInMillis in allDatesInMillis:              // note: UNROUNDED dates here
     if (fullSolarEnabled || partialSolarEnabled) {
        e = binarySearchForEclipse(SOLAR_ECLIPSES_PROCESSED, ithDateInMillis);
        if (e) { type = getNormalizedSolarEclipseType(e);
                 if ((type==SOLAR_FULL && fullSolarEnabled) || (type==SOLAR_PARTIAL && partialSolarEnabled))
                     closestDates[type] = closestDates[type] || {};
                     closestDates[type][String(e.date_millis)] = true; }
     }
     if (fullLunarEnabled || partialLunarEnabled) { …same with LUNAR_ECLIPSES_PROCESSED… }
  }
}
```

**Note the container-type switch:** for moon phases `closestDatesToAstroIndicators[phase]` is an **array of numbers**; for eclipses it is an **object used as a set of ms-strings**. The consumer at `CD:1149` branches on which dict the key belongs to.

`binarySearchForEclipse(eclipseArray, targetMillis)` — `CD:36-57`:

```js
start=0, end=len-1
while (start <= end) {
    mid = floor((start+end)/2);
    d = eclipseArray[mid].date_millis;
    if (target >= d - ECLLIPSE_DATE_MATCH_TOLERANCE && target <= d + ECLLIPSE_DATE_MATCH_TOLERANCE)
        return eclipseArray[mid];
    else if (d < target) start = mid + 1;
    else end = mid - 1;
}
return null;
```
Tolerance = **±1.25 days = ±108 000 000 ms**. Requires the array to be sorted ascending (it is). Returns *an* eclipse within tolerance, not necessarily the nearest.

`getNormalizedSolarEclipseType(e)` — `CD:3-17` — by first character of NASA's `eclipse_type`:

| prefix | meaning | normalised |
|---|---|---|
| `P` | Partial | `SOLAR_ECLIPSE_TYPE__PARTIAL` |
| `A` | Annular | `SOLAR_ECLIPSE_TYPE__FULL` |
| `T` | Total | `SOLAR_ECLIPSE_TYPE__FULL` |
| `H` | Hybrid | `SOLAR_ECLIPSE_TYPE__FULL` |
| else | — | `null` |

`getNormalizedLunarEclipseType(e)` — `CD:19-29`:

| prefix | meaning | normalised |
|---|---|---|
| `P` | Partial | `LUNAR_ECLIPSE_TYPE__PARTIAL` |
| `T` | Total | `LUNAR_ECLIPSE_TYPE__FULL` |
| else (incl. `N` penumbral) | — | `null` |

⚠ **`getNormalizedSolarEclipseType` can return `null`** and the solar branch at `CD:1117` does **not** null-check before comparing — harmless (`null == SOLAR_ECLIPSE_TYPE__FULL` is false), but the lunar branch at `CD:1133` *does* null-check (`eclipseType && …`), so the two are inconsistent. Also the lunar condition mixes `&&`/`||` without parentheses; JS precedence makes it `(A&&B&&C) || (A&&D&&E)`, which is the intended reading.

### 9.4 Step 4 — build `AstroPoint`s and attach date connections (`CD:1145-1239`)

For each key in `closestDatesToAstroIndicators`:

* If the key is in `MOON_PHASE_DICT`:
  * skip unless `isIsoEventFieldEnabled(isoEvent, entry.serialized_field) === true`.
  * `filterField = getIsoEventField(entry.serialized_field)` → provides `.zIndex` (**5** for every moon, `src/ophis_config.js:193`).
  * For each representative date `d` in the array, scan **all** X/Z dates; whenever `|d − xz| <= LUNAR_DATE_MATCH_TOLERANCE (1 day)`:
    * lazily create `newAstroIndicatorPoint(d, CHART_IMAGES[phase], ASTRO_INDICATOR_TYPE__LUNAR_PHASE, filterField.zIndex)` and push it,
    * record `serializedField` in `indicatorsThatOverlappedDates`,
    * push `xz` into `point.date_connections_in_millis`.
  * A representative date that matches **no** X/Z date produces no point at all — the moon icons only ever appear next to an anchor or a projection.
  * The author explicitly documents *not* re-rounding here (`CD:1177-1182`): *"I think rounding AGAIN after the moon phase sampling can shift the day down again. So don't round again!"*
* Else if the key is in `ECLIPSE_DICT`:
  * `filterField = getIsoEventField(entry.serialized_field)` → `.zIndex` = **10** full-solar, **8** partial-solar, **9** full-lunar, **7** partial-lunar (`src/ophis_config.js:237,246,255,264`).
  * Iterate the ms-string keys; `ms = parseIntElseNeg1(key)`; if `|ms − xz| <= ECLLIPSE_DATE_MATCH_TOLERANCE (1.25 d)` then (on first match only) round `ms` to local midnight when `scope == HH_MM`, or to GMT midnight when `scope == DAYS && LOCK_DAY_SCOPE_TO_GMT`; create the `ASTRO_INDICATOR_TYPE__ECLIPSE` point; append the connection.
  * ⚠ **Note the inconsistency with moons:** eclipses *are* re-rounded here (`CD:1213-1217`) while moons deliberately are not.
  * ⚠ **`isIsoEventFieldEnabled` is not re-checked** in this branch — but it doesn't need to be, because the eclipse keys are only inserted into `closestDatesToAstroIndicators` when enabled (§9.3).
* Finally `handleJustChangedFields(isoEvent, indicatorsThatOverlappedDates)` — a toast system that tells the user "you enabled Full Moons but none matched" (implementation in `src/ophis_view__utils.js:880`).
* `toReturn.sort((a,b) => a.z_index - b.z_index)` — ascending, so higher `z_index` is drawn **last / on top** in `drawAstroIndicators`'s linear loops. Painting priority (top-most first): full solar (10), full lunar (9), partial solar (8), partial lunar (7), moons (5).

### 9.5 `optimizeEclipseData(eclipseType)` — `CD:1559-1599` — build-time helper, currently unreachable

```
optimizeEclipseData(eclipseType: "ECLIPSE_TYPE__LUNAR" | "ECLIPSE_TYPE__SOLAR")
  -> Array<{ date_millis:number, eclipse_type:string }>
```

Reads `LUNAR_ECLIPSES_ORIG` / `SOLAR_ECLIPSES_ORIG` (raw NASA rows with keys `"Calendar Date"`, `"Eclipse Time"`, `"Eclipse Type"`), and:

1. **Skips any row whose `"Calendar Date"` starts with `"-"`** (B.C. era) — *"There's some issue with date/time parsing if I recall, for negative years."* (`CD:1571-1574`).
2. For lunar only: **skips `eclipse_type` starting with `"N"`** (penumbral) — *"the ones that you can barely see."* (`CD:1581-1583`).
3. Parses `date + " " + time` with `moment.utc(ts, "YYYY, MMMM D HH:mm:ss")` (`CD:1522-1524`), converts through `nativeDateToXDate(nativeDate, 0, 0)` then `xDateToNativeDateForController(EVENT_SCOPE__DAYS, xDate)` to snap to time-zero, and emits `{date_millis, eclipse_type}`.

Its two call sites in `src/ophis_main.js:213-214` are **commented out**; the pre-baked `*_processed.js` files are shipped instead. Keep the function if you want to regenerate the tables; it is not on any runtime path.

Reference notes embedded in the source (`CD:1526-1556`) enumerate the observed NASA type codes:
lunar `{"T-","T+","P","N","T","Ne","Nb","Nx"}`; solar `{"P","A","T","H","Tm","Pb","Hm","Pe","H2","A+","Am","As","T-","An","H3","Tn","A-","T+","Ts"}`, with the second-character modifier legend (`m` middle of Saros, `n`/`s` central with no north/south limit, `+`/`-` non-central, `2`/`3` hybrid direction, `b`/`e` Saros begins/ends).

---

## 10. Layout algorithms

### 10.1 Collision grouping — `organizeEntitiesIntoCollisionGroups(entities, resetXPointPixels, hitTest)` — `CD:260-316`

```
organizeEntitiesIntoCollisionGroups(
   entities            : T[]                                  // MUTATED: .overlaps, .visited set on each
   resetXPointPixels   : ((T) => void) | null                 // optional per-entity pre-pass
   hitTest             : (T, T) => boolean
) -> T[][]                                                    // connected components
```

1. Pass 1: `entity.overlaps = []; entity.visited = false;` plus optional `resetXPointPixels(entity)`.
2. Pass 2: **O(n²)** — for every `i < k`, if `hitTest(e_i, e_k)` push each into the other's `overlaps`.
3. Pass 3: DFS via the **recursive** inner `visitEntity(symbol, group)` to collect connected components.

`hitTestPoints(xA, xB, rA, rB)` — `CD:245-258` — 1-D interval overlap:

```js
x1 = xA - rA; x2 = xA + rA; y1 = xB - rB; y2 = xB + rB;
return Math.max(x1, y1) <= Math.min(x2, y2);
```
(An unused equivalent `testRangeOverlap()` sits at `CD:231-236` and a commented-out call to it at `CD:253`.)

`hitTestSingularEntities(a, b, rA, rB)` — `CD:238-243` — reads `a.xPointPixels` / `b.xPointPixels` and delegates.

### 10.2 Horizontal spreading — `spreadZDateSymbols(symbolGroups)` — `CD:450-502`

For every group with more than one member:

1. `sort((a,b) => a.xPoint - b.xPoint)` — by *data* x, ascending.
2. Compute `lowestX` / `highestX` from `xPointPixelsOrig` (the **un-spread** pixel positions) and `idealTotalWidthOfGroup = Σ member.width`.
3. `laidOutWidthOfGroup = (last.xPointPixels + last.width/2) − (first.xPointPixels − first.width/2)`.
4. **If `laidOutWidthOfGroup < idealTotalWidthOfGroup − 0.1`** (the `0.1` is a float-noise guard), re-lay out:
   ```js
   averageCenter = lowestX + (highestX - lowestX)/2;
   currentX      = averageCenter - idealTotalWidthOfGroup/2 + members[0].width/2;
   for k in members:
       members[k].xPointPixels = currentX;
       currentX += members[k].width/2;
       if (k+1 < n) currentX += members[k+1].width/2;
   ```
   i.e. pack members edge-to-edge, centred on the midpoint of the group's original extent.

### 10.3 Iterative relaxation

Both `drawDateLabels` (`CD:362-380`) and `drawZDateSymbols` (`CD:548-564`) run the identical loop:

```js
previousGroups = organizeEntitiesIntoCollisionGroups(points, resetXPointPixels, hitTest);
spreadZDateSymbols(previousGroups);

MAX_SPREAD_ITERATIONS = 10;                 // local const, declared in BOTH functions
for (i = 0; i < MAX_SPREAD_ITERATIONS; i++) {
    currentGroups = organizeEntitiesIntoCollisionGroups(points, /*reset=*/null, hitTest);
    spreadZDateSymbols(currentGroups);
    if (areSymbolGroupsEqual(previousGroups, currentGroups)) break;
    previousGroups = currentGroups;
}
```

`resetXPointPixels(e)` (only on the first pass) sets `e.xPointPixels = scales.x.getPixelForValue(e.xPoint)` **and** `e.xPointPixelsOrig = e.xPointPixels`. Subsequent passes deliberately pass `null` so displacement accumulates.

Hit radii differ:
* Z-date symbols: `hitTestSingularEntities(a, b, Z_DATE_SYMBOL_SIZE_DIV_2, Z_DATE_SYMBOL_SIZE_DIV_2)` = ±12.5 px (`CD:544-546`).
* Date labels: `hitTestSingularEntities(a, b, a.width/2, b.width/2)` (`CD:356-360`).

`areSymbolGroupsEqual(prev, cur)` — `CD:504-528` — returns true only if group count, each group's member count, **and each member's object identity at the same index** match. Any reordering counts as "changed".

### 10.4 Vertical fan-out — `fanOutOverlappingCurves(chartXMin, curveDataSets, longestSpan)` — `CD:1242-1386`

```
fanOutOverlappingCurves(chartXMin:number, curveDataSets:Dataset[], longestSpanBetweenXDateAndZDate:number)
  -> largestCurveYRadius : number      // side effect: MUTATES curve_y_radius and data[i].y
```

**Phase A — global lift toward the tallest arc** (`CD:1244-1262`):

```js
largestCurveRadiusBeforeFanning = longestSpanBetweenXDateAndZDate / 2;
for each curve:
    r    = curve.curve_y_radius;
    diff = largestCurveRadiusBeforeFanning - r;
    curve.curve_y_radius     = r + diff * 0.15;       // percentageOfDiff = .15  (CD:1250)
    curve.point_scale_factor = curve.curve_y_radius / r;
```
Short arcs are raised by 15 % of their deficit relative to the tallest arc, so a chart of very unequal spans doesn't degenerate into flat lines. **`curve_x_radius` is untouched** — arcs become genuine ellipses, not semicircles.

**Phase B — group co-terminal arcs** (`CD:1264-1291`):

```js
chartCanvasWidth = document.getElementById("timeline-chart").clientWidth;   // CSS px
hitRadius = CHART_FAN_OUT_HIT_RADIUS;   // 8

hitTest(ith, kth):
    minXForSimulatedChartRange = ith.operation_result.x_date_native_start.getTime();
    ithRanage = ith.xPoint2 - minXForSimulatedChartRange;      // (sic: "Ranage")
    scaling   = chartCanvasWidth / ithRanage;

    ithX1 = (ith.xPoint1 - chartXMin) * scaling;
    ithX2 = ithX1 + (ith.xPoint2 - ith.xPoint1) * scaling;
    kthX1 = (kth.xPoint1 - chartXMin) * scaling;
    kthX2 = kthX1 + (kth.xPoint2 - kth.xPoint1) * scaling;

    return hitTestPoints(ithX1, kthX1, 8, 8) && hitTestPoints(ithX2, kthX2, 8, 8);
```
Two arcs are "the same" only if **both** feet land within 16 px of each other in this simulated pixel space.

**Phase C — fan within each group** (`CD:1304-1344`):

```js
for each group:
  if (group.length == 1) {
      largestCurveYRadius = max(largestCurveYRadius, sole.curve_y_radius);
      scaleCurvePoints(sole, 1.0);
  } else {
      group.sort((a,b) => a.curve_x_radius - b.curve_x_radius);   // shortest span first
      for k in group:
          fanScaleFactor = 1 + 0.15 * k;                          // 1.00, 1.15, 1.30, 1.45, …
          group[k].curve_y_radius *= fanScaleFactor;
          largestCurveYRadius = max(largestCurveYRadius, group[k].curve_y_radius);
          scaleCurvePoints(group[k], fanScaleFactor);
  }
return largestCurveYRadius;
```

```js
scaleCurvePoints(curveDataSet, fanFactor) {                       // CD:1293-1302
    const s = curveDataSet.point_scale_factor || 1.0;
    for (m = 1; m < data.length; m++) {     // ⚠ starts at 1 — data[0] is NEVER scaled
        data[m].y *= s;
        data[m].y *= fanFactor;
    }
}
```

A dead alternative implementation (hash-bucketed fanning by `operation_result.hash_without_ordinal`) is commented out at `CD:1348-1385`, and there is an orphaned `if (kthCurveDataSet.operation_result.rotation_count_z == 2314.2) { // debugger; }` at `CD:1325-1327`.

---

## 11. Custom canvas drawing

Draw order is fixed by the plugin (`CH:488-500`):

```
beforeDraw : drawXAxis
   ↓  (Chart.js draws its scales + the arc datasets + the padding points)
afterDraw  : drawZDateSymbols → drawRulers → drawDateLabels → drawAstroIndicators
```

`drawAstroIndicators` **must** run after `drawDateLabels`, because it reads `date_label_points[m].yPointPixels`, which `drawDateLabels` computes (`CD:399`).

### 11.1 `drawXAxis(chart)` — `CH:454-469`

```js
xAxisYPos = chart.scales.y.getPixelForValue(0);
ctx.fillStyle = "white";
ctx.fillRect(0, 0, chart.canvas.width, chart.canvas.height);   // wipes the canvas white
ctx.strokeStyle = "black"; ctx.setLineDash([]); ctx.lineWidth = 2;
ctx.beginPath(); ctx.moveTo(0, xAxisYPos); ctx.lineTo(chart.canvas.width, xAxisYPos); ctx.stroke();
```

The axis line spans the **entire canvas**, not just `chartArea` — it runs under the y-axis gutter and past the right padding.

### 11.2 `drawIndicatorLine(ctx, xStart, yStart, xEnd, yEnd, dashed=true, dashStyle=[4,4], lineWidth=1)` — `CD:718-736`

Sets dash (or clears it), `strokeStyle="black"`, `lineCap="round"`, `lineWidth`, then a single `moveTo`/`lineTo`/`stroke`.

### 11.3 `drawDateLabel(chart, dateShorthand, dateOrdinal, x, y, width, height, fontSize, highlighted=false)` — `CD:318-339`

```js
height += 1;
ithWidthForDrawing = width - CHART_DATE_LABEL_SPACING*2 - CHART_DATE_LABEL_PADDING*2;   // = width - 6
isZDate = (dateShorthand == "Z");

ctx.lineWidth  = 3;
ctx.setLineDash([]);
ctx.fillStyle   = isZDate ? "grey"  : "white";
ctx.strokeStyle = (isZDate && highlighted) ? CHART_CURVE_COLOR__GROUP_HIGHLIGHTING : "black";
ctx.roundRect(x - ithWidthForDrawing/2 - 1,
              y - height/2 - 1 - 1,
              ithWidthForDrawing + 2,
              height,
              /*radius=*/2);
ctx.stroke(); ctx.fill();

ctx.fillStyle = isZDate ? (highlighted ? CHART_CURVE_COLOR__GROUP_HIGHLIGHTING : "white") : "black";
ctx.font = fontSize + "px Arial";
ctx.fillText(dateOrdinal, x, y);
```

Note: `stroke()` happens **before** `fill()`, so the fill covers the inner half of the 3-px stroke — the visible border is ~1.5 px.

### 11.4 `drawDateLabels(chart)` — `CD:341-448`

1. Guard on `chart.date_label_points`.
2. `ctx.textAlign = "center"; ctx.textBaseline = "middle";`
3. Run the spread relaxation (§10.3) on `chart.date_label_points` — **X and Z labels spread against each other in one pool**.
4. **Pass 1 — geometry + connectors**, per label:
   ```js
   xAxisYPos     = scales.y.getPixelForValue(0);
   xPosInPixels  = label.xPointPixels;                        // possibly displaced
   xPosInPixelOrig = scales.x.getPixelForValue(label.xPoint); // true axis position
   yPosInPixels  = xAxisYPos + 35;                            // CHART_DATE_LABEL_PIXEL_OFFSET_FROM_X_AXIS
   if (chart.astronomical_points.length == 0) yPosInPixels += 35 * 0.5;   // → +52.5

   label.yPoint       = scales.y.getValueForPixel(yPosInPixels);   // cached for hit-testing
   label.yPointPixels = yPosInPixels;                              // read by drawAstroIndicators

   // tick on the axis, solid, 3 px, length 7:
   tickOffset = isXDate ? -7 : +7;      // X-date tick points UP, Z-date tick points DOWN
   drawIndicatorLine(ctx, xPosInPixelOrig, xAxisYPos + tickOffset, xPosInPixelOrig, xAxisYPos,
                     /*dashed=*/false, dashStyle /* ⚠ undefined here, see G-8 */, /*lineWidth=*/3);

   // leader line from the axis down to the top edge of the (possibly displaced) label:
   dashed = !(label.zDateDictKey && (results.highlighted_z_date_point == label.zDateDictKey ||
                                     results.highlighted_z_date_row   == label.zDateDictKey));
   dashStyle  = [1, 3];
   tickOffset = isXDate ? 0 : 7;
   drawIndicatorLine(ctx, xPosInPixelOrig, xAxisYPos + tickOffset,
                     xPosInPixels, yPosInPixels - label.height/2 - 1, dashed, dashStyle);
   ```
5. **Pass 2 — draw boxes.** The highlighted label (matched by `zDateDictKey` against `highlighted_z_date_point` **or** `highlighted_z_date_row`) is **skipped** and remembered.
6. **Pass 3 — draw the highlighted label last** (on top), scaled by `CHART_LABEL_HIGHLIGHTING_MAGNIFICATION` (currently `1.0`, so no visual change other than the green border/text and z-order), with `yPosInPixels += (highlightedHeight − height)/2`.

### 11.5 `drawZDateSymbols(chart)` — `CD:530-620`

1. Guard on `chart.z_date_symbol_points`; run the spread relaxation with a fixed ±12.5 px radius.
2. **Pass 1 — drop-lines.** Per symbol:
   ```js
   xAxisOffset = getSymbolAxisOffset(symbol.zDateTags);                 // ⚠ computed, then discarded
   yOffsetFromXAxisInPixels = xAxisYPos - scales.y.getPixelForValue(xAxisOffset);
   if (yOffsetFromXAxisInPixels < 60) yOffsetFromXAxisInPixels = 60;    // ⚠ also discarded
   yPosInPixels = Z_DATE_SYMBOL_SIZE * 2.5;                             // = 62.5 px from canvas TOP
   symbol.yPoint = scales.y.getValueForPixel(yPosInPixels);
   dashed = (results.highlighted_z_date_point != symbol.zDateDictKey);
   drawIndicatorLine(ctx, xPosInPixelOrig, xAxisYPos, xPosInPixels, yPosInPixels, dashed);  // [4,4], 1px
   ```
   Symbols therefore sit at a **fixed 62.5 px from the top of the canvas**, independent of zoom, pan, or arc height.
3. **Pass 2 — draw images** at `drawImage(img, x − 12.5, y − 12.5, 25, 25)`, skipping the highlighted one.
4. **Pass 3 — the highlighted symbol at 1.5× (37.5 px)**, centred on the same point (`CD:610-616`). The literal `1.5` is hard-coded here even though `CHART_SYMBOL_HIGHLIGHTING_MAGNIFICATION = 1.5` exists.

`getSymbolAxisOffset(zDateTags)` — `CD:117-145` — **entirely dead** at runtime (its result is overwritten at `CD:581`, and the only other call site at `CD:177` is commented out):

```js
radiusMultiplier = 0.8;
if (operation_match_structs.length == 1)
    offset = (structs[0].operation_result.rotation_count_z / 2) * 0.8;
else
    offset = max_over_structs(rotation_count_z / 2) * 0.8;
return offset * MILLIS_PER_DAY;
```

`generateZDateSymbolDatasets()` — `CD:147-186`:

```js
sortedAndFilteredZDates = deepClone(results.processed_z_dates);   // JSON clone of a string[]
for each key:
    zStruct = results.z_structs[key];
    if (zStruct.hit_count > 1) {
        hitCountEnum = getHitCountSymbolImage(zStruct.hit_count, false);
        push newZDateSymbolPoint(parseInt(key), /*yPoint=*/0, CHART_IMAGES[hitCountEnum], key, zStruct);
    }
```
A commented-out sort by `(hit_count, key)` sits at `CD:156-165` with the note *"Shouldn't need to sort them anymore. They bounce off each other like balloons now."*

### 11.6 `drawRulers(chart)` — `CD:622-716`

Early return unless `results.highlighted_operation_result_pill` **or** `results.highlighted_operation_result_curve` is set; the pill wins if both are (`CD:636-640`).

```js
ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillStyle="black";
ctx.font = CHART_RULER_LABEL_FONT_SIZE + "px Arial";              // "22px Arial"
yLow = scales.y.getPixelForValue(0);

// linear scan of chart.data.datasets for the dataset whose .operation_result === the target:
curveDataset = first dataset with ithDataset.operation_result == operationResultForZDelta;

yHigh_zDelta = scales.y.getPixelForValue(curveDataset.curve_y_radius);
if (yHigh_zDelta < 25)                                    yHigh_zDelta = 25;
else if (yLow - yHigh_zDelta < 60 /*Z_DELTA_RULER_MIN_Y*/) yHigh_zDelta = yLow - 60;

// (dead) scan every Z-date's msrf_match_structs for one whose operation_result matches,
// then set an UNDECLARED global `borderColor` from COLOR__MSRF_NORMAL / _IMPORTANT / _VORTEX.
// The value is never read.  CD:660-693

dayString_y = getDayString(op.rotation_count_y);   // "N days"
dayString_z = getDayString(op.rotation_count_z);

xStart_zDelta = scales.x.getPixelForValue(op.x_date_native_start.getTime());
zStart_zDelta = scales.x.getPixelForValue(op.z_date_native_start.getTime());
drawRuler(chart, ctx, xStart_zDelta, zStart_zDelta, yLow, yHigh_zDelta, dayString_z);

// the Y ruler spans the two X-dates, min→max, at half the Z ruler's height:
[xStart_yDelta, xEnd_yDelta] = sorted(op.x_date_native_other, op.x_date_native_start);
drawRuler(chart, ctx, xStart_yDelta, xEnd_yDelta, yLow, yLow + (yHigh_zDelta - yLow)/2, dayString_y);
```

`drawRuler(chart, ctx, xStart, xEnd, yLow, yHigh, label)` — `CD:59-115`:

```js
yHigh -= CHART_CURVE_WIDTH__INDIVIDUAL_HIGHLIGHTING/2 + 2;   // -= 4.5   ("nudge just over the red curve")

// solid end stiles, black, 2 px, no dash:
ctx.moveTo(xStart, yLow);      ctx.lineTo(xStart, yHigh - 10);
ctx.moveTo(xEnd,   yHigh - 10);ctx.lineTo(xEnd,   yLow);       ctx.stroke();

// dashed measurement line:
ctx.setLineDash([5, 5]);  ctx.moveTo(xStart, yHigh); ctx.lineTo(xEnd, yHigh); ctx.stroke();

// label placement, clamped into view:
labelX    = xStart + (xEnd - xStart)/2;
chartStart= scales.x.getPixelForValue(scales.x.min);
chartEnd  = scales.x.getPixelForValue(scales.x.max);
if      (xEnd > chartEnd && xStart < chartStart) labelX = chartStart + (chartEnd - chartStart)/2;
else if (xEnd > chartEnd)                        labelX = xStart     + (chartEnd - xStart)/2;
else if (xStart < chartStart)                    labelX = chartStart + (xEnd - chartStart)/2;

labelWidth  = ctx.measureText(label).width;
labelHeight = CHART_RULER_LABEL_FONT_SIZE;              // 22
rulerLabelPadding = CHART_DATE_LABEL_PADDING * 2;      // 2

ctx.lineWidth=3; ctx.setLineDash([]); ctx.fillStyle="white"; ctx.strokeStyle="black";
ctx.roundRect(labelX - labelWidth/2 - 2, yHigh - 11 - 2 - 1, labelWidth + 4, 22 + 4, 2);
ctx.stroke(); ctx.fill();
ctx.fillStyle="black"; ctx.fillText(label, labelX, yHigh);
```

### 11.7 `drawAstroIndicators(chart)` — `CD:738-797`

```js
ctx.textAlign="center"; ctx.textBaseline="middle";
xAxisYPos = scales.y.getPixelForValue(0);

// Pass 1 — connector lines from each icon up to every date label it matched:
for each astroPoint:
    x = scales.x.getPixelForValue(astroPoint.xPoint);
    y = xAxisYPos + (type == LUNAR_PHASE ? 70 : 100);
    for each ms in astroPoint.date_connections_in_millis:
        for each labelPoint in chart.date_label_points:
            if (labelPoint.xPoint == ms) {                 // ⚠ exact numeric equality
                dateLabelBottom = labelPoint.yPointPixels + labelPoint.height/2;
                drawIndicatorLine(ctx, x, y, labelPoint.xPointPixels, dateLabelBottom);  // dashed [4,4]
            }

// Pass 2 — icons, painted in z_index ascending order (higher z_index last / on top):
for each astroPoint:
    size = (type == LUNAR_PHASE ? CHART_MOON_SIZE /*30*/ : CHART_ECLIPSE_SIZE /*30*/);
    ctx.drawImage(astroPoint.loaded_image, x - size/2, y - size/2, size, size);
```

Astro icons are the **last thing drawn**, so they sit on top of date labels and everything else.

---

## 12. Hit testing — `doChartHitTests(chart, event, isClick)` — `CH:245-433`

```
doChartHitTests(chart: Chart, event: MouseEvent|ChartEvent, isClick: boolean): void
```

Side effects: mutates `appState.latestResults.highlighted_z_date_point` / `.highlighted_operation_result_curve`, sets the canvas cursor, may call `updateChartDatasets()` and `scrollOutputRowIntoView()`.

Called from exactly two places:
* `options.onHover` on every `mousemove` with `isClick = false` (`CH:517-524`) — **hover only changes the cursor**, never the highlight.
* the canvas `mouseup` handler with `isClick = true` when the drag distance ≤ 5 px (`CH:110-113`).

Preamble:

```js
position_pixels = Chart.helpers.getRelativePosition(event, chart);
positionX_data  = chart.scales.x.getValueForPixel(position_pixels.x);   // epoch ms
positionY_data  = chart.scales.y.getValueForPixel(position_pixels.y);   // arc units
mousePoint_data = new GeoPoint(positionX_data, positionY_data);
```

**All hit tests are performed in DATA space, with pixel radii converted to data-space radii** via `|scales.x.getValueForPixel(0) − scales.x.getValueForPixel(r)|` — a trick that only works because both scales are affine.

The four tests, in priority order (first hit wins and the function returns):

### Test 1 — Date labels (only when `mousePoint.y < 0`), `CH:252-288`

```js
labelHeight_data = |scales.y.getValueForPixel(0) - scales.y.getValueForPixel(date_label_points[0].height)|;
// iterate BACKWARDS (front-most first, matching paint order)
for (i = date_label_points.length-1; i >= 0; i--) {
    labelWidth_data = |scales.x.getValueForPixel(0) - scales.x.getValueForPixel(p.width)|;
    xPoint = scales.x.getValueForPixel(p.xPointPixels);     // the DISPLACED position
    yPoint = p.yPoint;
    if (mouse.x within [xPoint ± labelWidth_data/2] && mouse.y within [yPoint ± labelHeight_data/2]) → HIT
}
```
Note `labelHeight_data` is taken from `date_label_points[0]` **once** and reused for every label — fine only because all labels share `CHART_DATE_LABEL_FONT_SIZE`.

### Test 2 — Z-date hit-count symbols, `CH:290-323`

```js
rW = |x.getValueForPixel(0) - x.getValueForPixel(12.5)|;
rH = |y.getValueForPixel(0) - y.getValueForPixel(12.5)|;
for (i = z_date_symbol_points.length-1; i >= 0; i--)
    if (mouse.hitTestEclipse(x.getValueForPixel(p.xPointPixels), p.yPoint, rW, rH) <= 1) → HIT
```

### Test 3 — Z-date positions on the axis, `CH:325-351`

```js
rW = |x.getValueForPixel(0) - x.getValueForPixel(CHART_POINT_RADIUS__Z_DATE /*7*/)|;
rH = |y.getValueForPixel(0) - y.getValueForPixel(7)|;
for (i = 0; i < results.processed_z_dates.length; i++)      // FORWARD here, unlike 1 & 2
    if (mouse.hitTestEclipse(parseInt(key), /*y=*/0, rW, rH) <= 1) → HIT
```
This is a hit target at the exact `(zDateMillis, 0)` point on the axis — **even though no point is ever drawn there** (see G-2). It's an invisible 7-px grab handle.

### Test 4 — Arcs (only when `mousePoint.y > 0`), `CH:353-426`

```js
w  = CHART_CURVE_WIDTH__HIT_TESTING;                        // 7
wX = |x.getValueForPixel(0) - x.getValueForPixel(7)|;
wY = |y.getValueForPixel(0) - y.getValueForPixel(7)|;

for (i = 0; i < chart.data.datasets.length; i++) {
    op = datasets[i].operation_result;
    if (!op) break;                                          // ⚠ relies on the padding dataset being LAST
    ellipseX = op.x_date_native_start.getTime() + distanceBetweenXDateAndZDate(op)/2;
    ellipseY = 0;
    curveXOuter = ds.curve_x_radius + wX/2;   curveXInner = ds.curve_x_radius - wX/2;
    curveYOuter = ds.curve_y_radius + wY/2;   curveYInner = ds.curve_y_radius - wY/2;
    if (mouse.hitTestEclipse(ellipseX, ellipseY, curveXOuter, curveYOuter) <= 1 &&
        mouse.hitTestEclipse(ellipseX, ellipseY, curveXInner, curveYInner) >= 1) → HIT   // annulus
}
```
The arc is treated as a **7-px-thick elliptical annulus** in data space. Because `chart.data.datasets` was sorted by `order` ascending, highlighted-pill curves (order 5) are tested first, then row-highlighted (6), then alpha operations (7), then default (8).

The odd `if (ithOperationResult) { /* continue; */ } else { break; }` at `CH:362-367` is a no-op-then-break; the intent is simply "stop at the first non-curve dataset".

### On a hit (`isClick === true` and the target is not already highlighted)

```js
clearChartHovers(/*callUpdateChartDatasets=*/false);        // clears table row/pill attributes only
results.highlighted_z_date_point        = <key>;
results.highlighted_operation_result_curve = <opResult or null>;
updateChartDatasets(results);                                // full rebuild → recolour
scrollOutputRowIntoView(<key>);
```

For an **arc** hit specifically (`CH:392-419`) it additionally:
* uses `ithOperationResult.z_date_dict_key` as the point key,
* scrolls using `String(ithOperationResult.z_date_native_start.getTime())`,
* finds the pills in the returned row, sets `chart_hover="true"` on the one whose `operation_result_hash` equals `operationResult.hash`,
* then calls `scrollIntoView({behavior:"smooth", block:"center", inline:"start"})` on **every** pill in the row (the call is outside the `if`, `CH:416`).

### On no hit

`setChartMousePointerToHand(false)` → `cursor:"default"`; and if `isClick`, `clearChartHovers()` (with the default `callUpdateChartDatasets = true`, so the chart rebuilds and un-highlights).

### `clearChartHovers(callUpdateChartDatasets = true)` — `CH:207-233`

Only does anything if `highlighted_z_date_point != null || highlighted_operation_result_curve != null`. Then:
nulls both, optionally `updateChartDatasets()`, and sets `chart_hover="false"` on **every** `.z_date_output_row` and every `.z_match_with_tool_tip` in the document.

⚠ It never clears `highlighted_z_date_row` or `highlighted_operation_result_pill` — those are owned by the results table (`src/ophis_view__output.js:662-760`).

---

## 13. Chart ↔ results-table linkage

Bidirectional, through four fields on `appState.latestResults`:

| Field | Type | Written by | Read by the chart |
|---|---|---|---|
| `highlighted_z_date_point` | `string \| null` (epoch-ms key) | **chart** (`CH:274,310,339,396`) | arc colour (`CD:873`), label highlight (`CD:409,426`), symbol highlight (`CD:587,602`), point radius (`CD:807`) |
| `highlighted_operation_result_curve` | `OperationResult \| null` | **chart** (`CH:397`) | arc colour (`CD:881`), ruler trigger (`CD:636`) |
| `highlighted_z_date_row` | `string \| null` | **table** (`src/ophis_view__output.js:662,669` — row `mouseenter`/`mouseleave`, value from the row's `z_date_key` attribute) | arc colour (`CD:873`), label highlight, symbol highlight |
| `highlighted_operation_result_pill` | `OperationResult \| null` | **table** (`src/ophis_view__output.js:755,757` — pill hover) | arc colour (`CD:881`), ruler trigger and target (`CD:636-637`) |

Table → chart repaint goes through `updateChartDatasetsFromRowHighlightingChange()` (`src/ophis_view__output.js:700`) → `updateChartDatasets(appState.latestResults)`.

Chart → table goes through `scrollOutputRowIntoView(zDateDictKey)` — `CH:435-452`:

```
scrollOutputRowIntoView(zDateDictKey: string) -> HTMLElement | null
```
* No-op returning `null` unless `getCurrentScreen() == OPHIS_SCREEN__Z_DATES`.
* Scans `document.getElementsByClassName("z_date_output_row")` for `getAttribute("z_date_key") == zDateDictKey`.
* On match: `scrollIntoView({behavior:"smooth", block:"center", inline:"start"})`, `setAttribute("chart_hover","true")`, return the row.

**Every highlight change causes a full `updateChartDatasets()` rebuild** — all curve datasets are regenerated from scratch, including the arc point rotation and the whole fan-out pass. That is the app's hot path.

---

## 14. Data structure shapes

```ts
// ── produced by ophis_view__chart_datasets.js ────────────────────────────────

type AstroPoint = {                              // newAstroIndicatorPoint(), CD:968-976
  xPoint: number;                                // epoch ms of the icon's position
  loaded_image: HTMLImageElement;                // from CHART_IMAGES
  date_connections_in_millis: number[];          // epoch ms of every X/Z date within tolerance
  astro_indicator_type: "ASTRO_INDICATOR_TYPE__LUNAR_PHASE" | "ASTRO_INDICATOR_TYPE__ECLIPSE";
  z_index: number;                               // from the field descriptor: moons 5,
                                                 //   partial-lunar 7, partial-solar 8,
                                                 //   full-lunar 9, full-solar 10
};

type ZSymbolPoint = {                            // newZDateSymbolPoint(), CD:978-987
  xPoint: number;                                // parseInt(zDateDictKey) — epoch ms
  yPoint: number;                                // 0 at construction; overwritten each draw
  loaded_image: HTMLImageElement;
  width: 25;                                     // = Z_DATE_SYMBOL_SIZE, used by the spreader
  zDateDictKey: string;
  zDateTags: ZStruct;
  // injected by organizeEntitiesIntoCollisionGroups / spreadZDateSymbols:
  overlaps?: ZSymbolPoint[]; visited?: boolean;
  xPointPixels?: number; xPointPixelsOrig?: number;
};

type DateLabelPoint = {                          // newDateLabelPoint(), CD:989-1000
  xPoint: number;                                // epoch ms
  yPoint: number;                                // 0 at construction; = data-space y each draw
  date_shorthand: "X" | "Z";
  date_ordinal: number;                          // the number rendered inside the box
  width: number;                                 // round(measuredTextWidth) + 2*2 + 2*1  = +6
  height: number;                                // = CHART_DATE_LABEL_FONT_SIZE = 22
  zDateDictKey?: string;                         // undefined for X-dates
  zDateTags?: ZStruct;                           // undefined for X-dates
  // injected at draw time:
  yPointPixels?: number; xPointPixels?: number; xPointPixelsOrig?: number;
  overlaps?: DateLabelPoint[]; visited?: boolean;
};

type CurveDataset = {                            // newChartDatasetFromOperationResult(), CD:912
  // ---- Chart.js-understood ----
  lineTension: 0.333;                            // INERT (G-1)
  data: {x:number, y:number}[];                  // exactly 15 points
  borderColor: string;
  segment: { borderColor: (ctx) => string };
  borderWidth: 1 | 2 | 4 | 5;
  order: 5 | 6 | 7 | 8;
  pointRadius: 0; pointHoverRadius: 0;
  // ---- app-private ----
  operation_result: OperationResult;
  curve_x_radius: number;                        // ms; NEVER mutated after construction
  curve_y_radius: number;                        // ms; MUTATED twice by fanOutOverlappingCurves
  point_scale_factor?: number;                   // added by fan-out phase A
  operation_result_hash: string;
  xPoint1: number;                               // X-date epoch ms
  xPoint2: number;                               // Z-date epoch ms
  overlaps?: CurveDataset[]; visited?: boolean;  // added by the grouper
};

// ── consumed from the model (defined elsewhere) ──────────────────────────────

type ResultsStruct = {
  errors: any[];                                 // non-empty ⇒ chart refuses to render
  processed_z_dates: string[];                   // ordered epoch-ms STRING keys (the table order)
  z_structs: { [epochMsString: string]: ZStruct };
  stale?: boolean;                               // ⇒ chart canvas rendered at opacity 0.5
  highlighted_z_date_point: string | null;
  highlighted_operation_result_curve: OperationResult | null;
  highlighted_z_date_row: string | null;
  highlighted_operation_result_pill: OperationResult | null;
};

type ZStruct = {                                 // src/ophis_model__operations.js:564-579
  z_date_native_start: Date;  z_date_native_end: Date;  z_date_native: Date;
  z_date_readable_start / _end / _start_no_html / _end_no_html : string;
  operation_match_structs: { y_struct: YStruct, operation_result: OperationResult }[];
  msrf_match_structs:      { msrf_filter, y_struct, operation_result, … }[];
  score: number;
  hit_count: number;                             // drives arc colour AND symbol choice
  z_ordinal: number;                             // 0-based chronological rank  (:163)
};

type OperationResult = {                         // src/ophis_model__operations.js:392-410
  z_value; rotation_count_y: number; rotation_count_z: number;
  z_date_native; z_date_native_start: Date; z_date_native_end: Date;
  x_date_native_start: Date;                     // the X-date the Z-value was added to
  x_date_native_other: Date;                     // the other X-date of the pair
  operation_ordinal: number;                     // index into isoEvent.effective_operations
  operation; hash: string; hash_without_ordinal: string;
  z_date_dict_key: number;                       // ⚠ a NUMBER here, while processed_z_dates holds STRINGS
};
```

---

## 15. Colour palette — token list

| Token | Value | Where |
|---|---|---|
| `chart.bg` | `white` | `CH:459` (`fillRect` wipe) |
| `chart.axis` | `black`, 2 px solid | `CH:462-464` |
| `chart.grid.x` | Chart.js default (`rgba(0,0,0,0.1)`), 2 px | `CH:660` — `CHART_COLOR__GRID_LINE` is dead |
| `curve.hits.1` / `curve.hits.2` | `rgba(0,0,0,1.0)` | `CC:27-28` |
| `curve.hits.3` | `rgb(253, 218, 13,1.0)` — cadmium yellow `#FDDA0D` | `CC:29` |
| `curve.hits.4` | `rgb(0, 150, 255, 1.0)` — bright blue `#0096FF` | `CC:30` |
| `curve.hits.5plus` | `rgb(210, 43, 43, 1.0)` — cadmium red `#D22B2B` | `CC:31` |
| `curve.highlight.group` | `rgb(91, 202, 102)` — green `#5BCA66` | `CC:35` |
| `curve.highlight.individual` | `red` | `CC:36` |
| `curve.segment.hidden` | `rgba(0,0,0,0)` (`COLOR__TRANSPARENT`) | `CD:920` |
| `label.x.fill` / `label.x.text` | `white` / `black` | `CD:329,336` |
| `label.z.fill` / `label.z.text` | `grey` / `white` | `CD:329,336` |
| `label.z.highlight.border` + `.text` | `rgb(91, 202, 102)` | `CD:330,336` |
| `label.border` | `black`, 3 px | `CD:327,330` |
| `leader.line` | `black`, 1 px, dash `[1,3]` | `CD:413` |
| `axis.tick.marks` | `black`, 3 px solid, 7 px long | `CD:402-405` |
| `astro.connector` | `black`, 1 px, dash `[4,4]` | `CD:718` default |
| `symbol.droplime` | `black`, 1 px, dash `[4,4]` | `CD:591` |
| `ruler.stile` | `black`, 2 px solid | `CD:65-67` |
| `ruler.line` | `black`, dash `[5,5]` | `CD:74-78` |
| `ruler.label.fill` / `.border` / `.text` | `white` / `black` 3 px / `black` | `CD:102-114` |
| `padding.points.fill` | `#00000000` (transparent) | `CD:1493` |
| `padding.points.border` | Chart.js default `rgba(0,0,0,0.1)`, 1 px | not set → `lib/chart.js` point defaults |
| `msrf.normal` (dead in chart) | `#2ede69` | `src/ophis_view__config.js:27` |
| `msrf.important` (dead in chart) | `#b80b0b` | `:28` |
| `msrf.vortex` (dead in chart) | `purple` | `:29` |

---

## 16. Portability — what is Chart.js-specific vs. reusable

**Hard Chart.js-4 couplings (must be re-provided by any replacement renderer):**

* `chart.scales.x.getPixelForValue / getValueForPixel` and the `y` equivalents — used ~40 times; every layout algorithm is written in terms of them.
* `chart.scales.x.min / .max` (read for ruler clamping, written in `updateChartDatasets`).
* `chart.canvas.getContext("2d")`, `chart.canvas.width/height`.
* Plugin hooks `beforeDraw` / `afterDraw` / `afterEvent`.
* `options.scales.x.type = 'time'` + the Luxon adapter's `adapters.date.zone` (mutated per event scope).
* `dataset.order` semantics (higher = further back).
* `dataset.segment.borderColor(context)` with `context.p0DataIndex` / `p1DataIndex` — this is how the alpha ramp is achieved; a replacement needs per-segment stroking.
* `Chart.helpers.getRelativePosition(event, chart)`.
* `chart.update()`, `chart.destroy()`.
* chartjs-plugin-zoom: `chart.resetZoom(mode)`, `chart.isZoomedOrPanned()`, `chart.zoomScale(axis, {min,max}, mode)`, and the `onZoom` / `onZoomComplete` / `onPan` / `onPanComplete` / `onPreZoom` callbacks.

**Fully portable (pure functions of numbers — copy verbatim):**

`getNormalizedSolarEclipseType` · `getNormalizedLunarEclipseType` · `binarySearchForEclipse` · `getLunarPhase` ·
`testRangeOverlap` · `hitTestPoints` · `hitTestSingularEntities` · `organizeEntitiesIntoCollisionGroups` ·
`spreadZDateSymbols` · `areSymbolGroupsEqual` · `fanOutOverlappingCurves` (except the one `getElementById(...).clientWidth` read) ·
the arc point generation loop · the alpha-ramp formula · `getSymbolAxisOffset` · `optimizeEclipseData` ·
all of `newAstroIndicatorPoint` / `newZDateSymbolPoint` / `newDateLabelPoint` / `newChartPoint`.

**Portable with a Canvas2D context only** (no Chart.js beyond the two scale transforms):
`drawRuler`, `drawIndicatorLine`, `drawDateLabel`, `drawXAxis`, and the bodies of the four `draw*` entry points.

A sensible rebuild: keep D3-style scale objects exposing `toPixel(value)` / `toValue(pixel)`, implement zoom/pan yourself, and render everything — including the arcs — with plain Canvas 2D. Chart.js is carrying almost no weight here.

---

## 17. GOTCHAS

**G-1 — `lineTension` is inert; the arcs are 13-segment polylines, not splines.**
`CD:913` sets `lineTension: CHART_SPLINE_TENSION (0.333)`. That was the Chart.js **v2** option name. In v4.4.1 the option is `tension` (default `0`), and the string `lineTension` **appears zero times in `lib/chart.js`** (verified by grep). So the "spline tension" the constant advertises is never applied: each arc renders as 13 visible straight segments approximating a half-ellipse at 15° per segment. With `CHART_CURVE_COMPLEXITY = 12` this is smooth enough that nobody noticed. A reimplementation that *does* honour tension will produce visibly different (rounder, slightly wider) arcs. Decide deliberately which you want.

**G-2 — X-date and Z-date point datasets are built and then thrown away.**
`newChartDatePointDataset()` (`CD:799`) produces full Chart.js dataset objects with `pointRadius`, `pointBackgroundColor:"black"`, `pointHoverRadius`, and `order`. The Z-date call site is commented out (`CD:1430-1431`), and the X-date objects only feed `generateDateLabelDatasets()`. `finalDatasetArray = curveDataSets.concat(paddingDataSet)` (`CD:1506`) — **no point datasets ever reach the chart.** There are therefore **no visible dots on the axis**, yet Test 3 in `doChartHitTests` (`CH:325-351`) still hit-tests a 7-px radius at every Z-date's `(millis, 0)`. Users get an invisible click target. `CHART_POINT_RADIUS__X_DATE`, `CHART_POINT_RADIUS_HOVER`, `CHART_DATASET_ORDER__X_DATE_POINT`, `CHART_DATASET_ORDER__Z_DATE_POINT` are all effectively dead.

**G-3 — the datalabels plugin is registered but produces nothing.**
`Chart.register(ChartDataLabels)` runs at `src/ophis_main.js:254`, and a full `plugins.datalabels` block exists (`CH:571-597`). Its `formatter` returns `context.dataset.date_label` — but **no dataset anywhere in the codebase sets a `date_label` property** (grep confirms). The formatter therefore always returns `null`, and datalabels renders nothing. The `X₁`/`Z₇` boxes you see are hand-drawn by `drawDateLabels`. You can drop the dependency entirely.

**G-4 — `options.interactions` is a typo for `interaction`.**
`CH:537-540` sets `interactions: { mode: null }`. Chart.js reads `options.interaction`. So the intended "disable built-in hit testing" never took effect; Chart.js's default `interaction.mode = 'nearest'` remains. The author's own comment (`CH:534-536`) says they *wanted* to disable it but couldn't because of point-radius jumping — the typo made the decision for them. Harmless only because `tooltip.enabled = false` and `pointHoverRadius = 0` on every real dataset.

**G-5 — assigning `chart.scales.x.min/max` before `update()` does nothing.**
`CH:834-835` writes directly to the live scale instance. `chart.update()` immediately re-runs `configure()` / `determineDataLimits()` and recomputes both from the data and options. The **actual** bounds come from the `paddingDataSet`'s four corner points (`CD:1481-1495`). If you remove the padding dataset thinking `scales.x.min/max` is doing the work, the chart will silently re-fit to the arcs alone and lose the ±1-day margin and the 40 %/5 % vertical headroom.

**G-6 — `xMin` uses the first *enabled* X-date, not the earliest.**
`CD:1460`: `xMin = xDatesInMillis[0] - MILLIS_PER_DAY`. `xDatesInMillis` is in `isoEvent.x_dates` **array order**, not sorted. If the user enters X-dates out of chronological order (or disables the earliest one), `xMin` is not the leftmost point and the left-most arc foot will sit outside the padding rectangle. Similarly, if any enabled X-date is later than `furthestZDate`, it falls outside `xMax`.

**G-7 — negative spans (Z before X) are unhandled.**
`distanceBetweenXDateAndZDate()` is signed. `longestSpanBetweenXDateAndZDate` is only updated on `>` from an initial `0` (`CD:1454`), so an all-backwards result set leaves it at `0` → `largestCurveRadiusBeforeFanning = 0` → phase-A `diff` is negative → arcs **shrink** instead of lift, `largestCurveYRadius` ends up ≤ 0, and `yMin`/`yMax` collapse. Also `curve_x_radius` / `curve_y_radius` go negative, which `hitTestEclipse` tolerates (it squares them) but the ruler clamping and the padding maths do not. Guard on `Math.abs()` or reject backwards projections explicitly.

**G-8 — `dashStyle` is used one line before it is declared.**
`CD:405` passes `dashStyle` to `drawIndicatorLine`; `var dashStyle = [1,3]` is declared at `CD:413`. `var` hoisting makes the value `undefined` at line 405, so the parameter default `[4,4]` kicks in. It doesn't matter today because that call passes `dashed = false`, but any refactor that makes those ticks dashed will silently get `[4,4]` instead of `[1,3]`.

**G-9 — `drawRulers` will throw if the highlighted operation result has no dataset.**
`CD:642-652` searches `chart.data.datasets` for `ithDataset.operation_result == operationResultForZDelta`, then dereferences `curveDataset.curve_y_radius` **without a null check**. `highlighted_operation_result_pill` is set by the results table; if the table and the chart disagree about which Z-dates survive filtering (or if the pill is hovered while the chart is showing an error state with `datasets = []`), this is a `TypeError` inside `afterDraw` on every frame.

**G-10 — `drawRulers` computes a `borderColor` that is never used, into an implicit global.**
`CD:685-693` assigns `borderColor = COLOR__MSRF_NORMAL | _IMPORTANT | _VORTEX` **without `var`/`let`** — in non-strict mode this creates/overwrites `window.borderColor`. The value is never read (the intended feature is documented at `CD:660-661`: *"Not used right now, but may be used to add decoration to the ruler line to indicate an MSRF match."*). The `msrfMatchStruct` scan above it also loops over every Z-date without breaking, so it keeps the **last** match, not the first.

**G-11 — `showChartError` clears datasets but leaves the custom overlay arrays.**
`CH:38-39` sets `chart.data.labels = []` and `chart.data.datasets = []`, but `chart.date_label_points`, `chart.z_date_symbol_points`, and `chart.astronomical_points` keep their previous values. `afterDraw` still runs, so **stale date labels, symbols, and moon icons can be painted over an "error" chart**. It is masked only because `hideChartElem()` sets the canvas opacity to 0. Any change to the hide mechanism exposes this.

**G-12 — `drawDateLabels` hard-depends on `chart.astronomical_points` being an array.**
`CD:394` reads `chart.astronomical_points.length` with no guard, while the two sibling functions do guard their arrays. On the very first `afterDraw` of a freshly constructed chart (before `updateChartDatasets` assigns them) this would throw — currently avoided only because `newChart()` is always immediately followed by the assignment, and by `doBeforeOrAfterDraw()` returning false when the chart is hidden.

**G-13 — Z-date labels use `z_ordinal + 1`, not the row index.**
`CD:216`: `ithZOrdinal = ithZDateTags.z_ordinal + 1`, where `z_ordinal` is the **chronological** rank assigned in `src/ophis_model__operations.js:163`. The `ordinal = i + 1` computed from `processed_z_dates` order at `CD:1428` is discarded. So `Z₃` on the chart is the third Z-date *by date*, which need not be the third row in a score-sorted results table. X-labels, by contrast, use the raw `x_dates` array index + 1 (`CD:1407`) **including disabled entries**, so disabling X₂ yields chart labels `X₁, X₃`.

**G-14 — moons are not re-rounded to midnight; eclipses are.**
`CD:1177-1182` deliberately skips a second `roundMillisToNearestMidnightInTimeZone` for moon phases (commented out with an explanation), while the eclipse branch at `CD:1213-1217` performs exactly that rounding. A reimplementation that "harmonises" these will shift moon icons by up to a day.

**G-15 — `timeZone` can be the empty string.**
`CD:1014` sets `timeZone = ""` when the scope is neither `HH_MM` nor GMT-locked `DAYS`. It is never used in that branch today (the rounding calls are gated on the same conditions), but it is passed into `roundMillisToNearestMidnightInTimeZone` in the eclipse branch (`CD:1213-1217`) which is gated on `isoEvent.scope`, so the two gates agree. Fragile.

**G-16 — the `\u{1F506}` emoji in `ECLIPSE_DICT` is a red herring.**
All four entries carry `imagePath: "\u{1F506}"` (🔆). Nothing reads it. Eclipse icons come from `CHART_IMAGES[eclipseType]`, loaded from four distinct PNGs at `CC:167-170`. Do not "fix" the dict by rendering the emoji.

**G-17 — `loadAstroIndicators` has no failure path and gates app boot.**
See §4.8. Sixteen images must all fire `onload` or `init_step4_selfCheck` never runs. Add `onerror` handling in the rebuild.

**G-18 — the alpha ramp is implemented with `String.replace("1.0", alpha)`.**
`CD:929`. It works only because every hit-count colour literal happens to end in `,1.0)` and contains no other `"1.0"` substring. Change `rgb(0, 150, 255, 1.0)` to, say, `rgb(0, 151.0, 255, 1)` and the ramp silently corrupts the green channel. Use a real colour object.

**G-19 — recursion in `visitEntity`.**
`CD:286-297` is a recursive DFS with no depth limit. With hundreds of mutually-overlapping labels at a far-out zoom level, this is a stack-overflow risk. The surrounding grouping is also **O(n²)** and runs on **every frame** (inside `afterDraw`), twice (labels and symbols), up to 11 times each (initial + 10 relaxation iterations). This is the chart's dominant cost.

**G-20 — the fan-out hit test is asymmetric and dimensionally confused.**
`CD:1270-1288` derives `scaling` from `ithEntity` only (`chartCanvasWidth / (ith.xPoint2 − ith.operation_result.x_date_native_start.getTime())`), then applies it to `kthEntity`'s coordinates and offsets everything from the *global* `chartXMin`. `hitTest(a,b) !== hitTest(b,a)` in general. `organizeEntitiesIntoCollisionGroups` calls it only once per unordered pair (`k = i+1`) and pushes both directions on a hit, so the grouping is deterministic — but it depends on array order. Note also the typo `ithRanage`.

**G-21 — `scaleCurvePoints` skips `data[0]`.**
`CD:1296` starts at `m = 1`. Point 0 is the below-axis lead-in vertex. It keeps its original `y = −0.259·R_original` while points 1..14 are scaled. Since segment 0→1 is drawn transparent, this is invisible — but if you ever make that segment visible, the arc will have a discontinuity at its left foot.

**G-22 — `dblclick` also fires `mousedown`/`mouseup`, so a double-click both hit-tests and recenters.**
`CH:83-86` and `CH:102-117` are both live. A double-click on a Z-symbol will select it (first click) and then reset the zoom (`dblclick`).

**G-23 — the canvas is wiped with `canvas.width/height` (device pixels) while the context carries a DPR transform.**
`CH:460`. On a 2× display this paints a rectangle twice the CSS size. Harmless over-coverage, but it also means the axis line at `CH:467` is drawn to `canvas.width` — well past the visible right edge. Don't "optimise" this into `chartArea` bounds without checking the visual.

**G-24 — `showChartError` writes user-visible strings via `innerHTML`.**
`CH:30`/`CH:33`. All current call sites pass literals, but `NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT` and future error text flow straight into the DOM unescaped. (`purify.min.js` is bundled but not used here.)

**G-25 — `eventPlugin.afterEvent` is an empty shell.**
`CH:501-511` registers a plugin whose only branch (`mouseleave`) has its body commented out, plus `plugins.eventPlugin.events = ['mouseleave']` in options. Dead weight; the author left a paragraph explaining why auto-clearing hovers on mouse-leave was abandoned.

**G-26 — Z-date symbols ignore the y scale entirely.**
`CD:581`: `yPosInPixels = Z_DATE_SYMBOL_SIZE * 2.5` — a constant **62.5 px from the top of the canvas**. Zooming or panning vertically moves the arcs and the axis but leaves the symbols pinned to the viewport top, while their drop-lines stretch to follow the axis. The `getSymbolAxisOffset` machinery (`CD:117-145`, `CD:569-578`) that would have placed them proportionally is computed and immediately discarded.

**G-27 — two `var chart` declarations in `updateChartDatasets`.**
`CH:738` and `CH:816` in the same function scope. Legal, and they resolve to the same value, but a reader can easily mistake the second for a fresh read that would pick up a chart replaced in between (it can't — nothing replaces it between those lines).

**G-28 — `sLastIsoEvent` is assigned *before* any early return.**
`CH:736`. If `updateChartDatasets` bails out at the "Chart Hidden" / errors / no-results branches, `sLastIsoEvent` has already been advanced, so the *next* call sees `isDifferentIsoEvent === false` and skips the chart re-creation and the saved-viewport restore. Switching to a new event while it has validation errors, then fixing them, leaves the chart on the previous event's Chart.js instance until something else forces a rebuild. (`appState.justFixedErrors` → `recenterChart()` partially papers over this.)

**G-29 — `parseIntElseNeg1` never returns `-1`.**
`src/ophis_utils.js:232-249`: `parseInt("garbage")` returns `NaN`, and `NaN != null` is `true`, so the function returns `NaN`. Used at `CD:1208` on eclipse map keys — safe there (they are always numeric strings), but do not rely on the `-1` sentinel.

**G-30 — `highlighted_z_date_point` holds a NUMBER after an arc click and a STRING otherwise; every comparison relies on loose `==`.**
`z_structs` keys and `processed_z_dates` entries are epoch-ms **strings** (`src/ophis_model__operations.js:553`:
`nativeDateToUtcMillis(...) + ""`), and `DateLabelPoint.zDateDictKey` / `ZSymbolPoint.zDateDictKey` inherit that.
But `operationResult.z_date_dict_key` is a **number** (`src/ophis_model__operations.js:367,409`:
`zDate_native_start.getTime()`), and the arc-hit branch assigns it directly:
`appState.latestResults.highlighted_z_date_point = ithOperationResult.z_date_dict_key;` (`CH:396`).
Every downstream comparison — `CD:807`, `CD:873`, `CD:409`, `CD:426`, `CD:587`, `CD:602`, `CH:268`, `CH:304`,
`CH:333`, `CH:442` — uses `==` / `!=`, so `"1767225600000" == 1767225600000` is `true` and it all works by accident.
**Port this to `===` (or to TypeScript) and clicking an arc will stop highlighting its label, symbol, and row.**
Normalise the key type at the boundary.

**G-31 — a stray `// debugger;` and a magic literal in the fan-out.**
`CD:1325-1327`: `if (kthCurveDataSet.operation_result.rotation_count_z == 2314.2) { // debugger; }` — a leftover debugging probe whose condition still evaluates on every curve of every multi-member group. (The project's own docs flag `ophis_view__chart_datasets.js:1366` for a `debugger;`, but at the version in this tree line 1366 is inside the large commented-out block at `CD:1348-1385`.)

---

## 18. Open questions

1. **Does the author know the arcs are polylines?** `CHART_SPLINE_TENSION = 0.333` is presented as tuned, but `lineTension` is a v2 key. Was the app ported from Chart.js v2 and this never revisited? Determines whether the rebuild should render true splines.
2. **Was the invisible Z-date axis hit target (Test 3) intentional?** The point datasets that would have drawn it are commented out, but the hit test survives. Keep the invisible grab handle, or draw a dot?
3. `chart.x_date_points` / `chart.z_date_points` are commented out at `CH:831-832` but nothing reads them anyway — was there a fourth overlay layer planned?
4. The MSRF-coloured ruler decoration (`CD:660-661`, G-10) is stubbed. Is it wanted in the rebuild?
5. `CHART_CURVE_WIDTH__ONE_HIT` and `__TWO_HITS` are both `1`, and `__THREE/FOUR/FIVE` are all `2` — the five-way split exists only for colour. Intentional, or an abandoned width ramp?
6. `optimizeEclipseData` is unreachable (its call sites are commented out at `src/ophis_main.js:213-214`). Confirm the shipped `*_processed.js` tables were generated by exactly this function, or the B.C./penumbral filtering rules may not match what's actually in the data.
7. `handleJustChangedFields(isoEvent, indicatorsThatOverlappedDates)` — the toast copy and exact trigger conditions live in `src/ophis_view__utils.js:880+` and were not in scope. Its contract with the chart is only: *"here is the set of `serialized_field` var-names whose indicators actually matched at least one date."*
