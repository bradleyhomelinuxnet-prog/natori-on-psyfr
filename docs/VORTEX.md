# The Vortex Holography Filter, decoded

The sixth and strangest of the six MSRF filters is **Vortex Holography**. Its numbers are the only
non-integers in the whole resonance table, and until now nobody had explained what they were:

```js
var MSRF_FILTER__VORTEX = [
    21.7, 32.6, 43.5, 65.3, 76.2, 87.1,
    217.8, 326.7, 435.6, 653.4, 762.3, 871.2
];
```

An interval `Y` is a whole number of days. A day count can never equal `21.7`. So either the filter
never fires, or these numbers mean something other than a day count.

They mean something else. **They are six four-digit multiples of 99 wearing a decimal point.**

Run `node tools/vortex-analysis.mjs` to reproduce everything below.

---

## 1. The operation

The Ophis documentation describes the discovery this way:

> the numbers 1 through 15,000 were run through a program that subtracted every number from a
> holographic reflection of itself … about 95% of all numbers collapse to zero … 5% do not collapse
> to zero, but reduce to a very astonishing series of numbers that continually loop upon themselves
> into a funnel that loops forever. These immortal numbers are patterned in 9 and 11-dimensional
> distributions.

"A holographic reflection of itself" is **digit reversal** — the same idea as `oph_flip`. The
operation is therefore *reverse-and-subtract*, iterated:

```
n  ->  |n − reverse(n)|  ->  repeat
```

A palindrome yields zero on the first step. Most other numbers reach zero after a few. A minority
never do — they fall into a cycle.

## 2. The cycle

There is exactly one attractor in the four-digit range, and it is a two-step loop:

```
2178 → 6534 → 2178
```

The loop and its two mirrors form a closed family of four:

| n | factorisation | reverse | ǀn − revǀ | digital root |
|---|---|---|---|---|
| 2178 | 99 × 22 | 8712 | 6534 | 9 |
| 4356 | 99 × 44 | 6534 | 2178 | 9 |
| 6534 | 99 × 66 | 4356 | 2178 | 9 |
| 8712 | 99 × 88 | 2178 | 6534 | 9 |

Strictly, the *cycle* is the pair `{2178, 6534}`; `4356` and `8712` are their reverses, which map
into it in one step. The four together are what the table treats as the family.

`2178 = 2 × 3² × 11²`. The nine and the eleven the documentation calls "9 and 11-dimensional
distributions" are sitting right there: **99 = 9 × 11**, and every member is `99 × 22k`.

Nine governs the family through the digital root — every member sums to 18, and 1 + 8 = 9 — while
never appearing as a digit in any of them.

### The cleaner basis: 1089

`1089 = 99 × 11 = 33²`, and the whole family is `1089 × k`:

| k | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| `1089k` | 1089 | **2178** | **3267** | **4356** | 5445 | **6534** | **7623** | **8712** | 9801 |
| in the table | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |

The six the table carries are exactly `k ∈ {2, 3, 4, 6, 7, 8}`. The three it omits are the three that
cannot belong:

- **k = 5** → `5445`, a **palindrome**: it collapses to zero on the first step.
- **k = 1** and **k = 9** → `1089` and `9801`, which are each other's reverse. They sit at the ends
  of the family rather than inside it.

That the omissions are precisely `{1, 5, 9}` — the fixed points and the palindrome — is what makes
the reconstruction more than a coincidence of arithmetic.

## 3. The community claims, tested

A member of the PSYFR group (Krusty, August 2026) published a set of claims about 2178. They are
stated without a domain, and the domain turns out to be the whole story: over `1..15000` they mostly
fail, and over the **four-digit numbers** they are almost exactly right.

| Claim | Over 1..15000 | Over 1000..9999 | Verdict |
|---|---|---|---|
| "about 95%" collapse to zero | 80.15% | **92.92%** | ✅ on 4-digit |
| 636 numbers collapse to 2178 | 2637 | **637** | ✅ see below |
| every one is divisible by 11 | 817 / 2637 | **637 / 637** | ✅ on 4-digit |
| gaps between them are 11, 22 or 33 | {1,2,3,4,5,6,10,11,14,22,25,33} | **{11, 22, 33}** | ✅ on 4-digit |
| each takes 1–4 permutations | 2–14 | 2–6 | ❌ not reproduced |

