import { MeasureId } from "../../iso/measures/index.js";
import { ParamName, ParamValue } from "../../iso/measures/params.js";
import { Snapshot } from "../../iso/protocol.js";
import { UnitValue } from "../../iso/units.js";

function brzycki_to_1rm(weight: number, reps: number) {
  return weight * (36 / (37 - reps));
}

function brzycki_from_1rm(weight1rm: number, targetReps: number) {
  return weight1rm * ((37 - targetReps) / 36);
}

function edgesize_to_20mm(weight: number, edgeSize: number) {
  return weight * edgeSize / 20;
}

function edgesize_from_20mm(val20mm: number, edgeSize: number) {
  return val20mm * 20 / edgeSize
}

export type InterpolationOption<P extends ParamName> = {
  param: ParamName
  sourceMeasureId: MeasureId
  targetMeasureId: MeasureId
  measureParamValue: ParamValue<P>
  targetParamValue: ParamValue<P>
}

export function interpolate(measures: Snapshot["measures"], interpolation: InterpolationOption<ParamName>): UnitValue | undefined {
  const value = measures[interpolation.sourceMeasureId];
  if (!value) {
    return undefined;
  }

  switch (interpolation.param) {
    case 'repMax':
      const startingRepMax = parseInt(interpolation.measureParamValue);
      const targetRepMax = parseInt(interpolation.targetParamValue);

      return {
        unit: value.unit,
        value: brzycki_from_1rm(brzycki_to_1rm(value.value as number, startingRepMax), targetRepMax)
      } as UnitValue;
    case 'edgeSize':
      const startingEdgeSize = parseInt(interpolation.measureParamValue);
      const targetEdgeSize = parseInt(interpolation.targetParamValue);
      return {
        unit: value.unit,
        value: edgesize_from_20mm(edgesize_to_20mm(value.value as number, startingEdgeSize), targetEdgeSize)
      } as UnitValue;
  }
  return undefined
}
