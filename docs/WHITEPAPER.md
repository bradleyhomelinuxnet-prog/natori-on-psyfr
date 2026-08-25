# Rebuilding a Closed Prediction Engine Without Breaking It

### A white-box study of Ophis v12 / PSYFR, and a verified reimplementation

**Version 1.0 · August 2026**

---

## Abstract

Ophis v12 — distributed as **PSYFR** — is an offline date-projection tool: given two or more anchor
dates, it measures the interval between them, transforms that interval through a table of arithmetic
operations, and projects future dates which it then scores against a set of resonance criteria. It
ships as a 100 MB Electron application, its calculation engine reachable only through a GUI, and its
behaviour defined in practice by whatever the code happens to do.

This paper documents a complete white-box teardown of that application and its reimplementation as a
static, modular, dependency-free browser app. The teardown recovered the full renderer, the Electron
main process, and the shipped bootstrap; it also recovered a body of first-party documentation that
names the system's parts in terms the code never uses.

The contribution most likely to transfer to other work is not the teardown but the **verification
method**. Rewriting a calculation engine carries a specific risk: the rewrite keeps working, keeps
looking right, and quietly stops agreeing. We addressed this by treating the original as a live
oracle — driving the shipped build in a real browser, extracting its functions and constants through
the debugging interface, and comparing canonicalised outputs by cryptographic hash rather than by
eye. All 49 shipped equations, evaluated across six intervals, produce byte-identical results in
both implementations. A complete 33-row scored projection reproduces row for row, and every fixed
point asserted by the original authors' own test harness holds in the rewrite.

The rewrite deliberately diverges in seven documented respects, each removing a defect rather than a
feature. Chief among them: the original compiled operation strings — which arrive from preset files
— with `new Function()`, and validated a *different* string than the one it compiled. The rewrite
replaces this with a tokeniser, parser and AST evaluator, achieving identical results with no
dynamic code generation.

**Keywords:** reverse engineering, differential testing, Electron security, oracle-based
verification, legacy migration, domain-specific languages.

---

## 1. Scope and authorization

The software studied here belongs to the author of this paper, who commissioned the study of it.
All work is white-box, conducted on artifacts already in the owner's possession, and no third-party
system was accessed at any point. The packaged binaries were **read, never executed**; container
formats were identified from their bytes and unpacked with standalone extractors.

Two framing statements matter for reading the rest of this document.

**This paper studies software, not cosmology.** Ophis renders the *Archaix* thesis of Jason
Breshears as a calculating instrument. That thesis — a cycle lattice of 138, 792, 600 and 19 years,
an Annus Mundi era beginning 3895 BC, and a reading of the šar as a single turning of the stars — is
presented here **as that thesis**, exactly as the software presents it, and not as established
science. Where this paper says a projection "resonates", it means the program's own scoring
function assigned it points. No claim is made or tested about whether such projections predict
anything.

**Security findings concern the owner's own application.** They are reported because a rebuild that
reproduced them would be a worse rebuild, and because the failure modes are instructive beyond this
program. Nothing here is exploitable against a system the reader does not already control, and no
exploit code is provided.

---

## 2. The system under study

### 2.1 What it computes

The user supplies two or more dates, called **X-Dates**. For a pair, the whole number of days
between them is **Y** — the system's own documentation calls this a count of *axial rotations of the
Earth*, and insists on that framing because the rotation is the physical constant and the "day" is
the name hung on it.

Each **operation** is a small arithmetic expression that turns Y into a day-offset:

```
X2+oph_round(Y)                   the same interval, stepped forward again
X2+oph_flip(oph_round(Y))         the interval with its digits reversed
X2+Y/OPH_PHI                      the interval divided by the golden ratio
X1+oph_round(Y/138)*138           the interval snapped to the nearest whole 138-year grid
```

The offset is added to one of the two anchors — which one is fixed by the `X1+` or `X2+` prefix —
and rounded to a whole day. The result is a **Z-Date**: a projection.

