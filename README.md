# OPHIS · Pattern-Recognition Event Prediction

[![tests](https://github.com/bradleyhomelinuxnet-prog/natori-on-psyfr/actions/workflows/test.yml/badge.svg)](https://github.com/bradleyhomelinuxnet-prog/natori-on-psyfr/actions/workflows/test.yml) [![Live site](https://img.shields.io/badge/live-site-d8a943)](https://bradleyhomelinuxnet-prog.github.io/natori-on-psyfr/) [![license: CC BY-NC-SA 4.0](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-3d6fb4)](https://github.com/bradleyhomelinuxnet-prog/natori-on-psyfr/blob/main/LICENSE) ![No dependencies](https://img.shields.io/badge/dependencies-none-7faa5a) ![Works offline](https://img.shields.io/badge/works-offline-54b8c9)

A ground-up rebuild of **Ophis v12** — Jason M. Breshears' date-projection instrument — reverse
engineered from the shipped Windows application with the owner's permission, and verified
bit-exact against it.

Give it two or more dates on which similar events occurred. It measures the distance between every
pair of them in axial rotations of the Earth, runs each distance through a table of sixteen
operations, projects the results forward, and filters out the projections that bear no arithmetic
relationship to the controls.

Nothing leaves the page. There is no network call, no sign-in, and no dependency.

**New here?** [`start.html`](start.html) is the guided first run: a short story (Natori's notebook)
walks you through naming something that keeps happening, adding the dates, and reading the few
future days worth watching, in plain English. It runs the same engine and hands your dates to the
full app when you want every row. Each date also links out to the Chronotecture plates that name its
year or numbers.

---What it is

It’s a browser app with no server and no install. You open index.html (or the all-in-one ophis-single.html) and everything runs on your own machine. It also deploys as a plain GitHub Pages site. REA found no network calls in the core code, so nothing you enter leaves your computer. Your work is saved in the browser’s own storage, and you can also save it to a .oph file.

The folder actually holds two generations of the same tool:

ophis/ is the original OPHIS app: older jQuery code with charting, map and astronomy libraries. Your docs/reverse/ notes show it was taken apart from a desktop (Electron) build, versions 9 through 12.
src/ is your clean rebuild of that engine, plus the Natorion/PSYFR cipher layer on top.
How a prediction run works
You describe a recurring event. For example, “job changes.” You list the past dates it happened (the app calls these X-dates) and pick a location on a built-in offline world map.
It sanity-checks your dates. Before calculating, it warns you if dates are too close together, too old, or too few. These are the “SOP warnings.”
It runs “operations.” These are small formulas written in the app’s own mini-language, which has its own tokenizer, parser, constants and named “reckonings.” Each formula takes your past dates and projects them forward to candidate future dates.
It anchors each day to sunset, not midnight. It calculates local sunset for your location and uses that as the day boundary, the way ancient calendars did.
It checks the sky. Each candidate date is compared against moon phase and two eclipse tables (solar and lunar). Dates that fall within a few days of an eclipse or a key lunar phase get flagged.
It scores and tags. Each hit gets a score, a strength rating from the MSRF magnitude system, and pattern tags such as Fibonacci spacing, daily-rhythm (diurnal) markers, and geographic (geodetic) markers. Top-strength results are marked “alpha.”
It filters and groups. Your filter settings trim the list. Nearby hits are bundled into time windows, so a cluster of agreeing formulas stands out as one strong window.
You see the results. They appear as a sortable table, a timeline chart, and points on the map. You can export them or save the whole session as a .oph file. The examples/ folder has ready-made ones, including 04-even-spacing-19-138.oph.
The Natorion / Chronicon layer

The other half of src/ (app.js, plus the panels for anchors, wheels, convergence and ledger) is the cipher-and-cycles side. It converts dates to Julian Day Numbers and checks those numbers for palindromes. It also places each date within long cycles:

Maya Long Count
Metonic (19-year) cycle
Phoenix cycle
Nemesis cycle
“Anunna turnings”
Years since the cataclysm

A convergence finder then looks for moments where several of these cycles line up at once. chronicon.html, PSYFR1/2.html and natori-on-cyphr.html are the standalone pages for this side.

Supporting pieces
tests/: checks that the rebuild gives the same answers as the original (“golden” and “parity” tests).
tools/: scripts to serve the app locally, bundle it into one HTML file, and convert the docs to HTML.
docs/: your manual, whitepaper and reverse-engineering notes.

## Running it

```bash
git clone https://github.com/bradleyhomelinuxnet-prog/natori-on-psyfr
cd natori-on-psyfr
npm run serve            # then open http://127.0.0.1:8777/
```

That is the whole setup. There is no `npm install` step — the app has no dependencies and neither
does the suite. `package.json` lists two devDependencies, and they exist only to unpack the
original `.exe` inside `tools/`. Install them if you are redoing the teardown; skip them otherwise.

ES modules will not load over `file://`, so double-clicking `index.html` gives you a blank page.
It has to come off a server. Any server will do — `npm run serve` is one that ships with the
repository, dependency-free, so the instruction above works on a machine with no registry and no
`python` on PATH:

```bash
npm run serve -- --port 9000      # if 8777 is taken
npm run serve -- --host 0.0.0.0   # if you are browsing in from another machine
npm run serve -- --help           # every flag
python3 -m http.server 8777       # equally fine, if you would rather
```

```bash
npm test                 # 134 fixtures, no dependencies, pinning the engine against the original
npm run test:serve       # the server above, separately — it is not part of the contract
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
      mercator.js       the coordinate picker's projection
    equation/           tokeniser -> parser -> AST evaluator. No eval.
    eclipses.js         delta-decoded eclipse tables
  data/                 THE MOD SURFACE — MSRF numbers, operation packs
  state/                the IsoEvent model and the store
  ui/ophis/             one file per surface; DOM only
  io/                   .oph documents, CSV / XLSX / PDF, a tiny zip writer
  styles/               ophis-tokens.css is the whole palette
assets/map/             725 offline map tiles — the original's own, trimmed
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

Full details in **[docs/MODDING.md](docs/MODDING.md)**. The two additive packs, Extras and the ten
Mirrors, take the table from sixteen operations to 36; the Mirrors are written up in
**[docs/MIRRORS.md](docs/MIRRORS.md)**.

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

`tests/map.test.mjs` adds the coordinate picker: the Mercator round trip at every zoom, the
round-clamp-round the original applied to a click, and a walk over every map tile the picker can
reach, which fails if one is not in `assets/map/`.

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

**[docs/MANUAL.md](docs/MANUAL.md)** — *Your Own Dates.* A plain-English manual for anyone who
wants to put their own significant dates in and read the score honestly. No maths assumed; the
worked example and the score distribution in it are computed by the engine, not described.

**[docs/WHITEPAPER.md](docs/WHITEPAPER.md)** — *Rebuilding a Closed Prediction Engine Without
Breaking It.*

---

## Also here

Three separate instruments live beside the Ophis app. None of them is part of it, none shares its
engine beyond the equation grammar, and none is linked from inside it.

| File | What it is |
|---|---|
| `chronicon.html` | The Chronicon calendrics engine — the Ophis grammar crossed with the Breshears cycle lattice |
| `natori-on-cyphr.html` | The Cyphr build of the same idea: a four-cycle lattice (Phoenix 138 · Nemesis 792 · NER 600 · Metonic 19), two switchable scoring lenses, a convergence table and the wheels. Carries no eclipse tables by design |
| `PSYFR1.html` / `PSYFR2.html` | The preserved single-file engine and field guide the Chronicon line grew from |

They are the owner's own additions and are kept because they work.
`PSYFR1.html` and `PSYFR2.html` are its preserved single-file originals.

---

## Licence

**CC BY-NC-SA 4.0** — Creative Commons Attribution-NonCommercial-ShareAlike.
Use it, study it, take it apart, pass it on. Credit the source, don't sell it, and keep
adaptations under the same terms. Full text and the scope notes are in [`LICENSE`](LICENSE).

This is a study instrument, not a product.

The original shipped under *Use & Share, No Derivatives*, which withheld modification, ports and
forks. The copyright in it is held by the same person who commissioned this rebuild, so it is
relicensed here on purpose — No Derivatives contradicted a repository that is built to be modified
and ships [`docs/MODDING.md`](docs/MODDING.md) to explain how.

Three things here are **not** under that licence, and [`LICENSE`](LICENSE) says so in full: the
three typefaces (SIL Open Font License 1.1 — notice in [`src/styles/fonts/OFL.txt`](src/styles/fonts/OFL.txt)), the *Archaix* thesis itself (Jason M. Breshears' —
what is licensed is this project's own expression of it), and the NASA eclipse canon the eclipse
tables are rebuilt from. The framing notice — that this is a study instrument rendering the Archaix
thesis, and that it studies software, not cosmology — is required attribution and must be retained.
