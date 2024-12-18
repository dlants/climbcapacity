import React from "react";
import * as immer from "immer";
const produce = immer.produce;
import * as EditMeasure from "./edit-measure";
import * as EditMeasureClass from "./edit-measure-class";
import { MeasureClassSpec, MeasureId } from "../../../iso/measures";
import { HydratedSnapshot } from "../../types";
import { Dispatch, Update } from "../../tea";
import { assertUnreachable } from "../../util/utils";
import { MeasureStats } from "../../../iso/protocol";

export type Model = immer.Immutable<
  | {
      type: "measure";
      model: EditMeasure.Model;
      measureStats: MeasureStats;
      canSubmit: EditMeasure.CanSubmit;
      measureId: MeasureId;
      trainingMeasureId?: MeasureId;
    }
  | {
      type: "measureClass";
      model: EditMeasureClass.Model;
      measureStats: MeasureStats;
      canSubmit: EditMeasure.CanSubmit;
      measureId: MeasureId;
      trainingMeasureId?: MeasureId;
    }
>;

export type InitOptions =
  | {
      type: "measure";
      measureId: MeasureId;
    }
  | {
      type: "measureClasses";
      measureClasses: MeasureClassSpec[];
    };

export function initModel({
  init,
  snapshot,
  measureStats,
}: {
  init: InitOptions;
  snapshot: HydratedSnapshot;
  measureStats: MeasureStats;
}): Model {
  switch (init.type) {
    case "measure": {
      const model = EditMeasure.initModel({
        measureId: init.measureId,
        measureStats,
        snapshot,
      });
      return {
        type: "measure",
        model,
        measureStats,
        canSubmit: model.canSubmit,
        measureId: model.model.measureId,
        trainingMeasureId: model.trainingMeasure?.measureId,
      };
    }

    case "measureClasses": {
      const model = EditMeasureClass.initModel({
        measureClasses: init.measureClasses,
        measureStats,
        snapshot,
      });
      return {
        type: "measureClass",
        model,
        measureStats,
        canSubmit: model.editMeasure.canSubmit,
        measureId: model.editMeasure.model.measureId,
        trainingMeasureId: model.editMeasure.trainingMeasure?.measureId,
      };
    }
  }
}

export type Msg =
  | {
      type: "EDIT_MEASURE_MSG";
      msg: EditMeasure.Msg;
    }
  | {
      type: "EDIT_MEASURE_CLASS_MSG";
      msg: EditMeasureClass.Msg;
    };

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "EDIT_MEASURE_MSG": {
      const newModel = produce(model, (draft) => {
        if (draft.type != "measure") {
          throw new Error("Unexpected model state does not match msg type");
        }

        const [next] = EditMeasure.update(msg.msg, draft.model);
        draft.model = immer.castDraft(next);
        draft.canSubmit = draft.model.canSubmit;
        draft.measureId = draft.model.model.measureId;
        draft.trainingMeasureId = draft.model.trainingMeasure?.measureId;
      });
      return [newModel];
    }
    case "EDIT_MEASURE_CLASS_MSG": {
      const newModel = produce(model, (draft) => {
        if (draft.type != "measureClass") {
          throw new Error("Unexpected model state does not match msg type");
        }

        const [next] = EditMeasureClass.update(msg.msg, draft.model);
        draft.model = immer.castDraft(next);
        draft.canSubmit = draft.model.editMeasure.canSubmit;
        draft.measureId = draft.model.editMeasure.model.measureId;
        draft.trainingMeasureId =
          draft.model.editMeasure.trainingMeasure?.measureId;
      });
      return [newModel];
    }
    default:
      assertUnreachable(msg);
  }
};
export function view({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: Dispatch<Msg>;
}) {
  switch (model.type) {
    case "measure":
      return (
        <EditMeasure.view
          model={model.model}
          dispatch={(msg) => {
            dispatch({
              type: "EDIT_MEASURE_MSG",
              msg,
            });
          }}
        />
      );
    case "measureClass":
      return (
        <EditMeasureClass.view
          model={model.model}
          dispatch={(msg) => {
            dispatch({
              type: "EDIT_MEASURE_CLASS_MSG",
              msg,
            });
          }}
        />
      );
    default:
      return assertUnreachable(model);
  }
}
