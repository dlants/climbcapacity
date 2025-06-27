import * as DCGView from "dcgview";
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

export class MeasureExpressionBox extends DCGView.View<{
  myDispatch: Dispatch<Msg>;
}> {
  state: Model;

  init() {
    const evalResult = parseExpression("");

    this.state = {
      expression: "",
      evalResult,
    };
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "EXPRESSION_CHANGED": {
        const evalResult = parseExpression(msg.value);
        this.state.expression = msg.value;
        this.state.evalResult = evalResult;
        break;
      }
    }
  }

  template() {
    return (
      <div>
        <input
          type={DCGView.const("text")}
          value={() => this.state.expression}
          onChange={(e) =>
            this.props.myDispatch({
              type: "EXPRESSION_CHANGED",
              value: (e.target as HTMLInputElement).value,
            })
          }
          style={DCGView.const({
            "border-color": this.state.evalResult.status == 'success' ? "initial" : "red",
          })}
          placeholder={DCGView.const("Enter expression (e.g. a + b * 2)")}
        />
        {this.state.evalResult.status != 'success' && (
          <div style={DCGView.const({ color: "red", "font-size": "small" })}>
            {this.state.evalResult.error}
          </div>
        )}
      </div>
    );
  }
}
