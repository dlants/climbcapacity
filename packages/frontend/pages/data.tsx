import * as DCGView from "dcgview";
import { Dispatch } from "../types";
import { assertUnreachable } from "../util/utils";
import {
  PlotWithControlsController,
  PlotWithControlsView,
  PlotWithControlsMsg,
} from "../views/plot-with-controls";

import { Locale } from "../../iso/locale";

export type Model = {
  plotWithControls: PlotWithControlsController;
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
    };
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
      <PlotWithControlsView controller={() => stateProp().plotWithControls} />
    );
  }
}
