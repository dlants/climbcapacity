import React from "react";
import { HydratedSnapshot } from "../types";
import * as Plot from "./plot";
import * as SelectFilters from "./select-filters";
import * as immer from "immer";
import { Dispatch } from "../tea";
import {
  INPUT_MEASURES,
  OUTPUT_MEASURES,
  TIME_TRAINING_MEASURES,
} from "../../iso/measures";
import {
  adjustGrade,
  convertToStandardUnit,
  extractDataPoint,
  MeasureId,
  UnitType,
  UnitValue,
} from "../../iso/units";
import { assertUnreachable } from "../util/utils";
import { Result } from "../../iso/utils";
import { filterOutliersX } from "../util/stats";
import { MEASURE_MAP } from "../constants";
import { MeasureStats } from "../../iso/protocol";
const { produce } = immer;

const INPUT_MEASURE_IDS = INPUT_MEASURES.map((s) => s.id);
const TIME_TRAINING_MEASURE_IDS = TIME_TRAINING_MEASURES.map((s) => s.id);
const OUTPUT_MEASURE_IDS = OUTPUT_MEASURES.map((s) => s.id);

type PlotModel = {
  filterModel: SelectFilters.Model;
  inputMeasure: MeasureWithUnit;
  model: Plot.Model;
};

type MeasureWithUnit = {
  id: MeasureId;
  unit: UnitType;
};

export type Model = immer.Immutable<{
  measureStats: MeasureStats;
  mySnapshot: HydratedSnapshot;
  snapshots: HydratedSnapshot[];
  outputMeasure: MeasureWithUnit;
  outputMeasures: MeasureWithUnit[];
  plots: PlotModel[];
}>;

export type Msg =
  | {
      type: "SELECT_OUTPUT_MEASURE";
      measureId: MeasureId;
    }
  | {
      type: "FILTER_MSG";
      measureId: MeasureId;
      msg: SelectFilters.Msg;
    };

export function initModel({
  mySnapshot,
  measureStats,
  snapshots,
}: {
  mySnapshot: HydratedSnapshot;
  measureStats: MeasureStats;
  snapshots: HydratedSnapshot[];
}): Result<Model> {
  const outputMeasures: MeasureWithUnit[] = [];
  for (const id in mySnapshot.measures) {
    const measureId = id as MeasureId;
    if (OUTPUT_MEASURE_IDS.includes(measureId)) {
      outputMeasures.push({
        id: measureId,
        unit: mySnapshot.measures[measureId].unit,
      });
    }
  }

  if (outputMeasures.length == 0) {
    return {
      status: "fail",
      error: `No output measures found. Try adding some grade data to your snapshot.`,
    };
  }
  const outputMeasure = outputMeasures[0];

  const model: Model = produce<Model>(
    {
      mySnapshot,
      measureStats,
      snapshots,
      outputMeasure,
      outputMeasures,
      plots: [],
    },
    (draft) => {
      draft.plots = immer.castDraft(getPlots(draft));
    },
  );

  return { status: "success", value: model };
}

function getPlots(model: Model) {
  const otherMeasures: MeasureWithUnit[] = [];

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

  const plots: PlotModel[] = [];
  for (const otherMeasure of otherMeasures) {
    const measureSpec = MEASURE_MAP[otherMeasure.id];
    const initialMeasures: SelectFilters.InitialMeasures = {};
    initialMeasures[model.outputMeasure.id] = {
      minValue: adjustGrade(
        model.mySnapshot.measures[model.outputMeasure.id] as UnitValue,
        -1,
      ),
      maxValue: adjustGrade(
        model.mySnapshot.measures[model.outputMeasure.id] as UnitValue,
        2,
      ),
    };

    if (measureSpec.trainingMeasureId) {
      initialMeasures[measureSpec.trainingMeasureId] = {
        minValue: { unit: "month", value: 0 },
        maxValue: { unit: "month", value: 6 },
      };
    }

    const filterModel = SelectFilters.initModel({
      initialMeasures,
      measureStats: model.measureStats,
    });

    plots.push({
      inputMeasure: otherMeasure,
      filterModel,
      model: getPlot({
        inputMeasure: otherMeasure,
        filterModel,
        model,
      }),
    });
  }

  return plots;
}

