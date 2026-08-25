# 12 — Astronomy Subsystem: Data Tables & Libraries

**Scope of this document.** Everything Ophis v12 ("PSYFR") knows about the sky:
the bundled eclipse catalogues, the moon-phase engine, the sunset engines, the
timezone lookup, and the geometry helper. Written to be implementable without
reading the original source.

**Source roots**

* First-party: `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/src`
* Third-party: `C:/Users/bradl/OneDrive/Desktop/Ophis_v12_Browser/lib`

All `file:line` citations below are relative to `Ophis_v12_Browser/`.

Everything in this document was verified by executing the shipped data files and
libraries under Node 24 on the same machine that generated them
(`moment.tz.guess() === "America/New_York"`); reproduction scripts and their exact
outputs are described inline.

---

## 0. Inventory & what actually loads

| File | Size | Loaded at runtime? | Purpose |
|---|---:|---|---|
| `lib/lunar_eclipses_processed.js` | 234 KB | **YES** | `window.LUNAR_ECLIPSES_PROCESSED` — 4 624 records |
| `lib/solar_eclipses_processed.js` | 359 KB | **YES** | `window.SOLAR_ECLIPSES_PROCESSED` — 7 127 records |
| `lib/lunar_eclipses_orig.js` | 6.6 MB | **loaded but unused** | `var LUNAR_ECLIPSES_ORIG` — full NASA record objects |
| `lib/solar_eclipses_orig.js` | 5.5 MB | **loaded but unused** | `var SOLAR_ECLIPSES_ORIG` |
| `lib/lunar.csv` | 1.1 MB | **NO** | source CSV, 12 064 data rows |
| `lib/solar.csv` | 1.0 MB | **NO** | source CSV, 11 898 data rows |
| `lib/lunarphase-js.js` | 3.1 KB | **YES** | moon phase — the *only* moon library actually used |
| `lib/astronomy.browser.min.js` | 116 KB | **YES** | cosinekitty Astronomy Engine v2.1.19 — the *active* sunset engine |
| `lib/meuusjs.1.0.3.min.js` + `lib/meeus-easy.js` | 23 KB + 3.8 KB | **YES, dead** | fallback sunset engine, never reached |
| `lib/suncalc.js` | 9.3 KB | **YES, dead** | fallback sunset engine, never reached |
| `lib/tz_lookup_oss.js` | 73 KB | **YES** | `tzlookup(lat, lng) -> IANA zone id` |
| `lib/geo-point.js` | 5.9 KB | **YES** | 3-D point/vector helper; only 5 call sites, all 2-D chart geometry |
| `lib/moment-timezone-with-data.js` | 794 KB | **YES** | all zone arithmetic |

The `*_orig.js` globals are referenced **only** by `optimizeEclipseData()`
(`src/ophis_view__chart_datasets.js:1564`), whose two call sites are **commented
out** (`src/ophis_main.js:213-214`):

```js
// window.SOLAR_ECLIPSES_PROCESSED = optimizeEclipseData(ECLIPSE_TYPE__SOLAR);
// window.LUNAR_ECLIPSES_PROCESSED = optimizeEclipseData(ECLIPSE_TYPE__LUNAR);
```

So at runtime the app uses the **pre-baked** arrays from the `*_processed.js`
files. ~12 MB of `*_orig.js` is parsed on every launch for nothing. The CSVs are
never fetched — `Papa` (papaparse) is used only for **export**
(`src/ophis_view__export.js:93,372`).

---

## 1. The processed eclipse tables

### 1.1 Record shape

Both files are a single statement:

```js
window.LUNAR_ECLIPSES_PROCESSED = [ /* … */ ];   // lib/lunar_eclipses_processed.js:1
window.SOLAR_ECLIPSES_PROCESSED = [ /* … */ ];   // lib/solar_eclipses_processed.js:1
```

Every element has **exactly two keys**, verified over all 11 751 records
(one distinct key-signature `"date_millis,eclipse_type"` in each file):

```ts
type EclipseRecord = {
  /** Unix epoch ms. ALWAYS local midnight (00:00:00.000) of a calendar date
   *  in America/New_York — the timezone of the machine that generated the file.
   *  See §2.3 for why, and §6.4 for the consequences. */
  date_millis: number;

  /** Raw NASA "Eclipse Type" string, verbatim from the CSV. Never normalized.
   *  Lunar domain: "P" | "T" | "T+" | "T-"
   *  Solar domain: "P"|"A"|"T"|"H"|"Pb"|"Pe"|"Tm"|"Am"|"An"|"As"
   *                |"A+"|"A-"|"H2"|"H3"|"Hm"|"T+"|"T-"|"Tn"|"Ts"  */
  eclipse_type: string;
};
```

### 1.2 Real sample records (verbatim)

Lunar, first / boundary / middle / last:

```json
{"date_millis":-62166510238000,"eclipse_type":"T-"}   // idx 0     0000-01-09T04:56:02Z
{"date_millis":-59007726238000,"eclipse_type":"P"}    // idx 159   0100-02-13T04:56:02Z
{"date_millis":-14879012638000,"eclipse_type":"P"}    // idx 2312  1498-07-03T04:56:02Z
{"date_millis":32499550800000,"eclipse_type":"T"}     // idx 4623  2999-11-14T05:00:00Z
```

Solar:

```json
{"date_millis":-62152427038000,"eclipse_type":"P"}    // idx 0     0000-06-20T04:56:02Z
{"date_millis":-59006516638000,"eclipse_type":"A"}    // idx 249   0100-02-27T04:56:02Z
{"date_millis":-14505332638000,"eclipse_type":"H"}    // idx 3563  1510-05-07T04:56:02Z
{"date_millis":32528836800000,"eclipse_type":"H"}     // idx 7126  3000-10-19T04:00:00Z
```

Note the `04:56:02` UTC time on pre-1883 records: that is exactly midnight at
America/New_York's LMT offset of **−04:56:02**. Post-1883 records land on
`05:00:00Z` (EST) or `04:00:00Z` (EDT). This is the fingerprint that proves the
generator machine's timezone.

### 1.3 Counts, ranges, type histograms

| | Lunar | Solar |
|---|---:|---:|
| Records | **4 624** | **7 127** |
| Distinct `date_millis` | 4 624 (no exact duplicates) | 7 127 |
| Earliest | `-62166510238000` = 0000-01-09 (local) | `-62152427038000` = 0000-06-20 |
| Latest | `32499550800000` = 2999-11-14 | `32528836800000` = 3000-10-19 |
| Globally sorted ascending? | **NO** (2 descending breaks) | **NO** (2 descending breaks) |

Type histograms of the shipped arrays:

```
LUNAR : {"P":2537, "T":850, "T+":622, "T-":615}                       // total 4624
SOLAR : {"P":2305,"A":2281,"T":1845,"H":260,"Pe":100,"Pb":97,"Tm":45,
         "Am":45,"A+":25,"An":23,"A-":20,"H2":18,"As":17,"T-":11,
         "H3":11,"Tn":8,"Hm":7,"Ts":7,"T+":2}                          // total 7127
```

Source CSV histograms for comparison:

```
lunar.csv (12064 rows): {"P":4207,"N":4020,"T":1405,"T+":1042,"T-":1032,
                         "Nx":141,"Ne":115,"Nb":102}
solar.csv (11898 rows): {"P":3875,"A":3755,"T":3049,"H":502,"Pb":163,"Pe":162,
                         "Tm":72,"Am":72,"An":36,"A+":34,"A-":34,"H3":26,
                         "As":25,"H2":24,"Hm":17,"T-":17,"Tn":14,"Ts":12,"T+":9}
```

### 1.4 The three-block layout (critical)

Neither array is monotonic. Each is three ascending runs concatenated:

**Lunar**

| Block | Index range | Len | Date range | Provenance |
|---|---|---:|---|---|
| 0 | `0 … 111` | 112 | 0000-01-09 → 2068-10-29 | CSV years `0`…`68` |
| 1 | `112 … 158` | 47 | 1969-04-25 → 1998-09-29 | CSV years `69`…`99` |
| 2 | `159 … 4623` | 4465 | 0100-02-13 → 2999-11-14 | CSV years `100`…`3000` |

**Solar**

| Block | Index range | Len | Date range | Provenance |
|---|---|---:|---|---|
| 0 | `0 … 172` | 173 | 0000-06-20 → 2068-11-13 | CSV years `0`…`68` |
| 1 | `173 … 248` | 76 | 1969-04-10 → 1999-09-03 | CSV years `69`…`99` |
| 2 | `249 … 7126` | 6878 | 0100-02-27 → 3000-10-19 | CSV years `100`…`3000` |

Blocks 0 and 1 contain **17 legitimate records** (lunar; 24 solar) for years
0–9 AD, plus **142 corrupt records** (lunar; 225 solar) whose true dates are
years 10–99 AD but which were written into 1969–1999 and 2010–2068. See §2.4.

Concrete demonstration — every entry the shipped solar table holds for
2024‑2026:

```
2024-03-28/T  2024-09-21/A  2025-02-16/P  2025-03-18/P  2025-08-11/P
2025-09-10/P  2026-02-06/A  2026-08-01/T          <-- ALL BOGUS (years 24-26 AD)
2024-04-08/T  2024-10-02/A  2025-03-29/P  2025-09-21/P
2026-02-17/A  2026-08-12/T                        <-- genuine
```

`2024-04-08 T` is the real North-American total; `2024-03-28 T` is the 24 AD
eclipse wearing a 2024 costume.

---

## 2. `*_orig.js` ↔ `*_processed.js` ↔ `*.csv` — the pipeline

### 2.1 Provenance

`lib/lunar_eclipses_orig.js:1-2` (and the solar twin):

```js
// From https://www.kaggle.com/datasets/nasa/solar-eclipses
// JavaScript generated with https://csvjson.com/csv2json
var LUNAR_ECLIPSES_ORIG = [ … ];
```

So: **NASA five-millennium canon → Kaggle CSV → csvjson.com → `*_orig.js` →
`optimizeEclipseData()` → `*_processed.js`.** The CSVs in `lib/` are the same
data as the `*_orig.js` arrays; they are kept as reference only.

### 2.2 Full CSV / ORIG record shapes

`lunar.csv` header (`lib/lunar.csv:1`) and equivalent `*_orig.js` object keys:

```ts
type LunarOrig = {
  "Catalog Number": string;              // "00001", zero-padded 5
  "Calendar Date": string;               // "-1999 June 26"  |  "0 January 10"
                                         // |  "10 June 15"  |  "3000 October 5"
  "Eclipse Time": string;                // "14:13:28"  (UTC, TD-corrected)
  "Delta T (s)": number;
  "Lunation Number": number;
  "Saros Number": number;
  "Eclipse Type": string;                // "N","Nb","Ne","Nx","P","T","T+","T-"
  "Quincena Solar Eclipse": string;      // "t-","-a","pp", …
  "Gamma": number;
  "Penumbral Magnitude": number;
  "Umbral Magnitude": number;            // negative for penumbral-only
  "Latitude": string;                    // "24S"
  "Longitude": string;                   // "22W"
  "Penumbral Eclipse Duration (m)": number|"-";
  "Partial Eclipse Duration (m)": number|"-";
  "Total Eclipse Duration (m)": number|"-";
};

type SolarOrig = {
  "Catalog Number": string;
  "Calendar Date": string;
  "Eclipse Time": string;
  "Delta T (s)": number;
  "Lunation Number": number;
  "Saros Number": number;
  "Eclipse Type": string;                // see §3.2
  "Gamma": number;
  "Eclipse Magnitude": number;
  "Latitude": string;                    // "6.0N"
  "Longitude": string;                   // "33.3W"
  "Sun Altitude": number;                // degrees
  "Sun Azimuth": number;                 // degrees
  "Path Width (km)": number|"";
  "Central Duration": string;            // "06m37s" | ""
};
```

