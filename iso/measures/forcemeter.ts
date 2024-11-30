import { MeasureClassSpec, MeasureSpec } from "./index.js";

// Type definitions for parameters
export type GripType =
  | "half-crimp"
  | "open"
  | "full-crimp";

export type Duration = "30";

export type EdgeSize = "20" | "18" | "10";
export type DominantSide = "dominant" | "nondominant";

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
      name: "gripType",
      values: [
        "half-crimp",
        "open",
        "full-crimp",
      ] as const,
      suffix: "",
    },
    {
      name: "edgeSize",
      values: [
        "20", "18", "10"
      ] as const,
      suffix: 'mm'
    },
    {
      name: "dominantSide",
      values: ["dominant", "nondominant"] as DominantSide[],
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
      name: "gripType",
      values: [
        "half-crimp",
        "open",
        "full-crimp",
      ] as const,
      suffix: "",
    },
    {
      name: "edgeSize",
      values: [
        "20", "18", "10"
      ] as const,
      suffix: 'mm'
    },
    {
      name: "duration",
      values: [
        "30"
      ] as const,
      suffix: 's'
    },
    {
      name: "dominantSide",
      values: ["dominant", "nondominant"] as DominantSide[],
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
  generateDescription: (params: { gripType: GripType; edgeSize: EdgeSize; duration: Duration; dominantSide: DominantSide }) => {
    return `\
Avg load measured by a force gauge like a tindeq. Use a ${params.edgeSize}mm edge block pull, over a duration of ${params.duration}s on your ${getDominantSideDescription(params.dominantSide)}.

${getGripTypeDescription(params.gripType)}.`
  }
};

export const rfdClass: MeasureClassSpec = {
  className: "rfd",
  params: [
    {
      name: "gripType",
      values: [
        "half-crimp",
        "open",
        "full-crimp",
      ] as const,
      suffix: "",
    },
    {
      name: "edgeSize",
      values: [
        "20", "18", "10"
      ] as const,
      suffix: 'mm'
    },
    {
      name: "dominantSide",
      values: ["dominant", "nondominant"] as DominantSide[],
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["kg/s", "lb/s"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "kg/s", value: 35 },
    maxValue: { unit: "kg/s", value: 100 },
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
      name: "gripType",
      values: [
        "half-crimp",
        "open",
        "full-crimp",
      ] as const,
      suffix: "",
    },
    {
      name: "edgeSize",
      values: [
        "20", "18", "10"
      ] as const,
      suffix: 'mm'
    },
    {
      name: "dominantSide",
      values: ["dominant", "nondominant"] as DominantSide[],
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["kg", "lb"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "kg", value: 10 },
    maxValue: { unit: "kg", value: 50 },
  },
  generateDescription: (params: { gripType: GripType; edgeSize: EdgeSize; dominantSide: DominantSide }) => {
    return `\
Critical force as measured by a force gauge like a tindeq. Use a ${params.edgeSize}mm edge on a block on your ${getDominantSideDescription(params.dominantSide)}.

${getGripTypeDescription(params.gripType)}.`
  }
};
