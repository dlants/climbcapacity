import { Result } from "../../iso/utils";
import type { EvalPoint, EvalResult, Expr } from "./types";

export function evaluate(expr: Expr, idArr: EvalPoint[]): Result<EvalResult> {
  try {
    const values = idArr.map((idPt) => evaluateInternal(expr, idPt));

    let unit;
    if (expr.type == "identifier" && idArr.length > 0) {
      unit = idArr[0][expr.name]?.unit;
    }

    return {
      status: "success",
      value: {
        unit,
        values,
      },
    };
  } catch (e: unknown) {
    return { status: "fail", error: (e as Error).message };
  }
}

function evaluateInternal(expr: Expr, idPt: EvalPoint): number {
  switch (expr.type) {
    case "number":
      return expr.value;
    case "identifier":
      if (!(expr.name in idPt))
        throw new Error(`Unknown identifier: ${expr.name}`);
      return idPt[expr.name].value;
    case "binary": {
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
}
