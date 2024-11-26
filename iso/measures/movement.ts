import { MeasureClassSpec } from "./index.js";

export const weightedClass: MeasureClassSpec = {
  className: "weighted",
  params: [
    {
      name: "movement",
      values: [
        "barbellsquat",
        "benchpress",
        "deadlift",
        "overheadpress",
        "pullup",
        "standingrow",
      ],
      suffix: "",
    },
    {
      name: "repMax",
      values: ["1", "2", "5"],
      suffix: "rm",
    },
  ],
  measureType: "input",
  units: ["kg", "lb"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "kg", value: 0 },
    maxValue: { unit: "kg", value: 100 },
  },
};

export const unilateralWeightedClass: MeasureClassSpec = {
  className: "weighted-unilateral",
  params: [
    {
      name: "movement",
      values: [
        "benchrow",
        "overheadpress",
        "pistolsquat",
        "pullup",
        "dumbellpress",
      ],
      suffix: "",
    },
    {
      name: "repMax",
      values: ["1", "2", "5"],
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
};

export const maxRepsClass: MeasureClassSpec = {
  className: "maxrep",
  params: [
    {
      name: "movement",
      values: ["pullup", "pushup", "veeup", "bodyweightsquat"],
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["count"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "count", value: 0 },
    maxValue: { unit: "count", value: 20 },
  },
};

export const unilateralMaxRepsClass: MeasureClassSpec = {
  className: "maxrep-unilateral",
  params: [
    {
      name: "movement",
      values: ["pullup", "pushup", "pistolsquat"],
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
    maxValue: { unit: "count", value: 20 },
  },
};

export const isometricClass: MeasureClassSpec = {
  className: "isometrichold",
  params: [
    {
      name: "movement",
      values: ["lhang", "frontlever", "plank", "hollowhold", "barhang"],
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["second"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "second", value: 0 },
    maxValue: { unit: "second", value: 120 },
  },
};

export const unilateralIsometricClass: MeasureClassSpec = {
  className: "isometrichold-unilateral",
  params: [
    {
      name: "movement",
      values: ["sideplank"],
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
    maxValue: { unit: "second", value: 120 },
  },
};

export const enduranceClass: MeasureClassSpec = {
  className: "endurance",
  params: [
    {
      name: "movement",
      values: ["footoncampusshort", "footoncampuslong"],
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["second"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "second", value: 0 },
    maxValue: { unit: "second", value: 120 },
  },
};
