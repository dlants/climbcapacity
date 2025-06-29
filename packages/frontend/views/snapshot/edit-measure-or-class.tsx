import * as DCGView from "dcgview";
import { EditMeasureController, EditMeasureView } from "./edit-measure";
import { EditMeasureClassController, EditMeasureClassView } from "./edit-measure-class";
import { MeasureClassSpec, MeasureId } from "../../../iso/measures";
import { HydratedSnapshot } from "../../types";
import { Dispatch } from "../../types";
import { assertUnreachable } from "../../util/utils";
import { MeasureStats } from "../../../iso/protocol";

export type Model =
  | {
    type: "measure";
    editMeasure: EditMeasureController;
    measureStats: MeasureStats;
    measureId: MeasureId;
    trainingMeasureId?: MeasureId;
  }
  | {
    type: "measureClass";
    editMeasureClass: EditMeasureClassController;
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

export class EditMeasureOrClassController {
  state: Model;

  constructor({ init, snapshot, measureStats }: {
    init: InitOptions,
    snapshot: HydratedSnapshot,
    measureStats: MeasureStats,
  }, public context: {
    myDispatch: Dispatch<Msg>
  }
  ) {
    // Initialize state based on init options
    switch (init.type) {
      case "measure": {
        const editMeasure = new EditMeasureController(
          {
            measureId: init.measureId,
            measureStats: measureStats,
            snapshot: snapshot,
          },
          (msg) => this.context.myDispatch({ type: "EDIT_MEASURE_MSG", msg })
        );
        this.state = {
          type: "measure",
          editMeasure,
          measureStats: measureStats,
          measureId: editMeasure.state.unitInputController.state.measureId,
          trainingMeasureId: editMeasure.state.trainingMeasure?.measureId,
        };
        break;
      }

      case "measureClasses": {
        const editMeasureClass = new EditMeasureClassController(
          init.measureClasses,
          measureStats,
          snapshot,
          undefined,
          (msg) => this.context.myDispatch({ type: "EDIT_MEASURE_CLASS_MSG", msg })
        );
        this.state = {
          type: "measureClass",
          editMeasureClass,
          measureStats: measureStats,
          measureId: editMeasureClass.state.editMeasurePage.state.unitInputController.state.measureId,
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

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "EDIT_MEASURE_MSG": {
        if (this.state.type !== "measure") {
          throw new Error("Unexpected model state does not match msg type");
        }

        this.state.editMeasure.handleDispatch(msg.msg);
        this.state.measureId = this.state.editMeasure.state.unitInputController.state.measureId;
        this.state.trainingMeasureId = this.state.editMeasure.state.trainingMeasure?.measureId;
        break;
      }
      case "EDIT_MEASURE_CLASS_MSG": {
        if (this.state.type !== "measureClass") {
          throw new Error("Unexpected model state does not match msg type");
        }

        this.state.editMeasureClass.handleDispatch(msg.msg);
        this.state.measureId = this.state.editMeasureClass.state.editMeasurePage.state.unitInputController.state.measureId;
        this.state.trainingMeasureId = this.state.editMeasureClass.state.editMeasurePage.state.trainingMeasure?.measureId;
        break;
      }
      default:
        assertUnreachable(msg);
    }
  }
}

export class EditMeasureOrClassView extends DCGView.View<{
  controller: EditMeasureOrClassController;
}> {
  template() {
    const { SwitchUnion } = DCGView.Components;
    const stateProp = () => this.props.controller().state;

    return SwitchUnion(() => stateProp(), 'type', {
      measure: (measureProp) => (
        <EditMeasureView controller={() => measureProp().editMeasure} />
      ),
      measureClass: (measureClassProp) => (
        <EditMeasureClassView controller={() => measureClassProp().editMeasureClass} />
      ),
    });
  }
}
