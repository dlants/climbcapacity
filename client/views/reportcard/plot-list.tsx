import React from "react";
import { HydratedSnapshot } from "../../types";
import * as Plot from "../plot";
import * as ReportCardFilter from "./filter";
import * as Filter from "../filters/filter";
import * as immer from "immer";
import { Dispatch } from "../../tea";
import {
  MeasureId,
  generateTrainingMeasureId,
  getSpec,
} from "../../../iso/measures";
import {
  adjustGrade,
  castInitialFilter,
  castUnit,
  extractDataPoint,
  UnitType,
  UnitValue,
} from "../../../iso/units";
import { assertUnreachable } from "../../util/utils";
import { filterOutliersX } from "../../util/stats";
import { MEASURES } from "../../constants";
import { MeasureStats } from "../../../iso/protocol";
import * as UnitToggle from "../unit-toggle";
import * as Interpolate from "./interpolate";
import { InterpolationOption } from "../../../iso/interpolate";
import { ParamName } from "../../../iso/measures/params";
const { produce } = immer;

type PlotModel = immer.Immutable<{
  filterModel: ReportCardFilter.Model;
  inputMeasure: MeasureWithUnit;
  toggle: UnitToggle.Model;
  interpolate: {
    model: Interpolate.Model;
    interpolationOptions: InterpolationOption<ParamName>[];
  },
  model: Plot.Model;
}>;

type MeasureWithUnit = {
  id: MeasureId;
  unit: UnitType;
};

export type Model = immer.Immutable<{
  measureStats: MeasureStats;
  mySnapshot?: HydratedSnapshot;
  snapshots: HydratedSnapshot[];
  snapshotStats: { [measureId: MeasureId]: number };
  outputMeasure: {
    id: MeasureId;
    unit: UnitType;
  };
  plots: PlotModel[];
}>;

export type Msg =
  | {
    type: "FILTER_MSG";
    measureId: MeasureId;
    msg: ReportCardFilter.Msg;
  }
  | {
    type: "TOGGLE_MSG";
    measureId: MeasureId;
    msg: UnitToggle.Msg;
  }
  | {
    type: "INTERPOLATE_MSG";
    measureId: MeasureId;
    msg: Interpolate.Msg;
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
  const snapshotStats: {
    [measureId: MeasureId]: number;
  } = {};
  for (const snapshot of snapshots) {
    for (const measureIdStr in snapshot.measures) {
      const measureId = measureIdStr as MeasureId;
      snapshotStats[measureId] = (snapshotStats[measureId] || 0) + 1;
    }
  }

  return produce<Model>(
    {
      mySnapshot,
      measureStats,
      snapshots,
      snapshotStats,
      outputMeasure,
      plots: [],
    },
    (draft) => {
      draft.plots = immer.castDraft(getPlots(draft));
    },
  );
}

