import React from "react";
import {
  convertToStandardUnit,
  MeasureId,
  UnitValue,
} from "../../../iso/units";
import { Dispatch, Update } from "../../tea";
import * as UnitInput from "../unit-input";
import * as UnitToggle from "../unit-toggle";
import * as immer from "immer";
import { assertUnreachable } from "../../util/utils";

export type Model = immer.Immutable<{
  measureId: MeasureId;
  minInput: UnitInput.Model;
  maxInput: UnitInput.Model;
  unitToggle: UnitToggle.Model;
}>;

export type Msg =
  | { type: "MAX_INPUT_MSG"; msg: UnitInput.Msg }
  | { type: "MIN_INPUT_MSG"; msg: UnitInput.Msg }
  | { type: "UNIT_TOGGLE_MSG"; msg: UnitToggle.Msg };

export function getQuery(model: Model) {
  const minResult = model.minInput.parseResult;
  const maxResult = model.maxInput.parseResult;

  return {
    min: minResult.status == "success" ? minResult.value : undefined,
    max: maxResult.status == "success" ? maxResult.value : undefined,
  };
}

export function filterApplies(model: Model, value: UnitValue): boolean {
  const normalizedValue = convertToStandardUnit(value);

  const minInputModel = model.minInput;
  const maxInputModel = model.maxInput;

  if (minInputModel.parseResult.status == "success") {
    const minValue = convertToStandardUnit(minInputModel.parseResult.value);
    if (minValue > normalizedValue) {
      return false;
    }
  }

  if (maxInputModel.parseResult.status == "success") {
    const maxValue = convertToStandardUnit(maxInputModel.parseResult.value);
    if (maxValue < normalizedValue) {
      return false;
    }
  }

  return true;
}

export function initModel({
  measureId,
  minValue,
  maxValue,
}: {
  measureId: MeasureId;
  minValue: UnitValue;
  maxValue: UnitValue;
}): Model {
  const minInput = UnitInput.initModel(measureId, minValue);
  return {
    measureId,
    minInput,
    maxInput: UnitInput.initModel(measureId, maxValue),
    unitToggle: {
      measureId,
      selectedUnit: minInput.selectedUnit,
      possibleUnits: minInput.possibleUnits,
    },
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

    case "UNIT_TOGGLE_MSG":
      return [
        immer.produce(model, (draft) => {
          const [newModel] = UnitToggle.update(msg.msg, draft.unitToggle);
          draft.unitToggle = immer.castDraft(newModel);
          const [nextMin] = UnitInput.update(
            { type: "SELECT_UNIT", unit: draft.unitToggle.selectedUnit },
            draft.minInput,
          );
          draft.minInput = immer.castDraft(nextMin);

          const [nextMax] = UnitInput.update(
            { type: "SELECT_UNIT", unit: draft.unitToggle.selectedUnit },
            draft.maxInput,
          );
          draft.maxInput = immer.castDraft(nextMax);
        }),
      ];

    default:
      assertUnreachable(msg);
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
        <UnitToggle.view
          model={model.maxInput}
          dispatch={(msg) => {
            dispatch({ type: "UNIT_TOGGLE_MSG", msg });
          }}
        />
      )}
    </span>
  );
};
