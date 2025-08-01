import * as DCGView from "dcgview";
import {
  MeasureId,
  MEASURES,
  getSpec,
  MeasureSpec,
} from "../../../iso/measures";
import { MeasureClassName } from "../../../iso/protocol";
import { Dispatch } from "../../types";
import { assertUnreachable } from "../../util/utils";
import * as typestyle from "typestyle";
import { AnthroFilterController } from "../anthro/filter";
import {
  InputMeasureFacetsForClassQuery,
  InputMeasureFacetsForClassResult,
} from "../../../iso/protocol";
import { Locale } from "../../../iso/locale";
import { OutputMeasureSelectorController } from "../output/measure-selector";
const { If, For, IfElse } = DCGView.Components;

export type InputMeasureSelectorModel =
  | {
      state: "selected";
      measureId?: MeasureId;
    }
  | {
      state: "fetching";
      previousMeasureId?: MeasureId;
      fetchKey?: string; // Cache key for the current fetch
    }
  | {
      state: "editing";
      distribution: Record<MeasureId, number>;
      previousMeasureId?: MeasureId;
    };

export type InputMeasureSelectorMsg =
  | {
      type: "SET_SELECTED_MEASURE";
      measureId: MeasureId;
    }
  | {
      type: "SET_EDITING";
      isEditing: boolean;
    }
  | {
      type: "UPDATE_MEASURE_DISTRIBUTION";
      distribution: Record<MeasureId, number>;
    }
  | {
      type: "DEPENDENCIES_CHANGED";
    };

export class InputMeasureSelectorController {
  state: InputMeasureSelectorModel;

  constructor(
    public context: {
      myDispatch: Dispatch<InputMeasureSelectorMsg>;
      getAnthroFilter: () => AnthroFilterController;
      getOutputMeasureSelector: () => OutputMeasureSelectorController;
      getSelectedMeasureClassName: () => MeasureClassName | undefined;
      locale: () => Locale;
    },
  ) {
    this.state = {
      state: "selected",
      measureId: undefined,
    };
  }

  getSortedMeasures(): Array<{
    measureId: MeasureId;
    count: number;
    spec: MeasureSpec;
  }> {
    const selectedMeasureClassName = this.context.getSelectedMeasureClassName();
    if (!selectedMeasureClassName) {
      return [];
    }

    // Get all measures that belong to this measure class
    const measuresInClass = MEASURES.filter(
      (measure) => measure.classSpec?.className === selectedMeasureClassName,
    );

    // Get distribution based on current state
    const distribution =
      this.state.state === "editing" ? this.state.distribution : {};

    // Create array with counts and sort by frequency (descending)
    return measuresInClass
      .map((measure) => ({
        measureId: measure.id,
        count: distribution[measure.id] || 0,
        spec: measure,
      }))
      .sort((a, b) => b.count - a.count);
  }

  isSelected(measureId: MeasureId): boolean {
    if (this.state.state === "selected") {
      return this.state.measureId === measureId;
    } else if (this.state.state === "editing") {
      return this.state.previousMeasureId === measureId;
    }
    return false;
  }

  // Generate a cache key based on current dependencies
  private generateFetchKey(): string {
    const anthroFilter = this.context.getAnthroFilter();
    const outputSelector = this.context.getOutputMeasureSelector();
    const measureClassName = this.context.getSelectedMeasureClassName();

    const anthroKey = anthroFilter.generateCacheKey();
    const outputKey = outputSelector.generateCacheKey();
    return `anthro:${anthroKey}|output:${outputKey}|class:${measureClassName || "none"}`;
  }

