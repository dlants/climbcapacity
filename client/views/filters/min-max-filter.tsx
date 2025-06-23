import React from "react";
import { convertToStandardUnit, UnitValue } from "../../../iso/units";
import { Dispatch } from "../../tea";
import { UnitInputComponent } from "../unit-input";
import { UnitToggle } from "../unit-toggle";
import { assertUnreachable } from "../../util/utils";
import { MeasureId } from "../../../iso/measures";
import * as typestyle from "typestyle";
import * as csstips from "csstips";
import * as csx from "csx";

export type Model = {
  measureId: MeasureId;
  minInput: UnitInputComponent;
  maxInput: UnitInputComponent;
  unitToggle: UnitToggle;
};

export type Msg =
  | { type: "MAX_INPUT_MSG"; msg: import("../unit-input").Msg }
  | { type: "MIN_INPUT_MSG"; msg: import("../unit-input").Msg }
  | { type: "UNIT_TOGGLE_MSG"; msg: import("../unit-toggle").Msg };



const styles = typestyle.stylesheet({
  container: {
    ...csstips.horizontal,
    width: csx.percent(100),
    gap: csx.px(10),
    $nest: {
      "& input": {
        width: "fit-content",
        maxWidth: csx.em(4),
      },
      // "@media (min-width: 800px)": {
      //   ...csstips.horizontal,
      // },
      // "@media (max-width: 800px)": {
      //   ...csstips.vertical,
      // },
    },
  },
  item: {
    ...csstips.content,
  },
});

export class MinMaxFilter {
  state: Model;

  constructor(
    initialParams: {
      measureId: MeasureId;
      minValue: UnitValue;
      maxValue: UnitValue;
    },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    const minInput = new UnitInputComponent(
      initialParams.measureId,
      { myDispatch: (msg) => this.context.myDispatch({ type: "MIN_INPUT_MSG", msg }) },
      initialParams.minValue
    );
    const maxInput = new UnitInputComponent(
      initialParams.measureId,
      { myDispatch: (msg) => this.context.myDispatch({ type: "MAX_INPUT_MSG", msg }) },
      initialParams.maxValue
    );
    const unitToggle = new UnitToggle(
      {
        measureId: initialParams.measureId,
        selectedUnit: minInput.state.selectedUnit,
        possibleUnits: minInput.state.possibleUnits,
      },
      { myDispatch: (msg) => this.context.myDispatch({ type: "UNIT_TOGGLE_MSG", msg }) }
    );

    this.state = {
      measureId: initialParams.measureId,
      minInput,
      maxInput,
      unitToggle,
    };
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "MIN_INPUT_MSG":
        this.state.minInput.update(msg.msg);
        break;

      case "MAX_INPUT_MSG":
        this.state.maxInput.update(msg.msg);
        break;

      case "UNIT_TOGGLE_MSG":
        this.state.unitToggle.update(msg.msg);

        // Update both inputs to use the new selected unit
        this.state.minInput.update({
          type: "SELECT_UNIT",
          unit: this.state.unitToggle.state.selectedUnit,
        });
        this.state.maxInput.update({
          type: "SELECT_UNIT", 
          unit: this.state.unitToggle.state.selectedUnit,
        });
        break;

      default:
        assertUnreachable(msg);
    }
  }

  view() {
    return (
      <div className={styles.container}>
        <div className={styles.item}>
          min: {this.state.minInput.view()}
        </div>
        <div className={styles.item}>
          max: {this.state.maxInput.view()}
        </div>
        {this.state.minInput.state.possibleUnits.length > 1 && (
          <div className={styles.item}>
            {this.state.unitToggle.view()}
          </div>
        )}
      </div>
    );
  }

  getQuery() {
    const minResult = this.state.minInput.state.parseResult;
    const maxResult = this.state.maxInput.state.parseResult;

    return {
      min: minResult.status == "success" ? minResult.value : undefined,
      max: maxResult.status == "success" ? maxResult.value : undefined,
    };
  }

  filterApplies(value: UnitValue): boolean {
    const normalizedValue = convertToStandardUnit(value);

    const minInputModel = this.state.minInput.state;
    const maxInputModel = this.state.maxInput.state;

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
}
