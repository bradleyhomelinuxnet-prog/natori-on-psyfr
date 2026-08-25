# 14 — Domain Knowledge, Prior Analysis, and Visual Style

**Subsystem:** Domain glossary · cycle-constant catalogue · distilled prior reverse-engineering reports · the original design system (`src/ophis.css`) · the PNG asset library · repo TODO/roadmap inventory.

**Purpose of this document.** Everything a reimplementer needs that is *not* algorithm code: the vocabulary, the magic numbers and where they come from, what the two earlier RE passes established (and where they are wrong), exactly what the original UI looked like down to hex values, what the ~1400 bundled PNGs are, and which code comments describe unbuilt features. A competent engineer should be able to name things correctly, reproduce the look, and wire up assets from this document alone.

**Sources read in full for this document**

| File | Lines | Role |
|---|---|---|
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/Ophis_v12_ReverseEngineering_Report.md` | 339 | The v12 paper |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/Ophis_v9_ReverseEngineering_Report.md` | 211 | The v9 paper |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/Ophis_v9_DeepDive_Addendum.md` | 837 | Compute trace + operation reference + MSRF analysis |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/SECURITY.md` | 41 | Findings quick-reference |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/src/ophis.css` | 880 | The complete original stylesheet |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/chronicon-clocks-calendrics.txt` | 1161 | Chronicon calendrics engine (HTML dump) |

**Corroborating files consulted** (cited where used, not exhaustively read): `README.md`, `README.txt`, `METHOD.md`, `ophis-xtras.txt`, `package.json`, `src/ophis_config.js`, `src/ophis_model__params.js`, `src/ophis_view__strings.js`, `src/ophis_view.js`, `src/ophis_view__chart_config.js`, `src/ophis_view__rebuild.js`, `src/ophis_main.js`, `test-bradley.oph`, `PSYFR1.html`.

---

## 1. DOMAIN GLOSSARY

Every term of art used in the code, the docs, or the `.oph` format. Terms are grouped: Ophis engine terms first, then the Archaix/Chronicon cosmology terms that the branding and the rewrite draw on.

### 1.1 Ophis engine terms

**Ophis** — The internal name of the application; `package.json:2` `"name": "Ophis"`, `APP_VERSION = "12.0"` at `src/ophis_config.js:3`. Greek *ophis* = "serpent". The app is described in `package.json:5` as *"A cross-platform desktop app for performing date sequence predicitive analytics based on the work of Jason Breshears of Archaix"* (typo "predicitive" is in the source). It is a date-projection / cycle-prediction tool dressed in financial-astrology (Gann-style) vocabulary, fully offline, no telemetry, no live market data.

**PSYFR / CYPHR** — The *brand* names used on the portfolio browser rewrites and the executive brief (`PSYFR.jpg`, `PSYFR1.html`, `PSYFR2.html`, `CYPHRExecutiveBrief.docx`). The codebase itself never says PSYFR; it always calls itself Ophis. Treat PSYFR/CYPHR as the product skin and Ophis as the engine name.

**NATORI-ON-PSYFR / OPHION / Natorion Oracle** — Names of successive single-file browser rewrites of the engine (`Natori-On-PSYFR-Main-UI.html`, `NatoriOphis.html`, `NatorionOracle-v1.0.zip`). `PSYFR1.html:6` titles itself *"NATORI-ON-PSYFR · The Predictive Chronology Engine"*; its save-file format tags itself `app:'OPHION'` (`PSYFR1.html:891`). The v12 report §7 establishes `PSYFR1.html ≡ Natori-On-PSYFR-Main-UI.html` (identical modulo CRLF and a leading space per line).

**Iso-Event** — Short for **Isometric Event**. Definitive in-app definition, verbatim from `src/ophis_view__strings.js:9`:

> `var HELP_MESSAGE__ISO_EVENTS_PANEL = "Iso-Event, short for Isometric Event, is an event that has repeated itself 2 or more times in the past, and will likely repeat again in the future.";`

An Iso-Event is the top-level user document object: a named cycle with its own X-Dates, T-Dates, operations, lat/long, scope, filters, chart options, scoring system, and sort type. A `.oph` file holds an array of them under key `"iso_events"`. In the UI they are addressed as `E₀`, `E₁`, … (`getRowShortNameHtml("E", index)`, `src/ophis_view.js:620`).

**X-Date** — An *input* anchor date. Verbatim from `src/ophis_view__strings.js:5`:

> `var HELP_MESSAGE__X_DATES_PANEL = "X-Dates are the primary type of Input data to the Ophis algorithms. At least 2 X-Dates are required to generate Output. Click the Add button above to get started.";`

Serialized shape is `{ date: "MM/DD/YYYY", time: "HH:MM", enabled: bool }` — confirmed in `test-bradley.oph` (`"date": "07/04/2026", "time": "00:00", "enabled": true`). `MINIMUM_NUMBER_OF_X_DATES = 2` (`src/ophis_config.js:16`). Displayed as `X₁`, `X₂`, … (1-based subscripts over a 0-based array).

**T-Date (Target Date)** — Introduced in v12; a *second* input date type. Verbatim from `src/ophis_view__strings.js:6`:

> `var HELP_MESSAGE__T_DATES_PANEL = "T-Dates (Target Dates) are a way to only show Z-Dates for the future dates that you are interested in, e.g. when a team will actually play again.";`

T-Dates are a **filter**, not a projection source — they narrow which Z-Dates get displayed. Serialized as `"t_dates": []` alongside `"x_dates"` (see `test-bradley.oph`).

**Y / axial rotation count** — The single variable the formula language exposes. For each ordered pair of enabled X-Dates `(X_k, X_i)` with `k < i`, Y is the count of **axial rotations** (whole Earth days) between them. Computed by `axialRotationsBetweenNativeDates()` in `src/ophis_utils.js`. Under non-HH:MM scopes it is a plain millisecond difference divided by `MILLIS_PER_DAY` and rounded to `DECIMAL_PRECISION__AXIAL_ROTATIONS = 1` decimal place (`src/ophis_config.js:371`). "Axial rotation" is the domain's insistence that a day is a *turning of the Earth*, not a calendar unit — the same conceptual move as the Chronicon's "sky-turnings" (§4.4).

**Operation** — A one-line equation string that converts Y into a day-offset. Shape on disk: `{ equation: string, weight: number, enabled: bool }`. Examples straight from `test-bradley.oph`: `"X2+oph_round(Y)"`, `"X1+(Y/2.0)xOPH_PI"`, `"X2+YxOPH_HEP"`. The mandatory `X1+` / `X2+` prefix selects the **anchor** the offset is added to. `x` (lowercase letter ex) is the user-facing multiplication token and is rewritten to `*` during normalisation. See §1.3 for the mini-language.

**Alpha operation / Beta operation** — Weight classes. Authoritative definitions, verbatim from `src/ophis_model__params.js:48-54`:

```js
function isAlphaOperation(operation) {
    return operation.weight >= POINTS__ALPHA_OPERATION_MATCH;   // >= 1
}
function isBetaOperation(operation) {
    return operation.weight < POINTS__ALPHA_OPERATION_MATCH;    // < 1
}
```

with `POINTS__ALPHA_OPERATION_MATCH = 1` and `POINTS__BETA_OPERATION_MATCH = .5` (`src/ophis_model__params.js:2-3`). The About screen states it in user language (`src/ophis_view.js:637`): *"Alpha Operations are those with a \"weight\" >= 1, otherwise it's a Beta Operation."* Alpha = the practitioner trusts it; beta = provisional. Alpha renders in `darkgoldenrod`, beta in `#00c0ff` (§5.3). Note the class is a *derived predicate over an arbitrary user-set weight*, not a stored enum — a user can type `weight: 0.75` and get a beta, or `2.0` and get an alpha.

**Z-Value** — The numeric day-offset an operation returns for a given Y, before it is added to an anchor. Rounded to `DECIMAL_PRECISION__TIME = 2` (`src/ophis_config.js:369`) for display; a **separate** 1-decimal rounding (`rotation_count_z`) is what the MSRF filter tests. About-screen wording (`src/ophis_view.js:618`): *"Distance between calendar X-Dates is in days, which will always be whole numbers/integers… Meanwhile a Z-Value (operation result in days) DOES have a decimal component, rounded to the nearest tenth."*

**Z-Date (a.k.a. Future Date)** — The projected output date: `anchorXDate + Z-Value days`. Z-Dates are bucketed by their start-of-day milliseconds, scored, filtered, sorted, and drawn on a timeline. `src/ophis_view.js:604` calls them *"Z-Dates (AKA Future Dates)"*.

**Y-struct / Z-struct** — Internal result containers. A `yStruct` = one X-pair plus every operation's result for that pair. A `zStruct` = one calendar day bucket, aggregating every operation result that landed on it plus its MSRF matches, score and hit count. Shapes are documented in `Ophis_v9_DeepDive_Addendum.md:205-237`.

**Hit / hit count** — `hit_count = operation_hit_count + msrf_hit_count` on a z-struct. On the chart, hit count is encoded by symbol shape, **not** by zodiac: `img/hit_symbols/{gemini,triangle,diamond,circle}.png` map to 2/3/4/5+ hits (`Ophis_v9_ReverseEngineering_Report.md:185`; sources at `src/ophis_view__chart_config.js:114-117`).

**Score** — Per-Z-Date cumulative number. Under `SCORING_SYSTEM__GTE_V8`: `score = (operationSubscore + msrfMatchSubscore) × msrfMultiplier`, where the single highest-multiplier MSRF match is *removed from the additive base* and used as the multiplier instead. Under `SCORING_SYSTEM__LTE_V7` there is no multiplier — points are simply summed. (`Ophis_v9_DeepDive_Addendum.md:133-141, 762-773`.)

**Ghost** — A Z-Date with a score of zero, historically excluded entirely. The wording survives only in a commented-out About-screen string at `src/ophis_view.js:632`: *"If a Z-Date has a score of zero then it's considered a ghost and excluded from the results entirely."* Treat "ghost" as a **legacy/dead term** — the behaviour is now an optional filter.

**MSRF** — The label on the three resonance number-sets that Z-rotation counts are matched against: `MSRF_FILTER__NORMAL`, `MSRF_FILTER__IMPORTANT`, `MSRF_FILTER__VORTEX` (`src/ophis_model__params.js:17,38,44`). **The acronym is never expanded anywhere in the source.** `Ophis_v9_DeepDive_Addendum.md:530-538` explicitly refuses to commit to an expansion, noting that the matched quantity is literally called `axialRotationCount`, which favours a rotation/frequency gloss over "Magnetic Solar Reference Frame". Reimplementers should keep the token `MSRF` opaque. A match is one of three classes and carries a CSS class name that crosses the model→view boundary: `"msrf_normal"`, `"msrf_important"`, `"msrf_vortex"`.

**Vortex number** — The 12 *decimal* MSRF values `21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4, 762.3, 871.2` (`src/ophis_model__params.js:44-46`). Unlike the two integer sets, vortex numbers match **within a tolerance** of `VORTEX_FILTER_MATCH_TOLERANCE = .1` (`src/ophis_config.js:367`), and they are checked **first**. About-screen wording (`src/ophis_view.js:619`): *"The exception to MSRF integers are the Vortex Numbers which DO have a decimal component and are matched if the Z-Value is equal +/- 0.1."* Structure: two groups of six, the second being the first ×10 (with rounding drift); consecutive deltas are all multiples of ≈10.9 with the ×5 term missing — a Rodin vortex-math signature (`Ophis_v9_DeepDive_Addendum.md:639-695`). Colour: `purple`.

**"Right in the middle" / the `.5` rule** — A Z-rotation whose 1-decimal string representation ends in `.5` matches **nothing**, short-circuiting before the integer sets are consulted. Source comment at `src/ophis_utils.js:200`: *"As per Jason, numbers 'right in the middle' are counted as no match."* About-screen phrasing (`src/ophis_view.js:619`): *"Z-Values like 11.5 or 12.5 will never match an MSRF integer since they are \"right in the middle\"."* This rule fires **after** the vortex check, so a `.5` value can still match a vortex number.

**Isometric Date** — The name for the identity projection `X2+oph_round(Y)`. Source comment `src/ophis_model__params.js:66`: `// 2. Y + X2 + Isometric Date`. If X1→X2 took Y days, X2→Z takes another Y days — the 1:1 baseline against which all curved projections are measured. Same root as "Iso-Event".

**Holo- / flipped date / holographic projection** — The name for `X2+oph_flip(oph_round(Y))`. Source comment `src/ophis_model__params.js:69`: `// 3. Y reversed + X2 (Holo-)`. "Holo-" is short for holographic: the mirror/reflection idea that the digit-reverse of a cycle length is itself a resonant cycle length ("as above, so below"). `Ophis_v9_DeepDive_Addendum.md:353-360, 522` calls it the least mathematically defensible operation — digit reversal is a base-10 artefact — while noting it ships α-weighted, which is a clear signal the tool is esoteric rather than scientific.

**`oph_flip`** — The digit-reversal helper implementing the Holo- projection. Algorithm (`Ophis_v9_DeepDive_Addendum.md:312-330`): stringify → record the index of `.` **from the left** → delete the `.` → reverse the digit string → reinsert `.` at the *same left-index* → parse. Because the decimal is reinserted at its original position *from the left*, results are non-obvious. Worked examples from the addendum: `123→321`, `100→1` (leading zeros dropped on parse), `12.5→52.1`, `3.14→4.13`, `100.5→500.1`, `0.25→5.2`.

**Curvature (`OPH_CRV`)** — π·φ. `CURVATURE_RAW = PI_RAW * PHI_RAW` at `src/ophis_config.js:376`; shipped value 5.08. Not a standard mathematical constant; a fusion of the two "resonant" constants into a single master-curve multiplier.

**Hepta-cycle (`OPH_HEP`)** — A 7-based cycle constant, hard-coded `var OPH_HEP = 7.01;` (`src/ophis_config.js:414`). Provenance is in the source comments: `src/ophis_model__params.js:108` `// New Hepta-Cycle Operation from Jason, Early-August 2025` (the X1 variant), and `:112` `// New Hepta-Cycle Operation from Jason but for this one Z-Value is added to X2, Late-December 2025` (the X2 variant, which is the 16th default op added in v12). The `.01` offset is unexplained in the source.

**Radius projection** — Named constant `OPERATION_EQUATION_FOR_RADIUS_PROJECTION = "X1+YxOPH_PI"` (`src/ophis_model__params.js:62`). Gann-style "treat Y as a radius, project the arc". It is promoted from β to α weight by the ≥v8 defaults clone.

**Original beta phi 6** — Named constant `OPERATION_EQUATION_FOR_ORIGINAL_BETA_PHI_6 = "X2+(Y/2.0)xOPH_PHI"` (`src/ophis_model__params.js:63`). The other operation promoted β→α by `cloneDefaultOperationsForAppVersionGte8()`. The name records that it *was* the 6th, β-weighted, φ-based op.

**Scope (`EVENT_SCOPE__*`)** — Per-Iso-Event time granularity: `HH_MM`, `DAYS`, `MONTHS`, `YEARS`. Only `HH_MM` engages the sunset machinery; every other scope discards the time-of-day component. Under `DAYS` with `FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT` enabled, lat/long are forced to 0/0 and dates are interpreted as midnight UTC (`Ophis_v9_DeepDive_Addendum.md:45-51`).

**Prior sunset** — The most recent sunset *before* an X-Date, possibly on the previous calendar day. Used only in `HH_MM` scope. Tooltip text is built at `src/ophis_view__rebuild.js:765`. There is a disabled feature flag `FEATURE_FLAG__SUNSET__ADD_Z_VALUE_TO_X_DATE_PRIOR_SUNSET = false`; the source comment at `src/ophis_config.js:300` records why: *"After feedback from Jason, Z-Value should be added to the exact X-Date and not Prior Sunset."* The sunset concept is the Jewish-calendar "day begins at sunset" convention — the About screen makes this explicit (`src/ophis_view.js:616`): sunset times use Meeus' *Astronomical Algorithms*, *"Jewish calendar websites generally use these methods."*

