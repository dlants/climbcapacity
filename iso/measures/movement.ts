import { MeasureId, MeasureSpec } from "./index.js";

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
  "lhang",
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
    lhang: TIME_TRAINING_CORE_FRONTAL.id,
    overheadpress: TIME_TRAINING_PRESS.id,
    pistolsquat: TIME_TRAINING_SQUAT.id,
    plank: TIME_TRAINING_CORE_FRONTAL.id,
    pullup: TIME_TRAINING_PULL.id,
    pushup: TIME_TRAINING_PRESS.id,
    sideplank: TIME_TRAINING_CORE_SAGITTAL.id,
    standingrow: TIME_TRAINING_PULL.id,
    veeup: TIME_TRAINING_CORE_FRONTAL.id,
  };

export const WEIGHTED_MOVEMENTS = [
  "barbellsquat",
  "benchpress",
  "deadlift",
  "overheadpress",
  "pullup",
  "standingrow",
] as const;
export type WeightedMovement = (typeof WEIGHTED_MOVEMENTS)[number];

export const generateWeightedMeasureId = (movement: WeightedMovement) =>
  `weighted:${movement}` as MeasureId;

export const parseWeightedMovementMeasureId = (
  measureId: MeasureId,
): WeightedMovement => {
  const prefix = "weighted:";
  if (measureId.startsWith(prefix)) {
    const movement = measureId.substring(prefix.length);
    if (WEIGHTED_MOVEMENTS.includes(movement as WeightedMovement)) {
      return movement as WeightedMovement;
    }
  }
  throw new Error(`Invalid MeasureId: ${measureId}`);
};

for (const movement of WEIGHTED_MOVEMENTS) {
  MEASURES.push({
    id: generateWeightedMeasureId(movement),
    trainingMeasureId: TRAINING_MEASURE_MAP[movement],
    name: `Weighted ${movement}`,
    description: `Record total weight, including bodyweight for relevant exercises.

So for example, for a pullup or a squat if you weigh 70kg and you added 30kg, you'd record 100kg.
`,
    units: ["5RMkg", "1RMkg", "2RMkg", "1RMlb", "2RMlb", "5RMlb"],
    initialFilter: {
      type: "minmax",
      measureId: generateWeightedMeasureId(movement),
      minValue: { unit: "5RMkg", value: 0 },
      maxValue: { unit: "5RMkg", value: 100 },
    },
  });
}

export const UNILATERAL_WEIGHTED_MOVEMENTS = [
  "benchrow",
  "overheadpress",
  "pistolsquat",
  "pullup",
  "dumbellpress",
] as const;

export type UnilateralWeightedMovement =
  (typeof UNILATERAL_WEIGHTED_MOVEMENTS)[number];

export const generateUnilateralMeasureId = ({
  movement,
  dominantSide,
}: {
  movement: UnilateralWeightedMovement;
  dominantSide: DominantSide;
}) => `weighted-unilateral:${movement}:${dominantSide}` as MeasureId;

export const parseUnilateralWeightedMovementMeasureId = (
  measureId: MeasureId,
): { movement: UnilateralWeightedMovement; dominantSide: DominantSide } => {
  const prefix = "weighted-unilateral:";
  if (measureId.startsWith(prefix)) {
    const segments = measureId.substring(prefix.length).split(":");
    if (
      segments.length === 2 &&
      UNILATERAL_WEIGHTED_MOVEMENTS.includes(
        segments[0] as UnilateralWeightedMovement,
      )
    ) {
      return {
        movement: segments[0] as UnilateralWeightedMovement,
        dominantSide: segments[1] as DominantSide,
      };
    }
  }
  throw new Error(`Invalid MeasureId: ${measureId}`);
};

for (const movement of UNILATERAL_WEIGHTED_MOVEMENTS) {
  for (const dominantSide of DOMINANT_SIDE) {
    MEASURES.push({
      id: generateUnilateralMeasureId({ movement, dominantSide }),
      trainingMeasureId: TRAINING_MEASURE_MAP[movement],
      name: `Weighted unilateral ${movement} ${dominantSide}`,
      description: `Record total weight, including bodyweight for relevant exercises.

So for example, for a pullup if you weigh 70kg and you removed 30kg, you'd record 40kg.
`,
      units: ["5RMkg", "1RMkg", "2RMkg", "1RMlb", "2RMlb", "5RMlb"],
      initialFilter: {
        type: "minmax",
        measureId: generateUnilateralMeasureId({ movement, dominantSide }),
        minValue: { unit: "5RMkg", value: 0 },
        maxValue: { unit: "5RMkg", value: 100 },
      },
    });
  }
}

