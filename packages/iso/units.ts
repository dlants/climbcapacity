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
import { MeasureId, getSpec, FacetStrategy } from "./measures/index.js";
import { assertUnreachable } from "./utils.js";
import { type UnitCategory, type Locale, LOCALE_CONFIGS } from "./locale.js";
import { MeasureClassName } from "./protocol.js";

/**
 * Nominal type for facet strings to ensure type safety
 * Examples: 'sex-at-birth:male', 'height:1.60-1.65', 'has:deadlift-1rm'
 */
export type FacetString = string & { readonly __brand: "FacetString" };

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

/**
 * Create a bin string based on binning strategy
 */
function createBinFromStrategy(
  value: number,
  strategy: { type: "bin"; binStart: number; binEnd: number; binStep: number },
): string {
  const { binStart, binEnd, binStep } = strategy;

  if (value < binStart) {
    return `<${binStart}`;
  }
  if (value >= binEnd) {
    return `>${binEnd}`;
  }

  const binIndex = Math.floor((value - binStart) / binStep);
  const currentBinStart = binStart + binIndex * binStep;
  const currentBinEnd = currentBinStart + binStep;

  return `${currentBinStart}-${currentBinEnd}`;
}
/**
 * Generate all bin strings that fall within a given range
 */
export function createBinsForRange(
  minValue: number,
  maxValue: number,
  strategy: { type: "bin"; binStart: number; binEnd: number; binStep: number },
): string[] {
  const { binStart, binEnd, binStep } = strategy;
  const bins: string[] = [];

  // Handle values below binStart
  if (minValue < binStart) {
    bins.push(`<${binStart}`);
  }

  // Handle values above binEnd
  if (maxValue >= binEnd) {
    bins.push(`>${binEnd}`);
  }

  // Generate intermediate bins
  const startBinIndex = Math.max(
    0,
    Math.floor((minValue - binStart) / binStep),
  );
  const endBinIndex = Math.floor(
    (Math.min(maxValue, binEnd - 0.001) - binStart) / binStep,
  );

  for (let i = startBinIndex; i <= endBinIndex; i++) {
    const currentBinStart = binStart + i * binStep;
    const currentBinEnd = currentBinStart + binStep;

    // Only include bins that actually overlap with our range
    if (currentBinEnd > minValue && currentBinStart <= maxValue) {
      bins.push(`${currentBinStart}-${currentBinEnd}`);
    }
  }

  return bins;
}

/**
 * Generate facet strings for a range query on a specific measure
 */
export function createRangeFacetStrings(
  measureId: MeasureId,
  unit: UnitType,
  minValue: number,
  maxValue: number,
  strategy: FacetStrategy,
): FacetString[] {
  if (strategy.type === "category") {
    throw new Error("Cannot create range facets for categorical strategy");
  }

  const bins = createBinsForRange(minValue, maxValue, strategy);
  return bins.map((bin) => `${measureId};${unit};${bin}` as FacetString);
}

/**
 * Generate facet string for a categorical value
 */
export function createCategoryFacetString(
  measureId: MeasureId,
  unit: UnitType,
  value: string | number,
): FacetString {
  return `${measureId};${unit};${value}` as FacetString;
}

/**
 * Generate facet string for a bin label
 */
export function createBinFacetString(
  measureId: MeasureId,
  unit: UnitType,
  binLabel: string,
): FacetString {
  return `${measureId};${unit};${binLabel}` as FacetString;
}

/**
 * Generate all possible bins for a measure with their structure
 */