**Skin mode** — `SKIN_MODE__CLASSIC` / `SKIN_MODE__MARKETS`. Swaps `img/header.png` ↔ `img/header_markets.png` and the window title only (`src/ophis_view.js:46-50`). `Ophis_v9_ReverseEngineering_Report.md:202` quotes the author's comment calling Markets *"the beginning of an idea that never panned out really, but no harm keeping it under the hood."* No market data is ever fetched.

**Event type (`EVENT_TYPE__*`)** — `PERSONAL`, `MARKETS`, and a commented-out `ASTROLOGICAL`. v9 had MARKETS commented out of the enum; v12 uncommented it (`Ophis_v12_ReverseEngineering_Report.md:148`).

**Scoring system (`SCORING_SYSTEM__*`)** — `LTE_V7` (additive only) vs `GTE_V8` (highest MSRF class becomes a multiplier). Stored per Iso-Event.

**Z-Date sort type (`Z_DATE_SORT_TYPE__*`)** — `SCORE`, `DATE`, `MSRF`, `HIT_COUNT`, `OPERATIONS`.

**Save-blob mode (`SAVE_BLOB_MODE__*`)** — `EVERYTHING`, `JUST_THE_EVENTS`, `JUST_THE_GLOBAL_OPTIONS`. Under Electron with autosave on, disk gets just the events and localStorage gets just the global options; in a plain browser, localStorage key `"save_blob"` gets everything (`Ophis_v9_ReverseEngineering_Report.md:113`).

**`.oph` file** — The preset/document format. Plain UTF-8 JSON, optionally pretty-printed. Top-level keys `app_version`, `iso_events`, `global_options`. The extension is registered to the app in `package.json` (`"fileAssociations": [{ "ext": "oph", … }]`) — which is exactly what makes a hostile `.oph` the realistic attack vector (§3.4).

**File-input validation mode (`FILE_INPUT_VALIDATION_MODE__*`)** — New in v12: `STRICT`, `ORIGINAL`, `LOOSE`. LOOSE auto-repairs structural problems (bad lat/long → defaults, too few X-Dates → synthesised, missing event list → fresh event) instead of rejecting. **The v12 GUI defaults to LOOSE**; headless forces STRICT (`Ophis_v12_ReverseEngineering_Report.md:145`).

**Headless mode** — v12 CLI: `--headless`, `--output-type`, `--output-path`, `--input-validation-mode`, `--current-epoch-millis`, `--multiple-files`. Runs windowless, writes CSV. Console output is bridged to the CLI by `src/ophis_logging.js` (70 lines) overriding `console.*`.

**`electronBridge`** — The `contextBridge`-exposed IPC surface (`preload.js`). Renderer-callable methods observed at call sites: `saveFileAs`, `autoSaveToFile`, `openOphFile`, `onSignedIn`, `confirmCloseApp`, `logToCli`.

**Scratchpad** — `src/scratchpad.js` is a 2-line file containing only two commented-out lines that override the starting screen:

```js
// DEFAULT_STARTING_SCREEN = OPHIS_SCREEN__OPERATIONS;
// DEFAULT_STARTING_SCREEN = OPHIS_SCREEN__EVENT_SETTINGS;
```

It is a developer convenience hook loaded last in the script order. **A rebuild should not reproduce it** — it is a live-code injection point by design.

### 1.2 Archaix / Chronicon cosmology terms

These come from `chronicon-clocks-calendrics.txt` and the branding. They are the *worldview* the tool serves; none of them appear as identifiers in `src/`, but they drive the rewrites' operation packs (§2.4) and the visual language (§5.7).

**Archaix** — Jason Breshears' research project and website (Archaix.com). Unfolded in `chronicon-clocks-calendrics.txt:1079` as *"Advanced Research of Chronological History of Artificial Intelligence X"*. The repo `README.md:65` is careful: *"Ophis is a **worldbuilding & study instrument** after the Archaix thesis of Jason Breshears — presented as that thesis, not as established science… Not affiliated with Archaix."* Carry that disclaimer forward.

**Chronicon** — Breshears' master chronological corpus (`chronicon-clocks-calendrics.txt:1083`), and by extension the composite chronology the six-clock engine renders: `Archaix 2.0 Composite Chronology`, the `Doomsday Chronology`, and the `337 Archaix Charts` (`:478`).

**Annus Mundi (AM)** — "Year of the World"; the Ancient-World year count running from 3895 BC. Conversion, verbatim from `chronicon-clocks-calendrics.txt:485`: `AM = astro + 3894` (astronomical year numbering, where 1 BC = 0). Anchors: 2026 CE = AM 5920; the Great Flood = AM 1656 (2239 BC); 2022 CE = AM 5916; AM 6000 = 2106 CE.

**Phoenix / Sky Dragon** — The recurring planetary destroyer Breshears named, on a strict **138-year** lattice (`chronicon-clocks-calendrics.txt:949, 1080`). Grid definition in code: `const PHX = {mod:108, step:138, base:-4308};` (`:503`) — a year is a Phoenix node when `mod(astroYear, 138) === 108`. Node #1 is 4309 BC. Next visitation: 2040 CE.

**Nemesis X Object** — A 792-year intruder body: 60 years inside the solar system, 732 outside. `const NEM_ENTER = {mod:462, step:792};` (`chronicon-clocks-calendrics.txt:504`); "inside" when `mod(astro-462, 792) < 60`. Next return 2046 CE.

**Nemesis Cataclysm** — 5239 BC; the origin event of the "Cataclysm Era" counter (`cat = astro + 5238`, `:634`). 2026 CE = 7264 years after.

**NER / Anunnaki NER** — 600-year Sumerian epochs, each ten 60-year decans. `const NER = {mod:162, step:600, base:-5238};` (`chronicon-clocks-calendrics.txt:505`). 762 CE is the 6000th NER year.

**SHAR** — Breshears' most load-bearing correction (`chronicon-clocks-calendrics.txt:1080`): the Sumerian *shar*, long read as a "year", originally meant a single **day** — a *turning of the stars*. This collapses the Anunna reigns from hundreds of thousands of years to centuries, and is why the charts count **432,000 sky-turnings**, not years. This is the direct conceptual ancestor of Ophis's "axial rotation count".

**Mayan Long-Count / baktun** — Thirteen baktuns of 144,000 days each, opening with the 3113 BC impact and closing at 13.0.0.0.0 in 2046. Node list, verbatim (`chronicon-clocks-calendrics.txt:506`):

```js
const MAY_NODES = [-3112,-2712,-2312,-1912,-1512,-1112,-712,-318,76,470,864,1258,1652,2046];
```

2026 CE is Long-Count year 5,138 (`3112 + 2026 = 5138`, `:1049`).

**Metonic cycle** — 19 years = 235 lunations, after which the moon returns to the same phase on the same date (`chronicon-clocks-calendrics.txt:467, 953`). 235/19 = **12.368** moons per year, the number the engine claims is encoded in the pyramid's 440-cubit base (`:1007-1008`).

**Palindrome / mirror-year** — A year (in either era) or an Annus Mundi value that reads the same reversed. The engine flags them (`isPalindrome`, `chronicon-clocks-calendrics.txt:499`). Conceptually the same move as Ophis's `oph_flip` — digit reversal treated as resonance.

**Vapor Canopy** — The pre-Flood atmospheric shell whose collapse *is* the Great Flood of AM 1656 / 2239 BC (`chronicon-clocks-calendrics.txt:527`), and the "Birth of the Sun".

**Simulation Collapse** — 2178 CE, "138 yr after the 2040 reset; exodus into the Real universe" (`chronicon-clocks-calendrics.txt:579`). This is the end-stop of the engine's slider (`max="2178"`, `:344`).

**Baby Phoenixes** — Newcomers to Breshears' work (`chronicon-clocks-calendrics.txt:1079`). Flavour only.

**Chronotecture** — "architecture raised to encode time"; the video's term for the Great Pyramid as a time-repository (`chronicon-clocks-calendrics.txt:1070-1071`).

**Foundation of Time** — 864,000 days (`chronicon-clocks-calendrics.txt:1027`); also the label for the 864 CE baktun reset (`:564`).

### 1.3 The formula mini-language (vocabulary only; algorithm lives in the engine spec)

- **Variable:** exactly one, `Y`.
- **Prefix:** mandatory `X1+` or `X2+`, selecting the anchor.
- **Multiplication token:** lowercase `x` in the user-facing string, rewritten to `*`.
- **Constants (string-substituted, not scoped):** `OPH_PI`, `OPH_PHI`, `OPH_CRV`, `OPH_HEP`. Registry: `ALL_OPH_CONSTANTS` at `src/ophis_config.js:416-421`.
- **Functions (`ALL_OPH_FUNCTIONS`):** `oph_sqrt`, `oph_abs`, `oph_floor`, `oph_ceil`, `oph_log`, `oph_sin`, `oph_cos`, `oph_tan`, `oph_exp`, `oph_round`, `oph_flip`. All thin `Math.*` wrappers except `oph_flip` (`Ophis_v9_DeepDive_Addendum.md:292-308`).

---

## 2. NUMERIC CYCLE CONSTANTS — CATALOGUE

### 2.1 Engine constants (`src/ophis_config.js`)

Verbatim declarations, `src/ophis_config.js:374-385`:

```js
var PI_RAW = Math.PI;
var PHI_RAW = 1.61803398875;
var CURVATURE_RAW = PI_RAW * PHI_RAW;

var PI_TO_2_DECIMAL_PLACES_AS_EXPECTED = 3.14;
var PI_TO_3_DECIMAL_PLACES_AS_EXPECTED = 3.141;

var PHI_TO_2_DECIMAL_PLACES_AS_EXPECTED = 1.61;
var PHI_TO_3_DECIMAL_PLACES_AS_EXPECTED = 1.618;

var CURVATURE_TO_2_DECIMAL_PLACES_AS_EXPECTED = 5.08;
var CURVATURE_TO_3_DECIMAL_PLACES_AS_EXPECTED = 5.083;
```

Selection logic, `src/ophis_config.js:391-404` (this is the *only* place the shipped values are chosen):

```js
if ( DECIMAL_PRECISION__TIME == 2 ) {
    PI_AS_EXPECTED = PI_TO_2_DECIMAL_PLACES_AS_EXPECTED;
    // NOTE: PURPOSELY using phi to 3 decimal places, even when decimal precision for time is "2".
    // This is because it was noted that Jason often says "1.618" in videos so I think this would be more
    // expected by him. Whereas for PI he usually says "3.14" and not "3.141" or anything.
    // ALSO if PHI was shortened to two decimal places it should be 1.62, which "looks" wrong.
    PHI_AS_EXPECTED = PHI_TO_3_DECIMAL_PLACES_AS_EXPECTED;
    CURVATURE_AS_EXPECTED = CURVATURE_TO_2_DECIMAL_PLACES_AS_EXPECTED;
} else if ( DECIMAL_PRECISION__TIME == 3 ) { … } else { …roundNumberToTimePrecision(…) }
```

Final bindings, `src/ophis_config.js:410-414`:

```js
var OPH_PI  = isFlagEnabled(FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION) ? PI_AS_EXPECTED  : roundNumberToTimePrecision(PI_RAW);
var OPH_PHI = isFlagEnabled(FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION) ? PHI_AS_EXPECTED : roundNumberToTimePrecision(PHI_RAW);
var OPH_CRV = isFlagEnabled(FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION) ? CURVATURE_AS_EXPECTED : roundNumberToTimePrecision(OPH_PI * OPH_PHI);
var OPH_HEP = 7.01;
```

| Constant | Shipped value | Where declared | Note |
|---|---|---|---|
| `OPH_PI` | **3.14** | `ophis_config.js:410` | π at 2dp |
| `OPH_PHI` | **1.618** | `ophis_config.js:411` | φ at **3**dp — deliberate exception, see comment above |
| `OPH_CRV` | **5.08** | `ophis_config.js:412` | π·φ = 5.0831… at 2dp ("curvature") |
| `OPH_HEP` | **7.01** | `ophis_config.js:414` | hard literal; hepta-cycle |
| `PHI_RAW` | 1.61803398875 | `ophis_config.js:375` | only used if the expected-precision flag is off |
| `CURVATURE_TO_3_DECIMAL_PLACES_AS_EXPECTED` | 5.083 | `ophis_config.js:385` | inactive at DECIMAL_PRECISION__TIME = 2 |

**Gotcha:** `OPH_CRV`'s fallback branch computes `OPH_PI * OPH_PHI` (i.e. `3.14 * 1.618 = 5.08052`) — the *rounded* constants — not `CURVATURE_RAW`. So the two code paths do not agree to 3dp.

### 2.2 Scoring, precision and limit constants

| Constant | Value | Source |
|---|---|---|
| `POINTS__ALPHA_OPERATION_MATCH` | `1` | `ophis_model__params.js:2` |
| `POINTS__BETA_OPERATION_MATCH` | `.5` | `ophis_model__params.js:3` |
| `POINTS__IMPORTANT_MSRF_MATCH` | `2` | `ophis_model__params.js:4` |
| `POINTS__NORMAL_MSRF_MATCH` | `1` | `ophis_model__params.js:5` |
| `POINTS__VORTEX_MSRF_MATCH` | `= POINTS__IMPORTANT_MSRF_MATCH` → `2` | `ophis_model__params.js:6` |
| `MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES` | `2` | `ophis_model__params.js:7` |
| `SCORE_MULTIPLIER__NORMAL_MSRF_MATCH` | `1.5` | `ophis_model__params.js:10` |
| `SCORE_MULTIPLIER__IMPORTANT_MSRF_MATCH` | `2.0` | `ophis_model__params.js:11` |
| `SCORE_MULTIPLIER__VORTEX_MSRF_MATCH` | `2.0` | `ophis_model__params.js:12` |
| `HIGHEST_MSRF_NUMBER` | `2559` | `ophis_config.js:119` |
| `VORTEX_FILTER_MATCH_TOLERANCE` | `.1` | `ophis_config.js:367` |
| `DECIMAL_PRECISION__TIME` | `2` | `ophis_config.js:369` |
| `DECIMAL_PRECISION__LOCATION` | `1` | `ophis_config.js:370` |
| `DECIMAL_PRECISION__AXIAL_ROTATIONS` | `1` | `ophis_config.js:371` |
| `DECIMAL_PRECISION__SCORE` | `2` | `ophis_config.js:372` |
| `SAMPLE_Y_VALUE_FOR_VALIDATION` | `10` | `ophis_config.js:422` |
| `LAT_LIMIT` | `65` | `ophis_config.js:426` |
| `MINIMUM_NUMBER_OF_X_DATES` | `2` | `ophis_config.js:16` |
| `MAXIMUM_ROTATION_COUNT_Y` | `36500` | `ophis_config.js:20` |
| `MAXIMUM_ROTATION_COUNT_Z` | `36500` | `ophis_config.js:21` |
| `MINIMUM_DAYS_BETWEEN_FIRST_TWO_X_DATES` | `1` (was `6`, commented out at `:89`) | `ophis_config.js:91` |
| `MINIMUM_DAYS_BETWEEN_SUBSEQUENT_X_DATES` | `1` | `ophis_config.js:92` |
| `MILLIS_PER_DAY` | `MILLIS_PER_HOUR * 24` = 86,400,000 | `ophis_config.js:100` |
| `SYNODIC_MONTH` | `29.53058770576` | `ophis_config.js:102` |
| `LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS` | `1` | `ophis_config.js:112` |
| `ECLIPSE_DATE_MATCH_TOLERANCE_IN_DAYS` | `1.25` | `ophis_config.js:113` |
| `ALREADY_CALCULATED_SUNSET_TOLERANCE_IN_MILLIS` | `MILLIS_PER_HOUR` | cited `Ophis_v9_DeepDive_Addendum.md:196` |
| Default map lat/long (Dallas) | `32.8, -96.8` | `ophis_view__config.js`, per `Ophis_v9_ReverseEngineering_Report.md:59` |
| `MAX_DATE_ROWS_PER_PAGE` (PDF) | `15` | `ophis_view__export.js:342`, per v9 report §7 |

