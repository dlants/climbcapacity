import {
  EWBANK,
  EwbankGrade,
  ewbankToIrcra,
  FONT,
  Font,
  fontToIrcra,
  FRENCH_SPORT,
  FrenchSport,
  frenchSportToIrcra,
  ircraToFrenchSport,
  IRCRAGrade,
  ircraToFont,
  ircraToVGrade,
  VGrade,
  VGRADE,
  vGradeToIrcra,
  YDS,
  ydsToIrcra,
  ircraToYDS,
  ircraToEwbank,
} from "./grade.js";
import { assertUnreachable } from "./utils.js";

export type MeasureId = string & { __brand: "measureId" };

/** these are in standard units, used for search (so for example, all grades are in ircra, all distances are in meters);
 *
 * to construct one we take the
 */
export type NormedMeasure = { measureId: MeasureId; value: number };

export type MeasureSpec = {
  id: MeasureId;
  name: string;
  description: string;
  // units[0] is the default
  units: UnitValue["unit"][];
};

export type MeasureValue = {
  id: MeasureId;
  value: UnitValue;
};

export function encodeMeasureValue(measure: MeasureValue): NormedMeasure {
  const standardValue = convertToStandardUnit(measure);
  return { measureId: measure.id, value: standardValue };
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
    case "ewbank":
      return ewbankToIrcra(measure.value.value);
    case "sex-at-birth":
      switch (measure.value.value) {
        case "female":
          return 0;
        case "male":
          return 1;
        default:
          assertUnreachable(measure.value, "sex-at-birth");
      }
    case "count":
      return measure.value.value;
    default:
      assertUnreachable(measure.value, "measure.value");
  }
}

export function convertToTargetUnit(
  normalizedValue: number,
  targetUnit: UnitType,
): number {
  switch (targetUnit) {
    case "second":
      return normalizedValue;
    case "year":
      return normalizedValue;
    case "lb":
      return normalizedValue / 0.45359237;
    case "kg":
      return normalizedValue;
    case "m":
      return normalizedValue;
    case "cm":
      return normalizedValue * 100;
    case "mm":
      return normalizedValue * 1000;
    case "inches":
      return normalizedValue / 0.0254;
    case "vermin":
      return VGRADE.indexOf(ircraToVGrade(normalizedValue as IRCRAGrade));
    case "ircra":
      return normalizedValue;
    case "font":
      return FONT.indexOf(ircraToFont(normalizedValue as IRCRAGrade));
    case "frenchsport":
      return FRENCH_SPORT.indexOf(
        ircraToFrenchSport(normalizedValue as IRCRAGrade),
      );
    case "yds":
      return YDS.indexOf(ircraToYDS(normalizedValue as IRCRAGrade));
    case "ewbank":
      return EWBANK.indexOf(ircraToEwbank(normalizedValue as IRCRAGrade));
    case "sex-at-birth":
      return normalizedValue;
    case "count":
      return normalizedValue;
    default:
      assertUnreachable(targetUnit);
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
      unit: "ewbank";
      value: EwbankGrade;
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

export type UnitType = UnitValue["unit"];

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
    case "ewbank":
      return unitValue.value.toString();
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
