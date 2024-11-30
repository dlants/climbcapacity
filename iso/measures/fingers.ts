import { MeasureClassSpec, MeasureSpec } from "./index.js";
import {
  ALL_GRIP_TYPES,
  BASIC_GRIP_TYPES,
  DOMINANT_SIDES,
  DURATIONS,
  EDGE_SIZES,
  EXTENDED_GRIP_TYPES,
  ParamValue,
  REPS,
  TIMINGS,
} from "./params.js";

type GripType = ParamValue<"allGripType">;
type EdgeSize = ParamValue<"edgeSize">;
type Duration = ParamValue<"duration">;
type DominantSide = ParamValue<"dominantSide">;
type Timing = ParamValue<"timing">;
type Reps = ParamValue<"repMax">;

const getGripTypeDescription = (gripType: GripType): string => {
  const descriptions: Record<GripType, string> = {
    "half-crimp": `\
use a half crimp grip (90° at index, middle and ring pip joints).
consider the test a technical failure if your hand starts to open up.`,
    open: `\
use an open hand grip.`,
    "full-crimp": `\
use a full crimp grip (closed position with thumb wrap).
consider the test a technical failure if your hand starts to open up.`,
    "back-3-crimp": `\
use a back three fingers half-crimp grip (90° at middle and ring pip joints).
consider the test a technical failure if your hand starts to open up.`,
    "back-3-drag": `\
use a back three fingers drag grip.`,
    "front-3-crimp": `\
use a front three fingers half-crimp grip (90° at index, middle and ring pip joints).
consider the test a technical failure if your hand starts to open up.`,
    "front-3-drag": `\
use a front three finger drag grip.`,
    "mono-index-crimp": `\
use a mono index half-crimp grip (90° at pip joint).
consider the test a technical failure if your hand starts to open up.`,
    "mono-index-drag": `\
use a mono index drag.`,
    "mono-middle-crimp": `\
use a mono middle crimp grip (90° at pip joint).
consider the test a technical failure if your hand starts to open up.`,
    "mono-middle-drag": `\
use a mono middle drag.`,
    "mono-ring-crimp": `\
use a mono ring crimp grip (90° at pip joint).
consider the test a technical failure if your hand starts to open up.`,
    "mono-ring-drag": `\
use a mono ring drag.`,
    "mono-pinky-crimp": `\
use a mono pinky crimp grip (90° at pip joint).
consider the test a technical failure if your hand starts to open up.`,
    "mono-pinky-drag": `\
use a mono pinky drag.`,
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
    "7-3": "7 seconds hang, 3 seconds rest",
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
      name: "extendedGripType",
      values: EXTENDED_GRIP_TYPES,
      suffix: "",
    },
    {
      name: "edgeSize",
      values: EDGE_SIZES,
      suffix: "mm",
    },
    {
      name: "duration",
      values: DURATIONS,
      suffix: "s",
    },
  ],
  units: ["kg", "lb"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "kg", value: 35 },
    maxValue: { unit: "kg", value: 100 },
  },
  generateDescription: (params: {
    gripType: GripType;
    edgeSize: EdgeSize;
    duration: Duration;
  }) => {
    return `\
Maximum weight added for a ${getDurationDescription(params.duration)} on a ${getEdgeSizeDescription(params.edgeSize)}.

${getGripTypeDescription(params.gripType)}

Take at least a 5 minute rest between attempts.

Record total weight, so if you weigh 70kg and you added 30kg, record 100kg.`;
  },
};

