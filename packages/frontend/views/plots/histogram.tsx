import { UnitType } from "../../../iso/units";
import { Bin, generateBinThresholds, tickFormatBins } from "./util";
import * as d3 from "d3";
import { HEIGHT, MARGIN, WIDTH } from "./constants";

export type Model = {
  style: "histogram";
  data: number[];
  xLabel: string;
  xUnit?: UnitType;
  myData?: number;
  yLabel?: string;
};

export function view({
  model,
  svg,
  onReturnToHeatmap,
}: {
  model: Model;
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  onReturnToHeatmap?: () => void | undefined;
}): { cleanup: () => void } {
  const thresholds = generateBinThresholds(model.data, model.xUnit);
  const binGenerator = d3
    .bin<number, number>()
    .domain(d3.extent(thresholds) as [number, number])
    .thresholds(thresholds);

  const bins: Bin[] = binGenerator(model.data);

  const x = d3
    .scaleBand()
    .domain(bins.map((_, i) => i.toString())) // scaleBand requires string domain
    .range([MARGIN.left, WIDTH - MARGIN.right])
    .padding(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (d) => d.length) || 0]) // handle possible undefined
    .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

  // Add back button in top right if this is a heatmap closeup
  if (onReturnToHeatmap) {
    const backButtonG = svg
      .append("g")
      .attr("class", "back-button")
      .style("cursor", "pointer")
      .on("click", (event) => {
        event.stopPropagation();
        onReturnToHeatmap();
      });

    // Back button background
    backButtonG
      .append("rect")
      .attr("x", WIDTH - 70)
      .attr("y", 10)
      .attr("width", 60)
      .attr("height", 25)
      .attr("fill", "white")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1)
      .attr("rx", 3);

    // Back button text
    backButtonG
      .append("text")
      .attr("x", WIDTH - 40)
      .attr("y", 27)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "steelblue")
      .text("← Back");
  }

  svg
    .selectAll("rect.bar")
    .data(bins)
    .join("rect")
    .attr("class", "bar")
    .attr("x", (_, i) => x(i.toString()) || 0) // handle possible undefined
    .attr("y", (d) => y(d.length))
    .attr("width", x.bandwidth())
    .attr("height", (d) => y(0) - y(d.length))
    .attr("fill", "steelblue")
    .attr("stroke", "white")
    .attr("stroke-width", 0.5);

  if (model.myData) {
    // Find which bin contains myData
    const myBinIndex = binGenerator([model.myData]).findIndex(
      (bin) => bin.length > 0,
    );

    if (myBinIndex !== -1) {
      svg
        .append("rect")
        .attr("class", "my-data-outline")
        .attr("x", x(myBinIndex.toString()) || 0)
        .attr("y", y(bins[myBinIndex].length))
        .attr("width", x.bandwidth())
        .attr("height", y(0) - y(bins[myBinIndex].length))
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
            tickFormatBins(parseInt(d), model.xUnit, thresholds),
          ),
      )
      .selectAll("text")
      .attr("transform", "rotate(12.5)")
      .style("text-anchor", "start");

  const yAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) =>
    g.attr("transform", `translate(${MARGIN.left},0)`).call(d3.axisLeft(y));

  svg.append("g").call(xAxis);
  svg.append("g").call(yAxis);

  // Add click-anywhere-to-return functionality if callback is provided (but not on bars or back button)
  if (onReturnToHeatmap) {
    svg.on("click", (event) => {
      // Only trigger return if clicking on the SVG background (not on bars or back button)
      const target = event.target as Element;
      if (target === svg.node()) {
        onReturnToHeatmap();
      }
    });
  }

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
    .text(model.yLabel || "Frequency");

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

  svg
    .selectAll("rect.bar")
    .on("mouseover", (event, data) => {
      const d = data as Bin | undefined;
      if (!d) {
        return;
      }
      const range = tickFormatBins(bins.indexOf(d), model.xUnit, thresholds);

      tooltip
        .style("visibility", "visible")
        .html(`Frequency: ${d.length}<br/>` + `${model.xLabel}: ${range}`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", () => {
      tooltip.style("visibility", "hidden");
    });

  // Return cleanup function
  return {
    cleanup: () => {
      svg.selectAll("*").remove();
      tooltip.remove();
    },
  };
}
