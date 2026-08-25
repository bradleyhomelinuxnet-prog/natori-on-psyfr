# Ophis v12 — Subsystem Spec: The Equation Engine (`engine-math`)

**Scope of this document.** The mathematical heart of Ophis v12: the operation-string
grammar, the named constants, the `oph_*` helper functions, the validation → compilation
pipeline, LOOSE/STRICT/ORIGINAL validation modes, how the day-count `Y` is derived from two
X-Dates, how a `Z`-value (day offset) becomes a `Z`-Date, and every error path along the way.

**Source files read in full for this spec (first-party):**
- `src/ophis_model__validation.js` (1196 lines — the validator/compiler + file-import gauntlet)
- `src/ophis_model__params.js` (142 lines — default operation table, MSRF filters, scoring points)
- `ophis-xtras.txt` (31 lines — extra hand-written operation strings, not code)
- `src/ophis_config.js` (464 lines — all constants incl. `OPH_PI/PHI/CRV/HEP`, validation-mode enums)
- `src/ophis_utils.js` (1086 lines — `oph_*` functions, rounding, `axialRotationsBetweenNativeDates`, `xDateToNativeDate`)
- `src/ophis_model__operations.js` (601 lines — `runOphisOnEvent`, `runOperations`, Y→Z construction)
- `src/ophis_dependencies.js`, `src/ophis_unit_tests.js`, `src/ophis_main.js` (app-state default),
  and the cross-boundary call sites in `ophis_model__sorting.js`, `ophis_view__output.js`,
  `ophis_view__settings.js`, `ophis_view__strings.js`, `ophis_view__export.js`, `ophis_controller.js`.

Everything below is quoted or derived directly from those files with `file:line` citations.
Where behaviour is buggy, dead, or self-contradictory it is called out explicitly.

---

## 0. Executive summary of data flow

```
.oph file (JSON)  ─┐
GUI edits         ─┤→ isoEvent.operations[] = [{equation, weight, enabled}, ...]
                    │
                    ▼  getEffectiveOperations()            [operations.js:25]
                validateOperationString(equation,...)      [validation.js:131]
                    │  normalize → strip → math.js check → new Function() compile
                    ▼
        operation.cached_operation_function = fn(Y) → Number     [operations.js:41]
                    │
   for each ordered X-Date pair (X1,X2):                   [operations.js:172 generateYAndZStructs]
        Y = axialRotationsBetweenNativeDates(X1,X2)        [utils.js:904]
        for each enabled operation:
            zValue = fn(Y)                                 [operations.js:287 runOperations]
            zDateMillis = startingX.getTime() + zValue*MILLIS_PER_DAY   [operations.js:320]
                    ▼
        Z-structs keyed by z_date_native_start millis, scored against MSRF sets
```

The engine is **string-driven**: an operation is a short arithmetic string like
`"X2+YxOPH_PHI"`. It is validated one way and compiled another (see §5 GOTCHAS) and the
compiled body is executed with JavaScript's `new Function`.

---

## 1. THE EQUATION GRAMMAR

An operation is stored as `operation.equation`, a plain string. There is **no formal grammar
or tokenizer** — legality is defined operationally by (a) a required prefix check, (b) a
string-rewrite normalisation, (c) a math.js parse/evaluate of a *stripped* variant, and
(d) a `new Function` compile+smoke-test of a *different* variant. The effective alphabet:

### 1.1 Required prefix (hard requirement)
Every equation, after normalisation, MUST begin with exactly `"X1+"` or `"X2+"`.
- Enforced by `getStartingX()` (`ophis_model__operations.js:228-241`):
  ```js
  if ( operationEquationString.startsWith("X1+") ) return STARTING_X1;
  else if ( operationEquationString.startsWith("X2+") ) return STARTING_X2;
  else return null;
  ```
- `validateOperationString` rejects anything else with the error
  `"Must start with 'X1 + &hellip;' or 'X2 + &hellip;'"` (`validation.js:171`).
- `STARTING_X1 = "STARTING_X1"`, `STARTING_X2 = "STARTING_X2"` (`ophis_config.js:430-431`).
- Note the operator between the X and the rest is **always `+`** — the prefix literally is
  `X1+` / `X2+`. You cannot start with `X1-…` or `X2*…`; the first 3 chars are sliced off
  wholesale downstream (`stripXDateFromOperationEquationString`, `validation.js:97-102`:
  `normalizedOperationEquationString.slice(3)`), so a `+` is assumed but never re-inserted.

### 1.2 Variables
- `X1`, `X2` — the two anchor dates of the pair. In the compiled function they are **not**
  variables at all: the `X1+`/`X2+` prefix is *stripped* before compilation and the chosen
  X-Date is added back as a millisecond base later (§7). The compiled function's only free
  variable is `Y`.
- `Y` — whole-day count between the two X-Dates (see §6). It is the single formal parameter
  of every compiled function: `new Function("Y", "return " + body + ";")` (`validation.js:158`).

### 1.3 Multiplication operator: the literal `x`
- The character `x` (lowercase ex) is the human-facing multiplication operator, e.g.
  `"X2+YxOPH_PHI"` means `Y * OPH_PHI`.
- During normalisation with replacements enabled, **all** `x` are replaced by `*`:
  `operationEquationString.replaceAll("x", "*")` (`validation.js:44`).
- CRITICAL ORDERING TRICK: before that replace, every `oph_*` function name is temporarily
  uppercased so its internal letters (e.g. the `x` in `oph_exp`) are not clobbered by the
  `x → *` replace. They are lowercased again afterward (`validation.js:38-57`). See §3.5 and
  §5.2. Constant names (`OPH_PI` etc.) contain no lowercase `x`, so they are safe.

### 1.4 Arithmetic operators and grouping
- `+`, `-`, `/`, `*` (the last only appears after `x → *`), and parentheses `(` `)`.
- Division by literal or expression is allowed, e.g. `"X2+Y/OPH_CRV"`, `"X1+(Y/2.0)xOPH_PI"`.
- These are never explicitly whitelisted; they are simply what math.js and `new Function`
  both accept. There is **no character allowlist / denylist in the v12 Electron renderer
  engine** (unlike the single-file browser rewrites, which add a regex guard — see §11).

### 1.5 Decimal literals
- Plain numeric literals including decimals: `2.0`, `2.718`, `1.38`, `5.52`, `0.360`, etc.
  (see `ophis-xtras.txt` for hand examples). No thousands separators; standard JS number
  syntax as accepted by both math.js and `new Function`.

### 1.6 Named constants (substituted, not scoped)
- `OPH_PI`, `OPH_PHI`, `OPH_CRV`, `OPH_HEP` (values in §2). During normalisation they are
  **textually replaced with their numeric values** via
  `operationEquationString.replaceAll(ithOphConstant, window[ithOphConstant])`
  (`validation.js:46-50`). So by the time either math.js or `new Function` sees the string,
  the constants are gone — replaced by literals like `1.618`. They are *not* injected as a
  scope/environment. `ALL_OPH_CONSTANTS = ["OPH_PI","OPH_PHI","OPH_CRV","OPH_HEP"]`
  (`ophis_config.js:415-420`).

### 1.7 Function calls: the `oph_*` family
- Eleven functions, each **single-argument**, listed in `ALL_OPH_FUNCTIONS`
  (`ophis_utils.js:1075-1087`): `oph_sqrt, oph_abs, oph_floor, oph_ceil, oph_log, oph_sin,
  oph_cos, oph_tan, oph_round, oph_flip, oph_exp` (see §3).
- Call syntax is normal JS: `oph_round(Y)`, `oph_flip(oph_round(Y))` (nested is allowed).
- In the default table only `oph_round` and `oph_flip` are used
  (`ophis_model__params.js:67,70`).
- These names survive normalisation (lower-cased back) and are present in the string handed
  to `new Function`. Because `new Function`'s body executes in global scope, the `oph_*`
  functions resolve as global function declarations (they are declared with `function`
  keyword at file top-level in `ophis_utils.js`, i.e. on `window`). This is the crux of the
  validator≠executor divergence (§5).

### 1.8 What is explicitly forbidden
- `=` anywhere: `if ( normalizedAndStrippedOperationEquationString.includes("=") )` pushes
  `"Cannot include '=' in the equation."` (`validation.js:68-69`). This is the *only*
  content-blacklist rule and it runs on the **stripped** string.
- Empty string: `"Cannot be empty."` (`validation.js:187`).
- Duplicate of an earlier operation: `"Indentical to Operation N and each Operation must be
  unique."` (`validation.js:181-183`, note the misspelling "Indentical" is in the code).

---

## 2. NAMED CONSTANTS — exact coded values

