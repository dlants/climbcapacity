import { MeasureId, MeasureSpec } from "./index.js";
import { DOMINANT_SIDE, DominantSide } from "./movement.js";

export const GRIPS = [
  "back-3-crimp",
  "back-3-drag",
  "front-3-crimp",
  "front-3-drag",
  "full-crimp",
  "half-crimp",
  "mono-index-crimp",
  "mono-index-drag",
  "mono-middle-crimp",
  "mono-middle-drag",
  "mono-pinky-crimp",
  "mono-pinky-drag",
  "mono-ring-crimp",
  "mono-ring-drag",
  "open",
  "pinch",
] as const;
export type Grip = (typeof GRIPS)[number];

export const MEASURES: MeasureSpec[] = [];

export const MAXHANG_GRIP_TYPE = [
  "back-3-crimp",
  "back-3-drag",
  "front-3-crimp",
  "front-3-drag",
  "full-crimp",
  "half-crimp",
  "open",
] as const;
export type MaxHangGripType = (typeof MAXHANG_GRIP_TYPE)[number];
export const MAXHANG_EDGE_SIZE = [10, 18, 20] as const;
export type MaxHangEdgeSize = (typeof MAXHANG_EDGE_SIZE)[number];
export const MAXHANG_DURATION = [7, 10] as const;
export type MaxHangDuration = (typeof MAXHANG_DURATION)[number];

export function generateMaxhangId({
  edgeSize,
  duration,
  gripType,
}: {
  edgeSize: MaxHangEdgeSize;
  duration: MaxHangDuration;
  gripType: MaxHangGripType;
}): MeasureId {
  return `maxhang:${edgeSize}mm:${duration}s:${gripType}` as MeasureId;
}

export function parseMaxhangId(measureId: MeasureId) {
  const match = measureId.match(/^maxhang:(\d+)mm:(\d+)s:(.*)$/);
  if (!match) {
    throw new Error("Invalid measureId format");
  }
  const [, edgeSize, duration, gripType] = match;
  return {
    edgeSize: parseInt(edgeSize, 10) as MaxHangEdgeSize,
    duration: parseInt(duration, 10) as MaxHangDuration,
    gripType: gripType as MaxHangGripType,
  };
}

for (const edgeSize of MAXHANG_EDGE_SIZE) {
  for (const duration of MAXHANG_DURATION) {
    for (const gripType of MAXHANG_GRIP_TYPE) {
      const id = generateMaxhangId({ edgeSize, duration, gripType });
      MEASURES.push({
        id,
        name: `MaxHang: ${edgeSize}mm, ${duration}s, ${gripType} grip`,
        includeTrainingMeasure: true,
        description: `\
Warm up thoroughly.

Find a ${edgeSize}mm edge. Using a ${gripType} grip, hang for ${duration}s. If the hang is successful, increase weight and try again after at least a 5m rest.

If you cannot hang your bodyweight, use a pulley system to remove weight.

Record the maximum successful hang weight, including your bodyweight.

So for example, if you weigh 70kg, and you removed 20kg, you would record 50kg.
If you weigh 70kg, and you added 30kg, you'd record 100kg.
`,
        units: ["kg", "lb"],
        initialFilter: {
          type: "minmax",
          minValue: { unit: "kg", value: 10 },
          maxValue: { unit: "kg", value: 100 },
        },
      });
    }
  }
}

export function generateUnilateralMaxhangId({
  edgeSize,
  duration,
  gripType,
  dominantSide,
}: {
  edgeSize: MaxHangEdgeSize;
  duration: MaxHangDuration;
  gripType: MaxHangGripType;
  dominantSide: DominantSide;
}): MeasureId {
  return `maxhang-unilateral:${edgeSize}mm:${duration}s:${gripType}:${dominantSide}` as MeasureId;
}

export function parseUnilateralMaxhangId(measureId: MeasureId) {
  const match = measureId.match(
    /^maxhang-unilateral:(\d+)mm:(\d+)s:(.*):(.*)$/,
  );
  if (!match) {
    throw new Error("Invalid measureId format");
  }
  const [, edgeSize, duration, gripType, dominantSide] = match;
  return {
    edgeSize: parseInt(edgeSize, 10) as MaxHangEdgeSize,
    duration: parseInt(duration, 10) as MaxHangDuration,
    gripType: gripType as MaxHangGripType,
    dominantSide: dominantSide as DominantSide,
  };
}

