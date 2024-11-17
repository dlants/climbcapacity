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
const TIME_TRAINING_OPEN: MeasureSpec = {
  id: `time-training:open` as MeasureId,
  name: `Time training open grip`,
  description: ``,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    measureId: `time-training:open` as MeasureId,
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 5 },
  },
};
MEASURES.push(TIME_TRAINING_OPEN);

const TIME_TRAINING_HALF: MeasureSpec = {
  id: `time-training:half-crimp` as MeasureId,
  name: `Time training half-crimp grip`,
  description: ``,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    measureId: `time-training:half-crimp` as MeasureId,
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 5 },
  },
};
MEASURES.push(TIME_TRAINING_HALF);

const TIME_TRAINING_FULL: MeasureSpec = {
  id: `time-training:full-crimp` as MeasureId,
  name: `Time training full-crimp grip`,
  description: ``,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    measureId: `time-training:full-crimp` as MeasureId,
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 5 },
  },
};
MEASURES.push(TIME_TRAINING_FULL);

const TIME_TRAINING_PINCH: MeasureSpec = {
  id: `time-training:pinch` as MeasureId,
  name: `Time training pinch grip`,
  description: ``,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    measureId: `time-training:pinch` as MeasureId,
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 5 },
  },
};
MEASURES.push(TIME_TRAINING_PINCH);

const MEASURE_MAP: { [grip in Grip]: MeasureId } = {
  "back-3-crimp": TIME_TRAINING_HALF.id,
  "back-3-drag": TIME_TRAINING_OPEN.id,
  "front-3-crimp": TIME_TRAINING_HALF.id,
  "front-3-drag": TIME_TRAINING_OPEN.id,
  "full-crimp": TIME_TRAINING_FULL.id,
  "half-crimp": TIME_TRAINING_HALF.id,
  "mono-index-crimp": TIME_TRAINING_FULL.id,
  "mono-index-drag": TIME_TRAINING_OPEN.id,
  "mono-middle-crimp": TIME_TRAINING_HALF.id,
  "mono-middle-drag": TIME_TRAINING_OPEN.id,
  "mono-pinky-crimp": TIME_TRAINING_HALF.id,
  "mono-pinky-drag": TIME_TRAINING_OPEN.id,
  "mono-ring-crimp": TIME_TRAINING_HALF.id,
  "mono-ring-drag": TIME_TRAINING_OPEN.id,
  open: TIME_TRAINING_OPEN.id,
  pinch: TIME_TRAINING_PINCH.id,
};

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
export const MAXHANG_EDGE_SIZE = [18, 20] as const;
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
        trainingMeasureId: MEASURE_MAP[gripType],
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
          measureId: id,
          minValue: { unit: "kg", value: 10 },
          maxValue: { unit: "kg", value: 100 },
        },
      });
    }
  }
}

const TIME_TRAINING_REPEATERS_OPEN: MeasureSpec = {
  id: `time-training:repeaters:open` as MeasureId,
  name: `Time training repeaters in open grip`,
  description: ``,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    measureId: `time-training:repeaters:open` as MeasureId,
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 5 },
  },
};
MEASURES.push(TIME_TRAINING_REPEATERS_OPEN);

const TIME_TRAINING_REPEATERS_HALF: MeasureSpec = {
  id: `time-training:repeaters:half-crimp` as MeasureId,
  name: `Time training repeaters in half-crimp grip`,
  description: ``,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    measureId: `time-training:repeaters:half-crimp` as MeasureId,
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 5 },
  },
};
MEASURES.push(TIME_TRAINING_REPEATERS_HALF);

const TIME_TRAINING_REPEATERS_FULL: MeasureSpec = {
  id: `time-training:repeaters:full-crimp` as MeasureId,
  name: `Time training repeaters in full-crimp grip`,
  description: ``,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    measureId: `time-training:repeaters:full-crimp` as MeasureId,
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 5 },
  },
};
MEASURES.push(TIME_TRAINING_REPEATERS_FULL);

