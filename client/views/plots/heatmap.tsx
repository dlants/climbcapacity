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

export function view({
  model,
  svg,
}: {
  model: Model;
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
}) {
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

  const colorScale = d3
    .scaleLinear<string>()
    .domain([0, d3.max(bins2D.flat(), (d) => d.frequency) || 0])
    .range(["white", "blue"]);

  svg
    .selectAll("rect")
    .data(bins2D.flat()) // flatten the 2D array into 1D
    .join("rect")
    .attr("x", (d) => x(d.col.toString()) || 0)
    .attr("y", (d) => y(d.row.toString()) || 0)
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", (d) => colorScale(d.frequency));

  if (model.myData) {
    // Find which bin contains myData
    const myBinCol = xBinner([model.myData]).findIndex((bin) => bin.length > 0);
    const myBinRow = yBinner([model.myData]).findIndex((bin) => bin.length > 0);

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

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "white")
    .style("border", "1px solid black")
    .style("padding", "5px")
    .style("border-radius", "5px");

  // Add hover interactions to rectangles
  svg
    .selectAll("rect")
    .on("mouseover", (event, data) => {
      const d = data as Bin2D | undefined;
      if (!d) {
        return;
      }
      const xRange = tickFormatBins(d.col, model.xUnit, xThresholds);
      const yRange = tickFormatBins(d.row, model.yUnit, yThresholds);

      tooltip
        .style("visibility", "visible")
        .html(
          `Frequency: ${d.frequency}<br/>` +
          `${model.xLabel}: ${xRange}<br/>` +
          `${model.yLabel}: ${yRange}`,
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", () => {
      tooltip.style("visibility", "hidden");
    });
}
