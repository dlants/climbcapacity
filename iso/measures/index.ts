import * as Fingers from "./fingers.js";
import * as Grades from "./grades.js";
import * as Movement from "./movement.js";
import * as Power from "./power.js";
import { InitialFilter, UnitType } from "../units.js";

export type MeasureId = string & { __brand: "measureId" };
export type MeasureType = "performance" | "anthro" | "input" | "training";
export type MeasureClassSpec = {
  className: string;
  /**
   * Map from propName to possible values
   */
  params: {
    name: string;
    values: string[];
    suffix: string;
  }[];
  measureType: MeasureType;
  /** units[0] is the default
   */
  units: UnitType[];
  initialFilter: InitialFilter;
  generateDescription(params: { [paramName: string]: string }): string;
};

export function generateId(
  spec: MeasureClassSpec,
  params: {
    [name: string]: string;
  },
) {
  const parts: string[] = [spec.className];
  for (const param of spec.params) {
    const value = params[param.name];
    if (!(value && param.values.includes(value))) {
      throw new Error(
        `Expected param ${param.name} to be one of ${JSON.stringify(param.values)} but it was ${value}`,
      );
    }
    parts.push(value + param.suffix);
  }
  return parts.join(":") as MeasureId;
}

export function parseId(
  id: MeasureId,
  spec: MeasureClassSpec,
): {
  [paramName: string]: string;
} {
  const parts = id.split(":");
  if (parts[0] !== spec.className) {
    throw new Error(`Expected measureId ${id} to start with ${spec.className}`);
  }

  if (parts.length !== spec.params.length + 1) {
    throw new Error(
      `Expected measureId ${id} to have ${spec.params.length + 1} segments but it had ${parts.length}`,
    );
  }

  const result: { [paramName: string]: string } = {};
  for (let i = 0; i < spec.params.length; i++) {
    const param = spec.params[i];
    const part = parts[i + 1];
    if (!part.endsWith(param.suffix)) {
      throw new Error(
        `Expected param ${param.name} to end with ${param.suffix} but it was ${part}`,
      );
    }
    const value = part.substring(0, part.length - param.suffix.length);
    if (!param.values.includes(value)) {
      throw new Error(
        `Expected param ${param.name} to be one of ${JSON.stringify(param.values)} but it was ${value}`,
      );
    }
    result[param.name] = value;
  }

  return result;
}

export type MeasureSpec = {
  id: MeasureId;
  type: MeasureType;
  spec?: MeasureClassSpec;
  name: string;
  description: string;
  /** units[0] is the default
   */
  units: UnitType[];
  initialFilter: InitialFilter;
};

export const MEASURES: MeasureSpec[] = [];

function generateMeasureSpecs(measureClass: MeasureClassSpec): MeasureSpec[] {
  const result: MeasureSpec[] = [];

  const params = measureClass.params;
  let combinations: { [paramName: string]: string }[] = [{}];

  // For each param, generate all combinations with existing ones
  for (const param of params) {
    const next: { [paramName: string]: string }[] = [];
    for (const combo of combinations) {
      for (const value of param.values) {
        next.push({
          ...combo,
          [param.name]: value,
        });
      }
    }
    combinations = next;
  }

  // Generate a measure spec for each combination
  for (const combo of combinations) {
    const id = generateId(measureClass, combo);
    result.push({
      id,
      type: measureClass.measureType,
      spec: measureClass,
      name: id,
      description: measureClass.generateDescription(combo),
      units: measureClass.units,
      initialFilter: measureClass.initialFilter,
    });
  }

  return result;
}

MEASURES.push(...generateMeasureSpecs(Fingers.maxhangClass));
MEASURES.push(...generateMeasureSpecs(Fingers.unilateralMaxhangClass));
MEASURES.push(...generateMeasureSpecs(Fingers.repeatersClass));
MEASURES.push(...generateMeasureSpecs(Fingers.blockPullClass));
MEASURES.push(...generateMeasureSpecs(Fingers.minEdgeClass));
MEASURES.push(...generateMeasureSpecs(Fingers.minEdgePullupsClass));
MEASURES.push(...generateMeasureSpecs(Fingers.continuousHangClass));