Note the typo'd identifier `ECLLIPSE_DATE_MATCH_TOLERANCE` (three Ls) at `src/ophis_config.js:115` — carry the *value*, not the name.

### 2.3 The MSRF sets — VERIFIED AGAINST v12 SOURCE (corrects both prior reports)

Both prior reports state NORMAL has **276** integers (`Ophis_v12_ReverseEngineering_Report.md:132, 332`; `Ophis_v9_DeepDive_Addendum.md:542, 589-591`) and that IMPORTANT has **52** (`Ophis_v9_DeepDive_Addendum.md:595, 609, 623`). **Both counts are wrong.** Parsing the shipped array literal at `src/ophis_model__params.js:17-37`:

- `MSRF_FILTER__NORMAL.length` = **325** (324 integer literals + the symbolic tail `HIGHEST_MSRF_NUMBER` = 2559)
- `MSRF_FILTER__IMPORTANT.length` = **53** (the v12 report's 53 is right; the v9 addendum's 52 is not)
- `MSRF_FILTER__VORTEX.length` = **12**
- `NORMAL ∩ IMPORTANT` = **∅** (verified; the sets are disjoint, as the addendum claimed)
- `max(NORMAL)` = 2559, `max(IMPORTANT)` = 2520
- **No duplicates** within NORMAL.

The "276 = triangular number T₂₃" and "52 = weeks per year" readings in `Ophis_v9_DeepDive_Addendum.md:804-805` are therefore built on miscounts and should be dropped.

**`MSRF_FILTER__NORMAL`, verbatim, `src/ophis_model__params.js:15-37`:**

```js
// NOTE: Filter numbers 21 and 76 have been commented out since rounded down vortex numbers match these.
// UPDATE: Re-enabled 21 and 76 after discussion with Jason to match a vortex number within a certain tolerance.
var MSRF_FILTER__NORMAL = [
    12, 21, 24, 36, 40, 42, 48, 49, 51, 52, 54, 56, 59, 60, 63, 66, 70, 71, 72, 74, 76, 77, 80, 88, 90,
    96, 98, 104, 105, 108, 110, 114, 116, 119, 120, 129, 133, 135, 138, 140, 144, 147, 154, 162, 168,
    180, 182, 196, 204, 207, 218, 222, 223, 226, 231, 234, 238, 253, 255, 259, 260, 264, 276, 279,
    280, 286, 288, 294, 297, 301, 308, 312, 315, 324, 330, 336, 343, 351, 354, 363, 364, 365, 372, 385,
    390, 394, 396, 405, 414, 433, 434, 441, 444, 447, 453, 459, 460, 463, 468, 476, 480, 490, 493, 495,
    509, 520, 525, 526, 531, 534, 539, 544, 552, 555, 558, 563, 565, 572, 573, 576, 582, 588, 591, 594,
    600, 618, 621, 640, 657, 660, 666, 670, 672, 674, 675, 679, 681, 686, 690, 691, 701, 702, 708, 720,
    726, 728, 730, 732, 735, 744, 765, 770, 774, 777, 789, 791, 792, 800, 801, 807, 810, 816, 819, 828,
    831, 846, 855, 861, 866, 868, 888, 918, 920, 930, 936, 952, 954, 960, 966, 972, 980, 990, 1000, 1019,
    1035, 1040, 1042, 1050, 1052, 1056, 1062, 1071, 1074, 1083, 1089, 1092, 1096, 1104, 1110, 1111, 1116,
    1130, 1147, 1152, 1155, 1176, 1177, 1184, 1188, 1190, 1200, 1242, 1253, 1279, 1292, 1300, 1302, 1315,
    1318, 1320, 1332, 1335, 1350, 1359, 1372, 1380, 1401, 1416, 1441, 1446, 1449, 1461, 1470, 1485, 1486,
    1488, 1513, 1518, 1530, 1534, 1554, 1557, 1559, 1560, 1577, 1585, 1620, 1641, 1574, 1680, 1683, 1701,
    1715, 1736, 1738, 1764, 1770, 1776, 1785, 1786, 1794, 1826, 1829, 1836, 1854, 1855, 1860, 1872, 1899,
    1904, 1905, 1920, 1932, 1944, 1960, 1972, 1998, 2046, 2047, 2080, 2100, 2103, 2112, 2124, 2133, 2142,
    2151, 2170, 2178, 2184, 2191, 2205, 2208, 2232, 2235, 2244, 2269, 2277, 2288, 2292, 2293, 2294, 2295,
    2304, 2310, 2322, 2333, 2346, 2352, 2376, 2380, 2388, 2400, 2401, 2415, 2418, 2430, 2447, 2478, 2483,
    2484, 2506, 2556, 2558, HIGHEST_MSRF_NUMBER
];
```

**Sort anomaly confirmed:** exactly one out-of-order entry — index **248** (0-based) holds `1574`, sitting between `1641` and `1680`. Verified programmatically; the v9 addendum spotted it and put it at "position 253" (`Ophis_v9_DeepDive_Addendum.md:587`), which is off by five. The startup self-check `selfCheckMsrfOnStartup` (`src/ophis_model__validation.js`) tests for duplicates and integer-ness but **not** ordering, which is why it survives. Since matching is `Array.includes`-style exact matching, order is functionally irrelevant — but any reimplementation that switches to binary search **will silently break on 1574**.

**`MSRF_FILTER__IMPORTANT`, verbatim, `src/ophis_model__params.js:38-42` (53 entries):**

```js
var MSRF_FILTER__IMPORTANT = [
    84, 126, 132, 153, 176, 186, 189, 210, 216, 252, 270, 306, 360, 378, 420, 432, 504, 540, 567, 612, 630,
    648, 669, 693, 756, 780, 840, 864, 882, 945, 1008, 1080, 1134, 1224, 1260, 1296, 1344, 1404, 1428, 1440,
    1512, 1584, 1656, 1728, 1800, 1890, 1980, 2016, 2070, 2160, 2268, 2448, 2520
];
```

**`MSRF_FILTER__VORTEX`, verbatim, `src/ophis_model__params.js:44-46`:**

```js
var MSRF_FILTER__VORTEX = [
    21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4, 762.3, 871.2
];
```

**`MSRF_FILTER__FINAL`, verbatim, `src/ophis_model__params.js:57`:**

```js
var MSRF_FILTER__FINAL = MSRF_FILTER__NORMAL.concat(MSRF_FILTER__IMPORTANT).concat(MSRF_FILTER__VORTEX).sort(function(a, b) { return a - b; });
```

Used only by the startup self-check for duplicate detection.

**Match precedence (early-return, one match maximum):** VORTEX (tolerance ±0.1) → `.5` rejection → IMPORTANT (exact, on `Math.round`) → NORMAL (exact, on `Math.round`). `Ophis_v9_DeepDive_Addendum.md:724-748`.

### 2.4 Chronicon ↔ MSRF convergences (verified membership)

The Chronicon cycle numbers land inside the MSRF sets with striking regularity. Verified by direct membership test against the v12 arrays:

| Number | Chronicon meaning | In NORMAL | In IMPORTANT |
|---|---|---|---|
| **138** | Phoenix lattice step | ✔ | — |
| **414** | 138 × 3, "cursed time" | ✔ | — |
| **552** | 138 × 4, "Phoenix cycles" | ✔ | — |
| **792** | Nemesis X period | ✔ | — |
| **600** | Anunnaki NER epoch | ✔ | — |
| **2178** | Simulation Collapse year (2178 CE); also vortex 217.8 × 10 | ✔ | — |
| **2046** and **2047** | Nemesis return / baktun 13 close | ✔ | — |
| **144** | Gann Master Time; baktun/1000 | ✔ | — |
| **108** | Phoenix residue (`mod 138 == 108`); dharmic 108 | ✔ | — |
| **54** | half of 108; the "missing" 5 × 10.88 vortex slot | ✔ | — |
| **666**, **777**, **888**, **1111** | gematria favourites | ✔ | — |
| **1656** | **Annus Mundi year of the Great Flood** | — | ✔ |
| **1080** | capstone AM year; Moon radius in miles; 3 × 360 | — | ✔ |
| **216** | 6³; Rodin/Plato | — | ✔ |
| **360**, **1440**, **2160**, **2520** | Gann time factors | — | ✔ |
| **432** | harmonic canon; 432,000 sky-turnings root | — | ✔ |
| **378**, **780** | Saturn / Mars synodic periods in days | — | ✔ |
| **19** (Metonic), **235** (lunations) | moon gear | ✘ | ✘ |

Two notes for the rebuild: (a) **19 and 235 are absent from every MSRF set** — the Metonic gear is a *rewrite-era* addition, not part of the shipped Ophis resonance table; (b) 1656 being an IMPORTANT MSRF number and `z-index: 1656` appearing in `src/ophis.css:266` is very likely a deliberate wink (see §5.9).

### 2.5 `ophis-xtras.txt` — the extra operations and their constants

The whole file (`ophis-xtras.txt`, 31 lines, 183 bytes) is a hand-written list of ten additional operations numbered **17–26**, continuing the shipped 16:

```
17. X1+Yx2.718      21. X1+Yx5.52         25. X2+Yx2.178
18. X2+Yx2.718      22. X2+Yx5.52         26. X2+Yx0.360
19. X1+Yx1.38       23. X1+(Y/2.0)x5.52
20. X2+Yx1.38       24. X1+Yx2.178
```

**Verified: none of `2.718`, `1.38`, `5.52`, `2.178`, `0.360` appears anywhere in `src/`, in any bundled `.oph` file, or in `PSYFR1.html`.** They are *literal numeric multipliers typed directly into the operations table by the user* — the mini-language accepts bare numeric literals, so no new named constant is needed. Do **not** add them to `ALL_OPH_CONSTANTS` unless you intend to introduce named tokens for them.

Provenance of each, decoded:

| Literal | Reads as | Chronicon / MSRF tie |
|---|---|---|
| **2.718** | *e*, Euler's number | The only "classical" constant not already shipped (π, φ, π·φ, 7.01 are) |
| **1.38** | 138 / 100 | **Phoenix lattice**, scaled into the 1–7 multiplier band |
| **5.52** | 552 / 100 = 138 × 4 / 100 | **"Phoenix cycles"** (`chronicon-clocks-calendrics.txt:463`) |
| **2.178** | 217.8 / 100 | **Vortex number #7** (`MSRF_FILTER__VORTEX[6] = 217.8`); also 2178 CE Simulation Collapse |
| **0.360** | 360 / 1000 | Gann circle / IMPORTANT MSRF 360 |

Op 23, `X1+(Y/2.0)x5.52`, mirrors the shipped half-cycle pattern (`X1+(Y/2.0)xOPH_CRV`) with the Phoenix constant substituted for curvature. The whole list is the practitioner extending the shipped X1/X2-symmetric design pattern with cosmology constants. **Carry these forward as a shipped "extras" preset pack, not as defaults** — they were never enabled by the app.

### 2.6 Chronicon engine constants (`chronicon-clocks-calendrics.txt`)

Verbatim declarations, `chronicon-clocks-calendrics.txt:487-506`:

```js
const SYN = 29.530588853;
const NEWMOON_J2000 = 2451550.1;            // 2000-01-06 18:14 UT new moon
const TODAY = {y:2026, m:5, d:30};
…
const TODAY_JD = jdn(2026,5,30);
…
const PHX = {mod:108, step:138, base:-4308};            // 4309 BC = node 1
const NEM_ENTER = {mod:462, step:792};                  // enters inner system; 60 yr inner
const NER = {mod:162, step:600, base:-5238};            // 5239 BC start
const MAY_NODES = [-3112,-2712,-2312,-1912,-1512,-1112,-712,-318,76,470,864,1258,1652,2046];
```

Proleptic-Gregorian JDN, verbatim `chronicon-clocks-calendrics.txt:492-497`:

```js
function jdn(astroYear, m, d){
  const a = Math.floor((14-m)/12);
  const y = astroYear + 4800 - a;
  const mm = m + 12*a - 3;
  return d + Math.floor((153*mm+2)/5) + 365*y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400) - 32045;
}
```

Moon maths, verbatim `chronicon-clocks-calendrics.txt:713-722`:

```js
let age = mod(J - NEWMOON_J2000, SYN);
const frac = age/SYN;                          // 0=new .5=full
const illum = (1-Math.cos(2*Math.PI*frac))/2;
const idx = Math.floor(mod(frac+1/16,1)*8);    // 8 phase names, quarter-offset by 1/16
const lun = Math.round((J - 2423436.40347)/SYN);   // Brown lunation number
```

Phase name array, verbatim `:716`:
```js
['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous','Full Moon','Waning Gibbous','Last Quarter','Waning Crescent']
```

Era/AM conversions, `chronicon-clocks-calendrics.txt:484-491, 602, 634`:
- astronomical year: `1 BC = 0, 2 BC = -1 …`; `astroFrom(y, era) = era==='bc' ? (1-y) : y`
- `AM = astro + 3894`
- `Cataclysm-era years = astro + 5238`
- `fmtYear(astro) = astro<=0 ? (1-astro)+" BC" : astro+" CE"`

| Constant | Value | Line |
|---|---|---|
| Synodic month (Chronicon) | `29.530588853` | `:487` |
| Synodic month (Ophis) | `29.53058770576` | `ophis_config.js:102` |
| New-moon J2000 epoch JD | `2451550.1` | `:488` |
| Brown lunation epoch JD | `2423436.40347` | `:722, :859` |
| AM offset | `3894` | `:485` |
| Cataclysm offset | `5238` | `:634` |
| Phoenix step / residue / base | `138` / `108` / `-4308` | `:503` |
| Nemesis step / entry residue / inner yrs / outer yrs | `792` / `462` / `60` / `732` | `:504, :671-678` |
| NER step / residue / base | `600` / `162` / `-5238` | `:505` |
| Metonic | 19 yr = 235 lunations = 12.368 moons/yr | `:434, :467, :1008` |
| Baktun | 144,000 days | `:523, :698` |
| 7-cycle Nemesis frame | `5544 = 792 × 7` | `:653` |
| 138 multiples | `×3 = 414`, `×4 = 552`, `×46 = 6348` | `:463` |
| Slider domain | astro years `-2842` … `2178` | `:344` |
| Named future nodes | 2040 Phoenix · 2046 Nemesis · 2178 Collapse | `:338-340` |
| Long-Count "today" | 5,138 (2026 CE); 5,158 at 2046 | `:1045, :1049` |
| AM 6000 | 2106 CE | `:578, :649` |

**Petrie / Great Pyramid figures** (`chronicon-clocks-calendrics.txt:979, 984-987, 1094`): mean base side **9068.8 in / 230.3475 m** = **440 royal cubits**; original height **146.71 m = 5776 in** = **280 cubits**; royal cubit **20.62 in**; slope **≈ 51°51′** (seked 5½); ~**203** masonry courses; `1882 + 3894 = 5776 = 76²`; square circuit × **43,200** → Earth meridian; **432,000** sky-turnings; **864,000** d Foundation of Time; Moon radius **1080 mi**; ratio **280 : 440 = 7 : 11**; perimeter ÷ 2·height ≈ π.

