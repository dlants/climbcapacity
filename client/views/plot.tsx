import React from "react";
import { View } from "../tea";
import * as Plot from "@observablehq/plot";
import { useEffect, useRef } from "react";
import { assertUnreachable } from "../util/utils";
import * as immer from "immer";
import { UnitType } from "../../iso/units";
import lodash from "lodash";
import { EWBANK, FONT, FRENCH_SPORT, VGRADE, YDS } from "../../iso/grade";

export type Model = immer.Immutable<
  | {
      style: "histogram";
      data: number[];
      xLabel: string;
      xUnit?: UnitType;
      myData?: number[];
    }
  | {
      style: "dotplot";
      data: { x: number; y: number }[];
      xLabel: string;
      xUnit?: UnitType;
      yLabel: string;
      yUnit?: UnitType;
      myData?: { x: number; y: number }[];
    }
  | {
      style: "heatmap";
      data: { x: number; y: number }[];
      xLabel: string;
      xUnit?: UnitType;
      yLabel: string;
      yUnit?: UnitType;
      myData?: { x: number; y: number }[];
    }
>;

function generateTicks(unit: UnitType | undefined): Plot.ScaleOptions {
  if (!unit) {
    return {};
  }

  switch (unit) {
    case "second":
    case "year":
    case "lb":
    case "kg":
    case "m":
    case "cm":
    case "mm":
    case "count":
      return {};
    case "inches":
      return {
        tickFormat: (d) => {
          const feet = Math.floor(d / 12);
          const inches = Math.floor(d % 12);
          return inches === 0 ? `${feet}'` : `${feet}'${inches}"`;
        },
      };
    case "ircra":
      return {};
    case "sex-at-birth":
      return {
        ticks: [0, 1],
        tickFormat: (d) => ["female", "male"][d],
      };
    case "vermin":
      return {
        ticks: VGRADE.map((d) => d + 0.5),
        tickFormat: (d) => `V${Math.floor(d)}`,
      };
    case "font":
      return {
        ticks: lodash.range(FONT.length).map((d) => d + 0.5),
        tickFormat: (d) => FONT[Math.floor(d)],
      };
    case "frenchsport":
      return {
        ticks: lodash.range(FRENCH_SPORT.length).map((d) => d + 0.5),
        tickFormat: (d) => FRENCH_SPORT[Math.floor(d)],
      };
    case "yds":
      return {
        ticks: lodash.range(YDS.length).map((d) => d + 0.5),
        tickFormat: (d) => YDS[Math.floor(d)],
      };
    case "ewbank":
      return {
        ticks: lodash.range(EWBANK.length).map((d) => d + 0.5),
        tickFormat: (d) => EWBANK[Math.floor(d)],
      };
    default:
      assertUnreachable(unit);
  }
}

export const view: View<never, Model> = ({ model }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let plot;
    switch (model.style) {
      case "histogram": {
        plot = Plot.plot({
          marks: [
            Plot.rectY(model.data, { ...Plot.binX({ y: "count" }), tip: true }),
            // Add vertical line for myData if present
            ...(model.myData
              ? [
                  Plot.ruleX([model.myData], {
                    stroke: "orange",
                    strokeWidth: 2,
                  }),
                ]
              : []),
          ],
          x: { label: model.xLabel, ...generateTicks(model.xUnit) },
        });
        break;
      }

      case "dotplot": {
        plot = Plot.plot({
          marks: [
            Plot.dot(model.data, { x: "x", y: "y", tip: true }),
            // Add highlighted point for myData if present
            ...(model.myData
              ? [
                  Plot.dot([model.myData], {
                    x: "x",
                    y: "y",
                    fill: "orange",
                    r: 5,
                  }),
                ]
              : []),
          ],
          x: { label: model.xLabel, ...generateTicks(model.xUnit) },
          y: { label: model.yLabel, ...generateTicks(model.yUnit) },
        });
        break;
      }

      case "heatmap": {
        const bin: Plot.RectOptions = Plot.bin(
          {
            fill: "count",
          },
          {
            x: "x",
            y: "y",
          },
        );
        bin.tip = true;

        plot = Plot.plot({
          color: {
            type: "linear",
            range: ["white", "blue"],
            legend: true,
          },
          marks: [
            Plot.rect(model.data, bin),
            // Add point for myData if present
            ...(model.myData
              ? [
                  Plot.dot([model.myData], {
                    x: "x",
                    y: "y",
                    fill: "orange",
                    r: 5,
                  }),
                ]
              : []),
          ],
          x: { label: model.xLabel, ...generateTicks(model.xUnit) },
          y: { label: model.yLabel, ...generateTicks(model.yUnit) },
        });
        break;
      }

      default:
        assertUnreachable(model);
    }
    containerRef.current.append(plot);
    return () => plot.remove();
  }, [model]);

  return <div className="plot-container" ref={containerRef}></div>;
};
