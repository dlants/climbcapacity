import * as DCGView from "dcgview";
import {
  generateTrainingMeasureId,
  getSpec,
  MeasureId,
} from "../../../iso/measures";
import { UnitValue } from "../../../iso/units";
import { HydratedSnapshot } from "../../types";
import { UnitInputController, UnitInputView } from "../unit-input";
import { Dispatch } from "../../types";
import { UnitToggleController, UnitToggleView, Msg as UnitToggleMsg } from "../unit-toggle";
import { MeasureStats } from "../../../iso/protocol";

export type Model = {
  unitInputController: UnitInputController;
  unitToggleController: UnitToggleController;
  measureStats: MeasureStats;
  trainingMeasure?: {
    measureId: MeasureId;
    unitInputController: UnitInputController;
    unitToggleController: UnitToggleController;
  };
  canSubmit:
  | {
    measureId: MeasureId;
    value: UnitValue;
    trainingMeasure?: {
      measureId: MeasureId;
      value: UnitValue;
    };
  }
  | undefined;
};

export type CanSubmit = Model["canSubmit"];

export type Msg =
  | {
    type: "UNIT_INPUT_MSG";
    msg: import("../unit-input").Msg;
  }
  | {
    type: "TRAINING_UNIT_INPUT_MSG";
    msg: import("../unit-input").Msg;
  };

export class EditMeasureController {
  state: Model;

  constructor(
    {
      measureId,
      measureStats,
      snapshot,
    }: {
      measureId: MeasureId;
      measureStats: MeasureStats;
      snapshot: HydratedSnapshot;
    },
    public myDispatch: Dispatch<Msg>
  ) {
    const unitInputController = new UnitInputController(
      measureId,
      (msg) => this.myDispatch({ type: "UNIT_INPUT_MSG", msg }),
      snapshot.measures[measureId] as UnitValue | undefined,
    );

    const unitToggleController = new UnitToggleController(
      {
        measureId: unitInputController.state.measureId,
        selectedUnit: unitInputController.state.selectedUnit,
        possibleUnits: unitInputController.state.possibleUnits,
      },
      {
        myDispatch: (msg: UnitToggleMsg) => this.myDispatch({
          type: "UNIT_INPUT_MSG",
          msg
        })
      }
    );

    const measure = getSpec(measureId);
    let trainingMeasure;
    if (measure.type == "input") {
      const trainingMeasureId = generateTrainingMeasureId(measureId);
      const trainingUnitInputController = new UnitInputController(
        trainingMeasureId,
        (msg) => this.myDispatch({ type: "TRAINING_UNIT_INPUT_MSG", msg }),
        snapshot.measures[trainingMeasureId] as UnitValue | undefined,
      );
      const trainingUnitToggleController = new UnitToggleController(
        {
          measureId: trainingUnitInputController.state.measureId,
          selectedUnit: trainingUnitInputController.state.selectedUnit,
          possibleUnits: trainingUnitInputController.state.possibleUnits,
        },
        {
          myDispatch: (msg: UnitToggleMsg) => this.myDispatch({
            type: "TRAINING_UNIT_INPUT_MSG",
            msg
          })
        }
      );
      trainingMeasure = {
        measureId: trainingMeasureId,
        unitInputController: trainingUnitInputController,
        unitToggleController: trainingUnitToggleController,
      };
    }

    this.state = {
      unitInputController: unitInputController,
      unitToggleController: unitToggleController,
      measureStats,
      trainingMeasure,
      canSubmit: this.canSubmit({ unitInputController, trainingMeasure }),
    };
  }

  public canSubmit(
    model: Omit<Model, "canSubmit" | "measureStats" | "unitToggleController">,
  ): Model["canSubmit"] {
    let value;
    if (model.unitInputController.state.parseResult.status == "success") {
      value = model.unitInputController.state.parseResult.value;
    } else {
      return undefined;
    }

    if (model.trainingMeasure) {
      if (model.trainingMeasure.unitInputController.state.parseResult.status == "success") {
        return {
          measureId: model.unitInputController.state.measureId,
          value,
          trainingMeasure: {
            measureId: model.trainingMeasure.measureId,
            value: model.trainingMeasure.unitInputController.state.parseResult.value,
          },
        };
      } else {
        return undefined;
      }
    } else {
      return { measureId: model.unitInputController.state.measureId, value };
    }
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "UNIT_INPUT_MSG":
        this.state.unitInputController.handleDispatch(msg.msg);
        this.state.canSubmit = this.canSubmit(this.state);
        break;
      case "TRAINING_UNIT_INPUT_MSG":
        if (!this.state.trainingMeasure) {
          throw new Error("No training measure");
        }

        this.state.trainingMeasure.unitInputController.handleDispatch(msg.msg);
        this.state.canSubmit = this.canSubmit(this.state);
        break;
    }
  }
}

export class EditMeasureView extends DCGView.View<{
  controller: EditMeasureController;
}> {
  template() {
    const stateProp = () => this.props.controller().state;

    return (
      <div>
        <EditMeasureItemView
          unitInputController={() => stateProp().unitInputController}
          unitToggleController={() => stateProp().unitToggleController}
        />
        {() => stateProp().trainingMeasure && (
          <EditMeasureItemView
            unitInputController={() => stateProp().trainingMeasure!.unitInputController}
            unitToggleController={() => stateProp().trainingMeasure!.unitToggleController}
          />
        )}
      </div>
    );
  }
}

class EditMeasureItemView extends DCGView.View<{
  unitInputController: () => UnitInputController;
  unitToggleController: () => UnitToggleController;
}> {
  template() {
    const unitInputController = this.props.unitInputController();
    const measure = getSpec(unitInputController.state.measureId);

    return (
      <div class="measure-item">
        <label>{measure.name}</label>
        <pre>{measure.description}</pre>
        <UnitInputView
          controller={() => this.props.unitInputController()}
        />
        {() => measure.units.length > 1 && (
          <UnitToggleView controller={() => this.props.unitToggleController()} />
        )}
      </div>
    );
  }
}
