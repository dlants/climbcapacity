import React from "react";
import type { HydratedSnapshot, Snapshot } from "../types";
import { Update, Thunk, View, Dispatch } from "../tea";
import {
  assertLoaded,
  assertUnreachable,
  GetLoadedRequest as GetLoadedRequestType,
  RequestStatus,
} from "../util/utils";
import { FilterQuery, MeasureStats } from "../../iso/protocol";
import * as SelectFilters from "../views/select-filters";
import * as immer from "immer";
import * as ReportCardGraph from "./report-card-graph";
import { hydrateSnapshot } from "../util/snapshot";
const produce = immer.produce;
import { InitialFilters } from "../views/select-filters";

export type Model = immer.Immutable<{
  filtersModel: SelectFilters.Model;
  measureStats: MeasureStats;
  query: {
    body: FilterQuery;
    hash: string;
  };
  mySnapshot?: HydratedSnapshot;
  dataRequest: RequestStatus<
    {
      snapshots: HydratedSnapshot[];
      reportCardModel: ReportCardGraph.Model;
    },
    { queryHash: string }
  >;
}>;

export type Msg =
  | {
      type: "REQUEST_DATA";
    }
  | {
      type: "SNAPSHOT_RESPONSE";
      request: RequestStatus<HydratedSnapshot[], { queryHash: string }>;
    }
  | {
      type: "REPORT_CARD_MSG";
      msg: ReportCardGraph.Msg;
    }
  | {
      type: "FILTERS_MSG";
      msg: SelectFilters.Msg;
    };

function generateFetchThunk(model: Model) {
  return async (dispatch: Dispatch<Msg>) => {
    const query = model.query.body;
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
        request: {
          status: "loaded",
          response: snapshots.map(hydrateSnapshot),
          queryHash: model.query.hash,
        },
      });
    } else {
      dispatch({
        type: "SNAPSHOT_RESPONSE",
        request: { status: "error", error: await response.text() },
      });
    }
  };
}

export function initModel({
  initialFilters,
  measureStats,
  mySnapshot,
}: {
  initialFilters: InitialFilters;
  measureStats: MeasureStats;
  mySnapshot?: HydratedSnapshot;
}): [Model] | [Model, Thunk<Msg> | undefined] {
  const filtersModel = SelectFilters.initModel({
    measureStats,
    initialFilters: initialFilters,
  });
  const query = getQuery(filtersModel);
  const model: Model = {
    filtersModel,
    measureStats,
    mySnapshot,
    query,
    dataRequest: { status: "loading", queryHash: query.hash },
  };
  return [model, generateFetchThunk(model)];
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
            const initModelResult = ReportCardGraph.initModel({
              snapshots: msg.request.response,
              measureStats: model.measureStats,
              mySnapshot: draft.mySnapshot,
            });

            if (initModelResult.status == "success") {
              draft.dataRequest = {
                status: "loaded",
                queryHash: msg.request.queryHash,
                response: {
                  snapshots: msg.request.response,
                  reportCardModel: immer.castDraft(initModelResult.value),
                },
              };
            } else {
              draft.dataRequest = {
                status: "error",
                error: initModelResult.error,
              };
            }
            return;
          default:
            assertUnreachable(msg.request);
        }
      });
      return [nextModel];
    }

    case "REQUEST_DATA":
      const nextModel: Model = produce(model, (draft) => {
        draft.dataRequest = { status: "loading", queryHash: model.query.hash };
      });
      return [nextModel, generateFetchThunk(model)];

    case "REPORT_CARD_MSG":
      if (model.dataRequest.status != "loaded") {
        console.warn(`Unexpected msg ${msg.type} when model is not loaded.`);
        return [model];
      }
      const [nextReportCardModel] = ReportCardGraph.update(
        msg.msg,
        model.dataRequest.response.reportCardModel,
      );

      return [
        produce(model, (draft) => {
          const request = assertLoaded(draft.dataRequest);
          request.response.reportCardModel =
            immer.castDraft(nextReportCardModel);
        }),
      ];

    case "FILTERS_MSG": {
      const [nextFiltersModel] = SelectFilters.update(
        msg.msg,
        model.filtersModel,
      );
      return [
        produce(model, (draft) => {
          draft.filtersModel = immer.castDraft(nextFiltersModel);
          draft.query = getQuery(nextFiltersModel);
          if (draft.query.hash != model.query.hash) {
            draft.dataRequest = { status: "not-sent" };
          }
        }),
      ];
    }

    default:
      assertUnreachable(msg);
  }
};

function getQuery(filtersModel: SelectFilters.Model): Model["query"] {
  const query: FilterQuery = {};
  const queryHashParts: string[] = [];
  filtersModel.filters.forEach((filter) => {
    const minResult = filter.model.minInput.parseResult;
    const maxResult = filter.model.maxInput.parseResult;

    query[filter.model.measureId] = {
      min: minResult.status == "success" ? minResult.value : undefined,
      max: maxResult.status == "success" ? maxResult.value : undefined,
    };
    queryHashParts.push(
      filter.model.measureId +
        ":" +
        JSON.stringify(query[filter.model.measureId]),
    );
  });
  return {
    body: query,
    hash: queryHashParts.join(","),
  };
}

const FetchButton = ({
  dispatch,
  model,
}: {
  dispatch: Dispatch<Msg>;
  model: Model;
}) => (
  <button
    onClick={() => dispatch({ type: "REQUEST_DATA" })}
    disabled={
      model.dataRequest.status === "loaded" &&
      model.dataRequest.queryHash === model.query.hash
    }
  >
    Fetch Data
  </button>
);

function LoadedView({
  response,
  dispatch,
  model,
}: {
  response: GetLoadedRequestType<Model["dataRequest"]>["response"];
  dispatch: Dispatch<Msg>;
  model: Model;
}) {
  return (
    <div>
      {response.snapshots.length} snapshots loaded.{" "}
      <FetchButton dispatch={dispatch} model={model} />
      <ReportCardGraph.view
        model={response.reportCardModel}
        dispatch={(msg) => dispatch({ type: "REPORT_CARD_MSG", msg })}
      />
    </div>
  );
}
export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div>
      <SelectFilters.view
        model={model.filtersModel}
        dispatch={(msg) => dispatch({ type: "FILTERS_MSG", msg })}
      />
      {(() => {
        switch (model.dataRequest.status) {
          case "not-sent":
            return <FetchButton dispatch={dispatch} model={model} />;
          case "loading":
            return <div>Fetching...</div>;
          case "error":
            return (
              <div>
                <div>Error: {model.dataRequest.error}</div>
                <FetchButton dispatch={dispatch} model={model} />
              </div>
            );
          case "loaded":
            return (
              <LoadedView
                response={model.dataRequest.response}
                dispatch={dispatch}
                model={model}
              />
            );
          default:
            assertUnreachable(model.dataRequest);
        }
      })()}
    </div>
  );
};
