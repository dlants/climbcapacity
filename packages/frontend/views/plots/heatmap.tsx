import { UnitType } from "../../../iso/units";
import { HEIGHT, MARGIN, WIDTH } from "./constants";
import { Bin2D, generateBinThresholds, Point, tickFormatBins } from "./util";
import * as d3 from "d3";
import lodash from "lodash";

export type Model = {
  style: "heatmap";
  data: Point[];
  xLabel: string;
  xUnit?: UnitType;
  yLabel: string;
  yUnit?: UnitType;
  myData?: { x: number; y: number };
};

type HeatmapInteractionState =
  | { type: "no-clicks" }
  | { type: "first-row-selected"; startRow: number }
  | { type: "second-row-selected"; startRow: number; endRow: number };

export class HeatmapController {
  state: {
    interaction: HeatmapInteractionState;
    hovered: { row: number; col: number } | undefined;
  };
  private tooltip:
    | d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    | undefined = undefined;
  private svg:
    | d3.Selection<SVGSVGElement, unknown, null, undefined>
    | undefined = undefined;

  constructor() {
    this.state = {
      interaction: { type: "no-clicks" },
      hovered: undefined,
    };
  }

  private getRowsToHighlight(): { start: number; end: number } | null {
    const selectedRows =
      this.state.interaction.type === "first-row-selected"
        ? { start: this.state.interaction.startRow }
        : this.state.interaction.type === "second-row-selected"
          ? {
              start: this.state.interaction.startRow,
              end: this.state.interaction.endRow,
            }
          : null;

    if (selectedRows && selectedRows.end !== undefined) {
      // Range selection mode - highlight rows in range
      const start = Math.min(selectedRows.start, selectedRows.end);
      const end = Math.max(selectedRows.start, selectedRows.end);
      return { start, end };
    } else if (selectedRows) {
      // First row selected - highlight range from start to hovered row
      if (this.state.hovered !== undefined) {
        const start = Math.min(selectedRows.start, this.state.hovered.row);
        const end = Math.max(selectedRows.start, this.state.hovered.row);
        return { start, end };
      } else {
        return { start: selectedRows.start, end: selectedRows.start };
      }
    }
    return null;
  }

  updateView(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    bins2D: Bin2D[][],
  ) {
    const highlightedRows = this.getRowsToHighlight();
    const hoveredRow = this.state.hovered?.row;

    // Determine which rows to show with gray background
    const rowsToHighlight =
      highlightedRows ||
      (hoveredRow !== undefined
        ? { start: hoveredRow, end: hoveredRow }
        : null);

    // Update row backgrounds
    svg.selectAll("rect.row-background").remove();
    if (rowsToHighlight) {
      const y = d3
        .scaleBand()
        .domain(lodash.range(bins2D.length).map((d) => d.toString()))
        .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

      for (
        let rowIndex = rowsToHighlight.start;
        rowIndex <= rowsToHighlight.end;
        rowIndex++
      ) {
        svg
          .insert("rect", ":first-child")
          .attr("class", "row-background")
          .attr("x", MARGIN.left)
          .attr("y", y(rowIndex.toString()) || 0)
          .attr("width", WIDTH - MARGIN.left - MARGIN.right)
          .attr("height", y.bandwidth())
          .attr("fill", "lightgray")
          .attr("opacity", 0.3);
      }
    }

    // Update y-axis tick opacity
    svg.selectAll(".tick text").attr("opacity", 1.0); // Reset all first
    if (rowsToHighlight) {
      svg.selectAll("g").each(function () {
        const g = d3.select(this);
        if (g.attr("transform")?.includes(`translate(${MARGIN.left},`)) {
          // This is likely the y-axis
          g.selectAll(".tick text").attr("opacity", (_, i) => {
            // Tick index directly corresponds to row index
            const tickRowIndex = i;
            return tickRowIndex >= rowsToHighlight.start &&
              tickRowIndex <= rowsToHighlight.end
              ? 1.0
              : 0.5;
          });
        }
      });
    }

    // Apply transparency to all cells, except the hovered one
    if (this.state.hovered !== undefined) {
      // Dim all cells to 70% opacity
      svg.selectAll("rect.frequency-bar").attr("opacity", 0.7);

      // Keep the hovered cell at full opacity
      svg
        .selectAll("rect.frequency-bar")
        .filter((d) => {
          const bin = d as Bin2D;
          return (
            bin.row === this.state.hovered!.row &&
            bin.col === this.state.hovered!.col
          );
        })
        .attr("opacity", 1.0);
    } else {
      // No hover - all cells at full opacity
      svg.selectAll("rect.frequency-bar").attr("opacity", 1.0);
    }
  }

