import React from "react";
import { HydratedSnapshot } from "../../types";
import * as Plot from "../plot";
import * as ReportCardFilter from "./filter";
import * as Filter from "../filters/filter";
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

type PlotModel = {
  filterModel: ReportCardFilter.Model;
  inputMeasure: MeasureWithUnit;
  toggle: UnitToggle.Model;
  interpolate: {
    model: Interpolate.Model;
    interpolationOptions: InterpolationOption<ParamName>[];
  },
  model: Plot.Model;
};

type MeasureWithUnit = {
  id: MeasureId;
  unit: UnitType;
};

export type Model = {
  measureStats: MeasureStats;
  mySnapshot?: HydratedSnapshot;
  snapshots: HydratedSnapshot[];
  snapshotStats: { [measureId: MeasureId]: number };
  outputMeasure: {
    id: MeasureId;
    unit: UnitType;
  };
  plots: PlotModel[];
};

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

export class PlotList {
  state: Model;

  constructor(
    initialParams: {
      mySnapshot?: HydratedSnapshot;
      measureStats: MeasureStats;
      snapshots: HydratedSnapshot[];
      outputMeasure: Model["outputMeasure"];
    },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    const snapshotStats: {
      [measureId: MeasureId]: number;
    } = {};
    for (const snapshot of initialParams.snapshots) {
      for (const measureIdStr in snapshot.measures) {
        const measureId = measureIdStr as MeasureId;
        snapshotStats[measureId] = (snapshotStats[measureId] || 0) + 1;
      }
    }

    this.state = {
      mySnapshot: initialParams.mySnapshot,
      measureStats: initialParams.measureStats,
      snapshots: initialParams.snapshots,
      snapshotStats,
      outputMeasure: initialParams.outputMeasure,
      plots: [],
    };

    this.state.plots = this.getPlots();
  }

