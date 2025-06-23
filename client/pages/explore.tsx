import { Dispatch } from "../tea";
import { assertUnreachable } from "../util/utils";
import { ReportCardMain, Msg as ReportCardMsg } from "../views/reportcard/main";
import { MeasureStats } from "../../iso/protocol";
import { InitialFilters } from "../views/edit-query";
import { MEASURES } from "../constants";

export type Model = {
  measureStats: MeasureStats;
  reportCardMain: ReportCardMain;
};

export type Msg = {
  type: "REPORT_CARD_MSG";
  msg: ReportCardMsg;
};

export class Explore {
  state: Model;

  constructor(
    initialParams: { measureStats: MeasureStats },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    const initialFilters: InitialFilters = {};
    for (const measure of MEASURES.filter((s) => s.type == "anthro")) {
      const count = initialParams.measureStats[measure.id] || 0;
      if (count < 100) {
        continue;
      }
      initialFilters[measure.id] = measure.initialFilter;
    }

    const reportCardMain = new ReportCardMain(
      {
        initialFilters,
        measureStats: initialParams.measureStats,
        mySnapshot: undefined,
      },
      { myDispatch: (msg) => this.context.myDispatch({ type: "REPORT_CARD_MSG", msg }) }
    );

    this.state = {
      measureStats: initialParams.measureStats,
      reportCardMain,
    };
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "REPORT_CARD_MSG": {
        this.state.reportCardMain.update(msg.msg);
        break;
      }

      default:
        assertUnreachable(msg.type);
    }
  }

  view() {
    return this.state.reportCardMain.view();
  }
}
