# 20 · The Chronicon source — calendrics, cycles, and the 69-row ledger

**Assignment:** the *chronicon* domain source — the calendrics the scoring is weighed against.

**Primary sources read in full:**

| File | Size | What it is |
|---|---|---|
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/chronicon-clocks-calendrics.txt` | 78 666 B · 1 162 lines | A saved copy of `hollywood-rogue-ai-ventures.w3spaces.com/a-Chronicon-Time-Engine-Clock-System.html`. Two documents in one file: an outer "Reader's Dossier" and, inside an `<iframe srcdoc>`, a complete working six-clock calendrics engine. |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/Ophis_v9_DeepDive_Addendum.md` | 57 119 B · 837 lines | Three engine deep-dives for Ophis **v9**: an end-to-end compute trace, an operation-by-operation reference, and an analysis of the three MSRF filter arrays. |

**Cross-referenced:** `src/data/ledger.js`, `src/data/lattice.js`, `src/core/cycles.js`,
`src/core/scoring/traits.js`, `src/ui/panels/wheels.js`, `src/core/equation/constants.js`,
`src/data/packs.js`, `docs/DOMAIN.md`, `docs/DEVIATIONS.md`, `guide.html`,
`Ophis_v12_Browser/PSYFR1.html`, `reference/asar/unpacked/src/ophis_config.js`,
`reference/asar/unpacked/src/ophis_model__params.js`, `reference/asar9/unpacked/src/ophis_config.js`.

**Headline result:** the chronicon source's event array and `src/data/ledger.js` are a **perfect
69/69 year-for-year match — zero events missing, zero events added.** The reconciliation is
therefore not about *which* events exist but about eight text deltas, three month/day values with no
provenance in this source, and a set of the source's own internal contradictions that the ledger
inherits verbatim.

---

## 0 · Where the file's two halves live

The `.txt` is a saved HTML page. Line 1 is the URL it was saved from. The structure is unusual and
matters for citation:

| Lines | Content |
|---|---|
| 4–131 | Outer page `<head>`, CSS, nav |
| **132–928** | `<div id="engine">` → `<iframe srcdoc="…">`. **Everything from line 135 to line 927 is the value of one HTML attribute.** All `"` inside it are `&quot;`, all `&` are `&amp;`. This is the **engine**. |
| 929–1097 | The outer **Reader's Dossier** — seven prose sections (I–VII) |
| 1099–1158 | Outer scripts: the pyramid SVG renderer and a fullscreen helper |

The engine's own `<script>` blocks run from line 482 to line 925. Two of the later blocks
(lines 898–925) are *also* inside the `srcdoc` — verified by the absence of any unescaped `"` in
them — which produces a live bug documented in §7.4.

---

## 1 · The time model

`chronicon-clocks-calendrics.txt:483–500` is the whole model, and it is reproduced identically in
`src/core/jdn.js` and `src/data/lattice.js`.

```js
/* ---------- TIME MODEL ----------
   astronomical year: 1 BC = 0, 2 BC = -1 ... so BC year B -> 1-B ; CE year Y -> Y
   Annus Mundi: AM = astro + 3894   (2022 CE -> 5916 ; 2239 BC -> 1656 ; today 2026 -> 5920)
*/
const SYN = 29.530588853;
const NEWMOON_J2000 = 2451550.1;            // 2000-01-06 18:14 UT new moon
const TODAY = {y:2026, m:5, d:30};
function astroFrom(yearAbs, era){ return era==='bc' ? (1-yearAbs) : yearAbs; }
function fmtYear(astro){ return astro<=0 ? (1-astro)+" BC" : astro+" CE"; }
function jdn(astroYear, m, d){           // proleptic Gregorian Julian Day Number
  const a = Math.floor((14-m)/12);
  const y = astroYear + 4800 - a;
  const mm = m + 12*a - 3;
  return d + Math.floor((153*mm+2)/5) + 365*y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400) - 32045;
}
const TODAY_JD = jdn(2026,5,30);
function isPalindrome(n){ const s=String(Math.abs(n)); return s.length>1 && s===s.split('').reverse().join(''); }
function mod(n,m){ return ((n%m)+m)%m; }
```

Points worth stating explicitly:

- **Proleptic Gregorian, not Julian.** The JDN routine applies the 100/400 century rules across the
  entire range, including 5239 BC. Every deep-past day-count in this engine — and in the rewrite —
  is Gregorian-projected, not historically observed.
- **`TODAY` is a baked literal**, not `new Date()`. The engine will still say "TODAY 5/30/2026"
  (line 337) in 2030. The rewrite fixed this (`docs/DEVIATIONS.md` §4).
- **`isPalindrome` requires `length > 1`**, so single-digit values never flag. Consequential at
  AM 0–9 (astronomical years −3894 … −3885).
- **`mod` is the floored modulo**, so it is well-defined for negative years. `src/core/jdn.js`
  exports the identical function.

`jdn(2026,5,30) = 2 461 191`. `jdn(-3894,1,1) = 298 806` (the Annus Mundi epoch, used by
`anunnaTurnings()` in `src/core/cycles.js:118`).

---

## 2 · Every cycle the source defines

The engine declares its cycle grids in four lines,
`chronicon-clocks-calendrics.txt:503–506`:

```js
/* ---------- CYCLE GRIDS (astronomical years) ---------- */
const PHX = {mod:108, step:138, base:-4308};            // 4309 BC = node 1
const NEM_ENTER = {mod:462, step:792};                  // enters inner system; 60 yr inner
const NER = {mod:162, step:600, base:-5238};            // 5239 BC start
const MAY_NODES = [-3112,-2712,-2312,-1912,-1512,-1112,-712,-318,76,470,864,1258,1652,2046]; // baktun boundaries
```

### 2.1 · Phoenix / Sky Dragon — 138 years

| Property | Value | Citation |
|---|---|---|
| Period | **138 years** | `:504` `step:138` |
| Phase | `mod(year,138) === 108` | `:504` `mod:108`, tested at `:605`, `:642` |
| Epoch / node #1 | **astro −4308 = 4309 BC** | `:504` `base:-4308` |
| Node numbering | `pIdx = round((pPrev − base)/138) + 1` | `:659` |
| Record span | 6 348 yr = 138 × 46, 4309 BC → 2040 CE | `:463`, `:661`, `:1060` |

Evidence given: none arithmetical — it is asserted as Breshears' finding. The dossier states it at
`:1080`: Breshears "named the recurring planetary destroyer the **Phoenix**, and … demonstrated its
**138-year** cadence of resets — vanished populations, emptied cities, mudfloods, volcanic
resurfacing and red-dust fallout." The *internal* evidence is the ledger: **all 24 `phx` rows sit
exactly on `mod(a,138) = 108`, with no exceptions** (verified programmatically; PSYFR1's own comment
at `PSYFR1.html:640` makes the same claim — "all phx verified mod138=108" — and it holds).

Nested multiples the source calls out (`:463`, `:1060`):
`138 × 3 = 414` ("cursed time") · `138 × 4 = 552` ("Phoenix cycles") · `138 × 46 = 6348`.

Rewrite: `PHOENIX_PERIOD = 138`, `PHOENIX_PHASE = 108` (`src/data/lattice.js:13–14`),
`FIRST_PHOENIX_NODE = -4308` (`src/ui/panels/wheels.js:34`). **Exact match.**

### 2.2 · Nemesis X Object — 792 years, 60 inside

| Property | Value | Citation |
|---|---|---|
| Orbit | **792 years** | `:505` `step:792` |
| Inner arc | **60 years** | `:666` `inner = offset<60` |
| Outer arc | **732 years** (792 − 60) | `:677`, and `:950`, `:1022` |
| Phase | enters the inner system where `mod(year−462,792) === 0` | `:505` `mod:462` |
| Anchor event | astro **462** — "Nemesis X enters inner system; Statue of Zeus destroyed" | `:559` |
| 7-cycle frame | **5 544 yr** = 792 × 7 | `:653` |

The inner test is **strictly `off < 60`**, so the inner arc is `off ∈ [0, 60)` — sixty years
numbered 0…59. `off === 60` is the **first year outside**. This produces the off-by-one documented
in §7.1.

Rewrite: `NEMESIS_PERIOD = 792`, `NEMESIS_INNER = 60`, `NEMESIS_PHASE = 462`
(`src/data/lattice.js:17–19`); `nemesisInfo()` uses the same `off < NEMESIS_INNER` test
(`src/core/cycles.js:54`). **Exact match**, including the off-by-one.

### 2.3 · Anunnaki NER — 600 years

