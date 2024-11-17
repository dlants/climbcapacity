import React from "react";
import { MeasureId } from "../../../iso/measures";
import { HydratedSnapshot } from "../../types";
import * as immer from "immer";
import { Dispatch } from "../../tea";
const produce = immer.produce;
import * as MaxHang from "./measure-class/maxhang";
import * as BlockPull from "./measure-class/blockpull";
import * as MinEdge from "./measure-class/minedge";
import * as EditMeasure from "./edit-measure";
import { assertUnreachable } from "../../../iso/utils";

export type MeasureClass = "maxhang" | "blockpull" | "minedge";

export type Model = immer.Immutable<{
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
      };
  snapshot: HydratedSnapshot;
  selectedMeasure: MeasureId;
  editMeasure: EditMeasure.Model;
}>;

export const initModel = ({
  measureClass,
  measureId,
  snapshot,
}: {
  measureClass: MeasureClass;
  measureId?: MeasureId;
  snapshot: HydratedSnapshot;
}): Model => {
  switch (measureClass) {
    case "maxhang":
      const maxHang = MaxHang.initModel(measureId);
      return {
        measureModel: {
          type: "maxhang",
          model: maxHang,
        },
        snapshot,
        selectedMeasure: maxHang.measureId,
        editMeasure: EditMeasure.initModel({
          measureId: maxHang.measureId,
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
        snapshot,
        selectedMeasure: blockPull.measureId,
        editMeasure: EditMeasure.initModel({
          measureId: blockPull.measureId,
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
        snapshot,
        selectedMeasure: minEdge.measureId,
        editMeasure: EditMeasure.initModel({
          measureId: minEdge.measureId,
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
            default:
              assertUnreachable(draft.measureModel);
          }
          draft.selectedMeasure = draft.measureModel.model.measureId;
          if (draft.selectedMeasure != model.selectedMeasure) {
            draft.editMeasure = immer.castDraft(
              EditMeasure.initModel({
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
