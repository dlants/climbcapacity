import { MeasureId, MeasureSpec } from "./index.js";
import { DOMINANT_SIDE, DominantSide } from "./movement.js";

export const POWER_MOVEMENT = ["verticaljump", "horizontaljump"] as const;
export type PowerMovement = (typeof POWER_MOVEMENT)[number];

export const MEASURES: MeasureSpec[] = [];

for (const movement of POWER_MOVEMENT) {
  MEASURES.push(createMeasureSpec(movement));
}

export function generatePowerMeasureId(movement: PowerMovement): MeasureId {
  return `power:${movement}` as MeasureId;
}

export function parsePowerMeasureId(measureId: MeasureId): PowerMovement {
  const prefix = "power:";
  if (measureId.startsWith(prefix)) {
    const movement = measureId.substring(prefix.length) as PowerMovement;
    if (POWER_MOVEMENT.includes(movement)) {
      return movement;
    }
  }
  throw new Error(`Invalid Power MeasureId: ${measureId}`);
}

function createMeasureSpec(movement: PowerMovement): MeasureSpec {
  return {
    id: generatePowerMeasureId(movement),
    includeTrainingMeasure: true,
    name: `Maximum distance`,
    description: ``,
    units: ["m", "cm", "inch"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "m", value: 1 },
      maxValue: { unit: "m", value: 2 },
    },
  };
}

export const UNILATERAL_POWER_MOVEMENT = [
  "verticaljump",
  "horizontaljump",
  "campusreach",
] as const;

export type UnilateralPowerMovement =
  (typeof UNILATERAL_POWER_MOVEMENT)[number];

export function generateUnilateralPowerMeasureId(
  movement: (typeof UNILATERAL_POWER_MOVEMENT)[number],
  dominantSide: (typeof DOMINANT_SIDE)[number],
): MeasureId {
  return `power-unilateral:${movement}:${dominantSide}` as MeasureId;
}

export function parseUnilateralPowerMeasureId(measureId: MeasureId): {
  movement: (typeof UNILATERAL_POWER_MOVEMENT)[number];
  dominantSide: (typeof DOMINANT_SIDE)[number];
} {
  const prefix = "power-unilateral:";
  if (measureId.startsWith(prefix)) {
    const segments = measureId.substring(prefix.length).split(":");
    if (
      segments.length === 2 &&
      UNILATERAL_POWER_MOVEMENT.includes(
        segments[0] as UnilateralPowerMovement,
      ) &&
      DOMINANT_SIDE.includes(segments[1] as DominantSide)
    ) {
      return {
        movement: segments[0] as UnilateralPowerMovement,
        dominantSide: segments[1] as DominantSide,
      };
    }
  }
  throw new Error(`Invalid MeasureId: ${measureId}`);
}

function createUnilateralMeasureSpec(
  movement: (typeof UNILATERAL_POWER_MOVEMENT)[number],
  dominantSide: (typeof DOMINANT_SIDE)[number],
): MeasureSpec {
  return {
    id: generateUnilateralPowerMeasureId(movement, dominantSide),
    includeTrainingMeasure: true,
    name: `${movement} ${dominantSide}`,
    description: ``,
    units: ["m", "cm", "inch"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "m", value: 0 },
      maxValue: { unit: "m", value: 2 },
    },
  };
}

for (const movement of UNILATERAL_POWER_MOVEMENT) {
  for (const dominantSide of DOMINANT_SIDE) {
    MEASURES.push(createUnilateralMeasureSpec(movement, dominantSide));
  }
}
