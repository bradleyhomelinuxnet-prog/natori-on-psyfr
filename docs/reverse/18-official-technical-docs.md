# 18 · The Official NATORI-ON-PSYFR Documentation

**Sources read in full**

| File | Size | What it is |
|---|---|---|
| `reference/docs/NATORI-ON-PSYFR-Technical-Reference.txt` | 24,048 B, 10 pp | The authors' own implementation reference for v1.0 (12 June 2026) |
| `reference/docs/NATORI-ON-PSYFR-Technical-Walkthrough.txt` | 20,592 B, 10 pp | The teaching narrative of the reverse-engineering + build |
| `reference/unpack/NatorionOracle-v1.0/NatorionOracle-v1.0/README.txt` | 4,832 B | End-user quick start shipped in the release zip |
| `reference/unpack/NatorionOracle-v1.0/NatorionOracle-v1.0/LICENSE.txt` | 1,684 B | The release license |

This is the single most authoritative document set in the study, because it describes **the same
system this repository reimplements** — not the Electron v12 ancestor. Where the rewrite disagrees
with it, the rewrite is the thing that moved.

Every claim in §4 below was executed against the rewrite's engine. Commands and raw output are
reproduced inline.

---

## 1 · The release bundle

`reference/unpack/NatorionOracle-v1.0/NatorionOracle-v1.0/` contains, in full:

```
LICENSE.txt                                        1,684 B   12 Jun 2026 20:00
NATORI-ON-PSYFR-Field-Guide.html                  38,081 B   12 Jun 2026 18:04
NATORI-ON-PSYFR-Main-UI.html                     141,271 B   12 Jun 2026 18:04
README.txt                                         4,832 B   12 Jun 2026 18:26
docs/NATORI-ON-PSYFR-Technical-Reference.docx     39,275 B   12 Jun 2026 18:21
docs/NATORI-ON-PSYFR-Technical-Reference.pdf     305,087 B   12 Jun 2026 18:21
docs/NATORI-ON-PSYFR-Technical-Walkthrough.docx   21,517 B   12 Jun 2026 06:03
docs/NATORI-ON-PSYFR-Technical-Walkthrough.pdf   281,145 B   12 Jun 2026 18:04
```

A sibling staging folder, `reference/unpack/NatorionOracle-v1.019/`, holds the pre-zip working
copies (`Natori-On-PSYFR-Main-UI.html`, `Natori-On-PSYFR-Field-Guide.html`, an older
Walkthrough PDF from 06:56, and the finished `NatorionOracle-v1.0.zip`, 628,809 B).

**Both the Reference (§13, "The zip") and README.txt ("WHAT'S IN THIS FOLDER") mis-describe their
own bundle.** Each lists only the *Walkthrough* under `docs/`; the zip actually ships the
*Technical Reference* in both formats as well. Neither manifest mentions `LICENSE.txt`, which is
present and is the only statement of terms in the package.

### 1.1 The license

`LICENSE.txt` is **not** an open-source license. Verbatim heading:

> LICENSE — Use & Share, No Derivatives (v1.0)

It grants USE and verbatim SHARE. It explicitly withholds, absent prior written permission:

> a. MODIFYING the Work or creating derivative works from it, in whole or
>    in part — including translations, adaptations, ports, forks, or new
>    works that incorporate any portion of its code, text, or data;

and requires that the ARCHAIX-thesis framing notice never be removed (clause c). Copyright is
asserted as "Copyright (c) 2026 BeeRadicalStuff. All rights reserved."

The owner of that copyright is the owner commissioning this rebuild, so they may relicense their
own work at will — but see the correction in §7.11: the rewrite currently declares a *different*
license with no accompanying license file.

---

## 2 · Digest of the Technical Reference

### 2.1 Purpose & lineage (§1)

NATORI-ON-PSYFR fuses two instruments:

* **The Ophis prediction grammar**, "reverse-engineered from the Ophis v12 browser tool" — two
  X-Dates define an interval **Y** in axial rotations (days); a library of arithmetic operations
  transforms Y into projected **Z-Dates**.
* **The Chronicon calendrics** — the Breshears cycle lattice (Phoenix 138 · Nemesis 792 · NER 600 ·
  Metonic 19), Annus Mundi dating, the Mayan Long-Count, and the šar reckoned as a turning of the
  stars (a day).

The document is explicit that **the scoring is the new part**: "every projected date is weighed
against the documented chronology and the signature numbers, so the instrument itself reports when
a projection lands on a Phoenix node, a documented event, a palindrome, an eclipse, or a resonance
number."

Deliverables named (§1.1): `clocks/PSYFR1.html` (engine), `clocks/PSYFR2.html` (field guide),
`test/verify.js`, `test/runtime.js`, `docs/…Walkthrough.docx/.pdf`, `CLAUDE.md` / `README.md`.

### 2.2 The contract between the two pages (§1.2)

Load-bearing, quoted in full:

> The two HTML files cross-link by bare filename and therefore must live in the same folder. They
> share the localStorage keys `ophion-theme` and `ophion-zoom` (theme and text size carry across
> both). The engine alone also stores `ophion-mode` — the ✦ Simple view toggle. These three UI-
> preference keys are the only browser storage the app uses; **anchors and operations are
> deliberately never persisted.**

Verified against the shipped artefact:

```
$ grep -o "ophion-[a-z]*" reference/unpack/.../NATORI-ON-PSYFR-Main-UI.html | sort | uniq -c
      2 ophion-mode
      2 ophion-theme
      2 ophion-zoom
```

Three keys, two uses each (a read and a write). No other storage. The claim is accurate.

### 2.3 Architecture (§2)

One self-contained HTML file — CSS, markup, data tables, one inline script. No build step, no
network request except optional Google Fonts. The script is organised in three banners:

* `OPHION CORE` — Julian Day conversion, chronology offsets, `oph_*` functions, MSRF set, eclipse
  tables.
* `PREDICTION ENGINE` — operation compiler, scoring, the cast, convergence clustering.
* `STATE + UI` — default operation packs, ledger data, rendering, event wiring, theme/zoom/mode
  persistence.

with the parenthetical that makes the banner text *load-bearing*:

> (The verify harness extracts everything before this banner as the pure-math core, so the banner
> text is load-bearing.)

Confirmed present in the artefact at the boundary between `findConvergences` and `DEFAULT_OPS`:

```
  }).filter(c=>c.nOps>=2)
    .sort(...);
}

/* ============================================================
   STATE + UI
   ============================================================ */
const DEFAULT_OPS=[
```

Five sections: **The Oracle**, **The Convergence**, **The Wheels**, **The Ledger**, **Method**.

### 2.4 The calendar core (§3)

Astronomical years (year 0 = 1 BC, −1 = 2 BC) over the proleptic Gregorian calendar. Three named
functions: `jdn(ay,m,d)`, `jdToDate(J)`, `fmtYear(a)` with the worked example
`fmtYear(-2238) = "2239 BC"`.

| Reckoning | Rule | Note |
|---|---|---|
| Annus Mundi | `AM = ay + 3894` | Epoch `jdn(−3894,1,1)` |
| Long-Count year | `LC = ay + 3112` | LC 5138 = 2026 CE |
| Since Cataclysm | `ay + 5238` | Nemesis Cataclysm 5239 BC |
| Phoenix lattice | `ay mod 138 = 108` | every documented Phoenix event sits exactly on it |
| Nemesis X | 792-yr cycle | inner-transit window flagged separately |
| Anunnaki NER | 600-yr cycle | node when offset = 0 |
| Baktun edges | `MAY_NODES` | 14 hard-coded baktun years, −3112 … 2046 |
| Metonic moon | 19 yr = 235 moons | synodic month 29.530588853 d from the J2000 new-moon epoch |

**Sanity anchors (§3.1)** — "verified against the Chronicon before any UI work began":

| Assertion | Value |
|---|---|
| Today (2026 CE) | AM 5920 · LC year 5138 |
| The Great Flood (astro −2238 = 2239 BC) | AM 1656 |
| Petrie's survey year (1882 CE) | AM 5776 |
| All 24 Phoenix events | `mod 138 = 108`, exactly |

### 2.5 The operation grammar (§4)

An operation is a string. It must start `X1+` or `X2+`. `compileOp(eqRaw)` enforces the grammar in
five steps, quoted:

1. **Normalise** — strip whitespace; a bare `x` or `×` between terms becomes `*`.
2. **Require the `X1+` / `X2+` prefix**; everything after it is the offset body.
3. **Whitelist check** — after substituting the known tokens away, any remaining character outside
   `0-9 + - * / ( ) .` rejects the equation ("illegal token").
