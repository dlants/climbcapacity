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
import { MeasureStats } from "../../../iso/protocol";
import { Locale } from "../../../iso/locale";

const { If } = DCGView.Components;

export type Model = {
  unitInputController: UnitInputController;
  measureStats: MeasureStats;
  trainingMeasure?: {
    measureId: MeasureId;
    unitInputController: UnitInputController;
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
    public context: {
      myDispatch: Dispatch<Msg>;
      locale: () => Locale;
    },
  ) {
    const unitInputController = new UnitInputController(
      measureId,
      {
        myDispatch: (msg) =>
          this.context.myDispatch({ type: "UNIT_INPUT_MSG", msg }),
        locale: this.context.locale,
      },
      snapshot.measures[measureId] as UnitValue | undefined,
    );

    const measure = getSpec(measureId);
    let trainingMeasure;
    if (measure.type == "input") {
      const trainingMeasureId = generateTrainingMeasureId(measureId);
      const trainingUnitInputController = new UnitInputController(
        trainingMeasureId,
        {
          myDispatch: (msg) =>
            this.context.myDispatch({ type: "TRAINING_UNIT_INPUT_MSG", msg }),
          locale: this.context.locale,
        },
        snapshot.measures[trainingMeasureId] as UnitValue | undefined,
      );
      trainingMeasure = {
        measureId: trainingMeasureId,
        unitInputController: trainingUnitInputController,
      };
    }

    this.state = {
      unitInputController: unitInputController,
      measureStats,
      trainingMeasure,
      canSubmit: this.canSubmit({ unitInputController, trainingMeasure }),
    };
  }

  public canSubmit(
    model: Omit<Model, "canSubmit" | "measureStats">,
  ): Model["canSubmit"] {
    let value;
    if (model.unitInputController.state.parseResult.status == "success") {
      value = model.unitInputController.state.parseResult.value;
    } else {
      return undefined;
    }

    if (model.trainingMeasure) {
      if (
        model.trainingMeasure.unitInputController.state.parseResult.status ==
        "success"
      ) {
        return {
          measureId: model.unitInputController.state.measureId,
          value,
          trainingMeasure: {
            measureId: model.trainingMeasure.measureId,
            value:
              model.trainingMeasure.unitInputController.state.parseResult.value,
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
        />
        <If predicate={() => !!stateProp().trainingMeasure}>
          {() => (
            <EditMeasureItemView
              unitInputController={() =>
                stateProp().trainingMeasure!.unitInputController
              }
            />
          )}
        </If>
      </div>
    );
  }
}

class EditMeasureItemView extends DCGView.View<{
  unitInputController: () => UnitInputController;
}> {
  template() {
    const unitInputController = this.props.unitInputController();
    const measure = getSpec(unitInputController.state.measureId);

    return (
      <div class="measure-item">
        <label>{measure.name}</label>
        <pre>{measure.description}</pre>
        <UnitInputView controller={() => this.props.unitInputController()} />
      </div>
    );
  }
}
