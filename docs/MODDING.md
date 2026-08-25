# Modding Ophis

The whole point of the rebuild is that each kind of change touches **one file**. This is that list,
with a worked example for each.

Nothing here needs a build step. Edit the file, reload the page.

---

## The one-file rules

| I want to… | Edit | And |
|---|---|---|
| Add / change an **operation pack** | `src/data/packs-ophis.js` | It appears in the pack bar on the Operations screen |
| Change the **MSRF numbers** | `src/data/msrf-ophis.js` | Scoring, the About listing and the self-check all follow |
| Add a **constant** usable in equations (`OPH_*`) | `src/core/equation/reckonings.js` | Usable immediately, documented on the Operations screen |
| Add a **function** usable in equations (`oph_*`) | `src/core/equation/reckonings.js` | Same |
| Change how a **score** is computed | `src/core/ophis/scoring.js` | The Audit screen's derivation follows automatically |
| Add / change an **output filter** | `src/core/ophis/filters.js` | The Filters panel renders straight off `FILTER_ROWS` |
| Add a **sort type** | `src/core/ophis/sort.js` | Add the column to `COLUMNS` in `ui/ophis/results.js` |
| Add a **chart overlay** toggle | `src/state/iso-event.js` → `CHART_OPTIONS` | The Chart Config panel renders off it; draw it in `ui/ophis/chart.js` |
| Re-skin — **colours, fonts, spacing** | `src/styles/ophis-tokens.css` | Every component resolves through these |
| Change **what a screen says** | `src/ui/ophis/shell.js` → `SCREENS` | Titles, ledes and the nav all come from there |

Anything that needs *two* files is a design smell. If you hit one, it is worth asking whether the
seam is in the right place.

---

## Adding an operation pack

Packs are data. A pack is a list of `[equation, weight, note]`.

```js
// src/data/packs-ophis.js
export const OPHIS_PACKS = {
  // …existing packs…

  'ophis-lunar': {
    id: 'ophis-lunar',
    label: 'Lunar · 4 operations',
    note: 'Projections snapped to whole lunations.',
    operations: [
      ['X2+Yx29.53', 1, 'one synodic month per rotation'],
      ['X1+Yx29.53', 1, ''],
      ['X2+Y/29.53', 0.5, ''],
      ['X2+oph_round(Y/29.53)x29.53', 1, 'snap to the nearest whole moon'],
    ].map((r, i) => ({ equation: r[0], weight: r[1], enabled: true, packId: 'ophis-lunar', ordinal: i, note: r[2] })),
  },
};
```

Reload; it is in the pack bar. **Ordinal order is load-bearing** — `operation_ordinal` indexes the
array everywhere, so inserting a row in the middle of an *existing* pack renumbers every result
after it.

### The equation grammar

```
equation := ("X1+" | "X2+") expression
expression := term (("+" | "-") term)*
term       := factor (("*" | "x" | "×" | "/") factor)*
factor     := "-"? primary
primary    := number | "Y" | CONSTANT | function "(" expression ("," expression)* ")" | "(" expression ")"
```

The prefix decides **which anchor of the pair the offset is added to**, not which is subtracted.
`Y` is the distance between the pair, always positive when the list is in order.

> **`x` is multiplication**, so no name may contain a lowercase `x`. `oph_exp` is declared because
> the original declared it, and can never be called: the name lexes as `oph_e × p`. The original
> had the same hole from the other direction — it did a global `.replace(/x/g, '*')`.

---

## Adding a constant

```js
// src/core/equation/reckonings.js
const OPHIS_CONSTANTS = {
  OPH_PI: 3.14,
  OPH_PHI: 1.618,
  OPH_CRV: 5.08,
  OPH_HEP: 7.01,
  OPH_SAROS: 6585.3211,   // <- new
};
```

Give it a line in `constantNotes` in the same object and it documents itself on the Operations
screen. Then `X2+Y/OPH_SAROS` parses.

> The two reckonings keep **separate** constant tables, and they disagree: `OPH_PHI` is `1.618`
> here and `1.61803398875` in the chronicon app. That is a real divergence between two programs,
> not a transcription slip. Unifying them is the one refactor guaranteed to move results.

---

## Adding a function

Arity is read from `fn.length`, so declare parameters explicitly — a rest parameter or a default
value reports the wrong count to the parser.

```js
// src/core/equation/reckonings.js
const OPHIS_FUNCTIONS = {
  // …existing…
  oph_snap: (v, step) => (step === 0 ? v : Math.round(v / step) * step),
};
```

Add a `functionNotes` entry. Then `X1+oph_snap(Y, 138)` works.

Keep functions **pure and total**. The evaluator rejects a non-finite result, but a function that
throws costs you that projection.

