# The 10 Mirrors

Ten operations, numbered **27–36**, that complete the X1/X2 grid of the sixteen using the same constants. Added October 18, 2026.

The sixteen leave gaps. They run several forms on only one anchor: the isometric date, the holo-date, Y/CRV, Y/PHI, (Y/2)×PHI and Y×PHI appear on X2 but never on X1. They also never halve the hepta-cycle, and never divide by π. The Mirrors fill those ten gaps.

| # | Operation | Plain form | Mirrors |
|---|---|---|---|
| 27 | `X1+oph_round(Y)` | Y + X1, the isometric date on X1 | #1 |
| 28 | `X1+oph_flip(oph_round(Y))` | Y reversed + X1, the holo-date on X1 | #2 |
| 29 | `X1+Y/OPH_CRV` | Y / 5.08 + X1 | #3 |
| 30 | `X1+Y/OPH_PHI` | Y / 1.618 + X1 | #5 |
| 31 | `X1+(Y/2.0)xOPH_PHI` | Y / 2 × 1.618 + X1 | #6 |
| 32 | `X1+YxOPH_PHI` | Y × 1.618 + X1 | #9 |
| 33 | `X1+(Y/2.0)xOPH_HEP` | Y / 2 × 7.01 + X1, the half hepta-cycle | #15 (as #4 does #10) |
| 34 | `X2+(Y/2.0)xOPH_HEP` | Y / 2 × 7.01 + X2, the half hepta-cycle | #16 |
| 35 | `X1+Y/OPH_PI` | Y / 3.14 + X1 | division by π, which the sixteen never do |
| 36 | `X2+Y/OPH_PI` | Y / 3.14 + X2 | division by π, on X2 |

## The completed grid

With the Mirrors added, every form below runs on both anchors.

| Form | X1 | X2 |
|---|---|---|
| Y (isometric date) | **27** | 1 |
| Y reversed (holo-date) | **28** | 2 |
| Y / CRV | **29** | 3 |
| Y / PHI | **30** | 5 |
| (Y/2) × PHI | **31** | 6 |
| Y × PHI | **32** | 9 |
| (Y/2) × CRV | 7 | 11 |
| Y × CRV | 13 | 14 |
| (Y/2) × PI | 4 | 8 |
| Y × PI | 10 | 12 |
| Y / PI | **35** | **36** |
| (Y/2) × HEP | **33** | **34** |
| Y × HEP | 15 | 16 |

Bold = a Mirror.

## How they behave

- All ten are **beta, weight 0.5**, and arrive **switched off**. Nothing that cast before casts differently until you tick them.
- The pack is **additive**: adding it appends rows 27–36 and leaves the sixteen, and their numbering, untouched. Adding it twice does nothing.
- The **Extras** (17–26: e, 1.38, 5.52, 2.178, 0.360) are the other additive pack. With both added, the table runs all **36**.

## Where to find them

| App | Repo | How to add |
|---|---|---|
| OPHIS · Pattern-Recognition Event Prediction (`index.html` + `src/`, and its single-file build `ophis-single.html`) | natori-on-psyfr | Mirrors, in the pack bar on the Operations screen |
| `ophis-single.html` (older single-file build) | OPHIS-Pattern-Recognition-Event-Prediction_files | Mirrors pack button |
| Natorion Cipher (`natorion/`) | NatorionCipherPredictiveEngine | **Add mirrors** button |
| Ophis Web (`web/`) | NatorionCipherPredictiveEngine | **Mirrors** button; listed as O27–O36 in the formula reference |
| `OPHIS-Natorion-Cipher.html` | NatorionCipherPredictiveEngine · natori-on-psyfr | Mirrors pack, beside Extras |
| `index.html`, `ophis-psyfy-natorion-cipher.html` | OPHIS-Pattern-Recognition-Event-Prediction_files | Mirrors pack button |

To open all 36 in the original Ophis v12 desktop app, use **Export → Save for Ophis v12** in natori-on-psyfr.
