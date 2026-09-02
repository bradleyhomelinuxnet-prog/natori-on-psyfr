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
import { initShell, goto, toast } from './ui/ophis/shell.js';
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

function main() {
  loadOptions();

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

  // Ctrl/Cmd+S saves the document to storage rather than letting the browser
  // offer to save the page, which is never what is wanted here.
  addEventListener('keydown', (e) => {
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
