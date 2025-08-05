import * as DCGView from "dcgview";
import { MeasureId, getFacetConfigForLocale } from "../../../iso/measures";
import { inchesToFeetAndInches } from "../../../iso/units";
import { AnthroFilterController } from "./filter";
import { AnthroCategoricalOptionsView } from "./categorical-options";
import { AnthroRangeSliderView } from "./range-slider";
import * as typestyle from "typestyle";

export class AnthroMeasureFilterView extends DCGView.View<{
  measureId: () => MeasureId;
  controller: () => AnthroFilterController;
  isLoading: () => boolean;
}> {
  private hasSelections(): boolean {
    const controller = this.props.controller();
    const measureId = this.props.measureId();

    if (!controller.isFilterEnabled(measureId)) {
      return false;
    }

    if (controller.isCategoricalMeasure(measureId)) {
      return controller.getSelectedCategoricalValues(measureId).size > 0;
    } else if (controller.isRangeMeasure(measureId)) {
      const range = controller.getSelectedRange(measureId);
      return (
        range.selectedMinIdx !== undefined || range.selectedMaxIdx !== undefined
      );
    }

    return false;
  }

  private formatSelectionSummary(): string {
    const controller = this.props.controller();
    const measureId = this.props.measureId();
    const filterState = controller.state.filterStates[measureId];

    if (controller.isCategoricalMeasure(measureId)) {
      const selectedValues = Array.from(
        controller.getSelectedCategoricalValues(measureId),
      );
      return selectedValues.join(", ");
    } else if (controller.isRangeMeasure(measureId)) {
      const range = controller.getSelectedRange(measureId);
      const { selectedMinIdx, selectedMaxIdx, bins } = range;

      if (selectedMinIdx !== undefined || selectedMaxIdx !== undefined) {
        const startIdx = selectedMinIdx ?? 0;
        const endIdx = selectedMaxIdx ?? bins.length - 1;
        const startBin = bins[startIdx];
        const endBin = bins[endIdx];

        let lowerBound: number | undefined;
        let upperBound: number | undefined;
        if (startIdx == 0) {
          // only show the upper boundary, so something like <5'2
          upperBound = endBin.max;
        } else if (endIdx == bins.length - 1) {
          // only show the lower boundary, so something like >5'2
          lowerBound = startBin.min;
        } else {
          // use the lower bound from the first bin, and the upper bound from the second bin
          lowerBound = startBin.min;
          upperBound = endBin.max;
        }
        const unitType = (
          filterState as Extract<typeof filterState, { type: "range" }>
        ).unitType;

        if (measureId === "height" && unitType == "inch") {
          const lowerStr = lowerBound
            ? (() => {
                const { feet, inches } = inchesToFeetAndInches(lowerBound);
                return `${feet}'${inches}"`;
              })()
            : "";
          const upperStr = upperBound
            ? (() => {
                const { feet, inches } = inchesToFeetAndInches(upperBound);
                return `${feet}'${inches}"`;
              })()
            : "";
          if (lowerStr && upperStr) {
            return `${lowerStr}-${upperStr}`;
          } else if (!lowerStr) {
            return `≤${upperStr}`;
          } else if (!upperStr) {
            return `≥${lowerStr}`;
          }
        } else {
          const lowerStr = lowerBound ? lowerBound.toString() : "";
          const upperStr = upperBound ? upperBound.toString() : "";
          if (lowerStr && upperStr) {
            return `${lowerStr}-${upperStr} ${unitType}`;
          } else if (!lowerStr) {
            return `≤${upperStr} ${unitType}`;
          } else if (!upperStr) {
            return `≥${lowerStr} ${unitType}`;
          }
        }
      }
    }

    return "";
  }

  template() {
    const { If } = DCGView.Components;
    const controller = () => this.props.controller();
    const measureId = () => this.props.measureId();
    const isLoading = () => this.props.isLoading();
    const hasData = () => controller().getTotalCount(measureId()) > 0;
    const isEnabled = () => controller().isFilterEnabled(measureId());
    const hasSelections = () => this.hasSelections();

    return (
      <div
        class={() => ({
          [styles.measureGroup]: true,
          ...(!hasData() ? { [styles.measureGroupDisabled]: true } : {}),
        })}
      >
        {/* Show nothing if no data */}
        <If predicate={hasData}>
          {() => (
            <>
              {/* Show summary when filter is enabled and has selections */}
              <If predicate={() => isEnabled() && hasSelections()}>
                {() => (
                  <div class={DCGView.const(styles.selectionSummary)}>
                    <button
                      class={DCGView.const(styles.clearButton)}
                      onClick={() =>
                        !isLoading() &&
                        controller().context.myDispatch({
                          type: "TOGGLE_FILTER_ENABLED",
                          measureId: measureId(),
                        })
                      }
                      disabled={() => isLoading()}
                    >
                      ×
                    </button>
                    <span class={DCGView.const(styles.summaryText)}>
                      <strong>{() => measureId()}:</strong>{" "}
                      {() => this.formatSelectionSummary()}
                    </span>
                  </div>
                )}
              </If>

              {/* Show filter controls when no selections or not enabled */}
              <If predicate={() => !isEnabled() || !hasSelections()}>
                {() => (
                  <>
                    <div class={DCGView.const(styles.measureHeader)}>
                      <span class={DCGView.const(styles.measureName)}>
                        {() => measureId()} (
                        {() => controller().getTotalCount(measureId())})
                      </span>
                    </div>

                    <div class={DCGView.const(styles.filterControls)}>
                      {/* Categorical measure UI */}
                      <If
                        predicate={() =>
                          controller().isCategoricalMeasure(measureId())
                        }
                      >
                        {() => (
                          <AnthroCategoricalOptionsView
                            measureId={() => measureId()}
                            controller={() => controller()}
                            isLoading={() => isLoading()}
                          />
                        )}
                      </If>

                      {/* Range measure UI */}
                      <If
                        predicate={() =>
                          controller().isRangeMeasure(measureId())
                        }
                      >
                        {() => (
                          <div class={DCGView.const(styles.rangeOptions)}>
                            <AnthroRangeSliderView
                              measureId={() => measureId()}
                              unit={() => {
                                const locale = controller().context.locale();
                                const facetConfig = getFacetConfigForLocale(
                                  measureId(),
                                  locale,
                                );
                                return facetConfig.unit;
                              }}
                              histogram={() =>
                                controller().getRangeHistogram(measureId())
                              }
                              selectedRange={() => {
                                const range =
                                  controller().getSelectedRange(measureId());
                                return {
                                  startBin: range.selectedMinIdx,
                                  endBin: range.selectedMaxIdx,
                                };
                              }}
                              isLoading={() => isLoading()}
                              myDispatch={(
                                startBin?: number,
                                endBin?: number,
                              ) => {
                                if (!isLoading()) {
                                  // Enable the filter when user makes a selection
                                  if (
                                    !controller().isFilterEnabled(measureId())
                                  ) {
                                    controller().context.myDispatch({
                                      type: "TOGGLE_FILTER_ENABLED",
                                      measureId: measureId(),
                                    });
                                  }

                                  controller().context.myDispatch({
                                    type: "UPDATE_RANGE",
                                    measureId: measureId(),
                                    selectedMinIdx: startBin,
                                    selectedMaxIdx: endBin,
                                  });
                                }
                              }}
                            />
                          </div>
                        )}
                      </If>
                    </div>
                  </>
                )}
              </If>
            </>
          )}
        </If>
      </div>
    );
  }
}

