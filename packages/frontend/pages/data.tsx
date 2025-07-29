import * as DCGView from "dcgview";
import { Dispatch } from "../types";
import { assertUnreachable } from "../util/utils";
import {
  ReportCardMainController,
  ReportCardMainView,
  Msg as ReportCardMsg,
} from "../views/reportcard/main";
import { MeasureStats } from "../../iso/protocol";
import { InitialFilters } from "../views/edit-query";
import { MEASURES } from "../../iso/measures";
import { Locale } from "../../iso/locale";
import { selectInitialFilter } from "../../iso/units";
import { Snapshot } from "../types";
import { hydrateSnapshot } from "../util/snapshot";

export type Model = {
  measureStats: MeasureStats;
  reportCardMain: ReportCardMainController;
};

export type Msg = {
  type: "REPORT_CARD_MSG";
  msg: ReportCardMsg;
};

export class DataController {
  state: Model;

  constructor(
    userId: string | undefined,
    measureStats: MeasureStats,
    public context: { myDispatch: Dispatch<Msg>; locale: () => Locale },
  ) {
    const initialFilters: InitialFilters = {};
    for (const measure of MEASURES.filter((s) => s.type == "anthro")) {
      const count = measureStats[measure.id] || 0;
      if (count < 100) {
        continue;
      }
      initialFilters[measure.id] = selectInitialFilter(
        measure.initialFilter,
        context.locale(),
      );
    }

    // Initialize with undefined snapshot for now - will be loaded if userId is provided
    const reportCardMain = new ReportCardMainController(
      {
        initialFilters,
        measureStats,
        mySnapshot: undefined,
      },
      {
        locale: this.context.locale,
        myDispatch: (msg: ReportCardMsg) =>
          this.context.myDispatch({ type: "REPORT_CARD_MSG", msg }),
      },
    );

    this.state = {
      measureStats: measureStats,
      reportCardMain,
    };

    // Load user snapshot if userId is provided
    if (userId) {
      this.loadUserSnapshot(userId);
    }
  }

  private async loadUserSnapshot(_userId: string) {
    try {
      const response = await fetch("/api/my-snapshots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const snapshots = (await response.json()) as Snapshot[];
        const latestSnapshot = snapshots.length > 0 ? snapshots[0] : undefined;

        // Recreate the ReportCardMainController with the user's snapshot
        if (latestSnapshot) {
          const initialFilters: InitialFilters = {};
          for (const measure of MEASURES.filter((s) => s.type == "anthro")) {
            const count = this.state.measureStats[measure.id] || 0;
            if (count < 100) {
              continue;
            }
            initialFilters[measure.id] = selectInitialFilter(
              measure.initialFilter,
              this.context.locale(),
            );
          }

          this.state.reportCardMain = new ReportCardMainController(
            {
              initialFilters,
              measureStats: this.state.measureStats,
              mySnapshot: hydrateSnapshot(latestSnapshot),
            },
            {
              locale: this.context.locale,
              myDispatch: (msg: ReportCardMsg) =>
                this.context.myDispatch({ type: "REPORT_CARD_MSG", msg }),
            },
          );
        }
      }
    } catch (error) {
      console.error("Failed to load user snapshot:", error);
    }
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

export class DataView extends DCGView.View<{
  controller: () => DataController;
}> {
  template() {
    const stateProp = () => this.props.controller().state;

    return <ReportCardMainView controller={() => stateProp().reportCardMain} />;
  }
}
