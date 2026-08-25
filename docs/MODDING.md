# Modding NATORI-ON-PSYFR

The rewrite exists so you can change it. Everything the engine treats as
"configuration" lives in a data file, and each kind of change touches **exactly one file**.

Nothing here needs a build step. Edit, save, reload the page.

---

## The one-file rules

| I want to… | Edit only | Then |
|---|---|---|
| Add / change an **operation pack** | `src/data/packs.js` | It appears in the pack bar automatically |
| Add a **constant** usable in equations (`OPH_*`) | `src/core/equation/constants.js` | Usable immediately, documented under Method automatically |
| Add a **function** usable in equations (`oph_*`) | `src/core/equation/functions.js` | Same |
| Add / retune a **scoring lens** | `src/core/scoring/lenses.js` | Appears in the lens toggle automatically |
| Add a **resonance trait** to score | `src/core/scoring/traits.js` | Then give it points in `lenses.js` |
| Change the **MSRF number set** | `src/data/msrf.js` | — |
| Add / edit **documented events** | `src/data/ledger.js` | Ledger, seed menu and DOCUMENTED scoring all update |
| Retune a **cycle** (138 / 792 / 600 / 19) | `src/data/lattice.js` | Wheels and scoring both follow |
| Re-skin — **colours, fonts, spacing** | `src/styles/tokens.css` | Every component resolves through these |
| Change **wording** | `index.html` | Static copy lives in the markup |

---

## Adding an operation pack

Packs are plain arrays of equation strings.

```js
// src/data/packs.js
export const PACKS = {
  'Default 19': [ /* … */ ],

  'My Pack': [
    'X2+oph_round(Y/216)*216',
    'X1+Y*432/360',
    'X2+oph_flip(oph_round(Y/7))',
  ],
};
```

That is the whole change. The pack bar reads `Object.keys(PACKS)`.

### The equation grammar

```
equation := ("X1" | "X2") "+" body
body     := term (("+" | "-" | "*" | "/" | "x") term)*
term     := number | "Y" | CONSTANT | FUNCTION "(" body ")" | "(" body ")" | "-" term
```

- Every equation **must** start `X1+` or `X2+`. That prefix decides which anchor of the pair the
  projection is measured from.
- `Y` is the interval between the two anchors, in whole days.
- `x` and `×` mean multiply (the original wrote `YxOPH_PHI`). Because of that, **no constant or
  function name may contain a lowercase `x`**.
- Whitespace is ignored.

Equations are parsed into a syntax tree and walked. They are never compiled or `eval`'d, so a bad
equation is a validation error, not a crash — and not a security problem. See
[DEVIATIONS.md](DEVIATIONS.md).

---

## Adding a constant

```js
// src/core/equation/constants.js
export const CONSTANTS = {
  OPH_PHI: 1.61803398875,
  OPH_PI: 3.14,
  OPH_CRV: 5.08,
  OPH_HEP: 7.83,
  OPH_ROY: 2.718,        // <- yours
};

export const CONSTANT_NOTES = {
  // …
  OPH_ROY: "Euler's number, as the Ophis 'extras' sheet writes it",
};
```

It is usable in equations at once, and the Method section documents it for you.

> **Do not "correct" `OPH_PI`.** It is 3.14, not `Math.PI`, in the original. Changing it silently
> moves every projection that uses it.

---

## Adding a function

Keep it pure and single-argument:

```js
// src/core/equation/functions.js
export const FUNCTIONS = {
  // …
  oph_digitsum: (v) => String(Math.abs(Math.round(v))).split('').reduce((a, c) => a + +c, 0),
};

export const FUNCTION_NOTES = {
  // …
  oph_digitsum: 'Sum of the digits',
};
```

---

## Adding a scoring lens

A lens is pure data: an ordered list of `[trait, points]`, plus the three values applied during the
cast. The order controls both the arithmetic and the order the tags appear in on a row.

```js
// src/core/scoring/lenses.js
export const LENSES = {
  V8: { /* … */ },
  V7: { /* … */ },

  V9: {
    id: 'V9',
    label: 'V9 · Eclipse-first',
    note: 'Weights eclipse coincidence above everything else.',
    order: [
      ['phx', 2],
      ['doc', 2],
      ['pal', 1],
    ],
    msrf: 1,
    solar: 8,   // the point of this lens
    lunar: 5,
  },
};
```

The lens toggle and the Method documentation are both generated from `lensList()`, so a new lens
shows up with no UI work.

### Adding a new trait to score

Two steps. First compute it:

```js
// src/core/scoring/traits.js
export const TRAIT_META = {
  // …
  sat: { label: 'SATURN 60', cls: 'nem' },   // reuse a chip class, or add one to components.css
};

export function computeTraits(astroYear, J, referenceYear) {
  // …
  if (mod(astroYear, 60) === 0) active.add('sat');
  return { active, metonic };
}
```

Then give it points in whichever lenses should care:

```js
order: [ /* … */ ['sat', 3] ],
```

A trait no lens scores is simply inert — adding one never breaks an existing lens.

---

## Re-skinning

`src/styles/tokens.css` is the entire palette. Every colour in the app resolves through one of
these variables, and the roles are stable across themes — only the values swap.

```css
:root {
  --gold: #d8a943;    /* primary accent */
  --red:  #d3402f;    /* Phoenix, danger, the cast button */
  --cyan: #54b8c9;    /* Metonic, focus rings */
  /* … */
}

:root[data-theme='light'] {
  --gold: #9a6f14;
  /* … */
}
```

Add a third theme by adding a `:root[data-theme='yours']` block and a button that sets
`document.documentElement.dataset.theme`.

---

## Architecture, in one picture

```
                    data/            (pure data — the mod surface)
        packs · msrf · ledger · lattice · eclipses.data
                      │
                      ▼
                    core/            (pure functions — no DOM, testable in node)
   jdn ── cycles ── eclipses ── equation/{tokenizer,parser,index}
                      │
              scoring/{traits,lenses,index}
                      │
              cast ── convergence
                      │
                      ▼
                   state/store       (plain object + subscribe)
                      │
                      ▼
                     ui/             (DOM only — reads core, never reimplements it)
     chrome · dom · panels/{anchors,operations,results,
                            convergence,wheels,ledger,method}
                      │
                     io/             (csv · config · download)
```

Dependencies point **downward only**. `core/` never imports from `ui/`, which is why the whole
engine runs headless under `node --test`.

---

## Testing a change

```bash
node --test tests/parity.test.mjs
```

The suite pins the rewrite against values read out of the **original** engine — Julian day numbers,
each operation's output, eclipse hits, and a full 33-row scored cast. If you change the engine and
these fail, you have changed behaviour, not just structure. That may be exactly what you intended —
in which case update the expectations and note why.

If you are deliberately diverging from the original, add a line to
[DEVIATIONS.md](DEVIATIONS.md) so the next person knows it was a decision.
