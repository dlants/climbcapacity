import React from "react";
import { MeasureClassSpec, MeasureId } from "../../../iso/measures";
import { HydratedSnapshot } from "../../types";
import { Dispatch } from "../../main";
import { SelectMeasureClass, Msg as SelectMeasureClassMsg } from "./select-measure-class";
import { EditMeasure, Msg as EditMeasureMsg } from "./edit-measure";
import { MeasureStats } from "../../../iso/protocol";

export type Model = {
  selectMeasurePage: SelectMeasureClass;
  editMeasurePage: EditMeasure;
  snapshot: HydratedSnapshot;
};

export type Msg =
  | {
    type: "SELECT_MEASURE_CLASS_MSG";
    msg: SelectMeasureClassMsg;
  }
  | {
    type: "EDIT_MEASURE_MSG";
    msg: EditMeasureMsg;
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
    const selectMeasurePage = new SelectMeasureClass(
      {
        measureStats,
        measureClasses,
        measureId,
      },
      { myDispatch: (msg) => this.context.myDispatch({ type: "SELECT_MEASURE_CLASS_MSG", msg }) }
    );

    const editMeasurePage = new EditMeasure(
      {
        measureId: selectMeasurePage.state.selected.measureId,
        measureStats,
        snapshot,
      },
      { myDispatch: (msg) => this.context.myDispatch({ type: "EDIT_MEASURE_MSG", msg }) }
    );

    this.state = {
      snapshot,
      selectMeasurePage,
      editMeasurePage,
    };
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "EDIT_MEASURE_MSG":
        this.state.editMeasurePage.update(msg.msg);
        break;

      case "SELECT_MEASURE_CLASS_MSG":
        const previousMeasureId = this.state.selectMeasurePage.state.selected.measureId;
        this.state.selectMeasurePage.update(msg.msg);

        if (this.state.selectMeasurePage.state.selected.measureId !== previousMeasureId) {
          this.state.editMeasurePage = new EditMeasure(
            {
              measureId: this.state.selectMeasurePage.state.selected.measureId,
              measureStats: this.state.selectMeasurePage.state.measureStats,
              snapshot: this.state.snapshot,
            },
            { myDispatch: (msg) => this.context.myDispatch({ type: "EDIT_MEASURE_MSG", msg }) }
          );
        }
        break;

      default:
        msg satisfies never;
    }
  }

  view() {
    return (
      <div>
        {this.state.selectMeasurePage.view()}
        {this.state.editMeasurePage.view()}
      </div>
    );
  }
}
