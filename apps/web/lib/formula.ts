/**
 * Parser + evaluator de fórmulas pra métricas personalizadas.
 *
 * Suporta:
 *   - Variáveis (identificadores: spend, revenue, purchases, etc.)
 *   - Números (123, 0.5)
 *   - Operadores binários: + - * /
 *   - Parênteses
 *   - Funções: min, max, abs, if (3 args: cond, then, else; cond > 0 = true)
 *
 * NÃO usa eval(). Tokenizer + shunting-yard + evaluator.
 *
 * Validação prévia: parse() lança erro descritivo (lança Error com message útil
 * pra mostrar pro user).
 */

type Token =
  | { type: "num"; value: number }
  | { type: "var"; name: string }
  | { type: "op"; op: "+" | "-" | "*" | "/" }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "comma" }
  | { type: "func"; name: string };

const FUNCTIONS = new Set(["min", "max", "abs", "if"]);

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = input.trim();

  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t" || c === "\n") { i++; continue; }

    if (c === "(") { tokens.push({ type: "lparen" }); i++; continue; }
    if (c === ")") { tokens.push({ type: "rparen" }); i++; continue; }
    if (c === ",") { tokens.push({ type: "comma" }); i++; continue; }
    if (c === "+" || c === "-" || c === "*" || c === "/") {
      tokens.push({ type: "op", op: c });
      i++;
      continue;
    }

    // Número (inteiro ou decimal)
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(s[i + 1] ?? ""))) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const n = parseFloat(s.slice(i, j));
      if (isNaN(n)) throw new Error(`Número inválido perto de "${s.slice(i, j)}"`);
      tokens.push({ type: "num", value: n });
      i = j;
      continue;
    }

    // Identificador (var ou func)
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
      const name = s.slice(i, j);
      if (FUNCTIONS.has(name) && s[j] === "(") tokens.push({ type: "func", name });
      else tokens.push({ type: "var", name });
      i = j;
      continue;
    }

    throw new Error(`Caractere inválido na fórmula: "${c}"`);
  }

  return tokens;
}

const PRECEDENCE: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

interface AST {
  eval(scope: Record<string, number>): number;
  vars(): Set<string>;
}

class NumNode implements AST {
  constructor(public v: number) {}
  eval() { return this.v; }
  vars() { return new Set<string>(); }
}
class VarNode implements AST {
  constructor(public name: string) {}
  eval(scope: Record<string, number>) {
    const v = scope[this.name];
    if (v === undefined || v === null || isNaN(v)) return 0;
    return v;
  }
  vars() { return new Set([this.name]); }
}
class BinOpNode implements AST {
  constructor(public op: string, public l: AST, public r: AST) {}
  eval(scope: Record<string, number>) {
    const a = this.l.eval(scope);
    const b = this.r.eval(scope);
    switch (this.op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b === 0 ? 0 : a / b;   // divisão por zero → 0 (evita NaN/Infinity)
      default: throw new Error("Operador desconhecido: " + this.op);
    }
  }
  vars() { const s = new Set<string>(); this.l.vars().forEach((v) => s.add(v)); this.r.vars().forEach((v) => s.add(v)); return s; }
}
class FuncNode implements AST {
  constructor(public name: string, public args: AST[]) {}
  eval(scope: Record<string, number>) {
    const vs = this.args.map((a) => a.eval(scope));
    switch (this.name) {
      case "min": return Math.min(...vs);
      case "max": return Math.max(...vs);
      case "abs": return Math.abs(vs[0]);
      case "if":
        if (vs.length !== 3) throw new Error("if() precisa de 3 argumentos");
        return vs[0] > 0 ? vs[1] : vs[2];
      default: throw new Error("Função desconhecida: " + this.name);
    }
  }
  vars() { const s = new Set<string>(); this.args.forEach((a) => a.vars().forEach((v) => s.add(v))); return s; }
}

/**
 * Recursive descent parser — simples e suficiente.
 * grammar:
 *   expr    = term ((+|-) term)*
 *   term    = factor ((*|/) factor)*
 *   factor  = number | var | func '(' arglist ')' | '(' expr ')'
 *   arglist = expr (',' expr)*
 */
class Parser {
  pos = 0;
  constructor(public tokens: Token[]) {}

  peek(): Token | null { return this.tokens[this.pos] ?? null; }
  consume(): Token { return this.tokens[this.pos++]; }

  parseExpr(): AST {
    let left = this.parseTerm();
    while (true) {
      const t = this.peek();
      if (t?.type === "op" && (t.op === "+" || t.op === "-")) {
        this.consume();
        const right = this.parseTerm();
        left = new BinOpNode(t.op, left, right);
      } else break;
    }
    return left;
  }

  parseTerm(): AST {
    let left = this.parseFactor();
    while (true) {
      const t = this.peek();
      if (t?.type === "op" && (t.op === "*" || t.op === "/")) {
        this.consume();
        const right = this.parseFactor();
        left = new BinOpNode(t.op, left, right);
      } else break;
    }
    return left;
  }

  parseFactor(): AST {
    const t = this.peek();
    if (!t) throw new Error("Fim inesperado da fórmula");
    if (t.type === "num") { this.consume(); return new NumNode(t.value); }
    if (t.type === "var") { this.consume(); return new VarNode(t.name); }
    if (t.type === "func") {
      this.consume();
      const lp = this.consume();
      if (lp.type !== "lparen") throw new Error("Esperado '(' após função " + t.name);
      const args: AST[] = [this.parseExpr()];
      while (this.peek()?.type === "comma") {
        this.consume();
        args.push(this.parseExpr());
      }
      const rp = this.consume();
      if (rp.type !== "rparen") throw new Error("Esperado ')' fechando função " + t.name);
      return new FuncNode(t.name, args);
    }
    if (t.type === "lparen") {
      this.consume();
      const inner = this.parseExpr();
      const rp = this.consume();
      if (rp.type !== "rparen") throw new Error("Esperado ')' fechando expressão");
      return inner;
    }
    if (t.type === "op" && t.op === "-") {
      // Unário negativo: -x → 0 - x
      this.consume();
      const right = this.parseFactor();
      return new BinOpNode("-", new NumNode(0), right);
    }
    throw new Error("Token inesperado");
  }
}

export function parseFormula(formula: string): AST {
  const tokens = tokenize(formula);
  if (tokens.length === 0) throw new Error("Fórmula vazia");
  const parser = new Parser(tokens);
  const ast = parser.parseExpr();
  if (parser.pos < tokens.length) throw new Error("Token inesperado no final da fórmula");
  return ast;
}

export function evalFormula(formula: string, scope: Record<string, number>): number {
  return parseFormula(formula).eval(scope);
}

export interface FormulaValidation {
  ok: boolean;
  error?: string;
  variables?: string[];
}

export function validateFormula(formula: string, allowedVars: string[]): FormulaValidation {
  try {
    const ast = parseFormula(formula);
    const used = Array.from(ast.vars());
    const allowed = new Set(allowedVars);
    const unknown = used.filter((v) => !allowed.has(v));
    if (unknown.length > 0) {
      return { ok: false, error: `Variável(is) desconhecida(s): ${unknown.join(", ")}` };
    }
    return { ok: true, variables: used };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Erro desconhecido" };
  }
}
