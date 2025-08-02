import * as DCGView from "dcgview";
import { MeasureId } from "../../../iso/measures";
import { UnitType } from "../../../iso/units";
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
  selectedRange: () => { startBin?: number; endBin?: number };
  isLoading: () => boolean;
  myDispatch: (startBin?: number, endBin?: number) => void;
}> {
  private firstSelectedBin: number | null = null;

  init() {
    this.firstSelectedBin = null;
  }

  handleBarClick(binIndex: number) {
    // Prevent interactions when loading
    if (this.props.isLoading()) {
      return;
    }

    if (this.firstSelectedBin === null) {
      // First click - select starting bin
      this.firstSelectedBin = binIndex;
      this.update();
    } else {
      // Second click - complete the range selection
      const startBin = Math.min(this.firstSelectedBin, binIndex);
      const endBin = Math.max(this.firstSelectedBin, binIndex);

      this.props.myDispatch(startBin, endBin);
      this.firstSelectedBin = null;
      this.update();
    }
  }

  isInSelectedRange(binIndex: number): boolean {
    const selectedRange = this.props.selectedRange();
    if (
      selectedRange.startBin === undefined ||
      selectedRange.endBin === undefined
    )
      return false;

    return (
      binIndex >= selectedRange.startBin && binIndex <= selectedRange.endBin
    );
  }

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
              return histogramData.map((bin, index) => ({
                ...bin,
                index,
                height: Math.max(2, (bin.count / maxCount) * 40),
                maxCount,
              }));
            }}
            key={(bin) => bin.binLabel}
          >
            {(bin) => (
              <div
                class={() => {
                  const isFirstSelected = this.firstSelectedBin === bin().index;
                  const isInSelectedRange = this.isInSelectedRange(bin().index);
                  const isLoading = this.props.isLoading();
                  return typestyle.classes(
                    styles.histogramBar,
                    isFirstSelected && styles.firstSelectedBar,
                    isInSelectedRange && styles.selectedRangeBar,
                    isLoading && styles.disabledBar,
                  );
                }}
                style={() => ({ height: `${bin().height}px` })}
                title={() => `${bin().binLabel}: ${bin().count} snapshots`}
                onClick={() => this.handleBarClick(bin().index)}
              />
            )}
          </For>

          {/* Frequency indicator */}
          <If predicate={() => histogram().length > 0}>
            {() => {
              const histogramData = histogram();
              const maxCount = Math.max(...histogramData.map((b) => b.count));
              return (
                <div class={DCGView.const(styles.frequencyIndicator)}>
                  {maxCount}
                </div>
              );
            }}
          </If>
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
            selectedRange().startBin !== undefined &&
            selectedRange().endBin !== undefined
          }
        >
          {() => {
            const histogramData = histogram();
            const range = selectedRange();
            const startBin = histogramData[range.startBin!];
            const endBin = histogramData[range.endBin!];
            return (
              <div class={DCGView.const(styles.selectedRange)}>
                Selected: {startBin.min} - {endBin.max} {this.props.unit()}
              </div>
            );
          }}
        </If>

        {/* Instructions */}
        <div class={DCGView.const(styles.instructions)}>
          {() =>
            this.firstSelectedBin !== null
              ? "Click another bar to complete range selection"
              : "Click a bar to start range selection"
          }
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
    position: "relative",
  },

  frequencyIndicator: {
    position: "absolute",
    top: "-16px",
    right: "0",
    fontSize: "10px",
    color: "#666",
    fontWeight: "500",
  },

  histogramBar: {
    backgroundColor: "#4CAF50",
    flex: 1,
    minWidth: "4px",
    cursor: "pointer",
    $nest: {
      "&:hover:not(.disabled)": {
        backgroundColor: "#45a049",
      },
    },
  },

  firstSelectedBar: {
    backgroundColor: "#FF9800",
    $nest: {
      "&:hover:not(.disabled)": {
        backgroundColor: "#F57C00",
      },
    },
  },

  selectedRangeBar: {
    backgroundColor: "#2196F3",
    $nest: {
      "&:hover:not(.disabled)": {
        backgroundColor: "#1976D2",
      },
    },
  },

  disabledBar: {
    opacity: 0.5,
    cursor: "not-allowed",
    $nest: {
      "&:hover": {
        backgroundColor: "inherit",
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

  instructions: {
    fontSize: "12px",
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
});
