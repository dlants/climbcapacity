import React from "react";
import {
  generateTrainingMeasureId,
  getSpec,
  MeasureId,
} from "../../../iso/measures";
import { UnitValue } from "../../../iso/units";
import { HydratedSnapshot } from "../../types";
import * as UnitInput from "../unit-input";
import { Dispatch } from "../../tea";
import * as UnitToggle from "../unit-toggle";
import { MeasureStats } from "../../../iso/protocol";

export type Model = {
  model: UnitInput.Model;
  measureStats: MeasureStats;
  trainingMeasure?: {
    measureId: MeasureId;
    model: UnitInput.Model;
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
    msg: UnitInput.Msg;
  }
  | {
    type: "TRAINING_UNIT_INPUT_MSG";
    msg: UnitInput.Msg;
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
    const inputModel = UnitInput.initModel(
      measureId,
      snapshot.measures[measureId] as UnitValue | undefined,
    );

    const measure = getSpec(measureId);
    let trainingMeasure;
    if (measure.type == "input") {
      const trainingMeasureId = generateTrainingMeasureId(measureId);
      let trainingInputmodel = UnitInput.initModel(
        trainingMeasureId,
        snapshot.measures[trainingMeasureId] as UnitValue | undefined,
      );
      trainingMeasure = {
        measureId: trainingMeasureId,
        model: trainingInputmodel,
      };
    }

    this.state = {
      model: inputModel,
      measureStats,
      trainingMeasure,
      canSubmit: this.canSubmit({ model: inputModel, trainingMeasure }),
    };
  }

  private canSubmit(
    model: Omit<Model, "canSubmit" | "measureStats">,
  ): Model["canSubmit"] {
    let value;
    if (model.model.parseResult.status == "success") {
      value = model.model.parseResult.value;
    } else {
      return undefined;
    }

    if (model.trainingMeasure) {
      if (model.trainingMeasure.model.parseResult.status == "success") {
        return {
          measureId: model.model.measureId,
          value,
          trainingMeasure: {
            measureId: model.trainingMeasure.measureId,
            value: model.trainingMeasure.model.parseResult.value,
          },
        };
      } else {
        return undefined;
      }
    } else {
      return { measureId: model.model.measureId, value };
    }
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "UNIT_INPUT_MSG":
        const [next] = UnitInput.update(msg.msg, this.state.model);
        this.state.model = next;
        this.state.canSubmit = this.canSubmit(this.state);
        break;
      case "TRAINING_UNIT_INPUT_MSG":
        if (!this.state.trainingMeasure) {
          throw new Error("No training measure");
        }

        const [nextTraining] = UnitInput.update(msg.msg, this.state.trainingMeasure.model);
        this.state.trainingMeasure.model = nextTraining;
        this.state.canSubmit = this.canSubmit(this.state);
        break;
    }
  }

  view() {
    const EditMeasureView = ({ model }: { model: UnitInput.Model }) => {
      const measure = getSpec(model.measureId);
      return (
        <div className={`measure-item`}>
          <label>{measure.name}</label>
          <pre>{measure.description}</pre>
          <UnitInput.UnitInput
            model={model}
            dispatch={(msg) => this.context.myDispatch({
              type: model === this.state.model ? "UNIT_INPUT_MSG" : "TRAINING_UNIT_INPUT_MSG",
              msg
            })}
          />
          {measure.units.length > 1 && (
            <UnitToggle.view
              model={model}
              dispatch={(msg) => this.context.myDispatch({
                type: model === this.state.model ? "UNIT_INPUT_MSG" : "TRAINING_UNIT_INPUT_MSG",
                msg
              })}
            />
          )}
        </div>
      );
    };

    return (
      <div>
        <EditMeasureView model={this.state.model} />
        {this.state.trainingMeasure && (
          <EditMeasureView model={this.state.trainingMeasure.model} />
        )}
      </div>
    );
  }
}
