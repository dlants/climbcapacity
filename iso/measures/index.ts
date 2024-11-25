export { MEASURES as FINGER_MEASURES } from "./fingers.js";
export { MEASURES as PERFORMANCE_MEASURES } from "./grades.js";
export { MEASURES as MOVEMENT_MEASURES } from "./movement.js";
export { MEASURES as POWER_MEASURES } from "./power.js";

import {
  FINGER_MEASURES,
  PERFORMANCE_MEASURES,
  MOVEMENT_MEASURES,
  POWER_MEASURES,
} from "./index.js";
import { InitialFilter, UnitType } from "../units.js";

export type MeasureId = string & { __brand: "measureId" };

export type MeasureSpec = {
  id: MeasureId;
  trainingMeasureId?: MeasureId;
  name: string;
  description: string;
  /** units[0] is the default
   */
  units: UnitType[];
  initialFilter: InitialFilter;
};

export const MEASURES = [
  ...FINGER_MEASURES,
  ...PERFORMANCE_MEASURES,
  ...MOVEMENT_MEASURES,
  ...POWER_MEASURES,
];

export const INPUT_MEASURES = [
  ...FINGER_MEASURES,
  ...MOVEMENT_MEASURES,
  ...POWER_MEASURES,
];

export const ANTHRO_MEASURES: MeasureSpec[] = [
  {
    id: "height" as MeasureId,
    name: "height",
    description: "Your height",
    units: ["m", "cm", "inch"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "m", value: 1.53 },
      maxValue: { unit: "m", value: 1.85 },
    },
  },
  {
    id: "armspan" as MeasureId,
    name: "Arm span",
    description: "Your arm span, fingertip to fingertip",
    units: ["m", "cm", "inch"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "m", value: 1.53 },
      maxValue: { unit: "m", value: 1.85 },
    },
  },
  {
    id: "standing-reach" as MeasureId,
    name: "vertical reach",
    description:
      "With at least one foot on the floor, measure how high you can reach. You can stand on the tip of your toe",
    units: ["m", "cm", "inch"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "m", value: 2.2 },
      maxValue: { unit: "m", value: 2.8 },
    },
  },

  {
    id: "weight" as MeasureId,
    name: "weight",
    description: "Your weight",
    units: ["kg", "lb"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "kg", value: 39.7 },
      maxValue: { unit: "kg", value: 115.5 },
    },
  },
  {
    id: "sex-at-birth" as MeasureId,
    name: "Sex assigned at birth",
    description: "The sex that was assigned to you at birth",
    units: ["sex-at-birth"],
    initialFilter: {
      type: "toggle",
      value: { unit: "sex-at-birth", value: "female" },
    },
  },
];

MEASURES.push(...ANTHRO_MEASURES);

export const TIME_TRAINING_MEASURES: MeasureSpec[] = [
  {
    id: "time-climbing" as MeasureId,
    name: "How long have you been climbing?",
    description: `Count time during which you've been going at least once a week.

For example, if you climbed for a year, then took a year off, then climbed for another half a year, you'd report 1.5
`,
    units: ["year", "month"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "year", value: 0 },
      maxValue: { unit: "year", value: 15 },
    },
  },
  {
    id: "time-training" as MeasureId,
    name: "How long have you been training for climbing?",
    description: `Count time during which you've been engaging in consistent deliberate practice at least once a week.

Examples that count as deliberate practice:
 - hangboarding as part of your warmup
 - doing supplemental stretching or strength training exercise
 - choosing one day a week to work on climbs of a specific style or difficulty level
`,
    units: ["year", "month"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "year", value: 0 },
      maxValue: { unit: "year", value: 15 },
    },
  },
  {
    id: "time-strength-training" as MeasureId,
    name: "Time spent strength training.",
    description: `Count time during which you were consistently practicing strength training at least once a week.

Examples of activities that count as strength training practice:
- doing movements with weights (dumbells, kettlebells, barbells) like presses, lifts, etc.
- doing movements at high intensity (1-10RM).
- overloading the movements, so progressing the load over time.
`,
    units: ["year", "month"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "year", value: 0 },
      maxValue: { unit: "year", value: 15 },
    },
  },
];
MEASURES.push(...TIME_TRAINING_MEASURES);

export const MEASURE_MAP: {
  [measureId: MeasureId]: MeasureSpec;
} = {};

for (const measure of MEASURES) {
  MEASURE_MAP[measure.id] = measure;
}
