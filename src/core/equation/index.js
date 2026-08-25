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
import { getReckoning } from './reckonings.js';

export { EquationError } from './tokenizer.js';
export { CONSTANTS, CONSTANT_NOTES } from './constants.js';
export { FUNCTIONS, FUNCTION_NOTES, oph_flip } from './functions.js';
export { RECKONINGS, DEFAULT_RECKONING, getReckoning } from './reckonings.js';

/**
 * Walk the AST for a given Y. Depth is bounded by the equation's own nesting.
 *
 * `env` carries the reckoning's constant and function tables; the two
 * reckonings disagree on OPH_PHI and on what oph_flip does with a negative, so
 * the same AST can legitimately evaluate to two different numbers.
 */
function evaluate(node, Y, env) {
  switch (node.t) {
    case 'num':
      return node.v;
    case 'var':
      return Y;
    case 'const':
      return env.constants[node.name];
    case 'neg':
      return -evaluate(node.arg, Y, env);
    case 'call':
      return env.functions[node.name](...node.args.map((a) => evaluate(a, Y, env)));
    case 'bin': {
      const l = evaluate(node.l, Y, env);
      const r = evaluate(node.r, Y, env);
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
 * @param {string} [reckoningId] which constant/function tables to resolve
 *        against. Defaults to `chronicon`, which is what the parity fixtures
 *        and every existing caller expect.
 * @returns {{eq: string, start: 'X1'|'X2', ast: object, fn: (Y: number) => number}}
 * @throws {EquationError}
 */
export function compileOperation(raw, reckoningId) {
  const env = getReckoning(reckoningId);
  if (typeof raw !== 'string') throw new EquationError('equation must be a string');

  const eq = raw.trim();
  const compact = eq.replace(/\s+/g, '');

  let start;
  if (compact.startsWith('X1+')) start = 'X1';
  else if (compact.startsWith('X2+')) start = 'X2';
  else throw new EquationError('equation must start with "X1+" or "X2+"');

  const body = compact.slice(3);
  if (!body) throw new EquationError('equation has no body after the anchor');

  const ast = parseBody(body, env);

  // Smoke-test the way the original did, so a nonsense equation fails at edit
  // time rather than silently dropping every projection during a cast.
  const probe = evaluate(ast, 1000, env);
  if (typeof probe !== 'number' || !Number.isFinite(probe)) {
    throw new EquationError('equation does not evaluate to a finite number');
  }

  return { eq, start, ast, reckoning: env.id, fn: (Y) => evaluate(ast, Y, env) };
}

/**
 * Validate without throwing — for live feedback in the equation editor.
 * @returns {{ok: true} | {ok: false, error: string, position: number|null}}
 */
export function validateOperation(raw, reckoningId) {
  try {
    compileOperation(raw, reckoningId);
    return { ok: true };
  } catch (e) {
    if (e instanceof EquationError) return { ok: false, error: e.message, position: e.position ?? null };
    return { ok: false, error: String(e && e.message ? e.message : e), position: null };
  }
}
