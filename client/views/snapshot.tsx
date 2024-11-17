import React from "react";
import * as immer from "immer";
const produce = immer.produce;

import type { HydratedSnapshot } from "../types";
import { Update, View, Dispatch } from "../tea";
import { convertToStandardUnit, UnitValue } from "../../iso/units";
import { RequestStatus, RequestStatusView } from "../util/utils";
import {
  MeasureStats,
  SnapshotId,
  SnapshotUpdateRequest,
} from "../../iso/protocol";
import { MeasureId } from "../../iso/measures";
import * as MeasureSelector from "./snapshot/measure-selector";
import * as EditMeasureOrClass from "./snapshot/edit-measure-or-class";

type EditingEditingState = {
  state: "editing";
  model: EditMeasureOrClass.Model;
};

type SubmittingEditingState = {
  state: "submitting";
  measureId: MeasureId;
  value: UnitValue;
  trainingMeasure?: {
    measureId: MeasureId;
    value: UnitValue;
  };
  writeRequest: RequestStatus<void>;
};

type EditingState =
  | EditingEditingState
  | SubmittingEditingState
  | {
      state: "not-editing";
    };

export type Model = immer.Immutable<{
  snapshot: HydratedSnapshot;
  measureStats: MeasureStats;
  measureSelector: MeasureSelector.Model;
  editingState: EditingState;
}>;

export function initModel({
  snapshot,
  measureStats,
}: {
  snapshot: HydratedSnapshot;
  measureStats: MeasureStats;
}): Model {
  return {
    snapshot,
    measureStats,
    measureSelector: MeasureSelector.initModel({ snapshot, measureStats }),
    editingState: { state: "not-editing" },
  };
}

