import * as DCGView from "dcgview";
import { HydratedSnapshot } from "../../types";
import * as Plot from "../plot";
import * as Dotplot from "../plots/dotplot";
import * as Heatmap from "../plots/heatmap";
import * as ReportCardFilter from "./filter";
import { Dispatch } from "../../types";

import {
  MeasureId,
  generateTrainingMeasureId,
  getSpec,
  parseId,
} from "../../../iso/measures";
import { selectInitialFilter, UnitType, UnitValue } from "../../../iso/units";
import { assertUnreachable } from "../../util/utils";
import { filterOutliersX } from "../../util/stats";
import { MEASURES } from "../../../iso/measures";
import * as Interpolate from "./interpolate";
import { InterpolationOption } from "../../util/interpolate";
import { ParamName } from "../../../iso/measures/params";
import { extractDataPoint } from "../../util/units";
import { Locale } from "../../../iso/locale";
import { getPreferredUnitForMeasure } from "../../../iso/measures";
import { FacetDistribution } from "../../../iso/protocol";

type PlotModel = {
  filter: ReportCardFilter.ReportCardFilterController;
  baseMeasureId: MeasureId; // The base measure ID without rep max parameter
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
          key={(plot: PlotModel) => plot.baseMeasureId}
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
        <h1>{() => plotProp().interpolate.getCurrentMeasureId()}</h1>
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

export type Model = {
  facetDistribution: FacetDistribution;
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
      facetDistribution: FacetDistribution;
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
      facetDistribution: initialParams.facetDistribution,
      snapshots: initialParams.snapshots,
      snapshotStats,
      plots: [],
    };

    this.state.plots = this.getPlots();
  }

  private getBaseMeasureId(measureId: MeasureId): MeasureId {
    const spec = getSpec(measureId);
    if (spec.type === "input" && spec.classSpec) {
      const params = parseId(measureId, spec.classSpec);
      const hasRepMax = spec.classSpec.params.some((p) => p.name === "repMax");
      const hasEdgeSize = spec.classSpec.params.some(
        (p) => p.name === "edgeSize",
      );

      if (hasRepMax || hasEdgeSize) {
        // For parameterized measures, use a simplified base key instead of generating an invalid measure ID
        const baseParams = { ...params };
        if (hasRepMax) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (baseParams as any).repMax;
        }
        if (hasEdgeSize) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (baseParams as any).edgeSize;
        }

        // Create a simple string key based on the remaining parameters
        const baseKey = Object.entries(baseParams)
          .filter(([_key, value]) => value !== undefined)
          .map(([key, value]) => `${key}:${value}`)
          .join("-");

        return `${spec.classSpec.className}-base-${baseKey}` as MeasureId;
      }
    }
    return measureId;
  }

  private getPlots(): PlotModel[] {
    // Group measures by their base measure ID (without rep max parameter)
    const baseMeasureMap = new Map<
      MeasureId,
      {
        baseMeasureId: MeasureId;
        totalCount: number;
      }
    >();

    if (this.state.mySnapshot) {
      for (const id in this.state.mySnapshot.measures) {
        const measureId = id as MeasureId;
        const spec = getSpec(measureId);
        if (spec.type == "input") {
          const baseMeasureId = this.getBaseMeasureId(measureId);
          const existing = baseMeasureMap.get(baseMeasureId);
          baseMeasureMap.set(baseMeasureId, {
            baseMeasureId,
            totalCount: (existing?.totalCount || 0) + 1,
          });
        }
      }
    } else {
      for (const { id } of MEASURES.filter(
        (s) => s.type == "input" && this.state.snapshotStats[s.id] > 0,
      )) {
        const baseMeasureId = this.getBaseMeasureId(id);
        const existing = baseMeasureMap.get(baseMeasureId);
        const count = this.state.snapshotStats[id] || 0;
        baseMeasureMap.set(baseMeasureId, {
          baseMeasureId,
          totalCount: (existing?.totalCount || 0) + count,
        });
      }
    }

    // Sort by total count
    const sortedBaseMeasures = Array.from(baseMeasureMap.values()).sort(
      (a, b) => b.totalCount - a.totalCount,
    );

    const plots: PlotModel[] = [];
    for (const { baseMeasureId } of sortedBaseMeasures) {
      // Find a representative measure to get the spec (we'll use any measure with this base)
      let representativeMeasureId: MeasureId = baseMeasureId;

      // Try to find an actual measure ID that matches this base
      for (const measure of MEASURES) {
        if (
          measure.type === "input" &&
          this.getBaseMeasureId(measure.id) === baseMeasureId
        ) {
          representativeMeasureId = measure.id;
          break;
        }
      }

      const inputMeasureSpec = getSpec(representativeMeasureId);
      const initialFilters: ReportCardFilter.InitialFilters = {};

      // Note: Output measure filter is now handled at the top-level,
      // so we don't add it to individual plot filters

      if (inputMeasureSpec.type == "input") {
        const trainingMeasureId = generateTrainingMeasureId(
          representativeMeasureId,
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

      const filter = new ReportCardFilter.ReportCardFilterController(
        {
          initialFilters: initialFilters,
          facetDistribution: this.state.facetDistribution,
        },
        {
          locale: this.context.locale,
          myDispatch: (msg: ReportCardFilter.Msg) =>
            this.context.myDispatch({
              type: "FILTER_MSG",
              measureId: baseMeasureId,
              msg,
            }),
        },
      );

      const interpolate = new Interpolate.InterpolateController(
        {
          baseMeasureId: representativeMeasureId,
          facetDistribution: this.state.facetDistribution,
        },
        (msg) =>
          this.context.myDispatch({
            type: "INTERPOLATE_MSG",
            measureId: baseMeasureId,
            msg,
          }),
      );

      const plotModel = this.getPlot({
        interpolate,
        filterModel: filter,
      });

      const plot = new Plot.PlotController(plotModel, {
        myDispatch: (msg: Plot.PlotMsg) =>
          this.context.myDispatch({
            type: "PLOT_MSG",
            measureId: baseMeasureId,
            msg,
          }),
      });

      plots.push({
        baseMeasureId,
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
    const currentMeasureId = interpolate.getCurrentMeasureId();
    const measureClassSpec = getSpec(currentMeasureId).classSpec;
    const output: InterpolationOption<ParamName>[] = [];
    if (!measureClassSpec) {
      return output;
    }

    const option = interpolate.state;
    if (!option.enabled) {
      return output;
    }

    for (const variant of option.availableVariants) {
      if (variant.paramValue !== option.selectedParamValue) {
        output.push({
          param: option.paramName,
          sourceMeasureId: variant.measureId,
          targetMeasureId: currentMeasureId,
          measureParamValue: variant.paramValue,
          targetParamValue: option.selectedParamValue,
        });
      }
    }

    return output;
  }

  private getPlot({
    interpolate,
    filterModel,
  }: {
    interpolate: Interpolate.InterpolateController;
    filterModel: ReportCardFilter.ReportCardFilterController;
  }): Dotplot.Model | Heatmap.Model {
    const data: { x: number; y: number }[] = [];
    const { mySnapshot, snapshots } = this.state;
    const outputMeasure = this.getOutputMeasure();
    const yMeasure = { id: outputMeasure.id, unit: outputMeasure.unit };
    const yUnit = outputMeasure.unit;

    // Get current measure and interpolation options from the interpolate controller
    const currentMeasureId = interpolate.getCurrentMeasureId();
    const currentMeasureSpec = getSpec(currentMeasureId);
    const interpolationOptions = this.getInterpolationOptions(interpolate);

    // Determine the unit to use for the x-axis
    const includeStrToWtRatio =
      currentMeasureSpec.units.includes("kg") ||
      currentMeasureSpec.units.includes("lb");

    const xUnit: UnitType = includeStrToWtRatio
      ? "strengthtoweightratio"
      : getPreferredUnitForMeasure(currentMeasureId, this.context.locale());

    const xMeasure = { id: currentMeasureId, unit: xUnit };

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
        xLabel: currentMeasureId,
        xUnit: xUnit,
        yLabel: yMeasure.id,
        yUnit: yUnit,
      };
    } else {
      return {
        style: "heatmap",
        data: filterOutliersX(data),
        myData,
        xLabel: currentMeasureId,
        xUnit: xUnit,
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
          (p) => p.baseMeasureId === msg.measureId,
        );
        if (!filterPlot) {
          throw new Error(`Cannot find plot for measure ${msg.measureId}`);
        }
        filterPlot.filter.handleDispatch(msg.msg);

        const plotModel = this.getPlot({
          interpolate: filterPlot.interpolate,
          filterModel: filterPlot.filter,
        });

        filterPlot.plot = new Plot.PlotController(plotModel, {
          myDispatch: (msg: Plot.PlotMsg) =>
            this.context.myDispatch({
              type: "PLOT_MSG",
              measureId: filterPlot.baseMeasureId,
              msg,
            }),
        });
        break;
      }

      case "INTERPOLATE_MSG": {
        const interpolatePlot = this.state.plots.find(
          (p) => p.baseMeasureId === msg.measureId,
        );
        if (!interpolatePlot) {
          throw new Error(`Cannot find plot for measure ${msg.measureId}`);
        }
        interpolatePlot.interpolate.handleDispatch(msg.msg);

        const plotModel = this.getPlot({
          interpolate: interpolatePlot.interpolate,
          filterModel: interpolatePlot.filter,
        });

        interpolatePlot.plot = new Plot.PlotController(plotModel, {
          myDispatch: (msg: Plot.PlotMsg) =>
            this.context.myDispatch({
              type: "PLOT_MSG",
              measureId: interpolatePlot.baseMeasureId,
              msg,
            }),
        });
        break;
      }

      case "PLOT_MSG": {
        const plot = this.state.plots.find(
          (p) => p.baseMeasureId === msg.measureId,
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
