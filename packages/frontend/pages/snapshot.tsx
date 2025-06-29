import * as DCGView from "dcgview";
import type { Snapshot, Dispatch } from "../types";
import {
  SnapshotController,
  SnapshotView,
  Msg as LoadedSnapshotMsg,
} from "../views/snapshot";
import { assertUnreachable, RequestStatus } from "../util/utils";
import { MeasureStats, SnapshotId } from "../../iso/protocol";
import { hydrateSnapshot } from "../util/snapshot";
import { Locale } from "../../iso/locale";

export type Model = {
  snapshotId: SnapshotId;
  measureStats: MeasureStats;
  snapshotRequest: RequestStatus<SnapshotController>;
};

export type Msg =
  | {
      type: "SNAPSHOT_RESPONSE";
      request: RequestStatus<SnapshotController>;
    }
  | {
      type: "LOADED_SNAPSHOT_MSG";
      msg: LoadedSnapshotMsg;
    };

export class SnapshotPageController {
  state: Model;

  constructor(
    snapshotId: SnapshotId,
    measureStats: MeasureStats,
    public context: {
      myDispatch: Dispatch<Msg>;
      locale: () => Locale;
    },
  ) {
    this.state = {
      snapshotId,
      measureStats,
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
      const loadedSnapshot = new SnapshotController(
        {
          measureStats: this.state.measureStats,
          snapshot: hydrateSnapshot(snapshot),
        },
        {
          myDispatch: (msg: LoadedSnapshotMsg) =>
            this.context.myDispatch({ type: "LOADED_SNAPSHOT_MSG", msg }),
          locale: this.context.locale,
        },
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

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "SNAPSHOT_RESPONSE":
        this.state.snapshotRequest = msg.request;
        break;

      case "LOADED_SNAPSHOT_MSG":
        if (this.state.snapshotRequest.status == "loaded") {
          this.state.snapshotRequest.response.handleDispatch(msg.msg);
        }
        break;

      default:
        assertUnreachable(msg);
    }
  }
}

export class SnapshotPageView extends DCGView.View<{
  controller: () => SnapshotPageController;
}> {
  template() {
    const stateProp = () => this.props.controller().state;
    const { SwitchUnion } = DCGView.Components;

    return (
      <div>
        {SwitchUnion(() => stateProp().snapshotRequest, "status", {
          "not-sent": () => <div />,
          loading: () => <div>Loading...</div>,
          error: (errorProp: () => { status: "error"; error: string }) => (
            <div>Error loading snapshot: {() => errorProp().error}</div>
          ),
          loaded: (
            loadedProp: () => {
              status: "loaded";
              response: SnapshotController;
            },
          ) => <SnapshotView controller={() => loadedProp().response} />,
        })}
      </div>
    );
  }
}
