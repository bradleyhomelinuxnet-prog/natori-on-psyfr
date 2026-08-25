# 22 · The author's own source documents

**Assignment:** the design documents Jason M. Breshears wrote *before* the software existed —
read against the shipped `Ophis_v12_Windows.exe` behaviour to find where the implementation
followed the design and where it drifted.

**Primary sources, read in full:**

| File | Pages | What it is |
|---|---|---|
| `a. Ophis Operations Flow Chart.pdf` | 4 | The system flow chart, `[A]`–`[I]`, dated May 2019 |
| `d. PREPS.pdf` | 9 | *Pattern-Recognition Event Prediction System* — the six MSRF filters, in prose |
| `f. Ophis Items Not Disclosed (Copy).pdf` | 2 | What the author deliberately withheld |
| `g. Ophis Procedural Notes.pdf` | 4 | The 14 operations, start to finish, with their ALPHA/beta classes |
| `MSRF Magnitude Calc-v2.xlsx` | 1 sheet | The author's own MSRF lookup workbook — 565-number master list plus the 390 that reached the app |

**Headline result:** the shipped engine implements the flow chart faithfully, but through a
*generalisation* the author never described — and two of the fourteen operations carry a class the
author's own notes contradict.

---

## 1 · The flow chart, and what "Protocol Prime" is

The chart labels its stages `[A]` through `[I]`:

| Label | Meaning |
|---|---|
| `A` | the first date entered |
| `B` | the second and all subsequent relevant dates |
| `C` | **the date the projection is being conducted** — annotated *[Protocol Prime]* |
| `D` | the date-calendar that measures the distances |
| `E` | axial rotations between `A` and `B` |
| `F` | axial rotations between `A` and `C` |
| `G` | axial rotations between `B` and `C` |
| `H` | Isometric Projection → `I`, `J`, `K` (one future date from each of E, F, G) |
| `L` | Holofractal Recognition → `M`, `N`, `O` |
| `P` | Core Algorithm, `P-1` … `P-12` |
| `CC` | the MSRF, measuring every projection back to `A`, `B` **and** `C` |
| `DD`/`EE`/`FF` | the top three surviving dates, in descending magnitude |

So the design has **three spans, not one**: 14 operations × 3 spans = **42 future dates**, which the
chart says collapse to "most often only 38 to 39 actual dates … because different Ophis operations
have targeted the same date."

### 1.1 The reconciliation

The shipped engine has no `A`/`B`/`C` at all. It takes N X-Dates and enumerates **all unordered
pairs**. Those two descriptions are the same system:

```
3 X-Dates  ->  C(3,2) = 3 pairs  =  E, F, G
3 pairs x 14 operations          =  42 projections
z-struct bucketing on the day    =  "38 to 39 actual dates"
```

Every number in the author's conclusion falls out of the shipped code exactly, provided the
operator enters `C` as a third X-Date. The engine generalised `A`/`B`/`C` to N anchors and lost the
vocabulary in the process.

**Therefore: Protocol Prime is a procedure, not a code path.** It is the instruction to always
enter the date the projection is being conducted on as a control alongside the two historical
dates. The author's claim in *Items Not Disclosed* — that "unauthorized user of Ophis can not use
system to predict future events (unless Protocol Prime was revealed to this person)" — describes
an operator who enters only `A` and `B`, gets 14 projections instead of 42, and never sees the two
thirds of the output that `F` and `G` generate.

Nothing in the code enforces or hints at this. It is the single highest-value undocumented
operating instruction in the whole corpus, and it costs one extra X-Date.

### 1.2 Where the implementation is narrower than the design

`CC` says the MSRF "measures the distance in axial rotations between all 42 projected dates back to
**A, B and C**". The shipped engine probes exactly one number per projection —
`rotation_count_z`, the offset from the operation's own base anchor. The distances back to the
*other* controls are never computed and never filtered on.

That is a real reduction in the MSRF's reach, and it is invisible from the UI.

**Measured, on the `test-bradley` fixture** (114 surviving Z-Dates), probing every projection back
to every enabled control instead of one:

| | today | with three distances |
|---|---:|---:|
| rows carrying at least one resonance match | 39 | **101** |
| rows with no match at all | 75 | 38 |
| total resonance matches | 40 | 124 |
| maximum hit count | 4 | **8** |

**54 % of rows would gain a match, and half the currently-silent rows would light up.**

That is not a refinement, it is a different instrument — and it argues *for* the shipped
behaviour rather than against it. The MSRF exists, in the author's own words, "to aid the Core
Algorithm in the elimination of potentia, or phantom dates." A filter that matches half of what it
previously rejected has lost most of its discriminating power. Whoever narrowed it to one distance
may well have been fixing exactly that.

Recorded, not changed. Parity comes first, and here the numbers agree with parity.

---

## 2 · The fourteen operations and their classes

