import * as DCGView from "dcgview";
import { HydratedSnapshot } from "../../types";
import * as Plot from "../plot";
import * as ReportCardFilter from "./filter";
import { Dispatch } from "../../types";
import { FilterController } from "../filters/filter";

import {
  MeasureId,
  generateTrainingMeasureId,
  getSpec,
} from "../../../iso/measures";
import { selectInitialFilter, UnitType, UnitValue } from "../../../iso/units";
import { assertUnreachable } from "../../util/utils";
import { filterOutliersX } from "../../util/stats";
import { MEASURES } from "../../../iso/measures";
import { MeasureStats } from "../../../iso/protocol";
import * as Interpolate from "./interpolate";
import { InterpolationOption } from "../../util/interpolate";
import { ParamName } from "../../../iso/measures/params";
import { extractDataPoint } from "../../util/units";
import { Locale } from "../../../iso/locale";
import { getPreferredUnitForMeasure } from "../../../iso/measures";

type PlotModel = {
  filter: ReportCardFilter.ReportCardFilterController;
  inputMeasure: MeasureWithUnit;
  interpolate: Interpolate.InterpolateController;
  plot: Plot.PlotController;
};

export class PlotListView extends DCGView.View<{
  controller: () => PlotListController;
}> {
  template() {
    const { For } = DCGView.Components;
    const stateProp = () => this.props.controller().state;

    return (
      <div>
        <For
          each={() => stateProp().plots}
          key={(plot: PlotModel) => plot.inputMeasure.id}
        >
          {(plotProp: () => PlotModel) => this.renderPlotWithControls(plotProp)}
        </For>
      </div>
    );
  }

  private renderPlotWithControls(plotProp: () => PlotModel) {
    return (
      <div
        style={DCGView.const({
          display: "flex",
          "flex-direction": "column",
          "margin-top": "10px",
        })}
      >
        <h1>{() => plotProp().inputMeasure.id}</h1>
        <ReportCardFilter.ReportCardFilterView
          controller={() => plotProp().filter}
        />
        <Interpolate.InterpolateView
          controller={() => plotProp().interpolate}
        />
        <Plot.Plot controller={() => plotProp().plot} />
      </div>
    );
  }
}
type MeasureWithUnit = {
  id: MeasureId;
  unit: UnitType;
};

export type Model = {
  measureStats: MeasureStats;
  mySnapshot?: HydratedSnapshot;
  snapshots: HydratedSnapshot[];
  snapshotStats: { [measureId: MeasureId]: number };
  plots: PlotModel[];
};

export type Msg =
  | {
      type: "FILTER_MSG";
      measureId: MeasureId;
      msg: ReportCardFilter.Msg;
    }
  | {
      type: "INTERPOLATE_MSG";
      measureId: MeasureId;
      msg: Interpolate.Msg;
    }
  | {
      type: "PLOT_MSG";
      measureId: MeasureId;
      msg: Plot.PlotMsg;
    }
  | {
      type: "OUTPUT_MEASURE_CHANGED";
    };

export class PlotListController {
  state: Model;
  private getOutputMeasure: () => {
    id: MeasureId;
    unit: UnitType;
  };

