# 19 · The MSRF Magnitude System

**Scope.** How an MSRF resonance number's *strength* is derived: the three historical shapes of the
MSRF table (GameSeer / Ophis 2.0 / Ophis 3.0+), the "MSRF Magnitude Calculator" workbook and every
formula in it, the precise relationship between **tier**, **dimensions of arithmetic** and
**magnitude**, an empirical reconstruction of the **vortex numbers**, and the exact place magnitude
does — and does not — enter the shipped desktop engine's scoring.

**Primary sources read in full**

| | |
|---|---|
| `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/reference/docs/Ophis MSRF Details.txt` | 10 pages, by "a semi old bloke" (workbook author `Chris L`), crediting Jason Breshears / Archaix for the datasets |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/MSRF Magnitude Calc-v2.xlsx` | one sheet `MSRF Magnitude`, `B5:K573`, created 2025-06-16 by `Chris L` |
| `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/reference/asar/unpacked/src/ophis_model__params.js` | v12 MAIN-process filter tables and point/multiplier constants |
| `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/reference/asar/unpacked/src/ophis_model__sorting.js` | Z-date filter/sort comparison chain |
| `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/reference/asar/unpacked/src/ophis_model__operations.js` | `scoreZDates`, `getMsrfScoreMultiplier*`, `sumUpMsrf*` |
| `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/reference/asar/unpacked/src/ophis_utils.js` | `getMsrfMatch` — the actual matcher |
| `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/src/data/msrf-tiers.js` | the rewrite's tiered table |

**Headline result.** *Magnitude is not the same quantity as tier, and it is not the same quantity as
the tier's stated "dimensions of arithmetic."* The workbook carries a per-number magnitude that is
strictly finer than the tier lists, that resolves the source PDF's own internal contradictions, and
that recovers a hidden sub-ordering baked into the order the PDF prints its tier lists in. The
rewrite currently models magnitude and dimensions as the same number; that is wrong.

---

## 1 · MSRF table versions (page 8 of `Ophis MSRF Details.txt`)

Page 8 is titled **"Ophis MSRF Table Versions"** and opens:

> "Not all MSRF tables are alike. It should be expected as I'm sure years of analysing and cross
> referencing produced repeated number appearances. Overtime a system of inclusion would have been
> developed. Pure conjecture on my part however logically makes sense."
> — `Ophis MSRF Details.txt:288-290`

### 1.1 The three versions, as stated

| Version | Total numbers | Fibonacci representation | Vortex representation | In Tier list | Missing from Tier list | Cite |
|---|---|---|---|---|---|---|
| **GameSeer** | 285 | **yes** — "Includes Fibonacci representation" | **no** | **all 285** | 0 | `:291-295` |
| **Ophis 2.0** (HTML browser) | 388 | no ("few appear; not represented as such") | yes | 328 | **60** | `:296-301` |
| **Ophis 3.0+** (App) | 390 | no ("few appear; not represented as such") | yes | 329 | **61** | `:311-316` |

The author's gloss on the unassigned numbers, printed identically for both 2.0 and 3.0+:

> "Now, common sense context view is they are recent findings and yet to be assigned to the Tier and
> Arithmetic Categorisation process. If a source for their assignment is produced, I will surely
> update." — `:303-304`, repeated at `:318-319`

### 1.2 The Ophis 2.0 list — 60 numbers not assigned to a tier (`:306-310`, verbatim)

```
21.7, 32.6, 43.5, 49, 52, 56, 59, 65.3, 71, 74, 76.2, 77, 87.1, 88, 104, 110, 119, 133, 147, 154,
162, 182, 217.8, 260, 308, 326.7, 385, 435.6, 493, 539, 565, 572, 573, 582, 653.4, 691, 762.3, 789,
807, 866, 871.2, 1042, 1052, 1083, 1253, 1292, 1372, 1530, 1534, 1574, 1585, 1829, 1855, 1905, 1972,
2235, 2269, 2294, 2333, 2506
```

Twelve of the sixty are the **non-integer vortex values**: `21.7, 32.6, 43.5, 65.3, 76.2, 87.1,
217.8, 326.7, 435.6, 653.4, 762.3, 871.2`.

### 1.3 The Ophis 3.0+ list — 61 numbers not assigned to a tier (`:321-325`, verbatim)

```
21.7, 32.6, 43.5, 49, 52, 56, 59, 65.3, 71, 74, 76, 76.2, 77, 87.1, 88, 104, 110, 119, 133, 147,
154, 162, 182, 217.8, 260, 308, 326.7, 385, 435.6, 493, 539, 565, 572, 573, 582, 653.4, 691, 762.3,
789, 807, 866, 871.2, 1042, 1052, 1083, 1253, 1292, 1372, 1530, 1534, 1574, 1585, 1829, 1855, 1905,
1972, 2235, 2269, 2294, 2333, 2506
```

The same twelve vortex values appear here unchanged.

### 1.4 What actually changed between 2.0 and 3.0+ — derived, not stated

The set difference between the two lists is **exactly `{76}`**. Total count went `388 → 390`
(+2); the unassigned count went `60 → 61` (+1). The explanation is sitting in the shipped v12 source
as a code comment:

```js
// NOTE: Filter numbers 21 and 76 have been commented out since rounded down vortex numbers match these.
// UPDATE: Re-enabled 21 and 76 after discussion with Jason to match a vortex number within a certain tolerance.
```
— `reference/asar/unpacked/src/ophis_model__params.js:15-16`

`21` and `76` were re-enabled together: that is the `+2` on the total. `21` **is** in the tier list
(Tier IV), `76` is not — that is the `+1` on the unassigned list. The 2.0 → 3.0+ delta is fully
accounted for. The mechanism the comment refers to is the vortex tolerance window: `floor(21.7) = 21`
and `floor(76.2) = 76`, and `VORTEX_FILTER_MATCH_TOLERANCE = .1`
(`reference/asar/unpacked/src/ophis_config.js:367`) means a Z-value of `21.6 … 21.8` is claimed by
vortex `21.7` before the integer filters are ever consulted — see §5.3.

### 1.5 Arithmetic errors in the page-8 counts

Checked against `ophis_model__params.js` (which *is* the 3.0+/v12 table):

- `MSRF_FILTER__NORMAL` = **325** entries (324 literals + `HIGHEST_MSRF_NUMBER`), `params.js:17-36`
- `MSRF_FILTER__IMPORTANT` = **53** entries, `params.js:38-42`
- `MSRF_FILTER__VORTEX` = **12** entries, `params.js:44-46`
- total **390** ✔ matches "390 Total Numbers"

But of those 390, **63** are absent from the tier lists, not 61 — the doc's list omits `2558` and
`2559`. `2559` is `HIGHEST_MSRF_NUMBER` (`ophis_config.js:119`), doubling as the default value of the
"beyond N days" filter (`ophis_config.js:152`). So the true split is **327 in tier / 63 not**, and the
doc's "329 appear in Tier Numbers List" is off by two in the same direction. Minor, but it means
`329 + 61 = 390` only balances because both halves are wrong by two.

### 1.6 Page 9 — "Original MSRF Table Image"

> "nb; source: posted by Jason on X December 6, 2024
> The numbers shown here with their dimensions value is a match with the MSRF Tier and Dimensions
> document from in the Ophis 2.0 data dump. **The exception is the number 18.**"
> — `Ophis MSRF Details.txt:333-336`

This one sentence is the key to the whole workbook. The image carries a **per-number dimensions
value**, and it contains one number (`18`) that the tier lists do not. The workbook's lookup table is
**565 rows** — the tier lists' 564 distinct numbers **plus 18** — and its `Magnatude` column is that
per-number value, not the tier's blanket value. See §3.

### 1.7 Page 10 — the intended operating procedure

> "1. Note Score / 2. Look for/at MSRF Number / 3. Note Ophis App Categorisation § Normal § Important
> § Vortex / 4. Calculate Strength" — `:350-356`

Note step 3 explicitly includes **Vortex**. §2.6 shows the workbook cannot in fact do step 3 for any
vortex number.

---

## 2 · The MSRF Magnitude Calculator (`MSRF Magnitude Calc-v2.xlsx`)

An `.xlsx` is a zip of XML. Recovered by extracting and parsing `xl/workbook.xml`,
`xl/worksheets/sheet1.xml`, `xl/sharedStrings.xml`, `xl/styles.xml`, `xl/drawings/drawing1.xml`,
`xl/calcChain.xml`.

### 2.1 Workbook shape

- **One sheet**: `MSRF Magnitude`, `sheetId="1"`, gridlines off, zoom 120%.
- **Used range**: `B5:K573`.
- **Author**: `dc:creator = Chris L`, created `2025-06-16T21:50:16Z` (`docProps/core.xml`).
- **Floating shapes** (`xl/drawings/drawing1.xml`): two `rect` + one `straightConnector1`, all in
  `C00000` dark red, reading **"OPHIS MSRF MAGNITUDE LOOKUP"** and **"INSERT OPHIS MSRF NUMBER HERE
  FOR SUMMARY OF NUMBER"** — the arrow points at the single input cell `E6`.

### 2.2 Defined names (`xl/workbook.xml`)

| Name | Refers to | Comment stored in the file |
|---|---|---|
| `MSRF_NUM` | `'MSRF Magnitude'!$E$6` | "MSRF FILTER : The Number to check for the Multidimensional Spatial Recognition Filters" |
| `MSRF_VAL` | `'MSRF Magnitude'!$G$7` | "MSRF FILTER : The outcome \"Hit\" or \"No Hit\" for the Number checked against the Multidimensional Spatial Recognition Filters" |
| `FIB_TRUE` | `'MSRF Magnitude'!$F$6` | — |
| `MSRF_DIM` | `'MSRF Magnitude'!$G$6` | — |
| `MSRF_NUMBERS` | `'MSRF Magnitude'!$E$9:$G$573` | — (565 rows × 3 cols) |
| `FIB_SCORE` | `'MSRF Magnitude'!#REF!` | **dead** |
| `MSRF_SCORE` | `'MSRF Magnitude'!#REF!` | **dead** — "MSRF FILTER : The Score returned for the check aginst the Multidimensional Spatial Recognition Filters" |

