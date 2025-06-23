import React, { Dispatch } from "react";
import * as MeasureSelectionBox from "./measure-selection-box";
import { InitialFilter, UnitType } from "../../iso/units";
import { assertUnreachable } from "../util/utils";
import { MEASURES } from "../constants";
import {
  SnapshotQuery,
  MeasureStats,
  Dataset,
  DATASETS,
} from "../../iso/protocol";
import * as Filter from "./filters/filter";
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
  filters: Filter.Model[];
  datasets: {
    [dataset in Dataset]: boolean;
  };
  measureSelectionBox: MeasureSelectionBox.Model;
};

export type Msg =
  | { type: "REMOVE_FILTER"; measureId: MeasureId }
  | {
    type: "MEASURE_SELECTOR_MSG";
    msg: MeasureSelectionBox.Msg;
  }
  | {
    type: "TOGGLE_DATASET";
    dataset: Dataset;
    include: boolean;
  }
  | { type: "FILTER_MSG"; measureId: MeasureId; msg: Filter.Msg };

export type InitialFilters = {
  [measureId: MeasureId]: InitialFilter;
};

export class EditQuery {
  state: Model;

  constructor(
    {
      initialFilters,
      measureStats,
    }: {
      initialFilters: InitialFilters;
      measureStats: MeasureStats;
    },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    const filters: Filter.Model[] = [];
    for (const measureIdStr in initialFilters) {
      const measureId = measureIdStr as MeasureId;
      const initialFilter = initialFilters[measureId];
      filters.push(Filter.initModel({ measureId, initialFilter }));
    }

    this.state = {
      measureStats,
      datasets: {
        powercompany: true,
        climbharder: true,
      },
      filters,
      measureSelectionBox: MeasureSelectionBox.initModel({
        measureStats,
      }),
    };
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "REMOVE_FILTER":
        this.state.filters = this.state.filters.filter(
          (f) => f.model.measureId !== msg.measureId,
        );
        break;

      case "MEASURE_SELECTOR_MSG":
        const [newModel] = MeasureSelectionBox.update(
          msg.msg,
          this.state.measureSelectionBox,
        );
        if (newModel.state == "selected") {
          const spec = MEASURES.find((spec) => spec.id == newModel.measureId);
          if (!spec) {
            throw new Error(`Unexpected measureId ${newModel.measureId}`);
          }

          this.state.filters.push(
            Filter.initModel({
              measureId: newModel.measureId,
              initialFilter: spec.initialFilter,
            }),
          );

          this.state.measureSelectionBox = MeasureSelectionBox.initModel({
            measureStats: this.state.measureStats,
          });
        } else {
          this.state.measureSelectionBox = newModel;
        }
        break;

      case "FILTER_MSG":
        const filterIndex = this.state.filters.findIndex(
          (f) => f.model.measureId === msg.measureId,
        );
        const filter = this.state.filters[filterIndex];
        if (!filter) {
          throw new Error(`Unexpected filter id ${msg.measureId}`);
        }
        const [next] = Filter.update(msg.msg, filter);
        this.state.filters[filterIndex] = next;
        break;

      case "TOGGLE_DATASET":
        this.state.datasets[msg.dataset] = msg.include;
        break;

      default:
        assertUnreachable(msg);
    }
  }

  view() {
    const FilterView = ({
      filter,
    }: {
      filter: Filter.Model;
    }) => {
      return (
        <div className={styles.container}>
          <div className={styles.item}>
            <strong>{filter.model.measureId}</strong>(
            {this.state.measureStats[filter.model.measureId] || 0} snapshots)
          </div>
          <div className={styles.item}>
            <Filter.view
              model={filter}
              dispatch={(msg) =>
                this.context.myDispatch({
                  type: "FILTER_MSG",
                  measureId: filter.model.measureId,
                  msg,
                })
              }
            />
          </div>
          <div className={styles.item}>
            <button
              onPointerDown={() =>
                this.context.myDispatch({
                  type: "REMOVE_FILTER",
                  measureId: filter.model.measureId,
                })
              }
            >
              Remove
            </button>
          </div>
        </div>
      );
    };

    return (
      <div>
        {this.state.filters.map((filter) => (
          <FilterView
            key={filter.model.measureId}
            filter={filter}
          />
        ))}
        <MeasureSelectionBox.view
          model={this.state.measureSelectionBox}
          dispatch={(msg) => this.context.myDispatch({ type: "MEASURE_SELECTOR_MSG", msg })}
        />{" "}
        {DATASETS.map((dataset) => (
          <div key={dataset}>
            <label>
              <input
                type="checkbox"
                checked={this.state.datasets[dataset]}
                onChange={(e) =>
                  this.context.myDispatch({
                    type: "TOGGLE_DATASET",
                    dataset: dataset,
                    include: e.target.checked,
                  })
                }
              />{" "}
              {dataset}
            </label>
          </div>
        ))}
      </div>
    );
  }
}

export function generateFiltersMap(model: Model): FilterMapping {
  const filterMapping: FilterMapping = {};
  for (const filter of model.filters) {
    filterMapping[filter.model.measureId] = {
      measureId: filter.model.measureId,
      unit: filter.model.unitToggle.selectedUnit,
    };
  }
  return filterMapping;
}

export function getQuery(filtersModel: Model): {
  body: SnapshotQuery;
  hash: string;
} {
  const query: SnapshotQuery = {
    datasets: {},
    measures: {},
  };
  const queryHashParts: string[] = [];
  filtersModel.filters.forEach((filter) => {
    query.measures[filter.model.measureId] = Filter.getQuery(filter);
    queryHashParts.push(
      filter.model.measureId +
      ":" +
      JSON.stringify(query.measures[filter.model.measureId]),
    );
  });

  for (const dataset in filtersModel.datasets) {
    query.datasets[dataset] = filtersModel.datasets[dataset];
    queryHashParts.push(`dataset:${filtersModel.datasets[dataset]}`);
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
});
