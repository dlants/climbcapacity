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
  includeTrainingMeasure: boolean;
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
    includeTrainingMeasure: false,
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
    includeTrainingMeasure: false,
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
    name: "standing reach",
    includeTrainingMeasure: false,
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
    includeTrainingMeasure: false,
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
    includeTrainingMeasure: false,
    description: "The sex that was assigned to you at birth",
    units: ["sex-at-birth"],
    initialFilter: {
      type: "toggle",
      value: { unit: "sex-at-birth", value: "female" },
    },
  },
];

MEASURES.push(...ANTHRO_MEASURES);

MEASURES.push({
  id: "time-climbing" as MeasureId,
  includeTrainingMeasure: false,
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
});

export function generateTrainingMeasureId(id: MeasureId): MeasureId {
  return ("training:" + id) as MeasureId;
}

export function generateTrainingMeasure(spec: MeasureSpec): MeasureSpec {
  return {
    id: generateTrainingMeasureId(spec.id),
    includeTrainingMeasure: false,
    name: `Training: ${spec.name}`,
    description: `How experienced are you with this or similar measures?

1 - never or barely tried it
2 - trained it on and off
3 - trained it regularly
4 - highly trained in it
`,
    units: ["training"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "training", value: 1 },
      maxValue: { unit: "training", value: 4 },
    },
  };
}

for (const measure of [...MEASURES]) {
  if (measure.includeTrainingMeasure) {
    MEASURES.push(generateTrainingMeasure(measure));
  }
}

export const MEASURE_MAP: {
  [measureId: MeasureId]: MeasureSpec;
} = {};

for (const measure of MEASURES) {
  MEASURE_MAP[measure.id] = measure;
}
