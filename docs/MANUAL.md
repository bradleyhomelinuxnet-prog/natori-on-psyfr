# Your Own Dates: a plain-English manual

**Who this is for.** You have some dates from your own life. You want to put them
into Ophis, press the button, and understand what comes back. You do not want to
read a specification first.

That is this document. No maths background assumed. Ten minutes to your first
result, and everything you need to read it honestly. Every click below was
driven in the real app, and every number quoted is pinned by the test suite.

> If you want the theory instead, the [field guide](../field-guide.html) is the
> ten-minute tour and the [white paper](../whitepaper.html) is the study.

### The fastest start: open a pre-worked file

Four ready-made runs ship in [`examples/`](../examples/), each one the example a
section of this manual walks through:

| File | What it shows | Section |
|---|---|---|
| [`01-worked-example.oph`](../examples/01-worked-example.oph) | The app's own five-date example: 114 rows, top score 3 | §5, §6 |
| [`02-job-changes.oph`](../examples/02-job-changes.oph) | Three real-shaped job dates: no MSRF chip anywhere | §8 |
| [`03-job-changes-protocol-prime.oph`](../examples/03-job-changes-protocol-prime.oph) | The same jobs plus the day of asking | §7 |
| [`04-even-spacing-19-138.oph`](../examples/04-even-spacing-19-138.oph) | Dates 138 days apart from the 19th: lights up, and why that proves nothing | §8 |
| [`manual-examples.oph`](../examples/manual-examples.oph) | All four in one file, as Iso-Events E1–E4 | — |

Open the **Import** screen → **☰ Open .oph file…** → pick one → **Load**. Each
file's **Settings → S1 Misc. Notes** says what you should see. They give the
same rows on whatever day you open them (§9 explains how).

---

## 1. What the thing actually does

Give it two or more dates on which **the same kind of thing** happened to you.

It measures the gap between every pair of those dates, in whole days. Then it
takes each gap and runs it through sixteen small arithmetic formulas — halve it,
multiply it by 1.618, reverse its digits, and so on. Each result is a number of
days, which it counts forward from one of your dates to land on a **new date**.

That is the whole idea. Your dates go in; a ranked list of projected dates comes
out. The score next to each one says how many independent formulas agreed on it
and whether the gap it came from is a number the system treats as significant.

It knows nothing about you, your event, or the world. It does arithmetic on the
numbers you typed.

---

## 2. The one rule that decides whether you get anything useful

> **The dates must be repetitions of the same kind of event.**

This is the rule people break, and breaking it makes everything downstream
meaningless — the arithmetic still runs, the scores still appear, and they are
noise.

The instrument's own word for what you are feeding it is an **Iso-Event**: an
event that has *already happened two or more times* and might happen again. The
whole method assumes the gaps between past occurrences carry a pattern. Three
unrelated milestones have no pattern between them to find.

| Good input | Why |
|---|---|
| The three times you changed jobs | Same event, repeated |
| Every time you have moved house | Same event, repeated |
| Each time a chronic condition flared up | Same event, repeated |
| The dates of every major argument in one relationship | Same event, repeated |
| Every time your business had a record month | Same event, repeated |

| Bad input | Why |
|---|---|
| Your birthday, your wedding, your graduation | Three *different* events |
| One date | Nothing to measure a gap against |
| Two dates one week apart | One tiny gap; every projection lands in a heap |
| Dates you half-remember | The gap is the whole input; a month out is garbage in |
| Dates you chose to be evenly spaced | The formulas agree by construction (§8) |

**Two dates is the minimum. Three is where it gets interesting** — three dates
give three gaps instead of one, so three times as much to work with.

If you cannot think of an event that has happened to you three or more times and
whose dates you actually know, this instrument has nothing to tell you. That is
a real answer, not a failure.

---

## 3. Ten minutes: your first run

Open the app (`index.html`). It starts on the **Work** screen with a worked
example already loaded, so you can see the shape of things before you touch it.

**Step 1 — Name your event.** In the **Iso-Events** panel on the left, click the
name field next to `E1` and type what your dates have in common. "Started a new
job". "Moved house". The name changes nothing in the maths; it stops you
forgetting what you were asking six months from now.

**Step 2 — Clear the example dates.** In the **X-Dates** panel, press **Delete
All** and confirm with **Yes, delete all**. (Or remove rows one at a time with
their `✕`.) X-Dates is what the app calls your input dates — X for the ones you
know, Z for the ones it projects.

