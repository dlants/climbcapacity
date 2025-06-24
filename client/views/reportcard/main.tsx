import React from "react";
import type { HydratedSnapshot, Snapshot } from "../../types";
import { Dispatch } from "../../main";
import {
  assertUnreachable,
  GetLoadedRequest as GetLoadedRequestType,
  RequestStatus,
} from "../../util/utils";
import { SnapshotQuery, MeasureStats } from "../../../iso/protocol";
import { EditQuery } from "../../views/edit-query";
import { PlotList } from "./plot-list";
import { hydrateSnapshot } from "../../util/snapshot";
import { SelectMeasureClass } from "../snapshot/select-measure-class";
import { UnitToggle } from "../unit-toggle";
import * as typestyle from "typestyle";
import * as csstips from "csstips";
import * as csx from "csx";
import { MEASURES } from "../../constants";
import { boulderGradeClass, sportGradeClass } from "../../../iso/measures/grades";
import { getSpec } from "../../../iso/measures";

export type Model = {
  filtersModel: EditQuery;
  outputMeasure: {
    selector: SelectMeasureClass;
    toggle: UnitToggle;
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
      reportCardModel: PlotList;
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

export class ReportCardMain {
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
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    const filtersModel = new EditQuery(
      {
        measureStats,
        initialFilters: initialFilters,
      },
      { myDispatch: (msg: import("../../views/edit-query").Msg) => this.context.myDispatch({ type: "FILTERS_MSG", msg }) }
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
      selector: new SelectMeasureClass(
        {
          measureClasses: [boulderGradeClass, sportGradeClass],
          measureStats,
          measureId: initialMeasure.measureId,
        },
        { myDispatch: (msg: import("../snapshot/select-measure-class").Msg) => this.context.myDispatch({ type: "SELECT_MEASURE_CLASS_MSG", msg }) }
      ),

      toggle: new UnitToggle(
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

  private getQuery(editQuery: EditQuery): { body: SnapshotQuery; hash: string } {
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

  update(msg: Msg) {
    switch (msg.type) {
      case "SNAPSHOT_RESPONSE":
        switch (msg.request.status) {
          case "not-sent":
          case "loading":
          case "error":
            this.state.dataRequest = msg.request;
            return;
          case "loaded":
            const next = new PlotList(
              {
                snapshots: msg.request.response,
                outputMeasure: {
                  id: this.state.outputMeasure.selector.state.selected.measureId,
                  unit: this.state.outputMeasure.toggle.state.selectedUnit,
                },
                measureStats: this.state.measureStats,
                mySnapshot: this.state.mySnapshot,
              },
              { myDispatch: (msg: import("./plot-list").Msg) => this.context.myDispatch({ type: "REPORT_CARD_MSG", msg }) }
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
          default:
            assertUnreachable(msg.request);
        }

      case "REQUEST_DATA":
        this.state.dataRequest = { status: "loading", queryHash: this.state.query.hash };
        this.fetchData().catch(console.error);
        break;

      case "REPORT_CARD_MSG":
        if (this.state.dataRequest.status != "loaded") {
          console.warn(`Unexpected msg ${msg.type} when model is not loaded.`);
          return;
        }
        this.state.dataRequest.response.reportCardModel.update(msg.msg);
        break;

      case "FILTERS_MSG":
        const oldQueryHash = this.state.query.hash;
        this.state.filtersModel.update(msg.msg);
        this.state.query = this.getQuery(this.state.filtersModel);
        if (this.state.query.hash != oldQueryHash) {
          this.state.dataRequest = { status: "not-sent" };
        }
        break;

      case "SELECT_MEASURE_CLASS_MSG":
        this.state.outputMeasure.selector.update(msg.msg);
        const measure = getSpec(this.state.outputMeasure.selector.state.selected.measureId);
        this.state.outputMeasure.toggle = new UnitToggle(
          {
            measureId: measure.id,
            selectedUnit: measure.units[0],
            possibleUnits: measure.units,
          },
          { myDispatch: (msg: import("../unit-toggle").Msg) => this.context.myDispatch({ type: "OUTPUT_MEASURE_TOGGLE_MSG", msg }) }
        );

        if (this.state.dataRequest.status == "loaded") {
          const nextReportCardModel = new PlotList(
            {
              snapshots: this.state.dataRequest.response.snapshots,
              outputMeasure: {
                id: this.state.outputMeasure.selector.state.selected.measureId,
                unit: this.state.outputMeasure.toggle.state.selectedUnit,
              },
              measureStats: this.state.measureStats,
              mySnapshot: this.state.mySnapshot,
            },
            { myDispatch: (msg: import("./plot-list").Msg) => this.context.myDispatch({ type: "REPORT_CARD_MSG", msg }) }
          );
          this.state.dataRequest.response.reportCardModel = nextReportCardModel;
        }
        break;

      case "OUTPUT_MEASURE_TOGGLE_MSG":
        this.state.outputMeasure.toggle.update(msg.msg);

        if (this.state.dataRequest.status == "loaded") {
          const nextReportCardModel = new PlotList(
            {
              snapshots: this.state.dataRequest.response.snapshots,
              outputMeasure: {
                id: this.state.outputMeasure.selector.state.selected.measureId,
                unit: this.state.outputMeasure.toggle.state.selectedUnit,
              },
              measureStats: this.state.measureStats,
              mySnapshot: this.state.mySnapshot,
            },
            { myDispatch: (msg: import("./plot-list").Msg) => this.context.myDispatch({ type: "REPORT_CARD_MSG", msg }) }
          );
          this.state.dataRequest.response.reportCardModel = nextReportCardModel;
        }
        break;

      default:
        assertUnreachable(msg);
    }
  }

  private FetchButton = () => {
    return (
      <button
        onPointerDown={() => this.context.myDispatch({ type: "REQUEST_DATA" })}
        disabled={
          this.state.dataRequest.status === "loaded" &&
          this.state.dataRequest.queryHash === this.state.query.hash
        }
      >
        Fetch Data
      </button>
    );
  }

  private LoadedView = ({
    response,
  }: {
    response: GetLoadedRequestType<Model["dataRequest"]>["response"];
  }) => {
    return response.reportCardModel.view();
  }

  private OutputMeasureView = () => {
    return (
      <div className={styles.outputMeasureContainer}>
        Output Measure:
        {this.state.outputMeasure.selector.view()}
        {this.state.outputMeasure.toggle.view()}
      </div>
    );
  }

  private SnapshotStatsView = () => {
    return (
      this.state.dataRequest.status == "loaded" && (
        <span>
          {this.state.dataRequest.response.snapshots.length} snapshots loaded.
        </span>
      )
    );
  }

  view() {
    return (
      <div className={styles.reportCardRoot}>
        <div className={styles.filter}>
          {this.state.filtersModel.view()}

          <this.SnapshotStatsView />
          <this.OutputMeasureView />
        </div>
        {(() => {
          switch (this.state.dataRequest.status) {
            case "not-sent":
              return <this.FetchButton />;
            case "loading":
              return <div>Fetching...</div>;
            case "error":
              return <div>Error: {this.state.dataRequest.error}</div>;
            case "loaded":
              return (
                <div className={styles.graphs}>
                  <this.LoadedView
                    response={this.state.dataRequest.response}
                  />
                </div>
              );
            default:
              assertUnreachable(this.state.dataRequest);
          }
        })()}
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


