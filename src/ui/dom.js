/**
 * Minimal DOM helpers.
 *
 * There is deliberately no way to set markup here: `el()` only ever sets
 * `textContent`, and nothing in the app touches `innerHTML`. A label typed into
 * the anchor form, or loaded from a saved config, therefore cannot become
 * markup no matter what it contains.
 */

export const $ = (id) => document.getElementById(id);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/**
 * Create an element.
 *
 * @param {string} tag e.g. 'div', 'button.btn.sm', 'span#count'
 * @param {object} [attrs] attributes; `class`, `text`, `data`, and `on*`
 *   handlers are special-cased
 * @param {Array<Node|string>} [children]
 */
export function el(tag, attrs = {}, children = []) {
  const [name, ...rest] = tag.split(/(?=[.#])/);
  const node = document.createElement(name);

  for (const token of rest) {
    if (token[0] === '.') node.classList.add(token.slice(1));
    else if (token[0] === '#') node.id = token.slice(1);
  }

  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = [node.className, v].filter(Boolean).join(' ');
    else if (k === 'text') node.textContent = v;
    else if (k === 'data') for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }

  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }

  return node;
}

/** Replace an element's children in one shot. */
export function replace(parent, children) {
  parent.replaceChildren(...[].concat(children).filter(Boolean));
}

/** A full-width "nothing here yet" table row. */
export function emptyRow(colspan, message) {
  return el('tr', {}, [el('td', { colspan, class: 'empty', text: message })]);
}

/** Wire a group of buttons so exactly one carries `.on`; calls back with its data-key. */
export function toggleGroup(container, dataKey, onPick) {
  if (!container) return;
  container.addEventListener('click', (e) => {
    const btn = e.target.closest(`button[data-${dataKey}]`);
    if (!btn || !container.contains(btn)) return;
    for (const b of container.querySelectorAll(`button[data-${dataKey}]`)) {
      b.classList.toggle('on', b === btn);
    }
    onPick(btn.dataset[dataKey], btn);
  });
}

/** Mark the active button in a group without firing the callback. */
export function setActive(container, dataKey, value) {
  if (!container) return;
  for (const b of container.querySelectorAll(`button[data-${dataKey}]`)) {
    b.classList.toggle('on', b.dataset[dataKey] === String(value));
  }
}
