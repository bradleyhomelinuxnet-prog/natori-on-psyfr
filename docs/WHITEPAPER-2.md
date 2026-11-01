# After Parity: What the Ophis Rebuild Became

### A second white paper on natori-on-psyfr: the instrument, the readings, and the contract that held

**Version 3.0 · November 2026**

*The [first white paper](../whitepaper.html) (v2.0, August 2026) showed how a closed prediction
engine was torn down and rebuilt bit-exact. This one picks up where that one stopped. Since then the
rebuild has grown from a verified copy of the original into an instrument people actually use, and
everything added on top of the engine has been held to the same rule: it does not move a number.*

---

## Abstract

Ophis is a date-projection instrument by Jason M. Breshears. You give it dates on which something
similar happened. It counts the whole days between every pair of them, sends each count through a
table of arithmetic operations, and projects dates forward. Then it scores those projections against
a resonance table, the MSRF. The original shipped as a 100 MB Windows Electron program. In August
2026 this project finished rebuilding it as static browser files that agree with the original on
every number it produces.

The question after August was what to do with a rebuild that is exact. In the ten weeks since,
seventy commits have answered it in three directions:

1. **The operator's side.** Protocol Prime is now a real switch: Objective or Subjective. The
   author's operating procedure (SOP) shows up as warnings that never block a cast. A newcomer gets a
   guided first run, and the operation table now defaults to **36** operations instead of 16.
2. **The reader's side.** The author's later design documents are built in as *readings*: optional
   tags, a validity rule, a column for every anchor, and moon cycles. Each one reads a finished run
   and changes no score, no rank and no row.
3. **The file's side.** Files move in both directions between the rebuild and the original desktop
   program. The rebuild opens what the original saves, and **Save for Ophis v12** writes what the
   original opens. The worked examples now ship in both formats.

The engine's parity suite rose from 134 assertions to 140 and still passes. Seven more suites, kept
out of that count on purpose, pin the new layers. The general result carries over from the first
paper with a sharper edge. **Once an engine is pinned, you can build almost anything around it,
provided each addition can show it leaves the engine's output alone.** That proof is the price of
admission, and it is cheap when the engine is a pure function.

**Keywords:** reimplementation, parity testing, non-interfering extensions, design-document
recovery, file-format compatibility, honest instruments.

---

## 1. What it is

The core loop is the same one the first paper described:

| Step | What happens |
|---|---|
| **X-Dates** | You enter two or more dates when something similar happened |
| **Y** | For every pair of dates, the whole number of days between them. N dates give N(N−1)/2 pairs |
| **Operations** | Each operation turns Y into an offset from one of the two dates: `X2+oph_round(Y)`, `X1+Y/OPH_PHI`, and so on |
| **Z-Dates** | Each offset lands on a day. Different operations that land on the same day are merged into one row |
| **Scoring** | Each row scores by how many operations hit it, their weights, and whether its day count from its anchor is in the MSRF table |
| **Filters** | Nine output filters trim the list. By default they hide the past and anything more than 2,559 days past the last X-Date |

None of that changed. What changed is everything around it.

> **Framing, carried forward verbatim from the licence:** Ophis is a study instrument. It renders the
> Archaix thesis of Jason M. Breshears as arithmetic on the dates you supply. It knows nothing about
> your event. Where this paper says a date "resonates", it means the program's scoring function gave
> it points, nothing more.

---

## 2. The contract, stated

The first paper's method was to treat the original as a live oracle and pin the rebuild to its
output. That method became a standing rule for the repository:

> **The maths is a contract, not an implementation detail.** A failing parity test means the
> rebuild drifted. It never means the fixture needs updating.

Every addition since August had to answer one question before it could ship: *show me that it
doesn't move the engine.* There are three ways to pass:

| Kind of addition | How it proves non-interference |
|---|---|
| **Reads a finished run** (tags, Lab readings, windows view) | A test runs the engine, applies the reading, and asserts that every row, score, hit count and rank is unchanged |
| **Changes inputs, not maths** (Protocol Prime, the after-sunset box) | The engine is untouched. The test pins what goes *in*, and the parity suite pins what the engine does with it |
| **Changes a default** (36 operations) | The engine's own default stays the shipped 16. Only *new documents* start with 36, and a `.oph` that names its operations is cast exactly as written |

