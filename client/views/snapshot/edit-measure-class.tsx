import React from "react";
import { MeasureClass, MeasureId } from "../../../iso/measures";
import { HydratedSnapshot } from "../../types";
import * as immer from "immer";
import { Dispatch } from "../../tea";
const produce = immer.produce;
import * as MaxHang from "./measure-class/maxhang";
import * as BlockPull from "./measure-class/blockpull";
import * as MinEdge from "./measure-class/minedge";
import * as Performance from "./measure-class/performance";
import * as Repeaters from "./measure-class/repeaters";
import * as EdgePullups from "./measure-class/edgepullups";
import * as WeightedMovement from "./measure-class/weightedmovement";
import * as MaxRepsMovement from "./measure-class/maxrepsmovement";
import * as IsometricHold from "./measure-class/isometrichold";
import * as PowerMovement from "./measure-class/powermovement";
import * as ContinuousHang from "./measure-class/continuoushang";
import * as Endurance from "./measure-class/endurance";
import * as EditMeasure from "./edit-measure";
import { assertUnreachable } from "../../../iso/utils";
import { MeasureStats } from "../../../iso/protocol";

export type Model = immer.Immutable<{
  measureStats: MeasureStats;
  measureModel:
    | {
        type: "maxhang";
        model: MaxHang.Model;
      }
    | {
        type: "blockpull";
        model: BlockPull.Model;
      }
    | {
        type: "minedge";
        model: MinEdge.Model;
      }
    | {
        type: "performance";
        model: Performance.Model;
      }
    | {
        type: "repeaters";
        model: Repeaters.Model;
      }
    | {
        type: "edgepullups";
        model: EdgePullups.Model;
      }
    | {
        type: "weightedmovement";
        model: WeightedMovement.Model;
      }
    | {
        type: "maxrepsmovement";
        model: MaxRepsMovement.Model;
      }
    | {
        type: "isometrichold";
        model: IsometricHold.Model;
      }
    | {
        type: "powermovement";
        model: PowerMovement.Model;
      }
    | {
        type: "continuoushang";
        model: ContinuousHang.Model;
      }
    | {
        type: "endurance";
        model: Endurance.Model;
      };

  snapshot: HydratedSnapshot;
  selectedMeasure: MeasureId;
  editMeasure: EditMeasure.Model;
}>;