for (const edgeSize of MAXHANG_EDGE_SIZE) {
  for (const duration of MAXHANG_DURATION) {
    for (const gripType of MAXHANG_GRIP_TYPE) {
      for (const dominantSide of DOMINANT_SIDE) {
        const id = generateUnilateralMaxhangId({
          edgeSize,
          duration,
          gripType,
          dominantSide,
        });
        MEASURES.push({
          id,
          name: `Unilateral MaxHang: ${edgeSize}mm, ${duration}s, ${gripType} grip, ${dominantSide} hand`,
          includeTrainingMeasure: true,
          description: `\
Warm up thoroughly.

Find a ${edgeSize}mm edge. Using a ${gripType} grip with your ${dominantSide} hand, hang for ${duration}s. If the hang is successful, increase weight and try again after at least a 5m rest.

If you cannot hang your bodyweight, use a pulley system to remove weight.

Record the maximum successful hang weight, including your bodyweight.

So for example, if you weigh 70kg, and you removed 20kg, you would record 50kg.
If you weigh 70kg, and you added 30kg, you'd record 100kg.
`,
          units: ["kg", "lb"],
          initialFilter: {
            type: "minmax",
            minValue: { unit: "kg", value: 10 },
            maxValue: { unit: "kg", value: 100 },
          },
        });
      }
    }
  }
}

export const REPEATERS_GRIPS = [
  "back-3-crimp",
  "back-3-drag",
  "front-3-crimp",
  "front-3-drag",
  "full-crimp",
  "half-crimp",
  "open",
];
export type RepeatersGrip = (typeof REPEATERS_GRIPS)[number];

export function generateRepeaterId({
  edgeSize,
  gripType,
}: {
  edgeSize: MaxHangEdgeSize;
  gripType: RepeatersGrip;
}): MeasureId {
  return `7-3repeaters:${edgeSize}mm:${gripType}` as MeasureId;
}

export function parseRepeaterId(measureId: MeasureId) {
  const match = measureId.match(/^7-3repeaters:(\d+)mm:(.*)$/);
  if (!match) {
    throw new Error("Invalid repeater measureId format");
  }
  const [, edgeSize, gripType] = match;
  return {
    edgeSize: parseInt(edgeSize, 10) as MaxHangEdgeSize,
    gripType: gripType as RepeatersGrip,
  };
}

for (const edgeSize of MAXHANG_EDGE_SIZE) {
  for (const gripType of REPEATERS_GRIPS) {
    const measureId = generateRepeaterId({ edgeSize, gripType });
    MEASURES.push({
      id: measureId,
      includeTrainingMeasure: true,
      name: `7:3 repeaters on ${edgeSize}mm ${gripType}(bodyweight)`,
      description: ``,
      units: ["second"],
      initialFilter: {
        type: "minmax",
        minValue: { unit: "second", value: 10 },
        maxValue: { unit: "second", value: 200 },
      },
    });
  }
}

export function generateBlockPullId({
  edgeSize,
  duration,
  gripType,
  dominantSide,
}: {
  edgeSize: number;
  duration: number;
  gripType: Grip;
  dominantSide: (typeof DOMINANT_SIDE)[number];
}): MeasureId {
  return `blockpull:${edgeSize}mm:${duration}s:${gripType}:${dominantSide}` as MeasureId;
}

export function parseBlockPullId(measureId: MeasureId) {
  const match = measureId.match(/^blockpull:(\d+)mm:(\d+)s:(.*):(.*)$/);
  if (!match) {
    throw new Error("Invalid block pull measureId format");
  }
  const [, edgeSize, duration, gripType, dominantSide] = match;
  return {
    edgeSize: parseInt(edgeSize, 10) as MaxHangEdgeSize,
    duration: parseInt(duration, 10) as MaxHangDuration,
    gripType: gripType as Grip,
    dominantSide: dominantSide as DominantSide,
  };
}

for (const edgeSize of MAXHANG_EDGE_SIZE) {
  for (const duration of MAXHANG_DURATION) {
    for (const gripType of GRIPS) {
      for (const dominantSide of DOMINANT_SIDE) {
        const id = generateBlockPullId({
          edgeSize,
          duration,
          gripType,
          dominantSide,
        });
        MEASURES.push({
          id,
          includeTrainingMeasure: true,
          name: `Block Pull: ${edgeSize}mm, ${duration}s, ${gripType} grip on the ${dominantSide} side`,
          description: `\
Warm up thoroughly.

Find a ${edgeSize}mm edge on a block pulling device, like a tension block. Using a ${gripType} grip with your ${dominantSide} hand, pick it up for ${duration}s. If successful, increase weight and try again after at least a 5m rest.

Record the maximum successful weight.
`,
          units: ["kg", "lb"],
          initialFilter: {
            type: "minmax",
            minValue: { unit: "kg", value: 10 },
            maxValue: { unit: "kg", value: 100 },
          },
        });
      }
    }
  }
}

