# 13 — PSYFR / CYPHR Browser UI ("NATORI-ON-PSYFR")

**Subsystem:** the single-file browser rewrites of the Ophis engine — the portfolio UI.
**Assignment:** `Natori-On-PSYFR-Main-UI.html`, `PSYFR1.html`, `PSYFR2.html`, `NatoriOphis.html`.
**Status:** all four files read line-by-line, 100% coverage. Engine behaviour verified by
executing the extracted core in Node (see §12).
**Root:** `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/`

> All `file:line` citations below refer to `Natori-On-PSYFR-Main-UI.html` unless another
> filename is given. That file uses LF endings and its line numbers are stable.

---

## 1. FILE INVENTORY — what each file actually is

### 1.1 The identity finding: PSYFR1 and the Main UI are the same file

`PSYFR1.html` and `Natori-On-PSYFR-Main-UI.html` are **byte-identical apart from line
endings and one leading space**. Verified:

```
$ tr -d '\r' < PSYFR1.html | sed 's/^ *<!DOCTYPE/<!DOCTYPE/' | md5sum
90e228167a8854397d07172ead1ee51d
$ tr -d '\r' < Natori-On-PSYFR-Main-UI.html | sed 's/^ *<!DOCTYPE/<!DOCTYPE/' | md5sum
90e228167a8854397d07172ead1ee51d
```

- `PSYFR1.html` — 142,449 bytes, CRLF, 1219 lines, leading `" <!DOCTYPE html>"` (one space).
- `Natori-On-PSYFR-Main-UI.html` — 141,229 bytes, LF, 1219 lines, no leading space.
- Size delta is exactly 1220 = 1219 extra `\r` + 1 space.
- Normalised diff output is 4 lines, all on line 1.

**There is no "engine build" separate from the "main UI".** The task brief's premise that
`PSYFR1.html` is a distinct engine build is incorrect — it is a CRLF copy of the same file.
The same duplication exists elsewhere in the repo: `OPHIS.html` and `Ophis_v9_Explained.html`
are also byte-identical (`md5 fec9f73baaf18d50f107b28a848528ea`).

### 1.2 The four (really three) documents

| File | Role | Lines | Distinct? |
|---|---|---|---|
| `Natori-On-PSYFR-Main-UI.html` | **The engine.** Newest, most complete. Title `NATORI-ON-PSYFR · The Predictive Chronology Engine` | 1219 | ✔ canonical |
| `PSYFR1.html` | CRLF duplicate of the above | 1219 | ✘ identical |
| `PSYFR2.html` | **The Field Guide.** Static companion doc — no engine, no `<canvas>`, no cast. Title `NATORI-ON-PSYFR · Field Guide` | 448 | ✔ |
| `NatoriOphis.html` | **The ancestor.** Earlier build, branded `OPHION`. Title `OPHION · The Predictive Chronology Engine` | 851 | ✔ |

### 1.3 Which is newest — judged by content, not mtime

`Natori-On-PSYFR-Main-UI.html` is unambiguously the latest. `NatoriOphis.html` is a strict
subset — the normalised diff is 459 changed lines, and **every change is an addition or
improvement in the Main UI**; nothing was removed. Evidence:

- Brand renamed `OPHION` → `NATORI-ON-PSYFR` (`NatoriOphis.html:184` vs `:292`).
- Main UI adds the entire **Convergence** section (`:438-463`), absent from `NatoriOphis.html`.
- Main UI adds **eclipse tables** (`:615-637`), absent from `NatoriOphis.html`.
- Main UI adds **op packs + JSON save/load** (`:865-913`), **light theme** (`:249-286`),
  **text-zoom** (`:296-301`), **Simple/Full mode** (`:302`, `:243-244`), and **a11y focus
  rings** (`:220-247`).
- Main UI fixes a divide-by-zero in `mayInfo` rendering (§11 G-9).
- `NatoriOphis.html` uses `<div class="chk">` for checkboxes (`NatoriOphis.html:635`);
  the Main UI upgrades these to real `<button type="button" aria-pressed>` (`:961`).

Release metadata confirms the lineage. `NatorionOracle-v1.019.zip` contains
`NatorionOracle-v1.0.zip`, whose `README.txt` is dated **12 June 2026** and names the two
shipped files `NATORI-ON-PSYFR-Main-UI.html` + `NATORI-ON-PSYFR-Field-Guide.html`.
`PSYFR1.html`/`PSYFR2.html` are the loose working copies of exactly those two.

### 1.4 Feature coverage matrix

| Feature | Main UI / PSYFR1 | NatoriOphis | PSYFR2 |
|---|:--:|:--:|:--:|
| Ophis core math (`jdn`, `jdToDate`, `oph_*`) | ✔ | ✔ | ✘ |
| `compileOp` grammar + `new Function` | ✔ | ✔ | ✘ (documents it) |
| `cast()` projection engine | ✔ | ✔ | ✘ |
| 69-event Chronicon ledger `E[]` | ✔ | ✔ | ✘ |
| 87-member MSRF set | ✔ | ✔ | ✘ |
| V8 / V7 scoring lens toggle | ✔ | ✔ | ✘ (documents it) |
| ECHO detection + NOVEL filter | ✔ | ✔ | ✘ (documents it) |
| **Eclipse tables (7127 solar / 4624 lunar)** | ✔ | ✘ | ✘ (documents it) |
| **ECLIPSE result filter** | ✔ | ✘ | — |
| **Convergence section** | ✔ | ✘ | ✘ (documents it) |
| **Op packs (5 named packs)** | ✔ | ✘ | ✘ (documents it) |
| **Save / Load `.json` config** | ✔ | ✘ | ✘ (documents it) |
| Seven Wheels / dial | ✔ | ✔ | ✘ |
| Ledger table + seed buttons | ✔ | ✔ | ✘ |
| CSV export | ✔ (17 cols) | ✔ (15 cols) | ✘ |
| **Light theme** | ✔ | ✘ | ✔ |
| **Text-size zoom (A− A A+)** | ✔ | ✘ | ✔ |
| **Simple / Full view toggle** | ✔ | ✘ | ✘ |
| **`prefers-reduced-motion`** | ✔ | ✘ | ✔ |
| **Focus-visible rings** | ✔ | ✘ | ✔ |
| **`<details>` progressive disclosure** | ✔ | ✘ | ✔ |
| **Guided 3-step cast flow** | ✔ | ✘ | ✔ (4 steps) |
| Formula cookbook + copy buttons | ✘ | ✘ | ✔ |
| Tag glossary / FAQ / worked examples | ✘ | ✘ | ✔ |
| CSP `<meta>` | ✔ (`unsafe-eval`) | ✔ (no `unsafe-eval`) | ✘ (none) |

> **Note the CSP inconsistency.** `NatoriOphis.html:7` omits `'unsafe-eval'` from
> `script-src` — yet `compileOp` calls `new Function` (`NatoriOphis.html:533`). Under a
> browser that enforces the meta CSP, **every operation in `NatoriOphis.html` fails to
> compile and the app silently loads zero operations** (`loadDefaultOps` filters the
> nulls away at `NatoriOphis.html:663`). The Main UI fixes this by adding `'unsafe-eval'`
> (`:7`). `PSYFR2.html` ships no CSP at all.

---

## 2. VISUAL DESIGN SYSTEM

### 2.1 CSS custom properties — verbatim

**Dark (default), `:root`** — `:12-16`:

```css
:root{
  --bg:#07070c;--bg2:#0d0d18;--ink:#ece5d2;--dim:#8a8470;--gold:#d8a943;--gold2:#f3d27a;
  --red:#d3402f;--cyan:#54b8c9;--green:#7faa5a;--violet:#9b7fd0;
  --line:rgba(216,169,67,.2);--panel:rgba(20,20,32,.55);--panel2:rgba(20,20,32,.75);
}
```

Plus two later additions:
- `:221` — `:root{--zoom:1}`
- `:246` — `:root[data-theme="dark"]{--dim:#9c947c}` (explicit-dark brightens `--dim`)

**Light ("aged parchment"), `:root[data-theme="light"]`** — `:250-254`:

```css
:root[data-theme="light"]{
  --bg:#ece0c6;--bg2:#e0d2b2;--ink:#2c2317;--dim:#6a5f45;
  --gold:#9a6f14;--gold2:#7d5410;--red:#b32a1a;--cyan:#1d6c7d;--green:#4d7730;--violet:#69479c;
  --line:rgba(90,60,15,.30);--panel:rgba(255,251,242,.7);--panel2:rgba(255,251,242,.92);
}
```

### 2.2 Semantic roles

| Token | Dark | Light | Role |
|---|---|---|---|
| `--bg` | `#07070c` | `#ece0c6` | page ground |
| `--bg2` | `#0d0d18` | `#e0d2b2` | toast background only |
| `--ink` | `#ece5d2` | `#2c2317` | primary text |
| `--dim` | `#8a8470` (→`#9c947c` in explicit dark) | `#6a5f45` | secondary/meta text |
| `--gold` | `#d8a943` | `#9a6f14` | field labels, table headers, primary accent, active-button fill |
| `--gold2` | `#f3d27a` | `#7d5410` | headings, dates, palindrome mark, button text |
| `--red` | `#d3402f` | `#b32a1a` | Phoenix / 138 / section numbers / cast button / destructive |
| `--cyan` | `#54b8c9` | `#1d6c7d` | Metonic-19 / operation strings / focus ring / info |
| `--green` | `#7faa5a` | `#4d7730` | documented events / NER |
| `--violet` | `#9b7fd0` | `#69479c` | MSRF / Nemesis / convergence strength / NOVEL filter |
| `--line` | `rgba(216,169,67,.2)` | `rgba(90,60,15,.30)` | all borders/hairlines |
| `--panel` | `rgba(20,20,32,.55)` | `rgba(255,251,242,.7)` | panel/table/card fill |
| `--panel2` | `rgba(20,20,32,.75)` | `rgba(255,251,242,.92)` | list-row fill (one step more opaque) |

### 2.3 Hard-coded colours (not tokenised)

| Hex | Where | Purpose |
|---|---|---|
| `#05050a` | `:72`, `:94`, `:139`, `:151`, `:159`, `:189`, `:195`, `:214` | inset well: inputs, checkboxes, meter tracks, era buttons |
| `#0b0b14` | `:122` | sticky `<th>` background (dark) |
| `#100c02` | `:78`, `:95`, `:111`, `:160`, `:167`, `:239` | text on gold fill |
| `#04141a` | `:81`, `:115` | text on cyan fill |
| `#0a0612` | `:104`, `:116`, `:186` | text on violet fill |
| `#ddd6c4` | `:60`, `:215` | body `<p>` colour (dark) |
| `#cdc6b2` | `:172` | note-card paragraph |
| `#ff9d8f` | `:80`, `:135` | `.btn.red` text, `.rt.s138` |
| `#9fe0ea` | `:81`, `:135`, `:241` | `.btn.cyan` text, `.rt.s19`, `#modeBtn` |
| `#8fb0c9` | `:154`, `:180` | moon clock accent, `.rt.lun` |
| `#4a4a55` | `:165` | `.d-note` ledger dot |
| `#c9b8e8` | `:185` | `#packBar .btn` text |
| `#fff` | `:40`, `:80`, `:84`, `:112` | gradient stop / text on red |
| `#fffdf6` | `:217`, `:271`, `:275`, `:159`(PSYFR2) | light-theme input/well fill |
| `#e3d4b2` | `:272`, `:278` | light-theme `<th>` + meter track |
| `#3a3020` | `:218`, `:266` | light-theme paragraph |
| `#5a3d0a`→`#8a5a12`→`#a8791a` | `:264` | light-theme `h1` gradient |
| `#06140a` | `PSYFR2.html:89` | `.copybtn.done` text on green |

### 2.4 Typography

Loaded from Google Fonts (`:10`, one stylesheet, `display=swap`):