Defined in `ophis_config.js`. The values depend on `FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION`
which is **`true`** in v12 (`ophis_config.js:287`), and on `DECIMAL_PRECISION__TIME` which is
**`2`** (`ophis_config.js:369`).

Raw inputs (`ophis_config.js:374-376`):
```js
var PI_RAW  = Math.PI;              // 3.141592653589793
var PHI_RAW = 1.61803398875;
var CURVATURE_RAW = PI_RAW * PHI_RAW;
```

"Expected" (hand-chosen) precision values (`ophis_config.js:378-385`):
```js
var PI_TO_2_DECIMAL_PLACES_AS_EXPECTED = 3.14;
var PI_TO_3_DECIMAL_PLACES_AS_EXPECTED = 3.141;
var PHI_TO_2_DECIMAL_PLACES_AS_EXPECTED = 1.61;
var PHI_TO_3_DECIMAL_PLACES_AS_EXPECTED = 1.618;
var CURVATURE_TO_2_DECIMAL_PLACES_AS_EXPECTED = 5.08;
var CURVATURE_TO_3_DECIMAL_PLACES_AS_EXPECTED = 5.083;
```

Selection logic when `DECIMAL_PRECISION__TIME == 2` (`ophis_config.js:391-399`):
```js
PI_AS_EXPECTED  = 3.14;    // PI_TO_2_DECIMAL_PLACES_AS_EXPECTED
PHI_AS_EXPECTED = 1.618;   // NOTE: PURPOSELY 3-dp even though time precision is 2 (comment :394-397)
CURVATURE_AS_EXPECTED = 5.08;   // CURVATURE_TO_2_DECIMAL_PLACES_AS_EXPECTED
```

Final constant bindings (`ophis_config.js:410-413`), with `FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION == true`:

| Constant  | Coded value (v12) | Meaning | Definition |
|-----------|-------------------|---------|-----------|
| `OPH_PI`  | **`3.14`**        | π, hand-rounded to 2 dp | `ophis_config.js:410` |
| `OPH_PHI` | **`1.618`**       | golden ratio φ, hand-rounded to 3 dp | `ophis_config.js:411` |
| `OPH_CRV` | **`5.08`**        | "curvature" = π·φ, hand-rounded to 2 dp | `ophis_config.js:412` |
| `OPH_HEP` | **`7.01`**        | "hepta-cycle" constant (literal, no flag) | `ophis_config.js:413` |

IMPORTANT NUANCES:
- `OPH_CRV` when the flag is `true` is the **hand value `5.08`**, NOT `OPH_PI * OPH_PHI`.
  The `OPH_PI * OPH_PHI` fallback (`= 3.14 * 1.618 = 5.08052`, then time-rounded to `5.08`)
  is only used when the flag is `false`. So in v12 they coincide at `5.08` anyway, but the
  code path is the "expected" literal (`ophis_config.js:412`).
- `OPH_HEP = 7.01` is a bare literal with **no** feature-flag branch (`ophis_config.js:413`).
- These are read at substitution time via `window["OPH_PI"]` etc. (`validation.js:49`), so
  they must exist as globals. In a rebuild, treat them as a constant map:
  `{ OPH_PI: 3.14, OPH_PHI: 1.618, OPH_CRV: 5.08, OPH_HEP: 7.01 }`.
- The display/tooltip path uses a separate, partial substitution helper
  `replaceOperationConstants()` (`ophis_view__strings.js:50-56`) that replaces only
  `OPH_CRV`, `OPH_PI`, `OPH_PHI` (NOT `OPH_HEP`) and uses `.replace` (first occurrence only,
  not `replaceAll`). That is display-only and does not affect computed results, but a
  reimplementer copying it would drop `OPH_HEP` from tooltips.

Related precision constants (`ophis_config.js:369-372`):
```js
DECIMAL_PRECISION__TIME = 2;             // used for Z-value rounding & constants
DECIMAL_PRECISION__LOCATION = 1;
DECIMAL_PRECISION__AXIAL_ROTATIONS = 1;  // used for Y and rotation_count_z rounding
DECIMAL_PRECISION__SCORE = 2;
```

Other engine-relevant constants:
```js
MAXIMUM_ROTATION_COUNT_Y = 36500;   // config:20  (100 years of days)
MAXIMUM_ROTATION_COUNT_Z = 36500;   // config:21
SAMPLE_Y_VALUE_FOR_VALIDATION = 10; // config:422 — Y used during validation smoke-test
MINIMUM_NUMBER_OF_X_DATES = 2;      // config:16
MINIMUM_OPERATIONS_REQUIRED = 1;    // config:96
MILLIS_PER_MINUTE = 60000;          // config:98
MILLIS_PER_HOUR   = 3600000;        // config:99
MILLIS_PER_DAY    = 86400000;       // config:100
MINIMUM_DAYS_BETWEEN_FIRST_TWO_X_DATES = 1;      // config:91
MINIMUM_DAYS_BETWEEN_SUBSEQUENT_X_DATES = 1;     // config:92
MAX_CALENDAR_YEAR = 9999;           // config:94
```

---

## 3. THE `oph_*` HELPER FUNCTIONS — exact implementations

All defined in `ophis_utils.js:1014-1087`. All take exactly one numeric argument and return
a JS number. They are plain global function declarations (available to `new Function` bodies).

### 3.1 Trivial wrappers (`ophis_utils.js:1014-1048`)
```js
function oph_sqrt(value)  { return Math.sqrt(value); }
function oph_abs(value)   { return Math.abs(value); }
function oph_floor(value) { return Math.floor(value); }
function oph_ceil(value)  { return Math.ceil(value); }
function oph_log(value)   { return Math.log(value); }   // natural log
function oph_sin(value)   { return Math.sin(value); }   // radians
function oph_cos(value)   { return Math.cos(value); }
function oph_tan(value)   { return Math.tan(value); }
function oph_exp(value)   { return Math.exp(value); }
```

### 3.2 `oph_round` (`ophis_utils.js:1050-1053`)
```js
// A wrapper around Math.round() in case this needs to be updated quickly at some point.
function oph_round(value) { return Math.round(value); }
```
- `Math.round` rounds half **up** toward +∞ (so `Math.round(-0.5) === -0` and
  `Math.round(2.5) === 3`, `Math.round(-2.5) === -2`). Reimplement with that exact JS
  semantic, not "round half away from zero".

### 3.3 `oph_flip` — digit reversal (`ophis_utils.js:1055-1073`)
This is the subtle one. Exact code:
```js
function oph_flip(value) {
    var valueAsString = value + "";
    var indexOfDecimalPlace = valueAsString.indexOf(".");
    valueAsString = valueAsString.replace(".", "");

    var valueAsStringSplit = valueAsString.split("");
    var valueAsStringSplitReversed = valueAsStringSplit.reverse();

    if ( indexOfDecimalPlace > 0 ) {
        valueAsStringSplitReversed.splice(indexOfDecimalPlace, 0, ".");
    }

    var joinArray = valueAsStringSplitReversed.join("");

    var numberObject = new Number(joinArray);
    var numberPrimitive = numberObject.valueOf();

    return numberPrimitive;
}
```
Behaviour, step by step:
1. Stringify the number (`value + ""`).
2. Record the index of `"."` in that string (`indexOfDecimalPlace`), then remove the `.`.
3. Split into characters and reverse the whole array (this reverses **all** characters,
   including a leading `-` sign — see edge cases).
4. If there was a decimal point **and its original index was > 0**, splice a `.` back in at
   the **same index it originally occupied** (index into the reversed, dot-less char array).
5. Join and coerce via `new Number(...).valueOf()`.

EDGE CASES / GOTCHAS for `oph_flip`:
- **Trailing zeros become leading zeros, then vanish numerically.** `oph_flip(120)`:
  string `"120"` → reverse `"021"` → `Number("021") = 21`. So `120 → 21`. Trailing zeros
  are dropped because numeric coercion strips leading zeros. `oph_flip(100) = 1`.
- **Integers**: `indexOfDecimalPlace == -1` (not `> 0`), so no dot is re-inserted; pure
  digit reversal. `oph_flip(1234) = 4321`.
- **Decimals**: the dot is re-inserted at the *original* index, which is generally WRONG
  positionally after reversal and produces surprising values. Example `oph_flip(12.5)`:
  string `"12.5"`, `indexOfDecimalPlace = 2`, dot-less `"125"`, reversed `["5","2","1"]`,
  splice `.` at index 2 → `["5","2",".","1"]` → `"52.1"` → `52.1`. Example `oph_flip(3.14)`:
  `"3.14"`, index 1, dot-less `"314"`, reversed `["4","1","3"]`, splice `.` at index 1 →
  `["4",".","1","3"]` → `"4.13"` → `4.13`. So it does NOT simply "reverse the digits and keep
  the decimal magnitude"; it reverses digits and puts the point back at the same *string
  offset*. Reproduce this literally.
