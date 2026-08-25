# 21 — Eclipse Data: Provenance, Dating Convention, and Correctness

**Scope.** The one place Ophis / NATORI-ON-PSYFR touches real astronomy: the bundled solar and
lunar eclipse catalogues. This document establishes (a) what the source data actually is,
(b) exactly what the shipped tables are, (c) **what calendar and time scale the dates are in**,
and (d) how far the shipped tables are from the astronomy they claim to represent.

Everything below is derived by reading bytes and re-deriving the shipped files from the CSVs.
No binary was executed. Every quantitative claim in this document was produced by a
reconstruction script, and the two headline reconstructions are **exact**: 7127/7127 and
4624/4624 records reproduced bit-for-bit.

**Prior art.** `docs/reverse/12-astronomy-data.md` already documents the file inventory, the
three-block layout, the two-digit-year bug and the unsorted-binary-search bug. This document does
not repeat those derivations; it supplies what that pass did not have — the **calendar and time
scale**, the upstream identification with evidence, a per-record error census against true
astronomy, and the corrections that follow for the rewrite.

---

## 0. Executive summary

| Question | Answer |
|---|---|
| Upstream source | NASA/Espenak–Meeus *Five Millennium Canon*, via Kaggle. **Cited in the file itself**, and independently confirmed by record counts, type codes, ΔT column and Saros arithmetic. Confidence: high. |
| Calendar convention of the source | **Julian calendar before 1582 Oct 15, Gregorian from 1582 Oct 15 on.** Proven, not assumed — see §4.2. |
| Time scale of the source | **TD (Terrestrial Dynamical Time)**, with ΔT supplied as a separate column. Confirmed against three published NASA greatest-eclipse times. |
| Does the app honour either convention? | **No.** It treats every date label as proleptic Gregorian and every time as UTC. |
| Fraction of shipped solar records whose date is exactly right | **42.4 %** (3019 / 7127) |
| Fraction within ±1 day of truth | **59.7 %** (4256 / 7127) |
| Fraction ≥ 2 days wrong | **37.0 %** (2646 / 7127), from the Julian-read-as-Gregorian error |
| Fraction wrong by ~1900 years | **3.2 %** (225 / 7127), from the two-digit-year bug |
| Share of the rewrite's solar table in **1969–2068** that is fabricated | **50.3 %** (225 of 447) |
| Share of the rewrite's lunar table in **1969–2068** that is fabricated | **49.8 %** (142 of 285) |
| Is ±1 day the right tolerance? | Yes for the post-1582 records, for the wrong reason. It cannot rescue the pre-1582 records, and it makes the fabricated records *more* damaging, not less. |

---

## 1. The CSVs — record shape, meanings, range, counts

Both files live at `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/lib/` and are byte-identical
to the copies inside the v9 and v12 asars (`reference/asar/unpacked/lib/`,
`reference/asar9/unpacked/lib/` — SHA-256 verified identical across all three trees).

### 1.1 `solar.csv` — 11 898 records + header (11 899 lines, 1 038 349 bytes)

Header (`lib/solar.csv:1`):

```
Catalog Number,Calendar Date,Eclipse Time,Delta T (s),Lunation Number,Saros Number,Eclipse Type,Gamma,Eclipse Magnitude,Latitude,Longitude,Sun Altitude,Sun Azimuth,Path Width (km),Central Duration
```

First data row (`lib/solar.csv:2`):

```
00001,-1999 June 12,03:14:51,46438,-49456,5,T,-0.2701,1.0733,6.0N,33.3W,74,344,247,06m37s
```

Last data row (`lib/solar.csv:11899`):

```
11898,3000 October 19,16:10:16,4428,12378,169,H,-0.2303,1.0049,23.1S,51.6W,77,16,17,00m29s
```

A modern, independently verifiable row (`lib/solar.csv:9547`):

```
09546,2017 August 21,18:26:40,70,218,145,T,0.4367,1.0306,37.0N,87.7W,64,198,115,02m40s
```

| Field | Meaning |
|---|---|
| `Catalog Number` | 1-based sequence in the canon, zero-padded to 5 (`"00001"`). Monotonic; equals line number − 1. |
| `Calendar Date` | `"<astronomical year> <MonthName> <day>"`. **No zero padding on the year.** Year 0 exists (= 1 BCE); BCE years are written with a leading minus (`-1999` = 2000 BCE). **Calendar is Julian before 1582 Oct 15, Gregorian after** (§4). |
| `Eclipse Time` | `HH:mm:ss` of **greatest eclipse, in TD** (§4.1). Not UT, not UTC, not local. |
| `Delta T (s)` | ΔT = TD − UT in whole seconds. Negative for ~1870–1900. `UT = TD − ΔT`. |
| `Lunation Number` | Brown lunation number, 0 at the new moon of 2000 Jan 6. |
| `Saros Number` | Saros series. Consecutive members of a series are 6585.3211 d apart (this is the lever used in §4.2). |
| `Eclipse Type` | 1–2 chars. First char `P`/`A`/`T`/`H`; optional second char per the legend quoted at `src/ophis_view__chart_datasets.js:1531-1547`. 19 distinct values. |
| `Gamma` | Least distance of the Moon's shadow axis from Earth's centre, in Earth radii. |
| `Eclipse Magnitude` | Fraction of the solar diameter obscured at greatest eclipse. |
| `Latitude` / `Longitude` | Geographic point of greatest eclipse, as `"6.0N"` / `"33.3W"` strings. |
| `Sun Altitude` / `Sun Azimuth` | Degrees, at greatest eclipse. |
| `Path Width (km)` | Central path width; `-` or empty for non-central. |
| `Central Duration` | `"06m37s"`; `-` or empty for non-central. |

