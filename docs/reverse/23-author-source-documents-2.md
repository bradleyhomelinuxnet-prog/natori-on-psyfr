# 23 · The author's source documents, second set

**Assignment:** read the remaining design documents shared in the research group against the
rebuild, and record what is new. This follows [22](22-author-source-documents.md), which covered the
Flow Chart, *PREPS*, the Procedural Notes, *Items Not Disclosed* and the MSRF workbook.

**Primary sources, read in full** (the documents themselves are not reproduced here):

| File | Pages | What it is | New? |
|---|---|---|---|
| `c. Ophis Definitions & SOP` | 5 | Glossary, plus the standard operating procedure | **Yes**: operating limits (§3) |
| `Protocol Prime` | 1 | "The Law of Prediction" | **Yes**: objective vs subjective (§1) |
| `Other MSRA Filters` | 2 | Fibonacci, IntraDecimal, palindrome and Geodetic rules | **Yes**: the first concrete filter rules (§2) |
| `Diurnal Projections` | 3 | The Annular Chronometric number lists | **Yes**: resolves the 2556/2559 question (§4) |
| `On Scaling Vectors` | 8 | A research-group study of the engine on sports data | **Yes**: independent evidence (§5) |
| `b. Ophis as a Company` | 5 | A sales prospectus | Context only (§6) |
| `Ophis Links Download Experience` | 7 | One user's install notes for the original app and workbooks | Context only |
| `a. Flow Chart`, `d. PREPS`, `g. Procedural Notes` | | Same as the copies read in 22 | No |

---

## 1 · Protocol Prime: objective and subjective projections

22 §1.1 reconstructed Protocol Prime as "enter the projection date as a further control". The
one-page *Protocol Prime* confirms that, and adds a rule the rebuild does not yet apply:

| Kind | What the X-Dates are | Rule |
|---|---|---|
| **Objective** | Dates not personally tied to the operator: market moves, a team's wins | No extra date required |
| **Subjective** | The operator's or client's own dates | **Must** end with the date the projection is run, as the **last** X-Date |

The author's reasoning is that the act of measuring becomes part of the measurement, so every
subjective projection is unique to the day it is run. The SOP adds that skipping it costs accuracy.

**Consequence.** natori-on-psyfr has a ☉ Today button that appends the date. Ophis Web has none, and
neither build asks whether a cast is objective or subjective.

## 2 · The filter rules that 22 §6 recorded as undisclosed

22 §6 lists the internals of the Fibonacci, Geodetic Chronometry and IntraDecimal filters as
withheld. *Other MSRA Filters* gives rules for three of them.

**Fibonacci Sequence Filter.** Set F = {8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597}.

- *Operation 1.* If Y (X1→X2) is in F, project the members of F forward from X2.
- *Operation 2.* Project every member of F forward from X1 and from X2.
- Either way, a projected date that coincides with a Core Algorithm date marks that date as a
  **Fibonacci Projection**. The text says "one of the 15 Core Algorithm dates", which matches the
  15-operation v8–v9 table.

This is specific enough to implement, as a tag on Z-Dates, without touching the engine.

**Geodetic Chronometry Filter (138).** 365.25 × 1.38k gives 504.0, 1008.0, 1512.1, 2016.1 and
2520.2. 365.25 ÷ 1.38k gives 264, 132, 88, 66, 53 and 44. Multiples of 138 run from 138 to 2484.

**IntraDecimal Matrix.** A number times a smaller decimal copy of itself, for example 819 × 0.819 ≈ 670.
The rule is given, but the list of about 50 base numbers is not.

**Palindromes.** A palindromic count (828, for example) has no value alone. Alongside another match,
it adds magnitude.

## 3 · Operating limits from the SOP

| Rule | Rebuild today |
|---|---|
| X1 and X2 at least **6 days** apart | Engine requires 1 day |
| 6 days apart gives a window of about 39–42 days after X2; 15 days apart gives about 3 months | Not shown |
| Best on X-Dates **within 3 years**, with full MSRF support | Not checked |
| Older X-Dates need **5 or more**, the MSRF does not apply, and results should be read as **periods** (5-day or week-long), not exact days | Not checked or shown |
| Use cases: outcomes on scheduled dates; best day to act or wait; when an event recurs; developments in an ongoing matter | |

**Consequence.** Casts built from decades-old dates (birthdays, historical events) are outside the
author's intended use. The interface could warn about that and group results into windows.

## 4 · The projection window: 2559 is a diurnal number

22 §4 concluded that the 2559-day default and the author's "2556 day period" were unrelated and only
"collided". *Diurnal Projections* contains **both**:

- 365.25 × 7 = **2556.75**, the author's "7 years";
- (365.25 ÷ 3.14) × 22 = **2559.08**, the last entry of the same list, matching the
  365.25 / 3.14 series (116.32, 232.64 … 2559).