- **Negatives**: `oph_flip(-12)`: string `"-12"`, no dot, reverse chars → `["2","1","-"]` →
  `"21-"` → `Number("21-")` is `NaN`. So negatives generally yield `NaN` because the `-`
  ends up in the middle/end. (In practice `oph_flip` is only ever applied to
  `oph_round(Y)` with `Y ≥ 0`, so this is latent, but a reimplementation must match: reverse
  the raw stringified form character-by-character.)
- **The `> 0` guard** on `indexOfDecimalPlace` means a value whose string starts with `"."`
  (impossible from normal JS number stringification, which always emits a leading `0`, e.g.
  `0.5 → "0.5"`) would not get its dot restored. Not reachable in practice; note it anyway.
- In the default table it is used as `oph_flip(oph_round(Y))` (`params.js:70`): round Y to an
  integer, then reverse its digits — the "Holo-" / reversed-Y operation.

### 3.4 The function registry (`ophis_utils.js:1075-1087`)
```js
var ALL_OPH_FUNCTIONS = [ oph_sqrt, oph_abs, oph_floor, oph_ceil, oph_log,
                          oph_sin, oph_cos, oph_tan, oph_round, oph_flip, oph_exp ];
```
Order matters for the normalisation loop (it iterates this array to uppercase/lowercase each
name). Each element is the actual function object; `.name` gives the string (e.g. `"oph_round"`).

### 3.5 Why the names are uppercased mid-normalisation
`oph_exp` contains the letter `x`. If the `x → *` replace ran first, `oph_exp` would become
`oph_e*p`, corrupting it. The normaliser therefore uppercases all function names first
(`OPH_EXP`), does the `x → *` and constant substitutions, then lowercases the names back
(`validation.js:36-57`). See §5.2.

---

## 4. THE VALIDATION PIPELINE, END TO END

Entry point: `validateOperationString(operationEquationString, indexInOperationArray,
otherOperations, errors_out)` (`ophis_model__validation.js:131-191`). It returns a **compiled
JS function** `fn(Y) → Number` (the default identity `Y => Y` on any failure) and pushes
human-readable strings into `errors_out`.

### 4.1 Full ordered steps
```js
function validateOperationString(operationEquationString, indexInOperationArray, otherOperations, errors_out) {
    errors_out = Array.isArray(errors_out) ? errors_out : [];
    var toReturn = DEFAULT_OPERATION_FUNCTION;            // new Function("Y","return Y;")  (validation.js:1)

    if ( operationEquationString ) {
        var doReplacements = true;
        var normalizedOperationEquationString =
            normalizeOperationEquationString(operationEquationString, doReplacements);   // §4.2

        var needsNormalizing = false;
        var startingX = getStartingX(normalizedOperationEquationString, needsNormalizing); // prefix check

        if ( startingX == STARTING_X1 || startingX == STARTING_X2 ) {

            // (A) VALIDATION STRING — stripped/defanged, checked by math.js
            var operationEquationStringForValidation =
                stripOperationEquationString(normalizedOperationEquationString);          // §4.3
            validateSimpleArithmeticString(operationEquationStringForValidation, errors_out); // §4.4

            if ( errors_out.length > 0 ) return toReturn;   // bail; identity fn returned

            // (B) COMPILE STRING — DIFFERENT from (A): keeps oph_* names & real body
            var operationEquationStringForFinalFunction =
                stripXDateFromOperationEquationString(normalizedOperationEquationString);  // only slices "X1+"/"X2+"

            try {
                var operationFunction = new Function("Y", "return " + operationEquationStringForFinalFunction + ";"); // validation.js:158
                var zValue = operationFunction(SAMPLE_Y_VALUE_FOR_VALIDATION);  // smoke-test with Y=10
                if ( isValidOperationEquationResult(zValue) ) {
                    toReturn = operationFunction;           // SUCCESS: return the compiled fn
                } else {
                    errors_out.push(Z_VALUE_MUST_BE_GREATER_THAN_ZERO_MESSAGE);
                }
            } catch (e) {
                errors_out.push("" + e);
            }
        } else {
            errors_out.push("Must start with 'X1 + &hellip;' or 'X2 + &hellip;'");
        }

        // (C) UNIQUENESS check against earlier operations, only if no errors so far
        if ( errors_out.length == 0 ) {
            for ( var i = indexInOperationArray-1; i >= 0; i-- ) {
                var ithOtherOperation = otherOperations[i];
                var ithNormalizedOperationEquation =
                    normalizeOperationEquationString(ithOtherOperation.equation, true);
                if ( ithNormalizedOperationEquation == normalizedOperationEquationString ) {
                    errors_out.push("Indentical to Operation " + (i+1) + " and each Operation must be unique.");
                }
            }
        }
    } else {
        errors_out.push("Cannot be empty.");
    }

    return toReturn;
}
```

### 4.2 `normalizeOperationEquationString(str, doReplacements=true)` (`validation.js:30-63`)
1. If falsy input, return `""`.
2. `str = str + ""` (coerce to string).
3. `str = str.replaceAll(" ", "")` — **all spaces removed**.
4. Uppercase every `oph_*` function name in the string (temporary), via a loop over
   `ALL_OPH_FUNCTIONS`, `replaceAll(name, name.toUpperCase())`.
5. If `doReplacements === true`:
   - `str = str.replaceAll("x", "*")` (multiplication).
   - For each constant name in `ALL_OPH_CONSTANTS`: `str = str.replaceAll(name, window[name])`
     — i.e. `OPH_PI → 3.14`, `OPH_PHI → 1.618`, `OPH_CRV → 5.08`, `OPH_HEP → 7.01`.
6. Lowercase every `oph_*` function name back (`replaceAll(name.toUpperCase(), name.toLowerCase())`).
7. Return the result.

When `doReplacements === false` (used by display code, `ophis_view__output.js:397` etc.),
steps 5's `x→*` and constant substitution are skipped, so the string keeps `x` and the
constant names for human display.

GOTCHA: `replaceAll` is literal-substring based. Because constants are substituted with
`replaceAll` and `OPH_PI` is a substring-safe token (no constant is a prefix of another
except that all start `OPH_`), there is no partial-clobber among constants. But `x→*`
combined with the uppercase/lowercase dance is essential and fragile (see §5.2).

### 4.3 The two "strip" helpers
- `stripXDateFromOperationEquationString(s)` (`validation.js:97-102`): `return s.slice(3);`
  — blindly drops the first 3 characters (`X1+` or `X2+`). This is what feeds the **compile**
  string (B). It does nothing else — `oph_*` names and full body remain.
- `stripOperationEquationString(s)` (`validation.js:104-121`) — feeds the **validation**
  string (A):
  1. `s = stripXDateFromOperationEquationString(s)` (drop `X1+`/`X2+`).
  2. For each `oph_*` function name: `s = s.replaceAll(name, "")` — **deletes the function
     name entirely**, leaving its parenthesised argument. Comment (`:110-113`): `10 +
     oph_round(Y*2)` becomes `10 + (Y*2)`, "still a valid arithmetic string, since all oph_*()
     functions currently only accept one parameter."
  3. `s = s.replaceAll("Y", SAMPLE_Y_VALUE_FOR_VALIDATION)` → replaces `Y` with `10`.
  4. Return.

  So for `"X2+oph_flip(oph_round(Y))"` the validation string becomes `"((10))"` (both
  `oph_flip` and `oph_round` names deleted, `Y→10`), which math.js happily evaluates to `10`.

### 4.4 `validateSimpleArithmeticString(str, errors_out)` (`validation.js:67-95`)
```js
if ( str.includes("=") ) errors_out.push("Cannot include '=' in the equation.");
try {
    math.parse(str);                          // syntactic check (math.js)
    try {
        var scope = {};
        var result = math.evaluate(str, scope);   // semantic check (math.js)
        if ( isValidOperationEquationResult(result) ) return true;
        else { errors_out.push("Z-value must resolve to a number > 0."); return false; }
    } catch (error) { errors_out.push(error.message); return false; }  // e.g. divide-by-zero
} catch (error) { errors_out.push(error.message); return false; }      // syntax error
```
- `math` is **math.js v14.6.0** (`lib/math.js` header: `// mathjs@14.6.0`). Only `math.parse`
  and `math.evaluate` are used, and `evaluate` is given an empty scope `{}`.
- Note the `=` check runs on the already-**stripped** string, so it can never catch an `=`
  that appeared only inside a deleted `oph_*(...)` argument — but `=` isn't valid there
  anyway. More importantly, the compile string (B) is never checked for `=`.