Real first rows: `lib/lunar.csv:2`, `lib/solar.csv:2`.
Real last rows: `lunar.csv` `12063,3000 October 5,…` / `11898,3000 October 19,…`.
Coverage of both CSVs: **−1999 → +3000** (5 000 years).

Everything except `Calendar Date`, `Eclipse Time`, `Eclipse Type` is **discarded**
by the processing step. Magnitude, gamma, path width, duration — all thrown away.

### 2.3 `optimizeEclipseData()` — exact algorithm

`src/ophis_view__chart_datasets.js:1559-1599`:

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

Format constants (`src/ophis_view__chart_datasets.js:1522-1524`):

```js
var ECLIPSE_DATA_TIME_FORMAT      = "HH:mm:ss"
var ECLIPSE_DATA_DATE_FORMAT      = "YYYY, MMMM D";
var ECLIPSE_DATA_TIMESTAMP_FORMAT = ECLIPSE_DATA_DATE_FORMAT + " " + ECLIPSE_DATA_TIME_FORMAT;
//  => "YYYY, MMMM D HH:mm:ss"
```

Step by step:

1. **BCE filter** — drop any row whose `Calendar Date` starts with `"-"`.
   Drops 3 062 lunar rows and 4 771 solar rows.
2. **Lunar penumbral filter** — for the lunar table only, drop any type starting
   with `"N"` (`N`, `Nb`, `Ne`, `Nx`): 4 378 rows. **Solar has no type filter at all.**
   `12064 − 3062 − 4378 = 4624` ✓; `11898 − 4771 = 7127` ✓.
3. **Parse as UTC** with moment format `"YYYY, MMMM D HH:mm:ss"` against inputs like
   `"10 June 15 08:28:25"`. Note the format string contains a comma the data does
   not have — moment's non-strict parser tolerates it.
4. **Date → X-Date struct** via `nativeDateToXDate(nativeDate, 0, 0)`
   (`src/ophis_view__strings.js:162-169`), producing `{date:"MM/DD/YYYY", time:"HH:mm", enabled:true}`.
5. **X-Date → local midnight** via `xDateToNativeDateForController(EVENT_SCOPE__DAYS, xDate)`
   (`src/ophis_controller.js:235-239`), which calls
   `xDateToNativeDate(scope, xDate, null, null, [], null, /*lockDayScopeToGmt=*/false)`
   (`src/ophis_utils.js:729`). With DAYS scope the time is forced to
   `TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE = "00:00"` (`src/ophis_config.js:271`), and
   because `lockDayScopeToGmt` is `false` all of `lat/long/timezone` are nulled
   (`src/ophis_utils.js:772-776`). `convertStandardLocalDateStringToNativeUtcDate`
   then takes the *else* branch (`src/ophis_dependencies.js:260-268`):
   `moment(standardLocalDateString, "YYYY-MM-DD HH:mm").toDate()` — i.e. **parsed in
   the host machine's local timezone**. That is why every `date_millis` is a
   New-York midnight.

### 2.4 The moment `YYYY` two-digit-year corruption

moment 2.29.4's `YYYY` parse token applies two-digit-year windowing when the
matched *string* is exactly two characters:

```js
// moment internals
addParseToken('YYYY', (input, array) => {
  array[YEAR] = input.length === 2 ? hooks.parseTwoDigitYear(input) : toInt(input);
});
hooks.parseTwoDigitYear = input => toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
```

Verified directly against the bundled moment build:

```
"2010 June 15 08:28:25"    -> 2010-06-15T08:28:25.000Z
"10 June 15 08:28:25"      -> 2010-06-15T08:28:25.000Z   <-- should be 0010
"69 April 25 01:00:00"     -> 1969-04-25T01:00:00.000Z   <-- should be 0069
"0 January 10 02:04:40"    -> 0000-01-10T02:04:40.000Z   (1 char -> untouched)
"100 February 13 00:00:00" -> 0100-02-13T00:00:00.000Z   (3 chars -> untouched)
```

Net effective year map used by the shipped tables:

```
y in [0, 9]    -> y            (correct; 1-digit string)
y in [10, 68]  -> 2000 + y     (WRONG: 10 AD becomes 2010)
y in [69, 99]  -> 1900 + y     (WRONG: 69 AD becomes 1969)
y >= 100       -> y            (correct)
y < 0          -> dropped
```

This single bug produces the entire 3-block layout of §1.4, because the corrupted
rows keep their original CSV position (early) while carrying 20th/21st-century
timestamps.

### 2.5 The shipped tables were produced by an *older* `optimizeEclipseData`

Reconstructing the pipeline exactly as written today (step 4 with `lat=0,long=0`)
does **not** reproduce the shipped files. `nativeDateToXDate(d, 0, 0)`
→ `isValidLatAndLong(0,0) === true` (`src/ophis_model__validation.js:403-405`; the
limits are `LAT_LIMIT=65`, `LONG_LIMIT=180`, `src/ophis_config.js:426-427`)
→ `convertNativeUtcDateToLocalMoment(d, 0, 0)` (`src/ophis_dependencies.js:281-288`)
with `getTimezone(0,0) === "Etc/GMT"` → the calendar date extracted is the **UTC**
date. Whereas dropping the lat/long arguments takes the else-branch at
`src/ophis_view__strings.js:183-190`, which uses `getMonth()/getDate()/getFullYear()`
— the **browser-local** date.

Empirical result (11 751 records, both files, exhaustive positional compare):

| Reconstruction variant | Lunar match | Solar match |
|---|---:|---:|
| Local (browser) calendar date → local midnight | **4624 / 4624** | **7127 / 7127** |
| UTC calendar date → local midnight (today's code) | 3709 / 4624 | 5711 / 7127 |

915 lunar and 1 416 solar records would move by one day if the tables were
regenerated today. Example: CSV `0 January 10, 02:04:40` UTC —
local-date variant → `0000-01-09T04:56:02Z` (matches shipped data);
UTC-date variant → `0000-01-10T04:56:02Z` (does not).

**Conclusion:** `lib/*_processed.js` is stale output of a superseded code path.
Uncommenting `src/ophis_main.js:213-214` silently shifts ~20 % of eclipse dates.
Flag this before touching anything.

---

## 3. Eclipse classification: full vs partial

`src/ophis_view__chart_datasets.js:3-29` — the *entire* classification logic:

```js
function getNormalizedSolarEclipseType(eclipseObject) {
    var eclipseTypeFromNasa = eclipseObject["eclipse_type"];

    if ( eclipseTypeFromNasa.startsWith("P") ) {        // Partial Eclipse
        return SOLAR_ECLIPSE_TYPE__PARTIAL;
    } else if ( eclipseTypeFromNasa.startsWith("A") ) { // Annular Eclipse
        return SOLAR_ECLIPSE_TYPE__FULL;
    } else if ( eclipseTypeFromNasa.startsWith("T") ) { // Total Eclipse
        return SOLAR_ECLIPSE_TYPE__FULL;
    } else if ( eclipseTypeFromNasa.startsWith("H") ) { // Hybrid Eclipse
        return SOLAR_ECLIPSE_TYPE__FULL;
    } else {
        return null;
    }
}

function getNormalizedLunarEclipseType(eclipseObject) {
    var eclipseTypeFromNasa = eclipseObject["eclipse_type"];

    if ( eclipseTypeFromNasa.startsWith("P") ) {        // Partial Eclipse
        return LUNAR_ECLIPSE_TYPE__PARTIAL;
    } else if ( eclipseTypeFromNasa.startsWith("T") ) { // Total Eclipse
        return LUNAR_ECLIPSE_TYPE__FULL;
    } else {
        return null;
    }
}
```

### 3.1 Decision table (first character only)

| First char | Solar → | Lunar → |
|---|---|---|
| `P` | `SOLAR_ECLIPSE_TYPE__PARTIAL` | `LUNAR_ECLIPSE_TYPE__PARTIAL` |
| `A` | `SOLAR_ECLIPSE_TYPE__FULL` | `null` (cannot occur) |
| `T` | `SOLAR_ECLIPSE_TYPE__FULL` | `LUNAR_ECLIPSE_TYPE__FULL` |
| `H` | `SOLAR_ECLIPSE_TYPE__FULL` | `null` (cannot occur) |
| `N` | — (cannot occur) | `null` (filtered out upstream anyway) |
| anything else | `null` | `null` |

Notes:

* **"Full" is a misnomer for solar.** Annular (`A*`) and hybrid (`H*`) are
  bucketed as FULL alongside true totals. An annular eclipse is *not* a total
  eclipse; the label is a UI simplification, not astronomy.
* Suffix characters are ignored entirely. `T+`, `T-`, `Tm`, `Tn`, `Ts` all →
  FULL; `Pb`, `Pe` → PARTIAL.
* For lunar, `T+`/`T-` mean the *penumbral/umbral contact quality* in the NASA
  canon, not "more/less total"; both map to FULL.
* Because the lunar table has no `A`/`H`/`N` entries and the solar table has no
  `N` entries, `null` is unreachable in practice.

### 3.2 NASA type-code reference (copied from the in-source comment block,
`src/ophis_view__chart_datasets.js:1526-1556`)

```
Solar first character:  P = Partial   A = Annular   T = Total   H = Hybrid (annular/total)
Solar second character:
  "m" = Middle eclipse of Saros series
  "n" = Central eclipse with no northern limit
  "s" = Central eclipse with no southern limit
  "+" = Non-central eclipse with no northern limit
  "-" = Non-central eclipse with no southern limit
  "2" = Hybrid path begins total and ends annular
  "3" = Hybrid path begins annular and ends total
  "b" = Saros series begins (first eclipse in series)
  "e" = Saros series ends (last eclipse in series)

Lunar values observed: T-, T+, P, N, T, Ne, Nb, Nx
  Penumbral N  ~37.2%   Partial P  ~38.7%   Total T  ~24.1%
```

### 3.3 Enum string literals (cross-module keys)

`src/ophis_view__chart_config.js:96-106`:

```js
var ECLIPSE_TYPE__LUNAR        = "ECLIPSE_TYPE__LUNAR";
var ECLIPSE_TYPE__SOLAR        = "ECLIPSE_TYPE__SOLAR";
var SOLAR_ECLIPSE_TYPE__FULL   = "SOLAR_ECLIPSE_TYPE__FULL";
var SOLAR_ECLIPSE_TYPE__PARTIAL= "SOLAR_ECLIPSE_TYPE__PARTIAL";
var LUNAR_ECLIPSE_TYPE__FULL   = "LUNAR_ECLIPSE_TYPE__FULL";
var LUNAR_ECLIPSE_TYPE__PARTIAL= "LUNAR_ECLIPSE_TYPE__PARTIAL";
var ASTRO_INDICATOR_TYPE__LUNAR_PHASE = "ASTRO_INDICATOR_TYPE__LUNAR_PHASE";
var ASTRO_INDICATOR_TYPE__ECLIPSE     = "ASTRO_INDICATOR_TYPE__ECLIPSE";
```

