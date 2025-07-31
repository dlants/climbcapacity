import * as DCGView from "dcgview";
import { Locale } from "../../../iso/locale";
import { MeasureId, ANTHRO_MEASURES } from "../../../iso/measures";
import { Dispatch } from "../../types";
import { assertUnreachable } from "../../util/utils";
import {
  FacetString,
  UnitValue,
  createAllBinsForMeasure,
  createBinFacetString,
} from "../../../iso/units";
import { getFacetConfigForLocale } from "../../../iso/measures";
import { AnthroMeasureFilterView } from "./measure-filter";
import * as typestyle from "typestyle";

const ANTHRO_MEASURE_IDS = ANTHRO_MEASURES.map((measure) => measure.id);

// AnthroFilter sub-component
export type AnthroFilterModel = {
  filterStates: {
    [measureId: MeasureId]: AnthroFilterState;
  };
  anthroFacets: Record<FacetString, number>;
};

export type AnthroFilterState =
  | {
      type: "categorical";
      enabled: boolean;
      selectedValues: Set<string | number>;
    }
  | {
      type: "range";
      enabled: boolean;
      min?: UnitValue;
      max?: UnitValue;
    };

export type AnthroFilterMsg =
  | {
      type: "TOGGLE_FILTER_ENABLED";
      measureId: MeasureId;
    }
  | {
      type: "TOGGLE_CATEGORICAL_VALUE";
      measureId: MeasureId;
      value: string | number;
    }
  | {
      type: "UPDATE_RANGE";
      measureId: MeasureId;
      min?: UnitValue;
      max?: UnitValue;
    }
  | {
      type: "UPDATE_ANTHRO_FACETS";
      anthroFacets: Record<FacetString, number>;
    };

export class AnthroFilterController {
  state: AnthroFilterModel;
  private histogramCache = new Map<
    string,
    Array<{ binLabel: string; count: number; min: number; max: number }>
  >();

  constructor(
    public context: {
      myDispatch: Dispatch<AnthroFilterMsg>;
      locale: () => Locale;
    },
    initialAnthroFacets: Record<FacetString, number>,
  ) {
    // Initialize filter states for all anthropometric measures
    const filterStates: { [measureId: MeasureId]: AnthroFilterState } = {};
    const locale = this.context.locale();

    for (const measureId of ANTHRO_MEASURE_IDS) {
      const facetConfig = getFacetConfigForLocale(measureId, locale);

      if (facetConfig.strategy.type === "category") {
        filterStates[measureId] = {
          type: "categorical",
          enabled: false,
          selectedValues: new Set(),
        };
      } else {
        filterStates[measureId] = {
          type: "range",
          enabled: false,
          min: undefined,
          max: undefined,
        };
      }
    }

    this.state = {
      filterStates,
      anthroFacets: initialAnthroFacets,
    };
    this.recomputeHistograms();
  }

  recomputeHistograms() {
    this.histogramCache.clear();

    const locale = this.context.locale();
    const processedMeasures = new Set<string>();
    const anthroFacets = this.state.anthroFacets;

    for (const [facetString] of Object.entries(anthroFacets)) {
      const measureId = facetString.split(";")[0] as MeasureId;

      if (processedMeasures.has(measureId)) continue;
      processedMeasures.add(measureId);

      const facetConfig = getFacetConfigForLocale(measureId, locale);

      if (facetConfig.strategy.type === "bin") {
        // Generate all possible bins using the helper
        const allBins = createAllBinsForMeasure(measureId, locale);

        // Populate counts from anthroFacets
        const bins = allBins.map((bin) => {
          const facetString = createBinFacetString(
            measureId,
            facetConfig.unit,
            bin.binLabel,
          );
          const count = anthroFacets[facetString] || 0;

          return {
            ...bin,
            count,
          };
        });

        // Cache the bins
        this.histogramCache.set(measureId, bins);
      }
    }
  }

  isFilterEnabled(measureId: MeasureId): boolean {
    return this.state.filterStates[measureId]?.enabled ?? false;
  }

  getSelectedCategoricalValues(measureId: MeasureId): Set<string | number> {
    const filter = this.state.filterStates[measureId];
    if (filter?.type === "categorical") {
      return filter.selectedValues;
    } else {
      throw new Error(`${measureId} is not categorical`);
    }
  }

