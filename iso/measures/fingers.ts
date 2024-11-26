import { MeasureClassSpec, MeasureSpec } from "./index.js";

export const MEASURES: MeasureSpec[] = [];

export const maxhangClass: MeasureClassSpec = {
  className: "maxhang",
  measureType: "input",
  params: [
    {
      name: "gripType",
      values: [
        "half-crimp",
        "open",
        "full-crimp",
        "back-3-crimp",
        "back-3-drag",
        "front-3-crimp",
        "front-3-drag",
      ],
      suffix: "",
    },
    {
      name: "edgeSize",
      values: ["20", "18", "10"],
      suffix: "mm",
    },
    {
      name: "duration",
      values: ["7", "10"],
      suffix: "s",
    },
  ],
  units: ["kg", "lb"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "kg", value: 35 },
    maxValue: { unit: "kg", value: 100 },
  },
};

export const unilateralMaxhangClass: MeasureClassSpec = {
  className: "maxhang-unilateral",
  params: [
    {
      name: "gripType",
      values: [
        "half-crimp",
        "open",
        "full-crimp",
        "back-3-crimp",
        "back-3-drag",
        "front-3-crimp",
        "front-3-drag",
      ],
      suffix: "",
    },
    {
      name: "edgeSize",
      values: ["20", "18", "10"],
      suffix: "mm",
    },
    {
      name: "duration",
      values: ["7", "10"],
      suffix: "s",
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
    minValue: { unit: "kg", value: 35 },
    maxValue: { unit: "kg", value: 100 },
  },
};

export const repeatersClass: MeasureClassSpec = {
  className: "repeaters",
  params: [
    {
      name: "timing",
      values: ["7-3"],
      suffix: "",
    },
    {
      name: "gripType",
      values: ["half-crimp", "open", "full-crimp"],
      suffix: "",
    },
    {
      name: "edgeSize",
      values: ["20", "18", "10"],
      suffix: "mm",
    },
  ],
  measureType: "input",
  units: ["second"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "second", value: 0 },
    maxValue: { unit: "second", value: 300 },
  },
};

export const blockPullClass: MeasureClassSpec = {
  className: "blockpull",
  params: [
    {
      name: "gripType",
      values: [
        "half-crimp",
        "open",
        "full-crimp",
        "mono-index-crimp",
        "mono-index-drag",
        "mono-middle-crimp",
        "mono-middle-drag",
        "mono-ring-crimp",
        "mono-ring-drag",
        "mono-pinky-crimp",
        "mono-pinky-drag",
      ],
      suffix: "",
    },
    {
      name: "edgeSize",
      values: ["20", "18", "10"],
      suffix: "mm",
    },
    {
      name: "duration",
      values: ["7", "10"],
      suffix: "s",
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
    minValue: { unit: "kg", value: 35 },
    maxValue: { unit: "kg", value: 100 },
  },
};

export const minEdgeClass: MeasureClassSpec = {
  className: "minedge",
  params: [
    {
      name: "gripType",
      values: ["full-crimp", "half-crimp", "open"],
      suffix: "",
    },
    {
      name: "duration",
      values: ["7", "10"],
      suffix: "s",
    },
  ],
  measureType: "input",
  units: ["mm"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "mm", value: 5 },
    maxValue: { unit: "mm", value: 25 },
  },
};

export const minEdgePullupsClass: MeasureClassSpec = {
  className: "minedgepullups",
  params: [
    {
      name: "reps",
      values: ["2"],
      suffix: "rm",
    },
    {
      name: "gripType",
      values: [
        "half-crimp",
        "open",
        "full-crimp",
        "back-3-crimp",
        "back-3-drag",
        "front-3-crimp",
        "front-3-drag",
      ],
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["mm"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "mm", value: 5 },
    maxValue: { unit: "mm", value: 25 },
  },
};

export const continuousHangClass: MeasureClassSpec = {
  className: "continuoushang",
  params: [
    {
      name: "gripType",
      values: [
        "half-crimp",
        "open",
        "full-crimp",
        "back-3-crimp",
        "back-3-drag",
        "front-3-crimp",
        "front-3-drag",
      ],
      suffix: "",
    },
    {
      name: "edgeSize",
      values: ["20", "18", "10"],
      suffix: "mm",
    },
  ],
  measureType: "input",
  units: ["second"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "second", value: 0 },
    maxValue: { unit: "second", value: 300 },
  },
};
