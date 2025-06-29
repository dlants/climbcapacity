import { MeasureClassSpec } from "./index.js";
import {
  DOMINANT_SIDES,
  ENDURANCE_MOVEMENT,
  ISOMETRIC_MOVEMENT,
  MAX_REPS_MOVEMENT,
  ParamValue,
  REPS,
  UNILATERAL_ISOMETRIC_MOVEMENT,
  UNILATERAL_MAX_REPS_MOVEMENT,
  UNILATERAL_MOVEMENT,
  UNILATERAL_REPS,
  WEIGHTED_MOVEMENT
} from "./params.js";

export type WeightedMovement = (typeof WEIGHTED_MOVEMENT)[number];
export type UnilateralMovement = (typeof UNILATERAL_MOVEMENT)[number];
export type MaxRepsMovement = (typeof MAX_REPS_MOVEMENT)[number];
export type UnilateralMaxRepsMovement = (typeof UNILATERAL_MAX_REPS_MOVEMENT)[number];
export type IsometricMovement = (typeof ISOMETRIC_MOVEMENT)[number];
export type UnilateralIsometricMovement = (typeof UNILATERAL_ISOMETRIC_MOVEMENT)[number];
export type EnduranceMovement = (typeof ENDURANCE_MOVEMENT)[number];

const weightedMovementDesc: { [key in WeightedMovement]: string } = {
  barbellsquat: "barbell back squat",
  benchpress: "barbell bench press",
  deadlift: "barbell deadlift",
  overheadpress: "barbell overhead press",
  pullup:
    "Pull-up. You must bring your chin above the bar for a successful rep.",
  dip: "Dip on a fixed surface.",
  ringdip: "Dip on gymnastic rings.",
};

export const weightedClass: MeasureClassSpec = {
  className: "weighted",
  params: [
    {
      name: "weightedMovement",
      values: WEIGHTED_MOVEMENT,
      suffix: "",
    },
    {
      name: "repMax",
      values: REPS,
      suffix: "rm",
    },
  ],
  measureType: "input",
  units: ["lb", "kg"],
  initialFilter: {
    type: "minmax",
    localeRanges: {
      US: {
        minValue: { unit: "lb", value: 0 },
        maxValue: { unit: "lb", value: 440 },
      },
      UK: {
        minValue: { unit: "lb", value: 0 },
        maxValue: { unit: "lb", value: 440 },
      },
      Europe: {
        minValue: { unit: "kg", value: 0 },
        maxValue: { unit: "kg", value: 200 },
      },
      Australia: {
        minValue: { unit: "kg", value: 0 },
        maxValue: { unit: "kg", value: 200 },
      },
    },
  },
  generateDescription: (params: {
    weightedMovement: WeightedMovement;
    repMax: ParamValue<"repMax">;
  }) => {
    return `Measure your ${params.repMax} rep maximum for the following movement:

${weightedMovementDesc[params.weightedMovement]}.

${params.weightedMovement == "pullup" || params.weightedMovement == "dip" || params.weightedMovement == "ringdip" ? "Include your body weight in your recorded measurement. So if you weigh 70kg and you added 30kg, record 100kg." : ""}

Rest at least 5 minutes between attempts.`;
  },
};

const unilateralMovementDesc: { [key in UnilateralMovement]: string } = {
  benchrow:
    "Bench supported row. You must keep your hips and shoulders square to the floor.",
  overheadpress:
    "Overhead press. Use a kettlebell or a dumbell. You should not drive with your legs to get out of the bottom position.",
  pistolsquat:
    "Pistol squat. Hold a dumbell or a kettlebell in your hands to add weight.",
  pullup:
    "Pull-up. You must bring your chin above the bar for a successful rep. Remove weight with a pulley held in the non-workign hand if needed. Record the total weight, including body weight. So for example if you weight 70kg and you removed 20kg, record 50kg.",
};