export const MAX_REPS_MOVEMENTS = [
  "pullup",
  "pushup",
  "veeup",
  "bodyweightsquat",
] as const;

export type MaxRepMovement = (typeof MAX_REPS_MOVEMENTS)[number];

export const generateMaxRepMeasureId = (movement: MaxRepMovement) =>
  `max-rep:${movement}` as MeasureId;

export const parseMaxRepMeasureId = (measureId: MeasureId): MaxRepMovement => {
  const prefix = "max-rep:";
  if (measureId.startsWith(prefix)) {
    const movement = measureId.substring(prefix.length);
    if (MAX_REPS_MOVEMENTS.includes(movement as MaxRepMovement)) {
      return movement as MaxRepMovement;
    }
  }
  throw new Error(`Invalid MeasureId: ${measureId}`);
};

for (const movement of MAX_REPS_MOVEMENTS) {
  MEASURES.push({
    id: generateMaxRepMeasureId(movement),
    trainingMeasureId: TRAINING_MEASURE_MAP[movement],
    name: `${movement} Max Reps`,
    description: `Maximum number of reps you can complete`,
    units: ["count"],
    initialFilter: {
      type: "minmax",
      measureId: generateMaxRepMeasureId(movement),
      minValue: { unit: "count", value: 0 },
      maxValue: { unit: "count", value: 20 },
    },
  });
}

export const UNILATERAL_MAX_REPS_MOVEMENTS = [
  "pullup",
  "pushup",
  "pistolsquat",
] as const;

export type UnilateralMaxRepMovement =
  (typeof UNILATERAL_MAX_REPS_MOVEMENTS)[number];

export const generateUnilateralMaxRepMeasureId = ({
  movement,
  dominantSide,
}: {
  movement: UnilateralMaxRepMovement;
  dominantSide: DominantSide;
}) => `max-rep:${movement}:${dominantSide}` as MeasureId;

export const parseUnilateralMaxRepMeasureId = (
  measureId: MeasureId,
): { movement: UnilateralMaxRepMovement; dominantSide: DominantSide } => {
  const prefix = "max-rep:";
  if (measureId.startsWith(prefix)) {
    const segments = measureId.substring(prefix.length).split(":");
    if (
      segments.length === 2 &&
      UNILATERAL_MAX_REPS_MOVEMENTS.includes(
        segments[0] as UnilateralMaxRepMovement,
      )
    ) {
      return {
        movement: segments[0] as UnilateralMaxRepMovement,
        dominantSide: segments[1] as DominantSide,
      };
    }
  }
  throw new Error(`Invalid MeasureId: ${measureId}`);
};

for (const movement of UNILATERAL_MAX_REPS_MOVEMENTS) {
  for (const dominantSide of DOMINANT_SIDE) {
    MEASURES.push({
      id: generateUnilateralMaxRepMeasureId({ movement, dominantSide }),
      trainingMeasureId: TRAINING_MEASURE_MAP[movement],
      name: `Unilateral ${movement} Max Reps ${dominantSide}`,
      description: `Maximum number of reps you can complete`,
      units: ["count"],
      initialFilter: {
        type: "minmax",
        measureId: generateUnilateralMaxRepMeasureId({
          movement,
          dominantSide,
        }),
        minValue: { unit: "count", value: 0 },
        maxValue: { unit: "count", value: 20 },
      },
    });
  }
}

export const ISOMETRIC_MOVEMENTS = [
  "lhang",
  "frontlever",
  "plank",
  "hollowhold",
  "barhang",
] as const;

export type IsometricMovement = (typeof ISOMETRIC_MOVEMENTS)[number];

export const generateIsometricMovementMeasureId = (
  movement: IsometricMovement,
) => `isometric-duration:${movement}` as MeasureId;

