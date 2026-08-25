# 15 — Live Engine Extraction (PSYFR1.html / NATORI-ON-PSYFR)

**Method:** the shipped `PSYFR1.html` was served over `http://localhost:8777` and driven in a real
browser. Everything below was read **out of the running engine** (`Function.prototype.toString`,
direct evaluation of module-scope constants, and a real `cast()` invocation) — not inferred from
reading source. This is the authoritative reference for the rewrite's *behaviour*; the `src/`
Electron engine (specs 01–12) is the reference for the *desktop feature set*.

> Two engines exist and they are **not the same program**:
> - `src/` (Ophis v12, Electron) — MSRF-number scoring, day-resolution, sunset day-boundaries,
>   lat/long, Chart.js, PDF/XLSX export.
> - `PSYFR1.html` (NATORI-ON-PSYFR) — **Chronicon-resonance scoring**, JDN-based, year-resolution
>   cycle lattice, wheels + ledger + convergence. This is the one the user calls "Cypher".
>
> The rewrite must fuse them: Ophis predictive grammar × Chronicon calendrics.

---

## 1. Constants (exact, as evaluated)

| Name | Value | Meaning |
|---|---|---|
| `OPH_PHI` | `1.61803398875` | golden ratio |
| `OPH_PI`  | `3.14` | **deliberately truncated pi**, not `Math.PI` |
| `OPH_CRV` | `5.08` | "curve" constant |
| `OPH_HEP` | *not defined in this build* | hepta-cycle exists only in `src/` |
| `AM_OFFSET` | `3894` | `am(astroYear) = astroYear + 3894` |
| `LC_OFFSET` | `3112` | `lcYear(astroYear) = astroYear + 3112` |
| `AM_EPOCH` | `298806` | JDN of the Annus Mundi epoch |
| `SYN` | `29.530588853` | synodic month, days |
| `NEWMOON_J2000` | `2451550.1` | reference new moon JD |
| `ECL_MIN_JD` | `1721231` | first solar-eclipse record |
| `ECL_MAX_JD` | `2817079` | last eclipse record |
| `ECL_TYPE_NAME` | `{T:'total', A:'annular', P:'partial', H:'hybrid'}` | |
| `MAY_NODES` | `[-3112,-2712,-2312,-1912,-1512,-1112,-712,-318,76,470,864,1258,1652,2046]` | baktun boundaries (astro years) |
| `SCORING` | `{V8:'V8', V7:'V7'}` | the two scoring lenses |
| `TODAY` | `{y:2026, m:8, d:25}` | **hardcoded**; the rewrite must derive this from the clock |

