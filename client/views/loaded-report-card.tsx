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
import * as Filter from "./filters/filter";
import {
  MEASURE_MAP,
  MeasureId,
  PERFORMANCE_MEASURES,
} from "../../iso/measures";
import * as UnitToggle from "./unit-toggle";
import { UnitType } from "../../iso/units";
import { Result } from "../../iso/utils";

const PERFORMANCE_MEASURE_IDS = PERFORMANCE_MEASURES.map((s) => s.id);

export type Model = immer.Immutable<{
  filtersModel: SelectFilters.Model;
  outputMeasures: MeasureWithUnit[];
  outputMeasure: Result<{
    id: MeasureId;
    toggle: UnitToggle.Model;
  }>;
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
      type: "SELECT_OUTPUT_MEASURE";
      measureId: MeasureId;
    }
  | {
      type: "OUTPUT_MEASURE_TOGGLE_MSG";
      msg: UnitToggle.Msg;
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

type MeasureWithUnit = {
  id: MeasureId;
  unit: UnitType;
};

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

  const outputMeasures: MeasureWithUnit[] = [];
  if (mySnapshot) {
    for (const id in mySnapshot.measures) {
      const measureId = id as MeasureId;
      if (PERFORMANCE_MEASURE_IDS.includes(measureId)) {
        outputMeasures.push({
          id: measureId,
          unit: mySnapshot.measures[measureId].unit,
        });
      }
    }
  } else {
    for (const { id, units } of PERFORMANCE_MEASURES) {
      outputMeasures.push({
        id,
        unit: units[0],
      });
    }
  }

  let outputMeasure: Model["outputMeasure"];
  if (outputMeasures.length == 0) {
    outputMeasure = {
      status: "fail",
      error: `No output measures found. Try adding some grade data to your snapshot.`,
    };
  } else {
    outputMeasures.sort((a, b) => {
      const aCount = measureStats.stats[a.id] || 0;
      const bCount = measureStats.stats[b.id] || 0;
      return bCount - aCount;
    });

    const outputMeasureToggle: UnitToggle.Model = {
      measureId: outputMeasures[0].id,
      selectedUnit: outputMeasures[0].unit,
      possibleUnits: MEASURE_MAP[outputMeasures[0].id].units,
    };

    outputMeasure = {
      status: "success",
      value: {
        id: outputMeasures[0].id,
        toggle: outputMeasureToggle,
      },
    };
  }

  const model: Model = {
    filtersModel,
    measureStats,
    outputMeasure,
    outputMeasures,
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
            if (model.outputMeasure.status != "success") {
              draft.dataRequest = {
                status: "error",
                error: model.outputMeasure.error,
              };
              return;
            }

            const next = ReportCardGraph.initModel({
              snapshots: msg.request.response,
              outputMeasure: model.outputMeasure.value,
              measureStats: model.measureStats,
              mySnapshot: draft.mySnapshot,
            });

            draft.dataRequest = {
              status: "loaded",
              queryHash: msg.request.queryHash,
              response: {
                snapshots: msg.request.response,
                reportCardModel: immer.castDraft(next),
              },
            };
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

    case "SELECT_OUTPUT_MEASURE":
      const index = model.outputMeasures.findIndex(
        (m) => m.id == msg.measureId,
      );
      if (index == -1) {
        throw new Error(`Cannot select output measure ${msg.measureId}`);
      }

      return [
        produce(model, (draft) => {
          const outputMeasure = draft.outputMeasures[index];
          draft.outputMeasure = {
            status: "success",
            value: {
              id: outputMeasure.id,
              toggle: {
                measureId: outputMeasure.id,
                selectedUnit: outputMeasure.unit,
                possibleUnits: MEASURE_MAP[outputMeasure.id].units,
              },
            },
          };

          if (draft.dataRequest.status == "loaded") {
            const next = ReportCardGraph.initModel({
              snapshots: draft.dataRequest.response.snapshots,
              outputMeasure: draft.outputMeasure.value,
              measureStats: draft.measureStats,
              mySnapshot: draft.mySnapshot,
            });
            draft.dataRequest.response.reportCardModel = immer.castDraft(next);
          }
        }),
      ];

    case "OUTPUT_MEASURE_TOGGLE_MSG":
      return [
        produce(model, (draft) => {
          if (draft.outputMeasure.status != "success") {
            throw new Error(
              `Cannot toggle output measure when status is ${draft.outputMeasure.status}`,
            );
          }

          const [next] = UnitToggle.update(
            msg.msg,
            draft.outputMeasure.value.toggle,
          );
          draft.outputMeasure.value.toggle = immer.castDraft(next);

          if (draft.dataRequest.status == "loaded") {
            const next = ReportCardGraph.initModel({
              snapshots: draft.dataRequest.response.snapshots,
              outputMeasure: draft.outputMeasure.value,
              measureStats: draft.measureStats,
              mySnapshot: draft.mySnapshot,
            });
            draft.dataRequest.response.reportCardModel = immer.castDraft(next);
          }
        }),
      ];

    default:
      assertUnreachable(msg);
  }
};

function getQuery(filtersModel: SelectFilters.Model): Model["query"] {
  const query: FilterQuery = {};
  const queryHashParts: string[] = [];
  filtersModel.filters.forEach((filter) => {
    query[filter.model.measureId] = Filter.getQuery(filter);
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
    <ReportCardGraph.view
      model={response.reportCardModel}
      dispatch={(msg) => dispatch({ type: "REPORT_CARD_MSG", msg })}
    />
  );
}

const OutputMeasureView = ({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: Dispatch<Msg>;
}) => {
  if (model.outputMeasure.status == "fail") {
    return (
      <div>Failed to load output measure: {model.outputMeasure.error}</div>
    );
  }

  const outputMeasure = model.outputMeasure.value;
  return (
    <div>
      Output Measure:
      <select
        value={outputMeasure.id}
        onChange={(e) =>
          dispatch({
            type: "SELECT_OUTPUT_MEASURE",
            measureId: e.target.value as MeasureId,
          })
        }
      >
        {model.outputMeasures.map((m) => (
          <option key={m.id} value={m.id}>
            {m.id}({model.measureStats.stats[m.id] || 0})
          </option>
        ))}
      </select>
      <UnitToggle.view
        model={outputMeasure.toggle}
        dispatch={(msg) => {
          dispatch({ type: "OUTPUT_MEASURE_TOGGLE_MSG", msg });
        }}
      />
    </div>
  );
};

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div>
      <div style={{ position: "sticky", top: 0, background: "#fff" }}>
        <SelectFilters.view
          model={model.filtersModel}
          dispatch={(msg) => dispatch({ type: "FILTERS_MSG", msg })}
        />
        {model.dataRequest.status == "loaded" &&
          `${model.dataRequest.response.snapshots.length} snapshots loaded.`}{" "}
        <FetchButton dispatch={dispatch} model={model} />
        <OutputMeasureView model={model} dispatch={dispatch} />
      </div>
      {(() => {
        switch (model.dataRequest.status) {
          case "not-sent":
            return <div />;
          case "loading":
            return <div>Fetching...</div>;
          case "error":
            return <div>Error: {model.dataRequest.error}</div>;
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
