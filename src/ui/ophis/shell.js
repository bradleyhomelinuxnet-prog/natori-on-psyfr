/**
 * The application shell: screen routing, the chrome in the top bar, and the
 * three shared surfaces every screen borrows — toasts, tooltips and dialogs.
 *
 * Screen identity lives in the store and is mirrored to `location.hash`, never
 * read back out of a control. That is what makes a deep link work and what
 * stops the back button from desynchronising the view from the state.
 */

import { $, el } from '../dom.js';
import { state, set, log, saveOptions, notify } from '../../state/ophis-store.js';

export const SCREENS = [
  { id: 'work', label: 'Work', title: 'The working surface',
    lede: 'Seed the controls, cast them through the operation table, and read which projections survive.' },
  { id: 'operations', label: 'Operations', title: 'The operation table',
    lede: 'Sixteen equations, each a pure function of Y. Weight decides Alpha from Beta, and feeds the score directly.' },
  { id: 'settings', label: 'Settings', title: 'Event settings',
    lede: 'Notes, and the hour a day is considered to begin.' },
  { id: 'swap', label: 'Transfer', title: 'Event data transfer',
    lede: 'Apply the settings of one Iso-Event to one or more others.' },
  { id: 'import', label: 'Import', title: 'Import events',
    lede: 'Paste a previously exported document.' },
  { id: 'export', label: 'Export', title: 'Export events',
    lede: 'The document as text — copy it, or write it to a file.' },
  { id: 'zexport', label: 'Z-Dates', title: 'Export Z-Dates',
    lede: 'The results as CSV, XLSX or PDF.' },
  { id: 'audit', label: 'Audit', title: 'Audit',
    lede: 'How a projection was derived, one arithmetic step at a time — and everything the engine wanted to tell you.' },
  { id: 'about', label: 'About', title: 'About',
    lede: 'What the numbers mean, where they came from, and what is deliberately different.' },
];

const isScreen = (id) => SCREENS.some((s) => s.id === id);

/* ----------------------------------------------------------------- routing -- */

export function goto(id, { push = true } = {}) {
  if (!isScreen(id)) id = 'work';
  if (state.screen === id && push) return;
  state.screen = id;
  if (push && location.hash.slice(1) !== id) location.hash = id;
  notify();
  // Announce for screen readers, and put the keyboard somewhere sensible.
  const heading = document.querySelector(`.screen[data-screen="${id}"] h1`);
  if (heading) heading.focus?.();
}

function initRouting() {
  const nav = $('screenNav');
  for (const s of SCREENS) {
    nav.append(
      el('button', {
        type: 'button',
        text: s.label,
        data: { screen: s.id },
        onclick: () => goto(s.id),
      })
    );
  }

  addEventListener('hashchange', () => goto(location.hash.slice(1), { push: false }));

  const initial = location.hash.slice(1);
  goto(isScreen(initial) ? initial : state.options.start_screen, { push: false });
}

/* ------------------------------------------------------------------ chrome -- */

const ZOOM_MIN = 0.8;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;

function applyZoom(value) {
  const z = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value)) * 10) / 10;
  state.options.text_zoom = z;
  document.documentElement.style.setProperty('--zoom', String(z));
  saveOptions();
}

function applyTheme(theme) {
  state.options.theme = theme;
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  saveOptions();
}

function initChrome() {
  applyZoom(Number(state.options.text_zoom) || 1);
  applyTheme(state.options.theme ?? 'dark');

  $('zoomDown').onclick = () => applyZoom((Number(state.options.text_zoom) || 1) - ZOOM_STEP);
  $('zoomReset').onclick = () => applyZoom(1);
  $('zoomUp').onclick = () => applyZoom((Number(state.options.text_zoom) || 1) + ZOOM_STEP);

  const themeBtn = $('themeBtn');
  const cycle = { dark: 'light', light: 'system', system: 'dark' };
  const face = { dark: '☾ Dark', light: '☀ Light', system: '◑ System' };
  const paint = () => {
    themeBtn.textContent = face[state.options.theme] ?? face.dark;
  };
  themeBtn.onclick = () => {
    applyTheme(cycle[state.options.theme] ?? 'light');
    paint();
  };
  paint();
}

/* ------------------------------------------------------------------ toasts -- */

const TOAST_MS = 2900;

/**
 * Show a message, and keep it.
 *
 * Every toast is mirrored to the activity log, because a toast that has faded
 * is a message the user cannot get back — which was the original author's own
 * complaint about them.
 */
