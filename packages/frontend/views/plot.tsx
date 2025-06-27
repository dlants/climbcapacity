import * as DCGView from "dcgview";
import * as d3 from "d3";
import { assertUnreachable } from "../util/utils";
import * as Histogram from "./plots/histogram";
import * as Dotplot from "./plots/dotplot";
import * as Heatmap from "./plots/heatmap";

export type Model = Histogram.Model | Dotplot.Model | Heatmap.Model;

export class Plot extends DCGView.View<{
  initialModel: Model;
}> {
  state: Model;
  svgElement: SVGSVGElement | null = null;

  init() {
    this.state = this.props.initialModel();
  }

  template() {
    return (
      <div class="plot-container"
        didMount={this.divDidMount.bind(this)}
        willUnmount={this.divWillUnmount.bind(this)}
      ></div>
    );
  }

  divDidMount(el: HTMLDivElement) {
    // Create SVG element
    this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgElement.setAttribute('width', '100%');
    this.svgElement.setAttribute('height', '100%');
    this.svgElement.setAttribute('viewBox', '0 0 600 400');
    this.svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    el.appendChild(this.svgElement);
    this.renderPlot();
  }

  divWillUnmount() {
    // Clean up references when the specific div element is unmounted
    this.svgElement = null;
  }

  renderPlot() {
    if (!this.svgElement) return;

    const svg = d3.select(this.svgElement);
    // Clear previous content
    svg.selectAll("*").remove();

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
  }

  didUpdate() {
    // Re-render the plot when the component updates
    this.renderPlot();
  }
}