**The 636 / 637 discrepancy is exactly one, and it is explicable.** The basin contains 637 numbers
*including 2178 itself*. A number cannot collapse *to* itself, so counting only the numbers that
arrive at 2178 from elsewhere gives **636** — the published figure, exactly.

The one claim that does not reproduce is the permutation count. Measured trajectory lengths for the
four-digit basin are 2 → 2 numbers, 3 → 146, 4 → 72, 5 → 260, 6 → 157. Either "permutations" counts
something other than reverse-and-subtract steps, or the claim is wrong. It is recorded here as
unreproduced rather than quietly dropped.

There is a second attractor one order of magnitude up — `21978 → 65934`, the same family scaled
(`99 × 222` and `99 × 666`), which is why the whole-range run looks so different.

## 4. What the MSRF vortex numbers actually are

Every entry resolves to a four-digit multiple of 99, scaled by a power of ten and **truncated** to
one decimal place — not rounded, which is why `32.67` is written `32.6`:

| Table entry | Resolves to | | Table entry | Resolves to | |
|---|---|---|---|---|---|
| `21.7` | 2178 / 100 | 99 × 22 · loop | `217.8` | 2178 / 10 | 99 × 22 · loop |
| `32.6` | 3267 / 100 | 99 × 33 | `326.7` | 3267 / 10 | 99 × 33 |
| `43.5` | 4356 / 100 | 99 × 44 · loop | `435.6` | 4356 / 10 | 99 × 44 · loop |
| `65.3` | 6534 / 100 | 99 × 66 · loop | `653.4` | 6534 / 10 | 99 × 66 · loop |
| `76.2` | 7623 / 100 | 99 × 77 | `762.3` | 7623 / 10 | 99 × 77 |
| `87.1` | 8712 / 100 | 99 × 88 · loop | `871.2` | 8712 / 10 | 99 × 88 |

Twelve entries, **six distinct numbers**: `99 × {22, 33, 44, 66, 77, 88}`. Two of them — `2178` and
`6534` — are the cycle itself. `4356` and `8712` are their reverses, one step out. `3267` and `7623`
are a further mirror pair, two steps out (`|3267 − 7623| = 4356`, and `|4356 − 6534| = 2178`).

Equivalently — and more cleanly — they are `1089 × {2, 3, 4, 6, 7, 8}`, the nine multiples of 1089
minus the three that cannot belong (§2). The exclusion of `5445`, the palindrome, is the detail that
convinces: whoever built this table was running the process, not choosing pretty numbers.

## 5. Why this matters for the software

**The vortex filter, as shipped, cannot fire.** `Y` and the day-offset are integers; every vortex
entry is fractional. `MSRF.has(Y)` is false for all of them, always.

That is consistent with what the desktop engine does: it treats vortex numbers separately, matching
them "within a certain tolerance" per the comment in `ophis_model__params.js`, precisely because an
exact match is impossible. The browser build dropped that path entirely, which is why the reduced
87-number set contains no vortex entries at all.

So there are three defensible readings, and the choice is the owner's:

1. **Scale-invariant match** — treat `2178` as the resonance number and match a day-offset against
   `99 × {22, 33, 44, 66, 77, 88}` directly. This is what the numbers *are*.
2. **Tolerance match** — reproduce the desktop behaviour: match `Y / 10` or `Y / 100` against the
   fractional entries within a stated window.
3. **Leave it inert** — keep parity with the browser build, and document that the filter is
   decorative.

The rewrite currently does (3), because parity was the priority. Implementing (1) is a single edit
to `src/data/msrf.js` plus one trait in `src/core/scoring/traits.js`.

## 6. The 2178 that is also a year

The ledger's final entry is **2178 CE — "Simulation Collapse; 138 yr after the 2040 reset"**. It is
also a Phoenix node (`2178 mod 138 = 108`).

That the terminal year of the chronology is also the attractor of the number system is, within the
thesis, the point. Outside it, it is a coincidence that the thesis selected for. This document
establishes what the arithmetic does; it makes no claim about the chronology, and the two should not
be confused for one another.

---

*Reproduce with `node tools/vortex-analysis.mjs`. Community claims from the PSYFR group, August 2026,
tested rather than assumed.*
