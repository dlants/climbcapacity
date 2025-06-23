import React from "react";
import { MeasureClassSpec, MeasureId } from "../../../iso/measures";
import { HydratedSnapshot } from "../../types";
import { Dispatch } from "../../tea";
import * as SelectMeasureClass from "./select-measure-class";
import * as EditMeasure from "./edit-measure";
import { MeasureStats } from "../../../iso/protocol";

export type Model = {
  selectMeasure: SelectMeasureClass.Model;
  editMeasure: EditMeasure.Model;
  snapshot: HydratedSnapshot;
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

export class EditMeasureClass {
  state: Model;

  constructor(
    {
      measureStats,
      measureClasses,
      measureId,
      snapshot,
    }: {
      measureClasses: MeasureClassSpec[];
      measureId?: MeasureId;
      measureStats: MeasureStats;
      snapshot: HydratedSnapshot;
    },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    const selectMeasure = SelectMeasureClass.initModel({
      measureStats,
      measureClasses,
      measureId,
    });

    this.state = {
      snapshot,
      selectMeasure,
      editMeasure: EditMeasure.initModel({
        measureId: selectMeasure.selected.measureId,
        measureStats,
        snapshot,
      }),
    };
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "EDIT_MEASURE_MSG":
        const [nextEditMeasure] = EditMeasure.update(msg.msg, this.state.editMeasure);
        this.state.editMeasure = nextEditMeasure;
        break;

      case "SELECT_MEASURE_CLASS_MSG":
        const [nextSelectMeasure] = SelectMeasureClass.update(
          msg.msg,
          this.state.selectMeasure
        );
        const previousMeasureId = this.state.selectMeasure.selected.measureId;
        this.state.selectMeasure = nextSelectMeasure;

        if (this.state.selectMeasure.selected.measureId !== previousMeasureId) {
          this.state.editMeasure = EditMeasure.initModel({
            measureId: nextSelectMeasure.selected.measureId,
            measureStats: nextSelectMeasure.measureStats,
            snapshot: this.state.snapshot,
          });
        }
        break;

      default:
        break;
    }
  }

  view() {
    return (
      <div>
        <SelectMeasureClass.view
          model={this.state.selectMeasure}
          dispatch={(msg) => this.context.myDispatch({ type: "SELECT_MEASURE_CLASS_MSG", msg })}
        />

        <EditMeasure.view
          model={this.state.editMeasure}
          dispatch={(msg) => this.context.myDispatch({ type: "EDIT_MEASURE_MSG", msg })}
        />
      </div>
    );
  }
}
