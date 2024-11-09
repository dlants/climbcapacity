import React from "react";
import { View } from "../tea";
import * as d3 from "d3";
import { useEffect, useRef } from "react";
import { assertUnreachable } from "../util/utils";
import * as immer from "immer";
import { UnitType } from "../../iso/units";
import lodash from "lodash";
import { EWBANK, FONT, FRENCH_SPORT, YDS } from "../../iso/grade";

export type Point = { x: number; y: number };

export type Model = immer.Immutable<
  | {
      style: "histogram";
      data: number[];
      xLabel: string;
      xUnit?: UnitType;
      myData?: number;
    }
  | {
      style: "dotplot";
      data: Point[];
      xLabel: string;
      xUnit?: UnitType;
      yLabel: string;
      yUnit?: UnitType;
      myData?: { x: number; y: number };
    }
  | {
      style: "heatmap";
      data: Point[];
      xLabel: string;
      xUnit?: UnitType;
      yLabel: string;
      yUnit?: UnitType;
      myData?: { x: number; y: number };
    }
>;

const fmt = new Intl.NumberFormat("en", {
  maximumFractionDigits: 2,
});

function tickFormat(
  binIndex: number,
  unit: UnitType | undefined,
  thresholds: number[],
): string {
  if (!unit) {
    return fmt.format(binIndex);
  }

  switch (unit) {
    case "second":
    case "lb":
    case "kg":
    case "m":
    case "cm":
    case "mm":
    case "month":
    case "year":
    case "count": {
      const min = thresholds[binIndex];
      const max = thresholds[binIndex + 1];
      return max ? `${fmt.format(min)}-${fmt.format(max)}` : ``;
    }
    case "inches": {
      const min = thresholds[binIndex];
      const max = thresholds[binIndex + 1];
      return max ? `${displayInches(min)}-${displayInches(max)}` : ``;
    }
    case "ircra":
      return binIndex.toString();
    case "sex-at-birth":
      return ["female", "male"][binIndex];
    case "vermin":
      return `V${Math.ceil(thresholds[binIndex])}`;
    case "font":
      return FONT[Math.ceil(thresholds[binIndex])];
    case "frenchsport":
      return FRENCH_SPORT[Math.ceil(thresholds[binIndex])];
    case "yds":
      return YDS[Math.ceil(thresholds[binIndex])];
    case "ewbank":
      return EWBANK[Math.ceil(thresholds[binIndex])].toString();
    default:
      assertUnreachable(unit);
  }
}

function displayInches(value: number) {
  const feet = Math.floor(value / 12);
  const inches = value % 12;
  if (feet == 0) {
    return fmt.format(inches) + '"';
  }
  return inches === 0
    ? `${fmt.format(feet)}'`
    : `${fmt.format(feet)}'${fmt.format(inches)}"`;
}

function generateBinThresholds(
  data: readonly number[],
  unit: UnitType | undefined,
): number[] {
  if (data.length == 0) {
    return [0, 1];
  }

  const min = lodash.min(data)!;
  const max = lodash.max(data)!;

  // by default split up the min/max range into bins of 10
  const defaultThresholds = lodash
    .range(11)
    .map((d) => min + ((max - min) * d) / 10);

  if (!unit) {
    return defaultThresholds;
  }

  switch (unit) {
    case "second":
    case "lb":
    case "kg":
    case "m":
    case "cm":
    case "mm":
    case "inches":
    case "month":
    case "sex-at-birth":
    case "count":
      return defaultThresholds;
    case "year":
      return [0.5, 1.5, 2.5, 3.5, 6, 8, 10, 15, Number.POSITIVE_INFINITY];
    case "vermin":
    case "font":
    case "frenchsport":
    case "yds":
    case "ewbank":
    case "ircra":
      return lodash.range(min, max + 1).map((d) => d - 0.5);
    default:
      assertUnreachable(unit);
  }
}

interface Bin extends d3.Bin<number, number> {
  x0: number | undefined;
  x1: number | undefined;
}

interface Bin2D extends d3.Bin<Point, number> {
  frequency: number;
  row: number;
  col: number;
}