export const unilateralWeightedClass: MeasureClassSpec = {
  className: "unilateral",
  params: [
    {
      name: "unilateralMovement",
      values: UNILATERAL_MOVEMENT,
      suffix: "",
    },
    {
      name: "repMax",
      values: UNILATERAL_REPS,
      suffix: "rm",
    },
    {
      name: "dominantSide",
      values: DOMINANT_SIDES,
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["lb", "kg"],
  initialFilter: {
    type: "minmax",
    localeRanges: {
      US: {
        minValue: { unit: "lb", value: 0 },
        maxValue: { unit: "lb", value: 220 },
      },
      UK: {
        minValue: { unit: "lb", value: 0 },
        maxValue: { unit: "lb", value: 220 },
      },
      Europe: {
        minValue: { unit: "kg", value: 0 },
        maxValue: { unit: "kg", value: 100 },
      },
      Australia: {
        minValue: { unit: "kg", value: 0 },
        maxValue: { unit: "kg", value: 100 },
      },
    },
  },
  generateDescription: (params: {
    unilateralMovement: UnilateralMovement;
    repMax: ParamValue<"repMax">;
    dominantSide: "dominant" | "nondominant";
  }) => {
    return `Measure your ${params.repMax} rep maximum on your ${params.dominantSide} side for the following movement:

${unilateralMovementDesc[params.unilateralMovement]}.

Rest at least 5 minutes between attempts.`;
  },
};

// Max reps movement types and descriptions
const maxRepsMovementDesc: { [key in MaxRepsMovement]: string } = {
  pullup:
    "Bodyweight pull-ups. No kipping. A successful rep brings your chin above the bar. You may take a short hanging rest at the bottom but you may not hang on one arm and shake out.",
  pushup:
    "Bodyweight push-ups. You must keep your body flat, so don't let your hips sag or pop up. A successful rep brings your chest within a fist of the floor.",
  dip: "Bodyweight dips on a fixed surface.",
  ringdip: "Bodyweight dips on rings.",
  muscleup: "Bodyweight muscle-ups.",
};

export const maxRepsClass: MeasureClassSpec = {
  className: "maxreps",
  params: [
    {
      name: "maxRepsMovement",
      values: MAX_REPS_MOVEMENT,
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["count"],
  initialFilter: {
    type: "minmax",
    localeRanges: {
      US: {
        minValue: { unit: "count", value: 0 },
        maxValue: { unit: "count", value: 100 },
      },
      UK: {
        minValue: { unit: "count", value: 0 },
        maxValue: { unit: "count", value: 100 },
      },
      Europe: {
        minValue: { unit: "count", value: 0 },
        maxValue: { unit: "count", value: 100 },
      },
      Australia: {
        minValue: { unit: "count", value: 0 },
        maxValue: { unit: "count", value: 100 },
      },
    },
  },
  generateDescription: (params: { maxRepsMovement: MaxRepsMovement }) => {
    return `${maxRepsMovementDesc[params.maxRepsMovement]}.`;
  },
};

// Unilateral max reps types and descriptions
const unilateralMaxRepsMovementDesc: {
  [key in UnilateralMaxRepsMovement]: string;
} = {
  pullup:
    "Bodyweight one-hand pull-up. You must bring your chin above the bar for a successful rep.",
  pushup: "Bodyweight one-hand push-up. Keep your body square to the floor.",
  pistolsquat: "Bodyweight pistol squat.",
};

export const unilateralMaxRepsClass: MeasureClassSpec = {
  className: "maxreps-unilateral",
  params: [
    {
      name: "unilateralMaxRepsMovement",
      values: UNILATERAL_MAX_REPS_MOVEMENT,
      suffix: "",
    },
    {
      name: "dominantSide",
      values: DOMINANT_SIDES,
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["count"],
  initialFilter: {
    type: "minmax",
    localeRanges: {
      US: {
        minValue: { unit: "count", value: 0 },
        maxValue: { unit: "count", value: 100 },
      },
      UK: {
        minValue: { unit: "count", value: 0 },
        maxValue: { unit: "count", value: 100 },
      },
      Europe: {
        minValue: { unit: "count", value: 0 },
        maxValue: { unit: "count", value: 100 },
      },
      Australia: {
        minValue: { unit: "count", value: 0 },
        maxValue: { unit: "count", value: 100 },
      },
    },
  },
  generateDescription: (params: {
    unilateralMaxRepsMovement: UnilateralMaxRepsMovement;
    dominantSide: "dominant" | "nondominant";
  }) => {
    return `Record the maximum number of repetitions for your ${params.dominantSide} side for the following movement:

    ${unilateralMaxRepsMovementDesc[params.unilateralMaxRepsMovement]}.`;
  },
};

// Isometric movement types and descriptions
const isometricMovementDesc: { [key in IsometricMovement]: string } = {
  barhang: "Hang on the bar. You may not hang on one hand and shake out.",
  lhang:
    "Hang on the bar with your legs straight in front of you at at least 90 degrees. Keep your knees locked straight.",
  frontlever:
    "Hold a full front lever. Your body must be horizontal to the floor..",
  hollowhold:
    "Legs straight. Your heels and shoulders should be within a couple of inches of the floor.",
  plank:
    "Plank on your elbows. Your shoulders should be directly above your elbows. Keep your hips from sagging or popping up.",
};

export const isometricClass: MeasureClassSpec = {
  className: "isometric",
  params: [
    {
      name: "isometricMovement",
      values: ISOMETRIC_MOVEMENT,
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["second"],
  initialFilter: {
    type: "minmax",
    localeRanges: {
      US: {
        minValue: { unit: "second", value: 0 },
        maxValue: { unit: "second", value: 300 },
      },
      UK: {
        minValue: { unit: "second", value: 0 },
        maxValue: { unit: "second", value: 300 },
      },
      Europe: {
        minValue: { unit: "second", value: 0 },
        maxValue: { unit: "second", value: 300 },
      },
      Australia: {
        minValue: { unit: "second", value: 0 },
        maxValue: { unit: "second", value: 300 },
      },
    },
  },
  generateDescription: (params: { isometricMovement: IsometricMovement }) => {
    return `Maximum hold time for the following movement:

${isometricMovementDesc[params.isometricMovement]}.`;
  },
};

// Unilateral isometric movement types and descriptions
const unilateralIsometricMovementDesc: {
  [key in UnilateralIsometricMovement]: string;
} = {
  sideplank:
    "Side plank on your elbow. Your shoulder should be directly above your elbow. Keep your hips from sagging or popping up.",
};

export const unilateralIsometricClass: MeasureClassSpec = {
  className: "isometric-unilateral",
  params: [
    {
      name: "unilateralIsometricMovement",
      values: UNILATERAL_ISOMETRIC_MOVEMENT,
      suffix: "",
    },
    {
      name: "dominantSide",
      values: DOMINANT_SIDES,
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["second"],
  initialFilter: {
    type: "minmax",
    localeRanges: {
      US: {
        minValue: { unit: "second", value: 0 },
        maxValue: { unit: "second", value: 300 },
      },
      UK: {
        minValue: { unit: "second", value: 0 },
        maxValue: { unit: "second", value: 300 },
      },
      Europe: {
        minValue: { unit: "second", value: 0 },
        maxValue: { unit: "second", value: 300 },
      },
      Australia: {
        minValue: { unit: "second", value: 0 },
        maxValue: { unit: "second", value: 300 },
      },
    },
  },
  generateDescription: (params: {
    unilateralIsometricMovement: UnilateralIsometricMovement;
    dominantSide: "dominant" | "nondominant";
  }) => {
    return `Maximum hold time for a unilateral isometric:

    ${unilateralIsometricMovementDesc[params.unilateralIsometricMovement]}.`;
  },
};

// Endurance movement types and descriptions
const enduranceMovementDesc: { [key in EnduranceMovement]: string } = {
  footoncampuslong: `For this measurement you will use medium campus rungs (1") with foot rungs.

Move one rung at a time at a pace similar to climbing, only matching on the top and bottom rungs. Move up as far as you can comfortably reach and then back down to the bottom rung. Keep your feet stationary.

You may chalk between moves and shake briefly while reaching, but you may not stop to shake out. Climb until the pump causes failure and record this time in seconds.`,
  footoncampusshort: `For this measurement you will use medium campus rungs (1").

You'll be making a single big move, and without matching, reversing that same move. Then you'll repeat with the other hand.

The move should be as high as you can go without jumping, and that you can still reverse in control.

Your feet should be planted in one spot.

Alternate the hand you lead with and move at a pace similar to climbing. You may chalk up if needed but avoid shaking out other than while reaching between rungs. Record your time spent on the board in seconds.`,
};

export const enduranceClass: MeasureClassSpec = {
  className: "endurance",
  params: [
    {
      name: "enduranceMovement",
      values: ENDURANCE_MOVEMENT,
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["second"],
  initialFilter: {
    type: "minmax",
    localeRanges: {
      US: {
        minValue: { unit: "second", value: 0 },
        maxValue: { unit: "second", value: 1000 },
      },
      UK: {
        minValue: { unit: "second", value: 0 },
        maxValue: { unit: "second", value: 1000 },
      },
      Europe: {
        minValue: { unit: "second", value: 0 },
        maxValue: { unit: "second", value: 1000 },
      },
      Australia: {
        minValue: { unit: "second", value: 0 },
        maxValue: { unit: "second", value: 1000 },
      },
    },
  },
  generateDescription: (params: { enduranceMovement: EnduranceMovement }) => {
    return `Maximum duration performing the following movement:

${enduranceMovementDesc[params.enduranceMovement]}.`;
  },
};