**Pyramid AM timeline** (`chronicon-clocks-calendrics.txt:963-970, 1127-1131`): first stone AM 990 (2905 BC) → 90-year raising → capstone AM 1080 (2815 BC) → stands 576 years → submerged at the Flood AM 1656 (2239 BC) → 340 years under water → re-emerges AM 1996 (1899 BC). `1656 − 990 = 666`. Noah born AM 1056 = exactly 600 years before the Flood.

### 2.7 Rewrite-era operation packs (`PSYFR1.html`)

The browser rewrite fuses the Ophis operation grammar with Chronicon constants. Verbatim, `PSYFR1.html:856-863`:

```js
const DEFAULT_OPS=[
 "X2+oph_round(Y)","X2+oph_flip(oph_round(Y))","X1+oph_flip(oph_round(Y))",
 "X2+Y/OPH_PHI","X1+Y*OPH_PHI","X1+(Y/2)*OPH_PI","X2+Y/OPH_CRV",
 "X2+Y*138/100","X1+Y*19/10","X2+oph_round(Y/138)*138","X1+oph_round(Y/19)*19",
 "X2+Y+138","X1+Y+19","X2+oph_flip(Y)+19","X1+Y*360/365.2422",
 "X2+Y*792/600","X1+oph_round(Y*OPH_PHI/OPH_PI)","X2+oph_round(Y/OPH_PHI/OPH_PHI)",
 "X1+oph_flip(oph_round(Y/OPH_PHI))"
];
```

19 operations — the header calls it a *"19-Operation Palindromic Cast"* (`PSYFR1.html:316`). Named packs (`PSYFR1.html:868-885`): **"Default 19"**, **"138 Pack"** (138/414/552 quantisation), **"19 Metonic Pack"** (19/235 quantisation), **"Phoenix Lattice Pack"** (138/792/600/360/216/144 quantisation plus `X1+Y*360/365.2422` — the 360→365.25-day orbital change the Chronicon dates to 713 BC, `chronicon-clocks-calendrics.txt:546`), and **"Golden Pack"** (π/φ/π·φ only). Note the rewrite uses `*` rather than the Ophis `x` multiplication token and drops the `.0` in `(Y/2)`.

---

## 3. DISTILLED PRIOR REPORTS

### 3.1 What the v9 report establishes (architecture)

- **Packaging.** Windows Electron, 32-bit, NSIS/electron-builder, LZMA2 solid archive, ~32 MB un-obfuscated `app.asar`. `ophis.html` injects 22 first-party modules as `<script async=false>` in strict order with a random 8-digit cache-buster; no bundler, no minification of first-party code, no source map (`Ophis_v9_ReverseEngineering_Report.md:5-22`).
- **Strict MVC by filename** (`:32-43`): controller `ophis_controller.js`; model `ophis_model__{params,validation,sorting,operations,persistence}.js`; view `ophis_view*.js` (10 files); cross-cutting `ophis_utils.js` (~800 lines), `ophis_config.js` (all constants + feature flags), `ophis_dependencies.js` (Meeus/moment/tzlookup/Tipsy wrappers); entry `ophis_main.js` with a **6-step waterfall `init()`** (version → sign-in → load astro images → self-check → dependencies/listeners → appState); tests `ophis_unit_tests.js` (startup MSRF self-check). Global mutable state on `appState`. No framework — vanilla DOM plus jQuery for tooltips only.
- **Formula engine** (`:72-99`): math.js validates, `new Function("Y", …)` executes. Normalisation strips spaces, temporarily uppercases `oph_*` names to protect them, rewrites `x`→`*`, substitutes the four constants. Stripping then removes the `X1+`/`X2+` prefix, unwraps `oph_*()` calls, and substitutes `Y → 10`. The compiled function is cached on the operation as `cached_operation_function`.
- **`.oph` format and migrations** (`:101-141`): top-level `app_version` / `iso_events` / `global_options`; transient fields (`effective_operations`, `cached_operation_function`, `latestResults`) stripped by `sanitizeIsoEventsForSaveOperation`. Load-time migrations: missing/invalid `app_version` → current; missing/invalid `scoring_system` → `GTE_V8` regardless of stored version; short `operations` → default clone; invalid scope → `HH_MM`; lat outside ±65 or long outside ±180 → defaults.
- **Export** (`:142-163`): three paths, all guarded by `validateOutputBeforeExport()` which refuses if `appState.latestResults.errors.length > 0`. Excel/CSV emit exactly three columns — Date (String), Hits (Number), Score (Number) — **no `formula:` field is ever set**, so there is *no* round-trip of `X2+oph_round(Y)` into an Excel `=…` formula. PDF is jsPDF landscape: page 1 title + financial-astrology disclaimer + glossary; page 2 a chart snapshot via `getChartElem().toBlob(cb,"image/jpeg",0.95)` (**not** html2canvas, even though html2canvas is loaded); pages 3+ paginated tables at 15 rows/page with `#dddddd`/`#bbbbbb` backgrounds.
- **Astronomy stack** (`:175-186`): hybrid — algorithms for continuous quantities, bundled tables for discrete NASA events. Meeus (`meeusjs.1.0.3.min.js` + `meeus-easy.js`) for sunrise/sunset/positions, with CosineKitty `Astronomy.SearchRiseSet('Sun', …)` behind `FEATURE_FLAG__USE_COSINE_KITTY_ASTRONOMY`. Moon phase from `lunarphase-js`, bucketised by lunar age. Eclipses from pre-processed NASA catalogs to ~year 3000 shipped as `window.LUNAR_ECLIPSES_PROCESSED` / `window.SOLAR_ECLIPSES_PROCESSED`, found by `binarySearchForEclipse()`; types encoded `T+`/`T-`/`P`; B.C. entries filtered out by `optimizeEclipseData`. Location picker is Leaflet 1.8.0 over an **offline tile pyramid**. Timezones from `tz_lookup_oss.js` → IANA id → moment-timezone.
- **Extension points** (`:187-196`) — still the right map for a rebuild: adding a formula variable requires touching both the strip pass *and* the `new Function` compile *and* `runOperationFunction`; adding a constant requires `ophis_config.js` + `ALL_OPH_CONSTANTS` + the normalisation substitution; filters/chart-option toggles are appended to `SERIALIZED_FILTER_FIELDS` / `SERIALIZED_CHART_OPTION_FIELDS` and everything else (render, listeners, persistence, reset) iterates `ALL_SERIALIZED_FIELDS` automatically. **Preserve that data-driven serialized-field pattern — it is the best-designed part of the app.**
- **Caveats worth carrying** (`:198-211`): `SKIN_MODE__MARKETS` is a dead-end toggle; `EVENT_TYPE__ASTROLOGICAL` is defined but commented out; `OPHIS_SCREEN__DEBUG` is commented out of the screen list; air-gap intent throughout (offline tiles, bundled eclipse tables, bundled tz data, offline password hashes, no telemetry/auto-update/license server); cache-buster on every load measurably slows startup; version-string mismatch (`APP_VERSION` vs `package.json` vs a stale "v7" in the markup); `debugger` statements shipped (`ophis_model__operations.js:54`, `ophis_view__chart_datasets.js:1366`); pervasive commented-out dead code including an alternative curve-fanout algorithm at `ophis_view__chart_datasets.js:1389-1426`.

### 3.2 What the v9 Deep-Dive Addendum adds

Three self-contained studies:

1. **End-to-end compute trace** for `Test-Bitcoin-Halving-Cycle` (MARKETS, DAYS scope, Dallas, X1 = 2012-11-28, X2 = 2016-07-09, GTE_V8): pair generation → `xDateToNativeDate` (DAYS scope discards local times, `LOCK_DAY_SCOPE_TO_GMT` forces 0/0 lat/long) → Y = **1319** days → 16 operations → per-op `operationResult` → bucket into `zStructsDict` by `zDate_native_start.getTime()` → `getMsrfMatch` → `scoreZDates`. The **collision insight** (`Ophis_v9_DeepDive_Addendum.md:131`) is important: ops that produce the same *day count* from **different anchors** produce different millisecond keys and therefore **do not merge** — e.g. ops 4 & 8 both give 2071 days but bucket separately. Only bucket #3 earned an MSRF tag (NORMAL 260 → ×1.5 → score 1.5, hit_count 2); every other bucket scored 1.0 / 1 hit. Also: rounding order matters — the Z-value is converted to millis **before** rounding to 2dp (`:87`), and a **separate** 1-dp rounding produces `rotation_count_z`, which is what the MSRF filter sees (`:119`).
2. **All 16 operations, mathematically** — equations, Y=100 behaviour, weights, and a cycle-theory reading of each. Also documents `oph_flip` precisely (§1.1) and flags a `newOperation` quirk: *"the `newOperation` function **always sets `enabled: true`** regardless of the third argument"* (`:336`) — so `OPERATION_ENABLED_FALSE` on the Hepta op is inert at construction; the ≥v8 clone force-enables everything anyway.
3. **The MSRF arrays** — the pattern analysis summarised in §2.3/§2.4, the acronym refusal, the vortex base-≈10.9 / missing-5 Rodin reading, and the ranked traditions (Gann/Bradley swing counts + Rodin vortex math strongest; the 378/780 Saturn/Mars synodic periods being the single most telling detail; Fibonacci/φ/π only *incidental* in the filter lists because φ and π live in the *operations*, not the filters).

The addendum contains one visible self-correction in place: it first claims op 15 is a duplicate of `X2+(Y/2.0)xOPH_PHI`, then retracts it at `:470-474` — *"(Corrected: no duplicate. There are 15 pre-Hepta ops + Hepta = 16, all unique equations.)"* Read the retraction, not the claim.

### 3.3 The v9 → v12 delta

From `Ophis_v12_ReverseEngineering_Report.md:138-151`, with the one correction noted below:

| Area | v9 | v12 | Where |
|---|---|---|---|
| Headless / CLI | — | **New**: `--headless`, `--output-type`, `--output-path`, `--input-validation-mode`, `--current-epoch-millis`, `--multiple-files`; CSV output; runs windowless and writes files | `main.js:490-529`, `ophis_config.js:23-27` |
| Console→CLI bridge | — | **New** `src/ophis_logging.js` overrides `console.*` → `electronBridge.logToCli` when headless | `ophis_logging.js`; `main.js:201-203` |
| T-Dates | — | **New** second input-date type alongside X-Dates | `ophis_config.js:57-58` |
| File-input validation | single strict path | **New** 3 modes STRICT / ORIGINAL / **LOOSE**; **GUI defaults to LOOSE**, headless forces STRICT | `ophis_config.js:336-344`, `ophis_main.js:29`, `ophis_view__export.js:165` |
| Default operations | 15 (X1 hepta present but off) | **16** — adds `X2+YxOPH_HEP` enabled by default | `ophis_model__params.js:112-113, 137-143` |
| Astronomy lib | CosineKitty commented out | **Loaded and live** | `ophis.html:39` |
| Markets event type | commented out of enum | **Uncommented / user-selectable** | `ophis_config.js:361-365` |
| Sign-in gate | disabled, sha512 commented out | **unchanged** — still disabled, sha512 still commented out | `ophis_config.js:291`; `ophis.html:67` |
| Module count | 22 first-party | **24** (adds `ophis_logging.js`, `scratchpad.js`) | `Ophis_v12_ReverseEngineering_Report.md:77` |
| Electron | (unstated) | **39.2.4**, electron-builder 26.0.12, ia32, `win.target: "portable"` | `package.json` |

**Mechanism of the 16th operation** (verified in source, `src/ophis_model__params.js:112-143`): v12 does **not** edit `DEFAULT_OPHIS_OPERATIONS_LTE_V7`. It declares a standalone operation and a new clone factory:

```js
// New Hepta-Cycle Operation from Jason but for this one Z-Value is added to X2, Late-December 2025
var OPH_HEP_OPERATION_FOR_X2 = newOperation("X2+YxOPH_HEP", POINTS__ALPHA_OPERATION_MATCH, OPERATION_ENABLED_TRUE)

function cloneDefaultOperationsForAppVersionGte10() {
    var operations = cloneDefaultOperationsForAppVersionGte8();
    operations.push(deepClone(OPH_HEP_OPERATION_FOR_X2));
    return operations;
}
```

So the version ladder is **three** factories, not two: `…Lte7()` → `…Gte8()` (force-enable all + promote `X1+YxOPH_PI` and `X2+(Y/2.0)xOPH_PHI` from β to α) → `…Gte10()` (append the X2 hepta op). The v12 report cites this correctly; the v9 addendum predates it.

Net reading: v12 = v9 + headless CLI + T-Dates + a 16th default op + a validation-mode system whose GUI default (LOOSE) widens the attack surface.

### 3.4 Security findings — short summary (the rebuild simply must not reproduce these)

Full detail lives in `SECURITY.md` and `Ophis_v12_ReverseEngineering_Report.md` §6. Compressed:

| # | Severity | What | Rebuild rule |
|---|---|---|---|
| 1 | Critical | `.oph`-controlled operation string reaches `new Function("Y", …)` (`ophis_model__validation.js:158`). The math.js check inspects a **stripped skeleton** (prefix removed, `oph_*` names deleted, `Y→10`, `:104-121`) while `new Function` compiles the **un-stripped** body — **validator ≠ executor**, the classic eval-filter bypass. Import does no content validation (`:620-645`), and LOOSE mode auto-repairs hostile files instead of rejecting them. | **No `eval` / `new Function` / `Function` constructor on any input, ever.** Ship one parser that is both the validator and the executor — a small recursive-descent / shunting-yard evaluator over numbers, `Y`, the named constants, the `oph_*` functions, and `+ - * / ( )`. A working proof-of-fix exists at `Ophis_v12_Hardened_Engine_Lab.html` (parity on all 16 shipped ops, 10/10 injection payloads blocked). |
| 2 | Critical | `nodeIntegration:true` confirmed (`main.js:367`); `electronBridge.autoSaveToFile(path, contents)` → `fs.mkdirSync({recursive:true})` + `fs.writeFile` with **no path validation** (`main.js:113-120, 267-283`; `preload.js:4`) → arbitrary-path write → Startup-folder persistence. | **No arbitrary-path writes.** In a browser build there is no filesystem; downloads go through an explicit user-initiated save. If an Electron shell ever returns: `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, and every write jailed to an allowed directory (or routed through `dialog.showSaveDialog`). |
| 3 | High | Sign-in is client-side theatre — `FEATURE_FLAG__REQUIRE_SIGN_IN = false` with the author's own comment *"a false sense of security anyway… like having a fake security camera"*; 5 hard-coded unsalted single-round SHA-512 digests shipped in `ophis_config.js:5-11`. Latent crash: `sha512.min.js` is commented out of the bootstrap, so flipping the flag alone throws `ReferenceError` in `init_step2`. | **No client-side auth, no shipped secrets, no gate at all.** Delete the concept. |
| 4 | Medium | Main process builds JS by string concatenation for `executeJavaScript` with a 2-character escaper (`main.js:338, 26-33`). | Pass structured data over a typed channel; never build code from data. |
| 5 | Low | Headless CLI log forging — file-derived strings reach the log stream unsanitised via `console.* → logToCli → console.log` (`main.js:201-203`). Fidelity bug too: only `args[0]` is forwarded, so multi-arg `console.log` silently drops everything after the first argument. | Escape control characters and ANSI sequences before anything file-derived hits a log stream; forward all arguments. |
| — | Info | CSP allows `'unsafe-eval'` + `'unsafe-inline'` (`ophis.html:72`); `debugger;` shipped; DevTools reachable from the View menu; dev-style cache-buster loader. | Ship a CSP with **no** `'unsafe-eval'`; move handlers out of markup so `'unsafe-inline'` can go too. |

**Threat model to preserve in the write-up** (`SECURITY.md:6-11`): the app is offline and single-user by design; the realistic attacker is a **malicious `.oph` preset** shared in the user community and double-clicked by a victim — the extension is registered to the app and `open-file` / second-instance handlers auto-load it.

**The rewrites' own two bugs** (`Ophis_v12_ReverseEngineering_Report.md:277-282`), which the rebuild must also not inherit: `new Function()` on user formula input guarded only by a regex character-allowlist (`PSYFR1.html:739`, `NatoriOphis.html:533`, `OPHIS.html:988`) — a denylist, not a sandbox; and **unescaped `innerHTML` of the anchor `label`** (`PSYFR1.html:960, 981`), where `a.label` comes straight from user input with no escaping and round-trips through saved/imported JSON. Escape at every interpolation:

```js
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
```

---

## 4. THE ORIGINAL LOOK — `src/ophis.css` DESIGN SYSTEM

**Read in full: 880 lines.** Two facts to state up front, because they shape any port:

1. **There are ZERO CSS custom properties in `ophis.css`.** No `--var`, no `:root` block, no theming layer. Every colour is a hard-coded literal or a CSS named colour, repeated at each use site. A rebuild that wants tokens must *introduce* them; there is nothing to lift.
2. **There is no dark mode, no media query, no responsive breakpoint.** The only `@media`-adjacent constructs are `@font-face` and `@keyframes`. The design is a single fixed light theme built for a 800×600-minimum Electron window.

The aesthetic is deliberately utilitarian: **white panels, 1.5px solid black borders, 10px corner radii on panel tops/bottoms, grey header bands (`#BBBBBB`) over lighter sub-header bands (`#DDDDDD`), 20px Noto Sans base type, and saturated semantic colours reserved for the resonance classes.** It reads as a scientific instrument / spreadsheet, not as an occult almanac — the occult styling belongs to the *rewrites* (§5.7).

