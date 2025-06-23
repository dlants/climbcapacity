import React from "react";
import type { Snapshot } from "../types";
import { Dispatch } from "../tea";
import * as LoadedSnapshot from "../views/snapshot";
import {
  assertUnreachable,
  RequestStatus,
  RequestStatusView,
  assertLoaded,
  RequestStatusViewMap,
} from "../util/utils";
import { MeasureStats, SnapshotId } from "../../iso/protocol";
import { hydrateSnapshot } from "../util/snapshot";

export type Model = {
  snapshotId: SnapshotId;
  measureStats: MeasureStats;
  snapshotRequest: RequestStatus<LoadedSnapshot.Model>;
};

export type Msg =
  | {
    type: "SNAPSHOT_RESPONSE";
    request: RequestStatus<LoadedSnapshot.Model>;
  }
  | {
    type: "LOADED_SNAPSHOT_MSG";
    msg: LoadedSnapshot.Msg;
  };

export class SnapshotPage {
  state: Model;

  constructor(
    initialParams: {
      snapshotId: SnapshotId;
      measureStats: MeasureStats;
    },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    this.state = {
      snapshotId: initialParams.snapshotId,
      measureStats: initialParams.measureStats,
      snapshotRequest: { status: "loading" },
    };

    this.loadSnapshot().catch(console.error);
  }

  private async loadSnapshot() {
    const response = await fetch("/api/snapshot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snapshotId: this.state.snapshotId,
      }),
    });

    if (response.ok) {
      const snapshot = (await response.json()) as Snapshot;
      const model = LoadedSnapshot.initModel({
        measureStats: this.state.measureStats,
        snapshot: hydrateSnapshot(snapshot),
      });
      this.context.myDispatch({
        type: "SNAPSHOT_RESPONSE",
        request: { status: "loaded", response: model },
      });
    } else {
      this.context.myDispatch({
        type: "SNAPSHOT_RESPONSE",
        request: { status: "error", error: await response.text() },
      });
    }
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "SNAPSHOT_RESPONSE":
        this.state.snapshotRequest = msg.request;
        break;

      case "LOADED_SNAPSHOT_MSG":
        if (this.state.snapshotRequest.status == "loaded") {
          const [nextModel, thunk] = LoadedSnapshot.update(
            msg.msg,
            this.state.snapshotRequest.response,
          );

          assertLoaded(this.state.snapshotRequest).response = nextModel;

          if (thunk) {
            (async () => {
              await thunk((loadedMsg) => {
                this.context.myDispatch({
                  type: "LOADED_SNAPSHOT_MSG",
                  msg: loadedMsg
                });
              });
            })().catch(console.error);
          }
        }
        break;

      default:
        assertUnreachable(msg);
    }
  }

  view() {
    const snapshotRequestViewMap: RequestStatusViewMap<LoadedSnapshot.Model, Msg> = {
      "not-sent": () => <div />,
      loading: () => <div>Loading...</div>,
      error: ({ error }) => <div>Error loading snapshot: {error}</div>,
      loaded: ({ response }) => (
        <LoadedSnapshot.view
          model={response}
          dispatch={(msg) => this.context.myDispatch({ type: "LOADED_SNAPSHOT_MSG", msg })}
        />
      ),
    };

    return (
      <RequestStatusView
        dispatch={this.context.myDispatch}
        request={this.state.snapshotRequest}
        viewMap={snapshotRequestViewMap}
      />
    );
  }
}
