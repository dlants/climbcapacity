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
  model: Filter.Model;
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
        model: Filter.initModel({ measureId, initialFilter }),
      });
    }
    this.state = { measureStats: initialParams.measureStats, filters };
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "TOGGLE_FILTER":
        const toggleFilter = this.state.filters.find(
          (f) => f.model.model.measureId === msg.measureId,
        );
        if (!toggleFilter) {
          throw new Error(`Filter not found for measureId ${msg.measureId}`);
        } else {
          toggleFilter.enabled = msg.enabled;
        }
        break;
      case "FILTER_MSG":
        const msgFilter = this.state.filters.find(
          (f) => f.model.model.measureId === msg.measureId,
        );
        if (!msgFilter) {
          throw new Error(`Filter not found for measureId ${msg.measureId}`);
        }

        const [next] = Filter.update(msg.msg, msgFilter.model);
        msgFilter.model = next;
        break;
      default:
        assertUnreachable(msg);
    }
  }

  view() {
    const FilterView = ({ filter }: { filter: ToggleableFilter }) => {
      return (
        <div className={styles.filterView}>
          <div className={styles.filterItem}>
            <input
              type="checkbox"
              checked={filter.enabled}
              onChange={(e) =>
                this.context.myDispatch({
                  type: "TOGGLE_FILTER",
                  measureId: filter.model.model.measureId,
                  enabled: e.target.checked,
                })
              }
            />
          </div>
          <div className={styles.filterItem}>
            <strong>{filter.model.model.measureId}</strong>{" "}
          </div>
          <div className={styles.filterItem}>
            <Filter.view
              model={filter.model}
              dispatch={(msg) =>
                this.context.myDispatch({
                  type: "FILTER_MSG",
                  measureId: filter.model.model.measureId,
                  msg,
                })
              }
            />
          </div>
        </div>
      );
    };

    return (
      <div>
        {this.state.filters.map((filter) => (
          <FilterView
            key={filter.model.model.measureId}
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