export const view: View<never, Model> = ({ model }) => {
  const containerRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const svg = d3.select(containerRef.current);
    const width = 600;
    const height = 400;
    const margin = { top: 10, right: 10, bottom: 40, left: 50 };

    switch (model.style) {
      case "histogram": {
        const thresholds = generateBinThresholds(model.data, model.xUnit);
        const binGenerator = d3
          .bin<number, number>()
          .domain(d3.extent(thresholds) as [number, number])
          .thresholds(thresholds);

        const bins: Bin[] = binGenerator(model.data);

        const x = d3
          .scaleBand()
          .domain(bins.map((_, i) => i.toString())) // scaleBand requires string domain
          .range([margin.left, width - margin.right])
          .padding(0.1);

        const y = d3
          .scaleLinear()
          .domain([0, d3.max(bins, (d) => d.length) || 0]) // handle possible undefined
          .range([height - margin.bottom, margin.top]);

        svg
          .selectAll("rect")
          .data(bins)
          .join("rect")
          .attr("x", (_, i) => x(i.toString()) || 0) // handle possible undefined
          .attr("y", (d) => y(d.length))
          .attr("width", x.bandwidth())
          .attr("height", (d) => y(0) - y(d.length))
          .attr("fill", "blue");

        if (model.myData) {
          // Find which bin contains myData
          const myBinIndex = binGenerator([model.myData]).findIndex(
            (bin) => bin.length > 0,
          );

          if (myBinIndex !== -1) {
            svg
              .append("rect")
              .attr("x", x(myBinIndex.toString()) || 0)
              .attr("y", y(bins[myBinIndex].length))
              .attr("width", x.bandwidth())
              .attr("height", y(0) - y(bins[myBinIndex].length))
              .attr("fill", "none")
              .attr("stroke", "orange")
              .attr("stroke-width", 2);
          }
        }

        const xAxis = (
          g: d3.Selection<SVGGElement, unknown, null, undefined>,
        ) =>
          g
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(
              d3
                .axisBottom(x)
                .tickFormat((d) =>
                  tickFormat(parseInt(d), model.xUnit, thresholds),
                ),
            )
            .selectAll("text")
            .attr("transform", "rotate(12.5)")
            .style("text-anchor", "start");

        const yAxis = (
          g: d3.Selection<SVGGElement, unknown, null, undefined>,
        ) =>
          g
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y));

        svg.append("g").call(xAxis);
        svg.append("g").call(yAxis);

        svg
          .append("text")
          .attr("x", width / 2)
          .attr("y", height - 5)
          .attr("text-anchor", "middle")
          .text(model.xLabel + (model.xUnit ? ` (${model.xUnit})` : ""));

        svg
          .append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -height / 2)
          .attr("y", 15)
          .attr("text-anchor", "middle")
          .text("Frequency");

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
          .selectAll("rect")
          .on("mouseover", (event, data) => {
            const d = data as Bin | undefined;
            if (!d) {
              return;
            }
            const range = tickFormat(bins.indexOf(d), model.xUnit, thresholds);

            tooltip
              .style("visibility", "visible")
              .html(`Count: ${d.length}<br/>` + `${model.xLabel}: ${range}`)
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY - 10 + "px");
          })
          .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
          });

        break;
      }

      case "dotplot": {
        const x = d3
          .scaleLinear()
          .domain(d3.extent(model.data, (d) => d.x) as [number, number])
          .range([margin.left, width - margin.right]);

        const y = d3
          .scaleLinear()
          .domain(d3.extent(model.data, (d) => d.y) as [number, number])
          .range([height - margin.bottom, margin.top]);

        // Draw dots
        svg
          .selectAll("circle")
          .data(model.data)
          .join("circle")
          .attr("cx", (d) => x(d.x))
          .attr("cy", (d) => y(d.y))
          .attr("r", 3)
          .attr("fill", "steelblue");

        // Draw myData point if it exists
        if (model.myData) {
          svg
            .append("circle")
            .attr("cx", x(model.myData.x))
            .attr("cy", y(model.myData.y))
            .attr("r", 5)
            .attr("fill", "orange");
        }

        const xAxis = (
          g: d3.Selection<SVGGElement, unknown, null, undefined>,
        ) =>
          g
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x));

        const yAxis = (
          g: d3.Selection<SVGGElement, unknown, null, undefined>,
        ) =>
          g
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y));

        svg.append("g").call(xAxis);
        svg.append("g").call(yAxis);

        svg
          .append("text")
          .attr("x", width / 2)
          .attr("y", height - 5)
          .attr("text-anchor", "middle")
          .text(model.xLabel + (model.xUnit ? ` (${model.xUnit})` : ""));

        svg
          .append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -height / 2)
          .attr("y", 15)
          .attr("text-anchor", "middle")
          .text(model.yLabel + (model.yUnit ? ` (${model.yUnit})` : ""));

        break;
      }

      case "heatmap": {
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
          .range([margin.left, width - margin.right]);

        const y = d3
          .scaleBand()
          .domain(lodash.range(bins2D.length).map((d) => d.toString()))
          .range([height - margin.bottom, margin.top]);

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
        const xAxis = (
          g: d3.Selection<SVGGElement, unknown, null, undefined>,
        ) =>
          g
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(
              d3
                .axisBottom(x)
                .tickFormat((d) =>
                  tickFormat(parseFloat(d), model.xUnit, xThresholds),
                ),
            );

        const yAxis = (
          g: d3.Selection<SVGGElement, unknown, null, undefined>,
        ) =>
          g
            .attr("transform", `translate(${margin.left},0)`)
            .call(
              d3
                .axisLeft(y)
                .tickFormat((d) =>
                  tickFormat(parseFloat(d), model.yUnit, yThresholds),
                ),
            );

        svg.append("g").call(xAxis);
        svg.append("g").call(yAxis);

        svg
          .append("text")
          .attr("x", width / 2)
          .attr("y", height - 5)
          .attr("text-anchor", "middle")
          .text(model.xLabel + (model.xUnit ? ` (${model.xUnit})` : ""));

        svg
          .append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -height / 2)
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
            const xRange = tickFormat(d.col, model.xUnit, xThresholds);
            const yRange = tickFormat(d.row, model.yUnit, yThresholds);

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

        break;
      }

      default:
        assertUnreachable(model);
    }
    return () => {
      svg.selectAll("*").remove();
      d3.selectAll(".tooltip").remove();
    };
  }, [model]);

  return (
    <svg
      className="plot-container"
      ref={containerRef}
      width="600"
      height="600"
    ></svg>
  );
};
