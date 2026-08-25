# DOMAIN.md — the vocabulary and system model

The authoritative glossary for NATORI-ON-PSYFR, drawn from Jason Breshears' own Ophis
documents (transcribed in `reference/docs/`, kept on the owner's machine only) and reconciled against the
code that actually ships.

Sources used, all by Breshears unless noted:

| File | What it establishes |
|---|---|
| `d. PREPS.txt` | The system's own account of its parts — Core Algorithm, Holofractal, Isometric, and the six MSRF filters |
| `a. Ophis Operations Flow Chart.txt` | The A/B/C → E/F/G → 42-projection pipeline (May 2019) |
| `g. Ophis Procedural Notes.txt` | The 14 operations, start to finish; 4 ALPHA / 8 beta |
| `f. Ophis Items Not Disclosed - Copy.txt` | What was deliberately withheld; the 2556-day window |
| `Ophis MSRF Details.txt` | The full tiered MSRF table (compiled by a third party from Breshears' data dumps) |

`New Formula.txt` is **not** used. Despite the filename it is a manifestation/mindset note, not
mathematics, and nothing in it bears on the engine.

Two things this document is careful to keep apart: **what the author says the system does**, and
**what the shipped software computes**. Where they differ, both are stated.

---

## 1 · The system in one page

**PREPS** — *Pattern-Recognition Event Prediction System* — is the name of the whole method.
Ophis is the instrument that runs it.

Its premise is relativity between events rather than causation. You give it dates on which
*similar* events occurred; it treats the distance between them as the carrier of the pattern, and
projects that distance forward through a battery of transformations. Breshears frames the payoff
as elimination rather than divination: out of the hundreds or thousands of future dates that could
follow two controls, Ophis discards the ones with no "spatial, mathematical or trajectoral
connection" to the controls, and hands back a short list. His own caution is that not all
projections fire — "one, two or three" of them mark the real return.

### The pipeline, as the flow chart draws it

The flow chart labels every node A through FF. Only **A, B, C are inputs**; everything else is
computed.

```
 A ──┐                     E = |A−B|  ──┐
 B ──┼── D: interval calc  F = |A−C|  ──┼── H  Isometric      → I, J, K      (3)
 C ──┘                     G = |B−C|  ──┘── L  Holofractal    → M, N, O      (3)
                                        └── P  Core Algorithm → P-1…P-12     (36)
                                                                        ───────────
                                                                     42 projections
                                                                             │
                                            CC  MSRF — six filters ──────────┤
                                                                             ↓
                                                              DD  ·  EE  ·  FF
```

- **A** — the first control date.
- **B** — the second control date, and any further dates relevant to A. The system is
  relativity-based, so A and B must be dates on which *similar* events occurred. Two unrelated
  dates produce arithmetic, not a projection.
- **C** — **the date the projection is conducted.** This is *Protocol Prime*.
- **D** — a plain calendar routine measuring the distance in time between every pair of A, B, C.
- **E, F, G** — those distances, in **axial rotations of the Earth** (whole days): E between A and
  B, F between A and C, G between B and C.
- **H** — Isometric Projection → future dates **I, J, K**.
- **L** — Holofractal Recognition Projection → future dates **M, N, O**.
- **P** — the twelve-formula **Core Algorithm** → **Q through BB-1**.
- **CC** — the **MSRF**, six filters, which measure every projection's distance back to A, B and C
  and discard the ones no filter recognises.
- **DD, EE, FF** — the surviving dates in descending order of magnitude: DD is the single date most
  relative to the events of A and B, EE next, FF next.

Fourteen independent operations run against three intervals yields **42 future dates**, all falling
after C. Breshears notes that in practice this collapses to **38 or 39 distinct dates**, because
different operations frequently land on the same day — and that this agreement, not the raw count,
is the thing worth reading. (The rewrite calls that agreement **convergence** and surfaces it as a
first-class output.)

### Why C is a control and not an afterthought

It is tempting to read C as bookkeeping — "when did you run this?" — and drop it. The documents are
explicit that it is not.

1. **It carries two of the three intervals.** With only A and B you have E. Adding C gives you F
   and G as well, so two-thirds of the arithmetic the whole system runs on comes from the moment of
   asking. Delete C and the 42 projections become 14.
2. **It bounds the answer.** Every projection is a date after C. The projection window is measured
   from C, not from A or B.
3. **The author treats it as an interlock.** In the Procedural Notes, Protocol Prime is described as
   a designed-in security measure: without it, Y "can not produce projections with any accuracy
   through Core Algorithm function." In the Items Not Disclosed list it is named as "the key that
   correctly interlocks the Core Algorithm to the MSRF." What that key actually consists of has
   never been published. See §5 — this project reproduces the claim, it does not verify it.

The design consequence for the software is simple and non-negotiable: **the day you cast is an
input.** It is not metadata.

### How the rewrite generalises this

The flow chart hard-codes three controls. NATORI-ON-PSYFR takes **N anchors** and pairs *all* of
them — `src/core/cast.js` runs every unordered pair, N(N−1)/2 of them, and applies every enabled
operation to each.

For N = 3 those pairs are exactly (A,B), (A,C), (B,C) — **E, F and G, by construction**. The
documented model is the N = 3 case of the shipped one. The general pairing is a *superset*, not a
departure: seed three anchors with the third being today and you get the flow chart's cast,
operation for operation.

Two details in `cast.js` are load-bearing and easy to misread:

- Pairing is **all pairs**, never adjacent ones.
- `X1` binds to the **lower-indexed** anchor in list order, not the chronologically earlier one.
  Reordering the anchor list therefore changes which date an `X1+` operation measures from.

---

## 2 · The fourteen operations

The Procedural Notes enumerate them plainly: given Y, "Y is used for 14 different operations all
producing future dates."

| | Operation | Count |
|---|---|---|
| 1 | Isometric Projection | 1 |
| 2 | Holofractal Recognition | 1 |
| 3 | **Core Algorithm** — Core Algo I through XII | 12 |
| | | **14** |

Of the twelve Core Algorithm formulas, **four are ALPHA and eight are beta**. Breshears is specific
about what ALPHA buys you: the ALPHA projections "are future dates that are most likely to produce
events that mirror the events of X-1 and X-2." It is a hierarchy of confidence inside a single cast,
not a separate calculation.

### Isometric Projection — in the author's terms

The simplest operation Ophis performs, and the only one that needs no unusual arithmetic: take the
interval and lay it down again from the far end. The flow chart calls it "duplicating them like a
palindrome."

The reasoning behind it is geometric. Breshears' claim is that every construct — even a holography
"fashioned of all curves and unequal proportions" — has noticeably equidistant parts, and that
epicentral points in nature keep uniform proportion and distance from their perimeters and from one
another. Events that reflect one another, on this view, are often found equally distant from similar
events in linear time. He is candid that it is "not powerfully predictive alone," but says it earns
its place in analysis, "especially when three or more controls are used" — which is precisely the
A/B/C case.

### Holofractal Recognition — in the author's terms

This one is deliberately strange, and the documents insist it stands apart: it is *not* one of the
twelve Core Algorithm functions, and it is **not** the Holoflective filter (see the glossary).

The premise: a sum in our arithmetic is moored to a counterpart in another "dimension of
arithmetic," where it appears as an entirely different system of equations. Two opposing orders of
arithmetic in adjacent dimensions of a holosphere mirror one another — on one side the trajectory
of a problem, on the other what Breshears calls the photo-negative solution. From inside our own
frame that solution is unrecognisable as a solution at all, because we do not see that what we
perceive is generated elsewhere. He anchors the idea to David Bohm ("The Universe is itself a kind
of giant flowing hologram") and to Massimo Citro's argument that the formulas are outside the
creations rather than in them.

Operationally: Y is reconstructed through a lens of fractals to produce its equal in time-space
*within a different order of arithmetic*, and that equal is read back as a date. The consequence is
the interesting part — from our vantage point **no mathematical connection links the controls to the
projected date**. Apparent chaos here, order preserved on the other side.

In the shipped engine the transform is `oph_flip` — the digit-reversal of the rounded interval —
applied to Y and added to an anchor. That is the "different order of arithmetic," concretely.
Whether the digit reversal is the whole of what Breshears meant is not knowable from the published
material; specifics on Holofractal Recognition are on the not-disclosed list.

### The mapping onto shipped code

The reference engine's default operation list lives in the original v12 tree, at
`Ophis_v12_Browser/src/ophis_model__params.js` (outside this repository).
Its entries are commented **"2."** through **"15."** — fourteen operations, numbered from 2 because
the author's own step 1 is the interval calculation itself. The numbering lines up exactly with the
Procedural Notes: **#2 is the Isometric, #3 the Holofractal ("Holo-"), and #4–#15 are the twelve
Core Algorithm formulas, Core Algo I through XII.**

`OPH_PHI` = φ (1.618…), `OPH_PI` = **3.14 truncated, not `Math.PI`**, `OPH_CRV` = 5.08, the Ophis
"curve" constant. `oph_round` rounds; `oph_flip` reverses the digits.

| # | Equation | Rôle | ≤v7 | **v8+** | The author's own description |
|---|---|---|---|---|---|
| 2 | `X2+oph_round(Y)` | **Isometric** | ALPHA | ALPHA | "Y + X2 + Isometric Date" |
| 3 | `X2+oph_flip(oph_round(Y))` | **Holofractal** | ALPHA | ALPHA | "Y reversed + X2 (Holo-)" |
| 4 | `X2+Y/OPH_CRV` | Core Algo I | beta | beta | "Y div. 5.08 + X2" |
| 5 | `X1+(Y/2.0)xOPH_PI` | Core Algo II | beta | beta | "Y div. 2 X 3.14 + X1" |
| 6 | `X2+Y/OPH_PHI` | Core Algo III | **ALPHA** | **ALPHA** | "Y div. 1.618 + X2" |
| 7 | `X2+(Y/2.0)xOPH_PHI` | Core Algo IV | beta | **ALPHA** | "Y div. 2 X 1.618 + X2" |
| 8 | `X1+(Y/2.0)xOPH_CRV` | Core Algo V | beta | beta | "Y div. 2 X 5.08 + X1" |
| 9 | `X2+(Y/2.0)xOPH_PI` | Core Algo VI | beta | beta | "Y div. 2 X 3.14 + X2" |
| 10 | `X2+YxOPH_PHI` | Core Algo VII | **ALPHA** | **ALPHA** | "Y X1.618 + X2" |
| 11 | `X1+YxOPH_PI` | Core Algo VIII | beta | **ALPHA** | "Y X3.14 + X1" |
| 12 | `X2+(Y/2.0)xOPH_CRV` | Core Algo IX | beta | beta | "Y div. 2 X 5.08 + X2" |
| 13 | `X2+YxOPH_PI` | Core Algo X | beta | beta | "Y X3.14 + X2" |
| 14 | `X1+YxOPH_CRV` | Core Algo XI | beta | beta | "Y X 5.08 + X1" |
| 15 | `X2+YxOPH_CRV` | Core Algo XII | beta | beta | "Y X 5.08 + X2" |

ALPHA/beta is encoded as a **weight**, not a flag: `POINTS__ALPHA_OPERATION_MATCH = 1`,
`POINTS__BETA_OPERATION_MATCH = 0.5`, and `isAlphaOperation()` is simply `weight >= 1`.

### The v8 weighting is the canonical one

`cloneDefaultOperationsForAppVersionGte8()` promotes exactly two operations from beta to ALPHA:
`X2+(Y/2.0)xOPH_PHI` (Core Algo IV) and `X1+YxOPH_PI` (Core Algo VIII). Count the ALPHAs among the
twelve Core Algorithm operations under each weighting:

| Weighting | ALPHA among Core Algo I–XII | beta | Matches the documented 4/8? |
|---|---|---|---|
| ≤ v7 | 2 — `X2+Y/OPH_PHI`, `X2+YxOPH_PHI` | 10 | ✗ |
| **v8+** | **4** — `X2+Y/OPH_PHI`, `X2+(Y/2.0)xOPH_PHI`, `X2+YxOPH_PHI`, `X1+YxOPH_PI` | **8** | **✓** |

The Procedural Notes were written independently of the source, and say "There are 4 ALPHA
projections and 8 beta." The v8+ weighting reproduces that split exactly; the pre-v8 weighting
cannot. **That is real evidence the v8+ weighting is the canonical one** and the ≤v7 table is an
earlier, under-weighted draft.

One honest caveat. The *count* matches; the *positions* only mostly do. The Procedural Notes mark
Core Algo **III, VII, VIII and X** as ALPHA. The shipped v8+ table marks **III, IV, VII and VIII**.
Three of four agree. The disagreement is a single formula, and there is no way from the published
material to tell whether the Notes' ordinal numbering of Core Algo I–XII is the same ordering as the
code's list — the twelve formulas themselves were never disclosed under those names. The count
matching 4/8 across two independently produced artefacts is the strong signal; the ordinal
correspondence is a reasonable inference, not a proven one.

### What NATORI-ON-PSYFR ships instead

The rewrite does not ship the fourteen as its default. `src/data/packs.js` defines **"Default 19"**,
nineteen operations that keep the Ophis core (`oph_round`, `oph_flip`, φ, π, the curve) and add the
Archaix cycle lattice (138, 19, 792, 600, 360/365.2422) as first-class operations. Four further
packs — 138, 19 Metonic, Phoenix Lattice, Golden — narrow onto one family each. The classical
fourteen can be reconstructed as a pack; nothing in the engine privileges the default.

The rewrite also does not carry the ALPHA/beta weight per operation. It scores each *projection*
against the cycle lattice instead — see `src/core/scoring/`. That is a deliberate deviation, listed
in [DEVIATIONS.md](DEVIATIONS.md).

---

## 3 · MSRF

**MSRF** = **Multidimensional Spatial Recognition Filter(s)**.

Not "recognition of magnitude," not a single filter — six independent mathematical constructs run in
tandem. Their job is negative: they do not produce dates, they *remove* them. Breshears' term for
what they remove is **potentia** — phantom dates. The Core Algorithm, the Holofractal and the
Isometric projections all cast phantoms; the MSRF decides which projections belong to the same
time-space structure as the controls and which do not.

Mechanically, per the flow chart: the MSRF measures the distance in axial rotations from each of the
42 projections **back to A, B and C**, and runs those distances through the six filters. Projections
no filter recognises are dropped. Those that are recognised get sorted into the tier system.

The flow chart is blunt about when this matters: the MSRF is "absolutely necessary when conducting
blind projections" — casts where the operator has no fixed future schedule to check against. If your
controls are NFL game dates or a known scheduled event, the raw 42 are already usable. If you are
casting into an open calendar, the filters are the whole point.

### The six filters

**a · Annular Chronometric Filter** *(Diurnal Projections)*
Nothing in physics is more fundamental than the planet's axial rotation and its orbit — the day and
the year. Breshears notes that the oldest calendars (Vedic, Sumerian, Mayan) ignored years and
counted days, in denominations of 360. The filter reduces 360 and 365.25 into proportionate
mathematical fractals of varying dimensions and tests target dates against them.

**b · Geodetic Chronometry Filter** *(formerly the Phoenix Sequence Filter)*
A series of numbers Breshears finds recorded in four independent ancient sources — most densely in
the rectilinear measurements of the Great Pyramid, and, he argues, known to Thales when he predicted
the darkening of the sun in 583 BCE, to Aristarchus, and concealed by Nostradamus in the *Centuries*.
He describes the series as lost knowledge with no application outside this world. He credits it with
the single largest increase in Ophis' predictive ability.

**c · Hydrogen Spacing Angle Filter**
Two hydrogen atoms bonded to an oxygen sit at a fixed angle of **105°**. Breshears takes the
water-molecule geometry as more than analogy: what applies to space applies equally to space in
motion — time — making a water-dominant planet and an H₂O-based anatomy interactive within a
"holofield of 105 degree angles."

**d · Fibonacci Sequence Filter** *(formerly the Golden Sexagesimal Filter)*
Minutes, hours, weeks and months are human fabrications that only approximate natural cycles; days
are the oldest real measure. The Earth's rotation as it orbits traces an unending arc of 1.618° —
φ — numerically the Fibonacci series. Neither the Golden Proportion nor the inherited base-60 system
is much use alone, but unified into a third kind of coding they isolate ghost projections well.

**e · Intra-Decimal Matrix Filter**
About fifty numbers important to Ophis' operations, when multiplied into fractals of their
whole-number equivalents, transform into other numbers equally. (The source text on this filter is
the thinnest of the six; specifics are on the not-disclosed list.)

**f · Vortex Holography Filter**
Explicitly *not* the theoretical "vortex math." During development Breshears ran the integers 1
through 15,000 through a program subtracting each number from a holographic reflection of itself.
About 95% collapse to zero — no real value. The surviving ~5% reduce to a series that loops on itself
into a funnel, forever; he calls these **immortal numbers**, patterned in 9- and 11-dimensional
distributions. He reads this as independent confirmation of Lisa Randall's position that we inhabit
a 12-dimensional universe but are confined to 11 in our arithmetic — "if a twelfth dimension exists
it cannot be reached using our own arithmetic" — and as support for Time-Wave Zero. These are the
vortex numbers included in the MSRF.

A note in PREPS records that the former **Orbital Composite Specs** were "completely absorbed into
MSRF" and no longer exist as a separate stage.

### Tiers, dimensions and magnitude

Every MSRF number carries a count: **in how many dimensions of arithmetic it appears** — that is,
across how many of the six filters it shows up, counting repeats. That count is the number's
**magnitude**. Grouping by magnitude gives the **tier**, which Breshears describes as a hierarchy by
orders of magnitude.

The mapping is offset by one — Tier I is *two* dimensions, not one:

| Tier | Dimensions of arithmetic | Numbers | Notes |
|---|---|---|---|
| I | 2 | 281 | The floor of recognition |
| II | 3 | 139 | Includes **2556** — the window itself |
| III | 4 | 75 | |
| IV | 5 | 27 | |
| V | 6 | 14 | Appears in all six filters |
| VI | 7 | 13 | |
| **VII** | **8 or more** | **17** | **Apex Projections** |
| | | **566 listed · 564 distinct** | |

All seven counts were verified against the lists in `Ophis MSRF Details.txt`: every tier's stated
count matches the length of the list printed under it. Two irregularities are **in the source** and
are preserved rather than corrected, because the stated counts only reconcile with them left in
place:

- Tier I lists **468** twice.
- **480** is listed under both Tier I and Tier III.

So 566 entries resolve to 564 distinct numbers. `src/data/msrf-tiers.js` transcribes the table with
the duplicates intact and de-duplicates only in its lookup index.

**Tier VII — Apex Projections.** Numbers appearing in eight or more dimensions of arithmetic. In
Breshears' geometry these are where event-trajectories intersect: the most mathematically visible
periods of time, and therefore possessed of unique predictive properties. The operative rule given
for them is an override — *an Apex Projection targeting a date also targeted by a lower-tier
projection automatically overrides any Core Algorithm projected dates.* Tier VII subdivides again:

| Tier VII | Numbers | The set |
|---|---|---|
| **ceta** (lesser) | 5 | 930 · 1080 · 1134 · 1440 · 1800 |
| **beta** | 5 | 840 · 1242 · 1296 · 1680 · 2160 |
| **alpha** (greater) | 7 | 504 · 1008 · 1224 · 1260 · 1512 · 2016 · 2520 |

The alpha row is the top of the entire system — and reads as a highly-composite ladder: 504, its
double 1008, 1260, 1512, 2016, 2520 (= LCM 1–10).

Note the spelling: Tier VII's lowest band is **ceta**, as the source writes it. It is unrelated to
the ALPHA/beta weighting of operations in §2, which is a different axis entirely — operations carry
ALPHA/beta, *numbers* carry tiers.

### MSRF table versions

Not all MSRF tables are alike; the set grew as numbers were found.

| Version | Total | Fibonacci | Vortex | In tier lists |
|---|---|---|---|---|
| GameSeer | 285 | yes | no | all |
| Ophis 2.0 (HTML) | 388 | few, not marked | yes | 328, with 60 unassigned |
| Ophis 3.0+ (app) | 390 | few, not marked | yes | 329, with 61 unassigned |

The unassigned numbers — including the fractional vortex values 21.7, 32.6, 43.5, 65.3, 76.2, 87.1,
217.8, 326.7, 435.6, 653.4, 762.3, 871.2 — appear to be later findings not yet run through the tier
categorisation.

The v12 engine splits its table three ways in `ophis_model__params.js`: `MSRF_FILTER__NORMAL`,
`MSRF_FILTER__IMPORTANT` and `MSRF_FILTER__VORTEX`, scoring 1, 2 and 2 points respectively — an
"important" match and a vortex match are worth the same. `MSRF_FILTER__IMPORTANT` skews heavily to
the upper tiers — 14 of the 17 Apex Projections are in it (930, 1242 and 1680 are the absentees),
along with 10 of Tier V and 8 of Tier VI — but the correspondence is approximate, not a clean
partition by tier.

**What NATORI-ON-PSYFR ships:** two selectable resonance sets, in `src/data/msrf.js`.

- **PSYFR 87** — the default, and what the parity tests pin. 87 numbers: the reference build's
  NORMAL and IMPORTANT key members plus 19 for the Metonic, as a flat `Set` with no tier weighting.
- **Ophis full** — the complete tiered table from `src/data/msrf-tiers.js`: all 564 distinct
  numbers, each carrying its tier, so a hit can be reported as *which* tier it landed in.

Either way a projection scores an MSRF hit when *either* the interval Y *or* the day-offset is a
member. Both files are plain data and are meant to be edited.

---

## 4 · Glossary

**PREPS** — Pattern-Recognition Event Prediction System. The method; Ophis is the instrument. Named
in full at the head of both the PREPS document and the flow chart.

**X-Date · anchor** — an input date. In the original the two controls are **X-1** and **X-2**; the
flow chart calls the same things A and B. The rewrite calls them anchors and accepts any number of
them. A cast needs at least two.

**Y · axial rotation** — the distance in time between two controls, measured in **axial rotations of
the Earth** — whole days. Not hours, not timezones, not calendar months. The Procedural Notes make
Y the hinge of the entire system: "Y is used for 14 different operations all producing future
dates." Breshears prefers "rotation" to "day" because the rotation is the physical constant and the
day is the label we hung on it.

**Z-Date · projection** — the date an operation lands on: an anchor plus a day-offset derived from
Y. The flow chart's I through BB-1, and DD/EE/FF after filtering.

**Protocol Prime** — the third control date: **the date the projection is conducted**. Node C in the
flow chart. Two of the three intervals (F and G) exist only because of it, and every projection
falls after it. The author additionally describes it as a security interlock — the key that
"correctly interlocks the Core Algorithm to the MSRF," without which Ophis cannot project
accurately, so that an unauthorised user cannot use the system. That key has never been disclosed
(§5). In this project Protocol Prime is simply modelled as an anchor: seed today's date as your
third anchor and the cast is the documented one.

**Isometric Projection** — the simplest Ophis operation. The interval is laid down again from the
far control, palindrome-fashion, producing an equidistant future date. Justified by the claim that
events which reflect one another are often equally distant from similar events in linear time. Weak
alone; useful with three or more controls. Flow chart node **H**; shipped as
`X2+oph_round(Y)`.

**Holofractal Recognition Projection** — an event-prediction routine *independent of* the Core
Algorithm and not one of its twelve functions. Y is reconstructed through a lens of fractals into
its equivalent in a different order of arithmetic, and read back as a date. Its signature is that
no mathematical connection is visible from our side between the controls and the projection. Flow
chart node **L**; shipped as `X2+oph_flip(oph_round(Y))`.

**Holoflective** — a *filter*, and one of the not-disclosed items ("Holoflective Numbers"). PREPS
explicitly warns against conflating it with the Holofractal projections: "This is not to be confused
with the Holoflective filter." They are different things at different stages — Holofractal
*produces* dates, Holoflective *filters* them. Nothing beyond the name has been published.

**Core Algorithm** — the twelve separate and distinct formulas at the centre of Ophis, built on
well-known physics constants "reconfigured" — used in an unconventional way that treats fractal
equivalents as equal in proportion to their wholes. They break the linear distances E, F and G apart
and recalculate new trajectories. Flow chart node **P**. The twelve formulas themselves are on the
not-disclosed list; what ships in the v12 engine is §2's table.

**ALPHA vs beta** — the hierarchy of accuracy *among operations*. Four of the twelve Core Algorithm
formulas are ALPHA, eight beta. ALPHA projections are the dates most likely to produce events
mirroring the controls. In code this is a weight — 1 for ALPHA, 0.5 for beta — and the v8+ default
weighting is the one that reproduces the documented 4/8 split.

**MSRF** — Multidimensional Spatial Recognition Filter(s). Six independent constructs
(§3) run in tandem to eliminate phantom dates from the projections. Distinct from the Core
Algorithm: the Core Algorithm produces, the MSRF prunes.

**vortex number** — one of the ~5% of integers that, subtracted from a holographic reflection of
themselves, do not collapse to zero but loop into a self-referring funnel. Breshears calls them
immortal numbers and finds them patterned in 9- and 11-dimensional distributions. Not to be confused
with theoretical "vortex math." Their filter is the sixth MSRF filter; in the shipped table they are
a small set of fractional values scoring the same as an "important" match.

**Apex Projection** — a Tier VII MSRF number, appearing in eight or more dimensions of arithmetic.
Held to mark where event-trajectories intersect in the holosphere: the most mathematically visible
periods of time. An Apex Projection landing on a date a lower tier also targets overrides the Core
Algorithm's own ranking. Seventeen of them, split ceta / beta / alpha.

**potentia · phantom date · ghost projection** — three names for the same thing: a projection the
arithmetic produces but the pattern does not support. Every one of the fourteen operations casts
phantoms; removing them is the MSRF's entire job. The flow chart titles its second section
"Filtering Out Ghost Projections."

**magnitude & dimension** — a number's **dimension** count is how many of the six filters it appears
in; that count *is* its **magnitude**. Magnitude is what makes DD outrank EE outrank FF among the
surviving dates. In the MSRF source, "dimensions of arithmetic" is called the golden value: it says
how many independent filters independently found the same number.

**tier** — the bucket a number's magnitude puts it in. Tier I = 2 dimensions, II = 3, III = 4,
IV = 5, V = 6, VI = 7, VII = 8+. Tier VII is the Apex Projections and subdivides into ceta (lesser),
beta, and alpha (greater).

**the 2556-day window** — Ophis projects within **2556 days = 7 years**, and the author is precise
about what that means: *seven years past and future linearly, not seven years into the future*.
The bound is not mathematical but practical — he says he never personally needed more. He also says
the window could be extended to at least twenty years, but not by patching this version: the
constructs are integrated tightly enough that a 20-year Ophis "would have to be started completely
from scratch." A nice confirmation that the figure is structural and not arbitrary: **2556 is itself
a Tier II MSRF number**, and 2555 is Tier I.

**Annus Mundi (AM)** — years from the creation epoch of 3895 BC. `AM = astronomical year + 3894`
(`src/data/lattice.js`). The Archaix dating frame.

**Long-Count (LC)** — `LC = astronomical year + 3112`, from the Mesoamerican Long Count epoch. 2026
CE is LC 5138 — the 138-faced year, which is why the rewrite's masthead reads 19138 · 83191.

**Phoenix 138** — the Phoenix / Sky Dragon cycle, 138 years, the spine of the Archaix lattice. A
node falls where `year mod 138 = 108`: 1902, 2040, 2178.

**Nemesis 792** — the Nemesis X orbit, 792 years, with a 60-year inner arc, phased from
astronomical year 462.

**NER 600** — the Anunnaki NER, a 600-year period phased from astronomical year 162. In Sumerian
reckoning the *ner* is 600 of something; Archaix reads that something as years here.

**Metonic 19** — 19 solar years ≈ 235 lunations, the classical cycle after which sun and moon
return to the same relation on the same calendar date. Used in the rewrite as a resonance test
against the reference year.

**šar (sar)** — in standard Sumerology, 3600 of a unit; as a king-list interval, 3600 years.
**Archaix reckons it differently, and so does this engine: one šar is a single turning of the stars
— one day.** `anunnaTurnings()` in `src/core/cycles.js` counts days since the Annus Mundi epoch on
that basis. This is a thesis-internal redefinition and is flagged as such wherever it surfaces.

---

## 5 · What the author has not disclosed

`Ophis Items Not Disclosed` is a short, candid list. The following remain unpublished, held "in
secure locations installed on drivers":

- **The 12-formula Core Algorithm itself.**
- **Protocol Prime** — the key that interlocks the Core Algorithm to the MSRF.
- **The MSRF tier hierarchy specifics**, and the Tier VII ceta/beta/alpha division.
- **Specifics on six components** — Diurnal Projections, Fibonacci Projections, the Fibonacci
  Projection Subroutine, the Geodetic Chronometry Filter, Holoflective Numbers, the Hydrogen Spacing
  Angle, and the Intra-Decimal Matrix Filter.
- **19 pages of VBA** implementing the Core Algorithm (programmer templates).
- **A working Excel Core Algorithm spreadsheet**, with the MSRF not enabled.
- **Specifics on Holofractal Recognition Projection.**
- **Vortex Holography research and charts.**

The tenth item is not a withholding but a scope statement: the 2556-day window, why it is 2556, and
what extending it would cost.

### What follows from that, stated plainly

Most of the interpretive layer is missing. The tier hierarchy has since been reconstructed from data
dumps by a third party (`Ophis MSRF Details.txt`), and §3 above uses that reconstruction — it is
consistent and it checks out internally, but it is not the author's own specification.

More importantly:

> **The shipped operation table is what the software actually computes.** Whatever the twelve Core
> Algorithm formulas may be in their undisclosed form, what runs — in the original v12 engine and in
> this rewrite — is the fourteen equations in §2 and nothing more.

Two specific claims should be read as the author's claims, reproduced here as such, **not verified
by this project**:

1. **The 75.9% accuracy figure.** The Procedural Notes state that an automated Ophis "can provide
   either one date with a 75.9% accuracy or more dates if user seeking windows of opportunity." No
   methodology, sample, base rate, definition of a hit, or scoring window accompanies it anywhere in
   the supplied documents. A three-significant-figure accuracy claim with no denominator is not a
   measurement. This project makes no accuracy claim of any kind.

2. **Protocol Prime as a precision gate.** The claim that Y "can not produce projections with any
   accuracy through Core Algorithm function unless Protocol Prime is carried out" is unfalsifiable
   as published, because Protocol Prime was never published. In the shipped arithmetic, C's only
   effect is the one described in §1: it supplies two of the three intervals and bounds the window.
   That effect is real, structural, and sufficient reason to keep C as a control. It is not a
   cryptographic gate, and this project does not model one.

Neither claim is dismissed here. Both are recorded as attributable statements by the author, held
separate from what the code demonstrably does.

---

## 6 · Provenance & framing

NATORI-ON-PSYFR is a **worldbuilding and study instrument**. It renders the Archaix thesis of Jason
Breshears — the *Chronicon*, the *Doomsday Chronology*, the 337 charts, the ANUNNA Files — as a
working calendrical engine you can drive.

The thesis is presented **as that thesis, and not as established science.** The Phoenix 138 cycle,
the Nemesis 792 orbit, the NER 600, the Annus Mundi epoch of 3895 BC, the šar-as-single-turning
reckoning, the 105° holofield, the vortex numbers, the Apex override rule, the 75.9% figure — every
one of these is a claim internal to the Archaix corpus. Deep-past conversions in this engine are
*cycle-true* rather than historically observed: they are what the cycles say, not what a historian
would date. The engine is faithful to the thesis; it does not vouch for it.

Where this project's own reasoning enters, it is marked as such. The strongest inference in this
document is §2's argument that the v8+ weighting is canonical — and that argument is offered with
its own caveat attached, because the count matches and the positions only mostly do.

This document quotes the source sparingly and by design. The Breshears PDFs are the author's
copyrighted work; the material here is summarised in this project's own words, with short attributed
phrases only where the exact wording carries the meaning. The transcriptions in
`reference/docs/` are for local study, not redistribution.

Not affiliated with Archaix.

---

### Related documents

- [MODDING.md](MODDING.md) — how to change the packs, constants, lenses, MSRF set and lattice.
- [DEVIATIONS.md](DEVIATIONS.md) — where this rewrite deliberately differs from the original engine.
- [`reverse/`](reverse/) — the full fifteen-part reverse-engineering study of Ophis v12.
- `reference/docs/` — the author's documents, transcribed; on the owner's machine only.
