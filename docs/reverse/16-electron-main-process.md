# 16 — The Electron Main Process and the Real Bootstrap

**Subject (newly opened, never analysed by any previous pass):**

| File | Size | Path |
|---|---|---|
| `main.js` | 22,008 B / 784 lines | `reference/asar/unpacked/main.js` |
| `preload.js` | 1,306 B / 37 lines | `reference/asar/unpacked/preload.js` |
| `ophis.html` | 39,970 B / 558 lines | `reference/asar/unpacked/ophis.html` |
| `package.json` | 412 B | `reference/asar/unpacked/package.json` |

**Version delta reference:** `reference/asar9/unpacked/{main.js,preload.js,ophis.html,package.json}`
(Ophis v9: `main.js` 13,373 B / 505 lines, `preload.js` 678 B / 22 lines, `ophis.html` 28,140 B).

**Why this matters.** Every earlier spec in `docs/reverse/` was written against
`Ophis_v12_Browser/src/*.js` alone. `main.js`, `preload.js` and the real `ophis.html` are **not
present in that folder** — `docs/reverse/06-controller-main.md:1548-1550` says so explicitly and
reconstructs the bridge surface from call sites. That reconstruction can now be checked against the
actual artefact. It is very nearly right; the corrections are in §11.

The `src/` tree inside `app.asar` is byte-identical in filename set and line counts to
`Ophis_v12_Browser/src/` (`ophis_main.js` is 747 lines in both, with identical tails), so nothing in
specs 01–15 about the renderer needs re-deriving. Only the host does.

`package.json` (all of it):

```json
{
  "name": "Ophis",
  "//": "If setting version for a release candidate, it must appear like '10.0.0-rc1' with proper 3-part semver. Otherwise can be simple 2-part like '10.0'.",
  "version": "12.0.0",
  "description": "A cross-platform desktop app for performing date sequence predicitive analytics based on the work of Jason Breshears of Archaix.",
  "main": "main.js",
  "author": { "name": "Ophis" }
}
```

No `dependencies`, no `devDependencies`, no `build` block. The electron-builder configuration that
produced the NSIS installer is **not** shipped inside the asar, so the exact Electron runtime
version is not recoverable from the bytes I am permitted to read. §4 states the defaults for
Electron ≥ 20 (which covers 39) and flags what would change on an older runtime.

`package.json` is also read a *second* time, by the renderer, over `file://`:
`ophis_main.js:80` does `getFileContents("./package.json?v="+cacheBuster, …)` and derives
`APP_VERSION` from `.version` — so `"12.0.0"` → `APP_VERSION = "12"` (second semver component is
`"0"`, so it is dropped; `ophis_main.js:99-103`). `ophis_view.js:88-89` then writes
`"v" + APP_VERSION` into `#app-version`, overwriting the literal `v7` hardcoded at `ophis.html:251`.

---

## 1. STARTUP — Electron ready to a visible window

### 1.0 Module-scope side effects, in execution order

`main.js` is the `main` entry. Before `app.on('ready')` can fire, the whole file is evaluated:

| Lines | Effect |
|---|---|
| 2-6 | `require` of `electron` (`app`, `BrowserWindow`, `Menu`, `dialog`, `ipcMain`), `path`, `url`, `fs` |
| 8-23 | Globals: `pathFoundFromOpenInEvent=null`, `win=null`, `urlToOpen="ophis.html"`, `STATUS_CODE__SUCCESS=0`, `STATUS_CODE__ERROR=1`, headless config vars, `originalArgV = process.argv` |
| 113-213 | **All eleven `ipcMain.on` registrations** (see §2) |
| 219-265 | Single-instance-lock acquisition and the `second-instance` handler (§1.5) |
| 285-307 | Two more `ipcMain.on` registrations (`saveFileAs`, `openOphFile`) — note these are *after* the lock block |
| 486-487 | `app.commandLine.appendSwitch('high-dpi-support', 1)` and `('force-device-scale-factor', 1)` |
| 489-530 | `app.on('ready', …)` |
| 532-548 | `app.on('open-file', …)` (macOS "Open With") |
| 573 | `app.on('before-quit', onAboutToBeClosed)` |
| 783-784 | `var signedIn = false; refreshMenu(signedIn);` — **the application menu is built at module scope, before `ready`**, with New File / Open… / Save As… disabled |

The two `appendSwitch` calls are passed the **number** `1`, not `"1"`. Electron/Chromium coerces it,
so it works, but it is inconsistent with every documented example.

### 1.1 `app.on('ready')` — `main.js:489-530`

```js
app.on('ready', function() {
  headlessOutputType        = getArgFlagValue("--output-type", "csv");
  headlessOutputPath        = getArgFlagValue("--output-path", "");
  inputValidationMode       = getArgFlagValue("--input-validation-mode", "");
  headlessCurrentEpochMillis= getArgFlagValue("--current-epoch-millis", "");
  headlessMultipleFiles     = hasArgFlagDeclared("--multiple-files");

  console.log("Running headless=" + isRunningHeadless());
  console.log("Running debug=" + isRunningDebug());
  ...
  var inputFilePath = getFilePathFromArgs();

  if ( isRunningHeadless() === false || isRunningHeadless() === true && inputFilePath ) {
    console.log("Will process .oph file in headless mode: " + inputFilePath);
    if ( headlessOutputPath ) {
      console.log("--output-path will be: " + headlessOutputPath);
      if (fs.existsSync(headlessOutputPath)) { console.log(`Directory "${headlessOutputPath}" exists.`); }
      else { console.error(`Directory "${headlessOutputPath}" does NOT exist, bailing out.`);
             exitAppWithStatusCode(STATUS_CODE__ERROR); }
    } else { console.log("--output-path unspecified, defaulting to same directory as " + inputFilePath); }

    var mainWindow = createWindow();
  } else {
    console.error("No .oph file specificed, bailing out.");
    exitAppWithStatusCode(STATUS_CODE__ERROR);
  }
})
```

Two defects, both cosmetic-to-mildly-wrong:

* **`main.js:509-510` — the gate reads as if it were headless-only, and is not.** `||` binds looser
  than `&&`, so the condition is `(!headless) || (headless && inputFilePath)` — i.e. "GUI mode always
  proceeds; headless proceeds only with an input file". Correct behaviour, but the very next line
  unconditionally prints `Will process .oph file in headless mode: null` on every normal GUI launch.
* **`main.js:512-520` — `--output-path` is validated in GUI mode too.** A GUI launch that happens to
  carry `--output-path` pointing at a non-existent directory exits 1 before any window is made, even
  though nothing in GUI mode uses `headlessOutputPath`.
* Typo `"No .oph file specificed"` at `main.js:527`.

`exitAppWithStatusCode` on the bail-out paths removes the `before-quit` listener first
(`main.js:143-145`), so `onAboutToBeClosed` — which dereferences `win` — cannot be reached with
`win === null`. That ordering is load-bearing; `app.exit()` before the `removeListener` would throw.

### 1.2 `createWindow()` — `main.js:350-484`

```js
function createWindow () {
  var isDebugMode = isRunningDebug();
  var showWindow = true;
  if ( isRunningHeadless() ) { if ( isDebugMode === false ) { showWindow = false; } }

  win = new BrowserWindow({
    width: 800,
    height: 600,
    show: showWindow,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, "preload.js"),
    }
  });
```

**The complete window option set** — five keys, nothing else:

| Key | Value | Notes |
|---|---|---|
| `width` | `800` | never changed; `win.maximize()` immediately supersedes it in GUI mode |
| `height` | `600` | ditto |
| `show` | `true` in GUI mode; `false` headless unless `--inspect*` is also present | GUI mode gets a **visible 800×600 flash** before `finishWindowSetUp()` maximises it |
| `webPreferences.nodeIntegration` | `true` | see §4 — this does *not* mean the page gets `require` |
| `webPreferences.preload` | `<asar>/preload.js` | absolute, via `path.join(__dirname, …)` |

Everything else is Electron default: no `contextIsolation`, no `sandbox`, no `webSecurity`, no
`allowRunningInsecureContent`, no `title`, no `icon`, no `frame`, no `backgroundColor`,
no `webviewTag`, no `enableRemoteModule`.

`isRunningDebug()` (`main.js:88-91`) calls `hasArgFlagDeclared("--inspect*", argv, /*normalize=*/false)`
— note **`normalize=false`**, so it scans raw `process.argv` including `argv[0]`, unlike every other
flag reader, which slices. Any `--inspect`, `--inspect-brk`, `--inspect-port=…` triggers it.

### 1.3 `did-fail-load` — `main.js:372-386`

```js
win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedUrl) => {
    console.log("did-fail-load");
    console.log(JSON.stringify(event));
    console.log(JSON.stringify(errorCode));
    console.log(JSON.stringify(errorDescription));
    console.log(JSON.stringify(validatedUrl));
    // Only redirect if it's a navigation to a non-existent file
    // if (validatedUrl.includes('file://')) { ... win.loadURL(... 'index.html' ...) }
});
```

**There is no recovery.** The entire remediation block is commented out (`main.js:378-385`), and it
referenced `index.html`, a file that does not exist anywhere in the asar. So a failed load leaves a
blank maximised window with a menu bar and no way back except Quit.

Worse: `JSON.stringify(event)` on line 374 is applied to an Electron `Event` object whose `sender`
is the `WebContents` that emitted it. Depending on how Electron materialises that object, this is
either `"{}"` (non-enumerable own properties) or a `TypeError: Converting circular structure to JSON`
thrown **inside the failure handler**, i.e. an error while reporting an error. Either way the four
useful values (`errorCode`, `errorDescription`, `validatedUrl`) may never print.

### 1.4 `finishWindowSetUp()` — `main.js:394-475`

Called immediately, or after `setTimeout(…, 1000)` when `--inspect*` is present (`main.js:388-392`,
`477-481`). In debug mode `win.webContents.openDevTools()` runs *before* the delay, so DevTools opens
against `about:blank` and the window sits empty for one second.

1. `if ( isRunningHeadless() == false ) win.maximize();`
2. Build the query object:

