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
import * as LoadedReportCard from "../views/reportcard/main";
import { hydrateSnapshot } from "../util/snapshot";
import { MeasureStats } from "../../iso/protocol";
import { MeasureId } from "../../iso/measures";
const produce = immer.produce;
import lodash from "lodash";
import { InitialFilters } from "../views/edit-query";
import { InitialFilter, UnitValue } from "../../iso/units";
import {
  EWBANK,
  FONT,
  FRENCH_SPORT,
  IRCRAGrade,
  VGRADE,
  YDS,
} from "../../iso/grade";
import { MEASURES } from "../constants";

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
              MEASURES.filter((s) => s.type == "anthro").map((m) => m.id),
            );
            const initialFilters: InitialFilters = {};

            for (const measureIdStr in myInputValues) {
              const measureId = measureIdStr as MeasureId;
              const measureCount = model.measureStats[measureId] || 0;
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

function getMinMaxInputValues(measureId: MeasureId, unitValue: UnitValue): { min: UnitValue, max: UnitValue } {
  if (measureId === 'weight' && unitValue.unit === 'kg') {
    return {
      min: {
        ...unitValue,
        value: Math.ceil(unitValue.value - 5)
      },
      max: {
        ...unitValue,
        value: Math.floor(unitValue.value + 5)
      }
    };
  }

  if (measureId === 'weight' && unitValue.unit === 'lb') {
    return {
      min: {
        ...unitValue,
        value: Math.ceil(unitValue.value - 10)
      },
      max: {
        ...unitValue,
        value: Math.floor(unitValue.value + 10)
      }
    };
  }

  if (measureId === 'height' || measureId === 'armspan' || measureId === 'standing-reach') {
    let adjustment = 0;
    if (unitValue.unit === 'cm') {
      adjustment = 5;
    } else if (unitValue.unit === 'inch') {
      adjustment = 2;
    } else if (unitValue.unit === 'm') {
      adjustment = 0.05;
    }

    if (unitValue.unit === 'm') {
      return {
        min: {
          ...unitValue,
          value: Math.ceil((unitValue.value - adjustment) * 100) / 100
        },
        max: {
          ...unitValue,
          value: Math.floor((unitValue.value + adjustment) * 100) / 100
        }
      };
    } else {
      return {
        min: {
          ...unitValue,
          value: Math.ceil(unitValue.value as number - adjustment)
        } as UnitValue,
        max: {
          ...unitValue,
          value: Math.floor(unitValue.value as number + adjustment)
        } as UnitValue
      };
    }
  }

  switch (unitValue.unit) {
    case "second":
    case "year":
    case "month":
    case "lb":
    case "lb/s":
    case "kg":
    case "kg/s":
    case "m":
    case "cm":
    case "mm":
    case "inch":
    case "strengthtoweightratio":
      return {
        min: {
          ...unitValue,
          value: unitValue.value * 0.9,
        },
        max: {
          ...unitValue,
          value: unitValue.value * 1.1,
        }
      };
    case "count":
      return {
        min: {
          ...unitValue,
          value: Math.max(Math.floor(unitValue.value * 0.9), unitValue.value - 1),
        },
        max: {
          ...unitValue,
          value: Math.min(Math.ceil(unitValue.value * 1.1), unitValue.value + 1),
        }
      };
    case "vermin":
      return {
        min: {
          ...unitValue,
          value: VGRADE[Math.max(VGRADE.indexOf(unitValue.value) - 1, 0)],
        },
        max: {
          ...unitValue,
          value: VGRADE[Math.min(VGRADE.indexOf(unitValue.value) + 2, VGRADE.length - 1)],
        }
      };
    case "font":
      return {
        min: {
          ...unitValue,
          value: FONT[Math.max(FONT.indexOf(unitValue.value) - 1, 0)],
        },
        max: {
          ...unitValue,
          value: FONT[Math.min(FONT.indexOf(unitValue.value) + 2, FONT.length - 1)],
        }
      };
    case "frenchsport":
      return {
        min: {
          ...unitValue,
          value: FRENCH_SPORT[Math.max(FRENCH_SPORT.indexOf(unitValue.value) - 1, 0)],
        },
        max: {
          ...unitValue,
          value: FRENCH_SPORT[Math.min(FRENCH_SPORT.indexOf(unitValue.value) + 2, FRENCH_SPORT.length - 1)],
        }
      };
    case "yds":
      return {
        min: {
          ...unitValue,
          value: YDS[Math.max(YDS.indexOf(unitValue.value) - 1, 0)],
        },
        max: {
          ...unitValue,
          value: YDS[Math.min(YDS.indexOf(unitValue.value) + 2, YDS.length - 1)],
        }
      };
    case "ewbank":
      return {
        min: {
          ...unitValue,
          value: EWBANK[Math.max(EWBANK.indexOf(unitValue.value) - 1, 0)],
        },
        max: {
          ...unitValue,
          value: EWBANK[Math.min(EWBANK.indexOf(unitValue.value) + 2, EWBANK.length - 1)],
        }
      };
    case "ircra":
      return {
        min: {
          ...unitValue,
          value: Math.max(unitValue.value - 1, 1) as IRCRAGrade,
        },
        max: {
          ...unitValue,
          value: Math.min(unitValue.value + 2, 33) as IRCRAGrade,
        }
      };
    case "sex-at-birth":
    case "training":
      return {
        min: unitValue,
        max: unitValue
      }
    default:
      assertUnreachable(unitValue);
  }
}

function getInitialFilter(
  measureId: MeasureId,
  value: UnitValue,
): InitialFilter {
  if (value.unit === "sex-at-birth") {
    return { type: "toggle", value };
  } else {
    const { min, max } = getMinMaxInputValues(measureId, value);
    return { type: "minmax", minValue: min, maxValue: max };
  }
}