  private getPlots(): PlotModel[] {
    const inputMeasures: MeasureWithUnit[] = [];

    if (this.state.mySnapshot) {
      for (const id in this.state.mySnapshot.measures) {
        const measureId = id as MeasureId;
        const spec = getSpec(measureId);
        if (spec.type == "input") {
          inputMeasures.push({
            id: measureId,
            unit: this.state.mySnapshot.measures[measureId].unit,
          });
        }
      }
    } else {
      const snapshotStats: { [measureId: MeasureId]: number } = {};
      for (const snapshot of this.state.snapshots) {
        for (const measureId in snapshot.measures) {
          snapshotStats[measureId as MeasureId] =
            (snapshotStats[measureId as MeasureId] || 0) + 1;
        }
      }

      for (const { id, units } of MEASURES.filter(
        (s) => s.type == "input" && this.state.snapshotStats[s.id] > 0,
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
    const outputMeasureSpec = getSpec(this.state.outputMeasure.id);
    for (const inputMeasure of inputMeasures) {
      const inputMeasureSpec = getSpec(inputMeasure.id);
      const initialFilters: ReportCardFilter.InitialFilters = {};
      if (
        this.state.mySnapshot &&
        this.state.mySnapshot.measures[this.state.outputMeasure.id] != undefined
      ) {
        const targetUnit = this.state.outputMeasure.unit;

        initialFilters[this.state.outputMeasure.id] = {
          enabled: true,
          type: "minmax",
          minValue: adjustGrade(
            castUnit(
              this.state.mySnapshot.measures[this.state.outputMeasure.id] as UnitValue,
              targetUnit,
            ),
            -1,
          ),
          maxValue: adjustGrade(
            castUnit(
              this.state.mySnapshot.measures[this.state.outputMeasure.id] as UnitValue,
              targetUnit,
            ),
            2,
          ),
        };
      } else {
        initialFilters[this.state.outputMeasure.id] = {
          enabled: true,
          ...castInitialFilter(
            outputMeasureSpec.initialFilter,
            this.state.outputMeasure.unit,
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
        measureStats: this.state.measureStats,
      });

      const includeStrToWtRatio = inputMeasureSpec.units.includes('kg') || inputMeasureSpec.units.includes('lb')
      const selectedUnit = includeStrToWtRatio ? 'strengthtoweightratio' : inputMeasure.unit;

      const interpolationModel = Interpolate.initModel({
        measureId: inputMeasure.id,
        measureStats: this.state.measureStats,
      });
      const interpolationOptions = this.getInterpolationOptions(interpolationModel);

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
        model: this.getPlot({
          xMeasure: {
            ...inputMeasure,
            unit: selectedUnit
          },
          interpolationOptions,
          filterModel,
        }),
      });
    }

    return plots;
  }

  private getInterpolationOptions(interpolationModel: Interpolate.Model): InterpolationOption<ParamName>[] {
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

  private getPlot({
    xMeasure,
    filterModel,
    interpolationOptions,
  }: {
    xMeasure: MeasureWithUnit;
    filterModel: ReportCardFilter.Model;
    interpolationOptions: InterpolationOption<ParamName>[];
  }): Plot.Model {
    const data: { x: number; y: number }[] = [];
    const { mySnapshot, snapshots, outputMeasure: yMeasure } = this.state;
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

  update(msg: Msg) {
    switch (msg.type) {
      case "FILTER_MSG":
        const filterPlot = this.state.plots.find(
          (p) => p.inputMeasure.id === msg.measureId,
        );
        if (!filterPlot) {
          throw new Error(`Cannot find plot for measure ${msg.measureId}`);
        }
        const [nextFilter] = ReportCardFilter.update(msg.msg, filterPlot.filterModel);
        filterPlot.filterModel = nextFilter;
        filterPlot.model = this.getPlot({
          filterModel: nextFilter,
          interpolationOptions: filterPlot.interpolate.interpolationOptions,
          xMeasure: {
            ...filterPlot.inputMeasure,
            unit: filterPlot.toggle.selectedUnit,
          },
        });
        break;

      case "TOGGLE_MSG":
        const togglePlot = this.state.plots.find(
          (p) => p.inputMeasure.id === msg.measureId,
        );
        if (!togglePlot) {
          throw new Error(`Cannot find plot for measure ${msg.measureId}`);
        }
        const [nextToggle] = UnitToggle.update(msg.msg, togglePlot.toggle);
        togglePlot.toggle = nextToggle;
        togglePlot.model = this.getPlot({
          filterModel: togglePlot.filterModel,
          interpolationOptions: togglePlot.interpolate.interpolationOptions,
          xMeasure: {
            ...togglePlot.inputMeasure,
            unit: nextToggle.selectedUnit,
          },
        });
        break;

      case "INTERPOLATE_MSG":
        const interpolatePlot = this.state.plots.find(
          (p) => p.inputMeasure.id === msg.measureId,
        );
        if (!interpolatePlot) {
          throw new Error(`Cannot find plot for measure ${msg.measureId}`);
        }
        const [nextInterpolate] = Interpolate.update(msg.msg, interpolatePlot.interpolate.model);
        interpolatePlot.interpolate.model = nextInterpolate;
        interpolatePlot.interpolate.interpolationOptions = this.getInterpolationOptions(interpolatePlot.interpolate.model);

        interpolatePlot.model = this.getPlot({
          filterModel: interpolatePlot.filterModel,
          interpolationOptions: interpolatePlot.interpolate.interpolationOptions,
          xMeasure: {
            ...interpolatePlot.inputMeasure,
            unit: interpolatePlot.toggle.selectedUnit,
          },
        });
        break;

      default:
        assertUnreachable(msg);
    }
  }

  view() {
    const PlotWithControls = ({ plot }: { plot: PlotModel }) => (
      <div
        style={{ display: "flex", flexDirection: "column", marginTop: "10px" }}
      >
        <h1>{plot.inputMeasure.id}</h1>
        <ReportCardFilter.view
          model={plot.filterModel}
          dispatch={(msg) => {
            this.context.myDispatch({
              type: "FILTER_MSG",
              measureId: plot.inputMeasure.id,
              msg,
            });
          }}
        />

        <Interpolate.view
          model={plot.interpolate.model}
          dispatch={(msg) => {
            this.context.myDispatch({
              type: "INTERPOLATE_MSG",
              measureId: plot.inputMeasure.id,
              msg,
            });
          }}
        />

        <Plot.view model={plot.model} dispatch={this.context.myDispatch} />

        {plot.toggle.possibleUnits.length > 1 && (
          <UnitToggle.view
            model={plot.toggle}
            dispatch={(msg) => {
              this.context.myDispatch({
                type: "TOGGLE_MSG",
                measureId: plot.inputMeasure.id,
                msg,
              });
            }}
          />
        )}
      </div>
    );

    return (
      <div>
        {this.state.plots.map((plot) => (
          <PlotWithControls
            key={plot.inputMeasure.id}
            plot={plot}
          />
        ))}
      </div>
    );
  }
}
