import React from "react";
import * as immer from "immer";

const produce = immer.produce;
import { MeasureId } from "../../../../iso/measures";
import { assertUnreachable } from "../../../util/utils";
import {
  MaxRepMovement,
  UnilateralMaxRepMovement,
  DOMINANT_SIDE,
  DominantSide,
  MAX_REPS_MOVEMENTS,
  UNILATERAL_MAX_REPS_MOVEMENTS,
} from "../../../../iso/measures/movement";

export type Model =
  | {
      type: "bilateral";
      movement: MaxRepMovement;
      measureId: MeasureId;
    }
  | {
      type: "unilateral";
      movement: UnilateralMaxRepMovement;
      dominantSide: DominantSide;
      measureId: MeasureId;
    };

export const initModel = (measureId?: MeasureId): Model => {
  if (measureId) {
    return {
      type: "bilateral",
      movement: MAX_REPS_MOVEMENTS[0],
      measureId,
    };
  } else {
    return {
      type: "bilateral",
      movement: "pullup",
      measureId: "max-rep:pullup" as MeasureId,
    };
  }
};

export type Msg =
  | { type: "SET_MOVEMENT_TYPE"; movementType: Model["type"] }
  | {
      type: "SET_MOVEMENT";
      movement: MaxRepMovement | UnilateralMaxRepMovement;
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
              movement: MAX_REPS_MOVEMENTS.includes(
                draft.movement as MaxRepMovement,
              )
                ? draft.movement
                : MAX_REPS_MOVEMENTS[0],
              measureId: `max-rep:${draft.movement}` as MeasureId,
            } as Model;
          } else {
            return {
              type: "unilateral",
              movement: UNILATERAL_MAX_REPS_MOVEMENTS.includes(
                draft.movement as UnilateralMaxRepMovement,
              )
                ? draft.movement
                : UNILATERAL_MAX_REPS_MOVEMENTS[0],
              dominantSide: "dominant",
              measureId: `max-rep:benchrow:dominant` as MeasureId,
            } as Model;
          }

        case "SET_MOVEMENT":
          if (
            (draft.type === "bilateral" &&
              MAX_REPS_MOVEMENTS.includes(msg.movement as MaxRepMovement)) ||
            (draft.type === "unilateral" &&
              UNILATERAL_MAX_REPS_MOVEMENTS.includes(
                msg.movement as UnilateralMaxRepMovement,
              ))
          ) {
            draft.movement = msg.movement;
            draft.measureId =
              draft.type === "bilateral"
                ? (`max-rep:${draft.movement}` as MeasureId)
                : (`max-rep:${draft.movement}:${draft.dominantSide}` as MeasureId);
          }
          break;

        case "SET_DOMINANT_SIDE":
          if (draft.type === "unilateral") {
            draft.dominantSide = msg.dominantSide;
            draft.measureId =
              `max-rep:${draft.movement}:${msg.dominantSide}` as MeasureId;
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
              | MaxRepMovement
              | UnilateralMaxRepMovement,
          })
        }
      >
        {(model.type === "bilateral"
          ? MAX_REPS_MOVEMENTS
          : UNILATERAL_MAX_REPS_MOVEMENTS
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
