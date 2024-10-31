import React from "react";
import * as immer from "immer";
const produce = immer.produce;
import type { Snapshot } from "../types";
import { Update, Thunk, View, wrapThunk } from "../tea";
import * as LoadedSnapshot from "../views/snapshot";
import {
  assertUnreachable,
  RequestStatus,
  RequestStatusView,
  assertLoaded,
  RequestStatusViewMap,
} from "../utils";
import { SnapshotId } from "../../iso/protocol";

export type Model = immer.Immutable<{
  snapshotId: SnapshotId;
  snapshotRequest: RequestStatus<LoadedSnapshot.Model>;
}>;

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
      const response = await fetch("/api/snapshot", {
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
      return [
        produce(model, (draft) => {
          draft.snapshotRequest = immer.castDraft(msg.request);
        }),
      ];
    case "LOADED_SNAPSHOT_MSG":
      if (model.snapshotRequest.status == "loaded") {
        const [nextModel, thunk] = LoadedSnapshot.update(
          msg.msg,
          model.snapshotRequest.response,
        );
        return [
          produce(model, (draft) => {
            assertLoaded(draft.snapshotRequest).response =
              immer.castDraft(nextModel);
          }),
          wrapThunk("LOADED_SNAPSHOT_MSG", thunk),
        ];
      } else {
        return [model];
      }
    default:
      assertUnreachable(msg);
  }
};

const snapshotReuestViewMap: RequestStatusViewMap<LoadedSnapshot.Model, Msg> = {
  "not-sent": () => <div />,
  loading: () => <div>Loading...</div>,
  error: ({ error }) => <div>Error loading snapshot: {error}</div>,
  loaded: ({ response, dispatch }) => (
    <LoadedSnapshot.view
      model={response}
      dispatch={(msg) => dispatch({ type: "LOADED_SNAPSHOT_MSG", msg })}
    />
  ),
};

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <RequestStatusView
      dispatch={dispatch}
      request={model.snapshotRequest}
      viewMap={snapshotReuestViewMap}
    />
  );
};