Z-Dates are then scored. In the browser build, scoring weighs each date against the cycle lattice:
does it fall on a Phoenix node, in the documented event ledger, on a numeric palindrome, a whole
number of Metonic cycles from today, or within a day of a real solar or lunar eclipse. Two
weightings — "lenses" — are offered, and switching between them re-scores the same projections.

The output that the method actually cares about is not the highest-scoring single date but the
**convergence**: a date that several *different* operations, ideally from different anchor pairs,
independently arrive at.

### 2.2 What was found in the box

The distribution contains **two different programs** sharing a vocabulary and little else. Reading
either alone gives a misleading account of the system, and prior analyses that read only one did.

| | Ophis v12 (desktop) | NATORI-ON-PSYFR (browser) |
|---|---|---|
| Package | Electron 39, NSIS portable `.exe` | one self-contained HTML file |
| Scores against | MSRF resonance numbers | the Chronicon cycle lattice |
| Time resolution | days, bounded by local sunset | Julian days; year-level cycles |
| Location aware | yes — latitude/longitude, offline map | no |
| Also carries | Chart.js timeline, PDF/XLSX export | wheels, ledger, convergence detection |
| First-party source | 24 modules, ~500 KB | ~97 KB inline |
| φ, as coded | `1.618` | `1.61803398875` |

They do not even agree on the golden ratio. What ships to users as the product is the fusion: the
Ophis predictive grammar read through Chronicon calendrics.

A third artifact — the vendor's own **Technical Reference v1.0** — states plainly that the browser
build's grammar was itself *"reverse-engineered from the Ophis v12 browser tool"*. The lineage is
therefore: a desktop engine, an independent reimplementation of its grammar with new scoring, and
now a third implementation verified against the second.

---

## 3. Method

The discipline that governed the teardown: **identify the container from its bytes before running
anything.** No stage of this work executed the target binary.

### 3.1 Static unpacking

| Probe | Result | Inference |
|---|---|---|
| First two bytes | `4D 5A` (`MZ`) | Windows PE |
| PE machine field | `0x14C` | 32-bit |
| String scan `Nullsoft` | hit | NSIS installer stub |
| `package.json` → `win.target` | `portable` | electron-builder portable |
| String scan `app.asar` | no cleartext hit | payload is compressed |

electron-builder's NSIS package embeds a 7-Zip stream, which a standalone extractor reads directly:

```bash
7za e Ophis_v12_Windows.exe "resources/app.asar" -o./extracted
npx @electron/asar extract extracted/app.asar extracted/unpacked
```

This yields the renderer plus the three files a source-only pass never sees: **`main.js`** (the
Electron main process), **`preload.js`** (the privileged bridge definition), and **`ophis.html`**
(the real bootstrap, with its Content-Security-Policy and script load order).

The application is **entirely un-obfuscated** — real identifiers, real comments, live `TODO`s, and a
stray `debugger;`. No deobfuscation stage was required, which is the single factor that made a
complete read feasible.

### 3.2 The original as a live oracle

Static reading establishes what code *says*. For a numerical engine, what matters is what it
*computes*, and the two diverge in exactly the places that hurt: floating-point association,
rounding order, string coercion.

So the shipped browser build was served over `http://localhost` and driven in a real browser. Its
functions were recovered through `Function.prototype.toString`, its module-scope constants by direct
evaluation, and its behaviour by invoking `cast()` on known inputs. This produced a reference corpus
that is not an interpretation of the source but a recording of the running program.

That corpus — constants, helper semantics, eclipse table shapes, a full scored cast — became the
fixtures the rewrite is tested against. It is documented in full as spec 15 of the accompanying
study.

### 3.3 Parallel specification

Fourteen independent analyses were run over the codebase, one per subsystem — the equation engine,
the projection pipeline, scoring, persistence, the view layer, charting, export, astronomy — each
producing an implementation-grade specification: exact constants, exact algorithm steps, cited by
file and line. These were reconciled into a single build specification. Where two specifications
disagreed, the original source settled it and the resolution was recorded.