`g. Ophis Procedural Notes.pdf` numbers the operations 1–14 and states a class for each. Compared
against the shipped weights (`>= 1` is Alpha, `< 1` is Beta):

| # | Author's name | Shipped equation | Weight | Shipped | Author | |
|---|---|---|---|---|---|---|
| 1 | Isometric Projection | `X2+oph_round(Y)` | 1 | Alpha | ALPHA | ✓ |
| 2 | Holofractal Recognition | `X2+oph_flip(oph_round(Y))` | 1 | Alpha | ALPHA | ✓ |
| 3 | Core Algo I | `X2+Y/OPH_CRV` | 0.5 | Beta | beta | ✓ |
| 4 | Core Algo II | `X1+(Y/2.0)xOPH_PI` | 0.5 | Beta | beta | ✓ |
| 5 | Core Algo III | `X2+Y/OPH_PHI` | 1 | Alpha | ALPHA | ✓ |
| 6 | **Core Algo IV** | `X2+(Y/2.0)xOPH_PHI` | **1** | **Alpha** | **beta** | ✗ |
| 7 | Core Algo V | `X1+(Y/2.0)xOPH_CRV` | 0.5 | Beta | beta | ✓ |
| 8 | Core Algo VI | `X2+(Y/2.0)xOPH_PI` | 0.5 | Beta | beta | ✓ |
| 9 | Core Algo VII | `X2+YxOPH_PHI` | 1 | Alpha | ALPHA | ✓ |
| 10 | Core Algo VIII | `X1+YxOPH_PI` | 1 | Alpha | ALPHA | ✓ |
| 11 | Core Algo IX | `X2+(Y/2.0)xOPH_CRV` | 0.5 | Beta | beta | ✓ |
| 12 | **Core Algo X** | `X2+YxOPH_PI` | **0.5** | **Beta** | **ALPHA** | ✗ |
| 13 | Core Algo XI | `X1+YxOPH_CRV` | 0.5 | Beta | beta | ✓ |
| 14 | Core Algo XII | `X2+YxOPH_CRV` | 0.5 | Beta | beta | ✓ |

Twelve agree. The two that do not are a **transposition**, and the totals still balance: the author
specifies "4 ALPHA and 8 beta" among the twelve Core operations, and the shipped table has exactly
four Alphas there too — just not the same four.

### 2.1 The likely mechanism

Ordinals 9 and 11 are the `YxOPH_PI` pair — the `X1` and `X2` variants of one formula. The author
marks *both* Core VIII and Core X as ALPHA, i.e. both members of that pair.

The v12 source annotates two rows as promotions made at v8:

- ordinal 9, `X1+YxOPH_PI`, *"radius projection, promoted at v8"* — **restores** the author's class
- ordinal 5, `X2+(Y/2.0)xOPH_PHI`, *"original beta phi 6, promoted at v8"* — **contradicts** it

So v8 promoted two operations, got one right, and promoted `X2+(Y/2.0)xOPH_PHI` where the author's
numbered list points at `X2+YxOPH_PI`. An off-by-one while reading a hand-numbered list is the
simplest explanation that fits every fact.

**Not changed.** The weights feed `operation_score` directly, so moving either one shifts every
score in every projection. The shipped table is what the owner's results have always been computed
from, and parity is the contract. The finding is recorded so the choice can be made deliberately.

Operations 15 and 16 (`X1+YxOPH_HEP`, `X2+YxOPH_HEP`) postdate these documents entirely — added
Aug and Dec 2025, both Alpha, and unmentioned in any author source.

---

## 3 · The MSRF workbook — an independent check on the extracted arrays

`MSRF Magnitude Calc-v2.xlsx` holds two tables on one sheet:

| Range | Defined name | Contents |
|---|---|---|
| `E9:G573` | `MSRF_NUMBERS` | **565** numbers, each with a Fibonacci flag and a "Magnitude" 0–14 |
| `I9:K398` | — | **390** numbers, each with a Category (Normal / Important / Vortex) and Score (1 / 2) |

The 390-row table is the app's own filter set, and checking it against the arrays lifted out of
`ophis_model__params.js` is the first fully independent verification of that extraction:

| Tier | From the binary | From the workbook | Agreement |
|---|---|---|---|
| Normal | 325 | 325 | 321 of 325 |
| Important | 53 | 53 | **53 of 53** |
| Vortex | 12 | 12 | **12 of 12** |

The counts confirm the disputed figure: **325 Normal, not the 276** that
`Ophis_v9_DeepDive_Addendum.md` and `Ophis_v12_ReverseEngineering_Report.md` both claimed.
Important and Vortex match perfectly, member for member.

### 3.1 The four Normal disagreements, and the ruling

| Binary | Workbook | In the 565-number master? | Ruling |
|---|---|---|---|
| `238` | `236` | **238 yes** (magnitude 1) · 236 no | binary |
| `476` | `478` | **476 yes** (magnitude 2) · 478 no | binary |
| `493` | `496` | neither | unresolved |
| `582` | `562` | neither | unresolved |