---

## Changing the MSRF numbers

```js
// src/data/msrf-ophis.js
export const MSRF_FILTER__NORMAL = [ …, 1729 ];
```

Three properties are load-bearing and the test suite pins them:

- **NORMAL is not sorted**, and `1574` sits at index 248. The scorer scans linearly, so the order is
  invisible to a result — but reordering breaks a byte-comparison against the original, and any
  future binary search would then be wrong in a way nothing catches.
- **IMPORTANT is disjoint from NORMAL** and is checked first.
- **VORTEX is checked before both**, on the 1-dp value, using a plain IEEE-754 comparison. Do not
  add an epsilon: `76.1` must miss `76.2` and `76.3` must hit it.

If you widen a tier, update the length assertions in `tests/ophis.test.mjs` in the same commit —
they exist to make a careless edit loud.

---

## Adding an output filter

```js
// src/core/ophis/filters.js
export const FILTER_DEFAULTS = {
  // …existing…
  iso_event_filter_weekend_only: false,
};

export const FILTER_ROWS = [
  // …existing…
  { id: 9, flag: 'iso_event_filter_weekend_only', label: 'Show only weekends' },
];
```

Then one clause in `applyFilters`:

```js
if (isoEvent.iso_event_filter_weekend_only) {
  const day = new Date(zStart).getUTCDay();
  if (day !== 0 && day !== 6) include = false;
}
```

The Filters panel renders off `FILTER_ROWS`, so it appears with no UI change.

**Every predicate may only ever set `include = false`.** No early exits, no mutation. That is what
makes the order irrelevant and the set safe to extend.

---

## Changing how scoring works

`src/core/ophis/scoring.js` is a single function. The shape to preserve:

```
operationScore   = Σ weights of the operations that reached this date
M                = max multiplier over the resonance matches, floored at 1.0
resonanceSubscore= Σ points, EXCLUDING the first match whose own multiplier === M
score            = round2((operationScore + resonanceSubscore) × M)
```

`M` is a **max, never a product**. Ten Important matches multiply once and add two points each.

The Audit screen reads the stamped fields (`operation_score`, `resonance_subscore`,
`base_score_pre_multiply`, `score_multiplier`), so a change here explains itself there with no
further work — provided you keep stamping them.

---

## Re-skinning

`src/styles/ophis-tokens.css` is the entire palette. Every colour resolves through one of these,
so a re-skin means editing that file and nothing else.

```css
:root {
  --gold:   #d8a943;   /* structure: labels, rules, Alpha operations */
  --cyan:   #56bcd0;   /* Beta operations, focus rings */
  --green:  #7fbb5c;   /* Normal MSRF, saved */
  --red:    #e0503c;   /* Important MSRF, destructive */
  --violet: #a98ade;   /* Vortex MSRF */
}
```

Two rules worth keeping:

- **Define every token on bare `:root`.** A viewer with no explicit theme and no media support must
  still get a full palette rather than transparent boxes.
- **The `--hits-*` ramp is fixed across themes.** Those four colours encode data, not decoration:
  someone comparing two screenshots must see the same colour mean the same count.

---

## Architecture, in one picture

```
  data/  ──────────────►  core/ophis/  ──────────────►  ui/ophis/
  packs-ophis.js          run.js  scoring.js            work.js
  msrf-ophis.js           filters.js  sort.js           results.js
                          calendar.js  msrf-match.js    chart.js
                                  ▲                     screens.js
                                  │                          │
                          core/equation/               state/ophis-store.js
                          tokenizer → parser → eval           │
                                                          io/  oph.js
                                                               export-results.js
```

Dependencies point **one way**: `ui` may import from `core`, `state` and `io`; `core` may import
from `data`; nothing in `core` may import from `ui`.

That is not style. It is why `src/core/ophis/` runs headless under node with no DOM, which is what
lets the whole pipeline be tested without a browser.

---

## Testing a change

```bash
npm test
```

76 fixtures, no dependencies. They pin the engine against values read out of the **original**, not
out of this implementation — so a failure means the rebuild has drifted, not that the fixture needs
updating.

If you are changing the maths on purpose, the honest move is to change the fixture **and say so in
the commit message**. A silently updated parity fixture is the one thing that makes the whole suite
worthless.

To check the UI as well, serve it and drive it:

```bash
npm run serve   # then http://localhost:8777/
```

---

## A note on the other app

`chronicon.html` is a different instrument with its own data files — `src/data/packs.js`,
`msrf.js`, `ledger.js`, `lattice.js`, `src/core/scoring/`, `src/styles/tokens.css`. It shares the
equation engine and nothing else. Editing an Ophis file will not change it, and editing a chronicon
file will not change Ophis.
