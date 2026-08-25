/**
 * Recursive-descent parser for the operation grammar.
 *
 * Produces a small AST. Nothing here compiles or executes code — the original
 * handed its equation strings to `new Function`, which is exactly the property
 * this module exists to remove. See ../../../docs/DEVIATIONS.md.
 */

import { tokenize, TOKEN, EquationError } from './tokenizer.js';
import { CONSTANTS } from './constants.js';
import { FUNCTIONS } from './functions.js';

/**
 * AST nodes:
 *   { t: 'num',  v: number }
 *   { t: 'var',  name: 'Y' }
 *   { t: 'const', name: 'OPH_PHI' }
 *   { t: 'call', name: 'oph_round', args: [node, …] }
 *   { t: 'neg',  arg: node }
 *   { t: 'bin',  op: '+'|'-'|'*'|'/', l: node, r: node }
 */

/** Parse an equation body into an AST. Throws EquationError on anything unknown. */
export function parseBody(src) {
  const tokens = tokenize(src);
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const at = (type, value) => {
    const t = tokens[pos];
    return t.type === type && (value === undefined || t.value === value);
  };

  function parseExpression() {
    let left = parseTerm();
    while (at(TOKEN.OP, '+') || at(TOKEN.OP, '-')) {
      const op = next().value;
      left = { t: 'bin', op, l: left, r: parseTerm() };
    }
    return left;
  }

  function parseTerm() {
    let left = parseUnary();
    while (at(TOKEN.OP, '*') || at(TOKEN.OP, '/')) {
      const op = next().value;
      left = { t: 'bin', op, l: left, r: parseUnary() };
    }
    return left;
  }

  function parseUnary() {
    if (at(TOKEN.OP, '-')) {
      next();
      return { t: 'neg', arg: parseUnary() };
    }
    if (at(TOKEN.OP, '+')) {
      next();
      return parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const t = peek();

    if (t.type === TOKEN.NUMBER) {
      next();
      return { t: 'num', v: t.value };
    }

    if (t.type === TOKEN.LPAREN) {
      next();
      const inner = parseExpression();
      if (!at(TOKEN.RPAREN)) throw new EquationError('missing ")"', peek().pos);
      next();
      return inner;
    }

    if (t.type === TOKEN.IDENT) {
      next();
      const name = t.value;

      if (name === 'Y') return { t: 'var', name: 'Y' };

      if (Object.hasOwn(CONSTANTS, name)) return { t: 'const', name };

      if (Object.hasOwn(FUNCTIONS, name)) {
        if (!at(TOKEN.LPAREN)) throw new EquationError(`"${name}" needs an argument in parentheses`, t.pos);
        next();

        const args = [parseExpression()];
        while (at(TOKEN.COMMA)) {
          next();
          args.push(parseExpression());
        }
        if (!at(TOKEN.RPAREN)) throw new EquationError(`missing ")" after ${name}(`, peek().pos);
        next();

        const arity = FUNCTIONS[name].length;
        if (args.length !== arity) {
          throw new EquationError(
            `${name}() takes ${arity} argument${arity === 1 ? '' : 's'}, got ${args.length}`,
            t.pos
          );
        }
        return { t: 'call', name, args };
      }

      if (name === 'X1' || name === 'X2') {
        throw new EquationError(
          `"${name}" may only appear as the "${name}+" prefix, not inside the equation`,
          t.pos
        );
      }

      throw new EquationError(`unknown name "${name}"`, t.pos);
    }

    if (t.type === TOKEN.END) throw new EquationError('equation ends unexpectedly', t.pos);

    throw new EquationError(`unexpected "${t.value}"`, t.pos);
  }

  const ast = parseExpression();
  if (!at(TOKEN.END)) throw new EquationError(`unexpected "${peek().value}"`, peek().pos);
  return ast;
}
