import React from "react";
import type { HydratedSnapshot, Snapshot } from "../../types";
import { Dispatch } from "../../tea";
import {
  assertLoaded,
  assertUnreachable,
  GetLoadedRequest as GetLoadedRequestType,
  RequestStatus,
} from "../../util/utils";
import { SnapshotQuery, MeasureStats } from "../../../iso/protocol";
import * as EditQuery from "../../views/edit-query";
import * as ReportCardGraphs from "./plot-list";
import { hydrateSnapshot } from "../../util/snapshot";
import * as SelectMeasureClass from "../snapshot/select-measure-class";
import * as UnitToggle from "../unit-toggle";
import * as typestyle from "typestyle";
import * as csstips from "csstips";
import * as csx from "csx";
import { MEASURES } from "../../constants";
import { boulderGradeClass, sportGradeClass } from "../../../iso/measures/grades";
import { getSpec } from "../../../iso/measures";

export type Model = {
  filtersModel: EditQuery.Model;
  outputMeasure: {
    selector: SelectMeasureClass.Model;
    toggle: UnitToggle.Model;
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
      reportCardModel: ReportCardGraphs.Model;
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
    msg: ReportCardGraphs.Msg;
  }
  | {
    type: "SELECT_MEASURE_CLASS_MSG";
    msg: SelectMeasureClass.Msg;
  }
  | {
    type: "OUTPUT_MEASURE_TOGGLE_MSG";
    msg: UnitToggle.Msg;
  }
  | {
    type: "FILTERS_MSG";
    msg: EditQuery.Msg;
  };

export class ReportCardMain {
  state: Model;

  constructor(
    {
      initialFilters,
      measureStats,
      mySnapshot,
    }: {
      initialFilters: EditQuery.InitialFilters;
      measureStats: MeasureStats;
      mySnapshot?: HydratedSnapshot;
    },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    const filtersModel = EditQuery.initModel({
      measureStats,
      initialFilters: initialFilters,
    });
    const query = EditQuery.getQuery(filtersModel);

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
      selector: SelectMeasureClass.initModel({
        measureClasses: [boulderGradeClass, sportGradeClass],
        measureStats,
        measureId: initialMeasure.measureId,
      }),

      toggle: {
        measureId: initialMeasure.measureId,
        selectedUnit: initialMeasure.unit,
        possibleUnits: initialMeasure.possibleUnits,
      },
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
            const next = ReportCardGraphs.initModel({
              snapshots: msg.request.response,
              outputMeasure: {
                id: this.state.outputMeasure.selector.selected.measureId,
                unit: this.state.outputMeasure.toggle.selectedUnit,
              },
              measureStats: this.state.measureStats,
              mySnapshot: this.state.mySnapshot,
            });

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
        const [nextReportCardModel] = ReportCardGraphs.update(
          msg.msg,
          this.state.dataRequest.response.reportCardModel,
        );

        const request = assertLoaded(this.state.dataRequest);
        request.response.reportCardModel = nextReportCardModel;
        break;

      case "FILTERS_MSG":
        const [nextFiltersModel] = EditQuery.update(msg.msg, this.state.filtersModel);
        const oldQueryHash = this.state.query.hash;
        this.state.filtersModel = nextFiltersModel;
        this.state.query = EditQuery.getQuery(nextFiltersModel);
        if (this.state.query.hash != oldQueryHash) {
          this.state.dataRequest = { status: "not-sent" };
        }
        break;

      case "SELECT_MEASURE_CLASS_MSG":
        const [nextSelector] = SelectMeasureClass.update(
          msg.msg,
          this.state.outputMeasure.selector,
        );
        this.state.outputMeasure.selector = nextSelector;
        const measure = getSpec(nextSelector.selected.measureId);
        this.state.outputMeasure.toggle = {
          measureId: measure.id,
          selectedUnit: measure.units[0],
          possibleUnits: measure.units,
        };

        if (this.state.dataRequest.status == "loaded") {
          const nextReportCardModel = ReportCardGraphs.initModel({
            snapshots: this.state.dataRequest.response.snapshots,
            outputMeasure: {
              id: this.state.outputMeasure.selector.selected.measureId,
              unit: this.state.outputMeasure.toggle.selectedUnit,
            },
            measureStats: this.state.measureStats,
            mySnapshot: this.state.mySnapshot,
          });
          this.state.dataRequest.response.reportCardModel = nextReportCardModel;
        }
        break;

      case "OUTPUT_MEASURE_TOGGLE_MSG":
        const [nextToggle] = UnitToggle.update(msg.msg, this.state.outputMeasure.toggle);
        this.state.outputMeasure.toggle = nextToggle;

        if (this.state.dataRequest.status == "loaded") {
          const nextReportCardModel = ReportCardGraphs.initModel({
            snapshots: this.state.dataRequest.response.snapshots,
            outputMeasure: {
              id: this.state.outputMeasure.selector.selected.measureId,
              unit: this.state.outputMeasure.toggle.selectedUnit,
            },
            measureStats: this.state.measureStats,
            mySnapshot: this.state.mySnapshot,
          });
          this.state.dataRequest.response.reportCardModel = nextReportCardModel;
        }
        break;

      default:
        assertUnreachable(msg);
    }
  }

  private FetchButton() {
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

  private LoadedView({
    response,
  }: {
    response: GetLoadedRequestType<Model["dataRequest"]>["response"];
  }) {
    return (
      <ReportCardGraphs.view
        model={response.reportCardModel}
        dispatch={(msg) => this.context.myDispatch({ type: "REPORT_CARD_MSG", msg })}
      />
    );
  }

  private OutputMeasureView() {
    return (
      <div className={styles.outputMeasureContainer}>
        Output Measure:
        <SelectMeasureClass.view
          model={this.state.outputMeasure.selector}
          dispatch={(msg) => {
            this.context.myDispatch({ type: "SELECT_MEASURE_CLASS_MSG", msg });
          }}
        />
        <UnitToggle.view
          model={this.state.outputMeasure.toggle}
          dispatch={(msg) => {
            this.context.myDispatch({ type: "OUTPUT_MEASURE_TOGGLE_MSG", msg });
          }}
        />
      </div>
    );
  }

  private SnapshotStatsView() {
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
          <EditQuery.view
            model={this.state.filtersModel}
            dispatch={(msg) => this.context.myDispatch({ type: "FILTERS_MSG", msg })}
          />

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


