import * as DCGView from "dcgview";
import {
  convertToStandardUnit,
  convertToTargetUnit,
  UnitValue,
} from "../../../iso/units";
import { Dispatch } from "../../types";
import { assertUnreachable } from "../../util/utils";
import { UnitToggleController } from "../unit-toggle";
import type { Msg as UnitToggleMsg } from "../unit-toggle";
import { getSpec, MeasureId } from "../../../iso/measures";

export type Model = {
  measureId: MeasureId;
  value: UnitValue;
  unitToggleController: UnitToggleController;
};

export type Msg =
  | { type: "SELECT_VALUE"; value: UnitValue }
  | { type: "UNIT_TOGGLE_MSG"; msg: UnitToggleMsg };

export class ToggleFilterController {
  state: Model;

  constructor(
    initialParams: {
      measureId: MeasureId;
      value: UnitValue;
    },
    public myDispatch: Dispatch<Msg>
  ) {
    const measure = getSpec(initialParams.measureId);
    this.state = {
      measureId: initialParams.measureId,
      value: initialParams.value,
      unitToggleController: new UnitToggleController(
        {
          measureId: initialParams.measureId,
          selectedUnit: initialParams.value.unit,
          possibleUnits: measure.units,
        },
        { myDispatch: (msg: UnitToggleMsg) => this.myDispatch({ type: "UNIT_TOGGLE_MSG", msg }) }
      ),
    };
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "SELECT_VALUE":
        this.state.value = msg.value;
        break;

      case "UNIT_TOGGLE_MSG":
        this.state.unitToggleController.handleDispatch(msg.msg);

        this.state.value = convertToTargetUnit(
          convertToStandardUnit(this.state.value),
          this.state.unitToggleController.state.selectedUnit,
        );
        break;

      default:
        assertUnreachable(msg);
    }
  }

  getUnit() {
    return this.state.unitToggleController.state.selectedUnit;
  }

  getQuery() {
    return {
      min: this.state.value,
      max: this.state.value,
    };
  }

  filterApplies(value: UnitValue): boolean {
    const normalizedValue = convertToStandardUnit(value);
    const normalizedFilterValue = convertToStandardUnit(this.state.value);
    return normalizedValue === normalizedFilterValue;
  }
}

export class ToggleFilterView extends DCGView.View<{
  controller: () => ToggleFilterController;
}> {
  template() {
    const stateProp = () => this.props.controller().state;

    if (stateProp().value.unit != "sex-at-birth") {
      throw new Error("Unexpected unit for toggle filter.");
    }

    return (
      <div>
        <input
          type="radio"
          name="sex"
          value="male"
          id="male"
          checked={() => stateProp().value.value === "male"}
          onChange={() =>
            this.props.controller().myDispatch({
              type: "SELECT_VALUE",
              value: {
                unit: "sex-at-birth",
                value: "male",
              },
            })
          }
        />
        <label html-for="male">Male</label>

        <input
          type="radio"
          name="sex"
          value="female"
          id="female"
          checked={() => stateProp().value.value === "female"}
          onChange={() =>
            this.props.controller().myDispatch({
              type: "SELECT_VALUE",
              value: {
                unit: "sex-at-birth",
                value: "female",
              },
            })
          }
        />
        <label html-for="female">Female</label>
      </div>
    );
  }
}