  constructor(
    initialParams: {
      mySnapshot?: HydratedSnapshot;
      measureStats: MeasureStats;
      snapshots: HydratedSnapshot[];
      outputMeasure: () => {
        id: MeasureId;
        unit: UnitType;
      };
    },
    public context: { myDispatch: Dispatch<Msg>; locale: () => Locale },
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

    this.getOutputMeasure = initialParams.outputMeasure;

    this.state = {
      mySnapshot: initialParams.mySnapshot,
      measureStats: initialParams.measureStats,
      snapshots: initialParams.snapshots,
      snapshotStats,
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
    for (const inputMeasure of inputMeasures) {
      const inputMeasureSpec = getSpec(inputMeasure.id);
      const initialFilters: ReportCardFilter.InitialFilters = {};

      // Note: Output measure filter is now handled at the top-level,
      // so we don't add it to individual plot filters

      if (inputMeasureSpec.type == "input") {
        const trainingMeasureId = generateTrainingMeasureId(
          inputMeasureSpec.id,
        );
        const trainingSpec = getSpec(trainingMeasureId);
        initialFilters[trainingMeasureId] = {
          enabled: false,
          ...selectInitialFilter(
            trainingSpec.initialFilter,
            this.context.locale(),
          ),
        };
      }

      const includeStrToWtRatio =
        inputMeasureSpec.units.includes("kg") ||
        inputMeasureSpec.units.includes("lb");

      // Use locale-based unit selection instead of toggle
      const getUnit = (): UnitType => {
        if (includeStrToWtRatio) {
          return "strengthtoweightratio";
        }
        return getPreferredUnitForMeasure(
          inputMeasure.id,
          this.context.locale(),
        );
      };

      const filter = new ReportCardFilter.ReportCardFilterController(
        {
          initialFilters: initialFilters,
          measureStats: this.state.measureStats,
        },
        {
          locale: this.context.locale,
          myDispatch: (msg: ReportCardFilter.Msg) =>
            this.context.myDispatch({
              type: "FILTER_MSG",
              measureId: inputMeasure.id,
              msg,
            }),
        },
      );

      const interpolate = new Interpolate.InterpolateController(
        {
          measureId: inputMeasure.id,
          measureStats: this.state.measureStats,
        },
        (msg) =>
          this.context.myDispatch({
            type: "INTERPOLATE_MSG",
            measureId: inputMeasure.id,
            msg,
          }),
      );

      const plotModel = this.getPlot({
        xMeasure: {
          ...inputMeasure,
          unit: getUnit(),
        },
        interpolationOptions: this.getInterpolationOptions(interpolate),
        filterModel: filter,
      });

      const plot = new Plot.PlotController(plotModel, {
        myDispatch: (msg: Plot.PlotMsg) =>
          this.context.myDispatch({
            type: "PLOT_MSG",
            measureId: inputMeasure.id,
            msg,
          }),
      });

      plots.push({
        inputMeasure: inputMeasure,
        filter,
        interpolate,
        plot,
      });
    }

    return plots;
  }

  private getInterpolationOptions(
    interpolate: Interpolate.InterpolateController,
  ): InterpolationOption<ParamName>[] {
    const measureId = interpolate.state.measureId;
    const measureClassSpec = getSpec(measureId).spec;
    const output: InterpolationOption<ParamName>[] = [];
    if (!measureClassSpec) {
      return output;
    }

    for (const [paramName, option] of Object.entries(
      interpolate.state.interpolationOptions,
    )) {
      if (!option.enabled) {
        continue;
      }

      for (const interpolationMeasure of option.interpolationMeasures) {
        output.push({
          param: paramName as ParamName,
          sourceMeasureId: interpolationMeasure.sourceMeasureId,
          targetMeasureId: interpolate.state.measureId,
          measureParamValue: interpolationMeasure.sourceParamValue,
          targetParamValue: interpolationMeasure.targetParamValue,
        });
      }
    }

    return output;
  }

  private getPlot({
    xMeasure,
    filterModel,
    interpolationOptions,
  }: {
    xMeasure: MeasureWithUnit;
    filterModel: ReportCardFilter.ReportCardFilterController;
    interpolationOptions: InterpolationOption<ParamName>[];
  }): Plot.Model {
    const data: { x: number; y: number }[] = [];
    const { mySnapshot, snapshots } = this.state;
    const outputMeasure = this.getOutputMeasure();
    const yMeasure = { id: outputMeasure.id, unit: outputMeasure.unit };
    const yUnit = outputMeasure.unit;

    const myData =
      mySnapshot &&
      extractDataPoint({
        measures: mySnapshot.measures,
        interpolations: interpolationOptions,
        xMeasure: xMeasure,
        yMeasure: {
          id: yMeasure.id,
          unit: yUnit,
        },
      });

    for (const snapshot of snapshots) {
      const dataPoint = extractDataPoint({
        measures: snapshot.measures,
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

      // Check input measure filters from the individual plot
      const inputFiltersPass = filterModel.state.filters.every((filter) => {
        if (!filter.enabled) {
          return true;
        }

        const measureId = (() => {
          switch (filter.filter.state.type) {
            case "minmax":
              return filter.filter.state.controller.state.measureId;
            case "toggle":
              return filter.filter.state.controller.state.measureId;
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

      const shouldKeep = inputFiltersPass;

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

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "OUTPUT_MEASURE_CHANGED": {
        // Regenerate all plots when output measure changes
        this.state.plots = this.getPlots();
        break;
      }

      case "FILTER_MSG": {
        const filterPlot = this.state.plots.find(
          (p) => p.inputMeasure.id === msg.measureId,
        );
        if (!filterPlot) {
          throw new Error(`Cannot find plot for measure ${msg.measureId}`);
        }
        filterPlot.filter.handleDispatch(msg.msg);

        // Get the unit using locale-based selection
        const inputMeasureSpec = getSpec(filterPlot.inputMeasure.id);
        const includeStrToWtRatio =
          inputMeasureSpec.units.includes("kg") ||
          inputMeasureSpec.units.includes("lb");
        const unit = includeStrToWtRatio
          ? "strengthtoweightratio"
          : getPreferredUnitForMeasure(
              filterPlot.inputMeasure.id,
              this.context.locale(),
            );

        const plotModel = this.getPlot({
          filterModel: filterPlot.filter,
          interpolationOptions: this.getInterpolationOptions(
            filterPlot.interpolate,
          ),
          xMeasure: {
            ...filterPlot.inputMeasure,
            unit,
          },
        });

        filterPlot.plot = new Plot.PlotController(plotModel, {
          myDispatch: (msg: Plot.PlotMsg) =>
            this.context.myDispatch({
              type: "PLOT_MSG",
              measureId: filterPlot.inputMeasure.id,
              msg,
            }),
        });
        break;
      }

      case "INTERPOLATE_MSG": {
        const interpolatePlot = this.state.plots.find(
          (p) => p.inputMeasure.id === msg.measureId,
        );
        if (!interpolatePlot) {
          throw new Error(`Cannot find plot for measure ${msg.measureId}`);
        }
        interpolatePlot.interpolate.handleDispatch(msg.msg);

        // Get the unit using locale-based selection
        const inputMeasureSpec = getSpec(interpolatePlot.inputMeasure.id);
        const includeStrToWtRatio =
          inputMeasureSpec.units.includes("kg") ||
          inputMeasureSpec.units.includes("lb");
        const unit = includeStrToWtRatio
          ? "strengthtoweightratio"
          : getPreferredUnitForMeasure(
              interpolatePlot.inputMeasure.id,
              this.context.locale(),
            );

        const plotModel = this.getPlot({
          filterModel: interpolatePlot.filter,
          interpolationOptions: this.getInterpolationOptions(
            interpolatePlot.interpolate,
          ),
          xMeasure: {
            ...interpolatePlot.inputMeasure,
            unit,
          },
        });

        interpolatePlot.plot = new Plot.PlotController(plotModel, {
          myDispatch: (msg: Plot.PlotMsg) =>
            this.context.myDispatch({
              type: "PLOT_MSG",
              measureId: interpolatePlot.inputMeasure.id,
              msg,
            }),
        });
        break;
      }

      case "PLOT_MSG": {
        const plot = this.state.plots.find(
          (p) => p.inputMeasure.id === msg.measureId,
        );
        if (!plot) {
          throw new Error(`Cannot find plot for measure ${msg.measureId}`);
        }
        plot.plot.handleDispatch(msg.msg);
        break;
      }

      default:
        assertUnreachable(msg);
    }
  }
}
