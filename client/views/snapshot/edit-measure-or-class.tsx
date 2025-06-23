import React from "react";
import * as EditMeasure from "./edit-measure";
import * as EditMeasureClass from "./edit-measure-class";
import { MeasureClassSpec, MeasureId } from "../../../iso/measures";
import { HydratedSnapshot } from "../../types";
import { Dispatch } from "../../tea";
import { assertUnreachable } from "../../util/utils";
import { MeasureStats } from "../../../iso/protocol";

export type Model =
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
  };

export type InitOptions =
  | {
    type: "measure";
    measureId: MeasureId;
  }
  | {
    type: "measureClasses";
    measureClasses: MeasureClassSpec[];
  };

export type Msg =
  | {
    type: "EDIT_MEASURE_MSG";
    msg: EditMeasure.Msg;
  }
  | {
    type: "EDIT_MEASURE_CLASS_MSG";
    msg: EditMeasureClass.Msg;
  };

export class EditMeasureOrClass {
  state: Model;

  constructor(
    initialParams: {
      init: InitOptions;
      snapshot: HydratedSnapshot;
      measureStats: MeasureStats;
    },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    // Initialize state based on init options
    switch (initialParams.init.type) {
      case "measure": {
        const model = EditMeasure.initModel({
          measureId: initialParams.init.measureId,
          measureStats: initialParams.measureStats,
          snapshot: initialParams.snapshot,
        });
        this.state = {
          type: "measure",
          model,
          measureStats: initialParams.measureStats,
          canSubmit: model.canSubmit,
          measureId: model.model.measureId,
          trainingMeasureId: model.trainingMeasure?.measureId,
        };
        break;
      }

      case "measureClasses": {
        const model = EditMeasureClass.initModel({
          measureClasses: initialParams.init.measureClasses,
          measureStats: initialParams.measureStats,
          snapshot: initialParams.snapshot,
        });
        this.state = {
          type: "measureClass",
          model,
          measureStats: initialParams.measureStats,
          canSubmit: model.editMeasure.canSubmit,
          measureId: model.editMeasure.model.measureId,
          trainingMeasureId: model.editMeasure.trainingMeasure?.measureId,
        };
        break;
      }
    }
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "EDIT_MEASURE_MSG": {
        if (this.state.type !== "measure") {
          throw new Error("Unexpected model state does not match msg type");
        }

        const [next] = EditMeasure.update(msg.msg, this.state.model);
        this.state.model = next;
        this.state.canSubmit = this.state.model.canSubmit;
        this.state.measureId = this.state.model.model.measureId;
        this.state.trainingMeasureId = this.state.model.trainingMeasure?.measureId;
        break;
      }
      case "EDIT_MEASURE_CLASS_MSG": {
        if (this.state.type !== "measureClass") {
          throw new Error("Unexpected model state does not match msg type");
        }

        const [next] = EditMeasureClass.update(msg.msg, this.state.model);
        this.state.model = next;
        this.state.canSubmit = this.state.model.editMeasure.canSubmit;
        this.state.measureId = this.state.model.editMeasure.model.measureId;
        this.state.trainingMeasureId = this.state.model.editMeasure.trainingMeasure?.measureId;
        break;
      }
      default:
        assertUnreachable(msg);
    }
  }

  view() {
    switch (this.state.type) {
      case "measure":
        return (
          <EditMeasure.view
            model={this.state.model}
            dispatch={(msg) => {
              this.context.myDispatch({
                type: "EDIT_MEASURE_MSG",
                msg,
              });
            }}
          />
        );
      case "measureClass":
        return (
          <EditMeasureClass.view
            model={this.state.model}
            dispatch={(msg) => {
              this.context.myDispatch({
                type: "EDIT_MEASURE_CLASS_MSG",
                msg,
              });
            }}
          />
        );
      default:
        return assertUnreachable(this.state);
    }
  }
}