### 4.5 `isValidOperationEquationResult(result)` (`validation.js:123-129`)
```js
return (typeof result === 'number' && Number.isNaN(result) == false && result > 0);
```
- Result must be a **primitive number**, not NaN, and **strictly > 0**.
- Used both for the math.js result (A) and the `new Function` smoke-test result (B).
- Consequence: an operation that resolves to `0` or a negative for `Y=10` is rejected with
  `Z_VALUE_MUST_BE_GREATER_THAN_ZERO_MESSAGE = "Z-value must resolve to a number > 0."`
  (`validation.js:65`). `Infinity` passes `typeof number` and `> 0`, so `Infinity` is
  **accepted** here (see §8).

### 4.6 `DEFAULT_OPERATION_FUNCTION` (`validation.js:1`)
```js
var DEFAULT_OPERATION_FUNCTION = new Function("Y", "return Y;");
```
Returned on every failure branch. So a failed operation validates to the identity function
(`fn(Y)=Y`). But callers gate on `errors_out.length`, so a failed op is normally *not*
executed (see §4.7).

### 4.7 How the compiled function is cached and used
`getEffectiveOperations(isoEvent)` (`ophis_model__operations.js:25-50`):
```js
var operationsCloned = deepClone(isoEvent.operations);
for each operation:
    if ( enabled === true ) {
        var validationErrors = [];
        var operationFunction = validateOperationString(equation, i, operationsCloned, validationErrors);
        if ( validationErrors.length > 0 ) { toReturn.push(op); }          // NO cached_operation_function set
        else { op.cached_operation_function = operationFunction; toReturn.push(op); }
    } else { toReturn.push(op); }
```
- On validation error, the operation is kept in the list **but without a
  `cached_operation_function`**, so `runOperations` skips it (`operations.js:279-285`).
- On success, `op.cached_operation_function = fn` is attached and later invoked directly:
  `ithZValue_raw = ithOperation.cached_operation_function(axialRotationCountY)`
  (`operations.js:287`). Note this raw invocation does **not** go through
  `runOperationFunction` (which would round to time precision); rounding happens separately
  (§7).

The settings screen also calls `validateOperationString` live per keystroke-blur to show
`Z=<value>` or `Error: <msg>` (`ophis_view__settings.js:590-606`), using
`runOperationFunction(fn, SAMPLE_Y_VALUE_FOR_VALIDATION)` which rounds to time precision.

---

## 5. VALIDATOR ≠ EXECUTOR — the load-bearing divergence

This is the single most important correctness/security fact of the subsystem, and a **known
finding** (Report §6.2, `Ophis_v12_ReverseEngineering_Report.md:177-190`).

### 5.1 What math.js sees vs what runs
For an operation `equation`:
- **String math.js parses/evaluates** (A): `stripOperationEquationString(normalized)` — X-prefix
  removed, **every `oph_*` name deleted**, `Y` replaced by `10`. Example
  `"X2+oph_flip(oph_round(Y))"` → math.js sees `"((10))"`.
- **String actually compiled & run** (B): `stripXDateFromOperationEquationString(normalized)` —
  only the 3-char X-prefix removed; `oph_*` names and the full body remain. Example →
  `new Function("Y","return oph_flip(oph_round(Y));")`.

The two strings are different **by construction**. math.js validates a defanged expression; a
completely different expression is compiled and executed. Any tokens that live only inside an
`oph_*(...)` call (or that `oph_*` name deletion changes the meaning of) are never seen by the
math.js "validator". Because `new Function` bodies run in global scope, an attacker-supplied
`.oph` operation string that survives the prefix + math.js checks can execute arbitrary code
when the compiled function runs (renderer code execution under Electron with
`nodeIntegration:true`). This is documented as Finding #1 (Critical). For a clean rebuild the
fix is to make validator and executor the *same* code path — a real parser/evaluator over the
restricted grammar — never `new Function`.

### 5.2 The uppercase/lowercase `oph_*` dance is required for correctness
Without it, `oph_exp` → `oph_e*p` after `x→*`, breaking legitimate use. The normaliser's
temporary uppercasing (`validation.js:38-41`) and later lowercasing (`:54-57`) exist solely to
protect embedded letters during the `x→*` and constant replaces. A reimplementation that
tokenises properly does not need this hack, but a string-rewrite clone MUST reproduce it or
`oph_exp` will silently corrupt.

### 5.3 `getStartingX` string-vs-object hazard
`getStartingX` expects a **string** and, if `needsNormalizing` (default `true`), calls
`normalizeOperationEquationString` which does `operationEquationString + ""`. At
`ophis_view__output.js:864` it is called as `getStartingX(operationStruct)` — passing the whole
operation **object**, which stringifies to `"[object Object]"`, never starts with `X1+`/`X2+`,
returns `null`, and the caller then treats it as X2 (the `else` branch). This is a latent
display-only bug; the compute path (`operations.js:301`) correctly passes `ithOperation.equation`.

---

## 6. HOW `Y` IS COMPUTED FROM TWO X-DATES

`Y` (called `rotationCountY` / "axial rotations") is produced by
`axialRotationsBetweenNativeDates(eventScope, olderNativeDate, newerNativeDate, lat, long)`
(`ophis_utils.js:904-981`), called from `generateYAndZStructs` (`operations.js:191`).

### 6.1 X-Date → native Date
`xDateToNativeDate(eventScope, xDate, lat, long, errors_out, timezone, lockDayScopeToGmt)`
(`ophis_utils.js:729-802`):
- An `xDate` is `{ date: "MM/DD/YYYY", time: "HH:MM", enabled: bool }` (see `.oph` sample,
  `test-bradley.oph:8-12`; `newXDate` at `ophis_view__strings.js:150-156`).
- Scope selects which fields are used:
  - `EVENT_SCOPE__HH_MM`: uses `xDate.date` and `xDate.time`.
  - `EVENT_SCOPE__DAYS` / `MONTHS` / `YEARS`: uses `xDate.date`, time forced to
    `TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE = "00:00"` (`config:271`).
- Date string parsed by `validateXDateCalendarDate` (`validation.js:1106-1169`): splits on
  `DATE_DELIMITER = "/"`, requires exactly 3 positive-integer components `month/day/year`
  (order is m/d/Y per `X_DATE_CAL_DISPLAY_FORMAT = "m/d/Y"`, `config:275`); year ≤ 4 digits
  (clamped to `MAX_CALENDAR_YEAR = 9999`), month & day must be `> 0`. Returns
  `{year, month, day, year_orig, month_orig, day_orig}`.
- Time string parsed by `validateXDateTime` (`validation.js:1171-1197`): splits on `":"`,
  requires `HH` in `[0,23]` and `MM` in `[0,59]`.
- Components are assembled into a standard string `YYYY-MM-DD HH:mm`
  (`dateAndTimeComponentsToStandardString`, `ophis_view__strings.js:244-246`).
- Then `convertStandardLocalDateStringToNativeUtcDate(standardString, lat, long, tz)`
  (`ophis_dependencies.js:253-269`):
  - If lat/long valid OR a timezone is given: `moment.tz(standardString, timezone).utc().toDate()`
    — i.e. interpret the wall-clock string **in that timezone**, convert to UTC.
  - Else: `moment(standardString, "YYYY-MM-DD HH:mm").toDate()` — parse in the host's local
    timezone. (`X_DATE_MOMENT_PARSING_FORMAT = "YYYY-MM-DD HH:mm"`, `config:283`.)

### 6.2 DAY-SCOPE timezone lock (the important default)
Inside `xDateToNativeDate`, for non-HH:MM scopes (`ophis_utils.js:766-782`):
```js
if ( eventScope == EVENT_SCOPE__DAYS ) {
    if ( lockDayScopeToGmt === true ) {   // FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT default true (config:297)
        lat = 0; long = 0; timezone = null;      // → tz resolves to GMT/UTC via lat0/long0
    } else { lat = null; long = null; timezone = null; }
} else { // MONTHS/YEARS
    lat = null; long = null; timezone = null;
}
```
- `lockDayScopeToGmt` defaults to `FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT` which is **`true`**
  (`config:297`). So in the normal engine path, **DAYS-scope dates are interpreted at
  lat=0/long=0**, i.e. effectively UTC/GMT midnight. This makes day arithmetic DST-free and
  deterministic. (`tzlookup(0,0)` returns an Etc/GMT-ish zone with zero offset.)