**Step 3 — Add your dates.** Type into the `MON`, `DAY` and `YEAR` boxes at the
bottom of the X-Dates panel and press **+ X-Date** for each one. You can add them
in any order: **+ X-Date slots each new date into its place in time**, so the
list always reads oldest to newest.

**Editing a date in place is different, and it is the one way to break a run.**
Each row is also a text box you can retype (`MM/DD/YYYY`, then Enter). That edit
is taken literally. Retype X1 to a date later than X2 and the run stops: the
status bar drops to `0 PAIRS`, the table empties, and the panel reports
`X2 must be greater than X1`. The list must climb by at least a day, row by row —
X1 means *the first row*, not *the earliest date*. Fix the row and it casts again.
If you need to change a date a lot, deleting it and re-adding it with + X-Date is
the safe way.

**Step 4 — Read the status bar.** Across the top you will see something like
`3 ANCHORS · 3 PAIRS · 16 OPERATIONS · 23 Z-DATES · 24 HIDDEN`, then a
**Current date** box, a state label, and **Recalculate**.

- PAIRS 0 means fewer than two dates are enabled — or an ordering error (Step 3).
- **Current date** is the day the projection is "being conducted from". It
  starts as today. Change it (type `MM/DD/YYYY`, Enter) to see what the run
  would have looked like on another day; it matters to one filter (§9) and to
  Protocol Prime (§7). It is *not* saved in a file.
- The app re-casts on every change, so the label normally reads **Up to date**.
  **Recalculate** forces a fresh cast — useful if the tab has been open across
  midnight and "today" has moved.

**Step 5 — Read the table.** It is sorted by date. Click the **Score** column
header to sort by score instead, highest first. That is your shortlist.

**Step 6 — Click a row.** Any row opens the **Audit** screen: the score worked
out line by line, every formula that landed there with its anchor, gap and
result, and the full list of gaps (Y-structs) the run used. If a number ever
surprises you, this is where you find out why — nothing is hidden.

That is a complete run. Everything below is about reading it well.

---

## 4. Reading a row

A row looks like this:

```
Z8   05/18/2024   ♊   2   2   —   O1(X2→X3) O2(X2→X3)
```

**Z8** — the row's number in date order. It stays put when you re-sort, so you
can refer to "Z8" while the list is sorted by score.

**Z-DATE** — the projected date. This is the output.

**The glyph** — the hit count again, as a shape so it does not rely on colour:
`♊` two, `▲` three, `◆` four, `●` five or more. Blank means one.

**HITS** — how many separate things pointed at this date. It counts both the
formulas that landed here and the significant numbers that matched. More hits
means more independent agreement, and independent agreement is the entire point
of the method. **This is the column to trust most.**

**SCORE** — hits, weighted. Explained in full in §5.

**MSRF** — a green, red or purple chip showing a number, or `—`. MSRF stands for
Multidimensional Spatial Recognition Filters, which is a long name for a list of
390 numbers the system treats as significant. If a gap behind this date is on
that list, you get a chip. Green is *Normal*, red is *Important*, purple is
*Vortex*. Red and purple are rarer and count for more. Hover a chip for detail.

A `—` in the MSRF column is completely normal. Most rows have nothing there.

**OPERATIONS** — which formulas landed here, and from which pair of your dates.
`O5(X2→X4)` means formula number 5, working on the gap between your second and
fourth date. The **Operations** screen lists all sixteen with their equations.

The **Columns** buttons above the table hide or show each column.

---

## 5. How the score is built

The score is:

```
score = (formula points + number points) × multiplier
```

**Formula points.** Each formula that lands on the date contributes its weight.
The sixteen shipped formulas are split into two classes: **Alpha** ones are worth
1 point, **Beta** ones 0.5. So two Beta formulas agreeing gives 1 point; two
Alpha formulas gives 2.

**Number points and the multiplier.** If the gap matches the significant-number
list, that match brings both points and a multiplier:

| Chip | Points | Multiplier |
|---|---|---|
| Normal (green) | 1 | ×1.5 |
| Important (red) | 2 | ×2 |
| Vortex (purple) | 2 | ×2 |

The multiplier is the *largest* one on the row — they never stack. And the match
that supplies the multiplier does not also pay its points, on the grounds that it
is already being counted once. No match at all means a multiplier of ×1, which
changes nothing.

### A real example, worked all the way through

This is the top-scoring row out of the 114 in the app's own worked example. Every
number here came out of the engine, not out of a description of it.

