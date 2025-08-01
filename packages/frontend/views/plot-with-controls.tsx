import DCGView from "dcgview";
import { Dispatch } from "../types";
import { Locale } from "../../iso/locale";
import { assertUnreachable } from "../util/utils";
import * as typestyle from "typestyle";
import {
  AnthroFilterController,
  AnthroFilterMsg,
  AnthroFilterView,
} from "./anthro/filter";
import {
  OutputMeasureSelectorController,
  OutputMeasureSelectorMsg,
  OutputMeasureSelectorView,
} from "./output/measure-selector";
import {
  InputMeasureClassSelectorController,
  InputMeasureClassSelectorMsg,
  InputMeasureClassSelectorView,
} from "./input/measure-class-selector";
import {
  InputMeasureSelectorController,
  InputMeasureSelectorMsg,
  InputMeasureSelectorView,
} from "./input/measure-selector";
import {
  AnthroFacetsQuery,
  AnthroFacetsResult,
  SnapshotQuery,
  SnapshotQueryResult,
} from "../../iso/protocol";
import {
  MeasureId,
  getSpec,
  getPreferredUnitForMeasure,
} from "../../iso/measures";
import { MeasureClassName } from "../../iso/protocol";
import { PlotController, PlotMsg, Plot } from "./plot";
import * as Dotplot from "./plots/dotplot";
import * as Heatmap from "./plots/heatmap";
import { extractDataPoint } from "../util/units";
import { filterOutliersX } from "../util/stats";
import { UnitType } from "../../iso/units";

// Main PlotWithControls component
export type PlotWithControlsModel = {
  anthroFilter: AnthroFilterController;
  outputMeasureSelector: OutputMeasureSelectorController;
  inputMeasureClassSelector: InputMeasureClassSelectorController;
  inputMeasureSelector?: InputMeasureSelectorController;
  outputMeasureId?: MeasureId;
  inputMeasureClassName?: MeasureClassName;
  inputMeasureId?: MeasureId;
  isLoadingAnthroFacets: boolean;
  plot?: PlotController;
  isLoadingPlot: boolean;
};

export type PlotWithControlsMsg =
  | {
      type: "ANTHRO_FILTER_MSG";
      msg: AnthroFilterMsg;
    }
  | {
      type: "OUTPUT_MEASURE_MSG";
      msg: OutputMeasureSelectorMsg;
    }
  | {
      type: "INPUT_MEASURE_CLASS_MSG";
      msg: InputMeasureClassSelectorMsg;
    }
  | {
      type: "INPUT_MEASURE_MSG";
      msg: InputMeasureSelectorMsg;
    }
  | {
      type: "PLOT_MSG";
      msg: PlotMsg;
    }
  | {
      type: "RELOAD_PLOT";
    };

export class PlotWithControlsController {
  state: PlotWithControlsModel;

  constructor(
    public context: {
      myDispatch: Dispatch<PlotWithControlsMsg>;
      locale: () => Locale;
    },
  ) {
    this.state = {
      anthroFilter: new AnthroFilterController(
        {
          locale: this.context.locale,
          myDispatch: (msg: AnthroFilterMsg) =>
            this.context.myDispatch({ type: "ANTHRO_FILTER_MSG", msg }),
        },
        {},
      ), // Start with empty facets, will be updated after initial fetch
      outputMeasureSelector: new OutputMeasureSelectorController({
        myDispatch: (msg: OutputMeasureSelectorMsg) =>
          this.context.myDispatch({ type: "OUTPUT_MEASURE_MSG", msg }),
        getAnthroFilter: () => this.state.anthroFilter,
        getInputMeasureId: () => this.state.inputMeasureId,
        locale: this.context.locale,
      }),
      inputMeasureClassSelector: new InputMeasureClassSelectorController({
        myDispatch: (msg: InputMeasureClassSelectorMsg) =>
          this.context.myDispatch({ type: "INPUT_MEASURE_CLASS_MSG", msg }),
        getAnthroFilter: () => this.state.anthroFilter,
        getOutputMeasureSelector: () => this.state.outputMeasureSelector,
        locale: this.context.locale,
      }),
      inputMeasureSelector: undefined, // Will be created when measure class is selected
      outputMeasureId: undefined,
      inputMeasureClassName: undefined,
      inputMeasureId: undefined,
      isLoadingAnthroFacets: false,
      plot: undefined,
      isLoadingPlot: false,
    };

    // Fetch initial anthro facets
    this.fetchAnthroFacets();
  }

