import DCGView from "dcgview";
import { Dispatch } from "../types";
import { MEASURES, MeasureSpec, MeasureId } from "../../iso/measures";
import { Dataset, DATASETS, MeiliFilterQuery } from "../../iso/protocol";
import { Locale } from "../../iso/locale";
import { FacetString, UnitType, UnitValue } from "../../iso/units";
import {
  createRangeFacetStrings,
  createCategoryFacetString,
  castUnit,
} from "../../iso/units";
import { getFacetConfigForLocale } from "../../iso/measures";
import * as typestyle from "typestyle";

export type Model = {
  searchQuery: string;
  selectedFilters: {
    [measureId: MeasureId]: FilterState;
  };
  datasets: {
    [dataset in Dataset]: boolean;
  };
  facetDistribution: Record<FacetString, number>;
};

export type FilterState =
  | {
      type: "categorical";
      selectedValues: Set<string | number>;
    }
  | {
      type: "range";
      min?: UnitValue;
      max?: UnitValue;
    };

export type Msg =
  | { type: "UPDATE_SEARCH"; query: string }
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
  | { type: "REMOVE_FILTER"; measureId: MeasureId }
  | { type: "TOGGLE_DATASET"; dataset: Dataset; include: boolean }
  | {
      type: "UPDATE_FACET_DISTRIBUTION";
      facetDistribution: Record<FacetString, number>;
    };

export class FilterSelectorController {
  state: Model;
  private histogramCache = new Map<
    string,
    Array<{ binLabel: string; count: number; min: number; max: number }>
  >();

  constructor(
    {
      initialFacetDistribution = {},
    }: {
      initialFacetDistribution?: Record<FacetString, number>;
    },
    public context: { myDispatch: Dispatch<Msg>; locale: () => Locale },
  ) {
    this.state = {
      searchQuery: "",
      selectedFilters: {},
      datasets: {
        powercompany: true,
        climbharder: true,
      },
      facetDistribution: initialFacetDistribution,
    };

    // Compute initial histograms
    this.recomputeHistograms();
  }

  private recomputeHistograms() {
    this.histogramCache.clear();

    const locale = this.context.locale();

    for (const measure of MEASURES) {
      const facetConfig = getFacetConfigForLocale(measure.id, locale);

      if (facetConfig.strategy.type === "bin") {
        const bins: Array<{
          binLabel: string;
          count: number;
          min: number;
          max: number;
        }> = [];

        // Look through facetDistribution for this measure's range facets
        for (const [facetString, count] of Object.entries(
          this.state.facetDistribution,
        )) {
          if (facetString.startsWith(`${measure.id};${facetConfig.unit};`)) {
            const rangeStr = facetString.split(";")[2];
            const [minStr, maxStr] = rangeStr.split("-");
            const min = parseFloat(minStr);
            const max = parseFloat(maxStr);
            bins.push({ binLabel: rangeStr, count, min, max });
          }
        }

        // Sort by min value and cache
        this.histogramCache.set(
          measure.id,
          bins.sort((a, b) => a.min - b.max),
        );
      }
    }
  }

  getFilteredMeasures(): MeasureSpec[] {
    if (!this.state.searchQuery.trim()) {
      return MEASURES;
    }

    const query = this.state.searchQuery.toLowerCase();
    return MEASURES.filter(
      (measure) =>
        measure.id.toLowerCase().includes(query) ||
        measure.name.toLowerCase().includes(query),
    );
  }

