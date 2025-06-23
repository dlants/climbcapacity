import React from "react";
import { convertToStandardUnit, UnitValue } from "../../../iso/units";
import { Dispatch } from "../../tea";
import * as UnitInput from "../unit-input";
import * as UnitToggle from "../unit-toggle";
import { assertUnreachable } from "../../util/utils";
import { MeasureId } from "../../../iso/measures";
import * as typestyle from "typestyle";
import * as csstips from "csstips";
import * as csx from "csx";

export type Model = {
  measureId: MeasureId;
  minInput: UnitInput.Model;
  maxInput: UnitInput.Model;
  unitToggle: UnitToggle.Model;
};

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
    const minInput = UnitInput.initModel(initialParams.measureId, initialParams.minValue);
    this.state = {
      measureId: initialParams.measureId,
      minInput,
      maxInput: UnitInput.initModel(initialParams.measureId, initialParams.maxValue),
      unitToggle: {
        measureId: initialParams.measureId,
        selectedUnit: minInput.selectedUnit,
        possibleUnits: minInput.possibleUnits,
      },
    };
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "MIN_INPUT_MSG":
        const [newMinModel] = UnitInput.update(msg.msg, this.state.minInput);
        this.state.minInput = newMinModel;
        break;

      case "MAX_INPUT_MSG":
        const [newMaxModel] = UnitInput.update(msg.msg, this.state.maxInput);
        this.state.maxInput = newMaxModel;
        break;

      case "UNIT_TOGGLE_MSG":
        const [newToggleModel] = UnitToggle.update(msg.msg, this.state.unitToggle);
        this.state.unitToggle = newToggleModel;

        const [nextMin] = UnitInput.update(
          { type: "SELECT_UNIT", unit: this.state.unitToggle.selectedUnit },
          this.state.minInput,
        );
        this.state.minInput = nextMin;

        const [nextMax] = UnitInput.update(
          { type: "SELECT_UNIT", unit: this.state.unitToggle.selectedUnit },
          this.state.maxInput,
        );
        this.state.maxInput = nextMax;
        break;

      default:
        assertUnreachable(msg);
    }
  }

  view() {
    return (
      <div className={styles.container}>
        <div className={styles.item}>
          min:{" "}
          <UnitInput.UnitInput
            model={this.state.minInput}
            dispatch={(msg) => this.context.myDispatch({ type: "MIN_INPUT_MSG", msg })}
          />
        </div>
        <div className={styles.item}>
          max:{" "}
          <UnitInput.UnitInput
            model={this.state.maxInput}
            dispatch={(msg) => this.context.myDispatch({ type: "MAX_INPUT_MSG", msg })}
          />
        </div>
        {this.state.minInput.possibleUnits.length > 1 && (
          <div className={styles.item}>
            <UnitToggle.view
              model={this.state.unitToggle}
              dispatch={(msg) => {
                this.context.myDispatch({ type: "UNIT_TOGGLE_MSG", msg });
              }}
            />
          </div>
        )}
      </div>
    );
  }
}