| Property | Value | Citation |
|---|---|---|
| Period | **600 years** | `:506` `step:600` |
| Phase | `mod(year−162,600) === 0` | `:506` `mod:162`, `:683` |
| Epoch / period #1 start | **astro −5238 = 5239 BC** (the Cataclysm) | `:506` `base:-5238` |
| Period number | `floor((astro + 5238)/600) + 1` | `:685` |
| Subdivision | "each 600-yr NER = **ten 60-yr decans**" | `:687` |

Note that `mod(−5238 − 162, 600) = 0`, so the phase 162 and the base −5238 are the same grid — the
NER wheel is anchored on the Cataclysm, not on 162 CE. 162 CE is simply the first *positive*
member.

Evidence given: `:951` — "762 CE falls exactly on the **6000th NER year**, as your work has it."
Check: `762 + 5238 = 6000`. ✓ The `762` ledger row (`:562`) states the same.

Rewrite: `NER_PERIOD = 600`, `NER_PHASE = 162` (`src/data/lattice.js:22–23`); `nerInfo()` numbers
from `CAT_OFFSET` (`src/core/cycles.js:67`). **Exact match.**

### 2.4 · Mayan Long-Count — 13 baktuns, and its hidden two-rate structure

`MAY_NODES` is a hard-coded list of 14 boundaries (`:506`), not a computed grid. **It is not
uniformly spaced, and the spacing change is the most substantive undocumented finding in this
source.**

```
-3112 → -2712   400
-2712 → -2312   400
-2312 → -1912   400
-1912 → -1512   400
-1512 → -1112   400
-1112 →  -712   400
------------------- the 713 BC reset -------------------
 -712 →  -318   394
 -318 →    76   394
   76 →   470   394
  470 →   864   394
  864 →  1258   394
 1258 →  1652   394
 1652 →  2046   394
```

Six baktuns of **400 years**, then seven of **394 years**. The pivot is astro −712, and the ledger
row for that exact year (`:546`) explains it:

> `[-712,'may','713 BC — flux-tube blast vaporizes 185,000 Assyrians; orbit 360→365.25 d; baktun reset']`

The arithmetic closes:

- A baktun is **144 000 days** (`:523`, `:698`, `:564`).
- Under a **360-day year**: 144 000 / 360 = **400 years exactly**.
- Under a **365.25-day year**: 144 000 / 365.25 = 394.25 → **394 years**.
- Total: 6 × 400 + 7 × 394 = **5 158 years** = 3113 BC → 2046 CE, which is exactly the Long-Count
  span the dossier states at `:1049` ("3113 BC → 2046 CE = 5158 (full count)").

So `MAY_NODES` **encodes the claimed 360→365.25-day orbital change of 713 BC as a change in baktun
length.** This is not stated anywhere in the source prose, in `docs/DOMAIN.md`, or in the rewrite's
comments — it is only recoverable by differencing the array. It is the reason the array is a literal
list and not a formula, and it is the single most important thing to know before anyone "tidies" it.

Long-Count year: `LC = astro + 3112` (dossier §IV, `:1045–1049`). "3113 BC → 2026 CE = 3112 + 2026 =
**5138**". 2046 = LC 5158 = 13.0.0.0.0.

Rewrite: `MAY_NODES` in `src/data/lattice.js:35` is **byte-identical**. `LC_OFFSET = 3112`
(`:8`). **Exact match** — but the two-rate structure is undocumented on both sides.

### 2.5 · Metonic moon — 19 years

| Property | Value | Citation |
|---|---|---|
| Period | **19 years = 235 lunations** | `:426`, `:467`, `:953`, `:1061` |
| Test | `mod(2026 − astro, 19) === 0` — **reference year hard-coded** | `:643` |
| Cycle count | `floor((2026 − astro)/19)` | `:726`, `:862–863` |
| Derived | 235 ÷ 19 = **12.368** moons/yr, tied to the pyramid's 440-cubit base | `:1008`, `:1038`, `:1061` |
| Mean synodic month | **29.530588853 d** | `:487` |
| New-moon epoch | **JD 2451550.1** = 2000-01-06 18:14 UT | `:488` |
| Lunation-number epoch | **JD 2423436.40347** (Brown lunation 1) | `:722`, `:859` |
| Illumination | `(1 − cos(2π·frac))/2` | `:715`, `:853` |
| Phase-name index | `floor(mod(frac + 1/16, 1) × 8)` — the 1/16 centres each name | `:717`, `:855` |

Self-check, using the engine's own numbers for its own "You Are Here" date of 30 May 2026:
age = 13.93 d, illumination **99 %**, phase name **"Full Moon"**, lunation **1278**. The dossier's
claim at `:955` — "the moon reads near-full for the night of 30 May 2026, as it truly was" — is
consistent with the model.

Rewrite: `METONIC = 19`, `SYNODIC = 29.530588853`, `NEWMOON_J2000 = 2451550.1`,
`LUNATION_EPOCH_JD = 2423436.40347` (`src/data/lattice.js:26–32`); `moonInfo()` reproduces the
illumination formula and the 1/16 rotation (`src/core/cycles.js:103–115`). **Exact match**, and the
rewrite additionally parameterises `referenceYear` instead of hard-coding 2026 — a strict
improvement.

### 2.6 · The two era counts (not cycles, but wheels)

| Wheel | Formula | Epoch label | Citation |
|---|---|---|---|
| **Annus Mundi** | `AM = astro + 3894` | "since 3895 BC" | `:365`, `:485`, `:602`, `:634`, `:1094` |
| **Cataclysm Era** | `cat = astro + 5238` | "since 5239 BC" | `:371`, `:634` |

Named AM landmarks: **AM 1656** the Flood (`:649`), **AM 6000** in 2106 CE (`:649`, `:578`),
**AM 5920** = 30 May 2026 (`:352`, `:478`), **AM 5776** = 1882 CE (`:986`).

### 2.7 · Cycles the CYPHR brief names that this source does **not** define

Checked by exhaustive grep across both assigned files for `Sothic`, `Saros`, `Inex`, `1461`,
`18.03`, `28.94`, `19.86`, `Jupiter`:

| Cycle | In `chronicon-clocks-calendrics.txt`? | In `Ophis_v9_DeepDive_Addendum.md`? |
|---|---|---|
| Sothic 1461 | **No** | No |
| Saros 18.03 yr / 6585.32 d | **No** | No |
| Inex 28.94 yr / 10571.95 d | **No** | No |
| Jupiter–Saturn 19.86 yr | **No** | No |

The only hit for `1461` in either file is `Ophis_v9_DeepDive_Addendum.md:559`, where `1461` appears
as an ordinary member of `MSRF_FILTER__NORMAL` — coincidence, not a Sothic reference.

**Conclusion:** the four constants at `src/core/equation/constants.js:20,21,31,33` have **no basis
in the Chronicon domain source.** They are standard positional astronomy (and their values are
correct as such — Saros 6585.3211 d, Inex 10571.95 d, Sothic 1461 Egyptian years, great conjunction
19.86 yr), introduced by the CYPHR brief. `docs/DEVIATIONS.md` §8 already presents them as an
additive extension, which is the right framing; nothing needs changing, but no one should cite the
Chronicon for them.

---

## 3 · Every dated event

### 3.1 · The engine's event array

`chronicon-clocks-calendrics.txt:508–580`. Declared thus:

```js
/* ---------- EVENT LEDGER (astro year, kind, palindrome auto) ---------- */
// kinds: key, phx, nem, ner, may, note
const E = [ … 69 rows … ];
```

**Row shape is a 3-tuple `[astroYear, kind, text]`. There is no month/day element anywhere in this
source.** The engine supplies month and day at three different call sites, and they disagree:

| Call site | Line | Seeds |
|---|---|---|
| Table row click | `:614` | `setFromAstro(a, **5, 1**, true)` |
| Event dropdown `change` | `:882` | `setFromAstro(a, **5, 1**, true)` |
| Jump buttons (2040 / 2046 / 2178) | `:885` | `setFromAstro(e==='bc'?(1-y):y, **5, 15**)` |
| "TODAY" button | `:883` | `setFromAstro(2026, **5, 30**)` |

So the chronicon source's own default event day is **1 May**, while the ledger in the rewrite
defaults to **15 May**. The 15 May default agrees with the jump buttons and with the 2040 row's own
text ("15/16 MAY", `:576`), so it is the better reading — but it is a choice, not a transcription.

**Kind counts:** `phx` 24 · `may` 13 · `nem` 11 · `note` 8 · `key` 7 · `ner` 6 = **69**.

### 3.2 · Prose-only dated events (in the dossier, absent from `E` and from the ledger)

