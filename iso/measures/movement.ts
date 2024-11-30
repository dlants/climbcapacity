import { MeasureClassSpec } from "./index.js";

// Weighted movement types and descriptions
export type WeightedMovement =
  | "barbellsquat"
  | "benchpress"
  | "deadlift"
  | "overheadpress"
  | "pullup"
  | "dip"
  | "ringdip";

const weightedMovementDesc: { [key in WeightedMovement]: string } = {
  "barbellsquat": "barbell back squat",
  "benchpress": "barbell bench press",
  "deadlift": "barbell deadlift",
  "overheadpress": "barbell overhead press",
  "pullup": "Pull-up. You must bring your chin above the bar for a successful rep.",
  "dip": "Dip on a fixed surface.",
  "ringdip": "Dip on gymnastic rings.",
};

export const weightedClass: MeasureClassSpec = {
  className: "weighted",
  params: [
    {
      name: "movement",
      values: Object.keys(weightedMovementDesc) as WeightedMovement[],
      suffix: "",
    },
    {
      name: "repMax",
      values: ["1", "2", "5"] as ("1" | "2" | "5")[],
      suffix: "rm",
    },
  ],
  measureType: "input",
  units: ["kg", "lb"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "kg", value: 0 },
    maxValue: { unit: "kg", value: 200 },
  },
  generateDescription: (params: { movement: WeightedMovement; repMax: "1" | "2" | "5" }) => {
    return `Measure your ${params.repMax} rep maximum for the following movement:

${weightedMovementDesc[params.movement]}.

${(params.movement == 'pullup' || params.movement == 'dip' || params.movement == 'ringdip') ? 'Include your body weight in your recorded measurement. So if you weigh 70kg and you added 30kg, record 100kg.' : ''}

Rest at least 5 minutes between attempts.`;
  }
};

export type UnilateralMovement =
  | "benchrow"
  | "overheadpress"
  | "pistolsquat"
  | "pullup"

const unilateralMovementDesc: { [key in UnilateralMovement]: string } = {
  "benchrow": "Bench supported row. You must keep your hips and shoulders square to the floor.",
  "overheadpress": "Overhead press. Use a kettlebell or a dumbell. You should not drive with your legs to get out of the bottom position.",
  "pistolsquat": "Pistol squat. Hold a dumbell or a kettlebell in your hands to add weight.",
  "pullup": "Pull-up. You must bring your chin above the bar for a successful rep. Remove weight with a pulley held in the non-workign hand if needed. Record the total weight, including body weight. So for example if you weight 70kg and you removed 20kg, record 50kg.",
};