```html
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;800&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

Three families, three jobs:

| Stack | Job |
|---|---|
| `'Cinzel',serif` | display — `h1`, `h2`, clock values, cast button, step numerals, convergence strength |
| `'EB Garamond',serif` | body prose — `body`, `p`, `.lead`, ledger event cells, empty states |
| `'IBM Plex Mono',monospace` | every technical/UI-chrome string — nav links, labels, tables, tags, inputs, buttons |

Base: `body{font-family:'EB Garamond',serif;line-height:1.6;font-size:17px}` (`:26`).
PSYFR2 uses `line-height:1.65` (`PSYFR2.html:26`).

**Full type scale** (Main UI):

| Element | Size | Weight | Tracking | Other |
|---|---|---|---|---|
| `h1` | `clamp(40px,10vw,96px)` | 800 | `.02em` | `line-height:.9`, gradient-clipped text (`:39-40`) |
| `h2` | `clamp(24px,4.4vw,38px)` | 600 | — | `line-height:1.05`, `--gold2` (`:58`) |
| `.panel h3` | 12px | — | `.18em` | uppercase, `--gold` (`:66`) |
| `.eyebrow` | 11px | — | `.42em` | uppercase, `--gold` (`:38`) |
| `.sec-no` | 11px | — | `.32em` | uppercase, `--red` (`:57`) |
| `.tagline` | 12px | — | `.2em` | Cinzel, uppercase (`:41`) |
| `.lead` | 18px | — | — | `max-width:74ch` (`:59`) |
| `p` | 17px (inherit) | — | — | `max-width:76ch`, `#ddd6c4` (`:60`) |
| `.sub` | 16px | — | — | italic, `max-width:62ch` (`:43`) |
| `label.fld` | 9.5px | — | `.18em` | uppercase, `--gold` (`:69`) |
| `input`,`select` | 14px | — | — | mono (`:70-72`) |
| `.btn` | 11px | — | `.07em` | uppercase (`:76-77`) |
| `.btn.sm` | 10px | — | — | `padding:5px 9px` (`:79`) |
| `.btn.cast` | 15px | 600 | `.14em` | Cinzel, `padding:13px 26px` (`:82`) |
| `table` | 12.5px | — | — | mono (`:120`) |
| `th` | 9px | — | `.14em` | uppercase, sticky (`:122`) |
| `.rt` (tag pill) | 8.5px | — | `.05em` | uppercase (`:132`) |
| `.clock .name` | 9.5px | — | `.2em` | uppercase, `var(--accent)` (`:146`) |
| `.clock .big` | `clamp(22px,3vw,30px)` | 600 | — | Cinzel, `line-height:1` (`:147`) |
| `.clock .big small` | `.42em` | — | — | mono, `--dim` (`:148`) |
| `.clock .meta` | 11px | — | — | mono, `line-height:1.65` (`:149`) |
| `.arow .lbl` | 14.5px | — | — | (`:90`) |
| `.arow .lbl small` | 10.5px | — | — | mono, `--dim` (`:91`) |
| `.arow .lbl .mono` | 12.5px | — | — | `--cyan` (`:92`) |
| `.opchip` | 9px | — | — | mono, cyan-bordered (`:194`) |
| `.cpairs`,`.cspan` | 9px | — | — | mono, `--dim` (`:191-192`) |
| `.convstrength b` | 22px | — | — | Cinzel, `--violet` (`:188`) |
| `.cstep b.n` | 19px | 800 | — | Cinzel, 30px circle (`:214`) |
| `.filt button` | 9.5px | — | `.06em` | (`:110`) |
| `.flag` | 9.5px | — | `.1em` | pill `border-radius:999px` (`:51`) |
| `footer` | 10.5px | — | — | mono, `line-height:1.8` (`:174`) |
| `details.fold>summary` | 11px | — | `.16em` | uppercase, `--gold` (`:199-200`) |
| `.toast` | 12px | — | — | mono (`:176-177`) |

### 2.5 Spacing, radii, shadows

**Radii** (a deliberately tight, near-flat scale):

| Value | Applied to |
|---|---|
| `3px` | inputs, `.btn`, `.chk`, `.rt` pills, `.filt button`, `.era-toggle`, `.opchip`, `.convsel` |
| `4px` | `.arow`, `.systog`, `.clock`, `.tsize`, `#themeBtn`/`#modeBtn`, `.fcode code` (PSYFR2) |
| `5px` | `.panel`, `.tbl-wrap`, `.note-card`, `.dialbar`, `.toolbar`, `details.fold`, `.toast`, `.cstep` |
| `6px` | `.ex` (PSYFR2 only, `PSYFR2.html:132`) |
| `50%` | `.clock::after` glow, `.cstep b.n`, `.step::before` (PSYFR2) |
| `999px` / `99px` | `.flag` (999), `.scorebar`/`.bar`/`.cbar` (99) |
| `0 4px 4px 0` | `.moment` (flat left edge under its 3px red rule, `:46`) |

**Layout spacing:**
- Page gutter: `.wrap{max-width:1240px;margin:0 auto;padding:clamp(14px,3vw,34px)}` (`:28`).
  PSYFR2 narrows to `max-width:920px` (`PSYFR2.html:28`).
- Nav padding: `11px clamp(14px,3vw,34px)` (`:30`).
- Header padding: `clamp(34px,7vw,72px) 0 clamp(12px,3vw,30px)` (`:37`).
- Section padding: `clamp(26px,4vw,46px) 0` + `border-top:1px solid var(--line)` (`:56`).
- Panel padding: `16px 18px` (`:65`). Clock padding: `14px` (`:144`).
- Table cells: `8px 11px` (`:121`). PSYFR2 tables: `9px 13px` (`PSYFR2.html:95`).
- Grid gaps: `.grid2` 16px (`:63`), `.wheelgrid` 12px (`:143`), `.rowlist` 8px (`:86`),
  `.castflow` 10px (`:212`), `.restags` 4px (`:131`), `.filt` 5px (`:109`).

**Shadows** — only four in the whole design, all glows:

| Selector | Shadow |
|---|---|
| `.flag.on` `:52` | `0 0 13px -2px currentColor` |
| `.btn.cast:hover` `:84` | `0 0 24px -4px var(--red)` |
| `.scorebar i` `:140` | `0 0 8px -1px var(--red)` |
| `.bar i` `:152` | `0 0 9px -1px var(--accent)` |
| `.cbar i` `:190` | `0 0 8px -1px var(--violet)` |
| `.toast` `:177` | `0 8px 30px -8px #000` (the only drop shadow) |

### 2.6 Background treatment — the signature look

Four stacked layers on `body` (`:19-27`): two coloured radial glows over a 46px
graph-paper lattice, over flat `--bg`.

```css
body{
  background:
    radial-gradient(1100px 560px at 84% -8%, rgba(211,64,47,.10), transparent 60%),
    radial-gradient(900px 480px at 6% 108%, rgba(84,184,201,.07), transparent 60%),
    repeating-linear-gradient(0deg,  rgba(216,169,67,.022) 0 1px, transparent 1px 46px),
    repeating-linear-gradient(90deg, rgba(216,169,67,.022) 0 1px, transparent 1px 46px),
    var(--bg);
  color:var(--ink);font-family:'EB Garamond',serif;line-height:1.6;font-size:17px;min-height:100vh;
}
```

Light theme repaints the same four layers with `rgba(179,42,26,.07)`,
`rgba(29,108,125,.06)` and `rgba(90,60,15,.03)` grid (`:255-262`).

**Other gradients:**
- `h1` gradient text: `linear-gradient(180deg,#fff,var(--gold2) 50%,var(--gold))` +
  `background-clip:text;color:transparent` (`:39-40`). Light: `#5a3d0a → #8a5a12 55% → #a8791a` (`:264`).
- `.moment`: `linear-gradient(90deg,rgba(211,64,47,.10),transparent)` with
  `border-left:3px solid var(--red)` (`:45-46`).
- `.btn.cast`: `linear-gradient(180deg,rgba(211,64,47,.18),rgba(20,20,32,.4))` (`:83`).
- `.scorebar i`: `linear-gradient(90deg,var(--gold),var(--red))` (`:140`).
- `.cbar i`: `linear-gradient(90deg,var(--violet),var(--cyan))` (`:190`).
- `.note-card`: `linear-gradient(180deg,rgba(84,184,201,.08),transparent)` (`:170`).
- `.clock::after`: an 88×88px `radial-gradient(circle,var(--accent),transparent 70%)`
  at `opacity:.13`, positioned `right:-30px;top:-30px` — a per-clock corner glow (`:145`).
- `nav`: `background:rgba(7,7,12,.92);backdrop-filter:blur(8px)` (`:30`).

### 2.7 Motion

Deliberately minimal — no keyframes anywhere. Every animation is a CSS transition:

| Selector | Transition |
|---|---|
| `.flag` `:51` | `.2s` (opacity + glow when `.on`) |
| `.btn` `:77` | `.15s` |
| `.systog button` `:103` | `.15s` |
| `.navbtn` `:234` | `.15s` |
| `.copybtn` (PSYFR2 `:88`) | `.15s` |
| `.fcode code` (PSYFR2 `:84`) | `.12s` |
| `tr.zr` `:124` | `.1s` |
| `.toast` `:177` | `.3s` on `transform` |
| `summary::before` (PSYFR2 `:115`) | `.2s` |

Scroll: `html{scroll-behavior:smooth}` (`:18`); all navigation uses
`scrollIntoView({behavior:'smooth'})`.

Toast enters by transform only: `translateX(-50%) translateY(140%)` → `translateY(0)` on
`.show` (`:176-178`). Dismissed after **1900 ms** (`:946`); PSYFR2 uses **1700 ms**
(`PSYFR2.html:416`).

**Reduced motion** (`:226-229`):
```css
@media (prefers-reduced-motion: reduce){
  html{scroll-behavior:auto}
  *,*::before,*::after{transition-duration:.001ms!important;animation-duration:.001ms!important}
}
```

### 2.8 Accessibility affordances

- Focus ring, all interactive elements (`:224-225`):
  `outline:2.5px solid var(--cyan);outline-offset:2px;border-radius:3px`
- Page zoom via the non-standard `zoom` property: `body{zoom:var(--zoom,1)}` (`:222`),
  driven by `--zoom` on `:root`, clamped **0.8 – 1.5** in 0.1 steps (`:1182-1184`).
- `.chk` is a real `<button type="button" aria-pressed>` with `appearance:none` (`:247`, `:961`).
- Single breakpoint only: `@media(max-width:880px){.grid2{grid-template-columns:1fr}}` (`:64`).
  Everything else is intrinsically responsive (`clamp()`, `auto-fit minmax()`, `flex-wrap`).

---

## 3. LAYOUT + ASCII WIREFRAMES

### 3.1 Document skeleton

```
<nav>                                    (sticky, z-index 60, outside .wrap)
<div class="wrap">                       (max-width 1240px)
  <header>                               (:309-314)
  <div class="moment simple-hide">       (:316-328)   "you are here" strip
  <section id="oracle">                  (:331-435)   I · The Oracle
  <section id="convergence">             (:439-463)   I·b · The Convergence
  <section id="wheels">                  (:466-499)   II · The Wheels
  <section id="ledger" class="simple-hide">   (:502-522)  III · The Ledger
  <section id="about"  class="simple-hide">   (:525-575)  IV · Method
  <footer>                               (:577-579)
</div>
<div class="toast" id="toast">           (:582)
```

### 3.2 Nav + header + moment strip

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ NATORI-ON-PSYFR · Ophis × Chronicon    The Oracle Convergence The Wheels The Ledger   │ sticky
│ (Cinzel 800, gold2 / "·Ophis×Chronicon" in red)   Method  📖 Field Guide              │ blur(8px)
│                                             [A−][A][A+]  [✦ Simple]  [☾ Dark]         │
└──────────────────────────────────────────────────────────────────────────────────────┘
                    PREDICTIVE CHRONOLOGY ENGINE · 19-OPERATION PALINDROMIC CAST
                                                                        (.eyebrow, gold, .42em)
                           N A T O R I - O N - P S Y F R
                        (Cinzel 800, clamp(40,10vw,96)px, white→gold2→gold gradient text)
        THE SERPENT THAT RINGS THE EGG OF TIME · 138 LATTICE · 19 METONIC · ⮌ MIRROR
              Seed anchor dates, cast them through the operation pack, and read
              which projections resonate…  (italic, dim, 62ch)   📖 Field Guide

┃ 2026 CE   Annus Mundi 5920   Long-Count yr 5138   since Cataclysm 7264 yr  ⟶ …event…
┃                                     (138 NODE) (19 · METONIC) (PALINDROME) (DOCUMENTED)
▲ 3px red left rule + red→transparent 90° gradient        ▲ .flags pills, right-aligned,
                                                            opacity .3 → 1 + glow when .on
```

### 3.3 Section I — The Oracle

```
I · THE ORACLE — THE PREDICTIVE CAST                     (.sec-no, red, .32em)
Seed it. Cast it. Read the resonance.                    (h2, Cinzel 600, gold2)

┌── castflow: auto-fit minmax(200px,1fr) ────────────────────────────────────────────┐
│ (1) Seed two or more…   │ (2) Cast the oracle…   │ (3) Read the results…           │
└────────────────────────────────────────────────────────────────────────────────────┘

