import DCGView from "dcgview";
import type { HydratedSnapshot, Snapshot } from "../../types";
import { Dispatch } from "../../types";
import {
  assertUnreachable,
  RequestStatus,
} from "../../util/utils";
import { SnapshotQuery, MeasureStats } from "../../../iso/protocol";
import { EditQueryController, EditQueryView } from "../../views/edit-query";
import { PlotListController, PlotListView, Msg as PlotListMsg } from "./plot-list";
import { hydrateSnapshot } from "../../util/snapshot";
import { SelectMeasureClassController, SelectMeasureClassView } from "../snapshot/select-measure-class";
import { UnitToggleController, UnitToggleView } from "../unit-toggle";
import * as typestyle from "typestyle";
import * as csstips from "csstips";
import * as csx from "csx";
import { MEASURES } from "../../constants";
import { boulderGradeClass, sportGradeClass } from "../../../iso/measures/grades";
import { getSpec } from "../../../iso/measures";

export type Model = {
  filtersModel: EditQueryController;
  outputMeasure: {
    selector: SelectMeasureClassController;
    toggle: UnitToggleController;
  };
  measureStats: MeasureStats;
  query: {
    body: SnapshotQuery;
    hash: string;
  };
  mySnapshot?: HydratedSnapshot;
  dataRequest: RequestStatus<
    {
      snapshots: HydratedSnapshot[];
      reportCardModel: PlotListController;
    },
    { queryHash: string }
  >;
};

export type Msg =
  | {
    type: "REQUEST_DATA";
  }
  | {
    type: "SNAPSHOT_RESPONSE";
    request: RequestStatus<HydratedSnapshot[], { queryHash: string }>;
  }
  | {
    type: "REPORT_CARD_MSG";
    msg: import("./plot-list").Msg;
  }
  | {
    type: "SELECT_MEASURE_CLASS_MSG";
    msg: import("../snapshot/select-measure-class").Msg;
  }
  | {
    type: "OUTPUT_MEASURE_TOGGLE_MSG";
    msg: import("../unit-toggle").Msg;
  }
  | {
    type: "FILTERS_MSG";
    msg: import("../../views/edit-query").Msg;
  };

export class ReportCardMainController {
  state: Model;

  constructor(
    {
      initialFilters,
      measureStats,
      mySnapshot,
    }: {
      initialFilters: import("../../views/edit-query").InitialFilters;
      measureStats: MeasureStats;
      mySnapshot?: HydratedSnapshot;
    },
    public context: { myDispatch: Dispatch<Msg> }
  ) {
    const filtersModel = new EditQueryController(
      {
        initialFilters,
        measureStats,
      },
      (msg: import("../../views/edit-query").Msg) => this.context.myDispatch({ type: "FILTERS_MSG", msg })
    );
    const query = this.getQuery(filtersModel);

    const performanceMeasure = MEASURES.find(
      (s) => s.id == "grade-boulder:gym:max",
    );
    if (!performanceMeasure) {
      throw new Error(`No performance measures found`);
    }

    let initialMeasure = {
      measureId: performanceMeasure.id,
      unit: performanceMeasure.units[0],
      possibleUnits: performanceMeasure.units,
    };

    if (mySnapshot) {
      const performanceMeasure = MEASURES.find(
        (m) => m.type == "performance" && mySnapshot.measures[m.id],
      );

      if (performanceMeasure) {
        initialMeasure = {
          measureId: performanceMeasure.id,
          unit: mySnapshot.measures[performanceMeasure.id].unit,
          possibleUnits: performanceMeasure.units,
        };
      }
    }

    const outputMeasure: Model["outputMeasure"] = {
      selector: new SelectMeasureClassController(
        {
          measureClasses: [boulderGradeClass, sportGradeClass],
          measureStats,
          measureId: initialMeasure.measureId,
        },
        { myDispatch: (msg: import("../snapshot/select-measure-class").Msg) => this.context.myDispatch({ type: "SELECT_MEASURE_CLASS_MSG", msg }) }
      ),

      toggle: new UnitToggleController(
        {
          measureId: initialMeasure.measureId,
          selectedUnit: initialMeasure.unit,
          possibleUnits: initialMeasure.possibleUnits,
        },
        { myDispatch: (msg: import("../unit-toggle").Msg) => this.context.myDispatch({ type: "OUTPUT_MEASURE_TOGGLE_MSG", msg }) }
      ),
    };

    this.state = {
      filtersModel,
      measureStats,
      outputMeasure,
      mySnapshot,
      query,
      dataRequest: { status: "loading", queryHash: query.hash },
    };

    // Execute initial data fetch
    this.fetchData().catch(console.error);
  }

