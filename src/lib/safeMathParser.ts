/**
 * Safe recursive-descent mathematical expression parser & evaluator.
 * Never uses eval() or new Function().
 * Supports numbers, variable x, constants pi/e, +, -, *, /, ^, parentheses,
 * and functions: sin, cos, tan, asin, acos, atan, sqrt, abs, ln, log, exp, floor, ceil.
 */

type Token =
  | { type: 'num'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' };

const ALLOWED_FUNCTIONS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
};

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = expr.replace(/\s+/g, '');

  while (i < s.length) {
    const ch = s[i];
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let end = i;
      while (end < s.length && ((s[end] >= '0' && s[end] <= '9') || s[end] === '.')) {
        end++;
      }
      const val = Number(s.slice(i, end));
      if (!Number.isFinite(val)) throw new Error('Invalid number');
      tokens.push({ type: 'num', value: val });
      i = end;
      continue;
    }

    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
      let end = i;
      while (end < s.length && ((s[end] >= 'a' && s[end] <= 'z') || (s[end] >= 'A' && s[end] <= 'Z'))) {
        end++;
      }
      tokens.push({ type: 'ident', value: s.slice(i, end).toLowerCase() });
      i = end;
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }

    throw new Error(`Unsupported character: ${ch}`);
  }

  // Insert implicit multiplication: e.g., 2x -> 2 * x, xsin(x) -> x * sin(x), )( -> )*(
  const out: Token[] = [];
  for (let idx = 0; idx < tokens.length; idx++) {
    const prev = out[out.length - 1];
    const curr = tokens[idx];
    if (prev && curr) {
      const prevEndsAtom =
        prev.type === 'num' ||
        prev.type === 'rparen' ||
        (prev.type === 'ident' && !(prev.value in ALLOWED_FUNCTIONS));
      const currStartsAtom =
        curr.type === 'num' || curr.type === 'lparen' || curr.type === 'ident';
      if (prevEndsAtom && currStartsAtom) {
        out.push({ type: 'op', value: '*' });
      }
    }
    out.push(curr);
  }
  return out;
}

export function compileMathExpression(expr: string): ((x: number) => number) | null {
  const trimmed = expr.trim();
  if (!trimmed || trimmed.length > 160) return null;

  let tokens: Token[];
  try {
    tokens = tokenize(trimmed);
  } catch {
    return null;
  }
  if (tokens.length === 0) return null;

  type AstNode = (x: number) => number;
  let pos = 0;

  const peek = (): Token | undefined => tokens[pos];
  const consume = (): Token | undefined => tokens[pos++];

  const parseExpression = (): AstNode => {
    let left = parseTerm();
    while (true) {
      const t = peek();
      if (t?.type === 'op' && (t.value === '+' || t.value === '-')) {
        consume();
        const right = parseTerm();
        const prevLeft = left;
        left = t.value === '+' ? (x) => prevLeft(x) + right(x) : (x) => prevLeft(x) - right(x);
      } else {
        break;
      }
    }
    return left;
  };

  const parseTerm = (): AstNode => {
    let left = parsePower();
    while (true) {
      const t = peek();
      if (t?.type === 'op' && (t.value === '*' || t.value === '/')) {
        consume();
        const right = parsePower();
        const prevLeft = left;
        left = t.value === '*' ? (x) => prevLeft(x) * right(x) : (x) => prevLeft(x) / right(x);
      } else {
        break;
      }
    }
    return left;
  };

  const parsePower = (): AstNode => {
    const base = parseUnary();
    const t = peek();
    if (t?.type === 'op' && t.value === '^') {
      consume();
      const expNode = parsePower();
      return (x) => Math.pow(base(x), expNode(x));
    }
    return base;
  };

  const parseUnary = (): AstNode => {
    const t = peek();
    if (t?.type === 'op' && (t.value === '+' || t.value === '-')) {
      consume();
      const inner = parseUnary();
      return t.value === '-' ? (x) => -inner(x) : inner;
    }
    return parsePrimary();
  };

  const parsePrimary = (): AstNode => {
    const t = consume();
    if (!t) throw new Error('Unexpected end of expression');

    if (t.type === 'num') {
      const val = t.value;
      return () => val;
    }

    if (t.type === 'lparen') {
      const inner = parseExpression();
      const close = consume();
      if (!close || close.type !== 'rparen') throw new Error('Missing closing parenthesis');
      return inner;
    }

    if (t.type === 'ident') {
      if (t.value === 'x') return (x) => x;
      if (t.value === 'pi') return () => Math.PI;
      if (t.value === 'e') return () => Math.E;
      const fn = ALLOWED_FUNCTIONS[t.value];
      if (fn) {
        const next = consume();
        if (!next || next.type !== 'lparen') throw new Error(`Expected '(' after ${t.value}`);
        const arg = parseExpression();
        const close = consume();
        if (!close || close.type !== 'rparen') throw new Error('Missing closing parenthesis');
        return (x) => fn(arg(x));
      }
      throw new Error(`Unknown identifier: ${t.value}`);
    }

    throw new Error('Unexpected token');
  };

  try {
    const fn = parseExpression();
    if (pos !== tokens.length) return null;
    // Smoke test
    void fn(1);
    return fn;
  } catch {
    return null;
  }
}