┌─ .grid2 (1fr 1fr, collapses <880px) ───────────────────────────────────────────────┐
│ ┌── ⚓ ANCHOR DATES              3 active ─┐ ┌── ⚙ OPERATIONS      [reset 19] ────┐ │
│ │ Add manually, or seed from the ledger →  │ │ The 19-op pack is loaded…          │ │
│ │ ┌──────────────────────────────────────┐ │ │ ▸ VIEW / EDIT THE PACK   19 eqns…  │ │
│ │ │ 1 │ Great Flood                │✓│✕│ │ │ │   ┌──────────────────────────────┐ │ │
│ │ │   │ 2239 BC · 05/15 · JD …·AM …│   │ │ │ │   │ 1 │ X2+oph_round(Y)  │✓│✕│  │ │ │
│ │ │ 2 │ Phoenix 2040               │✓│✕│ │ │ │   │ … (scroll, max-h 300px)      │ │ │
│ │ │ 3 │ Today                      │✓│✕│ │ │ │   └──────────────────────────────┘ │ │
│ │ └──────────────────────────────────────┘ │ │   [Custom operation ______][+ Op]  │ │
│ │ ┄┄┄┄┄┄┄┄┄┄┄ dashed .addbar ┄┄┄┄┄┄┄┄┄┄┄┄ │ │   (red error line, min-height 14px)│ │
│ │ YEAR   ERA      MON  DAY  LABEL          │ └────────────────────── simple-hide ─┘ │
│ │ [2026][BC|CE ]  [5]  [15] [my anchor ][+Add]                                      │
│ │ SEED FROM CHRONICON LEDGER  [— pick a documented event — ▾]                       │
│ └──────────────────────────────────────────┘                                        │
└────────────────────────────────────────────────────────────────────────────────────┘

                SCORING LENS  [V8 · Chronology-first][V7 · Numbers-first]   (note…)
                             ▲ .on = gold for V8, violet for V7             simple-hide

▸ ADVANCED · THEMED OP PACKS & SAVE / LOAD                                  simple-hide
    OP PACKS [Default 19][138 Pack][19 Metonic Pack][Phoenix Lattice Pack][Golden Pack]
    │ CONFIG [⤓ Save .json][⤒ Load]        (pack buttons are violet-tinted)

                        ┌──────────────────────────┐
                        │   ⟳  CAST THE ORACLE     │   (.btn.cast, red, glow on hover)
                        └──────────────────────────┘

[ALL][✦ NOVEL ONLY][PHOENIX][DOCUMENTED][PALINDROME][19·METONIC][ECLIPSE][FUTURE]
                                                    33 / 33 shown   [⤓ CSV]
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SCORE│PROJECTED DATE│ AM │ LC │OPERATION│Y (ROT.)│RESONANCE          │ sticky <th>│
├──────────────────────────────────────────────────────────────────────────────────┤
│ 12 ▰▰│2040 CE 05/10 │5934│5152│X1+oph_… │  5,012 │(PHOENIX NODE)(DOC…)(☉ SOLAR…) │
│ 10 ▰▱│2040 CE 03/04 │5934│5152│X1+Y*360…│1,562,508│(PHOENIX NODE)(DOCUMENTED)     │
│  …   (max-height 560px scroll, max 500 rows rendered)                             │
└──────────────────────────────────────────────────────────────────────────────────┘
Rows marked (ECHO) land back on an input anchor…            simple-hide
```

Score cell colour rule (`:1050`): `score>=7` → `--red`; `>=4` → `--gold2`; else `--dim`.
Bar width `score / maxScore * 100%` where `maxScore = Math.max(5, ...allScores)` (`:1039`).

### 3.4 Section I·b — The Convergence

```
I·B · THE CONVERGENCE — WHERE THE OPERATIONS AGREE
The strongest signal: independent agreement
A single projection is a guess. But when several different operations…

AGREEMENT WINDOW  [± 30 days ▾]                              3 convergences
                  (Exact day | ±1 day | ±1 week | ±30 days✔ | ±90 days | Same year)
┌──────────────────────────────────────────────────────────────────────────────────┐
│STRENGTH │CONVERGED DATE │ AM │ LC │RESONANCE      │OPERATIONS THAT AGREE          │
├──────────────────────────────────────────────────────────────────────────────────┤
│  3 ▰▰▱  │2040 CE 05/08  │5934│5152│(PHOENIX NODE) │[X1+oph_round(Y/19)*19]        │
│  2 pairs│  ±8d span     │    │    │(DOCUMENTED)   │[X1+Y+19][X1+Y*360/365.2422]   │
└──────────────────────────────────────────────────────────────────────────────────┘
  ▲ Cinzel 22px violet     ▲ .cspan          (max-height 480px, max 200 rows)
```

### 3.5 Section II — The Wheels

```
II · THE WHEELS — ONE MOMENT, EVERY RECKONING
The Chronicon, read at any instant

┌─ .dialbar ─────────────────────────────────────────────────────────────────────┐
│ YEAR    ERA        MON  DAY                                                    │
│ [2026] [BC|CE ]    [5]  [30]                                                   │
│ ├──────────────────────●─────────────────────────────┤  range −2842 … 2178     │
│ 2843 BC   Flood 2239 BC   1 CE   2040 Phoenix   2178    (accent-color: red)    │
│ [◉ TODAY][→ 2040][→ 2046][→ 2178]                                              │
└────────────────────────────────────────────────────────────────────────────────┘

┌─ .wheelgrid — repeat(auto-fit, minmax(220px,1fr)), gap 12px ───────────────────┐
│ ┌─PHOENIX · SKY DRAGON · 138 YR┐ ┌─NEMESIS X · 792 YR──┐ ┌─ANUNNAKI NER · 600─┐│
│ │ 14 yr to node             ◜ │ │ 128 yr to return  ◜ │ │ PERIOD 20        ◜ ││
│ │ last 1902 CE · next 2040 CE │ │ outside Sol (732-yr)│ │ began 1962 CE · …  ││
│ │ node #45 · 124 yr in        │ │ returns 2154 CE     │ │ ten 60-yr decans   ││
│ │ ▰▰▰▰▰▰▰▰▰▱                  │ │ ▰▰▰▰▰▰▰▱▱▱          │ │ ▰▱▱▱▱▱▱▱▱▱         ││
│ └─────────────────────────────┘ └─────────────────────┘ └────────────────────┘│
│ ┌─ANNUS MUNDI · FROM 3895 BC──┐ ┌─MAYAN LONG-COUNT────┐ ┌─ANUNNA TURNINGS────┐│
│ │ 5920 AM                     │ │ BAKTUN 13/13        │ │ 2,161,742 turnings ││
│ │ Flood node AM 1656 · 80 to  │ │ 1652 CE → 2046 CE   │ │ 6004.8 Draconian…  ││
│ │ AM 6000 · next mirror 5995  │ │ 20 yr to 13.0.0.0.0 │ │ 10.01 NER · 15.01… ││
│ └─────────────────────────────┘ └─▰▰▰▰▰▰▰▰▰▱──────────┘ └────────────────────┘│
│ ┌─METONIC MOON · 19 YR = 235 MOONS──┐   ◜ = .clock::after accent corner glow   │
│ │ Waning Gibbous  · age 18.3d …     │     (88px radial, opacity .13)           │
│ └───────────────────────────────────┘                                          │
└────────────────────────────────────────────────────────────────────────────────┘
```

Clock accent classes (`:153-154`): `.c-phx`→red, `.c-nem`→violet, `.c-ner`→green,
`.c-am`→gold, `.c-may`→cyan, `.c-anu`→gold2, `.c-moon`→`#8fb0c9`.
`.c-am`, `.c-anu`, `.c-moon` have **no** `.bar` element (`:494`, `:496`, `:497`).

### 3.6 Section III — The Ledger, IV — Method, footer

```
III · THE LEDGER — THE DOCUMENTED CHRONOLOGY                              simple-hide
The Chronicon event record
The full dated spine… — 69 events. Click seed on any row…

▸ BROWSE THE EVENT RECORD    filter by Phoenix · Nemesis · NER · baktun …
   [ALL][KEY][PHOENIX][NEMESIS][NER][BAKTUN][NOTES]
   ┌────────────────────────────────────────────────────────────────────────────┐
   │ YEAR          │ AM   │PHX│ EVENT                              │            │
   │ ● 5239 BC     │-1344 │ · │ Nemesis Cataclysm — Nemesis…       │[seed ⚓]   │
   │ ● 4309 BC ⮌   │ -414 │ ● │ Phoenix named (Trimorphic…)        │[seed ⚓]   │
   │  … (max-height 520px scroll, all 69 rows, no cap)                          │
   └────────────────────────────────────────────────────────────────────────────┘

IV · METHOD & LINEAGE                                                     simple-hide
How the cast is weighed
▸ THE SCORING RULES, CONSTANTS & THE ECHO FILTER
   ┌ V8 · Chronology-first ─┐ ┌ V7 · Numbers-first ────┐
   ┌ The constants & funcs ─┐ ┌ ECHO & the novel filter┐
┌ cyan note-card: "The recursion, noted not asserted" ──────────────────────────┐

──────────────────────────────────────────────────────────────────────────────── 
NATORI-ON-PSYFR · The Predictive Chronology Engine. … You Are Here: 25 Aug 2026 CE
= AM 5920 = LC 5138 = 7264 yr after the Nemesis Cataclysm.        (mono 10.5px dim)
```

### 3.7 PSYFR2 — Field Guide layout (920px column)

```
┌ NATORI-ON-PSYFR · Field Guide │ Quick Start Concepts Formulas Grammar Tags       ┐
│                                 Examples FAQ ↖ Ophis ↗ Engine  [A−AA+][☾ Dark]  │
        THE OPERATOR'S CODEX · COMPANION TO THE ENGINE
                        Field Guide                    (h1 clamp(30,7vw,62)px)
        HOW TO READ THE SERPENT · FORMULAS TO POP INTO THE FIELDS

§1 · QUICK START — Cast in four moves
  ⓵ ┌ Seed your anchors ──────────────────────────────────────┐  (.step, CSS counter,
  ⓶ ┌ Choose your operations ─────────────────────────────────┐   42px circle numeral)
  ⓷ ┌ Cast the Oracle ────────────────────────────────────────┐
  ⓸ ┌ Read the agreement ─────────────────────────────────────┐
  ┌ cyan note-card: "The one habit that matters" ─────────────┐

§2 · THE VOCABULARY — Seven words to know
  ┌ X-DATE ─┐┌ Y · THE INTERVAL ─┐┌ OPERATION ─┐┌ Z-DATE ─┐   (auto-fit minmax 230px)
  ┌ ECHO ───┐┌ CONVERGENCE ──────┐┌ MSRF ──────┐

§3 · THE FORMULA COOKBOOK   (6 groups, 22 formulas)
  Isometric ── the baseline — the same interval, again
  ┌────────────────────────────────────────────────────────────────────────┐
  │ [ X2+oph_round(Y)                                        ]  [ COPY ]   │
  │ The Isometric Date. Project the exact interval forward…                │
  └────────────────────────────────────────────────────────────────────────┘

§4 · THE GRAMMAR & CONSTANTS   (9-row token table)
§5 · READING THE RESONANCE     (10-item tag glossary, .tagkey grid minmax 260px)
§6 · WORKED EXAMPLES           (3 × .ex cards: setup / ol steps / green result rule)
§7 · FAQ                       (9 × <details>, summary::before '+' → '–')
```

---

## 4. EVERY INTERACTIVE CONTROL

### 4.1 Nav bar

| Control | id / selector | Behaviour | Code |
|---|---|---|---|
| 6 nav links | `nav a[data-go]` | `$(a.dataset.go).scrollIntoView({behavior:'smooth'})`. Targets: `oracle`, `convergence`, `wheels`, `ledger`, `about` | `:294`, `:1165` |
| 📖 Field Guide | `a[href="PSYFR2.html"]` | opens `PSYFR2.html` in new tab (`target=_blank rel=noopener`) | `:294`, `:313` |
| A− | `#tsDown` | `_zoom = max(0.8, round((_zoom-0.1)*10)/10)`; sets `--zoom`; persists | `:1183` |
| A | `#tsReset` | `_zoom = 1` | `:1184` |
| A+ | `#tsUp` | `_zoom = min(1.5, round((_zoom+0.1)*10)/10)` | `:1182` |
| ✦ Simple / ⛭ Full view | `#modeBtn` | toggles `body.simple`; label + `aria-pressed` flip; toast; persists | `:1187-1193` |
| ☾ Dark / ☀ Light | `#themeBtn` | toggles `documentElement[data-theme]`; persists | `:1173-1181` |

### 4.2 Anchor panel

| Control | id | Behaviour | Code |
|---|---|---|---|
| Year | `#aYear` | `number`, min 1 max 9999. Read as `Math.abs(+val \|\| 1)` | `:346`, `:969` |
| Era BC/CE | `#aEra button[data-era]` | sets module var `aEra`; BC ⇒ astronomical year `1 - yv` | `:348`, `:973-974` |
| Mon | `#aMon` | clamped `min(12, max(1, +val \|\| 1))` | `:350`, `:970` |
| Day | `#aDay` | clamped `min(31, max(1, +val \|\| 1))` — **no month-length check** | `:351`, `:970` |
| Label | `#aLabel` | free text, `.trim()`; falls back to `fmtYear(ay)` | `:352`, `:951` |
| + Add | `#addAnchor` | `addAnchorObj(...)`, clears label | `:353`, `:968-972` |
| Seed dropdown | `#seedSel` | populated with all `E[]` entries **except `kind==='note'`** (61 of 69). On change: adds anchor, toasts, resets to `''` | `:357`, `:1001-1007` |
| Row ✓ | `.arow .chk` | toggles `a.enabled`; re-renders | `:962` |
| Row ✕ | `.arow .xbtn` | `anchors.splice(i,1)`; re-renders | `:963` |

