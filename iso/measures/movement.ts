import { MeasureId, MeasureSpec } from "../units.js";

const MOVEMENTS = [
  "barbellsquat",
  "barhang",
  "benchpress",
  "benchrow",
  "bodyweightsquat",
  "deadlift",
  "dumbellpress",
  "frontlever",
  "hollowhold",
  "humanflag",
  "lsit",
  "overheadpress",
  "pistolsquat",
  "plank",
  "pullup",
  "pushup",
  "sideplank",
  "standingrow",
  "veeup",
] as const;

type Movement = (typeof MOVEMENTS)[number];
export const DOMINANT_SIDE = ["dominant", "nondominant"] as const;
export type DominantSide = (typeof DOMINANT_SIDE)[number];

export const MEASURES: MeasureSpec[] = [];

const TIME_TRAINING_PRESS: MeasureSpec = {
  id: `time-training:press` as MeasureId,
  name: `Time training pressing movements (pushups, bench, etc...)`,
  description: ``,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    measureId: `time-training:press` as MeasureId,
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 5 },
  },
};
MEASURES.push(TIME_TRAINING_PRESS);

const TIME_TRAINING_PULL: MeasureSpec = {
  id: `time-training:pull` as MeasureId,
  name: `Time training pulling movements (pullups, rows, etc...)`,
  description: ``,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    measureId: `time-training:pull` as MeasureId,
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 5 },
  },
};
MEASURES.push(TIME_TRAINING_PULL);

const TIME_TRAINING_HINGE: MeasureSpec = {
  id: `time-training:hinge` as MeasureId,
  name: `Time training hinge movements (kettlebell swings, deadlifts, etc...)`,
  description: ``,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    measureId: `time-training:hinge` as MeasureId,
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 5 },
  },
};
MEASURES.push(TIME_TRAINING_HINGE);

const TIME_TRAINING_SQUAT: MeasureSpec = {
  id: `time-training:squat` as MeasureId,
  name: `Time training squat movements (barbell squat, pistol squat, etc...)`,
  description: ``,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    measureId: `time-training:squat` as MeasureId,
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 5 },
  },
};
MEASURES.push(TIME_TRAINING_SQUAT);

const TIME_TRAINING_CORE_FRONTAL: MeasureSpec = {
  id: `time-training:core:frontal` as MeasureId,
  name: `Time training frontal core movements (plank, veeup, hollow hold, etc...)`,
  description: ``,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    measureId: `time-training:core:frontal` as MeasureId,
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 5 },
  },
};
MEASURES.push(TIME_TRAINING_CORE_FRONTAL);

const TIME_TRAINING_CORE_SAGITTAL: MeasureSpec = {
  id: `time-training:core:sagittal` as MeasureId,
  name: `Time training sagittal core movements (sideplank, human flag, etc...)`,
  description: ``,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    measureId: `time-training:core:sagittal` as MeasureId,
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 5 },
  },
};
MEASURES.push(TIME_TRAINING_CORE_SAGITTAL);
const TRAINING_MEASURE_MAP: { [movement in Movement]: MeasureId | undefined } =
  {
    barbellsquat: TIME_TRAINING_SQUAT.id,
    barhang: undefined,
    benchpress: TIME_TRAINING_PRESS.id,
    benchrow: TIME_TRAINING_PULL.id,
    bodyweightsquat: TIME_TRAINING_SQUAT.id,
    deadlift: TIME_TRAINING_HINGE.id,
    dumbellpress: TIME_TRAINING_PRESS.id,
    frontlever: TIME_TRAINING_CORE_FRONTAL.id,
    hollowhold: TIME_TRAINING_CORE_FRONTAL.id,
    humanflag: TIME_TRAINING_CORE_SAGITTAL.id,
    lsit: TIME_TRAINING_CORE_FRONTAL.id,
    overheadpress: TIME_TRAINING_PRESS.id,
    pistolsquat: TIME_TRAINING_SQUAT.id,
    plank: TIME_TRAINING_CORE_FRONTAL.id,
    pullup: TIME_TRAINING_PULL.id,
    pushup: TIME_TRAINING_PRESS.id,
    sideplank: TIME_TRAINING_CORE_SAGITTAL.id,
    standingrow: TIME_TRAINING_PULL.id,
    veeup: TIME_TRAINING_CORE_FRONTAL.id,
  };