  private getQuery(editQuery: EditQueryController): { body: SnapshotQuery; hash: string } {
    const query: SnapshotQuery = {
      datasets: {},
      measures: {},
    };
    const queryHashParts: string[] = [];

    editQuery.state.filters.forEach((filter) => {
      const measureId = editQuery.getFilterMeasureId(filter);
      query.measures[measureId] = editQuery.getFilterQuery(filter);
      queryHashParts.push(
        measureId + ":" + JSON.stringify(query.measures[measureId])
      );
    });

    for (const dataset in editQuery.state.datasets) {
      query.datasets[dataset] = editQuery.state.datasets[dataset];
      queryHashParts.push(`dataset:${editQuery.state.datasets[dataset]}`);
    }

    return {
      body: query,
      hash: queryHashParts.join(","),
    };
  }

  private async fetchData() {
    const query = this.state.query.body;
    const response = await fetch("/api/snapshots/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
      }),
    });
    if (response.ok) {
      const snapshots = (await response.json()) as Snapshot[];
      this.context.myDispatch({
        type: "SNAPSHOT_RESPONSE",
        request: {
          status: "loaded",
          response: snapshots.map(hydrateSnapshot),
          queryHash: this.state.query.hash,
        },
      });
    } else {
      this.context.myDispatch({
        type: "SNAPSHOT_RESPONSE",
        request: { status: "error", error: await response.text() },
      });
    }
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "SNAPSHOT_RESPONSE":
        switch (msg.request.status) {
          case "not-sent":
          case "loading":
          case "error":
            this.state.dataRequest = msg.request;
            return;
          case "loaded": {
            const next = new PlotListController(
              {
                snapshots: msg.request.response,
                outputMeasure: {
                  id: this.state.outputMeasure.selector.state.selected.measureId,
                  unit: this.state.outputMeasure.toggle.state.selectedUnit,
                },
                measureStats: this.state.measureStats,
                mySnapshot: this.state.mySnapshot,
              },
              { myDispatch: (msg: PlotListMsg) => this.context.myDispatch({ type: "REPORT_CARD_MSG", msg }) }
            );

            this.state.dataRequest = {
              status: "loaded",
              queryHash: msg.request.queryHash,
              response: {
                snapshots: msg.request.response,
                reportCardModel: next,
              },
            };
            return;
          }
          default:
            assertUnreachable(msg.request);
        }

      // eslint-disable-next-line no-fallthrough
      case "REQUEST_DATA": {
        this.state.dataRequest = { status: "loading", queryHash: this.state.query.hash };
        this.fetchData().catch(console.error);
        break;
      }

      case "REPORT_CARD_MSG":
        if (this.state.dataRequest.status != "loaded") {
          console.warn(`Unexpected msg ${msg.type} when model is not loaded.`);
          return;
        }
        this.state.dataRequest.response.reportCardModel.handleDispatch(msg.msg);
        break;

      case "FILTERS_MSG": {
        const oldQueryHash = this.state.query.hash;
        this.state.filtersModel.handleDispatch(msg.msg);
        this.state.query = this.getQuery(this.state.filtersModel);
        if (this.state.query.hash != oldQueryHash) {
          this.state.dataRequest = { status: "not-sent" };
        }
        break;
      }

      case "SELECT_MEASURE_CLASS_MSG": {
        this.state.outputMeasure.selector.handleDispatch(msg.msg);
        const measure = getSpec(this.state.outputMeasure.selector.state.selected.measureId);
        this.state.outputMeasure.toggle = new UnitToggleController(
          {
            measureId: measure.id,
            selectedUnit: measure.units[0],
            possibleUnits: measure.units,
          },
          { myDispatch: (msg: import("../unit-toggle").Msg) => this.context.myDispatch({ type: "OUTPUT_MEASURE_TOGGLE_MSG", msg }) }
        );

        if (this.state.dataRequest.status == "loaded") {
          const nextReportCardModel = new PlotListController(
            {
              snapshots: this.state.dataRequest.response.snapshots,
              outputMeasure: {
                id: this.state.outputMeasure.selector.state.selected.measureId,
                unit: this.state.outputMeasure.toggle.state.selectedUnit,
              },
              measureStats: this.state.measureStats,
              mySnapshot: this.state.mySnapshot,
            },
            { myDispatch: (msg: PlotListMsg) => this.context.myDispatch({ type: "REPORT_CARD_MSG", msg }) }
          );
          this.state.dataRequest.response.reportCardModel = nextReportCardModel;
        }
        break;
      }

      case "OUTPUT_MEASURE_TOGGLE_MSG": {
        this.state.outputMeasure.toggle.handleDispatch(msg.msg);

        if (this.state.dataRequest.status == "loaded") {
          const nextReportCardModel = new PlotListController(
            {
              snapshots: this.state.dataRequest.response.snapshots,
              outputMeasure: {
                id: this.state.outputMeasure.selector.state.selected.measureId,
                unit: this.state.outputMeasure.toggle.state.selectedUnit,
              },
              measureStats: this.state.measureStats,
              mySnapshot: this.state.mySnapshot,
            },
            { myDispatch: (msg: PlotListMsg) => this.context.myDispatch({ type: "REPORT_CARD_MSG", msg }) }
          );
          this.state.dataRequest.response.reportCardModel = nextReportCardModel;
        }
        break;
      }

      default:
        assertUnreachable(msg);
    }
  }
}