- The controller's `xDateToNativeDateForController` deliberately passes `lockDayScopeToGmt =
  false` (`ophis_controller.js:235-239`) for UI-local default-date generation — a different
  code path, not used in scoring.

### 6.3 The day-difference math (`axialRotationsBetweenNativeDates`, utils:904-981)
Two branches:

**Non-HH:MM (DAYS/MONTHS/YEARS)** — the simple, relevant one (`utils:945-948`):
```js
var millisDifferenceManual = newerNativeDate.getTime() - olderNativeDate.getTime();
dayDifferenceManual = roundNumberToAxialRotationPrecision(millisDifferenceManual / MILLIS_PER_DAY);
```
- `Y = round1( (newerMillis - olderMillis) / 86400000 )`, rounded to **1 decimal place**
  (`DECIMAL_PRECISION__AXIAL_ROTATIONS = 1`, via `roundNumberToPrecision`, utils:995-1004).
- This is **exclusive/whole-elapsed-days**, NOT inclusive. Two dates one calendar day apart
  give `Y = 1.0`. Because DAYS-scope is locked to GMT midnight, the division is exact and Y is
  effectively an integer expressed as `N.0`.
- Direction matters: caller always passes the earlier X-Date as `olderNativeDate` (X1 = the
  lower-index date `k`, X2 = higher-index `i`; see `generateYAndZStructs` `operations.js:188-191`).
  If the pair were reversed Y would be negative; but pairs are only formed for `k < i`
  (`operations.js:182`) and validated to be ascending (§9), so Y ≥ 0 in practice.

**HH:MM scope** (`utils:908-944`) — sunset-based, more involved:
- Computes each date's *prior sunset* via `getSunsetNativeUtcDateBefore_withCache` (uses
  CosineKitty/Meeus/SunCalc libraries, `ophis_dependencies.js:16-56`), takes the millis
  difference between the two prior sunsets, and buckets it into whole days with special
  rounding:
  - `== 0` → `0`.
  - `< 0` and `>= -MILLIS_PER_DAY` → returns `-1` early.
  - `< -MILLIS_PER_DAY` → integer-divide, round *down* if remainder `< -MILLIS_PER_DAY/2`.
  - `> 0` and `<= MILLIS_PER_DAY` → `1`.
  - `> MILLIS_PER_DAY` → integer-divide, round *up* if remainder `> MILLIS_PER_DAY/2`.
  - Each non-trivial result passed through `roundNumberToAxialRotationPrecision` (1 dp).
- This is the "axial rotation" (sunset-to-sunset day) count. For a browser rebuild that
  ignores sunsets, the DAYS branch is the model to follow. (Sunset detail belongs to a
  separate subsystem; noted here as a dependency: `SUNSET_LIBRARIES`, `getSunsetSampling`.)

### 6.4 `day_scope_start_time_in_millis`
- Per-event field, default `DEFAULT_DAY_SCOPE_START_TIME_MILLIS = 0` (`config:352`).
- Validated by `ensureValidEventDayScopeStartTime` (`validation.js:767-781`): must be a
  non-negative int (or string thereof); if `>= MILLIS_PER_DAY` it is clamped to
  `MILLIS_PER_DAY - MILLIS_PER_MINUTE` (i.e. 23:59); otherwise kept; else reset to default 0.
- It does **not** affect `Y`. It only shifts the *base date* to which the Z-value is added,
  and only for `EVENT_SCOPE__DAYS` (see §7.2). Read in `generateYAndZStructs`
  (`operations.js:198`) and applied in `runOperations` (`operations.js:314-318`).

---

## 7. HOW `Z` IS COMPUTED (day-offset → Z-Date)

In `runOperations(operations, eventScope, x1NativeDate, x2NativeDate, axialRotationCountY,
lat, long, alreadyCalculatedSunsets, dayScopeStartTimeMillis)` (`operations.js:263-416`).

### 7.1 Per-operation numeric flow
For each enabled operation with a `cached_operation_function`:
1. Clamp Y if huge: if `axialRotationCountY > MAXIMUM_ROTATION_COUNT_Y (36500)`, set it to
   36500 (with `console.warn`) — this happens once at the top of `runOperations`
   (`operations.js:266-270`), before the loop.
2. `ithZValue_raw = cached_operation_function(axialRotationCountY)` (`operations.js:287`) —
   the compiled `fn(Y)`. This is the raw day-offset the equation yields.
3. Clamp Z if huge: if `ithZValue_raw > MAXIMUM_ROTATION_COUNT_Z (36500)`, set to 36500 (warn)
   (`operations.js:289-293`). NOTE: only an **upper** clamp; negative/NaN not handled here.
4. `ithZValueInMillis_raw = ithZValue_raw * MILLIS_PER_DAY` — compute the millisecond offset
   **before** rounding the day value ("feels more correct", comment `:295`).
5. `ithZValue_raw = roundNumberToTimePrecision(ithZValue_raw)` — round the *stored/displayed*
   z_value to **2 decimals** (`DECIMAL_PRECISION__TIME = 2`). The millis offset in step 4 is
   NOT re-derived from the rounded value.

### 7.2 Which X-Date the offset is added to
- `startingX = getStartingX(ithOperation.equation)` (`operations.js:301`): `X1` → base is
  `x1NativeDate` (the earlier date), `X2` → base is `x2NativeDate` (the later date). The
  "other" X-Date is retained for display.
- Base date selection (`operations.js:311-312`): since
  `FEATURE_FLAG__SUNSET__ADD_Z_VALUE_TO_X_DATE_PRIOR_SUNSET` is **`false`** (`config:301`),
  the base is simply `cloneNativeDate(startingXDate_native)` (a copy). (If that flag were
  true, the base would be the X-Date's prior sunset instead.)
- DAYS-scope start-time shift (`operations.js:314-318`): only when `eventScope ==
  EVENT_SCOPE__DAYS` and `dayScopeStartTimeMillis > 0`, add it to the base date's time.
- **The offset is a straight millisecond addition** (`operations.js:320-321`):
  ```js
  var zDateInMillisSinceEpoch = dateToWhichToAddZValue_native.getTime() + ithZValueInMillis_raw;
  var zDate_native = new Date(zDateInMillisSinceEpoch);
  ```
  So `Z-Date = baseX + (rawZ * 86400000) ms`. The **fractional part of the day-offset is
  preserved as sub-day milliseconds** at this point (no floor/round/ceil on the offset before
  addition). This is important: `zValue = 25.13` days adds 25 days plus 0.13*86400000 ms.

### 7.3 Constructing the final Z-Date (start/end)
- For **DAYS** scope (`operations.js:342-356`, the `else` branch): lat/long forced to
  `0,0` (because `FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT` is true), the offset date is converted
  to an `xDate` via `nativeDateToXDate(zDate_native, 0, 0)` and back via
  `xDateToNativeDate(eventScope, tempXDate, 0, 0)`. This round-trip **truncates the time to
  00:00 GMT** (because `nativeDateToXDate` renders only the calendar date for DAYS display,
  and `xDateToNativeDate` re-parses it at midnight). Net effect for DAYS: **the Z-Date is
  normalised to GMT midnight of the day the raw offset lands on** — i.e. the fractional day is
  effectively floored to the calendar day (the sub-day millis from §7.2 are discarded here).
  `zDate_native_start == zDate_native_end` for non-HH:MM.
- For **HH:MM** scope with `FEATURE_FLAG__SUNSET__CALCULATE_BEFORE_N_AFTER` true
  (`operations.js:326-341`): `zDate_native_start` = prior sunset, `zDate_native_end` = next
  sunset around the raw `zDate_native` (with `findAlreadyCalculatedSunset` de-duping sunsets
  within `ALREADY_CALCULATED_SUNSET_TOLERANCE_IN_MILLIS = 1 hour`, `config:117`).

### 7.4 `rotation_count_z` (the number scored against MSRF)
```js
var rotationCountZ = roundNumberToAxialRotationPrecision(ithZValue_raw);   // operations.js:366  → 1 dp
```
- CRITICAL: the number matched against the MSRF sets is **`rotation_count_z` = the raw Z day
  value rounded to 1 decimal place** — NOT a recomputed date difference. An older approach
  (commented out, `operations.js:364`) recomputed it from the dates; v12 rounds the value
  directly. So MSRF matching operates on the operation's numeric output, rounded to 0.1.

### 7.5 Keys / hashes (cross-module identifiers)
Produced per operation result (`operations.js:367-410`):
- `z_date_dict_key = zDate_native_start.getTime()` (millis, as **number**; used as the
  dictionary key, but `tagZDates` stringifies it: `nativeDateToUtcMillis(...) + ""`,
  `operations.js:553`). Z-structs are keyed by this string in `zStructsDict`.
- `hash_without_ordinal = "" + baseX.getTime() + "" + zStartMillis` (`operations.js:369`).
- `hash` (`fullUniqueHash`) `= "" + operationIndex + x1Millis + x2Millis + zStartMillis`
  (`operations.js:370`) — note: string concatenation with no delimiter, so it is technically
  ambiguous, but used only as a uniqueness id.

### 7.6 The per-operation result object (shape)
`operations.js:392-410`:
```js
{
  z_value: Number,                    // rawZ rounded to 2 dp
  rotation_count_y: Number,           // Y (1 dp)
  rotation_count_z: Number,           // rawZ rounded to 1 dp — MSRF match key
  z_date_native: Date,                // base + rawZ*ms (debug only)
  z_date_native_start: Date,          // normalised start (midnight GMT for DAYS)
  z_date_native_end: Date,            // == start for DAYS; next sunset for HH:MM
  z_date_readable_start: String,      // e.g. "MM/DD/YYYY"
  z_date_readable_end: String,
  z_date_readable_start_no_html: String,
  z_date_readable_end_no_html: String,
  x_date_native_start: Date,          // the base X-Date (copy)
  x_date_native_other: Date,          // the other X-Date
  operation_ordinal: Number,          // index into effective_operations
  operation: Object,                  // {equation, weight, enabled, cached_operation_function}
  hash: String,
  hash_without_ordinal: String,
  z_date_dict_key: Number             // start millis
}
```

### 7.7 `runOperationFunction` (validation/display only)
`operations.js:220-226`:
```js
function runOperationFunction(operationFunction, Y) {
    var zValue = operationFunction(Y);
    return roundNumberToTimePrecision(zValue);   // 2 dp
}
```
Used by the settings screen to display `Z=<value>` for `Y=10`. The main compute path does NOT
use this wrapper (it calls `cached_operation_function` directly, then rounds — §7.1).

---

## 8. ERROR HANDLING — every path

### 8.1 Per-operation validation errors (strings pushed to `errors_out`)
- `"Cannot be empty."` — falsy equation (`validation.js:187`).
- `"Must start with 'X1 + &hellip;' or 'X2 + &hellip;'"` — prefix not `X1+`/`X2+`
  (`validation.js:171`).
- `"Cannot include '=' in the equation."` — `=` present in stripped string (`validation.js:69`).
- math.js `error.message` — syntax error from `math.parse` (`validation.js:91-93`), or
  semantic/divide-by-zero from `math.evaluate` (`:85-89`). math.js `1/0` evaluates to
  `Infinity` (no throw), so divide-by-literal-zero does **not** throw here; it fails only if
  `isValidOperationEquationResult` later rejects — but `Infinity > 0` is `true`, so it can
  slip through the math.js gate (see below).
- `"Z-value must resolve to a number > 0."` (`Z_VALUE_MUST_BE_GREATER_THAN_ZERO_MESSAGE`,
  `validation.js:65`) — pushed when the math.js result (A) or the `new Function` result (B)
  fails `isValidOperationEquationResult`.
- `"" + e` — any exception thrown while constructing or invoking the `new Function`
  (`validation.js:167-168`).
- `"Indentical to Operation N and each Operation must be unique."` — duplicate
  (`validation.js:182`, sic "Indentical").

### 8.2 Behaviour on malformed equation
- If any error is recorded, `validateOperationString` returns `DEFAULT_OPERATION_FUNCTION`
  (identity), and `getEffectiveOperations` does **not** attach `cached_operation_function`
  (`operations.js:38-42`). So `runOperations` skips it (`operations.js:279-285`, `continue`).
  Net: a malformed operation produces no Z-Dates and no crash; the row shows `Error: <msg>`
  in the UI (`ophis_view__settings.js:594-606`).

### 8.3 Division by zero / NaN / Infinity
- math.js `math.evaluate("10/0")` → `Infinity` (no exception). `isValidOperationEquationResult(Infinity)`
  → `true` (`typeof number`, not NaN, `> 0`). So the math.js gate (A) **passes** an
  Infinity-producing expression.
- The `new Function` smoke-test (B) with `Y=10`: if the body yields `Infinity`, it also passes
  (`Infinity > 0`). If it yields `NaN`, `Number.isNaN` catches it → rejected with the
  "> 0" message. If it yields `0` or negative → rejected.
- At runtime in `runOperations`, an Infinity `ithZValue_raw` is `> MAXIMUM_ROTATION_COUNT_Z`
  so it is clamped to `36500` (`operations.js:289-293`). A `NaN` raw z (possible if the body
  produces NaN only for the real Y but not for Y=10) is `NaN > 36500` → `false`, so **not
  clamped**; `NaN * MILLIS_PER_DAY = NaN`; `baseMillis + NaN = NaN`; `new Date(NaN)` is an
  Invalid Date. Downstream this yields an invalid/`NaN`-keyed Z-struct — a latent
  data-quality bug rather than a thrown error. Negative raw z (e.g. from a legitimate op if Y
  were 0) is not lower-clamped and would push the Z-Date *before* the base X-Date.
- `oph_flip` on a negative integer returns `NaN` (§3.3). For the default `oph_flip(oph_round(Y))`
  with Y ≥ 0 this never triggers.

### 8.4 Whole-event error handling (`runOphisOnEvent`, operations.js:83-151)
The engine wraps the whole run in `try/catch` and collects `errors[]`:
- `"At least 2 X-Dates are required."` if effective (enabled) X-Date count `<
  MINIMUM_NUMBER_OF_X_DATES` (`operations.js:104-105`).
- `"Month-based projections may be supported in a future version."` /
  `"Year-based projections may be supported in a future version."` — MONTHS/YEARS scope is
  **not implemented** (`operations.js:107-110`). Only HH:MM and DAYS actually compute.
- `"At least 1 Operation is required."` if no enabled op has a `cached_operation_function`
  (`operations.js:112-113`).
- X-Date spread validation errors (§9) replace the error list if the spread is invalid
  (`operations.js:118-119`).
- Any thrown exception → `errors.push("" + error)` (`operations.js:130-131`).
- On any error, `processed_z_dates` and `processed_z_dates__sorted_by_date` are set to `[]`
  (`operations.js:141-145`); otherwise `sortAndFilterResults` runs.
- `runOphisOnEventForExport` additionally converts error strings to
  `{error_status, error_message}` objects and, if zero Z-Dates with no errors, pushes a
  `NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT` "no results" error (`operations.js:59-81`).

---

## 9. X-DATE SPREAD VALIDATION (`validateXDateSpread`, validation.js:193-275)

Ensures the enabled X-Dates are strictly ascending with minimum gaps, before Y/Z generation.
For each enabled X-Date `i` (skipping disabled ones) vs the previous enabled X-Date:
- `minimumDaysBetweenDates = (i==1) ? MINIMUM_DAYS_BETWEEN_FIRST_TWO_X_DATES (1)
  : MINIMUM_DAYS_BETWEEN_SUBSEQUENT_X_DATES (1)` (`validation.js:229-233`).
- `axialRotationCount = axialRotationsBetweenNativeDates(scope, x1, x2, lat, long)`.
- Errors (`validation.js:246-263`):
  - `< 0` → `"X_i must be greater than X_(i-1)"`.
  - `== 0` → `"X_a and X_b must be different days"` (+ `", or before/after sunset."` for HH:MM,
    else `"."`).
  - `< minimumDaysBetweenDates` → `"X_i must be at least N day(s) after X_(i-1), found: <n>"`.
- If no actual error found, the errors array is cleared (`validation.js:270-272`) and the
  function returns `true`.

---

## 10. LOOSE vs STRICT vs ORIGINAL (file-input validation modes)

### 10.1 The enum (`ophis_config.js:336-344`)
```js
FILE_INPUT_VALIDATION_MODE__STRICT   = "FILE_INPUT_VALIDATION_MODE__STRICT";
FILE_INPUT_VALIDATION_MODE__ORIGINAL = "FILE_INPUT_VALIDATION_MODE__ORIGINAL";
FILE_INPUT_VALIDATION_MODE__LOOSE    = "FILE_INPUT_VALIDATION_MODE__LOOSE";
FILE_INPUT_VALIDATION_MODES = [STRICT, ORIGINAL, LOOSE];
```
"ORIGINAL" = the non-configurable strictness of v10 and earlier; the mode system was added in
v11 for headless mode (`ophis_config.js:333-335`).

### 10.2 The v12 default and where selected
- **`appState.fileInputValidationMode` initial value is `FILE_INPUT_VALIDATION_MODE__LOOSE`**
  (`ophis_main.js:29`). This is the GUI default.
- Overridden at init by `getInputValidationModeFromQueryParams()`
  (`ophis_main.js:64`, defined `ophis_view__export.js:146-172`):
  - Query param `input_validation_mode` (case-insensitive) `"loose"`/`"original"`/`"strict"`
    maps to the corresponding mode; unrecognised → warns and uses STRICT.
  - If the param is absent: **headless → STRICT**, **GUI (non-headless) → LOOSE**
    (`ophis_view__export.js:163-168`).
- Mode predicates (`validation.js:676-686`):
  ```js
  isFileInputValidationOriginalOrStrict() // ORIGINAL || STRICT
  isFileInputValidationStrict()           // STRICT
  isFileInputValidationLoose()            // LOOSE
  ```

### 10.3 What each mode permits (behaviour differences during `.oph` import)
The import gauntlet is `validatePotentialIsoEventImportAssumingValidJsonSyntax`
(`validation.js:885-998`) and `validatePotentialDiskLoadOrImport`
(`validation.js:1000-1039`). Differences:

| Situation | STRICT / ORIGINAL | LOOSE |
|---|---|---|
| Unrecognised scoring system | error (STRICT only); else warn+default (`validation.js:652-663`) | warn, default to `SCORING_SYSTEM__GTE_V8` |
| Unrecognised event scope/type | error (STRICT) | warn, reset to default (`:807-813`, `:788-794`) |
| operations not an array | error (STRICT) | warn, reset to default op set (`:634-639`) |
| < `MINIMUM_OPERATIONS_REQUIRED` operations | error (STRICT) | warn only (`:626-631`) |
| Invalid lat/long | push error, stop this event (`:725-728`) | warn, substitute `DEFAULT_LAT/LONG`, continue (`:730-743`) |
| < 2 x_dates | error (`:938-939`) | auto-populate / `smoothOutXDatesForLoadedEvent` (`:940-945`) |
| Invalid X-Date in list | push error (`:934-936`) | `smoothOutXDatesForLoadedEvent`: drop invalid dates (and, only if `FEATURE_FLAG__AUTO_FILL_X_DATES_DURING_FILE_LOAD`, re-add) (`:932-933`, `:821-866`) |
| Invalid T-Date in list | push error (`:955-956`) | `smoothOutTDatesForLoadedEvent`: drop invalid (`:953-954`, `:868-883`) |
| Empty/missing iso-event array | error (`:963-964`, `:971-972`, `:979-980`) | warn, auto-create one fresh event (`:966`, `:974`, `:982`, `:988-995`) |

CRITICAL: In **all** modes, `parseOperationsForLoadedIsoEvent` does **no content validation**
of operation *strings* (`validation.js:620-645`, comment: "be pretty permissive as far as
what's allowed in the operations array. Errors from running the actual operations should be
enough"). Operation strings are only ever validated later by `validateOperationString` when
the engine runs — i.e. the point where `new Function` compiles them. So LOOSE's extra leniency
is about *structure* (auto-repairing bad lat/long, too-few dates, missing event list), which
makes a hostile file more likely to reach the compile step, but even STRICT never inspects the
operation string body. This is the LOOSE-widens-attack-surface finding (Report §5,
`Ophis_v12_ReverseEngineering_Report.md:145,190`).

`FEATURE_FLAG__AUTO_FILL_X_DATES_DURING_FILE_LOAD` is **`false`** (`config:319`), so LOOSE
mode's date "smoothing" only *removes* invalid X/T-Dates, it does not synthesise replacements.

---

## 11. DEFAULT OPERATION TABLE & related params (`ophis_model__params.js`)

### 11.1 `newOperation` (`ophis_utils.js:1006-1012`) — GOTCHA
```js
function newOperation(equation, weight, enabled = true) {
    return { equation: equation, weight: weight, enabled: true };  // BUG: always true
}
```
The `enabled` parameter is **ignored** — the returned object hardcodes `enabled: true`. So
`newOperation("X1+YxOPH_HEP", ALPHA, OPERATION_ENABLED_FALSE)` (`params.js:109`) actually
produces an **enabled** operation despite the `FALSE` argument. Any caller relying on the
third argument to disable an op is defeated. Reproduce or fix deliberately in a rebuild;
document that the shipped default set has this op enabled.

### 11.2 Scoring points/weights (`params.js:2-12`)
```js
POINTS__ALPHA_OPERATION_MATCH = 1;
POINTS__BETA_OPERATION_MATCH  = 0.5;
POINTS__IMPORTANT_MSRF_MATCH  = 2;
POINTS__NORMAL_MSRF_MATCH     = 1;
POINTS__VORTEX_MSRF_MATCH     = 2;  // == IMPORTANT
MINIMUM_REQUIRED_BETA_MATCHES_IF_NO_OTHER_MATCHES = 2;
SCORE_MULTIPLIER__NORMAL_MSRF_MATCH    = 1.5;
SCORE_MULTIPLIER__IMPORTANT_MSRF_MATCH = 2.0;
SCORE_MULTIPLIER__VORTEX_MSRF_MATCH    = 2.0;
```
- `isAlphaOperation(op)`: `op.weight >= 1` (`params.js:48-50`).
- `isBetaOperation(op)`: `op.weight < 1` (`params.js:52-54`).
- Default weight for a manually-added op (`X1+Y`) is `POINTS__BETA_OPERATION_MATCH` (0.5)
  (`ophis_controller.js:249`). Weight input coerces `≤0`/unparseable to 0.5
  (`ophis_view__settings.js:786-788`).

### 11.3 The default operation strings (v12 / `cloneDefaultOperationsForAppVersionGte10`)
`DEFAULT_OPHIS_OPERATIONS_LTE_V7` (`params.js:65-110`) is the base of 15 ops; the Gte8 clone
promotes two beta ops to alpha and enables all; the Gte10 clone appends the X2 hepta op. The
effective v12 default set (matches `test-bradley.oph:40-121`) is these 16 equations:

| # | equation | meaning |
|---|----------|---------|
| 1 | `X2+oph_round(Y)` | Y + X2 (isometric) |
| 2 | `X2+oph_flip(oph_round(Y))` | reversed-Y + X2 (Holo-) |
| 3 | `X2+Y/OPH_CRV` | Y / 5.08 + X2 |
| 4 | `X1+(Y/2.0)xOPH_PI` | Y/2 × 3.14 + X1 |
| 5 | `X2+Y/OPH_PHI` | Y / 1.618 + X2 |
| 6 | `X2+(Y/2.0)xOPH_PHI` | Y/2 × 1.618 + X2 |
| 7 | `X1+(Y/2.0)xOPH_CRV` | Y/2 × 5.08 + X1 |
| 8 | `X2+(Y/2.0)xOPH_PI` | Y/2 × 3.14 + X2 |
| 9 | `X2+YxOPH_PHI` | Y × 1.618 + X2 |
| 10 | `X1+YxOPH_PI` | Y × 3.14 + X1 (radius projection) |
| 11 | `X2+(Y/2.0)xOPH_CRV` | Y/2 × 5.08 + X2 |
| 12 | `X2+YxOPH_PI` | Y × 3.14 + X2 |
| 13 | `X1+YxOPH_CRV` | Y × 5.08 + X1 |
| 14 | `X2+YxOPH_CRV` | Y × 5.08 + X2 |
| 15 | `X1+YxOPH_HEP` | Y × 7.01 + X1 (hepta-cycle) |
| 16 | `X2+YxOPH_HEP` | Y × 7.01 + X2 (hepta-cycle, added late-2025) |

Named references: `OPERATION_EQUATION_FOR_RADIUS_PROJECTION = "X1+YxOPH_PI"` (`params.js:62`),
`OPERATION_EQUATION_FOR_ORIGINAL_BETA_PHI_6 = "X2+(Y/2.0)xOPH_PHI"` (`params.js:63`).
`OPH_HEP_OPERATION_FOR_X2 = newOperation("X2+YxOPH_HEP", ALPHA, TRUE)` (`params.js:113`).

### 11.4 `ophis-xtras.txt` (hand-written extras, NOT code)
A 31-line plain-text note listing extra operation strings a user might paste (numbers 17–26).
They use raw decimal literals instead of named constants:
```
17. X1+Yx2.718      18. X2+Yx2.718
19. X1+Yx1.38       20. X2+Yx1.38
21. X1+Yx5.52       22. X2+Yx5.52
23. X1+(Y/2.0)x5.52
24. X1+Yx2.178      25. X2+Yx2.178
26. X2+Yx0.360
```
These confirm the grammar: `Xn+Yx<decimal>` and `Xn+(Y/2.0)x<decimal>` are valid, decimals
allowed, `x` = multiply. They are not loaded automatically anywhere; the file is documentation.

---

## 12. MSRF NUMBER SETS (matched against `rotation_count_z`) — for completeness

The engine's numeric output is scored against these sets (matching logic in
`getMsrfMatch`, `ophis_utils.js:148-219`; full scoring is a sibling subsystem, summarised
here because it consumes the engine's `rotation_count_z`).

- `MSRF_FILTER__NORMAL` (`params.js:17-36`): a long list of integers ending in
  `HIGHEST_MSRF_NUMBER = 2559` (`config:119`). (Contains an out-of-order value `1574` at
  `params.js:30` and a `1574`/`1620` ordering quirk — harmless, since the final set is sorted.)
- `MSRF_FILTER__IMPORTANT` (`params.js:38-42`): integers (84, 126, …, 2520).
- `MSRF_FILTER__VORTEX` (`params.js:44-46`):
  `[21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4, 762.3, 871.2]` — the only
  non-integer set.
- `MSRF_FILTER__FINAL` (`params.js:57`): all three concatenated and numerically sorted; used
  only for the startup self-check.

Matching (`getMsrfMatch`, utils:148-219):
1. Round the incoming value to 1 dp (`roundNumberToAxialRotationPrecision`).
2. Vortex first: match if within `VORTEX_FILTER_MATCH_TOLERANCE = 0.1` (`config:367`) of any
   vortex number (`areEqualWithinTolerance`).
3. If the rounded value's string **ends in `.5`**, return `null` (no match) — "numbers right
   in the middle count as no match" (utils:200-205).
4. Else `oph_round` the value to an integer and check exact membership in IMPORTANT then NORMAL.
5. Returns `{msrf_filter, msrf_number, points, css_class, readable_name}` or `null`.

Match struct points: NORMAL→1, IMPORTANT→2, VORTEX→2. Score multipliers (GTE_V8 scoring):
NORMAL×1.5, IMPORTANT×2.0, VORTEX×2.0 (`params.js:10-12`; applied in `scoreZDates`,
`operations.js:418-461`).

---

## 13. GOTCHAS (things a naive reimplementation will get wrong)

1. **Validator ≠ executor (§5).** math.js checks a string with `oph_*` names *deleted* and
   `Y→10`; `new Function` runs a string with `oph_*` names *intact* and full body. Never assume
   the math.js pass proves the compiled body safe or even equivalent. A faithful *and safe*
   rebuild must use one shared parser/evaluator over the restricted grammar and drop
   `new Function`.
2. **`newOperation` ignores its `enabled` arg (§11.1)** — it always returns `enabled:true`.
   The shipped "disabled" X1 hepta op is actually enabled.
3. **`oph_flip` re-inserts the decimal point at the original string offset (§3.3)**, not at a
   position that preserves magnitude. `12.5 → 52.1`, `3.14 → 4.13`. Trailing zeros vanish
   (`120 → 21`). Negatives → `NaN`. Reverse the raw stringified characters, then splice the dot
   back at `indexOfDecimalPlace` in the reversed dotless array.
4. **`OPH_PHI` is 3-dp (`1.618`) while `OPH_PI`/`OPH_CRV` are 2-dp (`3.14`/`5.08`)** — a
   deliberate inconsistency (`ophis_config.js:394-399`). Do not "normalise" them all to the
   same precision.
5. **Constants are textual substitutions, not scoped variables (§1.6, §4.2)** via
   `replaceAll`. Order-of-operations after substitution is whatever the literal produces, e.g.
   `Y/OPH_CRV` → `Y/5.08` (fine), but any future constant that is a substring of another would
   clobber. The `x→*` replace must run only after `oph_*` names are uppercased (§5.2).
6. **`Y` is exclusive whole-days at GMT for DAYS scope (§6.2-6.3)**, rounded to 1 dp. Not
   inclusive; not host-timezone; not DST-adjusted. Locking to lat0/long0 is what makes it
   integer-clean.
7. **The day-offset is added as raw milliseconds *before* the day value is rounded (§7.1-7.2)**,
   but for DAYS scope the final Z-Date is then round-tripped to GMT midnight (§7.3), which
   discards the sub-day fraction. So DAYS Z-Dates always land on a calendar day boundary even
   though the intermediate math keeps fractions.
8. **`rotation_count_z` (the MSRF key) is the raw Z day-value rounded to 1 dp (§7.4)**, NOT a
   recomputed date difference. The old date-diff approach is commented out.
9. **`Infinity` passes validation (§4.5, §8.3)**; math.js `x/0 = Infinity` (no throw), and
   `Infinity > 0` is true. It is later clamped to `MAXIMUM_ROTATION_COUNT_Z = 36500` at
   runtime. `NaN` is rejected at validation but a body that is finite for `Y=10` yet `NaN` for
   real `Y` produces an Invalid Date Z with no error.
10. **Only an *upper* clamp exists** on Y and Z (36500); negatives are not floored. A negative
    Z day-offset would place a Z-Date before the base X-Date.
11. **MONTHS and YEARS scopes are not implemented** — they short-circuit with a "future
    version" error (`operations.js:107-110`). Only HH:MM and DAYS compute.
12. **`.5`-ending Z values never match MSRF (§12 step 3)** — deliberate "middle of the road =
    no match" rule. This runs *after* vortex matching, so a `.5` value could still match a
    vortex number within 0.1 tolerance.
13. **`getStartingX` must receive the equation *string*** (§5.3). One view call site passes the
    whole operation object and silently mis-detects X1 as X2 (display-only bug).
14. **Import never validates operation *string content* in any mode (§10.3)** — structure only.
    The compile step is the first and only place a hostile operation string is "checked", and
    that check is the very thing that executes it.
15. **`DEFAULT_OPERATION_FUNCTION` (identity `Y=>Y`) is returned on failure** but a failed op
    is not executed because `cached_operation_function` is left unset (§4.7). Don't assume the
    identity function ever runs during scoring.

---

## 14. PUBLIC INTERFACE (signatures other subsystems depend on)

```text
validateOperationString(equation:string, index:int, otherOps:Op[], errors_out:string[])
    -> Function(Y:number)->number        // compiled op fn, or identity on failure; pushes errors
