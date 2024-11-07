import React from "react";
import type { HydratedSnapshot, Snapshot } from "../types";
import { Update, Thunk, View, Dispatch, wrapThunk } from "../tea";
import {
  assertLoaded,
  assertUnreachable,
  GetLoadedRequest as GetLoadedRequestType,
  RequestStatus,
  RequestStatusView,
  RequestStatusViewMap,
} from "../util/utils";
import { FilterQuery } from "../../iso/protocol";
import * as PlotWithControls from "../views/plot-with-controls";
import * as SelectFilters from "../views/select-filters";
import * as immer from "immer";
import { hydrateSnapshot } from "../util/snapshot";
const produce = immer.produce;
import lodash from "lodash";
import { INPUT_MEASURES } from "../../iso/measures/index";

export type Model = immer.Immutable<{
  filtersModel: SelectFilters.Model;
  query: FilterQuery;
  userId: string;
  mySnapshot: HydratedSnapshot;
  dataRequest: RequestStatus<{
    snapshots: HydratedSnapshot[];
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
      request: RequestStatus<HydratedSnapshot[]>;
    }
  | {
      type: "PLOT_MSG";
      msg: PlotWithControls.Msg;
    }
  | {
      type: "FILTERS_MSG";
      msg: SelectFilters.Msg;
    };

function generateFetchThunk(model: Model) {
  return async (dispatch: Dispatch<Msg>) => {
    const query: FilterQuery = model.query;
    const response = await fetch("/api/snapshots/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
      }),
    });
    if (response.ok) {
      const snapshots = (await response.json()) as Snapshot[];
      dispatch({
        type: "SNAPSHOT_RESPONSE",
        request: { status: "loaded", response: snapshots.map(hydrateSnapshot) },
      });
    } else {
      dispatch({
        type: "SNAPSHOT_RESPONSE",
        request: { status: "error", error: response.statusText },
      });
    }
  };
}

export function initModel({
  userId,
  mySnapshot,
}: {
  userId: string;
  mySnapshot: HydratedSnapshot;
}): [Model] | [Model, Thunk<Msg> | undefined] {
  const model: Model = {
      filtersModel: SelectFilters.initModel({
        myMeasures: lodash.pick(
          mySnapshot.measures,
          INPUT_MEASURES.map((m) => m.id),
        ),
      }),
      userId,
      mySnapshot,
      query: {},
      dataRequest: { status: "loading" },
    }
  return [
    model,
    generateFetchThunk(model)
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
            const plotModel = PlotWithControls.initModel({
              snapshots: msg.request.response,
              mySnapshot: draft.mySnapshot,
              userId: model.userId,
              filterMapping: SelectFilters.generateFiltersMap(
                draft.filtersModel,
              ),
            });
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

    case "FILTERS_MSG": {
      const [nextFiltersModel] = SelectFilters.update(
        msg.msg,
        model.filtersModel,
      );
      return [
        produce(model, (draft) => {
          draft.filtersModel = immer.castDraft(nextFiltersModel);
          // Convert filters to query format
          draft.query = {};
          nextFiltersModel.filters.forEach((filter) => {
            if (filter.state.state === "selected") {
              const minResult = filter.state.minInput.parseResult;
              const maxResult = filter.state.maxInput.parseResult;

              draft.query[filter.state.measureId] = {
                min:
                  minResult.status == "success" ? minResult.value : undefined,
                max:
                  maxResult.status == "success" ? maxResult.value : undefined,
              };
            }
          });
        }),
      ];
    }

    default:
      assertUnreachable(msg);
  }
};

const FetchButton = ({ dispatch }: { dispatch: Dispatch<Msg> }) => (
  <button onClick={() => dispatch({ type: "REQUEST_DATA" })}>Fetch Data</button>
);

const viewMap: RequestStatusViewMap<
  GetLoadedRequestType<Model["dataRequest"]>["response"],
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
    <div>
      <SelectFilters.view
        model={model.filtersModel}
        dispatch={(msg) => dispatch({ type: "FILTERS_MSG", msg })}
      />
      <RequestStatusView
        dispatch={dispatch}
        request={model.dataRequest}
        viewMap={viewMap}
      />
    </div>
  );
};