The value of the redundancy was not coverage but **disagreement**. Three substantive errors in
individual specifications were caught only because another specification contradicted them.

---

## 4. Findings: the documented model

A body of first-party documentation accompanies the software and names its parts. Two findings from
it materially changed our model of the system, and both had been got wrong by every prior reading —
including our own first pass, and including the vendor's own browser build.

### 4.1 MSRF is not a list of numbers

Every prior reading treated *MSRF* as a bag of significant integers. It is an acronym:
**Multidimensional Spatial Recognition Filter**, and it names **six** constituent filters —
Annular Chronometric, Geodetic Chronometry, Hydrogen Spacing Angle, Fibonacci Sequence,
Intra-Decimal Matrix, and Vortex Holography.

A number's **tier** is not an importance ranking assigned by hand. It is a *count*: how many of
those six filters the number appears in, which the source calls its "dimensions of arithmetic". The
authoritative table runs to **566 entries across seven tiers**:

| Tier | Dimensions | Numbers | Character |
|---|---|---|---|
| I | 2 | 281 | the broad base |
| II | 3 | 139 | |
| III | 4 | 75 | |
| IV | 5 | 27 | |
| V | 6 | 14 | every filter agrees |
| VI | 7 | 13 | |
| VII | 8+ | 17 | **Apex Projections** — ceta 5 · beta 5 · alpha 7 |

The shipped browser build carries a flat, untiered set of 87. The tier structure — the part that
makes the table a *measurement* rather than a preference — was lost somewhere between the
specification and the implementation.

Transcription was done programmatically from the source text rather than by eye, and every stated
count reconciles exactly. Two irregularities exist in the source document itself and are preserved
rather than corrected: Tier I lists `468` twice, and `480` appears under both Tier I and Tier III.
The published counts only reconcile with both left in place. Our lookup resolves `480` to the higher
tier, on the reasoning that a tier is a claim about how many filters found the number and the larger
count is the one that cannot be explained by an omission — but this is a judgement call, and it is
recorded as one.

### 4.2 The system has a name and a shape

The documented procedure is **PREPS** — Pattern-Recognition Event Prediction System — and it takes
*three* control dates, not an open list: two past dates on which similar events occurred, and **the
date the projection is being conducted**, which the documentation names **Protocol Prime**. Their
three pairwise distances feed 14 operations to produce 42 projections, "though there are 42
projections there is most often only 38 to 39 actual dates" because different operations land on the
same day.

The 14 decompose as one **Isometric Projection**, one **Holofractal Recognition**, and a
twelve-formula **Core Algorithm** of which four are designated ALPHA and eight beta.

This is reassuring for the rewrite rather than disruptive. With three anchors, the general all-pairs
rule produces exactly the three intervals the documentation names — the N-anchor generalisation is a
*superset* of the documented model, not a departure from it.

One evidential note, stated with its limits. Counting the ALPHA weights among the twelve Core
Algorithm operations in the shipped table gives **two** under the pre-v8 weighting and **exactly
four** under the v8-and-later weighting, matching the documented 4/8 split. That is real evidence
that the v8+ weighting is canonical. But the *positions* only mostly agree — the documentation marks
Core Algo III, VII, VIII and X as ALPHA where the shipped v8+ table marks III, IV, VII and VIII.
Three of four agree. Since the twelve formulas were themselves never disclosed, nothing published
lets us confirm that the documentation's ordinal numbering matches the code's list order. It is a
match in count, not a proof of identity, and it is reported as such.

### 4.3 The vortex numbers decoded

The sixth MSRF filter, **Vortex Holography**, contributes the only non-integers in the entire
resonance table — `21.7, 32.6, 43.5, 65.3, 76.2, 87.1` and the same values ten times larger. An
interval is a whole number of days, so an exact match against `21.7` is impossible, and nobody had
explained what the numbers were.

The documentation describes their origin as running `1..15000` through "a program that subtracted
every number from a holographic reflection of itself", after which ~95% "collapse to zero" and the
remainder "loop upon themselves … patterned in 9 and 11-dimensional distributions."