Date range: **−1999 June 12 → 3000 October 19**.

Type histogram (all 11 898):
`P 3875, A 3755, T 3049, H 502, Pb 163, Pe 162, Tm 72, Am 72, An 36, A+ 34, A- 34, H3 26, As 25, H2 24, Hm 17, T- 17, Tn 14, Ts 12, T+ 9`.

### 1.2 `lunar.csv` — 12 064 records + header (12 065 lines, 1 116 027 bytes)

Header (`lib/lunar.csv:1`):

```
Catalog Number,Calendar Date,Eclipse Time,Delta T (s),Lunation Number,Saros Number,Eclipse Type,Quincena Solar Eclipse,Gamma,Penumbral Magnitude,Umbral Magnitude,Latitude,Longitude,Penumbral Eclipse Duration (m),Partial Eclipse Duration (m),Total Eclipse Duration (m)
```

First data row (`lib/lunar.csv:2`):

```
00001,-1999 June 26,14:13:28,46437,-49456,17,N,t-,-1.0981,0.8791,-0.1922,24S,22W,268.8,-,-
```

Last data row (`lib/lunar.csv:12065`):

```
12064,3000 November 4,05:45:18,4428,12378,181,N,h-,-1.217,0.6326,-0.3828,14N,72W,214.8,-,-
```

The first record kept by the app (`lib/lunar.csv:4822`) — note this is where the shipped table begins:

```
04821,0 January 10,02:04:40,10534,-24737,63,T-,p-,-0.0445,2.7699,1.7825,22N,16E,327.2,213.8,98.8
```

Fields shared with solar are identical in meaning. The lunar-only fields:

| Field | Meaning |
|---|---|
| `Eclipse Type` | `N` penumbral, `Nb`/`Ne`/`Nx` penumbral variants, `P` partial, `T`/`T+`/`T-`/`Tm` total. **All `N*` types are discarded by the app.** |
| `Quincena Solar Eclipse` | Two characters describing the solar eclipse one fortnight before / after (`t`, `a`, `h`, `p`, `-`). Purely informational; never read. |
| `Penumbral Magnitude` | Fraction of lunar diameter inside the penumbra. |
| `Umbral Magnitude` | Fraction inside the umbra. **Negative ⟺ penumbral-only**; filtering on `> 0` selects exactly the same 7686 rows as filtering on `!type.startsWith("N")` (verified). |
| `Penumbral / Partial / Total Eclipse Duration (m)` | Minutes, or `-`. |

Date range: **−1999 June 26 → 3000 November 4**.

Type histogram (all 12 064): `P 4207, N 4020, T 1405, T+ 1042, T- 1032, Nx 141, Ne 115, Nb 102`.

### 1.3 The CSVs are dead weight at runtime

`lib/solar.csv` and `lib/lunar.csv` (≈ 2.1 MB) are packed inside the shipped asar but **nothing
references them**. The only `.csv` strings in `src/` are the *export* filename builders
(`src/ophis_view__export.js:85,88,386`). They are reference copies only.

---

## 2. CSV → `*_orig.js` → `*_processed.js` — what is loaded, and exactly what the processing did

### 2.1 The chain, and which link runs

```
NASA five-millennium canon
        │
        ▼ (published as a Kaggle dataset)
    solar.csv / lunar.csv          ← shipped, never loaded
        │
        ▼ csvjson.com/csv2json
 solar_eclipses_orig.js (5.5 MB) / lunar_eclipses_orig.js (6.6 MB)
        │                          ← shipped, script tags COMMENTED OUT
        ▼ optimizeEclipseData()    ← dead code; its call site is also commented out
 solar_eclipses_processed.js (359 KB) / lunar_eclipses_processed.js (234 KB)
        │                          ← THIS is what the desktop app loads
        ▼ tools/extract-data.mjs (rewrite)
 src/data/eclipses.data.js         ← what NATORI-ON-PSYFR ships
```

`reference/asar/unpacked/ophis.html:59-60,69-70`:

```html
<!-- <script src="./lib/lunar_eclipses_orig.js"></script> -->
<!-- <script src="./lib/solar_eclipses_orig.js"></script> -->
...
<script src="./lib/lunar_eclipses_processed.js"></script>
<script src="./lib/solar_eclipses_processed.js"></script>
```

The v9 asar has the identical arrangement at `ophis.html:58-59,68-69`.

**Consequence:** `LUNAR_ECLIPSES_ORIG` / `SOLAR_ECLIPSES_ORIG` are **undefined at runtime**. The
only reference to them is `src/ophis_view__chart_datasets.js:1564`, inside `optimizeEclipseData()`,
whose only call site (`src/ophis_main.js:213-214`) is itself commented out. Re-enabling
`ophis_main.js:213-214` alone does not "regenerate the tables" — it throws
`ReferenceError: SOLAR_ECLIPSES_ORIG is not defined` during `init_step3`.

### 2.2 `optimizeEclipseData()` verbatim (`src/ophis_view__chart_datasets.js:1559-1600`)

