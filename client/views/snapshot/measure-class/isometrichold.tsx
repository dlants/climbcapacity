import React from "react";
import * as immer from "immer";

const produce = immer.produce;
import { MeasureId } from "../../../../iso/measures";
import { assertUnreachable } from "../../../util/utils";
import {
  IsometricMovement,
  IsometricUnilateralMovement,
  DOMINANT_SIDE,
  DominantSide,
  ISOMETRIC_MOVEMENTS,
  ISOMETRIC_UNILATERAL_MOVEMENTS,
} from "../../../../iso/measures/movement";

export type Model =
  | {
      type: "bilateral";
      movement: IsometricMovement;
      measureId: MeasureId;
    }
  | {
      type: "unilateral";
      movement: IsometricUnilateralMovement;
      dominantSide: DominantSide;
      measureId: MeasureId;
    };

export const initModel = (measureId?: MeasureId): Model => {
  if (measureId) {
    return {
      type: "bilateral",
      movement: ISOMETRIC_MOVEMENTS[0],
      measureId,
    };
  } else {
    return {
      type: "bilateral",
      movement: "lhang",
      measureId: "isometric-duration:lhang" as MeasureId,
    };
  }
};

export type Msg =
  | { type: "SET_MOVEMENT_TYPE"; movementType: Model["type"] }
  | {
      type: "SET_MOVEMENT";
      movement: IsometricMovement | IsometricUnilateralMovement;
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
              movement: ISOMETRIC_MOVEMENTS.includes(
                draft.movement as IsometricMovement,
              )
                ? draft.movement
                : ISOMETRIC_MOVEMENTS[0],
              measureId: `isometric-duration:${draft.movement}` as MeasureId,
            } as Model;
          } else {
            return {
              type: "unilateral",
              movement: ISOMETRIC_UNILATERAL_MOVEMENTS.includes(
                draft.movement as IsometricUnilateralMovement,
              )
                ? draft.movement
                : ISOMETRIC_UNILATERAL_MOVEMENTS[0],
              dominantSide: "dominant",
              measureId: `isometric-duration:sideplank:dominant` as MeasureId,
            } as Model;
          }

        case "SET_MOVEMENT":
          if (
            (draft.type === "bilateral" &&
              ISOMETRIC_MOVEMENTS.includes(
                msg.movement as IsometricMovement,
              )) ||
            (draft.type === "unilateral" &&
              ISOMETRIC_UNILATERAL_MOVEMENTS.includes(
                msg.movement as IsometricUnilateralMovement,
              ))
          ) {
            draft.movement = msg.movement;
            draft.measureId =
              draft.type === "bilateral"
                ? (`isometric-duration:${draft.movement}` as MeasureId)
                : (`isometric-duration:${draft.movement}:${draft.dominantSide}` as MeasureId);
          }
          break;

        case "SET_DOMINANT_SIDE":
          if (draft.type === "unilateral") {
            draft.dominantSide = msg.dominantSide;
            draft.measureId =
              `isometric-duration:${draft.movement}:${msg.dominantSide}` as MeasureId;
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
            movement: e.target.value as
              | IsometricMovement
              | IsometricUnilateralMovement,
          })
        }
      >
        {(model.type === "bilateral"
          ? ISOMETRIC_MOVEMENTS
          : ISOMETRIC_UNILATERAL_MOVEMENTS
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