That is **reverse-and-subtract** — `n → |n − reverse(n)|`, iterated; the same digit reversal the
engine exposes as `oph_flip`. Running it settles the question. Over the four-digit numbers there is
exactly one attractor, a two-step cycle `2178 → 6534 → 2178`, whose family is:

| n | | reverse | ǀn − revǀ | digital root |
|---|---|---|---|---|
| 2178 | 99 × 22 | 8712 | 6534 | 9 |
| 4356 | 99 × 44 | 6534 | 2178 | 9 |
| 6534 | 99 × 66 | 4356 | 2178 | 9 |
| 8712 | 99 × 88 | 2178 | 6534 | 9 |

`2178 = 2 × 3² × 11²`. The "9 and 11-dimensional distributions" are **99 = 9 × 11**: every member is
`99 × 22k`, and nine governs the family through the digital root while never appearing as a digit.

Every table entry then resolves to a four-digit multiple of 99, scaled by a power of ten and
*truncated* to one decimal place — which is why `32.67` is written `32.6`. Twelve entries, six
distinct numbers: `99 × {22, 33, 44, 66, 77, 88}`. Four are the loop; `3267` and `7623` are a mirror
pair entering it in one step.

The detail that confirms the reconstruction is an **absence**. `99 × 55 = 5445` is a palindrome, so
it collapses to zero on the first step and is not immortal — and it is the one multiple in that
range missing from the table. Whoever built it was running the process, not choosing pretty numbers.

Community claims about this family circulated in the user group without a stated domain. Tested,
they are wrong over `1..15000` and almost exactly right over the four-digit numbers: 92.9% collapse
to zero; the basin holds 637 numbers, of which 636 arrive from elsewhere — the published figure,
exactly; all 637 divide by 11; and the gaps between them are precisely `{11, 22, 33}`. One claim,
that each member reaches the loop in one to four steps, does not reproduce — measured lengths run
two to six — and is recorded as unreproduced rather than dropped.

The practical consequence for the software is blunt: **as shipped, the vortex filter cannot fire.**
Integers never equal fractions. The desktop engine acknowledged this with a tolerance match; the
browser build dropped the path entirely. The reconstruction gives a principled alternative — match
against `99 × {22, 33, 44, 66, 77, 88}` directly, since that is what the numbers are — but which
reading is correct is the owner's call, not ours. Full working: `docs/VORTEX.md`.

### 4.4 What was deliberately withheld

The documentation states explicitly that several components remain undisclosed: the twelve Core
Algorithm formulas as such, Protocol Prime, the tier internals, and the original VBA implementation.

The consequence should be stated plainly. **What the software computes is exactly what its shipped
operation table says it computes** — that table is readable, and this paper reproduces it. Claims of
predictive accuracy that depend on the withheld parts — a "75.9%" single-date figure appears in the
procedural notes — are the author's claims, reproduced here as attributions and **not** verified by
this work. No experiment in this study bears on whether the method predicts anything.

---

## 5. Findings: security

All findings are in the owner's own software. They are ordered by what a reader building something
similar should take away, not by severity theatre.

### 5.1 The validator inspected a different string than the compiler ran

Operation equations arrive from `.oph` preset files — user-shareable documents. Both the desktop and
browser builds passed them to `new Function()`.

The check that was supposed to make this safe operated on a *transformed copy*: constants and
function names substituted away, then the remainder tested against a character allowlist. The string
that was then compiled was the **untouched original**. Validator and executor inspected different
inputs, by construction.

This is the general failure mode worth extracting: **any validation performed on a normalised copy
is only sound if the normalised copy is also what executes.** Sanitise-then-compile is safe;
sanitise-a-copy-then-compile-the-original is not, no matter how good the sanitiser.

The allowlist happens to be tight enough that we could not construct an escape. That is not the
point. The property was absent, and its absence was invisible from the call site.

### 5.2 An unvalidated file write behind a privileged bridge

The main process registers an IPC handler that writes a caller-supplied path with caller-supplied
contents:

```js
// main.js
ipcMain.on('autoSaveToFile', (event, filePath, fileContents) => { … });

fs.writeFile(filePath, fileContents, err => { … });   // no path validation
```

`preload.js` exposes it to the renderer's main world through `contextBridge`. Chained to §5.1, this
is a path from *opening a preset* to *writing a file anywhere the user can write*.

Accuracy matters here more than alarm. The window is created with `nodeIntegration: true` — which
prior analysis reported as the headline finding — but with `contextIsolation` and `sandbox` left
unspecified, and Electron 39 defaults both to **on**. The renderer therefore does *not* get
`require`. The arbitrary write is real, but it comes through the **deliberately exposed bridge**,
not through node integration. The misconfiguration is genuine and should be removed; it is not the
mechanism.

The transferable lesson is about the bridge, not the flag: `contextBridge` narrows *who* can call a
capability, and does nothing about *what the capability permits*. A bridge method taking an
unconstrained path is an unconstrained path.

### 5.3 Renderer code assembled by string concatenation

The main process calls back into the renderer by building JavaScript source with `+`:

```js
win.webContents.executeJavaScript(
  'onOphFileOpened("' + filePathEscaped + '", "' + escapedData + '", ' + flag + ');'
);
```

The escaper handles exactly two characters:

```js
toReturn = toReturn.replace(/\\/g, '\\\\');
toReturn = toReturn.replace(/"/g, '\\"');
```

Notably absent: line terminators. A raw newline inside either interpolated value would close the
string literal and begin a new statement.

Reachability is narrower than it first appears, and honesty requires saying so. The data argument is
`JSON.stringify` output, which emits no raw newlines. The path argument is a filename, and Windows
filenames cannot contain newlines — though macOS and Linux filenames can. So the defect is real,
the pattern is indefensible, and the practical exposure on the primary target platform is low. All
three statements are true at once.

### 5.4 Authentication as decoration

A sign-in gate compared user input against hard-coded SHA-512 digests, in the renderer — the process
being gated. By v12 the path was vestigial; re-enabling it crashed initialisation.

The rewrite removes it rather than reimplementing it. A local, offline instrument has no party to
authenticate to, and **a control that does not control anything is worse than no control**: it
invites reliance it cannot support.

### 5.5 Correctness defects with security-shaped consequences

Two findings are not vulnerabilities but belong here because they silently corrupt results.

`TODAY` was a hard-coded literal. Every Metonic test measured from it, so the instrument aged out of
correctness without any symptom.

Adding an anchor re-sorted the list by date — while an `X1+` operation binds to the *lower-indexed*
anchor. Adding a date therefore silently re-bound which anchor half the formulas projected from.
The output remained plausible, which is what makes it the more dangerous class of bug.

---

## 6. The rebuild

### 6.1 Objective

Not a port. A reimplementation that is **provably equivalent on the mathematics** and deliberately
different everywhere the original was defective — built so that the owner can keep changing it for
years without a rewrite.

### 6.2 Structure

```
data/          pure data — packs · MSRF sets · ledger · lattice · eclipse tables
  ↓
core/          pure functions — no DOM, no clock, no globals
               jdn · cycles · eclipses · equation/{tokenizer,parser,evaluator} ·
               scoring/{traits,lenses} · cast · convergence
  ↓
state/store    a plain object plus subscribe/notify
  ↓
ui/            DOM only — seven panels, each owning one region
io/            CSV · config · downloads
```

Dependencies point downward only. `core/` never imports from `ui/`, which is why the entire engine
runs headless under `node --test` with no DOM shim.

Static ES modules, no framework, no build step, no runtime dependencies. The deployable artifact is
the source.

### 6.3 The design constraint that shaped everything

The owner's stated requirement was to keep modifying it. That converts directly into a testable
property: **each category of change must touch exactly one file.**