`FIB_SCORE` and `MSRF_SCORE` are broken references left over from an earlier layout. Nothing
references them; they are dead weight.

### 2.3 The two lookup tables

**Left table — the tier/magnitude table.** `E8:G8` headers `Number | FIB | Magnatude`; data
`E9:G573`, **565 rows**, ascending by `E`, no duplicates, all integers, range `8 … 2556`.

- `F` (**FIB**) — `1` for the twelve Fibonacci numbers present in the table
  (`8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597`), `0` otherwise.
- `G` (**Magnatude** [sic]) — an integer in `{0,1,2,3,4,5,6,7,8,9,10,14}`. Full census:

| Magnitude | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| count | 10 | 281 | 128 | 56 | 46 | 14 | 13 | 5 | 5 | 4 | 2 | 1 |

**Right table — the app's live filter table.** `I8:K8` headers `Ophis App MSRF # | MSRF Cat | MSRF
Score`; data `I9:K398`, **390 rows**, ascending by `I`, with the twelve non-integer vortex values
interleaved in sort position — i.e. it is a transcription of
`MSRF_FILTER__FINAL = NORMAL.concat(IMPORTANT).concat(VORTEX).sort()` (`params.js:57`).

- `J` (**MSRF Cat**) — `Normal` ×325, `Important` ×53, `Vortex` ×12.
- `K` (**MSRF Score**) — `1` for Normal, `2` for Important, `2` for Vortex. These are exactly
  `POINTS__NORMAL_MSRF_MATCH = 1`, `POINTS__IMPORTANT_MSRF_MATCH = 2`,
  `POINTS__VORTEX_MSRF_MATCH = POINTS__IMPORTANT_MSRF_MATCH` (`params.js:4-6`).

The `Important` and `Vortex` columns are byte-for-byte identical to `params.js`. The `Normal` column
has **four transcription errors** — see §2.7.

### 2.4 Every formula, verbatim

Only nine cells in the whole workbook are formulas. Recovered from the `<f>` elements of
`xl/worksheets/sheet1.xml`:

```
G7   =IF(COUNTIF(E9:E573,E6)=1,"TRUE","FALSE")
F6   =IF(G7="FALSE",0,VLOOKUP(E6,MSRF_NUMBERS,2,FALSE))
G6   =IF(G7="FALSE",0,VLOOKUP(E6,MSRF_NUMBERS,3,FALSE))
I6   =IF(MSRF_VAL="TRUE",MSRF_NUM,0)
J6   =IFERROR(VLOOKUP(I6,$I$9:$K$398,2),"None")
K6   =IFERROR(VLOOKUP(I6,$I$9:$K$398,3),"None")
K7   =MSRF_VAL
C10  =IF(I6=0,"None",I6)
C11  =J6
C12  =K6
C13  =MSRF_DIM
C14  =IF(FIB_TRUE<>0,"True","False")
```

Dependency order is fixed by `xl/calcChain.xml`: `G7 → G6 → C13`, then `I6 → C10`, `K7`, `F6 → C14`,
then `J6 → C11`, `K6 → C12`.

### 2.5 What it computes, in words

**Input:** a single cell, `E6` (`MSRF_NUM`). One number — the MSRF number Ophis printed next to a
projected Z-date.

**Step 1 — membership.** `G7` (`MSRF_VAL`) counts occurrences of `E6` in the 565-row tier column
`E9:E573` and yields the *string* `"TRUE"` or `"FALSE"`. The `=1` (rather than `>0`) is safe only
because the left table has no duplicates.

**Step 2 — magnitude and Fibonacci flag.** If `G7` is `"FALSE"`, both `F6` and `G6` short-circuit to
`0`. Otherwise each does an **exact** `VLOOKUP` (`range_lookup = FALSE`) into `MSRF_NUMBERS`, pulling
column 2 (FIB) and column 3 (Magnitude).

**Step 3 — hand-off to the app table.** `I6` re-emits the input **only if it was found in the tier
table**, else `0`.

**Step 4 — Ophis category and points.** `J6`/`K6` `VLOOKUP` `I6` into the app table `I9:K398` for
`MSRF Cat` and `MSRF Score`. **These two calls omit the fourth argument**, so Excel defaults to
`range_lookup = TRUE` — approximate match — which on an ascending key returns the row for the largest
entry *less than or equal to* the probe. `IFERROR(...,"None")` only fires when the probe is below the
first key (`12`), i.e. for `I6 = 0` and for `I6 = 8`.

**Output — the `Summary` block, `B9:C14`:**

| Cell | Label | Formula | Meaning |
|---|---|---|---|
| `C10` | MSRF Number | `IF(I6=0,"None",I6)` | echo of the input, or `None` |
| `C11` | Ophis Category | `J6` | `Normal` / `Important` / `Vortex` / `None` |
| `C12` | Ophis Score | `K6` | `1` / `2` / `None` — the app's raw point value |
| `C13` | Magnitude | `MSRF_DIM` (= `G6`) | the strength number |
| `C14` | FIB Number | `IF(FIB_TRUE<>0,"True","False")` | is it a Fibonacci number |

**The magnitude scale, `B17:C29`.** A static legend: `Magnitude Scale | Colour`, values
`0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14` with `C18` reading `None` and `C19:C29` being bare colour
swatches. Colours come from the cell fills and, for `C13`, from conditional formatting
(`<conditionalFormatting sqref="C13">`, five `cfRule`s, and `<dxfs>` in `xl/styles.xml`):

| Magnitude band | cfRule | Fill |
|---|---|---|
| `= 0` (stopIfTrue) | priority 4 | theme 0 tint −0.15 — light grey, labelled **None** |
| `1 … 2` (stopIfTrue) | priority 5 | accent2 `E97132` darker 25% — orange |
| `3 … 5` | priority 3 | accent6 `4EA72E` darker 25% — green |
| `6 … 8` | priority 2 | `C00000` — dark red |
| `>= 9` | priority 1 | accent5 `A02B93` darker 25% — purple |

`C11` (Ophis Category) has its own three rules: `Vortex` → accent5 purple, `Normal` → accent6 green,
`Important` → `C00000` dark red. That is the same semantic palette the desktop app uses
(`COLOR__MSRF_NORMAL` green, `COLOR__MSRF_IMPORTANT` red, `COLOR__MSRF_VORTEX` purple — see
`docs/reverse/03-scoring-msrf.md:85-91`). `G7` and `K7` get the stock Excel good/bad pair
(`C6EFCE`/`006100` for `"TRUE"`, `FFC7CE`/`9C0006` for `"FALSE"`).

**So the deliverable is:** *given an MSRF number, tell me (a) whether Ophis would flag it at all and
in which of the three categories, (b) how many raw points that is worth to the engine, and (c) how
strong the number is on a 0–14 magnitude scale.* The magnitude is the added value; (a) and (b) are
just a restatement of `params.js`.

### 2.6 Worked example — the value the file ships with

`E6 = 504` (a Tier VII·alpha Apex Projection).

```
G7  = IF(COUNTIF(E9:E573,504)=1,"TRUE","FALSE")            -> "TRUE"
F6  = IF("TRUE"="FALSE",0,VLOOKUP(504,E9:G573,2,FALSE))    -> 0        (not Fibonacci)
G6  = IF("TRUE"="FALSE",0,VLOOKUP(504,E9:G573,3,FALSE))    -> 10       (magnitude)
I6  = IF("TRUE"="TRUE",504,0)                              -> 504
J6  = IFERROR(VLOOKUP(504,I9:K398,2),"None")               -> "Important"
K6  = IFERROR(VLOOKUP(504,I9:K398,3),"None")               -> 2
```

Summary block:

```
MSRF Number     504
Ophis Category  Important      (dark red)
Ophis Score     2
Magnitude       10             (purple — the >= 9 band)
FIB Number      False
```

Reading: `504` is an *Important* MSRF number worth 2 raw points, and at magnitude 10 it sits in the
top band — one of only three numbers in the entire table at 10 or above (`504`, `1512`, `2520`).
Under the engine's rules an Important hit also lifts the whole Z-date's multiplier to `2.0` (§5.2).

**Second example, showing the defect.** `E6 = 27` (Tier I):

```
G7 -> "TRUE"    G6 -> 1     I6 -> 27
J6  = VLOOKUP(27, I9:K398, 2)   -- no 4th arg, approximate
```

`27` is not in the app's 390-number list. Approximate lookup lands on the largest key `<= 27`, which
is `24`, and returns **`Normal`, score `1`**. The workbook asserts that Ophis flags 27. It does not.

### 2.7 Defects in the calculator

| # | Defect | Cells | Impact |
|---|---|---|---|
| 1 | `J6`/`K6` omit `range_lookup=FALSE`, so they approximate-match | `J6`, `K6` | **239 of the 565 numbers get a silently wrong Ophis Category and Score.** Of those, 37 are falsely reported *Important* and 6 falsely reported *Vortex*: `33`→`32.6`, `34`→`32.6`, `45`→`43.5`, `440`→`435.6`, `873`→`871.2`, `880`→`871.2`. Only `8` errors out honestly to `None`. Fix: append `,FALSE` to both. |
| 2 | `I6` gates on **tier-table** membership (`MSRF_VAL` = `G7`) instead of **app-table** membership | `I6` | All **65** numbers that are in the app's filter list but not in the tier lists return `None` for MSRF Number, Category *and* Score. That set includes **every one of the twelve vortex numbers** and every integer on the page-8 "missing numbers" list. The workbook therefore cannot perform step 3 of its own page-10 procedure ("Note Ophis App Categorisation … § Vortex") for any vortex number. Fix: `I6 = IF(COUNTIF($I$9:$I$398,MSRF_NUM)=1, MSRF_NUM, 0)`. |
| 3 | Magnitude `0` is overloaded | `G6`, `C13` | `0` means both "not in the table" and "genuinely magnitude 0" (the ten Fibonacci Tier II numbers). Both render as grey **None**. Only `C14` disambiguates, and only by inference. |
| 4 | Four transcription errors in the app-number column | `I9:I398` | Sheet has `236, 478, 496, 562`; `params.js` has `238, 476, 493, 582`. Note `238` and `476` *are* real tier numbers (Tier I and Tier II), so the typo both loses two valid entries and injects four numbers Ophis has never heard of. This is why the sheet-derived "not in tier list" count comes out at 65 rather than the doc's 61 + the two `2558/2559`. |
| 5 | Two dead defined names | `FIB_SCORE`, `MSRF_SCORE` | Both resolve to `#REF!`. Harmless but they poison any name-manager-driven tooling. |
| 6 | `G7`/`K7` carry the *strings* `"TRUE"`/`"FALSE"`, not booleans | `G7`, `K7`, `F6`, `G6`, `I6` | Every downstream test is a string comparison. Works, but a locale change or a manual retype of `TRUE` as a boolean silently breaks `F6`, `G6` and `I6` at once. |
| 7 | Header spelled **`Magnatude`** in `E5`, `G5`, `G8` while the summary label at `B13` says `Magnitude` | shared strings 14 & 18 | Cosmetic; both strings live in `xl/sharedStrings.xml`. |

