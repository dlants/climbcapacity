import * as DCGView from "dcgview";
import { Dispatch } from "../types";
import { assertUnreachable } from "../util/utils";
import { ReportCardMainController, ReportCardMainView, Msg as ReportCardMsg } from "../views/reportcard/main";
import { MeasureStats } from "../../iso/protocol";
import { InitialFilters } from "../views/edit-query";
import { MEASURES } from "../constants";

export type Model = {
  measureStats: MeasureStats;
  reportCardMain: ReportCardMainController;
};

export type Msg = {
  type: "REPORT_CARD_MSG";
  msg: ReportCardMsg;
};

export class ExploreController {
  state: Model;

  constructor(
    measureStats: MeasureStats,
    public myDispatch: Dispatch<Msg>
  ) {
    const initialFilters: InitialFilters = {};
    for (const measure of MEASURES.filter((s) => s.type == "anthro")) {
      const count = measureStats[measure.id] || 0;
      if (count < 100) {
        continue;
      }
      initialFilters[measure.id] = measure.initialFilter;
    }

    const reportCardMain = new ReportCardMainController({
      initialFilters,
      measureStats,
      mySnapshot: undefined,
    },
      { myDispatch: (msg: ReportCardMsg) => this.myDispatch({ type: "REPORT_CARD_MSG", msg }) }
    );

    this.state = {
      measureStats: measureStats,
      reportCardMain,
    };
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "REPORT_CARD_MSG": {
        this.state.reportCardMain.handleDispatch(msg.msg);
        break;
      }

      default:
        assertUnreachable(msg.type);
    }
  }
}

export class ExploreView extends DCGView.View<{
  controller: () => ExploreController;
}> {
  template() {
    const stateProp = () => this.props.controller().state;

    return (
      <ReportCardMainView controller={() => stateProp().reportCardMain} />
    );
  }
}