const styles = typestyle.stylesheet({
  measureGroup: {
    marginBottom: "12px",
    border: "1px solid #e0e0e0",
    borderRadius: "6px",
    backgroundColor: "#fafafa",
  },

  measureHeader: {
    padding: "8px 12px",
    backgroundColor: "#f0f0f0",
    borderBottom: "1px solid #e0e0e0",
    borderRadius: "6px 6px 0 0",
  },

  measureToggle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    color: "#444",
    $nest: {
      "& input[type='checkbox']": {
        margin: 0,
        cursor: "pointer",
      },
    },
  },

  measureName: {
    fontWeight: "600",
    fontSize: "14px",
    color: "#444",
  },

  filterControls: {
    padding: "12px",
  },

  rangeOptions: {
    padding: "8px 12px",
  },

  measureGroupDisabled: {
    opacity: 0.5,
    backgroundColor: "#f8f8f8",
  },

  measureHeaderDisabled: {
    backgroundColor: "#eeeeee",
    color: "#999",
  },

  measureNameDisabled: {
    color: "#aaa",
  },

  selectionSummary: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    backgroundColor: "#e8f5e8",
    border: "1px solid #4CAF50",
    borderRadius: "4px",
    fontSize: "14px",
  },

  clearButton: {
    background: "none",
    border: "none",
    fontSize: "18px",
    fontWeight: "bold",
    color: "#666",
    cursor: "pointer",
    padding: "0",
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    $nest: {
      "&:hover": {
        backgroundColor: "#ddd",
        color: "#333",
      },
      "&:disabled": {
        cursor: "not-allowed",
        opacity: 0.5,
      },
    },
  },

  summaryText: {
    flex: 1,
    color: "#2E7D32",
  },
});