---

## 3 · Magnitude vs. dimensions vs. tier

### 3.1 The author's declared mapping

> "Note: I define the **Tier Level to Category** and the **Dimensions of Arithmetic to Magnitude** for
> MSRF Magnitude Calculator."
> — `Ophis MSRF Details.txt:171-173`

> "Jason describes the Tier as a 'hierarchy by orders of magnitude'. It is my view that the Dimensions
> of Arithmetic is the golden value. Why? Because it represents how many time the number itself
> appeared across all the individual filters. Therefore, a strong or weak magnitude for the value."
> — `:175-177`

So, declared:

```
Tier Level            -> Category   (the coarse bucket: I … VII, and VII.ceta/beta/alpha)
Dimensions of Arith.  -> Magnitude  (the per-number strength)
```

Note the *Category* he means here is the tier — **not** the workbook's `Ophis Category` column, which
is the app's Normal/Important/Vortex classification. Two different things share the word "category"
across the document and the spreadsheet. In the workbook itself only the app category survives; the
tier never appears as a column at all.

### 3.2 What the numbers actually say — magnitude = dimensions − 1

Cross-tabulating all 564 shared numbers between the workbook's `Magnatude` column and the tier that
`src/data/msrf-tiers.js` assigns:

| Tier | Stated dimensions (`Ophis MSRF Details.txt`) | Numbers in tier | Workbook magnitude | Count |
|---|---|---|---|---|
| I | 2 | 280 distinct | **1** | 279 |
| I | 2 | | 3 | 1 — `480`, also listed under Tier III |
| II | 3 | 139 | **2** | 128 |
| II | 3 | | 0 | 10 — the Fibonacci members |
| II | 3 | | 1 | 1 — `336` |
| III | 4 | 75 | **3** | 56 |
| III | 4 | | 4 | 19 |
| IV | 5 | 27 | **4** | 27 |
| V | 6 | 14 | **5** | 14 |
| VI | 7 | 13 | **6** | 13 |
| VII·ceta | 8 | 5 | **7** | 5 |
| VII·beta | 8 | 5 | **8** | 5 |
| VII·alpha | 8+ | 7 | **9 / 10 / 14** | 4 / 2 / 1 |

