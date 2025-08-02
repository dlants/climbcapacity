import * as DCGView from "dcgview";
import { Locale } from "../../../iso/locale";
import { MeasureId, ANTHRO_MEASURES } from "../../../iso/measures";
import { Dispatch } from "../../types";
import { assertUnreachable } from "../../util/utils";
import {
  FacetString,
  UnitType,
  createAllBinsForMeasure,
  createBinFacetString,
  createCategoryFacetString,
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
  totalCounts: Record<MeasureId, number>;
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
      unitType: UnitType;
      bins: { binLabel: string; min: number; max: number }[];
      selectedMinIdx?: number;
      selectedMaxIdx?: number;
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
      selectedMinIdx?: number;
      selectedMaxIdx?: number;
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
        // Generate bins for this range measure
        const bins = createAllBinsForMeasure(measureId, locale);
        filterStates[measureId] = {
          type: "range",
          enabled: false,
          unitType: facetConfig.unit,
          bins,
          selectedMinIdx: undefined,
          selectedMaxIdx: undefined,
        };
      }
    }

    this.state = {
      filterStates,
      anthroFacets: initialAnthroFacets,
      totalCounts: {},
    };
    this.recomputeStats();
  }

  recomputeStats() {
    this.histogramCache.clear();

    const locale = this.context.locale();
    const processedMeasures = new Set<string>();
    const anthroFacets = this.state.anthroFacets;

    // Compute total count by summing all facet counts
    this.state.totalCounts = {};

    for (const [facetString] of Object.entries(anthroFacets)) {
      const measureId = facetString.split(";")[0] as MeasureId;
      if (!this.state.totalCounts[measureId]) {
        this.state.totalCounts[measureId] = 0;
      }

      this.state.totalCounts[measureId] +=
        anthroFacets[facetString as FacetString] || 0;
    }

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

  getSelectedRange(measureId: MeasureId): {
    selectedMinIdx?: number;
    selectedMaxIdx?: number;
    bins: { binLabel: string; min: number; max: number }[];
  } {
    const filter = this.state.filterStates[measureId];
    if (filter?.type === "range") {
      return {
        selectedMinIdx: filter.selectedMinIdx,
        selectedMaxIdx: filter.selectedMaxIdx,
        bins: filter.bins,
      };
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

  generateCacheKey(): string {
    // Create a key based on enabled anthro filters and their values
    return Object.entries(this.state.filterStates)
      .filter(([_, filter]) => filter.enabled)
      .map(([measureId, filter]) => {
        if (filter.type === "categorical") {
          const values = Array.from(filter.selectedValues).sort().join(",");
          return `${measureId}:cat:${values}`;
        } else {
          return `${measureId}:range:${filter.selectedMinIdx || ""}:${filter.selectedMaxIdx || ""}`;
        }
      })
      .sort()
      .join("|");
  }

  hasAnyFiltersEnabled(): boolean {
    return Object.values(this.state.filterStates).some(
      (filter) => filter.enabled,
    );
  }

  getTotalCount(measureId: MeasureId): number {
    return this.state.totalCounts[measureId] || 0;
  }

  getQueryFilters(locale: Locale): FacetString[][] {
    const anthroFilters: FacetString[][] = [];

    for (const [measureId, filter] of Object.entries(this.state.filterStates)) {
      if (!filter.enabled) continue;

      if (filter.type === "categorical") {
        // For categorical, each selected value becomes a separate OR group
        const filterStrings = Array.from(filter.selectedValues).map((value) => {
          // Format: measureId;unit;value - need to get the unit from facet config
          const facetConfig = getFacetConfigForLocale(
            measureId as MeasureId,
            locale,
          );

          return createCategoryFacetString(
            measureId as MeasureId,
            facetConfig.unit,
            value,
          );
        });

        if (filterStrings.length > 0) {
          anthroFilters.push(filterStrings);
        }
      } else if (filter.type === "range") {
        // For range, create bin filters based on selected bin indices
        if (
          filter.selectedMinIdx !== undefined ||
          filter.selectedMaxIdx !== undefined
        ) {
          const startIdx = filter.selectedMinIdx ?? 0;
          const endIdx = filter.selectedMaxIdx ?? filter.bins.length - 1;

          // Create facet strings for all selected bins
          const rangeFacets: FacetString[] = [];
          for (let i = startIdx; i <= endIdx; i++) {
            const bin = filter.bins[i];
            if (bin) {
              rangeFacets.push(
                createBinFacetString(
                  measureId as MeasureId,
                  filter.unitType,
                  bin.binLabel,
                ),
              );
            }
          }

          if (rangeFacets.length > 0) {
            anthroFilters.push(rangeFacets);
          }
        }
      }
    }

    return anthroFilters;
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
            selectedMinIdx: msg.selectedMinIdx,
            selectedMaxIdx: msg.selectedMaxIdx,
          };
        }
        break;
      }

      case "UPDATE_ANTHRO_FACETS":
        this.state.anthroFacets = msg.anthroFacets;
        this.recomputeStats();
        break;

      default:
        assertUnreachable(msg);
    }
  }
}

export class AnthroFilterView extends DCGView.View<{
  controller: () => AnthroFilterController;
  isLoading: () => boolean;
}> {
  template() {
    const { For, If } = DCGView.Components;
    const controller = () => this.props.controller();
    const isLoading = () => this.props.isLoading();

    return (
      <div class={DCGView.const(styles.anthroFilterContainer)}>
        <h4 class={DCGView.const(styles.sectionHeader)}>
          Anthropometric Filters
          {() =>
            isLoading() && (
              <span class={DCGView.const(styles.loadingIndicator)}>
                {" "}
                loading...
              </span>
            )
          }
        </h4>

        <For.Simple
          each={() => {
            // Sort measures by total count (descending), with 0's at the bottom
            return ANTHRO_MEASURE_IDS.slice().sort((a, b) => {
              const countA = controller().getTotalCount(a);
              const countB = controller().getTotalCount(b);
              return countB - countA;
            });
          }}
        >
          {(measureId: MeasureId, _getIndex) => (
            <AnthroMeasureFilterView
              measureId={DCGView.const(measureId as MeasureId)}
              controller={() => controller()}
              isLoading={() => isLoading()}
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

  loadingIndicator: {
    fontSize: "12px",
    fontWeight: "normal",
    color: "#666",
    fontStyle: "italic",
  },

  totalCount: {
    fontSize: "12px",
    color: "#666",
    marginBottom: "16px",
    padding: "8px 12px",
    backgroundColor: "#f5f5f5",
    borderRadius: "4px",
    border: "1px solid #ddd",
  },
});
