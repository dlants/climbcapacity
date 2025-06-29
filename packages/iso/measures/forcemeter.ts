import { MeasureClassSpec, MeasureSpec } from "./index.js";
import { 
  AVG_LOAD_DURATIONS, 
  avgLoadDuration, 
  BASIC_GRIP_TYPES, 
  DOMINANT_SIDES, 
  EDGE_SIZES, 
  ParamValue 
} from "./params.js";

// Type definitions for parameters
export type GripType = typeof BASIC_GRIP_TYPES[number];
export type EdgeSize = typeof EDGE_SIZES[number];
export type DominantSide = typeof DOMINANT_SIDES[number];

// Helper functions for parameter descriptions
const getGripTypeDescription = (gripType: GripType): string => {
  const descriptions: Record<GripType, string> = {
    "half-crimp": `\
use a half crimp grip (90° at index, middle and ring pip joints).
consider the test a technical failure if your hand starts to open up.`,
    "open": `\
use an open hand grip.`,
    "full-crimp": `\
use a full crimp grip (closed position with thumb wrap).
consider the test a technical failure if your hand starts to open up.`,
  };
  return descriptions[gripType];
};

const getDominantSideDescription = (side: DominantSide): string => {
  return side === "dominant" ? "dominant hand" : "non-dominant hand";
};

export const MEASURES: MeasureSpec[] = [];

export const peakloadClass: MeasureClassSpec = {
  className: "peakload",
  params: [
    {
      name: "basicGripType",
      values: BASIC_GRIP_TYPES,
      suffix: "",
    },
    {
      name: "edgeSize",
      values: EDGE_SIZES,
      suffix: 'mm'
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
        minValue: { unit: "lb", value: 77 },
        maxValue: { unit: "lb", value: 220 },
      },
      UK: {
        minValue: { unit: "lb", value: 77 },
        maxValue: { unit: "lb", value: 220 },
      },
      Europe: {
        minValue: { unit: "kg", value: 35 },
        maxValue: { unit: "kg", value: 100 },
      },
      Australia: {
        minValue: { unit: "kg", value: 35 },
        maxValue: { unit: "kg", value: 100 },
      },
    },
  },
  generateDescription: (params: { gripType: GripType; edgeSize: EdgeSize; dominantSide: DominantSide }) => {
    return `\
Peak load measured by a force gauge like a tindeq. Use a ${params.edgeSize}mm edge on a block, on your ${getDominantSideDescription(params.dominantSide)}.

${getGripTypeDescription(params.gripType)}.`
  }
};

export const avgLoadClass: MeasureClassSpec = {
  className: "avgload",
  params: [
    {
      name: "basicGripType",
      values: BASIC_GRIP_TYPES,
      suffix: "",
    },
    {
      name: "edgeSize",
      values: EDGE_SIZES,
      suffix: 'mm'
    },
    {
      name: "avgLoadDuration",
      values: AVG_LOAD_DURATIONS,
      suffix: 's'
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
        minValue: { unit: "lb", value: 77 },
        maxValue: { unit: "lb", value: 220 },
      },
      UK: {
        minValue: { unit: "lb", value: 77 },
        maxValue: { unit: "lb", value: 220 },
      },
      Europe: {
        minValue: { unit: "kg", value: 35 },
        maxValue: { unit: "kg", value: 100 },
      },
      Australia: {
        minValue: { unit: "kg", value: 35 },
        maxValue: { unit: "kg", value: 100 },
      },
    },
  },
  generateDescription: (params: { basicGripType: ParamValue<"basicGripType">; edgeSize: EdgeSize; avgLoadDuration: avgLoadDuration; dominantSide: DominantSide }) => {
    return `\
Avg load measured by a force gauge like a tindeq. Use a ${params.edgeSize}mm edge block pull, over a duration of ${params.avgLoadDuration}s on your ${getDominantSideDescription(params.dominantSide)}.

${getGripTypeDescription(params.basicGripType)}.`
  }
};

export const rfdClass: MeasureClassSpec = {
  className: "rfd",
  params: [
    {
      name: "basicGripType",
      values: BASIC_GRIP_TYPES,
      suffix: "",
    },
    {
      name: "edgeSize",
      values: EDGE_SIZES,
      suffix: 'mm'
    },
    {
      name: "dominantSide",
      values: DOMINANT_SIDES,
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["lb/s", "kg/s"],
  initialFilter: {
    type: "minmax",
    localeRanges: {
      US: {
        minValue: { unit: "lb/s", value: 77 },
        maxValue: { unit: "lb/s", value: 220 },
      },
      UK: {
        minValue: { unit: "lb/s", value: 77 },
        maxValue: { unit: "lb/s", value: 220 },
      },
      Europe: {
        minValue: { unit: "kg/s", value: 35 },
        maxValue: { unit: "kg/s", value: 100 },
      },
      Australia: {
        minValue: { unit: "kg/s", value: 35 },
        maxValue: { unit: "kg/s", value: 100 },
      },
    },
  },
  generateDescription: (params: { gripType: GripType; edgeSize: EdgeSize; dominantSide: DominantSide }) => {
    return `\
RFD measured by a force gauge like a tindeq. Use a ${params.edgeSize}mm edge on a block on your ${getDominantSideDescription(params.dominantSide)}.

${getGripTypeDescription(params.gripType)}.`
  }
};

export const criticalForceClass: MeasureClassSpec = {
  className: "criticalforce",
  params: [
    {
      name: "basicGripType",
      values: BASIC_GRIP_TYPES,
      suffix: "",
    },
    {
      name: "edgeSize",
      values: EDGE_SIZES,
      suffix: 'mm'
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
        minValue: { unit: "lb", value: 22 },
        maxValue: { unit: "lb", value: 110 },
      },
      UK: {
        minValue: { unit: "lb", value: 22 },
        maxValue: { unit: "lb", value: 110 },
      },
      Europe: {
        minValue: { unit: "kg", value: 10 },
        maxValue: { unit: "kg", value: 50 },
      },
      Australia: {
        minValue: { unit: "kg", value: 10 },
        maxValue: { unit: "kg", value: 50 },
      },
    },
  },
  generateDescription: (params: { gripType: GripType; edgeSize: EdgeSize; dominantSide: DominantSide }) => {
    return `\
Critical force as measured by a force gauge like a tindeq. Use a ${params.edgeSize}mm edge on a block on your ${getDominantSideDescription(params.dominantSide)}.

${getGripTypeDescription(params.gripType)}.`
  }
};
