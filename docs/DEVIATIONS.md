# Deliberate deviations from the original

The rewrite is **bit-exact** on the mathematics — see `tests/parity.test.mjs`, which pins it
against values read out of the original engine running in a browser. Everything below is a place
where it deliberately behaves *differently*, and why.

---

## 1. No `new Function` / no `eval`

**Original.** Operation equations were handed to `new Function(...)`. Both the desktop build and
the browser build did this, and in both the string that was *validated* was not the string that was
*compiled*: the validator inspected a copy with constants and function names substituted out, then
compiled the untouched original. Equations arrive from `.oph` preset files, so that is an untrusted
input reaching a code-generation sink.

**Now.** `src/core/equation/` is a real tokeniser → recursive-descent parser → AST evaluator. Same
grammar, same results, no code generation. A malformed equation is a validation error with a
character position, not a thrown exception from the JS engine — and not a way to run code.

This also lets `index.html` ship a Content-Security-Policy without `'unsafe-eval'`.

**Verified:** all 49 shipped equations across all five packs, at six values of Y, produce
byte-identical output to the original (compared by SHA-256 of the canonicalised results).

**Prior art.** This approach was not invented here. `Ophis_v12_Hardened_Engine_Lab.html` in the
study folder is an earlier proof-of-fix that already replaced `new Function` with an AST walker and
self-verified both parity and injection resistance in the browser. The rewrite productionises that
prototype: same idea, split into a tokeniser, parser and evaluator, with arity checking, positioned
error messages, and the parity check moved into a test suite that CI runs.

---

## 2. No arbitrary-path file writes

**Original.** The desktop build wrote files through an Electron IPC bridge that called
`fs.writeFile` with no path validation, from a renderer running with `nodeIntegration: true`. That
combination let a crafted preset drop a file anywhere the user could write.

**Now.** Browser-only. Exports go through `Blob` + a download link, so the user chooses the
destination. `src/io/download.js` is the only place that hands out a file.

---

## 3. No sign-in

**Original.** A client-side sign-in gate compared against five hard-coded SHA-512 hashes. Since the
check ran in the renderer, it was decoration — and in v12 re-enabling it crashed init anyway.

**Now.** Removed entirely. A local, offline study instrument has no one to authenticate to. Nothing
that looks like access control should exist unless it actually controls access.

---

## 4. "Today" comes from the clock

**Original.** `TODAY` was a baked-in literal (`{y:2026, m:8, d:25}`). Every Metonic test measured
from that fixed date, so the app silently went stale.

**Now.** `today()` reads the system clock and `state.referenceYear` flows into the scoring. The
test suite pins `referenceYear` to 2026 explicitly so the parity fixtures stay stable.

---

## 5. User text is never markup

**Original.** Rows were assembled with `innerHTML` and template strings, including anchor labels
and event text.

**Now.** `el()` sets `textContent`. The `html:` escape hatch exists but is only ever called with
string literals written into the source. Anchor labels are also prefixed when they could be read as
a spreadsheet formula on CSV export.

---

## 6. Errors are contained per panel

**Original.** One flat script; a throw during render left the page half-built.

**Now.** `app.js` initialises each panel inside a `try`, logging and continuing. A broken panel
costs you that panel, not the app.

---

## 7. `x` is a real operator, not a string replace

**Original.** The body of an equation had `.replace(/x/g, '*')` applied to it globally, so any name
containing a lowercase `x` would be silently corrupted.

**Now.** The tokeniser treats `x` and `×` as multiplication tokens and stops identifiers at them.
Same behaviour for every equation that exists; no longer a landmine for a future
`oph_max`. The constraint is documented in `docs/MODDING.md`: **no name may contain a lowercase
`x`**.

---

## 8. The grammar is a superset

The original's parser accepted only single-argument functions and four constants. The rewrite adds
**multi-argument functions** (`oph_mod(a,b)`, `oph_pow`, `oph_gcd`, `oph_lcm`, `oph_atan2`,
`oph_snap`), trigonometry, and sixteen further constants — the Saros and Inex eclipse cycles, the
Sothic cycle, precession, the planetary returns, the four year-lengths, `OPH_E` and `OPH_TAU`.

This is strictly additive. Every equation the original accepted still parses and produces the
identical value: the parity hash over all 49 shipped equations × 6 values of Y is unchanged
(`1b455166…8821a`).

Arity is read from `fn.length` and enforced at compile time, so a miscalled function is a clear
message (`oph_mod() takes 2 arguments, got 1`) rather than a silent `NaN`.

These were the top two items on the owner's own roadmap, and each was a single data-file edit —
which is the architecture doing what it was built for.

---

## 9. Preserved on purpose

These look like bugs and are **kept**, because parity depends on them:

| Behaviour | Why it looks wrong | Why it stays |
|---|---|---|
| `OPH_PI = 3.14` | Not `Math.PI` | It is the Archaix constant; changing it moves every projection |
| `oph_flip(12.5) === 52.1` | The decimal point is re-inserted at its **original** index, not mirrored | Every flip operation depends on it |
| `oph_flip` returns `0` for `NaN` | Silently swallows a bad value | Some equations rely on the fallthrough |
| `X1` binds to the lower-**indexed** anchor, not the earlier date | Surprising | Reordering the anchor list is a deliberate control |
| Pairing is **all pairs**, not adjacent | Expensive at high anchor counts | It is the method |
| MSRF matches on the interval **or** the offset | Easy to miss | Both are scored in the original |
| Eclipse lookup returns *a* hit, not the *nearest* | Only matters when tolerance > 1 | Tolerance is 1 in the cast |
| Convergence day-windows chain transitively | A ±30 cluster can span more than 30 days | Exposed via `spanDays` rather than changed |

