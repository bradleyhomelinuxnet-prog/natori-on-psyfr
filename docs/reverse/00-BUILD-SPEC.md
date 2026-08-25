# 00 — BUILD SPEC (AUTHORITATIVE)

**Ophis / PSYFR — ground-up modular browser rewrite**

This is the single document the rewrite is built from. Implementation agents will **not**
have access to the original source. Everything needed is here or cited to a sibling spec
(`01-engine-math.md` … `15-live-engine-extraction.md`) in the same directory.

**Status of the inputs.** Fifteen reverse-engineering specs were read in full and reconciled.
Where two specs disagreed the original artefacts under
`C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/` were consulted and the resolution is
recorded in §0.2. All numeric claims in §8 were **executed**, not inferred.

---

## 0. READ THIS FIRST

### 0.1 There are TWO engines, and the rewrite fuses them

This is the single most important structural fact, and it is easy to miss.

| | **Ophis v12** (`src/`, Electron) | **NATORI-ON-PSYFR** (`PSYFR1.html`, browser) |
|---|---|---|
| Spec files | 01–12, 14 | 13, 15 |
| Time base | epoch milliseconds, UTC midnight | Julian Day Number (proleptic Gregorian) |
| Resolution | day (and sunset-window for HH:MM) | whole day, no time-of-day at all |
| Y | whole days between two X-Dates, 1 dp | `abs(jd2 − jd1)`, integer |
| Resonance | **MSRF number sets** (325/53/12) with tiers, points, multipliers | **Chronicon lattice** (Phoenix 138, Nemesis 792, NER 600, Metonic 19, Baktun, palindromes, documented events) + a reduced 87-member MSRF set + eclipse tables |
| Scoring | `(Σweights + msrfPoints) × maxMsrfMultiplier` | additive weight table, two lenses V8/V7 |
| φ | **1.618** (hand-rounded, 3 dp) | **1.61803398875** (full precision) |
| `OPH_HEP` | 7.01 | not defined |
| Output surface | Z-Date table + Chart.js timeline + PDF/CSV/XLSX | ranked cast table + convergence + seven cycle wheels + ledger + CSV |
| Headline feature | scored, filtered, chart-plotted Z-Dates | **Convergence** — where ≥2 distinct operations independently agree |

They are **not the same program**. They share only: the `X1+`/`X2+` operation grammar, the
`oph_*` helper family, all-unordered-pairs enumeration, and the `Y → Z-offset → Z-Date` shape.

**The rewrite is one application with two interchangeable *reckonings*** (`ophis` and
`chronicon`), selected per Iso-Event. Everything that differs between them — calendar,
constant table, resonance providers, scoring system, result columns — is registered data or a
plugin, never a branch in the engine. See §5.

### 0.2 Reconciliations — where the specs disagreed, and the ruling

| # | Disagreement | Ruling | Evidence |
|---|---|---|---|
| R1 | `MSRF_FILTER__NORMAL` length: **276** (prior repo reports, quoted in 03 §1.3, 14 §7.1) vs **325** (03, 05, 14 main text) | **325** (324 literals + `HIGHEST_MSRF_NUMBER`) | Re-counted the literal programmatically: `325`, zero duplicates. The "276 = T₂₃ triangular number" reading is void. |
| R2 | `MSRF_FILTER__IMPORTANT`: **52** vs **53** | **53** | Counted: `53`. `NORMAL ∩ IMPORTANT = ∅` (verified). |
| R3 | Default op-set sizes: 04 §2.3 says LTE_V7=15/Gte8=15/Gte10=16; 14 §8 says 16/16/17 | **15 / 15 / 16** | `test-bradley.oph` ships exactly **16** operations, matching Gte10. 14's interface table is off by one. |
| R4 | Index of the out-of-order `1574`: 03 says 248, the v9 addendum said 253 | **index 248** (0-based), between `1641` and `1680` | Verified: `indexOf(1574) === 248`; exactly one inversion in the array. |
| R5 | `OPH_HEP` declared at `ophis_config.js:413` (01/02/03) vs `:414` (14) | Line number irrelevant; **value `7.01`**, no feature-flag branch | All specs agree on the value. |
| R6 | Vortex ±0.1 window asymmetry table (03 §2.3) | **Confirmed exactly.** 3 numbers match only themselves (`32.6, 43.5, 653.4`); 5 also match probe−0.1 (`21.7, 65.3, 87.1, 326.7, 762.3`); 4 also match probe+0.1 (`76.2, 217.8, 435.6, 871.2`) | Reproduced by exhaustive 1-dp probe sweep. Byte-identical to 03's table. |
| R7 | `oph_flip` on negatives: `NaN` (01/02/05, Ophis) vs `0` (13/15, PSYFR — because of `Number(...)||0`) | **Both are correct for their own engine.** `oph_flip` is a *registered* function whose `onNonNumeric` policy is part of the reckoning profile: `ophis` → `NaN`, `chronicon` → `0`. | 05 §2.13 verified table vs 13 §5.4 measured table. |
| R8 | `OPH_PHI`: `1.618` vs `1.61803398875` | **Per-reckoning constant tables.** `ophis` → `1.618`; `chronicon` → `1.61803398875`. Never unify. | 01 §2 (config:411) vs 13 §5.1 / 15 §1. |
| R9 | `TODAY` in the PSYFR build: "hardcoded `{2026,8,25}`" (15 §1) vs "`const _NOW = new Date()`" (13 §5.1) | **Derived from the system clock at page load.** Spec 15 recorded the *captured value* on the day it ran. Either way it is non-reproducible → **must be injected** (§9 D2). | 13 read the source line; 15 read the runtime value. |
| R10 | Spec 07 §1.3 lists 9 screens; `OPHIS_SCREEN__DEBUG` is dispatched but commented out of `OPHIS_SCREENS` | **8 reachable screens** in v12; Debug is dead. The rewrite ships a *real* audit view in its place (§6.9). | 07 §1.2. |
| R11 | `newOperation` ignores its `enabled` argument (every spec) | **Fixed in the rewrite.** The shipped default set is unaffected (Gte10 force-enables all 16), so parity is preserved. | 01 §11.1, 02 G12, 03 §3.6, 04 §8.1, 05 G-2, 06 G-12. |
| R12 | Eclipse table provenance: 12 says the `src/` tables are **America/New_York local midnight, unsorted, with 271/420 unreachable records**; 13 says the PSYFR tables are **delta-encoded JD, sorted, with a 90-year hole at 10–99 CE** | **Two different artefacts.** The rewrite regenerates **one** table from the NASA CSVs at build time: sorted, de-duplicated, **UTC**, delta-encoded. Both defects are fixed; the shift is flagged (§10 Q7). | 12 §1–2, 13 §5.5. |
| R13 | PSYFR MSRF set: 87 members including an undocumented `1138` | **Confirmed 87.** `19` is a documented addition; `1138` appears nowhere in Ophis and sits beside the genuine `1134`. Ship it behind a `suspect: true` data flag pending an owner ruling (§10 Q3). | 13 §5.2. |
| R14 | `Y` semantics | **Exclusive whole elapsed days**, not inclusive. `07/04/2026 → 08/20/2026` = `47`, not 48. | Executed; §8.2. |
| R15 | Which value is matched against MSRF | **`rotation_count_z`** = 1-dp round of the **already 2-dp-rounded** `z_value`. Not `Y`, not a recomputed date difference. Double-rounding is load-bearing. | 01 §7.4, 02 §5 step 12, 03 GOTCHA-4. |

### 0.3 Non-negotiable parity invariants

Twelve behaviours look like bugs and **must be reproduced exactly** or every score changes.
Each is gated behind a named flag in `/src/data/quirks.js` so a future owner can opt out, but
**all default to on**.

1. `OPH_PI = 3.14`, `OPH_PHI = 1.618`, `OPH_CRV = 5.08` (a literal, *not* `π·φ`), `OPH_HEP = 7.01`.
2. `oph_flip` re-inserts the decimal point at the **original left-hand string index**, not mirrored.
3. `getMsrfMatch` order: **VORTEX (±0.1) → `.5` string rejection → `Math.round` → IMPORTANT → NORMAL**.
4. The `.5` rejection is a **string** test (`String(v).endsWith(".5")`) on the 1-dp value.
5. Vortex comparison is literal IEEE-754 `Math.abs(a−b) <= 0.1` — do **not** add an epsilon.
6. Double rounding: `z_value = round2(raw)`, then `rotation_count_z = round1(z_value)`.
7. The Z-Date instant uses the **unrounded** offset: `zMs = base + raw × 86 400 000`, computed *before* `raw` is rounded.
8. `roundToPrecision(v,p) = Math.round((v + Number.EPSILON) × 10^p) / 10^p` — including its wrong behaviour for negatives.
9. Only an **upper** clamp exists on Y and Z (`36 500`). No lower clamp.
10. `MSRF_FILTER__NORMAL` is stored **verbatim**, `1574` at index 248 included. Never binary-search it.
11. All-unordered-pairs enumeration with `X1` = the **lower array index** (list order, not chronological order).
12. Under `SCORING_SYSTEM__GTE_V8`, exactly **one** MSRF match — the first with the maximum multiplier — is withheld from the additive base and spent as the multiplier.

---

## 1. WHAT THE APP DOES

Ophis is an **offline date-projection instrument**. It is not a calendar, not a scheduler, and
not a data feed. It takes dates you already know and arithmetically projects dates you do not.

**The premise.** The user believes some event *recurs*. They record the dates on which it
already happened — these are **anchors**, called **X-Dates**. A named collection of anchors plus
all of its settings is an **Iso-Event** (short for *Isometric Event*: "an event that has
repeated itself 2 or more times in the past, and will likely repeat again in the future").

**The projection.** For every unordered pair of enabled anchors the app measures **Y**, the
whole number of days between them. It then feeds Y into every enabled **operation** — a
one-line arithmetic formula such as `X2+YxOPH_PHI`, meaning *"multiply the gap by 1.618 and add
that many days onto the later anchor"*. Each operation returns a **Z-Value** (a day offset);
adding it to the anchor the formula names produces a **Z-Date** — a projected future date.

With 5 anchors and 16 operations that is 10 pairs × 16 formulas = **160 projections**. Many
land on the same calendar day. Those are merged into one row.

**The scoring.** A merged Z-Date is interesting in proportion to how many independent things
point at it:

- every operation that landed there contributes its **weight** (1.0 = *Alpha*, 0.5 = *Beta*);
- every operation whose Z-Value matches a number in the **MSRF resonance sets** contributes
  points *and* can multiply the whole score by 1.5× or 2.0×.

The result is a **score** and a **hit count** per Z-Date.

**The reading.** The scored Z-Dates are filtered (hide the past, hide anything more than N days
out, require a minimum score, restrict to a whitelist of **T-Dates** you actually care about),
sorted, listed in a table, and drawn on a timeline where every projection is an arc from its
anchor to its Z-Date.

**The second reckoning.** The same machinery can be run against a **Chronicon** calendar
instead — Julian Day Numbers, year resolution, and a different resonance lattice drawn from
Jason Breshears' Archaix chronology (a 138-year *Phoenix* cycle, a 792-year *Nemesis* cycle, a
600-year *NER* epoch, the 19-year *Metonic* moon cycle, Mayan baktun boundaries, palindromic
years, a 69-entry ledger of documented events, and 11 751 historical eclipses). In this mode
the headline output is **Convergence**: clusters of projections where **two or more different
operations independently agree** on the same date — the signal the whole instrument exists to
find.

**What it is not.** No network access. No accounts. No telemetry. No market data. No claim to
be science: it is a *worldbuilding and study instrument* after the Archaix thesis, presented as
that thesis. That disclaimer ships in the UI.

---

## 2. DOMAIN GLOSSARY

One line each. Terms are load-bearing: use these exact words in code and UI.

### 2.1 Ophis engine

| Term | Definition |
|---|---|
| **Ophis** | The engine. Greek *ophis* = "serpent". Internal/product name of the calculation core. |
| **PSYFR / CYPHR** | The brand/skin over the engine. The codebase itself always says "Ophis". |
| **NATORI-ON-PSYFR** | The single-file browser build that added the Chronicon reckoning, wheels, ledger and convergence. |
| **Iso-Event** | *Isometric Event.* The top-level user document: a named cycle with its own anchors, operations, filters, location, scope and settings. A `.oph` file holds an array of them. Labelled `E₁, E₂, …`. |
| **X-Date** | An **input anchor** date. Minimum 2 enabled per Iso-Event. Labelled `X₁, X₂, …` by **array index**, not by chronology. |
| **T-Date** | *Target Date.* A pure **whitelist filter** — never a projection source. If ≥1 T-Date is enabled, only Z-Dates coinciding with one survive. |
| **Y** *(axial rotation count)* | Whole days between one pair of anchors. The **only** free variable in the formula language. "Axial rotation" = the domain's insistence that a day is a turning of the Earth. |
| **Operation** | A one-line formula converting Y to a day offset. `{equation, weight, enabled}`. Must start `X1+` or `X2+`. |
| **Alpha / Beta operation** | Derived label, not a stored enum: `weight >= 1` ⇒ Alpha, `< 1` ⇒ Beta. **Never a scoring branch** — the raw weight is what is summed. |
| **Z-Value** | The numeric day offset an operation returns, before it is added to an anchor. Displayed at 2 dp. |
| **rotation_count_z** | The Z-Value re-rounded to **1 dp**. This — and only this — is the number tested against the MSRF sets. |
| **Z-Date** *(Future Date)* | The projected output date: `anchorXDate + Z-Value days`, normalised to a calendar day (or to a sunset-to-sunset window in HH:MM scope). |
| **Y-struct** | One anchor pair plus every operation's result for that pair. |
| **Z-struct** | One calendar-day bucket, aggregating every operation result that landed on it, its MSRF matches, score and hit count. |
| **Hit / hit count** | `hit_count = operation_hit_count + msrf_hit_count`. One operation result contributes **1 or 2** hits. |
| **Score** | Per-Z-Date cumulative number. GTE_V8: `(Σ weights + msrfPoints_excluding_the_strongest) × maxMultiplier`, rounded to 2 dp. |
| **MSRF** | The opaque label on the three resonance number sets. **The acronym is never expanded anywhere in the original.** Do not invent an expansion in UI copy. |
| **Normal / Important / Vortex** | The three MSRF tiers. 1 pt/×1.5, 2 pts/×2.0, 2 pts/×2.0 respectively. |
| **Vortex number** | The 12 one-decimal MSRF values matched **within ±0.1** and checked **first**. `21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4, 762.3, 871.2`. |
| **"Right in the middle" / the `.5` rule** | A `rotation_count_z` whose 1-dp string ends in `.5` matches nothing — it must "trend toward the floor or the ceiling". Runs *after* the vortex scan. |
| **Isometric Date** | The identity projection `X2+oph_round(Y)`: if X₁→X₂ took Y days, X₂→Z takes another Y. The 1:1 baseline. |
| **Holo- / flipped date** | `X2+oph_flip(oph_round(Y))` — the digit-reverse of the cycle length treated as itself a cycle length. |
| **`oph_flip`** | Digit reversal with the decimal point re-inserted at its **original left-hand index**. `12.5 → 52.1`, `3.14 → 4.13`, `120 → 21`, `100 → 1`. |
| **Curvature (`OPH_CRV`)** | π·φ, shipped as the hand literal `5.08`. |
| **Hepta-cycle (`OPH_HEP`)** | `7.01`. The `.01` offset is undocumented. |
| **Radius projection** | `X1+YxOPH_PI` — Gann-style "treat Y as a radius, project the arc". |
| **Scope** | Per-Iso-Event time granularity: `HH_MM`, `DAYS` (default), `MONTHS`, `YEARS`. Only HH:MM engages sunsets; MONTHS/YEARS were never implemented. |
| **Prior sunset** | The most recent sunset *before* an anchor. HH:MM scope only; the Jewish-calendar "day begins at sunset" convention. |
| **Scoring system** | `SCORING_SYSTEM__LTE_V7` (purely additive) or `SCORING_SYSTEM__GTE_V8` (strongest MSRF match becomes a multiplier). |
| **Ghost** | **Legacy/dead term** for a zero-score Z-Date. Do not resurrect. |
| **`.oph` file** | The document format: UTF-8 JSON, `{app_version, iso_events}`. |
| **Stale** | Results on screen that no longer reflect the current inputs, because auto-recalculate is off or the user is on another screen. |

### 2.2 Chronicon / Archaix reckoning

| Term | Definition |
|---|---|
| **Archaix** | Jason Breshears' research project. *Not affiliated.* The app presents the thesis **as a thesis**. |
| **Chronicon** | Breshears' master chronological corpus; here, the composite lattice the wheels render. |
| **Astronomical year** | Year numbering where **1 BC = 0**, 2 BC = −1. "2239 BC" is astro **−2238**. Off-by-one here breaks everything. |
| **JDN** | Julian Day Number, proleptic Gregorian. The Chronicon reckoning's only time base. |
| **Annus Mundi (AM)** | "Year of the World." `AM = astroYear + 3894`. 2026 CE = AM 5920. (Human copy says "from 3895 BC" — both are right; 3895 BC *is* astro −3894.) |
| **Long-Count year (LC)** | `LC = astroYear + 3112`. 2026 CE = LC 5138. |
| **Cataclysm year** | `cat = astroYear + 5238`, from the 5239 BC Nemesis Cataclysm. 2026 CE = 7264. |
| **Phoenix / Sky Dragon** | A 138-year destroyer lattice. A year is a **node** when `mod(astroYear, 138) === 108`. Next: 2040 CE. |
| **Nemesis X** | A 792-year intruder: 60 years inside the solar system, 732 outside. Inner when `mod(astro − 462, 792) < 60`. Next return 2046 CE. |
| **NER** | 600-year Sumerian epochs of ten 60-year decans. `mod(astro − 162, 600)`. |
| **SHAR** | Breshears' correction: the Sumerian *shar* meant a single **day** — a turning of the stars — not a year. The direct ancestor of Ophis's "axial rotation". |
| **Baktun / Mayan Long-Count** | 13 baktuns of 144 000 days. 14 node years, `−3112 … 2046`. |
| **Metonic cycle** | 19 years = 235 lunations. `mod(referenceYear − astroYear, 19) === 0`. **Note: 19 and 235 are in NO Ophis MSRF set** — the Metonic gear is a rewrite-era addition. |
| **Palindrome / mirror-year** | A year, AM value or JD that reads the same reversed. Requires length > 1. |
| **Documented event** | A year present in the 69-entry Chronicon ledger `E[]`. |
| **ECHO** | A projection that lands back on (within ±1 day of) one of its own input anchors. Tagged, never scored. |
| **NOVEL** | The complement of ECHO — a genuinely new date. |
| **Convergence** | A cluster of projections within an agreement window where **≥2 distinct operations** agree. `strength = nOps`. |
| **Agreement window** | The convergence clustering tolerance: exact / ±1 d / ±7 d / ±30 d / ±90 d / same year. **Chaining is transitive** — see §3.10. |
| **Simulation Collapse** | 2178 CE. The end-stop of the wheels slider. |
| **Vapor Canopy** | The pre-Flood atmospheric shell whose collapse *is* the Great Flood of AM 1656 / 2239 BC. |

---

## 3. THE CANONICAL ALGORITHM

This section alone is sufficient to write the engine. Every step is numbered and unambiguous.

### 3.1 Constants

```js
// ---- shared ----
MILLIS_PER_MINUTE  = 60_000
MILLIS_PER_HOUR    = 3_600_000
MILLIS_PER_DAY     = 86_400_000
MINIMUM_NUMBER_OF_X_DATES        = 2
MINIMUM_OPERATIONS_REQUIRED      = 1
MINIMUM_DAYS_BETWEEN_X_DATES     = 1        // both "first two" and "subsequent"
MAX_CALENDAR_YEAR                = 9999
MAXIMUM_ROTATION_COUNT_Y         = 36_500   // ~100 years
MAXIMUM_ROTATION_COUNT_Z         = 36_500
SAMPLE_Y_VALUE_FOR_VALIDATION    = 10
DECIMAL_PRECISION__TIME            = 2      // z_value
DECIMAL_PRECISION__AXIAL_ROTATIONS = 1      // Y and rotation_count_z
DECIMAL_PRECISION__SCORE           = 2
DECIMAL_PRECISION__LOCATION        = 1
VORTEX_FILTER_MATCH_TOLERANCE    = 0.1
HIGHEST_MSRF_NUMBER              = 2559     // also the default "beyond N days" value
LAT_LIMIT = 65 ; LONG_LIMIT = 180
DEFAULT_HEIGHT_IN_METERS_FOR_SUN_CALC = 2
ALREADY_CALCULATED_SUNSET_TOLERANCE_IN_MILLIS = MILLIS_PER_HOUR
TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE = "00:00"
SYNODIC_MONTH                    = 29.53058770576   // ophis reckoning
LUNAR_DATE_MATCH_TOLERANCE       = 86_400_000       // ±1 day
ECLIPSE_DATE_MATCH_TOLERANCE     = 108_000_000      // ±1.25 days (note: NOT 1 day, despite the v12 tooltips)

// ---- scoring points & multipliers (ophis reckoning) ----
POINTS__ALPHA_OPERATION_MATCH    = 1
POINTS__BETA_OPERATION_MATCH     = 0.5
POINTS__NORMAL_MSRF_MATCH        = 1
POINTS__IMPORTANT_MSRF_MATCH     = 2
POINTS__VORTEX_MSRF_MATCH        = 2      // independent literal, NOT an alias (see §9 D9)
SCORE_MULTIPLIER__NORMAL_MSRF_MATCH    = 1.5
SCORE_MULTIPLIER__IMPORTANT_MSRF_MATCH = 2.0
SCORE_MULTIPLIER__VORTEX_MSRF_MATCH    = 2.0

// ---- formula constants, PER RECKONING (never unify) ----
ophis:     { OPH_PI: 3.14, OPH_PHI: 1.618,           OPH_CRV: 5.08, OPH_HEP: 7.01 }
chronicon: { OPH_PI: 3.14, OPH_PHI: 1.61803398875,   OPH_CRV: 5.08 }   // no OPH_HEP

// ---- chronicon lattice ----
AM_OFFSET = 3894 ; LC_OFFSET = 3112 ; CAT_OFFSET = 5238
PHOENIX   = { mod: 108, step: 138 }        // node when mod(astroYear,138)===108
NEMESIS   = { mod: 462, step: 792, inner: 60 }
NER       = { mod: 162, step: 600 }
METONIC   = 19
SYN_CHRONICON  = 29.530588853              // note: NOT the ophis SYNODIC_MONTH
NEWMOON_J2000  = 2451550.1
MAY_NODES = [-3112,-2712,-2312,-1912,-1512,-1112,-712,-318,76,470,864,1258,1652,2046]
CAST_Y_MIN = 1 ; CAST_Y_MAX = 3_000_000
CAST_YEAR_MIN = -5400 ; CAST_YEAR_MAX = 4000
```

`MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES = 2` is a **dead constant** in v12
(zero read sites). Do **not** implement the gating rule its name implies.

### 3.2 Numeric primitives

```js
function roundToPrecision(value, precision) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
const round1 = v => roundToPrecision(v, 1);   // Y, rotation_count_z
const round2 = v => roundToPrecision(v, 2);   // z_value, score
```

**Known wrong for negatives** — `roundToPrecision(-1.25, 1) === -1.2`, `(-0.05, 1) === -0`.
Reachable when X₂ precedes X₁. Reproduce verbatim (quirk `EPSILON_ROUNDING`).

### 3.3 The `oph_*` function registry

Eleven single-argument functions. `.name` is the token recognised by the parser.

```js
oph_sqrt(v)  = Math.sqrt(v)
oph_abs(v)   = Math.abs(v)
oph_floor(v) = Math.floor(v)
oph_ceil(v)  = Math.ceil(v)
oph_log(v)   = Math.log(v)        // NATURAL log
oph_sin(v)   = Math.sin(v)        // RADIANS
oph_cos(v)   = Math.cos(v)
oph_tan(v)   = Math.tan(v)
oph_exp(v)   = Math.exp(v)
oph_round(v) = Math.round(v)      // half-up toward +∞: round(2.5)=3, round(-2.5)=-2
oph_flip(v)  = /* below */
```

```js
function oph_flip(value, { nanPolicy = "nan" } = {}) {
  let s = String(value);
  const dot = s.indexOf(".");
  s = s.replace(".", "");
  const rev = s.split("").reverse();
  if (dot > 0) rev.splice(dot, 0, ".");        // point re-inserted at the ORIGINAL index
  const n = Number(rev.join(""));
  return Number.isNaN(n) && nanPolicy === "zero" ? 0 : n;
}
```

`nanPolicy` is `"nan"` for the `ophis` reckoning and `"zero"` for `chronicon` (ruling R7).

Verified behaviour (executed — reproduce exactly):

| in | out | | in | out |
|---|---|---|---|---|
| `123` | `321` | | `12.5` | `52.1` |
| `7` | `7` | | `120.5` | `502.1` |
| `0` | `0` | | `10.25` | `52.01` |
| `100` | `1` | | `0.5` | `5` |
| `1000` | `1` | | `0.1` | `1` |
| `120` | `21` | | `3.14` | `4.13` |
| `46` | `64` | | `47` | `74` |
| `10` | `1` | | `−12` | `NaN` / `0` |
| `−35` | `NaN` / `0` | | `1e21` | `NaN` / `0` |

The `chronicon` reckoning exposes only `oph_flip, oph_round, oph_floor, oph_ceil, oph_abs,
oph_sqrt`, and its `oph_sqrt` is `Math.sqrt(Math.abs(v))` — it never returns `NaN`.

### 3.4 The equation grammar

