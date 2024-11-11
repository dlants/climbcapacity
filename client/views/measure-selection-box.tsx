import React from "react";
import * as immer from "immer";
import { Update, View } from "../tea";
import { MEASURES } from "../constants";
import { assertUnreachable, filterMeasures } from "../util/utils";
import { MeasureId, MeasureSpec } from "../../iso/units";
import { MeasureStats } from "../../iso/protocol";

export type Model = immer.Immutable<
  | {
      id: string;
      measureStats: MeasureStats;
      state: "typing";
      query: string;
      measures: MeasureSpec[];
    }
  | {
      id: string;
      measureStats: MeasureStats;
      state: "selected";
      measureId: MeasureId;
    }
>;

export type Msg =
  | {
      type: "TYPE_QUERY";
      query: string;
    }
  | {
      type: "SELECT_MEASURE";
      measureId: MeasureId;
    };

export function initModel({
  id,
  measureStats,
}: {
  id: string;
  measureStats: MeasureStats;
}): Model {
  return {
    id,
    measureStats,
    state: "typing",
    query: "",
    measures: [],
  };
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "TYPE_QUERY":
      return [
        {
          id: model.id,
          measureStats: model.measureStats,
          state: "typing",
          query: msg.query,
          measures: filterMeasures(MEASURES, msg.query),
        },
      ];

    case "SELECT_MEASURE":
      return [
        {
          id: model.id,
          measureStats: model.measureStats,
          state: "selected",
          measureId: msg.measureId,
        },
      ];

    default:
      assertUnreachable(msg);
  }
};

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  if (model.state == "typing") {
    return (
      <div className="measure-selection-box">
        <input
          type="text"
          value={model.query}
          onChange={(e) =>
            dispatch({ type: "TYPE_QUERY", query: e.target.value })
          }
          placeholder="Search measures..."
        />
        <ul>
          {model.measures.map((measure) => (
            <li
              key={measure.id}
              onClick={() =>
                dispatch({ type: "SELECT_MEASURE", measureId: measure.id })
              }
            >
              {measure.id}({model.measureStats.stats[measure.id] || 0}{" "}
              snapshots)
            </li>
          ))}
        </ul>
      </div>
    );
  } else {
    return (
      <div className="measure-selection-box">
        <span
          onClick={() =>
            dispatch({ type: "TYPE_QUERY", query: model.measureId })
          }
        >
          {model.measureId}
        </span>
      </div>
    );
  }
};
