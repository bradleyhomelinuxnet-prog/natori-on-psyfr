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

---

## 10. Not carried over from the desktop build

The Electron app had features the browser rewrite does not (yet) reproduce. They are specified in
`docs/reverse/` if you want them:

| Feature | Spec | Note |
|---|---|---|
| Chart.js timeline with moon-phase & eclipse overlays | `10-view-chart.md` | The largest missing piece |
| PDF / XLSX export | `11-export.md` | CSV is implemented |
| Sunset-based day boundaries via lat/long | `05-config-utils.md`, `12-astronomy-data.md` | Needs a real ephemeris library |
| Offline Leaflet map for picking lat/long | `12-astronomy-data.md` | ~1400 tiles ship in the study repo |
| The full desktop MSRF sets and filter chain | `03-scoring-msrf.md`, `02-engine-operations.md` | The browser set is a reduced 87 numbers |
| Multiple saved events per file | `04-persistence-format.md` | `.oph` import takes the first event only |
