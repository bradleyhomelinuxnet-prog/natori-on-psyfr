# Handoff

**For whoever picks this up next.** Read this first; it is the shortest path to being useful, and
it is written to be read once, in order, in about fifteen minutes.

---

## 1. What this is, in two paragraphs

Ophis is a date-projection instrument written by Jason M. Breshears. You give it dates on which
similar events happened before; it measures the distance between every pair of them in whole days,
runs each distance through a table of sixteen arithmetic operations, projects the results forward,
and then filters out the projections that bear no arithmetic relationship to what you supplied.

It shipped as `Ophis_v12_Windows.exe`, a ~100 MB Electron application. This repository is a
ground-up reimplementation of it as static browser files: no dependencies, no build step, no
network calls. The owner of the original commissioned the study and owns the copyright. The
reimplementation is **verified bit-exact against the original** on every number it produces, and
that property is the point of the whole project.

---

## 2. The one rule

> **The maths is a contract, not an implementation detail.**

The test suite pins the engine against values read out of the original program, not out of this
one. A failing test means the rebuild has drifted — it does **not** mean the fixture needs
updating.

If you are changing the maths deliberately, change the fixture **and say so in the commit
message**. A silently updated parity fixture makes the entire suite worthless, because nobody can
then tell which numbers were ever checked.

One labelled exception: the `HH:MM regression pin` group in `tests/ophis.test.mjs` is pinned to
*this* implementation, because no original reference output for the sunset-bounded scope was
recoverable. Its header says so. Everything else derives from the original or from the independent
from-spec reference in `docs/reverse/fixtures/`.

```bash
npm test        # 115 assertions, no dependencies, ~2s
```

---

## 3. Current state

Everything the original did.

| Area | State |
|---|---|
| Projection engine (`runOphis`) | Complete, bit-exact, verified end to end |
| Resonance filter (MSRF), 3 tiers | Complete, precedence verified including both IEEE-754 edge cases |
| Scoring (`GTE_V8`, `LTE_V7`) | Complete, all 8 worked examples pinned |
| Output filters (9) and sorts (5 + 1 new) | Complete |
| Event scopes | `DAYS` and `HH_MM` complete; `MONTHS`/`YEARS` refuse to run, as the original did |
| `.oph` documents | Load, save, prettify, minify, multi-event |
| Working surface, results table, timeline | Complete |
| Operations editor, settings, transfer, import/export, audit | Complete |
| Export: CSV, XLSX, PDF | Complete, all three verified by real readers |
| Offline map tile pyramid | Complete — the picker is in the Scope & Location panel, and the tiles are the original's own |

Verification, in brief:

- 49/49 shipped equations × 6 intervals, byte-identical to the original (SHA-256).
- 56/56 desktop operations across four packs compile and evaluate.
- End to end: 10 anchor pairs → 160 projections → 153 distinct dates → **114 survivors, 39 hidden** —
  and the complete 114-row golden asserted **field for field** against an independent from-spec
  reference implementation (`tests/golden.test.mjs`).
- 800 seeded random equations round-trip the printer → tokeniser → parser → evaluator chain
  bit-identically against an independent tree walker; 400 mutated strings can only compile or raise
  `EquationError` (`tests/property.test.mjs`).
- The author's own lookup workbook independently confirms the resonance table: Important 53/53 and
  Vortex 12/12 exact.
- The sunset-bounded scope carries an end-to-end regression pin (implementation-derived, labelled).

---

## 4. Where things are