```js
function optimizeEclipseData(eclipseType) {
    var toReturn = [];

    var originalArray = eclipseType == ECLIPSE_TYPE__LUNAR ? LUNAR_ECLIPSES_ORIG : SOLAR_ECLIPSES_ORIG;

    for( var i = 0; i < originalArray.length; i++ ) {
        var ith = originalArray[i];

        var ithDate = ith["Calendar Date"];

        if ( ithDate.startsWith("-") ) {
            // Skip eclipses in the B.C. era. There's some issue with date/time parsing if I recall, for negative years.
            continue;
        }

        var ithTime = ith["Eclipse Time"];
        var ithType = ith["Eclipse Type"];

        if ( eclipseType == ECLIPSE_TYPE__LUNAR && ithType.startsWith("N") ) {
            // Skip Penumbral eclipses, the ones that you can barely see.
            continue;
        } else {
            var timestamp = ithDate + " " + ithTime;
            var ithMoment = moment.utc(timestamp, ECLIPSE_DATA_TIMESTAMP_FORMAT);
            var nativeDate = ithMoment.toDate();
            var eclipseDateAsXDate = nativeDateToXDate(nativeDate, 0, 0);
            var eclipseDateTimeZero = xDateToNativeDateForController(EVENT_SCOPE__DAYS, eclipseDateAsXDate);

            toReturn.push({
                date_millis: eclipseDateTimeZero.getTime(),
                eclipse_type: ithType
            });
        }
    }

    return toReturn;
}
```

with (`src/ophis_view__chart_datasets.js:1522-1524`):

```js
var ECLIPSE_DATA_TIME_FORMAT = "HH:mm:ss"
var ECLIPSE_DATA_DATE_FORMAT = "YYYY, MMMM D";
var ECLIPSE_DATA_TIMESTAMP_FORMAT = ECLIPSE_DATA_DATE_FORMAT + " " + ECLIPSE_DATA_TIME_FORMAT;
```

(The comma in `"YYYY, MMMM D"` is not present in the data. Moment's non-strict parser ignores the
mismatch, so it is harmless — but it is a tell that nobody re-read the CSV.)

### 2.3 The exact transform, restated as an equation

Both shipped files are reproduced **exactly** by:

```
keep row  ⟺  ¬CalendarDate.startsWith("-")            [solar]
             ∧ ¬EclipseType.startsWith("N")           [lunar only]

date_millis  = moment.utc(CalendarDate + " " + EclipseTime, "YYYY, MMMM D HH:mm:ss")
                 .local()          // generator machine TZ = America/New_York
                 .startOf('day')   // local midnight
                 .valueOf()

eclipse_type = CalendarDate's row's "Eclipse Type", verbatim
```

Verification (script run against `lib/*.csv` with `TZ=America/New_York`):

```
SOLAR mismatches 0 of 7127
LUNAR mismatches 0 of 4624
```

Record counts follow arithmetically:

| | CSV rows | BCE dropped | penumbral dropped | kept |
|---|---:|---:|---:|---:|
| solar | 11 898 | 4 771 | — | **7 127** |
| lunar | 12 064 | 4 820 | 4 378 | **4 624** |

The generator machine's timezone is provable from the data: pre-1883 records carry
`04:56:02Z`, which is midnight at America/New_York's LMT offset of −04:56:02; post-1883 records
sit on `05:00:00Z` (EST) or `04:00:00Z` (EDT). The shipped tables are therefore **timezone-baked**:
they encode "the calendar day in New York", not "the calendar day of the eclipse".

### 2.4 The two-digit-year corruption, restated with the mechanism named

Moment's `YYYY` parse token applies `hooks.parseTwoDigitYear` when the matched substring is
**exactly two characters long**. Moment's default window is `y + (y > 68 ? 1900 : 2000)`. Because
the CSV writes years unpadded:

| CSV year string | length | parsed year | correct? |
|---|---:|---|---|
| `"0"` … `"9"` | 1 | 0 … 9 | yes |
| `"10"` … `"68"` | 2 | **2010 … 2068** | no |
| `"69"` … `"99"` | 2 | **1969 … 1999** | no |
| `"100"` … `"3000"` | 3–4 | 100 … 3000 | yes |
| `"-1999"` | — | (dropped before parsing) | n/a |

This is the moment-specific 68/69 cutoff, not V8's. V8's own string parser windows differently
(it maps `"68"`→1968 and `"9"`→2009), and reproducing the shipped files with `new Date(...)`
fails. Only moment reproduces them.

Corrupted record counts: **225 solar**, **142 lunar**. Every one of them lands more than one day
from any genuine record — i.e. **not one of the 367 is accidentally harmless**.

---

## 3. Upstream source

### 3.1 Direct evidence

`lib/solar_eclipses_orig.js:1-2` and `lib/lunar_eclipses_orig.js:1-2` both begin:

```js
// From https://www.kaggle.com/datasets/nasa/solar-eclipses
// JavaScript generated with https://csvjson.com/csv2json
```

(The lunar file cites the *solar* Kaggle slug — a copy-paste slip in the header comment. The
lunar payload is unambiguously lunar.)

The app's own help text (`src/ophis_main.js:512`) says:

> `"...eclipse dates are sourced from a NASA database: <a href='https://science.nasa.gov/eclipses/'>..."`

### 3.2 Corroborating evidence, independent of the comment

1. **Record counts match the published canon exactly.** 11 898 solar eclipses and 12 064 lunar
   eclipses over −1999 → +3000 are the canonical totals of the Espenak & Meeus *Five Millennium
   Canon of Solar Eclipses: −1999 to +3000* and its lunar companion.
2. **The type-code alphabet is Espenak's**, including the second-character modifiers
   (`m` middle of Saros, `n`/`s` central with no northern/southern limit, `+`/`-` non-central with
   no northern/southern limit, `2`/`3` hybrid ordering, `b`/`e` Saros begins/ends). The legend is
   transcribed into the source at `src/ophis_view__chart_datasets.js:1531-1547`.
3. **A `Delta T (s)` column exists at all**, with values (46 438 s at −1999, 128 s at 1582, 70 s at
   2017, 4428 s at +3000) that track Espenak's ΔT polynomial fits.
4. **Saros arithmetic closes to the day** across all 11 694 same-series consecutive pairs (§4.2).
5. **Three spot times match NASA's published greatest-eclipse TD values exactly**: 2017 Aug 21
   `18:26:40`, 2024 Apr 8 `18:18:29`, 1999 Aug 11 `11:04:09`.

