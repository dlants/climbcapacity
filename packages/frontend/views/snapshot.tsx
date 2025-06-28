import * as DCGView from "dcgview";

import type { HydratedSnapshot } from "../types";
import { Dispatch } from "../types";
import { convertToStandardUnit } from "../../iso/units";
import { RequestStatus } from "../util/utils";
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
import {
  MeasureSelectorController,
  MeasureSelectorView,
} from "./snapshot/measure-selector";
import type { Msg as MeasureSelectorMsg } from "./snapshot/measure-selector";
import {
  EditMeasureOrClassController,
  EditMeasureOrClassView,
} from "./snapshot/edit-measure-or-class";
import type { Msg as EditMeasureOrClassMsg } from "./snapshot/edit-measure-or-class";

type EditingEditingState = {
  state: "editing";
  editMeasureOrClass: EditMeasureOrClassController;
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
  measureSelector: MeasureSelectorController;
  editingState: EditingState;
};

export type Msg =
  | {
      type: "MEASURE_SELECTOR_MSG";
      msg: MeasureSelectorMsg;
    }
  | {
      type: "EDIT_MEASURE_OR_CLASS_MSG";
      msg: EditMeasureOrClassMsg;
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

export class SnapshotController {
  state: Model;

  constructor(
    {
      snapshot,
      measureStats,
    }: { snapshot: HydratedSnapshot; measureStats: MeasureStats },
    public myDispatch: Dispatch<Msg>,
  ) {
    this.state = {
      snapshot,
      measureStats,
      measureSelector: new MeasureSelectorController(
        {
          snapshot,
          measureStats,
        },
        {
          myDispatch: (msg: MeasureSelectorMsg) =>
            this.handleDispatch({ type: "MEASURE_SELECTOR_MSG", msg }),
        },
      ),
      editingState: { state: "not-editing" },
    };
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "MEASURE_SELECTOR_MSG":
        this.state.measureSelector.handleDispatch(msg.msg);

        if (msg.msg.type == "INIT_UPDATE") {
          this.state.editingState = {
            state: "editing",
            editMeasureOrClass: new EditMeasureOrClassController(
              {
                init: msg.msg.update,
                snapshot: this.state.snapshot,
                measureStats: this.state.measureStats,
              },
              {
                myDispatch: (msg: EditMeasureOrClassMsg) =>
                  this.handleDispatch({
                    type: "EDIT_MEASURE_OR_CLASS_MSG",
                    msg,
                  }),
              },
            ),
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
            requestParams.deletes![generateTrainingMeasureId(measure.id)] =
              true;
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
              this.handleDispatch({
                type: "MEASURE_REQUEST_UPDATE",
                request: {
                  status: "loaded",
                  response: void 0,
                },
              });
            } else {
              this.handleDispatch({
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
            nextSnapshot.normalizedMeasures[measureId] =
              convertToStandardUnit(value);
          }
          for (const measureIdStr in editingState.requestParams.deletes || {}) {
            const measureId = measureIdStr as MeasureId;
            delete nextSnapshot.measures[measureId];
            delete nextSnapshot.normalizedMeasures[measureId];
          }

          this.state.snapshot = nextSnapshot;
          this.state.editingState = { state: "not-editing" };
          this.state.measureSelector = new MeasureSelectorController(
            {
              snapshot: nextSnapshot,
              measureStats: this.state.measureStats,
            },
            {
              myDispatch: (msg: MeasureSelectorMsg) =>
                this.handleDispatch({ type: "MEASURE_SELECTOR_MSG", msg }),
            },
          );
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
        this.state.editingState.editMeasureOrClass.handleDispatch(msg.msg);
        break;

      case "SUBMIT_MEASURE_UPDATE": {
        const editingState = this.state.editingState;
        if (editingState.state !== "editing") {
          throw new Error(
            `Unexpected state for editingState upon submit ${JSON.stringify(editingState)}`,
          );
        }

        const editMeasureOrClass = editingState.editMeasureOrClass;
        const canSubmit = editMeasureOrClass.canSubmit;

        if (!canSubmit) {
          throw new Error(`Cannot submit - canSubmit is not available`);
        }

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
            this.handleDispatch({
              type: "MEASURE_REQUEST_UPDATE",
              request: {
                status: "loaded",
                response: void 0,
              },
            });
          } else {
            this.handleDispatch({
              type: "MEASURE_REQUEST_UPDATE",
              request: { status: "error", error: await response.text() },
            });
          }
        })().catch(console.error);
        break;
      }
    }
  }
}

export class SnapshotView extends DCGView.View<{
  controller: SnapshotController;
}> {
  template() {
    const stateProp = () => this.props.controller().state;
    const { SwitchUnion } = DCGView.Components;

    return (
      <div class="snapshot-view">
        {SwitchUnion(() => stateProp().editingState, "state", {
          "not-editing": () => this.renderNotEditing(stateProp),
          editing: (editingStateProp) => this.renderEditing(editingStateProp),
          submitting: (submittingStateProp) =>
            this.renderSubmitting(submittingStateProp),
        })}
      </div>
    );
  }

  private renderNotEditing(stateProp: () => Model) {
    return (
      <div class="measures-list">
        <MeasureSelectorView controller={() => stateProp().measureSelector} />
      </div>
    );
  }

  private renderEditing(editingStateProp: () => EditingEditingState) {
    return (
      <div>
        <EditMeasureOrClassView
          controller={() => editingStateProp().editMeasureOrClass}
        />
        <button
          onPointerDown={() => {
            if (editingStateProp().editMeasureOrClass.canSubmit) {
              this.props.controller().handleDispatch({
                type: "SUBMIT_MEASURE_UPDATE",
              });
            }
          }}
          disabled={() =>
            editingStateProp().editMeasureOrClass.canSubmit == undefined
          }
        >
          Submit
        </button>{" "}
        <button
          onPointerDown={() => {
            this.props.controller().handleDispatch({
              type: "DISCARD_MEASURE_UPDATE",
            });
          }}
        >
          Discard Changes
        </button>
      </div>
    );
  }

  private renderSubmitting(submittingStateProp: () => SubmittingEditingState) {
    const { SwitchUnion } = DCGView.Components;

    return SwitchUnion(() => submittingStateProp().writeRequest, "status", {
      "not-sent": () => <div>Not Sent</div>,
      loading: () => <div>Submitting...</div>,
      error: (errorProp) => <div>Error: {() => errorProp().error}</div>,
      loaded: () => <div>Done.</div>,
    });
  }
} // Legacy compatibility export
export const Snapshot = SnapshotController;