  getSelectedRange(measureId: MeasureId): { min?: UnitValue; max?: UnitValue } {
    const filter = this.state.filterStates[measureId];
    if (filter?.type === "range") {
      return { min: filter.min, max: filter.max };
    } else {
      throw new Error(`${measureId} is not of type range`);
    }
  }

  getCategoricalOptions(
    measureId: MeasureId,
  ): Array<{ value: string | number; count: number }> {
    const locale = this.context.locale();
    const facetConfig = getFacetConfigForLocale(measureId, locale);

    if (facetConfig.strategy.type !== "category") {
      throw new Error(`${measureId} is not of type category`);
    }

    const options: Array<{ value: string | number; count: number }> = [];

    // Look through anthroFacets for this measure's categorical facets
    for (const [facetString, count] of Object.entries(
      this.state.anthroFacets,
    )) {
      if (facetString.startsWith(`${measureId};${facetConfig.unit};`)) {
        const value = facetString.split(";")[2];
        options.push({ value, count });
      }
    }

    return options;
  }

  getRangeHistogram(
    measureId: MeasureId,
  ): Array<{ binLabel: string; count: number; min: number; max: number }> {
    const histogram = this.histogramCache.get(measureId);
    if (!histogram) {
      throw new Error(`No histogram found for ${measureId}`);
    }

    return histogram;
  }

  isCategoricalMeasure(measureId: MeasureId): boolean {
    const locale = this.context.locale();
    const facetConfig = getFacetConfigForLocale(measureId, locale);
    return facetConfig.strategy.type === "category";
  }

  isRangeMeasure(measureId: MeasureId): boolean {
    const locale = this.context.locale();
    const facetConfig = getFacetConfigForLocale(measureId, locale);
    return facetConfig.strategy.type === "bin";
  }

  handleDispatch(msg: AnthroFilterMsg) {
    switch (msg.type) {
      case "TOGGLE_FILTER_ENABLED": {
        const currentFilter = this.state.filterStates[msg.measureId];
        currentFilter.enabled = !currentFilter.enabled;
        break;
      }

      case "TOGGLE_CATEGORICAL_VALUE": {
        const existingFilter = this.state.filterStates[msg.measureId];
        if (existingFilter && existingFilter.type === "categorical") {
          const newValues = new Set(existingFilter.selectedValues);
          if (newValues.has(msg.value)) {
            newValues.delete(msg.value);
          } else {
            newValues.add(msg.value);
          }

          this.state.filterStates[msg.measureId] = {
            ...existingFilter,
            selectedValues: newValues,
          };
        }
        break;
      }

      case "UPDATE_RANGE": {
        const existingFilter = this.state.filterStates[msg.measureId];
        if (existingFilter && existingFilter.type === "range") {
          this.state.filterStates[msg.measureId] = {
            ...existingFilter,
            min: msg.min,
            max: msg.max,
          };
        }
        break;
      }

      case "UPDATE_ANTHRO_FACETS":
        this.state.anthroFacets = msg.anthroFacets;
        this.recomputeHistograms();
        break;

      default:
        assertUnreachable(msg);
    }
  }
}

export class AnthroFilterView extends DCGView.View<{
  controller: () => AnthroFilterController;
}> {
  template() {
    const { For } = DCGView.Components;
    const controller = () => this.props.controller();

    return (
      <div class={DCGView.const(styles.anthroFilterContainer)}>
        <h4 class={DCGView.const(styles.sectionHeader)}>
          Anthropometric Filters
        </h4>

        <For.Simple each={DCGView.const(ANTHRO_MEASURE_IDS)}>
          {(measureId: MeasureId, _getIndex) => (
            <AnthroMeasureFilterView
              measureId={DCGView.const(measureId as MeasureId)}
              controller={() => controller()}
            />
          )}
        </For.Simple>
      </div>
    );
  }
}

const styles = typestyle.stylesheet({
  anthroFilterContainer: {
    marginBottom: "24px",
  },

  sectionHeader: {
    margin: "0 0 12px 0",
    fontSize: "16px",
    fontWeight: "bold",
    color: "#333",
    borderBottom: "2px solid #4CAF50",
    paddingBottom: "4px",
  },
});
