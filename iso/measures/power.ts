import { MeasureClassSpec, MeasureSpec } from "./index.js";

export const powerClass: MeasureClassSpec = {
  className: "power",
  params: [
    {
      name: "movement",
      values: ["verticaljump", "horizontaljump"],
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
};

export const unilateralPowerClass: MeasureClassSpec = {
  className: "power-unilateral",
  params: [
    {
      name: "movement",
      values: ["verticaljump", "horizontaljump", "campusreach"],
      suffix: "",
    },
    {
      name: "dominantSide",
      values: ["dominant", "nondominant"],
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
};