`ECLIPSE_DICT` (`src/ophis_view__chart_config.js:121-134`) maps each normalized
type to its persistence flag and (unused) emoji:

```js
function newEclipseDictEntry(serializedField, imagePath) {
    return { serialized_field: serializedField, imagePath: imagePath };
}
ECLIPSE_DICT[SOLAR_ECLIPSE_TYPE__FULL]    = newEclipseDictEntry("SERIALIZED_FIELD__CHART_OPTION__FULL_SOLAR_ECLIPSES",    "\u{1F506}");
ECLIPSE_DICT[SOLAR_ECLIPSE_TYPE__PARTIAL] = newEclipseDictEntry("SERIALIZED_FIELD__CHART_OPTION__PARTIAL_SOLAR_ECLIPSES", "\u{1F506}");
ECLIPSE_DICT[LUNAR_ECLIPSE_TYPE__FULL]    = newEclipseDictEntry("SERIALIZED_FIELD__CHART_OPTION__FULL_LUNAR_ECLIPSES",    "\u{1F506}");
ECLIPSE_DICT[LUNAR_ECLIPSE_TYPE__PARTIAL] = newEclipseDictEntry("SERIALIZED_FIELD__CHART_OPTION__PARTIAL_LUNAR_ECLIPSES", "\u{1F506}");
```

The `imagePath` field of `ECLIPSE_DICT` is **dead**: all four hold the emoji
`🔆` (`U+1F506`) rather than a path, and nothing reads it. The actual images are
registered separately in `loadAstroIndicators()`
(`src/ophis_view__chart_config.js:167-170`) as
`img/astro_indicators/{solar,lunar}_eclipse_{full,partial}.png`.

Persisted `.oph` keys (derived by `newSerializedFieldObject`,
`src/ophis_utils.js:124-146`: strip `SERIALIZED_FIELD__`, lowercase):

```
chart_option__full_solar_eclipses      (default false, zIndex 10)
chart_option__partial_solar_eclipses   (default false, zIndex 8)
chart_option__full_lunar_eclipses      (default false, zIndex 9)
chart_option__partial_lunar_eclipses   (default false, zIndex 7)
```

DOM checkbox ids are the same string with `_`→`-` plus `-checkbox`, e.g.
`chart-option--full-solar-eclipses-checkbox`.

---

## 4. Moon-phase computation

### 4.1 Which library

`lunarphase-js` (UMD, global `lunarphase`), `lib/lunarphase-js.js:1`. Ophis uses
**exactly one** function from it plus the enum:

* `lunarphase.Moon.lunarAgePercent(date)` — `src/ophis_view__chart_datasets.js:1056`
* `lunarphase.LunarPhase.*` — the 8 name constants

`SunCalc.getMoonIllumination`, `SunCalc.getMoonPosition`, `SunCalc.getMoonTimes`,
`mooncalcMeeus`, `getMoonTimesMeeus` are **never called** (verified by exhaustive
grep of `src/*.js`).

### 4.2 Library internals (deobfuscated from the minified source)

Constants (`lib/lunarphase-js.js:1`):

```js
const JULIAN_1970    = 2440587.5;          // 24405875e-1
const LUNATION_BASE  = 2423436.6115277777; // 2.4234366115277777e6
const ANOMALISTIC    = 27.55454988;        // days
const SYNODIC        = 29.53058770576;     // days
const KNOWN_NEW_MOON = 2451550.1;          // 24515501e-1  (JD, 2000-01-06 ~14:24)
const KNOWN_PERIGEE  = 2451562.2;          // 24515622e-1
```

```js
class Julian {
  static fromDate(t = new Date()) {
    return t.getTime()/86400000 - t.getTimezoneOffset()/1440 + 2440587.5;
  }
  static toDate(j) {
    const a = new Date();
    a.setTime((j - 2440587.5 + a.getTimezoneOffset()/1440) * 86400000);
    return a;
  }
}

const normalize = e => { e -= Math.floor(e); if (e < 0) e += 1; return e; };

class Moon {
  static lunarAgePercent(t = new Date()) {
    return normalize((Julian.fromDate(t) - 2451550.1) / 29.53058770576);
  }
  static lunarAge(t = new Date()) {
    return Moon.lunarAgePercent(t) * 29.53058770576;
  }
  static lunationNumber(t = new Date()) {
    return Math.round((Julian.fromDate(t) - 2423436.6115277777) / 29.53058770576) + 1;
  }
  static lunarDistance(t = new Date()) {          // in Earth radii
    const jd = Julian.fromDate(t);
    const c  = Moon.lunarAgePercent(t) * 2 * Math.PI;
    const W  = 2 * Math.PI * normalize((jd - 2451562.2) / 27.55454988);
    return 60.4 - 3.3*Math.cos(W) - 0.6*Math.cos(2*c - W) - 0.5*Math.cos(2*c);
  }
  static isWaxing(t) { return Moon.lunarAge(t) <= 14.765; }
  static isWaning(t) { return Moon.lunarAge(t) >  14.765; }
}
```

Exported enums:

```js
lunarphase.LunarPhase = {
  NEW:"New", WAXING_CRESCENT:"Waxing Crescent", FIRST_QUARTER:"First Quarter",
  WAXING_GIBBOUS:"Waxing Gibbous", FULL:"Full", WANING_GIBBOUS:"Waning Gibbous",
  LAST_QUARTER:"Last Quarter", WANING_CRESCENT:"Waning Crescent"
};
lunarphase.Hemisphere = { NORTHERN:"Northern", SOUTHERN:"Southern" };
lunarphase.LunarMonth = { ANOMALISTIC:"Anomalistic", DRACONIC:"Draconic",
                          SIDEREAL:"Sidereal", SYNODIC:"Synodic", TROPICAL:"Tropical" };
lunarphase.Unit       = { EARTH_RADII:"Earth Radii", KILOMETERS:"km", MILES:"m" };
// plus NorthernHemisphereLunarEmoji / SouthernHemisphereLunarEmoji (emoji only)
```

Also exported but unused by Ophis: `Moon.lunarPhase`, `Moon.lunarPhaseEmoji`,
`Moon.emojiForLunarPhase`, `Julian.toDate`.

### 4.3 Phase boundaries

`src/ophis_view__chart_datasets.js:955-966` re-implements the library's own
`lunarPhase()` byte-for-byte:

```js
function getLunarPhase(lunarAge) {
    if (lunarAge < 1.84566173161)       return lunarphase.LunarPhase.NEW;
    else if (lunarAge < 5.53698519483)  return lunarphase.LunarPhase.WAXING_CRESCENT;
    else if (lunarAge < 9.22830865805)  return lunarphase.LunarPhase.FIRST_QUARTER;
    else if (lunarAge < 12.91963212127) return lunarphase.LunarPhase.WAXING_GIBBOUS;
    else if (lunarAge < 16.61095558449) return lunarphase.LunarPhase.FULL;
    else if (lunarAge < 20.30227904771) return lunarphase.LunarPhase.WANING_GIBBOUS;
    else if (lunarAge < 23.99360251093) return lunarphase.LunarPhase.LAST_QUARTER;
    else if (lunarAge < 27.68492597415) return lunarphase.LunarPhase.WANING_CRESCENT;
    return lunarphase.LunarPhase.NEW;
}
```

Those magic numbers are exactly `(2k+1)/16 × 29.53058770576` for k = 0…7:

| k | boundary | = SYNODIC × | phase below the boundary |
|--:|---:|---|---|
| 0 | 1.84566173161 | 1/16 | NEW |
| 1 | 5.53698519483 | 3/16 | WAXING_CRESCENT |
| 2 | 9.22830865805 | 5/16 | FIRST_QUARTER |
| 3 | 12.91963212127 | 7/16 | WAXING_GIBBOUS |
| 4 | 16.61095558449 | 9/16 | FULL |
| 5 | 20.30227904771 | 11/16 | WANING_GIBBOUS |
| 6 | 23.99360251093 | 13/16 | LAST_QUARTER |
| 7 | 27.68492597415 | 15/16 | WANING_CRESCENT |
| — | ≥ 27.68492597415 | | NEW (wraps) |

i.e. eight equal 1/8-cycle windows, each centred on its ideal phase point. The
NEW window wraps: `[0, 1/16) ∪ [15/16, 1)` of the cycle.

`SYNODIC_MONTH = 29.53058770576` is duplicated in `src/ophis_config.js:102` and
must match the library's internal value or the boundaries drift.

`INTRA_MOON_PHASE_DELTA = 1.0/8.0` (`src/ophis_config.js:111`) drives the "ideal
percentage" table in `MOON_PHASE_DICT` (`src/ophis_view__chart_config.js:86-93`):

```js
function newMoonPhaseDictEntry(serializedField, moonPhasePercentage, imagePath) {
    return { serialized_field: serializedField,
             moon_phase_percentage: moonPhasePercentage,
             imagePath: imagePath };
}
```

| `LunarPhase` key | `moon_phase_percentage` | `.oph` key (`chart_option__…`) | image |
|---|---:|---|---|
| `"New"` | 0.0 | `show_new_moons` | `new_moon.png` |
| `"Waxing Crescent"` | 0.125 | `show_waxing_crescent_moons` | `waxing_crescent_moon.png` |
| `"First Quarter"` | 0.250 | `show_first_quarter_moons` | `first_quarter_moon.png` |
| `"Waxing Gibbous"` | 0.375 | `show_waxing_gibbous_moons` | `waxing_gibbous_moon.png` |
| `"Full"` | 0.500 (hard-coded, not `DELTA*4`) | `show_full_moons` | `full_moon.png` |
| `"Waning Gibbous"` | 0.625 | `show_waning_gibbous_moons` | `waning_gibbous_moon.png` |
| `"Last Quarter"` | 0.750 | `show_third_quarter_moons` **(note: "third", not "last")** | `third_quarter_moon.png` |
| `"Waning Crescent"` | 0.875 | `show_waning_crescent_moons` | `waning_crescent_moon.png` |

All eight default to `false` (`newSerializedMoonOption`, `src/ophis_config.js:184-195`,
zIndex 5 for every moon).

### 4.4 Observer-location dependence — **NO (but timezone-dependent)**

`lunarAgePercent` takes only a `Date`. There is no lat/long anywhere in the moon
path. The moon phase shown for a given instant is identical in Reykjavík and
Jakarta.

However `Julian.fromDate` subtracts `t.getTimezoneOffset()/1440`, so the phase is
computed from the **host browser's local wall-clock time reinterpreted as UTC**.
Consequences:

* Running the same `.oph` file in `America/New_York` (offset +300 in winter) vs
  `Asia/Tokyo` (offset −540) shifts the effective Julian Day by
  `(300 − (−540))/1440 = 0.5833 days`, i.e. **0.58 days of lunar age** — more than
  enough to flip a sample across a phase boundary (each window is 3.69 days wide,
  and samples are 1 day apart).
* DST transitions inject a 1-hour discontinuity mid-year.
* Measured on the reference machine (America/New_York):
  `lunarAgePercent(2025-03-29T00:00:00Z) = 0.98950` (age 29.2206 d → NEW), while
  under `TZ=UTC` the same instant gives `0.99515` (age 29.3872 d → NEW).

