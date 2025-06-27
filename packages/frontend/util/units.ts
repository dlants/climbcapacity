import { interpolate, InterpolationOption } from "./interpolate";
import { MeasureId, WEIGHT_MEASURE_ID } from "../../iso/measures";
import { ParamName } from "../../iso/measures/params";
import { convertToStandardUnit, convertToTargetUnit, toLinear, UnitType, UnitValue } from "../../iso/units";

export function extractDataPoint({
  measures,
  xMeasure,
  yMeasure,
  interpolations
}: {
  measures: { [measureId: MeasureId]: UnitValue };
  xMeasure: { id: MeasureId; unit: UnitType };
  yMeasure: { id: MeasureId; unit: UnitType };
  interpolations: InterpolationOption<ParamName>[]
}): { x: number; y: number } | undefined {
  let inputValue = measures[xMeasure.id];
  const weightValue = measures[WEIGHT_MEASURE_ID];
  let outputValue = measures[yMeasure.id];
  if (!inputValue) {
    for (const interpolation of interpolations) {
      const value = interpolate(measures, interpolation);
      if (value != undefined) {
        inputValue = value;
        break;
      }
    }
  }

  if (!(inputValue && outputValue)) {
    return undefined;
  }

  if (xMeasure.unit == 'strengthtoweightratio') {
    if (!weightValue) {
      return undefined;
    }
    inputValue = {
      unit: 'strengthtoweightratio',
      value: convertToStandardUnit(inputValue) / convertToStandardUnit(weightValue)
    }
  }

  return {
    x: toLinear(
      convertToTargetUnit(convertToStandardUnit(inputValue), xMeasure.unit),
    ),
    y: toLinear(
      convertToTargetUnit(convertToStandardUnit(outputValue), yMeasure.unit),
    ),
  };
}


