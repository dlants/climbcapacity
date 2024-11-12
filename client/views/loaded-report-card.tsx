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
import { InitialMeasures } from "../views/select-filters";

export type Model = immer.Immutable<{
  filtersModel: SelectFilters.Model;
  measureStats: MeasureStats;
  query: FilterQuery;
  userId: string;
  mySnapshot: HydratedSnapshot;
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
  userId,
  mySnapshot,
  measureStats,
}: {
  userId: string;
  measureStats: MeasureStats;
  mySnapshot: HydratedSnapshot;
}): [Model] | [Model, Thunk<Msg> | undefined] {
  let myInputValues = lodash.pick(
    mySnapshot.measures,
    INPUT_MEASURES.map((m) => m.id),
  );

  const initialMeasures: InitialMeasures = {};
  for (const measureIdStr in myInputValues) {
    const measureId = measureIdStr as MeasureId;
    const value = myInputValues[measureId];
    initialMeasures[measureId] = {
      minValue: getMinInputValue(value as UnitValue),
      maxValue: getMaxInputValue(value as UnitValue),
    };
  }

  const filtersModel = SelectFilters.initModel({
    measureStats,
    initialMeasures,
  });
  const model: Model = {
    filtersModel,
    measureStats,
    userId,
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
    if (filter.state.state === "selected") {
      const minResult = filter.state.model.minInput.parseResult;
      const maxResult = filter.state.model.maxInput.parseResult;

      query[filter.state.model.measureId] = {
        min: minResult.status == "success" ? minResult.value : undefined,
        max: maxResult.status == "success" ? maxResult.value : undefined,
      };
    }
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

function getMinInputValue(value: UnitValue) {
  switch (value.unit) {
    case "second":
    case "year":
    case "month":
    case "lb":
    case "1RMlb":
    case "2RMlb":
    case "5RMlb":
    case "kg":
    case "1RMkg":
    case "2RMkg":
    case "5RMkg":
    case "m":
    case "cm":
    case "mm":
    case "inch":
      return {
        ...value,
        value: value.value * 0.9,
      };
    case "count":
      return {
        ...value,
        value: Math.max(Math.floor(value.value * 0.9), value.value - 1),
      };
    case "vermin":
      return {
        ...value,
        value: VGRADE[Math.max(VGRADE.indexOf(value.value) - 1, 0)],
      };
    case "font":
      return {
        ...value,
        value: FONT[Math.max(FONT.indexOf(value.value) - 1, 0)],
      };
    case "frenchsport":
      return {
        ...value,
        value: FRENCH_SPORT[Math.max(FRENCH_SPORT.indexOf(value.value) - 1, 0)],
      };
    case "yds":
      return {
        ...value,
        value: YDS[Math.max(YDS.indexOf(value.value) - 1, 0)],
      };
    case "ewbank":
      return {
        ...value,
        value: EWBANK[Math.max(EWBANK.indexOf(value.value) - 1, 0)],
      };
    case "ircra":
      return {
        ...value,
        value: (value.value * 0.9) as IRCRAGrade,
      };
    case "sex-at-birth":
      return value;
    default:
      assertUnreachable(value);
  }
}

function getMaxInputValue(value: UnitValue) {
  switch (value.unit) {
    case "second":
    case "year":
    case "month":
    case "lb":
    case "1RMlb":
    case "2RMlb":
    case "5RMlb":
    case "kg":
    case "1RMkg":
    case "2RMkg":
    case "5RMkg":
    case "m":
    case "cm":
    case "mm":
    case "inch":
      return {
        ...value,
        value: value.value * 1.1,
      };
    case "count":
      return {
        ...value,
        value: Math.max(Math.ceil(value.value * 1.1), value.value + 1),
      };
    case "vermin":
      return {
        ...value,
        value:
          VGRADE[Math.min(VGRADE.indexOf(value.value) + 1, VGRADE.length - 1)],
      };
    case "font":
      return {
        ...value,
        value: FONT[Math.min(FONT.indexOf(value.value) + 1, FONT.length - 1)],
      };
    case "frenchsport":
      return {
        ...value,
        value:
          FRENCH_SPORT[
            Math.min(
              FRENCH_SPORT.indexOf(value.value) + 1,
              FRENCH_SPORT.length - 1,
            )
          ],
      };
    case "yds":
      return {
        ...value,
        value: YDS[Math.min(YDS.indexOf(value.value) + 1, YDS.length - 1)],
      };
    case "ewbank":
      return {
        ...value,
        value:
          EWBANK[Math.min(EWBANK.indexOf(value.value) + 1, EWBANK.length - 1)],
      };
    case "ircra":
      return {
        ...value,
        value: (value.value * 1.1) as IRCRAGrade,
      };
    case "sex-at-birth":
      return value;
    default:
      assertUnreachable(value);
  }
}
