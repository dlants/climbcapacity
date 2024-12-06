import { EWBANK, FONT, FRENCH_SPORT, YDS } from "../../../iso/grade";
import { UnitType } from "../../../iso/units";
import { assertUnreachable } from "../../util/utils";
import lodash from "lodash";

const fmt = new Intl.NumberFormat("en", {
  maximumFractionDigits: 2,
});

export type Point = { x: number; y: number };

export interface Bin extends d3.Bin<number, number> {
  x0: number | undefined;
  x1: number | undefined;
}

export interface Bin2D extends d3.Bin<Point, number> {
  frequency: number;
  row: number;
  col: number;
}

export function tickFormatBins(
  binIndex: number,
  unit: UnitType | undefined,
  thresholds: number[],
): string {
  if (!unit) {
    return fmt.format(binIndex);
  }

  switch (unit) {
    case "second":
    case "lb":
    case "lb/s":
    case "kg":
    case "kg/s":
    case "m":
    case "cm":
    case "mm":
    case "month":
    case "year":
    case "training":
    case "count":
    case "strengthtoweightratio": {
      const min = thresholds[binIndex];
      const max = thresholds[binIndex + 1];
      return max ? `${fmt.format(min)}-${fmt.format(max)}` : ``;
    }
    case "inch": {
      const min = thresholds[binIndex];
      const max = thresholds[binIndex + 1];
      return max ? `${displayInches(min)}-${displayInches(max)}` : ``;
    }
    case "ircra":
      return Math.ceil(thresholds[binIndex]).toString();
    case "sex-at-birth":
      return ["female", "male"][binIndex];
    case "vermin":
      return `V${Math.ceil(thresholds[binIndex])}`;
    case "font":
      return FONT[Math.ceil(thresholds[binIndex])];
    case "frenchsport":
      return FRENCH_SPORT[Math.ceil(thresholds[binIndex])];
    case "yds":
      return YDS[Math.ceil(thresholds[binIndex])];
    case "ewbank":
      return EWBANK[Math.ceil(thresholds[binIndex])].toString();
    default:
      assertUnreachable(unit);
  }
}

export function displayInches(value: number) {
  const feet = Math.floor(value / 12);
  const inches = value % 12;
  if (feet == 0) {
    return fmt.format(inches) + '"';
  }
  return inches === 0
    ? `${fmt.format(feet)}'`
    : `${fmt.format(feet)}'${fmt.format(inches)}"`;
}

export function generateBinThresholds(
  data: readonly number[],
  unit: UnitType | undefined,
): number[] {
  if (data.length == 0) {
    return [0, 1];
  }

  const min = lodash.min(data)!;
  const max = lodash.max(data)!;

  // by default split up the min/max range into 8 bins
  const defaultThresholds = lodash
    .range(9)
    .map((d) => min + ((max - min) * d) / 8);

  if (!unit) {
    return defaultThresholds;
  }

  switch (unit) {
    case "second":
    case "lb":
    case "lb/s":
    case "kg":
    case "kg/s":
    case "m":
    case "cm":
    case "mm":
    case "inch":
    case "month":
    case "sex-at-birth":
    case "count":
    case "strengthtoweightratio":
      return defaultThresholds;
    case "year":
      return [0.5, 1.5, 2.5, 3.5, 6, 8, 10, 15, Number.POSITIVE_INFINITY];
    case "vermin":
    case "font":
    case "frenchsport":
    case "yds":
    case "ewbank":
    case "ircra":
      return lodash.range(min, max + 2).map((d) => d - 0.5);
    case "training":
      return [0.5, 1.5, 2.5, 3.5, 4.5];
    default:
      assertUnreachable(unit);
  }
}
