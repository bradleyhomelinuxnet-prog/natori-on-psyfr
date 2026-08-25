/**
 * Public entry point for operation equations: compile a string into a pure
 * function of Y, plus the anchor it projects from.
 *
 *   const op = compileOperation('X2+YxOPH_PHI');
 *   op.start  // 'X2'
 *   op.fn(1000)  // 1618.03…
 *
 * Compilation is parse + evaluate over an AST. No `new Function`, no `eval`.
 */

import { parseBody } from './parser.js';
import { EquationError } from './tokenizer.js';
import { CONSTANTS } from './constants.js';
import { FUNCTIONS } from './functions.js';

export { EquationError } from './tokenizer.js';
export { CONSTANTS, CONSTANT_NOTES } from './constants.js';
export { FUNCTIONS, FUNCTION_NOTES, oph_flip } from './functions.js';

/** Walk the AST for a given Y. Depth is bounded by the equation's own nesting. */
function evaluate(node, Y) {
  switch (node.t) {
    case 'num':
      return node.v;
    case 'var':
      return Y;
    case 'const':
      return CONSTANTS[node.name];
    case 'neg':
      return -evaluate(node.arg, Y);
    case 'call':
      return FUNCTIONS[node.name](evaluate(node.arg, Y));
    case 'bin': {
      const l = evaluate(node.l, Y);
      const r = evaluate(node.r, Y);
      switch (node.op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          return l / r;
      }
      break;
    }
  }
  throw new EquationError(`cannot evaluate node "${node.t}"`);
}

/**
 * Compile an equation string.
 *
 * @param {string} raw e.g. "X2+YxOPH_PHI"
 * @returns {{eq: string, start: 'X1'|'X2', ast: object, fn: (Y: number) => number}}
 * @throws {EquationError}
 */
export function compileOperation(raw) {
  if (typeof raw !== 'string') throw new EquationError('equation must be a string');

  const eq = raw.trim();
  const compact = eq.replace(/\s+/g, '');

  let start;
  if (compact.startsWith('X1+')) start = 'X1';
  else if (compact.startsWith('X2+')) start = 'X2';
  else throw new EquationError('equation must start with "X1+" or "X2+"');

  const body = compact.slice(3);
  if (!body) throw new EquationError('equation has no body after the anchor');

  const ast = parseBody(body);

  // Smoke-test the way the original did, so a nonsense equation fails at edit
  // time rather than silently dropping every projection during a cast.
  const probe = evaluate(ast, 1000);
  if (typeof probe !== 'number' || !Number.isFinite(probe)) {
    throw new EquationError('equation does not evaluate to a finite number');
  }

  return { eq, start, ast, fn: (Y) => evaluate(ast, Y) };
}

/**
 * Validate without throwing — for live feedback in the equation editor.
 * @returns {{ok: true} | {ok: false, error: string, position: number|null}}
 */
export function validateOperation(raw) {
  try {
    compileOperation(raw);
    return { ok: true };
  } catch (e) {
    if (e instanceof EquationError) return { ok: false, error: e.message, position: e.position ?? null };
    return { ok: false, error: String(e && e.message ? e.message : e), position: null };
  }
}
