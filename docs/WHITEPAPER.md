# Rebuilding a Closed Prediction Engine Without Breaking It

### A white-box study of Ophis v12 / PSYFR, and a verified reimplementation

**Version 2.0 · August 2026**

*Version 2 extends the study from the browser lineage to the desktop engine itself, and adds
§4.5 — a reading of the author's own design documents against the shipped behaviour.*

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

Version 2 reports two further results. The **desktop projection engine** — scopes, the three-tier
resonance filter, the multiplying scoring system, the nine output filters, and the whole
`runOphis` pipeline — is now reimplemented and pinned by an end-to-end fixture: ten anchor pairs
producing 160 projections, collapsing to 153 distinct dates and 114 survivors under the default
filters, with the top row's score reproduced through every intermediate term.

And the owner supplied five of the **original author's own design documents**, written before the
software existed. Reading them against the shipped behaviour proved unexpectedly productive: it
recovered an undocumented operating procedure that triples the system's output, identified two
operations whose classification the implementation and the design contradict, and — via the
author's own lookup workbook — independently confirmed a resonance table that two prior reports
had miscounted. §4.5 reports these. The general result is that **a system's design documents are a
usable oracle for its code**, in the same way its running binary is, and they fail in different
places.

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

### 4.5 The author's design documents as a second oracle

Partway through the study the owner supplied five documents written by the system's author before
any code existed: an operations flow chart, a prose description of the six resonance filters, a
procedural walkthrough naming all fourteen operations, a list of what the author had deliberately
withheld, and a spreadsheet implementing the resonance lookup by hand.

These are not documentation *of* the software. They predate it. That makes them an oracle of a
different kind from the running binary — one that reports what the system was *meant* to do — and
the places where the two disagree turn out to be the interesting ones.

#### 4.5.1 An operating procedure the software never mentions

The flow chart takes **three** controls, labelled `A`, `B` and `C`. `A` and `B` are the historical
dates. `C` is annotated *"the date the Ophis projection is being conducted"*, and tagged with a term
that appears nowhere in the code: **Protocol Prime**.

Three controls give three intervals — `A→B`, `A→C`, `B→C` — and the chart states its arithmetic
plainly: fourteen operations across three intervals give **42 projections**, which "most often"
collapse to "38 to 39 actual dates … because different Ophis operations have targeted the same
date."

The shipped engine has no `A`, `B` or `C`. It enumerates all unordered pairs of N anchors. Those two
descriptions are the same system: three anchors give C(3,2) = 3 pairs, fourteen operations across
them give 42 projections, and the bucketing step merges the duplicates. Every number in the author's
conclusion falls out of the shipped code — *provided the operator enters the current date as a third
control*.

Nothing in the software does this, hints at it, or defaults to it. The author described Protocol
Prime as a security measure: an unauthorised user "can not use system to predict future events"
without it. Read plainly, an operator who enters only two dates is running a third of the method and
has no way to discover it. **This is the highest-value finding in the study and it is not in the
code at all** — it is only visible by reading the design against the implementation.

#### 4.5.2 Where the implementation contradicts the design

The procedural notes classify each of the fourteen operations as ALPHA or beta. Compared against the
shipped weights — at or above 1 is Alpha, below is Beta — twelve agree and two disagree, and the two
*transpose*: the design marks Core IV beta and Core X ALPHA; the implementation has them the other
way round. Both tables carry exactly four Alphas among the twelve Core Algorithm formulas, matching
the author's stated "4 ALPHA and 8 beta", so the totals conceal the swap.

A mechanism suggests itself. The two `Y×π` operations — the X₁ and X₂ variants of one formula — are
both ALPHA in the author's list. The v12 source annotates two rows as promotions made at v8: one is
`X1+YxOPH_PI`, which restores the author's classification; the other is `X2+(Y/2.0)xOPH_PHI`, where
the author's numbering points at `X2+YxOPH_PI`. An off-by-one while reading a hand-numbered list
fits every fact.

We did not change it. The weights feed the operation score directly, so moving either shifts every
result the owner has ever computed. The finding is recorded next to the code, which is the
disposition §10 argues for.

#### 4.5.3 A design specification the implementation narrowed

