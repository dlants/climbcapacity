import React from "react";

import type { HydratedSnapshot } from "../types";
import { Dispatch } from "../tea";
import { convertToStandardUnit, UnitValue } from "../../iso/units";
import { RequestStatus, RequestStatusView } from "../util/utils";
import {
  MeasureStats,
  SnapshotId,
  SnapshotUpdateRequest,
} from "../../iso/protocol";
import {
  generateTrainingMeasureId,
  getSpec,
  MeasureId,
} from "../../iso/measures";
import * as MeasureSelector from "./snapshot/measure-selector";
import * as EditMeasureOrClass from "./snapshot/edit-measure-or-class";

type EditingEditingState = {
  state: "editing";
  model: EditMeasureOrClass.Model;
};

type SubmittingEditingState = {
  state: "submitting";
  requestParams: SnapshotUpdateRequest;
  writeRequest: RequestStatus<void>;
};

type EditingState =
  | EditingEditingState
  | SubmittingEditingState
  | {
    state: "not-editing";
  };

export type Model = {
  snapshot: HydratedSnapshot;
  measureStats: MeasureStats;
  measureSelector: MeasureSelector.Model;
  editingState: EditingState;
};

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

export class Snapshot {
  state: Model;

  constructor(
    {
      snapshot,
      measureStats,
    }: {
      snapshot: HydratedSnapshot;
      measureStats: MeasureStats;
    },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    this.state = {
      snapshot,
      measureStats,
      measureSelector: MeasureSelector.initModel({ snapshot, measureStats }),
      editingState: { state: "not-editing" },
    };
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "MEASURE_SELECTOR_MSG":
        const [next] = MeasureSelector.update(msg.msg, this.state.measureSelector);
        this.state.measureSelector = next;

        if (msg.msg.type == "INIT_UPDATE") {
          this.state.editingState = {
            state: "editing",
            model: EditMeasureOrClass.initModel({
              init: msg.msg.update,
              snapshot: this.state.snapshot,
              measureStats: this.state.measureStats,
            }),
          };
        } else if (msg.msg.type == "DELETE_MEASURE") {
          const requestParams: SnapshotUpdateRequest = {
            snapshotId: this.state.snapshot._id as SnapshotId,
            deletes: {
              [msg.msg.measureId]: true,
            },
          };

          this.state.editingState = {
            state: "submitting",
            requestParams,
            writeRequest: { status: "loading" },
          };

          const measure = getSpec(msg.msg.measureId);
          if (measure.type == "input") {
            requestParams.deletes![generateTrainingMeasureId(measure.id)] = true;
          }

          (async () => {
            const response = await fetch("/api/snapshots/update", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestParams),
            });

            if (response.ok) {
              this.context.myDispatch({
                type: "MEASURE_REQUEST_UPDATE",
                request: {
                  status: "loaded",
                  response: void 0,
                },
              });
            } else {
              this.context.myDispatch({
                type: "MEASURE_REQUEST_UPDATE",
                request: { status: "error", error: await response.text() },
              });
            }
          })().catch(console.error);
        }
        break;

      case "DISCARD_MEASURE_UPDATE":
        this.state.editingState = { state: "not-editing" };
        break;

      case "MEASURE_REQUEST_UPDATE": {
        const editingState = this.state.editingState;
        if (!(editingState.state == "submitting")) {
          throw new Error(
            `Unexpected editingState on request update: ${JSON.stringify(editingState)}`,
          );
        }

        if (msg.request.status == "loaded") {
          const nextSnapshot: HydratedSnapshot = {
            ...this.state.snapshot,
            measures: { ...this.state.snapshot.measures },
            normalizedMeasures: { ...this.state.snapshot.normalizedMeasures },
          };

          for (const measureIdStr in editingState.requestParams.updates || {}) {
            const measureId = measureIdStr as MeasureId;
            const value = editingState.requestParams.updates![measureId];
            nextSnapshot.measures[measureId] = value;
            nextSnapshot.normalizedMeasures[measureId] = convertToStandardUnit(value);
          }
          for (const measureIdStr in editingState.requestParams.deletes || {}) {
            const measureId = measureIdStr as MeasureId;
            delete nextSnapshot.measures[measureId];
            delete nextSnapshot.normalizedMeasures[measureId];
          }

          this.state.snapshot = nextSnapshot;
          this.state.editingState = { state: "not-editing" };
          this.state.measureSelector = MeasureSelector.initModel({
            snapshot: nextSnapshot,
            measureStats: this.state.measureStats,
          });
        } else {
          const editingState = this.state.editingState;
          if (!(editingState.state == "submitting")) {
            throw new Error(
              `Unexpected editingState on request update: ${JSON.stringify(editingState)}`,
            );
          }

          editingState.writeRequest = msg.request;
        }
        break;
      }

      case "EDIT_MEASURE_OR_CLASS_MSG":
        if (this.state.editingState.state != "editing") {
          throw new Error(`Unexpected editingState when editing`);
        }
        const [nextEditModel] = EditMeasureOrClass.update(
          msg.msg,
          this.state.editingState.model,
        );
        this.state.editingState.model = nextEditModel;
        break;

      case "SUBMIT_MEASURE_UPDATE": {
        const editingState = this.state.editingState;
        if (!(editingState.state == "editing" && editingState.model.canSubmit)) {
          throw new Error(
            `Unexpected state for editingState upon submit ${JSON.stringify(editingState)}`,
          );
        }

        const canSubmit = editingState.model.canSubmit;

        const requestParams: SnapshotUpdateRequest = {
          snapshotId: this.state.snapshot._id as SnapshotId,
          updates: {
            [canSubmit.measureId]: canSubmit.value,
          },
        };
        if (canSubmit.trainingMeasure) {
          requestParams.updates![canSubmit.trainingMeasure.measureId] =
            canSubmit.trainingMeasure.value;
        }

        this.state.editingState = {
          state: "submitting",
          requestParams,
          writeRequest: { status: "loading" },
        };

        (async () => {
          const response = await fetch("/api/snapshots/update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestParams),
          });

          if (response.ok) {
            this.context.myDispatch({
              type: "MEASURE_REQUEST_UPDATE",
              request: {
                status: "loaded",
                response: void 0,
              },
            });
          } else {
            this.context.myDispatch({
              type: "MEASURE_REQUEST_UPDATE",
              request: { status: "error", error: await response.text() },
            });
          }
        })().catch(console.error);
        break;
      }
    }
  }

  view() {
    const NotEditingView = () => (
      <div className="measures-list">
        <MeasureSelector.view
          model={this.state.measureSelector}
          dispatch={(msg) => this.context.myDispatch({ type: "MEASURE_SELECTOR_MSG", msg })}
        />
      </div>
    );

    return (
      <div className="snapshot-view">
        {(() => {
          switch (this.state.editingState.state) {
            case "not-editing":
              return <NotEditingView />;

            case "editing":
              const editingState = this.state.editingState;
              return (
                <div>
                  <EditMeasureOrClass.view
                    model={this.state.editingState.model}
                    dispatch={(msg) =>
                      this.context.myDispatch({ type: "EDIT_MEASURE_OR_CLASS_MSG", msg })
                    }
                  />
                  <button
                    onPointerDown={() => {
                      if (editingState.model.canSubmit) {
                        this.context.myDispatch({
                          type: "SUBMIT_MEASURE_UPDATE",
                        });
                      }
                    }}
                    disabled={editingState.model.canSubmit == undefined}
                  >
                    Submit
                  </button>{" "}
                  <button
                    onPointerDown={() => {
                      this.context.myDispatch({
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
                  request={this.state.editingState.writeRequest}
                  dispatch={this.context.myDispatch}
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
  }
}
