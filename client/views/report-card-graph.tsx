import React from "react";
import { HydratedSnapshot } from "../types";
import * as Plot from "./plot";
import * as Filters from "./report-graph-filters";
import * as Filter from "./filters/filter";
import * as immer from "immer";
import { Dispatch } from "../tea";
import {
  ANTHRO_MEASURES,
  MeasureId,
  INPUT_MEASURES,
  PERFORMANCE_MEASURES,
  TIME_TRAINING_MEASURES,
} from "../../iso/measures";
import {
  adjustGrade,
  castInitialFilter,
  castUnit,
  extractDataPoint,
  UnitType,
  UnitValue,
} from "../../iso/units";
import { assertUnreachable } from "../util/utils";
import { Result } from "../../iso/utils";
import { filterOutliersX } from "../util/stats";
import { MEASURE_MAP } from "../constants";
import { MeasureStats } from "../../iso/protocol";
import * as UnitToggle from "./unit-toggle";
const { produce } = immer;

const INPUT_MEASURE_IDS = ANTHRO_MEASURES.map((s) => s.id);
const TIME_TRAINING_MEASURE_IDS = TIME_TRAINING_MEASURES.map((s) => s.id);
const OUTPUT_MEASURE_IDS = PERFORMANCE_MEASURES.map((s) => s.id);

type PlotModel = {
  filterModel: Filters.Model;
  inputMeasure: MeasureWithUnit;
  toggle: UnitToggle.Model;
  model: Plot.Model;
};

type MeasureWithUnit = {
  id: MeasureId;
  unit: UnitType;
};

export type Model = immer.Immutable<{
  measureStats: MeasureStats;
  mySnapshot?: HydratedSnapshot;
  snapshots: HydratedSnapshot[];
  outputMeasure: {
    id: MeasureId;
    toggle: UnitToggle.Model;
  };
  plots: PlotModel[];
}>;

export type Msg =
  | {
      type: "FILTER_MSG";
      measureId: MeasureId;
      msg: Filters.Msg;
    }
  | {
      type: "TOGGLE_MSG";
      measureId: MeasureId;
      msg: UnitToggle.Msg;
    };

export function initModel({
  mySnapshot,
  measureStats,
  snapshots,
  outputMeasure,
}: {
  mySnapshot?: HydratedSnapshot;
  measureStats: MeasureStats;
  snapshots: HydratedSnapshot[];
  outputMeasure: Model["outputMeasure"];
}): Model {
  return produce<Model>(
    {
      mySnapshot,
      measureStats,
      snapshots,
      outputMeasure,
      plots: [],
    },
    (draft) => {
      draft.plots = immer.castDraft(getPlots(draft));
    },
  );
}

function getPlots(model: Model) {
  const otherMeasures: MeasureWithUnit[] = [];

  if (model.mySnapshot) {
    for (const id in model.mySnapshot.measures) {
      const measureId = id as MeasureId;
      if (
        !(
          INPUT_MEASURE_IDS.includes(id as MeasureId) ||
          OUTPUT_MEASURE_IDS.includes(id as MeasureId) ||
          TIME_TRAINING_MEASURE_IDS.includes(id as MeasureId)
        )
      ) {
        otherMeasures.push({
          id: measureId,
          unit: model.mySnapshot.measures[measureId].unit,
        });
      }
    }
  } else {
    const snapshotStats: { [measureId: MeasureId]: number } = {};
    for (const snapshot of model.snapshots) {
      for (const measureId in snapshot.measures) {
        snapshotStats[measureId as MeasureId] =
          (snapshotStats[measureId as MeasureId] || 0) + 1;
      }
    }

    for (const { id, units } of INPUT_MEASURES) {
      if (!id.startsWith("time-training:") && snapshotStats[id] > 0) {
        otherMeasures.push({
          id,
          unit: units[0],
        });
      }
    }

    otherMeasures.sort(
      (a, b) => (snapshotStats[b.id] || 0) - (snapshotStats[a.id] || 0),
    );
  }

  const plots: PlotModel[] = [];
  const outputMeasureSpec = MEASURE_MAP[model.outputMeasure.id];
  for (const otherMeasure of otherMeasures) {
    const otherMeasureSpec = MEASURE_MAP[otherMeasure.id];
    const initialFilters: Filters.InitialFilters = {};
    if (model.mySnapshot) {
      const targetUnit = model.outputMeasure.toggle.selectedUnit;

      initialFilters[model.outputMeasure.id] = {
        enabled: true,
        type: "minmax",
        measureId: model.outputMeasure.id,
        minValue: adjustGrade(
          castUnit(
            model.mySnapshot.measures[model.outputMeasure.id] as UnitValue,
            targetUnit,
          ),
          -1,
        ),
        maxValue: adjustGrade(
          castUnit(
            model.mySnapshot.measures[model.outputMeasure.id] as UnitValue,
            targetUnit,
          ),
          2,
        ),
      };
    } else {
      initialFilters[model.outputMeasure.id] = {
        enabled: true,
        ...castInitialFilter(
          outputMeasureSpec.initialFilter,
          model.outputMeasure.toggle.selectedUnit,
        ),
      };
    }

    if (otherMeasureSpec.trainingMeasureId) {
      initialFilters[otherMeasureSpec.trainingMeasureId] = {
        enabled: false,
        type: "minmax",
        measureId: otherMeasureSpec.trainingMeasureId,
        minValue: { unit: "month", value: 0 },
        maxValue: { unit: "month", value: 6 },
      };
    }

    const filterModel = Filters.initModel({
      initialFilters: initialFilters,
      measureStats: model.measureStats,
    });

    plots.push({
      inputMeasure: otherMeasure,
      filterModel,
      toggle: {
        measureId: otherMeasure.id,
        selectedUnit: otherMeasure.unit,
        possibleUnits: otherMeasureSpec.units,
      },
      model: getPlot({
        xMeasure: otherMeasure,
        filterModel,
        model,
      }),
    });
  }

  return plots;
}