### 4.1 Typography

```css
body {
    font-family: "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
    margin: 0px;
    font-size: 20px;
    box-sizing: border-box;
}
```
(`ophis.css:6-13`; two commented-out declarations in the block: `padding:5px` and `border: 1.5px solid #735c42` — the latter is the only *warm brown* in the file and is dead.)

```css
@font-face {
    font-family: alarm_clock;
    src: url(../img/alarm_clock.ttf);
}
.has_clock_font { font-family: alarm_clock; font-size:100%; }
```
(`ophis.css:15-18, 36-39`) — a segmented-LCD display face, applied to time readouts. Path is relative to `src/`, resolving to `img/alarm_clock.ttf` (21,664 bytes).

```css
textarea, .code_font {
    font-family:Courier New, monospace, Consolas,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono;
}
.math_font {
    font-family: Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif;
}
textarea { font-size: 15px; }
```
(`ophis.css:296-307`; `.math_font` has a commented-out Georgia/Times serif alternative at `:301`.) **Note the malformed stack** in the first rule — `monospace` is placed *second*, before the concrete families, so the generic keyword wins on any system and the rest of the list never applies. `.math_font` orders it correctly.

Type scale actually in use: **14px** (`.parenthetical_equation`), **15px** (`textarea`, `code`), **16px** (`.timezone_display`, `.prior_sunset_display`), **18px** (date/name/password/filter inputs, `.operation_equation_input`, `.operation_validation_result`, `.tipsy`), **20px** (body, `.large_font`, `.col_format`, `.col_sub_header_format`, `.about_body`, `.input_row_name`, `.x_date_count`, `#yes-no-dialog`), **25px** (`.about_header`, `.date_range_arrow`, `.row_delete_button` family).

Weights in use: `400` (`#unsaved-changes-reminder`), `500` (all MSRF/operation colour classes, `.col_sub_header_format`, `.about_header`, `.timezone_display`), `600` (`.condensed_score`, `.col_header_format`, `.tool_tip_table_left_row`, `.z_op_detail_header_cell`, `.bold_dialog_text`, `.input_row_name`, `.about_screen_points`, `.square_button`, `.chart_help_hit_count_cell_inner span`), `700` (`.row_clone_button`), `bold` (`.chart_help_hit_count_cell_header`).

`.input_row_name` is the only rule with letter-spacing: `letter-spacing:1.5px; font-weight:600; font-size:20px;` (`ophis.css:708-714`).

### 4.2 The complete colour inventory, with roles

Every colour literal in the file, in source order:

| Value | Role | Line(s) |
|---|---|---|
| `black` | Universal border colour; tipsy tooltip background | `:3, 51, 76, 251, 283, 340, 359, 414, 498, 635, 826` |
| `white` | Panel/table/dialog/select background; tooltip text; z-match pill background; sort-icon background | `:50, 72, 220, 252, 281, 386, 403, 449, 562, 826` |
| `#735c42` (warm brown) | **Dead** — commented-out body border | `:12` |
| `#ffbcbc` (pale pink) | `.z_date_sunset_pill` background — the "prior sunset" pill | `:82` |
| `#fd5e5329` | **Dead** — commented-out alternate sunset pill background | `:81` |
| `#00c0ff` (cyan) | **Beta operation** text + z-match pill border | `:94, 121` |
| `#2ede69` (green) | **Normal MSRF** text + z-match pill border | `:99, 125` |
| `darkgoldenrod` | **Alpha operation** text + z-match pill border | `:104, 113` |
| `#b80b0b` (deep red) | **Important MSRF** text + z-match pill border | `:109, 117` |
| `purple` | **Vortex MSRF** text + z-match pill border | `:129, 133` |
| `red` | Hover outline+border on z-match pills; `.error_color` | `:141, 142, 733` |
| `#858585` (mid grey) | Timezone / prior-sunset readout text | `:165` |
| `rgba(0, 0, 0, .7)` | Modal scrim (yes/no dialog background, map container) | `:270` |
| `#e3e3e3` + `grey` | `code` block background + border | `:310, 316` |
| `#BBBBBB` | Column-header band background (panel top bar); chart-help header cell | `:363, 412` |
| `#DDDDDD` | Column **sub**-header band background | `:531` |
| `rgb(115 255 130)` (bright green) | **Row hover / chart-linked hover / selected Iso-Event row** background | `:438` |
| `rgba(255, 140, 0, 0.25)` | **Dead** — commented-out orange row hover | `:436` |
| `rgba(193, 238, 254, 1.0)` | **Dead** — commented-out pale-blue row hover | `:437` |
| `rgb(0,0,0)` @ 1.0 in box-shadow | Sort-icon drop shadow `1px 1px 2px` | `:445` |
| `rgb(239, 239, 239)` / `#efefef` | Button face; row-insert button face | `:452, 465, 701` |
| `darkorange` | `.warning_color` | `:556` |
| `blue` | `.export_link` text (underlined, pointer) | `:602` |
| `green` | `.green_color` | `:737` |
| `#333` / `#fff` | Toast background / text | `:789, 790` |
| `grey` | Disabled radio border colour | `:697` |
| `#EEEEEE` | `.selected_detailed_output_cell` background | `:839, 840` |

**Semantic colour contract that crosses the model→view boundary.** These five class names are produced by `getMsrfMatch()` / the operation-weight predicate in the model layer and consumed as CSS classes and as `[attribute]` selector values in the view. Reproduce them verbatim:

```css
.operation_beta    { font-weight: 500; color: #00c0ff; }        /* :92-95   */
.msrf_normal       { font-weight: 500; color: #2ede69; }        /* :97-100  */
.operation_alpha   { font-weight: 500; color: darkgoldenrod; }  /* :102-105 */
.msrf_important    { font-weight: 500; color: #b80b0b; }        /* :107-110 */
.msrf_vortex       { color: purple; font-weight: 500; }         /* :132-135 */
```

and the matching pill borders, which are driven by **HTML attributes**, not classes:

```css
.z_match_with_tool_tip[operation_type="alpha"]     { border:2px solid darkgoldenrod; }  /* :112-114 */
.z_match_with_tool_tip[msrf_type="msrf_important"] { border:2px solid #b80b0b; }        /* :116-118 */
.z_match_with_tool_tip[operation_type="beta"]      { border:2px solid #00c0ff; }        /* :120-122 */
.z_match_with_tool_tip[msrf_type="msrf_normal"]    { border:2px solid #2ede69; }        /* :124-126 */
.z_match_with_tool_tip[msrf_type="msrf_vortex"]    { border:2px solid purple; }         /* :128-130 */
```

The attribute names `operation_type` (`"alpha"` | `"beta"`) and `msrf_type` (`"msrf_normal"` | `"msrf_important"` | `"msrf_vortex"`) are load-bearing cross-module string literals.

### 4.3 Component: the Z-match pill (the signature component)

```css
.z_match_with_tool_tip {
    padding:4px;
    padding-top:1px;
    border-radius:5px;
    height:25px;
    width: 85px;
    padding-top: 0px;      /* overrides the padding-top:1px above */
    padding-bottom: 2px;
    display: inline-block;
    background-color: white;
}
.z_match_with_tool_tip:hover, .z_match_with_tool_tip[chart_hover="true"] {
    outline:3px solid red;
    border:2px solid red;
}
```
(`ophis.css:63-73, 140-143`) — a fixed 85×25px white chip with a 5px radius, a 2px semantic border, and a red 3px outline + red border on hover. `chart_hover="true"` is set by the chart layer to link chart hit-testing to table rows — a **bidirectional hover contract** between chart and table.

The sunset variant:
```css
.z_date_sunset_pill {
    border: 1.5px solid black;
    border-radius:5px;
    padding:4px;
    padding-top: 0px;
    padding-bottom: 0px;
    background-color:#ffbcbc;
}
```
(`ophis.css:75-84`; a `background-image: url('../img/sunset.jpg')` is commented out at `:83`.)

Pill container:
```css
.pill_results_table     { width:100%; }                              /* :537-542 */
.pill_results_table_col { padding:2px; text-align: center; }         /* :544-548 */
```

### 4.4 Component: panels and tables

The panel chrome is a three-part sandwich — grey header cap with top radii, bordered body, bordered footer wrapper with bottom radii:

```css
.col_header_background_inner {
    background:#BBBBBB;
    padding:5px;
    border: 1.5px solid black;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
}
.col_header_background { padding: 0px; height:0px; }                     /* :419-427 */

.scrollable_container_wrapper, .event_notes_container_wrapper {
    border: 1.5px solid black;
    border-top: none;
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
    overflow: hidden;
    background-color: white;
}
.scrollable_container { max-height:350px; }
.scrollable_container, .chart_container {
    overflow-y:scroll;
    overflow-x:visible;
    display: block;
    background-color: white;
}
.chart_container { border-radius: 10px; border: 1.5px solid black; }
```
(`ophis.css:379-417`)

Table reset and internal gridlines:

```css
table { border-spacing: 0px; border-collapse: collapse; }                 /* :324-328 */
td { padding: 0px; }                                                     /* :501-503 */

.inner_panel_table > tbody > tr > td              { border: 1.5px solid black; }  /* :497-499 */
.inner_panel_table > tbody > tr:first-child > td  { border-top: none; }           /* :509-511 */
.inner_panel_table > tbody > tr:last-child > td   { border-bottom: none; }        /* :513-515 */
.inner_panel_table > tbody > tr > td:first-child  { border-left: none; }          /* :517-519 */
.inner_panel_table > tbody > tr > td:last-child   { border-right: none; }         /* :521-523 */
```

That edge-suppression quartet is what makes an inner table read as a *grid inside a panel* rather than a nested box. Reproduce it.

Header/sub-header/data row bands:

```css
.col_sub_header_format, .col_sub_header_format_for_row {
    font-size: 20px;
    text-align:center;
    font-weight:500;
    border-top: none;
    background:#DDDDDD;
    white-space: nowrap;
    padding-left:5px;
    padding-right:5px;
}
.col_sub_header_format_for_row { padding-right:2px; text-align:left; }
.col_format { background:white; font-size:20px; }
.col_header_format { font-weight: 600; }
.row_sub_header_format { top: 0; z-index: 10; }   /* position:sticky is commented out at :567 */
.filter_description_col, .col_sub_header_format_for_row, .col_format, .col_sub_header_format { height:35px; }
```
(`ophis.css:347-349, 525-570, 596-598`)

Row hover / selection:
```css
.z_date_output_row:hover > td,
.z_date_output_row[chart_hover="true"] > td,
.iso_event_row[row_selected="true"] > td {
    background-color: rgb(115 255 130);
    z-index:10;
}
```
(`ophis.css:435-441`) — one rule covers mouse hover, chart-driven hover, and row selection. `row_selected="true"` is the second load-bearing HTML attribute contract.

Other table pieces: `.panel_cell_with_table_output { vertical-align: top; height:0vh; }` (`:330-333`), `.top_col_td { padding:0px; vertical-align: top; }` (`:351-354`), `.selected_detailed_output_cell { background-color:#EEEEEE; background:#EEEEEE; }` (`:838-841`), `.z_op_detail_cell, .z_op_detail_header_cell { padding:5px; }` and `.z_op_detail_header_cell, .z_op_details_label_cell { font-weight:600; }` (`:149-155`), `.algo_output_in_col { margin:5px; }` (`:45-47`), `.col_output_text { margin-left:5px; }` (`:724-726`), `.col_with_input_left_right_padding { padding-left:5px; padding-right:5px; }` (`:591-594`), `.hide_left_border`/`.hide_right_border` (`:716-722`), `.blurred_output_column * { visibility: hidden; }` (`:473-476`; a `filter: blur(8px)` alternative is commented out).

### 4.5 Component: inputs, selects, buttons

```css
select {
    cursor:pointer;
    border:1px solid black;
    padding:2px;
    background: white;
    height:32px;
}
.general_input { height: 26px; padding: 2px; box-sizing: border-box; }
```
(`ophis.css:248-254, 274-278`) — note the **1px** border on `select` against the app-wide **1.5px**, and the 32px vs 26px height mismatch between `select` and `.general_input`.

```css
.date_input_common, .iso_event_name_input, .password_input, .filter_text_input {
    font-size:18px;
    text-align:right;
    padding-right:3px;
    width:100%;
}
.iso_event_name_input, .password_input { padding-left:4px; text-align: left; }
.operation_equation_input, .operation_validation_result { font-family: monospace; font-size:18px; }
.lat_input  { width: 40px; margin-right:2px; }
.long_input { width: 50px; }
.x_date_count { margin-left:5px; margin-right:5px; font-size:20px; width:20px; }
.text_area { box-sizing: border-box; padding: 10px; border-radius: 10px; width: 100%; }
```
(`ophis.css:198-205, 584-589, 621-631, 651-656, 740-743`)

Numeric inputs are **right-aligned**; name/password inputs are left-aligned. The formula input is monospace at 18px — the only place equations are typed.

```css
button, button:disabled { background-color: rgb(239, 239, 239); }
button:disabled { cursor:default; }
input[type="radio" i]:disabled { border-color: grey; }

.add_button, .general_button { cursor:pointer; white-space: nowrap; }
.add_button   { padding:2px; padding-left:5px; padding-right:5px; height:32px; }
.square_button { width:32px; font-weight: 600; }
.square_button:disabled > img { opacity: .5; }
```
(`ophis.css:696-706, 745-764`)

The circular insert-row button — the one genuinely distinctive control:

```css
.row_insert_button {
    background-color: rgb(239, 239, 239);
    border: 1.5px solid black;
    width: 16px;  height: 16px;
    z-index: 2;
    border-radius: 14px;
    padding: 4px;
    background: #efefef;
    cursor: pointer;
    position:relative;
    top:-16px;
    margin-left:4px;  margin-right:4px;
}
```
(`ophis.css:451-471`) — a 16×16 image inside a 4px pad with a 14px radius, pulled 16px upward so it straddles the boundary between two rows. Contains four commented-out positioning attempts, evidence this was fiddly.

