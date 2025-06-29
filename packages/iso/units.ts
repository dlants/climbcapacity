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
import { MeasureId } from "./measures/index.js";
import { assertUnreachable } from "./utils.js";
import type { UnitCategory, Locale } from "./locale.js";

/** these are in standard units, used for search (so for example, all grades are in ircra, all distances are in meters);
 *
 * to construct one we take the
 */
export type NormedMeasure = { measureId: MeasureId; value: number };

export type InitialFilter =
  | {
      type: "minmax";
      minValue: UnitValue;
      maxValue: UnitValue;
    }
  | {
      type: "toggle";
      value: UnitValue;
    };

export type LocaleBasedInitialFilter =
  | {
      type: "minmax";
      localeRanges: {
        [K in Locale]: {
          minValue: UnitValue;
          maxValue: UnitValue;
        };
      };
    }
  | {
      type: "toggle";
      localeValues: {
        [K in Locale]: UnitValue;
      };
    };

export function selectInitialFilter(
  localeFilters: LocaleBasedInitialFilter,
  locale: Locale,
): InitialFilter {
  if (localeFilters.type == "toggle") {
    return {
      type: "toggle",
      value: localeFilters.localeValues[locale],
    };
  } else {
    return {
      type: "minmax",
      minValue: localeFilters.localeRanges[locale].minValue,
      maxValue: localeFilters.localeRanges[locale].maxValue,
    };
  }
}

export function castInitialFilter(filter: InitialFilter, targetUnit: UnitType) {
  switch (filter.type) {
    case "minmax":
      return {
        ...filter,
        minValue: castUnit(filter.minValue, targetUnit),
        maxValue: castUnit(filter.maxValue, targetUnit),
      };
    case "toggle":
      return {
        ...filter,
        value: castUnit(filter.value, targetUnit),
      };
    default:
      assertUnreachable(filter);
  }
}

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
    case "lb/s":
      return unit.value * 0.45359237;
    case "kg":
      return unit.value;
    case "kg/s":
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
    // eslint-disable-next-line no-fallthrough
    case "training":
      return unit.value;
    case "count":
      return unit.value;
    case "strengthtoweightratio":
      return unit.value;
    default:
      assertUnreachable(unit);
  }
}

export function convertToTargetUnit(
  normalizedValue: number,
  targetUnit: UnitType,
): UnitValue {
  switch (targetUnit) {
    case "second":
      return { unit: "second", value: normalizedValue };
    case "year":
      return { unit: "year", value: normalizedValue };
    case "month":
      return { unit: "month", value: normalizedValue * 12 };
    case "lb":
      return { unit: "lb", value: normalizedValue / 0.45359237 };
    case "lb/s":
      return { unit: "lb/s", value: normalizedValue / 0.45359237 };
    case "kg":
      return { unit: "kg", value: normalizedValue };
    case "kg/s":
      return { unit: "kg/s", value: normalizedValue };
    case "m":
      return { unit: "m", value: normalizedValue };
    case "cm":
      return { unit: "cm", value: normalizedValue * 100 };
    case "mm":
      return { unit: "mm", value: normalizedValue * 1000 };
    case "inch":
      return { unit: "inch", value: normalizedValue / 0.0254 };
    case "vermin":
      return {
        unit: "vermin",
        value: ircraToVGrade(normalizedValue as IRCRAGrade),
      };
    case "ircra":
      return { unit: "ircra", value: normalizedValue as IRCRAGrade };
    case "font":
      return {
        unit: "font",
        value: ircraToFont(normalizedValue as IRCRAGrade),
      };
    case "frenchsport":
      return {
        unit: "frenchsport",
        value: ircraToFrenchSport(normalizedValue as IRCRAGrade),
      };
    case "yds":
      return {
        unit: "yds",
        value: ircraToYDS(normalizedValue as IRCRAGrade),
      };
    case "ewbank":
      return {
        unit: "ewbank",
        value: ircraToEwbank(normalizedValue as IRCRAGrade),
      };
    case "sex-at-birth":
      return {
        unit: "sex-at-birth",
        value: normalizedValue === 0 ? "female" : "male",
      };
    case "count":
      return { unit: "count", value: normalizedValue };
    case "training":
      return { unit: "training", value: normalizedValue as Training };
    case "strengthtoweightratio":
      return { unit: "strengthtoweightratio", value: normalizedValue };
    default:
      assertUnreachable(targetUnit);
  }
}
export function castUnit(
  unitValue: UnitValue,
  targetUnit: UnitType,
): UnitValue {
  return convertToTargetUnit(convertToStandardUnit(unitValue), targetUnit);
}

