/**
 * The operations panel: the loaded equation pack, the custom-equation editor,
 * the pack switcher, the scoring-lens toggle and the resonance-set toggle.
 *
 * Changing the LENS or the RESONANCE SET re-runs the cast in place (same
 * projections, new weights), because that is a pure re-score the user expects
 * to see immediately.
 * Changing the OPERATIONS does not — a different pack projects different dates,
 * which is a new cast the user asks for with the Cast button.
 */

import { $, el, replace, setActive, toggleGroup } from '../dom.js';
import { toast } from '../chrome.js';
import {
  isKnownPack,
  makeOperation,
  packOperations,
  set,
  state,
  subscribe,
  touch,
} from '../../state/store.js';
import { validateOperation } from '../../core/equation/index.js';
import { getLens, lensList } from '../../core/scoring/index.js';
import { cast } from '../../core/cast.js';
import { PACKS } from '../../data/packs.js';
import { MSRF_SETS } from '../../data/msrf.js';

const WATCHED = new Set(['operations', 'packName', 'lens', 'msrfSet']);

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

let ui = null;

/* ---------- rows ---------- */

function operationRow(op, index) {
  const live = op.enabled && !op.error;

  const detail = op.error
    ? // `.arow .lbl small` out-specifies `.errline`, so the colour goes inline.
      el('small', { style: 'color:var(--red)', text: `✕ ${op.error}` })
    : el('small', { text: `from ${op.start}` });

  const check = el('button.chk', {
    type: 'button',
    class: live ? 'on' : null,
    'aria-pressed': String(live),
    'aria-label': 'Enable or disable this operation',
    disabled: Boolean(op.error),
    title: op.error ? 'This equation does not compile' : null,
    text: live ? '✓' : '',
    onclick: () => toggleOperation(op),
  });

  const remove = el('button.xbtn', {
    type: 'button',
    'aria-label': 'Remove this operation',
    title: 'remove',
    text: '✕',
    onclick: () => removeOperation(op),
  });

  return el('div.arow', { class: live ? null : 'off' }, [
    el('div.ord', { text: String(index + 1) }),
    el('div.lbl', {}, [el('span.mono', { text: op.eq }), detail]),
    el('div.ctrls', {}, [check, remove]),
  ]);
}

function renderList() {
  const ops = state.operations;
  replace(
    ui.list,
    ops.length
      ? ops.map(operationRow)
      : [el('div.empty', { text: 'No operations — restore the pack, or add one below.' })]
  );
}

/* ---------- headline copy ---------- */

function renderSummary() {
  const ops = state.operations;
  const enabled = ops.filter((o) => o.enabled).length;
  const packSize = PACKS[state.packName]?.length ?? 0;

  if (ui.summary) {
    // Several packs are already named "… Pack", so don't append the word again.
    const packLabel = /pack$/i.test(state.packName) ? state.packName : `${state.packName} pack`;
    // "edited" only makes sense against a pack we can size. An imported set has
    // no entry in PACKS, so there is nothing to have diverged from.
    const known = Object.hasOwn(PACKS, state.packName);
    const head =
      !known || ops.length === packSize ? `The ${packLabel} is loaded` : `The ${packLabel}, edited`;
    const tail = enabled ? `${enabled} enabled.` : 'none enabled — the cast needs at least one.';
    ui.summary.textContent = `${head} — ${plural(ops.length, 'equation')}, ${tail}`;
  }

  if (ui.hint) ui.hint.textContent = `${plural(ops.length, 'equation')} · add your own`;
}

/* ---------- mutations ---------- */

function toggleOperation(op) {
  if (op.error) return;
  op.enabled = !op.enabled;
  touch('operations');
}

function removeOperation(op) {
  const i = state.operations.indexOf(op);
  if (i < 0) return;
  state.operations.splice(i, 1);
  touch('operations');
}

function loadPack(name) {
  const ops = packOperations(name);
  if (!ops) {
    setActive(ui.packBar, 'pack', state.packName);
    return;
  }
  set({ operations: ops, packName: name });
  toast(`Loaded "${name}" (${plural(ops.length, 'op')})`);
}

function resetPack() {
  // After an import, packName is something like "Imported · Giza" and there is
  // nothing to restore it to. Refusing beats silently loading the default pack.
  const ops = packOperations(state.packName);
  if (!ops) {
    toast(`"${state.packName}" isn't a built-in pack — load one below to replace it.`);
    return;
  }
  set({ operations: ops });
  toast(`Restored "${state.packName}" (${plural(ops.length, 'op')})`);
}

/** The reset button only means something for a built-in pack. */
function syncResetButton() {
  if (!ui.reset) return;
  const known = isKnownPack(state.packName);
  ui.reset.disabled = !known;
  ui.reset.style.opacity = known ? '' : '0.45';
  ui.reset.title = known
    ? `Restore the ${state.packName} pack`
    : 'This set was imported — there is no pack to restore it to';
}

/* ---------- custom equation editor ---------- */

function setError(message) {
  if (ui.err) ui.err.textContent = message;
}

