import React from "react";
import type { Snapshot, Dispatch } from "../types";
import { Snapshot as LoadedSnapshot, Msg as LoadedSnapshotMsg } from "../views/snapshot";
import {
  assertUnreachable,
  RequestStatus,
  RequestStatusView,
  RequestStatusViewMap,
} from "../util/utils";
import { MeasureStats, SnapshotId } from "../../iso/protocol";
import { hydrateSnapshot } from "../util/snapshot";

export type Model = {
  snapshotId: SnapshotId;
  measureStats: MeasureStats;
  snapshotRequest: RequestStatus<LoadedSnapshot>;
};

export type Msg =
  | {
    type: "SNAPSHOT_RESPONSE";
    request: RequestStatus<LoadedSnapshot>;
  }
  | {
    type: "LOADED_SNAPSHOT_MSG";
    msg: LoadedSnapshotMsg;
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
      const loadedSnapshot = new LoadedSnapshot(
        {
          measureStats: this.state.measureStats,
          snapshot: hydrateSnapshot(snapshot),
        },
        { myDispatch: (msg: LoadedSnapshotMsg) => this.context.myDispatch({ type: "LOADED_SNAPSHOT_MSG", msg }) }
      );
      this.context.myDispatch({
        type: "SNAPSHOT_RESPONSE",
        request: { status: "loaded", response: loadedSnapshot },
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
          this.state.snapshotRequest.response.update(msg.msg);
        }
        break;

      default:
        assertUnreachable(msg);
    }
  }

  view() {
    const snapshotRequestViewMap: RequestStatusViewMap<LoadedSnapshot, Msg> = {
      "not-sent": () => <div />,
      loading: () => <div>Loading...</div>,
      error: ({ error }) => <div>Error loading snapshot: {error}</div>,
      loaded: ({ response }) => response.view(),
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