  view(
    model: Model,
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    notifyInteractionChange: () => void,
  ): { cleanup: () => void; update: () => void } {
    // Store svg reference
    this.svg = svg;

    // Remove existing tooltip if it exists
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = undefined;
    }

    const xThresholds = generateBinThresholds(
      model.data.map((p) => p.x),
      model.xUnit,
    );

    const yThresholds = generateBinThresholds(
      model.data.map((p) => p.y),
      model.yUnit,
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

    const rawBins = yBinner(model.data).map((yBin) => xBinner(yBin));
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

    // Scales
    const x = d3
      .scaleBand()
      .domain(lodash.range(bins2D[0].length).map((d) => d.toString()))
      .range([MARGIN.left, WIDTH - MARGIN.right]);

    const y = d3
      .scaleBand()
      .domain(lodash.range(bins2D.length).map((d) => d.toString()))
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

    const maxFrequency = d3.max(bins2D.flat(), (d) => d.frequency) || 1;
    const cellHeight = y.bandwidth();

    // Helper function to get cell coordinates from mouse position
    const getCellFromMouse = (
      event: MouseEvent,
    ): { row: number; col: number } | undefined => {
      const [mouseX, mouseY] = d3.pointer(event, svg.node());

      const colIndex = Math.floor((mouseX - MARGIN.left) / x.bandwidth());
      const rowIndex = Math.floor((mouseY - MARGIN.top) / y.bandwidth());

      // Invert the row index since y scale goes from bottom to top
      const invertedRowIndex = bins2D.length - 1 - rowIndex;

      if (
        invertedRowIndex >= 0 &&
        invertedRowIndex < bins2D.length &&
        colIndex >= 0 &&
        colIndex < bins2D[0].length
      ) {
        return { row: invertedRowIndex, col: colIndex };
      }
      return undefined;
    };

    const handleCellHover = (
      cell: { row: number; col: number } | undefined,
    ) => {
      this.state.hovered = cell;
      notifyInteractionChange();
    };

    // Add SVG interaction listeners
    svg.on("mousemove", (event: MouseEvent) => {
      const cell = getCellFromMouse(event);
      handleCellHover(cell);
      // Hide tooltip when moving between cells (not hovering over a specific rect)
      const target = event.target as Element;
      if (target === svg.node() && this.tooltip) {
        this.tooltip.style("visibility", "hidden");
      }
    });

    svg.on("mouseleave", () => {
      handleCellHover(undefined);
      // Also hide tooltip when leaving the entire SVG
      if (this.tooltip) {
        this.tooltip.style("visibility", "hidden");
      }
    });

    svg.on("click", (event: MouseEvent) => {
      const cell = getCellFromMouse(event);
      if (cell !== undefined) {
        switch (this.state.interaction.type) {
          case "no-clicks":
            this.state.interaction = {
              type: "first-row-selected",
              startRow: cell.row,
            };
            break;
          case "first-row-selected":
            this.state.interaction = {
              type: "second-row-selected",
              startRow: this.state.interaction.startRow,
              endRow: cell.row,
            };
            break;
          case "second-row-selected":
            // Should not happen
            throw new Error();
        }

        notifyInteractionChange();
      }
    });

    // Draw frequency rectangles (visible bars)
    svg
      .selectAll("rect.frequency-bar")
      .data(bins2D.flat()) // flatten the 2D array into 1D
      .join("rect")
      .attr("class", "frequency-bar")
      .attr("x", (d) => x(d.col.toString()) || 0)
      .attr("y", (d) => {
        const cellTop = y(d.row.toString()) || 0;
        const rectHeight = (d.frequency / maxFrequency) * cellHeight;
        return cellTop + cellHeight - rectHeight; // Align to bottom of cell
      })
      .attr("width", x.bandwidth())
      .attr("height", (d) => (d.frequency / maxFrequency) * cellHeight)
      .attr("fill", "steelblue")
      .attr("stroke", "white")
      .attr("stroke-width", 0.5);

    // Draw invisible full-height rectangles for hover interaction
    svg
      .selectAll("rect.hover-area")
      .data(bins2D.flat())
      .join("rect")
      .attr("class", "hover-area")
      .attr("x", (d) => x(d.col.toString()) || 0)
      .attr("y", (d) => y(d.row.toString()) || 0)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", "transparent")
      .attr("pointer-events", "all");

    if (model.myData) {
      // Find which bin contains myData
      const myBinCol = xBinner([model.myData]).findIndex(
        (bin) => bin.length > 0,
      );
      const myBinRow = yBinner([model.myData]).findIndex(
        (bin) => bin.length > 0,
      );

      if (myBinCol !== -1 && myBinRow !== -1) {
        svg
          .append("rect")
          .attr("x", x(myBinCol.toString()) || 0)
          .attr("y", y(myBinRow.toString()) || 0)
          .attr("width", x.bandwidth())
          .attr("height", y.bandwidth())
          .attr("fill", "none")
          .attr("stroke", "orange")
          .attr("stroke-width", 2);
      }
    }
    const xAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) =>
      g
        .attr("transform", `translate(0,${HEIGHT - MARGIN.bottom})`)
        .call(
          d3
            .axisBottom(x)
            .tickFormat((d) =>
              tickFormatBins(parseFloat(d), model.xUnit, xThresholds),
            ),
        );