**Conclusion: the upstream is the NASA / Espenak–Meeus five-millennium canon.** Confidence: high.
What is *not* established is which Kaggle snapshot / which canon revision, and therefore whether
any late Espenak corrections are present. Nothing in the shipped bytes carries a version stamp.

---

## 4. The dating convention — the key question

### 4.1 Time scale: TD, not UT, not UTC

`Eclipse Time` is the instant of **greatest eclipse in Terrestrial Dynamical Time**. Evidence:

| Eclipse | CSV `Eclipse Time` | CSV ΔT | NASA published |
|---|---|---:|---|
| 2017 Aug 21 solar (`solar.csv:9547`) | `18:26:40` | 70 s | 18:26:40 TD / 18:25:30 UT1 |
| 2024 Apr 8 solar (`solar.csv:9563`) | `18:18:29` | 74 s | 18:18:29 TD / 18:17:15 UT1 |
| 1999 Aug 11 solar (`solar.csv:9507`) | `11:04:09` | 64 s | 11:04:09 TD / 11:03:05 UT1 |

The `Delta T (s)` column exists precisely so a consumer can compute `UT = TD − ΔT`. **Ophis never
reads it.** For 20th–21st-century records the omission costs ~70 s and is irrelevant. For early-CE
records it is not: ΔT is 10 529 s (2 h 55 m) at year 0 and 9 551 s (2 h 39 m) at year 100, which is
enough to move the calendar day.

### 4.2 Calendar: Julian before 1582 Oct 15, Gregorian from 1582 Oct 15 — proven

This is the question that matters, and it is answerable from the data alone.

**Method.** Members of a Saros series are separated by exactly 6585.3211 days. Group all 11 898
solar records by `Saros Number`, take consecutive pairs, convert each `Calendar Date` +
`Eclipse Time` to a Julian Day under two rival hypotheses, and look at the residual
`Δ − 6585.3211`:

* **Hypothesis G** — every date is proleptic Gregorian.
* **Hypothesis M** — dates before 1582 Oct 15 are Julian, from 1582 Oct 15 on Gregorian.

**Result** (11 694 pairs):

```
greg   pairs 11694   |err|>1.5d: 41    worst 10.05 d   err histogram { 0: 10509,  10: 41,  -1: 1144 }
mixed  pairs 11694   |err|>1.5d:  0    worst  0.00 d   err histogram { 0: 11694 }
```

Under Hypothesis M **every single pair closes to within half a day of the exact Saros period**.
Under Hypothesis G, exactly the 41 pairs that straddle October 1582 are off by **precisely +10
days** — the Gregorian reform's dropped decade.

A second, human-readable check on the same boundary. `solar.csv:8501-8503`:

```
08500,1582 June 20,...
08501,1582 December 25,...
08502,1583 June 19,...
```

Read as all-Gregorian, June 20 → December 25 is **188 days** — not a possible eclipse-season gap
(the only options are ≈29.53, ≈147.7 and ≈177.2 days). Read correctly (June 20 is *Julian*, i.e.
June 30 Gregorian) the gap is **178 days** ≈ 6 synodic months. The following gap, Gregorian on both
sides, is 176 days. The discontinuity sits exactly where the reform does.

**Verdict.** The CSVs use the standard eclipse-canon convention: **astronomical year numbering
(year 0 = 1 BCE), Julian calendar through 1582 October 4, Gregorian from 1582 October 15, times in
TD.** This is established, not assumed.

**What remains uncertain:** nothing about the calendar. The residual uncertainties are (i) which
canon revision the Kaggle snapshot captured, and (ii) whether `Latitude`/`Longitude` are geodetic
or geocentric — neither is read by the app, so neither matters here.

### 4.3 What the app does with that convention

Nothing. `optimizeEclipseData` hands the raw label to `moment.utc(...)`, which is a **proleptic
Gregorian** parser, and hands the raw TD clock time to a **UTC** parser. So the stored value is:

> the calendar day, in America/New_York, of the instant you get by pretending a Julian date is
> Gregorian and pretending a TD clock reading is UTC.

Three independent errors stack:

| Error | Magnitude | Records affected (solar) |
|---|---|---:|
| Julian label read as proleptic Gregorian | +2 d (year 0) → 0 d (c. 200–300) → −10/−11 d (1582) | 3 729 |
| TD read as UT | up to −3 h at year 0, ≤ −75 s after 1600 | all, but only day-changing early |
| UT instant re-expressed as a New York calendar day | −1 d whenever UT hour < ~05:00 | ~20 % of all |

Note the Julian error **changes sign**: the Julian and Gregorian calendars coincide roughly
200–300 CE, so records there are accidentally correct.

---

## 5. Per-record error census — the shipped table vs. real astronomy

Truth for each record = `floor(JD_mixed(CalendarDate) + TD/24h − ΔT/86400 + 0.5)`, i.e. the
proleptic-Gregorian Julian Day Number of the UT instant of greatest eclipse.

### 5.1 Shift histogram (stored JDN − true JDN)

**SOLAR** (7127 records):

```
    0 d : 3019      +1 d :  209      +2 d :   25
   -1 d : 1028      -2 d :  265      -3 d :  265      -4 d :  402
   -5 d :  264      -6 d :  248      -7 d :  444      -8 d :  271
   -9 d :  229     -10 d :  204     -11 d :   29
  +693961 d : 4    +693962 d : 72    +730486 d : 9    +730487 d : 140   ← the 225 corrupted rows
```

**LUNAR** (4624 records):