### 4.3 Operations panel (`simple-hide`)

| Control | id | Behaviour | Code |
|---|---|---|---|
| reset 19 | `#resetOps` | `loadDefaultOps()` + toast `'19-operation pack restored'` | `:992` |
| fold | `details.fold.bare` | native `<details>`; `▸`/`▾` marker | `:365`, `:202-203` |
| Custom operation | `#opInput` | Enter key triggers `#addOp` | `:372`, `:998` |
| + Operation | `#addOp` | `compileOp(eq)`; on success push + clear; on failure write `'✕ '+err.message` to `#opErr` | `:993-997` |
| Row ✓ / ✕ | `.chk` / `.xbtn` | toggle `o.enabled` / splice | `:983-984` |

### 4.4 Scoring lens, packs, config (`simple-hide`)

| Control | id | Behaviour | Code |
|---|---|---|---|
| V8 / V7 | `#sysTog button[data-sys]` | `curSystem = SCORING[dataset.sys]`; rewrites `#sysNote`; **if `lastResults.length` → `recast()` + toast** | `:1010-1014` |
| 5 pack buttons | `#packBar` (generated) | `loadPack(name)` — replaces `ops` wholesale, re-renders, toasts, recasts if results exist | `:1197-1200`, `:887-892` |
| ⤓ Save .json | `#saveCfg` | `saveConfig()` → Blob download `Natori-On-PSYFR-config-<Date.now()>.json` | `:1201`, `:893-901` |
| ⤒ Load | `#loadCfg` | proxies click to hidden `#loadFile` | `:1202` |
| (file input) | `#loadFile` | `accept="application/json,.json"`; FileReader → `applyConfig(JSON.parse(...))`; recasts; clears `value` | `:399`, `:1203-1204` |

### 4.5 Cast + results

| Control | id | Behaviour | Code |
|---|---|---|---|
| ⟳ Cast the Oracle | `#castBtn` | guards: `<2` active anchors → toast + abort; `<1` active op → toast + abort. Else `recast()`, toast `'<n> projections cast (V8)'`, scroll to `#wheels` | `:1018-1024` |
| 8 filter buttons | `#resFilt button[data-k]` | sets `resFilter`, re-renders. Keys: `all`,`novel`,`phx`,`ev`,`pal`,`met`,`ecl`,`future` | `:411-418`, `:1061-1062` |
| 6 sortable headers | `#resTable th[data-sort]` | same key → flip `sortDir`; new key → `sortDir = (k==='score') ? -1 : 1`. Keys: `score`,`date`,`am`,`lc`,`op`,`y` | `:428-429`, `:1063-1064` |
| Result row | `tr.zr` | `selZ = r.zjd`; `setDialFromAstro(r.ay,r.m,r.d)`; re-render; scroll to `#wheels` | `:1057` |
| ⤓ CSV | `#exportCsv` | exports **all** `lastResults` (not the filtered view) as `Natori-On-PSYFR-cast-<V8\|V7>-<Date.now()>.csv` | `:1065-1073` |

### 4.6 Convergence

| Control | id | Behaviour | Code |
|---|---|---|---|
| Agreement window | `#convTolSel` | values `0`,`1`,`7`,`30`(selected),`90`,`year`; sets `convTol`; re-renders if results exist | `:446-453`, `:1205` |
| Convergence row | `tr.zr` | `selZ = c.centerJD`; sets dial from cluster centre; re-renders both tables; scroll to `#wheels` | `:938` |

### 4.7 Wheels dial

| Control | id | Behaviour | Code |
|---|---|---|---|
| Year / Mon / Day | `#dYear` `#dMon` `#dDay` | `input` event → `renderWheels()` | `:1135` |
| Era BC/CE | `#dEra button[data-era]` | sets `dEra`; `renderWheels()` | `:1133-1134` |
| Slider | `#dSlider` | `min=-2842 max=2178 step=1`; `input` → `setDialFromAstro(+val, dMon\|\|5, dDay\|\|30)` | `:478`, `:1136` |
| ◉ TODAY | `#dToday` | `setDialFromAstro(TODAY.y, TODAY.m, TODAY.d)` | `:1137` |
| → 2040 / 2046 / 2178 | `button[data-jy][data-je]` | jumps to `(year, 5, 15)` | `:484-486`, `:1138` |

### 4.8 Ledger (`simple-hide`)

| Control | Behaviour | Code |
|---|---|---|
| 7 filter buttons `#ledFilt` | `buildLedger(dataset.k)`; `'all'` = no filter, else exact `kind` match. Keys: `all`,`key`,`phx`,`nem`,`ner`,`may`,`note` | `:511-513`, `:1161-1162` |
| `seed ⚓` per row | `stopPropagation()`, then `addAnchorObj(a, sd.m, sd.d, label)` + toast | `:1156` |
| Row click | `setDialFromAstro(a, sd.m, sd.d)` + scroll to `#wheels` | `:1157` |

### 4.9 PSYFR2 controls

| Control | Behaviour | Code |
|---|---|---|
| `.copybtn` **and** `<code>` in each `.frow` | Both fire `copyText`. `navigator.clipboard.writeText` with a `document.execCommand('copy')` textarea fallback. Button label → `'copied ✓'` + `.done` (green) for **1300 ms** | `PSYFR2.html:419-430` |
| 9 `<details>` FAQ | native, `+`/`–` marker | `PSYFR2.html:112-117` |
| A−/A/A+, ☾/☀ | identical to Main UI, **shares the same `localStorage` keys** | `PSYFR2.html:436-446` |
| `[data-go]` links | smooth scroll (guards `if(el)`) | `PSYFR2.html:433` |

> `PSYFR2.html:168` links `↖ Ophis → OPHIS.html` and `↗ Engine → PSYFR1.html`. The Main UI
> links back to `PSYFR2.html`. **The cross-links use the `PSYFR*.html` names, not the
> `NATORI-ON-PSYFR-*.html` names**, so the shipped zip (which renames them) has different
> link targets — see §11 G-14.

---

## 5. JS ARCHITECTURE

One `<script>` (`:584-1217`), no modules, no build step, no framework. Everything is a
top-level `const`/`let`/`function` in global scope. Rendering is
`innerHTML` string templating into fixed DOM ids. There is no virtual DOM, no reactivity,
and no event delegation beyond container-level `onclick` handlers.

### 5.1 Constants

```js
const SYN = 29.530588853;          // synodic month, days                       :588
const NEWMOON_J2000 = 2451550.1;   // reference new moon JD                     :588
const OPH_PHI = 1.61803398875;     // golden ratio                              :589
const OPH_PI  = 3.14;              // "Archaix pi"                              :589
const OPH_CRV = 5.08;              // curvature constant                        :589
const AM_OFFSET  = 3894;           // Annus Mundi   = astroYear + 3894          :604
const LC_OFFSET  = 3112;           // Long-Count yr = astroYear + 3112          :604
const CAT_OFFSET = 5238;           // yr since Nemesis Cataclysm                :604
const AM_EPOCH = jdn(-3894,1,1);   // JD of Anunna turning zero                 :606
const ECL_S_BASE = 1721231;        // first solar eclipse JD                    :616
const ECL_L_BASE = 1721068;        // first lunar eclipse JD                    :619
const MAY_NODES = [-3112,-2712,-2312,-1912,-1512,-1112,-712,-318,
                    76,470,864,1258,1652,2046];   // 14 entries                 :607
const ECL_TYPE_NAME = {T:'total',A:'annular',P:'partial',H:'hybrid'};          // :627
const SCORING = {V8:'V8', V7:'V7'};                                            // :728
const _NOW = new Date();
const TODAY = {y:_NOW.getFullYear(), m:_NOW.getMonth()+1, d:_NOW.getDate()};   // :590
const TODAY_JD = jdn(TODAY.y,TODAY.m,TODAY.d);   // computed but NEVER USED    // :603
```

> **`AM_OFFSET` is 3894, but every human-readable string says "from 3895 BC" / "AM = 3895 −
> BC year"** (`:494`, `:578`). Both are correct: 3895 BC is astronomical year −3894. Do not
> "fix" one to match the other.

### 5.2 The MSRF resonance set

```js
const MSRF = new Set([19,12,21,24,36,40,42,48,49,54,56,60,63,66,72,76,84,90,96,108,114,119,120,126,132,
 133,135,138,140,144,147,153,162,168,180,189,207,216,222,234,252,270,276,288,297,306,315,324,330,360,
 378,414,432,441,459,468,504,540,552,567,576,594,600,612,648,666,693,720,756,792,810,828,831,864,882,
 918,936,954,972,990,1080,1134,1138,1260,1296,1380,1656]);                      // :610-613
```

**87 members** (not 90 — verified by `new Set(...).size`). Comment claims "Ophis
NORMAL+IMPORTANT key members + 19".

Differential against the real Ophis tables in `src/ophis_model__params.js:17-46`
(`MSRF_FILTER__NORMAL` 325 members + `MSRF_FILTER__IMPORTANT` 53 members = 378 union):

- 85 of 87 browser members **are** in the src union.
- **2 are not: `19` and `1138`.**
- `19` is documented as a deliberate addition (`:566`, `:609`).
- **`1138` is undocumented and appears nowhere in Ophis.** It sits directly beside `1134`
  (a genuine `IMPORTANT` member) in the literal. Almost certainly either a typo for `1134`
  or an unlabelled "138-flavoured" insertion. Flag it; do not silently reproduce it as
  canonical.
- `MSRF_FILTER__VORTEX` (`[21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4,
  762.3, 871.2]`, matched with `VORTEX_FILTER_MATCH_TOLERANCE = .1`) is **entirely absent**
  from the browser build.

### 5.3 Date math

```js
function mod(n,m){return((n%m)+m)%m;}                                           // :591

// Proleptic Gregorian JDN from astronomical year (0 = 1 BC, -1 = 2 BC)
function jdn(ay,m,d){
  const a=Math.floor((14-m)/12), y=ay+4800-a, mm=m+12*a-3;
  return d+Math.floor((153*mm+2)/5)+365*y+Math.floor(y/4)
          -Math.floor(y/100)+Math.floor(y/400)-32045;
}                                                                               // :592-593

function jdToDate(J){ /* returns {year, month, day}, J rounded first */ }        // :594-597
function fmtYear(a){return a<=0?(1-a)+" BC":a+" CE";}                           // :598
function isPalindrome(n){const s=String(Math.abs(Math.round(n)));
  return s.length>1 && s===s.split("").reverse().join("");}                      // :599
```

**`isPalindrome` requires `length > 1`** — single-digit values are never palindromes.

### 5.4 The `oph_*` function family

```js
function oph_flip(v){
  let s=v+""; let dot=s.indexOf("."); s=s.replace(".","");
  let r=s.split("").reverse();
  if(dot>0) r.splice(dot,0,".");
  return Number(r.join(""))||0;
}                                                                               // :600
function oph_round(v){return Math.round(v);}
function oph_floor(v){return Math.floor(v);}
function oph_ceil (v){return Math.ceil(v);}                                     // :601
function oph_abs  (v){return Math.abs(v);}
function oph_sqrt (v){return Math.sqrt(Math.abs(v));}   // abs FIRST, never NaN  // :602
```

Measured `oph_flip` behaviour (executed, not inferred):

| input | output | why |
|---|---|---|
| `138` | `831` | plain digit reversal |
| `19` | `91` | |
| `120` | `21` | reversed `"021"` → `Number` drops leading zero |
| `100` | `1` | `"001"` → 1 |
| `1000` | `1` | |
| `-138` | **`0`** | `"831-"` → `NaN` → `\|\|0` |
| `-19` | **`0`** | sign is destroyed, not preserved |
| `0` | `0` | |
| `1.5` | `5.1` | dot re-inserted at the **original** index, not the mirrored one |
| `0.5` | `5` | `"0.5"`→`"05"`→`"50"`→splice at 1→`"5.0"`→`5` |
| `12.34` | `43.21` | |
| `2451545` | `5451542` | |
| `1e21` | **`0`** | `"1e+21"` reverses to `"12+e1"` → `NaN` → 0 |

### 5.5 Eclipse tables — delta-encoded

Four literals (`:616-621`), decoded once at load:

```js
function _decodeEcl(base,dstr,tstr){
  const ds=dstr.split(",");
  let jd=base, J=[jd], T=[tstr[0]];
  for(let i=0;i<ds.length;i++){ jd+=+ds[i]; J.push(jd); T.push(tstr[i+1]); }
  return {J,T};
}                                                                               // :623
const ECL_S=_decodeEcl(ECL_S_BASE,ECL_S_D,ECL_S_T);   // :624
const ECL_L=_decodeEcl(ECL_L_BASE,ECL_L_D,ECL_L_T);   // :625
const ECL_MIN_JD=ECL_S.J[0], ECL_MAX_JD=ECL_S.J[ECL_S.J.length-1];   // :626
```

Measured table properties:

| | Solar (`ECL_S`) | Lunar (`ECL_L`) |
|---|---|---|
| base JD | 1721231 | 1721068 |
| deltas | 7126 | 4623 |
| entries | **7127** | **4624** |
| first date | 0000-06-20 (= 1 BC) | 0000-01-09 (= 1 BC) |
| last date | 3000-10-19 | 2999-11-14 |
| type chars | `P`×2502, `A`×2411, `T`×1918, `H`×296 | `T`×2087, `P`×2537 |
| min delta | 11 d | 11 d |
| max delta | **33104 d** | **32927 d** |

The type string length exactly equals `deltas+1` in both tables — no off-by-one.

**Both tables contain a ~90-year hole:**
- Solar: `0009-07-10 → 0100-02-27` (33104 d ≈ 90.6 yr), delta index 23.
- Lunar: `0009-12-20 → 0100-02-13` (32927 d ≈ 90.1 yr), delta index 16.

So **10 CE – 99 CE has zero eclipse data**, contradicting the Field Guide's
"data covers ~1–3000 CE" (`PSYFR2.html:305`, `:381`).

```js
function _eclHit(tbl,jd,tol){        // binary search, returns type char or null
  let lo=0,hi=tbl.J.length-1,best=null;
  while(lo<=hi){const mid=(lo+hi)>>1;const v=tbl.J[mid];
    if(Math.abs(v-jd)<=tol){best=tbl.T[mid];break;}
    if(v<jd)lo=mid+1;else hi=mid-1;}
  return best;
}                                                                               // :628-634
function eclipseNear(jd,tol){return {solar:_eclHit(ECL_S,jd,tol), lunar:_eclHit(ECL_L,jd,tol)};}  // :635-637
```

A plain binary search with a tolerance is **not** generally correct, but it is correct
*here*: `tol=1` at the only call site (`:805`) and the minimum table delta is 11, so at most
one entry can ever be within tolerance and the search necessarily lands on it. Verified by a
60,000-probe differential test against brute force: **0 mismatches**. Preserve the
`min-delta ≥ 2·tol+1` invariant if you change the tolerance.

### 5.6 Chronology readouts

```js
function phxInfo(a){const last=a-mod(a-108,138), next=last+138;
  return{node:mod(a,138)===108, last, next, into:a-last, to:next-a};}           // :717
function nemInfo(a){const off=mod(a-462,792), inner=off<60, ep=a-off;
  return{inner, off, enter:ep, exit:ep+60, next:ep+792};}                        // :718
function nerInfo(a){const off=mod(a-162,600), start=a-off;
  return{num:Math.floor((a+5238)/600)+1, start, off, next:start+600};}           // :719
function mayInfo(a){ /* index into MAY_NODES, -1 if before, 13 if at/after 2046 */ } // :720
function moonInfo(ay,m,d){
  const J=jdn(ay,m,d); let age=mod(J-NEWMOON_J2000,SYN); const frac=age/SYN;
  const names=['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous',
               'Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'];
  return{age, frac, illum:(1-Math.cos(2*Math.PI*frac))/2,
         name:names[Math.floor(mod(frac+1/16,1)*8)%8],
         lun:Math.round((J-2423436.40347)/SYN)};
}                                                                               // :721-723
```

`nerInfo.num` uses epoch `-5238` while `off` uses `mod(a-162,600)`. These agree because
`-5238 ≡ 162 (mod 600)`. Not a bug.

The `+1/16` in the phase-name index rotates the 8 phase buckets by half a bucket so that
"New Moon" is centred on age 0 rather than starting there.

### 5.7 `compileOp(eqRaw)` — the operation grammar

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
  let fn;
  try{fn=new Function('Y','OPH_PHI','OPH_PI','OPH_CRV','oph_flip','oph_round',
                      'oph_floor','oph_ceil','oph_abs','oph_sqrt','return '+body+';');}
  catch(e){throw new Error("syntax error");}
  let t=fn(1000,OPH_PHI,OPH_PI,OPH_CRV,oph_flip,oph_round,oph_floor,oph_ceil,oph_abs,oph_sqrt);
  if(typeof t!=='number'||!isFinite(t))throw new Error("does not evaluate to a number");
  return {start, fn:(Y)=>fn(Y,OPH_PHI,...)};
}                                                                               // :729-744
```

**Signature:** `(string) -> {start:'X1'|'X2', fn:(Y:number)=>number}`. Throws `Error` with
one of four messages: `"must start with X1+ or X2+"`, `"illegal token in equation"`,
`"syntax error"`, `"does not evaluate to a number"`.

Steps in order:
1. Strip all whitespace; normalise `×` (U+00D7) → `x`.
2. Require the literal prefix `X1+` or `X2+` (case-sensitive).
3. `body = eq.slice(3)` then **replace every lowercase `x` with `*`** globally.
4. Build a `test` string by collapsing the three constants → `1`, the six `oph_*` names → `f`,
   and `Y` → `1`.
5. Reject if `test` contains anything outside `[0-9+\-*/().f]`.
6. Compile `body` with `new Function`. Only *syntax* errors are wrapped.
7. Smoke-test with `Y = 1000`; require a finite `number`.

**This validator is genuinely tight.** I fuzzed it; every injection attempt is rejected:

| input | result |
|---|---|
| `X1+(function(){return 1})()` | REJECTED: illegal token |
| `X1+globalThis.process.exit(1)` | REJECTED: illegal token |
| `X1+eval('1')` | REJECTED: illegal token |
| `X1+this.constructor` | REJECTED: illegal token |
| `X1+[].constructor` | REJECTED: illegal token |
| `X1+require('fs')` | REJECTED: illegal token |
| `` X1+`${1}` `` | REJECTED: illegal token |
| `X1+1;process.exit(1);//` | REJECTED: illegal token |
| `X1+1/*c*/+1` | REJECTED: illegal token |
| `X1+Y.toString()` | REJECTED: illegal token |
| `X1+Y//comment` | REJECTED: illegal token |
| `x1+Y` | REJECTED: must start with X1+ or X2+ |

The reason it holds: after step 4 the only letters that can survive are `f`, which can only
originate from an exact `oph_*` name (or a bare literal `f`, which then fails the smoke test
with a `ReferenceError`). This is materially **safer than the Electron original**, where
`src/ophis_model__validation.js:158` compiles a differently-derived string than the one it
validated (README finding #1).

Two accepted-but-surprising cases:

| input | result | why |
|---|---|---|
| `X1+0x41` | **compiles to `0*41` = 0** | step 3 rewrites the `x` in the hex literal |
| `X1+1e3` | REJECTED: illegal token | `e` is not in the allowed character class — **no scientific notation** |
| `X1+.5` | OK → `0.5` | leading-dot decimals are legal |
| `X1+f` | REJECTED: `"f is not defined"` | raw `ReferenceError.message` leaks to `#opErr`; the `try/catch` at step 6 does not cover step 7 |

### 5.8 `scoreZDate(ZA, J, system)`

**Signature:** `(astroYear:number, julianDay:number, 'V8'|'V7') -> {pts:number, tags:[string,string][], met:boolean}`
Pure; no side effects. `tags` entries are `[displayText, cssClass]`.

Predicates (`:748-756`):

```js
const A=am(ZA), L=lcYear(ZA), absY = ZA<=0 ? (1-ZA) : ZA;
const ph=phxInfo(ZA);
const isNode = ph.node;                       // mod(ZA,138)===108
const near   = Math.min(ph.into,ph.to) <= 2;  // within 2 yr of a node
const isDoc  = EVENT_YEARS.has(ZA);           // exact astro-year match in the ledger
const isPal  = isPalindrome(absY) || isPalindrome(A) || isPalindrome(J);
const has138 = String(L).includes('138') || String(A).includes('138') || String(absY).includes('138');
const has19  = String(absY).includes('19') || String(A).includes('19');   // NOT L
const metonic= mod(TODAY.y - ZA, 19) === 0;
const nem = nemInfo(ZA).inner;                // within the 60-yr inner transit
const ner = nerInfo(ZA).off === 0;            // exactly on a NER boundary
const bak = MAY_NODES.includes(ZA);
```

Tag constants (`:757-758`):

```js
PHX =['PHOENIX NODE','phx']   NEAR=['≈PHOENIX','phx']   DOC =['DOCUMENTED','ev']
PAL =['PALINDROME ⮌','pal']   T138=['138','s138']       T19 =['19','s19']
MET =['METONIC·19','met']     NEM =['NEMESIS','nem']    NER =['NER NODE','ner']
BAK =['BAKTUN','bak']
```

Two more tag shapes are appended later in `cast()`: `['MSRF','msrf']`, `['ECHO','echo']`,
`['☉ SOLAR '+name,'sol']`, `['☾ LUNAR '+name,'lun']`.

**Weight tables** — evaluation order matters only for tag order, not the total:

| Predicate | V8 (`:768-774`) | V7 (`:760-766`) |
|---|---:|---:|
| Phoenix node | **+5** | +2 |
| ≈Phoenix (±2 yr, `else if`) | +2 | +1 |
| Documented | **+5** | +1 |
| Palindrome | +3 | **+4** |
| Metonic-19 | +2 | +2 |
| 138 in digits | +2 | **+4** |
| 19 in digits | +1 | +2 |
| Nemesis inner | +1 | +1 |
| NER node | +1 | +1 |
| Baktun | +1 | +1 |
| **MSRF** (added in `cast`, `:800`) | **+2** | **+3** |
| **Solar eclipse ±1 d** (`:806`) | +2 | +2 |
| **Lunar eclipse ±1 d** (`:807`) | +1 | +1 |

Phoenix node and ≈Phoenix are mutually exclusive (`else if`). Everything else stacks.
Theoretical maxima: **V8 = 23**, **V7 = 22**.

The returned `met` flag is `metonic || has19` (`:776`) — this is what the `19·METONIC`
result filter tests, so that filter matches *either* a true Metonic alignment *or* the
substring `"19"`.

### 5.9 `cast(anchors, ops, system)`

**Signature:** `(Anchor[], Op[], 'V8'|'V7') -> Result[]`. Pure. `:779-814`

```
1. A = anchors.filter(enabled); O = ops.filter(enabled)
2. anchorJDs = A.map(a => a.jd)
3. for i in 0..A.length-1, for k in 0..i-1:          // unordered pairs, k < i
     x1 = A[k], x2 = A[i]                            // A is kept JD-sorted, so x1 is EARLIER
     Y  = Math.abs(x2.jd - x1.jd)
     if (Y < 1 || Y > 3_000_000) continue            // ~8200 yr ceiling
     for each op in O:
       off = op.fn(Y)                                // try/catch → continue on throw
       if (!isFinite(off)) continue
       baseJD = (op.start === 'X1') ? x1.jd : x2.jd
       ZJD    = Math.round(baseJD + off)
       zd     = jdToDate(ZJD)
       if (zd.year < -5400 || zd.year > 4000) continue      // SILENT DROP
       key = ZJD + '|' + op.eq + '|' + x1.jd + '|' + x2.jd
       if (seen.has(key)) continue; seen.set(key,1)
       sc = scoreZDate(zd.year, ZJD, system)
       offAbs = Math.abs(Math.round(off))
       if (MSRF.has(Y) || MSRF.has(offAbs)) { sc.pts += (V7 ? 3 : 2); tag MSRF }
       echo = anchorJDs.some(jd => Math.abs(jd - ZJD) <= 1)
       if (echo) tag ECHO                            // tag only, no score change
       if (ECL_MIN_JD <= ZJD <= ECL_MAX_JD) {
         ecl = eclipseNear(ZJD, 1)
         if (ecl.solar) { solar = ECL_TYPE_NAME[..]; sc.pts += 2; tag '☉ SOLAR <name>' }
         if (ecl.lunar) { lunar = ECL_TYPE_NAME[..]; sc.pts += 1; tag '☾ LUNAR <name>' }
       }
       push Result
4. results.sort((a,b) => b.score - a.score || a.zjd - b.zjd)   // score DESC, then JD ASC
```

Complexity: `O(pairs × ops)` = `O(n²/2 × m)`. Fully synchronous — no worker, no chunking.

**The eclipse-window guard uses the SOLAR table's bounds for both lookups** (`:805`,
`:626`). Since `ECL_L_BASE (1721068) < ECL_S_BASE (1721231)`, the 163 days of lunar data
before the solar epoch are permanently unreachable.

### 5.10 `findConvergences(results, tol)`

**Signature:** `(Result[], number|'year') -> Convergence[]`. `:819-850`

```
if tol === 'year':
    cluster by r.ay exactly (Map<astroYear, Result[]>)
else:
    sorted = [...results].sort(by zjd ASC)
    greedy chain: append to current cluster while
        r.zjd - cur[cur.length-1].zjd <= tol
    otherwise start a new cluster
```

Then per cluster: `centerJD = round(mean(zjd))`, `nOps = |Set(op)|`,
`nPairs = |Set(x1+' → '+x2)|`, `spanDays = max - min`, `bestScore = max(score)`,
`tags` = union of all non-`echo` tags (Map keyed by display text, so last class wins),
`allEcho = every(i => i.echo)`.