| Date | AM | Description | Citation |
|---|---|---|---|
| **2905 BC** (astro −2904) | 990 | Great Pyramid — **first stone set**; the 90-year raising begins; 666 yr before the Flood | `:964`, `:1127` |
| **2839 BC** (astro −2838) | 1056 | *Rejected* draft date for the first stone; corrected to Noah's birth year | `:970` |
| 2815 BC (astro −2814) | 1080 | Capstone set — **is** in the ledger, as a `note` row | `:964`, `:1128`, `E :522` |
| 2239 BC (astro −2238) | 1656 | Pyramid submerged at the Flood — **is** in the ledger as `key` | `:964`, `:1129`, `E :527` |
| **1899 BC** (astro −1898) | 1996 | Pyramid **re-emerges** after 340 yr under water; the year of **Babel and the founding of Akkad** | `:964`, `:1130` |
| **1882 CE** | 5776 | Petrie completes the Giza survey; AM 5776 = 76² = the height in inches | `:985–987` |
| **1883 CE** | 5777 | Petrie publishes *The Pyramids and Temples of Gizeh* | `:979`, `:1094` |
| 1925 CE | — | Cole survey (bibliographic) | `:1094` |
| **15 May 2026** | 5920 | Broadcast *Anatomy of a Convergence: It Took Petrie & Breshears* | `:1070` |
| **30 May 2026** | 5920 | "You Are Here" — the engine's fixed present | `:337`, `:478`, `:489`, `:1094` |

Five of these are genuine dated Chronicon events that the ledger does not carry: **2905 BC
(AM 990)**, **1899 BC (AM 1996)**, **1882 CE (AM 5776)**, and the two 2026 dates. See §10 for the
recommendation.

Every AM conversion in the dossier checks out against `AM = astro + 3894`:
990→2905 BC ✓ · 1056→2839 BC ✓ · 1080→2815 BC ✓ · 1656→2239 BC ✓ · 1996→1899 BC ✓ · 5776→1882 CE ✓ ·
5920→2026 CE ✓ · 6000→2106 CE ✓. And the intervals close:
1656−990 = **666** ✓ · 1080−990 = **90** ✓ · 1656−1080 = **576** ✓ · 1996−1656 = **340** ✓ ·
1656−1056 = **600** ✓.

### 3.3 · The reconciliation — source `E` vs `src/data/ledger.js`

Performed programmatically: the `E` array was extracted from the `srcdoc` (HTML-unescaped), and
`LEDGER` was imported from the module.

```
chronicon rows: 69      ledger rows: 69
in source not in ledger: []
in ledger not in source: []
```

**Zero missing. Zero extra. Zero year disagreements. Zero kind disagreements.**

#### 3.3.1 · Text deltas — all eight

Six are pure typography; two are substantive.

| Astro yr | Source text | `ledger.js` text | Verdict |
|---|---|---|---|
| −2652 | `Sitchin’s major disaster…` | `Sitchin's major disaster…` | typography — U+2019 → `'` |
| −444 | `deJonge’s comet disaster…` | `deJonge's comet disaster…` | typography |
| 522 | `…are in the inner system together — "celestial war of monsters," Dark Ages begin` | `…are inner together — celestial war of monsters; Dark Ages begin` | condensed, quotes stripped |
| 864 | `…the Maya themselves disappear` | `…the Maya disappear` | condensed |
| 1902 | `…Charles Fort’s "other Dark Age"…` | `…Charles Fort's other Dark Age…` | typography, quotes stripped |
| 2046 | `…— "Time collapses," 16-hr days…` | `…— Time collapses, 16-hr days…` | quotes stripped |
| **−2838** | `Noah born` | `Noah born — **AM 1056, exactly 600 yr before the Flood**` | **substantive addition — supported** |
| **−1134** | `Cataclysm — Mediterranean Dark Age begins, Linear B collapses` | `Cataclysm — …Linear B collapses; **Atlantis sinks**` | **substantive addition — unsourced** |

- The **−2838** addition is *correct and traceable*: the dossier's "One correction, for the record"
  scribe note (`:970`) says exactly this — "that is **Noah's** year (AM 1056), which is exactly
  **600** years before the Flood." AM 1656 − 1056 = 600. ✓ The ledger has folded a dossier finding
  into an engine row. Good, and worth a comment saying so.
- The **−1134 "Atlantis sinks"** clause appears **nowhere in either assigned file.** It is not in
  `E`, not in the dossier prose, not in the addendum. Its provenance is `PSYFR1.html:671`, which is
  the rewrite's stated extraction source — so `ledger.js` is a faithful copy of PSYFR1 — but the
  claim itself has no support in the Chronicon material supplied. Flag it or cite it.

`src/data/ledger.js:2` says "Extracted verbatim from the reference PSYFR1 build". That is accurate:
`PSYFR1.html:642–712` is byte-for-byte the `LEDGER` array. **PSYFR1, not this chronicon file, is the
ledger's immediate parent**, and PSYFR1 already carries the six typographic normalisations, the two
substantive edits, and all the month/day tuples.

#### 3.3.2 · Month/day — where the three real dates came from

Only three of the 69 rows carry a seed date that is neither 5/15 nor 1/1:

| Astro yr | Seed | Text | In the chronicon source? |
|---|---|---|---|
| −3112 | **8/11** | Impact in North America — Long-Count 0.0.0.0.0 | **No.** 11 Aug 3114 BC is the standard GMT-correlation Long-Count epoch; that is external astronomy, not this file. |
| −712 | **3/5** | 713 BC — flux-tube blast, 185 000 Assyrians | **No.** |
| −30 | **9/2** | 31 BC — quake during the Battle of Actium | **No.** 2 Sep 31 BC is the historical date of Actium; external. |

The remaining 66 split into 5/15 (the `phx`/`nem`/`key` narrative rows) and 1/1 (the `may`/`ner`/
`note` bookkeeping rows). **None of this month/day information exists in the chronicon source.**

This bears directly on a claim in the shipped docs: `guide.html:73` calls them "69 **dated** events
from the thesis." They are **dated to the year**; 66 of the 69 carry a synthetic day-of-year. See
§10.

#### 3.3.3 · Full computed reconciliation table

Columns: astronomical year · seed date in `ledger.js` · kind · Annus Mundi · Long-Count ·
Cataclysm-era · Phoenix node (`mod 138 = 108`) · Nemesis offset (`mod(a−462,792)`, `IN` when < 60) ·
NER offset (`●` = node) · baktun boundary · Metonic-to-2026 · palindrome (year or AM).