| Change | File |
|---|---|
| Operation packs | `data/packs.js` |
| Equation constants / functions | `core/equation/constants.js` · `functions.js` |
| Scoring lenses | `core/scoring/lenses.js` |
| Resonance traits | `core/scoring/traits.js` |
| Resonance number sets | `data/msrf.js` |
| Documented events | `data/ledger.js` |
| Cycle periods | `data/lattice.js` |
| Full visual identity | `styles/tokens.css` |

A scoring lens is not a code path; it is an ordered list of `[trait, points]` pairs. The lens
selector and the Method documentation are both *generated* from that list, so a new lens appears in
the interface with no interface work.

This was tested rather than asserted. The owner's own roadmap named "add the new constants" and "add
the new math functions" as its next two tasks. Both were implemented as single data-file edits —
sixteen constants and ten functions — and the application's documentation section absorbed them
unprompted, because it generates from the live tables. The parity hash was unchanged, confirming the
additions were strictly additive.

### 6.4 Replacing dynamic compilation

The equation grammar is small enough to state formally:

```
equation := ("X1" | "X2") "+" body
body     := term (("+" | "-" | "*" | "/" | "x") term)*
term     := number | "Y" | CONSTANT | "(" body ")" | "-" term
          | FUNCTION "(" body ("," body)* ")"
```

The rewrite implements a tokeniser, a recursive-descent parser producing a small AST, and an
evaluator that walks it against fixed constant and function tables. Function arity is read from
`fn.length` and enforced at parse time, so a miscall is a message — `oph_mod() takes 2 arguments,
got 1` — rather than a silent `NaN`.

Because the validated string *is* the evaluated string, §5.1 cannot recur. The page ships a
Content-Security-Policy with no `'unsafe-eval'`, and continuous integration fails the build if
`eval`, `new Function`, or an `innerHTML` sink reappears anywhere in `src/`.

### 6.5 Quirks preserved on purpose

Several behaviours look like defects and were kept, because every projection depends on them.
Preserving them is a deliberate, documented act — not an oversight — and each carries a comment
saying so:

- **`OPH_PI` is `3.14`**, not `Math.PI`. It is the lore constant; correcting it moves every date
  that touches it.
- **`oph_flip(12.5) === 52.1`.** The decimal point is re-inserted at the index it occupied in the
  original string, not the mirrored position. This is not "reverse the number".
- **Pairing is all-pairs**, so anchors grow the cast quadratically.
- **Resonance matches on the interval *or* the offset** — easy to miss, and load-bearing.
- **Convergence windows chain transitively**, so a ±30-day cluster can span far more. Rather than
  "fix" this, the rewrite surfaces each cluster's actual span.

The distinction between a bug and a specification is not a property of the code. It is a decision,
and it should be written down where the code is.

---

## 7. Verification

This is the part of the work that generalises.

### 7.1 The risk being managed

Rewriting a calculation engine risks a specific failure: the rewrite works, looks right, passes the
tests you thought to write, and disagrees with the original on inputs nobody checked. Unit tests
written *from the rewrite's own understanding* cannot detect this, because they encode the same
misunderstanding.

The only reliable oracle is the original program.

### 7.2 Differential testing against a live instance

The shipped build was driven in a real browser and its engine invoked directly. Every operation in
all five shipped packs was evaluated at six intervals spanning four orders of magnitude. Results
were canonicalised — deterministic ordering, explicit `-0` normalisation, full float precision — and
reduced to a single SHA-256 digest on each side:

```
original :  1b45516616a067b07ba892c31331e863cda9bd54f60a99ea0013df965108821a
rewrite  :  1b45516616a067b07ba892c31331e863cda9bd54f60a99ea0013df965108821a
```

294 floating-point values, no tolerance applied. Hashing rather than eyeballing is the point:
comparison is total, and the result is a single bit.

The digest is a **regression tripwire**, not a one-off. It was re-run after the grammar was extended
with multi-argument functions and sixteen new constants, and was unchanged — which is what
establishes that the extension was strictly additive.

### 7.3 Layered fixtures

Hashing proves agreement without localising disagreement, so the digest sits on top of graduated
fixtures, each pinned to values read from the original:

1. **Calendar** — Julian day numbers for known anchors; round-trips across the proleptic Gregorian
   range including the BC/astronomical-year boundary.
2. **Helpers** — `oph_flip` on the cases that expose its decimal quirk.
3. **Operations** — individual equation outputs at full precision.
4. **Cycles** — Phoenix, Nemesis, NER, Annus Mundi, Long-Count.
5. **Astronomy** — decoded eclipse table bounds and specific coincidences.
6. **End-to-end** — a complete 33-row scored cast: every row's date, Julian day, era conversions,
   interval, operation, score and resonance tags.
7. **Negative** — malformed equations that must be *rejected*, including injection attempts.

The end-to-end fixture is the one that catches integration errors, and it caught a real one: a
projection reached by the same operation via two *different* anchor pairs must be kept, not
deduplicated. That repetition is signal in the method. A rewrite that "tidied" it would have looked
correct and quietly changed the answer.

### 7.4 Independent conformance

Recovering the vendor's own Technical Reference late in the work provided an unusual check: an
independent statement of expected behaviour, written before our rewrite existed. Its §3.1 lists four
fixed points its authors asserted before any interface work began. All four hold in the rewrite,
including *"All 24 Phoenix events mod 138 = 108, exactly"*, and they are now pinned as tests
attributed to that document.

### 7.5 Adversarial review of the rewrite

Verification against the original cannot find defects the original never had. So the rewrite was
reviewed on its own terms: independent reviewers across four dimensions, then a second pass whose
explicit task was to **refute** each finding by executing it, defaulting to "refuted" under
uncertainty.

Eleven findings survived. Every one was reproduced by running the shipped modules — not by reading
them. The most severe was a genuine regression introduced by the rewrite: switching the scoring lens
re-ran the entire cast against whatever the inputs had become since, so toggling the lens after
disabling an operation destroyed projections while reporting "Re-scored". The fix — snapshotting the
inputs a cast was built from, and re-scoring against that snapshot — is now itself a fixture.

The methodological point: **adversarial verification, with a refutation default, is what makes
automated review usable.** Findings that merely sound plausible cost more to triage than they save.
Requiring a reproduction converts a list of suspicions into a work queue.

---

## 8. Results

| Property | Result |
|---|---|
| Equation agreement | 49/49 equations × 6 intervals, byte-identical (SHA-256) |
| End-to-end cast | 33/33 rows reproduced exactly |
| Vendor sanity anchors | 4/4 hold |
| Test suite | 35 assertions, all passing |
| Dynamic code-evaluation sinks | 0 (was 1) |
| Markup sinks in application code | 0 |
| Runtime dependencies | 0 |
| Build step | none |
| Cast + render, 4,257 projections | ~60 ms |
| Deployment | static hosting; runs air-gapped |

Feature coverage relative to the browser build is complete: the projection engine, both scoring
lenses, convergence detection, all seven cycle wheels, the 69-event ledger, filtering, sorting, CSV
export, save/load, and import of the desktop application's `.oph` presets — including their
`x`-for-multiply syntax and constants the browser build never supported.

Beyond it: the tiered resonance table as a selectable set, an extended grammar with multi-argument
functions and twenty constants, per-panel error containment, and generated documentation.

---

## 9. Limitations

**Coverage of the desktop build is partial.** The Chart.js timeline with moon-phase and eclipse
overlays, PDF and spreadsheet export, sunset-bounded day boundaries computed from latitude and
longitude, and the offline map are specified in the accompanying study but not implemented. The
largest is the timeline.

**Equation agreement is not total behavioural equivalence.** The digest covers the shipped equation
corpus at six intervals — a large and well-chosen sample, not a proof. Property-based testing over
randomly generated equations and intervals would strengthen the claim materially and has not been
done.

**The eclipse tables are inherited, not derived.** They are used as shipped. Their upstream
provenance and dating convention are under investigation; until that resolves, an "eclipse
coincidence" should be read as *agreement with the bundled table*, which is a weaker statement than
agreement with the sky.