```
Projected date   09/29/2027
Formulas         two Beta formulas landed here     0.5 + 0.5  =  1
Numbers          gaps of 204.1 and 74.4 days —
                 both round onto the Normal list        one pays  =  1
                 (the other supplies the multiplier)
                                                    ---------------
Base                                                              2
Multiplier       highest chip is Normal                        × 1.5
                                                    ---------------
SCORE                                                             3
HITS             2 formulas + 2 numbers                           4
```

---

## 6. Is my score any good?

This is the question everyone actually has, and it has a real answer. Here is how
the 114 rows of the worked example are distributed:

| Score | Rows | What that means |
|---|---|---|
| 0.5 | 29 | The floor. One Beta formula, nothing else |
| 0.75 | 13 | |
| **1.0** | **53** | The single most common outcome |
| 1.5 | 12 | Now something is agreeing |
| 2.0 | 5 | **Top 6% of rows** |
| 2.25 | 1 | |
| 3.0 | 1 | **The single best row in the whole run** |

Read that table before you get excited about a number.

- **1.0 or below is 83% of everything.** It means one formula landed there and
  nothing agreed. It is not a signal. It is the background.
- **1.5 to 2.0 is where a row starts to be worth a second look.**
- **Above 2 is rare** — two rows out of 114 in a full run with five dates.

A score is only meaningful **relative to the other rows in your own run**. A 2.0
in a run whose best row is 2.0 is your top result. A 2.0 in a run with three 3.0s
is mid-table. Always sort by score and look at the shape of the whole column
before deciding any single row means something.

---

## 7. Protocol Prime — the step the software never tells you

The author's own procedure adds a third kind of control that nothing in the
original software hints at: **the date you are doing the projection on.**

Not just your historical dates — today's date, entered as another X-Date. The
reasoning is that the moment you ask the question is itself part of the pattern.

There is a button for it: **☉ Today · Protocol Prime** in the X-Dates panel. It
adds the Current date (§3, Step 4) as a control, slotted into date order like any
other + X-Date, and says *"Today is already a control"* if you press it twice.

**What it does to the numbers.** Adding a fourth date takes you from 3 pairs to
6, which doubles the projections. Here are the job dates of §8 run both ways,
with the Current date held at `09/02/2026` for both — the comparison only means
something if that is the same on each row:

| | Pairs | Projections | Shown | Hidden |
|---|---|---|---|---|
| Three job dates | 3 | 48 | 6 | 41 |
| + today | 6 | 96 | **25** | 70 |

(*Shown* plus *Hidden* counts distinct days, and comes to one less than the
projections cast: in each run, one projection lands on a day another already
occupies, and the two merge into a single row.)

Six rows becomes twenty-five, and most of that is not the extra projections. For
the job dates, today is later than all of them, so Protocol Prime makes it the
last X-Date — and that slides the "beyond 2,559 days from the last X-Date"
filter more than four years forward. The window moved; the arithmetic barely
changed.

And look at what arrived. The top four rows are **the same four dates in both
runs** — 09/29/2026, 01/21/2027, 02/15/2027, 11/10/2027 — each scoring 1.00, and
**not one row in either run carries an MSRF chip.** The nineteen new rows all
score 1.00 or 0.50.

So: more input gave a longer list and an identical top. More input does not
automatically mean more signal, and a list getting longer is not the same thing
as it getting better. Open
[`03-job-changes-protocol-prime.oph`](../examples/03-job-changes-protocol-prime.oph)
to see the second run.

---

## 8. When nothing lights up

Here is a real run on three real-shaped job dates — 14 Mar 2016, 6 Sep 2019,
11 Jan 2022 — cast with the **Current date set to `02/01/2022`**, just after the
last of them. (That setting matters: leave the Current date at today and the
*hide before the current date* filter cuts this run down to six rows, because
everything below already happened. Set it to reproduce what you see here — or
open [`02-job-changes.oph`](../examples/02-job-changes.oph), which has that
filter off and shows these rows on any day.)

```
3 anchors | 3 pairs | 48 projections | 47 distinct dates | 23 shown | 24 hidden

Top rows:
  05/18/2024   score 2   hits 2   MSRF: none
  06/30/2022   score 1   hits 1   MSRF: none
  02/28/2023   score 1   hits 1   MSRF: none
```

Top score of 2 — two Alpha formulas landing on one day, with no help from the
number list — and not a single significant-number match in the entire run.

**This is the normal outcome, and it is the honest one.** The instrument is not
broken and you did not do it wrong. Three arbitrary real-world dates mostly do
not produce gaps that land on a list of 390 particular numbers, and there is no
reason they should.

