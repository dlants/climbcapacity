import * as DCGView from "dcgview";
import type { Snapshot, Dispatch } from "../types";
import { RequestStatus } from "../util/utils";

const { SwitchUnion, For } = DCGView.Components;

type SnapshotListItem = {
  snapshot: Snapshot;
  deleteRequest: RequestStatus<void>;
};

export type Model = {
  userId: string;
  snapshotRequest: RequestStatus<SnapshotListItem[]>;
  newSnapshotRequest: RequestStatus<Snapshot>;
};

export type Msg =
  | {
    type: "SNAPSHOT_RESPONSE";
    request: RequestStatus<SnapshotListItem[]>;
  }
  | {
    type: "NEW_SNAPSHOT_RESPONSE";
    request: RequestStatus<Snapshot>;
  }
  | {
    type: "NEW_SNAPSHOT";
  }
  | {
    type: "SELECT_SNAPSHOT";
    snapshot: SnapshotListItem;
  }
  | {
    type: "DELETE_SNAPSHOT";
    snapshotId: string;
  }
  | {
    type: "DELETE_SNAPSHOT_RESPONSE";
    request: RequestStatus<void>;
    snapshotId: string;
  };

export class UsersSnapshotsController {
  state: Model;

  constructor(userId: string, public myDispatch: Dispatch<Msg>) {
    this.state = {
      userId,
      snapshotRequest: { status: "loading" },
      newSnapshotRequest: { status: "not-sent" },
    };

    this.fetchSnapshots().catch((error: any) => console.error(error));
  }

  private async fetchSnapshots(): Promise<void> {
    const response = await fetch("/api/my-snapshots", { method: "POST" });
    if (response.ok) {
      const snapshots = (await response.json()) as Snapshot[];
      this.myDispatch({
        type: "SNAPSHOT_RESPONSE",
        request: {
          status: "loaded",
          response: snapshots.map((s) => ({
            snapshot: s,
            deleteRequest: { status: "not-sent" },
          })),
        },
      });
    } else {
      this.myDispatch({
        type: "SNAPSHOT_RESPONSE",
        request: { status: "error", error: await response.text() },
      });
    }
  }

  handleDispatch(msg: Msg): void {
    switch (msg.type) {
      case "SNAPSHOT_RESPONSE":
        this.state.snapshotRequest = msg.request;
        break;
      case "NEW_SNAPSHOT_RESPONSE":
        this.state.newSnapshotRequest = msg.request;
        break;

      case "NEW_SNAPSHOT":
        this.state.newSnapshotRequest = { status: "loading" };

        (async (): Promise<void> => {
          const response = await fetch("/api/snapshots/new", {
            method: "POST",
          });
          if (response.ok) {
            const snapshot = (await response.json()) as Snapshot;
            this.myDispatch({
              type: "NEW_SNAPSHOT_RESPONSE",
              request: { status: "loaded", response: snapshot },
            });

            // re-fetch snapshots
            this.myDispatch({
              type: "SNAPSHOT_RESPONSE",
              request: { status: "loading" },
            });

            await this.fetchSnapshots();
          } else {
            this.myDispatch({
              type: "NEW_SNAPSHOT_RESPONSE",
              request: { status: "error", error: await response.text() },
            });
          }
        })().catch((error: any) => console.error(error));
        break;

      case "SELECT_SNAPSHOT":
        // will be intercepted by parent view
        break;

      case "DELETE_SNAPSHOT":
        if (this.state.snapshotRequest.status != "loaded") {
          throw new Error(
            `Unexpected snapshotRequest status when deleting snapshot`,
          );
        }
        const snapshot = this.state.snapshotRequest.response.find(
          (s) => s.snapshot._id == msg.snapshotId,
        );
        if (!snapshot) {
          throw new Error(
            `Unable to find snapshot ${msg.snapshotId} to delete`,
          );
        }
        snapshot.deleteRequest = { status: "loading" };

        (async (): Promise<void> => {
          const response = await fetch(`/api/snapshot`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              snapshotId: msg.snapshotId,
            }),
          });
          if (response.ok) {
            this.myDispatch({
              type: "DELETE_SNAPSHOT_RESPONSE",
              snapshotId: msg.snapshotId,
              request: { status: "loaded", response: undefined },
            });
            // Refresh the list
            await this.fetchSnapshots();
          } else {
            this.myDispatch({
              type: "DELETE_SNAPSHOT_RESPONSE",
              snapshotId: msg.snapshotId,
              request: { status: "error", error: await response.text() },
            });
          }
        })().catch((error: any) => console.error(error));
        break;

      case "DELETE_SNAPSHOT_RESPONSE":
        if (this.state.snapshotRequest.status != "loaded") {
          throw new Error(
            `Unexpected snapshotRequest status when handling delete response`,
          );
        }
        const responseSnapshot = this.state.snapshotRequest.response.find(
          (s) => s.snapshot._id == msg.snapshotId,
        );
        if (!responseSnapshot) {
          throw new Error(
            `Unable to find snapshot ${msg.snapshotId} to update delete response`,
          );
        }
        responseSnapshot.deleteRequest = msg.request;
        break;

      default:
        msg satisfies never;
        break;
    }
  }

}

