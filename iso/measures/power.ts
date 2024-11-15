import { assertUnreachable } from "../utils.js";
import { MeasureId, MeasureSpec } from "./index.js";
import { DOMINANT_SIDE } from "./movement.js";

export const POWER_MOVEMENT = ["vertical-jump", "horizontal-jump"] as const;

export type PowerMovement = (typeof POWER_MOVEMENT)[number];

const TIME_TRAINING_JUMP: MeasureSpec = {
  id: `time-training:jump` as MeasureId,
  name: `Time training jumping movements`,
  description: ``,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    measureId: `time-training:jump` as MeasureId,
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 5 },
  },
};

const TIME_TRAINING_CAMPUS_REACH: MeasureSpec = {
  id: `time-training:campus-reach` as MeasureId,
  name: `Time training the campus reach`,
  description: ``,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    measureId: `time-training:campus-reach` as MeasureId,
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 5 },
  },
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
    initialFilter: {
      type: "minmax",
      measureId: `distance:vertical-jump` as MeasureId,
      minValue: { unit: "m", value: 1 },
      maxValue: { unit: "m", value: 3 },
    },
  },
  {
    id: `distance:horizontal-jump` as MeasureId,
    name: `Vertical Jump`,
    trainingMeasureId: TIME_TRAINING_JUMP.id,
    description: ``,
    units: ["m", "cm", "inch"],
    initialFilter: {
      type: "minmax",
      measureId: `distance:horizontal-jump` as MeasureId,
      minValue: { unit: "m", value: 1 },
      maxValue: { unit: "m", value: 3 },
    },
  },
];

const UNILATERAL_POWER_MOVEMENT = [
  "vertial-jump",
  "horizontal-jump",
  "campus-reach",
] as const;

for (const movement of UNILATERAL_POWER_MOVEMENT) {
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
      initialFilter: {
        type: "minmax",
        measureId: `distance:${movement}:${dominantSide}` as MeasureId,
        minValue: { unit: "m", value: 0 },
        maxValue: { unit: "m", value: 2 },
      },
    });
  }
}