If you want the tool to tell you something, that has to be a thing it is allowed
to *not* do. A version that always found a strong signal would be finding it in
noise.

Things worth trying before you conclude there is nothing:

- **Check your dates.** The gap in days is the entire input. One wrong date
  poisons every projection derived from it.
- **Add a fourth occurrence** if you have one. More pairs, more chances.
- **Try Protocol Prime** (§7).
- **Loosen the filters** (§9) — the default settings are hiding rows.

### Why evenly spaced dates light up — and why that proves nothing

Now the opposite. Three dates exactly **138 days** apart, starting on the
**19th**: 01/19/2019, 06/06/2019, 10/22/2019
([`04-even-spacing-19-138.oph`](../examples/04-even-spacing-19-138.oph)).

```
3 anchors | 3 pairs | 32 shown | 5 hidden

Top row:
  06/01/2020   score 4.5   hits 4   MSRF: two green chips (223)
```

A 4.5 is higher than anything in the app's own worked example. It means nothing,
and the Audit screen shows why. The gaps are 138 and 276, and 276 is exactly
2 × 138. One formula takes *half a gap × 1.618*; another takes *a gap × 1.618*.
Half of 276 **is** 138, so both formulas compute 138 × 1.618 = 223.3, from the
same last date, and land on the same day. 223 happens to be on the Normal list,
so the agreement is scored twice over.

The formulas did not discover a pattern; **the pattern was typed in.** Evenly
spaced input makes the sixteen formulas collide by construction. Real events are
rarely that regular — and when yours are, that regularity is the thing to
notice, not the score built on top of it. Treat any run whose gaps are simple
multiples of each other with suspicion.

---

## 9. The filters, and why rows go missing

`24 HIDDEN` on the status bar means exactly that: 24 projections were computed
and then removed before you saw them. The **Filters** panel controls this. There
are eight, numbered F1–F8, and they only ever *remove* rows — none of them can
invent one. Ticked means the filter is on.

| | Filter | Default |
|---|---|---|
| F1 | Hide Z-Dates before the last X-Date | on |
| F2 | Hide Z-Dates on the last X-Date | on |
| F3 | Hide Z-Dates before the current date | on |
| F4 | Hide Z-Dates on the current date | off |
| F5 | Hide Z-Dates beyond *n* days from the last X-Date | on, 2559 |
| F6 | Hide Z-Dates with fewer than *n* hits | off, 2 |
| F7 | Hide Z-Dates scoring below *n* | off, 1 |
| F8 | Hide Z-Dates with no MSRF match | off |

The ones you will care about:

- **F3 — before the current date.** Usually right — a projection into last year
  is not a forecast. It is the **only** filter that reads the clock, which is why
  the files in `examples/` ship with it off: switch it off and a run shows the
  same rows on any day. Turn it off yourself to check the method against
  something that already happened.
- **F6 — fewer than *n* hits.** The most useful dial in the app. Tick it (the
  value is already 2) and everything with no agreement disappears at once.
- **F7 — scoring below *n*.** The same idea, by score instead of hits.
- **F8 — no MSRF match.** Aggressive. Turns 114 rows into a handful. Worth trying
  once to see what survives.
- **F5 — beyond *n* days.** Caps how far out it will look. 2559 days is the
  author's window — about seven years.

Press **Reset** in that panel to get back to the defaults.

A useful habit: run once with the filters wide open to see the true spread, then
tighten them. Starting tight can hide the fact that your top row is only top
because everything else was cut.

**T-Dates** are the opposite tool. If you only care about particular days — the
next scheduled match, a planned launch — add them in the **T-Dates** panel and
the table keeps only Z-Dates that land exactly on one of them. Leave it empty
(the default, *"showing every date"*) to see everything.

---

## 10. The rest of the screen

**The timeline.** Every arc jumps forward from the X-Date it was counted from
to the date it projects; its colour is the hit count (grey 1–2, yellow 3, blue 4, red 5+).
Hover an arc to measure it, use the wheel to zoom, drag to pan, and **Recentre**
to reset.

**Chart Config.** Overlays for the timeline: C1–C2 turn the chart and its date
labels on and off; C3–C10 mark the eight moon phases; C11–C14 mark solar and
lunar eclipses (full and partial). They draw context on the chart and **never
change a score**.

**Scope & Location.** **Days** (the default) works in whole days, locked to UTC
so the same file gives the same answer on any machine. **HH:MM** works to the
minute; only then does a location matter, and **◍ Pick on map** sets it from the
offline map.