export function generateMinEdgeHangId({
  gripType,
  duration,
}: {
  duration: MaxHangDuration;
  gripType: MinEdgeGrip;
}): MeasureId {
  return `min-edge:${duration}s:${gripType}` as MeasureId;
}

export function parseMinEdgeHangId(measureId: MeasureId) {
  const match = measureId.match(/^min-edge:(\d+)s:(.*)$/);
  if (!match) {
    throw new Error("Invalid min edge hang measureId format");
  }
  const [, duration, gripType] = match;
  return {
    duration: parseInt(duration, 10) as MaxHangDuration,
    gripType: gripType as MinEdgeGrip,
  };
}

export const MIN_EDGE_GRIPS = [
  "back-3-crimp",
  "back-3-drag",
  "front-3-crimp",
  "front-3-drag",
  "full-crimp",
  "half-crimp",
  "open",
] as const;
export type MinEdgeGrip = (typeof MIN_EDGE_GRIPS)[number];

for (const duration of MAXHANG_DURATION) {
  for (const gripType of MIN_EDGE_GRIPS) {
    MEASURES.push({
      id: generateMinEdgeHangId({ duration, gripType }),
      includeTrainingMeasure: true,
      name: `Min Edge Hang: ${duration}s, ${gripType} grip`,
      description: `\
Warm up thoroughly.

Find the smallest edge you can hang your bodyweight for ${duration}s using a ${gripType}.
`,
      units: ["mm"],
      initialFilter: {
        type: "minmax",
        minValue: { unit: "mm", value: 4 },
        maxValue: { unit: "mm", value: 20 },
      },
    });
  }
}

export const MINEDGE_PULLUP_GRIPS = [
  "full-crimp",
  "half-crimp",
  "open",
  "front-3-drag",
] as const;
export type MinEdgePullupGrip = (typeof MINEDGE_PULLUP_GRIPS)[number];

export const generateMinEdgePullupId = ({
  gripType,
}: {
  gripType: MinEdgePullupGrip;
}): MeasureId => {
  return `min-edge-pullups:2rm:${gripType}` as MeasureId;
};

export function parseMinEdgePullupId(measureId: MeasureId) {
  const match = measureId.match(/^min-edge-pullups:2rm:(.*)$/);
  if (!match) {
    throw new Error("Invalid min edge pullup measureId format");
  }
  const [, gripType] = match;
  return { gripType: gripType as MinEdgePullupGrip };
}

for (const gripType of MINEDGE_PULLUP_GRIPS) {
  MEASURES.push({
    id: generateMinEdgePullupId({ gripType }),
    includeTrainingMeasure: true,
    name: `Smallest edge you can do 2 pullups on using ${gripType} grip.`,
    description: `Using a ${gripType} grip, find the smallest edge you can do 2 pullups on.

      If you need to reset your grip at the bottom that's ok, but you must control the descent. Avoid "jumping off" at the end of the pullup.`,
    units: ["mm"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "mm", value: 3 },
      maxValue: { unit: "mm", value: 20 },
    },
  });
}

export const CONTINUOUS_HANG = [
  "full-crimp",
  "half-crimp",
  "open",
  "front-3-drag",
] as const;
export type ContinuousHangGrip = (typeof CONTINUOUS_HANG)[number];

export const generateContinuousHangId = ({
  gripType,
  edgeSize,
}: {
  gripType: ContinuousHangGrip;
  edgeSize: MaxHangEdgeSize;
}): MeasureId => {
  return `continuoushang:${gripType}:${edgeSize}mm` as MeasureId;
};

export function parseContinuousHangId(measureId: MeasureId) {
  const match = measureId.match(/^continuoushang:(.*):(\d+)mm$/);
  if (!match) {
    throw new Error("Invalid continuous hang measureId format");
  }
  const [, gripType, edgeSize] = match;
  return {
    gripType: gripType as ContinuousHangGrip,
    edgeSize: parseInt(edgeSize, 10) as MaxHangEdgeSize,
  };
}

for (const gripType of CONTINUOUS_HANG) {
  for (const edgeSize of MAXHANG_EDGE_SIZE) {
    MEASURES.push({
      id: generateContinuousHangId({ gripType, edgeSize }),
      includeTrainingMeasure: true,
      name: `Longest continuous hang using ${gripType} grip.`,
      description: `Using a ${gripType} grip, hang for as long as possible without releasing.`,
      units: ["second"],
      initialFilter: {
        type: "minmax",
        minValue: { unit: "second", value: 10 },
        maxValue: { unit: "second", value: 600 },
      },
    });
  }
}
