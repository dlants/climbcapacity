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
import { Snapshot } from "./protocol.js";
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
  /** units[0] is the default
   */
  units: UnitType[];
  defaultMinValue: UnitValue;
  defaultMaxValue: UnitValue;
};

export type MeasureValue = {
  id: MeasureId;
  value: UnitValue;
};

export function encodeMeasureValue(measure: MeasureValue): NormedMeasure {
  const standardValue = convertToStandardUnit(measure.value);
  return { measureId: measure.id, value: standardValue };
}

export function convertToStandardUnit(unit: UnitValue): number {
  switch (unit.unit) {
    case "second":
      return unit.value;
    case "year":
      return unit.value;
    case "month":
      return unit.value / 12;
    case "lb":
      return unit.value * 0.45359237;
    case "kg":
      return unit.value;
    case "m":
      return unit.value;
    case "cm":
      return unit.value / 100;
    case "mm":
      return unit.value / 1000;
    case "inch":
      return unit.value * 0.0254;
    case "vermin":
      return vGradeToIrcra(unit.value);
    case "ircra":
      return unit.value;
    case "font":
      return fontToIrcra(unit.value);
    case "frenchsport":
      return frenchSportToIrcra(unit.value);
    case "yds":
      return ydsToIrcra(unit.value);
    case "ewbank":
      return ewbankToIrcra(unit.value);
    case "sex-at-birth":
      switch (unit.value) {
        case "female":
          return 0;
        case "male":
          return 1;
        default:
          assertUnreachable(unit);
      }
    case "count":
      return unit.value;
    default:
      assertUnreachable(unit);
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
    case "month":
      return normalizedValue * 12;
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
    case "inch":
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
      unit: "month";
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
      unit: "inch";
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

export function unitValueToString(unitValue: UnitValue): string {
  switch (unitValue.unit) {
    case "second":
      return `${unitValue.value}s`;
    case "year":
      return `${unitValue.value}y`;
    case "month":
      return `${unitValue.value}mo`;
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
    case "inch":
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

export function inchesToFeetAndInches(inches: number) {
  const feet = Math.floor(inches / 12);
  const outInches = inches % 12;
  return { feet, inches: outInches };
}

export function extractDataPoint({
  measures,
  inputMeasure,
  outputMeasure,
}: {
  measures: Snapshot["measures"];
  inputMeasure: { id: MeasureId; unit: UnitType };
  outputMeasure: { id: MeasureId; unit: UnitType };
}): { x: number; y: number } | undefined {
  const inputValue = measures[inputMeasure.id];
  const outputValue = measures[outputMeasure.id];

  if (!(inputValue && outputValue)) {
    return undefined;
  }

  return {
    x: convertToTargetUnit(
      convertToStandardUnit(inputValue),
      inputMeasure.unit,
    ),
    y: convertToTargetUnit(
      convertToStandardUnit(outputValue),
      outputMeasure.unit,
    ),
  };
}
