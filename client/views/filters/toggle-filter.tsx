import React from "react";
import {
  convertToStandardUnit,
  convertToTargetUnit,
  UnitValue,
} from "../../../iso/units";
import { Dispatch } from "../../tea";
import { assertUnreachable } from "../../util/utils";
import * as UnitToggle from "../unit-toggle";
import { getSpec, MeasureId } from "../../../iso/measures";

export type Model = {
  measureId: MeasureId;
  value: UnitValue;
  unitToggle: UnitToggle.Model;
};

export type Msg =
  | { type: "SELECT_VALUE"; value: UnitValue }
  | { type: "UNIT_TOGGLE_MSG"; msg: UnitToggle.Msg };

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

export class ToggleFilter {
  state: Model;

  constructor(
    initialParams: {
      measureId: MeasureId;
      value: UnitValue;
    },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    const measure = getSpec(initialParams.measureId);
    this.state = {
      measureId: initialParams.measureId,
      value: initialParams.value,
      unitToggle: {
        measureId: initialParams.measureId,
        selectedUnit: initialParams.value.unit,
        possibleUnits: measure.units,
      },
    };
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "SELECT_VALUE":
        this.state.value = msg.value;
        break;

      case "UNIT_TOGGLE_MSG":
        const [newModel] = UnitToggle.update(msg.msg, this.state.unitToggle);
        this.state.unitToggle = newModel;

        this.state.value = convertToTargetUnit(
          convertToStandardUnit(this.state.value),
          this.state.unitToggle.selectedUnit,
        );
        break;

      default:
        assertUnreachable(msg);
    }
  }

  view() {
    if (this.state.value.unit != "sex-at-birth") {
      throw new Error("Unexpected unit for toggle filter.");
    }

    return (
      <div>
        <input
          type="radio"
          name="sex"
          value="male"
          id="male"
          checked={this.state.value.value === "male"}
          onChange={() =>
            this.context.myDispatch({
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
          checked={this.state.value.value === "female"}
          onChange={() =>
            this.context.myDispatch({
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
  }
}
