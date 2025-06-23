import React from "react";
import { Dispatch } from "../main";
import * as d3 from "d3";
import { useEffect, useRef } from "react";
import { assertUnreachable } from "../util/utils";
import * as Histogram from "./plots/histogram";
import * as Dotplot from "./plots/dotplot";
import * as Heatmap from "./plots/heatmap";

export type Model = Histogram.Model | Dotplot.Model | Heatmap.Model;

export type Msg = never;

export class Plot {
  state: Model;

  constructor(
    initialModel: Model,
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    this.state = initialModel;
  }

  update(msg: Msg) {
    // No messages are currently handled by this component
    // This method is kept for consistency with the class-based pattern
  }

  view() {
    const PlotComponent = () => {
      const containerRef = useRef<SVGSVGElement>(null);

      useEffect(() => {
        if (!containerRef.current) return;
        const svg = d3.select(containerRef.current);
        switch (this.state.style) {
          case "histogram":
            Histogram.view({ model: this.state, svg });
            break;

          case "dotplot":
            Dotplot.view({ model: this.state, svg });
            break;

          case "heatmap":
            Heatmap.view({ model: this.state, svg });
            break;

          default:
            assertUnreachable(this.state);
        }
        return () => {
          if (containerRef.current) {
            d3.select(containerRef.current).selectAll("*").remove();
          }
        };
      }, [this.state]);

      return (
        <svg
          className="plot-container"
          ref={containerRef}
          width="100%"
          height="100%"
          viewBox="0 0 600 400"
          preserveAspectRatio="xMidYMid meet"
        ></svg>
      );
    };

    return <PlotComponent />;
  }
}
