import React from "react";
import * as immer from "immer";

const produce = immer.produce;
import { MeasureId } from "../../../../iso/measures";
import { assertUnreachable } from "../../../util/utils";
import {
  WeightedMovement,
  UnilateralWeightedMovement,
  generateWeightedMeasureId,
  generateUnilateralMeasureId,
  parseWeightedMovementMeasureId,
  parseUnilateralWeightedMovementMeasureId,
  DOMINANT_SIDE,
  DominantSide,
  WEIGHTED_MOVEMENTS,
  UNILATERAL_WEIGHTED_MOVEMENTS,
  RepMax,
} from "../../../../iso/measures/movement";

export type Model =
  | {
      type: "bilateral";
      movement: WeightedMovement;
      repMax: RepMax;
      measureId: MeasureId;
    }
  | {
      type: "unilateral";
      movement: UnilateralWeightedMovement;
      repMax: RepMax;
      dominantSide: DominantSide;
      measureId: MeasureId;
    };

const DEFAULT_REPMAX = 5;

export const initModel = (measureId?: MeasureId): Model => {
  if (measureId) {
    try {
      const { movement, repMax } = parseWeightedMovementMeasureId(measureId);
      return {
        type: "bilateral",
        movement,
        repMax,
        measureId,
      };
    } catch (e) {
      const { movement, repMax, dominantSide } =
        parseUnilateralWeightedMovementMeasureId(measureId);
      return {
        type: "unilateral",
        movement,
        repMax,
        dominantSide,
        measureId,
      };
    }
  } else {
    return {
      type: "bilateral",
      movement: "benchpress",
      repMax: DEFAULT_REPMAX,
      measureId: generateWeightedMeasureId({
        movement: "benchpress",
        repMax: DEFAULT_REPMAX,
      }),
    };
  }
};

export type Msg =
  | { type: "SET_MOVEMENT_TYPE"; movementType: Model["type"] }
  | {
      type: "SET_MOVEMENT";
      movement: WeightedMovement | UnilateralWeightedMovement;
    }
  | { type: "SET_DOMINANT_SIDE"; dominantSide: DominantSide }
  | { type: "SET_REPMAX"; repMax: RepMax };

export const update = (msg: Msg, model: Model): [Model] => {
  return [
    produce(model, (draft) => {
      switch (msg.type) {
        case "SET_MOVEMENT_TYPE":
          if (msg.movementType === "bilateral") {
            return {
              type: "bilateral",
              movement: WEIGHTED_MOVEMENTS.includes(
                draft.movement as WeightedMovement,
              )
                ? draft.movement
                : WEIGHTED_MOVEMENTS[0],
              repMax: draft.repMax,
              measureId: generateWeightedMeasureId({
                movement: draft.movement as WeightedMovement,
                repMax: draft.repMax,
              }),
            } as Model;
          } else {
            return {
              type: "unilateral",
              movement: UNILATERAL_WEIGHTED_MOVEMENTS.includes(
                draft.movement as UnilateralWeightedMovement,
              )
                ? draft.movement
                : UNILATERAL_WEIGHTED_MOVEMENTS[0],
              dominantSide: "dominant",
              measureId: generateUnilateralMeasureId({
                movement: "benchrow",
                repMax: draft.repMax,
                dominantSide: "dominant",
              }),
            } as Model;
          }

        case "SET_MOVEMENT":
          if (
            (draft.type === "bilateral" &&
              WEIGHTED_MOVEMENTS.includes(msg.movement as WeightedMovement)) ||
            (draft.type === "unilateral" &&
              UNILATERAL_WEIGHTED_MOVEMENTS.includes(
                msg.movement as UnilateralWeightedMovement,
              ))
          ) {
            draft.movement = msg.movement;
            draft.measureId =
              draft.type === "bilateral"
                ? generateWeightedMeasureId({
                    movement: draft.movement as WeightedMovement,
                    repMax: draft.repMax,
                  })
                : generateUnilateralMeasureId({
                    movement: draft.movement as UnilateralWeightedMovement,
                    repMax: draft.repMax,
                    dominantSide: draft.dominantSide as DominantSide,
                  });
          }
          break;

        case "SET_DOMINANT_SIDE":
          if (draft.type === "unilateral") {
            draft.dominantSide = msg.dominantSide;
            draft.measureId = generateUnilateralMeasureId({
              movement: draft.movement as UnilateralWeightedMovement,
              dominantSide: msg.dominantSide,
              repMax: draft.repMax,
            });
          }
          break;

        case "SET_REPMAX":
          draft.repMax = msg.repMax;
          draft.measureId =
            draft.type === "bilateral"
              ? generateWeightedMeasureId({
                  movement: draft.movement as WeightedMovement,
                  repMax: draft.repMax,
                })
              : generateUnilateralMeasureId({
                  movement: draft.movement as UnilateralWeightedMovement,
                  dominantSide: draft.dominantSide,
                  repMax: draft.repMax,
                });
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
              | WeightedMovement
              | UnilateralWeightedMovement,
          })
        }
      >
        {(model.type === "bilateral"
          ? WEIGHTED_MOVEMENTS
          : UNILATERAL_WEIGHTED_MOVEMENTS
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

      <select
        value={model.repMax}
        onChange={(e) =>
          dispatch({
            type: "SET_REPMAX",
            repMax: Number(e.target.value) as RepMax,
          })
        }
      >
        {[1, 2, 5].map((rep) => (
          <option key={rep} value={rep}>
            {rep} RM
          </option>
        ))}
      </select>
    </div>
  );
};