The chart's filtering stage says the resonance filter measures each projection "back to A, B **and**
C". The shipped engine probes exactly one distance: the offset from the operation's own base anchor.

Because the engine is now a pure function, the counterfactual is cheap to run rather than argue
about. On the end-to-end fixture, probing all three distances would:

| | as shipped | as designed |
|---|---:|---:|
| rows carrying a resonance match | 39 | **101** |
| rows matching nothing | 75 | 38 |
| total matches | 40 | 124 |
| peak hit count | 4 | **8** |

A match would be added to 54 % of rows, and half the currently-silent rows would light up.

That result argues *for* the implementation. The filter exists, in the author's words, "to aid the
Core Algorithm in the elimination of potentia, or phantom dates". A filter that accepts half of what
it previously rejected has lost most of its discriminating power. The narrowing looks less like
drift than like a correction — and it is one nobody wrote down.

#### 4.5.4 An independent check on the extracted data

The author's workbook contains, on one sheet, the 390 resonance numbers with their tier and points.
That is the first check on the array extraction that does not come from the binary the arrays were
extracted from.

**Important matched 53 of 53 and Vortex 12 of 12, member for member.** The Normal count of 325
settles a figure two prior reports had given as 276. Four Normal numbers disagree between the
workbook and the binary, all single-digit differences and three of them a `6`/`8` confusion — the
signature of a list transcribed by hand. Where the workbook's own 565-number master list can
arbitrate, it backs the binary twice and the workbook never; the remaining two appear in neither.
The shipped values stand, now on evidence rather than on assumption.

#### 4.5.5 The general point

Reading the design against the implementation found, in five short documents: an operating
procedure worth three times the output, two misclassified operations, one narrowing that turned out
to be a correction, and an independent confirmation of a contested data set.

None of it was reachable by reading the code, and none of it was reachable by reading the documents
alone. The method is the same one §3 applies to the binary — treat the artifact as an oracle and
compare — with the observation that **design documents and running code fail in different places**,
which is exactly what makes the comparison productive.

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
| Desktop operation corpus | 56/56 equations across four packs compile and evaluate |
| End-to-end cast, browser lineage | 33/33 rows reproduced exactly |
| End-to-end cast, desktop lineage | 10 pairs → 160 projections → 153 distinct → 114 survivors, 39 hidden |
| Resonance classification | 8/8 precedence cases, including the two IEEE-754 boundary rows |
| Scoring arithmetic | 8/8 worked examples, every intermediate term |
| Resonance table, independently checked | Important 53/53 and Vortex 12/12 exact against the author's workbook |
| Vendor sanity anchors | 4/4 hold |
| Test suite | 94 assertions, all passing — including the complete 114-row desktop golden asserted field for field against an independent from-spec reference implementation, and a seeded 800-equation printer→parser→evaluator round-trip property |
| Dynamic code-evaluation sinks | 0 (was 1) |
| Markup sinks in application code | 0 |
| Runtime dependencies | 0 |
| Build step | none |
| Chart render, 160 arcs with all overlays | ~4 ms |
| Deployment | static hosting; runs air-gapped |

**Coverage of the desktop build is now substantially complete.** The projection engine with all
four event scopes, the three-tier resonance filter, both scoring systems, the nine output filters,
the five sort types, multi-event documents, the operation-table editor, event data transfer, import
and export, and the timeline with its moon and eclipse overlays. Export ships in all three formats
the original offered — and the spreadsheet, which the original shipped as an admitted three-column
proof of concept, now carries the same eight columns as the CSV.

