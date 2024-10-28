import React from "react";
import type { Snapshot } from "../../iso/protocol";
import { Update, Thunk, View } from "../tea";
import { RequestStatus } from "../utils";

export type Model = {
  userId: string;
  snapshotRequest: RequestStatus<Snapshot[]>;
  newSnapshotRequest: RequestStatus<Snapshot> | undefined;
};

export type Msg =
  | {
      type: "SNAPSHOT_RESPONSE";
      request: RequestStatus<Snapshot[]>;
    }
  | {
      type: "NEW_SNAPSHOT_RESPONSE";
      request: RequestStatus<Snapshot>;
    }
  | {
      type: "NEW_SNAPSHOT";
    };

export function initModel(userId: string): [Model, Thunk<Msg>] {
  return [
    {
      userId,
      snapshotRequest: { status: "loading" },
      newSnapshotRequest: undefined,
    },
    async (dispatch) => {
      const response = await fetch("/snapshots", { method: "POST" });
      if (response.ok) {
        const snapshots = (await response.json()) as Snapshot[];
        dispatch({
          type: "SNAPSHOT_RESPONSE",
          request: { status: "loaded", response: snapshots },
        });
      } else {
        dispatch({
          type: "SNAPSHOT_RESPONSE",
          request: { status: "error", error: response.statusText },
        });
      }
    },
  ];
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "SNAPSHOT_RESPONSE":
      return [{ ...model, snapshotRequest: msg.request }];
    case "NEW_SNAPSHOT_RESPONSE":
      return [{ ...model, newSnapshotRequest: msg.request }];

    case "NEW_SNAPSHOT":
      return [
        { ...model, newSnapshotRequest: { status: "loading" } },
        async (dispatch) => {
          const response = await fetch("/snapshots/new", { method: "POST" });
          if (response.ok) {
            const snapshot = (await response.json()) as Snapshot;
            dispatch({
              type: "NEW_SNAPSHOT_RESPONSE",
              request: { status: "loaded", response: snapshot },
            });
          } else {
            dispatch({
              type: "NEW_SNAPSHOT_RESPONSE",
              request: { status: "error", error: response.statusText },
            });
          }
        },
      ];
    default:
      msg satisfies never;
      return msg;
  }
};

export const view: View<Msg, Model> = (model, dispatch) => {
  const NewSnapshot = () => {
    if (!model.newSnapshotRequest) {
      return (
        <button onClick={() => dispatch({ type: "NEW_SNAPSHOT" })}>
          Create New Snapshot
        </button>
      );
    }

    switch (model.newSnapshotRequest.status) {
      case "loading":
        return <div>Creating new snapshot...</div>;
      case "loaded":
        return <div>created new snapshot</div>;
      case "error":
        return (
          <div>
            error when creating new snapshot: {model.newSnapshotRequest.error}
          </div>
        );
    }
  };

  const SnapshotList = () => {
    switch (model.snapshotRequest.status) {
      case "loading":
        return <div>Loading...</div>;
      case "error":
        return <div className="error">{model.snapshotRequest.error}</div>;
      case "loaded":
        return (
          <div className="loaded">
            {model.snapshotRequest.response.map((snapshot) => (
              <div key={snapshot._id}>
                <pre>{JSON.stringify(snapshot)}</pre>
              </div>
            ))}
          </div>
        );
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
};
