import React from "react";
import { MeasureClassSpec, MeasureId } from "../../../iso/measures";
import { HydratedSnapshot } from "../../types";
import * as immer from "immer";
import { Dispatch } from "../../tea";
const produce = immer.produce;
import * as SelectMeasureClass from "./select-measure-class";
import * as EditMeasure from "./edit-measure";
import { MeasureStats } from "../../../iso/protocol";

export type Model = immer.Immutable<{
  selectMeasure: SelectMeasureClass.Model;
  editMeasure: EditMeasure.Model;
  snapshot: HydratedSnapshot;
}>;

export const initModel = ({
  measureStats,
  measureClasses,
  measureId,
  snapshot,
}: {
  measureClasses: MeasureClassSpec[];
  measureId?: MeasureId;
  measureStats: MeasureStats;
  snapshot: HydratedSnapshot;
}): Model => {
  const selectMeasure = SelectMeasureClass.initModel({
    measureStats,
    measureClasses,
    measureId,
  });

  return {
    snapshot,
    selectMeasure,
    editMeasure: EditMeasure.initModel({
      measureId: selectMeasure.selected.measureId,
      measureStats,
      snapshot,
    }),
  };
};

export type Msg =
  | {
      type: "SELECT_MEASURE_CLASS_MSG";
      msg: SelectMeasureClass.Msg;
    }
  | {
      type: "EDIT_MEASURE_MSG";
      msg: EditMeasure.Msg;
    };

export const update = (msg: Msg, model: Model): [Model] => {
  switch (msg.type) {
    case "EDIT_MEASURE_MSG":
      return [
        produce(model, (draft) => {
          const [next] = EditMeasure.update(msg.msg, draft.editMeasure);
          draft.editMeasure = immer.castDraft(next);
        }),
      ];

    case "SELECT_MEASURE_CLASS_MSG": {
      return [
        produce(model, (draft) => {
          const [selectMeasure] = SelectMeasureClass.update(
            msg.msg,
            draft.selectMeasure,
          );
          draft.selectMeasure = immer.castDraft(selectMeasure);
          if (
            draft.selectMeasure.selected.measureId !=
            model.selectMeasure.selected.measureId
          ) {
            draft.editMeasure = immer.castDraft(
              EditMeasure.initModel({
                measureId: selectMeasure.selected.measureId,
                measureStats: selectMeasure.measureStats,
                snapshot: model.snapshot,
              }),
            );
          }
        }),
      ];
    }

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
      <SelectMeasureClass.view
        model={model.selectMeasure}
        dispatch={(msg) => dispatch({ type: "SELECT_MEASURE_CLASS_MSG", msg })}
      />

      <EditMeasure.view
        model={model.editMeasure}
        dispatch={(msg) => dispatch({ type: "EDIT_MEASURE_MSG", msg })}
      />
    </div>
  );
}
