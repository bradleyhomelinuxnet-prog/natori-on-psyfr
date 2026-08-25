# NATORI-ON-PSYFR · The Predictive Chronology Engine

> The serpent that rings the egg of time · **138** lattice · **19** metonic · ⮌ mirror

A self-contained, air-gap-friendly study instrument that renders Jason Breshears' **Archaix**
thesis as living predictive calendrics — the **Ophis** predictive grammar crossed with **Chronicon**
calendrics over the Breshears cycle lattice (Phoenix 138 · Nemesis 792 · NER 600 · Metonic 19).

Seed anchor dates, cast them through an operation pack, and read which projections resonate with
the chronology. Nothing leaves the page.

**Live:** https://bradleyhomelinuxnet-prog.github.io/natori-on-psyfr/

---

## What it does

1. **Seed** two or more anchor dates (X-Dates) — type them in, or take them from the documented
   ledger of 69 Chronicon events.
2. **Cast.** Every *pair* of anchors gives an interval **Y** in whole days. Every operation in the
   pack turns that Y into a day-offset and projects a **Z-Date** from one of the two anchors.
3. **Read.** Each Z-Date is scored against the cycle lattice — Phoenix nodes, documented events,
   palindromes, Metonic returns, the 138 and 19 numerals, MSRF resonance, and coincidence with a
   real solar or lunar eclipse. Two scoring lenses weight those differently.
4. **Converge.** Where several *different* operations independently land on the same date, that
   agreement is the signal the method is actually after.
5. **The Wheels** read any single moment across every reckoning at once; **the Ledger** is the
   documented spine you can seed from.

---

## Running it

It is static files. Any web server will do:

```bash
python -m http.server 8777
```

Then open <http://localhost:8777/>. (ES modules need `http://`, not `file://`.)

Run the tests with:

```bash
node --test tests/parity.test.mjs
```

---

## Layout

```
index.html            the app shell — every DOM id the panels bind to
guide.html            the Field Guide
src/
  app.js              bootstrap; wires the panels
  core/               pure engine — no DOM, runs headless under node
    jdn.js            Julian Day ↔ proleptic Gregorian, astronomical years
    cycles.js         Phoenix · Nemesis · NER · Maya · Annus Mundi · moon
    eclipses.js       delta-decoded eclipse tables + lookup
    equation/         tokeniser → parser → AST evaluator (no eval)
    scoring/          traits, lenses, scoring
    cast.js           the projection pipeline
    convergence.js    clustering where operations agree
  data/               THE MOD SURFACE — packs, MSRF, ledger, lattice, eclipses
  state/store.js      plain object + subscribe
  ui/                 DOM only; panels/ has one file per section
  io/                 CSV, config save/load, downloads
  styles/             tokens.css is the whole palette
tests/                parity fixtures taken from the original engine
tools/                one-off data extraction
docs/
  MODDING.md          how to change things — start here
  DEVIATIONS.md       where this deliberately differs from the original
  reverse/            the full reverse-engineering study (15 specs)
```

---

## Built to be modified

That is the point of this rewrite. Each kind of change touches exactly one file:

| Change | File |
|---|---|
| Operation packs | `src/data/packs.js` |
| Equation constants / functions | `src/core/equation/constants.js` · `functions.js` |
| Scoring lenses | `src/core/scoring/lenses.js` |
| Resonance traits | `src/core/scoring/traits.js` |
| MSRF number set | `src/data/msrf.js` |
| Documented events | `src/data/ledger.js` |
| Cycle periods | `src/data/lattice.js` |
| Colours, fonts, spacing | `src/styles/tokens.css` |

Full details, with worked examples: **[docs/MODDING.md](docs/MODDING.md)**.

---

## The paper

**[docs/WHITEPAPER.md](docs/WHITEPAPER.md)** — *Rebuilding a Closed Prediction Engine Without
Breaking It.* The full study: how the application came apart, what the teardown found, how the
rewrite was verified against the original, and what generalises to other migrations.

---

## Provenance

This is a ground-up rewrite of **Ophis v12** (branded PSYFR), the owner's own Electron application,
reverse-engineered with the owner's permission. The mathematics is verified **bit-exact** against
the original: `tests/parity.test.mjs` pins Julian day numbers, every operation's output, eclipse
coincidences, and a complete 33-row scored cast against values read out of the original engine.

What is deliberately *different* — no `eval`, no arbitrary-path writes, no client-side sign-in
theatre, and "today" read from the clock rather than baked in — is listed in
**[docs/DEVIATIONS.md](docs/DEVIATIONS.md)**.

The vocabulary and the system model — PREPS, the A/B/C → E/F/G pipeline, the 14 operations mapped
onto the shipped equations, the six MSRF filters and their tiers, and what the author never
disclosed — are in **[docs/DOMAIN.md](docs/DOMAIN.md)**.

The full study, subsystem by subsystem, is in [`docs/reverse/`](docs/reverse/).

### The originals

`PSYFR1.html` and `PSYFR2.html` are the **previous single-file build**, kept at their original paths
so existing links still resolve. They are the reference the parity tests were taken from. For
anything new, use `index.html` — the originals are frozen and will not be updated.

---

## Note

NATORI-ON-PSYFR is a **worldbuilding & study instrument** rendering the Archaix thesis of Jason
Breshears (Archaix.com) — the Chronicon, Doomsday Chronology, the 337 charts, the ANUNNA Files.
The Shar-as-turning reckoning, Annus Mundi dating and cycle lattice are presented **as that
thesis, not as established science**. Deep-past conversions are cycle-true rather than historically
observed. Not affiliated with Archaix.

**19138 · 83191 — read the same returning.**
