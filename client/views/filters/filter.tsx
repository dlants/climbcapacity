import { MinMaxFilter } from "./min-max-filter";
import { ToggleFilter } from "./toggle-filter";
import { InitialFilter, UnitValue } from "../../../iso/units";
import { assertUnreachable } from "../../util/utils";
import { MeasureId } from "../../../iso/measures";

export type Model =
  | {
    type: "minmax";
    model: MinMaxFilter;
  }
  | {
    type: "toggle";
    model: ToggleFilter;
  };

export type Msg =
  | { type: "MINMAX_FILTER_MSG"; msg: import("./min-max-filter").Msg }
  | { type: "TOGGLE_FILTER_MSG"; msg: import("./toggle-filter").Msg };

export class Filter {
  state: Model;

  constructor(
    initialParams: {
      measureId: MeasureId;
      initialFilter: InitialFilter;
    },
    private context: { myDispatch: (msg: Msg) => void }
  ) {
    const { measureId, initialFilter } = initialParams;

    switch (initialFilter.type) {
      case "minmax":
        this.state = {
          type: "minmax",
          model: new MinMaxFilter(
            {
              measureId,
              minValue: initialFilter.minValue,
              maxValue: initialFilter.maxValue,
            },
            { myDispatch: (msg) => this.context.myDispatch({ type: "MINMAX_FILTER_MSG", msg }) }
          ),
        };
        break;

      case "toggle":
        this.state = {
          type: "toggle",
          model: new ToggleFilter(
            {
              measureId,
              value: initialFilter.value,
            },
            { myDispatch: (msg) => this.context.myDispatch({ type: "TOGGLE_FILTER_MSG", msg }) }
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
        return this.state.model.state.unitToggle.state.selectedUnit;

      case "toggle":
        return this.state.model.state.unitToggle.state.selectedUnit;
    }
  }

  filterApplies(value: UnitValue) {
    switch (this.state.type) {
      case "minmax":
        return this.state.model.filterApplies(value);

      case "toggle":
        return this.state.model.filterApplies(value);

      default:
        assertUnreachable(this.state);
    }
  }

  getQuery() {
    switch (this.state.type) {
      case "minmax":
        return this.state.model.getQuery();

      case "toggle":
        return this.state.model.getQuery();

      default:
        assertUnreachable(this.state);
    }
  }

  update(msg: Msg) {
    switch (this.state.type) {
      case "minmax":
        if (msg.type !== "MINMAX_FILTER_MSG") {
          throw new Error("Unexpected message type");
        }
        this.state.model.update(msg.msg);
        break;

      case "toggle":
        if (msg.type !== "TOGGLE_FILTER_MSG") {
          throw new Error("Unexpected message type");
        }
        this.state.model.update(msg.msg);
        break;
    }
  }

  view() {
    switch (this.state.type) {
      case "minmax":
        return this.state.model.view();

      case "toggle":
        return this.state.model.view();
    }
  }
}
