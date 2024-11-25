import React from "react";
import * as immer from "immer";

const produce = immer.produce;
import { MeasureId } from "../../../../iso/measures";
import { assertUnreachable } from "../../../util/utils";
import {
  ENDURANCE_MOVEMENTS,
  EnduranceMovement,
  generateEnduranceMovementMeasureId,
  parseEnduranceMovementMeasureId,
} from "../../../../iso/measures/movement";

export type Model = {
  movement: EnduranceMovement;
  measureId: MeasureId;
};

export const initModel = (measureId?: MeasureId): Model => {
  if (measureId) {
    const movement = parseEnduranceMovementMeasureId(measureId);
    return {
      movement,
      measureId,
    };
  } else {
    return {
      movement: ENDURANCE_MOVEMENTS[0],
      measureId: generateEnduranceMovementMeasureId(ENDURANCE_MOVEMENTS[0]),
    };
  }
};

export type Msg = { type: "SET_MOVEMENT"; movement: EnduranceMovement };

export const update = (msg: Msg, model: Model): [Model] => {
  return [
    produce(model, (draft) => {
      switch (msg.type) {
        case "SET_MOVEMENT":
          draft.movement = msg.movement;
          draft.measureId = generateEnduranceMovementMeasureId(draft.movement);
          break;
        default:
          assertUnreachable(msg.type);
      }
    }),
  ];
};

export const view = ({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: (msg: Msg) => void;
}) => {
  return (
    <div>
      <select
        value={model.movement}
        onChange={(e) =>
          dispatch({
            type: "SET_MOVEMENT",
            movement: e.target.value as EnduranceMovement,
          })
        }
      >
        {ENDURANCE_MOVEMENTS.map((movement) => (
          <option key={movement} value={movement}>
            {movement}
          </option>
        ))}
      </select>
    </div>
  );
};