  async fetchMeasureDistribution() {
    const measureClassName = this.context.getSelectedMeasureClassName();
    if (!measureClassName) {
      // Can't fetch without a measure class selected
      return;
    }

    const fetchKey = this.generateFetchKey();

    // Skip if we already have this data cached
    if (this.state.state === "fetching" && this.state.fetchKey === fetchKey) {
      return;
    }

    // Transition to fetching state if not already there
    if (this.state.state !== "fetching") {
      const currentMeasureId =
        this.state.state === "selected" ? this.state.measureId : undefined;
      this.state = {
        state: "fetching",
        previousMeasureId: currentMeasureId,
        fetchKey: fetchKey,
      };
    }

    try {
      // Get anthro filters in query-compatible format
      const anthroFilter = this.context.getAnthroFilter();
      const anthroFilters = anthroFilter.getQueryFilters(this.context.locale());

      // Get output measure filters
      const outputMeasureSelector = this.context.getOutputMeasureSelector();
      const outputMeasureId = outputMeasureSelector.getMeasureId();

      const query: InputMeasureFacetsForClassQuery = {
        anthro_filters: anthroFilters,
        input_measure_class: measureClassName,
        output_measure_id: outputMeasureId,
      };

      const response = await fetch(
        "/api/snapshots/facets/input_measure_for_class",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch input measure facets: ${response.statusText}`,
        );
      }

      const result: InputMeasureFacetsForClassResult = await response.json();

      // Transition to editing state with the fetched distribution
      if (this.state.state === "fetching") {
        this.state = {
          state: "editing",
          distribution: result.inputMeasureDistribution,
          previousMeasureId: this.state.previousMeasureId,
        };
      }
    } catch (error) {
      console.error("Error fetching measure distribution:", error);
      // On error, go back to selected state
      if (this.state.state === "fetching") {
        this.state = {
          state: "selected",
          measureId: this.state.previousMeasureId,
        };
      }
    }
  }

  // Get query filters for this controller
  getMeasureId(): MeasureId | undefined {
    return this.state.state === "selected"
      ? this.state.measureId
      : this.state.state === "editing"
        ? this.state.previousMeasureId
        : undefined;
  }

  // Generate cache key for this controller's state
  generateCacheKey(): string {
    const measureId =
      this.state.state === "selected"
        ? this.state.measureId
        : this.state.state === "editing"
          ? this.state.previousMeasureId
          : undefined;
    return measureId || "none";
  }

  handleDispatch(msg: InputMeasureSelectorMsg) {
    switch (msg.type) {
      case "SET_SELECTED_MEASURE":
        // Always transition to selected state with the new measure
        this.state = {
          state: "selected",
          measureId: msg.measureId,
        };
        break;

      case "SET_EDITING":
        if (msg.isEditing) {
          // Start fetching distribution when entering editing mode
          this.fetchMeasureDistribution();
        } else {
          // Cancel editing and return to selected state
          const currentMeasureId =
            this.state.state === "editing"
              ? this.state.previousMeasureId
              : this.state.state === "selected"
                ? this.state.measureId
                : undefined;

          this.state = {
            state: "selected",
            measureId: currentMeasureId,
          };
        }
        break;

      case "UPDATE_MEASURE_DISTRIBUTION":
        // Update distribution if we're in editing state
        if (this.state.state === "editing") {
          this.state.distribution = msg.distribution;
        }
        break;

      case "DEPENDENCIES_CHANGED":
        // If we're currently editing, re-fetch immediately
        if (this.state.state === "editing") {
          this.fetchMeasureDistribution();
        }
        // If a dependency changed and we had a selected measure, clear it
        // since it might not be valid anymore
        if (this.state.state === "selected") {
          this.state.measureId = undefined;
        }
        break;

      default:
        assertUnreachable(msg);
    }
  }
}

export class InputMeasureSelectorView extends DCGView.View<{
  controller: () => InputMeasureSelectorController;
}> {
  template() {
    const controller = () => this.props.controller();
    const state = () => controller().state;
    const sortedMeasures = () => controller().getSortedMeasures();
    const selectedMeasureClassName = () =>
      controller().context.getSelectedMeasureClassName();

    return (
      <div class={DCGView.const(styles.container)}>
        <div class={DCGView.const(styles.header)}>
          <h4 class={DCGView.const(styles.sectionHeader)}>Input Measure</h4>

          <If
            predicate={() =>
              !!selectedMeasureClassName() && state().state !== "editing"
            }
          >
            {() => (
              <button
                class={DCGView.const(styles.editButton)}
                onClick={() =>
                  controller().context.myDispatch({
                    type: "SET_EDITING",
                    isEditing: true,
                  })
                }
              >
                {() => {
                  const currState = state();
                  const measureId =
                    currState.state === "selected"
                      ? currState.measureId
                      : undefined;
                  return measureId ? "Change" : "Select";
                }}
              </button>
            )}
          </If>
        </div>

        <If predicate={() => !selectedMeasureClassName()}>
          {() => (
            <div class={DCGView.const(styles.noMeasureClassMessage)}>
              Please select an input measure class first
            </div>
          )}
        </If>

        <If
          predicate={() =>
            !!selectedMeasureClassName() && state().state === "selected"
          }
        >
          {() => (
            <div class={DCGView.const(styles.selectedDisplay)}>
              {IfElse(
                () => {
                  const currState = state();
                  return currState.state == "selected" && !!currState.measureId;
                },
                {
                  true: () => {
                    const currState = state();
                    const measureId = (
                      currState as Extract<
                        typeof currState,
                        { state: "selected" }
                      >
                    ).measureId!;
                    const spec = () => getSpec(measureId);
                    return (
                      <div class={DCGView.const(styles.selectedMeasure)}>
                        <div class={DCGView.const(styles.measureName)}>
                          {() => spec().description}
                        </div>
                        <div class={DCGView.const(styles.measureCount)}>
                          Selected measure
                        </div>
                      </div>
                    );
                  },
                  false: () => (
                    <div class={DCGView.const(styles.noSelection)}>
                      No input measure selected
                    </div>
                  ),
                },
              )}
            </div>
          )}
        </If>

        <If
          predicate={() =>
            !!selectedMeasureClassName() && state().state === "fetching"
          }
        >
          {() => (
            <div class={DCGView.const(styles.loadingContainer)}>
              <div class={DCGView.const(styles.loadingMessage)}>
                Loading measure distribution...
              </div>
            </div>
          )}
        </If>

        <If
          predicate={() =>
            !!selectedMeasureClassName() && state().state === "editing"
          }
        >
          {() => (
            <div class={DCGView.const(styles.editingDisplay)}>
              <div class={DCGView.const(styles.editingHeader)}>
                <span>Select an input measure:</span>
                <button
                  class={DCGView.const(styles.cancelButton)}
                  onClick={() =>
                    controller().context.myDispatch({
                      type: "SET_EDITING",
                      isEditing: false,
                    })
                  }
                >
                  Cancel
                </button>
              </div>

              <div class={DCGView.const(styles.measureList)}>
                <For each={() => sortedMeasures()} key={(m) => m.measureId}>
                  {(item) => (
                    <div
                      class={() => ({
                        [styles.measureItem]: true,
                        [styles.selectedMeasureItem]: controller().isSelected(
                          item().measureId,
                        ),
                      })}
                      onClick={() =>
                        controller().context.myDispatch({
                          type: "SET_SELECTED_MEASURE",
                          measureId: item().measureId,
                        })
                      }
                    >
                      <div class={DCGView.const(styles.measureName)}>
                        {() => item().spec.description}
                      </div>
                      <div class={DCGView.const(styles.measureCount)}>
                        {() => `${item().count} data points`}
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          )}
        </If>
      </div>
    );
  }
}

const styles = typestyle.stylesheet({
  container: {
    marginBottom: "24px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },

  sectionHeader: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "bold",
    color: "#333",
    borderBottom: "2px solid #4CAF50",
    paddingBottom: "4px",
  },

  editButton: {
    background: "#4CAF50",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    $nest: {
      "&:hover": {
        background: "#45a049",
      },
    },
  },

  selectedDisplay: {
    padding: "12px",
    backgroundColor: "#f9f9f9",
    borderRadius: "4px",
    border: "1px solid #e0e0e0",
  },

  selectedMeasure: {
    // No additional styles needed, content is styled by measureName/measureCount
  },

  noSelection: {
    color: "#666",
    fontStyle: "italic",
  },

  noMeasureClassMessage: {
    padding: "12px",
    color: "#666",
    fontStyle: "italic",
    backgroundColor: "#f5f5f5",
    border: "1px dashed #ccc",
    borderRadius: "4px",
  },

  editingDisplay: {
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    backgroundColor: "white",
  },

  editingHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    borderBottom: "1px solid #e0e0e0",
    backgroundColor: "#f5f5f5",
    fontWeight: "500",
  },

  cancelButton: {
    background: "#666",
    color: "white",
    border: "none",
    padding: "4px 8px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    $nest: {
      "&:hover": {
        background: "#555",
      },
    },
  },

  measureList: {
    maxHeight: "300px",
    overflowY: "auto",
  },

  measureItem: {
    padding: "12px",
    borderBottom: "1px solid #f0f0f0",
    cursor: "pointer",
    transition: "background-color 0.2s",
    $nest: {
      "&:hover": {
        backgroundColor: "#f8f8f8",
      },
      "&:last-child": {
        borderBottom: "none",
      },
    },
  },

  selectedMeasureItem: {
    backgroundColor: "#e8f5e8",
    $nest: {
      "&:hover": {
        backgroundColor: "#d4f4d4",
      },
    },
  },

  measureName: {
    fontWeight: "500",
    color: "#333",
    marginBottom: "4px",
  },

  measureCount: {
    fontSize: "12px",
    color: "#666",
  },

  loadingContainer: {
    padding: "20px",
    textAlign: "center",
  },

  loadingMessage: {
    color: "#666",
    fontSize: "14px",
    fontStyle: "italic",
  },
});

