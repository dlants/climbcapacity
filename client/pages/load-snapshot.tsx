import React from "react";
import type { Snapshot } from "../types";
import { Update, Thunk, View, wrapThunk } from "../tea";
import * as LoadedSnapshot from "../views/snapshot";
import { assertUnreachable, RequestStatus, RequestStatusView } from "../utils";
import { SnapshotId } from "../../iso/protocol";

export type Model = {
  snapshotId: SnapshotId;
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

export function initModel(snapshotId: SnapshotId): [Model, Thunk<Msg>] {
  return [
    {
      snapshotId,
      snapshotRequest: { status: "loading" },
    },

    async (dispatch) => {
      const response = await fetch("/snapshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snapshotId,
        }),
      });

      if (response.ok) {
        const snapshot = (await response.json()) as Snapshot;
        const model = LoadedSnapshot.initModel({ snapshot });
        dispatch({
          type: "SNAPSHOT_RESPONSE",
          request: { status: "loaded", response: model },
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
    case "LOADED_SNAPSHOT_MSG":
      if (model.snapshotRequest.status == "loaded") {
        const [nextModel, thunk] = LoadedSnapshot.update(
          msg.msg,
          model.snapshotRequest.response,
        );
        return [
          {
            ...model,
            snapshotRequest: {
              ...model.snapshotRequest,
              response: nextModel,
            },
          },
          wrapThunk("LOADED_SNAPSHOT_MSG", thunk),
        ];
      } else {
        return [model];
      }
    default:
      assertUnreachable(msg);
  }
};

export const view: View<Msg, Model> = (model, dispatch) => {
  return (
    <RequestStatusView
      request={model.snapshotRequest}
      viewMap={{
        "not-sent": () => <div />,
        loading: () => <div>Loading...</div>,
        error: ({ error }) => <div>Error loading snapshot: {error}</div>,
        loaded: ({ response }) =>
          LoadedSnapshot.view(response, (msg) =>
            dispatch({ type: "LOADED_SNAPSHOT_MSG", msg }),
          ),
      }}
    />
  );
};