    const yAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) =>
      g
        .attr("transform", `translate(${MARGIN.left},0)`)
        .call(
          d3
            .axisLeft(y)
            .tickFormat((d) =>
              tickFormatBins(parseFloat(d), model.yUnit, yThresholds),
            ),
        );

    svg.append("g").call(xAxis);
    svg.append("g").call(yAxis);

    svg
      .append("text")
      .attr("x", WIDTH / 2)
      .attr("y", HEIGHT - 5)
      .attr("text-anchor", "middle")
      .text(model.xLabel + (model.xUnit ? ` (${model.xUnit})` : ""));

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -HEIGHT / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .text(model.yLabel + (model.yUnit ? ` (${model.yUnit})` : ""));

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
        .style("pointer-events", "none");
    }

    // Add hover interactions to the invisible hover areas
    svg
      .selectAll("rect.hover-area")
      .on("mouseover", (event, data) => {
        const d = data as Bin2D | undefined;
        if (!d) {
          return;
        }

        // Update hover state for the specific cell
        handleCellHover({ row: d.row, col: d.col });

        const xRange = tickFormatBins(d.col, model.xUnit, xThresholds);
        const yRange = tickFormatBins(d.row, model.yUnit, yThresholds);

        if (this.tooltip) {
          this.tooltip
            .style("visibility", "visible")
            .html(
              `Frequency: ${d.frequency}<br/>` +
                `${model.xLabel}: ${xRange}<br/>` +
                `${model.yLabel}: ${yRange}`,
            )
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px");
        }
      })
      .on("mouseout", () => {
        handleCellHover(undefined);
        if (this.tooltip) {
          this.tooltip.style("visibility", "hidden");
        }
      })
      .on("mousemove", (event) => {
        // Update tooltip position on mousemove within the cell
        if (this.tooltip) {
          this.tooltip
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px");
        }
      });

    // Apply initial highlighting
    this.updateView(svg, bins2D);

    // Return cleanup and update functions
    return {
      cleanup: () => {
        if (this.svg) {
          this.svg.selectAll("*").remove();
        }
        this.svg = undefined;
      },
      update: () => {
        if (this.svg) {
          this.updateView(this.svg, bins2D);
        }
      },
    };
  }
}
