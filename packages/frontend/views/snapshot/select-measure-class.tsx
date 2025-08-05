import * as DCGView from "dcgview";
import { generateId, MeasureClassSpec, MeasureId } from "../../../iso/measures";
import { Dispatch } from "../../types";
import { FacetString } from "../../../iso/units";
import { getFacetConfigForLocale } from "../../../iso/measures";
import { Locale } from "../../../iso/locale";
import * as typestyle from "typestyle";

const { For } = DCGView.Components;

type MeasureCombination = {
  measureClass: MeasureClassSpec;
  measureId: MeasureId;
  params: { [name: string]: string };
  displayName: string;
};

export type Model = {
  measureCombinations: MeasureCombination[];
  selectedMeasureId: MeasureId;
};

export type Msg =
  | {
      type: "SELECT_MEASURE_ID";
      measureId: MeasureId;
    };

export class SelectMeasureClassController {
  state: Model;

  constructor(
    {
      measureClasses,
      measureId,
      facetDistribution = {},
    }: {
      measureClasses: MeasureClassSpec[];
      measureId?: MeasureId;
      facetDistribution?: Record<FacetString, number>;
    },
    public context: {
      myDispatch: Dispatch<Msg>;
      locale: () => Locale;
    },
  ) {
    const measureCombinations = this.generateAllCombinations(measureClasses);
    const countCache = this.buildCountCache(
      measureCombinations,
      facetDistribution,
    );
    const sortedCombinations = this.buildSortedCombinations(
      measureCombinations,
      countCache,
    );

    // Select initial measure
    const selectedMeasureId = measureId || sortedCombinations[0]?.measureId;

    this.state = {
      measureCombinations,
      sortedCombinations,
      selectedMeasureId,
      facetDistribution,
      countCache,
    };
  }

  private generateAllCombinations(
    measureClasses: MeasureClassSpec[],
  ): MeasureCombination[] {
    const combinations: MeasureCombination[] = [];

    for (const measureClass of measureClasses) {
      // Generate all possible parameter combinations for this measure class
      const paramCombinations = this.generateParamCombinations(measureClass);

      for (const params of paramCombinations) {
        const measureId = generateId(measureClass, params);
        const displayName = this.generateDisplayName(measureClass, params);

        combinations.push({
          measureClass,
          measureId,
          params,
          displayName,
        });
      }
    }

    return combinations;
  }

  private buildCountCache(
    measureCombinations: MeasureCombination[],
    facetDistribution: Record<FacetString, number>,
  ): Map<MeasureId, number> {
    const cache = new Map<MeasureId, number>();

    for (const combo of measureCombinations) {
      const count = this.calculateCountForMeasure(
        combo.measureId,
        facetDistribution,
      );
      cache.set(combo.measureId, count);
    }

    return cache;
  }

  private buildSortedCombinations(
    measureCombinations: MeasureCombination[],
    countCache: Map<MeasureId, number>,
  ): (MeasureCombination & { count: number })[] {
    return measureCombinations
      .map((combo) => ({
        ...combo,
        count: countCache.get(combo.measureId) || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateCountForMeasure(
    measureId: MeasureId,
    facetDistribution: Record<FacetString, number>,
  ): number {
    const facetConfig = getFacetConfigForLocale(
      measureId,
      this.context.locale(),
    );

    let count = 0;
    if (facetConfig.strategy.type === "category") {
      // Find the category facet that matches this measure
      const categoryFacetPrefix = `${measureId};${facetConfig.unit};`;
      for (const [facetString, facetCount] of Object.entries(
        facetDistribution,
      )) {
        if (facetString.startsWith(categoryFacetPrefix)) {
          count += facetCount;
        }
      }
    } else {
      // For range measures, sum all bins
      const rangeFacetPrefix = `${measureId};${facetConfig.unit};`;
      for (const [facetString, facetCount] of Object.entries(
        facetDistribution,
      )) {
        if (facetString.startsWith(rangeFacetPrefix)) {
          count += facetCount;
        }
      }
    }

    return count;
  }

  private generateParamCombinations(
    measureClass: MeasureClassSpec,
  ): Array<{ [name: string]: string }> {
    if (measureClass.params.length === 0) {
      return [{}];
    }

    const combinations: Array<{ [name: string]: string }> = [];

    const generateRecursive = (
      paramIndex: number,
      currentParams: { [name: string]: string },
    ) => {
      if (paramIndex >= measureClass.params.length) {
        combinations.push({ ...currentParams });
        return;
      }

      const param = measureClass.params[paramIndex];
      for (const value of param.values) {
        currentParams[param.name] = value;
        generateRecursive(paramIndex + 1, currentParams);
      }
    };

    generateRecursive(0, {});
    return combinations;
  }

  private generateDisplayName(
    measureClass: MeasureClassSpec,
    params: { [name: string]: string },
  ): string {
    let name = measureClass.className as string;

    for (const param of measureClass.params) {
      const value = params[param.name];
      name += ` ${value}${param.suffix || ""}`;
    }

    return name;
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "SELECT_MEASURE_ID":
        this.state.selectedMeasureId = msg.measureId;
        break;

      case "UPDATE_FACET_DISTRIBUTION":
        this.state.facetDistribution = msg.facetDistribution;
        this.state.countCache = this.buildCountCache(
          this.state.measureCombinations,
          msg.facetDistribution,
        );
        this.state.sortedCombinations = this.buildSortedCombinations(
          this.state.measureCombinations,
          this.state.countCache,
        );

        // Auto-select first available measure if current selection has 0 count
        const currentCount =
          this.state.countCache.get(this.state.selectedMeasureId) || 0;
        if (currentCount === 0) {
          const firstAvailable = this.state.sortedCombinations.find(
            (combo) => combo.count > 0,
          );
          if (firstAvailable) {
            this.state.selectedMeasureId = firstAvailable.measureId;
          }
        }
        break;
    }
  }

  getSelectedMeasure(): MeasureCombination | undefined {
    return this.state.measureCombinations.find(
      (combo) => combo.measureId === this.state.selectedMeasureId,
    );
  }
}
const styles = typestyle.stylesheet({
  measureSelect: {
    padding: "4px 8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "14px",
    minWidth: "200px",
  },
  disabledOption: {
    color: "#999 !important",
    fontStyle: "italic",
  },
});

export class SelectMeasureClassView extends DCGView.View<{
  controller: () => SelectMeasureClassController;
}> {
  template() {
    const controller = () => this.props.controller();
    const state = () => controller().state;

    return (
      <div>
        <select
          class={DCGView.const(styles.measureSelect)}
          onChange={(e) => {
            const selectedMeasureId = (e.target as HTMLSelectElement)
              .value as MeasureId;
            controller().context.myDispatch({
              type: "SELECT_MEASURE_ID",
              measureId: selectedMeasureId,
            });
          }}
          value={() => state().selectedMeasureId}
        >
          <For
            each={() => state().sortedCombinations}
            key={(combo) => combo.measureId}
          >
            {(getCombo) => {
              const combo = getCombo();
              const isDisabled = combo.count === 0;
              return (
                <option
                  value={() => combo.measureId}
                  disabled={() => isDisabled}
                  class={() => (isDisabled ? styles.disabledOption : "")}
                >
                  {() => combo.displayName} ({() => combo.count})
                </option>
              );
            }}
          </For>
        </select>
      </div>
    );
  }
}
