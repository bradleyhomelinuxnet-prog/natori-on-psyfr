/**
 * Page chrome: theme, text size, simple/full density, and the toast.
 *
 * Preferences persist in localStorage so the page opens the way it was left.
 */

import { $ } from './dom.js';
import { set, state } from '../state/store.js';

const KEY = 'natori.prefs';

function save() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ theme: state.theme, zoom: state.zoom, simple: state.simple })
    );
  } catch {
    /* private mode — preferences just won't persist */
  }
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = $('themeBtn');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☾ Dark' : '☀ Light';
    btn.setAttribute('aria-pressed', String(theme === 'light'));
  }
}

function applyZoom(zoom) {
  document.documentElement.style.setProperty('--zoom', String(zoom));
}

function applySimple(simple) {
  document.body.classList.toggle('simple', simple);
  const btn = $('modeBtn');
  if (btn) {
    btn.textContent = simple ? '✦ Simple' : '◈ Full';
    btn.setAttribute('aria-pressed', String(simple));
    btn.title = simple
      ? 'Showing the essentials — click for every panel'
      : 'Hide the deep panels — just seed, cast, and read';
  }
}

let toastTimer = null;

/** Brief confirmation at the bottom of the page. */
export function toast(message) {
  const node = $('toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2200);
}

export function initChrome() {
  const prefs = load();
  // Dark is the signature look and is what index.html paints before this runs.
  // Deriving it from prefers-color-scheme instead would flash the wrong theme,
  // and the CSP rules out the usual inline pre-paint script.
  const theme = prefs.theme === 'light' ? 'light' : 'dark';
  const zoom = prefs.zoom ?? 1;
  const simple = prefs.simple ?? false;

  set({ theme, zoom, simple });
  applyTheme(theme);
  applyZoom(zoom);
  applySimple(simple);

  $('themeBtn')?.addEventListener('click', () => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    set({ theme: next });
    applyTheme(next);
    save();
  });

  $('modeBtn')?.addEventListener('click', () => {
    const next = !state.simple;
    set({ simple: next });
    applySimple(next);
    save();
  });

  const step = (delta) => {
    const next = Math.min(1.6, Math.max(0.8, Math.round((state.zoom + delta) * 100) / 100));
    set({ zoom: next });
    applyZoom(next);
    save();
  };

  $('tsDown')?.addEventListener('click', () => step(-0.1));
  $('tsUp')?.addEventListener('click', () => step(0.1));
  $('tsReset')?.addEventListener('click', () => {
    set({ zoom: 1 });
    applyZoom(1);
    save();
  });
}
