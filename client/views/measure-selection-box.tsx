import React from "react";
import { Dispatch } from "../tea";
import { MEASURES } from "../constants";
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

export class MeasureSelectionBox {
  state: Model;

  constructor(
    { measureStats }: { measureStats: MeasureStats },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    this.state = {
      measureStats,
      state: "typing",
      query: "",
      measures: [],
    };
  }

  update(msg: Msg) {
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

  view() {
    if (this.state.state === "typing") {
      return (
        <div className="measure-selection-box">
          <input
            type="text"
            value={this.state.query}
            onChange={(e) =>
              this.context.myDispatch({ type: "TYPE_QUERY", query: e.target.value })
            }
            placeholder="Search measures..."
          />
          <ul>
            {this.state.measures.map((measure) => (
              <li
                key={measure.id}
                onPointerDown={() =>
                  this.context.myDispatch({ type: "SELECT_MEASURE", measureId: measure.id })
                }
              >
                {measure.id}({this.state.measureStats[measure.id] || 0} snapshots)
              </li>
            ))}
          </ul>
        </div>
      );
    } else if (this.state.state === "selected") {
      const measureId = this.state.measureId;
      return (
        <div className="measure-selection-box">
          <span
            onPointerDown={() =>
              this.context.myDispatch({ type: "TYPE_QUERY", query: measureId })
            }
          >
            {this.state.measureId}
          </span>
        </div>
      );
    } else {
      return assertUnreachable(this.state);
    }
  }
}