So 2559, which is also the largest Normal MSRF number, is a diurnal value in its own right. The
default and the MSRF ceiling share a source; they did not collide by accident. **22 §4 should be
amended.** The default stays at 2559 for parity either way.

The document also lists the 365.25 × 1.618 and 365.25 ÷ 1.618 series and the 365.25 × 3.14 series,
which together make up the Annular Chronometric Filter the MSRF arrays compress.

## 5 · "On Scaling Vectors": the engine on 26 million graded predictions

A group member's study of the engine on sports results reports:

| Level tested | Result |
|---|---|
| Individual MSRF numbers (624) | Enrichment ≈ 1.0: no better than the base rate. 504 fires on about 46 % of matches |
| Density of matches | Real, but explained by match difficulty (EPL) and late-season predictability (NBA), not resonance |
| MSRF number pairs (162,000+) | **None** survive false-discovery-rate correction |
| Converging constants | Degenerate: every operation fires on almost every match |

Its conclusion is that the engine runs **saturated**. Any signal is in the composite score, not in
which numbers fire. It also reports an MSRF set grown from 628 to 632 by data mining, with **2574,
21978, 6534 and 198** as new members; none of these are in the 390-number arrays shipped here. It
also records triangular numbers (2.56×) and Kaprekar numbers (2.08×) as over-represented in the set.

This agrees with this project's own Backtest, which found no edge over chance on the personal
test sets. The study's method is worth copying: it applies multiple-comparison correction and
compares lift, not raw accuracy.

## 6 · Context: the prospectus and the rights

*Ophis as a Company* is marketing. It quotes accuracies (70.5 %, 75.9 %) that no document supplies
evidence for, and §5 found no such edge. Don't reuse those figures without a test that supports them.

The SOP states that Protocol Prime "cannot be shared until algorithm bought". The prospectus refers
to "Ophis Rights & Privileges" that were not included. Check those terms before publishing the
author's methods further, or before any commercial use.

---

## 7 · Proposed actions

| # | Action | Touches the engine? |
|---|---|---|
| 1 | Amend 22 §4: 2559 is diurnal (§4 here) | No |
| 2 | Fibonacci Sequence Filter as an optional tag, Operations 1 and 2 | No, it reads results |
| 3 | Geodetic and Diurnal lists as optional tags, shown separately from the shipped MSRF | No |
| 4 | Objective / Subjective switch; Subjective appends today as the last X-Date (☉ Today in Ophis Web) | No, it changes inputs |
| 5 | SOP warnings: X1–X2 under 6 days; X-Dates over 3 years old (suggest 5+ dates and window reading) | No |
| 6 | Optional "window" view grouping Z-Dates within 7 days | No |
| 7 | Leave 2574, 21978, 6534 and 198 out of the MSRF (parity), but document them | No |

Every item keeps parity with the original engine: the shipped numbers do not change.

### 7.1 Status

- **2 — done.** Settings → *S3 · Optional tags* → *Fibonacci Sequence Filter* (off by default). A
  dashed **Fibonacci** pill appears in a Tags column; its tooltip names the op, the pair, the anchor
  and the member of F. The rule lives in `src/core/ophis/tags.js` and reads a finished run; it is
  pinned by `npm run test:tags`, including a check that tagging leaves every score and rank as it was.
- **3 — done.** Settings → *S3* → *Geodetic Chronometry (138)* and *Diurnal projections*, both off
  by default. Dashed **Geo** and **Diur** pills sit in the Tags column, apart from the MSRF pills, and
  the table caption reads "author's list, not in the shipped MSRF". The lists are generated, not
  typed: each series is `k × base` up to (365.25 ÷ 3.14) × 22 = 2559.08, which reproduces 138…2484,
  504.0…2520.2 (truncated to one decimal, as the author writes them) and 116.32…2559.08. A Z-Date is
  tagged when an operation's rotation count from its anchor is within **0.1 day** of a list value —
  one display step of `rotation_count_z` — with a 1e-9 slack so the edge is decided by that rule and
  not by IEEE-754.
- **4 — done.** An **Objective / Subjective** switch under each event's X-Dates. Subjective adds
  today through the same code as ☉ Today (`addTodayAsXDate`), in date order, so it is the last X-Date
  whenever the others are in the past. The field is written to a `.oph` only for a subjective event:
  absent means objective, so every existing file and example stays byte-identical. The v12 writer
  notes that it cannot carry the label.
- **5 — done.** Non-blocking SOP warnings under the X-Dates (`src/core/ophis/sop.js`): enabled
  anchors under 6 days apart; any X-Date more than 3 years before the projection date (suggesting 5+
  dates and window reading); and, for a subjective event, today missing or not last. None of them
  stops a cast.
- **6 — done.** Ophis had no windows view (the convergence windows belong to Chronicon and stay
  there), so the results bar gains **Rows: Days | 7-day windows**. A window opens at a Z-Date and
  takes every Z-Date less than 7 days after it; it shows the members' labels, summed hits and best
  single score, and re-scores nothing. Pinned by `npm run test:sop`.