for (const movement of [
  "barbellsquat",
  "benchpress",
  "deadlift",
  "overheadpress",
  "pullup",
  "standingrow",
] as const) {
  MEASURES.push({
    id: `weighted:${movement}` as MeasureId,
    trainingMeasureId: TRAINING_MEASURE_MAP[movement],
    name: `Weighted ${movement}`,
    description: `Record total weight, including bodyweight for relevant exercises.

So for example, for a pullup or a squat if you weigh 70kg and you added 30kg, you'd record 100kg.
`,
    units: ["5RMkg", "1RMkg", "2RMkg", "1RMlb", "2RMlb", "5RMlb"],
    initialFilter: {
      type: "minmax",
      measureId: `weighted:${movement}` as MeasureId,
      minValue: { unit: "5RMkg", value: 0 },
      maxValue: { unit: "5RMkg", value: 100 },
    },
  });
}

for (const movement of [
  "pullup",
  "pushup",
  "veeup",
  "bodyweightsquat",
] as const) {
  MEASURES.push({
    id: `max-rep:${movement}` as MeasureId,
    trainingMeasureId: TRAINING_MEASURE_MAP[movement],
    name: `${movement} Max Reps`,
    description: `Maximum number of reps you can complete`,
    units: ["count"],
    initialFilter: {
      type: "minmax",
      measureId: `max-rep:${movement}` as MeasureId,
      minValue: { unit: "count", value: 0 },
      maxValue: { unit: "count", value: 20 },
    },
  });
}

for (const movement of [
  "benchrow",
  "overheadpress",
  "pistolsquat",
  "pullup",
  "dumbellpress",
] as const) {
  for (const dominantSide of DOMINANT_SIDE) {
    MEASURES.push({
      id: `weighted-unilateral:${movement}:${dominantSide}` as MeasureId,
      trainingMeasureId: TRAINING_MEASURE_MAP[movement],
      name: `Weighted unilateral ${movement} ${dominantSide}`,
      description: `Record total weight, including bodyweight for relevant exercises.

So for example, for a pullup if you weigh 70kg and you removed 30kg, you'd record 40kg.
`,
      units: ["5RMkg", "1RMkg", "2RMkg", "1RMlb", "2RMlb", "5RMlb"],
      initialFilter: {
        type: "minmax",
        measureId:
          `weighted-unilateral:${movement}:${dominantSide}` as MeasureId,
        minValue: { unit: "5RMkg", value: 0 },
        maxValue: { unit: "5RMkg", value: 100 },
      },
    });
  }
}

for (const movement of [
  "lsit",
  "frontlever",
  "plank",
  "hollowhold",
  "barhang",
] as const) {
  MEASURES.push({
    id: `duration:${movement}` as MeasureId,
    trainingMeasureId: TRAINING_MEASURE_MAP[movement],
    name: `${movement} Max Duration`,
    description: ``,
    units: ["second"],
    initialFilter: {
      type: "minmax",
      measureId: `duration:${movement}` as MeasureId,
      minValue: { unit: "second", value: 0 },
      maxValue: { unit: "second", value: 120 },
    },
  });
}

for (const movement of ["pullup", "pushup", "pistolsquat"] as const) {
  for (const dominantSide of DOMINANT_SIDE) {
    MEASURES.push({
      id: `max-rep:${movement}:${dominantSide}` as MeasureId,
      trainingMeasureId: TRAINING_MEASURE_MAP[movement],
      name: `Unilateral ${movement} Max Reps ${dominantSide}`,
      description: `Maximum number of reps you can complete`,
      units: ["count"],
      initialFilter: {
        type: "minmax",
        measureId: `max-rep:${movement}:${dominantSide}` as MeasureId,
        minValue: { unit: "count", value: 0 },
        maxValue: { unit: "count", value: 20 },
      },
    });
  }
}

for (const movement of ["sideplank"] as const) {
  for (const dominantSide of DOMINANT_SIDE) {
    MEASURES.push({
      id: `duration:${movement}:${dominantSide}` as MeasureId,
      trainingMeasureId: TRAINING_MEASURE_MAP[movement],
      name: `${movement} Max Duration ${dominantSide}`,
      description: ``,
      units: ["second"],
      initialFilter: {
        type: "minmax",
        measureId: `duration:${movement}:${dominantSide}` as MeasureId,
        minValue: { unit: "second", value: 0 },
        maxValue: { unit: "second", value: 120 },
      },
    });
  }
}
