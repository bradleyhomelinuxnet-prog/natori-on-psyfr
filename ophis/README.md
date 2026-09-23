# Ophis v12 — browser build

This folder is **Ophis v12 exactly as it ships inside `Ophis_v12_Windows.exe`**, running in a web
browser instead of inside Electron. It has the same functions and screens and gives the same numbers.

## How it was made

The `.exe` is an Electron app. All of its logic lives in `resources/app.asar`. That archive holds:

| Part of the exe | What it does | In this folder |
|---|---|---|
| `ophis.html`, `src/*.js`, `src/ophis.css` | The whole app: engine, screens, chart, export | Copied **byte-for-byte** (`ophis.html` is now `index.html`) |
| `lib/*` | Third-party libraries (Chart.js, Leaflet, moment, jsPDF…) | Only the libraries `ophis.html` loads, copied byte-for-byte |
| `img/*` | Icons, moon/eclipse symbols, offline world-map tiles | Copied byte-for-byte |
| `main.js`, `preload.js` | Electron only: native File/Edit/View menu, open/save dialogs, calling `init()` | Replaced by `src/browser_bridge.js` |

Every copied file was checked against the archive and none differ. Only three things are new.

- **`src/browser_bridge.js`** provides `window.electronBridge`, the same object `preload.js` exposed.
  The app therefore sees itself as the desktop build and runs its desktop code paths unchanged.
  The bridge also draws the File / Edit / View menu from the same template as `main.js`, and it
  calls `init()` once the page has loaded.
- **`src/browser_bridge.css`** styles that menu bar.
- **`index.html`** differs from `ophis.html` in three small places. It declares UTF-8, it loads the
  two bridge files, and it hands the last script tag to the bridge so `init()` runs last.

## Running it

Serve the folder and open it in Chrome or Edge:

```bash
python -m http.server 8790 --directory ophis
```

Then open <http://localhost:8790/>. Opening `index.html` by double-clicking should also work,
because the original was built to run from disk. That route was not tested here.

## The menu, item by item

| Menu item | Desktop exe | Browser build |
|---|---|---|
| File › New File (Ctrl+N) | New session, warns if unsaved | Same. Most browsers keep Ctrl+N for a new window, so use the menu |
| File › Open… (Ctrl+O) | Native open dialog, `.oph` filter | Browser file picker, `.oph` filter |
| File › Save (Ctrl+S) | Writes the current file; with no file, acts as Save As | Same. In Chrome/Edge it writes back to the file you opened or saved |
| File › Save As… | Native save dialog | Browser save dialog in Chrome/Edge. Elsewhere it asks for a name and downloads |
| File › Quit (Ctrl+Q) | Asks if unsaved, then exits | Same question, then tries to close the tab |
| File › Prettify / Minify .oph Files | Checkbox toggles; Minify shows its warning | Identical |
| File › Reset Program | Clears everything after confirming | Identical |
| Edit › Cut / Copy / Paste / Delete / Select All | Standard | Standard |
| View › Operations Col Visible | Checkbox toggle | Identical |
| View › zoom and full screen | Electron zoom | Page zoom and browser full screen |
| View › Toggle Developer Tools | Opens DevTools | Not in the menu; press F12 |

Dropping a `.oph` file onto the window opens it. This replaces double-clicking a `.oph` file in
Windows Explorer.

## Verified in the browser

- Start-up ran all six `init` steps, the self-check and the unit tests with no console errors.
- The sample file `7-4-26-…-4-1-28.oph` loaded with 6 X-Dates and produced its Z-Date table.
- Editing the event name changed the title to "(Not Saved)". Ctrl+S saved and changed it to "(Saved)".
- Operations Col Visible, Prettify, and Minify with its warning dialog all toggled the real options.
- Export Z-Dates produced a real CSV, an Excel workbook and a PDF with the chart image.
- All eight screens rendered: About, Z-Dates, Operations, Import Events, Export Events,
  Export Z-Dates, Event Settings and Event Data Transfer.
- The offline map opened from its bundled tiles and closed with Escape.
- New File cleared the session. Zoom In and Actual Size resized and re-laid-out the panels.

## What cannot be the same in a browser

- **Command-line headless mode is not available.** The exe's `--headless --output-path …` batch
  CSV mode belongs to Electron's main process. The CSV export on the Export Z-Dates screen produces
  the same rows for one event at a time.
- **No file association.** Windows cannot open `.oph` files in a browser tab. Use File › Open or
  drag the file in.
- **Firefox and Safari have no File System Access API.** Save As downloads a new file each time
  there, instead of overwriting the one you opened.
