import React, { useId } from "react";
import { UnitType } from "../../iso/units";
import { assertUnreachable } from "../../iso/utils";
import { Dispatch } from "../main";
import { MeasureId } from "../../iso/measures";

export type Model = {
  measureId: MeasureId;
  selectedUnit: UnitType;
  possibleUnits: UnitType[];
};

export type Msg = {
  type: "SELECT_UNIT";
  unit: UnitType;
};

export class UnitToggle {
  state: Model;

  constructor(
    initialParams: {
      measureId: MeasureId;
      selectedUnit: UnitType;
      possibleUnits: UnitType[];
    },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    this.state = {
      measureId: initialParams.measureId,
      selectedUnit: initialParams.selectedUnit,
      possibleUnits: initialParams.possibleUnits,
    };
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "SELECT_UNIT": {
        if (!this.state.possibleUnits.includes(msg.unit)) {
          throw new Error(
            `${msg.unit} is not a possible unit for measure ${this.state.measureId}`,
          );
        }

        this.state.selectedUnit = msg.unit;
        break;
      }
      default:
        assertUnreachable(msg.type);
    }
  }

  view() {
    const toggleId = useId(); // React 18+ feature

    return (
      <span>
        {this.state.possibleUnits.map((unit) => (
          <span key={unit}>
            <input
              type="radio"
              id={toggleId + ":" + unit}
              name={toggleId}
              value={unit}
              checked={unit === this.state.selectedUnit}
              onChange={() => this.context.myDispatch({ type: "SELECT_UNIT", unit })}
            />
            <label key={unit}>{unit}</label>
          </span>
        ))}
      </span>
    );
  }
}
