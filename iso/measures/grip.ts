export const GRIPS = {
  "half-crimp": true,
  "full-crimp": true,
  open: true,
} as const;

export type Grip = keyof typeof GRIPS;
export const GRIPS_ARR = Object.keys(GRIPS) as Grip[];

export type GripMeasure = {

}