```
index.html            the app          field-guide.html   the tour
whitepaper.html       the study        chronicon.html     a SEPARATE instrument (see §8)
natori-on-cyphr.html  ALSO separate    PSYFR1/2.html      the preserved originals

src/core/ophis/       THE ENGINE — pure, no DOM, no clock, runs headless under node
  run.js              the pipeline: guards, pairs, projection, bucketing, score, filter, sort
  msrf-match.js       the three-tier filter; ORDER IS THE BEHAVIOUR
  scoring.js          GTE_V8 / LTE_V7
  calendar.js         scopes, instants, Y, the Z window
  filters.js sort.js numeric.js moon.js sun.js constants.js

src/core/equation/    tokeniser -> parser -> AST evaluator. NO eval, NO new Function.
src/core/ophis/mercator.js  the coordinate picker's projection — pure, tested headless
src/data/             THE MOD SURFACE — resonance numbers, operation packs
src/state/            the IsoEvent model, the store
src/ui/ophis/         one file per surface; DOM only (map.js is the picker)
src/io/               .oph, CSV/XLSX/PDF, a ~120-line zip + deflate writer
src/styles/           ophis-tokens.css is the entire palette
assets/map/           725 offline map tiles, and a README saying which are missing

tests/                fixtures taken from the ORIGINAL, not from this code
docs/reverse/         23 subsystem specifications — the teardown
tools/                the dev server, the .exe extraction, the doc renderer
```

Dependencies point one way: `ui` may import `core`, `state`, `io`; `core` may import `data`;
**nothing in `core` may import from `ui`.** That is not style — it is why the engine runs headless
in the test suite.

---

## 5. Read these, in this order

| Document | Why |
|---|---|
| [`README.md`](../README.md) | Orientation, and how to run it |
| [`docs/reverse/00-BUILD-SPEC.md`](reverse/00-BUILD-SPEC.md) | **Authoritative.** The full specification the rebuild implements |
| [`docs/DEVIATIONS.md`](DEVIATIONS.md) | Every deliberate difference from the original, and why |
| [`docs/reverse/22-author-source-documents.md`](reverse/22-author-source-documents.md) | The author's own design documents read against the code — the findings live here |
| [`docs/MODDING.md`](MODDING.md) | One file per kind of change |
| [`docs/WHITEPAPER.md`](WHITEPAPER.md) | The study, its method, and what generalises |

The other 22 files in `docs/reverse/` are subsystem teardowns. Read one when you need that
subsystem; do not read them all.

---

## 6. Traps

These look like bugs. **They are not.** Every one is pinned by a test that will fail if you "fix"
it.

| What you will see | Why it stays |
|---|---|
| `OPH_PI = 3.14` | It is the author's constant, not π. Changing it moves every projection |
| `OPH_PHI` is `1.618` here and `1.61803398875` in chronicon | Two different programs. The tables are deliberately separate; unifying them is the one refactor guaranteed to move results |
| `round1(-1.25) === -1.2` | The original's `Number.EPSILON` nudge is wrong below zero. Reachable whenever X₂ precedes X₁ |
| `76.1` does **not** match Vortex `76.2`, but `76.3` does | Raw IEEE-754, no epsilon. `76.2 - 76.1` is `0.100000000000001` and fails `<= 0.1`. Adding an epsilon flips it |
| `43.5` matches, `100.5` does not | Vortex is checked *before* the `.5` dead zone, and `43.5` is a vortex number |
| Sorting by score shows `Z14` in the first row | Labels come from the chronological pass and identify the *date*; row position reflects the sort. The chart shares the labels |
| `X1` binds to the lower-**indexed** anchor, not the earlier date | Reordering the anchor list is a deliberate control |
| Pairing is **all** pairs, not adjacent ones | It is the method. N anchors give N(N−1)/2 pairs |
| The offset becomes milliseconds *before* it is rounded | Rounding first moves projections by up to half a day |
| `rotation_count_z` is `round1` of the `round2` value | A double rounding — and it is the number the filters probe |
| `SORT_TYPE__OPERATIONS` sorts by count, not score | Both arms of the original's if/else assigned the count. Tooltip corrected; a separate `OPERATION_SCORE` type added |
| The v7 pack ships a row enabled that the source declares disabled | The original's `newOperation` ignores its own `enabled` argument and hard-codes `true` |
| `oph_exp` exists but can never be called | `x` is the multiply operator, so the name lexes as `oph_e × p`. The original had the same hole |

The general rule, from the white paper: **write down which bugs are load-bearing.** If you find
another, add it to this table and to `DEVIATIONS.md`, with a fixture.

---

## 7. Open work

Nothing is blocking, and nothing is left that can be done without the original running.