export const initModel = ({
  measureClass,
  measureId,
  measureStats,
  snapshot,
}: {
  measureClass: MeasureClass;
  measureId?: MeasureId;
  measureStats: MeasureStats;
  snapshot: HydratedSnapshot;
}): Model => {
  switch (measureClass) {
    case "maxhang":
      const maxHang = MaxHang.initModel(measureStats, measureId);
      return {
        measureModel: {
          type: "maxhang",
          model: maxHang,
        },
        snapshot,
        measureStats,
        selectedMeasure: maxHang.measureId,
        editMeasure: EditMeasure.initModel({
          measureId: maxHang.measureId,
          measureStats,
          snapshot,
        }),
      };
    case "blockpull":
      const blockPull = BlockPull.initModel(measureId);
      return {
        measureModel: {
          type: "blockpull",
          model: blockPull,
        },
        measureStats,
        snapshot,
        selectedMeasure: blockPull.measureId,
        editMeasure: EditMeasure.initModel({
          measureId: blockPull.measureId,
          measureStats,
          snapshot,
        }),
      };

    case "minedge":
      const minEdge = MinEdge.initModel(measureId);
      return {
        measureModel: {
          type: "minedge",
          model: minEdge,
        },
        measureStats,
        snapshot,
        selectedMeasure: minEdge.measureId,
        editMeasure: EditMeasure.initModel({
          measureId: minEdge.measureId,
          measureStats,
          snapshot,
        }),
      };

    case "performance":
      const performance = Performance.initModel(measureId);
      return {
        measureModel: {
          type: "performance",
          model: performance,
        },
        measureStats,
        snapshot,
        selectedMeasure: performance.measureId,
        editMeasure: EditMeasure.initModel({
          measureId: performance.measureId,
          measureStats,
          snapshot,
        }),
      };

    case "repeaters":
      const repeaters = Repeaters.initModel(measureId);
      return {
        measureModel: {
          type: "repeaters",
          model: repeaters,
        },
        measureStats,
        snapshot,
        selectedMeasure: repeaters.measureId,
        editMeasure: EditMeasure.initModel({
          measureId: repeaters.measureId,
          measureStats,
          snapshot,
        }),
      };

    case "edgepullups":
      const edgePullups = EdgePullups.initModel(measureId);
      return {
        measureModel: {
          type: "edgepullups",
          model: edgePullups,
        },
        measureStats,
        snapshot,
        selectedMeasure: edgePullups.measureId,
        editMeasure: EditMeasure.initModel({
          measureId: edgePullups.measureId,
          measureStats,
          snapshot,
        }),
      };

    case "weightedmovement":
      const weightedMovement = WeightedMovement.initModel(measureId);
      return {
        measureStats,
        measureModel: {
          type: "weightedmovement",
          model: weightedMovement,
        },
        snapshot,
        selectedMeasure: weightedMovement.measureId,
        editMeasure: EditMeasure.initModel({
          measureId: weightedMovement.measureId,
          measureStats,
          snapshot,
        }),
      };

    case "maxrepsmovement":
      const maxRepsMovement = MaxRepsMovement.initModel(measureId);
      return {
        measureStats,
        measureModel: {
          type: "maxrepsmovement",
          model: maxRepsMovement,
        },
        snapshot,
        selectedMeasure: maxRepsMovement.measureId,
        editMeasure: EditMeasure.initModel({
          measureStats,
          measureId: maxRepsMovement.measureId,
          snapshot,
        }),
      };

    case "isometrichold":
      const isometricHold = IsometricHold.initModel(measureId);
      return {
        measureStats,
        measureModel: {
          type: "isometrichold",
          model: isometricHold,
        },
        snapshot,
        selectedMeasure: isometricHold.measureId,
        editMeasure: EditMeasure.initModel({
          measureStats,
          measureId: isometricHold.measureId,
          snapshot,
        }),
      };

    case "powermovement":
      const powerMovement = PowerMovement.initModel(measureId);
      return {
        measureStats,
        measureModel: {
          type: "powermovement",
          model: powerMovement,
        },
        snapshot,
        selectedMeasure: powerMovement.measureId,
        editMeasure: EditMeasure.initModel({
          measureStats,
          measureId: powerMovement.measureId,
          snapshot,
        }),
      };

    case "continuoushang":
      const continuousHang = ContinuousHang.initModel(measureId);
      return {
        measureStats,
        measureModel: {
          type: "continuoushang",
          model: continuousHang,
        },
        snapshot,
        selectedMeasure: continuousHang.measureId,
        editMeasure: EditMeasure.initModel({
          measureStats,
          measureId: continuousHang.measureId,
          snapshot,
        }),
      };

    case "endurance":
      const endurance = Endurance.initModel(measureId);
      return {
        measureStats,
        measureModel: {
          type: "endurance",
          model: endurance,
        },
        snapshot,
        selectedMeasure: endurance.measureId,
        editMeasure: EditMeasure.initModel({
          measureStats,
          measureId: endurance.measureId,
          snapshot,
        }),
      };

    default:
      assertUnreachable(measureClass);
  }
};

export type Msg =
  | {
      type: "CHILD_MSG";
      msg:
        | {
            type: "maxhang";
            msg: MaxHang.Msg;
          }
        | {
            type: "blockpull";
            msg: BlockPull.Msg;
          }
        | {
            type: "minedge";
            msg: MinEdge.Msg;
          }
        | {
            type: "performance";
            msg: Performance.Msg;
          }
        | {
            type: "repeaters";
            msg: Repeaters.Msg;
          }
        | {
            type: "edgepullups";
            msg: EdgePullups.Msg;
          }
        | {
            type: "weightedmovement";
            msg: WeightedMovement.Msg;
          }
        | {
            type: "maxrepsmovement";
            msg: MaxRepsMovement.Msg;
          }
        | {
            type: "isometrichold";
            msg: IsometricHold.Msg;
          }
        | {
            type: "powermovement";
            msg: PowerMovement.Msg;
          }
        | {
            type: "continuoushang";
            msg: ContinuousHang.Msg;
          }
        | {
            type: "endurance";
            msg: Endurance.Msg;
          };
    }
  | {
      type: "EDIT_MEASURE_MSG";
      msg: EditMeasure.Msg;
    };

