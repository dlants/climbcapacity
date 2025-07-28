import * as DCGView from "dcgview";
import * as d3 from "d3";
import { assertUnreachable } from "../util/utils";
import * as Histogram from "./plots/histogram";
import * as Dotplot from "./plots/dotplot";
import * as Heatmap from "./plots/heatmap";
import {
  generateBinThresholds,
  Bin2D,
  Point,
  tickFormatBins,
} from "./plots/util";

type State =
  | {
      type: "dotplot";
      model: Dotplot.Model;
    }
  | {
      type: "histogram";
      model: Histogram.Model;
    }
  | {
      type: "heatmap";
      model: Heatmap.Model;
      controller: Heatmap.HeatmapController;
    };

export type PlotMsg = { type: "RETURN_TO_HEATMAP" };

export class PlotController {
  private state: State;

  constructor(
    initialModel: Dotplot.Model | Histogram.Model | Heatmap.Model,
    public context: { myDispatch: (msg: PlotMsg) => void },
  ) {
    switch (initialModel.style) {
      case "dotplot":
        this.state = {
          type: "dotplot",
          model: initialModel,
        };
        break;
      case "histogram":
        this.state = {
          type: "histogram",
          model: initialModel,
        };
        break;
      case "heatmap":
        this.state = {
          type: "heatmap",
          model: initialModel,
          controller: new Heatmap.HeatmapController(),
        };
        break;
    }
  }

  getState(): State {
    if (this.state.type == "heatmap") {
      const heatmapState = this.state.controller.state;

      // Check if we should derive a histogram instead of showing heatmap
      if (heatmapState.interaction.type === "second-row-selected") {
        return {
          type: "histogram",
          model: this.deriveHistogramModel(
            this.state.model,
            heatmapState.interaction.startRow,
            heatmapState.interaction.endRow,
          ),
        };
      }
    }
    return this.state;
  }

  private deriveHistogramModel(
    heatmapModel: Heatmap.Model,
    startRow: number,
    endRow: number,
  ): Histogram.Model {
    // Recreate the same binning logic as the heatmap to access 2D bins
    const xThresholds = generateBinThresholds(
      heatmapModel.data.map((p) => p.x),
      heatmapModel.xUnit,
    );

    const yThresholds = generateBinThresholds(
      heatmapModel.data.map((p) => p.y),
      heatmapModel.yUnit,
    );

    const xBinner = d3
      .bin<Point, number>()
      .value((d) => d.x)
      .domain(d3.extent(xThresholds) as [number, number])
      .thresholds(xThresholds);

    const yBinner = d3
      .bin<Point, number>()
      .value((d) => d.y)
      .domain(d3.extent(yThresholds) as [number, number])
      .thresholds(yThresholds);

    const rawBins = yBinner(heatmapModel.data).map((yBin) => xBinner(yBin));
    const bins2D: Bin2D[][] = rawBins.map((row, rowIndex) =>
      row.map(
        (bin, colIndex) =>
          ({
            ...bin,
            frequency: bin.length,
            row: rowIndex,
            col: colIndex,
          }) as Bin2D,
      ),
    );

    // Aggregate data from selected rows
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);

    // Create 1D histogram data by summing frequencies across selected y-bins for each x-bin
    const histogramData: number[] = [];
    const numXBins = bins2D[0]?.length || 0;

    for (let colIndex = 0; colIndex < numXBins; colIndex++) {
      let totalFrequency = 0;

      // Sum frequencies from selected rows for this column
      for (
        let rowIndex = minRow;
        rowIndex <= maxRow && rowIndex < bins2D.length;
        rowIndex++
      ) {
        if (bins2D[rowIndex] && bins2D[rowIndex][colIndex]) {
          totalFrequency += bins2D[rowIndex][colIndex].frequency;
        }
      }

      // Add individual data points to create the histogram data array
      for (let i = 0; i < totalFrequency; i++) {
        // Use the middle of the x-bin as the representative value
        const binCenter =
          (xThresholds[colIndex] + xThresholds[colIndex + 1]) / 2;
        histogramData.push(binCenter);
      }
    }