`MSRF` is a `Set` of **87** integers (the `src/` build's list is far longer — this is a reduced set):
`19,12,21,24,36,40,42,48,49,54,56,60,63,66,72,76,84,90,96,108,114,119,120,126,132,133,135,138,140,144,147,153,162,168,180,189,207,216,222,234, …`

`EVENT_YEARS` is a `Map` of **69** entries keyed by astro year — the documented-event index used by
`scoreZDate`.

### Cycle lattice
`Phoenix 138` · `Nemesis 792` (60-yr inner arc) · `NER 600` · `Metonic 19` · `Baktun 144000 days`.

---

## 2. Calendar core

```js
// Gregorian proleptic ↔ Julian Day Number. `ay` is ASTRONOMICAL year (1 BC = 0, 2 BC = -1).
function jdn(ay,m,d){const a=Math.floor((14-m)/12),y=ay+4800-a,mm=m+12*a-3;
  return d+Math.floor((153*mm+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045;}

function jdToDate(J){J=Math.round(J);let a=J+32044,b=Math.floor((4*a+3)/146097),c=a-Math.floor(146097*b/4);
  let d=Math.floor((4*c+3)/1461),e=c-Math.floor(1461*d/4),m=Math.floor((5*e+2)/153);
  let day=e-Math.floor((153*m+2)/5)+1,month=m+3-12*Math.floor(m/10),year=100*b+d-4800+Math.floor(m/10);
  return{year,month,day};}

function mod(n,m){return((n%m)+m)%m;}                 // always-positive modulo
const am     = a => a + AM_OFFSET;                    // Annus Mundi year
const lcYear = a => a + LC_OFFSET;                    // Long-Count year
function fmtYear(a){return a<=0?(1-a)+" BC":a+" CE";} // astro year → display
function isPalindrome(n){const s=String(Math.abs(Math.round(n)));
  return s.length>1&&s===s.split("").reverse().join("");}
```

**GOTCHA — the BC off-by-one.** Anchors are stored as *astronomical* years. "2239 BC" is astro
`-2238`, and `jdn(-2238,5,15) = 903782`, which is what the UI displays as `JD 903,782`. Any rewrite
that stores `-2239` will be one year off everywhere.

---

## 3. Operation helper functions

```js
function oph_round(v){return Math.round(v);}
function oph_flip(v){                       // digit reversal, decimal point preserved by POSITION
  let s=v+""; let dot=s.indexOf(".");
  s=s.replace(".","");
  let r=s.split("").reverse();
  if(dot>0)r.splice(dot,0,".");
  return Number(r.join(""))||0;
}
// also exposed: oph_floor, oph_ceil, oph_abs, oph_sqrt
```

**GOTCHA — `oph_flip` is not "reverse the number".** The decimal point is re-inserted at the *same
index it occupied in the original string*, not at the mirrored position. It also drops a leading
`-` into the middle of the digits for negatives, and `Number(...)||0` silently maps `NaN` **and a
legitimate `0`** to `0`. Reproduce it exactly — results depend on this quirk.

---

## 4. The equation compiler (`compileOp`) — and why the rewrite replaces it

```js
function compileOp(eqRaw){
  let eq=eqRaw.replace(/\s+/g,'').replace(/×/g,'x');
  let start;
  if(eq.startsWith('X1+'))start='X1';
  else if(eq.startsWith('X2+'))start='X2';
  else throw new Error("must start with X1+ or X2+");
  let body=eq.slice(3).replace(/x/g,'*');
  let test=body.replace(/OPH_PHI|OPH_PI|OPH_CRV/g,'1')
               .replace(/oph_(flip|round|floor|ceil|abs|sqrt)/g,'f')
               .replace(/Y/g,'1');
  if(/[^0-9+\-*/().f]/.test(test))throw new Error("illegal token in equation");
  let fn = new Function('Y','OPH_PHI','OPH_PI','OPH_CRV',
                        'oph_flip','oph_round','oph_floor','oph_ceil','oph_abs','oph_sqrt',
                        'return '+body+';');           // <-- compiles the UNSUBSTITUTED body
  let t=fn(1000, …);
  if(typeof t!=='number'||!isFinite(t))throw new Error("does not evaluate to a number");
  return {start, fn:(Y)=>fn(Y, …)};
}
```

Rules it enforces:
1. Must start `X1+` or `X2+` — so **every operation is an addition onto an anchor**; the base anchor
   is chosen by that prefix.
2. `x` and `×` are multiplication aliases for `*`.
3. After substituting constants→`1`, `oph_*`→`f`, `Y`→`1`, only `[0-9+\-*/().f]` may remain.
4. Smoke-tested with `Y=1000`; must return a finite number.

**Deviation for the rewrite:** this still hands an attacker-influenceable string to `new Function`
(the string *validated* is not the string *compiled* — the same validator≠executor split flagged in
the v12 security report). The allowlist makes it hard to exploit, not impossible to get wrong.
Replace with a real tokeniser → shunting-yard parser → AST evaluator over a fixed function/constant
table. Same grammar, same results, no dynamic code generation.

---

## 5. `cast()` — the projection pipeline (verbatim semantics)

```
for each unordered pair (x1, x2) of ENABLED anchors, with k < i  (x1 = earlier index)
    Y = |x2.jd - x1.jd|
    skip if Y < 1 or Y > 3_000_000
    for each ENABLED operation op
        off = op.fn(Y);            skip on throw or non-finite
        baseJD = (op.start === 'X1') ? x1.jd : x2.jd
        ZJD    = Math.round(baseJD + off)
        zd     = jdToDate(ZJD);    skip if zd.year < -5400 or > 4000
        dedupe on key `ZJD|op.eq|x1.jd|x2.jd`
        sc = scoreZDate(zd.year, ZJD, system)
        offAbs = |Math.round(off)|
        if MSRF.has(Y) || MSRF.has(offAbs):  pts += (V7 ? 3 : 2); tag MSRF
        echo = any anchor jd within ±1 day of ZJD        → tag ECHO
        if ECL_MIN_JD <= ZJD <= ECL_MAX_JD:
            solar hit within ±1 day → pts += 2, tag "☉ SOLAR <type>"
            lunar hit within ±1 day → pts += 1, tag "☾ LUNAR <type>"
        push {zjd, ay, m, d, am, lc, op, Y, x1, x2, score, tags, met, echo, solar, lunar}

sort by  score DESC,  then zjd ASC
```

**GOTCHAs**
- Pairing is **all unordered pairs**, so N anchors → `N*(N-1)/2` pairs (not adjacent-only).
- `x1` is always the *lower-indexed* anchor — list order, **not** chronological order. Reordering
  anchors in the UI changes which one `X1+` binds to.
- `Y` is an absolute JD difference: a whole-day count, no time-of-day, no timezone.
- Dedup key includes the pair, so the same date from the same op via two different pairs is kept.
- MSRF matches on **either** the interval `Y` **or** the offset — a detail easy to miss.

---

## 6. `scoreZDate()` — the two lenses

Signature `scoreZDate(astroYear, JD, system) -> {pts, tags, met}`.

Predicates computed once:

| Predicate | Definition |
|---|---|
| `isNode` | `mod(astroYear,138) === 108` (Phoenix node) |
| `near` | `min(yearsIntoNode, yearsToNode) <= 2` |
| `isDoc` | `EVENT_YEARS.has(astroYear)` |
| `isPal` | palindrome in the display year **or** AM year **or** JD |
| `has138` | `'138'` appears in LC year, AM year, or display year |
| `has19` | `'19'` appears in display year or AM year |
| `metonic` | `mod(TODAY.y - astroYear, 19) === 0` |
| `nem` | `nemInfo(y).inner` — inside the 60-yr Nemesis arc |
| `ner` | `nerInfo(y).off === 0` |
| `bak` | `MAY_NODES.includes(y)` |

Point tables — **the whole difference between the lenses**:

| Tag | V8 (chronology-first, default) | V7 (numbers-first) |
|---|---|---|
| PHOENIX NODE | **5** | 2 |
| ≈PHOENIX (within 2 yr) | 2 | 1 |
| DOCUMENTED | **5** | 1 |
| PALINDROME ⮌ | 3 | **4** |
| 138 | 2 | **4** |
| METONIC·19 | 2 | 2 |
| 19 | 1 | 2 |
| NEMESIS / NER NODE / BAKTUN | 1 each | 1 each |
| MSRF (added in `cast`) | 2 | 3 |
| ☉ SOLAR eclipse (added in `cast`) | 2 | 2 |
| ☾ LUNAR eclipse (added in `cast`) | 1 | 1 |

`PHOENIX NODE` and `≈PHOENIX` are mutually exclusive (`else if`). Every other tag stacks.

---

## 7. `findConvergences()` — the headline feature

Groups results into clusters, then keeps only clusters where **≥ 2 distinct operations** agree.

- `tol === 'year'` → bucket by astro year. Otherwise → sort by JD and greedily chain while the gap
  to the previous member is `<= tol` days. UI windows: exact / ±1 / ±7 / ±30 / ±90 / same year.
- Per cluster: `centerJD` = **rounded mean** of member JDs, `nOps` = distinct equations,
  `nPairs` = distinct anchor pairs, `spanDays`, `bestScore`, union of tags (ECHO excluded).
- Filter `nOps >= 2`; sort by `nOps` DESC, `bestScore` DESC, `spanDays` ASC, `centerJD` ASC.
- The UI feeds it echo-filtered results.

**GOTCHA:** greedy chaining is transitive — with `tol = 30`, dates 30 days apart daisy-chain into
one cluster spanning far more than 30 days. `spanDays` exists to expose that.

---

## 8. Cycle wheels

```js
function phxInfo(a){const last=a-mod(a-108,138),next=last+138;
  return{node:mod(a,138)===108,last,next,into:a-last,to:next-a};}
function nemInfo(a){const off=mod(a-462,792),inner=off<60,ep=a-off;
  return{inner,off,enter:ep,exit:ep+60,next:ep+792};}
function nerInfo(a){const off=mod(a-162,600),start=a-off;
  return{num:Math.floor((a+5238)/600)+1,start,off,next:start+600};}
function mayInfo(a){/* index into MAY_NODES, -1 before the first */}
function moonInfo(ay,m,d){const J=jdn(ay,m,d);let age=mod(J-NEWMOON_J2000,SYN);const frac=age/SYN;
  const names=['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous',
               'Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'];
  return{age,frac,illum:(1-Math.cos(2*Math.PI*frac))/2,
         name:names[Math.floor(mod(frac+1/16,1)*8)%8],
         lun:Math.round((J-2423436.40347)/SYN)};}
```

Moon phase is a **pure mean-synodic approximation** — no observer location, no perturbations. The
`+1/16` rotation centres each of the 8 names on its phase. The `src/` build instead uses real
ephemeris libraries (`astronomy.browser.min.js`, Meeus, SunCalc) — see spec 12. Decide per feature
which fidelity is wanted; the wheels only need the cheap version.

---

## 9. Eclipse tables

Stored **delta-encoded** to keep the file small:

```js
function _decodeEcl(base,dstr,tstr){
  const ds=dstr.split(","); let jd=base, J=[jd], T=[tstr[0]];
  for(let i=0;i<ds.length;i++){ jd+=+ds[i]; J.push(jd); T.push(tstr[i+1]); }
  return {J,T};
}
```
`dstr` is a comma-separated list of day-gaps from `base`; `tstr` is one type letter per record.

| Table | Records | Types |
|---|---|---|
| `ECL_S` (solar) | **7127** | `T` total, `A` annular, `P` partial, `H` hybrid |
| `ECL_L` (lunar) | **4624** | `T`, `P` |

Lookup is a binary search over the sorted `J` array for any record within `tol` days (`tol = 1` in
`cast`). **GOTCHA:** the search returns on the first in-tolerance hit found during descent, so with
`tol > 1` and clustered records it is *a* hit, not the nearest one.

---

## 10. Operation packs (the moddable surface)

`PACKS` — five named packs, swappable from the UI:

- **Default 19** (= `DEFAULT_OPS`, the 19-operation palindromic cast)
- **138 Pack** (12 ops), **19 Metonic Pack** (11), **Golden Pack** (10), **Phoenix Lattice Pack** (10)

```
Default 19:
  X2+oph_round(Y)                     X2+oph_flip(oph_round(Y))     X1+oph_flip(oph_round(Y))
  X2+Y/OPH_PHI                        X1+Y*OPH_PHI                  X1+(Y/2)*OPH_PI
  X2+Y/OPH_CRV                        X2+Y*138/100                  X1+Y*19/10
  X2+oph_round(Y/138)*138             X1+oph_round(Y/19)*19         X2+Y+138
  X1+Y+19                             X2+oph_flip(Y)+19             X1+Y*360/365.2422
  X2+Y*792/600                        X1+oph_round(Y*OPH_PHI/OPH_PI)
  X2+oph_round(Y/OPH_PHI/OPH_PHI)     X1+oph_flip(oph_round(Y/OPH_PHI))
```

This is exactly the shape the rewrite should generalise: **packs are data**, and adding one must be
a single data edit, not a code change.

---

## 11. The documented ledger `E`

`E[i] = [astroYear, kind, text, [month, day]?]` — **69** entries, default date `5/15` when the
4th element is absent (`eventSeedDate`).

| kind | count | meaning |
|---|---|---|
| `phx` | 24 | Phoenix event |
| `may` | 13 | Mayan baktun boundary |
| `nem` | 11 | Nemesis X event |
| `note` | 8 | annotation |
| `key` | 7 | key cataclysm |
| `ner` | 6 | NER 600 node |

Range `-5238` (Nemesis Cataclysm) → `2178` (Simulation Collapse). Each row can be seeded as an
anchor or sent to the wheels.

---

## 12. GOLDEN PARITY DATASET

Reproduced live. **The rewrite must match this exactly.**

Anchors (list order matters — it fixes X1/X2 binding):

| # | Label | Date | JD |
|---|---|---|---|
| 1 | Great Flood | 2239 BC · 05/15 (astro −2238) | **903782** |
| 2 | Today | 2026 CE · 08/25 | **2461278** |
| 3 | Phoenix 2040 | 2040 CE · 05/15 | **2466290** |

Pack **Default 19**, lens **V8**, all enabled → **33 results**, 1 convergence at exact-day tolerance.

Top of the ranked cast:

| Score | Z-Date | JD | AM | LC | Y | Operation | Tags |
|---|---|---|---|---|---|---|---|
| 12 | 2040 CE 5/10 | 2466285 | 5934 | 5152 | 1562508 | `X1+oph_round(Y/19)*19` | PHOENIX NODE · DOCUMENTED · ☉ SOLAR partial |
| 10 | 2040 CE 3/4 | 2466218 | 5934 | 5152 | 5012 | `X1+Y*360/365.2422` | PHOENIX NODE · DOCUMENTED |
| 10 | 2040 CE 5/19 | 2466294 | 5934 | 5152 | 5012 | `X1+oph_round(Y/19)*19` | PHOENIX NODE · DOCUMENTED |
| 10 | 2040 CE 6/3 | 2466309 | 5934 | 5152 | 1562508 | `X1+Y+19` | PHOENIX NODE · DOCUMENTED |
| 10 | 2040 CE 6/3 | 2466309 | 5934 | 5152 | 5012 | `X1+Y+19` | PHOENIX NODE · DOCUMENTED |
| 7 | 2046 CE 2/18 | 2468395 | 5940 | 5158 | 5012 | `X2+oph_flip(oph_round(Y))` | DOCUMENTED · NEMESIS · BAKTUN |
| 7 | 2046 CE 3/9 | 2468414 | 5940 | 5158 | 5012 | `X2+oph_flip(Y)+19` | DOCUMENTED · NEMESIS · BAKTUN |
| 5 | 2026 CE 8/16 | 2461269 | 5920 | 5138 | 1557496 | `X1+oph_round(Y/19)*19` | METONIC·19 · 138 · ☾ LUNAR partial |
| 4 | 2026 CE 9/13 | 2461297 | 5920 | 5138 | 1557496 | `X1+Y+19` | METONIC·19 · 138 |
| 4 | 2045 CE 8/11 | 2468204 | 5939 | 5157 | 5012 | `X2+oph_round(Y/OPH_PHI/OPH_PHI)` | METONIC·19 · ☉ SOLAR total |
| 4 | 2882 CE 6/30 | 2773870 | 6776 | 5994 | 1562508 | `X2+Y/OPH_CRV` | PALINDROME ⮌ · NEMESIS |
| 3 | 2866 CE 1/27 | 2767872 | 6760 | 5978 | 1557496 | `X2+Y/OPH_CRV` | ≈PHOENIX · NEMESIS |

Note row 5 and row 4 are the *same* Z-date from the *same* operation via **different anchor pairs**
(`Y=1562508` vs `Y=5012`) — proof that the dedup key includes the pair.

Single convergence (exact-day, echoes excluded): centre **2048 CE 11/7**, 2 operations, 1 pair,
best score 1, tag NEMESIS.

---

## 13. UI surface observed live

Nav: **THE ORACLE · CONVERGENCE · THE WHEELS · THE LEDGER · METHOD · 📖 FIELD GUIDE**
Global controls: `A− A A+` text scale (`--zoom`), `✦ Simple` density toggle, `☀ Light` theme toggle.

- **I · THE ORACLE** — 3-step explainer; anchor list (enable/remove per row, JD + AM shown);
  manual add (YEAR / ERA BC·CE / MON / DAY / LABEL); "seed from Chronicon ledger" `<select>`;
  operations panel (RESET 19, view/edit pack, scoring lens V8/V7, themed packs + save/load `.json`);
  **⟳ CAST THE ORACLE**; filter chips `ALL · ✦ NOVEL ONLY · PHOENIX · DOCUMENTED · PALINDROME ·
  19·METONIC · ECLIPSE · FUTURE`; `⤓ CSV`; results table
  **SCORE · PROJECTED DATE · AM · LC · OPERATION · Y (ROT.) · RESONANCE**.
- **I·B · THE CONVERGENCE** — agreement-window selector; table
  **STRENGTH · CONVERGED DATE · AM · LC · RESONANCE · OPERATIONS THAT AGREE**.
- **II · THE WHEELS** — date dial + presets (TODAY / 2040 / 2046 / 2178) and 7 wheels:
  Phoenix 138 · Nemesis X 792 · Anunnaki NER 600 · Annus Mundi · Mayan Long-Count ·
  Anunna Turnings (šar = a day) · Metonic Moon.
- **III · THE LEDGER** — 69 events, filterable by kind, each row seedable.
- **IV · METHOD & LINEAGE** — scoring rules, constants, echo filter, provenance note.

### Design tokens — LIGHT theme (read from `:root`)
```css
--bg:#ece0c6; --bg2:#e0d2b2; --ink:#2c2317; --dim:#6a5f45;
--gold:#9a6f14; --gold2:#7d5410; --cyan:#1d6c7d;
--green:#4d7730; --red:#b32a1a; --violet:#69479c;
--line:rgba(90,60,15,.30);
--panel:rgba(255,251,242,.7); --panel2:rgba(255,251,242,.92);
--zoom:1;
```
DARK theme (from the published `index.html` splash): `--bg:#07070c`, `--gold:#f3d27a`,
`--cyan:#54b8c9`. Semantic roles are stable across themes — only the values swap, which is exactly
the token structure the rewrite should keep.

Tag → CSS class map used on result chips:
`phx · ev · pal · s138 · s19 · met · nem · ner · bak · msrf · echo · sol · lun`
Ledger dot classes: `d-key · d-phx · d-nem · d-ner · d-may · d-note`.

---

## 14. Consequences for the rewrite

1. **Replace `new Function`** with a tokeniser + parser + AST evaluator. Same grammar, same output.
2. **`TODAY` must come from the clock**, not a baked-in literal.
3. **Everything listed as data stays data**: packs, MSRF set, ledger, scoring point tables, eclipse
   tables, theme tokens. Adding an operation, a pack, a scoring lens, or a theme = one data edit.
4. **Preserve the quirks deliberately**: `OPH_PI = 3.14`, `oph_flip`'s decimal placement, list-order
   X1/X2 binding, all-pairs enumeration, MSRF-on-Y-or-offset. They are load-bearing for parity.
5. Keep the eclipse tables delta-encoded — they are the bulk of the payload.