Row action buttons:
```css
.row_delete_button, .row_delete_button_master, .row_clone_button {
    -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none;
    font-size:25px;
    padding-left: 5px; padding-right: 5px;
}
.row_clone_button > img, .row_notes_button > img { height:25px; }
.row_clone_button { font-weight:700; }
.row_radio_button_label, .row_radio_button_for_swap_label { padding:5px; display:block; width:20px; height:20px; }
.row_radio_button, .row_radio_button_for_swap { user-select:none; margin: 0; width:100%; height: 100%; }
```
(`ophis.css:640-694`)

Checkboxes are uniformly **20×20 with `cursor:pointer`**, applied to a long explicit class list (`ophis.css:478-485`) covering: `.location_enabled_checkbox`, `.blur_about_screen_checkbox`, `.hide_col_checkbox`, `.prettify_x_date_output`, `.minify_x_date_output`, `.auto_recalculate_z_dates_checkbox`, `.iso_event_filter_checkbox`, `.iso_event_chart_option_checkbox`, `.x_date_checkbox`, `.t_date_checkbox`, `.operation_checkbox`, `.iso_event_swap_checkbox`, `.iso_event_swap_setting_checkbox`, plus a `_master` variant of each of the last seven (master = the header "check all" toggle). Filter and chart-option checkboxes additionally get `display:block` (`:493-495`).

Icons:
```css
.open_map_icon { cursor: pointer; width:30px; height:30px; display:block; }        /* :173-187 (two rules) */
.sort_icon {
    cursor: pointer; width:25px; height:25px; display: block; margin-right: 5px;   /* :179-192 (two rules) */
    position:relative;
    box-shadow: 1px 1px 2px rgba(0, 0, 0, 1);
    border-radius: 4px;
    border:1px solid black;
    background-color: white;                                                       /* :443-449 */
}
```

### 4.6 Component: dialogs, toasts, tooltips, map

**Yes/No dialog:**
```css
#yes-no-dialog-wrapper { width:100%; height:100%; top:0; left: 0; }        /* :256-263 (position:fixed commented out) */
#yes-no-dialog-wrapper, #map-container { z-index: 1656; }                  /* :265-267 */
#yes-no-dialog-background, #map-container { background-color: rgba(0, 0, 0, .7); }  /* :269-271 */
#yes-no-dialog {
    background:white;
    padding:20px;
    border:1.5px solid black;
    border-radius: 10px;
    display: inline-block;
    font-size:20px;
    max-width:33%;
    margin:20px;
}
.bold_dialog_text { font-weight:600; }
```
(`ophis.css:256-294, 580-582`)

**Notes popup:** `#notes-pop-up-wrapper { display:none; position:fixed; top:0; left:0; min-width:552px; min-height:552px; justify-content:center; z-index:1000; }` (`ophis.css:658-667`).

**Toast (snackbar):**
```css
.toast_wrapper {
    width:100%;
    position: fixed;
    visibility: hidden;
    text-align: center;
    bottom: 30px;
    -webkit-animation: fadein 0.5s, fadeout 0.5s 2.5s;
    animation: fadein 0.5s, fadeout 0.5s 2.5s;
    z-index: 10000;
}
.toast {
    display: inline;
    background-color: #333;
    color: #fff;
    border-radius: 10px;
    padding: 16px;
    z-index: 10000;
}
.toast.show { visibility: visible; }

@keyframes fadein  { from {bottom: 0;    opacity: 0;} to {bottom: 30px; opacity: 1;} }
@keyframes fadeout { from {bottom: 30px; opacity: 1;} to {bottom: 0;    opacity: 0;} }
```
(`ophis.css:770-823`; `-webkit-` duplicates of both keyframes are present.) **Total on-screen life is 3.0s** (0.5s in, 2.5s hold, 0.5s out); the `.show` class is added by JS and the animation fires on the *wrapper*.

**Tipsy tooltips** (jQuery Tipsy, verbatim `ophis.css:825-836`):
```css
.tipsy { padding: 5px; font-size: 18px; position: absolute; z-index: 100000; box-sizing: border-box; }
.tipsy-inner { padding: 8px; background-color: black; color: white; max-width: 500px; text-align: left;}
.tipsy-inner { border-radius: 3px; -moz-border-radius:3px; -webkit-border-radius:3px; }
.tipsy-arrow { position: absolute; background: url('../img/tipsy.gif') no-repeat top left; width: 9px; height: 5px; }
.tipsy-n .tipsy-arrow  { top: 0; left: 50%; margin-left: -4px; }
.tipsy-nw .tipsy-arrow { top: 0; left: 10px; }
.tipsy-ne .tipsy-arrow { top: 0; right: 10px; }
.tipsy-s .tipsy-arrow  { bottom: 0; left: 50%; margin-left: -4px; background-position: bottom left; }
.tipsy-sw .tipsy-arrow { bottom: 0; left: 10px; background-position: bottom left; }
.tipsy-se .tipsy-arrow { bottom: 0; right: 10px; background-position: bottom left; }
.tipsy-e .tipsy-arrow  { top: 50%; margin-top: -4px; right: 0; width: 5px; height: 9px; background-position: top right; }
.tipsy-w .tipsy-arrow  { top: 50%; margin-top: -4px; left: 0; width: 5px; height: 9px; }
```
Tooltip **content** is an HTML table styled by `.tool_tip_table_border { border: 1px solid white; padding:4px; }` and `.tool_tip_table_left_row { text-align: left; font-weight:600; }` (`ophis.css:49-57`) — white gridlines on a black tooltip body.

Help cursors: `.msrf_no_matches { width:100%; height:100%; cursor: help; }` (`:86-90`) and `.tool_tippable_cursor, .detail_col_header, .help_cursor { cursor: help; }` (`:169-171`).

**Leaflet map modal:**
```css
.leaflet-control-attribution { display: none; }                 /* :194-196 — attribution suppressed */
#map-container { width:100%; height:100%; position:fixed; }     /* :207-211 */
#map { width:80%; height: 80%; display: inline-block; cursor: crosshair; }   /* :232-237 */
#map-background-close-capture { width:100%; height:100%; position:absolute; top:0px; left:0px; }  /* :224-230 */
#map-current-lat-long {
    position: fixed; margin-bottom:10px; margin-right:10px;
    right: 10%; bottom: 10%; z-index: 2000; background: white; padding:5px;
}                                                               /* :213-222 */
#map-close-button {
    position: fixed; margin-top:10px; margin-right:10px;
    right: 10%; top: 10%; z-index: 2000;
}                                                               /* :239-246 */
```

**Flatpickr override:** `.flatpickr-calendar { border: 2px solid black; margin-left: 3px; }` (`ophis.css:633-638`).

### 4.7 Animations and loading

```css
.fade_in_panels { animation: fadeIn .5s; }
@keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }

.fade_out_loading_image {
    visibility: hidden;
    opacity: 0;
    transition: visibility 0s .25s, opacity .25s linear;
}

.loading_image {
    position: absolute;
    top: 50%; left: 50%;
    width: 120px; height: 120px;
    margin:-60px 0 0 -60px;
    -webkit-animation:spin 1s linear infinite;
    -moz-animation:spin 1s linear infinite;
    animation:spin 1s linear infinite;
}
@keyframes spin { 100% { -webkit-transform: rotate(360deg); transform:rotate(360deg); } }
```
(`ophis.css:844-880`; `-moz-` and `-webkit-` keyframe duplicates present.) The spinner is `img/spinning_globe.png` / `img/spinning_globe_white.png` selected at `src/ophis_view__utils.js:376`. **There is no `prefers-reduced-motion` guard anywhere** — add one in the rebuild.

### 4.8 Remaining utility classes (complete)

`.empty_event_swap_cell { border: 0px solid black !important; }` (`:2-4` — the only `!important` in the file) · `.event_name_source, .event_name_target { overflow:hidden; white-space:nowrap; max-width:1px; text-overflow: ellipsis; }` with the comment `/* Overridden in code */` (`:20-25`) · `.chart_option_table { display:block; float:right; }` (`:27-30`) · `.chart_option_table_col { vertical-align: middle; }` (`:32-34`) · `.condensed_score { font-weight:600; }` (`:41-43`) · `.parenthetical_equation { font-size:14px; }` (`:59-61`) · `.date_range_arrow { font-size:25px; }` (`:145-147`) · `.timezone_display, .prior_sunset_display { font-size:16px; width:90px; white-space:nowrap; overflow:hidden; text-overflow: clip; color:#858585; font-weight:500; }` (`:157-167`) · `code { background-color:#e3e3e3; border-radius:10px; padding:10px; margin:15px; display:block; font-size:15px; border:1px solid grey; }` (`:309-317`) · `html, body { width:100%; height:100%; }` (`:319-322`) · `.large_font { font-size:20px; }` (`:335-337`) · `.bordered { border: 1.5px solid black; }` (`:339-341`) · `.small_border_radius { border-radius:5px; }` (`:343-345`) · `.chart_help_hit_count_cell_inner { vertical-align:middle; padding:5px; border:1.5px solid black; }`, `.chart_help_hit_count_cell_header { background-color:#BBBBBB; font-weight:bold; }`, `.chart_help_hit_count_cell_inner img { width:30px; height:30px; vertical-align:middle; }`, `.chart_help_hit_count_cell_inner span { height:30px; font-weight:600; margin-right:5px; }` (`:356-377`) · `.panel_error_text { padding:5px; }` (`:505-507`) · `.warning_color { color: darkorange; }` (`:555-558`) · `.about_header { font-size:25px; font-weight:500; margin-top:10px; margin-left:10px; text-decoration: underline; }` (`:572-578`) · `.about_body { margin-left:20px; margin-top:10px; margin-right:10px; margin-bottom:10px; font-size:20px; }` (`:613-619`) · `.about_page_ul { margin-top:0px; }` (`:728-730`) · `.about_screen_points { font-weight:600; }` (`:766-768`) · `.export_link { cursor:pointer; color: blue; text-decoration: underline; }` (`:600-604`) · `.filter_description_col { white-space:nowrap; text-align:right; }` (`:606-611`) · `.error_color { color: red; }` (`:732-734`) · `.green_color { color: green; }` (`:736-738`) · `#unsaved-changes-reminder { font-weight:400; margin-left:5px; }` (`:291-294`).

### 4.9 The two numeric Easter eggs in the stylesheet

- `z-index: 1656` on `#yes-no-dialog-wrapper, #map-container` (`ophis.css:265-267`). **1656 is the Annus Mundi year of the Great Flood** (`chronicon-clocks-calendrics.txt:527`) *and* a member of `MSRF_FILTER__IMPORTANT` (verified). An arbitrary z-index would not land there.
- `min-width:552px; min-height:552px` on `#notes-pop-up-wrapper` (`ophis.css:658-667`). **552 = 138 × 4**, the Chronicon's "Phoenix cycles" (`chronicon-clocks-calendrics.txt:463`), also a member of `MSRF_FILTER__NORMAL`, and the multiplier behind `ophis-xtras.txt` ops 21–23 (`5.52`).

Both are almost certainly intentional. They are also the *only* trace of the cosmology inside the stylesheet — worth preserving as a wink in the rebuild, and worth a footnote in the write-up.

### 4.10 The rewrite design system (`PSYFR1.html` / `chronicon-clocks-calendrics.txt`) — for reference

The browser rewrites use a completely different, and far more designed, system. Since the rebuild targets the browser and carries the PSYFR brand, this is the more likely visual starting point. Verbatim dark palette, `PSYFR1.html:12-16`:

```css
:root{
  --bg:#07070c;--bg2:#0d0d18;--ink:#ece5d2;--dim:#8a8470;--gold:#d8a943;--gold2:#f3d27a;
  --red:#d3402f;--cyan:#54b8c9;--green:#7faa5a;--violet:#9b7fd0;
  --line:rgba(216,169,67,.2);--panel:rgba(20,20,32,.55);--panel2:rgba(20,20,32,.75);
}
```

Verbatim light ("aged parchment") theme, `PSYFR1.html:257-262`:

```css
:root[data-theme="light"]{
  --bg:#ece0c6;--bg2:#e0d2b2;--ink:#2c2317;--dim:#6a5f45;
  --gold:#9a6f14;--gold2:#7d5410;--red:#b32a1a;--cyan:#1d6c7d;--green:#4d7730;--violet:#69479c;
  --line:rgba(90,60,15,.30);--panel:rgba(255,251,242,.7);--panel2:rgba(255,251,242,.92);
}
```

Plus `:root[data-theme="dark"]{--dim:#9c947c}` (`PSYFR1.html:253`) — a readability lift on the dim token in dark mode only.

- **Fonts (Google Fonts, the only external resource):** `Cinzel` 400/600/800 (display/serif headings), `EB Garamond` 400/500 + italic (body serif), `IBM Plex Mono` 400/500/600 (labels, tables, eyebrows). Loaded from `fonts.googleapis.com` (`PSYFR1.html:10`).
- **Background recipe** (`PSYFR1.html:19-26`): two radial gradients (warm red at 84%/-8%, cyan at 6%/108%) over a 46px×46px gold grid built from two `repeating-linear-gradient`s at 2.2% alpha, over `var(--bg)`.
- **Headline treatment:** `Cinzel` 800, `clamp(40px,10vw,96px)`, filled with `linear-gradient(180deg,#fff,var(--gold2) 50%,var(--gold))` clipped to text.
- **Semantic role mapping (colour → cycle):** red = Phoenix/138, cyan = Metonic/19, gold2 = palindrome, green = documented event, violet = Nemesis (`chronicon-clocks-calendrics.txt:224-226, 262-266`; `PSYFR1.html:52-54`).
- **Accessibility work already done** (`PSYFR1.html:222-240`): a `--zoom` custom property driving `body{zoom:var(--zoom,1)}` with A−/A/A+ controls, `:focus-visible` rings at `2.5px solid var(--cyan)` with 2px offset on every interactive element, a `@media (prefers-reduced-motion: reduce)` block collapsing all transitions and animations to `.001ms`, and a "Simple" mode toggling `body.simple .simple-hide{display:none!important}`. **Carry all four forward** — the original `ophis.css` has none of them.

The clean way to think about it: **`ophis.css` supplies the semantic colour contract and the component inventory; the PSYFR system supplies the palette, type, and accessibility layer.** Map the five MSRF/operation roles onto the PSYFR tokens (`msrf_vortex`→violet, `msrf_important`→red, `msrf_normal`→green, `operation_alpha`→gold, `operation_beta`→cyan) and the two systems reconcile cleanly.

---

## 5. THE PNG ASSET LIBRARY

**Totals under `img/`** (measured): **1,404 `.png`** files plus 2 `.webp`, 1 `.jpg`, 1 `.gif`, 1 `.ico`, 1 `.svg`, 1 `.ttf`, 1 `.xml`, 1 `.webmanifest`, and 7 stray `.DS_Store` files. Additionally `lib/images/` holds 5 Leaflet control PNGs.

### 5.1 Breakdown

| Group | Count | What |
|---|---|---|
| `img/offline_map/map/{z}/{x}/{y}.png` | **1,365** | **Offline Leaflet slippy-map tile pyramid.** This is 97% of the PNGs. Zoom levels 0–5, complete: z0 = 1, z1 = 4, z2 = 16, z3 = 64, z4 = 256, z5 = 1024 tiles (= 4^z each; total 1365). Sample paths: `img/offline_map/map/0/0/0.png`, `img/offline_map/map/2/1/3.png`, `img/offline_map/map/5/9/9.png`. |
| `img/astro_indicators/*.png` | **12** | Chart overlay glyphs: `new_moon.png`, `waxing_crescent_moon.png`, `first_quarter_moon.png`, `waxing_gibbous_moon.png`, `full_moon.png`, `waning_gibbous_moon.png`, `third_quarter_moon.png`, `waning_crescent_moon.png`, `solar_eclipse_full.png`, `solar_eclipse_partial.png`, `lunar_eclipse_full.png`, `lunar_eclipse_partial.png`. |
| `img/hit_symbols/*.png` | **4** | `gemini.png`, `triangle.png`, `diamond.png`, `circle.png` — hit-count 2/3/4/5+, **not** zodiacal. |
| `img/*.png` (root) | **23** | UI icons + favicon set (below). |
| `lib/images/*.png` | 5 | Leaflet's own: `layers.png`, `layers-2x.png`, `marker-icon.png`, `marker-icon-2x.png`, `marker-shadow.png`. |