For a rewrite: **use plain UTC** (`t.getTime()/86400000 + 2440587.5`) and accept
that outputs will differ slightly from v12, or replicate the offset subtraction
for bit-parity. Pick one and document it.

---

## 5. "Coincides with" — the date-matching predicates

### 5.1 Tolerance constants

`src/ophis_config.js:98-115`:

```js
var MILLIS_PER_MINUTE = 1000 * 60;
var MILLIS_PER_HOUR   = MILLIS_PER_MINUTE * 60;
var MILLIS_PER_DAY    = MILLIS_PER_HOUR * 24;          // 86400000

var LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS   = 1;
var ECLIPSE_DATE_MATCH_TOLERANCE_IN_DAYS = 1.25;
var LUNAR_DATE_MATCH_TOLERANCE   = MILLIS_PER_DAY * 1;      // 86_400_000
var ECLLIPSE_DATE_MATCH_TOLERANCE= MILLIS_PER_DAY * 1.25;   // 108_000_000  [sic: 3 L's]
```

The misspelling `ECLLIPSE_DATE_MATCH_TOLERANCE` is the actual identifier —
`ECLIPSE_DATE_MATCH_TOLERANCE_IN_DAYS` (correctly spelled) is the *days* value.
Keep both spellings if you want a drop-in port.

**The UI lies about the eclipse tolerance.** All four eclipse checkbox tooltips
say "within `getDayString(LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS)`" = "within 1 day"
(`src/ophis_config.js:233,242,251,260`), and the About text says the same
(`src/ophis_main.js:510`). The code actually uses **±1.25 days**. Also, both the
"Full Lunar" and "Partial Lunar" tooltips read "Show any **Partial** Lunar
Eclipses…" — copy-paste bug at `src/ophis_config.js:251`.

### 5.2 Eclipse lookup — `binarySearchForEclipse`

`src/ophis_view__chart_datasets.js:36-57`:

```js
function binarySearchForEclipse(eclipseArray, xDateOrZDateInMillis) {
    let start = 0, end = eclipseArray.length - 1;
    while (start <= end) {
        let mid = Math.floor((start + end) / 2);
        var ithDateInMillisOfPriorMidnight = eclipseArray[mid].date_millis;

        if ( xDateOrZDateInMillis >= ithDateInMillisOfPriorMidnight-ECLLIPSE_DATE_MATCH_TOLERANCE
          && xDateOrZDateInMillis <= ithDateInMillisOfPriorMidnight+ECLLIPSE_DATE_MATCH_TOLERANCE ) {
            return eclipseArray[mid];
        } else if (eclipseArray[mid].date_millis < xDateOrZDateInMillis) {
            start = mid + 1;
        } else {
            end = mid - 1;
        }
    }
    return null;
}
```

Predicate: `|query − record.date_millis| ≤ 108_000_000 ms`. Returns the **first
record the binary walk happens to land on** inside the window — not necessarily
the nearest. Returns `null` on miss.

**Because the arrays are not sorted (§1.4), this search is unsound.** Measured by
querying every record's own `date_millis`:

| | Lunar | Solar |
|---|---:|---:|
| Records the search can never reach | **271** / 4624 | **420** / 7127 |
| …of which are the corrupt 1969-2068 block | 142 (idx 17–158) | 225 (idx 24–248) |
| …of which are **genuine** records, years 100–181 AD | **129** (idx 159–287) | **195** (idx 249–443) |
| Records where the search returns a *different* in-window record | 0 | 0 |

Per-era recall vs. a linear scan (day-by-day / weekly sampling):

```
LUNAR  y0–100    100.0%    y100–500  78.9%    y500–1500 100%   y1500–1900 100%
       y1900–1969 100%     y1969–2000 47.8%   y2000–2010 100%  y2010–2069 47.3%
       y2069–2200 100%     y2200–3000 100%
SOLAR  y0–100    100.0%    y100–500  78.8%    y500–1500 100%   y1500–1900 100%
       y1900–1969 100%     y1969–2000 46.9%   y2000–2010 100%  y2010–2069 47.2%
       y2069–2200 100%     y2200–3000 100%
```

The ~47 % in 1969-2000 / 2010-2069 is **benign** — the "missing" half is the
corrupt block, which the unsortedness happens to make unreachable. The 78.8 % in
years 100–500 is **real data loss**: 129 lunar and 195 solar genuine eclipses
between 100 and 181 AD can never be found.

### 5.3 Moon-phase "coincidence"

Moon phases are *not* looked up in a table; the app samples days and picks a
representative date per phase occurrence, then tests proximity.
`src/ophis_view__chart_datasets.js:1002-1100`:

**Phase A — build the sample set**

```js
var allDatesInMillis = xDatesInMillis.concat(zDatesInMillis);
allDatesInMillis.sort((a,b) => a - b);

var dateSamplingBasedOnAllDates = [];
var MOON_SAMPLING_HALF_WINDOW_IN_MILLIS = MILLIS_PER_DAY*8      // 8 days

var timeZone = isoEvent.scope == EVENT_SCOPE__HH_MM ? getTimezone(isoEvent.lat, isoEvent.long) : "";
if ( isoEvent.scope == EVENT_SCOPE__DAYS && isFlagEnabled(FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT) ) {
    timeZone = getTimezone(0, 0);                                // "Etc/GMT"
}

for each kthDateInMillis in allDatesInMillis:
    if scope == HH_MM  -> kthDateInMillis = roundMillisToNearestMidnightInTimeZone(k, timeZone)
    if scope == DAYS && LOCK_DAY_SCOPE_TO_GMT -> same rounding
    kthWindowStart = kthDateInMillis - 8*MILLIS_PER_DAY
    kthWindowEnd   = kthDateInMillis + 8*MILLIS_PER_DAY + MILLIS_PER_DAY   // asymmetric!
    // de-overlap with the previous window
    while (kthWindowStart <= lastSampleAlreadyPushed) kthWindowStart += MILLIS_PER_DAY
    for (t = kthWindowStart; t < kthWindowEnd; t += MILLIS_PER_DAY) push(t)
```

So each X/Z-date contributes a strip of daily samples spanning **[−8 d, +9 d)**
around it (17 samples when isolated), de-duplicated against the previous strip.

**Phase B — collapse samples into one "indicator date" per phase occurrence**

```js
var currentDate = new Date(0);
var currentPhase = null;
var percentageDeltaOfClosestCurrentDate = null;
var closestDatesToAstroIndicators = {};          // phaseName -> number[]

for each ithDateInMillis in dateSamplingBasedOnAllDates:
    currentDate.setTime(ithDateInMillis);
    ithLunarAgePercent = lunarphase.Moon.lunarAgePercent(currentDate);
    ithLunarAge        = ithLunarAgePercent * SYNODIC_MONTH;
    ithIndicator_phase = getLunarPhase(ithLunarAge);
    moonPhaseLookup    = MOON_PHASE_DICT[ithIndicator_phase];

    // NB: `currentPhase` here is still the PREVIOUS sample's phase.
    ithLunarAgePercent_wrapped =
        (currentPhase == LunarPhase.NEW && ithLunarAgePercent > 0.5)
            ? 1.0 - ithLunarAgePercent
            : ithLunarAgePercent;

    distanceFromIdealPercentage =
        Math.abs(moonPhaseLookup.moon_phase_percentage - ithLunarAgePercent_wrapped);

    startNewClosestDateSearch = false;
    if (currentPhase != ithIndicator_phase) startNewClosestDateSearch = true;
    else if (!(ithIndicator_phase in closestDatesToAstroIndicators)) startNewClosestDateSearch = true;
    else {
        arr = closestDatesToAstroIndicators[ithIndicator_phase];
        if (Math.abs(ithDateInMillis - arr[arr.length-1]) > MILLIS_PER_DAY*10)   // 10-day regap
            startNewClosestDateSearch = true;
    }

    if (startNewClosestDateSearch) {
        (closestDatesToAstroIndicators[ithIndicator_phase] ??= []).push(ithDateInMillis);
        currentPhase = ithIndicator_phase;
        percentageDeltaOfClosestCurrentDate = null;
    }

    if (percentageDeltaOfClosestCurrentDate == null
        || distanceFromIdealPercentage < percentageDeltaOfClosestCurrentDate) {
        percentageDeltaOfClosestCurrentDate = distanceFromIdealPercentage;
        arr = closestDatesToAstroIndicators[currentPhase];
        arr[arr.length-1] = ithDateInMillis;      // overwrite the tail
    }
```

Result: for each phase name, an **array of sample-millis** — one per occurrence
of that phase in the sampled span — each being the sampled day whose lunar-age
percentage is nearest that phase's ideal percentage.

**Phase C — attach eclipse hits (same dictionary, different value type!)**

`src/ophis_view__chart_datasets.js:1102-1143`:

```js
var fullSolarEclipsesEnabled    = isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__CHART_OPTION__FULL_SOLAR_ECLIPSES")    === true;
var partialSolarEclipsesEnabled = isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__CHART_OPTION__PARTIAL_SOLAR_ECLIPSES") === true;
var fullLunarEclipsesEnabled    = isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__CHART_OPTION__FULL_LUNAR_ECLIPSES")    === true;
var partialLunarEclipsesEnabled = isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__CHART_OPTION__PARTIAL_LUNAR_ECLIPSES") === true;

if (any of the four) {
  for each ithDateInMillis in allDatesInMillis:            // RAW X/Z dates, NOT the sampled strip
      if (fullSolar || partialSolar) {
          eclipseObject = binarySearchForEclipse(SOLAR_ECLIPSES_PROCESSED, ithDateInMillis);
          if (eclipseObject != null) {
              eclipseType = getNormalizedSolarEclipseType(eclipseObject);
              if (eclipseType == FULL && fullSolar || eclipseType == PARTIAL && partialSolar) {
                  closestDatesToAstroIndicators[eclipseType] ||= {};                 // OBJECT, not array
                  closestDatesToAstroIndicators[eclipseType][eclipseObject.date_millis + ""] = true;
              }
          }
      }
      // …identical block for LUNAR_ECLIPSES_PROCESSED…
}
```

`closestDatesToAstroIndicators` therefore holds **arrays** under the 8 phase keys
and **objects used as sets** under the 4 eclipse keys. Downstream both are walked
with `for…in`, which is why it works.

**Phase D — emit indicator points, applying the tolerance**

`src/ophis_view__chart_datasets.js:1149-1240`:

```js
for (var key in closestDatesToAstroIndicators) {
    moonPhaseLookup = MOON_PHASE_DICT[key];
    eclipseLookup   = ECLIPSE_DICT[key];
    loadedImage     = CHART_IMAGES[key];

    if (moonPhaseLookup) {
        if (isIsoEventFieldEnabled(isoEvent, moonPhaseLookup.serialized_field) !== true) continue;
        filterField = getIsoEventField(moonPhaseLookup.serialized_field);
        for each ithDateInMillisForPhase in closestDatesToAstroIndicators[key]:
            moonPoint = null;
            for each kthXDateOrZDateInMillis in allDatesInMillis:
                if ( Math.abs(ithDateInMillisForPhase - kthXDateOrZDateInMillis) <= LUNAR_DATE_MATCH_TOLERANCE ) {
                    if (moonPoint == null) {
                        moonPoint = newAstroIndicatorPoint(ithDateInMillisForPhase, loadedImage,
                                                           ASTRO_INDICATOR_TYPE__LUNAR_PHASE, filterField.zIndex);
                        toReturn.push(moonPoint);
                        indicatorsThatOverlappedDates[serializedField] = true;
                    }
                    moonPoint.date_connections_in_millis.push(kthXDateOrZDateInMillis);
                }
    } else if (eclipseLookup) {
        filterField = getIsoEventField(eclipseLookup.serialized_field);
        for (var ithEclipseMidpointDate in closestDatesToAstroIndicators[key]) {   // string keys
            eclipsePoint = null;
            for each kthXDateOrZDateInMillis in allDatesInMillis:
                ithEclipseMidpointDateMillis = parseIntElseNeg1(ithEclipseMidpointDate);
                if ( Math.abs(ithEclipseMidpointDateMillis - kthXDateOrZDateInMillis) <= ECLLIPSE_DATE_MATCH_TOLERANCE ) {
                    if (eclipsePoint == null) {
                        if (isoEvent.scope == EVENT_SCOPE__HH_MM)
                            ithEclipseMidpointDateMillis = roundMillisToNearestMidnightInTimeZone(ithEclipseMidpointDateMillis, timeZone);
                        else if (isoEvent.scope == EVENT_SCOPE__DAYS && isFlagEnabled(FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT))
                            ithEclipseMidpointDateMillis = roundMillisToNearestMidnightInTimeZone(ithEclipseMidpointDateMillis, timeZone);
                        eclipsePoint = newAstroIndicatorPoint(ithEclipseMidpointDateMillis, loadedImage,
                                                              ASTRO_INDICATOR_TYPE__ECLIPSE, filterField.zIndex);
                        toReturn.push(eclipsePoint);
                        indicatorsThatOverlappedDates[serializedField] = true;
                    }
                    eclipsePoint.date_connections_in_millis.push(kthXDateOrZDateInMillis);
                }
        }
    }
}
handleJustChangedFields(isoEvent, indicatorsThatOverlappedDates);
toReturn.sort((a, b) => a.z_index - b.z_index);
return toReturn;
```

**Net predicate summary**

| Event | Predicate | Tolerance |
|---|---|---|
| Moon phase | `|representativeSampleDay − anyXorZDate| ≤ tol` | **±1 day** (86 400 000 ms) |
| Eclipse (find) | `|anyXorZDate − record.date_millis| ≤ tol` inside `binarySearchForEclipse` | **±1.25 days** (108 000 000 ms) |
| Eclipse (emit) | `|record.date_millis − anyXorZDate| ≤ tol` again | **±1.25 days** |

The eclipse tolerance is applied twice with the same value, so the second test is
redundant — except that it is what populates `date_connections_in_millis` for
*every* qualifying X/Z-date, not just the one that found the record.

Emitted point shape (`src/ophis_view__chart_datasets.js:968-976`):

```ts
type AstroIndicatorPoint = {
  xPoint: number;                      // millis where the icon is drawn on the time axis
  loaded_image: HTMLImageElement;      // from CHART_IMAGES[key]
  date_connections_in_millis: number[];// every X/Z-date this indicator links to
  astro_indicator_type: "ASTRO_INDICATOR_TYPE__LUNAR_PHASE" | "ASTRO_INDICATOR_TYPE__ECLIPSE";
  z_index: number;                     // moons 5; eclipses 7/8/9/10 (see §3.3)
};
```

Rendering (`src/ophis_view__chart_datasets.js:740-796`): moons are drawn
`CHART_PIXEL_OFFSET__MOONS = 70` px below the y=0 pixel, eclipses at
`CHART_PIXEL_OFFSET__ECLIPSES = 70 + 30 = 100` px; both icons are 30×30
(`CHART_MOON_SIZE`, `CHART_ECLIPSE_SIZE`, `src/ophis_view__chart_config.js:3-4,49-50`).
A dashed 1 px black connector (`drawIndicatorLine`, dash `[4,4]`,
`src/ophis_view__chart_datasets.js:718-733`) is drawn from each icon to the bottom
of each connected date label.

Image preloading (`loadAstroIndicators`, `src/ophis_view__chart_config.js:137-176`)
waits for **`CHART_IMAGE_COUNT = 8 + 4 + 4 = 16`** images: 8 moon phases, 4
eclipse icons, 4 hit symbols (`img/hit_symbols/{gemini,triangle,diamond,circle}.png`).
Init blocks on `onAllImagesLoaded`; a single 404 hangs startup forever (there is
no error handler and no timeout).

---

## 6. Timezone handling

### 6.1 `tzlookup` API

`lib/tz_lookup_oss.js` is one minified line exporting a single global:

```ts
function tzlookup(lat: number|string, lng: number|string): string;   // IANA zone id
```

* Coerces with `+lat` / `+lng`.
* Throws `RangeError("invalid coordinates")` unless `-90 ≤ lat ≤ 90` and `-180 ≤ lng ≤ 180`.
* Special case: `if (90 <= lat) return "Etc/GMT";`
* Otherwise a packed 48×24 (then recursively subdivided) grid index into a string
  table of ~430 zone names.
* Also self-registers `module.exports = tzlookup` when `module` exists.

Verified values: `tzlookup(0,0) === "Etc/GMT"`,
`tzlookup(40.7,-74) === "America/New_York"`, `tzlookup(-90,0) === "Antarctica/McMurdo"`,
`tzlookup(91,0)` throws.

### 6.2 Ophis wrapper

`src/ophis_dependencies.js:130-132`:

```js
function getTimezone(lat, long) { return tzlookup(lat, long); }
```

`src/ophis_dependencies.js:185-187`:

```js
function getBrowserTimezone() { return moment.tz.guess(); }
```

Call sites of `getTimezone`:

| Site | Purpose |
|---|---|
| `src/ophis_dependencies.js:255` | `convertStandardLocalDateStringToNativeUtcDate` — X-Date string → UTC instant |
| `src/ophis_dependencies.js:273` | `convertNativeLocalDateToUtc` |
| `src/ophis_dependencies.js:283` | `convertNativeUtcDateToLocalMoment` — UTC instant → display moment |
| `src/ophis_main.js:358` | toast after picking a coordinate on the map |
| `src/ophis_view.js:770`, `src/ophis_view__rebuild.js:264` | the per-event "timezone" column in the UI |
| `src/ophis_view__chart.js:766,770` | Chart.js Luxon adapter `scales.x.adapters.date.zone` |
| `src/ophis_view__chart_datasets.js:1014,1017` | the moon/eclipse date bucketing zone |

### 6.3 Which zone is used, per scope

`src/ophis_utils.js:766-782` + `src/ophis_view__chart.js:765-774` +
`src/ophis_view__chart_datasets.js:1014-1018`:

| `isoEvent.scope` | Zone used for bucketing / chart axis |
|---|---|
| `EVENT_SCOPE__HH_MM` | `tzlookup(isoEvent.lat, isoEvent.long)` — the *observer's* zone |
| `EVENT_SCOPE__DAYS` with `FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT === true` (the default, `src/ophis_config.js:297`) | `tzlookup(0,0)` → `"Etc/GMT"` |
| `EVENT_SCOPE__DAYS` with the flag off | `null` → the browser's local zone |
| `EVENT_SCOPE__MONTHS` / `EVENT_SCOPE__YEARS` | browser local (lat/long/zone forcibly nulled) |

Lat/long are stored rounded to `DECIMAL_PRECISION__LOCATION = 1` decimal
(`src/ophis_config.js:370`) and clamped to `LAT_LIMIT = 65`, `LONG_LIMIT = 180`
(`src/ophis_config.js:426-427`) — the comment says every sunset library "starts
freaking out once you get too arctic".

### 6.4 `roundMillisToNearestMidnightInTimeZone` — **broken, and load-bearing**

`src/ophis_utils.js:872-891`:

```js
function roundMillisToNearestMidnightInTimeZone(nativeDateMillisUtc, timeZone) {
    var momentInstance = moment(nativeDateMillisUtc).tz(timeZone, true);

    const midnight = momentInstance.endOf('day');
    const lastMidnight = momentInstance.startOf('day');
    const timeUntilMidnight = midnight.diff(momentInstance);
    const timeSinceMidnight = momentInstance.diff(lastMidnight);

    let nearestMidnight;
    if (timeUntilMidnight < timeSinceMidnight) { nearestMidnight = midnight; }
    else { nearestMidnight = lastMidnight; }

    return nearestMidnight.valueOf();
}
```

Two separate defects:

1. **moment mutates.** `endOf('day')` and `startOf('day')` mutate `momentInstance`
   in place and return `this`. So `midnight`, `lastMidnight` and `momentInstance`
   are the **same object**. By the time the diffs run, all three are `startOf('day')`,
   so `timeUntilMidnight === 0` and `timeSinceMidnight === 0`, the comparison
   `0 < 0` is false, and the function **always floors**. Measured directly against
   the bundled moment 2.29.4: `timeUntilMidnight=0 timeSinceMidnight=0 sameObj:true`
   for every input. The "round to nearest" in the name never happens.
2. **`keepLocalTime = true`.** `.tz(zone, true)` keeps the *displayed wall clock*
   and changes the instant. `moment(ms)` renders in the **browser's** zone, so the
   calendar date that gets floored is the browser-local date, then re-anchored to
   midnight in `timeZone`. Measured (browser zone America/New_York):

   | input instant | browser-local | `→ Etc/GMT` | `→ Asia/Tokyo` | `→ America/New_York` |
   |---|---|---|---|---|
   | `2025-01-16T02:30Z` | Jan 15 21:30 | `2025-01-15T00:00Z` | `2025-01-14T15:00Z` | `2025-01-15T05:00Z` |
   | `2025-01-15T22:30Z` | Jan 15 17:30 | `2025-01-15T00:00Z` | `2025-01-14T15:00Z` | `2025-01-15T05:00Z` |

   The first row's true UTC date is **Jan 16**, yet the `Etc/GMT` bucket is Jan 15.
   So "lock day scope to GMT" does *not* bucket by UTC date; it buckets by the
   operator's local date and then labels it GMT.

Both defects flow into moon-phase sampling (`…chart_datasets.js:1024,1026`) and
eclipse icon placement (`…chart_datasets.js:1214,1216`). A faithful port must
reproduce them or explicitly declare a behaviour change.

### 6.5 X-Date ⇄ instant conversions (astronomy-relevant helpers)

`src/ophis_dependencies.js:253-288`:

```js
function convertStandardLocalDateStringToNativeUtcDate(standardLocalDateString, lat_nullable, long_nullable, timezone_nullable = null) {
    if ( isValidLatAndLong(lat_nullable, long_nullable) || timezone_nullable != null ) {
        var timezone = timezone_nullable != null ? timezone_nullable : getTimezone(lat_nullable, long_nullable);
        return moment.tz(standardLocalDateString, timezone).utc().toDate();
    } else {
        return moment(standardLocalDateString, X_DATE_MOMENT_PARSING_FORMAT).toDate();   // BROWSER-local
    }
}

function convertNativeLocalDateToUtc(nativeDateInLocalTime, lat, long) {
    var timezone = getTimezone(lat, long);
    return moment.tz(nativeUtcDateToStandardString_dateAndTime(nativeDateInLocalTime), timezone).utc().toDate();
}

function convertNativeUtcDateToLocalMoment(nativeDateInUtcTime, lat, long) {
    var timezone = getTimezone(lat, long);
    return moment.utc(nativeUtcDateToStandardString_dateAndTime(nativeDateInUtcTime)).tz(timezone);
}
```