export function createAllBinsForMeasure(
  measureId: MeasureId,
  locale: Locale,
): Array<{
  binLabel: string;
  min: number;
  max: number;
}> {
  const measureSpec = getSpec(measureId);
  const facetConfig = measureSpec.facets[locale];

  if (facetConfig.strategy.type !== "bin") {
    return [];
  }

  const { binStart, binEnd, binStep } = facetConfig.strategy;
  const bins: Array<{
    binLabel: string;
    min: number;
    max: number;
  }> = [];

  // Add below-range bin
  const belowStartValue = binStart - 1;
  const belowStartBin = createBinFromStrategy(
    belowStartValue,
    facetConfig.strategy,
  );
  bins.push({
    binLabel: belowStartBin,
    min: binStart - binStep,
    max: binStart,
  });

  // Generate all regular bins in the range
  for (let binValue = binStart; binValue < binEnd; binValue += binStep) {
    const representativeValue = binValue + binStep / 2;
    const binLabel = createBinFromStrategy(
      representativeValue,
      facetConfig.strategy,
    );
    bins.push({
      binLabel,
      min: binValue,
      max: binValue + binStep,
    });
  }

  // Add above-range bin
  const aboveEndValue = binEnd + 1;
  const aboveEndBin = createBinFromStrategy(
    aboveEndValue,
    facetConfig.strategy,
  );
  bins.push({
    binLabel: aboveEndBin,
    min: binEnd,
    max: binEnd + binStep,
  });

  return bins;
}

/**
 * Helper function to create a facet string for a specific measure, locale, and unit value
 */
function createFacetForMeasure(
  measureId: MeasureId,
  measureSpec: ReturnType<typeof getSpec>,
  unitValue: UnitValue,
  locale: Locale,
): FacetString {
  const facetConfig = measureSpec.facets[locale];
  const convertedValue = castUnit(unitValue, facetConfig.unit);

  if (facetConfig.strategy.type === "category") {
    return createCategoryFacetString(
      measureId,
      facetConfig.unit,
      convertedValue.value,
    );
  } else if (facetConfig.strategy.type === "bin") {
    const binValue = createBinFromStrategy(
      convertedValue.value as number,
      facetConfig.strategy,
    );
    return createBinFacetString(measureId, facetConfig.unit, binValue);
  } else {
    throw new Error(`Unexpected facet strategy type`);
  }
}

/**
 * Generate facet strings for MeiliSearch from a set of measures for a specific locale
 * Uses the format: measureId;unit;(value or bin) for faceted search
 */
export function createMeasureFacets(
  measures: Record<MeasureId, UnitValue>,
  locale: Locale,
): FacetString[] {
  const facets: string[] = [];

  // Process each measure and create facets based on its locale-specific configuration
  for (const [measureId, unitValue] of Object.entries(measures)) {
    const measureIdTyped = measureId as MeasureId;
    const measureSpec = getSpec(measureIdTyped);

    const facet = createFacetForMeasure(
      measureIdTyped,
      measureSpec,
      unitValue,
      locale,
    );
    facets.push(facet);
  }

  return facets as FacetString[];
}

/**
 * Generate the new faceted structure for UI design plan
 */
export function createFacetsForMeasures(
  measures: Record<MeasureId, UnitValue>,
): {
  anthro_facets: FacetString[];
  output_measure_ids: MeasureId[];
  input_measure_classes: (MeasureClassName | MeasureId)[];
  input_measure_ids: MeasureId[];
} {
  const anthro_facets = new Set<FacetString>();
  const output_measure_ids = new Set<MeasureId>();
  const input_measure_classes = new Set<MeasureClassName | MeasureId>();
  const input_measure_ids = new Set<MeasureId>();

  for (const [measureId, unitValue] of Object.entries(measures)) {
    const measureIdTyped = measureId as MeasureId;
    const measureSpec = getSpec(measureIdTyped);

    if (measureSpec.type === "anthro") {
      for (const locale in LOCALE_CONFIGS) {
        const facet = createFacetForMeasure(
          measureIdTyped,
          measureSpec,
          unitValue,
          locale as Locale,
        );
        anthro_facets.add(facet);
      }
    } else if (measureSpec.type === "performance") {
      // Output measures - just store the measure ID
      output_measure_ids.add(measureIdTyped);
    } else if (measureSpec.type === "input") {
      // Input measures - store both measure ID and class
      input_measure_ids.add(measureIdTyped);

      // Add measure class if it exists, otherwise add the measure ID itself
      if (measureSpec.classSpec?.className) {
        input_measure_classes.add(measureSpec.classSpec.className);
      } else {
        input_measure_classes.add(measureIdTyped);
      }
    }
  }

  return {
    anthro_facets: Array.from(anthro_facets),
    output_measure_ids: Array.from(output_measure_ids),
    input_measure_classes: Array.from(input_measure_classes),
    input_measure_ids: Array.from(input_measure_ids),
  };
}
