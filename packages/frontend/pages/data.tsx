import * as DCGView from "dcgview";
import { Dispatch } from "../types";
import { assertUnreachable } from "../util/utils";
import {
  PlotWithControlsController,
  PlotWithControlsView,
  PlotWithControlsMsg,
} from "../views/plot-with-controls";

import { Locale } from "../../iso/locale";
import { FacetString } from "../../iso/units";

export type Model = {
  plotWithControls: PlotWithControlsController;
  anthroFacets: Record<FacetString, number>; // TODO: Replace with actual facet data
};

export type Msg = {
  type: "PLOT_WITH_CONTROLS_MSG";
  msg: PlotWithControlsMsg;
};

export class DataController {
  state: Model;

  constructor(
    _userId: string | undefined,
    public context: { myDispatch: Dispatch<Msg>; locale: () => Locale },
  ) {
    const plotWithControls = new PlotWithControlsController({
      locale: this.context.locale,
      myDispatch: (msg: PlotWithControlsMsg) =>
        this.context.myDispatch({ type: "PLOT_WITH_CONTROLS_MSG", msg }),
    });

    this.state = {
      plotWithControls,
      anthroFacets: {}, // TODO: Load actual facet data from API
    };

    // TODO: Load initial anthro facets
    this.loadAnthroFacets();
  }

  private async loadAnthroFacets() {
    try {
      // TODO: Replace with actual API endpoint for anthro facets
      // For now, using placeholder data
      const placeholderFacets: Record<FacetString, number> = {
        "height;cm;170-175" as FacetString: 25,
        "height;cm;175-180" as FacetString: 42,
        "height;cm;180-185" as FacetString: 38,
        "weight;kg;60-70" as FacetString: 18,
        "weight;kg;70-80" as FacetString: 35,
        "weight;kg;80-90" as FacetString: 28,
        "years_climbing;years;1" as FacetString: 12,
        "years_climbing;years;2" as FacetString: 24,
        "years_climbing;years;3" as FacetString: 31,
      };

      this.state.anthroFacets = placeholderFacets;
    } catch (error) {
      console.error("Failed to load anthro facets:", error);
    }
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "PLOT_WITH_CONTROLS_MSG": {
        this.state.plotWithControls.handleDispatch(msg.msg);
        break;
      }

      default:
        assertUnreachable(msg.type);
    }
  }
}

export class DataView extends DCGView.View<{
  controller: () => DataController;
}> {
  template() {
    const stateProp = () => this.props.controller().state;

    return (
      <PlotWithControlsView
        controller={() => stateProp().plotWithControls}
        anthroFacets={() => stateProp().anthroFacets}
      />
    );
  }
}