The relation that fits every regular case is

```
magnitude = (dimensions of arithmetic) − 1
```

i.e. **magnitude counts the *additional* dimensions past the first**. Check it against the source's
own prose:

- Tier I header: *"Every number is one that appears in two different dimensions of arithmetic"*
  (`:186`) → magnitude 1 ✔
- Tier V header: *"appears in 6 dimensions"* (`:242`) → magnitude 5 ✔
- Tier VII header: *"Every number here appears in eight dimensions of arithmetic … These numbers
  appear in 8 or more dimensions"* (`:260-262`) → ceta = 8 dims (mag 7), beta = 9 dims (mag 8),
  alpha = 10, 11 and 15 dims (mag 9, 10, 14) ✔
- The Vortex Holography prose: *"They are operative up through eleven dimensions, but we cannot go
  further"* (`:149-150`) → magnitude 10 = **11 dimensions**, which is exactly where the scale's
  contiguous run stops. ✔

The one number that breaks the ceiling is **`2520`** at magnitude 14 = 15 dimensions. `2520 = LCM(1…10)`
— the single most divisible number under 3000 — and it is the top of the alpha rank. Whether that is
a real count or a sentinel is not recoverable from the sources at hand.

### 3.3 The hidden sub-ordering in the PDF's tier lists

The PDF prints its tier lists in a scrambled, non-numeric order, and `src/data/msrf-tiers.js`
faithfully preserves that order "as the source lists them". It turns out the order is **not random**.
Mapping the workbook's magnitude onto the Tier III list *in printed order* gives:

```
3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3
4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4
```

**Fifty-six magnitude-3 numbers, then nineteen magnitude-4 numbers, perfectly contiguous.** The
Tier III list in the PDF is two pasted-together magnitude groups whose boundary was lost. The
nineteen are, in printed order:

```
693, 1320, 210, 240, 252, 441, 540, 600, 780, 792, 882, 945, 1050, 1056, 1520, 1620, 1683, 1836, 1980
```

By the magnitude data these belong with Tier IV (5 dimensions), which would make the true counts
**Tier III = 56** and **Tier IV = 46**, not 75 and 27. Tier II's ten magnitude-0 Fibonacci members
and the stray `336` are *not* contiguous, so no similar paste boundary is visible there.

### 3.4 The exception numbers

- **`18`** — present in the workbook (`E12`, FIB `0`, magnitude `1`) and absent from every tier list.
  This is precisely the exception page 9 calls out: *"The exception is the number 18."* (`:336`).
  It is the difference between the workbook's 565 rows and the tier lists' 564 distinct numbers. `18`
  is **not** in the app's 390-number filter list either — Ophis will never flag it — so it is
  reference data only.
- **`480`** — listed under *both* Tier I and Tier III in the PDF. The workbook resolves it at
  magnitude **3**, i.e. Tier III. **This independently confirms the tie-break already implemented in
  `src/data/msrf-tiers.js:150-157`**, which keeps the higher `dimensions`. No change needed there.
- **`468`** — listed twice inside Tier I. The workbook has one row for it, magnitude `1`. Consistent.
- **`336`** — printed in Tier II (3 dimensions) but carries magnitude 1 (2 dimensions). Unexplained by
  any source read here.
- **The ten magnitude-0 numbers** — `8, 13, 34, 55, 89, 233, 377, 610, 987, 1597`. All Fibonacci, all
  printed in Tier II, all magnitude 0 (= 1 dimension). Reading: they are in the table *because of the
  Fibonacci Sequence Filter alone*, and the workbook's grey "None" band says so. Note `21` and `144`
  are also Fibonacci (`FIB = 1`) but carry magnitude 4 — they earn their place independently.

### 3.5 Reconstruction rule (implementation-grade)

The full 565-row magnitude column can be regenerated from `src/data/msrf-tiers.js` plus this patch —
no new bulk data file required:

```
magnitude(n):
  0   if n in {8, 13, 34, 55, 89, 233, 377, 610, 987, 1597}
  1   if n == 18  or  n == 336  or  (n in Tier I and n != 480)
  2   if n in Tier II and not covered above
  3   if n in the FIRST 56 entries of the Tier III list (source order), or n == 480
  4   if n in the LAST 19 entries of the Tier III list, or n in Tier IV
  5   if n in Tier V
  6   if n in Tier VI
  7   if n in Tier VII.ceta      { 930, 1080, 1134, 1440, 1800 }
  8   if n in Tier VII.beta      { 840, 1242, 1296, 1680, 2160 }
  9   if n in { 1008, 1224, 1260, 2016 }
  10  if n in { 504, 1512 }
  14  if n == 2520
dimensions(n) = magnitude(n) + 1
fibonacci(n)  = n in {8,13,21,34,55,89,144,233,377,610,987,1597}
```

Verified: this reproduces the workbook's `G9:G573` for all 565 rows.

Complete small bands, for direct transcription:

```
mag 0  (10) : 8 13 34 55 89 233 377 610 987 1597
mag 3  (56) : 42 72 120 176 189 255 270 276 297 396 405 460 480 490 495 576 594 621 660 669 702
              744 774 801 819 828 868 924 960 1020 1071 1155 1177 1188 1332 1386 1449 1485 1488
              1518 1560 1764 1848 1860 1920 1932 2046 2178 2205 2244 2280 2292 2295 2430 2436 2478
mag 4  (46) : 21 63 66 132 144 153 210 240 252 264 288 306 330 378 414 432 441 540 600 612 648 666
              672 690 693 780 792 882 945 1050 1056 1074 1176 1200 1302 1320 1520 1620 1683 1836
              1980 2040 2070 2142 2232 2484
mag 5  (14) : 84 126 216 567 630 756 864 1380 1470 1728 2268 2376 2400 2448
mag 6  (13) : 360 420 720 990 1110 1344 1404 1428 1584 1656 1890 2100 2310
mag 7  ( 5) : 930 1080 1134 1440 1800
mag 8  ( 5) : 840 1242 1296 1680 2160
mag 9  ( 4) : 1008 1224 1260 2016
mag 10 ( 2) : 504 1512
mag 14 ( 1) : 2520
mag 2 (128) : Tier II minus the ten mag-0 numbers minus 336
mag 1 (281) : Tier I minus 480, plus 18 and 336
```

---

## 4 · Vortex numbers — hypothesis, experiment, result

### 4.1 The claim

> "It was during Ophis development that the numbers 1 through 15,000 were run through a program that
> subtracted every number from a holographic reflection of itself to reveal a most startling
> discovery … about 95% of all numbers collapse to zero…having absolutely no real value. However, 5%
> of the numbers in our arithmetic do not collapse to zero but reduce to a very astonishing series of
> numbers that continually loop upon themselves into a funnel that loops forever. These immortal
> numbers are patterned in **9 and 11-dimensional distributions**."
> — `Ophis MSRF Details.txt:137-143`

Shipped result, `reference/asar/unpacked/src/ophis_model__params.js:44-46`:

```js
var MSRF_FILTER__VORTEX = [
    21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4, 762.3, 871.2
];
```

### 4.2 Hypothesis

"A holographic reflection of itself" = **digit reversal** — the same operation the engine already
carries as `oph_flip` (used by operation 3, `"X2+oph_flip(oph_round(Y))"`, `params.js:70`). So the
program computed `n − reverse(n)` for `n = 1 … 15000`, presumably iterated to closure.

Two structural observations motivate it. First, the twelve published values are six values twice:

```
217.8 / 10 = 21.78  -> truncate to 1 dp -> 21.7   (documented)
326.7 / 10 = 32.67  -> 32.6                        (documented)
435.6 / 10 = 43.56  -> 43.5                        (documented)
653.4 / 10 = 65.34  -> 65.3                        (documented)
762.3 / 10 = 76.23  -> 76.2                        (documented)
871.2 / 10 = 87.12  -> 87.1                        (documented)
```

All six truncations match exactly. So there are really only six vortex values, entered at two decimal
scales: `217.8 … 871.2` and the same set divided by ten and cut to one decimal place. Second, the six
core integers `2178, 3267, 4356, 6534, 7623, 8712` are all multiples of `1089`.

### 4.3 The script

`scratchpad/vortex_test.py` (abridged to the load-bearing parts; run under CPython 3.14):

```python
def rev(n): return int(str(n)[::-1])

N = 15000

# (a) one step
zero1 = [n for n in range(1, N+1) if n - rev(n) == 0]

# (b) iterate |x - rev(x)| to a fixed point or cycle
def orbit(n):
    seen, seq, cur = {}, [], n
    for i in range(1000):
        if cur in seen:
            return seq, seq[seen[cur]:]        # (path, cycle)
        seen[cur] = i; seq.append(cur); cur = abs(cur - rev(cur))
    return seq, None

cycles = collections.Counter()
for n in range(1, N+1):
    _, cyc = orbit(n)
    cycles[tuple(sorted(set(cyc)))] += 1
```

### 4.4 Output

```
(a) single step |n - rev(n)| == 0 : 248 of 15000 = 1.653 %   (these are exactly the palindromes)

(b) iterate |x - rev(x)| to closure over 1..15000
    reach the 0 fixed point : 12023 = 80.153 %
    do NOT reach 0          : 2977 = 19.847 %
    distinct terminal cycles: 3
      cycle (0,)              -> 12023 starting values
      cycle (2178, 6534)      ->  2637 starting values
      cycle (21978, 65934)    ->   340 starting values

(c) documented vortex numbers >100, x10 : [2178, 3267, 4356, 6534, 7623, 8712]
    all multiples of 1089? [2, 3, 4, 6, 7, 8] -> True
    1089 = 3^2 * 11^2 = 9 * 121
    1089*k, k=1..9 : [1089, 2178, 3267, 4356, 5445, 6534, 7623, 8712, 9801]
    palindromes among them (collapse in one step): [5445]
    one-step map:
       1089 -> rev  9801 -> |diff|  8712
       2178 -> rev  8712 -> |diff|  6534
       3267 -> rev  7623 -> |diff|  4356
       4356 -> rev  6534 -> |diff|  2178
       5445 -> rev  5445 -> |diff|     0
       6534 -> rev  4356 -> |diff|  2178
       7623 -> rev  3267 -> |diff|  4356
       8712 -> rev  2178 -> |diff|  6534
       9801 -> rev  1089 -> |diff|  8712
```

Alternative "reflection" operators, same harness (`scratchpad/vortex_alt.py`):

```
|n - rev(n)|              : 0-collapse 80.15% ; 3 cycles ; contains (2178, 6534)   <-- matches doc
|n - nines_complement(n)| : 0-collapse  0.00% ; 15 cycles ; nothing resembling the set
|n - rev5(n)| (zero-pad 5): 0-collapse  2.39% ; 5 cycles ; contains (21978, 65934) only
n + rev(n) (reverse-add)  : 0-collapse  0.00% ; 379 cycles ; runaway growth
```

