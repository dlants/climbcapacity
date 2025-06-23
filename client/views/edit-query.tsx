import React, { Dispatch } from "react";
import { MeasureSelectionBox } from "./measure-selection-box";
import { InitialFilter, UnitType } from "../../iso/units";
import { assertUnreachable } from "../util/utils";
import { MEASURES } from "../constants";
import {
  SnapshotQuery,
  MeasureStats,
  Dataset,
  DATASETS,
} from "../../iso/protocol";
import { Filter } from "./filters/filter";
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
  filters: Filter[];
  datasets: {
    [dataset in Dataset]: boolean;
  };
  measureSelectionBox: MeasureSelectionBox;
};

export type Msg =
  | { type: "REMOVE_FILTER"; measureId: MeasureId }
  | {
    type: "MEASURE_SELECTOR_MSG";
    msg: any;
  }
  | {
    type: "TOGGLE_DATASET";
    dataset: Dataset;
    include: boolean;
  }
  | { type: "FILTER_MSG"; measureId: MeasureId; msg: any };

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
    const filters: Filter[] = [];
    for (const measureIdStr in initialFilters) {
      const measureId = measureIdStr as MeasureId;
      const initialFilter = initialFilters[measureId];
      filters.push(new Filter(
        { measureId, initialFilter },
        { myDispatch: (msg) => this.context.myDispatch({ type: "FILTER_MSG", measureId, msg }) }
      ));
    }

    this.state = {
      measureStats,
      datasets: {
        powercompany: true,
        climbharder: true,
      },
      filters,
      measureSelectionBox: new MeasureSelectionBox(
        { measureStats },
        { myDispatch: (msg) => this.context.myDispatch({ type: "MEASURE_SELECTOR_MSG", msg }) }
      ),
    };
  }

  getFilterMeasureId(filter: Filter): MeasureId {
    switch (filter.state.type) {
      case "minmax":
        return filter.state.model.state.measureId;
      case "toggle":
        return filter.state.model.state.measureId;
      default:
        throw new Error("Unknown filter type");
    }
  }

  getFilterUnit(filter: Filter): UnitType {
    return filter.getUnit();
  }

  getFilterQuery(filter: Filter) {
    return filter.getQuery();
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "REMOVE_FILTER":
        this.state.filters = this.state.filters.filter(
          (f) => this.getFilterMeasureId(f) !== msg.measureId,
        );
        break;

      case "MEASURE_SELECTOR_MSG":
        this.state.measureSelectionBox.update(msg.msg);
        if (this.state.measureSelectionBox.state.state == "selected") {
          const measureId = this.state.measureSelectionBox.state.measureId;
          const spec = MEASURES.find((spec) => spec.id == measureId);
          if (!spec) {
            throw new Error(`Unexpected measureId ${measureId}`);
          }

          this.state.filters.push(
            new Filter(
              {
                measureId: measureId,
                initialFilter: spec.initialFilter,
              },
              { myDispatch: (msg) => this.context.myDispatch({ type: "FILTER_MSG", measureId, msg }) }
            ),
          );

          this.state.measureSelectionBox = new MeasureSelectionBox(
            { measureStats: this.state.measureStats },
            { myDispatch: (msg) => this.context.myDispatch({ type: "MEASURE_SELECTOR_MSG", msg }) }
          );
        }
        break;

      case "FILTER_MSG":
        const filter = this.state.filters.find(
          (f) => this.getFilterMeasureId(f) === msg.measureId,
        );
        if (!filter) {
          throw new Error(`Unexpected filter id ${msg.measureId}`);
        }
        filter.update(msg.msg);
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
      filter: Filter;
    }) => {
      const measureId = this.getFilterMeasureId(filter);
      return (
        <div className={styles.container}>
          <div className={styles.item}>
            <strong>{measureId}</strong>(
            {this.state.measureStats[measureId] || 0} snapshots)
          </div>
          <div className={styles.item}>
            {filter.view()}
          </div>
          <div className={styles.item}>
            <button
              onPointerDown={() =>
                this.context.myDispatch({
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
    };

    return (
      <div>
        {this.state.filters.map((filter) => (
          <FilterView
            key={this.getFilterMeasureId(filter)}
            filter={filter}
          />
        ))}
        {this.state.measureSelectionBox.view()}
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

export function generateFiltersMap(editQuery: EditQuery): FilterMapping {
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

export function getQuery(editQuery: EditQuery): {
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
      measureId +
      ":" +
      JSON.stringify(query.measures[measureId]),
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
});