The table of traps from the handoff is still in force: `OPH_PI = 3.14`, the epsilon-free Vortex
tolerance, and `round1(-1.25) === -1.2`. They look like bugs and they are pinned behaviour. None of
the seventy commits "fixed" one.

---

## 3. Input: Protocol Prime becomes a switch

The first paper's biggest finding was something the software never mentions. The author's flow chart
takes **three** controls, and the third one, **Protocol Prime**, is *the date the projection is
being run*. Leave it out and you are running a third of the method without knowing it.

A second set of the author's documents (studied in [`reverse/23`](reverse/23-author-source-documents-2.md))
turned that from a reconstruction into a rule with a scope:

| Kind | What the X-Dates are | Rule |
|---|---|---|
| **Objective** | Dates not tied to the person asking: market moves, a team's results | No extra date |
| **Subjective** | The operator's or a client's own dates | Today **must** be the **last** X-Date |

The rebuild now has an **Objective / Subjective** switch on each event. Choosing Subjective adds
today in date order, using the same code as the ☉ Today button. The author also said, in a recorded
tutorial, that Protocol Prime is *only* the day of asking. So when a subjective event is re-run on a
later day, the old Protocol Prime date is **removed and replaced**, never kept alongside the new
one. It was never a past occurrence of the event.

The event remembers which X-Date it added, in a `protocol_prime_date` field. That field is written
to the file only for subjective events. Absent means Objective, so every older file, and every
shipped example, stays byte-identical. The edge cases are pinned. A PP date you have since retyped
is yours and is left alone. A file from before this change never has an earlier date guessed to be
PP. And PP never moves backwards when the clock is set back.

### 3.1 The SOP, as advice

The author's standard operating procedure sets limits the original never enforced. They now appear
as **warnings under the X-Dates, and none of them blocks a cast**:

- the first two dates are under **6 days** apart;
- an X-Date is more than **3 years** old (the SOP says to use 5 or more dates and read the results
  as windows, not days);
- a subjective event's last date is not today.

Since the SOP says older casts should be read as periods, the results bar gained
**Rows: Days | 7-day windows**. A window opens at a Z-Date and takes in every Z-Date less than seven
days later. It shows summed hits and the best single score, and re-scores nothing.

### 3.2 A newcomer's door

`start.html` (**Start here**) is a guided first run told as a short story. You name something that
keeps happening, add the dates, and see which days the patterns point to. It reads the same engine
and shows only rows `runOphis` produced. It adds two helpers from the author's later notes:

- an **After sunset** box for each date. Ophis counts days by the Earth's rotation and the day turns
  at sunset, so an evening event belongs to the next day. The full app's HH:MM scope remains the
  exact version.
- a **how far ahead to look** tip, from the author's brief to his programmer. For example, controls
  5 days apart point about a month out.

The results screen can also hand your dates to a separate 3D Pyramid Chronograph. The dates travel
in the URL fragment, which never reaches a server.

---

## 4. The table grows: 16 → 36 operations

The original's v12 table runs sixteen operations. Two additive packs sit beside it:

- **Extras (17–26):** ten operations built on the author's other constants (e, 1.38, 5.52, 2.178, 0.360).
- **The Mirrors (27–36):** ten operations that fill the gaps in the sixteen's grid. Several forms ran
  on only one anchor: the isometric and holo dates, Y/CRV, Y/PHI, (Y/2)×PHI and Y×PHI ran on X2 and
  never on X1. And no operation ever halved the hepta-cycle or divided by π. With the Mirrors in,
  every form runs on both anchors (full grid in [`MIRRORS.md`](MIRRORS.md)).

Both packs are additive. Adding one appends rows and never renumbers an existing row, which matters
because an operation's ordinal decides which anchor its `X1+` binds to. Adding a pack twice does
nothing.

**New documents now start with all 36 switched on.** The engine's own default did not change: a
`.oph` with no operations still means the shipped sixteen, which is what the parity suite pins. A
stored document whose table was still the untouched sixteen is brought up to 36 on restore, and an
edited table is left alone.