All four are single-digit differences and three of them are a `6`/`8` confusion — the signature of
a list transcribed by hand. Where the master list can arbitrate it backs the binary twice and the
workbook never, so **the shipped values stand**. `493` and `582` are unresolved: neither they nor
their counterparts appear in the master at all, which is an inconsistency inside the author's own
material rather than an implementation defect.

### 3.2 New data: the magnitude master

The 565-number table is a source the study did not previously have. It supplies, per number:

- a **Fibonacci flag** — set for 8, 13, 21, 34, 55, 89 … confirming the Fibonacci Sequence Filter
  operates on the true series;
- a **Magnitude** on a 0–10 scale (plus one 14), which spec 19 §3.2 derived independently as
  `dimensions − 1`. The workbook is consistent with that derivation.

Only 390 of the 565 reached the app, so the master is roughly 1.45× the shipped filter.

---

## 4 · The projection window: 2556 vs 2559

*Items Not Disclosed* is explicit:

> Ophis window of projections is within a 2556 day period [7 years].

The shipped default for `iso_event_filter_beyond_max_days_value` is **2559**, because the code
reuses `HIGHEST_MSRF_NUMBER` — the largest member of the Normal filter — for the filter's default.
The two constants have no relationship; they collided because one happened to be near the other.

The author also notes the window "can be expanded to at least 20 years", but that "this expansion
can not be added to this 2556-day Ophis version" — a 20-year build would have to start from
scratch. That is the authoritative answer to any request to widen the horizon: it is not a
configuration change.

Left at 2559 for parity. It is a user-editable field, so anyone wanting the author's stated window
types `2556`.

---

## 5 · The six MSRF filters, in the author's words

`PREPS.pdf` gives each filter a rationale. Summarised, because the names alone have been carried in
the code with no explanation of what they mean:

| Filter | What it is built from |
|---|---|
| Annular Chronometric *(Diurnal Projections)* | 360 and 365.25 reduced to "proportionate mathematical fractals of varying dimensions" |
| Geodetic Chronometry *(formerly Phoenix Sequence)* | a number series the author traces to the Great Pyramid, Thales, Aristarchus and Nostradamus |
| Hydrogen Spacing Angle | the 105° H–O–H bond angle of water, applied to "space in motion" |
| Fibonacci Sequence *(formerly Golden Sexagesimal)* | phi and the base-60 system "unified into a third kind of coding" |
| IntraDecimal Matrix | "about 50 numbers … when multiplied into fractals of their whole number equivalents transform into other numbers equally" |
| Vortex Holography | the reverse-and-subtract orbit over 1–15 000; ~95 % of numbers collapse to zero, the surviving ~5 % loop forever |

The Vortex description matches `docs/VORTEX.md` exactly — that decode was reached independently
from the twelve shipped literals, and the author's account of how he found them (running 1–15 000
through a program that "subtracted every number from a holographic reflection of itself")
confirms the reverse-and-subtract mechanism.

---

## 6 · What the author withheld

Recorded so that no future reader mistakes absence for oversight. Per *Items Not Disclosed*, these
were never shipped and are not recoverable from the binary:

- the 12-formula Core Algorithm **as the author conceives it** (the shipped equations are the
  implementation, not the derivation);
- **Protocol Prime** as a formal key — though §1.1 above reconstructs its operational meaning;
- the MSRF tier hierarchy specifics, and the Tier VII alpha/beta/ceta split;
- the internals of the Geodetic Chronometry, Hydrogen Spacing Angle and IntraDecimal Matrix
  filters, of Diurnal and Fibonacci Projections, and of Holoflective Numbers;
- 19 pages of VBA templates and the working Excel Core Algorithm sheet with MSRF disabled;
- the Holofractal Recognition Projection specifics;
- the Vortex Holography research and charts.

The shipped app therefore contains the *outputs* of six filters compressed into three flat number
arrays. The filters themselves have never existed in code — a point worth holding onto, because
"implement the Geodetic Chronometry Filter" is not a task the binary can be mined for.

---

## 7 · Consequences for this rebuild

| Finding | Action taken |
|---|---|
| Protocol Prime = enter the projection date as a third control | Documented; engine already supports it via all-pairs |
| MSRF should probe distances back to every control | Measured (§1.2): it would add matches to 54 % of rows and double the peak hit count. **Not** implemented — parity, and the numbers agree |
| Core IV / Core X class transposition | Recorded; shipped weights **kept** |
| 4 Normal numbers disputed | Ruled for the binary on evidence; shipped values **kept** |
| 2556 vs 2559 day window | Recorded; default **kept** at 2559, field is editable |
| Magnitude / Fibonacci master (565 numbers) | New data source, available for a future filter rebuild |
