import React from "react";
import * as immer from "immer";

const produce = immer.produce;
import { MeasureId } from "../../../../iso/measures";
import { assertUnreachable } from "../../../util/utils";
import {
  PowerMovement,
  UnilateralPowerMovement,
  generatePowerMeasureId,
  generateUnilateralPowerMeasureId,
  parsePowerMeasureId,
  parseUnilateralPowerMeasureId,
  POWER_MOVEMENT,
  UNILATERAL_POWER_MOVEMENT,
} from "../../../../iso/measures/power";
import { DOMINANT_SIDE, DominantSide } from "../../../../iso/measures/movement";

export type Model =
  | {
      type: "bilateral";
      movement: PowerMovement;
      measureId: MeasureId;
    }
  | {
      type: "unilateral";
      movement: UnilateralPowerMovement;
      dominantSide: DominantSide;
      measureId: MeasureId;
    };

export const initModel = (measureId?: MeasureId): Model => {
  if (measureId) {
    try {
      const movement = parsePowerMeasureId(measureId);
      return {
        type: "bilateral",
        movement,
        measureId,
      };
    } catch (e) {
      const { movement, dominantSide } =
        parseUnilateralPowerMeasureId(measureId);
      return {
        type: "unilateral",
        movement,
        dominantSide,
        measureId,
      };
    }
  } else {
    return {
      type: "bilateral",
      movement: "verticaljump",
      measureId: generatePowerMeasureId("verticaljump"),
    };
  }
};

export type Msg =
  | { type: "SET_MOVEMENT_TYPE"; movementType: Model["type"] }
  | {
      type: "SET_MOVEMENT";
      movement: PowerMovement | UnilateralPowerMovement;
    }
  | { type: "SET_DOMINANT_SIDE"; dominantSide: DominantSide };

export const update = (msg: Msg, model: Model): [Model] => {
  return [
    produce(model, (draft) => {
      switch (msg.type) {
        case "SET_MOVEMENT_TYPE":
          if (msg.movementType === "bilateral") {
            return {
              type: "bilateral",
              movement: POWER_MOVEMENT.includes(draft.movement as PowerMovement)
                ? draft.movement
                : POWER_MOVEMENT[0],
              measureId: generatePowerMeasureId(
                draft.movement as PowerMovement,
              ),
            } as Model;
          } else {
            return {
              type: "unilateral",
              movement: UNILATERAL_POWER_MOVEMENT.includes(
                draft.movement as UnilateralPowerMovement,
              )
                ? draft.movement
                : UNILATERAL_POWER_MOVEMENT[0],
              dominantSide: "dominant",
              measureId: generateUnilateralPowerMeasureId(
                draft.movement as UnilateralPowerMovement,
                "dominant",
              ),
            } as Model;
          }

        case "SET_MOVEMENT":
          if (
            (draft.type === "bilateral" &&
              POWER_MOVEMENT.includes(msg.movement as PowerMovement)) ||
            (draft.type === "unilateral" &&
              UNILATERAL_POWER_MOVEMENT.includes(
                msg.movement as UnilateralPowerMovement,
              ))
          ) {
            draft.movement = msg.movement;
            draft.measureId =
              draft.type === "bilateral"
                ? generatePowerMeasureId(draft.movement as PowerMovement)
                : generateUnilateralPowerMeasureId(
                    draft.movement as UnilateralPowerMovement,
                    draft.dominantSide as DominantSide,
                  );
          }
          break;

        case "SET_DOMINANT_SIDE":
          if (draft.type === "unilateral") {
            draft.dominantSide = msg.dominantSide;
            draft.measureId = generateUnilateralPowerMeasureId(
              draft.movement as UnilateralPowerMovement,
              msg.dominantSide,
            );
          }
          break;
        default:
          assertUnreachable(msg);
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
        value={model.type}
        onChange={(e) =>
          dispatch({
            type: "SET_MOVEMENT_TYPE",
            movementType: e.target.value as Model["type"],
          })
        }
      >
        <option value="bilateral">Bilateral</option>
        <option value="unilateral">Unilateral</option>
      </select>

      <select
        value={model.movement}
        onChange={(e) =>
          dispatch({
            type: "SET_MOVEMENT",
            movement: e.target.value as PowerMovement | UnilateralPowerMovement,
          })
        }
      >
        {(model.type === "bilateral"
          ? POWER_MOVEMENT
          : UNILATERAL_POWER_MOVEMENT
        ).map((mov) => (
          <option key={mov} value={mov}>
            {mov}
          </option>
        ))}
      </select>

      {model.type === "unilateral" && (
        <select
          value={model.dominantSide}
          onChange={(e) =>
            dispatch({
              type: "SET_DOMINANT_SIDE",
              dominantSide: e.target.value as DominantSide,
            })
          }
        >
          {DOMINANT_SIDE.map((side) => (
            <option key={side} value={side}>
              {side}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};