Only plain digit reversal produces the documented numbers.

### 4.5 Verdict — partial reproduction, with one honest failure and one exact hit

**What reproduces.**

1. **The operation is digit reversal.** `|n − rev(n)|` is the only candidate that yields the
   documented values. `oph_flip` was the right instinct.
2. **"A funnel that loops forever" is literally a 2-cycle.** `2178 → 6534 → 2178`. It is the *only*
   non-zero 4-digit attractor, and both members are documented vortex numbers. There is a 5-digit
   sibling, `21978 ↔ 65934` (= `2178`/`6534` with a `9` inserted), which the MSRF does **not** carry.
3. **"9 and 11-dimensional distributions" is arithmetic, not metaphor.** Every one of the 637
   non-collapsing seeds under 10000 is divisible by **11**. The distinguished sub-family — the
   multiples of `1089 = 3² · 11² = 9 · 121` — is divisible by both **9** and **11**. Explicitly, the
   six vortex core integers are `99 × {22, 33, 44, 66, 77, 88}` = `1089 × {2, 3, 4, 6, 7, 8}`. That is
   as clean a "9 and 11" pattern as the claim could ask for.
4. **The 95 / 5 split is real — but over 1…9999, not 1…15000.** Sweeping the cut-off:

   ```
   N=    999  collapse-to-0   999 = 100.00%   nonzero   0.00%
   N=   9999  collapse-to-0  9362 =  93.63%   nonzero   6.37%
   N=  15000  collapse-to-0 12023 =  80.15%   nonzero  19.85%
   N=  20000  collapse-to-0 14383 =  71.92%   nonzero  28.08%
   N= 100000  collapse-to-0 54963 =  54.96%   nonzero  45.04%
   ```

   At `N = 9999` the split is **93.63 % / 6.37 %** — "about 95%…about 5%". Over the stated range of
   1…15000 it is **80.15 % / 19.85 %**, which is not the claim by a factor of four. The most likely
   history: the experiment was run over the four-digit range and the "15,000" was attached later, or
   the 15,000 run was tallied only over its 4-digit survivors. Either way, **as literally written,
   page 4's 95 %/5 % figure does not hold**.

**What does not reproduce.**

5. **The vortex set is not the survivor set, nor the attractor set, nor anything cleanly derivable
   from the run.** Over 1…9999 there are **637** non-collapsing seeds; the MSRF carries six. The
   attractor cycle contains **two** of the six (`2178`, `6534`); `3267`, `4356`, `7623`, `8712` are
   transients, not cycle members. And the nine multiples of `1089` include `1089` and `9801`, which
   are *also* non-collapsing survivors and are *not* in the MSRF, while the tenth candidate `5445` is
   a palindrome and correctly excluded.

   The tightest characterisation I can give for the published six is:

   > the multiples of `1089` in `[1000, 9999]`, excluding the palindrome `5445` and excluding the two
   > perfect squares `1089 = 33²` and `9801 = 99²`.

   That is descriptive, not derived. Nothing in `Ophis MSRF Details.txt`, in `params.js`, or in the
   arithmetic explains why `1089` and `9801` were dropped. **This is a negative result and should be
   recorded as one.** The vortex numbers are consistent with a reverse-and-subtract experiment, but
   the final selection of six was made by hand, off-record.

6. **The scaling is undocumented.** Nothing in any source explains why the six appear at *two* scales
   (`/10` and `/100`-truncated) rather than one, nor why truncation rather than rounding. It is a
   free parameter chosen to put vortex hits inside the Z-value day range the engine actually
   produces.

---

## 5 · How the desktop engine actually uses magnitude and tier

**Short answer: it does not use either one.** Nothing named `tier`, `magnitude`, or `dimension`
exists anywhere in `reference/asar/unpacked/src/`. The tiered 565-row table is *analysis material
that never shipped*. The engine's entire notion of MSRF strength is the three-way
Normal / Important / Vortex split in `ophis_model__params.js`.

### 5.1 The constants (`ophis_model__params.js:1-12`, verbatim)

```js
var POINTS__ALPHA_OPERATION_MATCH = 1;
var POINTS__BETA_OPERATION_MATCH = .5;
var POINTS__IMPORTANT_MSRF_MATCH = 2;
var POINTS__NORMAL_MSRF_MATCH = 1;
var POINTS__VORTEX_MSRF_MATCH = POINTS__IMPORTANT_MSRF_MATCH;
var MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES = 2;


var SCORE_MULTIPLIER__NORMAL_MSRF_MATCH = 1.5;
var SCORE_MULTIPLIER__IMPORTANT_MSRF_MATCH = 2.0;
var SCORE_MULTIPLIER__VORTEX_MSRF_MATCH = 2.0;
```

| Category | Filter array | Size | Points per hit | Score multiplier |
|---|---|---|---|---|
| Normal | `MSRF_FILTER__NORMAL` | 325 (324 literals + `HIGHEST_MSRF_NUMBER = 2559`) | **1** | **1.5** |
| Important | `MSRF_FILTER__IMPORTANT` | 53 | **2** | **2.0** |
| Vortex | `MSRF_FILTER__VORTEX` | 12 | **2** (aliased to Important) | **2.0** |

`POINTS__VORTEX_MSRF_MATCH` is *defined as* `POINTS__IMPORTANT_MSRF_MATCH`, so vortex and important
are numerically indistinguishable in scoring; they differ only in CSS class, readable name, chart
colour, and the special-case in `ophis_model__validation.js:1056`.

Note also `MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES = 2` (`params.js:7`) — declared here but
never referenced in `src/`. Dead constant.

### 5.2 The exact multiplier chain

`getMsrfScoreMultiplierForFilter` (`ophis_model__operations.js:463-476`) maps a filter *array
reference* to its multiplier; note the comparisons are **identity comparisons on the array object**,
not on any value:

```js
function getMsrfScoreMultiplierForFilter(msrfFilter) {
    var toReturn = 1.0;
    if ( msrfFilter == MSRF_FILTER__NORMAL ) {
        toReturn = SCORE_MULTIPLIER__NORMAL_MSRF_MATCH;
    } else if ( msrfFilter == MSRF_FILTER__IMPORTANT ) {
        toReturn = SCORE_MULTIPLIER__IMPORTANT_MSRF_MATCH;
    } else if ( msrfFilter == MSRF_FILTER__VORTEX ) {
        toReturn = SCORE_MULTIPLIER__VORTEX_MSRF_MATCH;
    }
    return toReturn;
}
```

`getMsrfScoreMultiplier` (`:478-492`) takes the **maximum** over a Z-date's matches, floored at `1.0`.
So a Z-date's multiplier is exactly one of `1.0` (no MSRF hit), `1.5` (normal hits only), or `2.0`
(at least one important or vortex hit).

