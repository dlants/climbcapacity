import React from "react";
import { MeasureId, UnitValue } from "../../iso/units";
import { Dispatch, Update } from "../tea";
import * as UnitInput from "./unit-input";
import * as immer from "immer";

export type Model = immer.Immutable<{
  measureId: MeasureId;
  minInput: UnitInput.Model;
  maxInput: UnitInput.Model;
}>;

export type Msg =
  | { type: "MAX_INPUT_MSG"; msg: UnitInput.Msg }
  | { type: "MIN_INPUT_MSG"; msg: UnitInput.Msg };

export function initModel({
  measureId,
  minValue,
  maxValue,
}: {
  measureId: MeasureId;
  minValue: UnitValue;
  maxValue: UnitValue;
}): Model {
  return {
    measureId,
    minInput: UnitInput.initModel(measureId, minValue),
    maxInput: UnitInput.initModel(measureId, maxValue),
  };
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "MIN_INPUT_MSG":
      return [
        immer.produce(model, (draft) => {
          const [newModel] = UnitInput.update(msg.msg, draft.minInput);
          draft.minInput = immer.castDraft(newModel);
        }),
      ];

    case "MAX_INPUT_MSG":
      return [
        immer.produce(model, (draft) => {
          const [newModel] = UnitInput.update(msg.msg, draft.maxInput);
          draft.maxInput = immer.castDraft(newModel);
        }),
      ];
  }
};

export const view = ({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: Dispatch<Msg>;
}) => {
  return (
    <span>
      min:{" "}
      <UnitInput.UnitInput
        model={model.minInput}
        dispatch={(msg) => dispatch({ type: "MIN_INPUT_MSG", msg })}
      />{" "}
      max:{" "}
      <UnitInput.UnitInput
        model={model.maxInput}
        dispatch={(msg) => dispatch({ type: "MAX_INPUT_MSG", msg })}
      />{" "}
      {model.minInput.possibleUnits.length > 1 && (
        <UnitInput.UnitToggle
          model={model.maxInput}
          dispatch={(msg) => {
            dispatch({ type: "MIN_INPUT_MSG", msg });
            dispatch({ type: "MAX_INPUT_MSG", msg });
          }}
        />
      )}
    </span>
  );
};