export type Msg =
  | {
      type: "MEASURE_SELECTOR_MSG";
      msg: MeasureSelector.Msg;
    }
  | {
      type: "EDIT_MEASURE_OR_CLASS_MSG";
      msg: EditMeasureOrClass.Msg;
    }
  | {
      type: "SUBMIT_MEASURE_UPDATE";
    }
  | {
      type: "DISCARD_MEASURE_UPDATE";
    }
  | {
      type: "MEASURE_REQUEST_UPDATE";
      request: RequestStatus<void>;
    };

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "MEASURE_SELECTOR_MSG":
      return [
        produce(model, (draft) => {
          const [next] = MeasureSelector.update(msg.msg, draft.measureSelector);
          draft.measureSelector = immer.castDraft(next);

          if (msg.msg.type == "INIT_UPDATE") {
            draft.editingState = immer.castDraft({
              state: "editing",
              model: EditMeasureOrClass.initModel({
                init: msg.msg.update,
                snapshot: model.snapshot,
              }),
            });
          }
        }),
      ];

    case "DISCARD_MEASURE_UPDATE":
      return [
        produce(model, (draft) => {
          draft.editingState = { state: "not-editing" };
        }),
      ];

    case "MEASURE_REQUEST_UPDATE": {
      const editingState = model.editingState;
      if (!(editingState.state == "submitting")) {
        throw new Error(
          `Unexpected editingState on request update: ${JSON.stringify(editingState)}`,
        );
      }

      if (msg.request.status == "loaded") {
        const nextSnapshot: HydratedSnapshot = produce(
          model.snapshot,
          (draft) => {
            draft.measures[editingState.measureId] = immer.castDraft(
              editingState.value,
            );
            draft.normalizedMeasures[editingState.measureId] = immer.castDraft(
              convertToStandardUnit(editingState.value),
            );

            if (editingState.trainingMeasure) {
              draft.measures[editingState.trainingMeasure.measureId] =
                immer.castDraft(editingState.trainingMeasure.value);
              draft.normalizedMeasures[editingState.trainingMeasure.measureId] =
                immer.castDraft(
                  convertToStandardUnit(editingState.trainingMeasure.value),
                );
            }
          },
        );

        return [
          produce(model, (draft) => {
            draft.snapshot = nextSnapshot;
            draft.editingState = { state: "not-editing" };
          }),
        ];
      } else {
        return [
          produce(model, (draft) => {
            const editingState = draft.editingState;
            if (!(editingState.state == "submitting")) {
              throw new Error(
                `Unexpected editingState on request update: ${JSON.stringify(editingState)}`,
              );
            }

            editingState.writeRequest = msg.request;
          }),
        ];
      }
    }

    case "EDIT_MEASURE_OR_CLASS_MSG":
      return [
        produce(model, (draft) => {
          if (draft.editingState.state != "editing") {
            throw new Error(`Unexpected editingState when editing`);
          }
          const [next] = EditMeasureOrClass.update(
            msg.msg,
            draft.editingState.model,
          );
          draft.editingState.model = immer.castDraft(next);
        }),
      ];

    case "SUBMIT_MEASURE_UPDATE": {
      const editingState = model.editingState;
      if (!(editingState.state == "editing" && editingState.model.canSubmit)) {
        throw new Error(
          `Unexpected state for editingState upon submit ${JSON.stringify(editingState)}`,
        );
      }

      const canSubmit = editingState.model.canSubmit;

      const requestParams: SnapshotUpdateRequest = {
        snapshotId: model.snapshot._id as SnapshotId,
        updates: {
          [canSubmit.measureId]: canSubmit.value,
        },
      };
      if (canSubmit.trainingMeasure) {
        requestParams.updates[canSubmit.trainingMeasure.measureId] =
          canSubmit.trainingMeasure.value;
      }

      return [
        produce(model, (draft) => {
          draft.editingState = {
            state: "submitting",
            measureId: canSubmit.measureId,
            value: canSubmit.value,
            trainingMeasure: canSubmit.trainingMeasure,
            writeRequest: { status: "loading" },
          };
        }),
        async (dispatch) => {
          const response = await fetch("/api/snapshots/update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestParams),
          });

          if (response.ok) {
            dispatch({
              type: "MEASURE_REQUEST_UPDATE",
              request: {
                status: "loaded",
                response: void 0,
              },
            });
          } else {
            dispatch({
              type: "MEASURE_REQUEST_UPDATE",
              request: { status: "error", error: await response.text() },
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
      {(() => {
        switch (model.editingState.state) {
          case "not-editing":
            return <NotEditingView model={model} dispatch={dispatch} />;

          case "editing":
            return (
              <div>
                <EditMeasureOrClass.view
                  model={model.editingState.model}
                  dispatch={(msg) =>
                    dispatch({ type: "EDIT_MEASURE_OR_CLASS_MSG", msg })
                  }
                />
                <button
                  onClick={() => {
                    dispatch({
                      type: "SUBMIT_MEASURE_UPDATE",
                    });
                  }}
                  disabled={model.editingState.model.canSubmit == undefined}
                >
                  Submit
                </button>{" "}
                <button
                  onClick={() => {
                    dispatch({
                      type: "DISCARD_MEASURE_UPDATE",
                    });
                  }}
                >
                  Discard Changes
                </button>
              </div>
            );

          case "submitting":
            return (
              <RequestStatusView
                request={model.editingState.writeRequest}
                dispatch={dispatch}
                viewMap={{
                  "not-sent": () => <div>Not Sent</div>,
                  loading: () => <div>Submitting...</div>,
                  error: ({ error }) => <div>Error: {error}</div>,
                  loaded: () => <div>Done.</div>,
                }}
              />
            );
        }
      })()}
    </div>
  );
};

function NotEditingView({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: Dispatch<Msg>;
}) {
  return (
    <div className="measures-list">
      <MeasureSelector.view
        model={model.measureSelector}
        dispatch={(msg) => dispatch({ type: "MEASURE_SELECTOR_MSG", msg })}
      />
    </div>
  );
}