**One tier assignment is a judgement call.** `480` appears under two tiers in the source. We resolve
to the higher and say so; a reader who disagrees can change one line.

**Nothing here evaluates the method.** This paper establishes that the rewrite computes what the
original computed. Whether what either computes has predictive value is a separate question, outside
this scope, and not addressed by any result reported here.

---

## 10. Conclusions

Four things generalise beyond this program.

**Use the original as an oracle, not as a reference to read.** For numerical work, what the code
computes and what it appears to say diverge precisely where the errors live. Driving the original
and hashing its output turns "did we get it right" from a judgement into a comparison.

**Hash the comparison.** Reviewing 294 float values by eye is theatre. A single digest is total,
cheap to re-run, and doubles as a regression tripwire for every later change.

**Validate the thing you execute.** Sanitising a copy while compiling the original is a defect
pattern that survives review because both halves look correct in isolation. Where possible, remove
the property from reach entirely — the rewrite cannot regress into §5.1 because it no longer
generates code.

**Write down which bugs are load-bearing.** `OPH_PI = 3.14` is indistinguishable from an error by
inspection. What separates a specification from a defect is a decision recorded next to the code,
and a fixture that fails if someone later "fixes" it.

The rewrite is deployed as static files, runs offline, carries no dependencies, and has an explicit
mod surface with each category of change confined to a single file. Whether that promise holds is
also an empirical question, and the first two roadmap items landing as single data edits is the
first evidence that it does.

---

## Appendix A — The golden cast

Three anchors — the Great Flood (2239 BC, astronomical −2238), today, and the 2040 Phoenix node —
cast through the standard 19-operation pack under the chronology-first lens. The original produces
33 projections; so does the rewrite, in the same order, with the same scores and tags.

| Score | Projected date | Julian day | AM | LC | Interval | Operation | Resonance |
|---|---|---|---|---|---|---|---|
| 12 | 2040 CE · 05/10 | 2,466,285 | 5934 | 5152 | 1,562,508 | `X1+oph_round(Y/19)*19` | Phoenix node · Documented · ☉ partial |
| 10 | 2040 CE · 03/04 | 2,466,218 | 5934 | 5152 | 5,012 | `X1+Y*360/365.2422` | Phoenix node · Documented |
| 10 | 2040 CE · 05/19 | 2,466,294 | 5934 | 5152 | 5,012 | `X1+oph_round(Y/19)*19` | Phoenix node · Documented |
| 10 | 2040 CE · 06/03 | 2,466,309 | 5934 | 5152 | 1,562,508 | `X1+Y+19` | Phoenix node · Documented |
| 10 | 2040 CE · 06/03 | 2,466,309 | 5934 | 5152 | 5,012 | `X1+Y+19` | Phoenix node · Documented |
| 7 | 2046 CE · 02/18 | 2,468,395 | 5940 | 5158 | 5,012 | `X2+oph_flip(oph_round(Y))` | Documented · Nemesis · Baktun |
| 5 | 2026 CE · 08/16 | 2,461,269 | 5920 | 5138 | 1,557,496 | `X1+oph_round(Y/19)*19` | Metonic·19 · 138 · ☾ partial |

Rows four and five are the same date from the same operation via *different* anchor pairs — the case
that must not be deduplicated.

## Appendix B — Reproducing the verification

```bash
git clone https://github.com/bradleyhomelinuxnet-prog/natori-on-psyfr
cd natori-on-psyfr
node --test tests/parity.test.mjs      # 35 assertions
python -m http.server 8777             # then open http://localhost:8777/
```

The teardown itself is reproducible from the original `.exe` using the commands in §3.1. The
extraction tooling is in `tools/`; the subsystem specifications are in `docs/reverse/`.

---

*Prepared as a technical study of the author's own software. NATORI-ON-PSYFR is a worldbuilding and
study instrument rendering the Archaix thesis of Jason Breshears as predictive calendrics, presented
as that thesis and not as established science. Not affiliated with Archaix.*
