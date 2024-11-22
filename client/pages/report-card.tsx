import React from "react";
import type { HydratedSnapshot, Snapshot } from "../types";
import { Update, Thunk, View, Dispatch, wrapThunk } from "../tea";
import {
  assertUnreachable,
  GetLoadedRequest as GetLoadedRequestType,
  RequestStatus,
  RequestStatusView,
  RequestStatusViewMap,
} from "../util/utils";
import * as immer from "immer";
import * as LoadedReportCard from "../views/loaded-report-card";
import { hydrateSnapshot } from "../util/snapshot";
import { MeasureStats } from "../../iso/protocol";
import { ANTHRO_MEASURES, MeasureId } from "../../iso/measures";
const produce = immer.produce;
import lodash from "lodash";
import { InitialFilters } from "../views/select-filters";
import { InitialFilter, UnitValue } from "../../iso/units";
import {
  EWBANK,
  FONT,
  FRENCH_SPORT,
  IRCRAGrade,
  VGRADE,
  YDS,
} from "../../iso/grade";

export type Model = {
  userId: string;
  measureStats: MeasureStats;
  mySnapshotRequest: RequestStatus<
    | {
        state: "no-snapshot";
      }
    | {
        state: "has-snapshot";
        model: LoadedReportCard.Model;
      }
  >;
};

export type Msg =
  | {
      type: "MY_SNAPSHOT_RESPONSE";
      request: RequestStatus<HydratedSnapshot | undefined>;
    }
  | {
      type: "LOADED_MSG";
      msg: LoadedReportCard.Msg;
    };

export function initModel({
  userId,
  measureStats,
}: {
  userId: string;
  measureStats: MeasureStats;
}): [Model] | [Model, Thunk<Msg> | undefined] {
  const mySnapshotRequest: RequestStatus<Snapshot> = {
    status: "loading",
  };
  const fetchSnapshotThunk = async (dispatch: Dispatch<Msg>) => {
    const response = await fetch("/api/my-latest-snapshot", {
      method: "POST",
    });
    if (response.ok) {
      const { snapshot } = (await response.json()) as {
        snapshot: Snapshot | undefined;
      };
      dispatch({
        type: "MY_SNAPSHOT_RESPONSE",
        request: {
          status: "loaded",
          response: snapshot ? hydrateSnapshot(snapshot) : undefined,
        },
      });
    } else {
      dispatch({
        type: "MY_SNAPSHOT_RESPONSE",
        request: { status: "error", error: await response.text() },
      });
    }
  };

  return [
    {
      userId,
      measureStats,
      mySnapshotRequest,
    },
    fetchSnapshotThunk,
  ];
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "MY_SNAPSHOT_RESPONSE": {
      switch (msg.request.status) {
        case "not-sent":
        case "error":
        case "loading":
          const request = msg.request;
          return [
            produce(model, (draft) => {
              draft.mySnapshotRequest = immer.castDraft(request);
            }),
          ];
        case "loaded":
          if (msg.request.response == undefined) {
            return [
              produce(model, (draft) => {
                draft.mySnapshotRequest = {
                  status: "loaded",
                  response: { state: "no-snapshot" },
                };
              }),
            ];
          } else {
            const mySnapshot = msg.request.response;

            let myInputValues = lodash.pick(
              mySnapshot.measures,
              ANTHRO_MEASURES.map((m) => m.id),
            );
            const initialFilters: InitialFilters = {};

            for (const measureIdStr in myInputValues) {
              const measureId = measureIdStr as MeasureId;
              const measureCount = model.measureStats.stats[measureId] || 0;
              if (measureCount < 100) {
                continue;
              }
              initialFilters[measureId] = getInitialFilter(
                measureId,
                myInputValues[measureId] as UnitValue,
              );
            }

            const [loadedModel, loadedThunk] = LoadedReportCard.initModel({
              initialFilters,
              measureStats: model.measureStats,
              mySnapshot: msg.request.response,
            });
            return [
              produce(model, (draft) => {
                draft.mySnapshotRequest = {
                  status: "loaded",
                  response: {
                    state: "has-snapshot",
                    model: immer.castDraft(loadedModel),
                  },
                };
              }),
              wrapThunk("LOADED_MSG", loadedThunk),
            ];
          }

        default:
          assertUnreachable(msg.request);
      }
    }

    case "LOADED_MSG": {
      if (
        !(
          model.mySnapshotRequest.status == "loaded" &&
          model.mySnapshotRequest.response.state == "has-snapshot"
        )
      ) {
        throw new Error(
          `Did not expect a LOADED_MSG when we haven't loaded a snapshot`,
        );
      }

      const [nextModel, thunk] = LoadedReportCard.update(
        msg.msg,
        model.mySnapshotRequest.response.model,
      );
      return [
        produce(model, (draft) => {
          draft.mySnapshotRequest = {
            status: "loaded",
            response: {
              state: "has-snapshot",
              model: immer.castDraft(nextModel),
            },
          };
        }),
        wrapThunk("LOADED_MSG", thunk),
      ];
    }

    default:
      assertUnreachable(msg);
  }
};

