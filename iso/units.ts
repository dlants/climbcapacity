import {
  Font,
  fontToIrcra,
  FrenchSport,
  frenchSportToIrcra,
  IRCRAGrade,
  VGrade,
  vGradeToIrcra,
  YDS,
  ydsToIrcra,
} from "./grade.js";
import { assertUnreachable } from "./utils.js";

export type MeasureId = string & { __brand: "measureId" };

/** these are in standard units, used for search (so for example, all grades are in ircra, all distances are in meters);
 *
 * to construct one we take the
 */
export type MeasureStr = string & { __brand: "MeasureStr" };

export type MeasureSpec = {
  id: MeasureId;
  name: string;
  description: string;
  defaultUnit: UnitValue["unit"];
};

export type MeasureValue = {
  id: MeasureId;
  value: UnitValue;
};

export function encodeMeasureValue(measure: MeasureValue): MeasureStr {
  const standardValue = convertToStandardUnit(measure);

  return (measure.id +
    ":" +
    standardValue.toString().padStart(8, "0")) as MeasureStr;
}

export function convertToStandardUnit(measure: MeasureValue): number {
  switch (measure.value.unit) {
    case "second":
      return measure.value.value;
    case "year":
      return measure.value.value;
    case "lb":
      return measure.value.value * 0.45359237;
    case "kg":
      return measure.value.value;
    case "m":
      return measure.value.value;
    case "cm":
      return measure.value.value / 100;
    case "mm":
      return measure.value.value / 1000;
    case "feetinches":
      return (
        (measure.value.value.feet + measure.value.value.inches * (1 / 12)) *
        0.3048
      );
    case "inches":
      return measure.value.value * 0.0254;
    case "vermin":
      return vGradeToIrcra(measure.value.value);
    case "ircra":
      return measure.value.value;
    case "font":
      return fontToIrcra(measure.value.value);
    case "frenchsport":
      return frenchSportToIrcra(measure.value.value);
    case "yds":
      return ydsToIrcra(measure.value.value);
    case "sex-at-birth":
      switch (measure.value.value) {
        case "female":
          return 0;
        case "male":
          return 1;
        default:
          assertUnreachable(measure.value);
      }
    case "count":
      return measure.value.value;
    default:
      assertUnreachable(measure.value);
  }
}

export type UnitValue =
  | {
      unit: "second";
      value: number;
    }
  | {
      unit: "year";
      value: number;
    }
  | {
      unit: "lb";
      value: number;
    }
  | {
      unit: "kg";
      value: number;
    }
  | {
      unit: "m";
      value: number;
    }
  | {
      unit: "cm";
      value: number;
    }
  | {
      unit: "mm";
      value: number;
    }
  | {
      unit: "feetinches";
      value: {
        feet: number;
        inches: number;
      };
    }
  | {
      unit: "inches";
      value: number;
    }
  | {
      unit: "vermin";
      value: VGrade;
    }
  | {
      unit: "font";
      value: Font;
    }
  | {
      unit: "frenchsport";
      value: FrenchSport;
    }
  | {
      unit: "yds";
      value: YDS;
    }
  | {
      unit: "ircra";
      value: IRCRAGrade;
    }
  | {
      unit: "sex-at-birth";
      value: "female" | "male";
    }
  | {
      unit: "count";
      value: number;
    };

export const GRIPS = {
  "half-crimp": true,
  "full-crimp": true,
  open: true,
} as const;

export type Grip = keyof typeof GRIPS;
export const GRIPS_ARR = Object.keys(GRIPS) as Grip[];

export function unitValueToString(unitValue: UnitValue): string {
  switch (unitValue.unit) {
    case "second":
      return `${unitValue.value}s`;
    case "year":
      return `${unitValue.value}y`;
    case "lb":
      return `${unitValue.value}lb`;
    case "kg":
      return `${unitValue.value}kg`;
    case "m":
      return `${unitValue.value}m`;
    case "cm":
      return `${unitValue.value}cm`;
    case "mm":
      return `${unitValue.value}mm`;
    case "feetinches":
      return `${unitValue.value.feet}'${unitValue.value.inches}"`;
    case "inches":
      return `${unitValue.value}"`;
    case "vermin":
      return `V${unitValue.value}`;
    case "font":
      return `f${unitValue.value}`;
    case "frenchsport":
      return unitValue.value;
    case "yds":
      return unitValue.value;
    case "ircra":
      return unitValue.value.toString();
    case "sex-at-birth":
      return unitValue.value;
    case "count":
      return unitValue.value.toString();
    default:
      assertUnreachable(unitValue);
  }
}