```
    0 d : 1957      +1 d :  132      +2 d :   18
   -1 d :  673      -2 d :  161      -3 d :  170      -4 d :  266
   -5 d :  177      -6 d :  169      -7 d :  270      -8 d :  187
   -9 d :  153     -10 d :  125     -11 d :   24
  +693961 d : 4    +693962 d : 43    +730486 d : 2    +730487 d : 93    ← the 142 corrupted rows
```

Roll-up:

| | solar | lunar |
|---|---:|---:|
| exactly right | 3 019 (42.4 %) | 1 957 (42.3 %) |
| within ±1 day | 4 256 (59.7 %) | 2 762 (59.7 %) |
| 2–11 days wrong | 2 646 (37.1 %) | 1 725 (37.3 %) |
| ~1900 years wrong | 225 (3.2 %) | 142 (3.1 %) |

Restricted to eclipses whose **true** date falls in 1900–2100:

| | genuine records | stored exactly right | stored 1 day early | stored worse |
|---|---:|---:|---:|---:|
| solar | 454 | 368 | 86 | 0 |
| lunar | 288 | 225 | 63 | 0 |

So in the modern era the *genuine* records are never worse than one day early — and that one day is
purely the New-York-midnight artefact. The modern-era damage is entirely the **fabricated** records.

### 5.2 Spot check — 26 solar records spread across the range

`stored JDN` is decoded from the rewrite's `src/data/eclipses.data.js` (`ECL_S_BASE` + cumulative
`ECL_S_D`), so this table simultaneously validates the rewrite's tables against the CSVs.

| Catalog | CSV date (NASA) | TD | ΔT s | true UT date (Greg) | stored date | shift |
|---|---|---|---:|---|---|---|
| 04772 | 0 June 20 (Julian) | 13:45:32 | 10529 | 0000-06-18 | 0000-06-20 | **+2 d** |
| 05282 | 210 September 5 (Julian) | 22:11:04 | 8500 | 0210-09-05 | 0210-09-05 | 0 |
| 05567 | 337 November 9 (Julian) | 07:29:17 | 7278 | 0337-11-10 | 0337-11-09 | −1 d |
| 05852 | 463 August 30 (Julian) | 12:11:41 | 6039 | 0463-08-31 | 0463-08-30 | −1 d |
| 06137 | 578 December 14 (Julian) | 17:51:31 | 4916 | 0578-12-16 | 0578-12-14 | −2 d |
| 06422 | 692 April 22 (Julian) | 09:14:36 | 3862 | 0692-04-25 | 0692-04-22 | −3 d |
| 06707 | 814 September 17 (Julian) | 14:39:24 | 2821 | 0814-09-21 | 0814-09-17 | −4 d |
| 06992 | 942 May 17 (Julian) | 23:50:31 | 1905 | 0942-05-22 | 0942-05-17 | −5 d |
| 07277 | 1064 October 13 (Julian) | 00:46:25 | 1234 | 1064-10-19 | 1064-10-12 | **−7 d** |
| 07562 | 1179 March 10 (Julian) | 07:39:51 | 792 | 1179-03-17 | 1179-03-10 | −7 d |
| 07847 | 1293 December 29 (Julian) | 05:09:12 | 499 | 1294-01-05 | 1293-12-29 | −7 d |
| 08132 | 1419 March 26 (Julian) | 09:50:57 | 291 | 1419-04-04 | 1419-03-26 | −9 d |
| 08417 | 1545 December 4 (Julian) | 03:15:42 | 153 | 1545-12-14 | 1545-12-03 | **−11 d** |
| 08703 | 1666 December 25 (Greg) | 17:59:16 | 27 | 1666-12-25 | 1666-12-25 | 0 |
| 08988 | 1779 June 14 (Greg) | 08:51:28 | 17 | 1779-06-14 | 1779-06-14 | 0 |
| 09273 | 1897 February 1 (Greg) | 20:15:15 | −6 | 1897-02-01 | 1897-02-01 | 0 |
| **05007** | **94 June 1 (Julian)** | 20:51:32 | 9606 | 0094-05-30 | **1994-06-01** | **+693 962 d** |
| **04922** | **59 October 25 (Julian)** | 08:26:50 | 9941 | 0059-10-23 | **2059-10-25** | **+730 487 d** |
| 09903 | 2174 March 3 (Greg) | 13:11:54 | 381 | 2174-03-03 | 2174-03-03 | 0 |
| 10188 | 2289 July 18 (Greg) | 06:50:58 | 684 | 2289-07-18 | 2289-07-18 | 0 |
| 10473 | 2403 November 15 (Greg) | 03:36:24 | 1068 | 2403-11-15 | 2403-11-14 | −1 d |
| 10758 | 2525 April 23 (Greg) | 23:30:15 | 1568 | 2525-04-23 | 2525-04-23 | 0 |
| 11043 | 2652 June 28 (Greg) | 02:31:12 | 2191 | 2652-06-28 | 2652-06-27 | −1 d |
| 11328 | 2774 January 4 (Greg) | 17:20:31 | 2884 | 2774-01-04 | 2774-01-04 | 0 |
| 11613 | 2886 May 25 (Greg) | 00:04:54 | 3608 | 2886-05-24 | 2886-05-24 | 0 |
| 11898 | 3000 October 19 (Greg) | 16:10:16 | 4428 | 3000-10-19 | 3000-10-19 | 0 |

### 5.3 Spot check — 26 lunar records

