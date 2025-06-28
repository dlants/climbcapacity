import DCGView from "dcgview";
import { Dispatch } from "../types";
import {
  MeasureSelectionBox,
  Msg as MeasureSelectionMsg,
} from "./measure-selection-box";
import { InitialFilter, UnitType } from "../../iso/units";
import { assertUnreachable } from "../util/utils";
import { MEASURES } from "../../iso/measures";
import {
  SnapshotQuery,
  MeasureStats,
  Dataset,
  DATASETS,
} from "../../iso/protocol";
import {
  FilterController,
  FilterView,
  Msg as FilterMsg,
} from "./filters/filter";
import { MeasureId } from "../../iso/measures";
import * as typestyle from "typestyle";
import * as csstips from "csstips";

export type FilterMapping = {
  [measureId: MeasureId]: {
    measureId: MeasureId;
    unit: UnitType;
  };
};

export type Model = {
  measureStats: MeasureStats;
  filters: FilterController[];
  datasets: {
    [dataset in Dataset]: boolean;
  };
};

export type Msg =
  | { type: "REMOVE_FILTER"; measureId: MeasureId }
  | {
      type: "MEASURE_SELECTOR_MSG";
      msg: MeasureSelectionMsg;
    }
  | {
      type: "TOGGLE_DATASET";
      dataset: Dataset;
      include: boolean;
    }
  | { type: "FILTER_MSG"; measureId: MeasureId; msg: FilterMsg };

export type InitialFilters = {
  [measureId: MeasureId]: InitialFilter;
};

export class EditQueryController {
  state: Model;

  constructor(
    {
      initialFilters,
      measureStats,
    }: {
      initialFilters: InitialFilters;
      measureStats: MeasureStats;
    },
    public myDispatch: Dispatch<Msg>,
  ) {
    const filters: FilterController[] = [];
    for (const measureIdStr in initialFilters) {
      const measureId = measureIdStr as MeasureId;
      const initialFilter = initialFilters[measureId];
      filters.push(
        new FilterController(
          { measureId, initialFilter },
          {
            myDispatch: (msg) =>
              this.myDispatch({ type: "FILTER_MSG", measureId, msg }),
          },
        ),
      );
    }

    this.state = {
      measureStats,
      datasets: {
        powercompany: true,
        climbharder: true,
      },
      filters,
    };
  }

  getFilterMeasureId(filter: FilterController): MeasureId {
    switch (filter.state.type) {
      case "minmax":
        return filter.state.controller.state.measureId;
      case "toggle":
        return filter.state.controller.state.measureId;
      default:
        throw new Error("Unknown filter type");
    }
  }

  getFilterUnit(filter: FilterController): UnitType {
    return filter.getUnit();
  }

  getFilterQuery(filter: FilterController) {
    return filter.getQuery();
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "REMOVE_FILTER":
        this.state.filters = this.state.filters.filter(
          (f) => this.getFilterMeasureId(f) !== msg.measureId,
        );
        break;

      case "MEASURE_SELECTOR_MSG":
        // Handle the message dispatching logic - we need to check if a measure was selected
        if (msg.msg.type === "SELECT_MEASURE") {
          const measureId = msg.msg.measureId;
          const spec = MEASURES.find((spec) => spec.id == measureId);
          if (!spec) {
            throw new Error(`Unexpected measureId ${measureId}`);
          }

          this.state.filters.push(
            new FilterController(
              {
                measureId: measureId,
                initialFilter: spec.initialFilter,
              },
              {
                myDispatch: (msg) =>
                  this.myDispatch({ type: "FILTER_MSG", measureId, msg }),
              },
            ),
          );
        }
        break;

      case "FILTER_MSG": {
        const filter = this.state.filters.find(
          (f) => this.getFilterMeasureId(f) === msg.measureId,
        );
        if (!filter) {
          throw new Error(`Unexpected filter id ${msg.measureId}`);
        }
        filter.handleDispatch(msg.msg);
        break;
      }

      case "TOGGLE_DATASET":
        this.state.datasets[msg.dataset] = msg.include;
        break;

      default:
        assertUnreachable(msg);
    }
  }

  // Legacy view method for backward compatibility
  view() {
    const view = new EditQueryView({ controller: () => this });
    return view.template();
  }

  // Legacy template method for backward compatibility
  template() {
    return this.view();
  }
}

