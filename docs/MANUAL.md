# Your Own Dates: a plain-English manual

**Who this is for.** You have some dates from your own life. You want to put them
into Ophis, press the button, and understand what comes back. You do not want to
read a specification first.

That is this document. No maths background assumed. Ten minutes to your first
result, and everything you need to read it honestly.

> If you want the theory instead, the [field guide](../field-guide.html) is the
> ten-minute tour and the [white paper](../whitepaper.html) is the study.

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
name field and type what your dates have in common. "Started a new job". "Moved
house". The name changes nothing in the maths; it stops you forgetting what you
were asking six months from now.

**Step 2 — Clear the example dates.** In the **X-Dates** panel, click the `✕`
next to each row until the list is empty. (X-Dates is what the app calls your
input dates — X for the ones you know, Z for the ones it projects.)

**Step 3 — Add your dates.** Use the `MON / DAY / YEAR` boxes at the bottom of
the X-Dates panel and press **+ X-Date** for each one. Order does not matter for
correctness, but enter them oldest-first — it makes the timeline easier to read.

**Step 4 — Look at the status bar.** Above the timeline you will see something
like `3 ANCHORS · 3 PAIRS · 16 OPERATIONS · 47 Z-DATES · 24 HIDDEN`. If PAIRS is
0, you have fewer than two dates enabled. If Z-DATES is 0, check your dates
entered correctly.

**Step 5 — Read the table.** It is already sorted by date. Click the **SCORE**
column header to sort by score instead, highest first. That is your shortlist.

**Step 6 — Click a row.** Any row opens the **Audit** screen, which shows every
arithmetic step that produced that date. If a number ever surprises you, this is
where you find out why — nothing is hidden.

That is a complete run. Everything below is about reading it well.

---

## 4. Reading a row

Five columns matter.

**Z-DATE** — the projected date. This is the output.

**HITS** — how many separate things pointed at this date. It counts both the
formulas that landed here and the significant numbers that matched. More hits
means more independent agreement, and independent agreement is the entire point
of the method. **This is the column to trust most.**

**SCORE** — hits, weighted. Explained in full in §5.

**MSRF** — a green, red or purple chip showing a number. MSRF stands for
Multidimensional Spatial Recognition Filters, which is a long name for a list of
390 numbers the system treats as significant. If the gap that produced this date
is on that list, you get a chip. Green is *Normal*, red is *Important*, purple is
*Vortex*. Red and purple are rarer and count for more.

A blank MSRF column is completely normal. Most rows have nothing there.

**OPERATIONS** — which formulas landed here, and from which pair of your dates.
`05(X2→X4)` means formula number 5, working on the gap between your second and
fourth date.

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
adds today as a control, refuses if it is already there, and follows the
Current-date setting if you have overridden it.

**What it does to the numbers.** Adding a fourth date takes you from 3 pairs to
6, which doubles the projections. In a real test:

| | Pairs | Projections | Shown | Hidden |
|---|---|---|---|---|
| Three job dates | 3 | 48 | 23 | 24 |
| + today | 6 | 96 | 25 | 70 |

Note the shape of that: twice as many projections, but only two more rows
survived the filters — because most of the new ones fall in the past and get cut.
More input does not automatically mean more signal.

---

## 8. When nothing lights up

Here is a real run on three real-shaped job dates — 14 Mar 2016, 6 Sep 2019,
11 Jan 2022:

```
3 anchors | 3 pairs | 48 projections | 23 shown | 24 hidden

Top rows:
  05/18/2024   score 2   hits 2   MSRF: none
  06/30/2022   score 1   hits 1   MSRF: none
  02/28/2023   score 1   hits 1   MSRF: none
```

Top score of 2, not a single significant-number match in the entire run.

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

---

## 9. The filters, and why rows go missing

`24 HIDDEN` on the status bar means exactly that: 24 projections were computed
and then removed before you saw them. The **Filters** panel controls this. There
are eight, and they only ever *remove* rows — none of them can invent one.

The ones you will care about:

- **Hide Z-Dates before the current date.** On by default, and usually right — a
  projection into last year is not a forecast. Turn it off if you want to check
  the method against something that already happened.
- **Hide Z-Dates with fewer than *n* hits.** The most useful dial in the app. Set
  it to 2 and everything with no agreement disappears at once.
- **Hide Z-Dates with no MSRF match.** Aggressive. Turns 114 rows into a handful.
  Worth trying once to see what survives.
- **Hide Z-Dates beyond *n* days from the last X-Date.** Caps how far out it will
  look.

Press **RESET** in that panel to get back to the defaults.

A useful habit: run once with the filters wide open to see the true spread, then
tighten them. Starting tight can hide the fact that your top row is only top
because everything else was cut.

---

## 10. What the score is not

Worth being straight about, because the output looks authoritative and dates feel
personal.

**It is not a prediction.** It is the result of fixed arithmetic on the numbers
you typed. The date has no causal relationship to your life; it is a gap
multiplied by 1.618 and added to a day you supplied.

**It is not evidence.** A high score means several formulas in one table happened
to converge. With 160 projections from five dates, some convergence is expected
by chance alone. That is why §6 matters: the question is never "is this score
high" but "is it high compared to the rest of *this* run".

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

## 11. Quick reference

| You want to | Do this |
|---|---|
| Start over | X-Dates panel → `✕` each row → add your own |
| Add today as a control | X-Dates panel → **☉ Today · Protocol Prime** |
| Sort by strength | Click the **SCORE** column header |
| See only rows with agreement | Filters → *fewer than* **2** *hits* |
| Understand one row | Click it → the Audit screen |
| See the whole spread | Filters → **RESET**, then turn off *before the current date* |
| Zoom the timeline | Wheel over it; drag to pan; **Recentre** to reset |
| Set a location (HH:MM scope only) | Scope & Location → **◍ Pick on map** |
| Keep your setup | **Export** screen → copy or save the document |
| Bring it back | **Import** screen → paste it |

**Nothing leaves your machine.** No network call, no account, no telemetry. Close
the tab and it is gone unless you exported it.

---

*Ophis performs arithmetic on the dates it is given and ranks the results by how
many independent operations and number patterns agree. It knows nothing about
your event and has no access to anything beyond those dates. Presented as the
Archaix thesis of Jason Breshears, not as established science. Not affiliated
with Archaix.*
