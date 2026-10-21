/**
 * Bootstrap.
 *
 * Wires each screen to its host element and re-renders the active one when the
 * store changes. Every initialisation runs inside a try, so a screen that fails
 * costs you that screen rather than the application — which is the difference
 * between a bug and an outage.
 */

import { $ } from './ui/dom.js';
import {
  state, subscribe, loadOptions, restoreDocument, persistDocument,
  recalculate, seedExample, saveOptions,
} from './state/ophis-store.js';
import { setEclipseSource, isEclipseSource } from './core/eclipses.js';
import { serialiseDocumentV12, safeFilename } from './io/oph.js';
import { download } from './io/download.js';
import { initShell, goto, toast, confirmDialog } from './ui/ophis/shell.js';
import { renderRail, renderStatus } from './ui/ophis/work.js';
import { renderResults, renderColumnToggles } from './ui/ophis/results.js';
import { createChart, chartLegend } from './ui/ophis/chart.js';
import {
  renderOperations, renderSettings, renderSwap, renderImport,
  renderExport, renderZExport, renderAudit, renderAbout,
} from './ui/ophis/screens.js';

/** Run `fn`, reporting rather than propagating a failure. */
function safely(name, fn) {
  try {
    return fn();
  } catch (err) {
    console.error(`[ophis] ${name} failed`, err);
    return null;
  }
}

/**
 * Save As: write the whole document to an .oph file the user names and places.
 *
 * The file is the original Ophis v12 form (MM/DD/YYYY dates, app_version "12"),
 * the same bytes as Export → Save for Ophis v12, so it opens in the desktop
 * .exe and in this app alike. Where the browser offers a real save dialog
 * (Chrome, Edge) the user picks the folder and name; elsewhere it falls back to
 * a download under a name taken from the first Iso-Event.
 */
async function saveAs(render) {
  const { text, notes } = serialiseDocumentV12(state.document, {
    prettify: state.options.prettify_oph_files !== false,
  });
  if (notes.length) {
    const ok = await confirmDialog({
      title: 'Some settings have no v12 equivalent',
      body: [...notes, 'Everything else, including every operation and X-Date, carries over unchanged.'],
      cancel: 'NO, cancel',
      confirm: 'YES, save anyway',
    });
    if (!ok) return;
  }

  const first = state.document?.iso_events?.[0]?.name;
  const suggested = `${safeFilename(first, 'Ophis')}.oph`;
  const blob = new Blob([text], { type: 'application/json' });
  let written = suggested;

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: suggested,
        types: [{ description: 'Ophis document', accept: { 'application/json': ['.oph'] } }],
      });
      const out = await handle.createWritable();
      await out.write(blob);
      await out.close();
      written = handle.name;
    } catch (err) {
      // Closing the dialog is a choice, not a failure: save nothing.
      if (err?.name === 'AbortError') return;
      // Anything else (a sandboxed frame, a blocked folder): hand it over as a
      // download instead, so the click still produces a file.
      download(blob, suggested);
    }
  } else {
    download(blob, suggested);
  }

  persistDocument();
  // Only a lossless copy counts as saving the document.
  if (!notes.length) state.saved = true;
  toast(`Saved ${written}`);
  render();
}

function main() {
  loadOptions();
  // A corrupt or older stored value must not throw the boot; fall back silently
  // to the default table, which is what that user was already being shown.
  if (isEclipseSource(state.options.eclipse_table)) setEclipseSource(state.options.eclipse_table);
  else state.options.eclipse_table = 'original';

  const paintShell = initShell();
  const chart = createChart($('timeline'));
  $('chartLegend').append(chartLegend());

  // The Recentre button mirrors the chart's viewport; the chart announces a
  // change rather than the button polling for one.
  const recenterBtn = $('recenterChart');
  const syncRecenter = () => {
    recenterBtn.disabled = !chart.isZoomed();
  };
  recenterBtn.onclick = () => chart.recenter();
  document.addEventListener('ophis:chartview', syncRecenter);

  // Restore what was on screen last time; seed a worked example on a first run,
  // so the app is never a blank page that gives no clue what it is for.
  if (!restoreDocument()) seedExample();
  recalculate();

  const renderers = {
    work: () => {
      safely('rail', () => renderRail($('railHost')));
      safely('status', () => renderStatus($('statusHost')));
      safely('columns', () => renderColumnToggles($('columnToggles')));
      safely('results', () => renderResults($('resultsHost')));
      safely('chart', () => chart.render());
      syncRecenter();
    },
    operations: () => renderOperations($('operationsHost')),
    settings: () => renderSettings($('settingsHost')),
    swap: () => renderSwap($('swapHost')),
    import: () => renderImport($('importHost')),
    export: () => renderExport($('exportHost')),
    zexport: () => renderZExport($('zexportHost')),
    audit: () => renderAudit($('auditHost')),
    about: () => renderAbout($('aboutHost')),
  };

  const render = () => {
    paintShell();
    safely(`screen:${state.screen}`, renderers[state.screen] ?? renderers.work);
  };

  subscribe(render);
  render();

  // Cross-highlight: the chart and the table drive each other through one event
  // rather than reaching into each other's DOM.
  document.addEventListener('ophis:highlight', () => {
    if (state.screen !== 'work') return;
    for (const tr of document.querySelectorAll('#resultsHost tbody tr')) {
      tr.dataset.highlight = String(tr.dataset.key === state.highlightKey);
    }
    safely('chart', () => chart.render());
  });

  // Keep the canvas crisp through resizes and theme changes.
  addEventListener('resize', () => {
    if (state.screen === 'work') safely('chart', () => chart.render());
  });

  // Persist on the way out, so a reload never loses the working document.
  addEventListener('beforeunload', () => {
    safely('persist', persistDocument);
    safely('options', saveOptions);
  });

  // Save As, top left of the bar; Ctrl/Cmd+Shift+S does the same.
  const saveAsBtn = $('saveAsBtn');
  if (saveAsBtn) {
    saveAsBtn.onclick = () => safely('saveAs', () =>
      saveAs(render).catch((err) => {
        console.error('[ophis] saveAs failed', err);
        toast('Could not save the file.', 'error');
      })
    );
  }

  // Ctrl/Cmd+S saves the document to storage rather than letting the browser
  // offer to save the page, which is never what is wanted here.
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveAsBtn?.click();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      persistDocument();
      state.saved = true;
      toast('Saved');
      render();
    }
  });

  window.ophis = { state, goto, recalculate };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main, { once: true });
} else {
  main();
}
