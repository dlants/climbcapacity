import * as DCGView from "dcgview";
import type { HydratedSnapshot, Snapshot, Dispatch } from "../types";
import {
  assertUnreachable,
  RequestStatus,
} from "../util/utils";
import { ReportCardMainController, ReportCardMainView, Msg as ReportCardMainMsg } from "../views/reportcard/main";
import { hydrateSnapshot } from "../util/snapshot";
import { MeasureStats } from "../../iso/protocol";
import { MeasureId } from "../../iso/measures";
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
import { MEASURES } from "../../iso/measures";

export type Model = {
  userId: string;
  measureStats: MeasureStats;
  mySnapshotRequest: RequestStatus<
    | {
      state: "no-snapshot";
    }
    | {
      state: "has-snapshot";
      model: ReportCardMainController;
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
    msg: ReportCardMainMsg;
  };

export class ReportCardController {
  state: Model;

  constructor(
    userId: string,
    measureStats: MeasureStats,
    public myDispatch: Dispatch<Msg>
  ) {
    this.state = {
      userId,
      measureStats,
      mySnapshotRequest: {
        status: "loading",
      },
    };

    this.fetchSnapshot().catch(console.error);
  }

  private async fetchSnapshot() {
    const response = await fetch("/api/my-latest-snapshot", {
      method: "POST",
    });
    if (response.ok) {
      const { snapshot } = (await response.json()) as {
        snapshot: Snapshot | undefined;
      };
      this.myDispatch({
        type: "MY_SNAPSHOT_RESPONSE",
        request: {
          status: "loaded",
          response: snapshot ? hydrateSnapshot(snapshot) : undefined,
        },
      });
    } else {
      this.myDispatch({
        type: "MY_SNAPSHOT_RESPONSE",
        request: { status: "error", error: await response.text() },
      });
    }
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "MY_SNAPSHOT_RESPONSE": {
        switch (msg.request.status) {
          case "not-sent":
          case "error":
          case "loading":
            this.state.mySnapshotRequest = msg.request;
            break;
          case "loaded":
            if (msg.request.response == undefined) {
              this.state.mySnapshotRequest = {
                status: "loaded",
                response: { state: "no-snapshot" },
              };
            } else {
              const mySnapshot = msg.request.response;

              let myInputValues = lodash.pick(
                mySnapshot.measures,
                MEASURES.filter((s) => s.type == "anthro").map((m) => m.id),
              );
              const initialFilters: InitialFilters = {};

              for (const measureIdStr in myInputValues) {
                const measureId = measureIdStr as MeasureId;
                const measureCount = this.state.measureStats[measureId] || 0;
                if (measureCount < 100) {
                  continue;
                }
                initialFilters[measureId] = getInitialFilter(
                  measureId,
                  myInputValues[measureId] as UnitValue,
                );
              }

              const loadedModel = new ReportCardMainController(
                {
                  initialFilters,
                  measureStats: this.state.measureStats,
                  mySnapshot: msg.request.response,
                },
                { myDispatch: (msg: ReportCardMainMsg) => this.myDispatch({ type: "LOADED_MSG", msg }) }
              );

              this.state.mySnapshotRequest = {
                status: "loaded",
                response: {
                  state: "has-snapshot",
                  model: loadedModel,
                },
              };
            }
            break;

          default:
            assertUnreachable(msg.request);
        }
        break;
      }

      case "LOADED_MSG": {
        if (
          !(
            this.state.mySnapshotRequest.status == "loaded" &&
            this.state.mySnapshotRequest.response.state == "has-snapshot"
          )
        ) {
          throw new Error(
            `Did not expect a LOADED_MSG when we haven't loaded a snapshot`,
          );
        }

        this.state.mySnapshotRequest.response.model.handleDispatch(msg.msg);
        break;
      }

      default:
        assertUnreachable(msg);
    }
  }

}

export class ReportCardView extends DCGView.View<{
  controller: () => ReportCardController;
}> {
  template() {
    const stateProp = () => this.props.controller().state;
    const { SwitchUnion } = DCGView.Components;

    return (
      <div>
        {SwitchUnion(() => stateProp().mySnapshotRequest, 'status', {
          "not-sent": () => <div />,
          loading: () => <div>Fetching...</div>,
          error: (errorProp) => <div>Error when fetching data: {() => errorProp().error}</div>,
          loaded: (loadedProp) => (
            <div>
              {SwitchUnion(() => loadedProp().response, 'state', {
                "no-snapshot": () => this.renderNoSnapshot(),
                "has-snapshot": (hasSnapshotProp) => <ReportCardMainView controller={() => hasSnapshotProp().model} />,
              })}
            </div>
          ),
        })}
      </div>
    );
  }

  private renderNoSnapshot() {
    return (
      <div>
        You haven't added any snapshots. You can do that on the{" "}
        <a href={DCGView.const("/snapshots")}>Snapshots</a> page.
      </div>
    );
  }
}

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
// Legacy compatibility export
export const ReportCard = ReportCardController;
