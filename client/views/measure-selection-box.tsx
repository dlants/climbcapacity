import React from "react";
import * as immer from 'immer';
import { Update, View } from "../tea";
import { Measure, MEASURES } from "../../iso/measures";
import { MeasureId } from "../../iso/protocol";
import { assertUnreachable } from "../utils";

export type Model = immer.Immutable<
  | {
      state: "typing";
      query: string;
      measures: Measure[];
    }
  | {
      state: "selected";
      measureId: MeasureId;
    }>;

export type Msg =
  | {
      type: "TYPE_QUERY";
      query: string;
    }
  | {
      type: "SELECT_MEASURE";
      measureId: MeasureId;
    };

export const update: Update<Msg, Model> = (msg) => {
  switch (msg.type) {
    case "TYPE_QUERY":
      return [
        {
          state: "typing",
          query: msg.query,
          measures: MEASURES.filter((m) => m.id.indexOf(msg.query) > -1),
        },
      ];

    case "SELECT_MEASURE":
      return [
        {
          state: "selected",
          measureId: msg.measureId,
        },
      ];

    default:
      assertUnreachable(msg);
  }
};

export const view: View<Msg, Model> = ({model, dispatch}) => {
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
              {measure.id}
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