| Catalog | CSV date (NASA) | TD | ΔT s | true UT date (Greg) | stored date | shift |
|---|---|---|---:|---|---|---|
| 04821 | 0 January 10 (Julian) | 02:04:40 | 10534 | 0000-01-07 | 0000-01-09 | +2 d |
| 05329 | 207 May 29 (Julian) | 01:20:47 | 8531 | 0207-05-28 | 0207-05-28 | 0 |
| 05620 | 335 December 16 (Julian) | 15:39:41 | 7297 | 0335-12-17 | 0335-12-16 | −1 d |
| 05897 | 455 July 15 (Julian) | 03:14:53 | 6119 | 0455-07-16 | 0455-07-14 | −2 d |
| 06190 | 571 April 25 (Julian) | 19:02:19 | 4989 | 0571-04-27 | 0571-04-25 | −2 d |
| 06487 | 687 July 30 (Julian) | 06:46:23 | 3904 | 0687-08-02 | 0687-07-30 | −3 d |
| 06777 | 807 August 21 (Julian) | 23:39:45 | 2877 | 0807-08-25 | 0807-08-21 | −4 d |
| 07055 | 930 January 17 (Julian) | 13:48:41 | 1984 | 0930-01-22 | 0930-01-17 | −5 d |
| 07341 | 1050 August 5 (Julian) | 14:59:51 | 1301 | 1050-08-11 | 1050-08-05 | −6 d |
| 07639 | 1167 September 30 (Julian) | 14:24:46 | 829 | 1167-10-07 | 1167-09-30 | −7 d |
| 07935 | 1284 December 24 (Julian) | 03:56:38 | 517 | 1284-12-31 | 1284-12-23 | −8 d |
| 08222 | 1407 May 22 (Julian) | 01:19:29 | 307 | 1407-05-31 | 1407-05-21 | **−10 d** |
| 08506 | 1533 February 9 (Julian) | 11:13:52 | 164 | 1533-02-19 | 1533-02-09 | −10 d |
| 08795 | 1652 September 17 (Greg) | 18:19:29 | 45 | 1652-09-17 | 1652-09-17 | 0 |
| 09092 | 1768 June 30 (Greg) | 03:56:19 | 16 | 1768-06-30 | 1768-06-29 | −1 d |
| 09381 | 1884 October 4 (Greg) | 22:01:55 | −6 | 1884-10-04 | 1884-10-04 | 0 |
| 09625 | 1989 August 17 (Greg) | 03:09:07 | 57 | 1989-08-17 | 1989-08-16 | −1 d |
| 09774 | 2055 August 7 (Greg) | 10:53:18 | 104 | 2055-08-07 | 2055-08-07 | 0 |
| 10034 | 2166 February 15 (Greg) | 01:11:40 | 363 | 2166-02-15 | 2166-02-14 | −1 d |
| 10322 | 2282 November 16 (Greg) | 08:23:04 | 664 | 2282-11-16 | 2282-11-16 | 0 |
| 10614 | 2398 August 28 (Greg) | 09:06:27 | 1049 | 2398-08-28 | 2398-08-28 | 0 |
| 10904 | 2520 July 31 (Greg) | 15:22:37 | 1546 | 2520-07-31 | 2520-07-31 | 0 |
| 11190 | 2647 October 5 (Greg) | 23:42:33 | 2166 | 2647-10-05 | 2647-10-05 | 0 |
| 11476 | 2768 April 24 (Greg) | 06:18:26 | 2849 | 2768-04-24 | 2768-04-24 | 0 |
| 11771 | 2883 August 9 (Greg) | 23:39:02 | 3589 | 2883-08-09 | 2883-08-09 | 0 |
| 12061 | 2999 November 14 (Greg) | 16:41:25 | 4421 | 2999-11-14 | 2999-11-14 | 0 |

### 5.4 The rewrite's tables vs. the desktop's — exact agreement

Independent of astronomy, the rewrite's shipped tables are a faithful re-encoding of
`lib/*_processed.js`:

```
S processed 7127  rewrite 7127  mismatches 0
L processed 4624  rewrite 4624  mismatches 0
```

(comparison is on `(JDN, first type letter)` after sorting the processed array chronologically).

Confirmed properties of `src/data/eclipses.data.js`:

* `ECL_S_BASE = 1721231` = proleptic-Gregorian **0000-06-20**; last solar JD `2817079` = **3000-10-19**.
* `ECL_L_BASE = 1721068` = **0000-01-09**; last lunar JD `2816740` = **2999-11-14**.
* Both delta strings decode to strictly increasing, duplicate-free sequences (**the rewrite sorted
  the tables**; the original arrays are not sorted — see §6.2).
* Type collapse to the first letter is exact: solar `P 2502 / A 2411 / T 1918 / H 296`
  (= `P+Pb+Pe`, `A+A±+Am+As+An`, `T+Tm+T±+Tn+Ts`, `H+Hm+H2+H3`); lunar `T 2087` (= `T+T+ +T-`)
  and `P 2537`.

---

## 6. Tolerance, lookup behaviour, and how much an "eclipse coincidence" tag is worth

### 6.1 The two tolerances are not the same number

Original (`src/ophis_config.js:112-115`):

```js
var LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS = 1;
var ECLIPSE_DATE_MATCH_TOLERANCE_IN_DAYS = 1.25;
var LUNAR_DATE_MATCH_TOLERANCE = MILLIS_PER_DAY*LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS;
var ECLLIPSE_DATE_MATCH_TOLERANCE = MILLIS_PER_DAY*ECLIPSE_DATE_MATCH_TOLERANCE_IN_DAYS;
```

Rewrite (`src/core/cast.js:33`): `eclipseTolerance: 1`.

**These are behaviourally equivalent, and the rewrite's is the honest spelling.** Both sides of the
original comparison are local-midnight timestamps, so their difference is always a whole number of
days ± at most one hour of DST slack. 1.25 d = 108 000 000 ms admits a 1-day difference
(86 400 000 ± 3 600 000) and rejects a 2-day difference (172 800 000 ± 3 600 000). The extra 0.25 d
exists only to absorb DST/LMT wobble. On integer JDNs, `≤ 1` is exactly the same predicate.

