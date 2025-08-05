import * as DCGView from "dcgview";
import { MeasureId } from "../../../iso/measures";
import { AnthroFilterController } from "./filter";
import * as typestyle from "typestyle";

export class AnthroCategoricalOptionsView extends DCGView.View<{
  measureId: () => MeasureId;
  controller: () => AnthroFilterController;
  isLoading: () => boolean;
}> {
  template() {
    const { For } = DCGView.Components;
    const controller = () => this.props.controller();
    const measureId = () => this.props.measureId();
    const isLoading = () => this.props.isLoading();

    return (
      <div class={DCGView.const(styles.categoricalOptions)}>
        <For
          each={() => controller().getCategoricalOptions(measureId())}
          key={(option) => String(option.value)}
        >
          {(
            getOption: () => {
              value: string | number;
              count: number;
            },
          ) => {
            const option = getOption();
            const selectedValues =
              controller().getSelectedCategoricalValues(measureId());
            return (
              <div
                class={() =>
                  typestyle.classes(
                    styles.categoricalOption,
                    isLoading() && styles.disabledOption,
                  )
                }
              >
                <label>
                  <input
                    type="checkbox"
                    checked={() => selectedValues.has(option.value)}
                    disabled={() => isLoading()}
                    onChange={() => {
                      if (!isLoading()) {
                        // Enable the filter when user makes a selection
                        if (!controller().isFilterEnabled(measureId())) {
                          controller().context.myDispatch({
                            type: "TOGGLE_FILTER_ENABLED",
                            measureId: measureId(),
                          });
                        }
                        
                        controller().context.myDispatch({
                          type: "TOGGLE_CATEGORICAL_VALUE",
                          measureId: measureId(),
                          value: option.value,
                        });
                      }
                    }}
                  />
                  {String(option.value)} ({option.count})
                </label>
              </div>
            );
          }}
        </For>
      </div>
    );
  }
}

const styles = typestyle.stylesheet({
  categoricalOptions: {
    padding: "8px 12px",
  },

  categoricalOption: {
    marginBottom: "4px",
    $nest: {
      "& label": {
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "13px",
        cursor: "pointer",
      },
    },
  },

  disabledOption: {
    opacity: 0.5,
    $nest: {
      "& label": {
        cursor: "not-allowed",
      },
    },
  },
});
