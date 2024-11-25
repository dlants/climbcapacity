import React from "react";
import {
  generateTrainingMeasureId,
  MEASURE_MAP,
  MeasureId,
} from "../../../iso/measures";
import { UnitValue } from "../../../iso/units";
import { HydratedSnapshot } from "../../types";
import * as UnitInput from "../unit-input";
import * as immer from "immer";
import { Dispatch } from "../../tea";
const produce = immer.produce;
import * as UnitToggle from "../unit-toggle";

export type Model = immer.Immutable<{
  model: UnitInput.Model;
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
}>;

export type CanSubmit = Model["canSubmit"];

function canSubmit(model: Omit<Model, "canSubmit">): Model["canSubmit"] {
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

export const initModel = ({
  measureId,
  snapshot,
}: {
  measureId: MeasureId;
  snapshot: HydratedSnapshot;
}): Model => {
  const inputModel = immer.castDraft(
    UnitInput.initModel(
      measureId,
      snapshot.measures[measureId] as UnitValue | undefined,
    ),
  );

  const measure = MEASURE_MAP[measureId];
  let trainingMeasure;
  if (measure.type.type == "input") {
    const trainingMeasureId = generateTrainingMeasureId(measureId);
    let trainingInputmodel = immer.castDraft(
      UnitInput.initModel(
        trainingMeasureId,
        snapshot.measures[trainingMeasureId] as UnitValue | undefined,
      ),
    );
    trainingMeasure = {
      measureId: trainingMeasureId,
      model: trainingInputmodel,
    };
  }

  return {
    model: inputModel,
    trainingMeasure,
    canSubmit: canSubmit({ model: inputModel, trainingMeasure }),
  };
};

export type Msg =
  | {
      type: "UNIT_INPUT_MSG";
      msg: UnitInput.Msg;
    }
  | {
      type: "TRAINING_UNIT_INPUT_MSG";
      msg: UnitInput.Msg;
    };

export const update = (msg: Msg, model: Model): [Model] => {
  switch (msg.type) {
    case "UNIT_INPUT_MSG":
      return [
        produce(model, (draft) => {
          const [next] = UnitInput.update(msg.msg, model.model);
          draft.model = immer.castDraft(next);
          draft.canSubmit = canSubmit(draft);
        }),
      ];
    case "TRAINING_UNIT_INPUT_MSG":
      return [
        produce(model, (draft) => {
          if (!draft.trainingMeasure) {
            throw new Error("No training measure");
          }

          const [next] = UnitInput.update(msg.msg, draft.trainingMeasure.model);

          draft.trainingMeasure.model = immer.castDraft(next);
          draft.canSubmit = canSubmit(draft);
        }),
      ];
    default:
      return [model];
  }
};

export function view({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: Dispatch<Msg>;
}) {
  return (
    <div>
      <EditMeasureView
        model={model.model}
        dispatch={(msg) => dispatch({ type: "UNIT_INPUT_MSG", msg })}
      />
      {model.trainingMeasure && (
        <EditMeasureView
          model={model.trainingMeasure.model}
          dispatch={(msg) => dispatch({ type: "TRAINING_UNIT_INPUT_MSG", msg })}
        />
      )}
    </div>
  );
}

function EditMeasureView({
  model,
  dispatch,
}: {
  model: UnitInput.Model;
  dispatch: Dispatch<UnitInput.Msg>;
}) {
  const measure = MEASURE_MAP[model.measureId];
  return (
    <div className={`measure-item`}>
      <label>{measure.name}</label>
      <pre>{measure.description}</pre>
      <UnitInput.UnitInput model={model} dispatch={dispatch} />
      {measure.units.length > 1 && (
        <UnitToggle.view model={model} dispatch={dispatch} />
      )}
    </div>
  );
}
