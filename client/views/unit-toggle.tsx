import React, { useId } from "react";
import * as immer from "immer";
const produce = immer.produce;
import {
  MeasureId,
  UnitType,
  convertToStandardUnit,
  convertToTargetUnit,
  inchesToFeetAndInches,
} from "../../iso/units";
import { assertUnreachable } from "../../iso/utils";
import { Update } from "../tea";

export type Model = immer.Immutable<{
  measureId: MeasureId;
  selectedUnit: UnitType;
  possibleUnits: UnitType[];
}>;

export type Msg = {
  type: "SELECT_UNIT";
  unit: UnitType;
};

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "SELECT_UNIT": {
      if (!model.possibleUnits.includes(msg.unit)) {
        throw new Error(
          `${msg.unit} is not a possible unit for measure ${model.measureId}`,
        );
      }

      return [
        produce(model, (draft) => {
          draft.selectedUnit = msg.unit;
        }),
      ];
    }
    default:
      assertUnreachable(msg.type);
  }
};

export const view = ({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: (msg: Msg) => void;
}) => {
  const toggleId = useId(); // React 18+ feature

  return (
    <span>
      {model.possibleUnits.map((unit) => (
        <span key={unit}>
          <input
            type="radio"
            id={toggleId + ":" + unit}
            name={toggleId}
            value={unit}
            checked={unit === model.selectedUnit}
            onChange={() => dispatch({ type: "SELECT_UNIT", unit })}
          />
          <label key={unit}>{unit}</label>
        </span>
      ))}
    </span>
  );
};
