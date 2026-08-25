/**
 * NATORI-ON-PSYFR — bootstrap.
 *
 * Wires the panels to the DOM and to each other. Each panel owns its own region
 * of the page and subscribes to the store independently, so one that fails does
 * not take the rest down.
 */

import { $ } from './ui/dom.js';
import { initChrome, toast } from './ui/chrome.js';
import { initAnchors } from './ui/panels/anchors.js';
import { initOperations } from './ui/panels/operations.js';
import { initResults } from './ui/panels/results.js';
import { initConvergence } from './ui/panels/convergence.js';
import { initWheels } from './ui/panels/wheels.js';
import { initLedger } from './ui/panels/ledger.js';
import { initMethod } from './ui/panels/method.js';
import { saveConfig, loadConfigFile } from './io/config.js';

/** Run an init function, reporting rather than propagating a failure. */
function safely(name, fn) {
  try {
    fn();
  } catch (err) {
    console.error(`[natori] ${name} failed to initialise`, err);
  }
}

function initConfigIo() {
  const saveBtn = $('saveCfg');
  const loadBtn = $('loadCfg');
  const fileInput = $('loadFile');
  if (!saveBtn || !loadBtn || !fileInput) return;

  saveBtn.addEventListener('click', () => {
    saveConfig();
    toast('Setup saved');
  });

  loadBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const r = await loadConfigFile(file);
      const bits = [`${r.loaded} anchor${r.loaded === 1 ? '' : 's'}`, `${r.operations} operations`];
      if (r.invalid) bits.push(`${r.invalid} could not be parsed`);
      toast(`Loaded ${bits.join(' · ')}`);
      if (r.skipped.length) {
        console.warn('[natori] not imported from this file:', r.skipped.join(', '));
      }
    } catch (err) {
      toast(`Could not load: ${err.message}`);
    } finally {
      // Reset so choosing the same file twice fires `change` again.
      fileInput.value = '';
    }
  });
}

function main() {
  safely('chrome', initChrome);
  safely('anchors', initAnchors);
  safely('operations', initOperations);
  safely('results', initResults);
  safely('convergence', initConvergence);
  safely('wheels', initWheels);
  safely('ledger', initLedger);
  safely('method', initMethod);
  safely('config i/o', initConfigIo);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main, { once: true });
} else {
  main();
}
