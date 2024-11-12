import { MEASURES as FINGER_MEASURES } from "./fingers.js";
import { MEASURES as GRADE_MEASURES } from "./grades.js";
import { MEASURES as MOVEMENT_MEASURES } from "./movement.js";
import { MeasureId, MeasureSpec } from "../units.js";
import { MEASURES as DISTANCE_MEASURES } from "./distance.js";

export const MEASURES: MeasureSpec[] = [
  {
    id: "height" as MeasureId,
    name: "height",
    description: "Your height",
    units: ["m", "cm", "inch"],
    defaultMinValue: { unit: "m", value: 1.53 },
    defaultMaxValue: { unit: "m", value: 1.85 },
  },
  {
    id: "armspan" as MeasureId,
    name: "Arm span",
    description: "Your arm span, fingertip to fingertip",
    units: ["m", "cm", "inch"],
    defaultMinValue: { unit: "m", value: 1.53 },
    defaultMaxValue: { unit: "m", value: 1.85 },
  },
  {
    id: "standing-reach" as MeasureId,
    name: "vertical reach",
    description:
      "With at least one foot on the floor, measure how high you can reach. You can stand on the tip of your toe",
    units: ["m", "cm", "inch"],
    defaultMinValue: { unit: "m", value: 2.2 },
    defaultMaxValue: { unit: "m", value: 2.8 },
  },

  {
    id: "weight" as MeasureId,
    name: "weight",
    description: "Your weight",
    units: ["kg", "lb"],
    defaultMinValue: { unit: "kg", value: 39.7 },
    defaultMaxValue: { unit: "kg", value: 115.5 },
  },
  {
    id: "sex-at-birth" as MeasureId,
    name: "Sex assigned at birth",
    description: "The sex that was assigned to you at birth",
    units: ["sex-at-birth"],
    defaultMinValue: { unit: "sex-at-birth", value: "female" },
    defaultMaxValue: { unit: "sex-at-birth", value: "male" },
  },
  {
    id: "time-climbing" as MeasureId,
    name: "How long have you been climbing?",
    description: `Count time during which you've been going at least once a week.

For example, if you climbed for a year, then took a year off, then climbed for another half a year, you'd report 1.5
`,
    units: ["year", "month"],
    defaultMinValue: { unit: "year", value: 0 },
    defaultMaxValue: { unit: "year", value: 15 },
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
    defaultMinValue: { unit: "year", value: 0 },
    defaultMaxValue: { unit: "year", value: 15 },
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
    defaultMinValue: { unit: "year", value: 0 },
    defaultMaxValue: { unit: "year", value: 15 },
  },
  ...DISTANCE_MEASURES,
  ...MOVEMENT_MEASURES,
  ...FINGER_MEASURES,
  ...GRADE_MEASURES,
];

export const MEASURE_MAP: {
  [measureId: MeasureId]: MeasureSpec;
} = {};

for (const measure of MEASURES) {
  MEASURE_MAP[measure.id] = measure;
}

export const INPUT_MEASURES: MeasureSpec[] = MEASURES.filter((m) =>
  ["height", "weight", "sex-at-birth", "armspan", "standing-reach"].some(
    (id) => m.id == id,
  ),
);

export const TIME_TRAINING_MEASURES: MeasureSpec[] = MEASURES.filter((m) =>
  ["time-training:"].some((idPrefix) => m.id.startsWith(idPrefix)),
);

export const OUTPUT_MEASURES: MeasureSpec[] = MEASURES.filter((m) =>
  ["grade:"].some((idPrefix) => m.id.startsWith(idPrefix)),
);

export const OTHER_MEASURES: MeasureSpec[] = MEASURES.filter(
  (m) =>
    !INPUT_MEASURES.includes(m) &&
    !OUTPUT_MEASURES.includes(m) &&
    !TIME_TRAINING_MEASURES.includes(m),
);
