import React from "react";
import type { Snapshot } from "../types";
import { Dispatch } from "../tea";
import { assertUnreachable, RequestStatus } from "../util/utils";

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

export class UsersSnapshotsPage {
  state: Model;

  constructor(userId: string, private context: { myDispatch: Dispatch<Msg> }) {
    this.state = {
      userId,
      snapshotRequest: { status: "loading" },
      newSnapshotRequest: { status: "not-sent" },
    };

    this.fetchSnapshots().catch(console.error);
  }

  private async fetchSnapshots() {
    const response = await fetch("/api/my-snapshots", { method: "POST" });
    if (response.ok) {
      const snapshots = (await response.json()) as Snapshot[];
      this.context.myDispatch({
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
      case "NEW_SNAPSHOT_RESPONSE":
        this.state.newSnapshotRequest = msg.request;
        break;

      case "NEW_SNAPSHOT":
        this.state.newSnapshotRequest = { status: "loading" };

        (async () => {
          const response = await fetch("/api/snapshots/new", {
            method: "POST",
          });
          if (response.ok) {
            const snapshot = (await response.json()) as Snapshot;
            this.context.myDispatch({
              type: "NEW_SNAPSHOT_RESPONSE",
              request: { status: "loaded", response: snapshot },
            });

            // re-fetch snapshots
            this.context.myDispatch({
              type: "SNAPSHOT_RESPONSE",
              request: { status: "loading" },
            });

            await this.fetchSnapshots();
          } else {
            this.context.myDispatch({
              type: "NEW_SNAPSHOT_RESPONSE",
              request: { status: "error", error: await response.text() },
            });
          }
        })().catch(console.error);
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

        (async () => {
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
            this.context.myDispatch({
              type: "DELETE_SNAPSHOT_RESPONSE",
              snapshotId: msg.snapshotId,
              request: { status: "loaded", response: undefined },
            });
            // Refresh the list
            await this.fetchSnapshots();
          } else {
            this.context.myDispatch({
              type: "DELETE_SNAPSHOT_RESPONSE",
              snapshotId: msg.snapshotId,
              request: { status: "error", error: await response.text() },
            });
          }
        })().catch(console.error);
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

  view() {
    const NewSnapshot = () => {
      const NewSnapshotButton = () => (
        <button onPointerDown={() => this.context.myDispatch({ type: "NEW_SNAPSHOT" })}>
          Create New Snapshot
        </button>
      );

      if (this.state.newSnapshotRequest.status == "not-sent") {
        return <NewSnapshotButton />;
      }

      switch (this.state.newSnapshotRequest.status) {
        case "loading":
          return <div>Creating new snapshot...</div>;
        case "loaded":
          return (
            <div>
              created new snapshot <NewSnapshotButton />
            </div>
          );
        case "error":
          return (
            <div>
              error when creating new snapshot: {this.state.newSnapshotRequest.error}
            </div>
          );
        default:
          assertUnreachable(this.state.newSnapshotRequest);
      }
    };

    const SnapshotResponse = ({
      snapshot: item,
    }: {
      snapshot: SnapshotListItem;
    }) => (
      <div key={item.snapshot._id}>
        {new Date(item.snapshot.createdAt).toLocaleString()}
        <button
          onPointerDown={() =>
            this.context.myDispatch({ type: "SELECT_SNAPSHOT", snapshot: item })
          }
        >
          Edit
        </button>

        {(() => {
          switch (item.deleteRequest.status) {
            case "not-sent":
            case "error":
              return (
                <span>
                  {item.deleteRequest.status == "error" && (
                    <span>{item.deleteRequest.error}</span>
                  )}
                  <button
                    onPointerDown={() =>
                      this.context.myDispatch({
                        type: "DELETE_SNAPSHOT",
                        snapshotId: item.snapshot._id,
                      })
                    }
                  >
                    Delete
                  </button>
                </span>
              );
            case "loading":
              return <button disabled>Edit</button>;

            case "loaded":
              return <div>Deleted</div>;
          }
        })()}
      </div>
    );

    const SnapshotList = () => {
      switch (this.state.snapshotRequest.status) {
        case "not-sent":
          return <div />;
        case "loading":
          return <div>Loading...</div>;
        case "error":
          return <div className="error">{this.state.snapshotRequest.error}</div>;
        case "loaded":
          return (
            <div className="loaded">
              {this.state.snapshotRequest.response.map((snapshot) => (
                <SnapshotResponse
                  key={snapshot.snapshot._id}
                  snapshot={snapshot}
                />
              ))}
            </div>
          );
        default:
          assertUnreachable(this.state.snapshotRequest);
      }
    };

    return (
      <div>
        <h2>Your Snapshots</h2>
        <div className="new-snapshot">
          <NewSnapshot />
        </div>
        <div className="list-snapshots">
          <SnapshotList />
        </div>
      </div>
    );
  }
}