(The four checkbox tooltips at `src/ophis_config.js:189,233,242,251,260` all interpolate
`LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS`, so the UI advertises "1 day" for eclipses too. Given the
above, the tooltip is accidentally telling the truth.)

### 6.2 The rewrite's sort is a behaviour change, and it is a regression in the modern era

`binarySearchForEclipse` (`src/ophis_view__chart_datasets.js:36-58`) binary-searches an array that
is **not sorted** — the corrupted rows keep their early CSV position while carrying 20th/21st-century
timestamps, producing three ascending runs. The rewrite's `decode()` output *is* sorted
(`src/core/eclipses.js:20-33`), because the extraction pipeline sorted it.

Simulated day-by-day over the whole covered range, original array vs. sorted array, tolerance ±1 d:

| | solar | lunar |
|---|---:|---:|
| Days where the **sorted** table hits and the **original** misses | 1 260 | 813 |
| Days where the **original** hits and the sorted misses | 0 | 0 |
| Days where both hit but disagree on type | 0 | 0 |
| Records unreachable by the original search at their own date | **420** / 7127 | **271** / 4624 |

Those 420 unreachable solar records decompose exactly as:

* **195** genuine records in years 100–199 CE — real data loss in the original;
* **225** corrupted records at 1969–2068 — which the unsortedness happened to make **unreachable**,
  i.e. the original's second bug was masking its first.

Sorting removes the mask. The rewrite therefore:

* **fixes** 195 solar / 129 lunar genuine 2nd-century false negatives, and
* **activates** 225 solar / 142 lunar fabricated modern eclipse dates that the original could not
  reach.

In the 1969–2068 window the rewrite's tables contain **447 solar records of which 225 (50.3 %) are
fabricated**, and **285 lunar records of which 142 (49.8 %) are fabricated**. A coin flip.

Concrete examples (all >1 day from any genuine eclipse, so all produce a false ☉/☾ tag):

```
solar: 2010-01-04 A · 2010-06-30 T · 2011-11-13 T · 2012-11-02 T · 2013-10-23 T
       2024-03-28 T (this is the 24 CE eclipse) · 1998-09-13 T · 1999-09-03 T
lunar: 2010-06-15 P · 2011-06-04 T · 2014-04-04 T · 2017-07-27 P · 1997-10-09 T
```

### 6.3 Is ±1 day appropriate?

**For the post-1582 records: yes, and it is load-bearing.** Genuine modern records are stored
either on the true UT date or exactly one day early (86 of 454 solar, 63 of 288 lunar). Without
the ±1 day window, ~19 % of genuine modern eclipse coincidences would be missed outright.

**But ±1 day is also not enough to be safe**, for a reason worth stating: the stored date is a
New York calendar day, and the user's anchor is a bare calendar date with no timezone. An eclipse
whose UT date is D can be stored as D−1 *and* be "the same day" as D+1 for a user in New Zealand.
That is a 2-day span the ±1 window cannot cover. Widening the window is the wrong fix; storing the
true UT JDN is the right one (§7).

**For the pre-1582 records: no tolerance can save them.** The error is 2–11 days and systematic.
±1 day converts a systematic 7-day offset into a reliable *miss*, which is at least honest — but it
also means that when a pre-1582 eclipse tag *does* fire, it is more likely coincidence than
astronomy. There is one caveat in the app's favour, and it should be stated fairly: **if the user's
anchor date is itself a Julian-calendar label** (as historical dates before 1582 conventionally are,
and as the Chronicon ledger dates may well be), then anchor and eclipse are both "label read as
proleptic Gregorian" and the two errors cancel — the match is label-consistent even though the
underlying JD is wrong. The rewrite's `jdn()` (`src/core/jdn.js:15-27`) is unconditionally proleptic
Gregorian, so it is the *ledger's* calendar convention, which this pass did not establish, that
decides whether pre-1582 eclipse tags are self-consistent or simply wrong. **Flag this as open.**

### 6.4 What a reader should be told about an "eclipse coincidence" tag

Recommended wording, honest to the data as shipped today:

> The ☉ SOLAR / ☾ LUNAR tags come from a precomputed table derived from the NASA five-millennium
> eclipse canon. The table as shipped has known defects: about half of its entries between 1969 and
> 2068 are duplicates of 1st-century eclipses misdated by ~1900 years, so a modern eclipse tag is
> roughly as likely to be spurious as real; genuine entries are dated to the calendar day in
> New York, which is one day early for about a fifth of them; and every entry before 15 October
> 1582 carries a Julian-calendar date read as if it were Gregorian, putting it 2 to 11 days off.
> Treat an eclipse tag as a prompt to check, not as a fact.

Once §7 is applied, that shrinks to: *"dates are the UT calendar date of greatest eclipse from the
NASA canon; matching is ±1 day, which absorbs timezone ambiguity in your own anchor."*

---

## 7. What a correct table would be (recipe, not applied here)

Rebuild `src/data/eclipses.data.js` directly from `lib/*.csv` — **not** from `*_processed.js` —
with these five changes:

1. **Parse the year as an integer**, never through a two-digit-year window.
   `const [y, monthName, d] = row["Calendar Date"].split(' ')` then `parseInt(y, 10)`.
2. **Honour the calendar**: use the Julian JD formula when the date is before 1582 Oct 15,
   Gregorian from 1582 Oct 15 on.
