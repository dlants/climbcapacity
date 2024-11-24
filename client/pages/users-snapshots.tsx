import React from "react";
import type { Snapshot } from "../types";
import { Update, Thunk, View, Dispatch } from "../tea";
import { assertUnreachable, RequestStatus } from "../util/utils";
import * as immer from "immer";
const produce = immer.produce;

type SnapshotListItem = {
  snapshot: Snapshot;
  deleteRequest: RequestStatus<void>;
};

export type Model = immer.Immutable<{
  userId: string;
  snapshotRequest: RequestStatus<SnapshotListItem[]>;
  newSnapshotRequest: RequestStatus<Snapshot>;
}>;

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

async function fetchSnapshotsThunk(dispatch: Dispatch<Msg>) {
  const response = await fetch("/api/my-snapshots", { method: "POST" });
  if (response.ok) {
    const snapshots = (await response.json()) as Snapshot[];
    dispatch({
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
    dispatch({
      type: "SNAPSHOT_RESPONSE",
      request: { status: "error", error: await response.text() },
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
          const response = await fetch("/api/snapshots/new", {
            method: "POST",
          });
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
              request: { status: "error", error: await response.text() },
            });
          }
        },
      ];

    case "SELECT_SNAPSHOT":
      // will be intercepted by parent view
      return [model];

    case "DELETE_SNAPSHOT":
      return [
        produce(model, (draft) => {
          if (draft.snapshotRequest.status != "loaded") {
            throw new Error(
              `Unexpected snapshotRequest status when deleting snapshot`,
            );
          }
          const snapshot = draft.snapshotRequest.response.find(
            (s) => s.snapshot._id == msg.snapshotId,
          );
          if (!snapshot) {
            throw new Error(
              `Unable to find snapshot ${msg.snapshotId} to delete`,
            );
          }
          snapshot.deleteRequest = { status: "loading" };
        }),
        async (dispatch) => {
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
            dispatch({
              type: "DELETE_SNAPSHOT_RESPONSE",
              snapshotId: msg.snapshotId,
              request: { status: "loaded", response: undefined },
            });
            // Refresh the list
            await fetchSnapshotsThunk(dispatch);
          } else {
            dispatch({
              type: "DELETE_SNAPSHOT_RESPONSE",
              snapshotId: msg.snapshotId,
              request: { status: "error", error: await response.text() },
            });
          }
        },
      ];

    case "DELETE_SNAPSHOT_RESPONSE":
      return [
        produce(model, (draft) => {
          if (draft.snapshotRequest.status != "loaded") {
            throw new Error(
              `Unexpected snapshotRequest status when handling delete response`,
            );
          }
          const snapshot = draft.snapshotRequest.response.find(
            (s) => s.snapshot._id == msg.snapshotId,
          );
          if (!snapshot) {
            throw new Error(
              `Unable to find snapshot ${msg.snapshotId} to update delete response`,
            );
          }
          snapshot.deleteRequest = msg.request;
        }),
      ];

    default:
      msg satisfies never;
      return msg;
  }
};

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  const NewSnapshot = () => {
    const NewSnapshotButton = () => (
      <button onPointerDown={() => dispatch({ type: "NEW_SNAPSHOT" })}>
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

  return (
    <div>
      <h2>Your Snapshots</h2>
      <div className="new-snapshot">
        <NewSnapshot />
      </div>
      <div className="list-snapshots">
        <SnapshotList model={model} dispatch={dispatch} />
      </div>
    </div>
  );
};

const SnapshotResponse = ({
  snapshot: item,
  dispatch,
}: {
  snapshot: SnapshotListItem;
  dispatch: Dispatch<Msg>;
}) => (
  <div key={item.snapshot._id}>
    {new Date(item.snapshot.createdAt).toLocaleString()}
    <button
      onPointerDown={() =>
        dispatch({ type: "SELECT_SNAPSHOT", snapshot: item })
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
                  dispatch({
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

const SnapshotList = ({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: Dispatch<Msg>;
}) => {
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
            <SnapshotResponse
              key={snapshot.snapshot._id}
              snapshot={snapshot}
              dispatch={dispatch}
            />
          ))}
        </div>
      );
    default:
      assertUnreachable(model.snapshotRequest);
  }
};