Root-level PNGs, with sizes: `header.png` (147,440 B), `header_markets.png` (123,292 B), `clone.png` (19,990), `left_arrow.png` (3,309), `location.png` (9,236), `notes_icon.png` (4,027), `notes_icon_orig.png` (3,115), `plus_icon.png` (4,529), `score_icon.png` (4,741), `sort_icon.png` (1,414), `sunset.png` (4,151), `spinning_globe.png` (21,927), `spinning_globe_white.png` (21,896), `fire.png` (56,701), `eclipse_solar_total.png` (26,143), `eclipse_solar_total_orig.png` (203,956), plus the favicon set: `favicon.png` (90,623), `favicon-16x16.png`, `favicon-32x32.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `apple-touch-icon.png`, `mstile-150x150.png`.

Non-PNG assets: `alarm_clock.ttf` (the LCD display font), `tipsy.gif` (**58 bytes** — see gotchas), `sunset.jpg` (148,540 B, referenced only from a commented-out rule), `fire.webp`, `plus_icon.webp`, `favicon.ico`, `safari-pinned-tab.svg`, `site.webmanifest`, `browserconfig.xml`.

### 5.2 How code references the assets — complete reference map

Every image reference in `src/`, with its exact string:

| Path pattern | Referenced at | Mechanism |
|---|---|---|
| `img/header.png` / `img/header_markets.png` | `src/ophis_view.js:46, 48, 50` | `document.getElementById("header-image").src = …` — skin-mode swap. DOM id **`header-image`** is a cross-module contract. |
| `./img/offline_map/map/{z}/{x}/{y}.png` | `src/ophis_main.js:316` | `L.tileLayer('./img/offline_map/map/{z}/{x}/{y}.png', {…})` — Leaflet template. |
| `img/astro_indicators/<file>` | `src/ophis_config.js:181` | `generateChartOptionIconHtml()` returns `"<img … src='img/astro_indicators/"+imagePath+"' />"` |
| `img/astro_indicators/<moon>.png` | `src/ophis_view__chart_config.js:86-93, 163` | `MOON_PHASE_DICT[lunarphase.LunarPhase.X] = newMoonPhaseDictEntry(<serializedFieldKey>, <lunarAgeFraction>, "<file>.png")`; preloaded by `newImage(ithPhase, "img/astro_indicators/" + ithMoonPhaseObject.imagePath)` |
| `img/astro_indicators/{solar,lunar}_eclipse_{full,partial}.png` | `src/ophis_view__chart_config.js:167-170` | `newImage(SOLAR_ECLIPSE_TYPE__FULL, "img/astro_indicators/solar_eclipse_full.png")` etc. |
| `img/hit_symbols/*.png` | `src/ophis_view__chart_config.js:114-117` | `var CHART_SYMBOL_IMAGE_SRC__GEMINI = "img/hit_symbols/gemini.png";` (+ `__TRIANGLE`, `__DIAMOND`, `__CIRCLE`) |
| `./img/location.png` | `src/ophis_view__rebuild.js:266` | `"<img class='open_map_icon' title='Open map...' src='./img/location.png' />"` |
| `./img/clone.png`, `./img/notes_icon.png` | `src/ophis_view__rebuild.js:303-304` | inline `<img style='display:block;'>` |
| `./img/left_arrow.png` | `src/ophis_view__rebuild.js:763`, `src/ophis_view__settings.js:814` | the `.row_insert_button` glyph (X-Dates and Operations rows) |
| `./img/sunset.png` | `src/ophis_view__rebuild.js:765` | inline 24×24 at `opacity:.5` inside the prior-sunset tooltip table |
| `./img/spinning_globe.png` / `_white.png` | `src/ophis_view__utils.js:376` | `var imgSrc = isWhite ? "./img/spinning_globe_white.png" : "./img/spinning_globe.png";` — the `.loading_image` spinner |
| `./img/sort_icon.png` | `src/ophis_view__output.js:256` | column-header sort button |
| `../img/alarm_clock.ttf` | `src/ophis.css:17` | `@font-face` |
| `../img/tipsy.gif` | `src/ophis.css:828` | `.tipsy-arrow` background |
| `../img/sunset.jpg` | `src/ophis.css:83` | **commented out** |
| `./img/fire.webp` | `src/ophis_view__output.js:284` | **commented out** — an abandoned flame glyph for the Score column header |

**Two important structural facts:**

1. **Every reference is a plain relative string built by concatenation into `innerHTML` or assigned to `.src`.** There is no manifest, no import map, no asset hashing, no sprite sheet, no build step. A rebuild can therefore relocate the asset root freely — but must keep the *filenames* stable, because `MOON_PHASE_DICT` and the eclipse dictionaries key preloaded `Image` objects by them (`src/ophis_view__chart_config.js:86-93, 163-170`).
2. **Path prefixes are inconsistent**: some use `img/…` and some `./img/…`. Both resolve identically from the bootstrap document, but it means a naive find-and-replace on `"img/` will miss half the references. Normalise on one form in the rebuild.

### 5.3 Assets referenced from nothing in `src/`

`android-chrome-192x192.png`, `android-chrome-512x512.png`, `apple-touch-icon.png`, `favicon.png`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon.ico`, `mstile-150x150.png`, `safari-pinned-tab.svg`, `site.webmanifest`, `browserconfig.xml` — the standard realfavicongenerator output set, wired from `<head>` in `ophis.html` (inside the asar, not present in this tree).

`eclipse_solar_total.png`, `eclipse_solar_total_orig.png`, `notes_icon_orig.png`, `plus_icon.png`, `plus_icon.webp`, `score_icon.png`, `fire.png`, `sunset.jpg` — **unreferenced from `src/` and from `ophis.css`**. The `_orig` suffix pattern (`eclipse_solar_total_orig`, `notes_icon_orig`) marks pre-edit originals kept beside the shipped versions. `fire.png`/`fire.webp` and `score_icon.png` are the abandoned Score-column flame. These are dead weight — drop them from a rebuild, or move them to an `assets/unused/` archive.

### 5.4 Rebuild guidance for assets

- The **1,365-tile pyramid is the entire reason `img/` is large**, and it exists solely so the Leaflet lat/long picker works air-gapped. Zoom 0–5 gives roughly country-level resolution — enough to click a city, not enough to click a street. If the rebuild keeps offline operation, keep the pyramid; if it can assume connectivity, replace it with a simple two-number lat/long entry plus an optional online tile source, and the asset footprint drops by ~97%.
- The **16 chart glyphs** (12 astro + 4 hit symbols) are the only genuinely bespoke artwork. They are the assets to preserve or re-cut.
- The **two 130–150 KB header PNGs** are the entire "branding" of the original. In a browser rebuild these should become typography (Cinzel wordmark, per §4.10), not raster.

---

## 6. TODOs, ROADMAP NOTES, AND PLANNED FEATURES

Complete inventory from `src/` (29 hits), grouped by whether they are worth carrying forward.

### 6.1 Worth carrying forward (real design intent)

| Note | Location | Carry-forward reading |
|---|---|---|
| `// TODO: Try to pipe these kinds of things to an activity log, ultimately. Toasts are limited.` | `src/ophis_view__utils.js:949` | **Build an activity/event log panel.** The 3-second toast is the app's only feedback channel and it silently drops messages. A scrollable log is the single highest-value UX addition. |
| `// TODO: Perhaps a White List of fields to keep, rather than deleting what shouldn't be there.` | `src/ophis_model__validation.js:470` | **Do this.** Import sanitisation is currently a denylist (delete known-bad fields); an allowlist is both safer and the direct structural fix for the "permissive import" half of Finding #1. |
| `//TODO: Little specific here. Maybe have a more generic way of trickling resizes-only down to UI.` | `src/ophis_main.js:711` | A resize-propagation abstraction; relevant if the rebuild is responsive. |
| `// TODO: Eliminate the recursion completely so output doesn't get rendered twice in a row.` | `src/ophis_view.js:149` | A known double-render in `refreshCurrentPage()`. Fix by design in the rebuild rather than porting the recursion. |
| `//TODO Maybe something a little more formal.` on `var isXDatePoint = label.includes(X_DATE_SHORTHAND);` | `src/ophis_view__chart_datasets.js:811` | **Chart point identity is currently inferred by substring-matching the human-readable label.** Give chart points a typed `kind` field. |
| `// TODO: Minor naming issue, z-delta should only mean axial rotation count.` on `z_value: ithZValue_raw` | `src/ophis_model__operations.js:393` | Naming cleanup: distinguish `z_value` (2dp day offset) from `rotation_count_z` (1dp, MSRF input) explicitly. |
| `// TODO: Find/replace all remaining instances of getTime().` / `// TODO: Find/replace all remaining instances of new Date()` | `src/ophis_utils.js:319, 325` | The author wanted **all** date access funnelled through wrappers — necessary for the v12 `--current-epoch-millis` CLI flag to be honoured consistently. In a rebuild, route every clock read through one injectable `now()`. |
| `NOTE: The below export options are provided as a Proof of Concept and can be improved depending on use cases.` | `src/ophis_view__export.js:194` | **Export is explicitly labelled a prototype by its author.** The 3-column CSV/XLSX is a placeholder. |
| `// TODO: Wouldn't that mean that all dialog actions would have to account for this? I forget exactly what the JavaScript event flow is here.` (×3) | `src/ophis_view__settings.js:404, 674, 748` | Unresolved dialog/event-flow uncertainty repeated three times — a sign the modal interaction model needs a proper design in the rebuild, not a port. |
| `var titleForHidingCol = "TODO";` | `src/ophis_view__output.js:254` | **A literal `"TODO"` string shipped as a user-visible tooltip** on the column-hide control. Write the real copy. |
| `//TODO: May need to get rid of this regardless as it never came to anything.` | `src/ophis_model__validation.js:547` | Dead migration branch; delete. |

### 6.2 Historical notes (record, don't act on)

- `// NOTE: Used to always add an X-Date here. New UI can have zero X-Dates.` — `src/ophis_model__validation.js:843`. A new Iso-Event now starts empty.
- `// NOTE: Now assigning the event name further down through object property to avoid any possible cross-browser quirks.` — `src/ophis_view__rebuild.js:278`.
- `// NOTE: CANNOT use X_DATE_TIME_DISPLAY_FORMAT because apparently moment.js differs from other parsing` — `src/ophis_config.js:281`. A moment.js format-string incompatibility; relevant if replacing moment.
- `// NOTE: PURPOSELY using phi to 3 decimal places…` — `src/ophis_config.js:394` (quoted in full in §2.1). **Do not "fix" `1.618` to `1.62`.**
- `// NOTE: Filter numbers 21 and 76 have been commented out since rounded down vortex numbers match these.` / `// UPDATE: Re-enabled 21 and 76 after discussion with Jason to match a vortex number within a certain tolerance.` — `src/ophis_model__params.js:15-16`. The provenance of the vortex tolerance mechanism.
- `// NOTE: PURPOSELY using startingXDate_native and NOT dateToWhichToAddZValue_native as the start date.` — `src/ophis_model__operations.js:358`.
- `// NOTE: This was the old way I was calculating the delta, which had some seemingly bad results…` — `src/ophis_utils.js:967`. A rejected day-delta algorithm preserved in comments.
- `// TODO: This is here so that Stale vs. Up-to-date don't shift the UI at all.` — `src/ophis_view.js:278`. Layout-stability hack for the recalculation banner; **keep the intent** (no layout shift when results go stale).
- `//             showToast("NOTE: At least one T-Date must be added for this Filter to take effect.");` — `src/ophis_view__utils.js:941`. A commented-out T-Date guidance toast; the guidance is still needed.
- `// TODO: Probably a TODO warranted here, to crop just the year off.` — `src/ophis_utils.js:67`. YEARS-scope formatting is incomplete.

### 6.3 Roadmap items from the reports (not code comments)

- `Ophis_v9_ReverseEngineering_Report.md:204` — `OPHIS_SCREEN__DEBUG` exists as a module but is commented out of the screen picker; the About text once described it as *"kind of half-baked and will either be improved on, or later versions may exclude it"* (now itself commented out at `src/ophis_view.js:630`). **Decision needed: build a real audit/debug view, or delete the concept.**
- `Ophis_v9_ReverseEngineering_Report.md:203` — `EVENT_TYPE__ASTROLOGICAL` is defined but commented out of the enum. A third event type was planned.
- `Ophis_v9_ReverseEngineering_Report.md:191` — the XLSX exporter *could* emit real `=…` formulas (`write-excel-file` supports `type: undefined, formula: "…"`), which would make the Excel output auditable rather than opaque. **Strong candidate feature.**
- `Ophis_v9_ReverseEngineering_Report.md:209` — an **alternative curve-fanout algorithm** sits commented out at `ophis_view__chart_datasets.js:1389-1426`. Worth reading before designing the chart's collision-spreading.
- `Ophis_v12_ReverseEngineering_Report.md:312` (recommendation F) — de-duplicate `PSYFR1.html` / `Natori-On-PSYFR-Main-UI.html`; make one the source of truth.
- `ophis-xtras.txt` in its entirety is a roadmap item: ten more operations (§2.5) that were written down but never shipped.
- `README.md:69` — *"Study artifact — add your own license before publishing."* Licensing is still open.

---

## 7. GOTCHAS

Subtle behaviour a naive reimplementation gets wrong. Ordered by how much damage each causes.

1. **The MSRF NORMAL array is 325 entries, not 276.** Both prior reports say 276 (`Ophis_v12_ReverseEngineering_Report.md:132, 332`; `Ophis_v9_DeepDive_Addendum.md:542, 589`). Verified by parsing the shipped literal: **325** (324 literals + `HIGHEST_MSRF_NUMBER`). IMPORTANT is **53**, not 52 (`Ophis_v9_DeepDive_Addendum.md:595` says 52). Any interpretive claim resting on "276 = T₂₃" or "52 = weeks per year" is void.

2. **`MSRF_FILTER__NORMAL` is not sorted.** Index 248 holds `1574`, wedged between `1641` and `1680` (`src/ophis_model__params.js:29`). Matching is exact-membership, so this is currently harmless — but **the moment anyone "optimises" the lookup to a binary search, 1574 becomes unmatchable and 1641/1680 may misbehave.** Either sort the array at load time or keep a hash-set lookup. The startup self-check does not test ordering.

3. **`.5` rejection happens *after* the vortex check, not before.** Order is VORTEX (±0.1) → `.5` bail-out → IMPORTANT (exact) → NORMAL (exact) (`Ophis_v9_DeepDive_Addendum.md:724-748`). So a Z-rotation of `21.5` is rejected by the `.5` rule, but `43.5` **matches vortex 43.5** and never reaches the rejection. Inverting the two checks silently kills three of the twelve vortex numbers (43.5, 435.6, and — via ±0.1 — several neighbours).

4. **Two different roundings of the same Z-value.** `z_value` is rounded to `DECIMAL_PRECISION__TIME = 2`; `rotation_count_z` is rounded to `DECIMAL_PRECISION__AXIAL_ROTATIONS = 1`, and **only the 1-dp value feeds MSRF matching** (`Ophis_v9_DeepDive_Addendum.md:119, 208`). Also: the day→millisecond conversion happens on the **raw, unrounded** value *before* the 2-dp rounding (`:87, :90`). Getting this order wrong shifts dates by up to half a day and changes which numbers match.

5. **Z-Date buckets key on milliseconds, not on day count.** Two operations that produce the same integer day offset from **different anchors** land in **different buckets** and do not merge (`Ophis_v9_DeepDive_Addendum.md:131`). A reimplementation that buckets on "days since X1" will over-merge and inflate hit counts.

6. **`newOperation()` ignores its third argument.** It hard-codes `enabled: true` regardless of what is passed (`Ophis_v9_DeepDive_Addendum.md:336`). So `newOperation("X1+YxOPH_HEP", …, OPERATION_ENABLED_FALSE)` at `src/ophis_model__params.js:109` produces an **enabled** operation. Do not infer shipped enabled-state from the constructor call.

7. **There are three default-operation factories, not two.** `cloneDefaultOperationsForAppVersionLte7()` → `…Gte8()` (force-enable all + promote `X1+YxOPH_PI` and `X2+(Y/2.0)xOPH_PHI` to α) → `…Gte10()` (append `X2+YxOPH_HEP`). Verbatim at `src/ophis_model__params.js:115-143`. The 16th operation is **appended by the Gte10 factory**, not present in the base array — so reading `DEFAULT_OPHIS_OPERATIONS_LTE_V7` alone gives you 15 and the wrong weights.

8. **`replaceOperationConstants()` does not handle `OPH_HEP`.** Verbatim, `src/ophis_view__strings.js:48-54`:
   ```js
   function replaceOperationConstants(operationEquation) {
       operationEquation = operationEquation.replace("OPH_CRV", OPH_CRV);
       operationEquation = operationEquation.replace("OPH_PI", OPH_PI);
       operationEquation = operationEquation.replace("OPH_PHI", OPH_PHI);
       return operationEquation;
   }
   ```
   Three of the four constants are substituted; `OPH_HEP` is missing, so any UI surface using this helper renders the hepta operations with a raw `OPH_HEP` token instead of `7.01`. Also every call is `String.prototype.replace` with a **string** needle — first occurrence only — so an equation using a constant twice only gets the first one replaced. And `"OPH_PHI"` contains `"OPH_PI"`… no, it does not (`OPH_PHI` vs `OPH_PI` differ at position 4), but the `OPH_CRV`-first ordering is load-bearing enough to preserve as-is.

9. **`OPH_CRV`'s two code paths disagree.** The "expected precision" path yields `5.08` (a 2-dp rounding of π·φ = 5.0831…); the fallback path computes `roundNumberToTimePrecision(OPH_PI * OPH_PHI)` = `round(3.14 × 1.618, 2)` = `5.08` — the same by luck at 2dp, but at `DECIMAL_PRECISION__TIME = 3` the expected path gives `5.083` while the product of rounded constants gives `5.081`. `src/ophis_config.js:385, 412`.

10. **φ is 3dp on purpose while π is 2dp.** `OPH_PHI = 1.618`, `OPH_PI = 3.14`. The comment at `src/ophis_config.js:394-397` explains it is because the practitioner says "1.618" out loud and "1.62 looks wrong". A reimplementation that uniformly rounds constants to `DECIMAL_PRECISION__TIME` **changes every φ-based projection**.

11. **`ophis.css` has no CSS variables, no dark mode, no media queries, no `prefers-reduced-motion`.** Do not go looking for a token layer; there isn't one. The three animations (`fadeIn`, `fadein`/`fadeout` for toasts, `spin`) run unconditionally.

12. **CSS selector-list bug at `ophis.css:487-491`.** The rule intended to give seven checkbox classes `margin-top:5px` is broken by **two missing commas**:
    ```css
    .iso_event_filter_checkbox, …, .iso_event_swap_setting_checkbox     /* line 487 — no trailing comma */
    .iso_event_filter_checkbox_master, …, .iso_event_swap_checkbox_master .iso_event_swap_setting_checkbox_master
    { margin-top:5px; }
    ```
    Line 487 ends without a comma, so it fuses with line 488 into a **descendant** selector (`.iso_event_swap_setting_checkbox .iso_event_filter_checkbox_master`), and the same happens at the end of line 488. Net effect: **none of the intended seven classes gets `margin-top:5px`** — only two descendant combinations that almost certainly never occur in the DOM. The rebuild should decide whether the 5px offset was actually wanted (it has never been applied in production).

13. **`overflow-x: visible` next to `overflow-y: scroll` is a no-op.** `ophis.css:393-404`. Per CSS spec, when one axis is not `visible`, a `visible` on the other computes to `auto`. So `.scrollable_container` and `.chart_container` scroll on **both** axes despite the author's evident intent. This matters for the chart container.

14. **`tipsy.gif` is 58 bytes.** That is a 1×1-ish placeholder, so `.tipsy-arrow` (`ophis.css:828`) paints nothing — the tooltip arrows have never rendered. Either ship a real arrow or draw it with CSS borders.

15. **The monospace font stack at `ophis.css:297` is malformed.** `Courier New, monospace, Consolas, Monaco, …` puts the generic `monospace` keyword *second*, so it always wins and the six concrete families after it are unreachable. `.math_font` at `:302` has the correct ordering — use that one.

16. **`select` is 32px tall, `.general_input` is 26px.** (`ophis.css:248-254, 274-278`.) Rows mixing a select and a text input are visibly misaligned in the original. Unify in the rebuild.

17. **`select` uses a 1px border while everything else uses 1.5px.** (`ophis.css:251` vs the app-wide `.bordered`, `.inner_panel_table` etc.) Another original inconsistency, not a subtlety to preserve.

18. **`z-index` ladder is unusual and ordered:** `.row_insert_button` 2 → `.row_sub_header_format` / row-hover 10 → `#notes-pop-up-wrapper` 1000 → **`#yes-no-dialog-wrapper` / `#map-container` 1656** → `#map-current-lat-long` / `#map-close-button` 2000 → `.toast_wrapper` / `.toast` 10000 → `.tipsy` 100000. Note the map's own child controls (2000) sit **above** the map container (1656) — deliberate, so the close button and lat/long readout float over the Leaflet canvas.