    // Check if user data falls within selected y-range
    let aggregatedMyData: number | undefined = undefined;
    if (heatmapModel.myData) {
      const myYBinIndex = yBinner([heatmapModel.myData]).findIndex(
        (bin) => bin.length > 0,
      );
      if (myYBinIndex >= minRow && myYBinIndex <= maxRow) {
        aggregatedMyData = heatmapModel.myData.x;
      }
    }

    // Create y-axis label showing the grade range
    const minGrade = tickFormatBins(minRow, heatmapModel.yUnit, yThresholds);
    const maxGrade = tickFormatBins(maxRow, heatmapModel.yUnit, yThresholds);
    const yLabel =
      minRow === maxRow
        ? `Frequency (${minGrade})`
        : `Frequency (${minGrade} - ${maxGrade})`;

    return {
      style: "histogram",
      data: histogramData,
      xLabel: heatmapModel.xLabel,
      xUnit: heatmapModel.xUnit,
      myData: aggregatedMyData,
      yLabel,
    };
  }

  handleDispatch(msg: PlotMsg) {
    switch (msg.type) {
      case "RETURN_TO_HEATMAP":
        if (this.state.type == "heatmap") {
          this.state.controller.state.interaction = {
            type: "no-clicks",
          };
        }
        break;
    }
  }
}

export class Plot extends DCGView.View<{
  controller: PlotController;
}> {
  svgElement: SVGSVGElement | null = null;
  private renderState:
    | {
        type: "histogram";
        view: {
          cleanup: () => void;
        };
      }
    | {
        type: "dotplot";
        view: {
          cleanup: () => void;
        };
      }
    | {
        type: "heatmap";
        view: {
          cleanup: () => void;
          update: () => void;
        };
      }
    | undefined;
  private lastController: PlotController | undefined;

  template() {
    return (
      <div
        class="plot-container"
        didMount={this.divDidMount.bind(this)}
        willUnmount={this.divWillUnmount.bind(this)}
      ></div>
    );
  }

  divDidMount(el: HTMLDivElement) {
    // Create SVG element
    this.svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    this.svgElement.setAttribute("width", "100%");
    this.svgElement.setAttribute("height", "100%");
    this.svgElement.setAttribute("viewBox", "0 0 600 400");
    this.svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");

    el.appendChild(this.svgElement);
    this.updatePlot();
  }

  divWillUnmount() {
    // Call cleanup function if it exists
    if (this.renderState) {
      this.renderState.view.cleanup();
    }
    this.svgElement = null;
    delete this.renderState;
  }

  updatePlot() {
    if (!this.svgElement) return;

    const svg = d3.select(this.svgElement);
    const controller = this.props.controller();
    const state = controller.getState();

    // Check if controller instance changed (happens when filters change)
    const controllerChanged = this.lastController !== controller;
    this.lastController = controller;

    if (state.type == this.renderState?.type && !controllerChanged) {
      if (this.renderState.type == "heatmap") {
        this.renderState.view.update();
      }
      return;
    }

    // Full re-render needed
    if (this.renderState) {
      this.renderState.view.cleanup();
    }

    switch (state.type) {
      case "histogram": {
        const view = Histogram.view({
          model: state.model,
          svg,
          onReturnToHeatmap: () =>
            controller.context.myDispatch({ type: "RETURN_TO_HEATMAP" }),
        });
        this.renderState = {
          type: "histogram",
          view,
        };
        break;
      }

      case "dotplot": {
        const view = Dotplot.view({ model: state.model, svg });
        this.renderState = {
          type: "dotplot",
          view,
        };
        break;
      }

      case "heatmap": {
        const view = state.controller.view(state.model, svg, () =>
          this.updatePlot(),
        );
        this.renderState = {
          type: "heatmap",
          view,
        };
        break;
      }

      default:
        assertUnreachable(state);
    }
  }

  didUpdate() {
    if (this._isMounted) {
      this.updatePlot();
    }
  }
}