normalizeOperationEquationString(s:string, doReplacements=true) -> string
stripOperationEquationString(normalized:string) -> string        // for math.js check
stripXDateFromOperationEquationString(normalized:string) -> string // slice(3); for compile
validateSimpleArithmeticString(strippedStr:string, errors_out:string[]) -> boolean
isValidOperationEquationResult(x:any) -> boolean                  // typeof number && !NaN && >0
getStartingX(equationString:string, needsNormalizing=true) -> "STARTING_X1"|"STARTING_X2"|null

oph_sqrt/oph_abs/oph_floor/oph_ceil/oph_log/oph_sin/oph_cos/oph_tan/oph_exp(value:number)->number
oph_round(value:number)->number          // Math.round
oph_flip(value:number)->number           // digit reversal, see §3.3
ALL_OPH_FUNCTIONS: Function[]            // ordered registry, .name gives token
ALL_OPH_CONSTANTS: ["OPH_PI","OPH_PHI","OPH_CRV","OPH_HEP"]
OPH_PI=3.14  OPH_PHI=1.618  OPH_CRV=5.08  OPH_HEP=7.01

axialRotationsBetweenNativeDates(scope, olderDate:Date, newerDate:Date, lat, long) -> number  // Y
xDateToNativeDate(scope, xDate:{date,time,enabled}, lat?, long?, errors_out?, tz?, lockGmt?) -> Date|null
runOperations(ops, scope, x1Date, x2Date, Y, lat, long, alreadyCalcSunsets, dayStartMillis) -> OperationResult[]
runOphisOnEvent(isoEvent) -> {errors, y_structs, z_structs, processed_z_dates, processed_z_dates__sorted_by_date, ...}
getEffectiveOperations(isoEvent) -> Op[]  // attaches cached_operation_function to valid enabled ops
roundNumberToPrecision(value, precision) -> number   // Math.round((v+EPSILON)*10^p)/10^p
roundNumberToTimePrecision(v)=precision 2; roundNumberToAxialRotationPrecision(v)=precision 1
```

Operation record shape (as stored in `.oph` and `isoEvent.operations[]`):
```jsonc
{ "equation": "X2+YxOPH_PHI", "weight": 1, "enabled": true }
// at runtime, valid+enabled ops also carry: "cached_operation_function": Function
```

X-Date record shape:
```jsonc
{ "date": "MM/DD/YYYY", "time": "HH:MM", "enabled": true }   // time defaults "00:00" for DAYS
```

Dependencies defined outside this subsystem (named, not re-specified here): `math` (math.js
v14.6.0) for `math.parse`/`math.evaluate`; `moment` / `moment-timezone` for date parsing/tz;
`tzlookup` for lat/long→timezone; the sunset libraries (`Astronomy`/CosineKitty, Meeus,
SunCalc) for HH:MM-scope `Y`; `sha512` (sign-in, unrelated); the scoring/sorting subsystem
(`scoreZDates`, `sortZDates`, `filterZDates`) which consumes `rotation_count_z`/`z_structs`.
