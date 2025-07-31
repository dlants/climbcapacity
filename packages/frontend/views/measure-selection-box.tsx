import * as DCGView from "dcgview";
import { Dispatch } from "../types";
import { MEASURES } from "../../iso/measures";
import { assertUnreachable, filterMeasures } from "../util/utils";
import { MeasureId, MeasureSpec } from "../../iso/measures/index";

export type Model =
  | {
      state: "typing";
      query: string;
      measures: MeasureSpec[];
    }
  | {
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
  myDispatch: Dispatch<Msg>;
}> {
  state: Model;

  init() {
    this.state = {
      state: "typing",
      query: "",
      measures: [],
    };
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "TYPE_QUERY":
        this.state = {
          state: "typing",
          query: msg.query,
          measures: filterMeasures(MEASURES, msg.query),
        };
        break;

      case "SELECT_MEASURE":
        this.state = {
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

    return SwitchUnion(() => this.state, "state", {
      typing: (getState) => (
        <div class="measure-selection-box">
          <input
            type="text"
            value={() => getState().query}
            onChange={(e) =>
              this.props.myDispatch({
                type: "TYPE_QUERY",
                query: (e.target as HTMLInputElement).value,
              })
            }
            placeholder="Search measures..."
          />
          <ul>
            <For
              each={() => getState().measures}
              key={(measure: MeasureSpec) => measure.id}
            >
              {(getMeasure: () => MeasureSpec) => (
                <li
                  onClick={() =>
                    this.props.myDispatch({
                      type: "SELECT_MEASURE",
                      measureId: getMeasure().id,
                    })
                  }
                >
                  {() => getMeasure().id}
                </li>
              )}
            </For>
          </ul>
        </div>
      ),
      selected: (getState) => (
        <div class="measure-selection-box">
          <span
            onClick={() =>
              this.props.myDispatch({
                type: "TYPE_QUERY",
                query: getState().measureId,
              })
            }
          >
            {() => getState().measureId}
          </span>
        </div>
      ),
    });
  }
}
