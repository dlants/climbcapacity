import React from "react";
import * as immer from "immer";
const produce = immer.produce;

import type { HydratedSnapshot } from "../types";
import { Update, View, Dispatch } from "../tea";
import {
  convertToStandardUnit,
  MeasureId,
  MeasureSpec,
  UnitValue,
  unitValueToString,
} from "../../iso/units";
import { MEASURES } from "../constants";
import { filterMeasures, RequestStatus } from "../util/utils";
import { Result, Success } from "../../iso/utils";
import * as UnitInput from "./unit-input";

type MeasureUpdate = {
  measureId: MeasureId;
  model: UnitInput.Model;
  parseResult: Result<{
    value: UnitValue;
    writeRequest: RequestStatus<void>;
  }>;
};

type ParsedMeasureUpdate = {
  measureId: MeasureId;
  model: UnitInput.HasParseResultModel;
  parseResult: Success<{
    value: UnitValue;
    writeRequest: RequestStatus<void>;
  }>;
};

function hasParseResult(
  measureUpdate: MeasureUpdate | undefined,
): measureUpdate is ParsedMeasureUpdate {
  return !!(measureUpdate && measureUpdate.parseResult.status == "success");
}

export type Model = immer.Immutable<{
  snapshot: HydratedSnapshot;
  measureFilter: { query: string; measures: MeasureSpec[] };
  measureUpdates: {
    [measureId: MeasureId]: MeasureUpdate;
  };
}>;

export function initModel({ snapshot }: { snapshot: HydratedSnapshot }): Model {
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
      type: "UNIT_INPUT_MSG";
      measureId: MeasureId;
      msg: UnitInput.Msg;
    }
  | {
      type: "INIT_MEASURE_UPDATE";
      measureId: MeasureId;
    }
  | {
      type: "SUBMIT_MEASURE_UPDATE";
      measureId: MeasureId;
    }
  | {
      type: "DISCARD_MEASURE_UPDATE";
      measureId: MeasureId;
    }
  | {
      type: "MEASURE_REQUEST_UPDATE";
      measureId: MeasureId;
      request: RequestStatus<void>;
    };

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "SET_MEASURE_FILTER":
      return [
        produce(model, (draft) => {
          draft.measureFilter = {
            query: msg.query,
            measures: filterMeasures(MEASURES, msg.query),
          };
        }),
      ];

    case "INIT_MEASURE_UPDATE":
      return [
        produce(model, (draft) => {
          const model = immer.castDraft(UnitInput.initModel(msg.measureId));
          draft.measureUpdates[msg.measureId] = {
            measureId: msg.measureId,
            model,
            parseResult:
              model.parseResult.status == "success"
                ? {
                    status: "success",
                    value: {
                      value: model.parseResult.value,
                      writeRequest: { status: "not-sent" },
                    },
                  }
                : model.parseResult,
          };
        }),
      ];

    case "DISCARD_MEASURE_UPDATE":
      return [
        produce(model, (draft) => {
          delete draft.measureUpdates[msg.measureId];
        }),
      ];

    case "MEASURE_REQUEST_UPDATE": {
      const measureUpdate = model.measureUpdates[msg.measureId];
      if (!hasParseResult(measureUpdate)) {
        throw new Error(
          `Unexpected measureUpdate status on request update: ${JSON.stringify(measureUpdate)}`,
        );
      }

      const measureValue = measureUpdate.parseResult.value;

      if (msg.request.status == "loaded") {
        const nextSnapshot: HydratedSnapshot = produce(
          model.snapshot,
          (draft) => {
            draft.measures[msg.measureId] = immer.castDraft(measureValue.value);
            draft.normalizedMeasures[msg.measureId] = immer.castDraft(
              convertToStandardUnit(measureValue.value),
            );
          },
        );

        const nextMeasureUpdates = produce(model.measureUpdates, (draft) => {
          delete draft[msg.measureId];
        });

        return [
          produce(model, (draft) => {
            draft.snapshot = nextSnapshot;
            draft.measureUpdates = immer.castDraft(nextMeasureUpdates);
          }),
        ];
      } else {
        return [
          produce(model, (draft) => {
            const measureUpdate = draft.measureUpdates[msg.measureId];
            if (!hasParseResult(measureUpdate)) {
              throw new Error(
                `Unexpected measureUpdate status on request update: ${JSON.stringify(measureUpdate)}`,
              );
            }

            measureUpdate.parseResult.value.writeRequest = msg.request;
          }),
        ];
      }
    }

    case "UNIT_INPUT_MSG": {
      const measureUpdate = model.measureUpdates[msg.measureId];
      if (!measureUpdate) {
        throw new Error(
          `Receivied message for measureId ${msg.measureId} but it was undefined.`,
        );
      }

      const [next] = UnitInput.update(msg.msg, measureUpdate.model);

      return [
        produce(model, (draft) => {
          const measureUpdate = draft.measureUpdates[msg.measureId];
          if (!measureUpdate) {
            throw new Error(
              `Receivied message for measureId ${msg.measureId} but it was undefined.`,
            );
          }

          measureUpdate.model = immer.castDraft(next);
          if (next.parseResult.status == "success") {
            measureUpdate.parseResult = {
              status: "success",
              value: {
                value: next.parseResult.value,
                writeRequest: { status: "not-sent" },
              },
            };
          }
        }),
      ];
    }

    case "SUBMIT_MEASURE_UPDATE": {
      const measureUpdate = model.measureUpdates[msg.measureId];
      if (!hasParseResult(measureUpdate)) {
        throw new Error(
          `Unexpected state for measureUpdate upon submit ${JSON.stringify(measureUpdate)}`,
        );
      }

      const value = measureUpdate.parseResult.value.value;

      return [
        produce(model, (draft) => {
          const measureUpdate = draft.measureUpdates[msg.measureId];
          if (!hasParseResult(measureUpdate)) {
            throw new Error(
              `Unexpected state for measureUpdate upon submit ${JSON.stringify(measureUpdate)}`,
            );
          }

          measureUpdate.parseResult.value.writeRequest = { status: "loading" };
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
              value,
            }),
          });

          if (response.ok) {
            dispatch({
              type: "MEASURE_REQUEST_UPDATE",
              measureId: msg.measureId,
              request: {
                status: "loaded",
                response: void 0,
              },
            });
          } else {
            dispatch({
              type: "MEASURE_REQUEST_UPDATE",
              measureId: msg.measureId,
              request: { status: "error", error: response.statusText },
            });
          }
        },
      ];
    }
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
        {model.measureFilter.measures.map((measure) =>
          model.measureUpdates[measure.id] ? (
            <EditMeasureView
              measure={measure}
              dispatch={dispatch}
              model={model}
            />
          ) : (
            <MeasureView measure={measure} dispatch={dispatch} model={model} />
          ),
        )}
      </div>

      <pre>{JSON.stringify(model.snapshot, null, 2)}</pre>
    </div>
  );
};

