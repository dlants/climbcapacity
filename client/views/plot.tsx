import React from "react";
import { View } from "../tea";
import * as d3 from "d3";
import { useEffect, useRef } from "react";
import { assertUnreachable } from "../util/utils";
import * as immer from "immer";
import * as Histogram from "./plots/histogram";
import * as Dotplot from "./plots/dotplot";
import * as Heatmap from "./plots/heatmap";

export type Model = immer.Immutable<
  Histogram.Model | Dotplot.Model | Heatmap.Model
>;

export const view: View<never, Model> = ({ model }) => {
  const containerRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const svg = d3.select(containerRef.current);
    switch (model.style) {
      case "histogram":
        Histogram.view({ model, svg });
        break;

      case "dotplot":
        Dotplot.view({ model, svg });
        break;

      case "heatmap":
        Heatmap.view({ model, svg });
        break;

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
      height="400"
    ></svg>
  );
};