What 36 does to a run, measured on the worked example (five dates, ten pairs, clock-free):

| | 16 operations | 36 operations |
|---|---:|---:|
| Projections | 160 | 360 |
| Rows shown | 114 | 200 |
| Rows hidden by filters | 39 | 112 |
| Top row | 09/29/2027 · score 3 · 4 hits | 10/05/2027 · score 5 · 4 hits |
| Rows that pass the author's validity rule (§5.2) | 74 | 96 |

More operations means more chances to collide, so scores rise and the top row moves. Neither table
is "right". They are two settings of the instrument, and the file records which one a run used.

---

## 5. The centre: readings that change no score

This is the largest body of new work, and the most disciplined. Two more sets of the author's
design documents (studied in [`reverse/23`](reverse/23-author-source-documents-2.md) and
[`reverse/24`](reverse/24-author-source-documents-3.md)) described filters and rules the shipped
program never ran. Wherever a document gave enough to compute, the rule was built as a **reading**:
off by default, applied to a finished run, and proved by test to leave every score and rank as it was.

### 5.1 Optional tags (Settings → S3)

Dashed pills in a **Tags** column, kept visibly apart from the MSRF chips. The caption says they are
"the author's list, not in the shipped MSRF".

| Tag | Source | Rule |
|---|---|---|
| **Fibonacci** | *Other MSRA Filters* | F = {8, 13, 21 … 1597}, projected forward from the anchors. A member of F that lands on a Core Algorithm date marks that date a Fibonacci Projection |
| **Geo** (138) | Geodetic Chronometry | Multiples of 138 up to 2484, and 365.25 × 1.38k (504.0 … 2520.2) |
| **Diur** | *Diurnal Projections* | The 365.25 × and ÷ series for 1.618 and 3.14, up to (365.25 ÷ 3.14) × 22 = 2559.08 |
| **Holo** | *Holoflective Sums* | 75 sum/reversal pairs (12 ⇄ 21, 405 ⇄ 504 …), plus 2178, "the Immortal Loop Number" |

A Z-Date is tagged when an operation's day count from its anchor is within **0.1 day** of a list
value, which is one display step of the count. The lists are *generated* from the author's rules,
not typed in, and the Holo test checks that every pair really is a digit reversal. That also guards
the transcription.

One result changed the record. The first study concluded that the 2,559-day default window and the
author's "2556-day period" had collided by accident. *Diurnal Projections* lists **both**:
365.25 × 7 = 2556.75, and (365.25 ÷ 3.14) × 22 = **2559.08**. So the default and the MSRF ceiling
share a source, and the earlier conclusion was amended.

### 5.2 The Lab

A screen of readings from the author's brief to his original programmer:

| Lab panel | What it shows |
|---|---|
| **L1 · Author's validity rule** | Beta dates need a second beta hit or an MSRF match. ALPHA dates stand alone. The isometric and holo projections count only with an MSRF match. On the worked example it keeps 74 of 114 rows. The results table sets the rest aside and says how many, while the run, the chart and the exports keep every row |
| **L2 · How far ahead to look** | The author's look-ahead rule, read from your latest date and closest pair |
| **L3 · Every anchor's count** | The brief asks for "a column per X-date". The engine probes one count per projection; this shows the MSRF tier of the count from *every* anchor. On the worked example, the top row is 405 days from X2 (Tier III) and 204 from X3 (Tier II), though neither projected it |
| **L4 · Gaps and the moon** | Each Y in lunations, and any Lunation, Saros, Metonic, Exeligmos or Callippic return within a day |
| **L5 · The moon's long returns** | The Antikythera mechanism's back dials, started on your first date |
| **L6 · What cannot be built** | The Hydrogen Spacing Angle and Holofractal Recognition subroutines, described in prose with no arithmetic. The screen says so instead of inventing a rule |

L6 is the part worth copying. A rebuild that fills a gap in its source with a plausible guess has
stopped being a rebuild. Saying "not computable from what is written" on screen is part of the
instrument's honesty.

### 5.3 What the evidence says

