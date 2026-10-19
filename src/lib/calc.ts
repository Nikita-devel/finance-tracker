/**
 * Évaluation sûre d'une expression arithmétique simple : + - * / et parenthèses.
 * Pas d'`eval` : seule une grammaire fixée est acceptée, tout le reste lève une erreur.
 */

const TOKEN = /\d+(?:\.\d+)?|[()+\-*/]/g;

export function evaluateExpression(input: string): number {
  const src = input.replace(/\s+/g, "").replace(/,/g, ".");
  if (src.length === 0) throw new Error("Expression vide");
  if (!/^[0-9.+\-*/()]+$/.test(src)) throw new Error("Caractères non autorisés");

  const tokens = src.match(TOKEN);
  if (!tokens || tokens.join("") !== src) throw new Error("Syntaxe invalide");

  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpr(): number {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = next();
      const r = parseTerm();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }

  function parseTerm(): number {
    let v = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = next();
      const r = parseFactor();
      if (op === "/" && r === 0) throw new Error("Division par zéro");
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }

  function parseFactor(): number {
    const t = next();
    if (t === "-") return -parseFactor();
    if (t === "(") {
      const v = parseExpr();
      if (next() !== ")") throw new Error("Parenthèse manquante");
      return v;
    }
    if (t !== undefined && /^\d/.test(t)) return Number(t);
    throw new Error("Syntaxe invalide");
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error("Syntaxe invalide");
  if (!Number.isFinite(result)) throw new Error("Résultat invalide");
  return result;
}