export class EditQueryView extends DCGView.View<{
  controller: () => EditQueryController;
}> {
  template() {
    const { For } = DCGView.Components;
    const controller = () => this.props.controller();
    const state = () => controller().state;

    return (
      <div>
        <For
          each={() => state().filters}
          key={(filter: FilterController) =>
            controller().getFilterMeasureId(filter)
          }
        >
          {(getFilter: () => FilterController) => {
            const measureId = controller().getFilterMeasureId(getFilter());
            return (
              <div class={DCGView.const(styles.container)}>
                <div class={DCGView.const(styles.item)}>
                  <strong>{measureId}</strong>(
                  {() => state().measureStats[measureId] || 0} snapshots)
                </div>
                <div class={DCGView.const(styles.item)}>
                  <FilterView controller={getFilter} />
                </div>
                <div class={DCGView.const(styles.item)}>
                  <button
                    onClick={() =>
                      controller().myDispatch({
                        type: "REMOVE_FILTER",
                        measureId: measureId,
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          }}
        </For>
        <MeasureSelectionBox
          measureStats={() => state().measureStats}
          myDispatch={(msg: MeasureSelectionMsg) =>
            controller().myDispatch({ type: "MEASURE_SELECTOR_MSG", msg })
          }
        />
        <For.Simple each={() => DATASETS}>
          {(dataset: Dataset) => (
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={() => state().datasets[dataset]}
                  onChange={(e) =>
                    controller().myDispatch({
                      type: "TOGGLE_DATASET",
                      dataset: dataset,
                      include: (e.target as HTMLInputElement).checked,
                    })
                  }
                />{" "}
                {dataset}
              </label>
            </div>
          )}
        </For.Simple>
      </div>
    );
  }
}

export function generateFiltersMap(
  editQuery: EditQueryController,
): FilterMapping {
  const filterMapping: FilterMapping = {};
  for (const filter of editQuery.state.filters) {
    const measureId = editQuery.getFilterMeasureId(filter);
    const unit = editQuery.getFilterUnit(filter);
    filterMapping[measureId] = {
      measureId: measureId,
      unit: unit,
    };
  }
  return filterMapping;
}

export function getQuery(editQuery: EditQueryController): {
  body: SnapshotQuery;
  hash: string;
} {
  const query: SnapshotQuery = {
    datasets: {},
    measures: {},
  };
  const queryHashParts: string[] = [];
  editQuery.state.filters.forEach((filter) => {
    const measureId = editQuery.getFilterMeasureId(filter);
    query.measures[measureId] = editQuery.getFilterQuery(filter);
    queryHashParts.push(
      measureId + ":" + JSON.stringify(query.measures[measureId]),
    );
  });

  for (const dataset in editQuery.state.datasets) {
    query.datasets[dataset] = editQuery.state.datasets[dataset];
    queryHashParts.push(`dataset:${editQuery.state.datasets[dataset]}`);
  }

  return {
    body: query,
    hash: queryHashParts.join(","),
  };
}

const styles = typestyle.stylesheet({
  container: {
    margin: "10px 0",
    gap: "8px",
    flexWrap: "wrap",
    $nest: {
      "@media (min-width: 800px)": {
        ...csstips.horizontal,
      },
      "@media (max-width: 800px)": {
        ...csstips.vertical,
      },
    },
  },
  item: {
    ...csstips.content,
  },
}); // Legacy export for backward compatibility
export const EditQuery = EditQueryController;