A users' group study, *On Scaling Vectors*, ran the engine on about 26 million graded sports
predictions with multiple-comparison correction. Individual MSRF numbers showed **no enrichment over
the base rate**. Of more than 162,000 number pairs, **none** survived false-discovery-rate
correction. Its conclusion is that the engine runs saturated, and any signal lies in the composite
score, not in which numbers fire. This project's own backtest on personal test sets also found no
edge over chance. Both results are reported here because an instrument that adds readings has a duty
to say what the readings have and haven't been shown to do.

---

## 6. Output: the round trip to the original

The rebuild writes its own `.oph` format, v13, with X-Dates as `{y, m, d}`. The original v12 desktop
program reads only `{date: "MM/DD/YYYY"}`, and in its default loose mode it **silently drops** every
date it can't parse. The event opens with no anchors and casts nothing, with no error shown.

Both directions now work:

- **In.** The rebuild opens v12 files. This was found the hard way. The original, published on the
  same site under `ophis/`, writes its state to a browser storage key the rebuild also reads.
  Storage is scoped to an *origin*, not a path, so opening the original broke the rebuild: every
  anchor came out NaN and the run returned zero rows with an empty error list. Everything restored
  now goes through the same normaliser as an opened file.
- **Out.** **Export → Save for Ophis v12** writes `app_version: "12"`, no `schema` field, v12's date
  form, and each event's keys in exactly the order v12's own `createNewIsoEvent` writes them, so a
  diff against a file the desktop app saved lines up field for field. Anything v12 cannot represent
  is listed, never silently dropped: a sort it lacks, an event type, the Subjective label, the
  Protocol Prime record.
- **Examples in both formats.** The five worked examples ship as v13 in `examples/` and as v12
  copies in `examples/v12/`. A generator (`npm run examples:v12`) builds the copies with the same
  writer, and a test regenerates them in memory and fails if a committed copy is stale or out of
  v12's exact key order.

The original program itself is also in the repository now, under `ophis/`. It is the renderer of
`Ophis_v12_Windows.exe` copied byte for byte, with a small bridge standing in for Electron, so it
runs in a browser next to the rebuild that reproduces it.

---

## 7. Surfaces: one engine, several doors

| Page | What it is | Engine |
|---|---|---|
| `index.html` | The full instrument | The rebuilt v12 engine |
| `ophis-single.html` | The same app as one file, for carrying offline | **Generated** from `index.html` + `src/` by `npm run bundle`. CI fails if it is stale |
| `start.html` | The guided first run | The same engine, read-only |
| `ophis/` | The original v12, running in a browser | The original's own code |
| `OPHIS.html` | The v12 Field Guide: a live tour of the sixteen | Matches the rebuilt engines on every date |
| `PSYFR1.html` | The PSYFR Oracle | **Not v12**: its own 19 formulas and calendar scoring. It now says so at the top, and it opens `.oph` files but scores them by its own lens |
| `chronicon.html` | A separate instrument with its own data | Shares only the equation parser. Never merged |

Two lessons from this layer generalise.

**Generate the copy; don't maintain it.** Two hand-made single-file builds had drifted apart and
kept a fixed defect alive in both until each was patched by hand. The bundler exists so that can't
happen again. A plain concatenation would have been worse than nothing: the modules collide on names
(`hit`, `span`, `COLUMNS`), so pasting them together gives a file that parses and then misbehaves.

**Say which lens you are looking through.** Users read the PSYFR Oracle as if it were v12. The fix
was not a code change but a sentence at the top of the page, plus a fold listing the differences in
plain words.

---

## 8. The contract, kept

| Suite | Count | Pins |
|---|---:|---|
| `npm test` (parity) | **140** | The engine against the original: equations, the end-to-end golden, scoring, MSRF precedence, the map, the examples |
| `test:serve` | 9 | The development server |
| `test:store` | 9 | Stored state, Clear saved data, and the 36-operation upgrade on restore |
| `test:packs` | 13 | Packs append and never renumber |
| `test:tags` | 16 | Tags label rows without moving a score or rank |
| `test:sop` | 28 | Protocol Prime and the SOP warnings. The Objective default leaves every `.oph` byte-identical |
| `test:start` | 8 | Start here shows only rows the engine produced |
| `test:lab` | 7 | Lab readings leave every row, score and hit count as they were |
| `test:examples-v12` | 11 | The v12 example copies are current and in v12's exact shape |