```js
var urlQueryParams = {
  headless: isRunningHeadless(),                 // boolean -> "true"/"false"
  headless_output_type: headlessOutputType,      // default "csv"
  headless_output_path: headlessOutputPath,      // default ""
  headless_multiple_files: headlessMultipleFiles,// boolean
  input_validation_mode: inputValidationMode     // default ""
};
if ( headlessCurrentEpochMillis ) {
  urlQueryParams.headless_current_epoch_millis = headlessCurrentEpochMillis;
}
```

3. Load it:

```js
win.loadURL(url.format({
  pathname: path.join(__dirname, urlToOpen),   // urlToOpen === "ophis.html"
  protocol: 'file:',
  slashes: true,
  query: urlQueryParams
}))
```

Notes on the URL:

* On Windows `path.join` yields `C:\…\resources\app.asar\ophis.html` with **backslashes**, which
  `url.format` embeds verbatim. The result is `file://C:\…\ophis.html?headless=false&…`. Chromium
  normalises the separators and the missing host, so it resolves; a strict WHATWG parser would read
  `C:` as the host. It is a latent portability wart, not a live bug — the shipped app works.
* `query` is **always** supplied, even in GUI mode, so `window.location.search` is never empty and
  `getQueryParam()` (`ophis_utils.js:855-870`) always takes its `URLSearchParams` branch.
* The renderer reads these back at `ophis_main.js:58-70` and `ophis_view__export.js:146-183`.
  `getQueryParamBool` (`ophis_utils.js:833-841`) compares against the *string* `"true"`, which is
  exactly what `url.format` produces from a JS boolean. That contract holds.
* There is **no** query parameter for the `.oph` file path. The path travels separately, as an
  argument to `init(…)` (next step).
* No `webRequest`/`will-navigate`/`new-window` handler is installed anywhere in `main.js`. Nothing
  constrains where the renderer may navigate.

4. Register `did-finish-load` (`main.js:420-471`) — **inside** `finishWindowSetUp`, after `loadURL`
   has already been called. This is safe only because `loadURL` is asynchronous.

```js
win.webContents.on('did-finish-load', (e) => {
  logToRenderer('did-finish-load with args: ' + JSON.stringify(process.argv));
  var filePath = null;
  if ( alreadyCalledDidFinishLoadOnce === false ) { filePath = getFilePathFromArgs(); }
  alreadyCalledDidFinishLoadOnce = true;
  if ( filePath ) { logToRenderer("Using filePath from args."); }
  else if ( pathFoundFromOpenInEvent ) {
      filePath = pathFoundFromOpenInEvent; pathFoundFromOpenInEvent = null;
  }
  function onProblemExecutingInit(error) {
    console.error('Error executing init() in renderer JavaScript:', error);
    if ( isRunningDebug() == false ) { exitAppWithStatusCode(STATUS_CODE__ERROR); }
  }
  function onSuccessExeuctingInit(result) {
    result = result === undefined ? "ok" : result;
    console.log('init() executed without parsing errors or exceptions with result: ', result);
  }
  if ( filePath ) {
    var filePathEscaped = escapeString(filePath);
    win.webContents.executeJavaScript('init("'+filePathEscaped+'");')
       .then(onSuccessExeuctingInit).catch(onProblemExecutingInit);
  } else {
    win.webContents.executeJavaScript('init();')
       .then(onSuccessExeuctingInit).catch(onProblemExecutingInit);
  }
})
```

`alreadyCalledDidFinishLoadOnce` is a module-scope latch (`main.js:348`) so that `win.reload()`
(from `resetProgram`) re-runs `init()` **without** the command-line file path — a factory reset must
not silently re-open the file you were resetting away from.

The `init()` handshake is the reason `ophis_main.js:743-747` reads:

```js
if ( isRunningElectron() ) { /* Electron calls init(); */ } else { init(); }
```

`isRunningElectron()` is `window.electronBridge ? true : false` (`ophis_utils.js:646-648`). The
preload always defines it, so under Electron the page never self-boots; the main process boots it
via `executeJavaScript`.

`onSuccessExeuctingInit` is misleadingly named. `init()` returns `undefined` and is *asynchronous*
internally (`init_step1_getAppVersion` fetches `package.json` via callback), so the promise resolves
as soon as the synchronous prologue returns — long before the app is actually up. "init() executed
without parsing errors or exceptions" is true only of the first tick.

5. `win.on('close', onAboutToBeClosed); win.on('beforeunload', onAboutToBeClosed);`

**`'beforeunload'` is not a `BrowserWindow` event.** Electron's `BrowserWindow` emits `close`,
`closed`, `session-end`, etc.; `beforeunload` is a *renderer* DOM event and is surfaced on
`webContents` only indirectly. This listener never fires — dead code, mirrored by the equally dead
`win.removeListener('beforeunload', …)` at `main.js:149`. It exists in v9 too (`v9 main.js:256, 68`).

### 1.5 Single-instance lock — `main.js:219-265`

```js
const gotSingleInstanceLock = isRunningHeadless() ? false : app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  if ( isRunningHeadless() === false ) { app.quit(); }
} else {
  app.on('second-instance', async (_, argv) => { … });
}
```

Headless runs deliberately never request the lock (comment at `main.js:237-239`: requesting it
"turned out to stall the execution by several seconds"), which means **N concurrent headless runs are
allowed** and, because `gotSingleInstanceLock` is then `false`, a headless run **never registers
`second-instance`**. The `isRunningHeadless(argv)` branch inside the handler (`main.js:235-240`) is
therefore unreachable, and the code says so.

The GUI second-instance path restores/focuses the window and, if the new `argv` contains a `.oph`
path, calls `openOphFile(filePath, /*checkForUnsavedChanges=*/true)`.

### 1.6 Startup, end to end

```
process start
  └─ main.js module scope
       ├─ 11 ipcMain.on registrations
       ├─ requestSingleInstanceLock  (skipped when --headless)
       │     └─ not acquired & not headless -> app.quit()
       ├─ commandLine switches (high-dpi-support=1, force-device-scale-factor=1)
       ├─ app.on('ready' | 'open-file' | 'before-quit')
       └─ refreshMenu(signedIn=false)          <-- menu exists before the window does
  └─ 'ready'
       ├─ parse --output-type --output-path --input-validation-mode
       │        --current-epoch-millis --multiple-files
       ├─ headless && no .oph  -> exit(1)
       ├─ --output-path given but missing dir -> exit(1)
       └─ createWindow()
            ├─ new BrowserWindow(800x600, show, nodeIntegration, preload)
            ├─ on did-fail-load -> log only, no recovery
            ├─ --inspect* ? openDevTools() + 1000 ms delay : 0 ms
            └─ finishWindowSetUp()
                 ├─ maximize()                (GUI only)
                 ├─ loadURL(file://…/ophis.html?headless=…&…)
                 │     └─ preload.js runs -> window.electronBridge
                 │     └─ ophis.html parses -> lib/*.js -> inline loader -> src/*.js (deferred)
                 │     └─ ophis_main.js tail: isRunningElectron() -> DOES NOT self-boot
                 ├─ on did-finish-load
                 │     └─ executeJavaScript('init("<path>");' | 'init();')
                 │           ├─ resolve -> log
                 │           └─ reject  -> exit(1) unless --inspect*
                 └─ win.on('close'), win.on('beforeunload')   <- the latter is dead
```

---

## 2. THE COMPLETE IPC SURFACE

Eleven `ipcMain.on` handlers; eleven `contextBridge` methods. **Exact 1:1 correspondence — no orphan
handler, no orphan bridge method, no `ipcMain.handle`, no `invoke`, no `ipcRenderer.on`,
no `webContents.send`.** Main → renderer communication is *entirely* `executeJavaScript`
string injection (§5).

`preload.js` in full is 37 lines; every method is `async` and every one returns
`ipcRenderer.send(...)` (which returns `undefined`), so **every bridge call resolves to a promise of
`undefined` — none of them can return a value.** The `async`/`return` is decoration.

### 2.1 The single table

| # | Channel | `preload.js` method (line) | Args | `ipcMain.on` (line) | What main does | Reply to renderer | Renderer call site |
|---|---|---|---|---|---|---|---|
| 1 | `autoSaveToFile` | `autoSaveToFile(filePath, fileContents)` (4-6) | `string, string` | 113-120 | `saveToFile(filePath, fileContents, noop)` → `fs.mkdirSync(path.dirname(fp),{recursive:true})` if missing, then `fs.writeFile` | **none on success**; on error `logToRenderer(err)` + `executeJavaScript('onSaveToFileError("Got error saving json string, see above.");')` | `ophis_model__persistence.js:267`, `ophis_view__export.js:95,129` |
| 2 | `saveFileAs` | `saveFileAs(fileContents)` (7-9) | `string` | 285-302 | `dialog.showSaveDialog({filters:[{name:'OPH Files',extensions:['oph']}]})`; if a path came back, `saveToFile(...)` | on success `executeJavaScript('onSaveAsSuccess("'+escapeString(filePath)+'");')`; **cancel is silent** | `ophis_model__persistence.js:58` |
| 3 | `openOphFile` | `openOphFile(filePath)` (10-12) | `string` | 304-307 | `await openOphFile(filePath, /*checkForUnsavedChanges=*/false)` | `onOphFileOpened(path, data, false)` or `onOphFileOpenError(path, msg)` | `ophis_main.js:432`, `ophis_model__persistence.js:169` |
| 4 | `openFileExplorer` | `openFileExplorer()` (13-15) | – | 138-140 | `dialog.showOpenDialog({filters:[…oph], properties:['openFile']})`, take `filePaths[0]`, then `openOphFile(fp,false)` | as row 3 | `ophis_model__persistence.js:22` |
| 5 | `confirmCloseApp` | `confirmCloseApp()` (16-18) | – | 157-161 | `console.log("Confirmed quit."); exitAppWithStatusCode(0)` | process exits | `ophis_model__persistence.js:5` |
| 6 | `onSignedIn` | `onSignedIn()` (19-21) | – | 205-208 | `refreshMenu(true)` | menu rebuild only | `ophis_main.js:208` |
| 7 | `logToCli` | `logToCli(message)` (22-24) | `string` | 201-203 | `console.log(message)` — straight to the parent process's stdout | none | `ophis_logging.js:70` |
| 8 | `closeAppWithHeadlessError` | `closeAppWithHeadlessError()` (25-27) | – | 163-165 | `exitAppWithStatusCode(1)` | process exits 1 | `ophis_main.js:299` |
| 9 | `closeAppWithHeadlessSuccess` | `closeAppWithHeadlessSuccess()` (28-30) | – | 167-169 | `exitAppWithStatusCode(0)` | process exits 0 | `ophis_view__export.js:97,140` |
| 10 | `resetProgram` | `resetProgram()` (31-33) | – | 171-199 | `win.reload()` inside a bare `try{}catch{}` | page reload → `did-finish-load` → `init()` with **no** file path | `ophis_controller.js:20` |
| 11 | `refreshMenuOptions` | `refreshMenuOptions(opsColVisible, prettify, minify)` (34-36) | `bool, bool, bool` | 210-213 | `refreshMenu(/*signedIn=*/true, opsColVisible, prettify, minify)` | menu rebuild | `ophis_controller.js:34` |