function getPlot({
  inputMeasure,
  filterModel,
  model,
}: {
  inputMeasure: MeasureWithUnit;
  filterModel: SelectFilters.Model;
  model: Model;
}): Plot.Model {
  const data: { x: number; y: number }[] = [];
  const { mySnapshot, snapshots, outputMeasure } = model;

  const myData = extractDataPoint({
    measures: mySnapshot.measures as any,
    inputMeasure,
    outputMeasure,
  });

  for (const snapshot of snapshots) {
    const dataPoint = extractDataPoint({
      measures: snapshot.measures as any,
      inputMeasure,
      outputMeasure,
    });

    if (!dataPoint) {
      continue;
    }

    const shouldKeep = filterModel.filters.every((filter) => {
      if (filter.state.state != "selected") {
        return true;
      }

      const snapshotValue = snapshot.measures[filter.state.measureId];
      if (!snapshotValue) {
        return false;
      }
      const normalizedSnapshotValue = convertToStandardUnit(
        snapshotValue as UnitValue,
      );

      const minInputModel = filter.state.minInput;
      const maxInputModel = filter.state.maxInput;

      if (minInputModel.parseResult.status == "success") {
        const minValue = convertToStandardUnit(minInputModel.parseResult.value);
        if (minValue > normalizedSnapshotValue) {
          return false;
        }
      }

      if (maxInputModel.parseResult.status == "success") {
        const maxValue = convertToStandardUnit(maxInputModel.parseResult.value);
        if (maxValue < normalizedSnapshotValue) {
          return false;
        }
      }

      return true;
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
      xLabel: inputMeasure.id,
      xUnit: inputMeasure.unit,
      yLabel: outputMeasure.id,
      yUnit: outputMeasure.unit,
    };
  } else {
    return {
      style: "heatmap",
      data: filterOutliersX(data),
      myData,
      xLabel: inputMeasure.id,
      xUnit: inputMeasure.unit,
      yLabel: outputMeasure.id,
      yUnit: outputMeasure.unit,
    };
  }
}

export function update(msg: Msg, model: Model): [Model] {
  switch (msg.type) {
    case "SELECT_OUTPUT_MEASURE":
      const index = model.outputMeasures.findIndex(
        (m) => m.id == msg.measureId,
      );
      if (index == -1) {
        throw new Error(`Cannot select output measure ${msg.measureId}`);
      }
      return [
        produce(model, (draft) => {
          draft.outputMeasure = draft.outputMeasures[index];
          draft.plots = immer.castDraft(getPlots(draft));
        }),
      ];
    case "FILTER_MSG":
      return [
        produce(model, (draft) => {
          const plot = draft.plots.find(
            (p) => p.inputMeasure.id === msg.measureId,
          );
          if (!plot) {
            throw new Error(`Cannot find plot for measure ${msg.measureId}`);
          }
          const [next] = SelectFilters.update(msg.msg, plot.filterModel);
          plot.filterModel = immer.castDraft(next);
          plot.model = immer.castDraft(
            getPlot({
              filterModel: next,
              inputMeasure: plot.inputMeasure,
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
      Output Measure:
      <select
        value={model.outputMeasure.id}
        onChange={(e) =>
          dispatch({
            type: "SELECT_OUTPUT_MEASURE",
            measureId: e.target.value as MeasureId,
          })
        }
      >
        {model.outputMeasures.map((m) => (
          <option key={m.id} value={m.id}>
            {m.id}
          </option>
        ))}
      </select>
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
      <SelectFilters.view
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
    </div>
  );
}
