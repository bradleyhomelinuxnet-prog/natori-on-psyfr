/**
 * Lexer for the Ophis operation grammar.
 *
 * The grammar is deliberately tiny:
 *
 *   equation := ("X1" | "X2") "+" body
 *   body     := term (("+" | "-" | "*" | "/") term)*
 *   term     := number | "Y" | CONSTANT | FUNCTION "(" body ")" | "(" body ")" | "-" term
 *
 * `x` and `×` are accepted as multiplication, which is how the original wrote
 * its equations ("X2+YxOPH_PHI"). Whitespace is insignificant.
 */

export class EquationError extends Error {
  constructor(message, position = null) {
    super(message);
    this.name = 'EquationError';
    this.position = position;
  }
}

export const TOKEN = {
  NUMBER: 'number',
  IDENT: 'ident',
  OP: 'op',
  LPAREN: 'lparen',
  RPAREN: 'rparen',
  END: 'end',
};

const OPERATORS = new Set(['+', '-', '*', '/']);

/**
 * @param {string} src equation body (the part after `X1+` / `X2+`)
 * @returns {Array<{type: string, value: string|number, pos: number}>}
 */
export function tokenize(src) {
  const tokens = [];
  let i = 0;

  while (i < src.length) {
    const c = src[i];

    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }

    // `x` and `×` are multiplication aliases, and the original wrote them with
    // no spaces around them ("X2+YxOPH_PHI"). So a lowercase `x` is ALWAYS an
    // operator, never part of a name — which is why no constant or function may
    // contain one. See the identifier branch below, which stops at `x`.
    if (c === 'x' || c === '×') {
      tokens.push({ type: TOKEN.OP, value: '*', pos: i });
      i++;
      continue;
    }

    if (OPERATORS.has(c)) {
      tokens.push({ type: TOKEN.OP, value: c, pos: i });
      i++;
      continue;
    }

    if (c === '(') {
      tokens.push({ type: TOKEN.LPAREN, value: c, pos: i });
      i++;
      continue;
    }

    if (c === ')') {
      tokens.push({ type: TOKEN.RPAREN, value: c, pos: i });
      i++;
      continue;
    }

    if (c >= '0' && c <= '9') {
      const start = i;
      while (i < src.length && src[i] >= '0' && src[i] <= '9') i++;
      if (src[i] === '.') {
        i++;
        while (i < src.length && src[i] >= '0' && src[i] <= '9') i++;
      }
      tokens.push({ type: TOKEN.NUMBER, value: Number(src.slice(start, i)), pos: start });
      continue;
    }

    if (c === '.') {
      const start = i;
      i++;
      while (i < src.length && src[i] >= '0' && src[i] <= '9') i++;
      if (i === start + 1) throw new EquationError('stray "." in equation', start);
      tokens.push({ type: TOKEN.NUMBER, value: Number(src.slice(start, i)), pos: start });
      continue;
    }

    if (/[A-Za-z_]/.test(c)) {
      const start = i;
      // Note the exclusion of lowercase `x`: it is the multiplication operator,
      // so "YxOPH_PHI" lexes as Y * OPH_PHI rather than one long name.
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i]) && src[i] !== 'x') i++;
      tokens.push({ type: TOKEN.IDENT, value: src.slice(start, i), pos: start });
      continue;
    }

    throw new EquationError(`unexpected character "${c}"`, i);
  }

  tokens.push({ type: TOKEN.END, value: null, pos: src.length });
  return tokens;
}