| Year | astro | seed | kind | AM | LC | cat | Phx | Nem off | NER | Bak | 19 | ⮌ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5239 BC | −5238 | 5/15 | key | −1344 | −2126 | 0 | | 636 | ● | | | |
| 4639 BC | −4638 | 5/15 | ner | −744 | −1526 | 600 | | 444 | ● | | | |
| 4309 BC | −4308 | 5/15 | phx | −414 | −1196 | 930 | ● | 774 | 330 | | | ⮌ |
| 4039 BC | −4038 | 5/15 | key | −144 | −926 | 1200 | | 252 | ● | | | |
| 3895 BC | −3894 | 5/15 | phx | **0** | −782 | 1344 | ● | 396 | 144 | | | |
| 3439 BC | −3438 | 5/15 | nem | 456 | −326 | 1800 | | **60** | ● | | | |
| 3373 BC | −3372 | 1/1 | note | 522 | −260 | 1866 | | 126 | 66 | | | |
| 3113 BC | −3112 | **8/11** | may | 782 | **0** | 2126 | | 386 | 326 | ▲ | | ⮌ |
| 3103 BC | −3102 | 1/1 | note | 792 | 10 | 2136 | | 396 | 336 | | | |
| 2909 BC | −2908 | 1/1 | note | 986 | 204 | 2330 | | 590 | 530 | | | |
| 2839 BC | −2838 | 1/1 | key | **1056** | 274 | 2400 | | 660 | ● | | 19 | |
| 2815 BC | −2814 | 1/1 | note | **1080** | 298 | 2424 | | 684 | 24 | | | |
| 2713 BC | −2712 | 1/1 | may | 1182 | 400 | 2526 | | 786 | 126 | ▲ | | |
| 2653 BC | −2652 | 5/15 | phx | 1242 | 460 | 2586 | ● | **54 IN** | 186 | | | |
| 2647 BC | −2646 | 5/15 | nem | 1248 | 466 | 2592 | | **60** | 192 | | | |
| 2313 BC | −2312 | 1/1 | may | 1582 | 800 | 2926 | | 394 | 526 | ▲ | | |
| 2239 BC | −2238 | 5/15 | key | **1656** | 874 | 3000 | ● | 468 | ● | | | |
| 1963 BC | −1962 | 5/15 | phx | 1932 | 1150 | 3276 | ● | 744 | 276 | | | |
| 1915 BC | −1914 | 5/15 | nem | 1980 | 1198 | 3324 | | 0 IN | 324 | | | |
| 1913 BC | −1912 | 1/1 | may | 1982 | 1200 | 3326 | | 2 IN | 326 | ▲ | | |
| 1855 BC | −1854 | 5/15 | nem | 2040 | 1258 | 3384 | | **60** | 384 | | | |
| 1849 BC | −1848 | 5/15 | note | 2046 | 1264 | 3390 | | 66 | 390 | | | |
| 1687 BC | −1686 | 5/15 | phx | 2208 | 1426 | 3552 | ● | 228 | 552 | | | |
| 1639 BC | −1638 | 1/1 | note | 2256 | 1474 | 3600 | | 276 | ● | | | |
| 1549 BC | −1548 | 5/15 | phx | 2346 | 1564 | 3690 | ● | 366 | 90 | | | |
| 1513 BC | −1512 | 1/1 | may | 2382 | 1600 | 3726 | | 402 | 126 | ▲ | | |
| 1411 BC | −1410 | 5/15 | phx | 2484 | 1702 | 3828 | ● | 504 | 228 | | | |
| 1273 BC | −1272 | 5/15 | phx | 2622 | 1840 | 3966 | ● | 642 | 366 | | | |
| 1135 BC | −1134 | 5/15 | phx | 2760 | 1978 | 4104 | ● | 780 | 504 | | | |
| 1123 BC | −1122 | 5/15 | nem | 2772 | 1990 | 4116 | | 0 IN | 516 | | | ⮌ |
| 1113 BC | −1112 | 1/1 | may | 2782 | 2000 | 4126 | | 10 IN | 526 | ▲ | | |
| 1039 BC | −1038 | 1/1 | note | 2856 | 2074 | 4200 | | 84 | ● | | | |
| 997 BC | −996 | 5/15 | phx | 2898 | 2116 | 4242 | ● | 126 | 42 | | | |
| 859 BC | −858 | 5/15 | phx | 3036 | 2254 | 4380 | ● | 264 | 180 | | | |
| 721 BC | −720 | 5/15 | phx | 3174 | 2392 | 4518 | ● | 402 | 318 | | | |
| 713 BC | −712 | **3/5** | may | 3182 | 2400 | 4526 | | 410 | 326 | ▲ | | |
| 583 BC | −582 | 5/15 | phx | 3312 | 2530 | 4656 | ● | 540 | 456 | | | |
| 445 BC | −444 | 5/15 | phx | 3450 | 2668 | 4794 | ● | 678 | 594 | | 19 | |
| 439 BC | −438 | 1/1 | ner | 3456 | 2674 | 4800 | | 684 | ● | | | |
| 331 BC | −330 | 5/15 | nem | 3564 | 2782 | 4908 | | 0 IN | 108 | | 19 | |
| 319 BC | −318 | 1/1 | may | 3576 | 2794 | 4920 | | 12 IN | 120 | ▲ | | |
| 307 BC | −306 | 5/15 | phx | 3588 | 2806 | 4932 | ● | **24 IN** | 132 | | | |
| 271 BC | −270 | 5/15 | nem | 3624 | 2842 | 4968 | | **60** | 168 | | | |
| 31 BC | −30 | **9/2** | phx | 3864 | 3082 | 5208 | ● | 300 | 408 | | | |
| 76 CE | 76 | 1/1 | may | 3970 | 3188 | 5314 | | 406 | 514 | ▲ | | |
| 162 CE | 162 | 1/1 | ner | 4056 | 3274 | 5400 | | 492 | ● | | | |
| 246 CE | 246 | 5/15 | phx | 4140 | 3358 | 5484 | ● | 576 | 84 | | | |
| 384 CE | 384 | 5/15 | phx | 4278 | 3496 | 5622 | ● | 714 | 222 | | | |
| 462 CE | 462 | 5/15 | nem | 4356 | 3574 | 5700 | | 0 IN | 300 | | | |
| 470 CE | 470 | 1/1 | may | 4364 | 3582 | 5708 | | 8 IN | 308 | ▲ | | |
| 522 CE | 522 | 5/15 | phx | 4416 | 3634 | 5760 | ● | **60** | 360 | | | |
| 762 CE | 762 | 1/1 | ner | 4656 | 3874 | **6000** | | 300 | ● | | | |
| 798 CE | 798 | 5/15 | phx | 4692 | 3910 | 6036 | ● | 336 | 36 | | | |
| 864 CE | 864 | 1/1 | may | 4758 | 3976 | 6102 | | 402 | 102 | ▲ | | |
| 1212 CE | 1212 | 5/15 | phx | 5106 | 4324 | 6450 | ● | 750 | 450 | | | |
| 1254 CE | 1254 | 5/15 | nem | 5148 | 4366 | 6492 | | 0 IN | 492 | | | |
| 1258 CE | 1258 | 1/1 | may | 5152 | 4370 | 6496 | | 4 IN | 496 | ▲ | | |
| 1314 CE | 1314 | 5/15 | nem | 5208 | 4426 | 6552 | | **60** | 552 | | | |
| 1362 CE | 1362 | 1/1 | ner | 5256 | 4474 | 6600 | | 108 | ● | | | |
| 1488 CE | 1488 | 1/1 | note | 5382 | 4600 | 6726 | **●** | 234 | 126 | | | |
| 1626 CE | 1626 | 5/15 | phx | 5520 | 4738 | 6864 | ● | 372 | 264 | | | |
| 1652 CE | 1652 | 1/1 | may | 5546 | 4764 | 6890 | | 398 | 290 | ▲ | | |
| 1764 CE | 1764 | 5/15 | phx | 5658 | 4876 | 7002 | ● | 510 | 402 | | | |
| 1902 CE | 1902 | 5/15 | phx | 5796 | 5014 | 7140 | ● | 648 | 540 | | | |
| 1962 CE | 1962 | 1/1 | ner | 5856 | 5074 | 7200 | | 708 | ● | | | |
| 2040 CE | 2040 | 5/15 | key | 5934 | 5152 | 7278 | ● | 786 | 78 | | | |
| 2046 CE | 2046 | 5/15 | key | 5940 | **5158** | 7284 | | 0 IN | 84 | ▲ | | |
| 2106 CE | 2106 | 5/15 | nem | **6000** | 5218 | 7344 | | **60** | 144 | | | |
| 2178 CE | 2178 | 5/15 | key | 6072 | 5290 | 7416 | ● | 132 | 216 | | 19 | |

Structural facts this table exposes that neither the source nor `docs/DOMAIN.md` states:

1. **An unbroken 13-node NER-600 chain runs through the ledger.** Every year of the form
   −5238 + 600k from −5238 to 1962 is present: −5238, −4638, −4038, −3438, −2838, **−2238**, −1638,
   −1038, −438, 162, 762, 1362, 1962. Only **six** of the thirteen are tagged `ner`; the rest are
   tagged `key` (4), `nem` (1) or `note` (2). The `kind` field is a narrative label, **not** a cycle
   membership test — anything that reads `kind` as a cycle flag is reading it wrong.
2. **The Great Flood (−2238) is triple-locked:** a Phoenix node (`mod 138 = 108`), an NER node
   (`off = 0`), and AM 1656. It is the only ledger row that is both.
3. **Four non-`phx` rows are Phoenix nodes:** −2238 (`key`), **1488 (`note`, Mother Shipton)**,
   2040 (`key`), 2178 (`key`).
4. **Six `nem` rows sit at `off = 60`** — i.e. *outside* by the engine's own strict test. See §7.1.
5. **The `may` node 2046 is tagged `key`, not `may`** — so `MAY_NODES` has 14 members but the ledger
   has only 13 `may` rows. Both `traits.js:69` and the source's `mayOn` test use `MAY_NODES`
   directly, so nothing breaks; but a `kind === 'may'` filter silently loses 2046.
6. **The earliest AM value is −1344** (astro −5238). Four ledger rows carry a **negative Annus
   Mundi** (−5238, −4638, −4308, −4038) and a fifth is **AM 0** (−3894). Anything that formats AM as
   an unsigned count will render five of the 69 rows wrong.

---

## 4 · Every numeric constant of significance, and its origin

### 4.1 · Engine constants (executable)

