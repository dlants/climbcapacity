import React from "react";
import { Dispatch } from "../types";
import { parseExpression, ParseResult } from "../parser/parser";

export type Model = {
  expression: string;
  evalResult: ParseResult;
};

export type Msg = {
  type: "EXPRESSION_CHANGED";
  value: string;
};

export class MeasureExpressionBox {
  state: Model;

  constructor(
    expression: string,
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    const evalResult = parseExpression(expression);

    this.state = {
      expression,
      evalResult,
    };
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "EXPRESSION_CHANGED": {
        const evalResult = parseExpression(msg.value);
        this.state.expression = msg.value;
        this.state.evalResult = evalResult;
        break;
      }
    }
  }

  view() {
    return (
      <div>
        <input
          type="text"
          value={this.state.expression}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            this.context.myDispatch({
              type: "EXPRESSION_CHANGED",
              value: e.target.value,
            })
          }
          style={{
            borderColor: this.state.evalResult.status == 'success' ? "initial" : "red",
          }}
          placeholder="Enter expression (e.g. a + b * 2)"
        />
        {this.state.evalResult.status != 'success' && (
          <div style={{ color: "red", fontSize: "small" }}>
            {this.state.evalResult.error}
          </div>
        )}
      </div>
    );
  }
}