const viewMap: RequestStatusViewMap<
  GetLoadedRequestType<Model["mySnapshotRequest"]>["response"],
  Msg
> = {
  "not-sent": () => <div />,
  loading: () => <div>Fetching...</div>,
  error: ({ error }) => <div>Error when fetching data: {error}</div>,
  loaded: ({ response, dispatch }) => (
    <div>
      {(() => {
        switch (response.state) {
          case "no-snapshot":
            return <NoSnapshotView />;
          case "has-snapshot":
            return (
              <LoadedReportCard.view
                model={response.model}
                dispatch={(msg) => dispatch({ type: "LOADED_MSG", msg })}
              />
            );
          default:
            assertUnreachable(response);
        }
      })()}
    </div>
  ),
};

const NoSnapshotView = () => {
  return (
    <div>
      You haven't added any snapshots. You can do that on the{" "}
      <a href="/snapshots">Snapshots</a> page.
    </div>
  );
};

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div>
      <RequestStatusView
        dispatch={dispatch}
        request={model.mySnapshotRequest}
        viewMap={viewMap}
      />
    </div>
  );
};

function getInitialFilter(
  measureId: MeasureId,
  value: UnitValue,
): InitialFilter {
  if (value.unit == "sex-at-birth") {
    return {
      type: "toggle",
      measureId,
      value,
    };
  } else {
    return {
      type: "minmax",
      measureId,
      minValue: getMinInputValue(value),
      maxValue: getMaxInputValue(value),
    };
  }
}

function getMinInputValue(value: UnitValue) {
  switch (value.unit) {
    case "second":
    case "year":
    case "month":
    case "lb":

    case "kg":

    case "m":
    case "cm":
    case "mm":
    case "inch":
      return {
        ...value,
        value: value.value * 0.9,
      };
    case "count":
      return {
        ...value,
        value: Math.max(Math.floor(value.value * 0.9), value.value - 1),
      };
    case "vermin":
      return {
        ...value,
        value: VGRADE[Math.max(VGRADE.indexOf(value.value) - 1, 0)],
      };
    case "font":
      return {
        ...value,
        value: FONT[Math.max(FONT.indexOf(value.value) - 1, 0)],
      };
    case "frenchsport":
      return {
        ...value,
        value: FRENCH_SPORT[Math.max(FRENCH_SPORT.indexOf(value.value) - 1, 0)],
      };
    case "yds":
      return {
        ...value,
        value: YDS[Math.max(YDS.indexOf(value.value) - 1, 0)],
      };
    case "ewbank":
      return {
        ...value,
        value: EWBANK[Math.max(EWBANK.indexOf(value.value) - 1, 0)],
      };
    case "ircra":
      return {
        ...value,
        value: (value.value * 0.9) as IRCRAGrade,
      };
    case "sex-at-birth":
      return value;
    default:
      assertUnreachable(value);
  }
}

function getMaxInputValue(value: UnitValue) {
  switch (value.unit) {
    case "second":
    case "year":
    case "month":
    case "lb":

    case "kg":

    case "m":
    case "cm":
    case "mm":
    case "inch":
      return {
        ...value,
        value: value.value * 1.1,
      };
    case "count":
      return {
        ...value,
        value: Math.max(Math.ceil(value.value * 1.1), value.value + 1),
      };
    case "vermin":
      return {
        ...value,
        value:
          VGRADE[Math.min(VGRADE.indexOf(value.value) + 1, VGRADE.length - 1)],
      };
    case "font":
      return {
        ...value,
        value: FONT[Math.min(FONT.indexOf(value.value) + 1, FONT.length - 1)],
      };
    case "frenchsport":
      return {
        ...value,
        value:
          FRENCH_SPORT[
            Math.min(
              FRENCH_SPORT.indexOf(value.value) + 1,
              FRENCH_SPORT.length - 1,
            )
          ],
      };
    case "yds":
      return {
        ...value,
        value: YDS[Math.min(YDS.indexOf(value.value) + 1, YDS.length - 1)],
      };
    case "ewbank":
      return {
        ...value,
        value:
          EWBANK[Math.min(EWBANK.indexOf(value.value) + 1, EWBANK.length - 1)],
      };
    case "ircra":
      return {
        ...value,
        value: (value.value * 1.1) as IRCRAGrade,
      };
    case "sex-at-birth":
      return value;
    default:
      assertUnreachable(value);
  }
}