4. **Compile with `new Function(…)`** — a syntax error rejects it.
5. **Probe with `Y = 1000`** — if the result is not a finite number, reject ("does not evaluate to
   a number").

Token table:

| Token | Meaning |
|---|---|
| `Y` | interval between the anchor pair, in days (axial rotations) |
| `OPH_PHI` | golden ratio, 1.61803398875 |
| `OPH_PI` | Archaix π, **3.14** (deliberately the lore value, not `Math.PI`) |
| `OPH_CRV` | curvature constant, 5.08 |
| `oph_flip(n)` | digit reversal: 138 → 831, 19 → 91. **Decimal points keep their position.** |
| `oph_round` / `floor` / `ceil` | round to a whole day |
| `oph_abs` / `oph_sqrt` | absolute value; square root of the absolute value |

Note step 3 and step 4 together are the exact validate-one-string / compile-a-different-string
split that `docs/DEVIATIONS.md` §1 flags as a code-generation sink. The official Reference documents
the flaw without recognising it as one, and the shipped CSP proves it:

```
$ grep -o 'Content-Security-Policy" content="[^"]*' NATORI-ON-PSYFR-Main-UI.html
Content-Security-Policy" content="default-src 'self' 'unsafe-inline' https://fonts.googleapis.com
  https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval';
```

`'unsafe-eval'` is present because `new Function` requires it.

### 2.6 The cast pipeline (§5)

Reproduced verbatim from the Reference:

```
for each anchor pair (x1 earlier, x2 later):
    Y = |x2.jd - x1.jd|            // days; skip if Y < 1 or Y > 3,000,000
    for each operation:
        offset = op.fn(Y)          // skip non-finite
        ZJD    = round(base + offset)   // base = x1.jd or x2.jd per the op
        skip if projected year < -5400 or > 4000
        dedup on (ZJD, equation, pair)
        score = scoreZDate(...) + MSRF bonus + eclipse bonus
        tag ECHO if ZJD lands within ±1 day of ANY input anchor
```

Results sort by score descending, then by date. An ECHO is kept, dimmed and tagged; the
`✦ NOVEL ONLY` filter hides them.

Note the comment "(x1 earlier, x2 later)". In the shipped engine that is true *by construction*,
not by the pairing rule: `addAnchorObj` sorts the list by JD on every insert —

```js
function addAnchorObj(ay,m,d,label){
  const jd=jdn(ay,m,d);
  anchors.push({ay,m,d,jd,label:label||fmtYear(ay),enabled:true});
  anchors.sort((a,b)=>a.jd-b.jd);
  renderAnchors();
}
```

— so list order and chronological order always coincide there. The rewrite removed the sort and
binds `X1+` to the lower-**indexed** anchor. See §7.6.

### 2.7 Scoring — the two lenses (§6)

`scoreZDate(year, JD, system)`. Same checks under both lenses; only the weights change.

| Criterion | V8 | V7 | Test |
|---|---|---|---|
| Phoenix node | +5 | +2 | `year mod 138 = 108` |
| Near Phoenix (±2 yr) | +2 | +1 | distance to node ≤ 2 |
| Documented event | +5 | +1 | year in ledger set |
| Palindrome ⮌ | +3 | +4 | year, AM **or** JD reads both ways |
| 138 in the digits | +2 | +4 | `"138"` in year / AM / LC |
| Metonic-19 to today | +2 | +2 | `(today − year) mod 19 = 0` |
| 19 in the digits | +1 | +2 | `"19"` in year / AM |
| MSRF resonance | +2 | +3 | Y **or** \|offset\| in MSRF set |
| Solar eclipse ±1 day | +2 | +2 | precomputed table hit |
| Lunar eclipse ±1 day | +1 | +1 | precomputed table hit |
| Nemesis / NER / baktun | +1 each | +1 each | cycle membership |

And on the resonance set:

> The MSRF set is the Ophis resonance table (key NORMAL + IMPORTANT members: 12, 21, 24, 36 … 138 …
> 414, 552, 600, 792, 828, 831 … 1656), **with 19 added by owner request — it is not in the stock
> Ophis table.**

That last clause is independently corroborated by this study's tiered MSRF transcription:
`MSRF_FULL.has(19)` is `false` across all 564 numbers of the author's own six-filter table, while
`MSRF.has(19)` is `true` in the PSYFR 87.

### 2.8 Convergence detection (§7)

`findConvergences(results, tol)` clusters projections landing within a window — exact day, ±1, ±7,
±30 (default), ±90, or same calendar year — by sorting on JD and chaining any neighbour within
tolerance. Each cluster reports:

* **Strength** — "the number of **distinct operations** that agree (clusters below 2 are discarded)".
* how many distinct anchor pairs contributed;
* the centre date (mean JD), the span in days, the best member score, and the union of all
  non-echo tags.

Sorted by strength, then best score, then tightness. A cluster whose members are all echoes is
flagged and excluded from the headline list.

### 2.9 Eclipse tables (§8)

Real solar and lunar eclipse dates, ~1–3000 CE, from the Ophis precomputed data, shipped
delta-encoded: a base JD plus comma-separated day-gaps, with a parallel type string
(`T` total, `A` annular, `P` partial, `H` hybrid). Decoded at boot into sorted JD arrays;
`eclipseNear(jd, tol)` answers by binary search. Outside the covered range, no tag — "the
instrument degrades gracefully rather than guessing."

### 2.10 The ledger & the wheels (§9)

Ledger: a **69-event** array of tuples `[astroYear, kind, text, [month, day]]`, from the Nemesis
Cataclysm (5239 BC) through the 2046 close of the count. Kinds named in prose as
`key, phoenix, nemesis, ner, baktun, note`. Every `phoenix` entry verified on the 138-lattice before
release. Any row can be seeded as an anchor (with its month/day) or clicked to read on the wheels.

Wheels: **seven** reckonings — Phoenix (138 yr), Nemesis X (792 yr), Anunnaki NER (600 yr), Annus
Mundi, Mayan Long-Count, Anunna Turnings (šar = a day), Metonic moon (19 yr = 235 lunations). A
dial (year/era/month/day plus a slider from **2843 BC to 2178 CE**) drives them; preset jumps go to
**Today, 2040, 2046, 2178**.

### 2.11 Packs & configuration (§10)

Nineteen operations load by default — "the palindromic cast" — listed with readings:

| # | Operation | Reading |
|---|---|---|
| 1 | `X2+oph_round(Y)` | The Isometric Date — the same interval, forward again |
| 2 | `X2+oph_flip(oph_round(Y))` | The Holo-mirror — reverse the digits, project from the later anchor |
| 3 | `X1+oph_flip(oph_round(Y))` | The same mirror from the earlier anchor |
| 4 | `X2+Y/OPH_PHI` | Golden division |
| 5 | `X1+Y*OPH_PHI` | Golden expansion |
| 6 | `X1+(Y/2)*OPH_PI` | The pi half-arc |
| 7 | `X2+Y/OPH_CRV` | Curvature division (5.08) |
| 8 | `X2+Y*138/100` | Scale by 1.38 — the Phoenix stretch |
| 9 | `X1+Y*19/10` | Scale by 1.9 — the Metonic stretch |
| 10 | `X2+oph_round(Y/138)*138` | Snap to the 138-grid |
| 11 | `X1+oph_round(Y/19)*19` | Snap to the 19-grid |
| 12 | `X2+Y+138` | One Phoenix count beyond the isometric date |
| 13 | `X1+Y+19` | One Metonic seal beyond it |
| 14 | `X2+oph_flip(Y)+19` | Mirror, then seal with 19 |
| 15 | `X1+Y*360/365.2422` | Reframe into the 360-day Draconian year |
| 16 | `X2+Y*792/600` | Nemesis-to-NER ratio |
| 17 | `X1+oph_round(Y*OPH_PHI/OPH_PI)` | φ over π |
| 18 | `X2+oph_round(Y/OPH_PHI/OPH_PHI)` | Divide by φ² — the tighter golden step |
| 19 | `X1+oph_flip(oph_round(Y/OPH_PHI))` | The golden mirror — divide by φ, then reflect |

Four themed packs: **138 Pack** (12 ops, on 138 and its multiples 414/552), **19 Metonic Pack**
(11 ops, on 19/235), **Phoenix Lattice Pack** (10 ops, cycle-snaps across 138/792/600/360/216/144),
**Golden Pack** (10 ops, on φ, π and the curvature constant).

**Configuration files (§10.1):** `⤓ Save .json` writes "the whole cast — anchors, operations,
scoring lens, convergence window — as `{app:"OPHION", v:3, …}`". Confirmed in the artefact:

```js
function saveConfig(){
  const cfg={app:'OPHION',v:3,saved:new Date().toISOString(),system:curSystem,convTol:String(convTol),
    anchors:anchors.map(a=>({ay:a.ay,m:a.m,d:a.d,label:a.label,enabled:a.enabled})),
    ops:ops.map(o=>({eq:o.eq,enabled:o.enabled}))};
```

Note the field names: **`ops`**, not `operations`; **`system`**, not `lens`; `convTol` is a
**string**. This matters — see §7.4.

### 2.12 The UI layer (§11)

Cinzel / EB Garamond / IBM Plex Mono; gold `#d8a943`, red `#d3402f`, cyan and violet on near-black,
with an aged-parchment light theme. Both pages "honour `prefers-color-scheme` on first visit and
`prefers-reduced-motion` always"; every control keyboard-reachable with a visible focus ring;
`A− / A / A+` scales the whole page **0.8–1.5×**.

**Progressive disclosure (§11.1):** four one-click expanders, closed by default — the 19-operation
list, the op-packs / save-load toolbar, the 69-row ledger table, and the scoring rulebook. A
numbered **Seed → Cast → Read** strip replaces the dense intro. The thesis-framing card in Method
"deliberately stays un-foldable."

**Simple view (§11.2):** the `✦ Simple` toggle (top-right, persisted as `ophion-mode`) hides the
moment bar, operations panel, scoring lens, advanced fold, Ledger and Method — and their nav links.
"It is a pure CSS class on `body`; the engine underneath is untouched, so a cast in Simple view
produces identical results." `⛭ Full view` restores everything.

### 2.13 Verification — the discipline (§12)

> The house rule is verify-first: prove the math before touching UI, and after any change to the
> engine run both harnesses (`npm test`).

| Harness | What it proves |
|---|---|
| `test/verify.js` | **11 checks**: today → AM 5920 / LC 5138; Flood → AM 1656; Petrie → AM 5776; `oph_flip(138)=831` and `(19)=91`; `isPalindrome(1331)`; **3,276 calendar round-trips**; **all 81 shipped operations compile**; the grammar rejects 3 known-bad strings; **the default cast yields the strength-4 convergence on 2040**. It extracts the pure-math core from the HTML by cutting at the `STATE + UI` banner. |
| `test/runtime.js` | Boots the entire inline script under a minimal fake DOM (Proxy-based element stubs, localStorage shim). Catches load-order and temporal-dead-zone bugs that a parse check cannot — "it parses" is not "it runs". |

Smoke test recorded: "default cast = **34 projections, 5 convergences, top result 10 May 2040
(score 12)**, zero console errors."

### 2.14 Release & distribution (§13)

* Git tag `v1.0` — commit `7521518` on `main`.
* GitHub Release at `github.com/BeeRadicalStuff/natori-on-psyfr/releases/tag/v1.0`.
* Live page: GitHub Pages serves the repo root; `index.html` redirects into `clocks/PSYFR1.html`.
  Also embedded on a Wix site as an iframe.

**Renaming rule (§13.1)** — the strongest normative statement in the document:

> Distribution copies rename the files but never the internals: visible text, cross-links and
> download filenames may change; **function names, element IDs and storage keys must not.** The
> packaging step is two string replacements — `PSYFR2.html` → `NATORI-ON-PSYFR-Field-Guide.html`
> inside the engine and `PSYFR1.html` → `NATORI-ON-PSYFR-Main-UI.html` inside the guide.

**This is verifiable and it holds exactly.** Comparing the shipped release against the repository
copies (whitespace/CRLF normalised):

```
$ node -e "... normalised line diff ..."
Field Guide differing lines: 2   (lines 450 vs 449 — the cross-link + a trailing newline)
Main-UI  differing lines: 2      (L293 nav cross-link, L312 body cross-link)
```

Two lines in each file. `PSYFR1.html` in this repository **is** `NATORI-ON-PSYFR-Main-UI.html`, and
`PSYFR2.html` **is** `NATORI-ON-PSYFR-Field-Guide.html`.

### 2.15 Known limits & next steps (§14)

Quoted in full, because the assignment asks for it:

* Eclipse coverage is ~1–3000 CE; outside it the tag is silently omitted. Widening the tables is a
  known next step.
* Deep-past conversions are cycle-true rather than historically observed — stated in-app.
* Intervals above 3,000,000 days and projections outside 5400 BC – 4000 CE are skipped by design.
* The single-file form is a feature (open-from-disk, air-gapped); splitting into modules remains an
  option **but must not break that property**.
* Candidates: a printable cheat-sheet, engine screenshots embedded in the walkthrough, more themed
  packs.

The third bullet is the one this rewrite has to answer for. The rewrite is a multi-file ES-module
app served over `http://` — it cannot be opened from `file://` at all. That is a deliberate,
documented trade (`README.md`: "ES modules need `http://`, not `file://`"), but the official
document names single-file portability as a **feature that must not break**, and the rewrite breaks
it. See §7.10.

---

## 3 · Digest of the Technical Walkthrough

A teaching narrative in ten lessons. It is the provenance record for everything in
`docs/reverse/00`–`17`.

| Lesson | Content |
|---|---|
| Starting point | `Ophis_v12_Windows.exe`, ~100 MB, plus a small `ophis.html` alongside |
| 1 · What an executable is | `file` reports `PE32 executable (GUI) Intel 80386, Nullsoft Installer self-extracting archive` — NSIS, i.e. a container |
| 2 · Peeling the onion | `7z x` → `$PLUGINSDIR/app-64.7z` → `Ophis.exe`, `resources/app.asar`, bundled Chromium. `npx @electron/asar extract app.asar ./asar_out` → `ophis.html, main.js, src/*.js, lib/*.js` |
| — the punchline | "The `ophis.html` bundled inside the giant executable was **byte-for-byte identical** to the little `ophis.html` the owner already had — all **39,970 bytes** the same." |
| 3 · How it thinks | Five ideas: X-Dates, Y, Operations, Z-Dates, MSRF. `oph_flip` named the most characterful function |
| 4 · The plan | Fusion: keep the Ophis grammar, marry it to the Chronicon calendar, **make the fusion the scoring** |
| 5 · Verify first | Chronology anchors **16 of 16**; calendar round-trips **812 of 812**; every Phoenix event on the 138-grid. Harness named `core_test.js` |
| 6 · Building the engine | Single file · air-gapped · faithful-but-honest. Sections: Oracle, Wheels, Ledger, Method. Two lenses live-switchable |
| 7 · Iterating | Convergence ("four operations landing together is a pattern… reliably surfaces a **strength-4 convergence on the year 2040**"); eclipse overlays delta-compressed to "about 56 kilobytes"; preset packs and save/load |
| 8 · A real bug | `Uncaught ReferenceError: Cannot access '$' before initialization` — a temporal-dead-zone fault from wiring preset buttons at module scope. Fixed by moving the wiring inside `init()`. Caught by `runtime_test.js` with a fake DOM |
| 9 · Accessibility | Dark/light theme following system preference on first visit, adjustable text size, keyboard navigation, focus outlines, screen-reader labels, reduced-motion respect |
| 10 · Branding & safe renaming | "Change the label, not the wiring." The rename is shown as a targeted `sed`: `sed -i "s\|ophion_config_\|Natori-On-PSYFR-config-\|" Main-UI.html` — i.e. only the *download filename prefix*, "while deliberately leaving the internal storage keys alone so the two files keep sharing your theme choice" |

Engineering principles listed: triage first · verify before building · test at runtime not just
syntax · make surgical edits · degrade gracefully · prefer single-file portability · separate
display from logic.

Toolchain appendix: `file`, `7z`, `@electron/asar`, `node`, `sed`, `docx`.

### 3.1 The two official documents contradict each other on the harness

| Claim | Walkthrough (Lesson 5) | Reference (§12) |
|---|---|---|
| Harness name | `core_test.js`, `runtime_test.js` | `test/verify.js`, `test/runtime.js` |
| Anchor checks | **16 of 16** | **11 checks** |
| Calendar round-trips | **812 of 812** | **3,276** |

The most economical reading is that the Walkthrough documents an earlier harness generation and was
not re-synced before release. Neither harness ships in the zip, so neither number is checkable.

---

## 4 · Appendix A — the worked cast, reproduced and executed

### 4.1 What the Reference states

**Setup:** the three default anchors, the Default 19 pack, the V8 lens.

**A.1 The anchor pair**

| Anchor | Date | JD | Role |
|---|---|---|---|
| Great Flood | 15 May 2239 BC | 903,782 | X1 (earlier) |
| Phoenix 2040 | 15 May 2040 CE | 2,466,290 | X2 (later) |

`Y = 2,466,290 − 903,782 = 1,562,508` axial rotations. Passes the guards (1 … 3,000,000).

**A.2 The operation**

```
X1+oph_round(Y/19)*19          // "snap the interval to the 19-grid,
                               //  project it forward from the earlier anchor"

Y / 19          = 1,562,508 / 19 = 82,237.263…
oph_round(...)  = 82,237        // nearest whole 19-count
× 19            = 1,562,503     // the snapped offset, in days

ZJD = X1 + offset = 903,782 + 1,562,503 = 2,466,285
```

`jdToDate(2,466,285)` → **10 May 2040 CE** — AM 5934, Long-Count year 5152. Inside the
−5400…4000 window, so kept.

**A.3 Scoring under V8**

| Check | Computation | Points |
|---|---|---|
| Phoenix node | `2040 mod 138 = 108` ✓ | **+5** |
| Documented event | 2040 is in the ledger ✓ | **+5** |
| Palindrome | 2040 / 5934 / 2466285 — none ✗ | 0 |
| 138 in digits | 2040, 5934, 5152 — none ✗ | 0 |
| Metonic-19 to today | `(2026 − 2040) mod 19 = 5` ✗ | 0 |
| 19 in digits | 2040, 5934 — none ✗ | 0 |
| MSRF on Y or offset | 1,562,508 / 1,562,503 not in set ✗ | 0 |
| Solar eclipse ±1 day | partial solar, 10 May 2040 ✓ | **+2** |
| Lunar eclipse ±1 day | none within window ✗ | 0 |
| Nemesis / NER / baktun | none ✗ | 0 |
| **Final score** | | **12** |

Tags earned: `PHOENIX NODE · DOCUMENTED · ☉ SOLAR partial`.

**A.4 Why it is novel, not an echo** — the projection lands at JD 2,466,285, **five days** before
the seeded Phoenix 2040 anchor (JD 2,466,290). The echo test requires ±1 day of an input anchor, so
this row is not an echo. "In the Convergence section this date joins three other operations inside
the ±30-day window around May 2040 — the strength-4 agreement that the test harness asserts on
every run."

### 4.2 Executing it against the rewrite — step by step

```
$ cd C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR
$ node --input-type=module -e "
import { jdn, jdToDate, fmtYear } from './src/core/jdn.js';
import { compileOperation } from './src/core/equation/index.js';
import { am, lcYear } from './src/core/cycles.js';
import { eclipseNear } from './src/core/eclipses.js';
const X1 = jdn(-2238,5,15), X2 = jdn(2040,5,15);
console.log('X1 (Great Flood 15 May 2239 BC) JD =', X1);
console.log('X2 (Phoenix 2040 15 May 2040 CE) JD =', X2);
const Y = Math.abs(X2-X1);
console.log('Y =', Y);
const op = compileOperation('X1+oph_round(Y/19)*19');
console.log('Y/19 =', Y/19);
console.log('oph_round(Y/19) =', Math.round(Y/19));
const off = op.fn(Y);
console.log('offset =', off);
const ZJD = Math.round(X1+off);
console.log('ZJD =', ZJD);
const zd = jdToDate(ZJD);
console.log('date =', fmtYear(zd.year), zd.month+'/'+zd.day, ' AM', am(zd.year), ' LC', lcYear(zd.year));
console.log('eclipse near =', JSON.stringify(eclipseNear(ZJD,1)));
console.log('echo? |ZJD-X2| =', Math.abs(ZJD-X2));
"
```

Output:

```
X1 (Great Flood 15 May 2239 BC) JD = 903782
X2 (Phoenix 2040 15 May 2040 CE) JD = 2466290
Y = 1562508
Y/19 = 82237.26315789473
oph_round(Y/19) = 82237
offset = 1562503
ZJD = 2466285
date = 2040 CE 5/10  AM 5934  LC 5152
eclipse near = {"solar":"P","lunar":null}
echo? |ZJD-X2| = 5
```

**Every number in A.1, A.2 and A.4 is reproduced exactly** — JDs, the interval, the un-rounded
quotient to the digit, the snapped offset, the ZJD, the Gregorian date, the AM and LC readings, the
partial-solar eclipse (`"P"`), and the 5-day gap that keeps it out of the ±1-day echo window.

### 4.3 The scored row from the full pipeline

```
$ node --input-type=module -e "
import { jdn, fmtYear } from './src/core/jdn.js';
import { compileOperation } from './src/core/equation/index.js';
import { cast } from './src/core/cast.js';
import { DEFAULT_OPS } from './src/data/packs.js';
const A = [
 {enabled:true,label:'Great Flood',jd:jdn(-2238,5,15)},
 {enabled:true,label:'Today',jd:jdn(2026,6,12)},
 {enabled:true,label:'Phoenix 2040',jd:jdn(2040,5,15)}];
const O = DEFAULT_OPS.map(eq=>{const c=compileOperation(eq);return{enabled:true,eq,start:c.start,fn:c.fn};});
const R = cast(A,O,'V8',2026);
console.log('projections:', R.length);
const t = R[0];
console.log('TOP:', fmtYear(t.ay), t.m+'/'+t.d, 'JD',t.zjd,'score',t.score,'op',t.op,
            'tags',t.tags.map(x=>x[0]).join(' · '),'echo',t.echo);
"
```

Output:

```
projections: 34
TOP: 2040 CE 5/10 JD 2466285 score 12 op X1+oph_round(Y/19)*19
     tags PHOENIX NODE · DOCUMENTED · ☉ SOLAR partial echo false
```

**A.3 reproduces exactly: score 12, the three tags in the documented order, ranked first.**

### 4.4 The §12 smoke test — 34 projections, 5 convergences

The Reference's release smoke test ("34 projections, 5 convergences, top result 10 May 2040
score 12") is only reproducible with the *release-day* clock, because the third default anchor is
"Today". Sweeping the Today anchor:

| Today | Projections | Convergences (±30, echoes excluded) | Top row |
|---|---|---|---|
| **2026-06-12** (release day) | **34** | **5** | 2040 CE 5/10, score 12 |
| 2026-06-01 | 34 | 4 | 2040 CE 5/10, score 12 |
| 2026-01-01 | 36 | 5 | 2040 CE 5/10, score 12 |
| 2026-08-25 (the parity fixture's pin) | 33 | 4 | 2040 CE 5/10, score 12 |

On 12 June 2026 the rewrite produces **exactly 34 projections and exactly 5 convergences** — the
official smoke-test figures, to the row. The parity fixture's 33 is not a defect; it is the same
engine with a different Today.

### 4.5 Where the official docs are wrong: "strength-4 convergence on 2040"

Both official documents assert a **strength-4** convergence on 2040 (Reference §12 and Appendix
A.4; Walkthrough Lesson 7). The rewrite reports **strength 2**. This is not a rewrite defect — it is
a documentation error, and the original engine's own source proves it.

The Reference §7 defines strength as "the number of **distinct operations** that agree". The shipped
`NATORI-ON-PSYFR-Main-UI.html` computes exactly that and renders exactly that:

```js
      nOps:opsSet.size, nPairs:pairsSet.size, count:items.length,
  }).filter(c=>c.nOps>=2)
    .sort((a,b)=>b.nOps-a.nOps || b.bestScore-a.bestScore || ...)
```
```js
  tr.innerHTML=`<td><span class="convstrength"><b>${c.nOps}</b>…
```

`nOps`, not `count`, is the number under the "Strength" column header. The rewrite's
`src/core/convergence.js` is line-for-line the same algorithm.

Dumping the cluster on release day:

```
--- clusters tol=30 ---
2040 CE 5/25   nOps=2  count=4  nPairs=2  span=24  best=12
                ops = X1+oph_round(Y/19)*19 ; X1+Y+19
2026 CE 6/26   nOps=2  count=2  nPairs=1  span=11  best=4
2048 CE 12/22  nOps=2  count=2  nPairs=1  span=0   best=1
2059 CE 1/11   nOps=2  count=2  nPairs=1  span=19  best=1
2054 CE 4/28   nOps=2  count=2  nPairs=1  span=20  best=1
```

The 2040 cluster holds **four member rows** but only **two distinct equations** — each contributed
twice, once per anchor pair. The author read the 4 and wrote "strength-4"; the app displays 2.
Appendix A.4's narrative ("this date joins **three other operations**") is likewise wrong: it joins
three other *rows*, from one other operation.

Nor is strength-4 unreachable — it is just not what the default state produces. Sweeping every
possible Today over 2024–2027, a 2040 cluster reaches `nOps ≥ 4` on exactly five days
(2025-08-02, 2025-11-10, 2026-02-18, 2026-05-29, 2026-09-06), and **on none of them does the cast
also produce 34 projections and 5 convergences**. The §12 harness assertion and the §12 smoke test
cannot both describe the same run.

---

## 5 · Executing the README's three worked examples

### 5.1 (A) The 2040 convergence and the eclipse pair

README: "with the ECLIPSE filter: **15 May 2040 on a total lunar eclipse (score 11)** and
**10 May 2040 on a partial solar eclipse (score 12)**."

```
$ node -e "... eclipseNear(2466290,1) ..."
eclipseNear(JD 2466290 = 15 May 2040): {"solar":null,"lunar":"T"}
```

Total lunar, confirmed. Sweeping Today over 2026 for a default-pack projection landing exactly on
JD 2,466,290:

```
2026-1-5  | N=33 | X1+oph_round(Y/19)*19 sc11 echo=true
2026-2-12 | N=34 | X1+oph_round(Y/19)*19 sc11 echo=true
2026-6-6  | N=33 | X1+oph_round(Y/19)*19 sc11 echo=true
… 23 such days in 2026 …
```

**Score 11 confirmed** (Phoenix 5 + Documented 5 + Lunar 1). The rewrite reproduces the README's
number exactly. Two caveats the README omits: the row is date-dependent (it needs
`(2466290 − todayJD) mod 19 == 0`, i.e. roughly one day in nineteen), and it is always tagged
**ECHO**, because it lands on the seeded Phoenix 2040 anchor itself. `✦ NOVEL ONLY` hides it.

### 5.2 (B) The deep past names a modern year

README: remove the defaults, seed the Nemesis Cataclysm (5239 BC) and the Great Flood (2239 BC),
cast, `✦ NOVEL ONLY` — "The operation `X2+Y*138/100` lands on **1902 CE (score 11)** — a documented
Phoenix year."

```
$ node --input-type=module -e "
import { jdn, fmtYear } from './src/core/jdn.js';
import { compileOperation } from './src/core/equation/index.js';
import { cast } from './src/core/cast.js';
import { DEFAULT_OPS } from './src/data/packs.js';
const O = DEFAULT_OPS.map(eq=>{const c=compileOperation(eq);return{enabled:true,eq,start:c.start,fn:c.fn};});
const A=[{enabled:true,label:'Nemesis Cataclysm',jd:jdn(-5238,5,15)},
         {enabled:true,label:'Great Flood',jd:jdn(-2238,5,15)}];
for(const r of cast(A,O,'V8',2026)) console.log(String(r.score).padStart(3),
  fmtYear(r.ay),(r.m+'/'+r.d).padEnd(6),'JD'+r.zjd,r.echo?'ECHO':'    ',r.op.padEnd(32),
  r.tags.map(t=>t[0]).join(','));
"
```

Output (head):

```
 11 2239 BC 5/17   JD903784      X1+oph_round(Y/19)*19   PHOENIX NODE,DOCUMENTED,NER NODE
 11 2239 BC 6/3    JD903801      X1+Y+19                 PHOENIX NODE,DOCUMENTED,NER NODE
 11 1902 CE 5/17   JD2415887     X2+Y*138/100            PHOENIX NODE,DOCUMENTED,19
  6  462 CE 5/15   JD1889937     X1+Y*19/10              DOCUMENTED,NEMESIS
  6  762 CE 5/8    JD1999502     X2+oph_round(Y/138)*138 DOCUMENTED,NER NODE
```

**Exact match: `X2+Y*138/100` → 1902 CE, score 11, Phoenix node + Documented, not an echo.**
(The row's precise date is 17 May 1902; the README rounds to the year.)

### 5.3 (C) Flip the lens

README: "Cast the defaults under the V8 lens, note the top novel row (10 May 2040). Switch to V7 —
the ranking inverts to **1 June 2026**."

Under V7 with Today = 1 June 2026 the rewrite's top row is `2026 CE 6/1`, score 6, from
`X1+oph_round(Y/19)*19`. **Confirmed, with the same caveat as (A):** the row is the "Today" anchor
itself, so it is an ECHO. The README's illustration therefore only reads as written on the day it
was written; on the release date (12 June) the V7 top is `2026 CE 6/20`, score 6. Reproducible
behaviour, non-reproducible literal.

---

## 6 · CONFORMANCE TABLE

Every concrete, checkable claim the official documents make, against what
`C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR` actually does.

Legend: **MATCH** · **DIFFERS** · **NOT IMPL** (claim describes a capability the rewrite lacks) ·
**N/A** (claim is about the released artefact, not the rewrite).

### 6.1 Calendar core

| # | Official claim | Source | Rewrite | Verdict |
|---|---|---|---|---|
| C1 | Astronomical years, proleptic Gregorian, year 0 = 1 BC | Ref §3 | `src/core/jdn.js:1-7` | MATCH |
| C2 | `jdn(ay,m,d)`, `jdToDate(J)`, `fmtYear(a)` | Ref §3 | `jdn.js:15,31,47` — same names | MATCH |
| C3 | `fmtYear(-2238) === "2239 BC"` | Ref §3 | `jdn.js:48`; pinned `parity.test.mjs:63` | MATCH |
| C4 | `AM = ay + 3894` | Ref §3 | `AM_OFFSET = 3894`, `lattice.js:6` | MATCH |
| C5 | AM epoch `jdn(−3894,1,1)` | Ref §3 | `cycles.js:119` `anunnaTurnings` uses exactly that | MATCH |
| C6 | `LC = ay + 3112`; LC 5138 = 2026 CE | Ref §3 | `LC_OFFSET = 3112`, `lattice.js:8`; test `parity.test.mjs:199` | MATCH |
| C7 | Since Cataclysm `= ay + 5238` | Ref §3 | `CAT_OFFSET = 5238`, `lattice.js:10` | MATCH |
| C8 | Phoenix lattice `ay mod 138 = 108` | Ref §3 | `PHOENIX_PERIOD 138` / `PHOENIX_PHASE 108`, `lattice.js:13-14` | MATCH |
| C9 | Nemesis X 792-yr, inner window flagged separately | Ref §3 | `NEMESIS_PERIOD 792`, `NEMESIS_INNER 60`, `NEMESIS_PHASE 462` | MATCH |
| C10 | Anunnaki NER 600-yr; node when offset = 0 | Ref §3 | `NER_PERIOD 600`, `NER_PHASE 162`; `traits.js:68` tests `off === 0` | MATCH |
| C11 | `MAY_NODES`: **14** baktun years, −3112 … 2046 | Ref §3 | `lattice.js:35` — 14 entries, `[-3112 … 2046]` | MATCH |
| C12 | Metonic 19 yr = 235 moons; synodic 29.530588853 d; J2000 new-moon epoch | Ref §3 | `METONIC 19`, `SYNODIC 29.530588853`, `NEWMOON_J2000 2451550.1` | MATCH |
| C13 | Sanity anchor: today (2026) → AM 5920 / LC 5138 | Ref §3.1 | `parity.test.mjs:198-199` asserts both | MATCH |
| C14 | Sanity anchor: Flood (astro −2238) → AM 1656 | Ref §3.1 | `−2238 + 3894 = 1656`; ledger row text says "Annus Mundi 1656" | MATCH |
| C15 | Sanity anchor: Petrie 1882 CE → AM 5776 | Ref §3.1 | `1882 + 3894 = 5776` — computed correctly, but **no test asserts it** | MATCH (untested) |
| C16 | All **24** Phoenix events `mod 138 = 108` exactly | Ref §3.1 | 24 `phx` rows in `ledger.js`; all pass — but **no test asserts it** | MATCH (untested) |

### 6.2 Operation grammar

| # | Official claim | Source | Rewrite | Verdict |
|---|---|---|---|---|
| G1 | Must start `X1+` or `X2+` | Ref §4 | `equation/index.js:66-69` | MATCH |
| G2 | Normalise: strip whitespace; `x` / `×` → `*` | Ref §4 | `index.js:64`; `tokenizer.js:55-59` | MATCH (mechanism differs — real operator token, not `.replace`) |
| G3 | Whitelist check on residual characters, error "illegal token" | Ref §4 | Replaced by a tokeniser+parser; unknown characters raise `unexpected character "…"` | DIFFERS (strictly stricter) |
| G4 | Compile with `new Function(…)` | Ref §4 | **Deliberately removed** — AST evaluator, `equation/index.js:22-51` | DIFFERS (by design, `DEVIATIONS.md` §1) |
| G5 | Probe with `Y = 1000`; reject non-finite | Ref §4 | `index.js:78-81` — literally `evaluate(ast, 1000)` | MATCH |
| G6 | `Y` = interval in days | Ref §4 | `parser.js:85` | MATCH |
| G7 | `OPH_PHI = 1.61803398875` | Ref §4 | `constants.js:13` | MATCH |
| G8 | `OPH_PI = 3.14`, not `Math.PI` | Ref §4 | `constants.js:14`, with the comment | MATCH |
| G9 | `OPH_CRV = 5.08` | Ref §4 | `constants.js:15` | MATCH |
| G10 | `oph_flip`: 138 → 831, 19 → 91, decimal point keeps its position | Ref §4 | `functions.js:21-27`; `parity.test.mjs:83-91` pins `oph_flip(12.5)===52.1` | MATCH |
| G11 | `oph_round` / `oph_floor` / `oph_ceil` | Ref §4 | `functions.js:43-45` | MATCH |
| G12 | `oph_abs`, `oph_sqrt` (sqrt of the absolute value) | Ref §4 | `functions.js:46-47` | MATCH |
| G13 | The grammar rejects `Y*2` (no prefix) | Walk L3 | `parity.test.mjs:130` rejects `Y+1` | MATCH |
| G14 | Only single-argument functions, four constants | implied Ref §4 | Rewrite adds 12 more functions and 16 more constants | DIFFERS (additive; `DEVIATIONS.md` §8) |

### 6.3 Cast pipeline

| # | Official claim | Source | Rewrite | Verdict |
|---|---|---|---|---|
| P1 | Every unordered pair of enabled anchors | Ref §5 | `cast.js:74-76` — `N(N−1)/2` | MATCH |
| P2 | `Y = |x2.jd − x1.jd|` | Ref §5 | `cast.js:78` | MATCH |
| P3 | Skip `Y < 1` or `Y > 3,000,000` | Ref §5 | `LIMITS.minY 1`, `maxY 3_000_000`, `cast.js:28-29,79` | MATCH |
| P4 | Skip non-finite offsets | Ref §5 | `cast.js:88` | MATCH |
| P5 | `ZJD = round(base + offset)`; base per the op's prefix | Ref §5 | `cast.js:90-91` | MATCH |
| P6 | Skip projected year `< −5400` or `> 4000` | Ref §5 | `LIMITS.minYear −5400`, `maxYear 4000`, `cast.js:93` | MATCH |
| P7 | Dedup on (ZJD, equation, pair) | Ref §5 | `cast.js:97` — key `${ZJD}|${op.eq}|${x1.jd}|${x2.jd}` | MATCH |
| P8 | `score = scoreZDate + MSRF bonus + eclipse bonus` | Ref §5 | `cast.js:101-129` in that order | MATCH |
| P9 | ECHO if ZJD within ±1 day of **any** input anchor | Ref §5 | `LIMITS.echoTolerance 1`, `cast.js:113` | MATCH |
| P10 | Sort by score desc, then by date | Ref §5 | `cast.js:154` | MATCH |
| P11 | Echoes kept, dimmed, tagged; `✦ NOVEL ONLY` filter hides them | Ref §5 | `results.js:29` `novel: r => !r.echo`; `results.js:139` `echo` CSS flag | MATCH |
| P12 | "(x1 earlier, x2 later)" — X1 is the chronologically earlier anchor | Ref §5 | Rewrite binds X1 to the lower-**indexed** anchor and does **not** sort (`anchors.js:1-8`) | DIFFERS (see §7.6) |

### 6.4 Scoring

| # | Official claim | Source | Rewrite (`scoring/lenses.js`) | Verdict |
|---|---|---|---|---|
| S1 | Phoenix node V8 +5 / V7 +2 | Ref §6 | `['phx',5]` / `['phx',2]` | MATCH |
| S2 | Near Phoenix ±2 yr V8 +2 / V7 +1 | Ref §6 | `['near',2]` / `['near',1]`; test `traits.js:51` `min(into,to) <= 2` | MATCH |
| S3 | Documented event V8 +5 / V7 +1 | Ref §6 | `['doc',5]` / `['doc',1]` | MATCH |
| S4 | Palindrome V8 +3 / V7 +4; year, AM **or** JD | Ref §6 | `['pal',3]` / `['pal',4]`; `traits.js:56` tests all three | MATCH |
| S5 | 138 in digits V8 +2 / V7 +4; year / AM / LC | Ref §6 | `['s138',2]` / `['s138',4]`; `traits.js:62` tests all three | MATCH |
| S6 | Metonic-19 V8 +2 / V7 +2 | Ref §6 | `['met',2]` in both | MATCH |
| S7 | 19 in digits V8 +1 / V7 +2; year / AM only | Ref §6 | `['s19',1]` / `['s19',2]`; `traits.js:65` tests year + AM, **not** LC | MATCH |
| S8 | MSRF resonance V8 +2 / V7 +3 | Ref §6 | `msrf: 2` / `msrf: 3` | MATCH |
| S9 | Solar eclipse ±1 day +2 / +2 | Ref §6 | `solar: 2` in both | MATCH |
| S10 | Lunar eclipse ±1 day +1 / +1 | Ref §6 | `lunar: 1` in both | MATCH |
| S11 | Nemesis / NER / baktun +1 each in both | Ref §6 | `['nem',1] ['ner',1] ['bak',1]` in both | MATCH |
| S12 | MSRF matches on Y **or** \|offset\| | Ref §6 | `cast.js:104-107` | MATCH |
| S13 | MSRF set = Ophis NORMAL+IMPORTANT key members, **plus 19** | Ref §6 | `msrf.js:8-11`, 87 numbers; `MSRF.has(19) === true`, `MSRF_FULL.has(19) === false` | MATCH |
| S14 | Lens switch re-scores and re-sorts live | Ref §6 | `state.lastCast` re-score path, `store.js:71-77` | MATCH |
| S15 | Two lenses only: V8 chronology-first, V7 numbers-first | Ref §6, Walk L6 | `LENSES = {V8, V7}`, default `V8` | MATCH |

### 6.5 Convergence

| # | Official claim | Source | Rewrite (`core/convergence.js`) | Verdict |
|---|---|---|---|---|
| V1 | Windows: exact day, ±1, ±7, ±30 (default), ±90, same year | Ref §7 | `WINDOWS` ids `0,1,7,30,90,year`; `state.convTol = 30` | MATCH |
| V2 | Sort on JD, chain any neighbour within tolerance | Ref §7 | `convergence.js:40-49` | MATCH |
| V3 | Strength = number of **distinct operations** | Ref §7 | `nOps: opsSet.size`, rendered by `convergence.js:22` | MATCH |
| V4 | Clusters below strength 2 discarded | Ref §7 | `.filter(c => c.nOps >= 2)` | MATCH |
| V5 | Reports distinct anchor pairs contributing | Ref §7 | `nPairs: pairsSet.size` | MATCH |
| V6 | Centre = mean JD; span in days; best member score; union of non-echo tags | Ref §7 | `centerJD`, `spanDays`, `bestScore`, `tagMap` skipping `t[1]==='echo'` | MATCH |
| V7 | Sort by strength, then best score, then tightness | Ref §7 | `convergence.js:91-97` (plus a `centerJD` final tiebreak, as the original) | MATCH |
| V8 | All-echo clusters flagged and excluded from the headline list | Ref §7 | `allEcho` computed; the panel pre-filters echoes (`panels/convergence.js:98`) | MATCH |
| V9 | **Default cast yields a strength-4 convergence on 2040** | Ref §12, A.4; Walk L7 | Rewrite reports **strength 2, count 4** on release-day defaults | **DIFFERS — the doc is wrong** (§4.5) |
| V10 | Default cast = 34 projections, 5 convergences | Ref §12 | Reproduced exactly with Today = 2026-06-12 | MATCH |
| V11 | Top result 10 May 2040, score 12 | Ref §12, A | Reproduced exactly | MATCH |

### 6.6 Eclipse tables

| # | Official claim | Source | Rewrite | Verdict |
|---|---|---|---|---|
| E1 | Delta-encoded: base JD + comma-separated day-gaps | Ref §8 | `ECL_S_BASE` + `ECL_S_D`; `eclipses.js:20-33` | MATCH |
| E2 | Parallel type string, `T`/`A`/`P`/`H` | Ref §8 | `ECL_S_T`; `ECL_TYPE_NAME` | MATCH |
| E3 | Decoded at boot into sorted JD arrays | Ref §8 | Decoded **lazily on first use**, `eclipses.js:35-46` | DIFFERS (behaviourally equivalent) |
| E4 | `eclipseNear(jd, tol)` by binary search | Ref §8 | `eclipses.js:61-80`, same name | MATCH |
| E5 | Coverage ~1–3000 CE | Ref §8, §14, README | `coverage()` → JD 1,721,231 … 2,817,079; pinned `parity.test.mjs:207-208` | MATCH |
| E6 | Outside range, no tag — degrade gracefully | Ref §8, §14 | `cast.js:118` guards on `coverage()` | MATCH |
| E7 | "about 56 kilobytes" of eclipse data | Walk L7 | `src/data/eclipses.data.js` is 58,245 B | MATCH (≈) |

### 6.7 Ledger & wheels

| # | Official claim | Source | Rewrite | Verdict |
|---|---|---|---|---|
| L1 | **69** events | Ref §9, README (`ledgerCount`) | `LEDGER.length === 69`, pinned `parity.test.mjs:221` | MATCH |
| L2 | Tuple shape `[astroYear, kind, text, [month, day]]` | Ref §9 | `ledger.js:3` — identical | MATCH |
| L3 | Spans Nemesis Cataclysm (5239 BC) → 2046 close of the count | Ref §9 | First row `-5238`; runs to `2178` (past 2046, which the doc understates) | MATCH (doc understates range) |
| L4 | Kinds: `key, phoenix, nemesis, ner, baktun, note` | Ref §9 | Codes are `key, phx, nem, ner, may, note` | DIFFERS (prose vs code identifiers only) |
| L5 | Rows seedable as anchors, loading with month/day | Ref §9 | `eventSeedDate()`, `anchors.js:15` | MATCH |
| L6 | Rows clickable to read on the wheels | Ref §9 | `panels/ledger.js` | MATCH |
| L7 | Default seed date 15 May when the tuple omits one | implied | `ledger.js:82-84` returns `{m:5,d:15}` | MATCH |
| L8 | **Seven** wheels, named | Ref §9 | `wheels.js:198-204`: phx · nem · ner · am · may · anu · moon — the same seven, same order | MATCH |
| L9 | Dial slider 2843 BC → 2178 CE | Ref §9 | `index.html:213` `min="-2842" max="2178"`; ticks labelled "2843 BC … 2178" | MATCH |
| L10 | Presets: Today, 2040, 2046, 2178 | Ref §9 | `index.html:219-222`, `data-jy` 2040/2046/2178 + `#dToday` | MATCH |

### 6.8 Packs & configuration

| # | Official claim | Source | Rewrite (`src/data/packs.js`) | Verdict |
|---|---|---|---|---|
| K1 | Default pack = **19** operations | Ref §10 | `DEFAULT_OPS.length === 19`, pinned | MATCH |
| K2 | All 19 equations, **in the documented order** | Ref §10 | Item-by-item identical, entries 1–19 | MATCH |
| K3 | 138 Pack = 12 ops, on 138 and 414/552 | Ref §10 | 12 entries; includes `…/414)*414` and `…/552)*552` | MATCH |
| K4 | 19 Metonic Pack = 11 ops, on 19/235 | Ref §10 | 11 entries; includes `Y*235/19` and `…/235)*235` | MATCH |
| K5 | Phoenix Lattice Pack = 10 ops across 138/792/600/360/216/144 | Ref §10 | 10 entries; all six moduli present | MATCH |
| K6 | Golden Pack = 10 ops on φ, π, curvature | Ref §10 | 10 entries | MATCH |
| K7 | Four themed packs replace the default set with one click | Ref §10 | `PACKS` has 5 keys (default + 4), pinned `parity.test.mjs:224` | MATCH |
| K8 | Custom operations join the active set after passing the compiler | Ref §10 | `makeOperation()`, `store.js:34-41` | MATCH |
| K9 | Save format `{app:"OPHION", v:3, …}` with `system`, `convTol` (string), `anchors`, `ops` | Ref §10.1 | `{format:"natori-on-psyfr/1", …, lens, msrfSet, convTol (number), anchors, operations}` | **DIFFERS — and it does not round-trip** (§7.4) |
| K10 | Save writes anchors, operations, scoring lens, convergence window | Ref §10.1 | All four, plus `packName` and `msrfSet` | MATCH (superset) |
| K11 | "⤒ Load restores one"; files plain JSON and freely shareable | Ref §10.1, README | `loadConfigText()`, plain JSON | MATCH |
| K12 | Download filename prefix `Natori-On-PSYFR-config-` (post-rename) | Walk L10 | `natori-setup_${stamp()}.json`, `io/config.js:42` | DIFFERS (cosmetic; the docs permit renaming download filenames) |
| K13 | **81 shipped operations compile** | Ref §12 | Unreconcilable: PSYFR1 packs hold 62 entries / 49 distinct; PSYFR2's cookbook adds 24 distinct (18 overlapping); union = 55 | **NOT VERIFIABLE** |

### 6.9 UI layer

| # | Official claim | Source | Rewrite | Verdict |
|---|---|---|---|---|
| U1 | Cinzel / EB Garamond / IBM Plex Mono | Ref §11 | `tokens.css:38-40` — all three, with fallbacks | MATCH |
| U2 | gold `#d8a943` | Ref §11 | `tokens.css:27` `--gold: #d8a943` | MATCH |
| U3 | red `#d3402f` | Ref §11 | `tokens.css:29` `--red: #d3402f` | MATCH |
| U4 | cyan and violet on near-black | Ref §11 | `--cyan:#54b8c9`, `--violet:#9b7fd0`, `--bg` near-black | MATCH |
| U5 | Aged-parchment light theme | Ref §11 | `:root[data-theme='light']`, `tokens.css:56` | MATCH |
| U6 | **Honours `prefers-color-scheme` on first visit** | Ref §11, Walk L9 | **Does not.** `chrome.js:73` hard-defaults to dark; zero `prefers-color-scheme` rules in `src/styles/` | **DIFFERS** (§7.2) |
| U7 | Honours `prefers-reduced-motion` always | Ref §11 | Present in `src/styles/base.css` | MATCH |
| U8 | Every control keyboard-reachable, visible focus ring | Ref §11 | Native buttons + focus styling in `base.css` | MATCH |
| U9 | `A− / A / A+` scales the page **0.8–1.5×** | Ref §11 | `chrome.js:97` clamps to **0.8–1.6** | DIFFERS |
| U10 | Five sections: Oracle, Convergence, Wheels, Ledger, Method | Ref §2 | `index.html:26-30` — the same five | MATCH |
| U11 | Four expanders, closed by default: op list, packs/save-load toolbar, ledger table, scoring rulebook | Ref §11.1 | `index.html:103,128,234,259` — four `<details class="fold">`, none `open` | MATCH |
| U12 | Numbered **Seed → Cast → Read** strip | Ref §11.1 | `index.html:72-74` `.cstep` 1/2/3 | MATCH |
| U13 | Thesis-framing card in Method stays un-foldable | Ref §11.1 | Framing text sits outside the `<details>` at `index.html:259` | MATCH |
| U14 | Simple view hides moment bar, ops panel, lens, advanced fold, Ledger, Method, and their nav links | Ref §11.2 | 9 × `simple-hide` in `index.html`, incl. both nav links | MATCH |
| U15 | Simple view is a pure CSS class on `body`; identical cast results | Ref §11.2 | `chrome.js:45` `document.body.classList.toggle('simple', simple)` | MATCH |
| U16 | Toggle labels `✦ Simple` / `⛭ Full view` | Ref §11.2, README | `✦ Simple` / `◈ Full`, `chrome.js:47` | DIFFERS (cosmetic) |
| U17 | The `📖` link into the field guide | README | `index.html:31` `href="guide.html" class="guide"` with 📖 | MATCH |
| U18 | Big red `⟳ CAST THE ORACLE` button | README | `index.html:144` `<button class="btn cast">⟳ Cast the Oracle</button>` | MATCH |

### 6.10 Storage & persistence — the §1.2 contract

| # | Official claim | Source | Rewrite | Verdict |
|---|---|---|---|---|
| T1 | `ophion-theme` — theme, shared by both pages | Ref §1.2 | Rewrite uses **`natori.prefs`**, a single JSON blob (`ui/chrome.js:10`) | **DIFFERS** |
| T2 | `ophion-zoom` — text size, shared by both pages | Ref §1.2 | folded into `natori.prefs.zoom` | **DIFFERS** |
| T3 | `ophion-mode` — Simple view, engine only | Ref §1.2 | folded into `natori.prefs.simple` — and now **shared with the guide's origin**, not engine-only | **DIFFERS** |
| T4 | These three keys are **the only** browser storage | Ref §1.2 | One key; still the only storage. Property preserved | MATCH (in spirit) |
| T5 | **Anchors and operations are deliberately never persisted** | Ref §1.2 | Not persisted to localStorage — but explicitly saved and restored via `src/io/config.js` (`serializeConfig` / `loadConfigText`) | MATCH (see §7.3 for the nuance) |
| T6 | Theme choice carries across both HTML pages | Ref §1.2, Walk L10 | `guide.html` is a separate document; the rewrite's `chrome.js` runs from `src/`, and `guide.html` does not import it — **the guide does not pick up the theme** | **DIFFERS / NOT IMPL** |
| T7 | Renaming rule: storage keys **must not** change | Ref §13.1 | Changed (T1–T3) | **DIFFERS — violates the stated rule** |
| T8 | Renaming rule: element IDs must not change | Ref §13.1 | Preserved wholesale (`castBtn`, `anchorList`, `convTolSel`, `dSlider`, `dialPresets`, `themeBtn`, `modeBtn`, `resBody`, `wheelGrid`, `ledgerCount`, …) | MATCH |
| T9 | Renaming rule: function names must not change | Ref §13.1 | `jdn`, `jdToDate`, `fmtYear`, `am`, `lcYear`, `oph_flip`, `eclipseNear`, `findConvergences`, `cast` all preserved. `compileOp` → `compileOperation`; `scoreZDate` → `scoreDate` | Mostly MATCH |
| T10 | Packaging = exactly two string replacements | Ref §13.1 | Verified against the release: 2 differing lines in each HTML file | MATCH (N/A to rewrite) |

### 6.11 Verification discipline

| # | Official claim | Source | Rewrite (`tests/parity.test.mjs`) | Verdict |
|---|---|---|---|---|
| Q1 | `npm test` runs both harnesses after any engine change | Ref §12 | `npm test` → `node --test tests/parity.test.mjs` (one harness) | DIFFERS |
| Q2 | today → AM 5920 / LC 5138 | Ref §12 | `parity.test.mjs:198-199` | MATCH |
| Q3 | Flood → AM 1656 | Ref §12 | **Not asserted.** `am(-2238)` is never tested | **NOT IMPL** |
| Q4 | Petrie → AM 5776 | Ref §12 | **Not asserted** | **NOT IMPL** |
| Q5 | `oph_flip(138) = 831` | Ref §12 | **Not asserted** — the flip test uses 123/120/12.5/1000/0 | **NOT IMPL** |
| Q6 | `oph_flip(19) = 91` | Ref §12 | **Not asserted** | **NOT IMPL** |
| Q7 | `isPalindrome(1331)` | Ref §12 | Asserted for 22 / 831138 / 2112, not 1331 | MATCH (equivalent) |
| Q8 | **3,276** calendar round-trips | Ref §12 | **6** round-trips (`parity.test.mjs:48-60`) | **DIFFERS — 3 orders of magnitude fewer** |
| Q9 | (Walkthrough) **812** round-trips, **16** anchor checks | Walk L5 | as Q8 | DIFFERS |
| Q10 | All **81** shipped operations compile | Ref §12 | All ops across all packs compile (`parity.test.mjs:93-97`) — 49 distinct | MATCH (different count, see K13) |
| Q11 | Grammar rejects **3** known-bad strings | Ref §12 | Rejects **10** (`parity.test.mjs:129-140`), incl. `X1+Y;alert(1)` and `X1+globalThis` | MATCH (superset) |
| Q12 | Default cast yields the strength-4 convergence on 2040 | Ref §12 | Asserts a `tol=0` cluster on 2048-11-07, `nOps=2` | DIFFERS (and the doc's claim is itself wrong — §4.5) |
| Q13 | The harness extracts the pure-math core by cutting at the `STATE + UI` banner | Ref §12 | Unnecessary — `src/core/**` is already DOM-free and imports directly | MATCH (obsoleted by design) |
| Q14 | `test/runtime.js` boots the whole script under a fake DOM (Proxy stubs + localStorage shim) to catch load-order and TDZ bugs | Ref §12, Walk L8 | **No runtime/boot test exists.** `app.js`'s `safely()` wrapper mitigates but does not detect | **NOT IMPL — the biggest verification gap** |
| Q15 | "It parses" is not "it runs" | Walk L8 | No test ever executes `src/app.js` or `src/ui/**` | NOT IMPL |
| Q16 | Live page smoke-tested in a browser: 34 projections, 5 convergences, top 10 May 2040 (12), **zero console errors** | Ref §12 | Numbers reproduced headlessly (§4.4); no browser smoke test in the repo | Partial |

### 6.12 Release, licensing, distribution

| # | Official claim | Source | Rewrite | Verdict |
|---|---|---|---|---|
| R1 | Repo `github.com/BeeRadicalStuff/natori-on-psyfr`, tag `v1.0`, commit `7521518` | Ref §13 | `package.json` points at `github.com/bradleyhomelinuxnet-prog/natori-on-psyfr` | DIFFERS (new home; expected) |
| R2 | Live at `beeradicalstuff.github.io/natori-on-psyfr` | Ref §13, README | `bradleyhomelinuxnet-prog.github.io/natori-on-psyfr` | DIFFERS (expected) |
| R3 | `index.html` redirects into `clocks/PSYFR1.html` | Ref §13 | `index.html` **is** the app; `PSYFR1.html`/`PSYFR2.html` kept at the root as frozen references | DIFFERS (documented in `README.md`) |
| R4 | Zip contains README.txt, the two renamed HTML files, and `docs/` | Ref §13 | N/A | N/A (and the doc's own manifest is incomplete — §1) |
| R5 | License: Use & Share, **No Derivatives** | LICENSE.txt | `package.json` declares `"license": "MIT"`; **no LICENSE file in the repo** | **DIFFERS** (§7.11) |
| R6 | Framing notice must be preserved (LICENSE clause c) | LICENSE.txt | `README.md` §Note and `index.html` Method both carry it | MATCH |
| R7 | "No internet required" except decorative fonts | README | Rewrite's CSP allows only `fonts.googleapis.com` / `fonts.gstatic.com`; `connect-src 'self'` | MATCH (tighter) |
| R8 | Two HTML files must stay side by side | README | `index.html` ↔ `guide.html` cross-link by bare filename | MATCH |
| R9 | "Nothing you enter ever leaves your computer" | README, Ref | No network code; CSP forbids it | MATCH |

---

## 7 · Corrections to the rewrite

These are places where the newly-opened official documentation contradicts what
`C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR` does or claims.

### 7.1 `docs/DEVIATIONS.md` §4 is factually wrong about the original

> **Original.** `TODAY` was a baked-in literal (`{y:2026, m:8, d:25}`). Every Metonic test measured
> from that fixed date, so the app silently went stale.
> — `docs/DEVIATIONS.md:49-52`

The browser build the parity tests were taken from does no such thing:

```
$ grep -o "_NOW[^;]\{0,60\}" PSYFR1.html
_NOW=new Date(), TODAY={y:_NOW.getFullYear(),m:_NOW.getMonth()+1
_NOW.getDate()}
```

Identical in the shipped `NATORI-ON-PSYFR-Main-UI.html`. **The released v1.0 already read the system
clock.** "Today comes from the clock" is therefore not a deviation at all — it is parity. The
baked-in literal, if it existed, belongs to the Electron v12 desktop build, and `DEVIATIONS.md` says
"Original" without qualification while the rest of that file uses "Original" to mean the browser
build. This also means `2026-08-25` in `tests/parity.test.mjs:30` is *the date the fixtures were
captured*, not a value the original hard-coded — which should be said, because it is why the golden
cast has 33 rows where the official smoke test records 34.

### 7.2 The rewrite silently dropped `prefers-color-scheme`

Reference §11 and Walkthrough Lesson 9 both state that the app follows the system colour preference
on first visit. The original implements it:

```js
prefers-color-scheme: light)').matches)?'light':'dark';
```

The rewrite does not — `src/ui/chrome.js:73` reads `prefs.theme === 'light' ? 'light' : 'dark'` and
there is not a single `prefers-color-scheme` rule anywhere in `src/styles/`. The in-code comment
argues the case (a pre-paint flash, and the CSP forbidding an inline script), and it is a defensible
trade — but it is an **undocumented** regression against a stated accessibility property, and
`docs/DEVIATIONS.md` does not list it. It should.

### 7.3 The storage-key change violates the documented renaming rule, and is undocumented

Reference §1.2 names `ophion-theme`, `ophion-zoom`, `ophion-mode` as the app's contract, and §13.1
raises it to a rule: "function names, element IDs and **storage keys must not** [change]." The
Walkthrough's Lesson 10 repeats it — the rename touched only the *download filename prefix*
(`sed -i "s|ophion_config_|Natori-On-PSYFR-config-|"`), "while deliberately leaving the internal
storage keys alone so the two files keep sharing your theme choice."

`src/ui/chrome.js:10` uses a single key `natori.prefs` holding `{theme, zoom, simple}`. Consequences:

* Every existing user's theme, zoom and Simple-view state is silently reset on upgrade.
* The three-key contract with the field guide is broken — see 7.5.
* The one hard "must not" in the official documentation is the one thing the rewrite broke.

None of this appears in `docs/DEVIATIONS.md`. Whether or not the change is kept, it needs an entry
there, and the migration is two lines (read the three legacy keys once when `natori.prefs` is
absent).

Related but *not* a violation: §1.2's "anchors and operations are deliberately never persisted" is
about localStorage, and the rewrite honours it — `src/io/config.js` is explicit file save/load that
the user initiates, exactly as §10.1 describes. `store.js` keeps anchors in memory only. No
correction needed here; the assignment's framing of these as opposed is not borne out by the code.

### 7.4 The rewrite cannot load a genuine NATORI-ON-PSYFR v1.0 `.json`, and says nothing

`src/io/config.js` understands two formats: its own `natori-on-psyfr/1`, and the Ophis v12 desktop
`.oph`. It does **not** understand the `{app:"OPHION", v:3}` format that the released v1.0 engine
writes — which is the format any existing user's saved setups are in. Executed:

```
$ node --input-type=module -e "
const { loadConfigText } = await import('./src/io/config.js');
const { state } = await import('./src/state/store.js');
const v3 = JSON.stringify({app:'OPHION',v:3,saved:'2026-06-12T00:00:00Z',system:'V7',convTol:'90',
  anchors:[{ay:-2238,m:5,d:15,label:'Great Flood',enabled:true},
           {ay:2040,m:5,d:15,label:'Phoenix 2040',enabled:true}],
  ops:[{eq:'X2+oph_round(Y)',enabled:true},{eq:'X1+Y+19',enabled:true}]});
console.log('result:', JSON.stringify(loadConfigText(v3)));
console.log('state.lens:', state.lens, '(file said V7)');
console.log('state.convTol:', JSON.stringify(state.convTol), typeof state.convTol);
console.log('state.operations count:', state.operations.length, '(file carried 2 in ops)');
"
```

```
result: {"loaded":2,"operations":0,"invalid":0,"skipped":[],"source":"native"}
state.lens: V8 (file said V7)
state.convTol: "90" string
state.operations count: 19 (file carried 2 in `ops`)
state.packName: Default 19
```

Three defects in one load:

1. **The operation list is silently discarded.** The file's `ops` array is not read (`fromNative`
   looks for `operations`), so `hasOperations` is `false`, the previous 19 defaults stay, and the
   toast reports "2 anchors · 0 operations" as though the file had none.
2. **The scoring lens is silently ignored** — `system: 'V7'` is not read (`fromNative` looks for
   `lens`), and the cast comes back V8.
3. **`convTol` lands as the string `"90"`.** The original wrote `String(convTol)` by design.
   `state.convTol` is documented as a number; `findConvergences` survives by coercion but the
   window `<select>` and any strict comparison do not.

Worse, `skipped` is empty — the file's own §5-style discipline ("dropping it is fine; dropping it
silently is not", `config.js:86-88`) is exactly what is violated. The fix is small: accept
`doc.ops` as an alias for `doc.operations`, `doc.system` as an alias for `doc.lens`, and coerce
`convTol` with `Number()`; or reject `{app:'OPHION'}` documents loudly.

### 7.5 The Field Guide no longer shares chrome with the engine

Reference §1.2: "theme and text size carry across both". `guide.html` in the rewrite is a standalone
document that does not load `src/ui/chrome.js` and therefore neither reads nor writes
`natori.prefs`. A user who sets light theme in the app and clicks 📖 gets the default theme. The
original's `ophion-theme` / `ophion-zoom` sharing is gone. Not listed in `DEVIATIONS.md`.

### 7.6 The X1-binding change is documented but contradicts the original's own semantics

`docs/DEVIATIONS.md` §9 lists "X1 binds to the lower-**indexed** anchor, not the earlier date" under
*Preserved on purpose*, and `src/ui/panels/anchors.js:1-8` states the original "sorted by Julian Day
on every add, which silently re-bound every X1 operation; that sort is gone."

The official Reference §5 writes the pipeline as `for each anchor pair (x1 earlier, x2 later)` —
i.e. the *documented* contract is chronological, and the original's sort is what made it true. The
rewrite's removal of the sort is a real semantic change, not a preserved quirk: it is only
observationally equivalent while the user happens to add anchors in date order. `DEVIATIONS.md`
places it in the wrong table — it belongs under deliberate deviations, with the note that the
official Reference specifies the chronological reading.

### 7.7 `docs/DEVIATIONS.md` §1's "49 shipped equations" versus the docs' "81"

`DEVIATIONS.md:23` and `:99` both scope the parity proof to "all 49 shipped equations across all
five packs". The official Reference §12 asserts the harness compiled **81** shipped operations. 81
does not reconcile with anything countable in the shipped v1.0 files (62 pack entries, 49 distinct;
plus 24 distinct cookbook formulas in the Field Guide, 18 of which overlap — union 55). Either the
official figure is stale or it counted something not in the release. The rewrite's 49 is verifiable
and correct for the packs; but the **24 Field Guide cookbook formulas are not in any test**, and
the Reference explicitly claims each cookbook formula is "validated so none can throw an error"
(Walkthrough L10). Adding them to `parity.test.mjs` is a cheap way to close the gap.

### 7.8 The verification gap the official docs make explicit

Reference §12 and Walkthrough Lesson 8 describe `test/runtime.js` as load-bearing: the only reason
the `Cannot access '$' before initialization` TDZ bug was caught before shipping. The rewrite has
**no equivalent**. `tests/parity.test.mjs` imports only `src/core/**` and `src/data/**`; nothing in
the suite ever executes `src/app.js`, `src/ui/chrome.js`, or any panel. `app.js`'s `safely()`
wrapper turns an init failure into a `console.error` and a missing panel — which makes exactly the
class of bug the original harness existed to catch *harder* to notice, not easier.

Also missing, and named individually in Reference §12: the Flood → AM 1656 assertion, the Petrie →
AM 5776 assertion, `oph_flip(138) = 831`, `oph_flip(19) = 91`, and the 3,276-case (or even
812-case) calendar round-trip sweep — the rewrite runs **six** round-trips.

### 7.9 The zoom range differs from the documented 0.8–1.5×

`src/ui/chrome.js:97` clamps to `Math.min(1.6, Math.max(0.8, …))`. The original clamps to 1.5
(`zoom=Math.min(1.5,…)`), and Reference §11 documents 0.8–1.5×. Trivial, but it is a
"visible-behaviour" change with no entry anywhere.

### 7.10 The rewrite breaks a property the official docs name as inviolable

Reference §14: "The single-file form is a feature (open-from-disk, air-gapped); splitting into
modules remains an option **but must not break that property**." The rewrite is ES modules and
cannot be opened from `file://`; `README.md:40` says so. This is an intentional architectural
decision and the right one for a modding-oriented rebuild — but it is the explicit failure mode the
original authors warned about, and neither `README.md` nor `DEVIATIONS.md` acknowledges that the
constraint existed. A one-file bundled build (`tools/`) would satisfy both.

### 7.11 License mismatch

`package.json:9` declares `"license": "MIT"`. The upstream `LICENSE.txt` shipped with v1.0 is
**Use & Share, No Derivatives**, which forbids ports and forks without written permission, and there
is **no LICENSE file in the rewrite's repository at all**. The owner holds the copyright and may
relicense — but as it stands the repo asserts MIT with nothing to back it, over a codebase whose
only written license says the opposite. Add a LICENSE file that says whichever is intended.

### 7.12 Small documentation drift in the rewrite

* `README.md:75` — "`reverse/` the full reverse-engineering study (**15** specs)". There are 16
  files (`00`–`15`), and this spec makes 17+.
* `README.md:112` — "a complete **33-row** scored cast" is correct for the fixture but reads as a
  claim about the original; the original's own smoke test records 34 for the default state. Worth a
  clause explaining that the count follows the "Today" anchor.
* `README.md:101` links `docs/WHITEPAPER.md`, which exists — no defect (an earlier read of the
  directory listing missed it).
* Reference §9 kinds are `phoenix`/`baktun` in prose where the data uses `phx`/`may`. The rewrite's
  `ledger.js:3` documents the codes; a one-line mapping note would make the official docs readable
  against the data file.

---

## 8 · What the official docs got right that this study had not pinned

Recorded so it is not re-derived:

* **The renaming rule is real and was followed exactly.** `PSYFR1.html`/`PSYFR2.html` in this
  repository are the released `NATORI-ON-PSYFR-Main-UI.html`/`-Field-Guide.html` with **two lines**
  changed in each — the cross-links only. Line endings differ (CRLF in the repo copies).
* **`ophis.html` inside the 100 MB executable is byte-identical to the loose `ophis.html`** — 39,970
  bytes, per Walkthrough Lesson 2. The `.exe` never contained anything the small file did not.
* **19 is not a stock Ophis MSRF number.** Reference §6 says it was added by owner request; the
  author's own 564-number tiered table confirms it (`MSRF_FULL.has(19) === false`).
* **The `STATE + UI` banner comment is load-bearing** — the original verify harness split the file
  on it. Anything that reformats that banner in `PSYFR1.html` breaks the (now-absent) harness.
* **`OPH_PI = 3.14` is deliberate lore, stated as such by the authors** ("Archaix π … deliberately
  the lore value, not `Math.PI`"). `constants.js` already says this; now it has a citation.
* **Convergence "strength" is `nOps`, and the official strength-4 claim is a miscount** — the
  original's own rendering code proves it (§4.5).
