import React from "react";
import * as immer from "immer";
const produce = immer.produce;

import type { Snapshot } from "../types";
import { Update, View } from "../tea";
import { Measure } from "../../iso/measures";
import { MEASURES } from "../constants";
import { MeasureId } from "../../iso/protocol";
import { RequestStatus } from "../utils";

type MeasureUpdate = {
  measureId: MeasureId;
  value: number;
  request: RequestStatus<void>;
};

export type Model = immer.Immutable<{
  snapshot: Snapshot;
  measureFilter: { query: string; measures: Measure[] };
  measureUpdates: {
    [measureId: MeasureId]: MeasureUpdate;
  };
}>;

export function initModel({ snapshot }: { snapshot: Snapshot }): Model {
  return {
    snapshot,
    measureFilter: {
      query: "",
      measures: produce(MEASURES, (d) => d),
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
      type: "SUBMIT_MEASURE_UPDATE";
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
  return produce(measureUpdates, (draft) => {
    draft[update.measureId] = update;
  });
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "SET_MEASURE_FILTER":
      return [
        produce(model, (draft) => {
          draft.measureFilter = {
            query: msg.query,
            measures: MEASURES.filter((m) => m.name.indexOf(msg.query) > -1),
          };
        }),
      ];

    case "MEASURE_REQUEST_UPDATE":
      if (msg.request.status == "loaded") {
        const nextSnapshot: Snapshot = produce(model.snapshot, (draft) => {
          draft.measures[msg.measureId] = msg.value;
        });

        const nextMeasureUpdates = produce(model.measureUpdates, (draft) => {
          delete draft[msg.measureId];
        });

        return [
          produce(model, (draft) => {
            draft.snapshot = nextSnapshot;
            draft.measureUpdates = nextMeasureUpdates;
          }),
        ];
      } else {
        return [
          produce(model, (draft) => {
            draft.measureUpdates = measureUpdate(model.measureUpdates, {
              measureId: msg.measureId,
              value: msg.value,
              request: msg.request,
            });
          }),
        ];
      }

    case "UPDATE_MEASURE":
      return [
        produce(model, (draft) => {
          draft.measureUpdates = measureUpdate(model.measureUpdates, {
            measureId: msg.measureId,
            value: msg.value,
            request: { status: "not-sent" },
          });
        }),
      ];

    case "SUBMIT_MEASURE_UPDATE":
      return [
        produce(model, (draft) => {
          draft.measureUpdates = measureUpdate(model.measureUpdates, {
            measureId: msg.measureId,
            value: msg.value,
            request: { status: "loading" },
          });
        }),
        async (dispatch) => {
          const response = await fetch("/api/snapshots/update", {
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

const FilterInput = React.memo(
  ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <input
      type="text"
      placeholder="Filter measures..."
      value={value}
      onChange={onChange}
    />
  ),
);

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div className="snapshot-view">
      <FilterInput
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

          const measureUpdatePending =
            measureValue != model.snapshot.measures[measure.id];

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
              <button
                onClick={() =>
                  dispatch({
                    type: "SUBMIT_MEASURE_UPDATE",
                    measureId: measure.id,
                    value: measureValue,
                  })
                }
                disabled={!measureUpdatePending && measureLoading}
              >
                Submit
              </button>
            </div>
          );
        })}
      </div>

      <pre>{JSON.stringify(model.snapshot, null, 2)}</pre>
    </div>
  );
};