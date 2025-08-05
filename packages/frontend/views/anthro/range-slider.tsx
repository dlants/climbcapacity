import * as DCGView from "dcgview";
import { MeasureId } from "../../../iso/measures";
import { UnitType, inchesToFeetAndInches } from "../../../iso/units";
import * as typestyle from "typestyle";
import * as d3 from "d3";

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
  private svgElement: SVGSVGElement | null = null;
  private tooltip: d3.Selection<
    HTMLDivElement,
    unknown,
    HTMLElement,
    unknown
  > | null = null;

  init() {
    this.firstSelectedBin = null;
    this.svgElement = null;
    this.tooltip = null;
  }

  handleBarClick(binIndex: number) {
    // Prevent interactions when loading
    if (this.props.isLoading()) {
      return;
    }

    if (this.firstSelectedBin === null) {
      // First click - select starting bin
      this.firstSelectedBin = binIndex;
      this.updateD3Visualization();
    } else {
      // Second click - complete the range selection
      const startBin = Math.min(this.firstSelectedBin, binIndex);
      const endBin = Math.max(this.firstSelectedBin, binIndex);

      this.props.myDispatch(startBin, endBin);
      this.firstSelectedBin = null;
      this.updateD3Visualization();
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

  formatValue(value: number, unit: UnitType): string {
    if (unit === "inch") {
      const { feet, inches } = inchesToFeetAndInches(value);
      return `${feet}'${inches}"`;
    }
    return `${value} ${unit}`;
  }

  divDidMount(el: HTMLDivElement) {
    // Create SVG element
    this.svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    this.svgElement.setAttribute("width", "100%");
    this.svgElement.setAttribute("height", "100%");
    this.svgElement.setAttribute("viewBox", "0 0 300 60");
    this.svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");

    el.appendChild(this.svgElement);
    this.renderD3Histogram();
  }

  divWillUnmount() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
    this.svgElement = null;
  }

  updateD3Visualization() {
    if (this.svgElement) {
      this.renderD3Histogram();
    }
  }

  renderD3Histogram() {
    if (!this.svgElement) return;

    const svg = d3.select(this.svgElement);
    const histogram = this.props.histogram();
    const isLoading = this.props.isLoading();
    const unit = this.props.unit();

    // Clear previous content
    svg.selectAll("*").remove();

    if (histogram.length === 0) return;

    // SVG dimensions
    const width = 300;
    const height = 60;
    const margin = { top: 5, right: 5, bottom: 20, left: 5 };

    // Scales
    const x = d3
      .scaleBand()
      .domain(histogram.map((_, i) => i.toString()))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const maxCount = Math.max(...histogram.map((b) => b.count));
    const y = d3
      .scaleLinear()
      .domain([0, maxCount])
      .range([height - margin.bottom, margin.top]);

    // Create tooltip if it doesn't exist
    if (!this.tooltip) {
      this.tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "white")
        .style("border", "1px solid black")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("font-size", "12px");
    }

    // Draw bars
    svg
      .selectAll("rect.histogram-bar")
      .data(histogram)
      .join("rect")
      .attr("class", "histogram-bar")
      .attr("x", (_, i) => x(i.toString()) || 0)
      .attr("y", (d) => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", (d) => y(0) - y(d.count))
      .attr("fill", (_, i) => {
        if (isLoading) return "#ccc";

        const isFirstSelected = this.firstSelectedBin === i;
        const isInSelectedRange = this.isInSelectedRange(i);

        if (isFirstSelected) return "#FF9800";
        if (isInSelectedRange) return "#2196F3";
        return "#4CAF50";
      })
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .style("cursor", isLoading ? "not-allowed" : "pointer")
      .style("opacity", isLoading ? 0.5 : 1)
      .on("click", (_, d) => {
        const binIndex = histogram.indexOf(d);
        this.handleBarClick(binIndex);
      })
      .on("mouseover", (event, d) => {
        if (isLoading || !this.tooltip) return;

        const formattedLabel =
          unit === "inch"
            ? (() => {
                const { feet, inches } = inchesToFeetAndInches(d.min);
                return `${feet}'${inches}"`;
              })()
            : d.binLabel;

        this.tooltip
          .style("visibility", "visible")
          .html(`${formattedLabel}: ${d.count} snapshots`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", () => {
        if (this.tooltip) {
          this.tooltip.style("visibility", "hidden");
        }
      })
      .on("mousemove", (event) => {
        if (this.tooltip) {
          this.tooltip
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px");
        }
      });

    // Add frequency indicator
    svg
      .append("text")
      .attr("x", width - margin.right)
      .attr("y", margin.top + 10)
      .attr("text-anchor", "end")
      .attr("font-size", "10px")
      .attr("fill", "#666")
      .attr("font-weight", "500")
      .text(maxCount);

    // Use d3's intelligent tick generation
    const valueScale = d3
      .scaleLinear()
      .domain([histogram[0].min, histogram[histogram.length - 1].max])
      .range([margin.left, width - margin.right]);

    // Generate optimal tick values based on available space
    const tickCount = Math.max(2, Math.floor(width / 50)); // ~50px per tick
    const tickValues = valueScale.ticks(tickCount);

    // Map tick values to positions and filter to those within our data range
    const filteredTicks = tickValues
      .filter(
        (value) =>
          value >= histogram[0].min &&
          value <= histogram[histogram.length - 1].max,
      )
      .map((value) => ({
        position: valueScale(value),
        value: value,
      }));

    svg
      .selectAll("text.x-label")
      .data(filteredTicks)
      .join("text")
      .attr("class", "x-label")
      .attr("x", (d) => d.position)
      .attr("y", height - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#666")
      .text((d) => {
        if (unit === "inch") {
          const { feet, inches } = inchesToFeetAndInches(d.value);
          return `${feet}'${inches}"`;
        }
        return d.value.toString();
      });
  }

  template() {
    const { If } = DCGView.Components;
    const histogram = () => this.props.histogram();
    const selectedRange = () => this.props.selectedRange();

    return (
      <div class={DCGView.const(styles.rangeSlider)}>
        {/* D3 Histogram visualization */}
        <div
          class={DCGView.const(styles.histogramContainer)}
          didMount={this.divDidMount.bind(this)}
          willUnmount={this.divWillUnmount.bind(this)}
        ></div>

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
            const unit = this.props.unit();

            return (
              <div class={DCGView.const(styles.selectedRange)}>
                Selected: {this.formatValue(startBin.min, unit)} -{" "}
                {this.formatValue(endBin.max, unit)}
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

  didUpdate() {
    if (this._isMounted) {
      this.updateD3Visualization();
    }
  }
}

const styles = typestyle.stylesheet({
  rangeSlider: {
    // Styles for range slider container
  },

  histogramContainer: {
    marginBottom: "8px",
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
