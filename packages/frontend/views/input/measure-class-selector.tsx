import * as DCGView from "dcgview";
import { MeasureClassName } from "../../../iso/protocol";
import { MEASURES, MeasureId, INPUT_CLASSES } from "../../../iso/measures";
import { Dispatch } from "../../types";
import { assertUnreachable } from "../../util/utils";
import * as typestyle from "typestyle";
import { AnthroFilterController } from "../anthro/filter";
import {
  InputMeasureClassFacetsQuery,
  InputMeasureClassFacetsResult,
  MeasureClassDistribution,
} from "../../../iso/protocol";
import { Locale } from "../../../iso/locale";
import { OutputMeasureSelectorController } from "../output/measure-selector";
const { If, For, IfElse } = DCGView.Components;

export type InputMeasureClassSelectorModel =
  | {
      state: "selected";
      measureClassName?: MeasureClassName;
    }
  | {
      state: "fetching";
      previousMeasureClassName?: MeasureClassName;
      fetchKey?: string; // Cache key for the current fetch
    }
  | {
      state: "editing";
      distribution: MeasureClassDistribution;
      previousMeasureClassName?: MeasureClassName;
    };

export type InputMeasureClassSelectorMsg =
  | {
      type: "SET_SELECTED_MEASURE_CLASS";
      measureClassName: MeasureClassName | undefined;
    }
  | {
      type: "SET_EDITING";
      isEditing: boolean;
    }
  | {
      type: "UPDATE_MEASURE_CLASS_DISTRIBUTION";
      distribution: MeasureClassDistribution;
    }
  | {
      type: "DEPENDENCIES_CHANGED";
    }
  | {
      type: "MEASURE_CLASS_DISTRIBUTION_FETCHED";
      distribution: MeasureClassDistribution;
    };

export class InputMeasureClassSelectorController {
  state: InputMeasureClassSelectorModel;

  constructor(
    public context: {
      myDispatch: Dispatch<InputMeasureClassSelectorMsg>;
      getAnthroFilter: () => AnthroFilterController;
      getOutputMeasureSelector: () => OutputMeasureSelectorController;
      locale: () => Locale;
    },
  ) {
    this.state = {
      state: "selected",
      measureClassName: undefined,
    };
  }

