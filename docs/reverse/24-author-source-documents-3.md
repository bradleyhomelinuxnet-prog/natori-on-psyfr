# 24 · The author's source documents, third set

**Assignment:** read the design documents not covered by [22](22-author-source-documents.md) or
[23](23-author-source-documents-2.md) against the rebuild, record what is new, and build what can be
built without inventing a rule. Everything built here lives in the **Lab** screen and in Settings →
S3, reads a finished run, and changes no score.

**Primary sources, read in full** (the documents themselves are not reproduced here):

| File | Pages | What it is | New? |
|---|---|---|---|
| `e. Programmer Instructions` | 3 | The author's brief to the original programmer, written against his Excel template | **Yes**: per-anchor columns, the validity rule, the look-ahead (§1) |
| `Holoflective Sums` | 3 | A table of sums and their digit reversals | **Yes**: new data (§2) |
| `Ophis data input after sunset` | 2 | A research-group guide to entering evening events | **Yes**: a procedure, for beginners (§3) |
| `The Metonic Cycle` | 11 | An illustrated folio on the Metonic and Callippic cycles and the Antikythera mechanism | Context: moon cycles (§4) |
| `Core Algorithm Operations` | 2 | The subroutines, named and described in prose | Partly: two are not computable (§5) |
| `MSRA Key to Constructional Programming` | 1 | The nine filter families and the MSRF number list | No: matches the shipped MSRF (§6) |
| `Ophis_V3_0_0_Release_Notes` | 1 | The programmer's notes for the version that introduced scope and the chart | Context only (§7) |

The other twelve files shared alongside these were read in 22 and 23, and `Ophis_v9_Windows.exe` is
the binary the teardown in this folder came from.

---

## 1 · Programmer Instructions

The brief describes the author's Excel template: X1 and X2 in two cells, the day count Y in F7, and
fourteen formulas run on it. Three things in it are not in the shipped program.

### 1.1 A column per X-date

> "The H and I columns in the current Excel spreadsheet are merely how many times the Earth has
> rotated on its axis since the X-dates … if 7 X-dates are entered then there must be seven columns."

Those columns show the **MSRF Tier** of each count — "the actual number never need be shown in the
H/I columns, only the Tier number", I to VII, with VII as VII.c, VII.b or VII.a.

The engine probes one number per projection: the count from the anchor that made it. The columns ask
for every anchor, so a Z-Date can resonate with a date that did not project it.

**Built:** Lab → *L3 · Every anchor's count* (`anchorMatrix` in `src/core/ophis/lab.js`). Tiers come
from the source's seven-tier table already transcribed in `src/data/msrf-tiers.js` ([19](19-msrf-magnitude-system.md)),
not from the 390 numbers the engine scores with, so a tier there is a reading and never a score. On the
worked example the top row, 09/29/2027, is 405 rotations from X2 (Tier III) and 204 from X3 (Tier II),
though neither projected it.

### 1.2 The validity rule

> "After the first two, isometric and holofractal, which have no significance unless their projected
> dates also appear on the MSRF … beta dates need to be supported by either a second beta projection hit
> or by a hit on the MSRF to be valid. ALPHA dates need no correspondence with another Core Algorithm
> projection or the MSRF to be valid."

The shipped program scores every hit and never applies this. Read as a rule on a Z-Date, it stands if:

- it has an MSRF match; or
- it has an ALPHA hit (weight 1 or more) from any operation but the isometric (#1) and holofractal (#2)
  shapes, on either anchor; or
- it has two or more hits from those other operations.

The isometric and holofractal projections are recognised by their equation, `X?+oph_round(Y)` and
`X?+oph_flip(oph_round(Y))`, so the Mirrors' X1 versions count as them too. Their weight of 1 does not
make them ALPHA here: the brief sets them apart before the ALPHA/beta hierarchy begins.

**Built:** Lab → *L1 · Switches* → *Author's validity rule*, off by default (`validity` and
`applyValidity`). It is a reading view: the results table sets aside the rows that fail and its caption
says how many; the run, the chart and the exports keep every row. On the worked example it keeps 74 of
the 114.

### 1.3 How far ahead to look

> "If X-dates are within 30 days of time when Ophis system run then the future dates sought for could be
> anywhere within a few days to approx. 5 months away. If back dates are within 60 days … a week to
> approx. a year away. If the controls are 5 days apart then … 5 to about a month in the future."

**Built:** Lab → *L2*, and a coaching tip on Start here (`horizon`). Read from the latest enabled
X-date and the closest pair; silent when none of the three cases applies.

### 1.4 Restated, not new

The 3-year limit, the 5-or-more dates beyond it, and "periods of dates … predicted with greater
accuracy" are the SOP limits already in 23 §3 and `src/core/ophis/sop.js`. The after-sunset rule is §3
below. The MSRF figures given here (2556 days, 566 numbers, nine filters) are those of the master table
discussed in 19 and 22 §3.2. The closing *Security* and *Assessment* paragraphs are about selling the
system and are not read further.

---

## 2 · Holoflective Sums

> "Holoflective sums are the reverse of sums in our dimension, what they appear on The Other Side."

A table of **75** pairs over three pages (16, 32, 27), each a sum and its digit reversal: 12 ⇄ 21,
405 ⇄ 504, 2532 ⇄ 2352. Twelve carry an asterisk, "when BOTH the sum and its reflection are MAJOR
numbers". The source is not symmetric about it — 216 is starred and 612 is not; 621 is starred and 126
is not — and the transcription keeps that.