Filter: `.filter(c => c.nOps >= 2)` — **a cluster of many results from a single operation
never qualifies.**

Sort (`:849`): `nOps DESC, bestScore DESC, spanDays ASC, centerJD ASC`.

> **The chaining is transitive, not a fixed window.** With `tol = 30`, results at JD
> `X`, `X+30`, `X+60`, `X+90` all land in one cluster spanning 90 days. The rendered
> `±Math.ceil(spanDays/2)d span` label (`:931`) is the only hint. This is a deliberate
> single-pass design, but it means the "Agreement window" is a *link* distance, not a
> *cluster* diameter.

`renderConvergence` (`:919-941`) calls it with `lastResults.filter(r => !r.echo)` — **echoes
are excluded from convergence entirely**, so the `allEcho` field it computes is always
`false` and is dead. Renders at most **200** rows (`:927`).

### 5.11 State

```js
let anchors = [];        // Anchor[], kept sorted by jd ASC              :943
let ops     = [];        // Op[]                                        :943
let lastResults = [];    // Result[]                                    :943
let resFilter = 'all';   // one of the 8 filter keys                    :943
let sortKey = 'score';   // score|date|am|lc|op|y                       :943
let sortDir = -1;        // 1 | -1                                      :943
let selZ = null;         // selected ZJD (or convergence centerJD)      :943
let curSystem = SCORING.V8;                                             :944
let aEra = 'ad', dEra = 'ad';                                           :944
let convTol = 30;        // number | 'year'                             :918
let lastConv = [];       // Convergence[]                               :918
// closure-scoped inside init():  _zoom (0.8..1.5), _theme, _mode        :1170-1193
```

Persistence — three `localStorage` keys, all wrapped in `try/catch`:

| Key | Values | Code |
|---|---|---|
| `ophion-theme` | `'light'` \| `'dark'` | `:1175`, `:1178` |
| `ophion-zoom` | float `0.8`–`1.5` | `:1176`, `:1177` |
| `ophion-mode` | `'simple'` \| `'full'` | `:1189`, `:1190` |

**`PSYFR2.html` reads/writes the same `ophion-theme` and `ophion-zoom` keys**
(`PSYFR2.html:437-441`) so the two pages stay visually in sync. It ignores `ophion-mode`.

**Nothing else persists.** Anchors, operations, the scoring lens and the convergence window
are lost on reload unless explicitly saved to `.json`.

### 5.12 Render pipeline

| Function | Writes into | Cap | Code |
|---|---|---|---|
| `renderAnchors()` | `#anchorList`, `#anchorCount` | none | `:955-967` |
| `renderOps()` | `#opList` | none | `:977-987` |
| `renderResults()` | `#resBody`, `#resCount` | **500 rows** | `:1036-1060` |
| `renderConvergence()` | `#convBody`, `#convCount` | **200 rows** | `:919-941` |
| `renderWheels()` | 21 ids: `mY mAM mLC mCat mEv flag* w*` | — | `:1084-1131` |
| `buildLedger(filter)` | `#ledBody` | none (all 69) | `:1143-1160` |
| `recast()` | `lastResults` then both tables | — | `:1017` |
| `setDialFromAstro(ay,m,d)` | dial inputs + `renderWheels()` | — | `:1078-1082` |
| `toast(msg)` | `#toast`, auto-hide 1900 ms | — | `:946` |

Every renderer rebuilds `innerHTML` from scratch, then attaches `onclick` per row.
`#resCount` shows `"<filtered> / <total> shown"`; note this counts *filtered* rows, not
*rendered* rows, so it lies once the 500-row cap bites.

### 5.13 Packs, save/load

```js
const DEFAULT_OPS = [ /* 19 strings */ ];                                       // :856-863
const PACKS = {
  "Default 19":            DEFAULT_OPS,          // 19 ops
  "138 Pack":              [ /* 12 ops */ ],     // :870-873
  "19 Metonic Pack":       [ /* 11 ops */ ],     // :874-877
  "Phoenix Lattice Pack":  [ /* 10 ops */ ],     // :878-881
  "Golden Pack":           [ /* 10 ops */ ]      // :882-885
};
```

The five pack buttons are generated from `Object.keys(PACKS)` in insertion order (`:1197-1200`).

`saveConfig()` (`:893-901`) emits:

```jsonc
{
  "app": "OPHION",                 // NOT "NATORI-ON-PSYFR" — stale brand
  "v": 3,
  "saved": "2026-08-25T…Z",        // ISO
  "system": "V8",                  // curSystem
  "convTol": "30",                 // String(convTol) — always a STRING
  "anchors": [ {"ay":-2238,"m":5,"d":15,"label":"Great Flood","enabled":true} ],
  "ops":     [ {"eq":"X2+oph_round(Y)","enabled":true} ]
}
```

Filename: `Natori-On-PSYFR-config-<Date.now()>.json`.

`applyConfig(obj)` (`:902-913`):
- Anchors: recomputes `jd` from `ay/m/d`, re-sorts, `enabled !== false` (so missing = true).
- Ops: recompiles each `eq`; **silently drops any that fail to compile**.
- System: anything other than `'V7'` becomes `V8`; updates the toggle DOM directly.
- `convTol`: `'year'` stays a string; otherwise `+obj.convTol`, falling back to `30` on `NaN`.
- Whole body wrapped in `try/catch` → toast `'Load failed: bad file'`.
- **`app` and `v` are never validated.** Any JSON with an `anchors` or `ops` key loads.

`#loadFile.onchange` (`:1203-1204`) additionally catches `JSON.parse` failure → `'Invalid JSON'`,
and clears `e.target.value` so the same file can be re-picked.

### 5.14 CSV export

Header (`:1067`, 17 columns):

```
score,system,echo,solar_eclipse,lunar_eclipse,projected_date,era_year,month,day,
annus_mundi,long_count,julian_day,operation,Y_rotations,x1,x2,resonance
```

Quoting helper: `const q = s => '"' + String(s).replace(/"/g,'""') + '"'` (`:1068`) —
applied to `op`, `x1`, `x2`, `resonance`. Resonance joins tag display texts with `' | '`.
`echo` column is the literal string `'echo'` or `'novel'`.

`NatoriOphis.html:740-741` has the **15-column** ancestor (no `solar_eclipse`/`lunar_eclipse`)
and a naïve `'"'+r.op+'"'` with **no quote escaping** — an injection/corruption bug fixed in
the Main UI.

Exports **`lastResults`, ignoring `resFilter` and `sortKey`** (`:1069`).

### 5.15 Init sequence (`:1170-1216`)

1. Theme: read `ophion-theme`; if not `'light'`/`'dark'`, fall back to
   `matchMedia('(prefers-color-scheme: light)')` → `'light'` else `'dark'`. Apply.
2. Zoom: read `ophion-zoom`; accept only `0.8 ≤ z ≤ 1.5`. Apply.
3. Wire `#themeBtn`, `#tsUp/#tsDown/#tsReset`.
4. Mode: read `ophion-mode`; `'simple'` → `body.simple`. Wire `#modeBtn`.
5. Generate the 5 pack buttons; wire `#saveCfg`, `#loadCfg`, `#loadFile`, `#convTolSel`.
6. `loadDefaultOps()`.
7. Seed three anchors, in this order (then auto-sorted by JD):
   `(-2238, 5, 15, 'Great Flood')`, `(2040, 5, 15, 'Phoenix 2040')`,
   `(TODAY.y, TODAY.m, TODAY.d, 'Today')`.
8. `#ledgerCount = E.length` (69); `buildLedger('all')`.
9. `setDialFromAstro(TODAY.y, TODAY.m, TODAY.d)`.
10. `#youAreHere` = `"<d> <Mon> <y> CE = AM <am> = LC <lc> = <y+5238> yr after the Nemesis Cataclysm."`

**No cast runs at init** — the results table shows its empty state until the user presses Cast.

### 5.16 What is inlined from `src/` vs rewritten

**Inlined / faithful to Ophis (`src/`):**
- The constant names `OPH_PHI`, `OPH_PI`, `OPH_CRV` and the `oph_*` function family.
- The `X1+`/`X2+` operation grammar and the "Y is days between anchors" model.
- The MSRF concept and 85 of its 87 numbers (from `src/ophis_model__params.js:17-42`).
- The `V8`/`V7` *names* (from `SCORING_SYSTEM__GTE_V8` / `SCORING_SYSTEM__LTE_V7`,
  `src/ophis_config.js:47-48`).
- Eclipse matching at ±1 day (compare `ECLIPSE_DATE_MATCH_TOLERANCE_IN_DAYS = 1.25` and
  `LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS = 1` in `src/ophis_config.js:112-113` — the browser
  build uses a flat `1` for both).

**Rewritten from scratch (nothing corresponding exists in `src/`):**
- `jdn` / `jdToDate` — plain proleptic-Gregorian JDN, replacing Ophis's
  moment/luxon/timezone stack entirely.
- `_decodeEcl` + the two delta-encoded string tables, replacing
  `lib/solar_eclipses_processed.js` / `lib/lunar_eclipses_processed.js`.
- `moonInfo` — a closed-form synodic approximation replacing `lib/astronomy.browser.min.js`,
  `lib/suncalc.js`, `lib/meuusjs`, `lib/lunarphase-js`.
- `compileOp` — a self-contained validator + `new Function`, replacing `lib/math.js`.
- **The entire Chronicon layer.** Verified absent from `src/`: zero hits for `Chronicon`,
  `Breshears`, `Annus`, `Phoenix`, `Metonic`, `Nemesis`, `baktun`, `ECHO`, `converg`.
  So `E[]`, `phxInfo`, `nemInfo`, `nerInfo`, `mayInfo`, `MAY_NODES`, `AM_OFFSET`,
  `LC_OFFSET`, `CAT_OFFSET`, the Wheels, the Ledger, ECHO detection and the whole
  Convergence feature are **original to the browser build**.

**Where it differs behaviourally from `src/`:**

| Aspect | `src/` (Electron) | Browser build |
|---|---|---|
| MSRF tiers | NORMAL(+1) / IMPORTANT(+2) / VORTEX(+2) with score multipliers 1.5 / 2.0 / 2.0 (`src/ophis_model__params.js:2-12`) | one flat set, flat `+2` (V8) / `+3` (V7) |
| VORTEX fractional matching | 12 values, tolerance 0.1 (`src/ophis_config.js:367`) | **removed** |
| `HIGHEST_MSRF_NUMBER` | 2559 (`src/ophis_config.js:119`) | highest member is 1656 |
| Alpha/Beta operation weights | `POINTS__ALPHA=1`, `POINTS__BETA=.5`, `MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES=2` | **removed** — all ops weigh equally |
| V7/V8 meaning | app-version scoring systems with different **default operation lists** (`DEFAULT_OPHIS_OPERATIONS_LTE_V7`, `src/ophis_model__params.js:65`) | two user-selectable **weight tables**; the op list does not change |
| Op validation modes | `ORIGINAL` / `STRICT` / `LOOSE`, default LOOSE (`src/ophis_main.js:29`) | single always-on strict validator |
| Validator vs executor | validates a *stripped* string, compiles a *different* one (`src/ophis_model__validation.js:158`) — the README's critical finding | validates and compiles from the same `body`; injections rejected |
| Persistence | `.oph` files via `electronBridge.autoSaveToFile` (arbitrary path write) | `.json` via `Blob` + `<a download>`; no filesystem access |

---

## 6. DATA STRUCTURES

```ts
// ---- Chronicon ledger row (69 of these), :642-712 -------------------------
type LedgerEvent = [
  astroYear : number,                                  // 0 = 1 BC, -1 = 2 BC …
  kind      : 'key'|'phx'|'nem'|'ner'|'may'|'note',    // drives dot colour + filter
  text      : string,                                  // em-dash / semicolon separated
  seedDate  : [month:number, day:number]               // 1-based month
];
const EVENT_YEARS: Map<number, LedgerEvent>;           // by astroYear                :713
function eventSeedDate(e): {m:number,d:number};        // default {m:5,d:15}          :714

// ---- Anchor, :951 ---------------------------------------------------------
interface Anchor {
  ay:number; m:number; d:number;   // astronomical year, 1-based month, day
  jd:number;                       // jdn(ay,m,d) — precomputed, never recomputed
  label:string;                    // user text or fmtYear(ay)
  enabled:boolean;
}   // `anchors` is ALWAYS kept sorted by jd ASC

// ---- Op, :989 -------------------------------------------------------------
interface Op {
  eq:string;                       // canonical source text, shown in UI + CSV
  start:'X1'|'X2';
  fn:(Y:number)=>number;           // compiled closure — NOT JSON-serialisable
  enabled:boolean;
}

// ---- Result, :808-809 -----------------------------------------------------
interface Result {
  zjd:number;                      // projected Julian Day Number (integer)
  ay:number; m:number; d:number;   // jdToDate(zjd)
  am:number;                       // ay + 3894
  lc:number;                       // ay + 3112   (may be <= 0; rendered as '—')
  op:string;                       // op.eq
  Y:number;                        // |x2.jd - x1.jd|, days
  x1:string; x2:string;            // anchor LABELS, not objects
  score:number;
  tags:[display:string, cssClass:string][];
  met:boolean;                     // metonic || has19  — drives the 19·METONIC filter
  echo:boolean;
  solar:'total'|'annular'|'partial'|'hybrid'|null;
  lunar:'total'|'partial'|null;
}

// ---- Convergence, :843-847 ------------------------------------------------
interface Convergence {
  centerJD:number;                 // rounded MEAN of member zjds
  ay:number; m:number; d:number; am:number; lc:number;
  nOps:number;                     // |Set(op)|  — "strength", the primary sort key
  nPairs:number;                   // |Set("x1 → x2")|
  count:number;                    // items.length
  minJD:number; maxJD:number; spanDays:number;
  bestScore:number;
  tags:[display:string, cssClass:string][];   // union, echo tags removed
  ops:string[]; pairs:string[];
  items:Result[];
  allEcho:boolean;                 // DEAD — always false (echoes pre-filtered)
}

// ---- Saved config v3, :894-896 --------------------------------------------
interface SavedConfig {
  app:'OPHION'; v:3; saved:string;              // app/v never validated on load
  system:'V8'|'V7';
  convTol:string;                               // String(convTol) — "30" or "year"
  anchors:{ay:number;m:number;d:number;label:string;enabled:boolean}[];
  ops:{eq:string;enabled:boolean}[];
}

// ---- Eclipse table, :623 --------------------------------------------------
interface EclTable { J:number[]; T:string[]; }   // parallel, ascending, same length
```

