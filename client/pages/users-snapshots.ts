import { h } from "snabbdom";
import type { Snapshot } from "../../iso/protocol";
import { Update, Thunk, View } from "../tea";
import { assertUnreachable, RequestStatus } from "../utils";

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
  return h("div", [
    h("h2", "Your Snapshots"),

    h(
      "div.new-snapshot",
      (() => {
        if (!model.newSnapshotRequest) {
          return h(
            "button",
            {
              on: {
                click: () => {
                  dispatch({ type: "NEW_SNAPSHOT" });
                },
              },
            },
            "Create New Snapshot",
          );
        }

        switch (model.newSnapshotRequest.status) {
          case "loading":
            return h("div", "Creating new snapshot...");

          case "loaded":
            return h("div", "created new snapshot");

          case "error":
            return h(
              "div",
              `error when creating new snapshot: ${model.newSnapshotRequest.error}`,
            );

          default:
            return assertUnreachable(model.newSnapshotRequest);
        }
      })(),
    ),
    h(
      "div.list-snapshots",
      (() => {
        switch (model.snapshotRequest.status) {
          case "loading":
            return h("div", "Loading...");
          case "error":
            return h("div.error", model.snapshotRequest.error);
          case "loaded":
            return h(
              "div.loaded",
              model.snapshotRequest.response.map((snapshot) =>
                h(
                  "div",

                  h("pre", JSON.stringify(snapshot)),
                ),
              ),
            );
          default:
            return assertUnreachable(model.snapshotRequest);
        }
      })(),
    ),
  ]);
};
