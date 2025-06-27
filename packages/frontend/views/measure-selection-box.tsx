import * as DCGView from "dcgview";
import { Dispatch } from "../types";
import { MEASURES } from "../../iso/measures";
import { assertUnreachable, filterMeasures } from "../util/utils";
import { MeasureId, MeasureSpec } from "../../iso/measures/index";
import { MeasureStats } from "../../iso/protocol";

export type Model =
  | {
    measureStats: MeasureStats;
    state: "typing";
    query: string;
    measures: MeasureSpec[];
  }
  | {
    measureStats: MeasureStats;
    state: "selected";
    measureId: MeasureId;
  };

export type Msg =
  | {
    type: "TYPE_QUERY";
    query: string;
  }
  | {
    type: "SELECT_MEASURE";
    measureId: MeasureId;
  };

export class MeasureSelectionBox extends DCGView.View<{
  measureStats: () => MeasureStats;
  myDispatch: Dispatch<Msg>;
}> {
  state: Model;

  init() {
    this.state = {
      measureStats: this.props.measureStats(),
      state: "typing",
      query: "",
      measures: [],
    };
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "TYPE_QUERY":
        this.state = {
          measureStats: this.state.measureStats,
          state: "typing",
          query: msg.query,
          measures: filterMeasures(MEASURES, msg.query),
        };
        break;

      case "SELECT_MEASURE":
        this.state = {
          measureStats: this.state.measureStats,
          state: "selected",
          measureId: msg.measureId,
        };
        break;

      default:
        assertUnreachable(msg);
    }
  }

  template() {
    const { For, SwitchUnion } = DCGView.Components;

    return SwitchUnion(() => this.state, 'state', {
      typing: (getState) => (
        <div class="measure-selection-box">
          <input
            type="text"
            value={() => getState().query}
            onChange={(e) =>
              this.props.myDispatch({ type: "TYPE_QUERY", query: (e.target as HTMLInputElement).value })
            }
            placeholder="Search measures..."
          />
          <ul>
            <For each={() => getState().measures} key={(measure: MeasureSpec) => measure.id}>
              {(getMeasure: () => MeasureSpec) => (
                <li
                  onPointerDown={() =>
                    this.props.myDispatch({ type: "SELECT_MEASURE", measureId: getMeasure().id })
                  }
                >
                  {() => getMeasure().id}({() => getState().measureStats[getMeasure().id] || 0} snapshots)
                </li>
              )}
            </For>
          </ul>
        </div>
      ),
      selected: (getState) => (
        <div class="measure-selection-box">
          <span
            onPointerDown={() =>
              this.props.myDispatch({ type: "TYPE_QUERY", query: getState().measureId })
            }
          >
            {() => getState().measureId}
          </span>
        </div>
      )
    });
  }
}