**Formal grammar** (this replaces the original's string-rewriting entirely — see §9 D1):

```ebnf
operation   ::= anchor "+" expr
anchor      ::= "X1" | "X2"
expr        ::= term   { ("+" | "-") term }
term        ::= factor { ("*" | "/" | "x" | "×") factor }
factor      ::= [ "+" | "-" ] primary
primary     ::= NUMBER
              | CONSTANT
              | "Y"
              | FUNC "(" expr ")"
              | "(" expr ")"
NUMBER      ::= digit+ [ "." digit* ] | "." digit+          ; NO exponent notation
CONSTANT    ::= "OPH_PI" | "OPH_PHI" | "OPH_CRV" | "OPH_HEP"
FUNC        ::= "oph_sqrt" | "oph_abs" | "oph_floor" | "oph_ceil" | "oph_log"
              | "oph_sin"  | "oph_cos" | "oph_tan"   | "oph_exp"
              | "oph_round"| "oph_flip"
```

Rules:

1. **Whitespace is stripped before lexing.** `"X2 + Y x OPH_PHI"` ≡ `"X2+YxOPH_PHI"`.
2. **`x` (lowercase ex) and `×` (U+00D7) are multiplication.** The lexer only treats `x` as an
   operator when it is not part of an identifier — this is what the original's uppercase/lowercase
   dance existed to fake, and it is why `oph_exp` survives.
3. Precedence: unary `±` > `*` `/` (left-assoc) > `+` `-` (left-assoc). Parentheses override.
4. Constants are **values in a per-reckoning table**, resolved by the evaluator — not textual substitution.
5. Every `oph_*` function takes **exactly one** argument.
6. `=` is illegal (there is no assignment in the grammar; the lexer rejects the character).
7. No identifiers, no property access, no calls other than `FUNC(...)`, no exponent literals,
   no comments, no statement separators. Anything else is a lex/parse error.
8. Division by literal zero parses; it evaluates to `Infinity`, which **passes** the `> 0`
   smoke test and is later clamped to `36 500`.

**Compilation** — one code path only:

```
compileOperation(equationString, reckoning, indexInList, allOperations) -> Result
  1. strip whitespace
  2. if empty                  -> error "Cannot be empty."
  3. if !startsWith("X1+") and !startsWith("X2+")
                               -> error "Must start with 'X1 + …' or 'X2 + …'"
     anchor = "X1" | "X2"
  4. body = rest after the 3-char prefix
  5. tokens = lex(body)        -> on failure: error "Illegal token: '<t>' at position <i>."
  6. ast    = parse(tokens)    -> on failure: error "Syntax error: <detail>"
  7. fn     = (Y) => evaluate(ast, { Y, constants, functions })
  8. smoke  = fn(SAMPLE_Y_VALUE_FOR_VALIDATION /* 10 */)
     if typeof smoke !== "number" || Number.isNaN(smoke) || !(smoke > 0)
                               -> error "Z-value must resolve to a number > 0."
  9. duplicate scan BACKWARDS over allOperations[indexInList-1 … 0]:
     if normalise(other.equation) === normalise(this.equation)
                               -> error "Identical to Operation <i+1>; each Operation must be unique."
 10. return { ok: true, anchor, fn, ast, normalised }
```

Notes to preserve:
- The duplicate scan is **backwards only**, so the *later* of two identical operations is flagged.
- It scans **all** operations, disabled ones included.
- The original's message misspelled "Indentical"; the rewrite fixes the spelling (cosmetic only).
- A failed operation is **kept in the list but never executed** — it shows an inline error and
  contributes nothing.
- `SAMPLE_Y_VALUE_FOR_VALIDATION = 10` means an operation can pass validation and still yield
  `≤ 0`, `NaN` or `Infinity` at a real Y. The engine guards at runtime (§3.7 step 6).

### 3.5 The default operation table (`ophis` reckoning, v10/v12 — 16 operations)

Ordinal order is load-bearing: `operation_ordinal` indexes this array everywhere.

| # | Equation | Weight | Class |
|---|---|---|---|
| 0 | `X2+oph_round(Y)` | 1 | α — *Isometric Date* |
| 1 | `X2+oph_flip(oph_round(Y))` | 1 | α — *Holo-* |
| 2 | `X2+Y/OPH_CRV` | 0.5 | β |
| 3 | `X1+(Y/2.0)xOPH_PI` | 0.5 | β |
| 4 | `X2+Y/OPH_PHI` | 1 | α |
| 5 | `X2+(Y/2.0)xOPH_PHI` | 1 | α — *original beta phi 6*, promoted at v8 |
| 6 | `X1+(Y/2.0)xOPH_CRV` | 0.5 | β |
| 7 | `X2+(Y/2.0)xOPH_PI` | 0.5 | β |
| 8 | `X2+YxOPH_PHI` | 1 | α |
| 9 | `X1+YxOPH_PI` | 1 | α — *radius projection*, promoted at v8 |
| 10 | `X2+(Y/2.0)xOPH_CRV` | 0.5 | β |
| 11 | `X2+YxOPH_PI` | 0.5 | β |
| 12 | `X1+YxOPH_CRV` | 0.5 | β |
| 13 | `X2+YxOPH_CRV` | 0.5 | β |
| 14 | `X1+YxOPH_HEP` | 1 | α — hepta-cycle (Aug 2025) |
| 15 | `X2+YxOPH_HEP` | 1 | α — hepta-cycle for X2 (Dec 2025) |

Historical variants, kept as selectable packs:
- **`ophis-lte-v7`** — the first 15 rows with #5 and #9 at weight `0.5`.
- **`ophis-gte-v8`** — the first 15 rows exactly as above.
- **`ophis-gte-v10`** — all 16 (the live default).
- **`ophis-xtras`** — ten hand-written extras that never shipped, using bare literals:
  `X1+Yx2.718`, `X2+Yx2.718`, `X1+Yx1.38`, `X2+Yx1.38`, `X1+Yx5.52`, `X2+Yx5.52`,
  `X1+(Y/2.0)x5.52`, `X1+Yx2.178`, `X2+Yx2.178`, `X2+Yx0.360`.
  (`1.38` = Phoenix/100, `5.52` = 138×4/100, `2.178` = vortex 217.8/100, `0.360` = 360/1000,
  `2.718` = *e*.) Ship disabled.

A user-added operation seeds as `{equation: "X1+Y", weight: 0.5, enabled: true}`.

### 3.6 The default operation packs (`chronicon` reckoning)

**`chronicon-default-19`** (the palindromic cast):

```
X2+oph_round(Y)                 X2+oph_flip(oph_round(Y))     X1+oph_flip(oph_round(Y))
X2+Y/OPH_PHI                    X1+Y*OPH_PHI                  X1+(Y/2)*OPH_PI
X2+Y/OPH_CRV                    X2+Y*138/100                  X1+Y*19/10
X2+oph_round(Y/138)*138         X1+oph_round(Y/19)*19         X2+Y+138
X1+Y+19                         X2+oph_flip(Y)+19             X1+Y*360/365.2422
X2+Y*792/600                    X1+oph_round(Y*OPH_PHI/OPH_PI)
X2+oph_round(Y/OPH_PHI/OPH_PHI) X1+oph_flip(oph_round(Y/OPH_PHI))
```

Plus four themed packs: **`chronicon-138`** (12 ops), **`chronicon-metonic-19`** (11),
**`chronicon-phoenix-lattice`** (10), **`chronicon-golden`** (10). Full equation lists live in
`/src/data/operations.packs.js`; they are *data*, and adding a pack is a data edit.

### 3.7 The projection pipeline — `runOphis(isoEvent, ctx)`

`ctx = { now: <epoch ms or JDN>, reckoning, quirks }`. **The engine reads no globals and no
clock.** `now` is always injected.

```
STEP 0 — RESOLVE THE RECKONING
   reck = reckoningRegistry.get(isoEvent.reckoning ?? "ophis")
   // supplies: calendar, constants, function table, resonance providers, scoring system id

STEP 1 — COMPILE
   effectiveOperations = isoEvent.operations.map((op, i) =>
       op.enabled ? { ...op, ...compileOperation(op.equation, reck, i, isoEvent.operations) }
                  : { ...op })
   // EVERY operation is kept at its original index so operation_ordinal indexes both arrays.
   runnable = effectiveOperations.filter(o => o.enabled === true && o.ok === true)

STEP 2 — GUARDS (mutually exclusive; the first that fires ends the run)
   enabledAnchors = isoEvent.x_dates.filter(x => x.enabled === true).length
   a) enabledAnchors < 2                -> "At least 2 X-Dates are required."
   b) scope === MONTHS                  -> "Month-based projections may be supported in a future version."
   c) scope === YEARS                   -> "Year-based projections may be supported in a future version."
   d) runnable.length < 1               -> "At least 1 Operation is required."
   e) !validateXDateSpread(isoEvent)    -> the spread errors REPLACE the error list

STEP 3 — PAIR ENUMERATION  (all unordered pairs; X1 = LOWER array index)
   yStructs = []
   for (i = 1; i < x_dates.length; i++)
     for (k = 0; k < i; k++)
       if (x_dates[k].enabled !== true || x_dates[i].enabled !== true) continue
       X1 = calendar.toInstant(x_dates[k], isoEvent)      // k is X1 — list order, NOT chronology
       X2 = calendar.toInstant(x_dates[i], isoEvent)
       Y  = calendar.span(X1, X2, isoEvent)               // §3.8
       yStructs.push({ y_ordinal: yStructs.length, rotation_count_y: Y,
                       x_1_ordinal: k, x_2_ordinal: i, operation_results: [] })
   // Emission order is (0,1),(0,2),(1,2),(0,3),(1,3),(2,3),… — the OUTER loop is the LATER date.
   // n enabled anchors -> C(n,2) pairs. x_1_ordinal / x_2_ordinal index the UNFILTERED array,
   // so the X₁,X₂,… labels stay stable when a middle anchor is disabled.

STEP 4 — PROJECT  (per pair, per operation)
   Yc = min(Y, MAXIMUM_ROTATION_COUNT_Y)        // upper clamp only; warn when it bites
   for (oi = 0; oi < effectiveOperations.length; oi++)
     op = effectiveOperations[oi]
     if (op.enabled !== true || !op.ok) continue
     1. raw = op.fn(Yc)
     2. if (!Number.isFinite(raw)) { record a diagnostic; continue }        // NEW — see §9 D5
     3. if (raw > MAXIMUM_ROTATION_COUNT_Z) raw = MAXIMUM_ROTATION_COUNT_Z  // upper clamp only
     4. offsetInMillis = raw * MILLIS_PER_DAY          // *** BEFORE rounding — load-bearing ***
     5. zValue         = round2(raw)                   // 2 dp, for display/storage
     6. rotationCountZ = round1(zValue)                // 1 dp OF THE 2-dp VALUE — the MSRF probe
     7. baseInstant  = (op.anchor === "X1") ? X1 : X2
        otherInstant = (op.anchor === "X1") ? X2 : X1
     8. if (scope === DAYS && isoEvent.day_scope_start_time_in_millis > 0)
             baseInstant += day_scope_start_time_in_millis
     9. zRaw   = baseInstant + offsetInMillis
    10. { zStart, zEnd } = calendar.normaliseWindow(zRaw, isoEvent)         // §3.9
    11. push an OperationResult (§4.6) onto the y-struct

STEP 5 — BUCKET / MERGE
   key = String(zStart)                       // epoch ms (or JDN) as a STRING, deliberately
   z   = zStructs[key] ??= newZStruct(firstResult)   // display fields frozen at the FIRST contributor
   z.operation_match_structs.push({ y_struct, operation_result })
   for (provider of reck.resonanceProviders)
       for (match of provider.match(operationResult, isoEvent, ctx))
           z.resonance_matches.push({ ...match, y_struct, operation_result })
   // Ophis reckoning has exactly one provider (MSRF) yielding 0 or 1 match.
   // Chronicon reckoning has several (lattice, msrf, eclipse, echo).

STEP 6 — SCORE   (§3.11)
STEP 7 — FILTER  (§3.12)
STEP 8 — SORT    (§3.13)  — twice: once by DATE to assign z_ordinal, once by the user's choice
STEP 9 — CONVERGE (§3.10) — chronicon reckoning only
```

### 3.8 Computing Y

**`ophis` reckoning, `DAYS` scope (the common path):**

```js
Y = round1((X2ms - X1ms) / MILLIS_PER_DAY)
```

Both instants are **UTC midnight** (see §3.9), so Y is an exact integer expressed as `N.0`.
`Y` is **exclusive elapsed days**: two consecutive calendar days give `1`, not `2`.
Direction matters — `X1` is the lower array index, so a mis-ordered anchor list yields a
negative Y (which is *not* lower-clamped).

**`ophis` reckoning, `HH_MM` scope** — both anchors are first walked back to their **prior
sunset**, then a bespoke bucketing runs on the difference `d`:

```
d === 0                        -> 0
d <  0 && d >= -MILLIS_PER_DAY -> return -1        // EARLY RETURN, no rounding
d <  0                         -> t = trunc(d / MILLIS_PER_DAY); if (d % MILLIS_PER_DAY < -MILLIS_PER_DAY/2) t -= 1; round1(t)
0 < d <= MILLIS_PER_DAY        -> 1
d >  MILLIS_PER_DAY            -> t = floor(d / MILLIS_PER_DAY); if (d % MILLIS_PER_DAY >  MILLIS_PER_DAY/2) t += 1; round1(t)
```

Both half-day tests are **strict**, so an exact half rounds toward zero. `+1 day` and `−1 day`
are asymmetric by construction (the negative case early-returns).

**`chronicon` reckoning:**

```js
Y = Math.abs(jd2 - jd1)                      // always a non-negative integer
if (Y < CAST_Y_MIN || Y > CAST_Y_MAX) skip this pair    // 1 … 3 000 000
```

### 3.9 Calendars — anchor → instant, and Z-instant → window

**`ophis` / `DAYS` scope.** `FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT` is **on**: lat/long are forced
to `0,0`, time is forced to `"00:00"`, so every anchor resolves to **UTC midnight**. This is
what makes day arithmetic DST-free and machine-independent.

```js
toInstant({date:"MM/DD/YYYY"})  -> Date.UTC(year, month-1, day)
normaliseWindow(zRawMs)         -> { zStart: Math.floor(zRawMs / MILLIS_PER_DAY) * MILLIS_PER_DAY,
                                     zEnd:   same }
```

The original achieved that floor by round-tripping through the `"MM/DD/YYYY"` string; the
result is identical for in-range years, and `Math.floor` is correct for pre-1970 dates where
the original's `%` was not. Use `Math.floor`.

**`ophis` / `HH_MM` scope.** Anchors use both `date` and `time`, interpreted in the timezone
implied by the event's lat/long. Z-instants become a **[sunset-before, sunset-after)** window,
snapped against a run-global list so that sunsets within one hour of each other collapse to
one. *(This makes HH:MM results order-dependent — a known property.)*

**`ophis` / `MONTHS`, `YEARS`.** Unimplemented; the guard in §3.7 STEP 2 rejects them. Keep the
scope values in the schema for file compatibility.

**`chronicon` reckoning.** Proleptic-Gregorian JDN, astronomical year numbering:

```js
function jdn(astroYear, month1, day) {
  const a = Math.floor((14 - month1) / 12);
  const y = astroYear + 4800 - a;
  const m = month1 + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y
       + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function jdToDate(J) {
  J = Math.round(J);
  const a = J + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return { year: 100 * b + d - 4800 + Math.floor(m / 10),
           month: m + 3 - 12 * Math.floor(m / 10),
           day: e - Math.floor((153 * m + 2) / 5) + 1 };
}

const mod = (n, m) => ((n % m) + m) % m;                 // always-positive modulo
const fmtYear = a => a <= 0 ? `${1 - a} BC` : `${a} CE`;
```

`normaliseWindow(zRawJd)` = `{ zStart: Math.round(zRawJd), zEnd: same }`, then **drop** the
result entirely if `jdToDate(zStart).year < -5400` or `> 4000`. The original dropped these
silently; the rewrite surfaces a count (§9 D6).

Verified anchors (executed): `jdn(-2238,5,15) = 903782`, `jdn(2026,8,25) = 2461278`,
`jdn(2040,5,15) = 2466290`.

### 3.10 Convergence (`chronicon` reckoning)

```
findConvergences(results, tol) -> Convergence[]
  if (tol === "year")  cluster by result.astroYear exactly
  else                 sort by zjd ASC, then GREEDILY CHAIN:
                       append while (r.zjd - lastMember.zjd) <= tol, else start a new cluster
  per cluster:
      centerJD  = Math.round(mean(member.zjd))
      nOps      = |Set(member.op.equation)|
      nPairs    = |Set(member.x1 + " → " + member.x2)|
      spanDays  = max(zjd) - min(zjd)
      bestScore = max(member.score)
      tags      = union of all member tags EXCLUDING "echo"
  filter: nOps >= 2
  sort:   nOps DESC, bestScore DESC, spanDays ASC, centerJD ASC
```

Input is **echo-filtered** (`results.filter(r => !r.echo)`).

**The chaining is transitive, not a fixed diameter.** With `tol = 30`, dates at `X, X+30, X+60,
X+90` all land in one cluster spanning 90 days. `spanDays` exposes this and the UI must render
it (`±⌈spanDays/2⌉d span`). Keep the transitive behaviour for parity; expose fixed-diameter
clustering as an alternative *strategy* in the registry (§10 Q5).

Selector values: `0`, `1`, `7`, `30` (default), `90`, `"year"`.

### 3.11 Resonance and scoring

#### 3.11.1 `msrf` resonance provider (`ophis` reckoning)

The three tier arrays are **verbatim data**, stored in `/src/data/msrf.tiers.js`.

- **NORMAL — 325 entries.** Reproduce byte-for-byte *including* `1574` at index 248, between
  `1641` and `1680`. Not sorted. Never binary-search.
- **IMPORTANT — 53 entries**, strictly ascending, disjoint from NORMAL.
- **VORTEX — 12 entries**, the only non-integer set:
  `[21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4, 762.3, 871.2]`.
- `FINAL` = the three concatenated and numerically sorted (390 entries). Used **only** by the
  self-check; never by the scorer. Build it with `concat` so the tier arrays are not re-ordered.

```js
function getMsrfMatch(probe) {
  const v = round1(probe);                                    // STEP 0

  for (const n of VORTEX)                                     // STEP 1 — VORTEX FIRST
    if (Math.abs(n - v) <= 0.1)                               //   literal IEEE-754, inclusive
      return { tier: "VORTEX", number: n, points: 2, multiplier: 2.0 };

  if (String(v).endsWith(".5")) return null;                  // STEP 2 — the ".5" dead zone

  const r = Math.round(v);                                    // STEP 3
  for (const n of IMPORTANT) if (n === r)                     // STEP 4 — IMPORTANT before NORMAL
    return { tier: "IMPORTANT", number: n, points: 2, multiplier: 2.0 };
  for (const n of NORMAL)    if (n === r)                     // STEP 5
    return { tier: "NORMAL",    number: n, points: 1, multiplier: 1.5 };

  return null;                                                // at most ONE match ever
}
```

Order is everything. Because VORTEX runs first: `43.5` matches (it *is* a vortex number) even
though it ends in `.5`; `76.3` matches Vortex `76.2` and *steals* what would have been a NORMAL
`76` match, upgrading 1 pt/×1.5 to 2 pts/×2.0.

#### 3.11.2 `SCORING_SYSTEM__GTE_V8` (the default)

```
1. sort operation_match_structs:  weight DESC, operation_ordinal ASC, x_1_ordinal ASC, x_2_ordinal ASC
2. sort resonance_matches:        multiplier DESC, then operation_result.rotation_count_z DESC
3. operationScore = Σ effectiveOperations[m.operation_result.operation_ordinal].weight
   (also stamp m.points = that weight, for tooltips)
4. M = max(multiplier over resonance_matches), floor 1.0            -> 1.0 | 1.5 | 2.0
5. resonanceSubscore = Σ m.points, EXCLUDING the FIRST m whose own multiplier === M
6. base  = operationScore + resonanceSubscore                        // stored UNROUNDED
7. score = round2(base * M)
8. operation_hit_count = operation_match_structs.length
   hit_count           = operation_hit_count + resonance_matches.length
```

Because step 2 already sorted by multiplier descending, the withheld element is always index 0.
`M` is a **max**, never a product: ten Important matches still multiply once and add 2 points each.

#### 3.11.3 `SCORING_SYSTEM__LTE_V7` (legacy)

Identical through step 3, then: `resonanceSubscore = Σ m.points` (all of them),
`score = round2(operationScore + resonanceSubscore)`, no multiplier.

Unreachable from the v12 GUI (import coerces every unrecognised value to GTE_V8). The rewrite
exposes it as a selectable scoring system and preserves it on load.

Worked examples (GTE_V8):

| op hits | resonance | M | subscore | base | score | hits |
|---|---|---|---|---|---|---|
| 1 α (1.0) | — | 1.0 | 0 | 1.0 | `1` | 1 |
| 1 β (0.5) | — | 1.0 | 0 | 0.5 | `0.5` | 1 |
| 1 α | 1× Normal | 1.5 | 0 | 1.0 | `1.5` | 2 |
| 1 α | 2× Normal | 1.5 | 1 | 2.0 | `3` | 3 |
| 1 α | 1× Important | 2.0 | 0 | 1.0 | `2` | 2 |
| 1 α | Important + Normal | 2.0 | 1 | 2.0 | `4` | 3 |
| 1 α | Vortex + Important | 2.0 | 2 | 3.0 | `6` | 3 |
| 2 α + 3 β (3.5) | 1× Normal | 1.5 | 0 | 3.5 | `5.25` | 6 |

#### 3.11.4 `chronicon` resonance providers and scoring lenses

Predicates, all pure functions of the projected astronomical year `ZA` and Julian day `J`:

```js
isNode  = mod(ZA, 138) === 108                                   // Phoenix node
near    = Math.min(ZA - lastNode, nextNode - ZA) <= 2            // ≈Phoenix (else-if with isNode)
isDoc   = LEDGER_YEARS.has(ZA)                                   // documented event
isPal   = isPalindrome(displayYear) || isPalindrome(AM) || isPalindrome(J)
has138  = String(LC).includes("138") || String(AM).includes("138") || String(displayYear).includes("138")
has19   = String(displayYear).includes("19") || String(AM).includes("19")     // NOT LC
metonic = mod(referenceYear - ZA, 19) === 0
nem     = mod(ZA - 462, 792) < 60
ner     = mod(ZA - 162, 600) === 0
bak     = MAY_NODES.includes(ZA)
msrf    = MSRF_87.has(Y) || MSRF_87.has(Math.abs(Math.round(offset)))   // Y **OR** the offset
echo    = anchors.some(a => Math.abs(a.jd - ZJD) <= 1)
solar   = eclipseNear(ZJD, 1).solar                              // only within [ECL_MIN, ECL_MAX]
lunar   = eclipseNear(ZJD, 1).lunar
```

`isPalindrome(n)` = `String(Math.abs(Math.round(n)))` has length > 1 and equals its reverse.

Point tables (the *only* difference between the two lenses):

| Tag | class | **V8** (chronology-first, default) | **V7** (numbers-first) |
|---|---|---:|---:|
| `PHOENIX NODE` | `phx` | **5** | 2 |
| `≈PHOENIX` (±2 yr, mutually exclusive with the above) | `phx` | 2 | 1 |
| `DOCUMENTED` | `ev` | **5** | 1 |
| `PALINDROME ⮌` | `pal` | 3 | **4** |
| `METONIC·19` | `met` | 2 | 2 |
| `138` | `s138` | 2 | **4** |
| `19` | `s19` | 1 | 2 |
| `NEMESIS` | `nem` | 1 | 1 |
| `NER NODE` | `ner` | 1 | 1 |
| `BAKTUN` | `bak` | 1 | 1 |
| `MSRF` | `msrf` | 2 | 3 |
| `☉ SOLAR <type>` | `sol` | 2 | 2 |
| `☾ LUNAR <type>` | `lun` | 1 | 1 |
| `ECHO` | `echo` | 0 (tag only) | 0 |

Theoretical maxima: **V8 = 23**, **V7 = 22**. Everything except the two Phoenix rows stacks.
The `met` result-filter tests `metonic || has19`, not `metonic` alone.

Eclipse type names: `{T:"total", A:"annular", P:"partial", H:"hybrid"}`; lunar is `T`/`P` only.

### 3.12 Filtering

Nine independent predicates, each of which can only set `include = false`. **No early exits, no
mutation — the order is functionally irrelevant.** Requires scoring to have already run.

Preamble: `lastX` = the last **enabled** anchor's instant (scan backwards);
`cutoff` = the injected `now`, normalised to the start of its calendar day in the event's scope;
`tDates` = every enabled T-Date's instant.

| # | Field | Default | `HH_MM` (exclude when true) | Other scopes (exclude when true) |
|---|---|---|---|---|
| 1 | `iso_event_filter_before_last_x_date` | **on** | `zEnd <= lastX` | `zStart < lastX` |
| 2 | `iso_event_filter_on_last_x_date` | **on** | `lastX ∈ [zStart, zEnd)` | `zStart === lastX` |
| 3 | `iso_event_filter_before_current_date` | **on** | `zEnd <= cutoff` | `zStart < cutoff` |
| 4 | `iso_event_filter_on_current_date` | off | `cutoff ∈ [zStart, zEnd)` | `zStart === cutoff` |
| 5 | **T-Date whitelist** (implicit — active iff ≥1 enabled T-Date) | — | exclude unless ∃t: `t ∈ [zStart, zEnd)` | exclude unless ∃t: `zStart === t` |
| 6 | `iso_event_filter_min_score` | off, **1** | `z.score < value` | same |
| 7 | `iso_event_filter_min_hit_count` | off, **2** | `z.hit_count < value` | same |
| 8 | `iso_event_filter_beyond_max_days` | **on**, **2559** | `Math.round((zStart − lastX) / MILLIS_PER_DAY) > value` | same |
| 9 | `iso_event_filter_msrf_match` | off | `z.resonance_matches.length === 0` | same |

Chronicon adds three result filters that operate on tags rather than instants:
`novel` (¬echo), `phx`, `ev`, `pal`, `met`, `ecl`, `future` — see §6.6.

A negative numeric value is silently replaced by the field default. Convert everything to
numbers up front (the original compared `Date` objects against numbers and got away with it
only through `valueOf()` coercion).

### 3.13 Sorting

Five sort types. **The persisted string values drop the `Z_DATE_` prefix** — they are also the
DOM ids of the column headers.

```
"SORT_TYPE__SCORE"  "SORT_TYPE__DATE" (default)  "SORT_TYPE__MSRF"
"SORT_TYPE__HIT_COUNT"  "SORT_TYPE__OPERATIONS"
```

Comparators, with their **tie-break re-dispatch chains** (all bottom out on date ascending):

| Sort type | Primary key | Dir | Tie-break 1 | Tie-break 2 |
|---|---|---|---|---|
| `DATE` | `zStart` | **ASC** | — (keys are unique) | — |
| `SCORE` | `score` | DESC | `hit_count` DESC | `zStart` ASC |
| `HIT_COUNT` | `hit_count` | DESC | `zStart` ASC | — |
| `MSRF` | `resonance_subscore` (the GTE_V8 subscore — the strongest match excluded) | DESC | `Σ resonance number` DESC | `zStart` ASC |
| `OPERATIONS` | **`operation_hit_count`** | DESC | `zStart` ASC | — |

Two documented defects and their rulings:

- **`OPERATIONS` never sorts by `operation_score`.** Both arms of the original's `if/else`
  assigned the count. **Reproduce for parity**, and rename the column tooltip to say
  "number of Operations" (which is what it does). Expose `SORT_TYPE__OPERATION_SCORE` as a
  *new, separate* sort type for the behaviour the tooltip promised (§9 D8).
- **No original comparator ever returns `0`.** `(a > b ? -1 : 1)` returns `1` both ways for
  equal values, making ties non-transitive and input-order dependent. **The rewrite returns `0`
  on ties and uses a stable sort** (§9 D7), which can reorder tied rows relative to v12.
  Anything ordered by a genuine key is unaffected.

Precompute `resonance_subscore` and `resonance_number_sum` onto each z-struct during scoring;
never recompute them inside the comparator.

`sortAndFilterResults` runs the sort **twice**: once with `DATE` to assign `z_ordinal`
(so the `Z₁, Z₂, …` row labels stay chronological no matter which column is sorted), then once
with the user's chosen type to produce `processed_z_dates`.

An unrecognised `z_date_sort_type` must be **rejected at import** and coerced to
`SORT_TYPE__DATE` (v12 produced a constant comparator and a garbage order).

### 3.14 Reference pseudocode (whole pipeline)

```
runOphis(isoEvent, ctx):
  reck   = reckonings.get(isoEvent.reckoning ?? "ophis")
  errors = []; yStructs = []; zStructs = {}

  effOps   = isoEvent.operations.map((op,i) => compileIfEnabled(op, i, reck))
  runnable = effOps.filter(o => o.enabled === true && o.ok)

  if      (countEnabled(isoEvent.x_dates) < 2) errors.push(E_MIN_X_DATES)
  else if (isoEvent.scope === MONTHS)          errors.push(E_MONTHS)
  else if (isoEvent.scope === YEARS)           errors.push(E_YEARS)
  else if (runnable.length < 1)                errors.push(E_MIN_OPS)
  else if (!validateSpread(isoEvent))          errors = spreadErrors(isoEvent)
  else
    for [k,i] in unorderedPairs(isoEvent.x_dates):        # k < i, both enabled
      X1 = reck.calendar.toInstant(x_dates[k], isoEvent)
      X2 = reck.calendar.toInstant(x_dates[i], isoEvent)
      Y  = reck.calendar.span(X1, X2, isoEvent)
      if (!reck.calendar.spanInRange(Y)) continue
      ys = { y_ordinal: yStructs.length, rotation_count_y: Y, x_1_ordinal: k, x_2_ordinal: i,
             operation_results: [] }
      for (oi, op) in effOps.entries():
        if (op.enabled !== true || !op.ok) continue
        r = project(op, oi, Y, X1, X2, isoEvent, reck)     # §3.7 STEP 4
        if (r === null) continue
        ys.operation_results.push(r)
        key = String(r.zStart)
        z   = zStructs[key] ??= newZStruct(r)
        z.operation_match_structs.push({ y_struct: ys, operation_result: r })
        for (p of reck.resonanceProviders)
          for (m of p.match(r, isoEvent, ctx))
            z.resonance_matches.push({ ...m, y_struct: ys, operation_result: r })
      yStructs.push(ys)

  scoring = scoringSystems.get(isoEvent.scoring_system ?? reck.defaultScoringSystem)
  for z of values(zStructs): scoring.score(z, effOps)

  results = { errors, y_structs: yStructs, z_structs: zStructs,
              processed_z_dates: [], processed_z_dates__sorted_by_date: [],
              diagnostics: collectDiagnostics() }

  if (errors.length === 0):
    keys   = filters.apply(isoEvent, zStructs, ctx.now)
    byDate = sorts.get(SORT_TYPE__DATE).apply(keys, zStructs)
    byDate.forEach((k,i) => zStructs[k].z_ordinal = i)
    results.processed_z_dates__sorted_by_date = byDate
    results.processed_z_dates = isoEvent.z_date_sort_type === SORT_TYPE__DATE
                                 ? [...byDate]
                                 : sorts.get(isoEvent.z_date_sort_type).apply(keys, zStructs)
    if (reck.supportsConvergence)
      results.convergences = findConvergences(nonEcho(results), isoEvent.convergence_tolerance)

  return results
```

The engine is a **pure function** of `(isoEvent, ctx)`. It mutates nothing outside its own
return value — unlike v12, which wrote `effective_operations` onto the event, stamped `points`
onto match structs, and sorted match arrays in place.

### 3.15 Error strings (verbatim — the UI depends on these)

```
"At least 2 X-Dates are required."
"Month-based projections may be supported in a future version."
"Year-based projections may be supported in a future version."
"At least 1 Operation is required."
"No results. You probably have to loosen up a filter."
"Cannot be empty."
"Must start with 'X1 + …' or 'X2 + …'"
"Z-value must resolve to a number > 0."
"Identical to Operation <N>; each Operation must be unique."
"X<i> must be greater than X<i-1>"
"X<a> and X<b> must be different days."                    // + ", or before/after sunset." in HH:MM
"X<i> must be at least <N> day(s) after X<i-1>, found: <n>"
```

---

## 4. DATA MODEL

TypeScript interfaces. Everything marked `// v12` is the on-disk `.oph` contract and must not be
renamed without a migration. Everything marked `// new` is additive and written only by the
rewrite (older readers ignore unknown keys; the rewrite tolerates their absence).

### 4.1 The document

```ts
/** An .oph file. UTF-8 JSON. A bare top-level IsoEvent[] is also accepted on load. */
interface OphDocument {
  app_version: string;            // v12 — e.g. "12". Informational only; drives NO migration.
  iso_events: IsoEvent[];         // v12
  global_options?: GlobalOptions; // v12 — localStorage ONLY. Never written to a .oph on disk.
  schema?: 2;                     // new  — present => written by the rewrite
}
```

### 4.2 IsoEvent

```ts
type EventScope   = "EVENT_SCOPE__HH_MM" | "EVENT_SCOPE__DAYS"
                  | "EVENT_SCOPE__MONTHS" | "EVENT_SCOPE__YEARS";
type EventType    = "EVENT_TYPE__PERSONAL" | "EVENT_TYPE__MARKETS" | "EVENT_TYPE__ASTROLOGICAL";
type ScoringId    = "SCORING_SYSTEM__GTE_V8" | "SCORING_SYSTEM__LTE_V7"
                  | "SCORING_SYSTEM__CHRONICON_V8" | "SCORING_SYSTEM__CHRONICON_V7" | string;
type SortTypeId   = "SORT_TYPE__DATE" | "SORT_TYPE__SCORE" | "SORT_TYPE__MSRF"
                  | "SORT_TYPE__HIT_COUNT" | "SORT_TYPE__OPERATIONS"
                  | "SORT_TYPE__OPERATION_SCORE" | string;
type ReckoningId  = "ophis" | "chronicon" | string;

interface IsoEvent {
  // ---- identity ----
  name: string;                    // v12 — "" allowed. New events: "Event 1", "Event 2", ...
  notes: string;                   // v12 — free text; never affects results

  // ---- inputs ----
  x_dates: XDate[];                // v12 — ORDER IS SEMANTIC. index+1 is the X1,X2,... label.
  t_dates: XDate[];                // v12 — pure whitelist filter; never projected. [] if absent.

  // ---- reckoning & calendar ----
  reckoning: ReckoningId;          // new  — default "ophis"
  scope: EventScope;               // v12 — default EVENT_SCOPE__DAYS
  type: EventType;                 // v12 — PURELY COSMETIC (skin + window title). Default PERSONAL.
  lat: number;                     // v12 — |lat| <= 65.  Meaningful ONLY in HH:MM scope.
  long: number;                    // v12 — |long| <= 180. Meaningful ONLY in HH:MM scope.
  location_enabled: boolean;       // v12 — treat as (scope === HH_MM). Zero engine effect.
  day_scope_start_time_in_millis: number;  // v12 — DAYS scope only. Default 0.
                                   //        Clamped on load to MILLIS_PER_DAY - MILLIS_PER_MINUTE.

  // ---- computation ----
  operations: Operation[];         // v12 — >=1 required to run. Missing => the 16-op default pack.
  scoring_system: ScoringId;       // v12 — default SCORING_SYSTEM__GTE_V8
  z_date_sort_type: SortTypeId;    // v12 — default SORT_TYPE__DATE. NOW VALIDATED on import.
  convergence_tolerance?: number | "year";  // new — chronicon only. Default 30.

  // ---- 8 filter flags (+ 3 companion values). Keys are mechanically derived; see 4.5. ----
  iso_event_filter_before_last_x_date: boolean;         // default true
  iso_event_filter_on_last_x_date: boolean;             // default true
  iso_event_filter_before_current_date: boolean;        // default true
  iso_event_filter_on_current_date: boolean;            // default false
  iso_event_filter_beyond_max_days: boolean;            // default true
  iso_event_filter_beyond_max_days_value: number;       // default 2559
  iso_event_filter_min_hit_count: boolean;              // default false
  iso_event_filter_min_hit_count_value: number;         // default 2
  iso_event_filter_min_score: boolean;                  // default false
  iso_event_filter_min_score_value: number;             // default 1
  iso_event_filter_msrf_match: boolean;                 // default false

  // ---- 14 chart-option flags ----
  chart_option__show_chart: boolean;                    // default true
  chart_option__show_dates: boolean;                    // default true
  chart_option__show_new_moons: boolean;                // default false
  chart_option__show_first_quarter_moons: boolean;      // default false
  chart_option__show_full_moons: boolean;               // default false
  chart_option__show_third_quarter_moons: boolean;      // default false
  chart_option__show_waxing_crescent_moons: boolean;    // default false
  chart_option__show_waning_crescent_moons: boolean;    // default false
  chart_option__show_waxing_gibbous_moons: boolean;     // default false
  chart_option__show_waning_gibbous_moons: boolean;     // default false
  chart_option__full_solar_eclipses: boolean;           // default false
  chart_option__partial_solar_eclipses: boolean;        // default false
  chart_option__full_lunar_eclipses: boolean;           // default false
  chart_option__partial_lunar_eclipses: boolean;        // default false

  // ---- persisted chart viewport; 0 is the "auto-fit" sentinel ----
  chart_x_min: number; chart_x_max: number;             // v12 — default 0
  chart_y_min: number; chart_y_max: number;             // v12 — default 0
}
```

**Removed from the model entirely.** `effective_operations`, `checked_for_swap_source` and
`checked_for_swap_target` were runtime fields v12 wrote onto the event and then had to delete
before saving. In the rewrite the engine is pure and swap selection lives in UI state, so these
never exist.

### 4.3 XDate (identical shape for T-Dates)

```ts
interface XDate {
  date: string;      // v12 — "MM/DD/YYYY", month-first, zero-padded month & day, 4-digit year.
  time: string;      // v12 — "HH:mm" 24h. Unpadded ("0:00") is ACCEPTED on load, written padded.
                     //       Ignored for every scope except HH_MM (forced to "00:00").
  enabled: boolean;  // v12 — MUST be strictly `true` to participate. Non-boolean => true on load.
  label?: string;    // new  — optional human name, shown in the chronicon anchor list
  astro_year?: number; // new — chronicon: 1 BC = 0, 2 BC = -1. Wins over the year inside `date`.
}
```

### 4.4 Operation

```ts
interface Operation {
  equation: string;   // v12 — MUST start "X1+" or "X2+". e.g. "X2+YxOPH_PHI"
  weight: number;     // v12 — >0. >=1 => Alpha, <1 => Beta. Contributes VERBATIM to the score.
                      //       No upper bound. Invalid or <=0 input coerces to 0.5 in the editor.
  enabled: boolean;   // v12 — honoured correctly in the rewrite (v12's factory ignored it)
  packId?: string;    // new  — provenance: which pack this row came from
}

/** Runtime only — never serialised. */
interface CompiledOperation extends Operation {
  ok: boolean;
  anchor?: "X1" | "X2";
  fn?: (Y: number) => number;
  ast?: AstNode;
  normalised?: string;
  errors: string[];
}
```

### 4.5 Serialized-field descriptors (how the filter / chart keys are derived)

Every filter and chart-option key is generated mechanically from a `SERIALIZED_FIELD__*` name.
The rewrite keeps this derivation so the `.oph` keys and the DOM ids stay identical.

```ts
interface SerializedField {
  varName: string;                  // "SERIALIZED_FIELD__ISO_EVENT_FILTER_MIN_SCORE"
  serializationKey: string;         // varName.replace("SERIALIZED_FIELD__","").toLowerCase()
  serializationKeyForValue: string; // serializationKey + "_value"
  elemId: string;                   // serializationKey.replaceAll("_","-") + "-checkbox"
  elemIdForInput: string;           // serializationKey.replaceAll("_","-") + "-input"
  enabledByDefault: boolean;
  numericDefault: number | null;
  name: string;                     // label
  title: string;                    // tooltip
  textOnlyName: string | null;
  zIndex: number;                   // chart draw order for indicator fields
}
```

**Gotcha to preserve:** `SERIALIZED_FIELD__CHART_OPTION__SHOW_CHART` contains a double
underscore, so its `elemId` is `chart-option--show-chart-checkbox` — with a **double hyphen**.

Chart-option `zIndex` (higher draws on top): `show_chart` 10, `show_dates` 10, all eight moons 5,
full-solar 10, full-lunar 9, partial-solar 8, partial-lunar 7.

Filter field tooltips, verbatim:

| Key | Tooltip |
|---|---|
| `before_last_x_date` | Checking this box means all output before last X-Date will be hidden. |
| `on_last_x_date` | Checking this box means any output on last X-Date will be hidden. |
| `before_current_date` | Checking this box means any output before the current date (adjustable) will be hidden. |
| `on_current_date` | Checking this box means any output on the current date (adjustable) will be hidden. |
| `beyond_max_days` | Checking this box means any output beyond the given number of days after the last X-Date will be hidden. |
| `min_hit_count` | Checking this box means any output with hit count lower than this will be hidden. |
| `min_score` | Checking this box means any output lower than this score will be hidden. See About page for how score is calculated. |
| `msrf_match` | Checking this box means any output *without* MSRF matches will be hidden. |

### 4.6 Engine result shapes

```ts
interface YStruct {
  y_ordinal: number;          // 0-based, in pair-emission order
  rotation_count_y: number;   // Y, 1 dp. UNCLAMPED (the clamped copy lives on each result)
  x_1_ordinal: number;        // index into the UNFILTERED x_dates of the LOWER-INDEXED anchor
  x_2_ordinal: number;        // index of the HIGHER-INDEXED anchor
  operation_results: OperationResult[];
}

interface OperationResult {
  operation_ordinal: number;    // index into effectiveOperations AND into isoEvent.operations
  operation: Operation;         // snapshot
  anchor: "X1" | "X2";
  rotation_count_y: number;     // the CLAMPED Y actually fed to fn()
  z_value: number;              // raw offset, round2
  rotation_count_z: number;     // round1(z_value)  <-- THE RESONANCE PROBE
  z_instant_raw: number;        // base + raw*MILLIS_PER_DAY (or base + raw for JDN) - unnormalised
  z_start: number;              // normalised window start - THE BUCKET KEY SOURCE
  z_end: number;                // === z_start unless HH:MM sunset window
  x_instant_base: number;       // the anchor the offset was added to (post day-start shift)
  x_instant_other: number;      // the other anchor
  id: string;                   // STRUCTURED and DELIMITED: `${oi}|${x1}|${x2}|${zStart}`
}

interface ResonanceMatch {
  providerId: string;           // "msrf" | "chronicon-lattice" | "eclipse" | "echo"
  tier: string;                 // "NORMAL" | "IMPORTANT" | "VORTEX" | "PHOENIX_NODE" | ...
  label: string;                // display text, e.g. "84 = Important", "PHOENIX NODE"
  cssClass: string;             // "msrf_important" | "phx" | "sol" | ...
  number?: number;              // the matched resonance number (MSRF tiers)
  points: number;
  multiplier: number;           // 1.0 | 1.5 | 2.0
  y_struct: YStruct;
  operation_result: OperationResult;
}

interface ZStruct {
  key: string;                  // String(z_start) - the dictionary key
  z_start: number; z_end: number; z_instant_raw: number;
  readable_start: string; readable_end: string;   // frozen at the FIRST contributor
  operation_match_structs: {
    y_struct: YStruct; operation_result: OperationResult; points?: number;
  }[];
  resonance_matches: ResonanceMatch[];
  // written by the scoring system:
  operation_score: number;          // sum of weights, UNROUNDED
  operation_hit_count: number;
  resonance_subscore: number;       // precomputed for the MSRF comparator
  resonance_number_sum: number;     // precomputed tie-break
  base_score_pre_multiply: number;  // UNROUNDED
  multiplier: number;               // 1.0 | 1.5 | 2.0
  score: number;                    // round2
  hit_count: number;                // operation_hit_count + resonance_matches.length
  tags: string[];                   // chronicon tag display texts
  echo: boolean;
  // written by sortAndFilter:
  z_ordinal: number;                // 0-based position in the DATE-sorted, FILTERED list
}

interface Convergence {
  centerJD: number; year: number; month: number; day: number;
  nOps: number; nPairs: number; count: number;
  minJD: number; maxJD: number; spanDays: number;
  bestScore: number; tags: string[]; ops: string[]; pairs: string[];
  items: ZStruct[];
}

interface OphisResults {
  errors: (string | { error_status: "NO_RESULTS" | "GENERAL_FAILURE"; error_message: string })[];
  y_structs: YStruct[];
  z_structs: Record<string, ZStruct>;
  processed_z_dates: string[];                 // filtered + sorted by z_date_sort_type
  processed_z_dates__sorted_by_date: string[]; // filtered + DATE-sorted (drives z_ordinal)
  convergences?: Convergence[];
  diagnostics: Diagnostic[];                   // new - see 9 D5/D6
  stale?: boolean;                             // injected by the controller, not the engine
}

interface Diagnostic {
  kind: "NON_FINITE_Z" | "CLAMPED_Y" | "CLAMPED_Z" | "OUT_OF_CALENDAR_RANGE"
      | "OPERATION_INVALID" | "SPAN_OUT_OF_RANGE";
  operation_ordinal?: number; y_ordinal?: number; detail: string; count: number;
}
```

### 4.7 GlobalOptions (localStorage only — never in a `.oph`)

```ts
interface GlobalOptions {
  // strings
  start_screen: string;                        // e.g. "OPHIS_SCREEN__Z_DATES"
  skin_mode: "SKIN_MODE__CLASSIC" | "SKIN_MODE__ASTROLOGICAL" | "SKIN_MODE__MARKETS";
  current_file_path: string;                   // "" in the browser
  theme: "dark" | "light" | "system";          // new
  density: "simple" | "full";                  // new
  // numbers
  local_time_offset_in_millis: number;         // default 0 - the adjustable "current date"
  current_iso_event_index: number;             // default 0
  text_zoom: number;                           // new - 0.8 ... 1.5, 0.1 steps
  // booleans - every one defaults FALSE except the two marked
  auto_recalculate_z_dates: boolean;           // default TRUE
  prettify_oph_files: boolean;                 // default TRUE
  minify_oph_files: boolean;
  blur_about_screen: boolean;
  hide_operations_col_completely: boolean;
  prettify_x_date_export_output: boolean;
  minify_x_date_export_output: boolean;
  hide_date_col: boolean; hide_hits_col: boolean; hide_score_col: boolean;
  hide_msrf_col: boolean; hide_operations_col: boolean;
}
```

localStorage keys: `psyfr:document` (the `{app_version, iso_events, global_options}` blob; also
accepts the legacy key `save_blob` on first read), `psyfr:theme`, `psyfr:zoom`, `psyfr:density`.
The legacy PSYFR keys `ophion-theme` / `ophion-zoom` / `ophion-mode` are read once and migrated.

### 4.8 Load / save contract

**Load** — `parseDocument(text, mode) -> { document, errors, warnings }`:

1. `JSON.parse`. On failure: `"Could not parse JSON due to error: <e>"`.
2. Accept `{app_version, iso_events}` **or** a bare `IsoEvent[]`.
3. Per event, in order: name -> notes -> day-scope start time -> scope -> type -> serialized
   fields -> operations -> scoring system -> sort type -> reckoning -> lat/long -> x_dates ->
   t_dates.
4. **Validation modes.** `strict` rejects anything unrecognised; `loose` (the GUI default)
   repairs and warns. In v12 the difference was *structural only* — the rewrite additionally
   validates every operation string in **both** modes at import time (see 9 D1), because
   compilation is now free of side effects.
5. All-or-nothing: any error => `document === null`. Warnings go to the activity log.
6. Defaults for anything missing come from `src/data/defaults.js`.

**Save** — `serialiseDocument(doc, {prettify, minify}) -> string`:

- Key order: `app_version`, `schema`, `iso_events`. `global_options` only for the localStorage blob.
- `JSON.stringify(obj, null, prettify ? 2 : undefined)`.
- **Do NOT apply v12's `replaceAll(",", ", ")` post-processing.** It rewrote commas *inside*
  string values and accreted a space on every save/load cycle — a real fidelity bug (9 D10).
- **Minify** strips any field equal to its default, drops `time` for DAYS-scope anchors, drops
  `enabled` when `true`, drops `operations` entirely when positionally identical to the 16-op
  default, drops `type`, and drops `lat`/`long`/`location_enabled` for DAYS scope. v12's
  minifier also deleted `notes` whenever `day_scope_start_time_in_millis` was default — a
  copy-paste bug. **Do not replicate it.**

---

## 5. MODULE ARCHITECTURE

### 5.1 Principles

1. **The engine is pure.** No DOM, no globals, no clock, no `localStorage`, no side effects on
   its inputs. `runOphis(isoEvent, ctx)` is a function. That is what makes it testable and what
   lets it run in a Worker.
2. **One-way dependency flow:** `data -> core -> registry -> state -> ui`. Nothing in `core/`
   imports from `ui/`, `state/` or `persistence/`. Nothing in `data/` imports anything at all.
3. **Everything variable is data or a registered plugin.** Operations, resonance sets, scoring
   systems, filters, sorts, calendars, themes: none of them is a `switch` in the engine.
4. **Registries auto-discover.** Each registry `index.js` is
   `Object.values(import.meta.glob("./*.js", { eager: true })).forEach(m => register(m.default))`.
   **Dropping a file into the folder is the entire registration step.**
5. **The DOM is never the state store.** v12 read the current screen from a `<select>`'s value.
   The rewrite has a single store; the DOM is a projection of it.
6. **No `innerHTML` with interpolated user data, ever.** v12 had zero escaping and shipped
   DOMPurify without ever calling it.

### 5.2 File tree

```
src/
+-- data/                          <- PURE DATA. No imports. THIS IS THE MOD SURFACE.
|   +-- msrf.tiers.js              MSRF_NORMAL[325] / IMPORTANT[53] / VORTEX[12], verbatim
|   +-- msrf.87.js                 the reduced 87-member chronicon MSRF set (incl. flagged 1138)
|   +-- operations.packs.js        every operation pack: ophis-lte-v7 / gte-v8 / gte-v10 / xtras,
|   |                              chronicon-default-19 / 138 / metonic-19 / phoenix-lattice / golden
|   +-- chronicon.lattice.js       PHOENIX / NEMESIS / NER / METONIC / MAY_NODES / offsets
|   +-- chronicon.ledger.js        the 69-row documented-event ledger E[]
|   +-- eclipses.solar.js          delta-encoded, sorted, UTC, build-generated
|   +-- eclipses.lunar.js          ditto
|   +-- constants.js               MILLIS_*, precisions, clamps, limits
|   +-- formula.constants.js       per-reckoning OPH_PI / PHI / CRV / HEP tables
|   +-- serialized.fields.js       the 8 filter + 14 chart-option descriptors
|   +-- copy.js                    every user-facing string (the copy deck, 6.12)
|   +-- defaults.js                default IsoEvent / GlobalOptions
|   +-- quirks.js                  the 12 parity flags of 0.3, all default true
|
+-- core/                          <- PURE. Imports only from data/.
|   +-- numeric.js                 roundToPrecision, round1, round2, clamp, isFiniteNumber
|   +-- ophfn.js                   the oph_* registry + per-reckoning nanPolicy
|   +-- equation/
|   |   +-- lex.js                 string -> Token[]
|   |   +-- parse.js               Token[] -> Ast (recursive descent)
|   |   +-- evaluate.js            (Ast, scope) -> number
|   |   +-- compile.js             compileOperation() - validate + build ONE function
|   +-- calendar/
|   |   +-- gregorian-ms.js        MM/DD/YYYY <-> UTC ms; DAYS-scope window normalisation
|   |   +-- jdn.js                 jdn(), jdToDate(), mod(), fmtYear(), isPalindrome()
|   |   +-- zone.js                Intl-based partsInZone / zonedToUtc / midnightInZone
|   |   +-- sunset.js              Astronomy-Engine sunset provider (lazy, HH:MM only)
|   +-- engine/
|       +-- pairs.js               unorderedPairs(xDates) -> [k,i][]
|       +-- project.js             one (pair x operation) -> OperationResult
|       +-- bucket.js              merge results into ZStructs by String(z_start)
|       +-- score.js               applies the selected scoring system to every ZStruct
|       +-- filter.js              runs every registered filter predicate
|       +-- sort.js                runs the selected comparator, twice
|       +-- converge.js            findConvergences()
|       +-- run.js                 runOphis(isoEvent, ctx) - the orchestrator
|
+-- reckonings/                    <- PLUGINS. One file = one reckoning.
|   +-- ophis.js                   calendar + constants + fn table + [msrf] + GTE_V8 default
|   +-- chronicon.js               jdn + constants + fn table + [lattice, msrf87, eclipse, echo]
|   +-- index.js                   auto-glob registry
|
+-- resonance/                     <- PLUGINS. One file = one resonance provider.
|   +-- msrf.js                    getMsrfMatch() -> 0 or 1 ResonanceMatch
|   +-- chronicon-lattice.js       phoenix / nemesis / ner / metonic / baktun / palindrome /
|   |                              documented / 138 / 19
|   +-- eclipse.js                 binary-search the delta-encoded tables
|   +-- echo.js                    lands back on an input anchor (+-1 day)
|   +-- index.js
|
+-- scoring/                       <- PLUGINS. One file = one scoring system.
|   +-- ophis-gte-v8.js            multiplier model
|   +-- ophis-lte-v7.js            purely additive
|   +-- chronicon-v8.js            chronology-first weight table
|   +-- chronicon-v7.js            numbers-first weight table
|   +-- index.js
|
+-- filters/                       <- PLUGINS. One file = one predicate.
|   +-- before-last-x-date.js  on-last-x-date.js  before-current-date.js  on-current-date.js
|   +-- t-date-whitelist.js    min-score.js       min-hit-count.js        beyond-max-days.js
|   +-- requires-resonance.js  chronicon-tag.js
|   +-- index.js
|
+-- sorts/                         <- PLUGINS. One file = one comparator.
|   +-- date.js  score.js  msrf.js  hit-count.js  operations.js  operation-score.js
|   +-- index.js
|
+-- registry/
|   +-- makeRegistry.js            id -> descriptor map with freeze + duplicate detection
|
+-- persistence/
|   +-- schema.js                  runtime validators for OphDocument / IsoEvent / XDate / Operation
|   +-- load.js                    parseDocument(text, mode)
|   +-- save.js                    serialiseDocument(doc, opts) + the minifier
|   +-- migrate.js                 legacy-key and legacy-shape upgrades
|   +-- storage.js                 localStorage adapter (namespaced, quota-aware)
|   +-- files.js                   File System Access API + <input type=file> / <a download> fallback
|
+-- state/
|   +-- store.js                   one observable store; actions in, snapshots out
|   +-- actions.js                 every mutation to iso_events / global_options
|   +-- selectors.js               derived reads (current event, current results, staleness)
|   +-- recalc.js                  the debounce + stale policy + Worker dispatch
|
+-- workers/
|   +-- engine.worker.js           imports core/engine/run.js; postMessage in/out
|
+-- ui/
|   +-- app.js                     mount, route, wire the store
|   +-- router.js                  screen id <-> store <-> URL hash. NOT the DOM.
|   +-- components/                small, dumb, no store access: Pill, Table, Dialog, Toast,
|   |                              DateField, NumberField, Checkbox, MasterCheckbox, Wheel,
|   |                              Meter, TagChip, Fold, ActivityLog
|   +-- screens/                   one file per screen (section 6)
|   |   +-- z-dates.js  operations.js  anchors.js  filters.js  event-settings.js
|   |   +-- event-swap.js  import.js  export-events.js  export-z-dates.js
|   |   +-- convergence.js  wheels.js  ledger.js  method.js  about.js  audit.js
|   +-- chart/
|   |   +-- scales.js              toPixel / toValue - the ONLY chart-library-shaped contract
|   |   +-- arcs.js                15-point half-ellipse generation + alpha ramp
|   |   +-- layout.js              fan-out, collision grouping, label spreading
|   |   +-- draw.js                Canvas2D: axis, arcs, labels, symbols, rulers, astro icons
|   |   +-- interact.js            hit testing, zoom/pan, hover linkage
|   +-- format.js                  every number/date -> display-string rule (6.11)
|
+-- theme/
|   +-- tokens.css                 the custom-property block of section 7
|   +-- base.css                   reset, layout primitives, components
|   +-- themes.js                  theme registry (dark, parchment, instrument)
|
+-- main.js                        entry: mount app, no top-level side effects beyond that
```

### 5.3 Dependency direction

```
data ---> core ---> reckonings --+
  |        |        resonance    +---> registry ---> state ---> ui
  |        |        scoring      |                     |
  |        |        filters      |                     +---> workers (imports core only)
  |        |        sorts     ---+                     |
  +--------+--------------------------------------------+--> persistence (data + core/calendar)

theme is imported only by ui.   NOTHING imports ui.
```

Enforced by an ESLint `no-restricted-imports` rule per directory. A `core/` file importing from
`ui/` is a build failure, not a code-review note.

### 5.4 Moddability contract — what "adding X" costs

| Change | Files touched | How |
|---|---|---|
| **Add an operation** | **1** — `src/data/operations.packs.js` | Append `{equation, weight, enabled}` to a pack array. It is data; nothing is compiled at build time. |
| **Add an operation *pack*** | **1** — `src/data/operations.packs.js` | Add a key to the exported `PACKS` object. The pack picker enumerates `Object.keys(PACKS)`. |
| **Add a scoring system** | **1** — `src/scoring/<id>.js` | Default-export `{ id, label, description, reckonings, score(zStruct, effOps) }`. The glob picks it up; it appears in the selector automatically. |
| **Add a resonance provider** | **1** — `src/resonance/<id>.js` | Default-export `{ id, label, reckonings, match(operationResult, isoEvent, ctx) -> ResonanceMatch[] }`. |
| **Add a filter** | **1** — `src/filters/<id>.js` | Default-export `{ id, field, label, title, defaultEnabled, numericDefault, test(z, ctx) -> boolean }`. The Filters panel row is generated from the descriptor. |
| **Add a sort order** | **1** — `src/sorts/<id>.js` | Default-export `{ id, label, tooltip, direction, key(z), tieBreak: [...] }`. The column header is generated. |
| **Add a theme** | **1** — `src/theme/themes.js` | Add a token block. Themes are pure custom-property sets; no component knows a theme exists. |
| **Add a resonance number** | **1** — `src/data/msrf.tiers.js` | Append to a tier array. The self-check (8.7) fails loudly if it collides with a vortex window. |
| **Add a reckoning** | **1** — `src/reckonings/<id>.js` (+ the calendar module it names, if new) | Default-export `{ id, label, calendar, constants, functions, resonanceProviders, defaultScoringSystem, supportsConvergence, columns }`. |
| **Add a ledger event** | **1** — `src/data/chronicon.ledger.js` | Append `[astroYear, kind, text, [month, day]?]`. |

Adding a *screen* costs 2 files (`ui/screens/<id>.js` plus one line in the screen manifest) —
the screen order is meaningful, so it is deliberately explicit rather than globbed.

### 5.5 Registry shape

```js
// src/registry/makeRegistry.js
export function makeRegistry(kind) {
  const map = new Map();
  return {
    register(d) {
      if (!d?.id) throw new Error(`${kind}: descriptor needs an id`);
      if (map.has(d.id)) throw new Error(`${kind}: duplicate id "${d.id}"`);
      map.set(d.id, Object.freeze(d));
    },
    get(id)     { return map.get(id) ?? null; },
    require(id) { const d = map.get(id); if (!d) throw new Error(`${kind}: unknown id "${id}"`); return d; },
    list()      { return [...map.values()]; },
    listFor(reckoningId) {
      return [...map.values()].filter(d => !d.reckonings || d.reckonings.includes(reckoningId));
    },
  };
}
```

### 5.6 Recalculation policy (replaces v12's `refreshXDates`)

v12 ran the whole engine **synchronously on the main thread** on every committed input change;
its only mitigation was an auto-recalculate off-switch plus a *Stale* badge. Keep the UX, fix
the mechanics:

- Every mutation dispatches an action; the store marks results **stale**.
- `recalc.js` debounces 120 ms, then posts `{isoEvent, ctx}` to `workers/engine.worker.js`.
- The worker replies with plain-JSON `OphisResults`. **Resonance matches carry a `tier` *string*,
  never an array reference.** v12 compared `msrf_filter` by *identity*, so any structured-clone
  or JSON round-trip silently collapsed the multiplier to `1.0` — exactly the bug a Worker
  would have detonated.
- While a run is in flight the previous results stay on screen, dimmed, with the *Stale* badge
  and an enabled **Recalculate** button — identical to v12's affordance.
- If `auto_recalculate_z_dates` is off, no run is dispatched at all; the badge stays *Stale*.
- The badge container has a fixed width so *Stale* <-> *Up-to-date* never shifts layout.
- Chronicon casts are explicit: the user presses **Cast the Oracle**; nothing auto-runs.

---

## 6. UI SPECIFICATION

Consolidated from specs 07, 08, 09, 10 and 13. The v12 layout (four input panels above a shared
output table, with a timeline chart beside it) is the **working surface**; the PSYFR/Natori
layout (a scrolling document of numbered sections) is the **reading surface**. The rewrite keeps
both, as two modes of the same app.

### 6.1 Shell

```
+--------------------------------------------------------------------------------------------+
| PSYFR   . Ophis x Chronicon         Work  Oracle  Convergence  Wheels  Ledger  Method  About|
|  (wordmark, Cinzel 800)             [A- A A+]  [* Simple]  [Dark/Light]        v13   (Saved)|
+--------------------------------------------------------------------------------------------+
|  <screen body>                                                                              |
+--------------------------------------------------------------------------------------------+
```

- Sticky top bar, `backdrop-filter: blur(8px)`, `z-index: 60`.
- The wordmark is **typography, not a raster header image**. v12's two 130–150 KB header PNGs
  are dropped.
- `Saved` / `Not Saved` badge — `--green` / `--red`. Fixed width; never shifts layout.
- `A- A A+` sets `--zoom` on `:root`, clamped **0.8 … 1.5** in 0.1 steps, persisted.
- `Simple` toggles `body.simple`, which hides `.simple-hide` sections (advanced packs, scoring
  lens, ledger, method). Persisted.
- Theme toggle cycles dark / light / system. Persisted.
- **No skin-swapping header images, no `EVENT_TYPE`-driven window titles.** `type` stays in the
  schema for file compatibility and is otherwise inert.

### 6.2 Screen inventory

| Screen id | Label | Reckoning | Purpose |
|---|---|---|---|
| `SCREEN__WORK` | Work | both | The v12 working surface: anchors, operations, filters, results, chart. |
| `SCREEN__Z_DATES` | Z-Dates | ophis | Results table only (the output pane, full width). |
| `SCREEN__ORACLE` | The Oracle | chronicon | Anchors + pack + lens + Cast + ranked results. |
| `SCREEN__CONVERGENCE` | The Convergence | chronicon | Agreement clusters. |
| `SCREEN__WHEELS` | The Wheels | chronicon | Seven cycle dials at one instant. |
| `SCREEN__LEDGER` | The Ledger | chronicon | 69 documented events, filterable, seedable. |
| `SCREEN__OPERATIONS` | Operations | both | The operation-table editor. |
| `SCREEN__EVENT_SETTINGS` | Event Settings | both | Per-event notes + day-scope start time. |
| `SCREEN__EVENT_SWAP` | Event Data Transfer | both | Bulk-copy categories between Iso-Events. |
| `SCREEN__IMPORT` | Import Events | both | Paste-a-blob importer. |
| `SCREEN__EXPORT_EVENTS` | Export Events | both | Show / copy / download the input-only blob. |
| `SCREEN__EXPORT_Z_DATES` | Export Z-Dates | both | CSV / XLSX / PDF of the results. |
| `SCREEN__AUDIT` | Audit | both | **New.** Replaces v12's dead Debug screen. Full derivation trace. |
| `SCREEN__METHOD` | Method & Lineage | both | Scoring rules, constants, provenance, disclaimer. |
| `SCREEN__ABOUT` | About | both | Implementation notes, MSRF listing, security claims. |

Screen identity lives in the **store**, mirrored to `location.hash`, never read back from a
`<select>`. Deep-linking works.

**Error bounce.** When results carry errors and the current screen cannot show them, switch to
`SCREEN__WORK`. v12's allow-list excluded About / Import / Export-Z-Dates, which was arbitrary;
the rewrite instead renders an error banner **in place** on every screen and only bounces from
screens with no banner slot.

### 6.3 `SCREEN__WORK` — the working surface

```
+-- E1 ISO-EVENTS ------+-- E1 X-DATES --------+-- E1 T-DATES -------+-- E1 FILTERS ---------+
| [+ Add] [Reset] [?]   | [+ Add] [Reset] [?]  | [+ Add] [Reset] [?] | [Reset] [?]           |
| +-------------------+ | +------------------+ | +-----------------+ | F1 [x] before last X  |
| |(o) E1 Event 1  [x]| | |X1 [07/04/2026] [x]| | |T1 [ ........ ][x]| | F2 [x] on last X      |
| |    lat[0.0] lon[0]| | |X2 [08/20/2026] [x]| | |                 | | F3 [x] before current |
| |    Etc/GMT   [map]| | |X3 [03/09/2027] [x]| | |                 | | F4 [ ] on current     |
| |( ) E2 Event 2  [x]| | |X4 [03/16/2027] [x]| | |                 | | F5 [x] beyond [2559] d|
| |                   | | |X5 [07/17/2027] [x]| | |                 | | F6 [ ] hits below [2] |
| | (scroll, 2 rows   | | | (scroll)         | | | (scroll)        | | F7 [ ] score below[1] |
| |  visible)         | | +------------------+ | +-----------------+ | F8 [ ] no MSRF match  |
| +-------------------+ | 5 X-Dates            |                     | +-------------------+ |
|                       |                      |                     | | Z-Dates hidden: 39| |
|                       |                      +-- E1 CHART CONFIG --+ +-------------------+ |
|                       |                      | C1 [x] Chart Itself                        |
|                       |                      | C2 [x] Chart Dates                         |
|                       |                      | C3 [ ] New        (moon)                   |
|                       |                      | ... 8 moons, 4 eclipses                     |
+-----------------------+----------------------+---------------------+-----------------------+
+-- OUTPUT ---------------------------------------------+-- TIMELINE ------------------------+
| [Z-Dates v]  Current time [08/25/2026 14:07] [Reset]  |                        [recenter]  |
|              Up-to-date          [Recalculate]        |          ___                       |
| +---------------------------------------------------+ |        _/   \_      __             |
| |    | Z-Dates (114) | Hits | Score | MSRF | Operatio| |      _/       \_  _/  \_           |
| |----+---------------+------+-------+------+---------| | ----X1---X2---X3-----Z7---Z9------ |
| | Z14| [09/29/2027]  |[<>]4 |   3   |[204] |[O3][O11]| |     |    |    |      |    |        |
| |    |               |      |       |[ 74] |[O7]     | |    (X1) (X2) (X3)   (Z7) (Z9)     |
| | Z36| [02/06/2028]  |[/\]3 |  2.25 |[204] |[O6][O8] | |      o    o    o     <>   O        |
| +---------------------------------------------------+ |                                    |
+-------------------------------------------------------+------------------------------------+
```

**Panels.** Four top panels sized to show **two rows** by default, each independently scrollable,
each with a header cap carrying an Add / Reset / `?` cluster and a master checkbox. The header
reads `E<n> X-Dates` where `n` is the current Iso-Event's 1-based index.

**Master checkboxes.** Seven of them, one per checkable list: X-Dates, T-Dates, Filters, Chart
Config, Operations, Event-Swap targets, Event-Swap settings. A master mutates the model for
every child and lets the re-render redraw the boxes; it also shows an **indeterminate** state
when children are mixed.

**Iso-Event row.** Radio (select), name field, X-Date count, lat / long fields, resolved
timezone readout, map button, clone button, notes button, delete button. Lat / long inputs are
disabled and dimmed to `--opacity-disabled` unless `scope === HH_MM`.

**Location picker.** v12 shipped a 1 365-tile offline Leaflet pyramid (97 % of its asset
payload) purely so the picker worked air-gapped. The rewrite ships **no tiles by default**: a
two-field lat / long entry plus a lightweight inline SVG world outline for coarse clicking. An
optional tile pack is a separate download (see 10 Q9).

### 6.4 The results table

Six columns, fixed order. **Every sortable header's DOM id is its sort-type string.**

| # | Header | Content | Notes |
|---|---|---|---|
| 0 | *(spacer)* | `Z<sub>n</sub>` where `n = z_ordinal + 1` | **Chronological** label, assigned from the DATE sort *before* the display sort. Sorting by Score therefore yields `Z3, Z1, Z9…` — this is intentional and shared with the chart. |
| 1 | `Z-Dates (N)` | one date pill (`MM/DD/YYYY`); in HH:MM scope a `from:` / `to:` pair | `N = processed_z_dates.length` |
| 2 | `Hits` | hit-count glyph + integer | 2 = Gemini, 3 = Triangle, 4 = Diamond, >=5 = Circle, else nothing |
| 3 | `Score` | the score, verbatim | **No fixed decimals.** `9` renders `9`, not `9.00`. `1.5` renders `1.5`. |
| 4 | `MSRF` | one pill per resonance match, **1 per row**, `max-height` scroll box | pill label is the matched number |
| 5 | `Operations` | one pill per operation match, N per row (computed from the column width / 100 px, minus 1 in HH:MM scope, min 1) | pill label `O<sub>ord+1</sub>(X1->X2)` |

- Column 5 is omitted entirely when `hide_operations_col_completely` is on.
- Per-column hide toggles set `visibility: hidden` on the cells (v12 called the class
  `blurred_output_column` but never actually blurred — keep the behaviour, fix the name to
  `hidden_output_column`).
- **Sorting has no ascending/descending toggle.** Clicking a header sets that sort type; the
  direction is a property of the type. The active sort is shown by a pressed state on the sort
  icon **and** (new) an arrow glyph, because the pressed state alone was nearly invisible.
- Detail is delivered by **tooltips on the pills** (750 ms delay), not by row expansion:
  - operation pill: 9 rows — equation, substituted equation, type (Alpha/Beta), weight, `X<i>`,
    `Y`, `Z-Value`, `rotation_count_z`, contribution to the base score.
  - MSRF pill: 3 rows — the readable match string, the tier, and either
    `"Contributes <points> to the base score of <base>"` or, for the multiplier-bearing match,
    `"Multiplies base score of <base> by <M>"`.
- Round `base_score_pre_multiply` at the presentation layer. v12 rendered it raw, producing
  tooltips like `"…base score of 5.699999999999999"`.
- **Empty state.** When zero Z-Dates survive, render a dedicated empty panel — an icon, the
  headline *No results*, the body *No results. You probably have to loosen up a filter.*, and
  a **Loosen filters** shortcut. v12 rendered this under a header literally reading *Errors* in
  red, which was wrong: an over-tight filter is not an error.
- **Stale state.** Rows are **not** re-rendered; the container dims to opacity 0.5, the badge
  reads *Stale* in `--red`, and `Z-Dates hidden:` shows `-`.
- Row hover cross-highlights the matching chart arc, and vice versa, via a `z_date_key`
  attribute. v12 rebuilt every chart dataset on every hover because its chart library could not
  reorder datasets; the rewrite draws with raw Canvas2D and simply re-strokes the hovered arc.

### 6.5 The timeline chart

Absolute calendar time on x, arc height on y (a hidden linear scale whose units are also
milliseconds: the apex of an arc equals half the anchor→Z-Date span).

- Each operation result is a **15-point half-ellipse arc** from its anchor foot to its Z-Date
  foot. Points are generated by rotating `(xDateStart, 0)` about `(midpoint, 0)` in
  `-π/12` (15°) steps after one `+15°` pre-rotation. Index 1 sits exactly on the anchor, index 7
  at the apex, index 13 exactly on the Z-Date; indices 0 and 14 are out-of-band and stroked
  transparent purely to remove the kink.
- **Alpha ramp** per segment: `alpha = 0.075 + 0.925 * ((i-1)/12)^1.5`, so an arc fades in from
  its anchor and arrives at full opacity on its Z-Date. Highlighted arcs skip the ramp.
- Arc colour is by the landing Z-Date's `hit_count`: 1–2 black, 3 cadmium yellow `#FDDA0D`,
  4 bright blue `#0096FF`, 5+ cadmium red `#D22B2B`.
- **Draw the arcs as real curves.** v12 set `lineTension: 0.333` using a Chart.js **v2** option
  name that v4 ignores, so every arc was silently a 13-segment polyline. Decide once and
  document: the rewrite renders true ellipse arcs.
- Bounds come from an invisible four-corner padding dataset spanning
  `[firstAnchor − 1 d, furthestZDate + 1 d] × [−0.4·R, +1.05·R]`.
- **Fan-out.** Arcs whose two feet both land within 8 px of another arc's are grouped, sorted by
  x-radius ascending, and scaled by `1 + 0.15·k` so they nest visibly instead of overlapping.
  Every arc is first lifted by 15 % of its deficit against the tallest.
- **Collision spreading** for date labels and hit-count symbols: pairwise grouping plus a
  recursive DFS, up to 11 iterations, repacking each group edge-to-edge about its centre.
- Fixed-pixel furniture below the axis: date labels at +35 px (+52.5 px when no astro row),
  moon icons at +70 px, eclipse icons at +100 px.
- **Rulers.** When a pill or an arc is hovered, draw two dashed measurement callouts: an upper
  ruler spanning anchor→Z-Date at the apex height labelled with `rotation_count_z` days, and a
  lower ruler spanning the two anchors at half that height labelled with `rotation_count_y` days.
- Zoom / pan persist to `chart_x_min/max`, `chart_y_min/max`, where `0` means auto-fit.
- **The chart is a rendering of `OphisResults`, nothing more.** No library-specific data shapes
  leak into the engine. `ui/chart/scales.js` exposes `toPixel(value)` / `toValue(pixel)` and is
  the only place a charting library could ever be swapped in.

### 6.6 `SCREEN__ORACLE` (chronicon)

```
I . THE ORACLE - THE PREDICTIVE CAST
Seed it. Cast it. Read the resonance.

+-- (1) Seed two or more --+-- (2) Cast the oracle --+-- (3) Read the results ------------+

+-- ANCHOR DATES        3 active --+  +-- OPERATIONS            [reset 19] ---------------+
| Add manually, or seed from       |  | The 19-op pack is loaded.                        |
| the ledger ->                    |  | > VIEW / EDIT THE PACK          19 equations     |
| +------------------------------+ |  |   +-------------------------------------------+ |
| |1| Great Flood            |v|x| |  |   |1 | X2+oph_round(Y)               |v|x|    | |
| |  2239 BC . 05/15 . JD 903782  | |  |   |2 | X2+oph_flip(oph_round(Y))     |v|x|    | |
| |  AM 1656                      | |  |   | ... (scroll, max-height 300px)            | |
| |2| Today                  |v|x| |  |   +-------------------------------------------+ |
| |3| Phoenix 2040           |v|x| |  |   [Custom operation ................] [+ Op]   | |
| +------------------------------+ |  |   (inline red error line, min-height 14px)      | |
| - - - - - - - - - - - - - - - -  |  +--------------------------------------------------+
|  YEAR   ERA     MON DAY  LABEL   |
|  [2026] [BC|CE] [5] [15] [.....] [+ Add]
|  SEED FROM CHRONICON LEDGER  [- pick a documented event -  v]
+----------------------------------+

            SCORING LENS  [V8 . Chronology-first] [V7 . Numbers-first]

> ADVANCED . THEMED OP PACKS & SAVE / LOAD
    OP PACKS [Default 19][138 Pack][19 Metonic][Phoenix Lattice][Golden]
    CONFIG   [Save .json] [Load]

                     +--------------------------+
                     |   (o)  CAST THE ORACLE   |
                     +--------------------------+

[ALL][* NOVEL ONLY][PHOENIX][DOCUMENTED][PALINDROME][19.METONIC][ECLIPSE][FUTURE]
                                                    33 / 33 shown        [CSV]
+---------------------------------------------------------------------------------+
| SCORE | PROJECTED DATE | AM  | LC  | OPERATION | Y (ROT.) | RESONANCE            |
|-------+----------------+-----+-----+-----------+----------+----------------------|
| 12 ## | 2040 CE 05/10  |5934 |5152 | X1+oph_...| 1,562,508| (PHOENIX NODE)(DOC..)|
| 10 #. | 2040 CE 03/04  |5934 |5152 | X1+Y*360..|     5,012| (PHOENIX NODE)(DOC..)|
+---------------------------------------------------------------------------------+
```

- Score cell colour: `>= 7` -> `--red`, `>= 4` -> `--gold2`, else `--dim`.
  Bar width `score / max(5, maxScore) * 100%`.
- Sortable headers: `score | date | am | lc | op | y`. Same key flips direction; a new key
  defaults to descending for `score`, ascending otherwise.
- Result filters: `all | novel | phx | ev | pal | met | ecl | future`.
- **Add an `X1 / X2` column.** v12's browser build deduped on `ZJD|op|x1|x2` but showed no anchor
  columns, so visually identical duplicate rows appeared with no explanation. The CSV carried
  them; the table must too.
- The results table renders at most 500 rows; the counter must say
  `"showing 500 of N"` when the cap bites (v12's counter lied).
- CSV exports **all** results, ignoring the active filter and sort — make that explicit in the
  button tooltip, or (better) offer *Export view* and *Export all* (see 10 Q8).

### 6.7 `SCREEN__CONVERGENCE`

```
I.B . THE CONVERGENCE - WHERE THE OPERATIONS AGREE
A single projection is a guess. When several different operations agree, that is signal.

AGREEMENT WINDOW  [+- 30 days v]                                  3 convergences
   (Exact day | +-1 day | +-1 week | +-30 days | +-90 days | Same year)
+---------------------------------------------------------------------------------+
| STRENGTH | CONVERGED DATE | AM  | LC  | RESONANCE       | OPERATIONS THAT AGREE   |
|----------+----------------+-----+-----+-----------------+-------------------------|
|  3  ##.  | 2040 CE 05/08  |5934 |5152 | (PHOENIX NODE)  | [X1+oph_round(Y/19)*19] |
|  2 pairs |   +-8d span    |     |     | (DOCUMENTED)    | [X1+Y+19][X1+Y*360/365] |
+---------------------------------------------------------------------------------+
```

`STRENGTH` = `nOps` (distinct operations), rendered Cinzel 22 px in `--violet`. The `±<n>d span`
sub-label is **mandatory** — it is the only disclosure that clustering chains transitively.
Max 200 rows. Echoes are excluded from convergence input entirely.

### 6.8 `SCREEN__WHEELS`

A date dial plus seven cycle readouts, each a card with a name, a big value, a meta line, a
progress meter, and a corner accent glow.

```
+-- .dialbar ---------------------------------------------------------------------+
| YEAR    ERA        MON  DAY                                                     |
| [2026] [BC|CE]     [5]  [30]                                                    |
| |-----------------------------o------------------------|   range -2842 .. 2178  |
| 2843 BC   Flood 2239 BC   1 CE   2040 Phoenix   2178                            |
| [TODAY] [-> 2040] [-> 2046] [-> 2178]                                           |
+---------------------------------------------------------------------------------+

+-- PHOENIX . 138 YR --+-- NEMESIS X . 792 --+-- ANUNNAKI NER . 600 --+
| 14 yr to node     o) | 128 yr to return o) | PERIOD 20           o) |
| last 1902 . next 2040| outside Sol (732 yr)| began 1962 . ends 2562 |
| node #45 . 124 yr in | returns 2154 CE     | ten 60-yr decans       |
| ##########.          | ########..          | #.........             |
+----------------------+---------------------+------------------------+
+-- ANNUS MUNDI -------+-- MAYAN LONG-COUNT -+-- ANUNNA TURNINGS -----+
| 5920 AM              | BAKTUN 13/13        | 2,161,742 turnings     |
| Flood node AM 1656   | 1652 CE -> 2046 CE  | 6004.8 Draconian yr    |
| 80 to AM 6000        | 20 yr to 13.0.0.0.0 | 10.01 NER . 15.01 ...  |
| (no meter)           | #########.          | (no meter)             |
+----------------------+---------------------+------------------------+
+-- METONIC MOON . 19 YR = 235 MOONS --------+
| Waning Gibbous . age 18.3 d . 62% illum    |
+--------------------------------------------+
```

Accent per wheel: Phoenix `--red`, Nemesis `--violet`, NER `--green`, Annus Mundi `--gold`,
Mayan `--cyan`, Anunna `--gold2`, Moon `--moon` (`#8fb0c9`). Annus Mundi, Anunna and Moon have
**no** meter. A `COUNT CLOSED` branch is required for the final baktun so the meter never
divides by zero.

### 6.9 `SCREEN__AUDIT` (new — replaces the dead Debug screen)

The single highest-value addition. v12's audit surface (`renderDebugOutput`) was written,
commented out of the screen list, and shipped with two bugs. Build it properly.

```
AUDIT - HOW THIS Z-DATE WAS DERIVED

Y-STRUCTS                                             [ y0  y1  y2  y3 ... y9 ]
  y0 : X1 07/04/2026  ->  X2 08/20/2026     Y = 47

OPERATION RESULTS FOR y0
+-----+---------------------------+-------+--------+----------+---------+------------+
| Op  | Equation                  | Type  | Anchor | Z-Value  | rot_z   | Z-Date     |
+-----+---------------------------+-------+--------+----------+---------+------------+
| O1  | X2+oph_round(Y)           | Alpha | X2     | 47       | 47      | 10/06/2026 |
| O2  | X2+oph_flip(oph_round(Y)) | Alpha | X2     | 74       | 74 (N)  | 11/02/2026 |
| O3  | X2+Y/OPH_CRV              | Beta  | X2     | 9.25     | 9.3     | 08/29/2026 |
+-----+---------------------------+-------+--------+----------+---------+------------+

SCORE DERIVATION FOR Z14  09/29/2027
  operation matches      O3 (0.5)  +  O7 (0.5)                  = 1.00
  resonance matches      204.1 -> 204 Normal  (x1.5, 1 pt)
                          74.4 ->  74 Normal  (x1.5, 1 pt)
  multiplier M           max(1.5, 1.5)                          = 1.5
  subscore               sum(points) - points[0]  = 2 - 1       = 1.00
  base                   1.00 + 1.00                            = 2.00
  score                  round2(2.00 x 1.5)                     = 3
  hits                   2 operations + 2 resonance             = 4

DIAGNOSTICS
  CLAMPED_Z              0
  NON_FINITE_Z           0
  OUT_OF_CALENDAR_RANGE  0
  OPERATION_INVALID      0
```

Also hosts the **activity log** — the scrollable feedback channel the original author explicitly
wanted (`// TODO: Try to pipe these kinds of things to an activity log, ultimately. Toasts are
limited.`). Every warning, coercion, clamp and dropped record lands here instead of vanishing.

### 6.10 Remaining screens

**Operations editor.** Seven columns: `O<n>` label, checkbox, equation field, weight field,
validation result (`Z=<value at Y=10>` in `--green`, or `Error` in `--red` with the first message
as a tooltip), insert-above, delete. Toolbar: **Add**, **Reset to defaults**, **Load pack**.
Fixes to make: clear a stale error tooltip when an equation becomes valid; keep at least one
operation (v12 let the list be emptied); do not leave invalid text sitting in the weight field.
Weight coerces invalid or `<= 0` input to `0.5`.

**Event Settings.** Exactly two rows: `S1` *Misc. Notes* (textarea; flushes without recalculating,
because notes never affect results) and `S2` *Day Scope Event Start Time* (a time-only picker,
default `0`, clamped to 23:59). The picker runs at coordinates `0,0` (UTC) — this is deliberate;
switching it to browser-local silently breaks the round trip.

**Event Data Transfer (swap).** A three-group table: **Source Event** (exclusive radio) |
**Data** (10 checkboxes) | **Target Events** (checkboxes, master-controlled). The ten categories,
in order: Name, Scope, Location, X-Dates, Filters, T-Dates, Operations, Chart Config, Notes,
`S2` Start Time. Apply is enabled only when >=1 target **and** >=1 category are checked. The
source row's target checkbox is force-disabled and its cells dimmed. Selecting a new source
auto-promotes the old source to a target when every other event was already a target.
Fix: after applying, targets whose scope is not HH:MM get their location cleared — but do
**not** zero lat/long on the source.

**Import Events.** Header *Paste Previously Exported Code*, a textarea, a **Load** button. A
confirm dialog: *You have unsaved changes. Are you sure you want to overwrite them?* /
*NO, don't overwrite* / *YES, overwrite*. Errors render as an inline list, not a toast.

**Export Events.** Header *Paste into any Text Editor*, a read-only `<pre>` of the blob,
**Copy** and **Export File** buttons, and **Prettify** / **Minify** checkboxes. Minify shows a
warning dialog before enabling. Default filename `Export.oph`, MIME `application/json`
(v12 mislabelled it `text/csv`).

**Export Z-Dates.** Three formats.
*CSV* — 8 columns `IsoEvent, Date, Hits, Score, MSRF, Operations, ErrorStatus, ErrorMessage`;
MSRF numbers joined `", "` **descending**; operation ids `OP<2-digit ordinal+1>` **ascending**;
`"None"` for empty; RFC-4180 quoting.
*XLSX* — v12 shipped 3 columns as an admitted proof of concept. Ship the **same 8 columns as the
CSV**, a frozen bold header row, and real column widths.
*PDF* — landscape A4: page 1 title + disclaimer + glossary, page 2 the chart image, pages 3+
paired Input/Output date tables at 15 rows per page. Rebuild the pagination as a real layout
pass; v12's callback state machine drifted 40 pt per page and emitted `<table width="NaN">`.
All three export `processed_z_dates__sorted_by_date` — filters honoured, user sort discarded.
**Surface that**, or offer *Export view* vs *Export all* (10 Q8).

**Ledger.** 69 rows, 7 kind filters (`all key phx nem ner may note`), a dot per row coloured by
kind, and a **seed** button that adds the row as an anchor. Clicking a row drives the wheels.

**Method / About.** Scoring rules, the constant table, the ECHO explanation, the full MSRF
listing colour-coded by tier, the security claims (*zero external resources; everything loads
locally*), and the Archaix framing notice, verbatim:
*"a worldbuilding & study instrument after the Archaix thesis of Jason Breshears — presented as
that thesis, not as established science. Not affiliated with Archaix."*
Fix v12's literal `X points for every Operation…` (a broken substitution) to
*"Its own weight in points for every Operation that generated it."*

### 6.11 Formatting rules

| Value | Rule |
|---|---|
| Z-Date (DAYS) | `MM/DD/YYYY`, zero-padded month and day |
| Z-Date (HH:MM) | `MM/DD/YYYY HH:MM`, 24-hour, time in a `has_clock_font` span |
| Chronicon date | `<year> CE 05/10` / `<year> BC 05/10` via `fmtYear` |
| `Score` | verbatim number, no fixed decimals: `9` -> `9`, `1.5` -> `1.5`, `0.75` -> `0.75` |
| `base_score_pre_multiply` | round to 2 dp **at the presentation layer only** |
| `Y`, `rotation_count_z` | `intToDecimalString`: a non-negative integer gets `.0` appended; negatives and decimals pass through |
| Day counts | `<n> days`, or `<n> day` when exactly 1 |
| Resonance match | `<z> = <Tier>` on a strict `===`, else `<z> ~ <number> (<Tier>)` |
| Operation pill | `O<sub>ord+1</sub>(X<sub>a</sub>->X<sub>b</sub>)` |
| Row label | `Z<sub>z_ordinal+1</sub>`, `X<sub>i+1</sub>`, `E<sub>i+1</sub>`, `O<sub>i+1</sub>`, `F<sub>i+1</sub>`, `C<sub>i+1</sub>`, `S<sub>i+1</sub>` |
| Large integers | thousands separators in the chronicon `Y (ROT.)` column only |
| Filename | `name.replaceAll(" ", "_")` then `/[^A-Za-z0-9_.-]/g -> "_"`, trim leading/trailing `.` and space, cap 255. **Reject an empty result** and fall back to `export` — v12 could emit a file literally named `.csv`. |

The `getRowShortNameHtml` helper must coerce its ordinal to a **number** before adding 1. v12
did `"3" + 1` and rendered `X31`.

### 6.12 Copy deck (verbatim strings the UI depends on)

```
X-Dates are the primary type of Input data to the Ophis algorithms. At least 2 X-Dates are
  required to generate Output. Click the Add button above to get started.
T-Dates (Target Dates) are a way to only show Z-Dates for the future dates that you are
  interested in, e.g. when a team will actually play again.
Filters are used to cut down on Output noise to help bring focus to the Z-Dates that are most
  important.
Iso-Event, short for Isometric Event, is an event that has repeated itself 2 or more times in
  the past, and will likely repeat again in the future.
This screen makes it easy to apply Settings from one Iso-Event to one or more other Iso-Events.
No results. You probably have to loosen up a filter.
(Saved) / (Not Saved) / Stale / Up-to-date / Copied to clipboard! / Nothing to load!
Z-Dates hidden: <n>
WARNING: Minifying means that all settings, operations, and other configuration which match
  current program defaults will be removed from the file. If defaults ever change in a future
  version and you open your file in that version, it will use the newer defaults, which can
  result in different output. Are you sure you want to enable minifying?
    -> NO, do not enable minifying / YES, enable minifying
Are you sure you want to delete all X-Dates for this Iso-Event?
    -> NO, keep existing X-Dates / YES, delete all X-Dates
```

Column tooltips:

```
Click to sort by Z-Date, soonest to furthest. Z-Dates are future dates on which the event may
  reoccur.
Click to sort by number of Hits, highest to lowest, determined by adding number of Operations
  plus number of MSRF matches.
Click to sort by Score, highest to lowest. See About page for more info on this calculation.
Click to sort by MSRF importance, determined based on the MSRF number(s) that matched the day
  count from an X-Date to a Z-Date. Hover over each pill to display more details.
Click to sort by number of Operations, highest to lowest.
```

(The last one is **corrected**: v12 promised score-based ordering and delivered count-based.)

### 6.13 Accessibility and interaction rules

- **Never remove elements from the tab order.** v12 set `tabIndex = -1` on every button and
  checkbox at startup. Full keyboard operability is required.
- `:focus-visible { outline: 2.5px solid var(--cyan); outline-offset: 2px; border-radius: 3px }`
  on every interactive element.
- `@media (prefers-reduced-motion: reduce)` collapses every transition and animation to `0.001ms`
  and disables smooth scrolling.
- Escape closes the **entire** dialog, scrim included. v12 removed only the inner table and left
  a full-screen click-blocking overlay behind.
- Enter confirms the primary dialog action; dialogs trap focus and restore it on close.
- Toasts are `role="status"`, auto-dismiss at 2 900 ms, and are **mirrored to the activity log**
  so nothing is lost. Toasts are never the only channel for an error.
- Every icon-only control has an accessible name. Every table has a caption.
- Colour is never the only signal: tiers carry a text label as well as a hue; the active sort
  shows an arrow as well as a pressed state.
- Single layout breakpoint at 880 px; everything else is intrinsically responsive via `clamp()`,
  `auto-fit minmax()` and `flex-wrap`.

---

## 7. DESIGN SYSTEM

The reconciliation is straightforward and was already identified in spec 14 §4.10:
**`ophis.css` supplies the semantic colour contract and the component inventory; the PSYFR /
Natori system supplies the palette, the type, and the accessibility layer.** The PSYFR look wins,
as instructed. The five model→view semantic roles map onto PSYFR tokens as:

| Model role | v12 literal | PSYFR token | Rationale |
|---|---|---|---|
| `msrf_vortex` | `purple` | `--violet` | already the Nemesis/MSRF hue |
| `msrf_important` | `#b80b0b` | `--red` | already the Phoenix/138 hue |
| `msrf_normal` | `#2ede69` | `--green` | already the documented-event hue |
| `operation_alpha` | `darkgoldenrod` | `--gold` | primary accent |
| `operation_beta` | `#00c0ff` | `--cyan` | already the Metonic/19 hue |

Two extra semantic tokens are introduced because the v12 hues had no PSYFR equivalent: `--moon`
for the lunar readouts and the four `--hits-*` ramp colours for the chart arcs.

### 7.1 Ready-to-paste token block

```css
/* ============================================================
   PSYFR design tokens.  src/theme/tokens.css
   Light is the base; dark and parchment override.
   Every color has a definition on bare :root, so a viewer with
   no explicit theme and no media support still gets a full palette.
   ============================================================ */
:root {
  /* ---------- ground & surface ---------- */
  --bg:        #ece0c6;   /* page ground (aged parchment)      */
  --bg-2:      #e0d2b2;   /* toast / raised ground             */
  --panel:     rgba(255, 251, 242, .70);   /* panel + table fill        */
  --panel-2:   rgba(255, 251, 242, .92);   /* list-row fill, one step up */
  --well:      #fffdf6;   /* inset well: inputs, meter tracks  */
  --line:      rgba(90, 60, 15, .30);      /* every border and hairline */
  --scrim:     rgba(0, 0, 0, .70);         /* modal backdrop            */

  /* ---------- ink ---------- */
  --ink:       #2c2317;   /* primary text                      */
  --dim:       #6a5f45;   /* secondary / meta text             */
  --prose:     #3a3020;   /* long-form paragraph text          */
  --on-accent: #fffdf6;   /* text on a filled accent           */

  /* ---------- semantic accents ---------- */
  --gold:      #9a6f14;   /* field labels, table headers, Alpha operations */
  --gold-2:    #7d5410;   /* headings, dates, palindrome                   */
  --red:       #b32a1a;   /* Phoenix / 138 / Important MSRF / destructive   */
  --cyan:      #1d6c7d;   /* Metonic 19 / Beta operations / focus ring      */
  --green:     #4d7730;   /* documented events / NER / Normal MSRF / saved  */
  --violet:    #69479c;   /* Nemesis / Vortex MSRF / convergence strength   */
  --moon:      #4c6c86;   /* lunar readouts                                 */
  --warning:   #a35a00;   /* warnings                                       */

  /* ---------- role aliases (what components actually reference) ---------- */
  --op-alpha:        var(--gold);
  --op-beta:         var(--cyan);
  --msrf-normal:     var(--green);
  --msrf-important:  var(--red);
  --msrf-vortex:     var(--violet);

  /* ---------- chart hit-count ramp (fixed across themes) ---------- */
  --hits-low:   #1a1a1a;  /* 1-2 hits  */
  --hits-3:     #d9a800;  /* cadmium yellow */
  --hits-4:     #0096ff;  /* bright blue    */
  --hits-5plus: #d22b2b;  /* cadmium red    */
  --chart-ground: #fffdf6;
  --chart-axis:   #2c2317;

  /* ---------- typography ---------- */
  --font-display: 'Cinzel', 'Iowan Old Style', Georgia, serif;
  --font-body:    'EB Garamond', Georgia, 'Times New Roman', serif;
  --font-mono:    'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --font-clock:   var(--font-mono);        /* replaces v12's alarm_clock.ttf */

  --fs-h1:      clamp(40px, 10vw, 96px);
  --fs-h2:      clamp(24px, 4.4vw, 38px);
  --fs-h3:      12px;
  --fs-lead:    18px;
  --fs-body:    17px;
  --fs-sub:     16px;
  --fs-ui:      14px;      /* inputs, selects           */
  --fs-table:   12.5px;
  --fs-btn:     11px;
  --fs-label:   9.5px;     /* field labels              */
  --fs-th:      9px;       /* sticky table headers      */
  --fs-pill:    8.5px;     /* tag / resonance pills     */
  --fs-eyebrow: 11px;

  --ls-eyebrow: .42em;
  --ls-secno:   .32em;
  --ls-h3:      .18em;
  --ls-label:   .18em;
  --ls-th:      .14em;
  --ls-btn:     .07em;
  --ls-pill:    .05em;

  --lh-body:    1.6;
  --lh-tight:   1.05;
  --lh-display: .9;
  --measure:    76ch;      /* max prose width  */
  --measure-lead: 74ch;
  --measure-sub:  62ch;

  /* ---------- spacing (4px base) ---------- */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
  --sp-5: 20px; --sp-6: 24px; --sp-7: 32px; --sp-8: 46px;
  --gutter:      clamp(14px, 3vw, 34px);
  --section-pad: clamp(26px, 4vw, 46px);
  --header-pad:  clamp(34px, 7vw, 72px);
  --panel-pad:   16px 18px;
  --cell-pad:    8px 11px;
  --wrap-max:    1240px;
  --wrap-max-prose: 920px;

  /* ---------- radii (deliberately near-flat) ---------- */
  --r-1: 3px;   /* inputs, buttons, pills, chips   */
  --r-2: 4px;   /* rows, toggles, clock cards      */
  --r-3: 5px;   /* panels, tables, cards, toasts   */
  --r-pill: 999px;

  /* ---------- elevation: glows, not drop shadows ---------- */
  --glow-flag:  0 0 13px -2px currentColor;
  --glow-cast:  0 0 24px -4px var(--red);
  --glow-meter: 0 0 8px -1px currentColor;
  --shadow-toast: 0 8px 30px -8px rgba(0, 0, 0, .45);

  /* ---------- state ---------- */
  --opacity-disabled: .5;
  --opacity-enabled:  1;
  --dur-fast: .12s;
  --dur:      .15s;
  --dur-slow: .3s;
  --ease:     cubic-bezier(.2, .6, .3, 1);

  /* ---------- layers ---------- */
  --z-nav: 60;  --z-dialog: 100;  --z-map: 100;  --z-toast: 10000;

  --zoom: 1;
  --grid-alpha: rgba(90, 60, 15, .03);
  --glow-warm:  rgba(179, 42, 26, .07);
  --glow-cool:  rgba(29, 108, 125, .06);
}

/* ---------- DARK (system default) ---------- */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]):not([data-theme="parchment"]) {
    --bg: #07070c;  --bg-2: #0d0d18;
    --panel: rgba(20, 20, 32, .55);  --panel-2: rgba(20, 20, 32, .75);
    --well: #05050a;  --line: rgba(216, 169, 67, .20);
    --ink: #ece5d2;  --dim: #9c947c;  --prose: #ddd6c4;  --on-accent: #100c02;
    --gold: #d8a943;  --gold-2: #f3d27a;
    --red: #d3402f;  --cyan: #54b8c9;  --green: #7faa5a;  --violet: #9b7fd0;
    --moon: #8fb0c9;  --warning: #e0913a;
    --chart-ground: #0d0d18;  --chart-axis: #ece5d2;  --hits-low: #ece5d2;
    --grid-alpha: rgba(216, 169, 67, .022);
    --glow-warm: rgba(211, 64, 47, .10);  --glow-cool: rgba(84, 184, 201, .07);
    --shadow-toast: 0 8px 30px -8px #000;
  }
}

/* ---------- DARK (explicit) ---------- */
:root[data-theme="dark"] {
  --bg: #07070c;  --bg-2: #0d0d18;
  --panel: rgba(20, 20, 32, .55);  --panel-2: rgba(20, 20, 32, .75);
  --well: #05050a;  --line: rgba(216, 169, 67, .20);
  --ink: #ece5d2;  --dim: #9c947c;  --prose: #ddd6c4;  --on-accent: #100c02;
  --gold: #d8a943;  --gold-2: #f3d27a;
  --red: #d3402f;  --cyan: #54b8c9;  --green: #7faa5a;  --violet: #9b7fd0;
  --moon: #8fb0c9;  --warning: #e0913a;
  --chart-ground: #0d0d18;  --chart-axis: #ece5d2;  --hits-low: #ece5d2;
  --grid-alpha: rgba(216, 169, 67, .022);
  --glow-warm: rgba(211, 64, 47, .10);  --glow-cool: rgba(84, 184, 201, .07);
  --shadow-toast: 0 8px 30px -8px #000;
}

/* ---------- LIGHT / PARCHMENT (explicit) ---------- */
:root[data-theme="light"], :root[data-theme="parchment"] { /* base :root values apply */ }

/* ---------- the signature ground ---------- */
body {
  zoom: var(--zoom, 1);
  min-height: 100vh;
  color: var(--ink);
  font-family: var(--font-body);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  background:
    radial-gradient(1100px 560px at 84%  -8%, var(--glow-warm), transparent 60%),
    radial-gradient( 900px 480px at  6% 108%, var(--glow-cool), transparent 60%),
    repeating-linear-gradient( 0deg, var(--grid-alpha) 0 1px, transparent 1px 46px),
    repeating-linear-gradient(90deg, var(--grid-alpha) 0 1px, transparent 1px 46px),
    var(--bg);
}

h1 {
  font-family: var(--font-display); font-weight: 800;
  font-size: var(--fs-h1); line-height: var(--lh-display); letter-spacing: .02em;
  background: linear-gradient(180deg, var(--on-accent), var(--gold-2) 50%, var(--gold));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
h2 { font-family: var(--font-display); font-weight: 600;
     font-size: var(--fs-h2); line-height: var(--lh-tight); color: var(--gold-2); }

:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2.5px solid var(--cyan); outline-offset: 2px; border-radius: var(--r-1);
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    transition-duration: .001ms !important;
    animation-duration:  .001ms !important;
  }
}
```

### 7.2 Component rules

- **Resonance / operation pill.** `display:inline-block; min-width:85px; height:25px;
  border-radius:var(--r-1); border:2px solid <role token>; background:var(--panel-2);
  font:var(--fs-pill)/1 var(--font-mono); letter-spacing:var(--ls-pill); text-transform:uppercase`.
  Hover and chart-linked hover both add `outline:3px solid var(--red)`. The role token comes from
  a `data-tier` / `data-op-type` **attribute**, not a class — preserving v12's attribute contract
  (`operation_type="alpha"|"beta"`, `msrf_type="msrf_normal"|"msrf_important"|"msrf_vortex"`).
- **Panel.** `background:var(--panel); border:1px solid var(--line); border-radius:var(--r-3);
  padding:var(--panel-pad)`. The header cap uses `--panel-2` and only the top two radii.
- **Table.** `font:var(--fs-table) var(--font-mono)`; `th` is sticky, uppercase, `--gold`,
  `--fs-th`, `--ls-th`; cells `--cell-pad`; row hover `background:var(--panel-2)`.
- **Buttons.** `font:var(--fs-btn) var(--font-mono); letter-spacing:var(--ls-btn);
  text-transform:uppercase; border:1px solid var(--line); border-radius:var(--r-1)`. The primary
  *Cast* / *Recalculate* button is Cinzel 15 px with `--glow-cast` on hover.
- **Meters.** `border-radius:var(--r-pill)`, track `--well`, fill a gradient in the wheel's
  accent, `--glow-meter`.
- **Motion.** Transitions only — no keyframes. `--dur` for interactive states, `--dur-slow` for
  the toast transform.
- **Wide content** (tables, the chart, code blocks) scrolls inside its own `overflow-x:auto`
  container. The page body never scrolls horizontally.

### 7.3 Easter eggs to preserve

Two numeric jokes in `ophis.css` are exact domain references and would be lost to a routine
cleanup. Keep them, with a comment:

- `z-index: 1656` on the dialog and map wrappers — **1656** is the Annus Mundi year of the Great
  Flood *and* a member of `MSRF_FILTER__IMPORTANT`.
- `min-width: 552px; min-height: 552px` on the notes popup — **552 = 138 x 4**, the Chronicon
  "Phoenix cycles" number *and* a member of `MSRF_FILTER__NORMAL`.

### 7.4 Assets

- **Keep and re-cut:** the 12 astro-indicator glyphs (8 moon phases, 4 eclipse types) and the
  4 hit-count symbols (gemini / triangle / diamond / circle). Ship them as **inline SVG sprites**,
  not PNGs — they are the only genuinely bespoke artwork and they must recolour with the theme.
- **Drop:** both header PNGs (replaced by type), the 1 365-tile offline map pyramid (opt-in pack),
  `alarm_clock.ttf` (replaced by `--font-mono` tabular figures), and every unreferenced asset
  (`fire.png`, `score_icon.png`, `sunset.jpg`, the `*_orig.png` files).
- **Fonts:** Cinzel, EB Garamond, IBM Plex Mono. Self-host the WOFF2 subsets — the Google Fonts
  link in the PSYFR build is the app's **only** external request, and "zero external resources"
  is a stated product promise. Every stack has a real system fallback.

---

## 8. PARITY TEST PLAN

Every expected value below was **executed**, not inferred.

**The generator that produced them ships with this spec**, at
`docs/reverse/fixtures/generate-golden.mjs` (plus `verify-chronicon-jdn.mjs`), together with its
verified output (`golden-test-bradley.txt`, `golden-chronicon-jdn.txt`). It is a standalone,
dependency-free Node re-implementation of the DAYS-scope engine — run it with
`node generate-golden.mjs` to reproduce every number in this section. Port it to
`test/fixtures/generate-golden.mjs` in the new repo, emit JSON, and commit the output so the
suite asserts against a committed file: a drift is then a failing test rather than a silent
regeneration.

**Determinism rule.** The engine takes `ctx.now` as an argument. Every test pins it. Any test
that reads the wall clock is a broken test.

### 8.1 Group A — numeric primitives

| # | Input | Expected |
|---|---|---|
| A1 | `roundToPrecision(1.005, 2)` | `1.01` |
| A2 | `roundToPrecision(2.675, 2)` | `2.68` |
| A3 | `roundToPrecision(1.25, 1)` | `1.3` |
| A4 | `roundToPrecision(1.35, 1)` | `1.4` |
| A5 | `roundToPrecision(0.05, 1)` | `0.1` |
| A6 | `roundToPrecision(-1.25, 1)` | `-1.2` **(wrong, and deliberate)** |
| A7 | `roundToPrecision(-1.005, 2)` | `-1` **(wrong, and deliberate)** |
| A8 | `roundToPrecision(-0.05, 1)` | `-0` — and `String(-0) === "0"`, which matters for the `.5` test |
| A9 | `Math.round(2.5)` / `Math.round(-2.5)` | `3` / `-2` (half-up toward +inf) |

### 8.2 Group B — Y computation (executed)

`test-bradley.oph`, DAYS scope, GMT-locked. Anchor epoch millis (UTC midnight):

| Anchor | Date | Epoch ms |
|---|---|---|
| X1 | 07/04/2026 | `1783123200000` |
| X2 | 08/20/2026 | `1787184000000` |
| X3 | 03/09/2027 | `1804550400000` |
| X4 | 03/16/2027 | `1805155200000` |
| X5 | 07/17/2027 | `1815782400000` |

All 10 pairs, **in exact emission order** — this order is itself an assertion:

| `y_ordinal` | `x_1_ordinal` | `x_2_ordinal` | From | To | **Y** |
|---|---|---|---|---|---|
| 0 | 0 | 1 | 07/04/2026 | 08/20/2026 | **47** |
| 1 | 0 | 2 | 07/04/2026 | 03/09/2027 | **248** |
| 2 | 1 | 2 | 08/20/2026 | 03/09/2027 | **201** |
| 3 | 0 | 3 | 07/04/2026 | 03/16/2027 | **255** |
| 4 | 1 | 3 | 08/20/2026 | 03/16/2027 | **208** |
| 5 | 2 | 3 | 03/09/2027 | 03/16/2027 | **7** |
| 6 | 0 | 4 | 07/04/2026 | 07/17/2027 | **378** |
| 7 | 1 | 4 | 08/20/2026 | 07/17/2027 | **331** |
| 8 | 2 | 4 | 03/09/2027 | 07/17/2027 | **130** |
| 9 | 3 | 4 | 03/16/2027 | 07/17/2027 | **123** |

Assertions: exactly `C(5,2) = 10` y-structs; the outer loop is the **later** anchor
(`(0,1),(0,2),(1,2),(0,3),…`); Y is **exclusive** (07/04 → 08/20 is `47`, not 48); disabling X3
must leave `x_1_ordinal` / `x_2_ordinal` for the surviving pairs unchanged.

Chronicon Y (executed): `jdn(-2238,5,15) = 903782`, `jdn(2026,8,25) = 2461278`,
`jdn(2040,5,15) = 2466290`; spans `1557496`, `1562508`, `5012`.

### 8.3 Group C — each operation's Z output for a known Y

`Y = 47`, pair `(X1 = 07/04/2026, X2 = 08/20/2026)`. Executed.

| Op | Equation | w | raw Z (full precision) | `z_value` (2 dp) | `rotation_count_z` (1 dp) | Resonance | Z-Date |
|---|---|---|---|---|---|---|---|
| O1 | `X2+oph_round(Y)` | 1 | `47` | `47` | `47` | — | 10/06/2026 |
| O2 | `X2+oph_flip(oph_round(Y))` | 1 | `74` | `74` | `74` | **Normal 74** | 11/02/2026 |
| O3 | `X2+Y/OPH_CRV` | 0.5 | `9.251968503937007` | `9.25` | `9.3` | — | 08/29/2026 |
| O4 | `X1+(Y/2.0)xOPH_PI` | 0.5 | `73.79` | `73.79` | `73.8` | **Normal 74** | 09/15/2026 |
| O5 | `X2+Y/OPH_PHI` | 1 | `29.048207663782446` | `29.05` | `29.1` | — | 09/18/2026 |
| O6 | `X2+(Y/2.0)xOPH_PHI` | 1 | `38.023` | `38.02` | `38` | — | 09/27/2026 |
| O7 | `X1+(Y/2.0)xOPH_CRV` | 0.5 | `119.38` | `119.38` | `119.4` | **Normal 119** | 10/31/2026 |
| O8 | `X2+(Y/2.0)xOPH_PI` | 0.5 | `73.79` | `73.79` | `73.8` | **Normal 74** | 11/01/2026 |
| O9 | `X2+YxOPH_PHI` | 1 | `76.046` | `76.05` | `76.1` | **Normal 76** | 11/04/2026 |
| O10 | `X1+YxOPH_PI` | 1 | `147.58` | `147.58` | `147.6` | — | 11/28/2026 |
| O11 | `X2+(Y/2.0)xOPH_CRV` | 0.5 | `119.38` | `119.38` | `119.4` | **Normal 119** | 12/17/2026 |
| O12 | `X2+YxOPH_PI` | 0.5 | `147.58` | `147.58` | `147.6` | — | 01/14/2027 |
| O13 | `X1+YxOPH_CRV` | 0.5 | `238.76` | `238.76` | `238.8` | — | 02/27/2027 |
| O14 | `X2+YxOPH_CRV` | 0.5 | `238.76` | `238.76` | `238.8` | — | 04/15/2027 |
| O15 | `X1+YxOPH_HEP` | 1 | `329.46999999999997` | `329.47` | `329.5` | — | 05/29/2027 |
| O16 | `X2+YxOPH_HEP` | 1 | `329.47` (same) | `329.47` | `329.5` | — | 07/15/2027 |

Three things this table pins down:

- **O6** — `38.023 → round2 → 38.02 → round1 → 38`. Single-rounding `38.023` also gives `38`,
  but O15/O16 show the chain that matters: `329.46999999999997 → 329.47 → 329.5`, which the
  `.5` dead-zone then kills. A single 1-dp round would give `329.5` too, but any *different*
  rounding order will not.
- **O4 vs O8** — identical Z-Values from different anchors land on **different** Z-Dates
  (09/15/2026 vs 11/01/2026). The anchor prefix is load-bearing.
- **O9** — `76.1` is **Normal 76**, not Vortex `76.2`: `|76.2 − 76.1| = 0.10000000000000853 > 0.1`.
  This is the floating-point asymmetry of C6 in action, inside a real fixture.

### 8.4 Group D — `oph_flip` (executed)

| Input | `ophis` | `chronicon` | | Input | `ophis` | `chronicon` |
|---|---|---|---|---|---|---|
| `123` | `321` | `321` | | `12.5` | `52.1` | `52.1` |
| `7` | `7` | `7` | | `120.5` | `502.1` | `502.1` |
| `0` | `0` | `0` | | `10.25` | `52.01` | `52.01` |
| `100` | `1` | `1` | | `0.5` | `5` | `5` |
| `1000` | `1` | `1` | | `0.1` | `1` | `1` |
| `120` | `21` | `21` | | `3.14` | `4.13` | `4.13` |
| `46` | `64` | `64` | | `47` | `74` | `74` |
| `10` | `1` | `1` | | `1e21` | `NaN` | `0` |
| `-12` | `NaN` | `0` | | `-35` | `NaN` | `0` |

`oph_round(2.5) === 3`, `oph_round(-2.5) === -2`. Chronicon `oph_sqrt(-4) === 2`.

### 8.5 Group E — MSRF classification (executed)

| Probe | Expected | Why |
|---|---|---|
| `12.5` | `null` | `.5` dead zone. **This is a shipped v12 unit test.** |
| `12.4` | Normal `12`, 1 pt, x1.5 | `round(12.4) = 12`. **Shipped v12 unit test.** |
| `21.6` | **Vortex `21.7`**, 2 pts, x2.0 | vortex window includes probe−0.1 |
| `21.7` | Vortex `21.7` | exact |
| `21.8` | `null` | vortex delta > 0.1; `round(21.8) = 22`, in no set |
| `21.4` | Normal `21` | vortex fails; `round(21.4) = 21` |
| `21.0` | Normal `21` | |
| `76.1` | **Normal `76`** | vortex −0.1 side fails for `76.2`; `round(76.1) = 76` |
| `76.2` | Vortex `76.2` | exact |
| `76.3` | **Vortex `76.2`** | vortex +0.1 side wins and *steals* what would be Normal `76` |
| `76.4` | Normal `76` | |
| `43.5` | **Vortex `43.5`** | vortex runs **before** the `.5` rejection |
| `32.5` | `null` | not within 0.1 of `32.6`; `.5` rejected |
| `32.6` | Vortex `32.6` | |
| `217.9` | **Vortex `217.8`** | steals from Normal `218` |
| `83.6` | Important `84`, 2 pts, x2.0 | `round(83.6) = 84` |
| `83.5` | `null` | `.5` dead zone |
| `84` | Important `84` | |
| `36500` | `null` | the clamp value is in **no** set — every clamped result is a no-match |
| `0` | `null` | |
| `2559` | Normal `2559` | `HIGHEST_MSRF_NUMBER` |
| `1574` | Normal `1574` | the out-of-order entry still matches (linear scan) |
| `19` | `null` | **19 is in NO Ophis MSRF set.** The Metonic gear is chronicon-only. |
| `235` | `null` | ditto |

**Exhaustive vortex window** (every 1-dp probe within ±0.3, executed):

```
21.7  -> matches 21.6, 21.7           326.7 -> matches 326.6, 326.7
32.6  -> matches 32.6                 435.6 -> matches 435.6, 435.7
43.5  -> matches 43.5                 653.4 -> matches 653.4
65.3  -> matches 65.2, 65.3           762.3 -> matches 762.2, 762.3
76.2  -> matches 76.2, 76.3           871.2 -> matches 871.2, 871.3
87.1  -> matches 87.0, 87.1           217.8 -> matches 217.8, 217.9
```

3 numbers match only themselves; 5 also match probe−0.1; 4 also match probe+0.1; **never both.**
Any epsilon "fix" widens 9 of 12 windows and changes scores.

### 8.6 Group F — scoring

| # | Operation hits | Resonance | M | subscore | base | **score** | hits |
|---|---|---|---|---|---|---|---|
| F1 | 1 alpha (1.0) | — | 1.0 | 0 | 1.0 | `1` | 1 |
| F2 | 1 beta (0.5) | — | 1.0 | 0 | 0.5 | `0.5` | 1 |
| F3 | 1 alpha | 1x Normal | 1.5 | 0 | 1.0 | `1.5` | 2 |
| F4 | 1 alpha | 2x Normal | 1.5 | 1 | 2.0 | `3` | 3 |
| F5 | 1 alpha | 1x Important | 2.0 | 0 | 1.0 | `2` | 2 |
| F6 | 1 alpha | Important + Normal | 2.0 | 1 | 2.0 | `4` | 3 |
| F7 | 1 alpha | Vortex + Important | 2.0 | 2 | 3.0 | `6` | 3 |
| F8 | 2 alpha + 3 beta (3.5) | 1x Normal | 1.5 | 0 | 3.5 | `5.25` | 6 |
| F9 | 2 beta (1.0) | 2x Normal | 1.5 | 1 | 2.0 | `3` | 4 |
| F10 | *(LTE_V7)* 1 alpha + 2 beta (2.0) | Important + Normal | — | 3 | 5.0 | `5` | 5 |

F10 pins the legacy system: additive, **no** multiplier, all points counted.

### 8.7 Group G — data self-checks (the shipped v12 startup tests, promoted to CI)

| # | Assertion | Verified |
|---|---|---|
| G1 | `MSRF_NORMAL.length === 325` | yes |
| G2 | `MSRF_IMPORTANT.length === 53` | yes |
| G3 | `MSRF_VORTEX.length === 12` | yes |
| G4 | `FINAL.length === 390` | yes |
| G5 | `NORMAL` has zero duplicates | yes |
| G6 | `NORMAL ∩ IMPORTANT === {}` | yes |
| G7 | `NORMAL.indexOf(1574) === 248`, neighbours `1641` and `1680`; **exactly one** inversion | yes |
| G8 | Every one of the **390** numbers round-trips through `getMsrfMatch` to **its own tier** | **PASS** |
| G9 | `FINAL` is ascending; building it must not re-order the three tier arrays | yes |
| G10 | The chronicon 87-set: `size === 87`; exactly two members (`19`, `1138`) are absent from the Ophis 378-union; `1138` carries `suspect: true` | yes |
| G11 | `MSRF_87` contains no member of `MSRF_VORTEX` | yes |
| G12 | The chronicon ledger has exactly 69 rows; all 24 `phx` rows satisfy `mod(year,138) === 108`; no duplicate years | per spec 13 |

G8 is the load-bearing one: it is what proves no newly added resonance number shadows a vortex
window or collides across tiers. It must run in CI, not at app startup.

### 8.8 Group H — end-to-end, `test-bradley.oph`

**Fixture.** `test-bradley.oph` verbatim: 1 Iso-Event, 5 anchors (all enabled), 16 operations
(all enabled), `EVENT_SCOPE__DAYS`, `SCORING_SYSTEM__GTE_V8`, `z_date_sort_type =
SORT_TYPE__MSRF`, filters at their defaults (before-last-X **on**, on-last-X **on**,
before-current **on**, on-current **off**, beyond-max-days **on** at 2559, min-hit-count off,
min-score off, msrf-match off), `t_dates: []`.

**Pinned clock.** `ctx.now = Date.UTC(2026, 7, 25)` = `1787616000000` (2026-08-25T00:00:00Z).
Because `now < lastX` (07/17/2027), the *before current date* filter is entirely subsumed by
*before last X-Date*, so this fixture is stable for any `now` earlier than 07/17/2027.

**Volume assertions (executed):**

| Quantity | Expected |
|---|---|
| y-structs | **10** |
| operation results | **160** (10 pairs x 16 operations) |
| distinct Z-Dates before filtering | **153** |
| Z-Dates surviving the filters | **114** |
| `Z-Dates hidden` counter | **39** |
| highest score | **3** |
| max hit count | **4** |

**The complete date-sorted list is committed as `golden-test-bradley.json`.** The suite asserts
the full 114-row array. Head and tail, with every scoring field, for eyeball verification:

| Z# | key (epoch ms) | Date | hits | score | opScore | M | base | resonance |
|---|---|---|---|---|---|---|---|---|
| Z1 | `1816214400000` | 07/22/2027 | 2 | `1.5` | 1 | 1.5 | 1 | 128.6 -> 129 (N) |
| Z2 | `1816732800000` | 07/28/2027 | 1 | `0.5` | 0.5 | 1 | 0.5 | — |
| Z3 | `1817683200000` | 08/08/2027 | 1 | `0.5` | 0.5 | 1 | 0.5 | — |
| Z4 | `1817769600000` | 08/09/2027 | 2 | `2` | 1 | 2.0 | 1 | 153.3 -> 153 (I) |
| Z5 | `1817856000000` | 08/10/2027 | 2 | `0.75` | 0.5 | 1.5 | 0.5 | 24.2 -> 24 (N) |
| Z10 | `1819670400000` | 08/31/2027 | 2 | `1.5` | 1 | 1.5 | 1 | 168.3 -> 168 (N) |
| Z11 | `1821398400000` | 09/20/2027 | 2 | `1` | 0.5 | 2.0 | 0.5 | **65.2 -> 65.3 (VORTEX)** |
| **Z14** | `1822176000000` | **09/29/2027** | **4** | **`3`** | 1 | 1.5 | 2 | 204.1 -> 204 (N), 74.4 -> 74 (N) |
| Z15 | `1822348800000` | 10/01/2027 | 2 | `1.5` | 1 | 1.5 | 1 | 76 -> 76 (N) |
| Z24 | `1827187200000` | 11/26/2027 | 2 | `1.5` | 1 | 1.5 | 1 | 255 -> 255 (N) |
| Z35 | `1833321600000` | 02/05/2028 | 2 | `1` | 0.5 | 2.0 | 0.5 | **326.6 -> 326.7 (VORTEX)** |
| **Z36** | `1833408000000` | **02/06/2028** | **3** | **`2.25`** | 1.5 | 1.5 | 1.5 | 204.1 -> 204 (N) |
| Z37 | `1833926400000` | 02/12/2028 | 2 | `2` | 1 | 2.0 | 1 | 210.3 -> 210 (I) |
| Z51 | `1842134400000` | 05/17/2028 | 2 | `2` | 1 | 2.0 | 1 | 305.8 -> 306 (I) |
| Z57 | `1848441600000` | 07/29/2028 | 2 | `2` | 1 | 2.0 | 1 | 378 -> 378 (I) |
| Z64 | `1852848000000` | 09/18/2028 | 2 | `1.5` | 1 | 1.5 | 1 | 552 -> 552 (N) |
| Z70 | `1861574400000` | 12/28/2028 | 3 | `1.5` | 1 | 1.5 | 1 | 660.4 -> 660 (N) |
| Z74 | `1868572800000` | 03/19/2029 | 2 | `2` | 1 | 2.0 | 1 | 611.6 -> 612 (I) |
| Z90 | `1891900800000` | 12/14/2029 | 2 | `1` | 0.5 | 2.0 | 0.5 | 1259.8 -> 1260 (I) |
| Z107 | `1949011200000` | 10/06/2031 | 2 | `0.75` | 0.5 | 1.5 | 0.5 | 1920.2 -> 1920 (N) |
| Z111 | `1981670400000` | 10/18/2032 | 2 | `0.75` | 0.5 | 1.5 | 0.5 | 1920.2 -> 1920 (N) |
| Z113 | `2011996800000` | 10/04/2033 | 1 | `1` | 1 | 1 | 1 | — |
| Z114 | `2016230400000` | 11/22/2033 | 1 | `1` | 1 | 1 | 1 | — |

**Worked check on Z14 (09/29/2027)** — the highest-scoring row, and the one that exercises every
branch:

```
operation matches   : 2 (both weight 0.5)          -> operation_score        = 1.0
resonance matches   : 204.1 -> Normal 204  (1 pt, x1.5)
                       74.4 -> Normal  74  (1 pt, x1.5)
multiplier M        : max(1.5, 1.5)                -> 1.5
subscore            : sum(points) - points[0] = 2 - 1 = 1.0
base                : 1.0 + 1.0                    = 2.0   (base_score_pre_multiply)
score               : round2(2.0 x 1.5)            = 3
hit_count           : 2 operations + 2 resonance   = 4      -> Diamond glyph
```

**`processed_z_dates` under `SORT_TYPE__MSRF`** (the sort saved in the file). Under GTE_V8 the
subscore excludes the strongest match, so almost every row has `resonance_subscore = 0` and the
order collapses onto `resonance_number_sum` descending, then date ascending. Top 12, executed:

| # | Z# | Date | score | hits | subscore | number sum |
|---|---|---|---|---|---|---|
| 1 | Z14 | 09/29/2027 | 3 | 4 | **1** | 278 |
| 2 | Z107 | 10/06/2031 | 0.75 | 2 | 0 | 1920 |
| 3 | Z111 | 10/18/2032 | 0.75 | 2 | 0 | 1920 |
| 4 | Z90 | 12/14/2029 | 1 | 2 | 0 | 1260 |
| 5 | Z99 | 08/19/2030 | 1 | 2 | 0 | 1260 |
| 6 | Z72 | 02/18/2029 | 0.75 | 2 | 0 | 960 |
| 7 | Z95 | 03/03/2030 | 0.75 | 2 | 0 | 960 |
| 8 | Z63 | 09/11/2028 | 1.5 | 2 | 0 | 801 |
| 9 | Z78 | 05/24/2029 | 0.75 | 2 | 0 | 801 |
| 10 | Z70 | 12/28/2028 | 1.5 | 3 | 0 | 660 |
| 11 | Z77 | 05/07/2029 | 0.75 | 2 | 0 | 660 |
| 12 | Z45 | 04/11/2028 | 1 | 2 | 0 | 648 |

This is a **finding, not just a fixture**: sorting by MSRF places a 0.75-score row above a
1.5-score row, because the primary key is the subscore (which the multiplier model empties) and
the tie-break is the raw magnitude of the matched numbers. Document it in the column tooltip.

**Top by SCORE**, for reference: `09/29/2027 (3)`, `02/06/2028 (2.25)`, then five rows at `2`
(`08/09/2027`, `02/12/2028`, `05/17/2028`, `07/29/2028`, `03/19/2029`), then `12/28/2028 (1.5, 3 hits)`.

**Ordinal check.** `z_ordinal` is assigned from the **date** sort. Under `SORT_TYPE__MSRF` the
first row is labelled `Z14`, not `Z1`. That is correct and must not be "fixed".

### 8.9 Group I — end-to-end, chronicon reckoning

Fixture from spec 15 §12, reproduced live. Anchors **in list order** (list order fixes X1/X2
binding; the array is kept JD-sorted):

| # | Label | Date | astro year | JD |
|---|---|---|---|---|
| 1 | Great Flood | 2239 BC · 05/15 | −2238 | **903782** |
| 2 | Today | 2026 CE · 08/25 | 2026 | **2461278** |
| 3 | Phoenix 2040 | 2040 CE · 05/15 | 2040 | **2466290** |

Pack `chronicon-default-19`, lens **V8**, all enabled. `ctx.now` pinned so `TODAY.y = 2026`.

Expected: **33 results** from 57 candidates (3 pairs × 19 ops); **24 silently dropped** by the
`year < −5400 || > 4000` guard — the rewrite must **report** that 24, not hide it. One
convergence at exact-day tolerance: centre **2048 CE 11/07**, 2 operations, 1 pair, best score 1,
tag NEMESIS.

Verified derived values: `AM(2026) = 5920`, `LC(2026) = 5138`, `cataclysm = 7264`,
`mod(2040, 138) === 108` (2040 **is** a Phoenix node).

Top of the ranked cast (score DESC, then JD ASC):

| Score | Z-Date | JD | AM | LC | Y | Operation | Tags |
|---|---|---|---|---|---|---|---|
| 12 | 2040 CE 5/10 | 2466285 | 5934 | 5152 | 1562508 | `X1+oph_round(Y/19)*19` | PHOENIX NODE · DOCUMENTED · ☉ SOLAR partial |
| 10 | 2040 CE 3/4 | 2466218 | 5934 | 5152 | 5012 | `X1+Y*360/365.2422` | PHOENIX NODE · DOCUMENTED |
| 10 | 2040 CE 5/19 | 2466294 | 5934 | 5152 | 5012 | `X1+oph_round(Y/19)*19` | PHOENIX NODE · DOCUMENTED |
| 10 | 2040 CE 6/3 | 2466309 | 5934 | 5152 | 1562508 | `X1+Y+19` | PHOENIX NODE · DOCUMENTED |
| 10 | 2040 CE 6/3 | 2466309 | 5934 | 5152 | 5012 | `X1+Y+19` | PHOENIX NODE · DOCUMENTED |
| 7 | 2046 CE 2/18 | 2468395 | 5940 | 5158 | 5012 | `X2+oph_flip(oph_round(Y))` | DOCUMENTED · NEMESIS · BAKTUN |
| 7 | 2046 CE 3/9 | 2468414 | 5940 | 5158 | 5012 | `X2+oph_flip(Y)+19` | DOCUMENTED · NEMESIS · BAKTUN |
| 5 | 2026 CE 8/16 | 2461269 | 5920 | 5138 | 1557496 | `X1+oph_round(Y/19)*19` | METONIC·19 · 138 · ☾ LUNAR partial |
| 4 | 2026 CE 9/13 | 2461297 | 5920 | 5138 | 1557496 | `X1+Y+19` | METONIC·19 · 138 |
| 4 | 2045 CE 8/11 | 2468204 | 5939 | 5157 | 5012 | `X2+oph_round(Y/OPH_PHI/OPH_PHI)` | METONIC·19 · ☉ SOLAR total |
| 4 | 2882 CE 6/30 | 2773870 | 6776 | 5994 | 1562508 | `X2+Y/OPH_CRV` | PALINDROME ⮌ · NEMESIS |
| 3 | 2866 CE 1/27 | 2767872 | 6760 | 5978 | 1557496 | `X2+Y/OPH_CRV` | ≈PHOENIX · NEMESIS |

Rows 4 and 5 are the **same Z-Date from the same operation via different anchor pairs**
(`Y = 1562508` vs `Y = 5012`) — proof that the dedup key includes the pair, and precisely why the
results table needs its `X1 / X2` columns (§6.6).

Three of these I re-derived independently from the JDN math:
`X1+oph_round(Y/19)*19` at `Y = 1562508` → offset `1562503` → JD `2466285` → 2040-05-10 ✓;
at `Y = 5012` → offset `5016` → JD `2466294` → 2040-05-19 ✓;
`X1+Y*360/365.2422` at `Y = 5012` → offset `4940.064…` → JD `2466218` → 2040-03-04 ✓.

**Caveat carried forward from spec 13:** the PSYFR Field Guide's worked examples do **not** all
reproduce (Ex① strength-4 convergence is actually strength-3; the "15 May 2040 total lunar
eclipse, score 11" row does not exist). Those examples were computed against a different
`TODAY`. The Field Guide must be regenerated from the fixture, not copied.

### 8.10 Group J — persistence round-trips

| # | Assertion |
|---|---|
| J1 | `parse(serialise(doc)) deep-equals doc` for all three sample files. |
| J2 | `test-file-bradley-rogue-dates.oph` (v9, 2 events, 15 operations, unpadded `"0:00"`, event 2 partially serialised) loads without error in `loose` mode and gains `notes:""`, `t_dates:[]`, `day_scope_start_time_in_millis:0`; its **15** operations are **not** upgraded to 16. |
| J3 | `7-4-26-….oph` (omits `z_date_sort_type`) loads and defaults to `SORT_TYPE__DATE`. |
| J4 | A bare top-level `IsoEvent[]` loads; `app_version` defaults to the current version. |
| J5 | A file with `z_date_sort_type: "SORT_TYPE__FOO"` is **rejected** in strict mode and **coerced with a warning** in loose mode. v12 produced a constant comparator and a garbage order. |
| J6 | `serialise` never inserts a space after commas inside string values. `notes: "a, b"` survives 100 save/load cycles byte-identical. |
| J7 | Minify of a default event drops `operations`; reloading re-injects the 16-op default. `notes` **survives** minify (v12's copy-paste bug deleted it). |
| J8 | An `.oph` containing `equation: "X1+globalThis.process.exit(1)"` loads with that operation **flagged invalid** and **never evaluated**; nothing is executed. Repeat for `X1+(function(){})()`, `X1+eval('1')`, `X1+[].constructor`, `` X1+`${1}` ``, `X1+1;alert(1);//`, `X1+require('fs')`, `X1+this.constructor`, `X1+Y.toString()`, `X1+1/*c*/+1`. **All ten must be rejected at lex or parse time.** |
| J9 | `X1+0x41` is **rejected** (hex is not in the grammar). v12's browser build silently rewrote it to `0*41 = 0`. |
| J10 | `X1+1e3` is rejected (no exponent notation). `X1+.5` is accepted and yields `0.5`. |
| J11 | Legacy localStorage keys `save_blob`, `ophion-theme`, `ophion-zoom`, `ophion-mode` are read once and migrated to the `psyfr:*` namespace. |

### 8.11 Group K — filters and sorts

| # | Assertion |
|---|---|
| K1 | On the Group-H fixture, turning **on** `min_hit_count` at 2 reduces 114 rows to exactly the rows with `hit_count >= 2`. |
| K2 | Turning **on** `msrf_match` keeps only rows with `resonance_matches.length > 0`. |
| K3 | Adding an enabled T-Date on `10/01/2027` reduces the output to exactly **1** row (Z15). Zero enabled T-Dates leaves the gate inert. |
| K4 | Setting `beyond_max_days_value` to `-1` silently uses the default `2559`, not `-1`. |
| K5 | The filters are order-independent: applying them in any permutation yields the identical key set. |
| K6 | `sortAndFilter` assigns `z_ordinal` from the **date** sort regardless of `z_date_sort_type`. |
| K7 | `SORT_TYPE__OPERATIONS` sorts by `operation_hit_count` (parity), and the separate `SORT_TYPE__OPERATION_SCORE` sorts by `operation_score` (the new, correct one). |
| K8 | Every comparator returns `0` on a genuine tie and the sort is stable — the documented, deliberate deviation from v12. |

### 8.12 Test tiers

- **Tier 1 — golden (must never drift).** Groups A–I. Committed JSON fixtures; a mismatch fails CI.
- **Tier 2 — property.** `round1(round2(x))` is idempotent; `getMsrfMatch` returns at most one
  match; `filter` is order-independent; `compileOperation` accepts exactly the grammar of §3.4
  (fuzz 10 000 random strings; assert no `eval`-like construct ever compiles).
- **Tier 3 — smoke.** Load each sample file, render each screen, assert no console errors and no
  unhandled rejections.

---

## 9. DELIBERATE DEVIATIONS

Everything the rewrite does **differently on purpose**, each with its one-line justification.
Anything not listed here is parity.

### 9.1 Security

| # | Deviation | Justification |
|---|---|---|
| **D1** | **No `new Function`, no `eval`, ever.** Operation strings go through a real lexer → parser → AST evaluator, and the string that is *validated* is the string that is *evaluated*. | v12 validated a defanged string (`oph_*` names deleted, `Y → 10`) with math.js and then compiled a **different** string with `new Function` in global scope — the documented Critical RCE chain. The divergence is by construction, not by accident. |
| **D2** | Operation strings are validated at **import**, in both strict and loose modes. | v12 never content-checked them in any mode; compilation *was* the first check, and compiling *was* the exploit. Validation is now free of side effects, so there is no reason to defer it. |
| **D3** | **Delete the sign-in gate entirely** — `ACCOUNT_HASHES`, `hashAccount`, `isSignedIn`, `FEATURE_FLAG__REQUIRE_SIGN_IN`, `sha512`. | Client-side theatre by the author's own comment ("a false sense of security anyway… like having a fake security camera"): five unsalted SHA-512 digests shipped in plain source, compared in the renderer. It provides no security property, and the hashing library was not even loaded. Replace the `isSignedIn()` guards with `appState.initialized`, which is what they actually meant. |
| **D4** | **No arbitrary-path writes.** Saving goes through the File System Access API (user-granted handle) or a `<a download>` blob. | v12's `autoSaveToFile(path, contents)` did `fs.mkdirSync` + `fs.writeFile` in the Electron main process with **no path validation**. A browser cannot express that primitive, and it should not. |
| **D5** | **Escape everything.** No `innerHTML` with interpolated user data; templating is text-node based; every `title` is plain text. | v12 concatenated event names, notes, error strings and file contents straight into `innerHTML`, and configured tooltips with `html: true`. DOMPurify shipped in `lib/` and was referenced by **zero** files. |
| **D6** | Log lines are structured objects, never string concatenation of file-derived text. | v12 piped `.oph`-derived strings unescaped into the CLI, allowing newline injection and forged log lines. |

### 9.2 Correctness

| # | Deviation | Justification |
|---|---|---|
| **D7** | Guard `Number.isFinite(z)` before using a Z-Value; non-finite results are dropped and **counted** as a `NON_FINITE_Z` diagnostic. | v12 checked only `z > 36500`. `NaN` failed that test, survived every subsequent step, and collapsed every bad result across every pair and operation into a single bucket keyed `"NaN"`. Reachable via `oph_flip` of a negative, `oph_sqrt`/`oph_log` of a negative, and `oph_log(0) → -Infinity`. |
| **D8** | Silently dropped records are **reported**: `OUT_OF_CALENDAR_RANGE`, `CLAMPED_Y`, `CLAMPED_Z`, `SPAN_OUT_OF_RANGE`, `OPERATION_INVALID`. | The chronicon cast silently discarded 24 of 57 candidates (42 %) while the counter cheerfully read `33 / 33 shown`. Clamping to `36 500` also silently merges unrelated results into one bucket and inflates its hit count. |
| **D9** | `Math.floor(ms / MILLIS_PER_DAY)` for day flooring, never `ms % MILLIS_PER_DAY`. | JavaScript's `%` keeps the sign of the dividend, so the three v12 helpers were off by a full day for **every pre-1970 date** — in an app whose entire purpose is back-testing ancient dates. |
| **D10** | Comparators return `0` on ties; sorts are stable. | v12's `(a > b ? -1 : 1)` returns `1` for `cmp(a,b)` *and* `cmp(b,a)` when equal — not a consistent total order. Tie order was implementation-defined and changed with array length. This can reorder tied rows relative to v12; nothing ordered by a genuine key moves. |
| **D11** | `resonance.tier` is a **string tag**; `msrf_filter` array-identity comparison is gone. | v12 discriminated the tier by comparing an array *reference*. `deepClone` is `JSON.parse(JSON.stringify(...))`, so any clone, `postMessage` or `localStorage` round-trip silently collapsed the multiplier to `1.0`. Latent in v12; **fatal** the moment the engine moves to a Worker, which it now does. |
| **D12** | `id` fields are **delimited**: `${ordinal}\|${x1}\|${x2}\|${zStart}`. | v12 concatenated the four values with no separator, so distinct tuples could collide — and the UI matched chart points to table pills by exact string equality on that hash. |
| **D13** | `newOperation` honours its `enabled` argument. | v12's factory hard-coded `enabled: true`. The shipped default set is unaffected (the v10 clone force-enables all 16), so parity holds; the bug only ever defeated authorial intent. |
| **D14** | `z_date_sort_type` is validated on import against the registry. | v12 had no whitelist; an unrecognised value matched no comparator branch, leaving `sortValueA === sortValueB === 0` and producing a constant comparator and an arbitrary order. |
| **D15** | T-Dates are converted **with** the event's lat/long, exactly as X-Dates are. | v12 called `xDateToNativeDate(scope, tDate)` with no coordinates, so in HH:MM scope T-Dates parsed in the *browser's* timezone while X- and Z-Dates parsed in the *event location's*. A real bug that shifted the whitelist by the UTC-offset difference. |
| **D16** | `roundMillisToNearestMidnightInTimeZone` genuinely rounds to the nearest midnight. | v12's version always floored: moment's `endOf('day')`/`startOf('day')` mutate in place, so both diffs evaluated to `0` and `0 < 0` never selected the upper midnight. Behind the `NEAREST_MIDNIGHT` quirk flag for chart-tick parity. |
| **D17** | `parseIntElse` returns its default for unparseable input. | v12 tested `toReturn != null`, but `NaN != null` is `true`, so it returned `NaN` and silently disabled the `--current-epoch-millis` validation guard. |
| **D18** | `POINTS__VORTEX_MSRF_MATCH` is an independent literal `2`, not an alias of the Important constant. | v12 defined it *as* `POINTS__IMPORTANT_MSRF_MATCH`, so changing Important silently changed Vortex. |
| **D19** | `SORT_TYPE__OPERATIONS` keeps its (count-based) parity behaviour, and a **new** `SORT_TYPE__OPERATION_SCORE` provides the score-based ordering the tooltip promised. | Both arms of v12's `if/else` assigned the count. Fixing it in place would silently change every visible row order; adding a sibling changes nothing and offers the intended behaviour. |
| **D20** | The engine takes `now` as an argument and reads no globals. | v12's `sortAndFilterResults` reached into `appState.globalOptions`, and `getCurrentLocalTime` silently ignored the headless time offset — so GUI and headless produced *different filter results for the same file*. |

### 9.3 Platform

| # | Deviation | Justification |
|---|---|---|
| **D21** | Browser-first. No Electron IPC. The twelve `electronBridge.*` calls map to: File System Access API / `<input type=file>` (open), `showSaveFilePicker` / `<a download>` (save), a retained `FileSystemFileHandle` (autosave), `beforeunload` (close confirm), `localStorage.clear() + reload` (factory reset), and deletion for the rest. | The renderer already used **zero** direct Node APIs and talked only through a façade, so the port is mechanical. |
| **D22** | `runOphis` runs in a **Web Worker**, debounced 120 ms; the UI keeps the Stale badge and Recalculate button. | v12 blocked the main thread synchronously on every committed input change, with no worker, no chunking and no debounce. |
| **D23** | Self-hosted WOFF2 subsets instead of a Google Fonts link. | "This program uses ZERO external resources… ALL files are loaded locally" is a stated product promise on the About screen. The PSYFR build broke it with a single stylesheet link. |
| **D24** | The offline map tile pyramid (1 365 PNGs, ~97 % of the asset payload) is an **opt-in pack**; the default is a two-field lat/long entry plus a lightweight SVG outline. | Zoom 0–5 gives country-level resolution — enough to click a city, not a street. Most users never open the map, and location is meaningless outside HH:MM scope. |
| **D25** | Drop moment + moment-timezone (~1.2 MB), lunarphase-js, MeeusJS and SunCalc. Keep Astronomy Engine only if sunsets are kept. | `Intl.DateTimeFormat` covers every timezone need including LMT-era offsets; moon phase is 12 lines of arithmetic; the Meeus and SunCalc sunset branches were unreachable (SunCalc's `<script>` tag was never even in the page). |
| **D26** | Regenerate the eclipse tables at build time: sorted, de-duplicated, **UTC**, delta-encoded, from the NASA CSVs. Ship one table format for both reckonings. | v12's tables were America/New_York local midnights in three unsorted runs, so a binary search could never reach 271 lunar and 420 solar records — including 324 genuine eclipses in 100–181 CE. The PSYFR tables were sorted but had a 90-year hole at 10–99 CE, and the range guard used the solar bounds for both lookups. Flag the ~20 % one-day shift (§10 Q7). |
| **D27** | `type: "text/csv"` becomes `application/json` for `.oph` downloads; XLSX gains the CSV's full 8 columns. | v12 mislabelled the MIME and shipped a 3-column XLSX its own author called a proof of concept. |
| **D28** | Restore full keyboard operability; never set `tabIndex = -1` wholesale. | v12 stripped every button and checkbox from the tab order at startup. |
| **D29** | Add an **activity log** as a first-class surface; toasts mirror into it. | The author's own TODO: *"Try to pipe these kinds of things to an activity log, ultimately. Toasts are limited."* A 2.9-second toast is not a feedback channel, and multi-field changes suppressed toasts entirely. |
| **D30** | Import sanitisation is an **allow-list** of known fields, not a deny-list of known-bad ones. | The author's own TODO at the sanitiser: *"Perhaps a White List of fields to keep, rather than deleting what shouldn't be there."* It is also the structural fix for the permissive-import half of the RCE chain. |
| **D31** | Do not apply `replaceAll(",", ", ")` to the serialised JSON. | It rewrote commas *inside* string values, so `name` and `notes` accreted a space on every save/load cycle. Lossy for user data. |
| **D32** | Arcs are drawn as true ellipse arcs. | v12 set `lineTension` — a Chart.js **v2** key that v4 ignores — so every arc was silently a 13-segment polyline. Pick deliberately; document the choice. |

---

## 10. OPEN QUESTIONS FOR THE OWNER

Genuinely ambiguous decisions a human must make. Each is blocking only for the feature named;
implementation can proceed on everything else. Recommended defaults are given so work is never
stalled.

| # | Question | Why it matters | Default if unanswered |
|---|---|---|---|
| **Q1** | **What does MSRF stand for?** It is never expanded in any source file, comment, README, or either prior report. The companion spreadsheet uses headers *MSRF Filter: Number*, *MSRF Score*, *MSRF Cat*, *Magnitude*, *Magnitude Scale*, *FIB Number*, *FIB True* — hinting at a magnitude scale and a Fibonacci relationship, but still not expanding it. | It appears in the UI, the About page, the CSV header and a column tooltip. | Keep the token opaque. **Do not invent an expansion.** |
| **Q2** | **Is `1574` in `MSRF_FILTER__NORMAL` a typo?** It sits at index 248 between `1641` and `1680`. `1674` or `1647` would both fit; `1577` appears fourteen entries earlier. | Changing it changes match results for any Z-Value near 1574 or near the intended number. | Ship `1574` **verbatim**. |
| **Q3** | **Is `1138` in the chronicon 87-member set a typo for `1134`?** `1134` is a genuine `IMPORTANT` member and sits directly beside it. `1138` appears nowhere in Ophis. Only `19` is documented as a deliberate addition. | It is an undocumented resonance number scoring +2 (V8) / +3 (V7). | Ship it flagged `suspect: true`, surfaced in the Method screen. |
| **Q4** | **Was the vortex ±0.1 floating-point asymmetry intentional?** 3 of 12 vortex numbers accept only an exact probe; the other 9 accept exactly one neighbour, never both. | "Fixing" it to a symmetric window widens 9 of 12 windows and changes scores across the board. | Reproduce the asymmetry; expose a `SYMMETRIC_VORTEX_WINDOW` quirk flag, default **off**. |
| **Q5** | **Should convergence clustering stay transitive?** Greedy chaining means a ±30-day window can yield a 90-day cluster. | It materially changes the headline "strength" numbers, which are the app's flagship output. | Keep transitive chaining; always render the `±⌈span/2⌉d span` disclosure. Offer fixed-diameter as a second strategy. |
| **Q6** | **Should `SCORING_SYSTEM__LTE_V7` be kept?** It is unreachable from the v12 GUI (import coerces every unrecognised value to GTE_V8) and reachable only from a hand-edited file. | Legacy `.oph` compatibility versus one fewer scoring system to maintain. | Keep it, selectable, for legacy files. |
| **Q7** | **Which eclipse dating convention is canonical going forward?** Regenerating the tables correctly moves ~915 lunar and ~1 416 solar records by one day (v12 used the generator machine's *local* calendar date; UTC is correct). Separately, pre-1582 records are treated as proleptic Gregorian, which may be up to 10 days off if the source canon uses Julian dates. | It changes which projections get an eclipse tag, which changes scores in the chronicon reckoning. | Regenerate as **UTC**, proleptic Gregorian. Note the shift prominently in the Method screen. |
| **Q8** | **Should exports honour the on-screen sort and filter?** v12 always exported date-ascending, filters honoured, user sort discarded — and never said so. | Users reasonably expect "export what I am looking at". | Offer **Export view** (filtered + sorted as shown) and **Export all** (filtered, date-ascending). Default to Export view. |
| **Q9** | **Is air-gapped operation still a requirement?** It drives the 1 365-tile offline map pack, self-hosted fonts, and no CDN anywhere. | ~97 % of the asset payload. | Assume **yes** for fonts and code; make the map tile pack opt-in. |
| **Q10** | **Should the historical `MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES = 2` rule be revived?** A lone Beta hit used to earn nothing unless there was also an Alpha hit, another Beta hit, or an MSRF match. Only the dead constant and a commented-out About bullet survive. | In v12 a single Beta hit scores `0.5`. In the Group-H fixture, **44 of 114 rows** are single-hit — reviving the rule would zero many of them. | **Do not implement.** Offer it as an opt-in mod, default off. |
| **Q11** | **Should the Vortex tier outrank Important?** They are numerically identical (2 points, ×2.0); their relative order is decided only by `rotation_count_z`, which determines which one is *attributed* as the multiplier in tooltips. Scores are unaffected. | Presentation only, today. | Leave as-is; the constants are now independent (D18) so this becomes a one-line change if wanted. |
| **Q12** | **Which reckoning is the default for a new Iso-Event?** | `ophis` is the historical engine; `chronicon` is the one with the flagship Convergence feature. | Default `ophis`; make the reckoning switch prominent on the new-event flow. |
| **Q13** | **Should the ten `ophis-xtras` operations ship enabled?** The file specifies neither weights nor enabled state, and they were never loaded by the app. | They would change every default result. | Ship as a **disabled, selectable pack** at weight 0.5. |
| **Q14** | **Do `.oph` files need to interoperate between the two reckonings?** The Electron engine's multiplication token is lowercase `x`; the browser rewrites use `*`. | Today they do not; the rewrite's parser accepts **both**, so this resolves itself for reading — but a chronicon anchor needs `astro_year`, which an old reader will ignore. | Accept both tokens; write `x` for `ophis` events and `*` for `chronicon` events. |
| **Q15** | **Licensing.** `README.md` says *"Study artifact — add your own license before publishing."* The `NatorionOracle` LICENSE forbids modification, derivative works, ports and forks, and removing the Archaix framing notice, without written permission. | The owner is the copyright holder, so private work is self-authorised — but this must be settled before anything is published. | Carry the Archaix framing notice forward verbatim; do not publish until a licence is chosen. |
| **Q16** | **Should `EVENT_TYPE__ASTROLOGICAL` and the Markets skin be revived or deleted?** Both are implemented and both are commented out of their enums. The author called Markets *"the beginning of an idea that never panned out really."* | Dead surface area with a live schema field. | Keep `type` in the schema for file compatibility; render nothing. Delete the skin machinery. |
| **Q17** | **Is `OPH_HEP = 7.01` correct, or should it be `7`?** The `.01` offset is undocumented anywhere in the source. | It affects two of the sixteen default operations, both Alpha-weighted. | Ship `7.01` verbatim. |

---

## APPENDIX A — IMPLEMENTATION ORDER

A suggested build sequence in which every stage is independently verifiable.

1. **`data/` + `core/numeric` + `core/ophfn`** → Groups **A** and **D** pass.
2. **`core/equation`** (lex → parse → evaluate → compile) → Group **J8–J10** pass; fuzz the grammar.
3. **`data/msrf.tiers` + `resonance/msrf`** → Groups **E** and **G** pass.
4. **`core/calendar/gregorian-ms` + `core/engine/pairs`** → Group **B** passes.
5. **`core/engine/project` + `bucket`** → Group **C** passes.
6. **`scoring/ophis-gte-v8` + `ophis-lte-v7`** → Group **F** passes.
7. **`filters/` + `sorts/` + `core/engine/run`** → Groups **H** and **K** pass. *The engine is now done.*
8. **`persistence/`** → Group **J** passes.
9. **`state/` + `workers/`** → the engine runs off the main thread.
10. **`theme/` + `ui/components` + `ui/screens/work` + the results table** → the app is usable.
11. **`ui/chart`** → the timeline.
12. **`core/calendar/jdn` + `reckonings/chronicon` + `resonance/chronicon-lattice` + `eclipse` + `echo` + `scoring/chronicon-*`** → Group **I** passes.
13. **`core/engine/converge` + `ui/screens/convergence` + `wheels` + `ledger`** → the flagship feature.
14. **`ui/screens/audit`** + the activity log.
15. **Exports** (CSV → XLSX → PDF), then the remaining screens.

Stages 1–7 have **no DOM dependency whatsoever** and can be built and fully verified headless.

## APPENDIX B — SOURCE MAP

| Topic | Spec |
|---|---|
| Equation grammar, constants, `oph_*`, validation pipeline, Y and Z construction | `01-engine-math.md` |
| Pair enumeration, projection loop, bucketing, scoring, filters, sorts | `02-engine-operations.md` |
| MSRF sets verbatim, tier semantics, both scoring systems, all comparators | `03-scoring-msrf.md` |
| `.oph` schema, load/save, validation modes, default operation lineage, the three samples | `04-persistence-format.md` |
| Every constant and feature flag, all utilities, logging, dependencies, unit tests | `05-config-utils.md` |
| Bootstrap, `appState`, the controller API, recalculation policy, Electron surface | `06-controller-main.md` |
| Screen router, DOM contract, render helpers, dialogs, toasts, copy deck | `07-view-core.md` |
| Results table columns, pills, tooltips, rebuild cycle, empty/loading/error states | `08-view-output-rebuild.md` |
| Event Settings, Event Swap, the Operations editor | `09-view-settings.md` |
| Timeline chart: arcs, fan-out, collision spreading, rulers, hit testing, palette | `10-view-chart.md` |
| CSV / XLSX / PDF export, headless CSV, filenames | `11-export.md` |
| Eclipse tables, moon phase, timezones, sunset engines, minimal-dependency plan | `12-astronomy-data.md` |
| PSYFR/Natori UI: design system, wireframes, DOM contract, `cast`, convergence, packs | `13-psyfr-cypher-ui.md` |
| Domain glossary, cycle constants, prior-report corrections, `ophis.css`, assets, TODOs | `14-domain-and-style.md` |
| **Live engine extraction: verified constants, `cast` semantics, the golden chronicon dataset** | `15-live-engine-extraction.md` |

---

*End of build spec.*
