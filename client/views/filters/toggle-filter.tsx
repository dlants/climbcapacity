import React from "react";
import {
  convertToStandardUnit,
  convertToTargetUnit,
  UnitValue,
} from "../../../iso/units";
import { Dispatch, Update } from "../../tea";
import * as immer from "immer";
import { assertUnreachable } from "../../util/utils";
import * as UnitToggle from "../unit-toggle";
import { MEASURE_MAP } from "../../constants";
import { MeasureId } from "../../../iso/measures";

export type Model = immer.Immutable<{
  measureId: MeasureId;
  value: UnitValue;
  unitToggle: UnitToggle.Model;
}>;

export type Msg =
  | { type: "SELECT_VALUE"; value: UnitValue }
  | { type: "UNIT_TOGGLE_MSG"; msg: UnitToggle.Msg };

export function initModel({
  measureId,
  value,
}: {
  measureId: MeasureId;
  value: UnitValue;
}): Model {
  const measure = MEASURE_MAP[measureId];
  return {
    measureId,
    value,
    unitToggle: {
      measureId,
      selectedUnit: value.unit,
      possibleUnits: measure.units,
    },
  };
}

export function getQuery(model: Model) {
  return {
    min: model.value,
    max: model.value,
  };
}

export function filterApplies(model: Model, value: UnitValue): boolean {
  const normalizedValue = convertToStandardUnit(value);
  const normalizedFilterValue = convertToStandardUnit(model.value);
  return normalizedValue === normalizedFilterValue;
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "SELECT_VALUE":
      return [
        immer.produce(model, (draft) => {
          draft.value = msg.value;
        }),
      ];

    case "UNIT_TOGGLE_MSG":
      return [
        immer.produce(model, (draft) => {
          const [newModel] = UnitToggle.update(msg.msg, draft.unitToggle);
          draft.unitToggle = immer.castDraft(newModel);

          draft.value = immer.castDraft({
            unit: draft.unitToggle.selectedUnit,
            value: convertToTargetUnit(
              convertToStandardUnit(draft.value),
              draft.unitToggle.selectedUnit,
            ),
          }) as UnitValue;
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
  if (model.value.unit != "sex-at-birth") {
    throw new Error("Unexpected unit for toggle filter.");
  }

  return (
    <div>
      <input
        type="radio"
        name="sex"
        value="male"
        id="male"
        checked={model.value.value === "male"}
        onChange={() =>
          dispatch({
            type: "SELECT_VALUE",
            value: {
              unit: "sex-at-birth",
              value: "male",
            },
          })
        }
      />
      <label htmlFor="male">Male</label>

      <input
        type="radio"
        name="sex"
        value="female"
        id="female"
        checked={model.value.value === "female"}
        onChange={() =>
          dispatch({
            type: "SELECT_VALUE",
            value: {
              unit: "sex-at-birth",
              value: "female",
            },
          })
        }
      />
      <label htmlFor="female">Female</label>
    </div>
  );
};
