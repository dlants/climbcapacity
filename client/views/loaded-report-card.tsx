import React from "react";
import type { HydratedSnapshot, Snapshot } from "../types";
import { Update, Thunk, View, Dispatch } from "../tea";
import {
  assertLoaded,
  assertUnreachable,
  GetLoadedRequest as GetLoadedRequestType,
  RequestStatus,
  RequestStatusView,
  RequestStatusViewMap,
} from "../util/utils";
import { FilterQuery, MeasureStats } from "../../iso/protocol";
import * as SelectFilters from "../views/select-filters";
import * as immer from "immer";
import * as ReportCardGraph from "./report-card-graph";
import { hydrateSnapshot } from "../util/snapshot";
const produce = immer.produce;
import lodash from "lodash";
import { INPUT_MEASURES } from "../../iso/measures/index";
import { MeasureId, UnitType, UnitValue } from "../../iso/units";
import {
  EWBANK,
  FONT,
  FRENCH_SPORT,
  IRCRAGrade,
  VGRADE,
  YDS,
} from "../../iso/grade";
import { InitialFilters } from "../views/select-filters";

export type Model = immer.Immutable<{
  filtersModel: SelectFilters.Model;
  measureStats: MeasureStats;
  query: FilterQuery;
  mySnapshot?: HydratedSnapshot;
  dataRequest: RequestStatus<{
    snapshots: HydratedSnapshot[];
    reportCardModel: ReportCardGraph.Model;
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
      type: "REPORT_CARD_MSG";
      msg: ReportCardGraph.Msg;
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
  const model: Model = {
    filtersModel,
    measureStats,
    mySnapshot,
    query: getQuery(filtersModel),
    dataRequest: { status: "loading" },
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

    case "UPDATE_QUERY":
      return [model];

    case "REQUEST_DATA":
      const nextModel: Model = produce(model, (draft) => {
        draft.dataRequest = { status: "loading" };
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
        }),
      ];
    }

    default:
      assertUnreachable(msg);
  }
};

function getQuery(filtersModel: SelectFilters.Model): Model["query"] {
  const query: FilterQuery = {};
  filtersModel.filters.forEach((filter) => {
    const minResult = filter.model.minInput.parseResult;
    const maxResult = filter.model.maxInput.parseResult;

    query[filter.model.measureId] = {
      min: minResult.status == "success" ? minResult.value : undefined,
      max: maxResult.status == "success" ? maxResult.value : undefined,
    };
  });
  return query;
}

const FetchButton = ({ dispatch }: { dispatch: Dispatch<Msg> }) => (
  <button onClick={() => dispatch({ type: "REQUEST_DATA" })}>Fetch Data</button>
);

const viewMap: RequestStatusViewMap<
  GetLoadedRequestType<Model["dataRequest"]>["response"],
  Msg
> = {
  "not-sent": ({ dispatch }) => <FetchButton dispatch={dispatch} />,
  loading: () => <div>Fetching...</div>,
  error: ({ dispatch, error }) => (
    <div>
      <div>Error: {error}</div>
      <FetchButton dispatch={dispatch} />
    </div>
  ),
  loaded: ({ response, dispatch }) => (
    <div>
      {response.snapshots.length} snapshots loaded.{" "}
      <FetchButton dispatch={dispatch} />
      <ReportCardGraph.view
        model={response.reportCardModel}
        dispatch={(msg) => dispatch({ type: "REPORT_CARD_MSG", msg })}
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
