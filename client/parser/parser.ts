import type { Token, Expr, EvalResult, Identifier, EvalPoint } from "./types";
import { tokenize } from "./tokenizer";
import { evaluate } from "./evaluate";
import { Result } from "../../iso/utils";

export type ParseResult = Result<
  (evalPoints: EvalPoint[]) => Result<EvalResult>
>;

class Parser {
  private tokens: Token[] = [];
  private current = 0;

  private precedence: Record<string, number> = {
    "+": 10,
    "-": 10,
    "*": 20,
    "/": 20,
    "^": 30,
  };

  parse(input: string): ParseResult {
    try {
      this.tokens = tokenize(input);
      const ast = this.parseExpr(0);
      return {
        status: "success",
        value: (evalPoints) => evaluate(ast, evalPoints),
      };
    } catch (e: any) {
      return { status: "fail", error: e.message };
    }
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private consume(): Token {
    return this.tokens[this.current++];
  }

  private parseExpr(precedence: number): Expr {
    let left = this.parseAtom();

    while (precedence < this.getPrecedence()) {
      left = this.parseInfix(left);
    }

    return left;
  }

  private parseAtom(): Expr {
    const token = this.consume();

    switch (token.type) {
      case "number":
        return { type: "number", value: parseFloat(token.value) };
      case "identifier":
        return { type: "identifier", name: token.value as Identifier };
      case "lparen": {
        const expr = this.parseExpr(0);
        if (this.peek().type !== "rparen") throw new Error("Expected )");
        this.consume();
        return expr;
      }
      default:
        throw new Error(`Unexpected token: ${token.value}`);
    }
  }

  private parseInfix(left: Expr): Expr {
    const op = this.consume();
    if (op.type !== "operator") throw new Error("Expected operator");

    const prec = this.precedence[op.value];
    const right = this.parseExpr(prec);

    return {
      type: "binary",
      op: op.value,
      left,
      right,
    };
  }

  private getPrecedence(): number {
    const token = this.peek();
    return token.type === "operator" ? this.precedence[token.value] || 0 : -1;
  }
}

export const parseExpression = (input: string) => new Parser().parse(input);
