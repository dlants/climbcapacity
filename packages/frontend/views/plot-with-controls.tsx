import DCGView from "dcgview";
import { Dispatch } from "../types";
import { Locale } from "../../iso/locale";
import { FacetString } from "../../iso/units";
import { assertUnreachable } from "../util/utils";
import * as typestyle from "typestyle";
import {
  AnthroFilterController,
  AnthroFilterMsg,
  AnthroFilterView,
} from "./anthro/filter";

// Main PlotWithControls component
export type PlotWithControlsModel = {
  anthroFilter: AnthroFilterController;
  // TODO: Add output measure and input measure controllers
};

export type PlotWithControlsMsg = {
  type: "ANTHRO_FILTER_MSG";
  msg: AnthroFilterMsg;
};
// TODO: Add output measure and input measure message types

export class PlotWithControlsController {
  state: PlotWithControlsModel;

  constructor(
    public context: {
      myDispatch: Dispatch<PlotWithControlsMsg>;
      locale: () => Locale;
    },
  ) {
    const anthroFilter = new AnthroFilterController({
      locale: this.context.locale,
      myDispatch: (msg: AnthroFilterMsg) =>
        this.context.myDispatch({ type: "ANTHRO_FILTER_MSG", msg }),
    });

    this.state = {
      anthroFilter,
    };
  }

  handleDispatch(msg: PlotWithControlsMsg) {
    switch (msg.type) {
      case "ANTHRO_FILTER_MSG":
        this.state.anthroFilter.handleDispatch(msg.msg);
        break;

      default:
        assertUnreachable(msg.type);
    }
  }
}

export class PlotWithControlsView extends DCGView.View<{
  controller: () => PlotWithControlsController;
  anthroFacets: () => Record<FacetString, number>; // TODO: Replace with actual facet fetching
}> {
  template() {
    const controller = () => this.props.controller();
    const state = () => controller().state;

    return (
      <div class={DCGView.const(styles.plotWithControlsContainer)}>
        <div class={DCGView.const(styles.controlsPanel)}>
          <AnthroFilterView
            controller={() => state().anthroFilter}
            anthroFacets={() => this.props.anthroFacets()}
          />

          {/* TODO: Add output measure selector */}
          <div class={DCGView.const(styles.placeholder)}>
            <h4 class={DCGView.const(styles.sectionHeader)}>Output Measure</h4>
            <div>TODO: Output measure selector</div>
          </div>

          {/* TODO: Add input measure selector */}
          <div class={DCGView.const(styles.placeholder)}>
            <h4 class={DCGView.const(styles.sectionHeader)}>Input Measure</h4>
            <div>TODO: Input measure selector</div>
          </div>
        </div>

        <div class={DCGView.const(styles.plotArea)}>
          {/* TODO: Add actual plot/chart component */}
          <div class={DCGView.const(styles.placeholder)}>
            <h4>Plot Area</h4>
            <div>TODO: Implement chart/graph visualization</div>
          </div>
        </div>
      </div>
    );
  }
}

const styles = typestyle.stylesheet({
  plotWithControlsContainer: {
    display: "flex",
    height: "100vh",
    backgroundColor: "#f9f9f9",
  },

  controlsPanel: {
    width: "350px",
    borderRight: "1px solid #e0e0e0",
    backgroundColor: "white",
    overflowY: "auto",
    padding: "16px",
    $nest: {
      "@media (max-width: 1200px)": {
        width: "300px",
      },
      "@media (max-width: 800px)": {
        width: "100%",
        height: "50vh",
        borderRight: "none",
        borderBottom: "1px solid #e0e0e0",
      },
    },
  },

  plotArea: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    margin: "16px",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },

  sectionHeader: {
    margin: "0 0 12px 0",
    fontSize: "16px",
    fontWeight: "bold",
    color: "#333",
    borderBottom: "2px solid #4CAF50",
    paddingBottom: "4px",
  },

  placeholder: {
    padding: "16px",
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    backgroundColor: "#f5f5f5",
    border: "1px dashed #ccc",
    borderRadius: "4px",
    margin: "8px 0",
  },
});