with `X_DATE_MOMENT_PARSING_FORMAT = "YYYY-MM-DD HH:mm"` (`src/ophis_config.js:283`),
`nativeUtcDateToStandardString_dateAndTime` building `"YYYY-MM-DD HH:mm"` from
`getUTC*` components (`src/ophis_view__strings.js:248-250`), and
`dateComponentsToReadableString` producing `"MM/DD/YYYY"` with the **year unpadded**
(`src/ophis_view__strings.js:231-233`) — year 0 renders as `"01/10/0"`.

Note `convertStandardLocalDateStringToNativeUtcDate`'s first branch loses seconds
and drops sub-minute precision by construction — the standard string format has no
seconds field.

Simple UTC helpers (`src/ophis_utils.js:432-445`):

```js
function getNoonOfNativeUtcDate(d) {                 // true UTC noon
    var ms = d.getTime();
    return new Date(ms - (ms % MILLIS_PER_DAY) + MILLIS_PER_DAY/2);
}
function getTimeZeroOfNativeDateMillis(ms) {         // true UTC midnight
    return ms - (ms % MILLIS_PER_DAY);
}
```

`getTimeZeroOfNativeDateMillis` is **dead** in the eclipse path — it appears twice
as a commented-out tail (`…chart_datasets.js:1119,1135`, `x = x;//getTimeZeroOf…`).
Both are also wrong for pre-1970 millis (`%` on negative numbers gives a negative
remainder, so the result lands at the *next* midnight).

---

## 7. Sunset engines (the other half of the astronomy layer)

Not used for eclipses or moon phases, but shares the lat/long pipeline. Included
because a rewrite must decide whether to keep it.

### 7.1 The library-strategy record

`src/ophis_dependencies.js:3-56`:

```js
function newSunsetLibrary(name, enabled, execute) {
    return { name, enabled, execute, cache: {} };
}

var SUNSET_LIBRARY__COSINE_KITTY = newSunsetLibrary("CosineKitty", true, function(nativeUtcDate, lat, long) {
    var observer = new Astronomy.Observer(lat, long, DEFAULT_HEIGHT_IN_METERS_FOR_SUN_CALC);  // 2 m
    var limitDays = 300;
    cosineKittySunset = Astronomy.SearchRiseSet('Sun', observer, -1, nativeUtcDate, limitDays);
    return cosineKittySunset ? cosineKittySunset.date : null;
});

var SUNSET_LIBRARY__MEEUS = newSunsetLibrary("Meeus", true, function(nativeUtcDate, lat, long) {
    var sunTimes = getSunTimesMeeus(nativeUtcDate, lat, long, DEFAULT_HEIGHT_IN_METERS_FOR_SUN_CALC);
    return (sunTimes && sunTimes.setJS) ? sunTimes.setJS : null;
});

var SUNSET_LIBRARY__SUN_CALC = newSunsetLibrary("SunCalc", true, function(nativeUtcDate, lat, long) {
    var sunCalcTimes = SunCalc.getTimes(nativeUtcDate, lat, long);
    return sunCalcTimes ? sunCalcTimes.sunset : null;
});

var SUNSET_LIBRARIES = [SUNSET_LIBRARY__COSINE_KITTY, SUNSET_LIBRARY__MEEUS, SUNSET_LIBRARY__SUN_CALC];
```

`cosineKittySunset` at line 22 is an **implicit global** (no `var`/`let`) — it
would throw in strict mode and is a latent leak.

`getSunsetOnNativeUtcDate` (`src/ophis_dependencies.js:58-69`) does **not** use the
fallback chain despite the comment claiming it does — the Meeus and SunCalc lines
are commented out. Only CosineKitty is ever called from there. `SUNSET_LIBRARIES`
*is* iterated in `getSunsetSampling` (`src/ophis_utils.js:346-376`), so the other
two engines are only reachable when the primary produces a sampling that fails
`validateSunsetSequence`.

`DEFAULT_HEIGHT_IN_METERS_FOR_SUN_CALC = 2` (`src/ophis_config.js:428`).

### 7.2 Rounding & caching

`src/ophis_dependencies.js:71-124`, `src/ophis_utils.js:451-531`:

* `roundDateToNearestMinute(d)` (`src/ophis_utils.js:893-902`): if `getSeconds() >= 30`
  bump minutes by 1, then zero seconds and ms. **Mutates in place.**