export type Training = 1 | 2 | 3 | 4;
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
      unit: "lb/s";
      value: number;
    }
  | {
      unit: "kg";
      value: number;
    }
  | {
      unit: "kg/s";
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
      unit: "training";
      value: Training;
    }
  | {
      unit: "count";
      value: number;
    }
  | {
      unit: "strengthtoweightratio";
      value: number;
    };

export type UnitType = UnitValue["unit"];

export const UNIT_CATEGORIES: Record<UnitType, UnitCategory | null> = {
  // Weight units
  lb: "weight",
  kg: "weight",
  "lb/s": "weight",
  "kg/s": "weight",

  // Distance units
  m: "distance",
  cm: "distance",
  mm: "distance",
  inch: "distance",

  // Bouldering grade units
  vermin: "bouldering",
  font: "bouldering",

  // Sport grade units
  yds: "sport",
  frenchsport: "sport",
  ewbank: "sport",

  // Units that don't have categories (miscellaneous)
  second: null,
  year: null,
  month: null,
  ircra: null,
  "sex-at-birth": null,
  training: null,
  count: null,
  strengthtoweightratio: null,
};

export function getUnitCategory(unit: UnitType): UnitCategory | null {
  return UNIT_CATEGORIES[unit];
}

export function unitValueToString(unitValue: UnitValue): string {
  switch (unitValue.unit) {
    case "second":
      return `${unitValue.value}s`;
    case "year":
      return `${unitValue.value}y`;
    case "month":
      return `${unitValue.value}mo`;
    case "lb":
    case "kg":
    case "lb/s":
    case "kg/s":
      return `${unitValue.value}${unitValue.unit}`;
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
    case "training":
      return unitValue.value.toString();
    case "strengthtoweightratio":
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

export function toLinear(unitValue: UnitValue): number {
  switch (unitValue.unit) {
    case "second":
    case "year":
    case "month":
    case "lb":
    case "kg":
    case "lb/s":
    case "kg/s":
    case "m":
    case "cm":
    case "mm":
    case "inch":
    case "ircra":
    case "count":
    case "strengthtoweightratio":
      return unitValue.value;
    case "vermin":
      return VGRADE.indexOf(unitValue.value);
    case "font":
      return FONT.indexOf(unitValue.value);
    case "frenchsport":
      return FRENCH_SPORT.indexOf(unitValue.value);
    case "yds":
      return YDS.indexOf(unitValue.value);
    case "ewbank":
      return EWBANK.indexOf(unitValue.value);
    case "sex-at-birth":
      return ["female", "male"].indexOf(unitValue.value);
    case "training":
      return unitValue.value;
    default:
      assertUnreachable(unitValue);
  }
}

export function adjustGrade(unit: UnitValue, adjustment: number): UnitValue {
  switch (unit.unit) {
    case "vermin": {
      const index = VGRADE.indexOf(unit.value) + adjustment;
      const newValue = VGRADE[Math.max(0, Math.min(index, VGRADE.length - 1))];
      return { unit: "vermin", value: newValue };
    }
    case "font": {
      const index = FONT.indexOf(unit.value) + adjustment;
      const newValue = FONT[Math.max(0, Math.min(index, FONT.length - 1))];
      return { unit: "font", value: newValue };
    }
    case "frenchsport": {
      const index = FRENCH_SPORT.indexOf(unit.value) + adjustment;
      const newValue =
        FRENCH_SPORT[Math.max(0, Math.min(index, FRENCH_SPORT.length - 1))];
      return { unit: "frenchsport", value: newValue };
    }
    case "yds": {
      const index = YDS.indexOf(unit.value) + adjustment;
      const newValue = YDS[Math.max(0, Math.min(index, YDS.length - 1))];
      return { unit: "yds", value: newValue };
    }
    case "ewbank": {
      const index = EWBANK.indexOf(unit.value) + adjustment;
      const newValue = EWBANK[Math.max(0, Math.min(index, EWBANK.length - 1))];
      return { unit: "ewbank", value: newValue };
    }
    case "ircra": {
      const newValue = Math.max(
        0,
        Math.min(unit.value + adjustment, 52),
      ) as IRCRAGrade;
      return { unit: "ircra", value: newValue };
    }
    default:
      throw new Error(`Unexpected unit for adjustGrade ${unit.unit}`);
  }
}
