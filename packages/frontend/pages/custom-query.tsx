/**
import React from "react";
import type { HydratedSnapshot, Snapshot } from "../types";
import { Dispatch } from "../tea";
import {
  assertLoaded,
  assertUnreachable,
  GetLoadedRequest as GetLoadedRequestType,
  RequestStatus,
  RequestStatusView,
  RequestStatusViewMap,
} from "../util/utils";
import { FilterQuery, MeasureStats } from "../../iso/protocol";
import * as PlotWithControls from "../views/plot-with-controls";
import * as SelectFilters from "../views/select-filters";
import { hydrateSnapshot } from "../util/snapshot";

export type Model = {
  filtersModel: SelectFilters.Model;
  userId: string | undefined;
  query: FilterQuery;
  dataRequest: RequestStatus<{
    snapshots: HydratedSnapshot[];
    plotModel: PlotWithControls.Model;
  }>;
  mySnapshotRequest: RequestStatus<HydratedSnapshot | undefined>;
};

export type Msg =
  | {
    type: "UPDATE_QUERY";
  }
  | {
    type: "REQUEST_DATA";
  }
  | {
    type: "SNAPSHOT_RESPONSE";
    request: RequestStatus<HydratedSnapshot[]>;
  }
  | {
    type: "MY_SNAPSHOT_RESPONSE";
    request: RequestStatus<HydratedSnapshot | undefined>;
  }
  | {
    type: "PLOT_MSG";
    msg: PlotWithControls.Msg;
  }
  | {
    type: "FILTERS_MSG";
    msg: SelectFilters.Msg;
  };

export class CustomQuery {
  state: Model;

  constructor(
    initialParams: {
      userId: string | undefined;
      measureStats: MeasureStats;
    },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    this.state = {
      filtersModel: SelectFilters.initModel({
        measureStats: initialParams.measureStats,
        initialFilters: {},
      }),
      userId: initialParams.userId,
      query: {},
      dataRequest: { status: "not-sent" },
      mySnapshotRequest: { status: "not-sent" },
    };

    // Execute initial async operation if userId exists
    if (initialParams.userId) {
      this.state.mySnapshotRequest = { status: "loading" };
      this.fetchMySnapshot().catch(console.error);
    }
  }

  private async fetchMySnapshot() {
    const response = await fetch("/api/my-latest-snapshot", {
      method: "POST",
    });
    if (response.ok) {
      const { snapshot } = (await response.json()) as {
        snapshot: Snapshot | undefined;
      };
      this.context.myDispatch({
        type: "MY_SNAPSHOT_RESPONSE",
        request: {
          status: "loaded",
          response: snapshot ? hydrateSnapshot(snapshot) : undefined,
        },
      });
    } else {
      this.context.myDispatch({
        type: "MY_SNAPSHOT_RESPONSE",
        request: { status: "error", error: await response.text() },
      });
    }
  }

  private async fetchSnapshots() {
    const query: FilterQuery = this.state.query;
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
        request: { status: "loaded", response: snapshots.map(hydrateSnapshot) },
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
      case "SNAPSHOT_RESPONSE": {
        switch (msg.request.status) {
          case "not-sent":
          case "loading":
          case "error":
            this.state.dataRequest = msg.request;
            return;
          case "loaded":
            const plotModel = PlotWithControls.initModel({
              snapshots: msg.request.response,
              mySnapshot:
                this.state.mySnapshotRequest.status == "loaded"
                  ? this.state.mySnapshotRequest.response
                  : undefined,
              userId: this.state.userId,
              filterMapping: SelectFilters.generateFiltersMap(
                this.state.filtersModel,
              ),
            });
            this.state.dataRequest = {
              status: "loaded",
              response: {
                snapshots: msg.request.response,
                plotModel: plotModel,
              },
            };
            return;
          default:
            assertUnreachable(msg.request);
        }
        break;
      }

      case "MY_SNAPSHOT_RESPONSE": {
        this.state.mySnapshotRequest = msg.request;
        if (
          this.state.mySnapshotRequest.status == "loaded" &&
          this.state.dataRequest.status == "loaded"
        ) {
          const plotModel = PlotWithControls.initModel({
            snapshots: this.state.dataRequest.response.snapshots,
            mySnapshot: this.state.mySnapshotRequest.response,
            userId: this.state.userId,
            filterMapping: SelectFilters.generateFiltersMap(
              this.state.filtersModel,
            ),
          });

          this.state.dataRequest = {
            status: "loaded",
            response: {
              ...this.state.dataRequest.response,
              plotModel: plotModel,
            },
          };
        }
        break;
      }

      case "UPDATE_QUERY":
        break;

      case "REQUEST_DATA":
        this.state.dataRequest = { status: "loading" };
        this.fetchSnapshots().catch(console.error);
        break;

      case "PLOT_MSG":
        if (this.state.dataRequest.status != "loaded") {
          console.warn(`Unexpected msg ${msg.type} when model is not loaded.`);
          return;
        }
        const [nextPlotModel, thunk] = PlotWithControls.update(
          msg.msg,
          this.state.dataRequest.response.plotModel,
        );

        const request = assertLoaded(this.state.dataRequest);
        request.response.plotModel = nextPlotModel;

        if (thunk) {
          (async () => {
            await thunk((plotMsg) =>
              this.context.myDispatch({ type: "PLOT_MSG", msg: plotMsg })
            );
          })().catch(console.error);
        }
        break;

      case "FILTERS_MSG": {
        const [nextFiltersModel] = SelectFilters.update(
          msg.msg,
          this.state.filtersModel,
        );
        this.state.filtersModel = nextFiltersModel;

        // Convert filters to query format
        this.state.query = {};
        nextFiltersModel.filters.forEach((filter) => {
          const minResult = filter.model.minInput.parseResult;
          const maxResult = filter.model.maxInput.parseResult;

          this.state.query[filter.model.measureId] = {
            min: minResult.status == "success" ? minResult.value : undefined,
            max: maxResult.status == "success" ? maxResult.value : undefined,
          };
        });
        break;
      }

      default:
        assertUnreachable(msg);
    }
  }

  view() {
    const FetchButton = () => (
      <button onPointerDown={() => this.context.myDispatch({ type: "REQUEST_DATA" })}>
        Fetch Data
      </button>
    );

    const viewMap: RequestStatusViewMap<
      GetLoadedRequestType<Model["dataRequest"]>["response"],
      Msg
    > = {
      "not-sent": () => <FetchButton />,
      loading: () => <div>Fetching...</div>,
      error: ({ error }) => (
        <div>
          <div>error when fetching data: {error}</div>
          <FetchButton />
        </div>
      ),
      loaded: ({ response }) => (
        <div>
          {response.snapshots.length} snapshots loaded.{" "}
          <FetchButton />
          <PlotWithControls.view
            model={response.plotModel}
            dispatch={(msg) => this.context.myDispatch({ type: "PLOT_MSG", msg })}
          />
        </div>
      ),
    };

    return (
      <div>
        <SelectFilters.view
          model={this.state.filtersModel}
          dispatch={(msg) => this.context.myDispatch({ type: "FILTERS_MSG", msg })}
        />
        <RequestStatusView
          dispatch={this.context.myDispatch}
          request={this.state.dataRequest}
          viewMap={viewMap}
        />
      </div>
    );
  }
}
*/
