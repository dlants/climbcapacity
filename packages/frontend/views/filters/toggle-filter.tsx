import * as DCGView from "dcgview";
import { convertToStandardUnit, UnitValue } from "../../../iso/units";
import { Dispatch } from "../../types";
import { assertUnreachable } from "../../util/utils";
import { getPreferredUnitForMeasure, MeasureId } from "../../../iso/measures";
import { Locale } from "../../../iso/locale";

export type Model = {
  measureId: MeasureId;
  value: UnitValue;
};

export type Msg = { type: "SELECT_VALUE"; value: UnitValue };

export class ToggleFilterController {
  state: Model;

  constructor(
    initialParams: {
      measureId: MeasureId;
      value: UnitValue;
    },
    public context: { myDispatch: Dispatch<Msg>; locale: () => Locale },
  ) {
    this.state = {
      measureId: initialParams.measureId,
      value: initialParams.value,
    };
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "SELECT_VALUE":
        this.state.value = msg.value;
        break;

      default:
        assertUnreachable(msg.type);
    }
  }

  getUnit() {
    return getPreferredUnitForMeasure(
      this.state.measureId,
      this.context.locale(),
    );
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
            this.props.controller().context.myDispatch({
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
            this.props.controller().context.myDispatch({
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