export const unilateralMaxhangClass: MeasureClassSpec = {
  className: "maxhang-unilateral",
  params: [
    {
      name: "extendedGripType",
      values: EXTENDED_GRIP_TYPES,
      suffix: "",
    },
    {
      name: "edgeSize",
      values: EDGE_SIZES,
      suffix: "mm",
    },
    {
      name: "duration",
      values: DURATIONS,
      suffix: "s",
    },
    {
      name: "dominantSide",
      values: DOMINANT_SIDES,
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
  generateDescription: (params: {
    gripType: GripType;
    edgeSize: EdgeSize;
    duration: Duration;
    dominantSide: DominantSide;
  }) => {
    return `Maximum weight added for a ${params.duration} second hang on a ${params.edgeSize}mm edge.

Use your ${getDominantSideDescription(params.dominantSide)}.

${getGripTypeDescription(params.gripType)}

Take at least a 5 minute rest between attempts.

Record total weight, so if you weigh 70kg and you removed 20kg, record 50kg.`;
  },
};

export const repeatersClass: MeasureClassSpec = {
  className: "repeaters",
  params: [
    {
      name: "timing",
      values: TIMINGS,
      suffix: "",
    },
    {
      name: "basicGripType",
      values: BASIC_GRIP_TYPES,
      suffix: "",
    },
    {
      name: "edgeSize",
      values: EDGE_SIZES,
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
  generateDescription: (params: {
    timing: Timing;
    gripType: GripType;
    edgeSize: EdgeSize;
  }) => {
    return `\
Maximum duration for ${getTimingDescription(params.timing)} body-weight repeaters on a ${params.edgeSize}mm edge.

${getGripTypeDescription(params.gripType)}

Record total test duration, so if you fail 4 seconds into the 5th hang, you would record 4 * (7 + 3) + 4 = 44 seconds.`;
  },
};

export const blockPullClass: MeasureClassSpec = {
  className: "block-pull",
  params: [
    {
      name: "allGripType",
      values: ALL_GRIP_TYPES,
      suffix: "",
    },
    {
      name: "edgeSize",
      values: EDGE_SIZES,
      suffix: "mm",
    },
    {
      name: "duration",
      values: DURATIONS,
      suffix: "s",
    },
    {
      name: "dominantSide",
      values: DOMINANT_SIDES,
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
  generateDescription: (params: {
    allGripType: ParamValue<"allGripType">;
    edgeSize: EdgeSize;
    duration: Duration;
    dominantSide: DominantSide;
  }) => {
    return `\
Maximum weight added for a ${params.duration} second block pull on a ${params.edgeSize}mm edge using your ${getDominantSideDescription(params.dominantSide)}.

${getGripTypeDescription(params.allGripType)}.

Take at least a 5 minute rest between attempts.`;
  },
};

export const minEdgeClass: MeasureClassSpec = {
  className: "min-edge",
  params: [
    {
      name: "basicGripType",
      values: BASIC_GRIP_TYPES,
      suffix: "",
    },
    {
      name: "duration",
      values: DURATIONS,
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
  },
};

export const minEdgePullupsClass: MeasureClassSpec = {
  className: "min-edge-pullups",
  params: [
    {
      name: "basicGripType",
      values: BASIC_GRIP_TYPES,
      suffix: "",
    },
    {
      name: "repMax",
      values: REPS,
      suffix: "rm",
    },
  ],
  measureType: "input",
  units: ["mm"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "mm", value: 5 },
    maxValue: { unit: "mm", value: 25 },
  },
  generateDescription: (params: { basicGripType: ParamValue<"basicGripType">; repMax: Reps }) => {
    return `Minimum edge size on which you can do ${params.repMax} pull-ups.

${getGripTypeDescription(params.basicGripType)}

You must control the descent of each rep, so if you jump off at the end, do not count the attempt.

Take at least a 5 minute rest between attempts.`;
  },
};

export const continuousHangClass: MeasureClassSpec = {
  className: "continuous-hang",
  params: [
    {
      name: "basicGripType",
      values: BASIC_GRIP_TYPES,
      suffix: "",
    },
    {
      name: "edgeSize",
      values: EDGE_SIZES,
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
  generateDescription: (params: { basicGripType: ParamValue<"basicGripType">; edgeSize: EdgeSize }) => {
    return `\
Maximum hang time on a ${params.edgeSize}mm edge.

${getGripTypeDescription(params.basicGripType)}.`;
  },
};
