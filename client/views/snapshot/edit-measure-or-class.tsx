import React from "react";
import { EditMeasure } from "./edit-measure";
import { EditMeasureClass } from "./edit-measure-class";
import { MeasureClassSpec, MeasureId } from "../../../iso/measures";
import { HydratedSnapshot } from "../../types";
import { Dispatch } from "../../main";
import { assertUnreachable } from "../../util/utils";
import { MeasureStats } from "../../../iso/protocol";

export type Model =
  | {
    type: "measure";
    editMeasure: EditMeasure;
    measureStats: MeasureStats;
    measureId: MeasureId;
    trainingMeasureId?: MeasureId;
  }
  | {
    type: "measureClass";
    editMeasureClass: EditMeasureClass;
    measureStats: MeasureStats;
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
    msg: import("./edit-measure").Msg;
  }
  | {
    type: "EDIT_MEASURE_CLASS_MSG";
    msg: import("./edit-measure-class").Msg;
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
        const editMeasure = new EditMeasure(
          {
            measureId: initialParams.init.measureId,
            measureStats: initialParams.measureStats,
            snapshot: initialParams.snapshot,
          },
          { myDispatch: (msg) => this.context.myDispatch({ type: "EDIT_MEASURE_MSG", msg }) }
        );
        this.state = {
          type: "measure",
          editMeasure,
          measureStats: initialParams.measureStats,
          measureId: editMeasure.state.unitInputComponent.state.measureId,
          trainingMeasureId: editMeasure.state.trainingMeasure?.measureId,
        };
        break;
      }

      case "measureClasses": {
        const editMeasureClass = new EditMeasureClass(
          {
            measureClasses: initialParams.init.measureClasses,
            measureStats: initialParams.measureStats,
            snapshot: initialParams.snapshot,
          },
          { myDispatch: (msg) => this.context.myDispatch({ type: "EDIT_MEASURE_CLASS_MSG", msg }) }
        );
        this.state = {
          type: "measureClass",
          editMeasureClass,
          measureStats: initialParams.measureStats,
          measureId: editMeasureClass.state.editMeasurePage.state.unitInputComponent.state.measureId,
          trainingMeasureId: editMeasureClass.state.editMeasurePage.state.trainingMeasure?.measureId,
        };
        break;
      }
    }
  }

  get canSubmit() {
    switch (this.state.type) {
      case "measure":
        return this.state.editMeasure.state.canSubmit;
      case "measureClass":
        return this.state.editMeasureClass.state.editMeasurePage.state.canSubmit;
      default:
        return assertUnreachable(this.state);
    }
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "EDIT_MEASURE_MSG": {
        if (this.state.type !== "measure") {
          throw new Error("Unexpected model state does not match msg type");
        }

        this.state.editMeasure.update(msg.msg);
        this.state.measureId = this.state.editMeasure.state.unitInputComponent.state.measureId;
        this.state.trainingMeasureId = this.state.editMeasure.state.trainingMeasure?.measureId;
        break;
      }
      case "EDIT_MEASURE_CLASS_MSG": {
        if (this.state.type !== "measureClass") {
          throw new Error("Unexpected model state does not match msg type");
        }

        this.state.editMeasureClass.update(msg.msg);
        this.state.measureId = this.state.editMeasureClass.state.editMeasurePage.state.unitInputComponent.state.measureId;
        this.state.trainingMeasureId = this.state.editMeasureClass.state.editMeasurePage.state.trainingMeasure?.measureId;
        break;
      }
      default:
        assertUnreachable(msg);
    }
  }

  view() {
    switch (this.state.type) {
      case "measure":
        return this.state.editMeasure.view();
      case "measureClass":
        return this.state.editMeasureClass.view();
      default:
        return assertUnreachable(this.state);
    }
  }
}
