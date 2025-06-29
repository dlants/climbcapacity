import * as DCGView from "dcgview";
import { MinMaxFilterController, MinMaxFilterView } from "./min-max-filter";
import { ToggleFilterController, ToggleFilterView } from "./toggle-filter";
import { InitialFilter, UnitValue } from "../../../iso/units";
import { assertUnreachable } from "../../util/utils";
import { MeasureId } from "../../../iso/measures";

const { SwitchUnion } = DCGView.Components;

export type Model =
  | {
    type: "minmax";
    controller: MinMaxFilterController;
  }
  | {
    type: "toggle";
    controller: ToggleFilterController;
  };

export type Msg =
  | { type: "MINMAX_FILTER_MSG"; msg: import("./min-max-filter").Msg }
  | { type: "TOGGLE_FILTER_MSG"; msg: import("./toggle-filter").Msg };

export class FilterController {
  state: Model;

  constructor(
    initialParams: {
      measureId: MeasureId;
      initialFilter: InitialFilter;
    },
    public context: { myDispatch: (msg: Msg) => void }
  ) {
    const { measureId, initialFilter } = initialParams;

    switch (initialFilter.type) {
      case "minmax":
        this.state = {
          type: "minmax",
          controller: new MinMaxFilterController(
            measureId,
            initialFilter.minValue,
            initialFilter.maxValue,
            (msg) => this.context.myDispatch({ type: "MINMAX_FILTER_MSG", msg })
          ),
        };
        break;

      case "toggle":
        this.state = {
          type: "toggle",
          controller: new ToggleFilterController(
            {
              measureId,
              value: initialFilter.value,
            },
            (msg) => this.context.myDispatch({ type: "TOGGLE_FILTER_MSG", msg })
          ),
        };
        break;

      default:
        assertUnreachable(initialFilter);
    }
  }

  getUnit() {
    switch (this.state.type) {
      case "minmax":
        return this.state.controller.getUnit();

      case "toggle":
        return this.state.controller.getUnit();
    }
  }

  filterApplies(value: UnitValue) {
    switch (this.state.type) {
      case "minmax":
        return this.state.controller.filterApplies(value);

      case "toggle":
        return this.state.controller.filterApplies(value);

      default:
        assertUnreachable(this.state);
    }
  }

  getQuery() {
    switch (this.state.type) {
      case "minmax":
        return this.state.controller.getQuery();

      case "toggle":
        return this.state.controller.getQuery();

      default:
        assertUnreachable(this.state);
    }
  }

  handleDispatch(msg: Msg) {
    switch (this.state.type) {
      case "minmax":
        if (msg.type !== "MINMAX_FILTER_MSG") {
          throw new Error("Unexpected message type");
        }
        this.state.controller.handleDispatch(msg.msg);
        break;

      case "toggle":
        if (msg.type !== "TOGGLE_FILTER_MSG") {
          throw new Error("Unexpected message type");
        }
        this.state.controller.handleDispatch(msg.msg);
        break;
    }
  }
}

export class FilterView extends DCGView.View<{
  controller: () => FilterController;
}> {
  template() {
    const stateProp = () => this.props.controller().state;

    return SwitchUnion(() => stateProp(), 'type', {
      minmax: (filterProp: () => { type: "minmax"; controller: MinMaxFilterController }) => (
        <MinMaxFilterView controller={() => filterProp().controller} />
      ),
      toggle: (filterProp: () => { type: "toggle"; controller: ToggleFilterController }) => (
        <ToggleFilterView controller={() => filterProp().controller} />
      ),
    });
  }
}
