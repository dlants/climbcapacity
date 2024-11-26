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
import * as SelectMeasureClass from "./snapshot/select-measure-class";
import * as UnitToggle from "./unit-toggle";
import * as typestyle from "typestyle";
import * as csstips from "csstips";
import * as csx from "csx";
import { MEASURES } from "../constants";
import { boulderGradeClass, sportGradeClass } from "../../iso/measures/grades";
import { getSpec } from "../../iso/measures";

export type Model = immer.Immutable<{
  filtersModel: SelectFilters.Model;
  outputMeasure: {
    selector: SelectMeasureClass.Model;
    toggle: UnitToggle.Model;
  };
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
      type: "SELECT_MEASURE_CLASS_MSG";
      msg: SelectMeasureClass.Msg;
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

  const performanceMeasure = MEASURES.find((s) => s.type == "performance");
  if (!performanceMeasure) {
    throw new Error(`No performance measures found`);
  }

  let initialMeasure = {
    measureId: performanceMeasure.id,
    unit: performanceMeasure.units[0],
    possibleUnits: performanceMeasure.units,
  };

  if (mySnapshot) {
    const performanceMeasure = MEASURES.find(
      (m) => m.type == "performance" && mySnapshot.measures[m.id],
    );

    if (performanceMeasure) {
      initialMeasure = {
        measureId: performanceMeasure.id,
        unit: mySnapshot.measures[performanceMeasure.id].unit,
        possibleUnits: performanceMeasure.units,
      };
    }
  }

  const outputMeasure: Model["outputMeasure"] = {
    selector: SelectMeasureClass.initModel({
      measureClasses: [boulderGradeClass, sportGradeClass],
      measureStats,
      measureId: initialMeasure.measureId,
    }),

    toggle: {
      measureId: initialMeasure.measureId,
      selectedUnit: initialMeasure.unit,
      possibleUnits: initialMeasure.possibleUnits,
    },
  };

  const model: Model = {
    filtersModel,
    measureStats,
    outputMeasure,
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
            const next = ReportCardGraph.initModel({
              snapshots: msg.request.response,
              outputMeasure: {
                id: model.outputMeasure.selector.selected.measureId,
                unit: model.outputMeasure.toggle.selectedUnit,
              },
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

    case "SELECT_MEASURE_CLASS_MSG":
      return [
        produce(model, (draft) => {
          const [next] = SelectMeasureClass.update(
            msg.msg,
            draft.outputMeasure.selector,
          );
          draft.outputMeasure.selector = immer.castDraft(next);
          const measure = getSpec(next.selected.measureId);
          draft.outputMeasure.toggle = {
            measureId: measure.id,
            selectedUnit: measure.units[0],
            possibleUnits: measure.units,
          };

          if (draft.dataRequest.status == "loaded") {
            const next = ReportCardGraph.initModel({
              snapshots: draft.dataRequest.response.snapshots,
              outputMeasure: {
                id: draft.outputMeasure.selector.selected.measureId,
                unit: draft.outputMeasure.toggle.selectedUnit,
              },
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
          const [next] = UnitToggle.update(msg.msg, draft.outputMeasure.toggle);
          draft.outputMeasure.toggle = immer.castDraft(next);

          if (draft.dataRequest.status == "loaded") {
            const next = ReportCardGraph.initModel({
              snapshots: draft.dataRequest.response.snapshots,
              outputMeasure: {
                id: draft.outputMeasure.selector.selected.measureId,
                unit: draft.outputMeasure.toggle.selectedUnit,
              },
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
    onPointerDown={() => dispatch({ type: "REQUEST_DATA" })}
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

const styles = typestyle.stylesheet({
  reportCardRoot: {
    ...csstips.vertical,
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  filter: {
    ...csstips.content,
  },
  graphs: {
    ...csstips.flex,
    minHeight: csx.px(200),
  },
  outputMeasureContainer: {
    ...csstips.content,
    ...csstips.horizontal,
  },
});

const OutputMeasureView = ({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: Dispatch<Msg>;
}) => {
  return (
    <div className={styles.outputMeasureContainer}>
      Output Measure:
      <SelectMeasureClass.view
        model={model.outputMeasure.selector}
        dispatch={(msg) => {
          dispatch({ type: "SELECT_MEASURE_CLASS_MSG", msg });
        }}
      />
      <UnitToggle.view
        model={model.outputMeasure.toggle}
        dispatch={(msg) => {
          dispatch({ type: "OUTPUT_MEASURE_TOGGLE_MSG", msg });
        }}
      />
    </div>
  );
};

const SnapshotStatsView = ({ model }: { model: Model }) => {
  return (
    model.dataRequest.status == "loaded" && (
      <span>
        {model.dataRequest.response.snapshots.length} snapshots loaded.
      </span>
    )
  );
};

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div className={styles.reportCardRoot}>
      <div className={styles.filter}>
        <SelectFilters.view
          model={model.filtersModel}
          dispatch={(msg) => dispatch({ type: "FILTERS_MSG", msg })}
        />

        <SnapshotStatsView model={model} />
        <OutputMeasureView model={model} dispatch={dispatch} />
      </div>
      {(() => {
        switch (model.dataRequest.status) {
          case "not-sent":
            return <FetchButton dispatch={dispatch} model={model} />;
          case "loading":
            return <div>Fetching...</div>;
          case "error":
            return <div>Error: {model.dataRequest.error}</div>;
          case "loaded":
            return (
              <div className={styles.graphs}>
                <LoadedView
                  response={model.dataRequest.response}
                  dispatch={dispatch}
                  model={model}
                />
              </div>
            );
          default:
            assertUnreachable(model.dataRequest);
        }
      })()}
    </div>
  );
};