| Constant | Value | Line | Origin |
|---|---|---|---|
| `SYN` | 29.530588853 | `:487` | Mean synodic month, standard |
| `NEWMOON_J2000` | 2451550.1 | `:488` | Reference new moon 2000-01-06 18:14 UT, standard |
| Brown lunation epoch | 2423436.40347 | `:722` | Standard (lunation 1 = Jan 1923) |
| `TODAY` | {2026, 5, 30} | `:489` | Hard-coded present |
| AM offset | **3894** | `:485`, `:602`, `:634` | Archaix thesis |
| Cataclysm offset | **5238** | `:634` | Archaix thesis |
| LC offset | **3112** | `:1045`, `:1049` | Mesoamerican Long-Count epoch |
| Phoenix step / phase / base | 138 / 108 / −4308 | `:504` | Archaix thesis |
| Nemesis step / phase / inner | 792 / 462 / 60 | `:505`, `:666` | Archaix thesis |
| NER step / phase / base | 600 / 162 / −5238 | `:506` | Archaix thesis |
| `MAY_NODES` | 14 boundaries | `:506` | 6 × 400 + 7 × 394 (§2.4) |
| Metonic | 19 | `:643` | Standard |
| Slider bounds | −2842 … 2178 | `:344` | UI only — **excludes the 15 earliest ledger rows** |

### 4.2 · Thesis numbers asserted in prose

| Number | Meaning | Line | Verified? |
|---|---|---|---|
| **6348** | 138 × 46, 4309 BC → 2040 CE | `:463`, `:1060` | ✓ 2040 − (−4308) = 6348 |
| **414** | 138 × 3, "cursed time" | `:463` | ✓ |
| **552** | 138 × 4, "Phoenix cycles" | `:463` | ✓ |
| **5544** | 792 × 7, the 7-cycle Nemesis frame | `:653` | ✓ |
| **732** | 792 − 60, the outer arc | `:677`, `:950` | ✓ |
| **12.368** | 235 ÷ 19 moons per year | `:1008`, `:1061` | ✓ 12.36842 |
| **144 000 d** | one baktun | `:523`, `:698` | ✓, but see §2.4 / §7.3 |
| **432 000** | "sky-turnings", the SHAR reckoning | `:1012`, `:1080` | claim only — does **not** equal any ledger interval (432 000 d = 1 182.8 Julian yr; AM epoch → Flood is 604 976 d) |
| **864 000 d** | "Foundation of Time" | `:1027` | 864 000 / 144 000 = **6 baktuns** exactly; 864 000 / 360 = 2 400 Draconian years |
| **43 200** | pyramid square-circuit scale to the Earth meridian | `:1011` | 4 × 230.35 m × 43 200 = **39 804 km** vs the true meridian ~40 008 km — 0.5 % low |
| **666** | AM 990 → AM 1656 | `:963`, `:1058` | ✓ |
| **90 / 576 / 340 / 600** | pyramid raising / standing / submerged / Noah-to-Flood | `:963–964`, `:970` | ✓ all four |
| **1080** | AM capstone year = Moon's radius in miles = 3 × 360 | `:1016–1017`, `:1059` | ✓ |
| **203** | masonry courses ≈ chart's "203 levels of blocks" | `:1001–1002` | tagged `≈ (201–210)` by the source itself |
| **2 160** | one great age of a Platonic year | `:1094` context | 6 × 360 |
| **105°** | not present here — this is the MSRF hydrogen filter (see `docs/DOMAIN.md` §3c) | — | — |

### 4.3 · Petrie survey figures (§III of the dossier, `:979`, `:1094`)

| Figure | Value | Check |
|---|---|---|
| Mean base side | 9 068.8 in = 230.3475 m | ✓ 9068.8 × 0.0254 = 230.3475 |
| Original vertical height | 146.71 m = **5 776 in** | ✓ 146.71 / 0.0254 = 5776.0 |
| Royal cubit | 20.62 in | 9068.8 / 20.62 = **439.81** cubits — the source's "440" is the rounded whole-number skeleton, `:979` |
| Height in cubits | 280 | 5776 / 20.62 = 280.1 ✓ |
| Slope | ≈ 51°51′, seked 5½ | `:1031` |
| 280 : 440 | = 7 : 11 | ✓ both 0.63636 |
| Perimeter ÷ 2·height | ≈ π | **3.14017** |

That last line is a bridge worth recording between this spec and the engine specs: on Petrie's own
numbers the Great Pyramid's π-ratio is **3.14017**, and the Ophis engine's `OPH_PI` is **3.14**
(`reference/asar/unpacked/src/ophis_config.js:378, 410`). The source does not make this connection;
it only claims the pyramid encodes "a universal constant" (`:1028`).

**The "5776" synchronicity** (`:981–988`), stated in full because it is the dossier's centrepiece:
Petrie's original height is 5 776 in; he completed the survey in **1882**; 1882 + 3894 = **AM 5776**;
and 5776 = **76²**. The source itself labels this `synchronic` — "A coincidence of unit and offset,
not a claim of design" (`:988`).

---

## 5 · Calendar conversions, and whether the rewrite's offsets match

| Conversion | Source formula | Source citation | `src/data/lattice.js` | Verdict |
|---|---|---|---|---|
| **Annus Mundi** | `AM = astro + 3894`, equivalently `AM = 3895 − (BC year)` | `:485`, `:602`, `:634`, `:1094` | `AM_OFFSET = 3894` (`:6`) | **MATCH** |
| **Long-Count** | `LC = astro + 3112` (3113 BC epoch) | `:1045`, `:1049` | `LC_OFFSET = 3112` (`:8`) | **MATCH** |
| **Cataclysm era** | `cat = astro + 5238` (5239 BC) | `:371`, `:634` | `CAT_OFFSET = 5238` (`:10`) | **MATCH** |
| **šar** | not converted here; the dossier asserts the *redefinition* — SHAR "originally meant a single **day** — a turning of the stars", hence "**432,000 sky-turnings**, not years" | `:1080` | `anunnaTurnings(J) = J − jdn(-3894,1,1)` (`src/core/cycles.js:118`) | **Consistent with the thesis**, but the source gives **no** conversion formula and **no** epoch for the turning count. The rewrite's choice of the AM epoch as the zero is an inference, not a transcription. |

All three numeric offsets are confirmed by three independent anchors each:

- AM: 2026 → 5920 (`:352`, `:478`), 2022 → 5916 (`:485`), 2239 BC → 1656 (`:485`), 1882 → 5776
  (`:987`), 2106 → 6000 (`:649`).
- LC: 2026 → 5138 (`:1045`, `:1048`), 2046 → 5158 (`:1049`).
- Cataclysm: 2026 → 7264 (`:353`, `:372`, `:478`), 762 → 6000 (`:562`).

### 5.1 · The šar / turnings gap

The dossier's šar claim is qualitative. It gives **432 000 sky-turnings** as an antediluvian total
(`:1012`, `:1080`) but never says from when. Two candidate readings, neither confirmed:

- 432 000 turnings = 432 000 days = **1 182.8 Julian years**, which from the Flood back lands at
  ~3422 BC — no ledger row.
- 432 000 / 360 = **1 200 Draconian years**, and 864 000 / 360 = 2 400 — clean in the 360-day frame.

`src/ui/panels/wheels.js:167–173` picks 432 000 = "antediluvian total" and 864 000 = "Foundation of
Time", which matches the source's labels (`:1012`, `:1027`) — but the **epoch** (`jdn(-3894,1,1)`)
is the rewrite's own choice. 30 May 2026 reads **2 162 385 turnings** on that basis. If the intended
epoch is the Cataclysm (−5238) rather than AM 0 (−3894), every turning count is 490 044 days off.
This is an open question, flagged in §10.

---

## 6 · Terminology the `docs/DOMAIN.md` glossary is missing

`docs/DOMAIN.md` §4 is an excellent glossary of the **Ophis/PREPS** vocabulary. It carries only six
Chronicon terms (Annus Mundi, Long-Count, Phoenix 138, Nemesis 792, NER 600, Metonic 19, šar). The
calendrics half of the system is essentially unglossed. Terms this source uses that the glossary
does not define:

**Eras and epochs**
- **Cataclysm Era** — years since astro −5238; the second engine wheel (`:371`). `CAT_OFFSET`.
- **Nemesis Cataclysm** — the origin event: "Nemesis implodes; Earth, Luna, Phoenix, Nemesis X &
  Electra hurled toward Sol" (`:511`). Cataclysm-era year 0.
- **AM 6000 horizon** — 2106 CE, the AM millennium the engine counts down to (`:649`, `:578`).
- **Composite Chronology** — the source's own name for the frame: "Archaix · Composite Chronology ·
  5239 BCE → 2178 CE" (`:305`).