export const parseIsometricMovementMeasureId = (
  measureId: MeasureId,
): IsometricMovement => {
  const prefix = "isometric-duration:";
  if (measureId.startsWith(prefix)) {
    const movement = measureId.substring(prefix.length);
    if (ISOMETRIC_MOVEMENTS.includes(movement as IsometricMovement)) {
      return movement as IsometricMovement;
    }
  }
  throw new Error(`Invalid MeasureId: ${measureId}`);
};

for (const movement of ISOMETRIC_MOVEMENTS) {
  MEASURES.push({
    id: generateIsometricMovementMeasureId(movement),
    trainingMeasureId: TRAINING_MEASURE_MAP[movement],
    name: `${movement} Max Duration`,
    description: ``,
    units: ["second"],
    initialFilter: {
      type: "minmax",
      measureId: generateIsometricMovementMeasureId(movement),
      minValue: { unit: "second", value: 0 },
      maxValue: { unit: "second", value: 120 },
    },
  });
}

export const ISOMETRIC_UNILATERAL_MOVEMENTS = ["sideplank"] as const;

export type IsometricUnilateralMovement =
  (typeof ISOMETRIC_UNILATERAL_MOVEMENTS)[number];

export const generateIsometricUnilateralMeasureId = ({
  movement,
  dominantSide,
}: {
  movement: IsometricUnilateralMovement;
  dominantSide: DominantSide;
}) => `isometric-duration:${movement}:${dominantSide}` as MeasureId;

export const parseIsometricUnilateralMovementMeasureId = (
  measureId: MeasureId,
): { movement: IsometricUnilateralMovement; dominantSide: DominantSide } => {
  const prefix = "isometric-duration:";
  if (measureId.startsWith(prefix)) {
    const segments = measureId.substring(prefix.length).split(":");
    if (
      segments.length === 2 &&
      ISOMETRIC_UNILATERAL_MOVEMENTS.includes(
        segments[0] as IsometricUnilateralMovement,
      )
    ) {
      return {
        movement: segments[0] as IsometricUnilateralMovement,
        dominantSide: segments[1] as DominantSide,
      };
    }
  }
  throw new Error(`Invalid MeasureId: ${measureId}`);
};

for (const movement of ISOMETRIC_UNILATERAL_MOVEMENTS) {
  for (const dominantSide of DOMINANT_SIDE) {
    MEASURES.push({
      id: generateIsometricUnilateralMeasureId({ movement, dominantSide }),
      trainingMeasureId: TRAINING_MEASURE_MAP[movement],
      name: `${movement} Max Duration ${dominantSide}`,
      description: ``,
      units: ["second"],
      initialFilter: {
        type: "minmax",
        measureId: generateIsometricUnilateralMeasureId({
          movement,
          dominantSide,
        }),
        minValue: { unit: "second", value: 0 },
        maxValue: { unit: "second", value: 120 },
      },
    });
  }
}

export const ENDURANCE_MOVEMENTS = [
  "footoncampusshort",
  "footoncampuslong",
] as const;

export type EnduranceMovement = (typeof ENDURANCE_MOVEMENTS)[number];

export const generateEnduranceMovementMeasureId = (
  movement: EnduranceMovement,
) => `endurance:${movement}` as MeasureId;

export const parseEnduranceMovementMeasureId = (
  measureId: MeasureId,
): EnduranceMovement => {
  const prefix = "endurance:";
  if (measureId.startsWith(prefix)) {
    const movement = measureId.substring(prefix.length);
    if (ENDURANCE_MOVEMENTS.includes(movement as EnduranceMovement)) {
      return movement as EnduranceMovement;
    }
  }
  throw new Error(`Invalid MeasureId: ${measureId}`);
};

for (const movement of ENDURANCE_MOVEMENTS) {
  MEASURES.push({
    id: generateEnduranceMovementMeasureId(movement),
    name: `${movement} Max Duration`,
    description: ``,
    units: ["second"],
    initialFilter: {
      type: "minmax",
      measureId: generateEnduranceMovementMeasureId(movement),
      minValue: { unit: "second", value: 0 },
      maxValue: { unit: "second", value: 120 },
    },
  });
}
