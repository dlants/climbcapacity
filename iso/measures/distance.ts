import { MeasureId, MeasureSpec } from "../units.js";
import { DominantSide } from "./movement.js";

export const DISTANCE_MOVEMENT = [
  "armspan",
  "vertical-reach",
  "vertical-jump",
  "horizontal-jump",
] as const;

export type DistanceMovement = (typeof DISTANCE_MOVEMENT)[number];

export function synthesizeDistanceMeasure({
  movement,
}: {
  movement: DistanceMovement;
}): MeasureSpec {
  return {
    id: `distance:${movement}` as MeasureId,
    name: `${movement}`,
    description: ``,
    units: ["m", "cm", "inches"],
    defaultMinValue: { unit: "m", value: 0 },
    defaultMaxValue: { unit: "m", value: 2 },
  };
}

export const UNILATERAL_DISTANCE_MOVEMENT = [
  "vertial-jump",
  "horizontal-jump",
  "campus-reach",
] as const;
export type UnilateralDistanceMovement =
  (typeof UNILATERAL_DISTANCE_MOVEMENT)[number];

export function synthesizeUnilateralDistanceMeasure({
  dominantSide,
  movement,
}: {
  movement: UnilateralDistanceMovement;
  dominantSide: DominantSide;
}): MeasureSpec {
  return {
    id: `distance:${movement}:${dominantSide}` as MeasureId,
    name: `${movement} ${dominantSide}`,
    description: ``,
    units: ["m", "cm", "inches"],
    defaultMinValue: { unit: "m", value: 0 },
    defaultMaxValue: { unit: "m", value: 2 },
  };
}
