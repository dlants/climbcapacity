// Grip Types
export const BASIC_GRIP_TYPES = [
  "half-crimp",
  "open",
  "full-crimp",
] as const;

export const EXTENDED_GRIP_TYPES = [
  "half-crimp",
  "open",
  "full-crimp",
  "back-3-crimp",
  "back-3-drag",
  "front-3-crimp",
  "front-3-drag",
] as const;

export const ALL_GRIP_TYPES = [
  "half-crimp",
  "open",
  "full-crimp",
  "back-3-crimp",
  "back-3-drag",
  "front-3-crimp",
  "front-3-drag",
  "mono-index-crimp",
  "mono-index-drag",
  "mono-middle-crimp",
  "mono-middle-drag",
  "mono-ring-crimp",
  "mono-ring-drag",
  "mono-pinky-crimp",
  "mono-pinky-drag",
] as const;

// Basic Parameters
export const EDGE_SIZES = ["20", "18", "10"] as const;
export const DURATIONS = ["7", "10"] as const;
export const AVG_LOAD_DURATIONS = ["30"] as const;
export const DOMINANT_SIDES = ["dominant", "nondominant"] as const;
export const TIMINGS = ["7-3"] as const;
export const REPS = ["1", "3", "5"] as const;

// Location Parameters
export const SPORT_LOCATION = ["gym", "outside"] as const;
export const BOULDER_LOCATION = [
  "gym",
  "outside",
  "kilter",
  "tensionboard1",
  "tensionboard2",
  "moonboard",
] as const;

// Stats
export const STAT = [
  "max",
  "top5",
  "projectp50",
  "projectp90",
  "onsitep50",
  "onsitep90",
] as const;

// Movement Types
export const WEIGHTED_MOVEMENT = [
  "barbellsquat",
  "benchpress",
  "deadlift",
  "overheadpress",
  "pullup",
  "dip",
  "ringdip",
] as const;

export const UNILATERAL_MOVEMENT = [
  "benchrow",
  "overheadpress",
  "pistolsquat",
  "pullup",
] as const;

export const UNILATERAL_REPS = ["1", "2", "5"] as const;

export const MAX_REPS_MOVEMENT = [
  "pullup",
  "pushup",
  "dip",
  "ringdip",
  "muscleup",
] as const;

export const UNILATERAL_MAX_REPS_MOVEMENT = [
  "pullup",
  "pushup",
  "pistolsquat",
] as const;

export const ISOMETRIC_MOVEMENT = [
  "barhang",
  "frontlever",
  "hollowhold",
  "lhang",
  "plank",
] as const;

export const UNILATERAL_ISOMETRIC_MOVEMENT = [
  "sideplank",
] as const;

export const ENDURANCE_MOVEMENT = [
  "footoncampuslong",
  "footoncampusshort",
] as const;

export const POWER_MOVEMENT = [
  "verticaljump",
  "horizontaljump",
] as const;

export const UNILATERAL_POWER_MOVEMENT = [
  "verticaljump",
  "horizontaljump",
  "campusreach",
] as const;

// Parameter Types
export type GripType = (typeof ALL_GRIP_TYPES)[number];
export type EdgeSize = (typeof EDGE_SIZES)[number];
export type Duration = (typeof DURATIONS)[number];
export type avgLoadDuration = (typeof AVG_LOAD_DURATIONS)[number];
export type DominantSide = (typeof DOMINANT_SIDES)[number];
export type Timing = (typeof TIMINGS)[number];
export type Reps = (typeof REPS)[number];

// Combined Parameters Object
export const PARAMS = {
  basicGripType: BASIC_GRIP_TYPES,
  extendedGripType: EXTENDED_GRIP_TYPES,
  allGripType: ALL_GRIP_TYPES,
  edgeSize: EDGE_SIZES,
  duration: DURATIONS,
  avgLoadDuration: AVG_LOAD_DURATIONS,
  repMax: REPS,
  dominantSide: DOMINANT_SIDES,
  timing: TIMINGS,
  sportLocation: SPORT_LOCATION,
  boulderLocation: BOULDER_LOCATION,
  stat: STAT,
  weightedMovement: WEIGHTED_MOVEMENT,
  unilateralMovement: UNILATERAL_MOVEMENT,
  unilateralReps: UNILATERAL_REPS,
  maxRepsMovement: MAX_REPS_MOVEMENT,
  unilateralMaxRepsMovement: UNILATERAL_MAX_REPS_MOVEMENT,
  isometricMovement: ISOMETRIC_MOVEMENT,
  unilateralIsometricMovement: UNILATERAL_ISOMETRIC_MOVEMENT,
  enduranceMovement: ENDURANCE_MOVEMENT,
  powerMovement: POWER_MOVEMENT,
  unilateralPowerMovement: UNILATERAL_POWER_MOVEMENT,
} as const;

export type ParamName = keyof typeof PARAMS;
export type ParamValue<K extends ParamName> = (typeof PARAMS)[K][number];
