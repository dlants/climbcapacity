import { UnitType } from "../../../iso/units";
import lodash from "lodash";
import { assertUnreachable } from "../../util/utils";
import { displayInches, Point } from "./util";
import * as d3 from "d3";
import * as immer from "immer";
import { HEIGHT, MARGIN, WIDTH } from "./constants";
import { EWBANK, FONT, FRENCH_SPORT, VGRADE, YDS } from "../../../iso/grade";

export type Model = immer.Immutable<{
  style: "dotplot";
  data: Point[];
  xLabel: string;
  xUnit?: UnitType;
  yLabel: string;
  yUnit?: UnitType;
  myData?: { x: number; y: number };
}>;

export function generateDotplotTicks(
  data: readonly number[],
  unit: UnitType | undefined,
): number[] | null {
  if (data.length == 0) {
    return [0, 1];
  }

  const min = lodash.min(data)!;
  const max = lodash.max(data)!;

  if (!unit) {
    return null;
  }

  switch (unit) {
    case "second":
    case "kg":
    case "kg/s":
    case "lb":
    case "lb/s":
    case "m":
    case "cm":
    case "mm":
    case "inch":
    case "month":
    case "sex-at-birth":
    case "year":
    case "count":
    case "strengthtoweightratio":
      return null;
    case "training":
      return [1, 2, 3, 4];
    case "vermin":
    case "font":
    case "frenchsport":
    case "yds":
    case "ewbank":
    case "ircra":
      return lodash.range(min, max + 1);
    default:
      assertUnreachable(unit);
  }
}

export function view({
  model,
  svg,
}: {
  model: Model;
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
}) {
  const allData = [...model.data];
  if (model.myData) {
    allData.push(model.myData);
  }
  if (allData.length == 0) {
    return;
  }

  const x = d3
    .scaleLinear()
    .domain(d3.extent(allData, (d) => d.x) as [number, number])
    .range([MARGIN.left, WIDTH - MARGIN.right]);

  const y = d3
    .scaleLinear()
    .domain(d3.extent(allData, (d) => d.y) as [number, number])
    .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

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

  const xAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) => {
    const axis = d3
      .axisBottom(x)
      .tickFormat((d) => formatTicks(d as number, model.xUnit));
    const tickValues = generateDotplotTicks(
      model.data.map((pt) => pt.x),
      model.xUnit,
    );

    if (tickValues) {
      axis.tickValues();
    }

    return g
      .attr("transform", `translate(0,${HEIGHT - MARGIN.bottom})`)
      .call(axis);
  };

  const yAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) => {
    const axis = d3
      .axisLeft(y)
      .tickFormat((d) => formatTicks(d as number, model.yUnit));
    const tickValues = generateDotplotTicks(
      model.data.map((pt) => pt.y),
      model.yUnit,
    );

    if (tickValues) {
      axis.tickValues(tickValues);
    }

    return g.attr("transform", `translate(${MARGIN.left},0)`).call(axis);
  };

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
}

const fmt = new Intl.NumberFormat("en", {
  maximumFractionDigits: 2,
});

export function formatTicks(value: number, unit: UnitType | undefined): string {
  if (!unit) {
    return fmt.format(value);
  }

  switch (unit) {
    case "second":
    case "lb":
    case "lb/s":
    case "kg":
    case "kg/s":
    case "m":
    case "cm":
    case "mm":
    case "month":
    case "year":
    case "training":
    case "strengthtoweightratio":
    case "count": {
      return fmt.format(value);
    }
    case "inch": {
      return displayInches(value);
    }
    case "ircra":
      return value.toString();

    case "sex-at-birth":
      return ["female", "male"][value];
    case "vermin":
      return `V${VGRADE[Math.ceil(value)]}`;
    case "font":
      return FONT[Math.ceil(value)];
    case "frenchsport":
      return FRENCH_SPORT[Math.ceil(value)];
    case "yds":
      return YDS[Math.ceil(value)];
    case "ewbank":
      return EWBANK[Math.ceil(value)].toString();
    default:
      assertUnreachable(unit);
  }
}
