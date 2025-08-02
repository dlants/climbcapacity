import * as DCGView from "dcgview";
import { MeasureId } from "../../../iso/measures";
import { UnitType, UnitValue } from "../../../iso/units";
import * as typestyle from "typestyle";

export class AnthroRangeSliderView extends DCGView.View<{
  measureId: () => MeasureId;
  unit: () => UnitType;
  histogram: () => Array<{
    binLabel: string;
    count: number;
    min: number;
    max: number;
  }>;
  selectedRange: () => { min?: UnitValue; max?: UnitValue };
  myDispatch: (min?: UnitValue, max?: UnitValue) => void;
}> {
  template() {
    const { For, If } = DCGView.Components;
    const histogram = () => this.props.histogram();
    const selectedRange = () => this.props.selectedRange();

    return (
      <div class={DCGView.const(styles.rangeSlider)}>
        {/* Histogram visualization */}
        <div class={DCGView.const(styles.histogram)}>
          <For
            each={() => {
              const histogramData = histogram();
              if (histogramData.length === 0) return [];
              const maxCount = Math.max(...histogramData.map((b) => b.count));
              return histogramData.map((bin) => ({
                ...bin,
                height: Math.max(2, (bin.count / maxCount) * 40),
              }));
            }}
            key={(bin) => bin.binLabel}
          >
            {(bin) => (
              <div
                class={DCGView.const(styles.histogramBar)}
                style={() => ({ height: `${bin().height}px` })}
                title={() => `${bin().binLabel}: ${bin().count} snapshots`}
              />
            )}
          </For>
        </div>

        {/* Range labels */}
        <div class={DCGView.const(styles.rangeLabels)}>
          <For.Simple each={() => histogram().map((bin) => bin.binLabel)}>
            {(binLabel: string) => (
              <div class={DCGView.const(styles.rangeLabel)}>{binLabel}</div>
            )}
          </For.Simple>
        </div>

        {/* Selected range indicator */}
        <If
          predicate={() =>
            selectedRange().min !== undefined ||
            selectedRange().max !== undefined
          }
        >
          {() => (
            <div class={DCGView.const(styles.selectedRange)}>
              Selected: {() => selectedRange().min?.value || "min"} -{" "}
              {() => selectedRange().max?.value || "max"}{" "}
              {() =>
                selectedRange().min?.unit ||
                selectedRange().max?.unit ||
                this.props.unit()
              }
            </div>
          )}
        </If>

        {/* Range inputs */}
        <div class={DCGView.const(styles.rangeInputs)}>
          <input
            type="number"
            placeholder="Min"
            value={() => selectedRange().min?.value?.toString() || ""}
            onInput={(e) => {
              const value = parseFloat((e.target as HTMLInputElement).value);
              if (!isNaN(value)) {
                const min = {
                  value,
                  unit: selectedRange().min?.unit || this.props.unit(),
                } as UnitValue;
                this.props.myDispatch(min, selectedRange().max);
              } else {
                this.props.myDispatch(undefined, selectedRange().max);
              }
            }}
          />
          <input
            type="number"
            placeholder="Max"
            value={() => selectedRange().max?.value?.toString() || ""}
            onInput={(e) => {
              const value = parseFloat((e.target as HTMLInputElement).value);
              if (!isNaN(value)) {
                const max = {
                  value,
                  unit: selectedRange().max?.unit || this.props.unit(),
                } as UnitValue;
                this.props.myDispatch(selectedRange().min, max);
              } else {
                this.props.myDispatch(selectedRange().min, undefined);
              }
            }}
          />
        </div>
      </div>
    );
  }
}

const styles = typestyle.stylesheet({
  rangeSlider: {
    // Styles for range slider container
  },

  histogram: {
    display: "flex",
    alignItems: "end",
    gap: "1px",
    marginBottom: "8px",
    height: "50px",
  },

  histogramBar: {
    backgroundColor: "#4CAF50",
    flex: 1,
    minWidth: "4px",
    cursor: "pointer",
    $nest: {
      "&:hover": {
        backgroundColor: "#45a049",
      },
    },
  },

  rangeLabels: {
    display: "flex",
    fontSize: "10px",
    marginBottom: "8px",
  },

  rangeLabel: {
    flex: 1,
    textAlign: "center",
    color: "#666",
  },

  selectedRange: {
    fontSize: "12px",
    color: "#666",
    marginBottom: "8px",
  },

  rangeInputs: {
    display: "flex",
    gap: "8px",
    $nest: {
      "& input": {
        flex: 1,
        padding: "4px",
        border: "1px solid #ccc",
        borderRadius: "2px",
        fontSize: "12px",
      },
    },
  },
});
