import * as DCGView from "dcgview";
import { UnitType } from "../../iso/units";
import { assertUnreachable } from "../../iso/utils";
import { Dispatch } from "../types";
import { MeasureId } from "../../iso/measures";

const { For } = DCGView.Components;

export type Model = {
  measureId: MeasureId;
  selectedUnit: UnitType;
  possibleUnits: UnitType[];
};

export type Msg = {
  type: "SELECT_UNIT";
  unit: UnitType;
};

export class UnitToggleController {
  state: Model;

  constructor(
    initialState: {
      measureId: MeasureId;
      selectedUnit: UnitType;
      possibleUnits: UnitType[];
    },
    public context: { myDispatch: Dispatch<Msg> },
  ) {
    this.state = {
      measureId: initialState.measureId,
      selectedUnit: initialState.selectedUnit,
      possibleUnits: initialState.possibleUnits,
    };
  }

  handleDispatch(msg: Msg) {
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
}

export class UnitToggleView extends DCGView.View<{
  controller: () => UnitToggleController;
}> {
  toggleId: string;

  init() {
    this.toggleId = `unit-toggle-${Math.random().toString(36).substring(2, 11)}`;
  }

  template() {
    return (
      <span>
        <For.Simple each={() => this.props.controller().state.possibleUnits}>
          {(unit) => (
            <span>
              <input
                type="radio"
                id={() => this.toggleId + ":" + unit}
                name={() => this.toggleId}
                value={() => unit}
                checked={() =>
                  unit === this.props.controller().state.selectedUnit
                }
                onChange={() =>
                  this.props
                    .controller()
                    .context.myDispatch({ type: "SELECT_UNIT", unit })
                }
              />
              <label htmlFor={() => this.toggleId + ":" + unit}>{unit}</label>
            </span>
          )}
        </For.Simple>
      </span>
    );
  }
}
