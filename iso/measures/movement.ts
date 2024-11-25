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

export const WEIGHTED_MOVEMENTS = [
  "barbellsquat",
  "benchpress",
  "deadlift",
  "overheadpress",
  "pullup",
  "standingrow",
] as const;
export type WeightedMovement = (typeof WEIGHTED_MOVEMENTS)[number];

const REP_MAX = [1, 2, 5];
export type RepMax = (typeof REP_MAX)[number];

export const generateWeightedMeasureId = ({
  movement,
  repMax,
}: {
  movement: WeightedMovement;
  repMax: RepMax;
}) => `weighted:${movement}:${repMax}rm` as MeasureId;

export const parseWeightedMovementMeasureId = (
  measureId: MeasureId,
): { movement: WeightedMovement; repMax: RepMax } => {
  const prefix = "weighted:";
  if (measureId.startsWith(prefix)) {
    const segments = measureId.substring(prefix.length).split(":");
    if (
      segments.length === 2 &&
      WEIGHTED_MOVEMENTS.includes(segments[0] as WeightedMovement)
    ) {
      return {
        movement: segments[0] as WeightedMovement,
        repMax: parseInt(segments[1].replace("rm", "")) as RepMax,
      };
    }
  }
  throw new Error(`Invalid MeasureId: ${measureId}`);
};

for (const movement of WEIGHTED_MOVEMENTS) {
  for (const repMax of REP_MAX) {
    MEASURES.push({
      id: generateWeightedMeasureId({ movement, repMax }),
      type: { type: "input", measureClass: "weightedmovement" },
      name: `Weighted ${movement}`,
      description: `Record total weight, including bodyweight for relevant exercises.

So for example, for a pullup or a squat if you weigh 70kg and you added 30kg, you'd record 100kg.
`,
      units: ["kg", "lb"],
      initialFilter: {
        type: "minmax",
        minValue: { unit: "kg", value: 0 },
        maxValue: { unit: "kg", value: 100 },
      },
    });
  }
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
  repMax,
  dominantSide,
}: {
  movement: UnilateralWeightedMovement;
  repMax: RepMax;
  dominantSide: DominantSide;
}) =>
  `weighted-unilateral:${movement}:${repMax}rm:${dominantSide}` as MeasureId;

export const parseUnilateralWeightedMovementMeasureId = (
  measureId: MeasureId,
): {
  movement: UnilateralWeightedMovement;
  repMax: RepMax;
  dominantSide: DominantSide;
} => {
  const prefix = "weighted-unilateral:";
  if (measureId.startsWith(prefix)) {
    const segments = measureId.substring(prefix.length).split(":");
    if (
      segments.length === 3 &&
      UNILATERAL_WEIGHTED_MOVEMENTS.includes(
        segments[0] as UnilateralWeightedMovement,
      )
    ) {
      return {
        movement: segments[0] as UnilateralWeightedMovement,
        repMax: parseInt(segments[1]) as RepMax,
        dominantSide: segments[2] as DominantSide,
      };
    }
  }
  throw new Error(`Invalid MeasureId: ${measureId}`);
};

for (const movement of UNILATERAL_WEIGHTED_MOVEMENTS) {
  for (const repMax of REP_MAX) {
    for (const dominantSide of DOMINANT_SIDE) {
      MEASURES.push({
        id: generateUnilateralMeasureId({ movement, repMax, dominantSide }),
        type: { type: "input", measureClass: "weightedmovement" },
        name: `Weighted unilateral ${movement} ${dominantSide}`,
        description: `Record total weight, including bodyweight for relevant exercises.

So for example, for a pullup if you weigh 70kg and you removed 30kg, you'd record 40kg.
`,
        units: ["kg", "lb"],
        initialFilter: {
          type: "minmax",
          minValue: { unit: "kg", value: 0 },
          maxValue: { unit: "kg", value: 100 },
        },
      });
    }
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
    type: { type: "input", measureClass: "maxrepsmovement" },
    name: `${movement} Max Reps`,
    description: `Maximum number of reps you can complete`,
    units: ["count"],
    initialFilter: {
      type: "minmax",
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
}) => `max-rep-unilateral:${movement}:${dominantSide}` as MeasureId;

export const parseUnilateralMaxRepMeasureId = (
  measureId: MeasureId,
): { movement: UnilateralMaxRepMovement; dominantSide: DominantSide } => {
  const prefix = "max-rep-unilateral:";
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
      type: { type: "input", measureClass: "maxrepsmovement" },
      name: `Unilateral ${movement} Max Reps ${dominantSide}`,
      description: `Maximum number of reps you can complete`,
      units: ["count"],
      initialFilter: {
        type: "minmax",
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
) => `isometric-hold:${movement}` as MeasureId;

export const parseIsometricMovementMeasureId = (
  measureId: MeasureId,
): IsometricMovement => {
  const prefix = "isometric-hold:";
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
    type: { type: "input", measureClass: "isometrichold" },
    name: `${movement} Isometric Hold`,
    description: ``,
    units: ["second"],
    initialFilter: {
      type: "minmax",
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
}) => `isometric-hold-unilateral:${movement}:${dominantSide}` as MeasureId;

export const parseIsometricUnilateralMovementMeasureId = (
  measureId: MeasureId,
): { movement: IsometricUnilateralMovement; dominantSide: DominantSide } => {
  const prefix = "isometric-hold-unilateral:";
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
      type: { type: "input", measureClass: "isometrichold" },
      name: `${movement} Max Duration ${dominantSide}`,
      description: ``,
      units: ["second"],
      initialFilter: {
        type: "minmax",
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
    type: { type: "input", measureClass: "endurance" },
    description: ``,
    units: ["second"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "second", value: 0 },
      maxValue: { unit: "second", value: 120 },
    },
  });
}