### CSS class ↔ tag-class contract

`.rt.<cssClass>` must exist for every tag class emitted. Full set (`:133-138`, `:179-180`):
`phx`, `pal`, `ev`, `met`, `s138`, `s19`, `msrf`, `ner`, `nem`, `bak`, `echo`, `sol`, `lun`.

### Ledger `kind` ↔ dot class

`{key:'d-key', phx:'d-phx', nem:'d-nem', ner:'d-ner', may:'d-may', note:'d-note'}` (`:1148`),
styled at `:165`.

### Ledger integrity — verified

- `E.length === 69`, matching the comment at `:640` and `#ledgerCount`.
- Kind counts: `phx` 24, `may` 13, `nem` 11, `note` 8, `key` 7, `ner` 6. Total 69.
- **All 24 `phx` events satisfy `mod(year,138) === 108`** — the `:640` claim holds.
- No duplicate years.
- Four **non-`phx`** rows also sit on the 138 lattice: `-2238` (key, the Great Flood),
  `1488` (note, Mother Shipton), `2040` (key), `2178` (key). They render a `●` in the
  Phx column (`:1149` tests the year, not the kind) — correct, but easy to mistake for a bug.

---

## 7. THE "NATORI" BRANDING LAYER — what it actually is

**It is a naming/packaging layer plus a whole invented chronology feature set. It is *not* a
theme system, and it is *not* an oracle-card or image layer.**

### 7.1 The ~1400 PNGs are Leaflet map tiles, not oracle cards

`find . -iname '*.png' | wc -l` → **1409**. Their distribution:

- `img/offline_map/map/{0..5}/{x}/{y}.png` — a 6-zoom-level offline slippy-map tile
  pyramid, 32 tiles per directory. This is essentially all 1409 files.
- `img/astro_indicators/` — 12 PNGs: the 8 moon phases plus
  `solar_eclipse_full/partial`, `lunar_eclipse_full/partial`.
- `img/hit_symbols/` — 4 PNGs: `circle`, `diamond`, `gemini`, `triangle`.
- `img/` root — favicons, `header.png`, `fire.png`, `clone.png`, sort/score/notes icons,
  `alarm_clock.ttf`, `site.webmanifest`.

**None of these are referenced by any of the four assigned HTML files.** They belong to the
Electron renderer: `leaflet`/`Leaflet` appears only in `src/ophis_main.js`. The browser
build ships zero images — it is a single self-contained HTML file whose only external
request is the Google Fonts stylesheet.

### 7.2 What the Natori layer actually adds

Concretely, from `NatorionOracle-v1.0/README.txt` (dated 12 June 2026) and the code:

1. **A name and a release identity.** Product `NatorionOracle`, engine `NATORI-ON-PSYFR`,
   subtitled "The Predictive Chronology Engine". Copyright `BeeRadicalStuff`. Live at
   `https://beeradicalstuff.github.io/natori-on-psyfr/`.
2. **A fused thesis.** "Ophis grammar × Chronicon calendrics over the Breshears lattice."
   The tagline "The serpent that rings the egg of time" (`:312`) is the Ophion/Orphic
   world-egg myth — *Ophis*(serpent) → *Ophion* → *Natori-on*. `NatoriOphis.html` is the
   intermediate step where the brand was still literally `OPHION`.
3. **The entire Archaix chronology feature set** — Phoenix 138 / Nemesis 792 / NER 600 /
   Metonic 19, Annus Mundi, Mayan Long-Count, Anunna turnings, the 69-event ledger, the
   seven Wheels. As established in §5.16, **none of this exists in `src/`.**
4. **Convergence analysis** — the "several independent operations agree" ranking, presented
   in the README as "the strongest signal". Original.
5. **The V8/V7 lens as a user-facing question** — "which projections resonate with
   history?" vs "…with the signatures?" (`PSYFR2.html:371-372`).
6. **A consumer-grade shell** — Simple/Full view, light/dark, text zoom, the Field Guide,
   a README, a licence, and Technical Walkthrough/Reference docs in `.pdf` + `.docx`.
7. **A licence that forbids derivatives** (`NatorionOracle-v1.0/LICENSE.txt`):
   use and verbatim redistribution permitted; modifying, forking, porting, selling, or
   removing the Archaix framing notice all require written permission. Relevant if the
   rebuild is intended to be published.

### 7.3 Release package contents

```
NatorionOracle-v1.019.zip
├── NatorionOracle-v1.0.zip
│   └── NatorionOracle-v1.0/
│       ├── LICENSE.txt
│       ├── README.txt
│       ├── NATORI-ON-PSYFR-Main-UI.html      ← == PSYFR1.html
│       ├── NATORI-ON-PSYFR-Field-Guide.html  ← == PSYFR2.html
│       └── docs/
│           ├── NATORI-ON-PSYFR-Technical-Reference.{pdf,docx}
│           └── NATORI-ON-PSYFR-Technical-Walkthrough.{pdf,docx}
├── Natori-On-PSYFR-Field-Guide.html
├── Natori-On-PSYFR-Main-UI.html
└── NATORI-ON-PSYFR-Technical-Walkthrough.pdf
```

---

## 8. BROWSER BUILD vs ELECTRON APP — the delta

### 8.1 In the browser build, absent from the Electron app

| Feature | Where |
|---|---|
| Chronicon calendrics: Phoenix / Nemesis / NER / AM / Long-Count / Anunna / Metonic | `:717-723`, `:490-498` |
| 69-event documented ledger + seed-as-anchor | `:642-712`, `:1143-1160` |
| Convergence analysis (`nOps ≥ 2` clustering) | `:819-850` |
| ECHO detection + NOVEL filter | `:802`, `:1027` |
| V8/V7 as switchable **weight tables** | `:759-775` |
| Seven-wheel "read any instant" dial | `:466-499`, `:1084-1131` |
| Named op packs (5) | `:868-886` |
| Light theme / text zoom / Simple view / reduced-motion | `:220-286`, `:1170-1193` |
| Field Guide with copy-ready formula cookbook | `PSYFR2.html` |
| Delta-encoded eclipse tables inline (~46 KB of string) | `:616-625` |
| Genuinely safe operation validator | `:729-744` |
| Zero filesystem access, zero telemetry, single file | — |

### 8.2 In the Electron app, absent from the browser build

