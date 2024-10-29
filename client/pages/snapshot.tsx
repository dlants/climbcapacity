import React from "react";
import type { Snapshot } from "../types";
import { Update, View } from "../tea";
import { Measure, MEASURES } from "../../iso/measures";
import { MeasureId } from "../../iso/protocol";
import { RequestStatus } from "../utils";

type MeasureUpdate = {
  measureId: MeasureId;
  value: number;
  request: RequestStatus<void> | undefined;
};

export type Model = {
  userId: string;
  snapshot: Snapshot;
  measureFilter: { query: string; measures: Measure[] };
  measureUpdates: {
    [measureId: MeasureId]: MeasureUpdate;
  };
};

export function initModel({
  userId,
  snapshot,
}: {
  userId: string;
  snapshot: Snapshot;
}): Model {
  return {
    userId,
    snapshot,
    measureFilter: {
      query: "",
      measures: [],
    },
    measureUpdates: {},
  };
}

export type Msg =
  | {
      type: "SET_MEASURE_FILTER";
      query: string;
    }
  | {
      type: "UPDATE_MEASURE";
      measureId: MeasureId;
      value: number;
    }
  | {
      type: "MEASURE_REQUEST_UPDATE";
      measureId: MeasureId;
      value: number;
      request: RequestStatus<void>;
    };

function measureUpdate(
  measureUpdates: Model["measureUpdates"],
  update: MeasureUpdate,
): Model["measureUpdates"] {
  return {
    ...measureUpdates,
    [update.measureId]: update,
  };
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "SET_MEASURE_FILTER":
      return [
        {
          ...model,
          measureFilter: {
            query: msg.query,
            measures: MEASURES.filter((m) => m.name.indexOf(msg.query) > -1),
          },
        },
      ];

    case "MEASURE_REQUEST_UPDATE":
      return [
        {
          ...model,
          measureUpdates: measureUpdate(model.measureUpdates, {
            measureId: msg.measureId,
            value: msg.value,
            request: msg.request,
          }),
        },
      ];

    case "UPDATE_MEASURE":
      return [
        {
          ...model,
          measureUpdates: measureUpdate(model.measureUpdates, {
            measureId: msg.measureId,
            value: msg.value,
            request: { status: "loading" },
          }),
        },
        async (dispatch) => {
          const response = await fetch("/snapshots/update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              snapshotId: model.snapshot._id,
              measureId: msg.measureId,
              value: msg.value,
            }),
          });

          if (response.ok) {
            dispatch({
              type: "MEASURE_REQUEST_UPDATE",
              measureId: msg.measureId,
              value: msg.value,
              request: {
                status: "loaded",
                response: void 0,
              },
            });
          } else {
            dispatch({
              type: "MEASURE_REQUEST_UPDATE",
              measureId: msg.measureId,
              value: msg.value,
              request: { status: "error", error: response.statusText },
            });
          }
        },
      ];
  }
};

export const view: View<Msg, Model> = (model, dispatch) => {
  return (
    <div className="snapshot-view">
      <input
        type="text"
        placeholder="Filter measures..."
        value={model.measureFilter.query}
        onChange={(e) =>
          dispatch({ type: "SET_MEASURE_FILTER", query: e.target.value })
        }
      />

      <div className="measures-list">
        {model.measureFilter.measures.map((measure) => {
          const measureUpdate = model.measureUpdates[measure.id];
          const measureLoading =
            measureUpdate && measureUpdate.request?.status == "loading";

          const measureValue =
            (measureUpdate && measureUpdate.value) ||
            model.snapshot.measures[measure.id];
          return (
            <div
              key={measure.id}
              className={`measure-item ${measureLoading ? "measure-loading" : ""}`}
            >
              <label>{measure.name}</label>
              <input
                type="number"
                value={measureValue || ""}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_MEASURE",
                    measureId: measure.id,
                    value: parseFloat(e.target.value),
                  })
                }
                disabled={measureLoading}
              />
              <span>{measure.unit}</span>
            </div>
          );
        })}
      </div>

      <pre>{JSON.stringify(model.snapshot, null, 2)}</pre>
    </div>
  );
};
