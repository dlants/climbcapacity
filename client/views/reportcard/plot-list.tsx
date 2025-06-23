import React from "react";
import { HydratedSnapshot } from "../../types";
import * as Plot from "../plot";
import * as ReportCardFilter from "./filter";
import * as Filter from "../filters/filter";
import { Dispatch } from "../../main";
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
  filter: ReportCardFilter.ReportCardFilter;
  inputMeasure: MeasureWithUnit;
  toggle: UnitToggle.UnitToggle;
  interpolate: Interpolate.Interpolate;
  plot: Plot.Plot;
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
    msg: import("./filter").Msg;
  }
  | {
    type: "TOGGLE_MSG";
    measureId: MeasureId;
    msg: import("../unit-toggle").Msg;
  }
  | {
    type: "INTERPOLATE_MSG";
    measureId: MeasureId;
    msg: import("./interpolate").Msg;
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

      const includeStrToWtRatio = inputMeasureSpec.units.includes('kg') || inputMeasureSpec.units.includes('lb')
      const selectedUnit = includeStrToWtRatio ? 'strengthtoweightratio' : inputMeasure.unit;

      const filter = new ReportCardFilter.ReportCardFilter(
        {
          initialFilters: initialFilters,
          measureStats: this.state.measureStats,
        },
        { myDispatch: (msg) => this.context.myDispatch({ type: "FILTER_MSG", measureId: inputMeasure.id, msg }) }
      );

      const toggle = new UnitToggle.UnitToggle(
        {
          measureId: inputMeasure.id,
          selectedUnit,
          possibleUnits: includeStrToWtRatio ? [...inputMeasureSpec.units, 'strengthtoweightratio'] : inputMeasureSpec.units,
        },
        { myDispatch: (msg) => this.context.myDispatch({ type: "TOGGLE_MSG", measureId: inputMeasure.id, msg }) }
      );

      const interpolate = new Interpolate.Interpolate(
        {
          measureId: inputMeasure.id,
          measureStats: this.state.measureStats,
        },
        { myDispatch: (msg) => this.context.myDispatch({ type: "INTERPOLATE_MSG", measureId: inputMeasure.id, msg }) }
      );

      const plot = new Plot.Plot(
        this.getPlot({
          xMeasure: {
            ...inputMeasure,
            unit: selectedUnit
          },
          interpolationOptions: this.getInterpolationOptions(interpolate),
          filterModel: filter,
        }),
        { myDispatch: () => { } }
      );

      plots.push({
        inputMeasure: inputMeasure,
        filter,
        toggle,
        interpolate,
        plot,
      });
    }

    return plots;
  }

  private getInterpolationOptions(interpolate: Interpolate.Interpolate): InterpolationOption<ParamName>[] {
    const measureId = interpolate.state.measureId;
    const measureClassSpec = getSpec(measureId).spec;
    const output: InterpolationOption<ParamName>[] = [];
    if (!measureClassSpec) {
      return output
    }

    for (const [paramName, option] of Object.entries(interpolate.state.interpolationOptions)) {
      if (!option.enabled) {
        continue;
      }

      for (const interpolationMeasure of option.interpolationMeasures) {
        output.push({
          param: paramName as ParamName,
          sourceMeasureId: interpolationMeasure.sourceMeasureId,
          targetMeasureId: interpolate.state.measureId,
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
    filterModel: ReportCardFilter.ReportCardFilter;
    interpolationOptions: InterpolationOption<ParamName>[];
  }): Plot.Model {
    const data: { x: number; y: number }[] = [];
    const { mySnapshot, snapshots, outputMeasure: yMeasure } = this.state;
    const yFilter = filterModel.state.filters.find(
      (f) => {
        switch (f.filter.state.type) {
          case "minmax":
            return f.filter.state.model.state.measureId == yMeasure.id;
          case "toggle":
            return f.filter.state.model.state.measureId == yMeasure.id;
          default:
            return false;
        }
      }
    );
    const yUnit = yFilter
      ? yFilter.filter.getUnit()
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

      const shouldKeep = filterModel.state.filters.every((filter) => {
        if (!filter.enabled) {
          return true;
        }

        const measureId = (() => {
          switch (filter.filter.state.type) {
            case "minmax":
              return filter.filter.state.model.state.measureId;
            case "toggle":
              return filter.filter.state.model.state.measureId;
            default:
              return null;
          }
        })();

        if (!measureId) {
          return false;
        }

        const snapshotValue = snapshot.measures[measureId];
        if (!snapshotValue) {
          return false;
        }

        return filter.filter.filterApplies(snapshotValue as UnitValue);
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
        filterPlot.filter.update(msg.msg);
        filterPlot.plot.state = this.getPlot({
          filterModel: filterPlot.filter,
          interpolationOptions: this.getInterpolationOptions(filterPlot.interpolate),
          xMeasure: {
            ...filterPlot.inputMeasure,
            unit: filterPlot.toggle.state.selectedUnit,
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
        togglePlot.toggle.update(msg.msg);
        togglePlot.plot.state = this.getPlot({
          filterModel: togglePlot.filter,
          interpolationOptions: this.getInterpolationOptions(togglePlot.interpolate),
          xMeasure: {
            ...togglePlot.inputMeasure,
            unit: togglePlot.toggle.state.selectedUnit,
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
        interpolatePlot.interpolate.update(msg.msg);
        interpolatePlot.plot.state = this.getPlot({
          filterModel: interpolatePlot.filter,
          interpolationOptions: this.getInterpolationOptions(interpolatePlot.interpolate),
          xMeasure: {
            ...interpolatePlot.inputMeasure,
            unit: interpolatePlot.toggle.state.selectedUnit,
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
        {plot.filter.view()}
        {plot.interpolate.view()}
        {plot.plot.view()}
        {plot.toggle.state.possibleUnits.length > 1 && plot.toggle.view()}
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