Named by module; I did not read these files (they are another agent's assignment).

| Feature | Evidence |
|---|---|
| Chart.js charting + zoom/datalabels/annotation plugins | `src/ophis_view__chart.js`, `__chart_config.js`, `__chart_datasets.js` (104 KB combined) |
| Leaflet offline map, 1409 bundled tiles | `src/ophis_main.js`; `img/offline_map/` |
| flatpickr date pickers (+ monthSelect) | `src/ophis_view.js`, `__config.js`, `__output.js`, `__rebuild.js`, `__settings.js`, `__utils.js` |
| PDF export (jsPDF + autotable) | `src/ophis_view__export.js` |
| XLSX export (`write-excel-file`) | `src/ophis_view__export.js` |
| SHA-512 sign-in | `src/ophis_utils.js` |
| `electronBridge` / `autoSaveToFile` filesystem IO | `src/ophis_controller.js`, `__persistence.js`, `__export.js`, `ophis_logging.js`, `ophis_main.js`, `ophis_utils.js` |
| Real astronomy (`astronomy.browser`, `suncalc`, `meeusjs`, `lunarphase-js`) | `src/ophis_dependencies.js`, `src/ophis_utils.js` |
| Timezone + geolocation (`moment-timezone`, `tz_lookup_oss`, `geo-point`) | `lib/` |
| `math.js` expression evaluation | `lib/math.js` |
| tipsy tooltips; `FEATURE_FLAG__SHOW_MSRF_AND_OPERATION_PILL_TOOL_TIPS` | `src/ophis_view__output.js`, `src/ophis_config.js:293` |
| MSRF tiering (NORMAL/IMPORTANT/VORTEX) + score multipliers | `src/ophis_model__params.js:2-46` |
| Alpha/Beta operation weighting | `src/ophis_model__params.js:2-7, 48-54` |
| Rich Z-Date filters (before/on last X-Date, beyond N days, min hit count) | `src/ophis_config.js:122-157` |
| Sort types incl. `SORT_TYPE__HIT_COUNT`, `SORT_TYPE__MSRF` | `src/ophis_config.js:442-451` |
| `.oph` preset format | `src/ophis_model__persistence.js` |
| In-app unit tests | `src/ophis_unit_tests.js` |
| Hit symbols / astro indicator icon sets | `img/hit_symbols/`, `img/astro_indicators/` |
| LOOSE/STRICT/ORIGINAL validation modes | `src/ophis_config.js:336-343` |
| CSV import (`papaparse`), DOM sanitising (`purify`) | `lib/` |

The Electron renderer is **604 KB across 24 first-party modules**; the browser build is
**141 KB in one file**, of which ~46 KB is the eclipse strings and ~14 KB is the ledger.
Actual logic is roughly 25 KB.

---

## 9. THE 19 DEFAULT OPERATIONS

`:856-863` — order is significant (it is the display order and the `#opList` numbering):

```
 1  X2+oph_round(Y)                     11  X1+oph_round(Y/19)*19
 2  X2+oph_flip(oph_round(Y))           12  X2+Y+138
 3  X1+oph_flip(oph_round(Y))           13  X1+Y+19
 4  X2+Y/OPH_PHI                        14  X2+oph_flip(Y)+19
 5  X1+Y*OPH_PHI                        15  X1+Y*360/365.2422
 6  X1+(Y/2)*OPH_PI                     16  X2+Y*792/600
 7  X2+Y/OPH_CRV                        17  X1+oph_round(Y*OPH_PHI/OPH_PI)
 8  X2+Y*138/100                        18  X2+oph_round(Y/OPH_PHI/OPH_PHI)
 9  X1+Y*19/10                          19  X1+oph_flip(oph_round(Y/OPH_PHI))
10  X2+oph_round(Y/138)*138
```

10 start from `X1`, 9 from `X2`. All 19 compile cleanly (verified).

The other four packs, verbatim (`:870-885`):

**138 Pack** (12): `X2+oph_round(Y/138)*138`, `X1+oph_round(Y/138)*138`, `X2+Y+138`,
`X1+Y-138`, `X2+Y*138/100`, `X1+Y*100/138`, `X2+oph_flip(oph_round(Y))`,
`X1+138*oph_round(Y/138)`, `X2+Y+138*2`, `X1+Y+138*3`, `X2+oph_round(Y/414)*414`,
`X1+oph_round(Y/552)*552`

**19 Metonic Pack** (11): `X1+oph_round(Y/19)*19`, `X2+oph_round(Y/19)*19`, `X2+Y+19`,
`X1+Y-19`, `X2+Y*19/10`, `X1+Y*235/19`, `X2+oph_flip(Y)+19`, `X1+19*oph_round(Y/19)`,
`X2+Y+19*19`, `X1+oph_round(Y/235)*235`, `X2+oph_flip(oph_round(Y/19))`

**Phoenix Lattice Pack** (10): `X1+oph_round(Y/138)*138`, `X2+oph_round(Y/792)*792`,
`X1+oph_round(Y/600)*600`, `X2+oph_round(Y/360)*360`, `X1+Y*360/365.2422`, `X2+Y+138`,
`X1+Y+792`, `X2+Y+600`, `X1+oph_round(Y/216)*216`, `X2+oph_round(Y/144)*144`

**Golden Pack** (10): `X2+Y/OPH_PHI`, `X1+Y*OPH_PHI`, `X1+(Y/2)*OPH_PI`, `X2+Y/OPH_CRV`,
`X1+(Y/2)*OPH_CRV`, `X2+oph_round(Y*OPH_PHI/OPH_PI)`, `X1+oph_round(Y/OPH_PHI/OPH_PHI)`,
`X2+oph_flip(oph_round(Y/OPH_PHI))`, `X1+Y*OPH_PI/OPH_PHI`, `X2+oph_round(Y*OPH_PHI)`

`PSYFR2.html` §3 documents 22 formulas across 6 groups, four of which are **not** in any
pack: `X1+Y`, `X2+oph_round(Y/6940)*6940`, `X1+oph_round(Y/414)*414` (X1 variant),
`X2+Y*360/365.2422` (X2 variant).

---

## 10. VERIFICATION — I executed the engine

I extracted `:588` … just before the `STATE + UI` banner, plus `DEFAULT_OPS`, into a Node
module and ran real casts. Engine `TODAY` at time of writing: `{y:2026,m:8,d:25}`.

**Default cast (Great Flood / Phoenix 2040 / Today), V8 — 33 results from 57 candidates.**

| Field Guide claim | Reproduced? | Actual |
|---|---|---|
| Ex ①: strength-**4** convergence on 2040 (`PSYFR2.html:327`) | ✘ | strength **3** (nOps=3, nPairs=2, centre 2040-05-08) |
| Ex ①: 15 May 2040 total **lunar** eclipse, score 11 (`:328`) | ✘ | no such row exists |
| Ex ①: 10 May 2040 partial **solar**, score 12 (`:328`) | ✔ | exact match, `X1+oph_round(Y/19)*19` |
| Ex ②: `X2+Y*138/100` → 1902 CE, score 11 (`:341`) | ✔ | exact match; tags `PHOENIX NODE, DOCUMENTED, 19` |
| Ex ③: top novel V8 = 10 May 2040, score 12 (`:354`) | ✔ | exact match |
| Ex ③: top novel V7 = 1 June 2026, score 6 (`:355`) | ✘ | **16 Aug 2026, score 7** |

Every failure has one cause: **the `Today` default anchor.** The guide was written when
`TODAY` was ~June 2026; it is now August 2026, so `Y` for two of the three pairs has shifted
and the `metonic` predicate re-evaluates. See G-1.

**Drop accounting for the default cast:**

```
3 pairs × 19 ops = 57 candidates
  out-of-range (zd.year > 4000) : 24   ← 42% silently discarded
  non-finite offset             :  0
  duplicate key                 :  0
  surviving                     : 33
```

All 24 drops come from the two deep-past pairs (`Y = 1,557,496` and `Y = 1,562,508` days),
projected to years 4457–24087. The UI reports nothing about them.

---

## 11. GOTCHAS

**G-1 · The default cast is not reproducible across days.** `TODAY` is captured at load
(`:590`), one of the three seeded anchors is `Today` (`:1210`), and `metonic` is
`mod(TODAY.y - ZA, 19) === 0` (`:755`). Scores, convergences and rankings therefore drift
daily *and* jump every 1 Jan. Three of the six documented worked-example claims already fail.
If you want reproducibility, pin a "reference date" and make `TODAY` an overridable input.

**G-2 · 42% of the default cast is silently discarded.** `if(zd.year<-5400||zd.year>4000)
continue` (`:794`) drops 24 of 57 candidates with no counter, no toast, no log. `#resCount`
shows `33 / 33`, implying nothing was lost. Add a "N projections outside the readable range"
notice.

**G-3 · `1138` is in the MSRF set and is not an Ophis number.** `:613`. Only `19` is
documented as an addition (`:566`). `1138` sits beside the genuine `1134`. Decide
deliberately whether to keep it.

**G-4 · The eclipse tables have a ~90-year hole at 10–99 CE.** §5.5. The Field Guide's
"covers ~1–3000 CE" is wrong for that window. Projections landing there silently get no
eclipse tag, indistinguishable from "no eclipse occurred".

**G-5 · Lunar eclipses before JD 1721231 are unreachable.** The range guard at `:805` uses
`ECL_MIN_JD`/`ECL_MAX_JD`, both derived from the **solar** table (`:626`), but
`ECL_L_BASE = 1721068` is 163 days earlier. Compute per-table bounds.

**G-6 · `oph_flip` destroys negative numbers.** `oph_flip(-138) === 0`, not `-831`
(§5.4). Any operation that can produce a negative intermediate silently collapses to a
zero-day offset — i.e. an ECHO on the base anchor. Measured, not inferred.

**G-7 · `oph_flip` re-inserts the decimal point at the *original* index.**
`oph_flip(1.5) === 5.1`, `oph_flip(0.5) === 5`. This is not digit-string reversal of the
whole numeral. Reproduce the exact algorithm at `:600`, not your own idea of "flip".

**G-8 · `x` → `*` is applied to the whole body, so `0x41` becomes `0*41` = 0.** `:735`.
Hex literals silently evaluate to zero instead of being rejected. Scientific notation
(`1e3`) *is* rejected, because `e` is not in the allowed character class.

**G-9 · `NatoriOphis.html` divides by zero on the last baktun.** At
`NatoriOphis.html:789`, `bEnd = MAY_NODES[bi+1] || 2046`; when `bi === 13`,
`bStart === 2046` too, so `span === 0` and the progress bar width becomes `NaN%`.
The Main UI fixes this with an explicit `bi === MAY_NODES.length-1` → `'COUNT CLOSED'`
branch (`:1117-1119`). Do not port the old code.

**G-10 · `NatoriOphis.html`'s CSP forbids the `eval` its own engine requires.**
`NatoriOphis.html:7` omits `'unsafe-eval'` while `:533` calls `new Function`. Under
enforcement every op fails to compile, `loadDefaultOps` filters out all 19 nulls
(`NatoriOphis.html:663`), and the app loads with an empty op list and no error shown.
Fixed in the Main UI (`:7`).

**G-11 · Visually identical duplicate result rows are real, not a render bug.** The dedup
key includes the anchor pair (`ZJD|op|x1.jd|x2.jd`, `:795`) but the results table has **no
X1/X2 column** (`:427-430`). Verified: `X1+Y+19` → 2040-06-03 appears twice, once from
`Great Flood → Phoenix 2040` and once from `Today → Phoenix 2040`. The CSV *does* carry
`x1`/`x2` (`:1067`). Add a pair column, or dedup on the visible tuple.

**G-12 · The convergence window chains transitively.** `:830`. Members are linked when
*adjacent* members are within `tol`, so a `±30 day` window can produce a 90-day cluster.
The `±⌈span/2⌉d span` sub-label (`:931`) is the only disclosure.

**G-13 · `renderConvergence` computes `allEcho`, which is always `false`.** It is fed
`lastResults.filter(r => !r.echo)` (`:920`), so `items.every(i => i.echo)` (`:847`) can
never be true. Dead field.

**G-14 · The cross-links break under the shipped filenames.** The Main UI links to
`PSYFR2.html` (`:294`, `:313`); the Field Guide links to `PSYFR1.html` and `OPHIS.html`
(`PSYFR2.html:168`). The release zip renames them to `NATORI-ON-PSYFR-Main-UI.html` /
`NATORI-ON-PSYFR-Field-Guide.html`. **Either the shipped links are dead or the shipped
copies were separately edited** — I cannot tell from the repo copies, which retain the
`PSYFR*` targets. Make link targets a single constant.

**G-15 · The saved config still calls itself `"app":"OPHION"`.** `:894`. `applyConfig`
never checks `app` or `v` (`:902-913`), so this is cosmetic — but it means any JSON with
an `anchors` or `ops` key will load, and there is no format-version gate for future changes.

**G-16 · `#resCount` and the 500-row cap disagree.** `:1044` sets the count from the
*filtered* array; `:1047` renders only `.slice(0,500)`. With >500 matches the header claims
more rows than exist. Same class of issue at 200 rows for convergences (`:927`), where
`#convCount` (`:922`) counts all clusters.

**G-17 · CSV export ignores the current filter and sort.** `:1069` iterates `lastResults`.
Users who filter to `✦ NOVEL ONLY` and export get everything.

**G-18 · `has19` fires on every 19xx year.** `String(absY).includes('19')` (`:754`) is a
substring test, so 1900–1999 (and 190x, 191x, …) always score the `19` tag. Combined with
`met = metonic || has19` (`:776`), the `19·METONIC` filter matches the whole 20th century.
This is presumably intentional numerology, but it makes the filter far less selective than
its label implies.

**G-19 · Day inputs are clamped to 1–31 with no month-length validation.** `:970`, `:1085`.
`jdn(2026, 2, 31)` returns the JDN of 3 March. Invalid dates are silently normalised.

**G-20 · `TODAY_JD` is computed and never used.** `:603`. Dead constant.

**G-21 · The `year` convergence mode ignores `tol` entirely** and groups by exact
`r.ay` (`:822-825`), so two dates 364 days apart in the same calendar year converge while
2 days apart across a New Year do not.

**G-22 · The smoke-test error message is not wrapped.** `:741` runs outside the
`try/catch` at `:739-740`, so a `ReferenceError` message like `"f is not defined"` reaches
`#opErr` verbatim (`:996`) instead of one of the four intended messages.

**G-23 · `body{zoom:var(--zoom)}` is non-standard.** `:222`. Firefox added support only
recently; older Firefox ignores it and the A−/A+ buttons do nothing there. `rem`-based
scaling on `:root{font-size}` would be the portable equivalent — but note the design uses
`px` throughout, so that swap is a real refactor.

**G-24 · Score-bar and clock-bar widths are unclamped percentages.**
`:1050` (`score/maxScore*100`) is safe because `maxScore` is a max. But
`:1108` (`(astro - nm.exit)/732*100`) and `:1101` (`ph.into/138*100`) can exceed 100% or go
negative for far-out dial values; the parent's `overflow:hidden` (`:151`) hides the
overflow but a negative width renders as nothing.

**G-25 · Three of the seven clocks have no progress bar.** `.c-am`, `.c-anu`, `.c-moon`
(`:494`, `:496`, `:497`) omit the `<div class="bar">`. Intentional, but a grid-alignment
inconsistency to be aware of when redesigning the wheel cards.

**G-26 · The Ledger's Phx column marks any year on the lattice, not just `phx` events.**
`:1149` tests `mod(a,138)===108` regardless of `kind`, so `-2238`, `1488`, `2040` and `2178`
show `●` despite being `key`/`note`. Correct behaviour, confusing presentation.

**G-27 · `applyConfig` silently drops uncompilable operations.** `:905`. A config saved by a
future build with new syntax loads "successfully" with a shorter op list and a
`'Configuration loaded'` toast.

---

## 12. REIMPLEMENTATION NOTES

Build order that respects the dependencies:

1. **Date core** — `mod`, `jdn`, `jdToDate`, `fmtYear`, `isPalindrome`, `am`, `lcYear`.
   Golden test: today must read `AM 5920 / LC 5138` for 2026; the Great Flood (`-2238`)
   must read `AM 1656`.
2. **`oph_*` family** — port `oph_flip` character-for-character (G-6, G-7).
3. **`compileOp`** — port the five-step pipeline exactly (§5.7). Replace `new Function`
   with a real recursive-descent parser if you want to drop `'unsafe-eval'` from the CSP;
   `Ophis_v12_Hardened_Engine_Lab.html` in this repo already demonstrates one.
4. **Data tables** — `MSRF` (decide on `1138`), `E[]` (69 rows), `MAY_NODES`, the two
   eclipse strings + `_decodeEcl`. Fix the solar/lunar bounds (G-5).
5. **Chronology readouts** — `phxInfo`, `nemInfo`, `nerInfo`, `mayInfo`, `moonInfo`.
6. **`scoreZDate`** — the two weight tables (§5.8). Make `TODAY` injectable (G-1).
7. **`cast`** — the pair loop, guards, MSRF/ECHO/eclipse augmentation, sort. Surface the
   out-of-range drop count (G-2).
8. **`findConvergences`** — decide whether to keep transitive chaining (G-12).
9. **UI** — the design system in §2, the layout in §3, the controls in §4.

The design system is the most reusable artefact here: 13 tokens, 3 fonts, a 3/4/5px radius
scale, glow-only shadows, one breakpoint at 880px, and a four-layer gradient background.
Everything else in the visual language falls out of those.

---

## 13. FILES

| Path | Role |
|---|---|
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/Natori-On-PSYFR-Main-UI.html` | canonical engine (read in full) |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/PSYFR1.html` | CRLF duplicate of the above |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/PSYFR2.html` | Field Guide (read in full) |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/NatoriOphis.html` | `OPHION` ancestor build (read in full) |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/NatorionOracle-v1.019.zip` | release package + README + LICENCE |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/src/ophis_model__params.js` | real MSRF tables (cross-referenced, not my assignment) |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/src/ophis_config.js` | scoring-system + tolerance constants (cross-referenced) |
| `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/img/offline_map/` | the 1409 PNGs — Leaflet tiles, Electron-only |
