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
import { MEASURES, MEASURE_MAP } from "../constants";
import {
  filterMeasures,
  RequestStatus,
  RequestStatusView,
} from "../util/utils";
import * as UnitInput from "./unit-input";
import { SnapshotId, SnapshotUpdateRequest } from "../../iso/protocol";

type CanSubmitEditingState = {
  state: "can-submit";
  measureId: MeasureId;
  model: UnitInput.HasParseResultModel;
  trainingMeasure?: {
    measureId: MeasureId;
    model: UnitInput.HasParseResultModel;
  };
};

type EditingEditingState = {
  state: "editing";
  measureId: MeasureId;
  model: UnitInput.Model;
  trainingMeasure?: {
    measureId: MeasureId;
    model: UnitInput.Model;
  };
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
  | CanSubmitEditingState
  | SubmittingEditingState
  | {
      state: "not-editing";
    };

export type Model = immer.Immutable<{
  snapshot: HydratedSnapshot;
  measureFilter: { query: string; measures: MeasureSpec[] };
  editingState: EditingState;
}>;

export function initModel({ snapshot }: { snapshot: HydratedSnapshot }): Model {
  return {
    snapshot,
    measureFilter: {
      query: "",
      measures: MEASURES,
    },
    editingState: { state: "not-editing" },
  };
}

export type Msg =
  | {
      type: "SET_MEASURE_FILTER";
      query: string;
    }
  | {
      type: "UNIT_INPUT_MSG";
      msg: UnitInput.Msg;
    }
  | {
      type: "TRAINING_UNIT_INPUT_MSG";
      msg: UnitInput.Msg;
    }
  | {
      type: "INIT_MEASURE_UPDATE";
      measureId: MeasureId;
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
          const inputModel = immer.castDraft(
            UnitInput.initModel(msg.measureId),
          );
          draft.editingState = {
            state: "editing",
            measureId: msg.measureId,
            model: inputModel,
          };

          const measure = MEASURE_MAP[msg.measureId];
          const trainingMeasureId = measure.trainingMeasureId;
          if (trainingMeasureId) {
            let trainingInputmodel = immer.castDraft(
              UnitInput.initModel(trainingMeasureId),
            );
            draft.editingState.trainingMeasure = {
              measureId: trainingMeasureId,
              model: trainingInputmodel,
            };
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

    case "UNIT_INPUT_MSG": {
      return [
        produce(model, (draft) => {
          const editingState = draft.editingState;
          if (
            !(
              editingState.state == "editing" ||
              editingState.state == "can-submit"
            )
          ) {
            throw new Error(
              `Receivied UNIT_INPUT_MSG but measure was not being edited.`,
            );
          }

          const [next] = UnitInput.update(msg.msg, editingState.model);

          editingState.model = immer.castDraft(next);
          draft.editingState = immer.castDraft(
            transitionEditableState(editingState),
          );
        }),
      ];
    }

    case "TRAINING_UNIT_INPUT_MSG": {
      return [
        produce(model, (draft) => {
          const editingState = draft.editingState;
          if (
            !(
              (editingState.state == "editing" ||
                editingState.state == "can-submit") &&
              editingState.trainingMeasure
            )
          ) {
            throw new Error(
              `Receivied editing message but measure was not being edited.`,
            );
          }

          const [next] = UnitInput.update(
            msg.msg,
            editingState.trainingMeasure.model,
          );

          editingState.trainingMeasure.model = immer.castDraft(next);
          draft.editingState = immer.castDraft(
            transitionEditableState(editingState),
          );
        }),
      ];
    }

    case "SUBMIT_MEASURE_UPDATE": {
      const editingState = model.editingState;
      if (editingState.state != "can-submit") {
        throw new Error(
          `Unexpected state for editingState upon submit ${JSON.stringify(editingState)}`,
        );
      }

      const value = editingState.model.parseResult.value;
      const requestParams: SnapshotUpdateRequest = {
        snapshotId: model.snapshot._id as SnapshotId,
        updates: {
          [editingState.measureId]: value,
        },
      };
      const trainingMeasure = editingState.trainingMeasure;
      if (trainingMeasure) {
        requestParams.updates[trainingMeasure.measureId] =
          trainingMeasure.model.parseResult.value;
      }

      return [
        produce(model, (draft) => {
          draft.editingState = {
            state: "submitting",
            measureId: editingState.measureId,
            value,
            trainingMeasure: trainingMeasure
              ? {
                  measureId: trainingMeasure.measureId,
                  value: trainingMeasure.model.parseResult.value,
                }
              : undefined,
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

function transitionEditableState(
  editingState: EditingEditingState | CanSubmitEditingState,
): EditingEditingState | CanSubmitEditingState {
  if (
    editingState.model.parseResult.status == "success" &&
    (!editingState.trainingMeasure ||
      editingState.trainingMeasure.model.parseResult.status == "success")
  ) {
    return {
      state: "can-submit",
      measureId: editingState.measureId,
      model: editingState.model,
      trainingMeasure: editingState.trainingMeasure,
    } as CanSubmitEditingState;
  } else {
    return {
      state: "editing",
      measureId: editingState.measureId,
      model: editingState.model,
      trainingMeasure: editingState.trainingMeasure,
    } as EditingEditingState;
  }
}

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

      {(() => {
        switch (model.editingState.state) {
          case "not-editing":
            return <NotEditingView model={model} dispatch={dispatch} />;

          case "editing":
          case "can-submit":
            return (
              <EditingView
                editingState={model.editingState}
                dispatch={dispatch}
              />
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
                  "loaded": () => <div>Done.</div>,
                }}
              />
            );
        }
      })()}

      <pre>{JSON.stringify(model.snapshot, null, 2)}</pre>
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
      {model.measureFilter.measures.map((measure) => (
        <MeasureView
          key={measure.id}
          measure={measure}
          dispatch={dispatch}
          model={model}
        />
      ))}
    </div>
  );
}

function EditMeasureView({
  model,
  measureId,
  dispatch,
}: {
  model: UnitInput.Model;
  measureId: MeasureId;
  dispatch: Dispatch<UnitInput.Msg>;
}) {
  const measure = MEASURE_MAP[measureId];
  return (
    <div className={`measure-item`}>
      <label>{measure.name}</label>
      <UnitInput.UnitInput model={model} dispatch={dispatch} />
      {measure.units.length > 1 && (
        <UnitInput.UnitToggle model={model} dispatch={dispatch} />
      )}
    </div>
  );
}

function EditingView({
  editingState,
  dispatch,
}: {
  editingState: EditingEditingState | CanSubmitEditingState;
  dispatch: Dispatch<Msg>;
}) {
  return (
    <div>
      <EditMeasureView
        model={editingState.model}
        measureId={editingState.measureId}
        dispatch={(msg) => dispatch({ type: "UNIT_INPUT_MSG", msg })}
      />
      {editingState.trainingMeasure && (
        <EditMeasureView
          model={editingState.trainingMeasure.model}
          measureId={editingState.trainingMeasure.measureId}
          dispatch={(msg) => dispatch({ type: "TRAINING_UNIT_INPUT_MSG", msg })}
        />
      )}
      <button
        onClick={() => {
          if (editingState.state == "can-submit") {
            dispatch({
              type: "SUBMIT_MEASURE_UPDATE",
            });
          }
        }}
        disabled={editingState.state != "can-submit"}
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
        Discard
      </button>
    </div>
  );
}
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