**The floods and resets** (four distinct named floods; the glossary names none)
- **Capture Flood** — astro −4038, the arrival of Luna from the dead Nemesis system (`:514`).
- **Gihon Flood** — astro −3438, "a third of mankind dies" (`:516`).
- **The Great Flood** — astro −2238 = AM 1656, "Vapor Canopy collapse, Birth of the Sun" (`:527`).
- **Ogygian Flood** — astro −1686, "25-yr darkness & famine" (`:533`).
- **Vapor Canopy** — the pre-Flood atmospheric state whose collapse *is* the Flood (`:527`, `:1128`).
- **Lithospheric displacement / poleshift** — the recurring Phoenix mechanism (`:515`, `:576`).

**Cycle vocabulary**
- **Sky Dragon** — the Phoenix under its other name (`:377`, `:554`, `:570`).
- **baktun** — 144 000 days; thirteen of them make the Long-Count (`:398`, `:523`).
- **13.0.0.0.0** — the close of the Long-Count, 2046 CE (`:577`, `:698`, `:952`).
- **Foundation of Time** — 864 000 turnings = 6 baktuns; the 864 CE reset (`:564`, `:1027`).
- **decan** — a 60-year tenth of an NER: "each 600-yr NER = ten 60-yr decans" (`:687`).
- **inner transit / inner system** — the 60-year Nemesis arc inside Sol's orbit (`:672`).
- **Shock Period** — the 408-year aftermath of the −2646 Anunna Exodus (`:525`).
- **Draconian year** — *not in this source.* `src/ui/panels/wheels.js:36` introduces it; see §10.

**Actors and places**
- **Adamu** — the 930-year civilization destroyed at astro −4308 (`:513`).
- **Anunna / ENKI** — arriving with the Gihon Flood (`:516`).
- **Achuzan** — where Enoch vanished and the Great Pyramid was built (`:522`).
- **Kairite rift** — 762 CE (`:562`).
- **Nemesis X Object** — the intruder world itself, as distinct from the Nemesis system (`:384`).
- **Electra** — the fifth body hurled toward Sol at the Cataclysm (`:511`).
- **Trimorphic Protennoia** — the Nag Hammadi text in which the Phoenix is named (`:513`).

**Corpus and framing**
- **Archaix** — Breshears' site, unfolded as "*Advanced Research of Chronological History of
  Artificial Intelligence X*" (`:1079`).
- **Doomsday Chronology** and the **337 Archaix Charts** — the two companion corpora (`:478`,
  `:1094`). `docs/DOMAIN.md` §6 already cites both by name but does not gloss them.
- **Baby Phoenixes** — newcomers to the Archaix work (`:1079`).
- **chronotecture** — architecture raised to encode time; "the chronotecture of **Civilization X**"
  (`:1070–1071`).
- **Simulation Collapse** — astro 2178, "exodus into the Real universe", 138 yr after 2040 (`:579`).
- **mirror-year / palindrome** — a year (or AM year) that reads the same reversed; a first-class
  engine flag (`:358`, `:471–473`, `:499`).

**Row-kind codes** — `key`, `phx`, `nem`, `ner`, `may`, `note` (`:509`). These appear in
`src/data/ledger.js:3` and drive the ledger UI, and are glossed nowhere. Given §3.3.3 finding 1,
the glossary should say plainly that **`kind` is a narrative label, not a cycle-membership test**.

---

## 7 · Where the source is buggy, dead, or contradicts itself

### 7.1 · The Nemesis inner-arc off-by-one — six ledger rows

The test is `off < 60` (`:666`, `:606`), so the inner arc is `off ∈ [0,59]`. Six `nem` rows sit at
exactly `off = 60`:

| Astro yr | Text | Semantically |
|---|---|---|
| −3438 | "Gihon Flood … Nemesis X **Passover**" | passage — arguably an exit |
| −2646 | "Nemesis X Object **departs** Sol" | exit ✓ |
| −1854 | "**60th year of Nemesis inner transit** — Sumer vanishes" | **contradiction — described as inner, tests as outside** |
| −270 | "totally eclipses Venus **on its way out**" | exit ✓ |
| 1314 | "**60th yr of transit** — plague fogs" | **contradiction** |
| 2106 | "Nemesis X **exits** the system" | exit ✓ |

The two "60th year" rows are the real defect. The 60-year transit occupies offsets 0…59, so the
60th year *is* offset 59, and offset 60 is year 61. Either the phase should be `mod(a−462,792)` with
`off <= 60` (a 61-year arc), or the two rows should be at −1855 and 1313. **The rewrite reproduces
the `< 60` test exactly** (`src/core/cycles.js:54`), so it inherits the contradiction — correctly,
for parity, but it should be documented.

### 7.2 · The 522 CE "ONLY year" claim is false on the engine's own lattice

Row `:561`:

> `[522,'phx','ONLY year Phoenix & Nemesis X are in the inner system together — "celestial war of monsters," Dark Ages begin']`

`mod(522 − 462, 792) = 60`, which is **not** `< 60`. **522 CE fails the engine's own inner test**, so
the engine renders that very row with `nemOn = '·'` (no diamond) at `:606`.

Exhaustively enumerating every year in [−5238, 2178] that satisfies *both* `mod(a,138) = 108` and
`mod(a−462,792) < 60` gives **three** years, and 522 is not among them:

| Year | In the ledger? |
|---|---|
| **3481 BC** (astro −3480) | no |
| **2653 BC** (astro −2652) | **yes — a `phx` row**, "Sitchin's major disaster" |
| **307 BC** (astro −306) | **yes — a `phx` row**, "Oera Lindh text records disasters" |

So the ledger contains two counterexamples to its own "ONLY year" claim. This is a documentation
defect in the source data, carried verbatim into `src/data/ledger.js:57`. It is *data*, not code, so
nothing miscomputes — but the string is wrong and should be footnoted.

### 7.3 · "144,000 days" versus a 400-year baktun

`:523` and `:698` both label a baktun "144,000 d", and `:698` prints the span in years and the
144 000-day figure side by side: `` `${fmtYear(bStart)} → ${fmtYear(bEnd)} (${span} yr / 144,000 d)` ``.
For the first six baktuns `span = 400`, and 400 proleptic-Gregorian years is **146 097 days**, not
144 000 — an error of 2 097 days (5.74 yr) per baktun. The label is only true in the thesis's
360-day frame. §2.4 explains why the array is right and the label is loose; the fix is a comment,
not a number.

### 7.4 · Live JavaScript bugs in the engine

| Bug | Line | Effect |
|---|---|---|
| **The iframe auto-fit script is inside the iframe.** `var f=document.getElementById('engineFrame'); … f.addEventListener('load',…)` runs in the child document, where `engineFrame` does not exist. | `:899` | `f` is `null` → immediate `TypeError` → the script block dies. The iframe never auto-sizes and stays pinned at `min-height:1400px` (`:119`, `:134`). |
| **The fullscreen helper is also inside the iframe**, and the iframe has no `allow="fullscreen"`. | `:902–925` | `fsBtn`/`fsHint` are `null` (guarded, harmless), but the "click anywhere to go fullscreen" handler fires a `requestFullscreen()` on the child document that the browser rejects. |
| **`BAKTUN 14/13`.** For `astro >= 2046` the loop sets `bi = 13`, then `bEnd = MAY_NODES[14] \|\| 2046` = 2046, so `span = 0`. | `:692–699` | Displays "BAKTUN **14**/13", "`−132` yr to next baktun" at 2178, and a bar width of `Infinity%` (or `NaN%` at exactly 2046). Also, because the label test is `bi+1===13`, the "13.0.0.0.0 — Time collapses" text **never fires in the closing baktun's own year**. **The rewrite already fixed this** with an explicit `COUNT CLOSED` branch (`src/ui/panels/wheels.js:129–138`). |
| **The slider cannot reach 15 of the 69 events.** `min="-2842"` (2843 BC) while the earliest row is astro −5238 (5239 BC). | `:344` vs `:511` | The header advertises "5239 BCE → 2178 CE" (`:305`). Reachable only via the year field, the dropdown or a table click. |
| **The dropdown hides all 8 `note` rows** (`if(e[1]==='note')return;`). | `:590` | Olmec calendar, Kali Yuga, Enoch, the Great Pyramid, Sodom, Jacob, David and Mother Shipton cannot be selected from "Leap to a documented event". |
| **`nextPal` is "next at-or-above", labelled "nearest".** | `:709` vs `:706` | AM 5920's answer is 5995 — the next above; 5885 is nearer below. The rewrite renames it `nextPalindrome` (`src/ui/panels/wheels.js:208`) and only ever calls it "next mirror" (`:112`) — correct. |
| **Redundant filter guard.** `if(filter!=='all' && kind!==filter && !(filter==='all')) { if(kind!==filter) return; }` — the third conjunct restates the first and the inner test is already implied. | `:600` | Functionally correct, structurally dead. |