function getPlot({
  xMeasure,
  filterModel,
  model,
}: {
  xMeasure: MeasureWithUnit;
  filterModel: Filters.Model;
  model: Model;
}): Plot.Model {
  const data: { x: number; y: number }[] = [];
  const { mySnapshot, snapshots, outputMeasure: yMeasure } = model;
  const yFilter = filterModel.filters.find(
    (f) => f.model.model.measureId == yMeasure.id,
  );
  const yUnit = yFilter
    ? yFilter.model.model.unitToggle.selectedUnit
    : yMeasure.toggle.selectedUnit;

  const myData =
    mySnapshot &&
    extractDataPoint({
      measures: mySnapshot.measures as any,
      xMeasure: xMeasure,
      yMeasure: {
        id: yMeasure.id,
        unit: yUnit,
      },
    });

  for (const snapshot of snapshots) {
    const dataPoint = extractDataPoint({
      measures: snapshot.measures as any,
      xMeasure: xMeasure,
      yMeasure: {
        id: yMeasure.id,
        unit: yUnit,
      },
    });

    if (!dataPoint) {
      continue;
    }

    const shouldKeep = filterModel.filters.every((filter) => {
      if (!filter.enabled) {
        return true;
      }

      const snapshotValue = snapshot.measures[filter.model.model.measureId];
      if (!snapshotValue) {
        return false;
      }

      return Filter.filterApplies(filter.model, snapshotValue as UnitValue);
    });

    if (!shouldKeep) {
      continue;
    }

    data.push(dataPoint);
  }

  if (data.length < 20) {
    return {
      style: "dotplot",
      data,
      myData,
      xLabel: xMeasure.id,
      xUnit: xMeasure.unit,
      yLabel: yMeasure.id,
      yUnit: yUnit,
    };
  } else {
    return {
      style: "heatmap",
      data: filterOutliersX(data),
      myData,
      xLabel: xMeasure.id,
      xUnit: xMeasure.unit,
      yLabel: yMeasure.id,
      yUnit: yUnit,
    };
  }
}

export function update(msg: Msg, model: Model): [Model] {
  switch (msg.type) {
    case "FILTER_MSG":
      return [
        produce(model, (draft) => {
          const plot = draft.plots.find(
            (p) => p.inputMeasure.id === msg.measureId,
          );
          if (!plot) {
            throw new Error(`Cannot find plot for measure ${msg.measureId}`);
          }
          const [next] = Filters.update(msg.msg, plot.filterModel);
          plot.filterModel = immer.castDraft(next);
          plot.model = immer.castDraft(
            getPlot({
              filterModel: next,
              xMeasure: {
                ...plot.inputMeasure,
                unit: plot.toggle.selectedUnit,
              },
              model,
            }),
          );
        }),
      ];

    case "TOGGLE_MSG":
      return [
        produce(model, (draft) => {
          const plot = draft.plots.find(
            (p) => p.inputMeasure.id === msg.measureId,
          );
          if (!plot) {
            throw new Error(`Cannot find plot for measure ${msg.measureId}`);
          }
          const [next] = UnitToggle.update(msg.msg, plot.toggle);
          plot.toggle = immer.castDraft(next);
          plot.model = immer.castDraft(
            getPlot({
              filterModel: plot.filterModel,
              xMeasure: {
                ...plot.inputMeasure,
                unit: next.selectedUnit,
              },
              model,
            }),
          );
        }),
      ];

    default:
      assertUnreachable(msg);
  }
}

export function view({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: Dispatch<Msg>;
}) {
  return (
    <div>
      {model.plots.map((plot) => (
        <PlotWithControls
          key={plot.inputMeasure.id}
          plot={plot}
          dispatch={dispatch}
        />
      ))}
    </div>
  );
}

function PlotWithControls({
  plot,
  dispatch,
}: {
  plot: PlotModel;
  dispatch: Dispatch<Msg>;
}) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", marginTop: "10px" }}
    >
      <h1>{plot.inputMeasure.id}</h1>
      <Filters.view
        model={plot.filterModel}
        dispatch={(msg) => {
          dispatch({
            type: "FILTER_MSG",
            measureId: plot.inputMeasure.id,
            msg,
          });
        }}
      />
      <Plot.view model={plot.model} dispatch={dispatch} />
      {plot.toggle.possibleUnits.length > 1 && (
        <UnitToggle.view
          model={plot.toggle}
          dispatch={(msg) => {
            dispatch({
              type: "TOGGLE_MSG",
              measureId: plot.inputMeasure.id,
              msg,
            });
          }}
        />
      )}
    </div>
  );
}