function setAddEnabled(ok) {
  if (!ui.add) return;
  ui.add.disabled = !ok;
  // components.css carries no :disabled rule for .btn — dim it so a blocked
  // button does not read as clickable.
  ui.add.style.opacity = ok ? '' : '0.45';
}

/** Live feedback while typing; also decides whether Add is available. */
function reviewInput() {
  if (!ui.input) return null;
  const raw = ui.input.value.trim();
  if (!raw) {
    setError('');
    setAddEnabled(false);
    return null;
  }
  const verdict = validateOperation(raw);
  // EquationError.position indexes the whitespace-stripped body rather than the
  // raw field, so it cannot be mapped back to a caret — only the message shows.
  setError(verdict.ok ? '' : `✕ ${verdict.error}`);
  setAddEnabled(verdict.ok);
  return verdict.ok ? raw : null;
}

function addFromInput() {
  if (!ui.input) return;
  const raw = reviewInput();
  if (!raw) return;
  state.operations.push(makeOperation(raw));
  touch('operations');
  ui.input.value = '';
  reviewInput();
  toast('Operation added');
}

/* ---------- scoring lens & resonance set ---------- */

/**
 * Re-score the standing projections under a patched lens / resonance set.
 *
 * Both are pure re-scores of the same dates, so they apply without a new cast —
 * which means re-running against the SNAPSHOT the last cast was built from, not
 * against the live inputs. Reading live state here would silently fold in any
 * anchor or operation edited since, destroying projections the user never asked
 * to recast.
 */
function rescore(patch, note) {
  const snapshot = state.lastCast;
  const recast = state.hasCast && snapshot;
  if (recast) {
    const next = { ...state, ...patch };
    patch.results = cast(
      snapshot.anchors,
      snapshot.operations,
      next.lens,
      state.referenceYear,
      MSRF_SETS[next.msrfSet].numbers
    );
    // The resonance set is part of what the standing results were scored under.
    if (patch.msrfSet) patch.lastCast = { ...snapshot, msrfSet: patch.msrfSet };
  }
  set(patch);
  if (recast) toast(`Re-scored · ${note}`);
}

function pickLens(id) {
  const lens = getLens(id);
  rescore({ lens: lens.id }, lens.id);
}

function pickMsrfSet(name) {
  if (!MSRF_SETS[name]) {
    setActive(ui.msrfTog, 'mset', state.msrfSet);
    return;
  }
  rescore({ msrfSet: name }, MSRF_SETS[name].label);
}

function renderLens() {
  const lens = getLens(state.lens);
  setActive(ui.sysTog, 'sys', lens.id);
  if (ui.sysNote) ui.sysNote.textContent = lens.note;
}

function renderMsrfSet() {
  setActive(ui.msrfTog, 'mset', state.msrfSet);
  if (ui.msrfNote) {
    const { numbers, tiered } = MSRF_SETS[state.msrfSet];
    ui.msrfNote.textContent = tiered
      ? `${numbers.size} numbers, tiered by dimensions of arithmetic`
      : `${numbers.size} numbers, untiered`;
  }
}

/* ---------- one-time construction ---------- */

function buildPackBar() {
  if (!ui.packBar) return;
  replace(
    ui.packBar,
    Object.keys(PACKS).map((name) =>
      el('button.btn.sm.violet', { type: 'button', data: { pack: name }, text: name })
    )
  );
  toggleGroup(ui.packBar, 'pack', loadPack);
}

function buildLensToggle() {
  if (!ui.sysTog) return;
  replace(
    ui.sysTog,
    lensList().map((lens) =>
      el('button', { type: 'button', data: { sys: lens.id }, text: lens.label })
    )
  );
  toggleGroup(ui.sysTog, 'sys', pickLens);
}

function buildMsrfToggle() {
  if (!ui.msrfTog) return;
  replace(
    ui.msrfTog,
    Object.entries(MSRF_SETS).map(([name, s]) =>
      el('button', { type: 'button', data: { mset: name }, text: s.label })
    )
  );
  toggleGroup(ui.msrfTog, 'mset', pickMsrfSet);
}

function wireEditor() {
  if (!ui.input) return;
  ui.input.addEventListener('input', reviewInput);
  ui.input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    addFromInput();
  });
  ui.add?.addEventListener('click', addFromInput);
}

function render() {
  renderList();
  renderSummary();
  setActive(ui.packBar, 'pack', state.packName);
  syncResetButton();
  renderLens();
  renderMsrfSet();
}

export function initOperations() {
  ui = {
    list: $('opList'),
    summary: $('opSummary'),
    hint: $('opHint'),
    input: $('opInput'),
    add: $('addOp'),
    err: $('opErr'),
    reset: $('resetOps'),
    packBar: $('packBar'),
    sysTog: $('sysTog'),
    sysNote: $('sysNote'),
    msrfTog: $('msrfTog'),
    msrfNote: $('msrfNote'),
  };
  if (!ui.list) return;

  buildPackBar();
  buildLensToggle();
  buildMsrfToggle();
  wireEditor();
  ui.reset?.addEventListener('click', resetPack);

  subscribe((_, changed) => {
    if (changed.some((k) => WATCHED.has(k))) render();
  });

  render();
  reviewInput();
}
