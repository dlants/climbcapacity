import React from "react";
import { HydratedSnapshot } from "../types";
import * as Plot from "./plot";
import * as immer from "immer";
import { Dispatch } from "../tea";
import {
  INPUT_MEASURES,
  OUTPUT_MEASURES,
  TIME_TRAINING_MEASURES,
} from "../../iso/measures";
import {
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
const { produce } = immer;

const INPUT_MEASURE_IDS = INPUT_MEASURES.map((s) => s.id);
const TIME_TRAINING_MEASURE_IDS = TIME_TRAINING_MEASURES.map((s) => s.id);
const OUTPUT_MEASURE_IDS = OUTPUT_MEASURES.map((s) => s.id);

type PlotModel = {
  inputMeasure: {
    id: MeasureId;
    unit: UnitType;
  };
  timeTrainingMeasure?: {
    id: MeasureId;
    filter: boolean;
  };
  model: Plot.Model;
};

type MeasureWithUnit = {
  id: MeasureId;
  unit: UnitType;
};

export type Model = immer.Immutable<{
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
      type: "TOGGLE_TRAINING_FILTER";
      measureId: MeasureId;
    };

export function initModel({
  mySnapshot,
  snapshots,
}: {
  mySnapshot: HydratedSnapshot;
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

    plots.push({
      inputMeasure: otherMeasure,
      timeTrainingMeasure: measureSpec.trainingMeasureId && {
        id: measureSpec.trainingMeasureId,
        filter: false,
      },
      model: getPlot({
        inputMeasure: otherMeasure,
        outputMeasure: model.outputMeasure,
        snapshots: model.snapshots,
        mySnapshot: model.mySnapshot,
      }),
    });
  }

  return plots;
}

function getPlot({
  inputMeasure,
  outputMeasure,
  filterByTrainingMeasureId,
  snapshots,
  mySnapshot,
}: {
  inputMeasure: MeasureWithUnit;
  filterByTrainingMeasureId?: MeasureId;
  outputMeasure: MeasureWithUnit;
  snapshots: readonly HydratedSnapshot[];
  mySnapshot: HydratedSnapshot;
}): Plot.Model {
  const data: { x: number; y: number }[] = [];

  const myData = extractDataPoint({
    measures: mySnapshot.measures as any,
    inputMeasure,
    outputMeasure,
  });

  const minYValue = myData ? myData.y - 1 : undefined;
  const maxYValue = myData ? myData.y + 3 : undefined;

  for (const snapshot of snapshots) {
    if (filterByTrainingMeasureId) {
      const trainingTimeUnitValue =
        snapshot.measures[filterByTrainingMeasureId];
      const trainingTimeYears = trainingTimeUnitValue
        ? convertToStandardUnit(trainingTimeUnitValue as UnitValue)
        : NaN;
      if (trainingTimeYears >= 0.5) continue;
    }

    const dataPoint = extractDataPoint({
      measures: snapshot.measures as any,
      inputMeasure,
      outputMeasure,
    });

    if (!dataPoint) {
      continue;
    }

    if (minYValue != undefined && dataPoint.y < minYValue) {
      continue;
    }

    if (maxYValue != undefined && maxYValue < dataPoint.y) {
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
    case "TOGGLE_TRAINING_FILTER":
      return [
        produce(model, (draft) => {
          const plot = draft.plots.find(
            (p) => p.inputMeasure.id === msg.measureId,
          );

          if (plot?.timeTrainingMeasure) {
            plot.timeTrainingMeasure.filter = !plot.timeTrainingMeasure.filter;
            plot.model = immer.castDraft(
              getPlot({
                inputMeasure: plot.inputMeasure,
                filterByTrainingMeasureId: plot.timeTrainingMeasure.filter
                  ? plot.timeTrainingMeasure.id
                  : undefined,
                outputMeasure: draft.outputMeasure,
                snapshots: draft.snapshots,
                mySnapshot: draft.mySnapshot,
              }),
            );
          }
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
        <PlotWithTrainingControls
          key={plot.inputMeasure.id}
          plot={plot}
          dispatch={dispatch}
        />
      ))}
    </div>
  );
}

function PlotWithTrainingControls({
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
      {plot.timeTrainingMeasure && (
        <label>
          <input
            type="checkbox"
            checked={plot.timeTrainingMeasure.filter}
            onChange={() =>
              dispatch({
                type: "TOGGLE_TRAINING_FILTER",
                measureId: plot.inputMeasure.id,
              })
            }
          />
          Exclude people who did training similar to this measure for over 6 months
        </label>
      )}
      <Plot.view model={plot.model} dispatch={dispatch} />
    </div>
  );
}