  // Create input measure selector when measure class is selected
  private createInputMeasureSelector() {
    this.state.inputMeasureSelector = new InputMeasureSelectorController({
      myDispatch: (msg: InputMeasureSelectorMsg) =>
        this.context.myDispatch({ type: "INPUT_MEASURE_MSG", msg }),
      getAnthroFilter: () => this.state.anthroFilter,
      getOutputMeasureSelector: () => this.state.outputMeasureSelector,
      getSelectedMeasureClassName: () => this.state.inputMeasureClassName,
      locale: this.context.locale,
    });
  }

  // Clear input measure selector when measure class is cleared
  private clearInputMeasureSelector() {
    this.state.inputMeasureSelector = undefined;
    this.state.inputMeasureId = undefined;
  }

  async fetchAnthroFacets() {
    try {
      this.state.isLoadingAnthroFacets = true;

      const query: AnthroFacetsQuery = {
        output_measure_id: this.state.outputMeasureId,
        input_measure_id: this.state.inputMeasureId,
        // Note: AnthroFacetsQuery doesn't include input_measure_class yet,
        // but we may need to extend it later if needed
      };

      const response = await fetch("/api/snapshots/facets/anthro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch anthro facets: ${response.statusText}`,
        );
      }

      const result: AnthroFacetsResult = await response.json();

      // Update the anthro filter with the new facets
      this.state.anthroFilter.handleDispatch({
        type: "UPDATE_ANTHRO_FACETS",
        anthroFacets: result.anthroDistribution,
      });
    } catch (error) {
      console.error("Error fetching anthro facets:", error);
    } finally {
      this.state.isLoadingAnthroFacets = false;
    }
  }

  async reloadPlot() {
    // Don't reload if we don't have both input and output measures
    if (!this.state.outputMeasureId || !this.state.inputMeasureId) {
      return;
    }

    try {
      this.state.isLoadingPlot = true;

      const query: SnapshotQuery = {
        anthro_filters: this.state.anthroFilter.getQueryFilters(
          this.context.locale(),
        ),
        output_measure_id: this.state.outputMeasureId,
        input_measure_id: this.state.inputMeasureId,
      };

      const response = await fetch("/api/snapshots/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch plot data: ${response.statusText}`);
      }

      const result: SnapshotQueryResult = await response.json();

      // Create plot model from the data
      const plotModel = this.createPlotModel(result);

      // Create new plot controller
      this.state.plot = new PlotController(plotModel, {
        myDispatch: (msg: PlotMsg) =>
          this.context.myDispatch({ type: "PLOT_MSG", msg }),
      });
    } catch (error) {
      console.error("Error reloading plot:", error);
    } finally {
      this.state.isLoadingPlot = false;
    }
  }

  private createPlotModel(
    result: SnapshotQueryResult,
  ): Dotplot.Model | Heatmap.Model {
    const data: { x: number; y: number }[] = [];
    const { outputMeasureId, inputMeasureId } = this.state;

    if (!outputMeasureId || !inputMeasureId) {
      throw new Error("Missing measure IDs for plot creation");
    }

    // Determine units for x and y axes
    const inputMeasureSpec = getSpec(inputMeasureId);
    const outputMeasureSpec = getSpec(outputMeasureId);

    const includeStrToWtRatio =
      inputMeasureSpec.units.includes("kg") ||
      inputMeasureSpec.units.includes("lb");

    const xUnit: UnitType = includeStrToWtRatio
      ? "strengthtoweightratio"
      : getPreferredUnitForMeasure(inputMeasureId, this.context.locale());

    const yUnit: UnitType = getPreferredUnitForMeasure(
      outputMeasureId,
      this.context.locale(),
    );

    const xMeasure = { id: inputMeasureId, unit: xUnit };
    const yMeasure = { id: outputMeasureId, unit: yUnit };

    // Extract data points from snapshots
    for (const snapshot of result.snapshots) {
      const dataPoint = extractDataPoint({
        measures: snapshot.measures,
        interpolations: [], // No interpolations for now
        xMeasure,
        yMeasure,
      });

      if (dataPoint) {
        data.push(dataPoint);
      }
    }

    // Extract user's data point if present
    let myData: { x: number; y: number } | undefined;
    if (result.mySnapshot) {
      myData = extractDataPoint({
        measures: result.mySnapshot.measures,
        interpolations: [], // No interpolations for now
        xMeasure,
        yMeasure,
      });
    }

    // Choose plot type based on data size
    if (data.length < 20) {
      return {
        style: "dotplot",
        data,
        myData,
        xLabel: inputMeasureId,
        xUnit: xUnit,
        yLabel: outputMeasureId,
        yUnit: yUnit,
      };
    } else {
      return {
        style: "heatmap",
        data: filterOutliersX(data),
        myData,
        xLabel: inputMeasureId,
        xUnit: xUnit,
        yLabel: outputMeasureId,
        yUnit: yUnit,
      };
    }
  }

  handleDispatch(msg: PlotWithControlsMsg) {
    switch (msg.type) {
      case "ANTHRO_FILTER_MSG":
        this.state.anthroFilter.handleDispatch(msg.msg);

        // Notify dependent selectors that dependencies changed
        if (msg.msg.type !== "UPDATE_ANTHRO_FACETS") {
          this.state.outputMeasureSelector.handleDispatch({
            type: "DEPENDENCIES_CHANGED",
          });
          this.state.inputMeasureClassSelector.handleDispatch({
            type: "DEPENDENCIES_CHANGED",
          });
          this.state.inputMeasureSelector?.handleDispatch({
            type: "DEPENDENCIES_CHANGED",
          });
          this.fetchAnthroFacets();
        }
        break;

      case "OUTPUT_MEASURE_MSG":
        this.state.outputMeasureSelector.handleDispatch(msg.msg);

        // Update the main outputMeasureId when a measure is selected
        if (msg.msg.type === "SET_SELECTED_MEASURE") {
          this.state.outputMeasureId = msg.msg.measureId;

          // Notify input measure class selector that dependencies changed
          this.state.inputMeasureClassSelector.handleDispatch({
            type: "DEPENDENCIES_CHANGED",
          });
          this.state.inputMeasureSelector?.handleDispatch({
            type: "DEPENDENCIES_CHANGED",
          });

          // Re-fetch anthro facets with the new output measure
          this.fetchAnthroFacets();
        }
        break;

      case "INPUT_MEASURE_CLASS_MSG":
        this.state.inputMeasureClassSelector.handleDispatch(msg.msg);

        // Update the main inputMeasureClassName when a measure class is selected
        if (msg.msg.type === "SET_SELECTED_MEASURE_CLASS") {
          this.state.inputMeasureClassName = msg.msg.measureClassName;

          // Create input measure selector now that we have a measure class
          if (msg.msg.measureClassName) {
            this.createInputMeasureSelector();
          } else {
            this.clearInputMeasureSelector();
          }

          // Re-fetch anthro facets with the new input measure class
          this.fetchAnthroFacets();
        }
        break;

      case "INPUT_MEASURE_MSG":
        // Only handle if input measure selector exists
        if (this.state.inputMeasureSelector) {
          this.state.inputMeasureSelector.handleDispatch(msg.msg);

          // Update the main inputMeasureId when a measure is selected
          if (msg.msg.type === "SET_SELECTED_MEASURE") {
            this.state.inputMeasureId = msg.msg.measureId;

            // Re-fetch anthro facets with the new input measure
            this.fetchAnthroFacets();
          }
        }
        break;

      case "PLOT_MSG":
        if (this.state.plot) {
          this.state.plot.handleDispatch(msg.msg);
        }
        break;

      case "RELOAD_PLOT":
        this.reloadPlot();
        break;

      default:
        assertUnreachable(msg);
    }
  }
}