const MeasureView = ({
  model,
  dispatch,
  measure,
}: {
  model: Model;
  dispatch: Dispatch<Msg>;
  measure: immer.Immutable<MeasureSpec>;
}) => {
  const unitValue = model.snapshot.measures[measure.id];
  return (
    <div key={measure.id} className="measure-item">
      <label>{measure.name}</label>{" "}
      {unitValue ? unitValueToString(unitValue as UnitValue) : "N / A"}{" "}
      <button
        onClick={() => {
          dispatch({
            type: "INIT_MEASURE_UPDATE",
            measureId: measure.id,
          });
        }}
      >
        Edit
      </button>
    </div>
  );
};

const EditMeasureView = ({
  model,
  dispatch,
  measure,
}: {
  model: Model;
  dispatch: Dispatch<Msg>;
  measure: immer.Immutable<MeasureSpec>;
}) => {
  const measureUpdate = model.measureUpdates[measure.id];
  const measureValid = hasParseResult(measureUpdate);
  const measureLoading =
    measureValid &&
    measureUpdate.parseResult.value.writeRequest.status == "loading";

  return (
    <span
      key={measure.id}
      className={`measure-item ${measureLoading ? "measure-loading" : ""}`}
    >
      <label>{measure.name}</label>
      <UnitInput.UnitInput
        model={measureUpdate.model}
        dispatch={(msg) => {
          dispatch({
            type: "UNIT_INPUT_MSG",
            measureId: measure.id,
            msg,
          });
        }}
      />
      {measureUpdate.model.possibleUnits.length > 1 && (
        <UnitInput.UnitToggle
          model={measureUpdate.model}
          dispatch={(msg) => {
            dispatch({
              type: "UNIT_INPUT_MSG",
              measureId: measure.id,
              msg,
            });
          }}
        />
      )}
      <button
        onClick={() => {
          if (measureValid) {
            dispatch({
              type: "SUBMIT_MEASURE_UPDATE",
              measureId: measure.id,
            });
          }
        }}
        disabled={!(measureValid && !measureLoading)}
      >
        Submit
      </button>{" "}
      <button
        onClick={() => {
          dispatch({
            type: "DISCARD_MEASURE_UPDATE",
            measureId: measure.id,
          });
        }}
        disabled={measureLoading}
      >
        Discard
      </button>
    </span>
  );
};