  // Get unique measure classes for input measures, with counts and sorted by frequency
  getSortedMeasureClasses(): Array<{
    measureClassName: MeasureClassName;
    count: number;
    description: string;
  }> {
    const distribution =
      this.state.state === "editing" ? this.state.distribution : {};

    return Array.from(INPUT_CLASSES)
      .map((className) => {
        const representativeSpec = MEASURES.find(
          (m) => m.classSpec?.className === className,
        );

        return {
          measureClassName: className,
          count: distribution[className] || 0,
          description: representativeSpec?.description || "",
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  isSelected(measureClassName: MeasureClassName): boolean {
    if (this.state.state === "selected") {
      return this.state.measureClassName === measureClassName;
    } else if (this.state.state === "editing") {
      return this.state.previousMeasureClassName === measureClassName;
    }
    return false;
  }

  getQueryFilters(): MeasureId | undefined {
    const outputSelector = this.context.getOutputMeasureSelector();
    return outputSelector.getMeasureId();
  }

  // Generate a cache key based on current dependencies
  private generateFetchKey(): string {
    const anthroFilter = this.context.getAnthroFilter();
    const outputSelector = this.context.getOutputMeasureSelector();

    const anthroKey = anthroFilter.generateCacheKey();
    const outputKey = outputSelector.generateCacheKey();
    return `anthro:${anthroKey}|output:${outputKey}`;
  }

  async fetchMeasureClassDistribution() {
    const fetchKey = this.generateFetchKey();

    // Skip if we already have this data cached
    if (this.state.state === "fetching" && this.state.fetchKey === fetchKey) {
      return;
    }

    // Transition to fetching state if not already there
    if (this.state.state !== "fetching") {
      const currentMeasureClassName =
        this.state.state === "selected"
          ? this.state.measureClassName
          : undefined;
      this.state = {
        state: "fetching",
        previousMeasureClassName: currentMeasureClassName,
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

      const query: InputMeasureClassFacetsQuery = {
        anthro_filters: anthroFilters,
        output_measure_id: outputMeasureId,
      };

      const response = await fetch(
        "/api/snapshots/facets/input_measure_classes",
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
          `Failed to fetch input measure class facets: ${response.statusText}`,
        );
      }

      const result: InputMeasureClassFacetsResult = await response.json();

      // Dispatch the result instead of directly updating state
      this.context.myDispatch({
        type: "MEASURE_CLASS_DISTRIBUTION_FETCHED",
        distribution: result.measureClassDistribution,
      });
    } catch (error) {
      console.error("Error fetching measure class distribution:", error);
      // On error, go back to selected state
      if (this.state.state === "fetching") {
        this.state = {
          state: "selected",
          measureClassName: this.state.previousMeasureClassName,
        };
      }
    }
  }

  // Generate cache key for this controller's state
  generateCacheKey(): string {
    const measureClassName =
      this.state.state === "selected"
        ? this.state.measureClassName
        : this.state.state === "editing"
          ? this.state.previousMeasureClassName
          : undefined;
    return measureClassName || "none";
  }

  handleDispatch(msg: InputMeasureClassSelectorMsg) {
    switch (msg.type) {
      case "SET_SELECTED_MEASURE_CLASS":
        // Always transition to selected state with the new measure class
        this.state = {
          state: "selected",
          measureClassName: msg.measureClassName,
        };
        break;

      case "SET_EDITING":
        if (msg.isEditing) {
          // Start fetching distribution when entering editing mode
          this.fetchMeasureClassDistribution();
        } else {
          // Cancel editing and return to selected state
          const currentMeasureClassName =
            this.state.state === "editing"
              ? this.state.previousMeasureClassName
              : this.state.state === "selected"
                ? this.state.measureClassName
                : undefined;

          this.state = {
            state: "selected",
            measureClassName: currentMeasureClassName,
          };
        }
        break;

      case "UPDATE_MEASURE_CLASS_DISTRIBUTION":
        // Update distribution if we're in editing state
        if (this.state.state === "editing") {
          this.state.distribution = msg.distribution;
        }
        break;

      case "DEPENDENCIES_CHANGED":
        // If we're currently editing, re-fetch immediately
        if (this.state.state === "editing") {
          this.fetchMeasureClassDistribution();
        }
        break;

      case "MEASURE_CLASS_DISTRIBUTION_FETCHED":
        // Transition to editing state with the fetched distribution
        if (this.state.state === "fetching") {
          this.state = {
            state: "editing",
            distribution: msg.distribution,
            previousMeasureClassName: this.state.previousMeasureClassName,
          };
        }
        break;

      default:
        assertUnreachable(msg);
    }
  }
}

export class InputMeasureClassSelectorView extends DCGView.View<{
  controller: () => InputMeasureClassSelectorController;
}> {
  private editingElement: HTMLElement | undefined;

  private documentClickHandler = (e: MouseEvent) => {
    const controller = this.props.controller();
    if (controller.state.state === "editing") {
      // Check if click is outside the editing display
      if (
        this.editingElement &&
        !this.editingElement.contains(e.target as Node)
      ) {
        controller.context.myDispatch({
          type: "SET_EDITING",
          isEditing: false,
        });
      }
    }
  };

  editingViewDidMount(el: HTMLElement) {
    this.editingElement = el;
    document.addEventListener("click", this.documentClickHandler);
  }

  editingViewWillUnmount() {
    this.editingElement = undefined;
    document.removeEventListener("click", this.documentClickHandler);
  }

  template() {
    const controller = () => this.props.controller();
    const state = () => controller().state;
    const sortedMeasureClasses = () => controller().getSortedMeasureClasses();

    return (
      <div class={DCGView.const(styles.container)}>
        <If predicate={() => state().state === "selected"}>
          {() => (
            <div
              class={DCGView.const(styles.selectedDisplay)}
              onClick={() =>
                controller().context.myDispatch({
                  type: "SET_EDITING",
                  isEditing: true,
                })
              }
            >
              {IfElse(
                () => {
                  const currState = state();
                  return (
                    currState.state == "selected" &&
                    !!currState.measureClassName
                  );
                },
                {
                  true: () => {
                    const currState = state();
                    const measureClassName = (
                      currState as Extract<
                        typeof currState,
                        { state: "selected" }
                      >
                    ).measureClassName!;

                    // Find a representative measure for this class to get description
                    const measuresWithClass = MEASURES.filter(
                      (m) => m.classSpec?.className === measureClassName,
                    );

                    if (measuresWithClass.length === 0) {
                      throw new Error(
                        `No measures found for class: ${measureClassName}`,
                      );
                    }

                    const representativeMeasure = measuresWithClass[0];
                    const description =
                      representativeMeasure.classSpec!.generateDescription({});

                    return (
                      <div class={DCGView.const(styles.selectedMeasureClass)}>
                        <div class={DCGView.const(styles.measureClassName)}>
                          {() => description}
                        </div>
                        <div class={DCGView.const(styles.measureCount)}>
                          Selected measure class
                        </div>
                      </div>
                    );
                  },
                  false: () => (
                    <div class={DCGView.const(styles.noSelection)}>
                      No input measure class selected
                    </div>
                  ),
                },
              )}
            </div>
          )}
        </If>

        <If predicate={() => state().state === "fetching"}>
          {() => (
            <div class={DCGView.const(styles.loadingContainer)}>
              <div class={DCGView.const(styles.loadingMessage)}>
                Loading measure class distribution...
              </div>
            </div>
          )}
        </If>

        <If predicate={() => state().state === "editing"}>
          {() => (
            <div
              didMount={this.bindFn(this.editingViewDidMount)}
              willUnmount={this.bindFn(this.editingViewWillUnmount)}
              class={DCGView.const(styles.editingDisplay)}
            >
              <div class={DCGView.const(styles.measureList)}>
                <div
                  class={() => ({
                    [styles.measureItem]: true,
                    [styles.selectedMeasureItem]:
                      !controller().state.measureClassName,
                  })}
                  onClick={() =>
                    controller().context.myDispatch({
                      type: "SET_SELECTED_MEASURE_CLASS",
                      measureClassName: undefined,
                    })
                  }
                >
                  <div class={DCGView.const(styles.measureLine)}>
                    <span class={DCGView.const(styles.measureClassName)}>
                      none
                    </span>
                    <span class={DCGView.const(styles.measureCount)}>
                      (no input measure class)
                    </span>
                  </div>
                </div>
                <For
                  each={() => sortedMeasureClasses()}
                  key={(m) => m.measureClassName}
                >
                  {(item) => (
                    <div
                      class={() => ({
                        [styles.measureItem]: true,
                        [styles.selectedMeasureItem]: controller().isSelected(
                          item().measureClassName,
                        ),
                        [styles.disabledMeasureItem]: item().count === 0,
                      })}
                      onClick={() =>
                        item().count > 0 &&
                        controller().context.myDispatch({
                          type: "SET_SELECTED_MEASURE_CLASS",
                          measureClassName: item().measureClassName,
                        })
                      }
                    >
                      <div class={DCGView.const(styles.measureLine)}>
                        <span class={DCGView.const(styles.measureClassName)}>
                          {() => item().measureClassName}
                        </span>
                        <span class={DCGView.const(styles.measureCount)}>
                          {() => ` (${item().count})`}
                        </span>
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
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    transition: "background-color 0.2s",
    $nest: {
      "&:hover": {
        backgroundColor: "#f8f8f8",
      },
    },
  },

  sectionHeader: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "bold",
    color: "#333",
    borderBottom: "2px solid #4CAF50",
    paddingBottom: "4px",
  },

  selectedDisplay: {
    padding: "12px",
    backgroundColor: "#f9f9f9",
    borderRadius: "4px",
    border: "1px solid #e0e0e0",
    cursor: "pointer",
    transition: "background-color 0.2s",
    $nest: {
      "&:hover": {
        backgroundColor: "#f0f0f0",
      },
    },
  },

  selectedMeasureClass: {
    // No additional styles needed, content is styled by measureClassName/measureCount
  },

  noSelection: {
    color: "#666",
    fontStyle: "italic",
  },

  editingDisplay: {
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    backgroundColor: "white",
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

  disabledMeasureItem: {
    color: "#999 !important",
    cursor: "not-allowed",
    $nest: {
      "&:hover": {
        backgroundColor: "transparent !important",
      },
      "& *": {
        color: "#999 !important",
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

  measureLine: {
    display: "flex",
    alignItems: "center",
  },

  measureClassName: {
    fontWeight: "bold",
    color: "#333",
  },

  measureCount: {
    fontSize: "14px",
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
