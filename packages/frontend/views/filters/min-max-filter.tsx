import * as DCGView from "dcgview";
import { convertToStandardUnit, UnitValue } from "../../../iso/units";
import { Dispatch } from "../../types";
import { UnitInputController, UnitInputView } from "../unit-input";
import { UnitToggleController, UnitToggleView } from "../unit-toggle";
import { assertUnreachable } from "../../util/utils";
import { MeasureId } from "../../../iso/measures";
import * as typestyle from "typestyle";
import * as csstips from "csstips";
import * as csx from "csx";

const { If } = DCGView.Components;

export type Model = {
  measureId: MeasureId;
  minInputController: UnitInputController;
  maxInputController: UnitInputController;
  unitToggleController: UnitToggleController;
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

export class MinMaxFilterController {
  state: Model;

  constructor(
    measureId: MeasureId,
    minValue: UnitValue,
    maxValue: UnitValue,
    public myDispatch: Dispatch<Msg>,
  ) {
    const minInputController = new UnitInputController(
      measureId,
      (msg: import("../unit-input").Msg) =>
        this.myDispatch({ type: "MIN_INPUT_MSG", msg }),
      minValue,
    );
    const maxInputController = new UnitInputController(
      measureId,
      (msg: import("../unit-input").Msg) =>
        this.myDispatch({ type: "MAX_INPUT_MSG", msg }),
      maxValue,
    );
    const unitToggleController = new UnitToggleController(
      {
        measureId,
        selectedUnit: minInputController.state.selectedUnit,
        possibleUnits: minInputController.state.possibleUnits,
      },
      {
        myDispatch: (msg: import("../unit-toggle").Msg) =>
          this.myDispatch({ type: "UNIT_TOGGLE_MSG", msg }),
      },
    );
    this.state = {
      measureId,
      minInputController,
      maxInputController,
      unitToggleController,
    };
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "MIN_INPUT_MSG": {
        this.state.minInputController.handleDispatch(msg.msg);
        break;
      }

      case "MAX_INPUT_MSG": {
        this.state.maxInputController.handleDispatch(msg.msg);
        break;
      }

      case "UNIT_TOGGLE_MSG": {
        this.state.unitToggleController.handleDispatch(msg.msg);

        // Update both inputs to use the new selected unit
        this.state.minInputController.handleDispatch({
          type: "SELECT_UNIT",
          unit: this.state.unitToggleController.state.selectedUnit,
        });
        this.state.maxInputController.handleDispatch({
          type: "SELECT_UNIT",
          unit: this.state.unitToggleController.state.selectedUnit,
        });
        break;
      }

      default:
        assertUnreachable(msg);
    }
  }

  getQuery() {
    const minResult = this.state.minInputController.state.parseResult;
    const maxResult = this.state.maxInputController.state.parseResult;

    return {
      min: minResult.status == "success" ? minResult.value : undefined,
      max: maxResult.status == "success" ? maxResult.value : undefined,
    };
  }

  filterApplies(value: UnitValue): boolean {
    const normalizedValue = convertToStandardUnit(value);

    const minInputModel = this.state.minInputController.state;
    const maxInputModel = this.state.maxInputController.state;

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

  getUnit() {
    return this.state.unitToggleController.state.selectedUnit;
  }
}

export class MinMaxFilterView extends DCGView.View<{
  controller: () => MinMaxFilterController;
}> {
  template() {
    const stateProp = () => this.props.controller().state;

    return (
      <div class={DCGView.const(styles.container)}>
        <div class={DCGView.const(styles.item)}>
          min:{" "}
          <UnitInputView controller={() => stateProp().minInputController} />
        </div>
        <div class={DCGView.const(styles.item)}>
          max:{" "}
          <UnitInputView controller={() => stateProp().maxInputController} />
        </div>
        <If
          predicate={() =>
            stateProp().minInputController.state.possibleUnits.length > 1
          }
        >
          {() => (
            <div class={DCGView.const(styles.item)}>
              <UnitToggleView
                controller={() => stateProp().unitToggleController}
              />
            </div>
          )}
        </If>
      </div>
    );
  }
}
