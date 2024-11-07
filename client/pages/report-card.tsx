import React from "react";
import type { HydratedSnapshot, Snapshot } from "../types";
import { Update, Thunk, View, Dispatch, wrapThunk } from "../tea";
import {
  assertUnreachable,
  GetLoadedRequest as GetLoadedRequestType,
  RequestStatus,
  RequestStatusView,
  RequestStatusViewMap,
} from "../util/utils";
import * as immer from "immer";
import * as LoadedReportCard from "../views/loaded-report-card";
import { hydrateSnapshot } from "../util/snapshot";
const produce = immer.produce;

export type Model = {
  userId: string;
  mySnapshotRequest: RequestStatus<
    | {
        state: "no-snapshot";
      }
    | {
        state: "has-snapshot";
        model: LoadedReportCard.Model;
      }
  >;
};

export type Msg =
  | {
      type: "MY_SNAPSHOT_RESPONSE";
      request: RequestStatus<HydratedSnapshot | undefined>;
    }
  | {
      type: "LOADED_MSG";
      msg: LoadedReportCard.Msg;
    };

export function initModel({
  userId,
}: {
  userId: string;
}): [Model] | [Model, Thunk<Msg> | undefined] {
  const mySnapshotRequest: RequestStatus<Snapshot> = {
    status: "loading",
  };
  const fetchSnapshotThunk = async (dispatch: Dispatch<Msg>) => {
    const response = await fetch("/api/my-latest-snapshot", {
      method: "POST",
    });
    if (response.ok) {
      const {snapshot} = (await response.json()) as {snapshot: Snapshot | undefined};
      dispatch({
        type: "MY_SNAPSHOT_RESPONSE",
        request: {
          status: "loaded",
          response: snapshot ? hydrateSnapshot(snapshot) : undefined,
        },
      });
    } else {
      dispatch({
        type: "MY_SNAPSHOT_RESPONSE",
        request: { status: "error", error: response.statusText },
      });
    }
  };

  return [
    {
      userId,
      mySnapshotRequest,
    },
    fetchSnapshotThunk,
  ];
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "MY_SNAPSHOT_RESPONSE": {
      switch (msg.request.status) {
        case "not-sent":
        case "error":
        case "loading":
          const request = msg.request;
          return [
            produce(model, (draft) => {
              draft.mySnapshotRequest = immer.castDraft(request);
            }),
          ];
        case "loaded":
          if (msg.request.response == undefined) {
            return [
              produce(model, (draft) => {
                draft.mySnapshotRequest = {
                  status: "loaded",
                  response: { state: "no-snapshot" },
                };
              }),
            ];
          } else {
            const [loadedModel, loadedThunk] = LoadedReportCard.initModel({
              userId: model.userId,
              mySnapshot: msg.request.response,
            });
            return [
              produce(model, (draft) => {
                draft.mySnapshotRequest = {
                  status: "loaded",
                  response: {
                    state: "has-snapshot",
                    model: immer.castDraft(loadedModel),
                  },
                };
              }),
              wrapThunk("LOADED_MSG", loadedThunk),
            ];
          }

        default:
          assertUnreachable(msg.request);
      }
    }

    case "LOADED_MSG": {
      if (
        !(
          model.mySnapshotRequest.status == "loaded" &&
          model.mySnapshotRequest.response.state == "has-snapshot"
        )
      ) {
        throw new Error(
          `Did not expect a LOADED_MSG when we haven't loaded a snapshot`,
        );
      }

      const [nextModel, thunk] = LoadedReportCard.update(
        msg.msg,
        model.mySnapshotRequest.response.model,
      );
      return [
        produce(model, (draft) => {
          draft.mySnapshotRequest = {
            status: "loaded",
            response: {
              state: "has-snapshot",
              model: immer.castDraft(nextModel),
            },
          };
        }),
        wrapThunk("LOADED_MSG", thunk),
      ];
    }

    default:
      assertUnreachable(msg);
  }
};

const viewMap: RequestStatusViewMap<
  GetLoadedRequestType<Model["mySnapshotRequest"]>["response"],
  Msg
> = {
  "not-sent": () => <div />,
  loading: () => <div>Fetching...</div>,
  error: ({ error }) => <div>Error when fetching data: {error}</div>,
  loaded: ({ response, dispatch }) => (
    <div>
      {(() => {
        switch (response.state) {
          case "no-snapshot":
            return <NoSnapshotView />;
          case "has-snapshot":
            return (
              <LoadedReportCard.view
                model={response.model}
                dispatch={(msg) => dispatch({ type: "LOADED_MSG", msg })}
              />
            );
          default:
            assertUnreachable(response);
        }
      })()}
    </div>
  ),
};

const NoSnapshotView = () => {
  return (
    <div>
      You haven't added any snapshots. You can do that on the{" "}
      <a href="/snapshots">Snapshots</a> page.
    </div>
  );
};

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div>
      <RequestStatusView
        dispatch={dispatch}
        request={model.mySnapshotRequest}
        viewMap={viewMap}
      />
    </div>
  );
};