`sumUpMsrfMatchSubscore` (`:494-516`) sums the per-hit points but, under the `>= v8` scoring system,
**withholds the first hit whose multiplier equals the overall maximum** — that one hit becomes the
multiplier instead of contributing points:

```js
if ( alreadyFoundScoreMultiplier == false && ithScoreMultiplier == overallScoreMultiplier
     && scoringSystem == SCORING_SYSTEM__GTE_V8 ) {
    alreadyFoundScoreMultiplier = true;
    // Don't add this MSRF number into the base points equation, since it will be the multiplier.
} else {
    toReturn += ithMsrfMatchStruct.points;
}
```

`scoreZDates` (`:418-461`) assembles the final value:

```
operationSubscore = Σ operation.weight            (1 for ALPHA, .5 for beta)
msrfSubscore      = sumUpMsrfMatchSubscore(...)
base              = operationSubscore + msrfSubscore
score             = base                                  if SCORING_SYSTEM__LTE_V7
score             = base × getMsrfScoreMultiplier(...)    if SCORING_SYSTEM__GTE_V8
score             = roundNumberToPrecision(score, DECIMAL_PRECISION__SCORE)
hit_count         = operation_match_structs.length + msrf_match_structs.length
```

Magnitude and tier appear nowhere in that chain.

### 5.3 The matcher and its precedence (`ophis_utils.js:148-218`)

`getMsrfMatch(axialRotationCount)`:

1. `axialRotationCount = roundNumberToAxialRotationPrecision(...)` — 1 decimal place
   (`DECIMAL_PRECISION__AXIAL_ROTATIONS = 1`, `ophis_config.js:371`).
2. **Vortex first**, with tolerance: for each of the twelve values,
   `areEqualWithinTolerance(ithFilterNumber, axialRotationCount, VORTEX_FILTER_MATCH_TOLERANCE)` with
   `VORTEX_FILTER_MATCH_TOLERANCE = .1` (`ophis_config.js:367`). So vortex `21.7` claims
   `21.6, 21.7, 21.8`.
3. **Dead zone**: if the string form ends in `".5"`, return `null`.
   ```js
   // As per Jason, numbers "right in the middle" are counted as no match.
   // Must trend towards either the floor or the ceiling.
   ```
4. `oph_round` the value, then **Important** exact-match, then **Normal** exact-match.

Precedence is therefore **VORTEX → dead-zone → IMPORTANT → NORMAL**, and vortex wins ties by
construction. This is what `params.js:15-16` means when it says the rounded-down vortex numbers
"match" `21` and `76`: a Z-value of `21.6` would `oph_round` to `22`, but never gets there because the
vortex window swallowed it first; a Z-value of `76.2` would round to `76` and score Normal (1 pt,
×1.5), but instead scores Vortex (2 pts, ×2.0).

### 5.4 The comparison chain in `ophis_model__sorting.js`

`sortZDates(filteredZDates, zStructsDict, sortType, scoringSystem)` (`:206-290`). Four sort types,
each with a documented tie-break cascade:

| `sortType` | Primary key | Tie-break 1 | Tie-break 2 | Order |
|---|---|---|---|---|
| `Z_DATE_SORT_TYPE__SCORE` | `zStruct.score` | `hit_count` | `z_date_native_start` | descending (date ascending) |
| `Z_DATE_SORT_TYPE__MSRF` | `sumUpMsrfMatchSubscore(...)` | `sumUpMsrfNumbersThemselves(...)` | `z_date_native_start` | descending |
| `Z_DATE_SORT_TYPE__OPERATIONS` | `operation_score` | `operation_count` | `z_date_native_start` | descending |
| `Z_DATE_SORT_TYPE__HIT_COUNT` | `hit_count` | `z_date_native_start` | — | descending |
| `Z_DATE_SORT_TYPE__DATE` | `z_date_native_start.getTime()` | — | — | ascending |

`sumUpMsrfNumbersThemselves` (`operations.js:518-526`) is the MSRF tie-break — it sums the raw MSRF
**numbers**, so a Z-date matching `2520` outranks one matching `504` at equal subscore. That is the
closest the shipped engine ever comes to a magnitude ordering, and it is a crude proxy: bigger number
wins, regardless of tier.

**Two bugs in this file, both live:**

- **`Z_DATE_SORT_TYPE__OPERATIONS` never uses `operation_score`.** `sorting.js:268-275`:
  ```js
  } else if ( actualSortTypeToUseForThisPair == Z_DATE_SORT_TYPE__OPERATIONS ) {
      if ( operationScore_a == operationScore_b ) {
          sortValueA = operationCount_a;
          sortValueB = operationCount_b;
      } else {
          sortValueA = operationCount_a;      // <-- should be operationScore_a
          sortValueB = operationCount_b;      // <-- should be operationScore_b
      }
      sortOrder = SORT_ORDER__DESCENDING;
  }
  ```
  Both branches are identical, so sorting by "Operations" sorts by operation *count* and silently
  ignores the ALPHA/beta weighting. Contrast the correct `Z_DATE_SORT_TYPE__MSRF` block immediately
  above it (`:258-267`), which does branch properly.
- **The comparator never returns 0.** `sorting.js:284`:
  ```js
  var toReturn = (sortValueA > sortValueB ? -1 : 1);
  ```
  Equal values return `1`, which is not a consistent ordering. In practice the tie-break cascade
  reduces almost everything to `z_date_native_start`, which is unique per Z-date, so this rarely
  bites — but it makes the sort implementation-defined for any genuinely tied pair.

`sortMsrfMatches` (`:292-312`) orders the badges *within* one Z-date by multiplier descending, then
by `rotation_count_z` descending — again, no tier or magnitude.

`filterZDates` (`:3-204`) has one MSRF-relevant clause: the
`SERIALIZED_FIELD__ISO_EVENT_FILTER_MSRF_MATCH` filter drops any Z-date with
`msrf_match_structs.length == 0` (`:175-179`). Binary — no strength threshold exists.

---

## 6 · Recommendation: should the rewrite expose magnitude?

**Yes — and it is a one-file change.**

The rewrite already ships the tiered table and already surfaces *tier* in results when the "Ophis
full" set is selected (`docs/DOMAIN.md:380-382`). Magnitude strictly dominates tier as a ranking
signal: it is per-number rather than per-bucket, it splits Tier VII into five distinct ranks where
tier gives one, it splits Tier III where the source's own list order shows the split was intended,
and it flags the ten Fibonacci-only numbers that tier currently over-credits. Adding it costs one
integer per number.

**The single file to change: `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/src/data/msrf-tiers.js`.**

Concretely:

1. Add `18` to the table. It is not in any tier list — give it its own entry or a `tier: null`
   record — and record `magnitude: 1`. Cite `Ophis MSRF Details.txt:336`.
2. Split the Tier III `numbers` array at index 56 into two magnitude groups (`3` and `4`), or keep the
   array whole and add a `magnitudeOverrides` map. The first 56 entries are magnitude 3; the last 19
   (`693 … 1980`) are magnitude 4.