### 7.5 · Dead code

Four successive moon renderers were written and only the last is live:

| Function | Line | Status |
|---|---|---|
| `renderMoon` (original) + `drawPhase` | `:711–765` | **Overridden wholesale** at `:849`. `drawPhase` contains an abandoned half-edit — a `cx` assigned three times in one statement with a `/*placeholder*/` comment (`:756`), and two `if` bodies with no effect (`:759–764`). |
| `shadeMoon` | `:768–784` | **Never called anywhere.** |
| `moonShade` | `:788–807` | **Never called anywhere**; its own comment claims it "overrides messy attempts above", which it does not. |
| `window.__drawMoon` | `:820–843` | The live renderer. |

Also dead: `liveTick()` (`:889–893`) is defined, contains a computed-but-unused `yrs`, and is never
invoked. And `astroFrom` (`:490`) is defined but never called — `render()` inlines the same
conversion at `:627`.

### 7.6 · The heading says 300, the array has 69

`:441`: `<h2>The 300-Event Ledger</h2>`. `E` has **69** rows. Off by a factor of 4.3. This is the
clearest single indication that the shipped `E` is a **subset** of a larger working ledger. Any
future expansion of `src/data/ledger.js` toward 300 rows has explicit precedent in the source.

### 7.7 · "YEAR ONE" is AM 0

Row `:515` calls astro −3894 "**YEAR ONE** of the Ancient calendar", and the wheel is titled "Annus
Mundi · since 3895 BC" (`:365`). But `AM = astro + 3894` makes astro −3894 come out as **AM 0**, not
AM 1. The offset is internally consistent everywhere else (Flood 1656, 2026→5920, Petrie 5776), so
AM is best read as *years elapsed since* the epoch, with "3895 BC" as the epoch's label rather than
its first numbered year. Worth one sentence in the glossary so nobody "fixes" the offset to 3895 and
breaks all five anchors at once.

---

## 8 · The v9 DeepDive Addendum — engine content vs specs 01–15

The addendum is three parts: a compute trace, a 16-operation reference, and an MSRF filter analysis.
**Every load-bearing engine fact in it is already covered by specs 01–15.** Verified by grepping
`docs/reverse/` for each distinctive token:

| Addendum claim | Already in |
|---|---|
| `OPH_PI 3.14 / OPH_PHI 1.618 / OPH_CRV 5.08 / OPH_HEP 7.01` | 01, 02, 03, 05, 06, 09, 14 |
| `MAXIMUM_ROTATION_COUNT_Y/Z = 36500` | 00, 01, 02, 03, 05, 06, 14 |
| `HIGHEST_MSRF_NUMBER = 2559` | 00–06, 09, 13, 14 |
| The misordered **`1574`** in `MSRF_FILTER__NORMAL` | 00, 01, 02, 03, 05, 10, 14 |
| `MSRF_FILTER__FINAL` = concat+sort, used only by `selfCheckMsrfOnStartup` | 01, 02, 03, 05, 06, 07, 14 |
| `FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT` | 00, 01, 02, 04, 05, 06, 10, 12, 14 |
| `ALREADY_CALCULATED_SUNSET_TOLERANCE_IN_MILLIS` | 00, 01, 02, 05, 14 |
| `MINIMUM_DAYS_BETWEEN_FIRST_TWO_X_DATES` | 00, 01, 02, 05, 06, 14 |
| `cloneDefaultOperationsForAppVersionGte8` and the two β→α promotions | 02, 03, 04, 05, 06, 09, 14 |
| `sumUpMsrfMatchSubscore`, `getMsrfScoreMultiplier`, `base_score_pre_multiply` | 02, 03, 08 |
| `hash`, `hash_without_ordinal`, `z_date_dict_key` | 01, 02, 03, 08, 10 |
| VORTEX → `.5` reject → IMPORTANT → NORMAL precedence, tolerance 0.1 | 03 |
| `MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES = 2` | 00, 01, 02, 03, 13, 14 |

**Nothing new about the engine.** What the addendum adds is *version-delta* evidence, which is
independently useful:

1. **v9's operation array ends at the Hepta op.** `reference/asar9/unpacked/src/ophis_model__params.js`
   lines 67–109 hold 14 `newOperation(...)` calls + `newOperation("X1+YxOPH_HEP", ALPHA,
   OPERATION_ENABLED_FALSE)` = 15 declarations. **v12 adds a sixteenth**,
   `OPH_HEP_OPERATION_FOR_X2 = newOperation("X2+YxOPH_HEP", ALPHA, TRUE)` — "Late-December 2025" —
   pushed by `cloneDefaultOperationsForAppVersionGte10()`
   (`reference/asar/unpacked/src/ophis_model__params.js:113–143`). The addendum, written against v9,
   cannot see it. Specs 01, 02, 03, 04, 06, 09, 14 all already cover it.
2. **`MSRF_FILTER__NORMAL`, `__IMPORTANT` and `__VORTEX` are byte-identical between v9 and v12**,
   including the misordered `1574` between `1641` and `1680`. The list did not move across three
   major versions.
3. `OPH_HEP = 7.01` in **both** v9 (`reference/asar9/unpacked/src/ophis_config.js:367`) and v12
   (`reference/asar/unpacked/src/ophis_config.js:413`). This matters — see §10.

**Where the addendum is wrong, for the record** (it is a v9-era analysis and self-corrects in
places):

- Its §Part I framing of "16 operations" is an artefact of the prompt it was written to, not the
  source. It admits this at `Ophis_v9_DeepDive_Addendum.md:13` and again at `:472–474`. v9 declares
  **15**; v12 declares **16**. The *documented* count is **14** (`docs/DOMAIN.md` §2) because the
  Hepta ops are later additions.
- `:538` states "The acronym MSRF is never defined in the source files provided" and declines to
  expand it. That is superseded: **MSRF = Multidimensional Spatial Recognition Filter**, established
  from Breshears' own `d. PREPS.txt` (`docs/DOMAIN.md` §3).
- `:591` waffles on the NORMAL count ("276 literal integers + `HIGHEST_MSRF_NUMBER` = 277"). Spec 03
  settles it.
- `:674` and `:693` chase a "base unit ≈10.9" for the VORTEX array and never close it. Nothing in
  either assigned file resolves it either; it stays open.

The addendum contains **nothing calendrical**. There is no mention of Phoenix, Nemesis, NER, Annus
Mundi, baktun, Metonic, or the Chronicon in any of its 837 lines. The MSRF numbers `138`, `792`,
`600`, `414`, `552` and `2046` do appear inside `MSRF_FILTER__NORMAL` — a coincidence the addendum
never notices, and which is worth one line somewhere: **the Archaix cycle lengths 138, 414, 552, 600
and 792 are all literal members of the shipped MSRF NORMAL filter**
(`reference/asar/unpacked/src/ophis_model__params.js:21, 22, 24, 25`). That is a real bridge between
the calendrics and the scoring, and neither source states it.

---

## 9 · What the rewrite already got right

Recorded so the corrections in §10 are read in proportion:

- `AM_OFFSET`, `LC_OFFSET`, `CAT_OFFSET`, `PHOENIX_PERIOD/PHASE`, `NEMESIS_PERIOD/INNER/PHASE`,
  `NER_PERIOD/PHASE`, `METONIC`, `SYNODIC`, `NEWMOON_J2000`, `LUNATION_EPOCH_JD` and `MAY_NODES` are
  **all exact** against `chronicon-clocks-calendrics.txt:487–506`.
- `phoenixInfo`, `nemesisInfo`, `nerInfo`, `mayaInfo`, `isMetonic`, `moonInfo` in
  `src/core/cycles.js` reproduce `:656–727` line for line, including the 1/16 phase-name rotation
  and the floored `mod`.
- The 69 ledger rows match year-for-year and kind-for-kind.
- Four source defects are **already fixed**: the `BAKTUN 14/13` overflow (`wheels.js:129`), the
  hard-coded 2026 reference year (`DEVIATIONS.md` §4), the asymmetric Metonic floor
  (`wheels.js:180`, with the reason in the comment), and the discontinuous Nemesis bar
  (`wheels.js:86–87`, likewise).
- `docs/DOMAIN.md` §6 correctly frames the whole thesis as thesis, and states that deep-past
  conversions are *cycle-true rather than historically observed* — which is exactly the footer's own
  disclaimer at `:478`.

---

## 10 · Corrections and additions this source forces

Collected here; the structured summary carries the same list.

