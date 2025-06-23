import React, { Dispatch } from "react";
import { Identifier } from "../../parser/types";
import { InitialFilter, UnitType } from "../../../iso/units";
import { assertUnreachable } from "../../util/utils";
import { MeasureStats } from "../../../iso/protocol";
import * as Filter from "../filters/filter";
import { MeasureId } from "../../../iso/measures";
import * as typestyle from "typestyle";
import * as csstips from "csstips";
import * as csx from "csx";

export type ToggleableFilter = {
  enabled: boolean;
  filter: Filter.Filter;
};

export type FilterMapping = {
  [id: Identifier]: {
    measureId: MeasureId;
    unit: UnitType;
  };
};

export type Model = {
  measureStats: MeasureStats;
  filters: ToggleableFilter[];
};

export type Msg =
  | { type: "TOGGLE_FILTER"; measureId: MeasureId; enabled: boolean }
  | { type: "FILTER_MSG"; measureId: MeasureId; msg: Filter.Msg };

export type InitialFilters = {
  [measureId: MeasureId]: InitialFilter & { enabled: boolean };
};

export class ReportCardFilter {
  state: Model;

  constructor(
    initialParams: {
      initialFilters: InitialFilters;
      measureStats: MeasureStats;
    },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    const filters: ToggleableFilter[] = [];
    for (const measureIdStr in initialParams.initialFilters) {
      const measureId = measureIdStr as MeasureId;
      const initialFilter = initialParams.initialFilters[measureId];
      filters.push({
        enabled: initialFilter.enabled,
        filter: new Filter.Filter(
          { measureId, initialFilter },
          { myDispatch: (msg) => this.context.myDispatch({ type: "FILTER_MSG", measureId, msg }) }
        ),
      });
    }
    this.state = { measureStats: initialParams.measureStats, filters };
  }

  private getMeasureId(filter: Filter.Filter): MeasureId {
    switch (filter.state.type) {
      case "minmax":
        return filter.state.model.state.measureId;
      case "toggle":
        return filter.state.model.state.measureId;
      default:
        assertUnreachable(filter.state);
    }
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "TOGGLE_FILTER":
        const toggleFilter = this.state.filters.find(
          (f) => this.getMeasureId(f.filter) === msg.measureId,
        );
        if (!toggleFilter) {
          throw new Error(`Filter not found for measureId ${msg.measureId}`);
        } else {
          toggleFilter.enabled = msg.enabled;
        }
        break;
      case "FILTER_MSG":
        const msgFilter = this.state.filters.find(
          (f) => this.getMeasureId(f.filter) === msg.measureId,
        );
        if (!msgFilter) {
          throw new Error(`Filter not found for measureId ${msg.measureId}`);
        }

        msgFilter.filter.update(msg.msg);
        break;
      default:
        assertUnreachable(msg);
    }
  }

  view() {
    const FilterView = ({ filter }: { filter: ToggleableFilter }) => {
      const measureId = this.getMeasureId(filter.filter);
      return (
        <div className={styles.filterView}>
          <div className={styles.filterItem}>
            <input
              type="checkbox"
              checked={filter.enabled}
              onChange={(e) =>
                this.context.myDispatch({
                  type: "TOGGLE_FILTER",
                  measureId,
                  enabled: e.target.checked,
                })
              }
            />
          </div>
          <div className={styles.filterItem}>
            <strong>{measureId}</strong>{" "}
          </div>
          <div className={styles.filterItem}>
            {filter.filter.view()}
          </div>
        </div>
      );
    };

    return (
      <div>
        {this.state.filters.map((filter) => (
          <FilterView
            key={this.getMeasureId(filter.filter)}
            filter={filter}
          />
        ))}
      </div>
    );
  }
}

const styles = typestyle.stylesheet({
  filterView: {
    width: csx.percent(100),
    margin: "10px 0",
    gap: "8px",
    $nest: {
      "@media (min-width: 800px)": {
        ...csstips.horizontal,
        ...csstips.wrap,
      },
      "@media (max-width: 800px)": {
        ...csstips.vertical,
      },
    },
  },
  filterItem: {
    ...csstips.content,
    maxWidth: csx.percent(100),
  },
});
