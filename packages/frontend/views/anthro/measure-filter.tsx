import * as DCGView from "dcgview";
import { MeasureId, getFacetConfigForLocale } from "../../../iso/measures";
import { AnthroFilterController } from "./filter";
import { AnthroCategoricalOptionsView } from "./categorical-options";
import { AnthroRangeSliderView } from "./range-slider";
import * as typestyle from "typestyle";

export class AnthroMeasureFilterView extends DCGView.View<{
  measureId: () => MeasureId;
  controller: () => AnthroFilterController;
  isLoading: () => boolean;
}> {
  template() {
    const { If } = DCGView.Components;
    const controller = () => this.props.controller();
    const measureId = () => this.props.measureId();
    const isLoading = () => this.props.isLoading();

    return (
      <div class={DCGView.const(styles.measureGroup)}>
        <div class={DCGView.const(styles.measureHeader)}>
          <label class={DCGView.const(styles.measureToggle)}>
            <input
              type="checkbox"
              checked={() => controller().isFilterEnabled(measureId())}
              disabled={() => isLoading()}
              onChange={() =>
                !isLoading() &&
                controller().context.myDispatch({
                  type: "TOGGLE_FILTER_ENABLED",
                  measureId: measureId(),
                })
              }
            />
            <span class={DCGView.const(styles.measureName)}>
              {() => measureId()} (
              {() => controller().getTotalCount(measureId())})
            </span>
          </label>
        </div>

        {/* Show filter controls only when enabled */}
        <If predicate={() => controller().isFilterEnabled(measureId())}>
          {() => (
            <div class={DCGView.const(styles.filterControls)}>
              {/* Categorical measure UI */}
              <If
                predicate={() => controller().isCategoricalMeasure(measureId())}
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
              <If predicate={() => controller().isRangeMeasure(measureId())}>
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
                      myDispatch={(startBin?: number, endBin?: number) =>
                        !isLoading() &&
                        controller().context.myDispatch({
                          type: "UPDATE_RANGE",
                          measureId: measureId(),
                          selectedMinIdx: startBin,
                          selectedMaxIdx: endBin,
                        })
                      }
                    />
                  </div>
                )}
              </If>
            </div>
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
    borderTop: "1px solid #e0e0e0",
  },

  rangeOptions: {
    padding: "8px 12px",
  },
});