export const unilateralWeightedClass: MeasureClassSpec = {
  className: "unilateral",
  params: [
    {
      name: "movement",
      values: Object.keys(unilateralMovementDesc) as UnilateralMovement[],
      suffix: "",
    },
    {
      name: "repMax",
      values: ["1", "2", "5"] as ("1" | "2" | "5")[],
      suffix: "rm",
    },
    {
      name: "dominantSide",
      values: ["dominant", "nondominant"],
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["kg", "lb"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "kg", value: 0 },
    maxValue: { unit: "kg", value: 100 },
  },
  generateDescription: (params: { movement: UnilateralMovement; repMax: "1" | "2" | "5"; dominantSide: "dominant" | "nondominant" }) => {
    return `Measure your ${params.repMax} rep maximum on your ${params.dominantSide} side for the following movement:

${unilateralMovementDesc[params.movement]}.

Rest at least 5 minutes between attempts.`;
  }
}

// Max reps movement types and descriptions
export type MaxRepsMovement =
  | "pullup"
  | "pushup"
  | "dip"
  | "ringdip"
  | "muscleup";

const maxRepsMovementDesc: { [key in MaxRepsMovement]: string } = {
  "pullup": "Bodyweight pull-ups. No kipping. A successful rep brings your chin above the bar. You may take a short hanging rest at the bottom but you may not hang on one arm and shake out.",
  "pushup": "Bodyweight push-ups. You must keep your body flat, so don't let your hips sag or pop up. A successful rep brings your chest within a fist of the floor.",
  "dip": "Bodyweight dips on a fixed surface.",
  "ringdip": "Bodyweight dips on rings.",
  "muscleup": "Bodyweight muscle-ups.",
};

export const maxRepsClass: MeasureClassSpec = {
  className: "maxreps",
  params: [
    {
      name: "movement",
      values: Object.keys(maxRepsMovementDesc) as MaxRepsMovement[],
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["count"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "count", value: 0 },
    maxValue: { unit: "count", value: 100 },
  },
  generateDescription: (params: { movement: MaxRepsMovement }) => {
    return `${maxRepsMovementDesc[params.movement]}.`;
  }
};

// Unilateral max reps types and descriptions
export type UnilateralMaxRepsMovement =
  | "pullup"
  | "pushup"
  | "pistolsquat";

const unilateralMaxRepsMovementDesc: { [key in UnilateralMaxRepsMovement]: string } = {
  "pullup": "Bodyweight one-hand pull-up. You must bring your chin above the bar for a successful rep.",
  "pushup": "Bodyweight one-hand push-up. Keep your body square to the floor.",
  "pistolsquat": "Bodyweight pistol squat."
};

export const unilateralMaxRepsClass: MeasureClassSpec = {
  className: "maxreps-unilateral",
  params: [
    {
      name: "movement",
      values: Object.keys(unilateralMaxRepsMovementDesc) as UnilateralMaxRepsMovement[],
      suffix: "",
    },
    {
      name: "dominantSide",
      values: ["dominant", "nondominant"],
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["count"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "count", value: 0 },
    maxValue: { unit: "count", value: 100 },
  },
  generateDescription: (params: { movement: UnilateralMaxRepsMovement; dominantSide: "dominant" | "nondominant" }) => {
    return `Record the maximum number of repetitions for your ${params.dominantSide} side for the following movement:

    ${unilateralMaxRepsMovementDesc[params.movement]}.`;
  }
};

export type IsometricMovement =
  | "barhang"
  | "frontlever"
  | "hollowhold"
  | "lhang"
  | "plank"

const isometricMovementDesc: { [key in IsometricMovement]: string } = {
  "barhang": "Hang on the bar. You may not hang on one hand and shake out.",
  "lhang": "Hang on the bar with your legs straight in front of you at at least 90 degrees. Keep your knees locked straight.",
  "frontlever": "Hold a full front lever. Your body must be horizontal to the floor..",
  "hollowhold": "Legs straight. Your heels and shoulders should be within a couple of inches of the floor.",
  "plank": "Plank on your elbows. Your shoulders should be directly above your elbows. Keep your hips from sagging or popping up."
};

export const isometricClass: MeasureClassSpec = {
  className: "isometric",
  params: [
    {
      name: "movement",
      values: Object.keys(isometricMovementDesc) as IsometricMovement[],
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["second"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "second", value: 0 },
    maxValue: { unit: "second", value: 300 },
  },
  generateDescription: (params: { movement: IsometricMovement }) => {
    return `Maximum hold time for the following movement:

${isometricMovementDesc[params.movement]}.`;
  }
};

export type UnilateralIsometricMovement =
  "sideplank";

const unilateralIsometricMovementDesc: { [key in UnilateralIsometricMovement]: string } = {
  "sideplank": "Side plank on your elbow. Your shoulder should be directly above your elbow. Keep your hips from sagging or popping up."
};

export const unilateralIsometricClass: MeasureClassSpec = {
  className: "isometric-unilateral",
  params: [
    {
      name: "movement",
      values: Object.keys(unilateralIsometricMovementDesc) as UnilateralIsometricMovement[],
      suffix: "",
    },
    {
      name: "dominantSide",
      values: ["dominant", "nondominant"],
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["second"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "second", value: 0 },
    maxValue: { unit: "second", value: 300 },
  },
  generateDescription: (params: { movement: UnilateralIsometricMovement; dominantSide: "dominant" | "nondominant" }) => {
    return `Maximum hold time for a unilateral isometric:

    ${unilateralIsometricMovementDesc[params.movement]}.`;
  }
};

export type EnduranceMovement = "footoncampuslong" | "footoncampusshort";


const enduranceMovementDesc: { [key in EnduranceMovement]: string } = {
  "footoncampuslong": `For this measurement you will use medium campus rungs (1") with foot rungs.

Move one rung at a time at a pace similar to climbing, only matching on the top and bottom rungs. Move up as far as you can comfortably reach and then back down to the bottom rung. Keep your feet stationary.

You may chalk between moves and shake briefly while reaching, but you may not stop to shake out. Climb until the pump causes failure and record this time in seconds.`,
  "footoncampusshort": `For this measurement you will use medium campus rungs (1").

You'll be making a single big move, and without matching, reversing that same move. Then you'll repeat with the other hand.

The move should be as high as you can go without jumping, and that you can still reverse in control.

Your feet should be planted in one spot.

Alternate the hand you lead with and move at a pace similar to climbing. You may chalk up if needed but avoid shaking out other than while reaching between rungs. Record your time spent on the board in seconds.`,
};

export const enduranceClass: MeasureClassSpec = {
  className: "endurance",
  params: [
    {
      name: "movement",
      values: Object.keys(enduranceMovementDesc) as EnduranceMovement[],
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["second"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "second", value: 0 },
    maxValue: { unit: "second", value: 1000 },
  },
  generateDescription: (params: { movement: EnduranceMovement }) => {
    return `Maximum duration performing the following movement:

${enduranceMovementDesc[params.movement]}.`;
  }
};