export class PlotWithControlsView extends DCGView.View<{
  controller: () => PlotWithControlsController;
}> {
  template() {
    const { If } = DCGView.Components;
    const controller = () => this.props.controller();
    const state = () => controller().state;

    return (
      <div class={DCGView.const(styles.plotWithControlsContainer)}>
        <div class={DCGView.const(styles.controlsPanel)}>
          <If predicate={() => state().isLoadingAnthroFacets}>
            {() => (
              <div class={DCGView.const(styles.loadingMessage)}>
                Loading facets...
              </div>
            )}
          </If>

          <AnthroFilterView controller={() => state().anthroFilter} />

          <OutputMeasureSelectorView
            controller={() => state().outputMeasureSelector}
          />

          <InputMeasureClassSelectorView
            controller={() => state().inputMeasureClassSelector}
          />

          <If predicate={() => !!state().inputMeasureSelector}>
            {() => (
              <InputMeasureSelectorView
                controller={() => state().inputMeasureSelector!}
              />
            )}
          </If>
        </div>

        <div class={DCGView.const(styles.plotArea)}>
          <div class={DCGView.const(styles.plotHeader)}>
            <button
              class={DCGView.const(styles.reloadButton)}
              onClick={() =>
                controller().context.myDispatch({ type: "RELOAD_PLOT" })
              }
              disabled={() =>
                !state().outputMeasureId ||
                !state().inputMeasureId ||
                state().isLoadingPlot
              }
            >
              {() => (state().isLoadingPlot ? "Loading..." : "Reload Plot")}
            </button>
          </div>

          <If predicate={() => state().isLoadingPlot}>
            {() => (
              <div class={DCGView.const(styles.loadingMessage)}>
                Loading plot data...
              </div>
            )}
          </If>

          <If predicate={() => !!state().plot && !state().isLoadingPlot}>
            {() => <Plot controller={() => state().plot!} />}
          </If>

          <If predicate={() => !state().plot && !state().isLoadingPlot}>
            {() => (
              <div class={DCGView.const(styles.placeholder)}>
                <h4>No Plot Data</h4>
                <div>
                  Select both an input and output measure, then click "Reload
                  Plot" to generate a visualization.
                </div>
              </div>
            )}
          </If>
        </div>
      </div>
    );
  }
}

