import * as DCGView from "dcgview";

import type { HydratedSnapshot } from "../../types";
import { Dispatch } from "../../types";
import { UnitValue, unitValueToString } from "../../../iso/units";
import { isSubsequence } from "../../util/utils";
import { MeasureId, MeasureSpec, MEASURES } from "../../../iso/measures";
import { assertUnreachable } from "../../../iso/utils";
import { InitOptions } from "./edit-measure-or-class";

export type Model = {
  query: string;
  snapshot: HydratedSnapshot;
  filteredMeasures: MeasureSpec[];
};

export class MeasureSelectorController {
  state: Model;

  constructor(
    { snapshot }: { snapshot: HydratedSnapshot },
    public context: {
      myDispatch: Dispatch<Msg>;
    },
  ) {
    this.state = {
      query: "",
      snapshot,
      filteredMeasures: [],
    };

    this.updateFilteredMeasures();
  }

  private updateFilteredMeasures() {
    const queryTerms = this.state.query
      .toLowerCase()
      .split(" ")
      .filter((t) => t.length > 0);

    this.state.filteredMeasures = MEASURES.filter((measure) => {
      if (queryTerms.length === 0) return true;

      const name = measure.name.toLowerCase();
      const id = measure.id.toLowerCase();
      const description = measure.description.toLowerCase();

      return queryTerms.every(
        (term) =>
          isSubsequence(term, name) ||
          isSubsequence(term, id) ||
          isSubsequence(term, description),
      );
    });
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "UPDATE_QUERY":
        this.state.query = msg.query;
        this.updateFilteredMeasures();
        break;
      case "DELETE_MEASURE":
      case "INIT_UPDATE":
        // do nothing since we will cover this in the parent component
        break;
      default:
        assertUnreachable(msg);
    }
  }
}

class MeasureItemView extends DCGView.View<{
  measure: () => MeasureSpec;
  snapshot: () => HydratedSnapshot;
  dispatch: (msg: Msg) => void;
}> {
  template() {
    const measure = this.props.measure();
    const unitValue = this.props.snapshot().measures[measure.id];

    return (
      <div class="measure-item">
        <div class="measure-info">
          <div class="measure-name">{measure.description}</div>
          <div class="measure-type">{measure.type}</div>
        </div>
        <div class="measure-value">
          {unitValue ? unitValueToString(unitValue as UnitValue) : "Not set"}
        </div>
        <div class="measure-actions">
          <button
            onClick={() => {
              this.props.dispatch({
                type: "INIT_UPDATE",
                update: {
                  type: "measure",
                  measureId: measure.id,
                },
              });
            }}
          >
            {unitValue ? "Edit" : "Add"}
          </button>
          {unitValue ? (
            <button
              onClick={() => {
                this.props.dispatch({
                  type: "DELETE_MEASURE",
                  measureId: measure.id,
                });
              }}
            >
              Delete
            </button>
          ) : undefined}
        </div>
      </div>
    );
  }
}

export class MeasureSelectorView extends DCGView.View<{
  controller: MeasureSelectorController;
}> {
  template() {
    const { For } = DCGView.Components;
    const stateProp = () => this.props.controller().state;
    const dispatch = (msg: Msg) =>
      this.props.controller().context.myDispatch(msg);

    return (
      <div class="measure-selector">
        <div class="search-container">
          <input
            type="text"
            placeholder="Search measures..."
            value={() => stateProp().query}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_QUERY",
                query: (e.target as HTMLInputElement).value,
              })
            }
          />
        </div>
        <div class="measures-list">
          <For
            each={() => stateProp().filteredMeasures}
            key={(measure) => measure.id}
          >
            {(measure) => (
              <MeasureItemView
                measure={measure}
                snapshot={() => stateProp().snapshot}
                dispatch={dispatch}
              />
            )}
          </For>
        </div>
      </div>
    );
  }
}

export type Msg =
  | {
      type: "UPDATE_QUERY";
      query: string;
    }
  | {
      type: "INIT_UPDATE";
      update: InitOptions;
    }
  | {
      type: "DELETE_MEASURE";
      measureId: MeasureId;
    };