const REPEATERS_GRIPS = [
  "back-3-crimp",
  "back-3-drag",
  "front-3-crimp",
  "front-3-drag",
  "full-crimp",
  "half-crimp",
  "open",
];
type RepeatersGrip = (typeof REPEATERS_GRIPS)[number];

const REPEATER_MAP: { [grip in RepeatersGrip]: MeasureId } = {
  "back-3-crimp": TIME_TRAINING_REPEATERS_HALF.id,
  "back-3-drag": TIME_TRAINING_REPEATERS_OPEN.id,
  "front-3-crimp": TIME_TRAINING_REPEATERS_HALF.id,
  "front-3-drag": TIME_TRAINING_REPEATERS_OPEN.id,
  "full-crimp": TIME_TRAINING_REPEATERS_FULL.id,
  "half-crimp": TIME_TRAINING_REPEATERS_HALF.id,
  open: TIME_TRAINING_REPEATERS_OPEN.id,
};

for (const edgeSize of [18, 20]) {
  for (const gripType of REPEATERS_GRIPS) {
    MEASURES.push({
      id: `duration:7-3repeaters:${edgeSize}mm:${gripType}` as MeasureId,
      trainingMeasureId: REPEATER_MAP[gripType],
      name: `7:3 repeaters on ${edgeSize}mm ${gripType}(bodyweight)`,
      description: ``,
      units: ["second"],
      initialFilter: {
        type: "minmax",
        measureId:
          `duration:7-3repeaters:${edgeSize}mm:${gripType}` as MeasureId,
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
          trainingMeasureId: MEASURE_MAP[gripType],
          name: `Block Pull: ${edgeSize}mm, ${duration}s, ${gripType} grip on the ${dominantSide} side`,
          description: `\
Warm up thoroughly.

Find a ${edgeSize}mm edge on a block pulling device, like a tension block. Using a ${gripType} grip with your ${dominantSide} hand, pick it up for ${duration}s. If successful, increase weight and try again after at least a 5m rest.

Record the maximum successful weight.
`,
          units: ["kg", "lb"],
          initialFilter: {
            type: "minmax",
            measureId: id,
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
  return `min-edge-hang:${duration}s:${gripType}` as MeasureId;
}

export function parseMinEdgeHangId(measureId: MeasureId) {
  const match = measureId.match(/^min-edge-hang:(\d+)s:(.*)$/);
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
      trainingMeasureId: MEASURE_MAP[gripType],
      name: `Min Edge Hang: ${duration}s, ${gripType} grip`,
      description: `\
Warm up thoroughly.

Find the smallest edge you can hang your bodyweight for ${duration}s using a ${gripType}.
`,
      units: ["mm"],
      initialFilter: {
        type: "minmax",
        measureId: generateMinEdgeHangId({ duration, gripType }),
        minValue: { unit: "mm", value: 4 },
        maxValue: { unit: "mm", value: 20 },
      },
    });
  }
}
for (const gripType of [
  "full-crimp",
  "half-crimp",
  "open",
  "front-3-drag",
] as const) {
  MEASURES.push({
    id: `min-edge-pullups:2rm:${gripType}` as MeasureId,
    trainingMeasureId: MEASURE_MAP[gripType],
    name: `Smallest edge you can do 2 pullups on using ${gripType} grip.`,
    description: `Using a ${gripType} grip, find the smallest edge you can do 2 pullups on.

      If you need to reset your grip at the bottom that's ok, but you must control the descent. Avoid "jumping off" at the end of the pullup.`,
    units: ["mm"],
    initialFilter: {
      type: "minmax",
      measureId: `min-edge-pullups:2rm:${gripType}` as MeasureId,
      minValue: { unit: "mm", value: 4 },
      maxValue: { unit: "mm", value: 20 },
    },
  });
}
