import { Result } from "../../iso/utils";
import type { Expr, Identifier } from "./types";

export function evaluate(
  expr: Expr,
  idArr: Record<Identifier, number>[],
): Result<number[]> {
  try {
    const value = idArr.map((idPt) => evaluateInternal(expr, idPt));
    return { status: "success", value };
  } catch (e: unknown) {
    return { status: "fail", error: (e as Error).message };
  }
}

function evaluateInternal(expr: Expr, idPt: Record<Identifier, number>): number {
  switch (expr.type) {
    case "number":
      return expr.value;
    case "identifier":
      if (!(expr.name in idPt))
        throw new Error(`Unknown identifier: ${expr.name}`);
      return idPt[expr.name];
    case "binary":
      const left = evaluateInternal(expr.left, idPt);
      const right = evaluateInternal(expr.right, idPt);
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
