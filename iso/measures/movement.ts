import { MeasureId, MeasureSpec } from "../units.js";

export const WEIGHTED_MOVEMENT = [
  "pullup",
  "deadlift",
  "benchpress",
  "overheadpress",
  "row",
] as const;
export type WeightedMovement = (typeof WEIGHTED_MOVEMENT)[number];

export const STAT = ["2rm"] as const;
export type Stat = (typeof STAT)[number];

export type WeightedMovementMeasureType = {
  type: "weighted";
  movement: WeightedMovement;
  stat: Stat;
};

export function synthesizeWeightedMovementMeasure(
  measureType: WeightedMovementMeasureType,
): MeasureSpec {
  const { movement, stat } = measureType;
  return {
    id: `weighted:${stat}:${movement}` as MeasureId,
    name: `${stat} Weighted ${movement}`,
    description: `Record total weight, including bodyweight for relevant exercises.

So for example, for a pullup if you weigh 70kg and you added 30kg, you'd record 100kg.
`,
    units: ["kg", "lb"],
    defaultMinValue: { unit: "kg", value: 0 },
    defaultMaxValue: { unit: "kg", value: 100 },
  };
}

export const MAX_REP_MOVEMENT = ["pullup", "pushup", "veeup", "squat"] as const;
export type MaxRepMovement = (typeof MAX_REP_MOVEMENT)[number];

export function synthesizeMaxRepMeasure({
  movement,
}: {
  movement: MaxRepMovement;
}): MeasureSpec {
  return {
    id: `max-rep:${movement}` as MeasureId,
    name: `${movement} Max Reps`,
    description: `Maximum number of reps you can complete`,
    units: ["count"],
    defaultMinValue: { unit: "count", value: 0 },
    defaultMaxValue: { unit: "count", value: 20 },
  };
}

export const DOMINANT_SIDE = ["dominant", "nondominant"] as const;
export type DominantSide = (typeof DOMINANT_SIDE)[number];

export const WEIGHTED_UNILATERAL_MOVEMENT = [
  "pullup",
  "benchrow",
  "benchpress",
  "overheadpress",
] as const;
export type WeightedUnilateralMovement =
  (typeof WEIGHTED_UNILATERAL_MOVEMENT)[number];

export function synthesizeWeightedUnilateralMovementMeasure({
  movement,
  stat,
  dominantSide,
}: {
  movement: WeightedUnilateralMovement;
  dominantSide: DominantSide;
  stat: Stat;
}): MeasureSpec {
  return {
    id: `weighted-unilateral:${stat}:${movement}:${dominantSide}` as MeasureId,
    name: `${stat} Weighted unilateral ${movement} ${dominantSide}`,
    description: `Record total weight, including bodyweight for relevant exercises.

So for example, for a pullup if you weigh 70kg and you removed 30kg, you'd record 40kg.
`,
    units: ["kg", "lb"],
    defaultMinValue: { unit: "kg", value: 0 },
    defaultMaxValue: { unit: "kg", value: 100 },
  };
}

export const MAX_REP_UNITLATERAL_MOVEMENT = [
  "pullup",
  "pushup",
  "squat",
] as const;
export type MaxRepUnilateralMovement = (typeof MAX_REP_MOVEMENT)[number];

export function synthesizeUnilateralMaxrepMeasure({
  movement,
  dominantSide,
}: {
  movement: MaxRepMovement;
  dominantSide: DominantSide;
}): MeasureSpec {
  return {
    id: `max-rep:${movement}:${dominantSide}` as MeasureId,
    name: `Unilateral ${movement} Max Reps ${dominantSide}`,
    description: `Maximum number of reps you can complete`,
    units: ["count"],
    defaultMinValue: { unit: "count", value: 0 },
    defaultMaxValue: { unit: "count", value: 20 },
  };
}

export const MAX_DURATION_MOVEMENT = [
  "lsit",
  "front-lever",
  "plank",
  "hollow-hold",
  "barhang",
] as const;
export type MaxDurationMovement = (typeof MAX_DURATION_MOVEMENT)[number];

export function synthesizeMaxDurationMeasure({
  movement,
}: {
  movement: MaxDurationMovement;
}): MeasureSpec {
  return {
    id: `duration:${movement}` as MeasureId,
    name: `${movement} Max Duration`,
    description: ``,
    units: ["second"],
    defaultMinValue: { unit: "second", value: 0 },
    defaultMaxValue: { unit: "second", value: 120 },
  };
}

export const UNILATERAL_MAX_DURATION_MOVEMENT = ["sideplank"] as const;
export type UnilateralMaxDurationMovement =
  (typeof UNILATERAL_MAX_DURATION_MOVEMENT)[number];

export function synthesizeUnilateralMaxDurationMeasure({
  movement,
  dominantSide,
}: {
  movement: UnilateralMaxDurationMovement;
  dominantSide: DominantSide;
}): MeasureSpec {
  return {
    id: `duration:${movement}:${dominantSide}` as MeasureId,
    name: `${movement} Max Duration ${dominantSide}`,
    description: ``,
    units: ["second"],
    defaultMinValue: { unit: "second", value: 0 },
    defaultMaxValue: { unit: "second", value: 120 },
  };
}
