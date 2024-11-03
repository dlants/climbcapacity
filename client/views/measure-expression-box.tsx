import React from "react";
import { Update, View } from "../tea";
import { parseExpression, ParseResult } from "../parser/parser";
import * as immer from "immer";

export type Model = immer.Immutable<{
  expression: string;
  evalResult: ParseResult;
}>;

export type Msg = {
  type: "EXPRESSION_CHANGED";
  value: string;
};

export function initModel(expression: string): Model {
  const evalResult = parseExpression(expression);

  return {
    expression,
    evalResult,
  };
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "EXPRESSION_CHANGED": {
      const evalResult = parseExpression(msg.value);
      return [
        immer.produce(model, (draft) => {
          draft.expression = msg.value;
          draft.evalResult = evalResult;
        }),
      ];
    }
  }
};

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div>
      <input
        type="text"
        value={model.expression}
        onChange={(e) =>
          dispatch({
            type: "EXPRESSION_CHANGED",
            value: e.target.value,
          })
        }
        style={{
          borderColor: model.evalResult.status == 'success' ? "initial" : "red",
        }}
        placeholder="Enter expression (e.g. a + b * 2)"
      />
      {model.evalResult.status != 'success' && (
        <div style={{ color: "red", fontSize: "small" }}>
          {model.evalResult.error}
        </div>
      )}
    </div>
  );
};