function getPlots(model: Model) {
  const inputMeasures: MeasureWithUnit[] = [];

  if (model.mySnapshot) {
    for (const id in model.mySnapshot.measures) {
      const measureId = id as MeasureId;
      const spec = getSpec(measureId);
      if (spec.type == "input") {
        inputMeasures.push({
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

    for (const { id, units } of MEASURES.filter(
      (s) => s.type == "input" && model.snapshotStats[s.id] > 0,
    )) {
      inputMeasures.push({
        id,
        unit: units[0],
      });
    }

    inputMeasures.sort(
      (a, b) => (snapshotStats[b.id] || 0) - (snapshotStats[a.id] || 0),
    );
  }

  const plots: PlotModel[] = [];
  const outputMeasureSpec = getSpec(model.outputMeasure.id);
  for (const inputMeasure of inputMeasures) {
    const inputMeasureSpec = getSpec(inputMeasure.id);
    const initialFilters: ReportCardFilter.InitialFilters = {};
    if (
      model.mySnapshot &&
      model.mySnapshot.measures[model.outputMeasure.id] != undefined
    ) {
      const targetUnit = model.outputMeasure.unit;

      initialFilters[model.outputMeasure.id] = {
        enabled: true,
        type: "minmax",
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
          model.outputMeasure.unit,
        ),
      };
    }

    if (inputMeasureSpec.type == "input") {
      const trainingMeasureId = generateTrainingMeasureId(inputMeasureSpec.id);
      const trainingSpec = getSpec(trainingMeasureId);
      initialFilters[trainingMeasureId] = {
        enabled: false,
        ...trainingSpec.initialFilter,
      };
    }

    const filterModel = ReportCardFilter.initModel({
      initialFilters: initialFilters,
      measureStats: model.measureStats,
    });

    const includeStrToWtRatio = inputMeasureSpec.units.includes('kg') || inputMeasureSpec.units.includes('lb')
    const selectedUnit = includeStrToWtRatio ? 'strengthtoweightratio' : inputMeasure.unit;

    const interpolationModel = Interpolate.initModel({
      measureId: inputMeasure.id,
      measureStats: model.measureStats,
    });
    const interpolationOptions = getInterpolationOptions(interpolationModel);

    plots.push({
      inputMeasure: inputMeasure,
      filterModel,
      toggle: {
        measureId: inputMeasure.id,
        selectedUnit,
        possibleUnits: includeStrToWtRatio ? [...inputMeasureSpec.units, 'strengthtoweightratio'] : inputMeasureSpec.units,
      },
      interpolate: {
        model: interpolationModel,
        interpolationOptions
      },
      model: getPlot({
        xMeasure: {
          ...inputMeasure,
          unit: selectedUnit
        },
        interpolationOptions,
        filterModel,
        model,
      }),
    });
  }

  return plots;
}

function getInterpolationOptions(interpolationModel: Interpolate.Model): InterpolationOption<ParamName>[] {
  const measureId = interpolationModel.measureId;
  const measureClassSpec = getSpec(measureId).spec;
  const output: InterpolationOption<ParamName>[] = [];
  if (!measureClassSpec) {
    return output
  }

  for (const [paramName, option] of Object.entries(interpolationModel.interpolationOptions)) {
    if (!option.enabled) {
      continue;
    }

    for (const interpolationMeasure of option.interpolationMeasures) {
      output.push({
        param: paramName as ParamName,
        sourceMeasureId: interpolationMeasure.sourceMeasureId,
        targetMeasureId: interpolationModel.measureId,
        measureParamValue: interpolationMeasure.sourceParamValue,
        targetParamValue: interpolationMeasure.targetParamValue
      });
    }
  }

  return output
}

function getPlot({
  xMeasure,
  filterModel,
  model,
  interpolationOptions,
}: {
  xMeasure: MeasureWithUnit;
  filterModel: ReportCardFilter.Model;
  interpolationOptions: InterpolationOption<ParamName>[];
  model: Model;
}): Plot.Model {
  const data: { x: number; y: number }[] = [];
  const { mySnapshot, snapshots, outputMeasure: yMeasure } = model;
  const yFilter = filterModel.filters.find(
    (f) => f.model.model.measureId == yMeasure.id,
  );
  const yUnit = yFilter
    ? yFilter.model.model.unitToggle.selectedUnit
    : yMeasure.unit;

  const myData =
    mySnapshot &&
    extractDataPoint({
      measures: mySnapshot.measures as any,
      interpolations: interpolationOptions,
      xMeasure: xMeasure,
      yMeasure: {
        id: yMeasure.id,
        unit: yUnit,
      },
    });

  for (const snapshot of snapshots) {
    const dataPoint = extractDataPoint({
      measures: snapshot.measures as any,
      interpolations: interpolationOptions,
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
          const [next] = ReportCardFilter.update(msg.msg, plot.filterModel);
          plot.filterModel = immer.castDraft(next);
          plot.model = immer.castDraft(
            getPlot({
              filterModel: next,
              interpolationOptions: plot.interpolate.interpolationOptions,
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
              interpolationOptions: plot.interpolate.interpolationOptions,
              xMeasure: {
                ...plot.inputMeasure,
                unit: next.selectedUnit,
              },
              model,
            }),
          );
        }),
      ];

    case "INTERPOLATE_MSG":
      return [
        produce(model, (draft) => {
          const plot = draft.plots.find(
            (p) => p.inputMeasure.id === msg.measureId,
          );
          if (!plot) {
            throw new Error(`Cannot find plot for measure ${msg.measureId}`);
          }
          const [next] = Interpolate.update(msg.msg, plot.interpolate.model);
          plot.interpolate.model = immer.castDraft(next);
          plot.interpolate.interpolationOptions = getInterpolationOptions(plot.interpolate.model);

          plot.model = immer.castDraft(
            getPlot({
              filterModel: plot.filterModel,
              interpolationOptions: plot.interpolate.interpolationOptions,
              xMeasure: {
                ...plot.inputMeasure,
                unit: plot.toggle.selectedUnit,
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
      <ReportCardFilter.view
        model={plot.filterModel}
        dispatch={(msg) => {
          dispatch({
            type: "FILTER_MSG",
            measureId: plot.inputMeasure.id,
            msg,
          });
        }}
      />

      <Interpolate.view
        model={plot.interpolate.model}
        dispatch={(msg) => {
          dispatch({
            type: "INTERPOLATE_MSG",
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
