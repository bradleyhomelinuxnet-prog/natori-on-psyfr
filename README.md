# OPHIS · Pattern-Recognition Event Prediction

A ground-up rebuild of **Ophis v12** — Jason M. Breshears' date-projection instrument — reverse
engineered from the shipped Windows application with the owner's permission, and verified
bit-exact against it.

Give it two or more dates on which similar events occurred. It measures the distance between every
pair of them in axial rotations of the Earth, runs each distance through a table of sixteen
operations, projects the results forward, and filters out the projections that bear no arithmetic
relationship to the controls.

Nothing leaves the page. There is no network call, no sign-in, and no dependency.

---

## Running it

Static files — any web server will do:

```bash
npm run serve          # python -m http.server 8777
```

Then open <http://localhost:8777/>. ES modules need `http://`, not `file://`.

```bash
npm test               # 94 fixtures, no dependencies
```

---

## What it does

1. **Controls.** Enter the X-Dates — the past occurrences. Every unordered *pair* gives one **Y**,
   the distance between them in whole days.
2. **Cast.** Each of the sixteen operations turns a Y into a day-offset and projects a **Z-Date**
   from one of the two controls in that pair. Five controls give ten pairs and 160 projections.
3. **Resonate.** Every projection's distance from its anchor is probed against the **MSRF** — the
   Multidimensional Spatial Recognition Filters, 390 numbers in three tiers.
4. **Score.** Each operation contributes its own weight. Each MSRF match contributes its tier's
   points — except the strongest, which *multiplies* the total instead.
5. **Filter and read.** Eight filters cut the noise; the table and the timeline show what is left.

### Protocol Prime

The author's flow chart takes **three** controls: the two historical dates, and *the date the
projection is being conducted on*. That third control produces two further spans and triples the
output — fourteen operations across three spans give the forty-two projections the chart describes,
collapsing to "38 or 39 actual dates" once duplicates merge.

Nothing in the software enforces this, and nothing in it hints at it. Enter today's date as a third
X-Date and the engine does the rest. See [`docs/reverse/22`](docs/reverse/22-author-source-documents.md).

---

## Layout

```
index.html              the app shell
src/
  ophis-app.js          bootstrap; wires each screen to its host
  core/
    ophis/              THE ENGINE — pure, no DOM, no clock, runs under node
      constants.js      every constant, per reckoning
      numeric.js        round1 / round2, including where they are wrong for negatives
      calendar.js       scopes, instants, Y, and the Z window
      sun.js            sunset, for HH:MM scope
      msrf-match.js     the three-tier filter and its precedence
      scoring.js        GTE_V8 and LTE_V7
      filters.js        the nine predicates
      sort.js           the five sort types, plus the one v12 promised
      run.js            runOphis — the pipeline
    equation/           tokeniser -> parser -> AST evaluator. No eval.
    eclipses.js         delta-decoded eclipse tables
  data/                 THE MOD SURFACE — MSRF numbers, operation packs
  state/                the IsoEvent model and the store
  ui/ophis/             one file per surface; DOM only
  io/                   .oph documents, CSV / XLSX / PDF, a tiny zip writer
  styles/               ophis-tokens.css is the whole palette
tests/                  parity fixtures taken from the original engine
docs/reverse/           the full reverse-engineering study, 23 specs
```

---

## Built to be modified

Each kind of change touches exactly one file:

| Change | File |
|---|---|
| Operation packs | `src/data/packs-ophis.js` |
| MSRF numbers | `src/data/msrf-ophis.js` |
| Equation constants / functions | `src/core/equation/reckonings.js` |
| Scoring | `src/core/ophis/scoring.js` |
| Filters | `src/core/ophis/filters.js` |
| Colours, fonts, spacing | `src/styles/ophis-tokens.css` |

Full details in **[docs/MODDING.md](docs/MODDING.md)**.

---

## Verification

`tests/ophis.test.mjs` pins the engine against values read out of the original, not out of this
implementation:

- the three MSRF arrays, at their shipped lengths, with `1574` at its out-of-order index 248;
- the match precedence, including the vortex *steal* at `76.3` and the IEEE-754 near-miss at `76.1`
  that must **not** be given an epsilon;
- all eight worked scoring examples;
- the HH:MM `+1` / `−1` asymmetry;
- a complete end-to-end cast — 10 pairs, 160 projections, 153 distinct dates collapsing to 114
  under the default filters — with **all 114 surviving rows asserted field for field** against an
  independent from-spec reference implementation;
- and a seeded property suite: 800 random equations round-tripping the printer → parser →
  evaluator chain bit-identically, 400 garbage strings that may only compile or raise, and the
  scoring identities held over 300 random match sets.

What is deliberately *different* — no `eval`, no arbitrary-path writes, no sign-in theatre, and
"today" read from the clock rather than baked in — is listed in
**[docs/DEVIATIONS.md](docs/DEVIATIONS.md)**.

---

## Handing this on

**[docs/HANDOFF.md](docs/HANDOFF.md)** is the fifteen-minute brief for whoever picks this up next:
current state, the one rule, where everything lives, the traps that look like bugs and are not, and
what is still open.

Every backbone document also renders as a browsable page — `docs/html/index.html` is the way in,
and `npm run docs` rebuilds them all from the Markdown, which stays the source of truth.

---

## The study

[`docs/reverse/`](docs/reverse/) is the full teardown, subsystem by subsystem.
[`docs/reverse/22`](docs/reverse/22-author-source-documents.md) reads the author's own design
documents against the shipped behaviour, and is where the findings live: Protocol Prime, the two
operations whose class the author's notes contradict, the four MSRF numbers where the author's
workbook and the binary disagree, and the 2556-versus-2559 day window.

**[docs/WHITEPAPER.md](docs/WHITEPAPER.md)** — *Rebuilding a Closed Prediction Engine Without
Breaking It.*

---

## Also here

`chronicon.html` is a separate instrument — the Chronicon calendrics engine, which crosses the
Ophis grammar with the Breshears cycle lattice. It is the owner's own addition and is **not** part
of Ophis; it is kept because it works and is linked from nowhere in the Ophis app.
`PSYFR1.html` and `PSYFR2.html` are its preserved single-file originals.
