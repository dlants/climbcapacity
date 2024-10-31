import type { Expr, Identifier } from "./types";

export function evaluate(expr: Expr, ids: Record<Identifier, number>): number {
  switch (expr.type) {
    case "number":
      return expr.value;
    case "identifier":
      if (!(expr.name in ids)) throw new Error(`Unknown identifier: ${expr.name}`);
      return ids[expr.name];
    case "binary":
      const left = evaluate(expr.left, ids);
      const right = evaluate(expr.right, ids);
      switch (expr.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "^":
          return Math.pow(left, right);
        default:
          throw new Error(`Unknown operator: ${expr.op}`);
      }
  }
}