3. Give the three Tier VII sub-ranks their real magnitudes: `ceta` → 7, `beta` → 8, and split `alpha`
   into `{1008,1224,1260,2016} → 9`, `{504,1512} → 10`, `{2520} → 14`.
4. Carry the magnitude-0 Fibonacci set `{8,13,34,55,89,233,377,610,987,1597}` as an override on
   Tier II, plus `336 → 1`.
5. Add `magnitude` to the value objects `MSRF_TIER_INDEX` stores and to the `MsrfTier` typedef, and
   set `dimensions = magnitude + 1` so the two stay coherent instead of being the same field under two
   names.
6. Optionally add a `MSRF_FIBONACCI` set for the twelve `FIB = 1` numbers — it is one line and it is
   the only surviving trace of the GameSeer table's Fibonacci representation (§1.1).

The §3.5 rule reproduces the workbook's column exactly, so the change is verifiable rather than
asserted. Nothing outside this file needs to move: `msrfTier(n)` keeps its shape and simply returns a
richer record, and any consumer that only reads `.tier` / `.short` is unaffected. If the results table
should display it, the tag can become e.g. `VII α · m10` — but that is a view change and orthogonal to
the data.

**What NOT to do.** Do not wire magnitude into scoring. The engine is bit-exact against the reference
build and the reference build has no magnitude concept; introducing one into the score would break
parity. Magnitude belongs in *display and secondary sort* only — exactly where
`sumUpMsrfNumbersThemselves` currently sits as a crude proxy.

---

## 7 · Corrections to the current rewrite

1. **`docs/DOMAIN.md:307-310`** — *"That count is the number's **magnitude**. Grouping by magnitude
   gives the **tier**"*. Wrong on both halves. The document that coined the term uses magnitude as a
   *finer* value than the tier's dimension count (`magnitude = dimensions − 1`), and grouping by
   magnitude does **not** give the tier: magnitude splits Tier II three ways, Tier III two ways and
   Tier VII five ways.
2. **`docs/DOMAIN.md:462-465`** (glossary, *magnitude & dimension*) — *"a number's **dimension** count
   is how many of the six filters it appears in; that count *is* its **magnitude**"*. Same error, plus
   a second one: "how many of the six filters" cannot be right when Tier VI is 7 dimensions and
   Tier VII is 8–15. Dimensions count *appearances*, including repeats within one filter.
3. **`docs/DOMAIN.md:318`** — the Tier V note *"Appears in all six filters"*. Tier V is 6 dimensions,
   which is not the same as 6 distinct filters, and the tiers above it exceed six. Drop the note.
4. **`docs/DOMAIN.md:323, 333, 380`** and **`docs/WHITEPAPER.md:194`** — *"566 listed · 564 distinct"* /
   *"all 564 distinct numbers"*. The authoritative table is **565** numbers: the workbook's lookup
   range `MSRF_NUMBERS = $E$9:$G$573` carries `18`, which page 9 of `Ophis MSRF Details.txt`
   explicitly flags as the exception found in Jason's Original MSRF Table Image (X, 2024-12-06).
   `src/data/msrf-tiers.js` is missing it.
5. **`docs/DOMAIN.md:314-322`** — the tier count column. Per the magnitude data, Tier III's 75 and
   Tier IV's 27 are a mis-split: the last 19 entries of the printed Tier III list carry 5 dimensions,
   giving a true **III = 56 / IV = 46**. The 75/27 figures should be labelled "as printed" with the
   correction noted, not presented as verified fact. (The counts *were* verified against the PDF's own
   list lengths — that check is still valid; what is new is that the PDF disagrees with the image the
   PDF itself cites.)
6. **`src/data/msrf-tiers.js:1-18`** (header comment) — describes the file as the tiered table
   "transcribed verbatim … in the order the source lists them" and calls the ordering incidental. The
   ordering is **load-bearing**: Tier III's printed order is exactly 56 magnitude-3 entries followed by
   19 magnitude-4 entries. Any future re-sort of that array destroys recoverable information. Add a
   warning.
7. **`src/data/msrf-tiers.js:141-157`** — the `480` tie-break comment reasons that "the larger count is
   the one that cannot be explained away by an omission." The reasoning is guesswork but the **answer
   is right**: the workbook independently assigns `480` magnitude 3 = Tier III. Replace the hedge with
   the citation.
8. **`docs/DOMAIN.md:376-382`, `src/data/msrf.js:3`** — the "PSYFR 87" set is described as *"the
   reference build's NORMAL and IMPORTANT key members plus 19 for the Metonic."* Two of its 87 members
   are in neither the v12 `MSRF_FILTER__NORMAL` nor `MSRF_FILTER__IMPORTANT`: **`19`** (accounted for by
   the Metonic note) and **`1138`**, which appears in no Ophis table anywhere and sits immediately
   after `1134` in the array — almost certainly a typo in the browser build for `1134`/`1128`/`1130`.
   The comment should say "plus 19 for the Metonic and `1138`, which is unattested upstream."
   Do **not** change the value: the parity tests pin it.
9. **No correction needed** to `docs/reverse/03-scoring-msrf.md`. Its multiplier table (`:85-87`),
   precedence claim (`:412`), tolerance constant (`:332`) and the `1.0 | 1.5 | 2.0` multiplier
   statement (`:702-704`) all match `params.js`, `operations.js` and `utils.js` exactly. Confirmed, not
   corrected.
10. **New, previously undocumented engine bug** for `docs/DEVIATIONS.md`:
    `reference/asar/unpacked/src/ophis_model__sorting.js:268-275` — the `Z_DATE_SORT_TYPE__OPERATIONS`
    branch assigns `operationCount_a/b` in *both* arms of its `if`, so sorting by "Operations" silently
    ignores `operation_score` and sorts by raw operation count. If the rewrite reproduces this sort, it
    should reproduce the bug for parity and say so; if it fixes it, that is a deviation and needs an
    entry.

---

## 8 · Open questions

1. Why were `1089` and `9801` excluded from the vortex set when they are non-collapsing survivors and
   multiples of `1089` exactly like the other six? Nothing in any source explains it.
2. Why is the vortex set carried at two decimal scales (`217.8` and `21.7`), and why truncation rather
   than rounding for the small set?
3. What is the provenance of magnitude **14** for `2520`? It breaks the "operative up through eleven
   dimensions" ceiling stated at `Ophis MSRF Details.txt:149-150`.
4. Why does `336` sit in Tier II but carry magnitude 1?
5. Is the Original MSRF Table Image (X, 2024-12-06) recoverable? It is the only primary source for the
   magnitude column, and the workbook is a second-hand transcription of it — with four known typos in
   its *other* column (§2.7 #4), so the magnitude column deserves independent verification too.
6. What was the GameSeer 285-number table? It is the only version with explicit Fibonacci
   representation, and the workbook's `FIB` column is presumably its residue — but no list survives in
   the sources read here.