3. **Subtract ΔT**: `JD_ut = JD_cal + TD/24h − ΔT/86400`.
4. **Store `Math.floor(JD_ut + 0.5)`** — the UT calendar day as a JDN. No timezone anywhere.
5. **Keep BCE** (the JDN formula handles year ≤ 0 fine; the original's "issue with date/time
   parsing" was moment's, not arithmetic's) and **optionally keep lunar penumbrals** behind a flag,
   since `Umbral Magnitude > 0` reproduces the current filter exactly.

Then sort, and keep the ±1 day tolerance — it is the right size for timezone ambiguity in the
*user's* anchor, which is the only ambiguity that should remain.

Expected visible effect: 367 phantom modern eclipse tags disappear; 324 genuine 2nd-century tags
appear; ~4 371 pre-1582 tags move by 2–11 days; ~1 700 tags move by 1 day. **This breaks
`tests/parity.test.mjs`** wherever it pins eclipse hits, and that break is correct.

---

## 8. Corrections to the current build

Listed in `correctionsToOurBuild` of the structured return; repeated here for the file record.

1. `src/data/eclipses.data.js:1` — *"Precomputed solar & lunar eclipse tables (~1–3000 CE)"*.
   The solar table starts at **0000-06-20** and the lunar at **0000-01-09** (astronomical year 0 =
   1 BCE), not year 1. The comment also omits that the table is a stale, timezone-baked,
   partly-corrupt derivative rather than a canon extract.
2. `src/data/eclipses.data.js:2` — *"Extracted verbatim from the reference PSYFR1 build"*. Verbatim
   as to content, but the extraction **sorted** the arrays. The originals are three concatenated
   ascending runs, and the sort changes lookup results on 1 260 solar / 813 lunar days.
3. `README.md:24` and `guide.html:274` — *"coincidence with a real solar or lunar eclipse"* /
   *"mark a real eclipse within a day of the projection"*. Half the table entries in 1969–2068 are
   not real eclipses.
4. `guide.html:335` — *"The eclipse tables are real astronomy"*. As shipped they are not; see §5.
5. `guide.html:275` — *"tables covering roughly 1–3000 CE"*. Coverage starts at year 0, and the
   lunar table ends at 2999-11-14, not 3000.
6. `src/core/eclipses.js:76-77` — the doc-comment lists lunar types as *"T · P"* and solar as
   *"T total · A annular · P partial · H hybrid"*. Accurate for the collapsed letters, but it should
   say that lunar `T` silently merges NASA's `T`, `T+` and `T-`, that solar `A`/`T`/`H` merge nine
   further sub-types, and that **penumbral lunar eclipses are absent entirely** (4 378 CSV rows
   dropped).
7. `src/core/cast.js:32-33` — *"Days either side of a projection that still counts as an eclipse
   hit"* with `eclipseTolerance: 1`. Behaviourally correct, but the original constant is
   `ECLIPSE_DATE_MATCH_TOLERANCE_IN_DAYS = 1.25` (`src/ophis_config.js:113`). Worth a note so a
   future reader does not "restore" 1.25 and change nothing, or assume a deviation where there is
   none.
8. `docs/DEVIATIONS.md:122` — the eclipse row records only *"lookup returns a hit, not the nearest"*.
   The **material** deviation is unlisted: the rewrite sorted a deliberately-unsorted array, which
   both fixes 324 genuine ancient false-negatives and activates 367 fabricated modern records that
   the original could never reach.
9. `docs/reverse/12-astronomy-data.md:28-29` — `*_orig.js` marked *"loaded but unused"*. The script
   tags are **commented out** (`ophis.html:59-60`); the globals do not exist at runtime.
10. `docs/reverse/12-astronomy-data.md:381` — *"Uncommenting `src/ophis_main.js:213-214` silently
    shifts ~20 % of eclipse dates."* It does not shift anything: it throws
    `ReferenceError: SOLAR_ECLIPSES_ORIG is not defined`, because 12-astronomy-data.md:28-29's
    premise is wrong. The 20 % figure itself is right *if* the orig scripts are also re-enabled.
11. `docs/reverse/12-astronomy-data.md:203` — `"Eclipse Time": string; // "14:13:28" (UTC, TD-corrected)`.
    It is **TD, uncorrected**. `Delta T (s)` is supplied precisely because it has *not* been
    applied, and the app never applies it.
12. Nothing anywhere in the rewrite records the **calendar convention**. `src/core/jdn.js` is
    unconditionally proleptic Gregorian, and `docs/DOMAIN.md` does not mention Julian vs Gregorian.
    Since 3 729 solar / 2 438 lunar records carry Julian dates, this is the single largest
    undocumented correctness assumption in the astronomy path.

---

## 9. Reproduction

Every number above comes from scripts run against the read-only sources. The load-bearing one, in
full, so it can be re-run:

```js
// exact reconstruction of lib/*_processed.js from lib/*.csv — run with TZ=America/New_York
const moment = require('./lib/moment-with-locales.min.js');
const mk = r => moment.utc(r['Calendar Date'] + ' ' + r['Eclipse Time'],
                           'YYYY, MMMM D HH:mm:ss').local().startOf('day').valueOf();
const recS = solarCsv.filter(r => !r['Calendar Date'].startsWith('-'))
                     .map(r => ({ date_millis: mk(r), eclipse_type: r['Eclipse Type'] }));
// → 7127 records, 0 mismatches against window.SOLAR_ECLIPSES_PROCESSED
const recL = lunarCsv.filter(r => !r['Calendar Date'].startsWith('-')
                                && !r['Eclipse Type'].startsWith('N'))
                     .map(r => ({ date_millis: mk(r), eclipse_type: r['Eclipse Type'] }));
// → 4624 records, 0 mismatches against window.LUNAR_ECLIPSES_PROCESSED
```

The Saros test of §4.2 groups `solar.csv` by `Saros Number`, converts each row under both calendar
hypotheses, and reports `Δ − 6585.3211` for the 11 694 consecutive same-series pairs.