export class ReportCardMainView extends DCGView.View<{
  controller: () => ReportCardMainController;
}> {
  template() {
    const state = () => this.props.controller().state;

    return (
      <div class={DCGView.const(styles.reportCardRoot)}>
        <div class={DCGView.const(styles.filter)}>
          <EditQueryView controller={() => state().filtersModel} />

          {() => {
            if (state().dataRequest.status === "loaded") {
              return (
                <span>
                  {() => {
                    const dataRequest = state().dataRequest
                    return dataRequest.status === "loaded" ? dataRequest.response.snapshots.length : 0
                  }} snapshots loaded.
                </span>
              );
            }
            return null;
          }}

          <div class={DCGView.const(styles.outputMeasureContainer)}>
            Output Measure:
            <SelectMeasureClassView controller={() => state().outputMeasure.selector} />
            <UnitToggleView controller={() => state().outputMeasure.toggle} />
          </div>
        </div>
        {() => {
          const dataRequest = state().dataRequest;
          switch (dataRequest.status) {
            case "not-sent":
              return (
                <button
                  onTap={() => this.props.controller().context.myDispatch({ type: "REQUEST_DATA" })}
                  disabled={() => {
                    const dataRequest = state().dataRequest;
                    const query = state().query;
                    return dataRequest.status === "loaded" && dataRequest.queryHash === query.hash;
                  }}
                >
                  Fetch Data
                </button>
              );
            case "loading":
              return <div>Fetching...</div>;
            case "error":
              return <div>Error: {() => dataRequest.status === "error" ? dataRequest.error : ""}</div>;
            case "loaded":
              return (
                <div class={DCGView.const(styles.graphs)}>
                  <PlotListView controller={() => dataRequest.response.reportCardModel} />
                </div>
              );
            default:
              assertUnreachable(dataRequest);
          }
        }}
      </div>
    );
  }
}

const styles = typestyle.stylesheet({
  reportCardRoot: {
    ...csstips.vertical,
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  filter: {
    ...csstips.content,
  },
  graphs: {
    ...csstips.flex,
    minHeight: csx.px(200),
  },
  outputMeasureContainer: {
    ...csstips.content,
    ...csstips.horizontal,
  },
});