1. **`src/core/equation/constants.js:17` — `OPH_HEP: 7.83` is wrong, and its comment is false.**
   The shipped constant is `7.01` in **both** engines: `reference/asar/unpacked/src/ophis_config.js:413`
   (`var OPH_HEP = 7.01;`) and `reference/asar9/unpacked/src/ophis_config.js:367`. The comment
   "(from the v12 desktop engine)" attributes 7.83 to a source that says 7.01. `PSYFR1.html:589`
   defines only `OPH_PHI, OPH_PI, OPH_CRV` — no `OPH_HEP` at all — so 7.83 came from nowhere.
   Parity is unaffected because no pack in `src/data/packs.js` uses `OPH_HEP`, but any user-written
   `X1+YxOPH_HEP` is **11.7 % long**. Fix the value and the comment.
2. **`guide.html:73` — "69 **dated** events" overstates the data.** They are dated to the *year*.
   Only three of the 69 carry a real month/day (−3112 → 8/11, −712 → 3/5, −30 → 9/2), and none of
   those three appears in the Chronicon source; the other 66 use a synthetic 5/15 or 1/1 seed.
   `src/data/ledger.js:3` documents the 5/15 default honestly — the guide should match it.
3. **`src/data/ledger.js:57` (astro 522) carries a claim the lattice refutes.** "ONLY year Phoenix &
   Nemesis X are inner together" — 522 is not inner (`off = 60`), and the two years in the same file
   that *are* both (−2652, −306) are counterexamples. §7.2. Footnote it.
4. **`src/data/ledger.js:35` (astro −1134) contains "Atlantis sinks", which is unsourced.** It is in
   `PSYFR1.html:671` but appears nowhere in `chronicon-clocks-calendrics.txt` or the addendum.
5. **`src/data/lattice.js:35` `MAY_NODES` is a two-rate grid and nothing says so.** Six 400-year
   baktuns (360-day year), then seven 394-year baktuns (365.25-day year), pivoting at the 713 BC
   reset the ledger itself records. §2.4. Add the comment before someone regularises the array.
6. **`src/ui/panels/wheels.js:36` conflates two NER definitions.** The comment reads "A Draconian
   year is 360 turnings, so a NER is 600 of those", making `NER_DAYS = 216 000` days = **591.4 Julian
   years**, while `src/data/lattice.js:22` sets `NER_PERIOD = 600` **years**. The source says NER =
   600 years (`:391`, `:687`, `:951`) and never mentions a "Draconian year" at all. Either rename
   the derived quantity or say explicitly that it is a second, turnings-frame reckoning.
7. **`src/core/cycles.js:118` `anunnaTurnings` picks an epoch the source never states.** The dossier
   gives 432 000 and 864 000 turnings as totals but no zero point. Anchoring on
   `jdn(-3894,1,1)` (AM 0) is a reasonable inference; anchoring on the Cataclysm (−5238) is equally
   defensible and would shift every reading by 490 044 days. §5.1. Say which and why.
8. **`docs/DOMAIN.md` §4's glossary omits the entire calendrical vocabulary.** §6 above lists ~30
   terms the source uses that the glossary does not define — the four named floods, Cataclysm Era,
   baktun, 13.0.0.0.0, Foundation of Time, decan, Vapor Canopy, Sky Dragon, Shock Period, Adamu,
   Achuzan, Electra, chronotecture, Civilization X, Baby Phoenixes, the Archaix acronym, Simulation
   Collapse, mirror-year, and the six `kind` codes.
9. **`kind` is a narrative label, not a cycle test — say so.** An unbroken 13-node NER-600 chain runs
   through the ledger but only six rows are tagged `ner`; `MAY_NODES` has 14 entries but the ledger
   has 13 `may` rows (2046 is tagged `key`). Nothing in the code reads `kind` as a cycle flag today,
   which is correct — `src/core/scoring/traits.js:67–69` tests the lattice, not the tag — but the
   data file invites the mistake.
10. **"YEAR ONE" is AM 0.** `src/data/ledger.js:11` says astro −3894 is "YEAR ONE of the Ancient
    calendar" while `AM_OFFSET = 3894` renders it AM 0. AM is years *elapsed*; the offset is right
    and confirmed by five independent anchors. One sentence in the glossary prevents a very
    expensive "fix". §7.7.
11. **Four ledger rows carry a negative Annus Mundi**, and a fifth is AM 0: astro −5238 → AM −1344,
    −4638 → −744, −4308 → −414, −4038 → −144, −3894 → 0. Any AM formatter that assumes a positive
    count will render five of the 69 rows wrong.
12. **The heading in the source says "The 300-Event Ledger"** while the array has 69 (`:441`). The
    shipped 69 are explicitly a subset. Worth recording, so expanding the ledger is understood as
    restoration rather than invention.
13. **Five prose-dated Chronicon events are candidates for the ledger** and are currently absent:
    2905 BC / AM 990 (pyramid commenced), 1899 BC / AM 1996 (pyramid re-emerges; Babel and Akkad),
    1882 CE / AM 5776 (Petrie's survey — the dossier's centrepiece synchronicity), and the two 2026
    dates. §3.2.
14. **The Sothic / Saros / Inex / Jupiter–Saturn constants have no Chronicon provenance.** Confirmed
    absent from both assigned files. `docs/DEVIATIONS.md` §8 already frames them as an additive
    extension, which is correct — but nothing should cite the Chronicon for them, and the four
    values are standard astronomy, not thesis numbers. §2.7.
15. **The Archaix cycle lengths are literal MSRF numbers.** 138, 414, 552, 600 and 792 are all
    members of `MSRF_FILTER__NORMAL`
    (`reference/asar/unpacked/src/ophis_model__params.js:21–25`). Neither source notices it. It is
    the strongest arithmetical link between the calendrics and the scoring in the whole system, and
    it belongs in `docs/DOMAIN.md` §3.

---

## Appendix A · Verified numeric identities

Every one of these was computed rather than copied.

```
jdn(2026,5,30)                        = 2 461 191
jdn(-3894,1,1)   [AM epoch]           =   298 806
AM epoch → Flood (15 May 2239 BC)     =   604 976 days
30 May 2026 since AM epoch            = 2 162 385 turnings

Moon, 30 May 2026: age 13.93 d · illum 99 % · "Full Moon" · lunation 1278
Moon, 15 May 2040: age  4.14 d · illum 18 % · waxing crescent  (mean-synodic model)

MAY_NODES deltas: 400 ×6, then 394 ×7  ·  6·400 + 7·394 = 5158 = 3112 + 2046
144000/360 = 400 exactly   ·   144000/365.25 = 394.25 → 394
864000/144000 = 6 baktuns  ·   432000/144000 = 3 baktuns
864000/360 = 2400 Draconian yr · 432000/360 = 1200

Phoenix ∩ Nemesis-inner over [-5238, 2178] = { -3480, -2652, -306 }  (522 is NOT a member)
NER-600 grid rows present in the ledger    = 13 consecutive, -5238 … 1962

Petrie:  146.71 m = 5776.0 in   ·  9068.8 in = 230.3475 m  ·  9068.8/20.62 = 439.81 cubits
         4·9068.8 / (2·5776) = 3.14017      (OPH_PI = 3.14)
         280/440 = 7/11 = 0.63636           ·  76² = 5776 = 1882 + 3894
         4 · 230.35 m · 43200 = 39 804 km   (true meridian ≈ 40 008 km)
235/19 = 12.36842
```

## Appendix B · Files cited

| Path | Role |
|---|---|
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/chronicon-clocks-calendrics.txt` | primary — the Chronicon engine + dossier |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/Ophis_v9_DeepDive_Addendum.md` | primary — v9 engine deep dives |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/PSYFR1.html` | the ledger's immediate parent (rows at `:642–712`) |
| `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/src/data/ledger.js` | the 69 rows under reconciliation |
| `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/src/data/lattice.js` | the offsets and periods under verification |
| `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/src/core/cycles.js` | the wheel readers |
| `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/src/core/scoring/traits.js` | where the lattice meets the scoring |
| `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/src/ui/panels/wheels.js` | the rewrite's clock faces |
| `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/src/core/equation/constants.js` | `OPH_HEP` and the CYPHR cycle constants |
| `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/reference/asar/unpacked/src/ophis_config.js` | v12 `OPH_HEP = 7.01` at `:413` |
| `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/reference/asar9/unpacked/src/ophis_config.js` | v9 `OPH_HEP = 7.01` at `:367` |
| `C:/Users/bradl/OneDrive/Desktop/Ophis-PSYFR/reference/asar/unpacked/src/ophis_model__params.js` | MSRF filters, the sixteenth operation |