export const update = (msg: Msg, model: Model): [Model] => {
  switch (msg.type) {
    case "CHILD_MSG":
      return [
        produce(model, (draft) => {
          switch (draft.measureModel.type) {
            case "maxhang":
              if (msg.msg.type != "maxhang") {
                throw new Error("Wrong message type");
              }
              const [next] = MaxHang.update(
                msg.msg.msg,
                draft.measureModel.model,
              );
              draft.measureModel.model = immer.castDraft(next);
              break;
            case "blockpull":
              if (msg.msg.type !== "blockpull") {
                throw new Error("Wrong message type");
              }
              const [next2] = BlockPull.update(
                msg.msg.msg,
                draft.measureModel.model,
              );
              draft.measureModel.model = immer.castDraft(next2);
              break;
            case "minedge": {
              if (msg.msg.type !== "minedge") {
                throw new Error("Wrong message type");
              }
              const [next] = MinEdge.update(
                msg.msg.msg,
                draft.measureModel.model,
              );
              draft.measureModel.model = immer.castDraft(next);
              break;
            }
            case "performance": {
              if (msg.msg.type !== "performance") {
                throw new Error("Wrong message type");
              }
              const [next] = Performance.update(
                msg.msg.msg,
                draft.measureModel.model,
              );
              draft.measureModel.model = immer.castDraft(next);
              break;
            }
            case "repeaters": {
              if (msg.msg.type !== "repeaters") {
                throw new Error("Wrong message type");
              }
              const [next] = Repeaters.update(
                msg.msg.msg,
                draft.measureModel.model,
              );
              draft.measureModel.model = immer.castDraft(next);
              break;
            }
            case "edgepullups": {
              if (msg.msg.type !== "edgepullups") {
                throw new Error("Wrong message type");
              }
              const [next] = EdgePullups.update(
                msg.msg.msg,
                draft.measureModel.model,
              );
              draft.measureModel.model = immer.castDraft(next);
              break;
            }
            case "weightedmovement": {
              if (msg.msg.type !== "weightedmovement") {
                throw new Error("Wrong message type");
              }
              const [next] = WeightedMovement.update(
                msg.msg.msg,
                draft.measureModel.model,
              );
              draft.measureModel.model = immer.castDraft(next);
              break;
            }
            case "maxrepsmovement": {
              if (msg.msg.type !== "maxrepsmovement") {
                throw new Error("Wrong message type");
              }
              const [next] = MaxRepsMovement.update(
                msg.msg.msg,
                draft.measureModel.model,
              );
              draft.measureModel.model = immer.castDraft(next);
              break;
            }
            case "isometrichold": {
              if (msg.msg.type !== "isometrichold") {
                throw new Error("Wrong message type");
              }
              const [next] = IsometricHold.update(
                msg.msg.msg,
                draft.measureModel.model,
              );
              draft.measureModel.model = immer.castDraft(next);
              break;
            }
            case "powermovement": {
              if (msg.msg.type !== "powermovement") {
                throw new Error("Wrong message type");
              }
              const [next] = PowerMovement.update(
                msg.msg.msg,
                draft.measureModel.model,
              );
              draft.measureModel.model = immer.castDraft(next);
              break;
            }
            case "continuoushang": {
              if (msg.msg.type !== "continuoushang") {
                throw new Error("Wrong message type");
              }
              const [next] = ContinuousHang.update(
                msg.msg.msg,
                draft.measureModel.model,
              );
              draft.measureModel.model = immer.castDraft(next);
              break;
            }
            case "endurance": {
              if (msg.msg.type !== "endurance") {
                throw new Error("Wrong message type");
              }
              const [next] = Endurance.update(
                msg.msg.msg,
                draft.measureModel.model,
              );
              draft.measureModel.model = immer.castDraft(next);
              break;
            }
            default:
              assertUnreachable(draft.measureModel);
          }
          draft.selectedMeasure = draft.measureModel.model.measureId;
          if (draft.selectedMeasure != model.selectedMeasure) {
            draft.editMeasure = immer.castDraft(
              EditMeasure.initModel({
                measureStats: model.measureStats,
                measureId: draft.selectedMeasure,
                snapshot: draft.snapshot,
              }),
            );
          }
        }),
      ];

    case "EDIT_MEASURE_MSG":
      return [
        produce(model, (draft) => {
          const [next] = EditMeasure.update(msg.msg, draft.editMeasure);
          draft.editMeasure = immer.castDraft(next);
        }),
      ];
    default:
      return [model];
  }
};

