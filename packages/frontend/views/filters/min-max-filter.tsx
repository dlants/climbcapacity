import * as DCGView from "dcgview";
import { convertToStandardUnit, UnitValue } from "../../../iso/units";
import { Dispatch } from "../../types";
import { UnitInputController, UnitInputView } from "../unit-input";
import { assertUnreachable } from "../../util/utils";
import { MeasureId, getPreferredUnitForMeasure } from "../../../iso/measures";
import { Locale } from "../../../iso/locale";
import * as typestyle from "typestyle";
import * as csstips from "csstips";
import * as csx from "csx";

export type Model = {
  measureId: MeasureId;
  minInputController: UnitInputController;
  maxInputController: UnitInputController;
};

export type Msg =
  | { type: "MAX_INPUT_MSG"; msg: import("../unit-input").Msg }
  | { type: "MIN_INPUT_MSG"; msg: import("../unit-input").Msg };

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
  context: { myDispatch: Dispatch<Msg>; locale: () => Locale };

  constructor(
    measureId: MeasureId,
    minValue: UnitValue,
    maxValue: UnitValue,
    context: { myDispatch: Dispatch<Msg>; locale: () => Locale },
  ) {
    this.context = context;
    const minInputController = new UnitInputController(
      measureId,
      {
        myDispatch: (msg: import("../unit-input").Msg) =>
          this.context.myDispatch({ type: "MIN_INPUT_MSG", msg }),
        locale: this.context.locale,
      },
      minValue,
    );
    const maxInputController = new UnitInputController(
      measureId,
      {
        myDispatch: (msg: import("../unit-input").Msg) =>
          this.context.myDispatch({ type: "MAX_INPUT_MSG", msg }),
        locale: this.context.locale,
      },
      maxValue,
    );
    this.state = {
      measureId,
      minInputController,
      maxInputController,
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
    return getPreferredUnitForMeasure(this.state.measureId, this.context.locale());
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
      </div>
    );
  }
}