MEASURES.push(...generateMeasureSpecs(Grades.sportGradeClass));
MEASURES.push(...generateMeasureSpecs(Grades.boulderGradeClass));

MEASURES.push(...generateMeasureSpecs(Movement.weightedClass));
MEASURES.push(...generateMeasureSpecs(Movement.unilateralWeightedClass));
MEASURES.push(...generateMeasureSpecs(Movement.maxRepsClass));
MEASURES.push(...generateMeasureSpecs(Movement.unilateralMaxRepsClass));
MEASURES.push(...generateMeasureSpecs(Movement.isometricClass));
MEASURES.push(...generateMeasureSpecs(Movement.unilateralIsometricClass));
MEASURES.push(...generateMeasureSpecs(Movement.enduranceClass));

MEASURES.push(...generateMeasureSpecs(Power.powerClass));
MEASURES.push(...generateMeasureSpecs(Power.unilateralPowerClass));

export const WEIGHT_MEASURE_ID = 'weight' as MeasureId;
const ANTHRO_MEASURES: MeasureSpec[] = [
  {
    id: "height" as MeasureId,
    type: "anthro",
    name: "height",
    description: "Your height",
    units: ["m", "cm", "inch"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "m", value: 1.53 },
      maxValue: { unit: "m", value: 1.85 },
    },
  },
  {
    id: "armspan" as MeasureId,
    type: "anthro",
    name: "Arm span",
    description: "Your arm span, fingertip to fingertip",
    units: ["m", "cm", "inch"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "m", value: 1.53 },
      maxValue: { unit: "m", value: 1.85 },
    },
  },
  {
    id: "standing-reach" as MeasureId,
    type: "anthro",
    name: "standing reach",
    description:
      "With at least one foot on the floor, measure how high you can reach. You can stand on the tip of your toe",
    units: ["m", "cm", "inch"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "m", value: 2.2 },
      maxValue: { unit: "m", value: 2.8 },
    },
  },
  {
    id: WEIGHT_MEASURE_ID,
    type: "anthro",
    name: "weight",
    description: "Your weight",
    units: ["kg", "lb"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "kg", value: 39.7 },
      maxValue: { unit: "kg", value: 115.5 },
    },
  },
  {
    id: "sex-at-birth" as MeasureId,
    name: "Sex assigned at birth",
    type: "anthro",
    description: "The sex that was assigned to you at birth",
    units: ["sex-at-birth"],
    initialFilter: {
      type: "toggle",
      value: { unit: "sex-at-birth", value: "female" },
    },
  },
];


MEASURES.push(...ANTHRO_MEASURES);

MEASURES.push({
  id: "time-climbing" as MeasureId,
  type: "training",
  name: "How long have you been climbing?",
  description: `Count time during which you've been going at least once a week.

For example, if you climbed for a year, then took a year off, then climbed for another half a year, you'd report 1.5`,
  units: ["year", "month"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "year", value: 0 },
    maxValue: { unit: "year", value: 15 },
  },
});

export function generateTrainingMeasureId(id: MeasureId): MeasureId {
  return ("training:" + id) as MeasureId;
}

export function generateTrainingMeasure(spec: MeasureSpec): MeasureSpec {
  return {
    id: generateTrainingMeasureId(spec.id),
    type: "training",
    name: `Training: ${spec.name}`,
    description: `How experienced are you with this or similar measures?

1 - never or barely tried it
2 - trained it on and off
3 - trained it regularly
4 - highly trained in it`,
    units: ["training"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "training", value: 1 },
      maxValue: { unit: "training", value: 4 },
    },
  };
}

for (const measure of [...MEASURES]) {
  if (measure.type == "input") {
    MEASURES.push(generateTrainingMeasure(measure));
  }
}

const MEASURE_MAP: {
  [measureId: MeasureId]: MeasureSpec;
} = {};

for (const measure of MEASURES) {
  MEASURE_MAP[measure.id] = measure;
}

export function getSpec(measureId: MeasureId) {
  const spec = MEASURE_MAP[measureId];
  if (!spec) {
    throw new Error(`invalid measure id: ${measureId}`);
  }

  return spec;
}