* Rounding is applied on the way *in* (to improve cache hit rate) and on the way
  *out* (because "the same library can give a sunset time on the same day, for two
  different times in that day, that's different by e.g. a few milliseconds").
  **Bug:** in `getSunsetOnNativeUtcDate_fromLibraryOrItsCacheWithNearestMinuteRounding`
  the rounded clone `nativeUtcDateCloned` is computed and then **never used** —
  the un-rounded `nativeUtcDate` is what is passed downstream
  (`src/ophis_dependencies.js:75-78`).
* Cache key: `` `${utcMillis}_${lat}_${long}` `` (`src/ophis_utils.js:454-457`).
  `getFromSunsetCache` explicitly handles a cached value of `0`
  (`src/ophis_utils.js:473`).
* Flags: `FEATURE_FLAG__USE_PER_LIBRARY_SUNSET_CACHE = true`,
  `FEATURE_FLAG__BEFORE_N_AFTER_SUNSET_CACHE = false`,
  `FEATURE_FLAG__USE_SUNSET_SAMPLING = true` (`src/ophis_config.js:307-309`).

### 7.3 Sunset sampling

`getSunsetSamplingUsingLibrary` (`src/ophis_utils.js:378-430`):

```
daySliceCount      = 3
numberOfDaysToSample = 5
timeSlice          = MILLIS_PER_DAY / 3                 // 8 h
totalLimit         = 15
startDateInMillis  = t + 2.5 * MILLIS_PER_DAY
for i in 0..14: sample at (startDateInMillis - i*timeSlice), collect into a Set
sort ascending
for i from end down to 1: if (gap > 1.5 days) splice in a synthetic midpoint sunset
```

`validateSunsetSequence` (`src/ophis_model__validation.js:3-28`) rejects a sampling
if consecutive sunsets differ by more than **5 minutes** in their time-of-day
(`differenceLimitInMillis = 5 * MILLIS_PER_MINUTE`), with a wrap correction when
the difference exceeds 12 h.

`getSunsetNativeUtcDateBefore` / `…After` (`src/ophis_utils.js:533-620`) scan the
sampling, then fall through to a 600-iteration half-day step loop, then finally
return `getSunsetOnNativeUtcDate` on the input date.

`getSunsetOnNativeUtcDate` returns the **input date unchanged** when every library
fails (`src/ophis_dependencies.js:67` — "At least return something").

### 7.4 SunCalc (`lib/suncalc.js`) — reference API

Upstream commit `7ccde2118968e21e47db573e34757258275943ae`. Constants:
`J1970 = 2440588`, `J2000 = 2451545`, `e = rad*23.4397`, `J0 = 0.0009`,
`sdist = 149598000 km`, moon distance `385001 - 20905·cos(M)` km.

```
SunCalc.times = [[-0.833,'sunrise','sunset'], [-0.3,'sunriseEnd','sunsetStart'],
                 [-6,'dawn','dusk'], [-12,'nauticalDawn','nauticalDusk'],
                 [-18,'nightEnd','night'], [6,'goldenHourEnd','goldenHour']]
SunCalc.getPosition(date, lat, lng)        -> {azimuth, altitude}                 // radians
SunCalc.getTimes(date, lat, lng, height=0) -> {solarNoon, nadir, sunrise, sunset, …} // Dates
SunCalc.getMoonPosition(date, lat, lng)    -> {azimuth, altitude, distance, parallacticAngle}
SunCalc.getMoonIllumination(date)          -> {fraction, phase, angle}
SunCalc.getMoonTimes(date, lat, lng, inUTC)-> {rise?, set?, alwaysUp?, alwaysDown?}
SunCalc.addTime(angle, riseName, setName)
```

`getMoonIllumination(date).phase` is a **0…1 continuous phase** with 0 = new,
0.5 = full: `phase = 0.5 + 0.5·inc·sign(angle)/π`. Ophis does **not** use it —
worth noting because it is the obvious "correct" alternative to lunarphase-js and
is already bundled. `observerAngle(height) = -2.076·√height/60` degrees.
Only `SunCalc.getTimes(...).sunset` is referenced (`src/ophis_dependencies.js:44`).

### 7.5 Meeus (`lib/meeus-easy.js` + `lib/meuusjs.1.0.3.min.js`)

`meuusjs` 1.0.3 (Fabio Soldati / peakfinder.org, MIT) exposes a global `A`
namespace: `A.JMod=2400000.5, A.J2000=2451545, A.J1900=2415020, A.B1900=2415020.3135,
A.B1950=2433282.4235, A.JulianYear=365.25, A.JulianCentury=36525,
A.BesselianYear=365.2421988, A.AU=149597870`, plus
`A.Coord, A.DeltaT, A.EclCoord, A.EqCoord, A.Globe, A.HzCoord, A.Interp,
A.JulianDay, A.Math, A.Moon, A.MoonIllum, A.Nutation, A.Parallax, A.Refraction,
A.Rise, A.Sidereal, A.Solar, A.Solistice` [sic].

`lib/meeus-easy.js` is a thin adapter with four functions:

```ts
mooncalcMeeus(myDateJS: Date, lat, lon, height) -> {
  moonAzimuthDegrees, moonAzimuthRad,            // az + 180° / +π applied (lines 24-25)
  moonAltitudeDegrees: null,                     // always null — see below
  moonAltitudeRefractionDegrees, moonAltitudeRefractionRad,
  moonIllumFractionDetailPercentage,             // A.MoonIllum.illuminated(phaseAngle)
  moonPhase,                                     // phase ANGLE in radians, not a name
  moonDistance,                                  // km
  rise, riseJS, transit, transitJS, set, setJS   // "HH:MM:SSZ" strings + Date objects
}
suncalcMeeus(myDateJS, lat, lon, height) -> { sunAzimuthRad, sunAltitudeRad,
  sunAzimuthDegrees, sunAltitudeDegrees, sunDistance, rise/riseJS/transit/transitJS/set/setJS }
getSunTimesMeeus(myDateJS, lat, lon, height)  -> { rise, riseJS, transit, transitJS, set, setJS }
getMoonTimesMeeus(myDateJS, lat, lon, height) -> same shape
```

Landmines in this adapter (`lib/meeus-easy.js:36-41,73-78`): the `*JS` Dates are
built by **string concatenation** —

```js
riseJS: new Date(myDateJS.getUTCFullYear() + "-" + (myDateJS.getUTCMonth()+1) + "-" +
                 myDateJS.getUTCDate() + " " + A.Coord.secondsToHMSStr(times.rise) + "Z")
```

which yields non-zero-padded strings like `"2025-3-9 18:04:22Z"`. That is not a
valid ISO 8601 literal; V8 falls back to its legacy parser (works), other engines
may return `Invalid Date`. Also, the date part is always the **input day's UTC
date** even when the computed rise/set actually belongs to the adjacent day — the
comment at `src/ophis_utils.js:339-342` documents exactly this failure ("You
basically can't get it to return 10/11/2023 for some reason").
`moonAltitudeDegrees` is hard-coded `null` (line 30) while the refraction-corrected
value is returned under a different key.

Only `getSunTimesMeeus(...).setJS` is ever consumed (`src/ophis_dependencies.js:32,35`).

### 7.6 Astronomy Engine (`lib/astronomy.browser.min.js`)

cosinekitty Astronomy Engine **v2.1.19**, MIT, © 2019-2025 Don Cross. Ophis uses
exactly two entry points:

```ts
new Astronomy.Observer(latitudeDeg: number, longitudeDeg: number, heightMeters: number)
Astronomy.SearchRiseSet(body: "Sun", observer: Observer, direction: +1|-1,
                        dateStart: Date, limitDays: number): AstroTime | null
// direction -1 = set, +1 = rise;  .date is a JS Date
```

`limitDays = 300` is used with the comment "Not 100 % sure what this does, but
examples in the library use 300 so I'm going with it."

---

## 8. `lib/geo-point.js`

A hand-rolled 3-D point/vector class with internal fields `m_x`, `m_y`, `m_z`.
Not astronomical at all despite living next to the astronomy libs.

```ts
new GeoPoint(x = 0, y = 0, z = 0)
// accessors
getX/getY/getZ, setX/setY/setZ, incX/incY/incZ, set(x,y,z=0), copy(pt|null), toString()
// vector math
calcLength(), calcLengthSquared(), setLength(v), normalize(), calcNormal(out),
negate(), round(), scaleByNumber(f), translateBy(pt),
calcDistanceTo(pt), calcDistanceSquaredTo(pt), calcDeltaTo(to, out),
calcMidwayPoint(other, out),                      // uses module-global scratch `utilVector_point`
calcSignedAngleTo(vec), calcClockwiseAngleTo(vec),
rotateBy(radians, origin|null), setToPerpVector(direction = -1)
// hit testing — returns the normalised ellipse equation value p; p <= 1 means inside
hitTestEclipse(cx, cy, width, height) -> number
hitTestCircle(cx, cy, radius) -> number            // delegates with diam = radius*2
// canvas helpers — DEAD (see below)
moveTo(ctx), lineTo(ctx), circle(ctx, r), circleBackwards(ctx, r)
// module globals
var utilVector_point = null;  function initUtilVector();
var GEO_POINT__Y_AXIS = new GeoPoint(0, 1);
```

Notes / defects:

* `hitTestEclipse` (`lib/geo-point.js:213-223`) is named "Eclipse" but means
  **ellipse**. It computes `p = a²/b² + c²/d²` where `b` is the full *width*, not
  the semi-axis — so the returned `p` is off by a factor of 4 relative to the
  standard ellipse test. `hitTestCircle` compensates by passing `diam = radius*2`
  as `width`, so circle hit-testing with `p <= 1` is *correct* while direct
  ellipse hit-testing is not.
* `moveTo/lineTo/circle/circleBackwards` (`lib/geo-point.js:275-291`) multiply by
  `PIXELS_PER_INCH`, which is **defined nowhere** in `src/` or `lib/`. Calling any
  of them throws `ReferenceError`. Dead code.
* `setToPerpVector` (`lib/geo-point.js:254-272`) writes `this.m_y`/`this.m_x`
  and *then* calls `this.set(tempY, -tempX)` with the same values — the first two
  assignments are redundant.
* `calcSignedAngleTo` negates twice (`angle = -(...)` then `angle = -angle`), so
  the two negations cancel; only `minimizeAngle` has effect.
* `GEO_POINT__Y_AXIS` is never read.

Actual call sites in `src/` (all 2-D, z ignored):

```
src/ophis_view__chart.js:92-93     mouseDownPoint / mouseUpPoint
src/ophis_view__chart.js:250       mousePoint_data = new GeoPoint(positionX_data, positionY_data)
src/ophis_view__chart_datasets.js:889-890  rotationPoint / rotationOriginPoint for curve geometry
```

A rewrite can delete this file and use two `{x, y}` literals plus `Math.hypot`.

---

## 9. GOTCHAS

Ordered by how badly a naive port would break.

1. **The eclipse arrays are not sorted, and the code binary-searches them.**
   Three ascending blocks (§1.4). 271 lunar / 420 solar records are unreachable;
   of those, 129 lunar / 195 solar are *genuine* eclipses in 100–181 AD that the
   app can never report. If you sort the array before searching you will **change
   output**: the previously-unreachable corrupt 1969-2068 records become findable
   and will produce phantom eclipse icons on modern dates. Sort **and** purge the
   corrupt block, or keep neither.

2. **142 lunar / 225 solar records carry fabricated 20th–21st-century dates.**
   Cause: moment's `YYYY` two-digit-year windowing (§2.4). E.g. the shipped solar
   table claims a total eclipse on **2024-03-28** (really 24 AD) alongside the
   genuine **2024-04-08**. If you regenerate the tables, pad the year to 4 digits
   (`String(y).padStart(4,"0")`) or parse with an explicit numeric constructor.

3. **`date_millis` is America/New_York midnight, not UTC midnight.** Every record
   is offset by the generator machine's zone: `04:56:02Z` before 1883,
   `05:00:00Z` (EST) or `04:00:00Z` (EDT) after. A reimplementation that stores UTC
   midnights will be off by 4–5 hours, which matters at the ±1.25-day window edges.

4. **The shipped tables do not match today's `optimizeEclipseData`.** Regenerating
   moves 915 lunar / 1 416 solar records by one day (§2.5). Do not "refresh the
   data" casually.

5. **`roundMillisToNearestMidnightInTimeZone` never rounds up and is browser-zone
   dependent** (§6.4). moment's `startOf`/`endOf` mutate, collapsing both diffs to
   0. And `.tz(zone, true)` keeps the *browser's* wall clock, so "lock to GMT"
   actually buckets by the operator's local calendar date.

6. **Moon phase depends on the browser timezone, not on lat/long.**
   `Julian.fromDate` subtracts `getTimezoneOffset()/1440` (§4.2). Same `.oph` file,
   different machine zone → up to ±0.6 days of lunar age → different phase near a
   boundary. Location has *no* effect on phase, even though the UI collects lat/long.

7. **Two different value types share one dictionary.**
   `closestDatesToAstroIndicators[phaseName]` is a `number[]`;
   `closestDatesToAstroIndicators[eclipseTypeName]` is a `{ [millisString]: true }`
   object (§5.3 phase C). Downstream code distinguishes them by looking the key up
   in `MOON_PHASE_DICT` vs `ECLIPSE_DICT`. Do not "clean this up" without touching
   both loops at `…chart_datasets.js:1166` and `…chart_datasets.js:1200`.

8. **`ithLunarAgePercent_wrapped` uses the *previous* sample's phase.**
   `…chart_datasets.js:1061` reads `currentPhase`, which is only assigned at
   line 1090 *after* the decision. On the first sample of a NEW-moon window the
   wrap is skipped, giving a bogus distance of ~0.9375; it is harmless only because
   that sample is simultaneously the one that resets
   `percentageDeltaOfClosestCurrentDate = null`.

9. **The eclipse tolerance is 1.25 days but every tooltip says 1 day**
   (`src/ophis_config.js:233,242,251,260`, `src/ophis_main.js:510`). Two of the four
   eclipse tooltips also say "Partial Lunar" when they mean Full Lunar
   (`src/ophis_config.js:251`).

10. **Solar "FULL" includes annular and hybrid.** `A*` and `H*` are bucketed with
    `T*` (§3.1). Astronomically wrong, but it is the shipped semantics.

11. **Lunar penumbral eclipses (`N`, `Nb`, `Ne`, `Nx`) are absent from the data
    entirely** — 4 378 rows dropped at generation time. There is no runtime toggle.
    Solar, by contrast, keeps every type including saros-boundary markers.

12. **BCE eclipses are silently dropped** (`ithDate.startsWith("-")`,
    `…chart_datasets.js:1571`). The bundled data is a 3 000-year table
    (0 → 3000 AD), not the 5 000-year NASA canon, despite the CSVs holding all of it.

13. **12 MB of `*_orig.js` is loaded and never used.** Both globals exist only for
    the commented-out regeneration path.

14. **`ECLIPSE_DATA_DATE_FORMAT` contains a comma the data lacks**
    (`"YYYY, MMMM D"` vs `"10 June 15"`). Works only because moment's non-strict
    mode ignores literal mismatches; `moment.utc(s, fmt, /*strict*/true)` would
    return Invalid Date for every row.

15. **`ECLLIPSE_DATE_MATCH_TOLERANCE` is spelled with three L's**
    (`src/ophis_config.js:115`). It is the real identifier used at
    `…chart_datasets.js:47` and `…chart_datasets.js:1210`.

16. **`getTimeZeroOfNativeDateMillis` is broken for negative millis** and is dead
    in this path anyway (§6.5).

17. **`getSunsetOnNativeUtcDate_fromLibraryOrItsCacheWithNearestMinuteRounding`
    computes a rounded clone and discards it** (`src/ophis_dependencies.js:75-78`),
    so the documented input-side minute rounding never happens.

18. **`cosineKittySunset` is an implicit global** (`src/ophis_dependencies.js:22`).

19. **`loadAstroIndicators` blocks startup on exactly 16 image loads**
    (`CHART_IMAGE_COUNT = getDictionarySize(MOON_PHASE_DICT) + 4 + 4`) with no
    `onerror` handler. One missing PNG = permanent "Loading…".

20. **`PIXELS_PER_INCH` is undefined**, so four `GeoPoint` canvas methods throw if
    called (§8).

21. **`ECLIPSE_DICT[*].imagePath` holds an emoji, not a path**, and is never read
    (§3.3).

22. **Moon sampling window is asymmetric**: `[t − 8 d, t + 9 d)`
    (`…chart_datasets.js:1029-1030` — the end adds an extra `MILLIS_PER_DAY`).

23. **The `.oph` key for Last Quarter is `chart_option__show_third_quarter_moons`**
    while the phase name is `"Last Quarter"` (§4.3). Do not rename it or you break
    file compatibility.

24. **Eclipse detection uses the raw X/Z-date millis**, but moon-phase detection
    uses timezone-bucketed sample days (§5.3 phase A vs phase C). The two families
    of indicators therefore disagree about what "the same day" means.

---

## 10. Minimal-dependency reimplementation plan

### 10.1 Verdict per library

| Library | Size | Keep? | Replacement |
|---|---:|---|---|
| `lunarphase-js` | 3 KB | **drop** | 12 lines of arithmetic (§10.2) |
| `tz_lookup_oss` | 73 KB | **keep** *(or drop entirely — see §10.4)* | no small equivalent; a coarse grid is the whole point |
| `moment` + `moment-timezone-with-data` | ~1.2 MB | **drop** | `Intl.DateTimeFormat` with `timeZone` (§10.3) |
| `astronomy.browser.min.js` (Astronomy Engine) | 116 KB | **keep if you keep sunsets** | it is the only accurate one |
| `meuusjs` + `meeus-easy` | 27 KB | **drop** | unreachable fallback |
| `suncalc` | 9 KB | **drop** (or keep *instead of* Astronomy Engine if 116 KB matters and ±1 min accuracy is acceptable) | |
| `geo-point` | 6 KB | **drop** | `{x,y}` + `Math.hypot` |
| `*_orig.js` (12 MB) | | **delete** | keep the CSVs in the repo for provenance only |
| `*.csv` (2 MB) | | **build-time only** | not shipped |

Shipping ~1.4 MB of date/astronomy libraries for what is ultimately one sine-like
formula and a 12 000-row lookup table is the single biggest win available.

### 10.2 Moon phase — self-contained replacement

```js
const SYNODIC = 29.53058770576;
const PHASES = ["New","Waxing Crescent","First Quarter","Waxing Gibbous",
                "Full","Waning Gibbous","Last Quarter","Waning Crescent"];

/** @param {number} ms epoch millis (UTC — see note) */
function lunarAgePercent(ms) {
  const jd = ms / 86400000 + 2440587.5;          // TRUE Julian Day (UTC)
  let p = (jd - 2451550.1) / SYNODIC;
  p -= Math.floor(p);
  return p < 0 ? p + 1 : p;
}
function lunarAgeDays(ms) { return lunarAgePercent(ms) * SYNODIC; }

/** 8 equal windows, each centred on its ideal point; NEW wraps. */
function lunarPhaseName(ms) {
  const p = lunarAgePercent(ms);
  return PHASES[Math.floor(((p * 8) + 0.5) % 8)];
}
/** ideal cycle fraction for a phase name: New 0, WaxCres .125, … WanCres .875 */
function idealPercent(name) { return PHASES.indexOf(name) / 8; }
```

`Math.floor(((p*8)+0.5) % 8)` reproduces the boundary chain of §4.3 exactly (the
`(2k+1)/16` cut points are precisely where `p*8 + 0.5` crosses an integer).

**Parity switch.** For byte-identical output with v12, replace the `jd` line with
`ms/86400000 - new Date(ms).getTimezoneOffset()/1440 + 2440587.5`. Recommendation:
ship the UTC version, expose the legacy behaviour behind an explicit
`legacyLocalTimeJulian: true` option, and document the difference. A `.oph` file
opened in a different timezone should not silently change its moon icons.

### 10.3 Timezone / bucketing — self-contained replacement

Drop moment entirely. Two primitives cover every use:

```js
/** Calendar Y/M/D + H/M in `zone` for an instant. */
function partsInZone(ms, zone) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  const o = {};
  for (const p of f.formatToParts(ms)) if (p.type !== "literal") o[p.type] = +p.value;
  return o;                                   // {year,month,day,hour,minute,second}
}

/** Epoch ms of local wall-clock Y-M-D H:M in `zone` (handles DST by 2-pass fixup). */
function zonedToUtc(y, mo, d, h, mi, zone) {
  let guess = Date.UTC(y, mo - 1, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const p = partsInZone(guess, zone);
    const back = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess += Date.UTC(y, mo - 1, d, h, mi) - back;
  }
  return guess;
}

/** Correct replacement for roundMillisToNearestMidnightInTimeZone. */
function midnightInZone(ms, zone) {
  const p = partsInZone(ms, zone);
  return zonedToUtc(p.year, p.month, p.day, 0, 0, zone);
}
```

`Intl` supports year 0 and negative years, and knows LMT-era offsets from the same
IANA database moment bundles — so the shipped table's `04:56:02Z` values remain
reproducible.

### 10.4 Eclipse table — rebuild it properly

Do the fix at build time, not runtime. Emit a **sorted, de-duplicated, UTC-based**
table from the CSVs:

```js
// build/gen-eclipses.mjs   (Node, run once, output committed)
const MONTHS = {January:0,February:1,March:2,April:3,May:4,June:5,
                July:6,August:7,September:8,October:9,November:10,December:11};

function build(csvText, { dropPenumbral }) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  const hdr = lines[0].split(",");
  const ci = hdr.indexOf("Calendar Date"), ti = hdr.indexOf("Eclipse Time"),
        ei = hdr.indexOf("Eclipse Type");
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",");
    const type = c[ei];
    if (dropPenumbral && type.startsWith("N")) continue;         // lunar only
    const m = /^(-?\d+)\s+([A-Za-z]+)\s+(\d+)$/.exec(c[ci]);
    const y = +m[1];                                             // KEEP negatives if you want BCE
    if (y < 0) continue;                                         // v12 parity: drop BCE
    const [hh, mm, ss] = c[ti].split(":").map(Number);
    const inst = new Date(Date.UTC(2000, MONTHS[m[2]], +m[3], hh, mm, ss));
    inst.setUTCFullYear(y);                                      // NO 2-digit windowing
    // UTC midnight of the UTC calendar date of the eclipse instant
    const midnight = new Date(Date.UTC(2000, inst.getUTCMonth(), inst.getUTCDate()));
    midnight.setUTCFullYear(inst.getUTCFullYear());
    out.push({ d: midnight.getTime(), t: type });
  }
  out.sort((a, b) => a.d - b.d);                                 // <-- the fix
  return out;
}
```

Expected output: **4 624 lunar** rows and **7 127 solar** rows — *the same counts
as today*. The year-windowing bug relabels rows, it does not add or remove them
(`12064 − 4378 penumbral − 3062 BCE = 4624`; `11898 − 4771 BCE = 7127`). What
changes is that 142 lunar / 225 solar rows move from fake 1969-2068 dates back to
their true 10-99 AD dates, and — because the array is finally sorted — the 129
lunar / 195 solar genuine records in 100-181 AD become reachable for the first
time. Net visible effect: phantom modern eclipses disappear, ancient ones appear.

Storage: with a sorted array you can drop to a **delta-encoded day index** —
`d` becomes `Math.round(ms/86400000)`, deltas fit in 1–2 bytes for most rows, and
the type is one of ≤19 enum values. A packed representation is ~25 KB per table
versus 234 KB / 359 KB today.

Lookup becomes a correct binary search for the lower bound plus a ±tolerance scan:

```js
function findEclipse(table, queryMs, tolMs = 1.25 * 86400000) {
  let lo = 0, hi = table.length;                     // lower_bound(queryMs - tol)
  const target = queryMs - tolMs;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (table[mid].d < target) lo = mid + 1; else hi = mid; }
  let best = null, bestDelta = Infinity;
  for (let i = lo; i < table.length && table[i].d <= queryMs + tolMs; i++) {
    const delta = Math.abs(table[i].d - queryMs);
    if (delta < bestDelta) { bestDelta = delta; best = table[i]; }
  }
  return best;                                        // nearest, not "whichever we landed on"
}
```

### 10.5 What you genuinely cannot shrink

* **`tzlookup`.** 73 KB of packed polygon grid. There is no 5-line substitute.
  *However*: Ophis only uses the zone for (a) an informational UI column,
  (b) the Chart.js axis, (c) day-bucketing, and (d) sunset lat/long. If the rewrite
  standardises on UTC bucketing (recommended) and keeps sunset in UTC, `tzlookup`
  can be dropped entirely and the "timezone" column replaced by a UTC-offset
  readout. That is a real behaviour change — call it out in release notes.
* **Sunset.** If `EVENT_SCOPE__HH_MM` and the sunset-based axial-rotation counting
  survive the rewrite, keep Astronomy Engine (116 KB). If they do not — note that
  the two flags that actually consume sunsets in the Z-Date pipeline,
  `FEATURE_FLAG__SUNSET__ADD_Z_VALUE_TO_X_DATE_PRIOR_SUNSET` and
  `FEATURE_FLAG__SUNSET__FILTER_BASED_ON_PRIOR_SUNSET`, are both **`false`** in v12
  (`src/ophis_config.js:301,305`) — then the entire sunset stack (Astronomy Engine +
  meeusjs + meeus-easy + suncalc + the caches + the sampling + `validateSunsetSequence`)
  is ~160 KB of code servicing one feature-flagged code path
  (`FEATURE_FLAG__SUNSET__CALCULATE_BEFORE_N_AFTER = true`, used only for the
  before/after sunset columns at `src/ophis_model__operations.js:326-341`).

### 10.6 Suggested target footprint

| Concern | v12 | Rewrite |
|---|---:|---:|
| Moon phase | 3 KB lib | ~15 lines |
| Date/zone math | ~1.2 MB (moment + tz data) | 0 (`Intl`) |
| Timezone lookup | 73 KB | 73 KB, or 0 if UTC-only |
| Eclipse tables | 593 KB (+12 MB unused orig) | ~50 KB packed, sorted, corrected |
| Sunset | ~160 KB | 116 KB, or 0 |
| Geometry | 6 KB | 0 |
| **Total** | **~14 MB parsed** | **~50 KB – 240 KB** |

---

## 11. Cross-module dependencies referenced but specified elsewhere

Named here so a reimplementer knows what to wire up; their definitions belong to
other spec documents in this series.

* `isFlagEnabled(flag)`, `isIsoEventFieldEnabled(isoEvent, varName)`,
  `getIsoEventField(varName)`, `newSerializedFieldObject(...)`,
  `getDictionarySize(dict)` — `src/ophis_utils.js:35-146`.
* `validateXDateCalendarDate`, `validateXDateTime`, `isValidNativeDate`,
  `isValidLatOrLong`, `parseLatOrLongString`, `roundNumberToLocationPrecision`,
  `constrainLatOrLongValue` — `src/ophis_model__validation.js`, `src/ophis_utils.js`.
* `handleJustChangedFields(isoEvent, indicatorsThatOverlappedDates)` —
  `src/ophis_view__utils.js:880`.
* `getCurrentIsoEvent()`, `appState`, `flushChangesToDisk()`, `showToast()`,
  `printError()`, `printWarning()` — controller/state layer.
* `axialRotationsBetweenNativeDates(...)` (`src/ophis_utils.js:904`) and
  `runOperations(...)` (`src/ophis_model__operations.js:263`) — the Y/Z engine;
  they consume the sunset helpers documented in §7.
* Chart.js + `chartjs-adapter-luxon` — `chart.options.scales.x.adapters.date.zone`
  is the only astronomy-adjacent surface (`src/ophis_view__chart.js:767,770,772`).
* Leaflet + `img/offline_map/map/{z}/{x}/{y}.png` — the offline tile picker that
  produces the lat/long fed to `tzlookup` (`src/ophis_main.js:316-338`).

---

## 12. Reproduction notes

Every quantitative claim above was produced by running the shipped artefacts:

* Record counts, key signatures, type histograms, date extents, block boundaries:
  `require`-ing `lib/*_processed.js` into a Node context with a `window` stub.
* Pipeline reconstruction: parsing `lib/*.csv` with the moment year-windowing map
  and comparing positionally against the shipped arrays — **4624/4624** and
  **7127/7127** exact matches for the local-date variant.
* moment behaviour (`YYYY` windowing, `startOf`/`endOf` mutation, `.tz(zone,true)`
  keepLocalTime): `lib/moment-with-locales.min.js` + `lib/moment-timezone-with-data.js`
  executed in a `vm` context (moment 2.29.4).
* `tzlookup` probes: direct `require` of `lib/tz_lookup_oss.js`.
* `lunarphase-js` values: direct `require` of `lib/lunarphase-js.js`.
* Binary-search reachability: querying each record's own `date_millis` through a
  verbatim copy of `binarySearchForEclipse`, plus day-by-day linear-vs-binary
  recall sweeps over 1900–2100 and weekly sweeps elsewhere.

Note when re-running on Windows: Node honours only `TZ=UTC`; other `TZ` values are
ignored, so timezone-variant tests must monkey-patch `Date.prototype.getTimezoneOffset`
or run on a POSIX host.
