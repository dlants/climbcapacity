import React from "react";
import { View } from "../tea";
import * as Plot from "@observablehq/plot";
import { useEffect, useRef } from "react";
import { assertUnreachable } from "../util/utils";
import * as immer from "immer";

export type Model = immer.Immutable<
  | {
      style: "histogram";
      data: number[];
      xLabel: string;
      myData?: number;
    }
  | {
      style: "dotplot";
      data: { x: number; y: number }[];
      xLabel: string;
      yLabel: string;
      myData?: { x: number; y: number };
    }
  | {
      style: "heatmap";
      data: { x: number; y: number }[];
      xLabel: string;
      yLabel: string;
      myData?: { x: number; y: number };
    }
>;

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
          x: { label: model.xLabel },
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
          x: { label: model.xLabel },
          y: { label: model.yLabel },
        });
        break;
      }
      case "heatmap": {
        plot = Plot.plot({
          color: {
            type: "linear",
            range: ["white", "blue"],
            legend: true,
          },
          marks: [
            Plot.rect(model.data, {
              ...Plot.bin(
                {
                  fill: "count",
                },
                {
                  x: "x",
                  y: "y",
                },
              ),
              tip: true,
            }),

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