export function toast(message, kind = 'info') {
  log(kind, message);
  const host = $('toasts');
  if (!host) return;
  const node = el('div.toast', { role: 'status', text: message });
  host.append(node);
  setTimeout(() => node.remove(), TOAST_MS);
}

/* ---------------------------------------------------------------- tooltips -- */

const TIP_DELAY = 750;
let tipTimer = null;
let tipHost = null;

/** Build the shared tooltip element once. */
function ensureTip() {
  if (!tipHost) {
    tipHost = el('div.tip', { role: 'tooltip' });
    document.body.append(tipHost);
  }
  return tipHost;
}

/**
 * Attach a tooltip to a node.
 *
 * @param {HTMLElement} node
 * @param {() => Array<[string, string]>} rows lazily built, so a table of 500
 *        pills does not construct 500 tooltips nobody hovers.
 */
export function tooltip(node, rows) {
  const show = (e) => {
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => {
      const tip = ensureTip();
      const dl = el('dl');
      for (const [k, v] of rows()) dl.append(el('dt', { text: k }), el('dd', { text: v }));
      tip.replaceChildren(dl);
      tip.dataset.show = 'true';

      // Place it near the cursor, then pull it back inside the viewport.
      const pad = 12;
      const r = tip.getBoundingClientRect();
      let x = e.clientX + pad;
      let y = e.clientY + pad;
      if (x + r.width > innerWidth - pad) x = e.clientX - r.width - pad;
      if (y + r.height > innerHeight - pad) y = e.clientY - r.height - pad;
      tip.style.left = `${Math.max(pad, x)}px`;
      tip.style.top = `${Math.max(pad, y)}px`;
    }, TIP_DELAY);
  };

  const hide = () => {
    clearTimeout(tipTimer);
    if (tipHost) tipHost.dataset.show = 'false';
  };

  node.addEventListener('mouseenter', show);
  node.addEventListener('mousemove', (e) => {
    if (tipHost?.dataset.show === 'true') return;
    show(e);
  });
  node.addEventListener('mouseleave', hide);
  // Keyboard users get the same detail, without the delay.
  node.addEventListener('focus', (e) => {
    const r = node.getBoundingClientRect();
    show({ clientX: r.left, clientY: r.bottom });
  });
  node.addEventListener('blur', hide);
  return node;
}

/* ----------------------------------------------------------------- dialogs -- */

/**
 * A modal confirm.
 *
 * Escape closes the whole thing, scrim included — the original removed only the
 * inner table and left a full-screen click-blocker behind. `<dialog>` gets that
 * right for free, which is most of why it is used here.
 *
 * @returns {Promise<boolean>}
 */
export function confirmDialog({ title, body, cancel = 'Cancel', confirm = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    const dlg = el('dialog', {}, [
      el('header', {}, [el('h3', { text: title })]),
      el('div.body', {}, [].concat(body).map((line) =>
        typeof line === 'string' ? el('p', { text: line }) : line
      )),
      el('footer', {}, [
        el('button.btn', { type: 'button', text: cancel, onclick: () => { dlg.close(); resolve(false); } }),
        el('button.btn', {
          type: 'button',
          class: danger ? 'danger' : 'primary',
          text: confirm,
          onclick: () => { dlg.close(); resolve(true); },
        }),
      ]),
    ]);

    dlg.addEventListener('close', () => { dlg.remove(); resolve(false); }, { once: true });
    document.body.append(dlg);
    dlg.showModal();
    dlg.querySelector('footer .btn:last-child')?.focus();
  });
}

/* -------------------------------------------------------------------- init -- */

export function initShell() {
  initChrome();
  initRouting();

  // Paint the screen switch and the saved badge on every state change.
  const badge = $('savedBadge');
  const render = () => {
    for (const s of SCREENS) {
      const panel = document.querySelector(`.screen[data-screen="${s.id}"]`);
      if (panel) panel.dataset.active = String(state.screen === s.id);
      const btn = document.querySelector(`#screenNav button[data-screen="${s.id}"]`);
      if (btn) {
        if (state.screen === s.id) btn.setAttribute('aria-current', 'page');
        else btn.removeAttribute('aria-current');
      }
    }
    badge.textContent = state.saved ? 'Saved' : 'Not saved';
    badge.dataset.dirty = String(!state.saved);
  };

  return render;
}