  getCategoricalOptions(
    measureId: MeasureId,
  ): Array<{ value: string | number; count: number }> {
    const locale = this.context.locale();
    const facetConfig = getFacetConfigForLocale(measureId, locale);

    if (facetConfig.strategy.type !== "category") {
      return [];
    }

    const options: Array<{ value: string | number; count: number }> = [];

    // Look through facetDistribution for this measure's categorical facets
    for (const [facetString, count] of Object.entries(
      this.state.facetDistribution,
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
    return this.histogramCache.get(measureId) || [];
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

  getSelectedCategoricalValues(measureId: MeasureId): Set<string | number> {
    const filter = this.state.selectedFilters[measureId];
    if (filter?.type === "categorical") {
      return filter.selectedValues;
    }
    return new Set();
  }

  getSelectedRange(measureId: MeasureId): { min?: UnitValue; max?: UnitValue } {
    const filter = this.state.selectedFilters[measureId];
    if (filter?.type === "range") {
      return { min: filter.min, max: filter.max };
    }
    return {};
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "UPDATE_SEARCH":
        this.state.searchQuery = msg.query;
        break;

      case "TOGGLE_CATEGORICAL_VALUE": {
        const existingFilter = this.state.selectedFilters[msg.measureId];
        if (!existingFilter || existingFilter.type !== "categorical") {
          this.state.selectedFilters[msg.measureId] = {
            type: "categorical",
            selectedValues: new Set([msg.value]),
          };
        } else {
          const newValues = new Set(existingFilter.selectedValues);
          if (newValues.has(msg.value)) {
            newValues.delete(msg.value);
          } else {
            newValues.add(msg.value);
          }

          if (newValues.size === 0) {
            delete this.state.selectedFilters[msg.measureId];
          } else {
            this.state.selectedFilters[msg.measureId] = {
              type: "categorical",
              selectedValues: newValues,
            };
          }
        }
        break;
      }

      case "UPDATE_RANGE":
        if (msg.min === undefined && msg.max === undefined) {
          delete this.state.selectedFilters[msg.measureId];
        } else {
          this.state.selectedFilters[msg.measureId] = {
            type: "range",
            min: msg.min,
            max: msg.max,
          };
        }
        break;

      case "REMOVE_FILTER":
        delete this.state.selectedFilters[msg.measureId];
        break;

      case "TOGGLE_DATASET":
        this.state.datasets[msg.dataset] = msg.include;
        break;

      case "UPDATE_FACET_DISTRIBUTION":
        this.state.facetDistribution = msg.facetDistribution;
        this.recomputeHistograms();
        break;
    }
  }

  generateMeiliQuery(): MeiliFilterQuery {
    const query: MeiliFilterQuery = {
      datasets: { ...this.state.datasets },
      filters: [],
    };

    for (const [measureId, filterState] of Object.entries(
      this.state.selectedFilters,
    )) {
      const locale = this.context.locale();
      const facetConfig = getFacetConfigForLocale(
        measureId as MeasureId,
        locale,
      );
      const filterStrings: FacetString[] = [];

      if (filterState.type === "categorical") {
        for (const value of filterState.selectedValues) {
          const categoryFacet = createCategoryFacetString(
            measureId as MeasureId,
            facetConfig.unit,
            value,
          );
          filterStrings.push(categoryFacet);
        }
      } else if (
        filterState.type === "range" &&
        filterState.min &&
        filterState.max
      ) {
        const minFacetValue = castUnit(filterState.min, facetConfig.unit);
        const maxFacetValue = castUnit(filterState.max, facetConfig.unit);

        if (facetConfig.strategy.type === "bin") {
          const rangeFacets = createRangeFacetStrings(
            measureId as MeasureId,
            facetConfig.unit,
            minFacetValue.value as number,
            maxFacetValue.value as number,
            facetConfig.strategy,
          );
          filterStrings.push(...rangeFacets);
        }
      }

      if (filterStrings.length > 0) {
        query.filters.push(filterStrings);
      }
    }

    return query;
  }
}

export class FilterSelectorView extends DCGView.View<{
  controller: () => FilterSelectorController;
}> {
  template() {
    const { For, If } = DCGView.Components;
    const controller = () => this.props.controller();
    const state = () => controller().state;

    return (
      <div class={DCGView.const(styles.container)}>
        {/* Search box */}
        <div class={DCGView.const(styles.searchBox)}>
          <input
            type="text"
            placeholder="Search measures..."
            value={() => state().searchQuery}
            onInput={(e) =>
              controller().context.myDispatch({
                type: "UPDATE_SEARCH",
                query: (e.target as HTMLInputElement).value,
              })
            }
          />
        </div>

        {/* Dataset toggles */}
        <div class={DCGView.const(styles.datasetSection)}>
          <h3>Datasets</h3>
          <For.Simple each={() => DATASETS}>
            {(dataset: Dataset) => (
              <div class={DCGView.const(styles.datasetRow)}>
                <label>
                  <input
                    type="checkbox"
                    checked={() => state().datasets[dataset]}
                    onChange={(e) =>
                      controller().context.myDispatch({
                        type: "TOGGLE_DATASET",
                        dataset: dataset,
                        include: (e.target as HTMLInputElement).checked,
                      })
                    }
                  />
                  {dataset}
                </label>
              </div>
            )}
          </For.Simple>
        </div>

        {/* Measures list */}
        <div class={DCGView.const(styles.measuresSection)}>
          <h3>Filters</h3>
          <For
            each={() => controller().getFilteredMeasures()}
            key={(measure) => measure.id}
          >
            {(getMeasure: () => MeasureSpec) => {
              const measure = getMeasure();
              return (
                <div class={DCGView.const(styles.measureGroup)}>
                  <div class={DCGView.const(styles.measureHeader)}>
                    <span class={DCGView.const(styles.measureName)}>
                      {measure.name}
                    </span>
                    <If predicate={() => !!state().selectedFilters[measure.id]}>
                      {() => (
                        <button
                          class={DCGView.const(styles.removeButton)}
                          onClick={() =>
                            controller().context.myDispatch({
                              type: "REMOVE_FILTER",
                              measureId: measure.id,
                            })
                          }
                        >
                          ✕
                        </button>
                      )}
                    </If>
                  </div>

                  {/* Categorical measure UI */}
                  <If
                    predicate={() =>
                      controller().isCategoricalMeasure(measure.id)
                    }
                  >
                    {() => (
                      <div class={DCGView.const(styles.categoricalOptions)}>
                        <For
                          each={() =>
                            controller().getCategoricalOptions(measure.id)
                          }
                          key={(option) => String(option.value)}
                        >
                          {(
                            getOption: () => {
                              value: string | number;
                              count: number;
                            },
                          ) => {
                            const option = getOption();
                            const selectedValues =
                              controller().getSelectedCategoricalValues(
                                measure.id,
                              );
                            return (
                              <div
                                class={DCGView.const(styles.categoricalOption)}
                              >
                                <label>
                                  <input
                                    type="checkbox"
                                    checked={() =>
                                      selectedValues.has(option.value)
                                    }
                                    onChange={() =>
                                      controller().context.myDispatch({
                                        type: "TOGGLE_CATEGORICAL_VALUE",
                                        measureId: measure.id,
                                        value: option.value,
                                      })
                                    }
                                  />
                                  {String(option.value)} ({option.count})
                                </label>
                              </div>
                            );
                          }}
                        </For>
                      </div>
                    )}
                  </If>

                  {/* Range measure UI */}
                  <If predicate={() => controller().isRangeMeasure(measure.id)}>
                    {() => (
                      <div class={DCGView.const(styles.rangeOptions)}>
                        <RangeSliderView
                          measureId={DCGView.const(measure.id)}
                          histogram={() =>
                            controller().getRangeHistogram(measure.id)
                          }
                          selectedRange={() =>
                            controller().getSelectedRange(measure.id)
                          }
                          myDispatch={(min?: UnitValue, max?: UnitValue) =>
                            controller().context.myDispatch({
                              type: "UPDATE_RANGE",
                              measureId: measure.id,
                              min,
                              max,
                            })
                          }
                        />
                      </div>
                    )}
                  </If>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    );
  }
}

// Range slider component for linear measures
class RangeSliderView extends DCGView.View<{
  measureId: MeasureId;
  histogram: () => Array<{
    binLabel: string;
    count: number;
    min: number;
    max: number;
  }>;
  selectedRange: () => { min?: UnitValue; max?: UnitValue };
  myDispatch: (min?: UnitValue, max?: UnitValue) => void;
}> {
  getDefaultUnit(): UnitType {
    // TODO: Get proper unit from measure spec
    return "kg";
  }
  template() {
    const { For, If } = DCGView.Components;
    const histogram = () => this.props.histogram();
    const selectedRange = () => this.props.selectedRange();

    return (
      <div class={DCGView.const(styles.rangeSlider)}>
        {/* Histogram visualization */}
        <div class={DCGView.const(styles.histogram)}>
          {() => {
            const histogramData = histogram();
            if (histogramData.length === 0) return [];

            const maxCount = Math.max(...histogramData.map((b) => b.count));
            return histogramData.map((bin, _index) => {
              const height = Math.max(2, (bin.count / maxCount) * 40); // Scale to max 40px height
              return (
                <div
                  class={DCGView.const(styles.histogramBar)}
                  style={() => ({ height: `${height}px` })}
                  title={() => `${bin.binLabel}: ${bin.count} snapshots`}
                />
              );
            });
          }}
        </div>

        {/* Range labels */}
        <div class={DCGView.const(styles.rangeLabels)}>
          <For.Simple each={() => histogram().map((bin) => bin.binLabel)}>
            {(binLabel: string) => (
              <div class={DCGView.const(styles.rangeLabel)}>{binLabel}</div>
            )}
          </For.Simple>
        </div>

        {/* Selected range indicator */}
        <If
          predicate={() =>
            selectedRange().min !== undefined ||
            selectedRange().max !== undefined
          }
        >
          {() => (
            <div class={DCGView.const(styles.selectedRange)}>
              Selected: {() => selectedRange().min?.value || "min"} -{" "}
              {() => selectedRange().max?.value || "max"}
            </div>
          )}
        </If>

        {/* Simple range inputs for now - can be enhanced with actual slider later */}
        <div class={DCGView.const(styles.rangeInputs)}>
          <input
            type="number"
            placeholder="Min"
            value={() => selectedRange().min?.value?.toString() || ""}
            onInput={(e) => {
              const value = parseFloat((e.target as HTMLInputElement).value);
              if (!isNaN(value)) {
                // Get the measure's default unit - for now using kg as fallback
                const min: UnitValue = { value, unit: "kg" };
                this.props.myDispatch(min, selectedRange().max);
              } else {
                this.props.myDispatch(undefined, selectedRange().max);
              }
            }}
          />
          <input
            type="number"
            placeholder="Max"
            value={() => selectedRange().max?.value?.toString() || ""}
            onInput={(e) => {
              const value = parseFloat((e.target as HTMLInputElement).value);
              if (!isNaN(value)) {
                // Get the measure's default unit - for now using kg as fallback
                const max: UnitValue = { value, unit: "kg" };
                this.props.myDispatch(selectedRange().min, max);
              } else {
                this.props.myDispatch(selectedRange().min, undefined);
              }
            }}
          />
        </div>
      </div>
    );
  }
}

const styles = typestyle.stylesheet({
  container: {
    padding: "16px",
    borderRight: "1px solid #e0e0e0",
    height: "100vh",
    overflowY: "auto",
    width: "300px",
    backgroundColor: "#fafafa",
    $nest: {
      "@media (max-width: 800px)": {
        width: "100%",
        height: "auto",
        borderRight: "none",
        borderBottom: "1px solid #e0e0e0",
      },
    },
  },

  searchBox: {
    marginBottom: "16px",
    $nest: {
      "& input": {
        width: "100%",
        padding: "8px",
        border: "1px solid #ccc",
        borderRadius: "4px",
      },
    },
  },

  datasetSection: {
    marginBottom: "24px",
    $nest: {
      "& h3": {
        margin: "0 0 8px 0",
        fontSize: "14px",
        fontWeight: "bold",
        color: "#666",
      },
    },
  },

  datasetRow: {
    marginBottom: "4px",
    $nest: {
      "& label": {
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "14px",
      },
    },
  },

  measuresSection: {
    $nest: {
      "& h3": {
        margin: "0 0 12px 0",
        fontSize: "14px",
        fontWeight: "bold",
        color: "#666",
      },
    },
  },

  measureGroup: {
    marginBottom: "16px",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    backgroundColor: "white",
  },

  measureHeader: {
    padding: "8px 12px",
    backgroundColor: "#f5f5f5",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  measureName: {
    fontWeight: "bold",
    fontSize: "14px",
  },

  removeButton: {
    background: "none",
    border: "none",
    color: "#999",
    cursor: "pointer",
    fontSize: "16px",
    $nest: {
      "&:hover": {
        color: "#666",
      },
    },
  },

  categoricalOptions: {
    padding: "8px 12px",
  },

  categoricalOption: {
    marginBottom: "4px",
    $nest: {
      "& label": {
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "13px",
        cursor: "pointer",
      },
    },
  },

  rangeOptions: {
    padding: "8px 12px",
  },

  rangeSlider: {
    // Styles for range slider container
  },

  histogram: {
    display: "flex",
    alignItems: "end",
    gap: "1px",
    marginBottom: "8px",
    height: "50px",
  },

  histogramBar: {
    backgroundColor: "#4CAF50",
    flex: 1,
    minWidth: "4px",
    cursor: "pointer",
    $nest: {
      "&:hover": {
        backgroundColor: "#45a049",
      },
    },
  },

  rangeLabels: {
    display: "flex",
    fontSize: "10px",
    marginBottom: "8px",
  },

  rangeLabel: {
    flex: 1,
    textAlign: "center",
    color: "#666",
  },

  selectedRange: {
    fontSize: "12px",
    color: "#666",
    marginBottom: "8px",
  },

  rangeInputs: {
    display: "flex",
    gap: "8px",
    $nest: {
      "& input": {
        flex: 1,
        padding: "4px",
        border: "1px solid #ccc",
        borderRadius: "2px",
        fontSize: "12px",
      },
    },
  },
});