**More than one event.** **+ Add** in the Iso-Events panel starts another event
(`E2`, `E3`…); the radio button chooses which one the screen shows, `⧉`
clones one, `✕` deletes it. Each event keeps its own dates, filters and
settings. The **Transfer** screen copies chosen parts — X-Dates, Filters,
T-Dates, Operations and so on — from one event onto others.

**Operations.** The sixteen formulas, editable. Untick one to leave it out of
the cast; change its weight to move it between Alpha (1 or more) and Beta.
Changing these changes every score, so note what you did.

**Settings.** **S1 Misc. Notes** is free text that never affects results — the
example files use it to say what you should see. **S2** sets the hour a day
begins in Days scope.

---

## 11. Saving, files and exports

**Your work is kept in this browser.** Close the tab and come back, and your
events are still there. But it is kept only in *this* browser on *this* machine
(at this web address) — a different browser, device or private window starts
fresh, and clearing site data erases it.

**The badge at the top right** reads **Not saved** until you export a file, and
**Saved** after. It is about files, not the browser copy.

**To keep a run for good: Export → Export file.** That writes an `.oph` file
(plain text; the **Export** screen also shows it for **Copy**). **Save for Ophis
v12** writes the older format the original desktop app reads — the plain export
opens there with no X-Dates.

**To bring one back: Import → ☰ Open .oph file… → Load**, or paste the text and
press **Load**. Nothing changes until you press Load, and if you have unsaved
changes it asks before overwriting them. The Current date is not part of a file:
an imported run is cast against today (§9, F3).

**To take the results elsewhere: the Z-Dates screen** exports the table as CSV,
XLSX or PDF. All three honour your filters and list rows by date, whatever
column you last sorted on.

**Nothing leaves your machine.** No network call, no account, no telemetry.

---

## 12. What the score is not

Worth being straight about, because the output looks authoritative and dates feel
personal.

**It is not a prediction.** It is the result of fixed arithmetic on the numbers
you typed. The date has no causal relationship to your life; it is a gap
multiplied by 1.618 and added to a day you supplied.

**It is not evidence.** A high score means several formulas in one table happened
to converge. With 160 projections from five dates, some convergence is expected
by chance alone — and with evenly spaced dates it is guaranteed (§8). That is why
§6 matters: the question is never "is this score high" but "is it high compared
to the rest of *this* run".

**It does not know what your event was.** Job, illness, argument — identical
arithmetic. The name you typed is a label for you.

**Do not make a decision you could not otherwise justify.** If the tool points at
a date and you find yourself planning around it, the thing doing the work is your
own attention, not the arithmetic. Use it to notice a period worth watching, not
to decide anything that matters on its own.

This is presented as the Archaix thesis of Jason Breshears — a worldbuilding and
study instrument, not established science. That framing is the honest one and it
is stated inside the app too.

---

## 13. Quick reference

| You want to | Do this |
|---|---|
| See a finished run first | Import → ☰ Open .oph file… → an `examples/` file → Load |
| Start over | X-Dates panel → **Delete All** → **Yes, delete all** |
| Add a date | `MON` `DAY` `YEAR` → **+ X-Date** (any order; it sorts itself) |
| Fix `X2 must be greater than X1` | Retype the row so the list climbs, or delete it and re-add it |
| Add today as a control | X-Dates panel → **☉ Today · Protocol Prime** |
| See the run as of another day | Status bar → **Current date** → type it, Enter |
| Sort by strength | Click the **Score** column header |
| See only rows with agreement | Filters → tick **F6** (*fewer than 2 hits*) |
| Only see certain days | T-Dates panel → **+ T-Date** |
| Understand one row | Click it → the Audit screen |
| See the whole spread | Filters → **Reset**, then untick **F3** |
| Zoom the timeline | Wheel over it; drag to pan; **Recentre** to reset |
| Show moon phases or eclipses | Chart Config → C3–C14 |
| Set a location (HH:MM scope only) | Scope & Location → **◍ Pick on map** |
| Keep your setup for good | **Export** screen → **Export file** |
| Bring it back | **Import** screen → open the file or paste it → **Load** |
| Take the results to a spreadsheet | **Z-Dates** screen → CSV or XLSX |

---

*Ophis performs arithmetic on the dates it is given and ranks the results by how
many independent operations and number patterns agree. It knows nothing about
your event and has no access to anything beyond those dates. Presented as the
Archaix thesis of Jason Breshears, not as established science. Not affiliated
with Archaix.*
