import React from "react";
import {
  generateTrainingMeasureId,
  getSpec,
  MeasureId,
} from "../../../iso/measures";
import { UnitValue } from "../../../iso/units";
import { HydratedSnapshot } from "../../types";
import { UnitInputComponent } from "../unit-input";
import { Dispatch } from "../../tea";
import { UnitToggle } from "../unit-toggle";
import { MeasureStats } from "../../../iso/protocol";

export type Model = {
  unitInputComponent: UnitInputComponent;
  measureStats: MeasureStats;
  trainingMeasure?: {
    measureId: MeasureId;
    unitInputComponent: UnitInputComponent;
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

export class EditMeasure {
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
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    const unitInputComponent = new UnitInputComponent(
      measureId,
      { myDispatch: (msg) => this.context.myDispatch({ type: "UNIT_INPUT_MSG", msg }) },
      snapshot.measures[measureId] as UnitValue | undefined,
    );

    const measure = getSpec(measureId);
    let trainingMeasure;
    if (measure.type == "input") {
      const trainingMeasureId = generateTrainingMeasureId(measureId);
      const trainingUnitInputComponent = new UnitInputComponent(
        trainingMeasureId,
        { myDispatch: (msg) => this.context.myDispatch({ type: "TRAINING_UNIT_INPUT_MSG", msg }) },
        snapshot.measures[trainingMeasureId] as UnitValue | undefined,
      );
      trainingMeasure = {
        measureId: trainingMeasureId,
        unitInputComponent: trainingUnitInputComponent,
      };
    }

    this.state = {
      unitInputComponent,
      measureStats,
      trainingMeasure,
      canSubmit: this.canSubmit({ unitInputComponent, trainingMeasure }),
    };
  }

  private canSubmit(
    model: Omit<Model, "canSubmit" | "measureStats">,
  ): Model["canSubmit"] {
    let value;
    if (model.unitInputComponent.state.parseResult.status == "success") {
      value = model.unitInputComponent.state.parseResult.value;
    } else {
      return undefined;
    }

    if (model.trainingMeasure) {
      if (model.trainingMeasure.unitInputComponent.state.parseResult.status == "success") {
        return {
          measureId: model.unitInputComponent.state.measureId,
          value,
          trainingMeasure: {
            measureId: model.trainingMeasure.measureId,
            value: model.trainingMeasure.unitInputComponent.state.parseResult.value,
          },
        };
      } else {
        return undefined;
      }
    } else {
      return { measureId: model.unitInputComponent.state.measureId, value };
    }
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "UNIT_INPUT_MSG":
        this.state.unitInputComponent.update(msg.msg);
        this.state.canSubmit = this.canSubmit(this.state);
        break;
      case "TRAINING_UNIT_INPUT_MSG":
        if (!this.state.trainingMeasure) {
          throw new Error("No training measure");
        }

        this.state.trainingMeasure.unitInputComponent.update(msg.msg);
        this.state.canSubmit = this.canSubmit(this.state);
        break;
    }
  }

  view() {
    const EditMeasureView = ({
      unitInputComponent,
      isTraining = false
    }: {
      unitInputComponent: UnitInputComponent;
      isTraining?: boolean;
    }) => {
      const measure = getSpec(unitInputComponent.state.measureId);
      const unitToggle = new UnitToggle(
        {
          measureId: unitInputComponent.state.measureId,
          selectedUnit: unitInputComponent.state.selectedUnit,
          possibleUnits: unitInputComponent.state.possibleUnits,
        },
        {
          myDispatch: (msg) => this.context.myDispatch({
            type: isTraining ? "TRAINING_UNIT_INPUT_MSG" : "UNIT_INPUT_MSG",
            msg
          })
        }
      );

      return (
        <div className={`measure-item`}>
          <label>{measure.name}</label>
          <pre>{measure.description}</pre>
          {unitInputComponent.view()}
          {measure.units.length > 1 && unitToggle.view()}
        </div>
      );
    };

    return (
      <div>
        <EditMeasureView unitInputComponent={this.state.unitInputComponent} />
        {this.state.trainingMeasure && (
          <EditMeasureView
            unitInputComponent={this.state.trainingMeasure.unitInputComponent}
            isTraining={true}
          />
        )}
      </div>
    );
  }
}