Beyond the original: an audit surface that traces any row back through its arithmetic (the
original's was written, commented out of the screen list, and shipped with two defects), an
activity log the original's author had left as a TODO, full keyboard operability, and a field guide
carrying the operating procedure of §4.5.

What remains unimplemented is the offline map tile pyramid — 97 % of the original's asset payload,
shipped so that a coordinate picker would work air-gapped, replaced here by two number fields.

---

## 9. Limitations

**One capability is deliberately narrower than the design.** The resonance filter probes one
distance per projection where the flow chart specifies three (§4.5.3). We measured the alternative
rather than assuming, and it argues for the shipped behaviour — but that is an inference from one
fixture, not a proof, and a reader who wants the designed breadth should know it is one clause of
one function away.

**The offline map is not reimplemented.** The original shipped 1 365 map tiles so a coordinate
picker would work air-gapped; this offers two number fields. For an instrument whose day-scope
arithmetic is locked to UTC, coordinates matter only in the sunset-bounded scope, and typing them
is not obviously worse than clicking them. It is nonetheless a capability removed.

**Sunset is computed rather than looked up.** The original carried three ephemeris libraries and
reached one of them; this reduces the same Meeus solar position calculation to about sixty lines,
agreeing to roughly a minute. That is well inside the one-day bucketing the scope applies, but it is
an approximation where the original had a library, and a reader working at high latitude should note
the ±65° clamp both share.

**Equation agreement is not total behavioural equivalence.** The digest covers the shipped equation
corpus at six intervals — a large and well-chosen sample, not a proof. A seeded property suite now
round-trips 800 randomly generated equations through the printer, tokeniser, parser and evaluator
against an independent tree walker, bit-identically — which pins the grammar's whole space for
internal consistency. The *differential* form of that claim — the same random corpus through the
original's engine — still requires the original runnable, and has not been done.

**The desktop end-to-end fixture is one cast, not a corpus.** It exercises ten anchor pairs, all
sixteen operations, both resonance boundary cases and every scoring branch, and it is pinned to the
last intermediate term. It is still a single configuration. The sunset-bounded scope in particular
is covered by unit fixtures rather than by an end-to-end comparison, because no reference output for
it was recoverable.

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

**Read the design documents against the code, not instead of it.** §4.5 is the result we did not
expect. Design documents are usually treated as either authoritative — in which case the code is
wrong wherever it differs — or obsolete, in which case they are not read. Treating them as a second
oracle, equal in standing to the running binary and failing in different places, produced the
study's single most valuable finding: an operating procedure that triples the system's output,
present in the design, absent from the software, and invisible from either one alone.

The corollary is worth stating plainly. When a design and an implementation disagree, **the useful
question is not which is right but why they diverged.** One of the three divergences here was an
implementation defect, one was an undocumented correction that improved the system, and one was an
operating instruction that simply never got written down. Three different answers, none available
without asking.

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

### The desktop cast

Five controls — 07/04/2026, 08/20/2026, 03/09/2027, 03/16/2027, 07/17/2027 — through all sixteen
operations, filters at their defaults.

| Quantity | Value |
|---|---:|
| anchor pairs | 10 |
| projections | 160 |
| distinct dates before filtering | 153 |
| surviving the filters | 114 |
| hidden | 39 |
| highest score | 3 |
| peak hit count | 4 |

The top row, traced end to end — this is the assertion that would fail first if any part of the
pipeline drifted:

```
Z14   09/29/2027
  operations      O3 + O4, both weight 0.5              = 1.0
  resonance       204.1 -> Normal 204   (1 pt, x1.5)
                   74.4 -> Normal  74   (1 pt, x1.5)
  multiplier M    max(1.5, 1.5)                         = 1.5
  subscore        sum(points) minus the match carrying M
                  2 - 1                                 = 1.0
  base            1.0 + 1.0                             = 2.0
  score           round2(2.0 x 1.5)                     = 3
  hits            2 operations + 2 resonance            = 4
```

Note that the row is labelled `Z14` while sitting first under the score sort. Labels are assigned
from the chronological pass and identify the date; row position reflects the sort. The two are
deliberately independent, and the chart shares the labels so the table and the timeline can be read
together.

## Appendix B — Reproducing the verification

```bash
git clone https://github.com/bradleyhomelinuxnet-prog/natori-on-psyfr
cd natori-on-psyfr
npm test                               # 115 assertions, no dependencies
npm run serve                          # then open http://127.0.0.1:8777/
```

The teardown itself is reproducible from the original `.exe` using the commands in §3.1. The
extraction tooling is in `tools/`; the subsystem specifications are in `docs/reverse/`.

---

*Prepared as a technical study of the author's own software. NATORI-ON-PSYFR is a worldbuilding and
study instrument rendering the Archaix thesis of Jason Breshears as predictive calendrics, presented
as that thesis and not as established science. Not affiliated with Archaix.*
