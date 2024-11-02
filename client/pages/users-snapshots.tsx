import React from "react";
import type { Snapshot } from "../types";
import { Update, Thunk, View, Dispatch } from "../tea";
import { assertUnreachable, RequestStatus } from "../util/utils";
import * as immer from "immer";
const produce = immer.produce;

export type Model = immer.Immutable<{
  userId: string;
  snapshotRequest: RequestStatus<Snapshot[]>;
  newSnapshotRequest: RequestStatus<Snapshot>;
}>;

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
    }
  | {
      type: "SELECT_SNAPSHOT";
      snapshot: Snapshot;
    };

async function fetchSnapshotsThunk(dispatch: Dispatch<Msg>) {
  const response = await fetch("/api/snapshots", { method: "POST" });
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
}

export function initModel(userId: string): [Model, Thunk<Msg>] {
  return [
    {
      userId,
      snapshotRequest: { status: "loading" },
      newSnapshotRequest: { status: "not-sent" },
    },
    fetchSnapshotsThunk,
  ];
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "SNAPSHOT_RESPONSE":
      return [
        produce(model, (draft) => {
          draft.snapshotRequest = msg.request;
        }),
      ];
    case "NEW_SNAPSHOT_RESPONSE":
      return [
        produce(model, (draft) => {
          draft.newSnapshotRequest = msg.request;
        }),
      ];

    case "NEW_SNAPSHOT":
      return [
        produce(model, (draft) => {
          draft.newSnapshotRequest = { status: "loading" };
        }),
        async (dispatch) => {
          const response = await fetch("/api/snapshots/new", { method: "POST" });
          if (response.ok) {
            const snapshot = (await response.json()) as Snapshot;
            dispatch({
              type: "NEW_SNAPSHOT_RESPONSE",
              request: { status: "loaded", response: snapshot },
            });

            // re-fetch snapshots
            dispatch({
              type: "SNAPSHOT_RESPONSE",
              request: { status: "loading" },
            });

            await fetchSnapshotsThunk(dispatch);
          } else {
            dispatch({
              type: "NEW_SNAPSHOT_RESPONSE",
              request: { status: "error", error: response.statusText },
            });
          }
        },
      ];

    case "SELECT_SNAPSHOT":
      // will be intercepted by parent view
      return [model];

    default:
      msg satisfies never;
      return msg;
  }
};

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  const NewSnapshot = () => {
    const NewSnapshotButton = () => (
      <button onClick={() => dispatch({ type: "NEW_SNAPSHOT" })}>
        Create New Snapshot
      </button>
    );

    if (model.newSnapshotRequest.status == "not-sent") {
      return <NewSnapshotButton />;
    }

    switch (model.newSnapshotRequest.status) {
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
            error when creating new snapshot: {model.newSnapshotRequest.error}
          </div>
        );
      default:
        assertUnreachable(model.newSnapshotRequest);
    }
  };

  const SnapshotList = () => {
    switch (model.snapshotRequest.status) {
      case "not-sent":
        return <div />;
      case "loading":
        return <div>Loading...</div>;
      case "error":
        return <div className="error">{model.snapshotRequest.error}</div>;
      case "loaded":
        return (
          <div className="loaded">
            {model.snapshotRequest.response.map((snapshot) => (
              <div
                key={snapshot._id}
                onClick={() => dispatch({ type: "SELECT_SNAPSHOT", snapshot })}
              >
                <pre>{JSON.stringify(snapshot)}</pre>
              </div>
            ))}
          </div>
        );
      default:
        assertUnreachable(model.snapshotRequest);
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