const styles = typestyle.stylesheet({
  plotWithControlsContainer: {
    display: "flex",
    height: "100vh",
    backgroundColor: "#f9f9f9",
  },

  controlsPanel: {
    width: "350px",
    borderRight: "1px solid #e0e0e0",
    backgroundColor: "white",
    overflowY: "auto",
    padding: "16px",
    $nest: {
      "@media (max-width: 1200px)": {
        width: "300px",
      },
      "@media (max-width: 800px)": {
        width: "100%",
        height: "50vh",
        borderRight: "none",
        borderBottom: "1px solid #e0e0e0",
      },
    },
  },

  plotArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "white",
    margin: "16px",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },

  plotHeader: {
    padding: "16px",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
  },

  reloadButton: {
    padding: "8px 16px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    $nest: {
      "&:hover:not(:disabled)": {
        backgroundColor: "#45a049",
      },
      "&:disabled": {
        backgroundColor: "#cccccc",
        cursor: "not-allowed",
      },
    },
  },

  sectionHeader: {
    margin: "0 0 12px 0",
    fontSize: "16px",
    fontWeight: "bold",
    color: "#333",
    borderBottom: "2px solid #4CAF50",
    paddingBottom: "4px",
  },

  placeholder: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px",
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    backgroundColor: "#f5f5f5",
    border: "1px dashed #ccc",
    borderRadius: "4px",
    margin: "16px",
  },

  loadingMessage: {
    padding: "12px",
    textAlign: "center",
    color: "#666",
    backgroundColor: "#f0f8ff",
    border: "1px solid #b0d4f1",
    borderRadius: "4px",
    margin: "0 0 16px 0",
    fontSize: "14px",
  },
});