The parity count grew from 134 to 140. Everything built on top of the engine is pinned in the side
suites instead. That way the headline number still means one thing:
*agreement with the original*. CI also still forbids `eval`, `new Function` and every markup sink in
`src/`, and fails a stale single-file build.

The repaired defects are worth a line each, because each was invisible in the source and obvious in
use:

- **The stuck document.** An append bug saved anchors out of order in people's browsers. Uploading a
  fixed build couldn't reach them. Restore now repairs **only** events that cannot cast as they
  stand. Index order is load-bearing, so re-ordering a working document would change its results,
  and that is not allowed.
- **The wrong diagnosis.** "No results. You probably have to loosen up a filter" sent a user to the
  filters for an hour when the real cause was three T-Dates. The empty panel now names the actual
  cause, and *Turn off every filter* turns off all eight, not four.
- **A second eclipse table.** The rebuild now carries a corrected eclipse table built from NASA's
  canon, alongside the original's table, which has four documented defects. The original stays the
  default, because Chronicon scores eclipses and switching tables would change its numbers. That
  choice belongs to the reader, made knowingly.

---

## 9. What it is not

Ophis performs arithmetic on the dates it is given and ranks the results by how many independent
operations and number patterns agree. Since November, every results screen says the rest in the
users' group's own words:

> *Ophis is a prediction tool, not a betting tool. How you use its dates is your decision and your
> responsibility; there are no guarantees. Never wager money you and your family can't live
> without.*

The evidence in §5.3 is why that line is there. The rebuild is exact about what the original
computes. It makes no claim, and no test in this repository makes one, that what it computes
predicts anything.

---

## Coda: 19, 138, and a mirror

The repository's fourth example, [`04-even-spacing-19-138.oph`](../examples/04-even-spacing-19-138.oph),
is three dates **138** days apart starting on the **19th**. It scores 4.5, higher than the app's own
worked example, and the manual explains why that proves nothing. The gaps are 138 and 276. Half of
276 is 138, so two different formulas both compute 138 × 1.618 = **223** from the same date and land
on the same day. The pattern was typed in, not found.

Two numbers in that sentence turn up elsewhere in this paper. That is a coincidence, recorded as one:

- **223** is also the Saros: 223 lunations, after which eclipses repeat (Lab L4).
- **19** years is the Metonic cycle, 235 lunations, after which the moon's phases fall on the same
  calendar dates again. And **138** is the Geodetic Chronometry base the Geo tag counts in.

This paper is built as a mirror, after the operation the author called holoflective. Its nine
sections pair from the outside in: what it is ⇄ what it is not (1 ⇄ 9), the contract stated ⇄ kept
(2 ⇄ 8), the operator's door ⇄ the reader's doors (3 ⇄ 7), the table that grew ⇄ the files that
carry it (4 ⇄ 6). Section 5, the readings that change nothing, sits alone at the centre, the way a
palindrome's middle letter has no partner. Like the 19/138 example, the symmetry was put there on
purpose, and it proves nothing about the subject.

---

### Sources

Every claim in this paper can be traced to a file in the repository:

| Topic | Read |
|---|---|
| The first study, method and findings | [`WHITEPAPER.md`](WHITEPAPER.md) |
| Current state and the traps table | [`HANDOFF.md`](HANDOFF.md) |
| Every deliberate difference from the original | [`DEVIATIONS.md`](DEVIATIONS.md) |
| Protocol Prime, the SOP, the tags | [`reverse/23`](reverse/23-author-source-documents-2.md) |
| The Lab | [`reverse/24`](reverse/24-author-source-documents-3.md) |
| The Mirrors | [`MIRRORS.md`](MIRRORS.md) |
| Using it on your own dates | [`MANUAL.md`](MANUAL.md) |

The 36-operation figures in §4 were measured for this paper by running the engine on
`examples/01-worked-example.oph` with the operation table set to `newDocumentOperations()`. Every
other figure is pinned by a test named in §8.

*Licensed CC BY-NC-SA 4.0. Ophis and the Archaix thesis are Jason M. Breshears'. This is a study
instrument, not affiliated with Archaix.*
