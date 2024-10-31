import React from "react";
import type { Snapshot } from "../types";
import { Update, Thunk, View, Dispatch, wrapThunk } from "../tea";
import {
  assertLoaded,
  assertUnreachable,
  RequestStatus,
  RequestStatusView,
  RequestStatusViewMap,
} from "../utils";
import { MeasureId, Filter } from "../../iso/protocol";
import * as PlotWithControls from "../views/plot-with-controls";
import * as immer from "immer";
const produce = immer.produce;

export type Model = immer.Immutable<{
  query: {
    [measureId: MeasureId]: Filter;
  };
  dataRequest: RequestStatus<{
    snapshots: Snapshot[];
    plotModel: PlotWithControls.Model;
  }>;
}>;

export type Msg =
  | {
      type: "UPDATE_QUERY";
    }
  | {
      type: "REQUEST_DATA";
    }
  | {
      type: "SNAPSHOT_RESPONSE";
      request: RequestStatus<Snapshot[]>;
    }
  | {
      type: "PLOT_MSG";
      msg: PlotWithControls.Msg;
    };

function generateFetchThunk(model: Model) {
  return async (dispatch: Dispatch<Msg>) => {
    const response = await fetch("/api/snapshots/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: model.query,
      }),
    });
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
  };
}

export function initModel(): [Model] | [Model, Thunk<Msg> | undefined] {
  return [
    {
      query: {},
      dataRequest: { status: "not-sent" },
    },
  ];
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "SNAPSHOT_RESPONSE": {
      const nextModel: Model = produce(model, (draft) => {
        switch (msg.request.status) {
          case "not-sent":
          case "loading":
          case "error":
            draft.dataRequest = msg.request;
            return;
          case "loaded":
            const plotModel = PlotWithControls.initModel(msg.request.response);
            draft.dataRequest = {
              status: "loaded",
              response: {
                snapshots: msg.request.response,
                plotModel: immer.castDraft(plotModel),
              },
            };
            return;
          default:
            assertUnreachable(msg.request);
        }
      });
      return [nextModel];
    }

    case "UPDATE_QUERY":
      return [model];

    case "REQUEST_DATA":
      const nextModel: Model = produce(model, (draft) => {
        draft.dataRequest = { status: "loading" };
      });
      return [nextModel, generateFetchThunk(model)];

    case "PLOT_MSG":
      if (model.dataRequest.status != "loaded") {
        console.warn(`Unexpected msg ${msg.type} when model is not loaded.`);
        return [model];
      }
      const [nextPlotModel, thunk] = PlotWithControls.update(
        msg.msg,
        model.dataRequest.response.plotModel,
      );

      return [
        produce(model, (draft) => {
          const request = assertLoaded(draft.dataRequest);
          request.response.plotModel = immer.castDraft(nextPlotModel);
        }),
        wrapThunk("PLOT_MSG", thunk),
      ];

    default:
      assertUnreachable(msg);
  }
};

const FetchButton = ({ dispatch }: { dispatch: Dispatch<Msg> }) => (
  <button onClick={() => dispatch({ type: "REQUEST_DATA" })}>Fetch Data</button>
);

const viewMap: RequestStatusViewMap<
  Model['dataRequest'],
  Msg
> = {
  "not-sent": ({ dispatch }) => <FetchButton dispatch={dispatch} />,
  loading: () => <div>Fetching...</div>,
  error: ({ error }) => <div>error when fetching data: {error}</div>,
  loaded: ({ response, dispatch }) => (
    <div>
      {response.snapshots.length} snapshots loaded.{" "}
      <FetchButton dispatch={dispatch} />
      <PlotWithControls.view
        model={response.plotModel}
        dispatch={(msg) => dispatch({ type: "PLOT_MSG", msg })}
      />
    </div>
  ),
};

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <RequestStatusView
      dispatch={dispatch}
      request={model.dataRequest}
      viewMap={viewMap}
    />
  );
};
