import { MeasureClassSpec, MeasureSpec } from "./index.js";

// Type definitions for parameters
export type GripType =
  | "half-crimp"
  | "open"
  | "full-crimp"
  | "back-3-crimp"
  | "back-3-drag"
  | "front-3-crimp"
  | "front-3-drag"
  | "mono-index-crimp"
  | "mono-index-drag"
  | "mono-middle-crimp"
  | "mono-middle-drag"
  | "mono-ring-crimp"
  | "mono-ring-drag"
  | "mono-pinky-crimp"
  | "mono-pinky-drag";

export type EdgeSize = "20" | "18" | "10";
export type Duration = "7" | "10";
export type DominantSide = "dominant" | "nondominant";
export type Timing = "7-3";
export type Reps = "1" | "3" | "5";

// Helper functions for parameter descriptions
const getGripTypeDescription = (gripType: GripType): string => {
  const descriptions: Record<GripType, string> = {
    "half-crimp": `\
      Use a half crimp grip (90° at index, middle and ring PIP joints).

      Consider the test a technical failure if your hand starts to open up.
    `,
    "open": `\
      Use an open hand grip.
    `,
    "full-crimp": `\
      Use a full crimp grip (closed position with thumb wrap).

      Consider the test a technical failure if your hand starts to open up.
    `,
    "back-3-crimp": `\
      Use a back three fingers half-crimp grip (90° at middle and ring PIP joints).

      Consider the test a technical failure if your hand starts to open up.
    `,
    "back-3-drag": `\
      Use a back three fingers drag grip.
    `,
    "front-3-crimp": `\
      Use a front three fingers half-crimp grip (90° at index, middle and ring PIP joints).

      Consider the test a technical failure if your hand starts to open up.
    `,
    "front-3-drag": `\
      Use a front three finger drag grip.
    `,
    "mono-index-crimp": `\
      Use a mono index half-crimp grip (90° at PIP joint).

      Consider the test a technical failure if your hand starts to open up.
    `,
    "mono-index-drag": `\
      Use a mono index drag.
    `,
    "mono-middle-crimp": `\
      Use a mono middle crimp grip (90° at PIP joint).

      Consider the test a technical failure if your hand starts to open up.
    `,
    "mono-middle-drag": `\
      Use a mono middle drag.
    `,
    "mono-ring-crimp": `\
      Use a mono ring crimp grip (90° at PIP joint).

      Consider the test a technical failure if your hand starts to open up.
    `,
    "mono-ring-drag": `\
      Use a mono ring drag.
    `,
    "mono-pinky-crimp": `\
      Use a mono pinky crimp grip (90° at PIP joint).

      Consider the test a technical failure if your hand starts to open up.
    `,
    "mono-pinky-drag": `\
      Use a mono pinky drag.
    `
  };

  return descriptions[gripType];
};

const getEdgeSizeDescription = (size: EdgeSize): string => {
  return `${size}mm edge`;
};

const getDurationDescription = (duration: Duration): string => {
  return `${duration} second hang`;
};

const getDominantSideDescription = (side: DominantSide): string => {
  return side === "dominant" ? "dominant hand" : "non-dominant hand";
};

const getTimingDescription = (timing: Timing): string => {
  const descriptions: Record<Timing, string> = {
    "7-3": "7 seconds hang, 3 seconds rest"
  };
  return descriptions[timing];
};