### 2.2 Observations on the surface

* **No argument is validated anywhere.** Not the path in `autoSaveToFile`, not the path in
  `openOphFile`, not the booleans in `refreshMenuOptions`, not the string in `logToCli`. There is not
  a single `typeof` check, path-normalisation, allow-list, or `event.senderFrame` origin test in the
  file.
* **`refreshMenuOptions` hardcodes `var signedIn = true;`** (`main.js:211`). Any renderer call
  re-enables New File / Open… / Save As… regardless of sign-in state. Dead in practice
  (`FEATURE_FLAG__REQUIRE_SIGN_IN === false`), but it is a real bypass of the only thing the
  `signedIn` parameter does.
* **`saveToFile` calls `win.webContents` from an `fs` callback** (`main.js:278`) with no null guard.
  If the window has been destroyed between the write request and the failure callback, this throws
  in a callback with no handler.
* `resetProgram`'s `try{}catch(e){ /* Don't expect any error, just being paranoid. */ }` swallows
  everything, including a legitimate reload failure.
* `openFileExplorer` (`main.js:122-136`) destructures `{filePaths}` and takes `[0]` with no cancel
  check. On cancel, `filePaths` is `[]`, so `filePath` is `undefined`,
  `logToRenderer("Chose file to open: undefined")` is emitted, and `openOphFile(undefined)` is a
  no-op because of the `if (filePath)` guard at `main.js:325`. Harmless, but it logs a lie.

### 2.3 Main → renderer: the twelve injected globals

Everything main sends back is a JS statement string. The renderer must define, at global scope:

| Injected call | Built at | Defined in renderer at |
|---|---|---|
| `init(filePath?)` | `main.js:459,465` | `ophis_main.js:49-51` |
| `onOphFileOpened(path, data, checkForUnsavedChanges)` | `main.js:338` | `ophis_model__persistence.js:189` |
| `onOphFileOpenError(path, message)` | `main.js:314→320` | `ophis_model__persistence.js:141` |
| `onOphFileOpenedFromOutsideApp(path)` | `main.js:540` | `ophis_model__persistence.js:162` |
| `onSaveAsSuccess(path)` | `main.js:299` | `ophis_model__persistence.js:68` |
| `onSaveToFileError(message)` | `main.js:278` | `ophis_model__persistence.js:63` |
| `onCloseAppRequested()` | `main.js:556` | `ophis_model__persistence.js:2` |
| `electronBridgeIncoming_startNewFile()` | `main.js:619` | `ophis_model__persistence.js:93` |
| `electronBridgeIncoming_openFileExplorer()` | `main.js:627` | `ophis_model__persistence.js:19` |
| `electronBridgeIncoming_onSaveClickedFromFileMenu()` | `main.js:634` | `ophis_model__persistence.js:40` |
| `electronBridgeIncoming_onSaveAsClickedFromFileMenu()` | `main.js:641` | `ophis_model__persistence.js:51` |
| `togglePrettifyOphFiles()` / `toggleMinifyOphFiles()` / `toggleOperationsColVisible()` / `factoryReset()` | `main.js:658,666,722,673` | `ophis_controller.js:52,56,45,15` |
| `console.log("main.js: …")` | `main.js:584` | (built-in) |

That is the *whole* main→renderer contract. It only works because `contextIsolation` puts
`executeJavaScript` in the **main world** by default (`webContents.executeJavaScript` targets the
page's own world unless `executeJavaScriptInIsolatedWorld` is used), which is where the `src/*.js`
classic scripts live.

---

## 3. `escapeString`, `executeJavaScript`, and whether it can be broken

### 3.1 What `escapeString` does — `main.js:26-33`

```js
function escapeString(someString) {
  var toReturn = someString;
  toReturn = toReturn.replace(/\\/g, '\\\\');
  toReturn = toReturn.replace(/"/g,'\\"');
  return toReturn;
}
```

It escapes exactly two characters, in the correct order (backslash first, then quote — reversing the
order would produce `\\"` from `"` and be exploitable; it does not).

**It does not escape:** LF (U+000A), CR (U+000D), LINE SEPARATOR (U+2028), PARAGRAPH SEPARATOR
(U+2029), NUL, any other C0 control, single quotes, or backticks. Single quotes and backticks do not
matter — every injection site uses a **double-quoted** literal, so `'` and `` ` `` are inert, and
`${…}` is inert outside a template literal.

`escapeString` is exactly the correct inverse for embedding an arbitrary string into a double-quoted
JS literal **provided the input contains no raw line terminator**. That proviso is the whole story.

### 3.2 Every `executeJavaScript` call site

| # | `main.js` | Exact concatenation | Interpolated values | Escaped? |
|---|---|---|---|---|
| 1 | 278 | `'onSaveToFileError("Got error saving json string, see above.");'` | none | n/a — constant |
| 2 | 299 | `'onSaveAsSuccess("'+filePathEscaped+'");'` | path from `dialog.showSaveDialog` | yes |
| 3 | 314/320 | `'onOphFileOpenError("'+filePathEscaped+'", "'+message+'");'` | path; **`message` is NOT escaped** | path only |
| 4 | 338 | `'onOphFileOpened("'+filePathEscaped+'", "'+escapedData+'", '+checkForUnsavedChangesString+');'` | path; `escapeString(JSON.stringify(JSON.parse(fileText)))`; literal `"true"`/`"false"` | yes |
| 5 | 459 | `'init("'+filePathEscaped+'");'` | path from `process.argv` or `open-file` | yes |
| 6 | 465 | `'init();'` | none | n/a |
| 7 | 540 | `'onOphFileOpenedFromOutsideApp("'+filePathEscaped+'");'` | path from macOS `open-file` | yes |
| 8 | 556 | `'onCloseAppRequested();'` | none | n/a |
| 9 | 584 | `'console.log("main.js: '+escapedMessage+'");'` | **every `logToRenderer()` argument** | yes |
| 10-16 | 619, 627, 634, 641, 658, 666, 673, 722 | eight menu-click strings, all constant | none | n/a |

Only sites 2, 3, 4, 5, 7 and 9 carry attacker-influenceable data.

### 3.3 Site 4 — the `.oph` file **contents**. Verdict: **not reachable.**

`main.js:331-338`:

```js
const jsonString = await fs.promises.readFile(filePath, 'utf-8');
var jsonObject = JSON.parse(jsonString);
...
var jsonObjectRestringified = JSON.stringify(jsonObject);
var escapedData = escapeString(jsonObjectRestringified);
```

The round-trip through `JSON.parse` → `JSON.stringify` is the decisive control, and it is almost
certainly accidental (it exists to normalise, not to sanitise). `JSON.stringify` escapes **every**
code point in U+0000–U+001F as a two-character `\n` / `\r` / `\uXXXX` sequence, so its output contains
no raw line terminator. `escapeString` then doubles each of those backslashes, and the JS parser
undoes both transformations exactly:

```
file bytes            {"n":"a\nb"}      (backslash, 'n' — 2 chars, from JSON.stringify)
after escapeString    {\"n\":\"a\\nb\"}
inside JS source      onOphFileOpened("…", "{\"n\":\"a\\nb\"}", false);
what the renderer gets {"n":"a\nb"}     — byte-identical round trip
```

The one gap is U+2028 / U+2029, which `JSON.stringify` passes through **raw**. On a pre-ES2019 engine
those terminate a string literal and this would be a clean break-out. Since ES2019's "JSON superset"
proposal, U+2028 and U+2029 are *legal* inside a string literal, and any Electron ≥ 6 ships a V8 with
that behaviour. So on the shipped runtime it is inert.

**Conclusion: `.oph` file content cannot escape the string literal.** (It can still reach `new
Function` — but *inside the renderer*, via the operation-equation path at
`ophis_model__validation.js:158`. That is a different sink, covered in spec 02, and it is the one the
rewrite actually eliminated.)

### 3.4 Sites 2/3/5/7/9 — the **file path**. Verdict: a crash, not an injection; Windows-immune.

A break-out needs the string literal closed. `"` is escaped. `\` is escaped. That leaves a raw line
terminator, which does not *close* the literal — it makes it **unterminated**, i.e. a `SyntaxError`
for the whole injected program. You cannot append a statement after a syntax error.

So: can a `.oph` path contain a raw LF/CR?

| Platform | `"` in a filename | LF in a filename | Reachable? |
|---|---|---|---|
| Windows (Win32 / NTFS via the Win32 API) | **forbidden** (`" < > : / \ | ? *` are reserved) | **forbidden** (chars 1–31 are reserved) | **No.** Neither `cmd`, Explorer, nor `dialog.showOpenDialog` can produce one. |
| macOS (APFS/HFS+) | allowed | **allowed** (only `/` and NUL are forbidden) | Yes |
| Linux (ext4 &c.) | allowed | **allowed** (only `/` and NUL are forbidden) | Yes |

And the path does not even have to name a real file. `openOphFile` (`main.js:324-346`) escapes the
path *before* touching the disk, and the failure path still injects it:

```js
var filePathEscaped = escapeString(filePath);
try { … } catch(err) { onOphFileOpenError(filePathEscaped, "Got error opening file …", err); }
```

`onOphFileOpenError` then builds `'onOphFileOpenError("'+filePathEscaped+'", "'+message+'");'`.
So **any string the renderer passes to `electronBridge.openOphFile()` reaches an `executeJavaScript`
concatenation**, whether or not it names an existing file.

**Honest conclusion.** On Windows — the platform of the shipped `Ophis_v12_Windows.exe` — this is
**unreachable**. On macOS/Linux it is reachable, and the outcome is:

* via `init(…)` at `main.js:459` → the `.catch` fires → `onProblemExecutingInit` →
  `exitAppWithStatusCode(1)` unless `--inspect*`. **A `.oph` file whose *path* contains a newline
  makes the app exit 1 at launch on macOS/Linux.**
* via sites 2/3/7/9 → an unhandled promise rejection in the main process and a silently dropped
  callback (the save "succeeded" but `onSaveAsSuccess` never runs, so the renderer keeps showing
  unsaved changes).

That is a denial-of-service and a state-desync bug, **not** an arbitrary-code-execution vector. I
want to state that plainly, because it would be easy and wrong to write this up as "main-process RCE
via crafted filename". It is not. The real privileged primitive is §4.4.

The one genuinely unescaped interpolation is `message` at `main.js:314`. Every call site passes a
string literal (`"Got null parsing json string."`, `"Got error opening file or parsing json string,
see above."`), so it is not live today. It is a latent hazard: the next person to pass `err.message`
there hands the contents of an `fs` error — which embeds the file path — into an unescaped position
where `"` **would** close the literal.

`logToRenderer` (`main.js:575-587`) is the widest-open of the sites, taking raw filenames
(`main.js:132, 253, 295, 456`) and `JSON.stringify(argv)` (`main.js:228, 250, 421`). The
`JSON.stringify` ones are safe for the same reason as §3.3; the raw-filename ones are exposed
exactly as described above. It is a no-op when headless (`main.js:579`).

---

## 4. THE SECURITY POSTURE, precisely

### 4.1 What is set and what is defaulted

Set: `nodeIntegration: true`, `preload: <asar>/preload.js`.
**Not set: `contextIsolation`, `sandbox`, `webSecurity`, `nodeIntegrationInSubFrames`,
`nodeIntegrationInWorker`, `enableRemoteModule`, `allowRunningInsecureContent`, `webviewTag`.**

Electron defaults that apply (stable since Electron 20; unchanged through 39):

| Key | Default | Effective here |
|---|---|---|
| `contextIsolation` | **`true`** (default since Electron 12) | **on** — not overridden |
| `sandbox` | **`true`** for renderers by default since Electron 20, **except** that enabling `nodeIntegration` opts the renderer out | **off**, because `nodeIntegration: true` is set |
| `webSecurity` | `true` | on — same-origin policy enforced on the `file:` origin |
| `nodeIntegration` | `false` | **overridden to `true`** |
| `webviewTag` | `false` | off |
| `enableRemoteModule` | removed in Electron 14 | n/a |

### 4.2 Therefore: does the page get `require`? **No.**

This is the part that is easy to get wrong. `nodeIntegration: true` injects Node globals
(`require`, `process`, `module`, `Buffer`, `__dirname`) into the world where scripts run **only when
context isolation is off**. With `contextIsolation` at its default `true`:

* the **preload** runs in a separate isolated world *with* full Node — which is exactly why
  `preload.js:1` `require("electron")` works;
* the **page's main world** — where `lib/*.js` and `src/*.js` live — gets **only** what
  `contextBridge.exposeInMainWorld` handed over, i.e. `window.electronBridge` and nothing else.
  `window.require` is `undefined` there.

What `nodeIntegration: true` *does* buy the attacker here is one thing: it takes the renderer
**out of the Chromium OS-level sandbox**. So a Chromium renderer-process memory-safety exploit would
land in an unsandboxed process. That is a real reduction in defence-in-depth and it is why the flag
should not be there. It is not, by itself, a script-level capability.

The source corroborates that the app was written for an isolated main world:

* `isRunningElectron()` (`ophis_utils.js:646-648`) tests `window.electronBridge`, **not**
  `window.require` — the obvious test if `require` were available.
* Grepping the entire renderer tree for `require(`, `__dirname`, `process.`, `module.exports` finds
  exactly one hit, and it is **commented out** (`ophis_main.js:462-470`):

```js
// if ( typeof require !== 'undefined' ) {
//     var require_electron = require('electron');
//     if ( require_electron ) {
//         var ipcRenderer = require_electron.ipcRenderer;
//         ipcRenderer.on('factoryReset', function (event, message) { factoryReset(); });
//     }
// }
```

  The `typeof require !== 'undefined'` guard is itself evidence the author found it undefined.

Note that the presence of `contextBridge.exposeInMainWorld` does **not** prove isolation is on —
`contextBridge` also works with isolation disabled, where it degenerates to a plain assignment on
`window`. The proof is the default plus the absence of any `require` use.

### 4.3 So what is the posture, accurately?

* **Renderer main world:** no Node. One privileged object, `window.electronBridge`, with eleven
  methods.
* **Renderer process:** unsandboxed (because of `nodeIntegration: true`).
* **Preload:** full Node, isolated world, exposes a fixed, non-parameterised surface — no
  `ipcRenderer.send` passthrough, no channel name taken from the caller. That part is done correctly.
* **Main process:** validates nothing it receives.
* **Origin:** `file://`, so `webSecurity: true` still permits `file:`→`file:` subresource loads,
  which is what the app relies on.

### 4.4 The real reachable path to an arbitrary file write

**The component is `electronBridge.autoSaveToFile` (`preload.js:4-6`) → `ipcMain.on('autoSaveToFile')`
(`main.js:113-120`) → `saveToFile` (`main.js:267-283`).** Not `nodeIntegration`, not `escapeString`.

```js
function saveToFile(filePath, fileContents, callback) {
  var dirName = path.dirname(filePath);
  if (!fs.existsSync(dirName)){
      fs.mkdirSync(dirName, { recursive: true });
  }
  fs.writeFile(filePath, fileContents, err => { … });
}
```

Both arguments come straight from the renderer. There is no normalisation, no prefix check, no
extension check, no traversal check. `fs.mkdirSync(..., {recursive:true})` means the call will
**create any missing parent directories** as well — so the target need not already exist. Contents are
fully attacker-chosen (they are just a string). Note this `mkdirSync` block is **new in v12**; v9's
`saveToFile` (`asar9 main.js:118-127`) was a bare `fs.writeFile`. It was added for headless
multi-file export, which builds nested output paths (`ophis_view__export.js:118`), and it widened the
primitive from "overwrite/create a file in an existing directory" to "create an arbitrary directory
tree and a file in it".

So: **any script executing in the renderer's main world can write an arbitrary file, with arbitrary
contents, anywhere the user's account can write.** A concrete example is a `.bat` or `.lnk` dropped
into `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\`, which converts a page-level script
execution into persistence.

For that to matter, something must get script into the main world. Two candidates exist in this
codebase, both documented elsewhere in this study:

1. **`new Function` on operation equations** — `ophis_model__validation.js:158`:
   `new Function("Y", "return " + operationEquationStringForFinalFunction + ";")`. The string
   originates in a `.oph` preset file. As spec 02 and `docs/DEVIATIONS.md §1` record, the string that
   is *validated* (`stripOperationEquationString(...)`, line 147) is not the string that is
   *compiled* (`stripXDateFromOperationEquationString(...)`, line 155), so the validator's guarantees
   do not cover the compiled text. The CSP permits this (`'unsafe-eval'`, §5).
2. **`innerHTML` assembly across the view layer** — 71 `innerHTML` assignments across
   `src/ophis_view*.js`, several with user-supplied event names and notes interpolated. `DOMPurify`
   (`lib/purify.min.js`) is loaded but is not applied at those sites.

**The precise, non-alarmist statement:** the arbitrary-write primitive is unconditionally available
to the renderer's main world; reaching it requires script execution there; a `.oph` file is an
untrusted input with a documented path to script execution there. Opening someone else's `.oph` file
is therefore not a safe operation in Ophis v12. `nodeIntegration: true` is a genuine and unnecessary
weakening of the sandbox, but it is not the mechanism.

The rewrite closes this at the architectural level: no IPC bridge, no `new Function`, and exports go
through `Blob` + `<a download>` so the destination is the user's choice
(`docs/DEVIATIONS.md §1, §2`).

---

## 5. THE CSP IN `ophis.html`

Verbatim, `ophis.html:72`:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data: gap: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval';">
```

Two directives. What it permits:

| Directive | Sources | Effect |
|---|---|---|
| `default-src` | `'self'`, `'unsafe-inline'`, `data:`, `gap:`, `blob:` | Fallback for `style-src`, `img-src`, `font-src`, `connect-src`, `media-src`, `object-src`, `frame-src`, `worker-src`, `manifest-src`. `'unsafe-inline'` is what makes the page's pervasive `style="…"` attributes work. `data:` is required by the inline base64 SVG at `ophis.html:434`. `blob:` is used by the PDF/XLSX export path (`jspdf`, `write-excel-file`). |
| `script-src` | `'self'`, `'unsafe-inline'`, `'unsafe-eval'` | `'self'` for `lib/*.js` and the dynamically appended `src/*.js`; `'unsafe-inline'` for the inline loader at `ophis.html:506-557`; **`'unsafe-eval'` for `new Function` at `ophis_model__validation.js:1` and `:158`**. |

Five specific things worth saying about it:

1. **`gap:` is vestigial.** It is the Apache Cordova / PhoneGap URI scheme. It has no meaning in
   Electron. It is a copy-paste survival from a Cordova CSP template.
2. **`'unsafe-eval'` is load-bearing, not sloppiness.** Remove it and every operation equation fails
   to compile: `DEFAULT_OPERATION_FUNCTION = new Function("Y", "return Y;")` at
   `ophis_model__validation.js:1` runs at module scope and would throw during script parse, taking
   the whole app down before `init()`. This is precisely the coupling `docs/DEVIATIONS.md §1` removes.
3. **`base-uri` is unset and does not fall back to `default-src`.** The page ships a
   `<base href="./">` at `ophis.html:5`; injected markup could add another and re-point every
   relative script URL. Ordinarily mitigated by `script-src 'self'`, but note the app's own scripts
   are loaded from relative paths built at runtime (`"./src/"+ithSrcFile+".js?v="+cacheBuster`).
4. **`form-action` is unset**; also no fallback.
5. **The meta tag is at line 72 — *after* all twenty-eight `<script src="./lib/…">` tags
   (lines 24-70).** A `<meta http-equiv="Content-Security-Policy">` applies from the point it is
   parsed; resources requested before it are not governed by it. The CSP therefore does not cover the
   third-party library loads at all. It happens not to matter (they are all `'self'` anyway), but the
   policy is weaker than it reads.

**Also: `webContents.executeJavaScript` is not subject to CSP.** All sixteen main→renderer
injections (§3.2) bypass the policy entirely. The CSP constrains the page; it does not constrain the
host.

**v9 had no CSP at all** — `grep -n "Content-Security-Policy" asar9/unpacked/ophis.html` returns
nothing. The CSP is new in v12.

---

## 6. THE SCRIPT LOAD ORDER IN `ophis.html`

There are **two** stages, and only the first is `<script src>` tags in the markup.

### 6.1 Stage 1 — `<head>`, static tags, blocking, in document order

Twenty-two live tags (five more are present but commented out):

| # | Line | `src` |
|---|---|---|
| 1 | 24 | `./lib/math.js` |
| 2 | 25 | `./lib/geo-point.js` |
| 3 | 26 | `./lib/jquery.min.js` |
| 4 | 27 | `./lib/jquery.tipsy.js` |
| 5 | 28 | `./lib/flatpickr.js` |
| 6 | 29 | `./lib/flatpickr-monthSelect.js` |
| 7 | 30 | `./lib/moment-with-locales.min.js` |
| 8 | 31 | `./lib/moment-timezone-with-data.js` |
| 9 | 32 | `./lib/lunarphase-js.js` |
| 10 | 34 | `./lib/luxon.min.js` |
| 11 | 37 | `./lib/leaflet_1_8_0.js` — preceded by the marker comment `<!-- FEATURE_FLAG__SHOW_LOCATION -->` |
| 12 | 39 | `./lib/astronomy.browser.min.js` |
| 13 | 41 | `./lib/meuusjs.1.0.3.min.js` |
| 14 | 42 | `./lib/meeus-easy.js` |
| 15 | 44 | `./lib/suncalc.js` |
| 16 | 46 | `./lib/tz_lookup_oss.js` |
| 17 | 47 | `./lib/papaparse.min.js` |
| 18 | 48 | `./lib/write-excel-file.2.3.2.min.js` |
| 19 | 50 | `./lib/chart.min.js` |
| 20 | 51 | `./lib/hammer.js` |
| 21 | 53 | `./lib/chartjs-plugin-datalabels.js` |
| 22 | 54 | `./lib/chartjs-plugin-zoom.js` |
| 23 | 57 | `./lib/chartjs-adapter-luxon.js` |
| 24 | 62 | `./lib/purify.min.js` |
| 25 | 63 | `./lib/html2canvas.min.js` |
| 26 | 64 | `./lib/jspdf.umd.min.js` |
| 27 | 69 | `./lib/lunar_eclipses_processed.js` |
| 28 | 70 | `./lib/solar_eclipses_processed.js` |

Commented out: `./lib/chartjs-plugin-zoom.min.js` (52), `./lib/chartjs-adapter-moment.js` (56),
`./lib/lunar_eclipses_orig.js` (59), `./lib/solar_eclipses_orig.js` (60), and — decisively for §9 —
`./lib/sha512.min.js` (67), under the marker comment `<!-- FEATURE_FLAG__REQUIRE_SIGN_IN -->` (66).

Stylesheets (20-22): `./lib/flatpickr.css`, `./lib/flatpickr-monthSelect.css`,
`./lib/leaflet_1_8_0.css`. `<base href="./">` at line 5. `<title></title>` at line 7 is **empty**,
so the window title is whatever Chromium derives from the URL until `ophis_view.js` runs.

Ordering couplings in stage 1:

* `chart.min.js` (19) **must** precede `chartjs-plugin-datalabels.js` (21),
  `chartjs-plugin-zoom.js` (22), `chartjs-adapter-luxon.js` (23) — plugins register onto the `Chart`
  global.
* `hammer.js` (20) **must** precede `chartjs-plugin-zoom.js` (22) — the zoom plugin's pinch support
  probes `Hammer`.
* `luxon.min.js` (10) **must** precede `chartjs-adapter-luxon.js` (23).
* `jquery.min.js` (3) **must** precede `jquery.tipsy.js` (4).
* `meuusjs` (13) **must** precede `meeus-easy.js` (14).

### 6.2 Stage 2 — the inline loader, `ophis.html:506-557`

The application's own 24 files are **not** `<script src>` tags. They are created at runtime by an
inline `<script>` placed after `</body>` (line 506) — i.e. after all the markup, including `#map`.

```js
var cacheBuster = Math.floor(Math.random() * 99999999);

var styleElem = document.createElement("link");
styleElem.rel = "stylesheet";
styleElem.type = "text/css";
styleElem.href = "./src/ophis.css?v=" + cacheBuster;
document.getElementsByTagName('head')[0].appendChild(styleElem);

var srcFiles = [ … 24 names … ];

for ( var i = 0; i < srcFiles.length; i++ ) {
    var ithSrcFile = srcFiles[i];
    var ithScriptElem = document.createElement("script");
    ithScriptElem.defer = true;
    ithScriptElem.async = false;
    ithScriptElem.src = "./src/"+ithSrcFile+".js?v=" + cacheBuster;
    document.body.appendChild(ithScriptElem);
}
```

`defer = true` **has no effect** on a dynamically created script — `defer` is only honoured on
parser-inserted scripts. The property that actually does the work is **`async = false`**, which for
dynamically inserted scripts forces in-order execution. Setting both is belt-and-braces; only
`async = false` is load-bearing. Remove it and the 24 files execute in arbitrary completion order and
the app breaks immediately.

The `cacheBuster` (a single random integer, shared by the stylesheet and all 24 scripts) exists to
defeat the `file://` cache during development — the author's own comment at lines 508-509 says so.
It also means every launch requests 25 distinct URLs, so nothing is ever cached between runs.

**The ordered list, exactly as written (`ophis.html:518-543`):**

| # | name | Why it must be here |
|---|---|---|
| 1 | `ophis_logging` | `ophis_logging.js:5-7` captures `self.originalConsoleLog/Warn/Error` **before anything can overwrite them**. Must be first. |
| 2 | `ophis_utils` | defines `isFlagEnabled` (`ophis_utils.js:3`) and `roundNumberToTimePrecision` |
| 3 | `ophis_config` | **hard dependency on #2**: `ophis_config.js:346` `var GLOBAL_DATE_SCOPE = isFlagEnabled(FEATURE_FLAG__SHOW_LOCATION) ? … ;` and `:410-412` `OPH_PI/OPH_PHI/OPH_CRV = isFlagEnabled(…) ? … : roundNumberToTimePrecision(…)` all execute at module scope |
| 4 | `ophis_dependencies` | |
| 5 | `ophis_model__params` | |
| 6 | `ophis_model__validation` | `:1` `var DEFAULT_OPERATION_FUNCTION = new Function("Y","return Y;")` at module scope — requires `'unsafe-eval'` |
| 7 | `ophis_model__sorting` | |
| 8 | `ophis_model__operations` | |
| 9 | `ophis_model__persistence` | |
| 10 | `ophis_controller` | |
| 11 | `ophis_view__strings` | |
| 12 | `ophis_view__config` | |
| 13 | `ophis_view__utils` | |
| 14 | `ophis_view__rebuild` | |
| 15 | `ophis_view__output` | `:68` calls `clockRefreshLoop()` at module scope — a perpetual 500 ms `setTimeout` chain that is never cancelled. `updateLocalTime` is defined in the same file (`:3`), so this is self-contained. |
| 16 | `ophis_view__settings` | |
| 17 | `ophis_view__chart_config` | |
| 18 | `ophis_view__chart` | |
| 19 | `ophis_view__chart_datasets` | |
| 20 | `ophis_view__export` | |
| 21 | `ophis_view` | |
| 22 | `ophis_unit_tests` | |
| 23 | `ophis_main` | **the two hardest couplings, both at `ophis_main.js:11-12`** — see below |
| 24 | `scratchpad` | 114 bytes; loads *after* `ophis_main` |

**The two hard couplings at `ophis_main.js:11-12`:**

```js
map:           FEATURE_FLAG__SHOW_LOCATION == true ? L.map('map').setView([0, 0], DEFAULT_MAP_SELECTION_ZOOM) : null,
mapMarkerLayer:FEATURE_FLAG__SHOW_LOCATION == true ? L.layerGroup() : null,
```

This runs at module scope inside the `appState` object literal and requires, simultaneously:

* the `L` global — `lib/leaflet_1_8_0.js`, stage 1 tag #11 ✓
* `FEATURE_FLAG__SHOW_LOCATION` and `DEFAULT_MAP_SELECTION_ZOOM` — `ophis_config.js`, stage 2 file #3 ✓
* **the DOM element `#map`** — `ophis.html:87`. This is why the loader appends to `document.body`
  at the very end of the document rather than putting `<script src>` tags in `<head>`.

`FEATURE_FLAG__SHOW_LOCATION` is `true` (`ophis_config.js:313`), so this always executes. Move
`ophis_main` earlier, or hoist the loader into `<head>`, and the app throws on parse.

`ophis_main.js:743-747` (the tail) is the boot decision described in §1.4. Because `scratchpad.js`
loads *after* it, `ophis_main` is **not** the last file — a small correction to
`docs/reverse/06-controller-main.md:146`.

### 6.3 v9 → v12 delta in the loader

v9's `srcFiles` (`asar9/unpacked/ophis.html:380-402`) has **22** entries. v12 adds two:

* **`ophis_logging`** — new, and inserted at position 1 (the console-override machinery that routes
  headless logging through `electronBridge.logToCli`, which v9 did not have).
* **`scratchpad`** — new, appended last.

The rest of the list is identical and in the same relative order.

v9's stage-1 tags: `suncalc.js` is **absent**, and `astronomy.browser.min.js` is present but
**commented out** (`asar9 ophis.html:43`). Both are live in v12 — the sunset/prior-sunset feature
(`FEATURE_FLAG__SUNSET__*`, `FEATURE_FLAG__USE_SUNSET_SAMPLING`) is what needed them.

New DOM ids in v12's body (absent in v9), which is a compact index of the feature delta:
`add-t-date-button`, `t-date-container`, `t-date-container-starting-message`, `t-dates-col-header`,
`t-dates-help-button` (**the entire T-Dates panel**); `auto-recalculate-z-dates-container`,
`recalculate-z-dates-button`, `z-dates-up-to-date` (**auto-recalc**);
`notes-pop-up-wrapper`, `notes-pop-up-clear-button`, `notes-pop-up-done-button` (**per-event notes**);
`iso-events-help-button`, `iso-event-filters-help-button`, `x-dates-help-button`,
`x-date-container-starting-message` (**the `?` help system**);
`panel-cell-with-table-output-for-events`.

---

## 7. HEADLESS / CLI MODE

### 7.1 Argument parsing — `main.js:39-111`

```js
function getNormalizedArgsArray(argv = null) {
  argv = argv ? argv : originalArgV;
  if ( Array.isArray(argv) ) {
    const argsArray = deepClone(argv).slice(app.isPackaged ? 1 : 2);
    return argsArray;
  } else { return []; }
}
```

`deepClone` is `JSON.parse(JSON.stringify(obj))` (`main.js:35-37`) — an expensive way to copy an
array of strings before a `.slice()` that already copies. Harmless.

`slice(app.isPackaged ? 1 : 2)` drops `argv[0]` (the exe) when packaged, or `argv[0]` + `argv[1]`
(`electron` + the script) when running from source.

| Helper | Lines | Behaviour |
|---|---|---|
| `getFilePathFromArgs(argv?)` | 53-65 | first normalised arg ending in `.oph`, else `null`. **Extension match only — no existence check, no absolute-path requirement.** |
| `hasArgFlagDeclared(flag, argv?, normalize=true)` | 67-86 | exact `==` match, or `startsWith` when `flag` ends in `*` |
| `isRunningDebug(argv=originalArgV)` | 88-91 | `hasArgFlagDeclared("--inspect*", argv, false)` — **`normalize=false`, so it scans raw argv including argv[0]** |
| `isRunningHeadless(argv?)` | 93-95 | `hasArgFlagDeclared("--headless")` |
| `getArgFlagValue(flag, default, argv?)` | 97-111 | scans for an exact match and returns `argsArray[i+1]`. **No `--flag=value` form.** If the flag is the last argument, the loop finds it, the `i+1 < length` test fails, and the loop *continues* rather than returning — so it falls through to the default. |

### 7.2 Trigger and flags

Headless is triggered by the bare flag **`--headless`** anywhere in the arguments. The complete
recognised CLI surface (`main.js:490-494`):

| Flag | Form | Default | Where it goes |
|---|---|---|---|
| `--headless` | boolean | off | `?headless=true` |
| `--output-type <v>` | value | `"csv"` | `?headless_output_type=` — only `"csv"` is understood (`ophis_view__export.js:174-183`); anything else warns and falls back to CSV |
| `--output-path <dir>` | value | `""` | `?headless_output_path=` — **must be an existing directory** or the app exits 1 (`main.js:515-520`) |
| `--input-validation-mode <v>` | value | `""` | `?input_validation_mode=` — `loose` / `original` / `strict` (`ophis_view__export.js:146-172`); an unrecognised value warns and uses `strict`; empty means `strict` when headless, `loose` otherwise |
| `--current-epoch-millis <n>` | value | `""` | `?headless_current_epoch_millis=` — freezes "now" for reproducible output (`ophis_utils.js:650-662`); only added to the query string when non-empty |
| `--multiple-files` | boolean | off | `?headless_multiple_files=true` — one CSV per Iso-Event instead of one combined CSV |
| `--inspect` / `--inspect-brk` / `--inspect-port=…` | prefix | off | opens DevTools, adds a 1000 ms delay, shows the window even when headless, and **suppresses the exit-1-on-init-failure path** (`main.js:445`) |
| `<something>.oph` | positional | – | the input file; first match wins |

### 7.3 What headless actually does

1. `--headless` present but no `.oph` argument → `console.error("No .oph file specificed, bailing out.")`, **exit 1** (`main.js:527-528`).
2. `--output-path` given but the directory does not exist → `console.error`, **exit 1** (`main.js:518-519`).
3. Otherwise `createWindow()` with `show: false` (unless `--inspect*`), and **no** `win.maximize()`.
4. The renderer boots normally through `init()`, except that `isRunningHeadless()` short-circuits
   several stages: sign-in is skipped (`ophis_main.js:125`), image preloading is skipped (`:202-204`),
   all UI dependency init is skipped (`:249-252`).
5. `toggleConsoleLogOverride()` (`ophis_main.js:59` → `ophis_logging.js:48-61`) replaces
   `console.log/warn/error` with wrappers that forward `args[0]` — prefixed `OPH_INFO: ` /
   `OPH_WARN: ` / `OPH_ERROR: ` — through `electronBridge.logToCli` to the **main process's stdout**,
   *and* still call the originals. This is the only way headless output reaches a terminal, because
   a hidden renderer's console goes nowhere. The override is applied only when
   `isRunningHeadless() && isRunningElectron()`.
6. Startup self-check: `selfCheckMsrfOnStartup` + `runUnitTests`; any error → each is
   `console.error`'d and then `exitHeadlessWithError("Self-check failed.")` (`ophis_main.js:231-239`).
7. `initAppStateFinalization()` → `handleHeadlessOutput()` (`ophis_view__export.js:9-19`):
   * no Iso-Events → `exitHeadlessWithError("No Iso Events found.")`
   * `--multiple-files` → `exportHeadlessMultipleCsvs()` (`:103-144`)
   * otherwise → `exportHeadlessSingleCsv()` (`:40-101`)
8. Output paths are built by **string concatenation with a hardcoded `"/"`**
   (`ophis_view__export.js:86, 118, 122`), never `path.join`. On Windows this yields mixed separators
   like `C:\out/foo.csv`; Node's `fs` accepts it. Directory creation is what `saveToFile`'s
   `mkdirSync({recursive:true})` is for.
9. Each file goes out via `electronBridge.autoSaveToFile(fileName, csvString)` — the same unvalidated
   sink as §4.4 — and then `electronBridge.closeAppWithHeadlessSuccess()`.

### 7.4 Exit status codes

| Code | Constant | Raised by |
|---|---|---|
| `0` | `STATUS_CODE__SUCCESS` (`main.js:13`) | `confirmCloseApp` (157-161); `closeAppWithHeadlessSuccess` (167-169) |
| `1` | `STATUS_CODE__ERROR` (`main.js:14`) | `closeAppWithHeadlessError` (163-165); no `.oph` in headless (528); `--output-path` directory missing (519); `onOphFileOpenError` while headless (318); `init()` promise rejection when not `--inspect*` (446) |

`exitAppWithStatusCode` (`main.js:142-155`) removes the three quit-interception listeners, prints a
**bare blank line** (`console.log("")`, with the comment "give an extra blank line so it's easier to
see where log messages end"), and calls `app.exit(statusCode)` — the *non*-interceptable exit, as
distinct from the menu's `app.quit()`.

### 7.5 A real bug in `--current-epoch-millis`

`ophis_main.js:69-77` intends to reject a malformed value:

```js
var rawHeadlessCurrentEpochTimeMillis = getQueryParamString("headless_current_epoch_millis");
appState.headless_current_epoch_millis = getQueryParamInt("headless_current_epoch_millis", DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS);
if ( rawHeadlessCurrentEpochTimeMillis && rawHeadlessCurrentEpochTimeMillis != "" ) {
    if ( appState.headless_current_epoch_millis == DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS ) {
         exitHeadlessWithError("--current-epoch-millis had an invalid value: " + …); return;
    }
}
```

`getQueryParamInt` → `parseIntElse` (`ophis_utils.js:236-249`):

```js
var toReturn = parseInt(number);
if ( toReturn != null ) { return toReturn; } else { return elseValue; }
```

`parseInt("garbage")` is `NaN`, and **`NaN != null` is `true`**, so `parseIntElse` returns `NaN`
rather than the `elseValue`. The guard then compares `NaN == Number.MIN_SAFE_INTEGER`, which is
`false`, so **the invalid-value check never fires**. `appState.headless_current_epoch_millis` is set
to `NaN`; `ophis_utils.js:651` tests `NaN > DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS`, also `false`, so
the code silently falls back to the real system clock.

Net effect: `--current-epoch-millis banana` is **silently ignored** instead of producing the intended
error and exit 1 — which defeats the entire purpose of the flag (reproducible headless output), in
the one case where you most need to be told.

---

## 8. THE APPLICATION MENU — `refreshMenu()`, `main.js:591-781`

Built at module scope with `signedIn = false` (`main.js:783-784`), then rebuilt on every
`onSignedIn` (`main.js:205-208`) and every `refreshMenuOptions` (`main.js:210-213`). Each rebuild is
a full `Menu.buildFromTemplate` + `Menu.setApplicationMenu`.

`const isMac = process.platform === 'darwin'` (`main.js:589`).

### 8.1 Complete item table

| Menu | Item | Type | `enabled` | Accelerator | Action |
|---|---|---|---|---|---|
| **App** (macOS only, 594-609) | About / Services / Hide / Hide Others / Unhide / Quit | roles | – | platform defaults | Electron roles |
| **File** (611-679) | New File | normal | **`signedIn`** | `CmdOrCtrl+N` | `executeJavaScript("electronBridgeIncoming_startNewFile();")` |
| | Open… | normal | **`signedIn`** | `CmdOrCtrl+O` | `executeJavaScript("electronBridgeIncoming_openFileExplorer();")` |
| | Save | normal | *always enabled* | `CmdOrCtrl+S` | `executeJavaScript("electronBridgeIncoming_onSaveClickedFromFileMenu();")` |
| | Save As… | normal | **`signedIn`** | **none** | `executeJavaScript("electronBridgeIncoming_onSaveAsClickedFromFileMenu();")` |
| | Quit | normal | always | `CmdOrCtrl+Q` | `app.quit()` — with the comment *"DO NOT use app.exit() here. app.quit() is interceptable."* |
| | *(separator)* | | | | |
| | Prettify .oph Files | **checkbox** | always | none | `executeJavaScript("togglePrettifyOphFiles();")`; initial `checked: prettifyOphFilesChecked` |
| | Minify .oph Files | **checkbox** | always | none | `executeJavaScript("toggleMinifyOphFiles();")`; initial `checked: minifyOphFilesChecked` |
| | *(separator)* | | | | |
| | Reset Program | normal | always | none | `executeJavaScript("factoryReset();")` |
| **Edit** (681-710) | Cut / Copy / Paste | roles | | `CmdOrCtrl+X/C/V` | Electron roles |
| | Delete | role | | | macOS: Delete, Select All. Non-mac: Delete, separator, Select All |
| | Select All | role | | `CmdOrCtrl+A` | |
| **View** (712-746) | Operations Col Visible | **checkbox** | always | none | `executeJavaScript("toggleOperationsColVisible();")`; initial `checked: operationsColVisibleChecked` |
| | *(two separators, with a commented-out Classic Mode / Market Prediction Mode block between them, 726-737)* | | | | |
| | Toggle Developer Tools | role | | `Ctrl+Shift+I` / `Alt+Cmd+I` | **always present, in release builds too** |
| | *(separator)* | | | | |
| | Actual Size / Zoom In / Zoom Out | roles | | `CmdOrCtrl+0` / `+` / `-` | |
| | Toggle Full Screen | role | | `F11` / `Ctrl+Cmd+F` | |

Commented out entirely: the whole `windowMenu` block (747-764) and the `help` menu with a
"Learn More" item that would have called `shell.openExternal('https://electronjs.org')` (765-776).
That is the only `shell.openExternal` anywhere in `main.js`, and it is dead — consistent with the
air-gapped design intent stated in `README.txt`.

### 8.2 Menu defects

* **`Save` is not gated on `signedIn`** while New File, Open… and Save As… are. The renderer-side
  `isSignedIn()` check inside `electronBridgeIncoming_onSaveClickedFromFileMenu`
  (`ophis_model__persistence.js:41`) is what actually enforces it, so the inconsistency is invisible —
  but it is an inconsistency, and `Ctrl+S` is live from the moment the process starts.
* **`Save As…` has no accelerator.** `CmdOrCtrl+Shift+S` is the obvious omission.
* **The checkbox items desynchronise from the model on a cancelled dialog.** Electron toggles the
  checkbox's visual state itself when clicked. `toggleMinifyOphFiles` (`ophis_controller.js:56-64`)
  routes through `showMinifyWarningDialog` (`ophis_view__utils.js:440-449`), whose **cancel path is a
  no-op** — no state change, and therefore no `refreshMenuOptions()` call and no menu rebuild. So
  after clicking "Minify .oph Files" and then "NO, do not enable minifying", the menu shows a tick
  next to an option that is off, and stays wrong until some unrelated action triggers a rebuild.
  **This is a real, user-visible bug.**
* **Every toggle destroys and recreates the entire application menu** via
  `Menu.setApplicationMenu(Menu.buildFromTemplate(template))`. It works; it is heavier than
  `menuItem.checked = …`.
* **The startup menu is briefly wrong.** `refreshMenu(false)` runs at module scope, so New File /
  Open… / Save As… are disabled until the renderer reaches `init_step3_loadImages`
  (`ophis_main.js:207-209`) and fires `onSignedIn`. With `FEATURE_FLAG__REQUIRE_SIGN_IN === false`
  that is fast, but it is a visible flicker on a cold start.
* **`toggleDevTools` ships enabled in the release build.** Combined with §4.4, a DevTools console is
  a one-line arbitrary file write: `electronBridge.autoSaveToFile("C:/…/anything", "…")`. For an
  air-gapped single-user tool this is arguably a feature, but it should be stated rather than
  discovered.

### 8.3 v9 → v12 menu delta

| | v9 (`asar9 main.js:331-502`) | v12 |
|---|---|---|
| `refreshMenu` signature | `refreshMenu(signedIn)` | `refreshMenu(signedIn, operationsColVisibleChecked=false, prettifyOphFilesChecked=false, minifyOphFilesChecked=false)` |
| Prettify / Minify items | **absent** | new, both checkboxes, in File |
| Reset Program | in **View** | moved to **File**, below a separator |
| Operations Col | `"Toggle Operations Col Visible"`, plain item, in View | `"Operations Col Visible"`, **checkbox**, in View |
| Checkbox state round-trip | none | `refreshMenuOptions` IPC (new in v12) |

---

## 9. THE SIGN-IN PATH — control flow only

**Where it lives.** Nothing about sign-in lives in `main.js` or `preload.js` except the two lines
that react to it: `ipcMain.on('onSignedIn', …)` at `main.js:205-208`, and the `enabled: signedIn`
keys on three menu items. **The main process never sees a password, a hash, or a comparison.** The
entire gate is renderer-side.

The credential material is a fixed array of five digests declared at
`reference/asar/unpacked/src/ophis_config.js:5-11` (`var ACCOUNT_HASHES = [ … ]`). I am not
reproducing the values, and I have made no attempt to invert, crack, or characterise them.

**Control flow, as written:**

1. `init_step1_getAppVersion` → `init_step2_signIn(filePathFromMainArgs, account="", errorMessage="")`
   (`ophis_main.js:121-179`).
2. **The bypass, `ophis_main.js:125-128`:**

```js
if ( isRunningHeadless() || isRunningElectron() == false || isFlagEnabled(FEATURE_FLAG__REQUIRE_SIGN_IN) == false ) {
    init_step3_loadImages(filePathFromMainArgs);
    return;
}
```

   `FEATURE_FLAG__REQUIRE_SIGN_IN` is **`false`** (`ophis_config.js:291`), with the author's own
   comment above it: *"This was always just a false sense of security anyway, so now set to false!
   It was like having a fake security camera just to scare people."* So in v12 the gate is
   unconditionally skipped and everything below is dead code. It is `false` in v9 too
   (`asar9 src/ophis_config.js:268`).
3. Were the flag `true`, the flow would be: hide `#initial-loading-container`; build an HTML string
   containing a `<input type="password" id="account-password-input">`; show it via `showDialog(...)`
   with `cancelable = false`; on submit read the field, call `hashAccount(account)`, linear-scan
   `ACCOUNT_HASHES` for equality; on match → `init_step3_loadImages`; on mismatch → recurse into
   `init_step2_signIn` with `"Invalid password, try again."`; on empty → recurse with
   `"Password cannot be empty."`. No rate limit, no lockout, no salt, no key stretching — a single
   hash compared against a constant list, in the process the user controls.
4. On success, `init_step3_loadImages` sets `appState.isSignedIn = true` (`ophis_main.js:200`) and,
   under Electron, calls `window.electronBridge.onSignedIn()` (`:207-209`) — which is the *only*
   thing the main process learns. `refreshMenu(true)` then enables New File / Open… / Save As….
5. `isSignedIn()` (`ophis_utils.js:642-644`) gates four renderer entry points:
   `electronBridgeIncoming_openFileExplorer`, `_onSaveClickedFromFileMenu`,
   `_onSaveAsClickedFromFileMenu`, `_startNewFile`.

**Why re-enabling the flag would not work in v12.** `hashAccount` is
`function hashAccount(account) { return sha512(account); }` (`ophis_utils.js:664-666`), and
`sha512` comes from `lib/sha512.min.js` — whose `<script>` tag is **commented out** at
`ophis.html:67`, directly under the marker comment `<!-- FEATURE_FLAG__REQUIRE_SIGN_IN -->` at
line 66. Flipping the flag alone therefore produces a `ReferenceError: sha512 is not defined`.

Precisely *where* that error surfaces matters, and it is worth stating because
`docs/DEVIATIONS.md §3` gets it slightly wrong: the dialog would **render fine**; `hashAccount` is
only reached inside the `onNoOrOk` click handler (`ophis_main.js:155`). So the failure is "the Sign
In button throws and nothing happens", not "init crashes". The gate would be un-passable, not
un-reachable. To actually revive it you must both set the flag *and* un-comment `ophis.html:67`.

**The rewrite drops this entirely** — `docs/DEVIATIONS.md §3` — which is correct. A local, offline
instrument has nobody to authenticate to, and a check that runs inside the thing it protects is not
access control.

---

## 10. THE v9 → v12 MAIN-PROCESS DELTA

413 changed lines between `asar9/unpacked/main.js` (505 lines) and `asar/unpacked/main.js` (784).
The substantive additions, all of them absent in v9:

| Area | v9 | v12 |
|---|---|---|
| CLI argument machinery | `getFilePathFromArgs(inputArgs)` only — a bare `.slice()`, no flags at all | `getNormalizedArgsArray`, `hasArgFlagDeclared` (with `*` prefix matching), `getArgFlagValue`, `isRunningDebug`, `isRunningHeadless`, `deepClone`, `originalArgV` |
| Headless mode | **does not exist** | the whole of §7 |
| Exit codes | `app.exit()` with no argument (always 0) | `STATUS_CODE__SUCCESS`/`ERROR`, `exitAppWithStatusCode()` |
| URL query string | none — `loadURL` had no `query` | six parameters |
| IPC channels | 6 (`autoSaveToFile`, `openFileExplorer`, `confirmCloseApp`, `onSignedIn`, `saveFileAs`, `openOphFile`) | **11** — adds `closeAppWithHeadlessError`, `closeAppWithHeadlessSuccess`, `resetProgram`, `logToCli`, `refreshMenuOptions` |
| Bridge methods | 6 | **11** (same set) |
| `saveToFile` | bare `fs.writeFile` | + `fs.existsSync(dirname)` / `fs.mkdirSync(…, {recursive:true})` — **widens the write primitive** |
| `did-fail-load` | **no handler at all** | logging-only handler |
| `BrowserWindow` opts | `width`, `height`, `webPreferences` | + `show` |
| Single-instance lock | unconditional | skipped when headless; `second-instance` not registered when headless |
| `openOphFile` error path | two inline `executeJavaScript` calls | factored into `onOphFileOpenError()`, with a headless branch that prints to stderr and exits 1 |
| Debug detection | inline loop over `process.argv` looking for `startsWith("--inspect")` | `isRunningDebug()` |
| `init()` result handling | fire-and-forget `executeJavaScript` | `.then`/`.catch`, with `exit(1)` on rejection |
| `logToRenderer` | always injects | no-op when headless |
| CSP | **none** | the meta tag at `ophis.html:72` |

**Carried over unchanged, bugs included:** `escapeString` (identical), the dead
`win.on('beforeunload')`, and `logToRenderer("Received open-file: " + path)` — which interpolates the
Node `path` **module** instead of the `filePath` parameter (`v9:277`, `v12:534`). That one is a real
if trivial bug that survived three major versions.

---

## 11. CORRECTIONS TO PREVIOUS SPECS AND TO THE REWRITE

Listed with the exact claim that is wrong. See the structured summary for the condensed form.

1. **`docs/reverse/00-BUILD-SPEC.md:2597` (D21)** — *"The twelve `electronBridge.*` calls…"*.
   There are **eleven**, and `preload.js` exposes exactly eleven. The count was inferred from call
   sites; `06-controller-main.md:1556-1566` lists the correct eleven, so D21's "twelve" is a
   transcription slip.

2. **`docs/reverse/06-controller-main.md:139-146`** — *"The load order is dictated by the host
   `index.html`, **which is NOT present in this repository**"*, followed by a reconstructed order that
   puts `ophis_config.js` **before** `ophis_utils.js`.
   * The host is **`ophis.html`**, not `index.html`. (`index.html` is referenced only in dead
     commented-out code at `main.js:381`, and does not exist in the asar.)
   * The real order is **`ophis_logging` → `ophis_utils` → `ophis_config` → …** — utils **before**
     config, which is mandatory, because `ophis_config.js:346` and `:410-412` call `isFlagEnabled`
     and `roundNumberToTimePrecision` at module scope and both are defined in `ophis_utils.js`.
   * The files are **not** `<script src>` tags. They are appended to `document.body` by an inline
     loop (`ophis.html:518-556`) with `defer=true; async=false` and a shared random cache-buster
     query string. Only `async=false` is load-bearing.
   * `ophis_main` is **not** last — `scratchpad` loads after it (`06:146` says "ophis_main.js (last,
     since it self-boots)").
   * The §8 "Missing Artifacts" premise is now resolved: `main.js`, `preload.js` and `ophis.html` are
     all present in `reference/asar/unpacked/`, and the reconstructed bridge table at
     `06:1552-1566` is otherwise **correct in every method name, arity and call site**.

3. **`docs/DEVIATIONS.md §2`** — *"…from a renderer running with `nodeIntegration: true`. **That
   combination** let a crafted preset drop a file anywhere the user could write."*
   The conclusion (arbitrary write is reachable) is right; the attribution is wrong. With
   `contextIsolation` at its Electron default of `true` — and `main.js:366-369` does not set it —
   the renderer's main world has **no `require` and no Node globals**. The write primitive is
   supplied entirely by `electronBridge.autoSaveToFile` → `ipcMain.on('autoSaveToFile')` →
   `saveToFile`, which does `fs.mkdirSync({recursive:true})` + `fs.writeFile` on an unvalidated
   renderer-supplied path. `nodeIntegration: true` is a separate defect: it removes the renderer from
   the Chromium OS sandbox. Corroborating evidence that the main world had no Node: the app's own
   Electron test is `window.electronBridge ? true : false` (`ophis_utils.js:647`), and the only
   `require` in 500 KB of renderer source is commented out and guarded by
   `typeof require !== 'undefined'` (`ophis_main.js:462-470`).

4. **`docs/DEVIATIONS.md §3`** — *"…in v12 re-enabling it crashed init anyway."*
   Not quite. Re-enabling `FEATURE_FLAG__REQUIRE_SIGN_IN` alone leaves `init` and the password dialog
   working; the `ReferenceError: sha512 is not defined` fires only when the **Sign In button is
   clicked**, because `hashAccount` (`ophis_utils.js:664-666`) is called from the `onNoOrOk` handler
   (`ophis_main.js:155`) and `lib/sha512.min.js` is commented out at `ophis.html:67`. The gate
   becomes un-passable, not un-reachable. Reviving it needs the flag **and** that script tag.
   (§3's core claim — five hard-coded SHA-512 hashes, checked in the renderer, therefore decoration —
   is confirmed exactly: `ophis_config.js:5-11`.)

5. **`docs/DEVIATIONS.md §10` and `00-BUILD-SPEC.md`** do not mention the **headless CLI** as a
   not-carried-over feature. It is a substantial, undocumented v12 capability — six flags, defined
   exit codes, a console-to-stdout bridge, and single/multi-file CSV emission — and it is the one
   part of the original that a Node port of `src/core/` could reproduce cheaply and usefully
   (`node cast.mjs run.oph --output-path ./out --multiple-files`). Worth adding to the "Not carried
   over" table rather than leaving implicit.

6. **`docs/DEVIATIONS.md §1`** says the original CSP situation only in passing. Concretely: v12's
   CSP (`ophis.html:72`) **requires** `'unsafe-eval'`, because
   `ophis_model__validation.js:1` runs `new Function` at module scope. The rewrite's
   `index.html:12` CSP (`script-src 'self'`) is the direct consequence of removing that, which is
   worth stating as the causal chain it is. Two further facts about the original CSP belong in the
   record: the meta tag sits **after** all 28 library `<script>` tags, so it does not govern them;
   and `webContents.executeJavaScript` — which is how *all* main→renderer communication happens —
   bypasses CSP entirely.

7. **`README.md:101-108`** — *"What is deliberately different — no `eval`, no arbitrary-path writes,
   no client-side sign-in theatre, and 'today' read from the clock rather than baked in"*. All four
   hold up against the newly opened material. Two additions the sentence could carry, both now
   verified rather than assumed: **no `executeJavaScript` string-concatenation channel** (sixteen
   sites in `main.js`, six of them carrying interpolated data through a two-character escape
   function), and **no unsandboxed renderer**.

8. **Nothing in the newly opened material contradicts the engine, the operations, the MSRF set, the
   scoring, or the `.oph` format.** The `src/` tree inside `app.asar` matches
   `Ophis_v12_Browser/src/` file-for-file and line-for-line where checked. Specs 01–05 and 07–15 need
   no revision from this pass. The parity guarantee in `tests/parity.test.mjs` is untouched.

---

## 12. BUG / DEAD-CODE LEDGER FOR THIS SUBSYSTEM

| # | Location | Class | Description |
|---|---|---|---|
| B-1 | `main.js:534` (and `v9:277`) | bug | `logToRenderer("Received open-file: " + path)` interpolates the Node `path` **module**, not `filePath`. Survived v9→v12. |
| B-2 | `main.js:474`, `149` | dead | `BrowserWindow` has no `'beforeunload'` event; listener and its removal never fire. |
| B-3 | `main.js:509-510` | bug | `Will process .oph file in headless mode: null` printed on every GUI launch. |
| B-4 | `main.js:512-520` | bug | `--output-path` is validated (and can exit 1) in **GUI** mode, where it is unused. |
| B-5 | `main.js:372-386` | bug / dead | `did-fail-load` has no recovery — the remediation block is commented out and points at a non-existent `index.html`. `JSON.stringify(event)` on line 374 may throw on the circular `sender`. |
| B-6 | `main.js:314` | latent | `message` is interpolated into `executeJavaScript` **unescaped**. Safe only because all three call sites pass string literals. |
| B-7 | `main.js:211` | bug | `refreshMenuOptions` hardcodes `signedIn = true`, so any renderer call re-enables the gated menu items. |
| B-8 | `main.js:278` | bug | `win.webContents` dereferenced from an `fs` callback with no null guard. |
| B-9 | `main.js:97-111` | wart | `getArgFlagValue` supports only `--flag value`, never `--flag=value`; a trailing flag silently yields the default. |
| B-10 | `main.js:267-283` | security | `saveToFile` — arbitrary path, arbitrary contents, plus recursive directory creation. See §4.4. |
| B-11 | `ophis_utils.js:236-249` → `ophis_main.js:69-77` | bug | `parseIntElse` returns `NaN` instead of `elseValue` (`NaN != null` is `true`), so `--current-epoch-millis <garbage>` is silently ignored rather than erroring. See §7.5. |
| B-12 | `ophis_controller.js:56-64` + `ophis_view__utils.js:440-449` | bug | Cancelling the minify warning leaves the File-menu checkbox visually ticked and out of sync with the model. |
| B-13 | `main.js:527` | typo | `"No .oph file specificed, bailing out."` |
| B-14 | `main.js:450-453` | misleading | `onSuccessExeuctingInit` (also a typo) reports success as soon as `init()`'s first synchronous tick returns; `init` is internally asynchronous. |
| B-15 | `main.js:171-199` | dead | `resetProgram`'s `try{}catch{}` swallows everything; 18 lines of commented-out `loadURL` experiment retained. |
| B-16 | `main.js:122-136` | wart | `openFileExplorer` does not check for dialog cancellation; logs `"Chose file to open: undefined"`. |
| B-17 | `ophis.html:72` | security | CSP meta tag placed after all 28 library `<script>` tags, so it does not govern them; `base-uri` and `form-action` unset with no fallback; `gap:` is a vestigial Cordova scheme. |
| B-18 | `ophis.html:7` | wart | `<title></title>` is empty; the window title is URL-derived until `ophis_view.js:88-89` runs. |
| B-19 | `ophis.html:251` | wart | `#app-version` hardcodes `v7` in markup; overwritten at runtime from `package.json`. |
| B-20 | `main.js:362-370` | wart | `show: true` + `width/height: 800x600` + a later `win.maximize()` produces a visible small-window flash at every GUI launch; with `--inspect*` the 1000 ms delay makes it a one-second blank window. |
| B-21 | `main.js:739` | posture | `toggleDevTools` ships in the release menu, which combined with B-10 is a one-line arbitrary file write from the console. |
| B-22 | `ophis_view__export.js:86,118,122` | wart | Headless output paths built with a hardcoded `"/"` rather than `path.join`, producing mixed separators on Windows. |
