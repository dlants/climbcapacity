import { MeasureClassSpec } from "./index.js";
import {
  DOMINANT_SIDES,
  ParamValue,
  POWER_MOVEMENT,
  UNILATERAL_POWER_MOVEMENT
} from "./params.js";

export type PowerMovement = (typeof POWER_MOVEMENT)[number];
export type UnilateralPowerMovement = (typeof UNILATERAL_POWER_MOVEMENT)[number];

const powerMovementDesc: { [key in PowerMovement]: string } = {
  "verticaljump": "Vertical jump. Start by standing with both feet on the ground, measure the highest point you can reach with one hand.",
  "horizontaljump": "Horizontal jump. Start by standing with both feet squared and touching the ground. Measure the distance to where the closest foot strikes the ground.",
};

const unilateralPowerMovementDesc: { [key in UnilateralPowerMovement]: string } = {
  "verticaljump": "Single-leg vertical jump. Start by standing with one foot on the ground, measure the highest point you can reach with one hand.",
  "horizontaljump": "Single-leg horizontal jump. Start by standing on one foot. Jump and land on that same foot. Measure the distance to where it first strikes the ground.",
  "campusreach": `Start in a deadhang position on a 1" campus rung. Do an explosive pullup and slap with one hand. Measure the distance between the top of the campus rung and thehighest point you can reach.`,
};

export const powerClass: MeasureClassSpec = {
  className: "power",
  params: [
    {
      name: "powerMovement",
      values: POWER_MOVEMENT,
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["m", "cm", "inch"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "m", value: 1 },
    maxValue: { unit: "m", value: 2 },
  },
  generateDescription: (params: { powerMovement: PowerMovement }) => {
    return `Your maximum distance for the following movement:
    
    ${powerMovementDesc[params.powerMovement]}`;
  }
};

export const unilateralPowerClass: MeasureClassSpec = {
  className: "power-unilateral",
  params: [
    {
      name: "unilateralPowerMovement",
      values: UNILATERAL_POWER_MOVEMENT,
      suffix: "",
    },
    {
      name: "dominantSide",
      values: DOMINANT_SIDES,
      suffix: "",
    },
  ],
  measureType: "input",
  units: ["m", "cm", "inch"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "m", value: 0 },
    maxValue: { unit: "m", value: 2 },
  },
  generateDescription: (params: { unilateralPowerMovement: UnilateralPowerMovement, dominantSide: ParamValue<"dominantSide"> }) => {
    return `Your maximum distance using your ${params.dominantSide} side:
    
    ${unilateralPowerMovementDesc[params.unilateralPowerMovement]}
    `
  }
};