**1 — An `HH_MM` fixture from the original.** The scope carries an end-to-end regression pin, but
it is pinned to this implementation. If the original can ever be run again, capture its output for
the same three controls and promote the pin to a parity fixture.

**2 — Differential property testing against the original.** The seeded property suite proves the
printer → parser → evaluator chain self-consistent; running the same random corpus through the
original's engine would upgrade that to a differential claim. Needs the original runnable.

### Done since the first handoff

- **The offline map is in** — the last capability the original had and this did not. `◍ Pick on
  map` in the Scope & Location panel opens a pan-and-zoom picker over the original's own tiles,
  with no Leaflet: `src/core/ophis/mercator.js` is the projection, `src/ui/ophis/map.js` is the
  surface, `assets/map/` is the pyramid, and `tests/map.test.mjs` pins both the arithmetic and the
  presence of every tile the picker can reach.
- **Protocol Prime is in the app** — the `☉ Today · Protocol Prime` button in the X-Dates panel
  adds the projection date as a control, refuses a duplicate, and follows the Current-date
  override. The guide, the About screen and the button's own tooltip explain it.
- The full 114-row golden, the property suite, and the `HH:MM` pin — as far as they can go
  without the original.

### Explicitly decided against

**Widening the MSRF to probe every control.** The flow chart says the filter measures each
projection back to all three controls; the shipped engine probes one distance. Measured on the
end-to-end fixture, the change would add a match to 54 % of rows, light up half the rows that
currently match nothing, and double the peak hit count from 4 to 8. A filter whose stated purpose is
"the elimination of phantom dates" is not doing that job better by accepting half of what it
rejected. See `reverse/22` §1.2 for the table. Do not implement this without a reason that
addresses that measurement.

---

## 8. Two things that will confuse you

**`chronicon.html` is not part of Ophis.** It is a separate instrument the owner built, crossing the
Ophis equation grammar with a cycle lattice of his own. It has its own data files
(`src/data/packs.js`, `msrf.js`, `ledger.js`, `lattice.js`, `src/core/scoring/`,
`src/styles/tokens.css`) and shares only the equation engine. Editing an Ophis file will not change
it, and editing a chronicon file will not change Ophis. `PSYFR1.html` and `PSYFR2.html` are its
preserved single-file originals, and `natori-on-cyphr.html` is a later single-file build of the
same line — wholly self-contained, sharing not one byte with `src/`. **Do not merge any of them
into Ophis.**

**The reference material is not in this repository.** The `.exe` files, the unpacked asar, the
author's PDFs and the workbook live on the owner's machine. `docs/reverse/` is the distillation of
them, and it is detailed enough to rebuild from — that is what it was written for. If you need
something the specs do not carry, ask the owner rather than guessing. The one exception is
`assets/map/`: those tiles are the original's, copied byte for byte, because the picker cannot be
rebuilt from a description of a basemap.

---

## 9. Before you push

```bash
npm test                                    # 115 assertions must pass
npm run docs                                # if you touched a doc — it also checks every link
npm run serve                               # then drive the app at 127.0.0.1:8777
npm run test:serve                          # only if you touched tools/serve.mjs
```

CI additionally enforces two properties. Both are load-bearing and neither has an exception:

- **No `eval`, no `new Function`.** The original compiled operation strings — which arrive from
  files — with `new Function()`, and validated a *different* string than the one it compiled. The
  rewrite cannot regress into that defect because it no longer generates code.
- **No `innerHTML` or any markup sink in `src/`.** User text — an event name, a note, an equation —
  goes in as a text node. `src/ui/dom.js` offers no way to set markup at all.

And drive the actual app before pushing a UI change. Three real defects in this project were
invisible in the source and obvious the moment someone moved a pointer over the chart.

---

*Ophis is a study instrument. It performs arithmetic on the dates it is given and ranks the results
by how many independent operations and number patterns agree. It knows nothing about your event and
has no access to anything beyond those dates. Presented as the Archaix thesis of Jason Breshears,
not as established science. Not affiliated with Archaix.*