export function view({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: Dispatch<Msg>;
}) {
  return (
    <div>
      {(() => {
        switch (model.measureModel.type) {
          case "maxhang":
            return MaxHang.view({
              model: model.measureModel.model,
              dispatch: (msg) =>
                dispatch({
                  type: "CHILD_MSG",
                  msg: { type: "maxhang", msg },
                }),
            });

          case "blockpull":
            return BlockPull.view({
              model: model.measureModel.model,
              dispatch: (msg) =>
                dispatch({
                  type: "CHILD_MSG",
                  msg: { type: "blockpull", msg },
                }),
            });

          case "minedge":
            return MinEdge.view({
              model: model.measureModel.model,
              dispatch: (msg) =>
                dispatch({
                  type: "CHILD_MSG",
                  msg: { type: "minedge", msg },
                }),
            });

          case "performance":
            return Performance.view({
              model: model.measureModel.model,
              dispatch: (msg) =>
                dispatch({
                  type: "CHILD_MSG",
                  msg: { type: "performance", msg },
                }),
            });

          case "repeaters":
            return Repeaters.view({
              model: model.measureModel.model,
              dispatch: (msg) =>
                dispatch({
                  type: "CHILD_MSG",
                  msg: { type: "repeaters", msg },
                }),
            });

          case "edgepullups":
            return EdgePullups.view({
              model: model.measureModel.model,
              dispatch: (msg) =>
                dispatch({
                  type: "CHILD_MSG",
                  msg: { type: "edgepullups", msg },
                }),
            });

          case "weightedmovement":
            return WeightedMovement.view({
              model: model.measureModel.model,
              dispatch: (msg) =>
                dispatch({
                  type: "CHILD_MSG",
                  msg: { type: "weightedmovement", msg },
                }),
            });

          case "maxrepsmovement":
            return MaxRepsMovement.view({
              model: model.measureModel.model,
              dispatch: (msg) =>
                dispatch({
                  type: "CHILD_MSG",
                  msg: { type: "maxrepsmovement", msg },
                }),
            });

          case "isometrichold":
            return IsometricHold.view({
              model: model.measureModel.model,
              dispatch: (msg) =>
                dispatch({
                  type: "CHILD_MSG",
                  msg: { type: "isometrichold", msg },
                }),
            });

          case "powermovement":
            return PowerMovement.view({
              model: model.measureModel.model,
              dispatch: (msg) =>
                dispatch({
                  type: "CHILD_MSG",
                  msg: { type: "powermovement", msg },
                }),
            });

          case "continuoushang":
            return ContinuousHang.view({
              model: model.measureModel.model,
              dispatch: (msg) =>
                dispatch({
                  type: "CHILD_MSG",
                  msg: { type: "continuoushang", msg },
                }),
            });

          case "endurance":
            return Endurance.view({
              model: model.measureModel.model,
              dispatch: (msg) =>
                dispatch({
                  type: "CHILD_MSG",
                  msg: { type: "endurance", msg },
                }),
            });

          default:
            assertUnreachable(model.measureModel);
        }
      })()}
      <EditMeasure.view
        model={model.editMeasure}
        dispatch={(msg) => dispatch({ type: "EDIT_MEASURE_MSG", msg })}
      />
    </div>
  );
}