19. **`.event_name_source, .event_name_target` set `max-width:1px` with the comment `/* Overridden in code */`** (`ophis.css:20-25`). The stylesheet value is meaningless; JS computes the real width. A CSS-only port renders these cells as a single ellipsis.

20. **The `.oph` `"app_version"` is a string, and the loader overrides `scoring_system` regardless of it.** `test-bradley.oph` carries `"app_version": "12"` (string, not `"12.0"` and not a number) while `ophis_config.js:3` has `APP_VERSION = "12.0"` and `package.json` has `"12.0.0"` — **three different version strings for the same build.** And per `Ophis_v9_ReverseEngineering_Report.md:137`, a missing/invalid `scoring_system` is forced to `GTE_V8` *regardless of the stored `app_version`*. Do not build version-dependent behaviour on `app_version` without normalising it first.

21. **The `x` multiplication token is a lowercase letter, not `×` and not `*`.** `X2+YxOPH_PHI` means `X2 + Y * OPH_PHI`. Normalisation must uppercase-protect `oph_*` function names **before** rewriting `x`→`*`, otherwise `oph_flip` becomes `oph_fli*` (`Ophis_v9_ReverseEngineering_Report.md:80`). The rewrites (`PSYFR1.html:856`) use `*` directly, so **`.oph` files are not interchangeable between the Electron app and the rewrite** without a token translation pass.

22. **`oph_flip` reinserts the decimal point at its original index *from the left*.** `12.5 → 52.1`, not `5.21`. `100 → 1`, because leading zeros vanish on `parseFloat`. `0.25 → 5.2`. (`Ophis_v9_DeepDive_Addendum.md:319-330`.) This is the single most commonly mis-ported function in the codebase.

23. **`ophis-xtras.txt`'s constants exist nowhere in code.** Verified: `2.718`, `1.38`, `5.52`, `2.178`, `0.360` appear in no `src/` file, no `.oph` file, and not in `PSYFR1.html`. They are numeric literals a user types. Do not add them to `ALL_OPH_CONSTANTS` expecting the substitution pass to find them — it substitutes *names*, and these have none.

24. **`OPHIS.html` in the repo root is not the app.** It is the v9 Field Guide, byte-identical to `Ophis_v9_Explained.html`. The real bootstrap is `ophis.html` (lowercase) *inside* the asar and is not present in this tree. (`METHOD.md:67`; `Ophis_v12_ReverseEngineering_Report.md:84`.) On a case-insensitive filesystem this is an active trap.

25. **`src/scratchpad.js` is a live code-injection point.** Two commented-out lines that reassign `DEFAULT_STARTING_SCREEN`, loaded last in the script order so it wins the cascade. Convenient in dev; do not ship the pattern.

26. **The 1,365 map tiles are 97% of the repo's image weight and exist purely for air-gapped operation.** Do not treat `img/` as "some icons".

27. **`ECLLIPSE_DATE_MATCH_TOLERANCE` is spelled with three Ls** at `src/ophis_config.js:115` (while `ECLIPSE_DATE_MATCH_TOLERANCE_IN_DAYS` at `:113` is spelled correctly). Grepping for the correct spelling misses the derived constant.

28. **MSRF is never expanded, and should not be guessed.** `Ophis_v9_DeepDive_Addendum.md:530-538` deliberately declines to pick an expansion. Any rebuild that prints "Magnetic Solar Reference Frame" in a tooltip is asserting something the source does not support.

29. **The Chronicon file is an HTML page, not prose.** `chronicon-clocks-calendrics.txt` is a saved web page whose *inner* engine is an entire second HTML document embedded in an `srcdoc=` attribute with `&quot;`-escaped markup (lines 135–928). All the interesting constants live inside that escaped document. Reading it as a text document, or grepping it naively for `"`, will produce garbage.

30. **The Chronicon page's moon renderer is layered dead code.** Four successive attempts ship in sequence — `renderMoon`/`drawPhase` (`:711-765`), `shadeMoon` (`:768-784`), `moonShade` (`:788-807`), and finally `window.__drawMoon` (`:811-844`) — with `renderMoon` monkey-patched at `:848-865` to call the last one. Only `window.__drawMoon` and the patched `renderMoon` are live. Do not port the first three.

31. **Two different synodic-month constants are in play.** Ophis uses `29.53058770576` (`src/ophis_config.js:102`); the Chronicon engine uses `29.530588853` (`chronicon-clocks-calendrics.txt:487`). They diverge in the 8th decimal — about 1 second per lunation, ~5 minutes over a century of lunations, which is inside the app's 1-day lunar match tolerance but will make deep-past phase comparisons between the two engines drift visibly. Pick one and use it everywhere.

32. **The Chronicon `buildTable` filter logic is a tautology.** Verbatim, `chronicon-clocks-calendrics.txt:600`:
    ```js
    if(filter!=='all' && kind!==filter && !(filter==='all')) { if(kind!==filter) return; }
    ```
    The `!(filter==='all')` term is redundant with `filter!=='all'`, and the inner `if` re-tests a condition already established. It works, but it is confused code; rewrite as `if (filter !== 'all' && kind !== filter) return;`.

---

## 8. PUBLIC INTERFACE SUMMARY (what other subsystems depend on from this one)

This subsystem is documentation, constants and styling, so its "interface" is the set of names and values other modules key off:

**Constants** — `OPH_PI = 3.14`, `OPH_PHI = 1.618`, `OPH_CRV = 5.08`, `OPH_HEP = 7.01`, `POINTS__{ALPHA,BETA}_OPERATION_MATCH = 1 | .5`, `POINTS__{NORMAL,IMPORTANT,VORTEX}_MSRF_MATCH = 1 | 2 | 2`, `SCORE_MULTIPLIER__{NORMAL,IMPORTANT,VORTEX}_MSRF_MATCH = 1.5 | 2.0 | 2.0`, `HIGHEST_MSRF_NUMBER = 2559`, `VORTEX_FILTER_MATCH_TOLERANCE = .1`, `DECIMAL_PRECISION__{TIME,LOCATION,AXIAL_ROTATIONS,SCORE} = 2 | 1 | 1 | 2`, `MAXIMUM_ROTATION_COUNT_{Y,Z} = 36500`, `SYNODIC_MONTH = 29.53058770576`, `LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS = 1`, `ECLIPSE_DATE_MATCH_TOLERANCE_IN_DAYS = 1.25`, `LAT_LIMIT = 65`, `SAMPLE_Y_VALUE_FOR_VALIDATION = 10`, `MINIMUM_NUMBER_OF_X_DATES = 2`.

**Data sets** — `MSRF_FILTER__NORMAL` (325), `MSRF_FILTER__IMPORTANT` (53), `MSRF_FILTER__VORTEX` (12), `MSRF_FILTER__FINAL` (sorted concat).

**CSS class names produced by the model, consumed by the view** — `"msrf_normal"`, `"msrf_important"`, `"msrf_vortex"`, `"operation_alpha"`, `"operation_beta"`.

**HTML attribute contracts** — `operation_type="alpha"|"beta"`, `msrf_type="msrf_normal"|"msrf_important"|"msrf_vortex"`, `chart_hover="true"`, `row_selected="true"`.

**DOM ids referenced across modules** — `header-image`, `map`, `map-container`, `map-current-lat-long`, `map-close-button`, `map-background-close-capture`, `yes-no-dialog`, `yes-no-dialog-wrapper`, `yes-no-dialog-background`, `notes-pop-up-wrapper`, `unsaved-changes-reminder`, `screen-specific-area`, `about-screen-text`, `export-x-dates-as-oph-file`.

**Asset path templates** — `img/header.png`, `img/header_markets.png`, `img/astro_indicators/<name>.png`, `img/hit_symbols/{gemini,triangle,diamond,circle}.png`, `./img/offline_map/map/{z}/{x}/{y}.png`, `./img/{location,clone,notes_icon,left_arrow,sunset,sort_icon,spinning_globe,spinning_globe_white}.png`, `../img/alarm_clock.ttf`, `../img/tipsy.gif`.

---

## 9. OPEN QUESTIONS

1. **What does MSRF stand for?** Never expanded in any source file or document. Ask the owner before writing it into UI copy.
2. **Why `7.01` and not `7`?** The `.01` offset in `OPH_HEP` is undocumented. Empirical tune, or a transcription of something specific?
3. **Is `1574` at NORMAL index 248 a typo?** `1674` and `1647` are both plausible intended values given the neighbours (`1641`, `1680`) and the presence of `1577` fourteen entries earlier.
4. **Why does NORMAL contain 2046 *and* 2047, and 2178?** These are exactly the Chronicon's Nemesis-return and Simulation-Collapse years. Deliberate seeding, or coincidence in a hand-curated list?
5. **Is the `1656` z-index / `552px` notes-popup sizing intentional?** Both match Chronicon numbers exactly. Confirm before "cleaning them up".
6. **Were the ten `ophis-xtras.txt` operations ever validated against real cases,** or are they a wish-list? Their weights and enabled-states are unspecified.
7. **Which of the five shipped `ACCOUNT_HASHES` plaintexts, if any, matter?** Irrelevant if the gate is deleted (recommended), but note that the digests are shipped in `ophis_config.js:5-11` and should not be carried into a public repo.
8. **Should the rebuild keep the offline tile pyramid?** 1,365 PNGs for zoom 0–5 world coverage, purely to keep the lat/long picker air-gapped.
9. **Which visual identity is canonical for the rebuild** — the original utilitarian `ophis.css` instrument look, or the PSYFR occult-almanac system? This document supplies both; the decision is the owner's.
10. **Was the `margin-top:5px` on checkboxes (broken by the missing commas at `ophis.css:487-491`) ever wanted?** It has never applied in any shipped build, so "restoring" it would visibly change every checkbox row.
11. **`EVENT_TYPE__ASTROLOGICAL` and `OPHIS_SCREEN__DEBUG`** are both commented-out-but-implemented. Revive or delete?
12. **Licensing.** `README.md:69` still says "add your own license before publishing."
