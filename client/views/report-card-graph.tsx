import React from "react";
import { HydratedSnapshot } from "../types";
import * as Plot from "./plot";
import * as Filters from "./report-graph-filters";
import * as immer from "immer";
import { Dispatch } from "../tea";
import {
  INPUT_MEASURES,
  OTHER_MEASURES,
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
import * as UnitToggle from "./unit-toggle";
const { produce } = immer;

const INPUT_MEASURE_IDS = INPUT_MEASURES.map((s) => s.id);
const TIME_TRAINING_MEASURE_IDS = TIME_TRAINING_MEASURES.map((s) => s.id);
const OUTPUT_MEASURE_IDS = OUTPUT_MEASURES.map((s) => s.id);

type PlotModel = {
  filterModel: Filters.Model;
  inputMeasure: MeasureWithUnit;
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
  outputMeasures: MeasureWithUnit[];
  plots: PlotModel[];
}>;

export type Msg =
  | {
      type: "SELECT_OUTPUT_MEASURE";
      measureId: MeasureId;
    }
  | {
      type: "OUTPUT_MEASURE_TOGGLE_MSG";
      msg: UnitToggle.Msg;
    }
  | {
      type: "FILTER_MSG";
      measureId: MeasureId;
      msg: Filters.Msg;
    };

export function initModel({
  mySnapshot,
  measureStats,
  snapshots,
}: {
  mySnapshot?: HydratedSnapshot;
  measureStats: MeasureStats;
  snapshots: HydratedSnapshot[];
}): Result<Model> {
  const outputMeasures: MeasureWithUnit[] = [];
  if (mySnapshot) {
    for (const id in mySnapshot.measures) {
      const measureId = id as MeasureId;
      if (OUTPUT_MEASURE_IDS.includes(measureId)) {
        outputMeasures.push({
          id: measureId,
          unit: mySnapshot.measures[measureId].unit,
        });
      }
    }
  } else {
    for (const { id, units } of OUTPUT_MEASURES) {
      outputMeasures.push({
        id,
        unit: units[0],
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
  const outputMeasureToggle: UnitToggle.Model = {
    measureId: outputMeasure.id,
    selectedUnit: outputMeasure.unit,
    possibleUnits: MEASURE_MAP[outputMeasure.id].units,
  };

  const model: Model = produce<Model>(
    {
      mySnapshot,
      measureStats,
      snapshots,
      outputMeasure: {
        id: outputMeasure.id,
        toggle: outputMeasureToggle,
      },
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
    for (const { id, units } of OTHER_MEASURES) {
      otherMeasures.push({
        id,
        unit: units[0],
      });
    }
  }

  const plots: PlotModel[] = [];
  const outputMeasureSpec = MEASURE_MAP[model.outputMeasure.id];
  for (const otherMeasure of otherMeasures) {
    const otherMeasureSpec = MEASURE_MAP[otherMeasure.id];
    const initialMeasures: Filters.InitialMeasures = {};
    if (model.mySnapshot) {
      initialMeasures[model.outputMeasure.id] = {
        enabled: true,
        minValue: adjustGrade(
          model.mySnapshot.measures[model.outputMeasure.id] as UnitValue,
          -1,
        ),
        maxValue: adjustGrade(
          model.mySnapshot.measures[model.outputMeasure.id] as UnitValue,
          2,
        ),
      };
    } else {
      initialMeasures[model.outputMeasure.id] = {
        enabled: true,
        minValue: outputMeasureSpec.defaultMinValue,
        maxValue: outputMeasureSpec.defaultMaxValue,
      };
    }

    if (otherMeasureSpec.trainingMeasureId) {
      initialMeasures[otherMeasureSpec.trainingMeasureId] = {
        enabled: false,
        minValue: { unit: "month", value: 0 },
        maxValue: { unit: "month", value: 6 },
      };
    }

    const filterModel = Filters.initModel({
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
  filterModel: Filters.Model;
  model: Model;
}): Plot.Model {
  const data: { x: number; y: number }[] = [];
  const { mySnapshot, snapshots, outputMeasure } = model;
  const outputFilter = filterModel.filters.find(
    (f) => f.model.measureId == outputMeasure.id,
  );
  const outputUnit = outputFilter
    ? outputFilter.model.unitToggle.selectedUnit
    : outputMeasure.toggle.selectedUnit;

  const myData =
    mySnapshot &&
    extractDataPoint({
      measures: mySnapshot.measures as any,
      inputMeasure,
      outputMeasure: {
        id: outputMeasure.id,
        unit: outputUnit,
      },
    });

  for (const snapshot of snapshots) {
    const dataPoint = extractDataPoint({
      measures: snapshot.measures as any,
      inputMeasure,
      outputMeasure: {
        id: outputMeasure.id,
        unit: outputUnit,
      },
    });

    if (!dataPoint) {
      continue;
    }

    const shouldKeep = filterModel.filters.every((filter) => {
      if (!filter.enabled) {
        return true;
      }

      const snapshotValue = snapshot.measures[filter.model.measureId];
      if (!snapshotValue) {
        return false;
      }
      const normalizedSnapshotValue = convertToStandardUnit(
        snapshotValue as UnitValue,
      );

      const minInputModel = filter.model.minInput;
      const maxInputModel = filter.model.maxInput;

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
      yUnit: outputUnit,
    };
  } else {
    return {
      style: "heatmap",
      data: filterOutliersX(data),
      myData,
      xLabel: inputMeasure.id,
      xUnit: inputMeasure.unit,
      yLabel: outputMeasure.id,
      yUnit: outputUnit,
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
          const outputMeasure = draft.outputMeasures[index];
          draft.outputMeasure = {
            id: outputMeasure.id,
            toggle: {
              measureId: outputMeasure.id,
              selectedUnit: outputMeasure.unit,
              possibleUnits: MEASURE_MAP[outputMeasure.id].units,
            },
          };
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
          const [next] = Filters.update(msg.msg, plot.filterModel);
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

    case "OUTPUT_MEASURE_TOGGLE_MSG":
      return [
        produce(model, (draft) => {
          const outputMeasure = draft.outputMeasure;
          const [next] = UnitToggle.update(msg.msg, outputMeasure.toggle);
          outputMeasure.toggle = immer.castDraft(next);
          draft.plots = immer.castDraft(getPlots(draft));
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
      <UnitToggle.view
        model={model.outputMeasure.toggle}
        dispatch={(msg) => {
          dispatch({ type: "OUTPUT_MEASURE_TOGGLE_MSG", msg });
        }}
      />
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
    </div>
  );
}
