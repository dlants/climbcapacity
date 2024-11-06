import { MeasureId, MeasureSpec } from "../units.js";

export const GRIPS = [
  "half-crimp",
  "full-crimp",
  "open",
  "front-3-crimp",
  "back-3-crimp",
  "front-3-drag",
  "back-3-drag",
  "mono-index-crimp",
  "mono-index-drag",
  "mono-middle-crimp",
  "mono-middle-drag",
  "mono-ring-crimp",
  "mono-ring-drag",
  "mono-pinky-crimp",
  "mono-pinky-drag",
] as const;
export type Grip = (typeof GRIPS)[number];

export type MaxHangMeasureType = {
  type: "maxhang";
  edgeSize: number;
  duration: number;
  gripType: Grip;
};

export function synthesizeMaxHangMeasure(
  measureType: MaxHangMeasureType,
): MeasureSpec {
  const { edgeSize, duration, gripType } = measureType;

  return {
    id: `maxhang:${edgeSize}:${duration}:${gripType}` as MeasureId,
    name: `MaxHang: ${edgeSize}mm, ${duration}s, ${gripType} grip`,
    description: `\
Warm up thoroughly.

Find a ${edgeSize}mm edge. Using a ${gripType} grip, hang for ${duration}s. If the hang is successful, increase weight and try again after at least a 5m rest.

If you cannot hang your bodyweight, use a pulley system to remove weight.

Record the maximum successful hang weight, including your bodyweight.

So for example, if you weigh 70kg, and you removed 20kg, you would record 50kg.
If you weigh 70kg, and you added 30kg, you'd record 100kg.
`,
    units: ["kg", "lb"],
  };
}

export type BlockPullMeasureType = {
  type: "blockpull";
  edgeSize: number;
  duration: number;
  gripType: Grip;
};

export function synthesizeBlockPullMeasure(
  measureType: BlockPullMeasureType,
): MeasureSpec {
  const { edgeSize, duration, gripType } = measureType;

  return {
    id: `blockpull:${edgeSize}:${duration}:${gripType}` as MeasureId,
    name: `Block Pull: ${edgeSize}mm, ${duration}s, ${gripType} grip`,
    description: `\
Warm up thoroughly.

Find a ${edgeSize}mm edge on a block pulling device, like a tension block. Using a ${gripType} grip, pick it up for ${duration}s. If successful, increase weight and try again after at least a 5m rest.

Record the maximum successful weight.
`,
    units: ["kg", "lb"],
  };
}

export type MinEdgeMeasureType = {
  type: "min-edge";
  duration: number;
  gripType: Grip;
};

export function synthesizeMinEdgeMeasure(
  measureType: MinEdgeMeasureType,
): MeasureSpec {
  const { duration, gripType } = measureType;
  return {
    id: `min-edge-hang:${duration}:${gripType}` as MeasureId,
    name: `Min Edge Hang: ${duration}s, ${gripType} grip`,
    description: `\
Warm up thoroughly.

Find the smallest edge you can hang your bodyweight for ${duration}s using a ${gripType}.
`,
    units: ["mm"],
  };
}

export function synthesizeDurationMeasure({
  movement,
  gripType,
  edgeSize,
}: {
  movement: "7-3repeaters";
  gripType: Grip;
  edgeSize: number;
}): MeasureSpec {
  return {
    id: `duration:${movement}:${edgeSize}:${gripType}` as MeasureId,
    name: `(bodyweight)`,
    description: ``,
    units: ["second"],
  };
}