export class UsersSnapshotsView extends DCGView.View<{
  controller: () => UsersSnapshotsController;
}> {
  template() {
    const stateProp = () => this.props.controller().state;

    return (
      <div>
        <h2>Your Snapshots</h2>
        <div class="new-snapshot">
          {this.renderNewSnapshot(stateProp)}
        </div>
        <div class="list-snapshots">
          {this.renderSnapshotList(stateProp)}
        </div>
      </div>
    );
  }

  private renderNewSnapshot(stateProp: () => Model) {
    const NewSnapshotButton = () => (
      <button onPointerDown={() => this.props.controller().myDispatch({ type: "NEW_SNAPSHOT" })}>
        Create New Snapshot
      </button>
    );

    return SwitchUnion(() => stateProp().newSnapshotRequest, 'status', {
      "not-sent": () => <NewSnapshotButton />,
      "loading": () => <div>Creating new snapshot...</div>,
      "loaded": () => (
        <div>
          created new snapshot <NewSnapshotButton />
        </div>
      ),
      "error": (errorProp) => (
        <div>
          error when creating new snapshot: {() => errorProp().error}
        </div>
      ),
    });
  }

  private renderSnapshotList(stateProp: () => Model) {
    return SwitchUnion(() => stateProp().snapshotRequest, 'status', {
      "not-sent": () => <div />,
      "loading": () => <div>Loading...</div>,
      "error": (errorProp) => <div class="error">{() => errorProp().error}</div>,
      "loaded": (loadedProp) => (
        <div class="loaded">
          <For each={() => loadedProp().response} key={(item: SnapshotListItem) => item.snapshot._id}>
            {(getItem: () => SnapshotListItem) => this.renderSnapshotItem(getItem)}
          </For>
        </div>
      ),
    });
  }

  private renderSnapshotItem(getItem: () => SnapshotListItem) {
    return (
      <div>
        {() => new Date(getItem().snapshot.createdAt).toLocaleString()}
        <button
          onPointerDown={() =>
            this.props.controller().myDispatch({ type: "SELECT_SNAPSHOT", snapshot: getItem() })
          }
        >
          Edit
        </button>

        {SwitchUnion(() => getItem().deleteRequest, 'status', {
          "not-sent": () => this.renderDeleteButton(getItem),
          "error": (errorProp) => (
            <span>
              <span>{() => errorProp().error}</span>
              {this.renderDeleteButton(getItem)}
            </span>
          ),
          "loading": () => <button disabled>Deleting...</button>,
          "loaded": () => <div>Deleted</div>,
        })}
      </div>
    );
  }

  private renderDeleteButton(getItem: () => SnapshotListItem) {
    return (
      <button
        onPointerDown={() =>
          this.props.controller().myDispatch({
            type: "DELETE_SNAPSHOT",
            snapshotId: getItem().snapshot._id,
          })
        }
      >
        Delete
      </button>
    );
  }
}

// Legacy compatibility export
export const UsersSnapshotsPage = UsersSnapshotsController;
