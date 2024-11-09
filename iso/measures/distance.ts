import { MeasureId, MeasureSpec } from "../units.js";
import { assertUnreachable } from "../utils.js";
import { DOMINANT_SIDE } from "./movement.js";

export const DISTANCE_MOVEMENT = ["vertical-jump", "horizontal-jump"] as const;

export type DistanceMovement = (typeof DISTANCE_MOVEMENT)[number];

const TIME_TRAINING_JUMP: MeasureSpec = {
  id: `time-training:jump` as MeasureId,
  name: `Time training jumping movements`,
  description: ``,
  units: ["year", "month"],
  defaultMinValue: { unit: "year", value: 0 },
  defaultMaxValue: { unit: "year", value: 5 },
};

const TIME_TRAINING_CAMPUS_REACH: MeasureSpec = {
  id: `time-training:campus-reach` as MeasureId,
  name: `Time training the campus reach`,
  description: ``,
  units: ["year", "month"],
  defaultMinValue: { unit: "year", value: 0 },
  defaultMaxValue: { unit: "year", value: 5 },
};

export const MEASURES: MeasureSpec[] = [
  TIME_TRAINING_JUMP,
  TIME_TRAINING_CAMPUS_REACH,
  {
    id: `distance:vertical-jump` as MeasureId,
    trainingMeasureId: TIME_TRAINING_JUMP.id,
    name: `Vertical Jump`,
    description: ``,
    units: ["m", "cm", "inch"],
    defaultMinValue: { unit: "m", value: 1 },
    defaultMaxValue: { unit: "m", value: 3 },
  },
  {
    id: `distance:horizontal-jump` as MeasureId,
    name: `Vertical Jump`,
    trainingMeasureId: TIME_TRAINING_JUMP.id,
    description: ``,
    units: ["m", "cm", "inch"],
    defaultMinValue: { unit: "m", value: 1 },
    defaultMaxValue: { unit: "m", value: 3 },
  },
];

const UNILATERAL_DISTANCE_MOVEMENT = [
  "vertial-jump",
  "horizontal-jump",
  "campus-reach",
] as const;

for (const movement of UNILATERAL_DISTANCE_MOVEMENT) {
  for (const dominantSide of DOMINANT_SIDE) {
    let trainingMeasureId;
    switch (movement) {
      case "vertial-jump":
      case "horizontal-jump":
        trainingMeasureId = TIME_TRAINING_JUMP.id;
        break;
      case "campus-reach":
        trainingMeasureId = TIME_TRAINING_CAMPUS_REACH.id;
        break;
      default:
        assertUnreachable(movement);
    }

    MEASURES.push({
      id: `distance:${movement}:${dominantSide}` as MeasureId,
      trainingMeasureId,
      name: `${movement} ${dominantSide}`,
      description: ``,
      units: ["m", "cm", "inch"],
      defaultMinValue: { unit: "m", value: 0 },
      defaultMaxValue: { unit: "m", value: 2 },
    });
  }
}