const getRepsDescription = (reps: Reps): string => {
  return `${reps} repetition${reps === "1" ? "" : "s"}`;
};

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
      ] as GripType[],
      suffix: "",
    },
    {
      name: "edgeSize",
      values: ["20", "18", "10"] as EdgeSize[],
      suffix: "mm",
    },
    {
      name: "duration",
      values: ["7", "10"] as Duration[],
      suffix: "s",
    },
  ],
  units: ["kg", "lb"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "kg", value: 35 },
    maxValue: { unit: "kg", value: 100 },
  },
  generateDescription: (params: { gripType: GripType; edgeSize: EdgeSize; duration: Duration }) => {
    return `\
    Maximum weight added for a ${params.duration} second hang on a ${params.edgeSize}mm edge.

    ${getGripTypeDescription(params.gripType)}.
    
    Take at least a 5 minute rest between attempts.
    
    Record total weight, so if you weigh 70kg and you added 30kg, record 100kg.`;
  }
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
      ] as GripType[],
      suffix: "",
    },
    {
      name: "edgeSize",
      values: ["20", "18", "10"] as EdgeSize[],
      suffix: "mm",
    },
    {
      name: "duration",
      values: ["7", "10"] as Duration[],
      suffix: "s",
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
  Maximum weight added for a ${params.duration} second hang on a ${params.edgeSize}mm edge.

  Use your ${getDominantSideDescription(params.dominantSide)} hand.

  ${getGripTypeDescription(params.gripType)}.
  
  Take at least a 5 minute rest between attempts.
  
  Record total weight, so if you weigh 70kg and you removed 20kg, record 50kg.
  `;
  }
};

export const repeatersClass: MeasureClassSpec = {
  className: "repeaters",
  params: [
    {
      name: "timing",
      values: ["7-3"] as Timing[],
      suffix: "",
    },
    {
      name: "gripType",
      values: ["half-crimp", "open", "full-crimp"] as GripType[],
      suffix: "",
    },
    {
      name: "edgeSize",
      values: ["20", "18", "10"] as EdgeSize[],
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
  generateDescription: (params: { timing: Timing; gripType: GripType; edgeSize: EdgeSize }) => {
    return `\
  Maximum duration for ${getTimingDescription(params.timing)} body-weight repeaters on a ${params.edgeSize}mm edge.
  
  ${getGripTypeDescription(params.gripType)}

  Record total test duration, so if you fail 4 seconds into the 5th hang, you would record 4 * (7 + 3) + 4 = 44 seconds.
  `;
  }
};

export const blockPullClass: MeasureClassSpec = {
  className: "block-pull",
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
      ] as GripType[],
      suffix: "",
    },
    {
      name: "edgeSize",
      values: ["20", "18", "10"] as EdgeSize[],
      suffix: "mm",
    },
    {
      name: "duration",
      values: ["7", "10"] as Duration[],
      suffix: "s",
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
Maximum weight added for a ${params.duration} second block pull on a ${params.edgeSize}mm edge using your ${getDominantSideDescription(params.dominantSide)}.

${getGripTypeDescription(params.gripType)}.

Take at least a 5 minute rest between attempts.
`
  }
};

export const minEdgeClass: MeasureClassSpec = {
  className: "min-edge",
  params: [
    {
      name: "gripType",
      values: ["half-crimp", "open", "full-crimp"] as GripType[],
      suffix: "",
    },
    {
      name: "duration",
      values: ["7", "10"] as Duration[],
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
  generateDescription: (params: { gripType: GripType; duration: Duration }) => {
    return `Minimum edge size for a ${params.duration} second hang.
    
    ${getGripTypeDescription(params.gripType)}
    
    Take at least a 5 minute rest between attempts.`;
  }
};

export const minEdgePullupsClass: MeasureClassSpec = {
  className: "min-edge-pullups",
  params: [
    {
      name: "gripType",
      values: ["half-crimp", "open", "full-crimp"] as GripType[],
      suffix: "",
    },
    {
      name: "reps",
      values: ["1", "2", "5"] as Reps[],
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
  generateDescription: (params: { gripType: GripType; reps: Reps }) => {
    return `Minimum edge size on which you can do${params.reps} pull-ups.
    
    ${getGripTypeDescription(params.gripType)}

    You must control the descent of each rep, so if you jump off at the end, do not count the attempt.

    Take at least a 5 minute rest between attempts.
    `;
  }
};

export const continuousHangClass: MeasureClassSpec = {
  className: "continuous-hang",
  params: [
    {
      name: "gripType",
      values: ["half-crimp", "open", "full-crimp"] as GripType[],
      suffix: "",
    },
    {
      name: "edgeSize",
      values: ["20", "18", "10"] as EdgeSize[],
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
  generateDescription: (params: { gripType: GripType; edgeSize: EdgeSize }) => {
    return `\
    Maximum hang time on a ${params.edgeSize}mm edge.

    ${getGripTypeDescription(params.gripType)}
    `;
  }
};
