import * as DCGView from "dcgview";
import { MeasureClassSpec, MeasureId } from "../../../iso/measures";
import { HydratedSnapshot } from "../../types";
import { Dispatch } from "../../types";
import {
  SelectMeasureClassController,
  SelectMeasureClassView,
  Msg as SelectMeasureClassMsg,
} from "./select-measure-class";
import {
  EditMeasureController,
  EditMeasureView,
  Msg as EditMeasureMsg,
} from "./edit-measure";
import { MeasureStats } from "../../../iso/protocol";
import { Locale } from "../../../iso/locale";

export type Model = {
  selectMeasurePage: SelectMeasureClassController;
  editMeasurePage: EditMeasureController;
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

export class EditMeasureClassController {
  state: Model;

  constructor(
    measureClasses: MeasureClassSpec[],
    measureStats: MeasureStats,
    snapshot: HydratedSnapshot,
    measureId: MeasureId | undefined,
    public context: {
      myDispatch: Dispatch<Msg>;
      locale: () => Locale;
    },
  ) {
    const selectMeasurePage = new SelectMeasureClassController(
      {
        measureClasses,
        measureStats,
        measureId,
      },
      {
        myDispatch: (msg: SelectMeasureClassMsg) =>
          this.context.myDispatch({ type: "SELECT_MEASURE_CLASS_MSG", msg }),
      },
    );

    const editMeasurePage = new EditMeasureController(
      {
        measureId: selectMeasurePage.state.selected.measureId,
        measureStats,
        snapshot,
      },
      {
        myDispatch: (msg: EditMeasureMsg) =>
          this.context.myDispatch({ type: "EDIT_MEASURE_MSG", msg }),
        locale: this.context.locale,
      },
    );

    this.state = {
      snapshot,
      selectMeasurePage,
      editMeasurePage,
    };
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "EDIT_MEASURE_MSG":
        this.state.editMeasurePage.handleDispatch(msg.msg);
        break;

      case "SELECT_MEASURE_CLASS_MSG": {
        const previousMeasureId =
          this.state.selectMeasurePage.state.selected.measureId;
        this.state.selectMeasurePage.handleDispatch(msg.msg);

        if (
          this.state.selectMeasurePage.state.selected.measureId !==
          previousMeasureId
        ) {
          this.state.editMeasurePage = new EditMeasureController(
            {
              measureId: this.state.selectMeasurePage.state.selected.measureId,
              measureStats: this.state.selectMeasurePage.state.measureStats,
              snapshot: this.state.snapshot,
            },
            {
              myDispatch: (msg) =>
                this.context.myDispatch({ type: "EDIT_MEASURE_MSG", msg }),
              locale: this.context.locale,
            },
          );
        }
        break;
      }

      default:
        msg satisfies never;
    }
  }
}

export class EditMeasureClassView extends DCGView.View<{
  controller: EditMeasureClassController;
}> {
  template() {
    const stateProp = () => this.props.controller().state;

    return (
      <div>
        <SelectMeasureClassView
          controller={() => stateProp().selectMeasurePage}
        />
        <EditMeasureView controller={() => stateProp().editMeasurePage} />
      </div>
    );
  }
}