The note distinguishes these from the Holoflective *projection*, operation #2, which reverses Y itself.
It also credits the method with **2178**, "the Immortal Loop Number" (2178 × 4 = 8712, its own
reversal); 217.8 is already one of the shipped Vortex numbers.

**Built:** `src/data/holoflective.js` (data, source order) and a **Holo** tag beside Geodetic and
Diurnal (`HOLOFLECTIVE_LIST` in `tags.js`), off by default, switched on in Settings → S3 or the Lab.
It uses the same rule as the other lists: a contributor's rotation count within 0.1 day of a sum. 2178
is tagged with them. The Lab's gap table also gives each Y's reflection when the table has one: on the
worked example X1→X4 = 255, reflection 552. `tests/lab.test.mjs` checks every pair is a true digit
reversal, which also guards the transcription.

---

## 3 · Input after sunset

A research-group guide with screenshots of v12. Ophis counts days by the Earth's rotation and the day
turns at sunset, so an event after sunset belongs to the next day. The original "does not automatically
choose the following day"; the operator enters it by hand. The guide's worked cases are two evening
games entered as the next calendar date.

The rebuild already has the full form of this: HH:MM scope bounds each day by the computed local
sunset. What a newcomer lacks is the simple form.

**Built:** Start here gives each date an *After sunset (around 6 PM or later): count it as the next day*
box, which moves that date forward one day before the cast. Whole-date scope, as the guide's own
"6 PM" rule of thumb is; HH:MM scope remains the exact version in the full app.

---

## 4 · The Metonic Cycle

An eleven-page illustrated folio, not an Ophis document: 19 tropical years ≈ 235 synodic months, the
Callippic refinement (76 years, 940 months, 27,759 days), and the Antikythera mechanism, whose back
face carries Metonic, Callippic, Saros (223 months) and Exeligmos (669 months) dials.

Its figures are standard astronomy and are not taken from it. The cycles are built from the mean
synodic month the app already uses (`SYNODIC_MONTH`, 29.5306 days), which stays within hours of NASA's
phase tables; the eclipse tables are already rebuilt from NASA's canon. No network call is made: the
app is offline by design.

**Built:** Lab → *L4 · Gaps and the moon* (each Y in lunations, and any Lunation, Saros, Metonic,
Exeligmos or Callippic return within a day) and *L5 · The moon's long returns* (the Antikythera back
dials, started on your first date, for a chosen Z-Date) — `gapReadings`, `moonDials`, `MOON_CYCLES`.

---

## 5 · Core Algorithm Operations

Prose descriptions of the subroutines. Three are already built: the isometric projection (operation
#1), the MSRF, and the Annular Chronometric filter (the Diurnal tag, 23 §4). Two are not computable from
what is written:

- **Hydrogen Spacing Angle.** "Two H-molecules will always be arranged at an angle of 105 degrees …
  a holofield of 105 degree angles." No rule turns a date, a count or a projection into an angle, and
  the MSRA Key lists it as a filter family without numbers of its own. (The H–O–H angle is in fact
  about 104.5°.)
- **Holofractal Recognition Projections.** Follows trajectories "through mathematical
  discontinuities". No arithmetic is given beyond the Holo-date operation the table already runs.

Neither is built: there is nothing to build without inventing a rule. Lab → *L6* says so on screen.

The document also says "15 physics constants" and "15 future dates"; the shipped table has sixteen
operations, and 22 §2 reconciles the author's fourteen with them.

---

## 6 · MSRA Key to Constructional Programming

One page: the nine filter families (Diurnal, Holofractal, Fibonacci, Hydrogen Spacing Angle, Golden
Section, Geodetic, IntraDecimal, Palindromes, Vortex Holography) and a list of 378 numbers, 53 in bold
as "of epic value".

The 378 are **exactly** the shipped Normal (325) and Important (53) arrays; the 53 bold numbers are the
Important tier, which 22 §3 had already confirmed 53/53 against the workbook. The shipped Vortex tier
adds the twelve decimals (21.7 … 871.2). Nothing to change.

The page's arithmetic holds against the list: "only 14.7% of numbers have any operations value out of
the 2559" is 378 ÷ 2559 = 14.77%, cut to one decimal, and "53 … 2.07%" is 53 ÷ 2559 = 2.07%.

---

## 7 · Ophis 3.0.0 release notes

The programmer's announcement of the version that introduced the two scopes (whole dates, or dates with
time and location for sunset), the chart and its astronomical overlays, PDF export and the JSON file
format, and that removed the 6-day minimum between the first two dates. All of it is in the teardown
already; it confirms that the 6-day rule became advice, which is how the SOP warning in 23 §3 treats it.

---

## 8 · Actions and status

| # | Action | Where | Touches the engine? |
|---|---|---|---|
| 1 | A column per X-date with its MSRF tier | Lab L3 | No, it reads results |
| 2 | The validity rule as an optional reading view | Lab L1, results table | No, it filters the view |
| 3 | How far ahead to look | Lab L2, Start here | No |
| 4 | Holoflective tag, and reflections of each Y | Settings S3, Lab L1 and L4 | No, it reads results |
| 5 | After-sunset helper | Start here | No, it changes inputs |
| 6 | Moon cycles in gaps, and the Antikythera dials | Lab L4 and L5 | No |
| 7 | Record the two subroutines that cannot be built | Lab L6, §5 here | No |

All seven are done. `npm test` still passes 140/140 against the original; the Lab is pinned separately
by `npm run test:lab`, including a check that reading a run leaves every row, score and hit count as it
was.