And in the `ophis` reckoning specifically:

| Behaviour | Why it looks wrong | Why it stays |
|---|---|---|
| `round1(-1.25) === -1.2` | The `Number.EPSILON` nudge is wrong below zero | Reachable whenever X₂ precedes X₁; the original rounds this way |
| The vortex tolerance uses raw IEEE-754 | `76.1` misses `76.2` by `0.000000000000001` | Adding an epsilon flips that row and moves every projection near it |
| `43.5` matches, but `100.5` does not | The `.5` dead zone runs *after* the vortex pass | `43.5` **is** a vortex number; order is the whole behaviour |
| `rotation_count_z` is `round1` of the `round2` value | A double rounding | It is the number the filters probe; probing the raw value finds different matches |
| The offset becomes milliseconds *before* it is rounded | Two rounding steps in a confusing order | Rounding first moves projections by up to half a day |
| `SORT_TYPE__OPERATIONS` sorts by **count**, not score | The column tooltip promised score | Both arms of the original's if/else assigned the count. Tooltip corrected; `SORT_TYPE__OPERATION_SCORE` added alongside |
| The 'beyond N days' filter defaults to **2559** | The author's own notes say the window is 2556 days | The code reuses `HIGHEST_MSRF_NUMBER`; the two constants are unrelated and collided. The field is editable |
| Two operations carry a class the author's notes contradict | Core IV is Alpha here and beta there; Core X the reverse | Weight feeds `operation_score` directly, so moving either shifts every score. See `reverse/22` |

---

## 10. Not carried over from the desktop build

Almost everything the Electron app did is now here. What is left:

| Feature | Spec | Note |
|---|---|---|
| Offline Leaflet map for picking lat/long | `12-astronomy-data.md` | v12 shipped a 1 365-tile pyramid — 97 % of its asset payload — purely so the picker worked air-gapped. Coordinates are typed instead |
| Skins and `EVENT_TYPE`-driven window titles | `14-domain-and-style.md` | `type` stays in the schema so a `.oph` round-trips, and is otherwise inert |
| Headless mode and its query-parameter validation modes | `16-electron-main-process.md` | The strict/loose distinction survives in `io/oph.js`; there is no CLI to select it |

---

## 11. Introduced by this rebuild

Places where the rewrite does something the original did not do at all.

| Change | Why |
|---|---|
| **Chart labels are chosen, not shoved.** Colliding date labels are dropped by rank rather than pushed apart | v12 spread them with a recursive pass, which turns an overlap into a band of text no longer above the date it names. Every surviving label sits at its true position |
| **Arcs are real ellipses.** | v12 set `lineTension` using a Chart.js **v2** option name that v4 ignores, so every arc was silently a 13-segment polyline |
| **Hovering re-strokes one arc** instead of rebuilding every dataset | Its chart library could not reorder datasets, so a hover rebuilt all of them |
| **The Audit screen exists.** | v12's `renderDebugOutput` was written, commented out of the screen list, and shipped with two bugs |
| **The activity log exists.** | The author's own `// TODO: Try to pipe these kinds of things to an activity log, ultimately. Toasts are limited.` Every toast is mirrored into it |
| **Sunset is computed, not looked up.** ~60 lines of Meeus reduction replaces three libraries totalling ~150 KB | Only one of the three was ever reached, and the app consumed exactly one value from it. Agrees to about a minute |
| **XLSX ships the same 8 columns as the CSV**, with a frozen bold header | v12's was an admitted 3-column proof of concept |
| **The PDF is a real layout pass** | v12's callback state machine drifted 40 pt per page and could emit `<table width="NaN">` |
| **An empty result is not an error.** A dedicated panel with a *Loosen filters* shortcut | v12 rendered it under a header reading *Errors* in red. An over-tight filter is not an error |
| **Everything is keyboard-operable** | v12 set `tabIndex = -1` on every button and checkbox at startup |

---

## 12. Known reductions

One place where this rebuild is *narrower* than the design, recorded so it is not mistaken for
an oversight.

**The MSRF probes one distance per projection, not three.** The author's flow chart (`[CC]`) says
the filter measures "the distance in axial rotations between all 42 projected dates back to A, B
**and** C". The shipped v12 engine probes only `rotation_count_z` — the offset from the operation's
own base anchor — and this reproduces that. The distances back to the other controls are never
computed and never filtered on.

This is faithful to the binary and unfaithful to the design — and measurement suggests the binary
is right. On the `test-bradley` fixture, probing all three distances adds a match to **54 % of
rows**, lights up half the rows that currently match nothing, and doubles the peak hit count from
4 to 8. A filter whose stated job is "the elimination of phantom dates" does not do that job better
by matching half of what it used to reject.

Left as shipped. The full table is in `reverse/22` §1.2.
