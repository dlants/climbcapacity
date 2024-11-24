import React, { Dispatch } from "react";
import { Update, View } from "../tea";
import * as immer from "immer";
import { Identifier } from "../parser/types";
import { InitialFilter, UnitType } from "../../iso/units";
import { assertUnreachable } from "../util/utils";
import { MeasureStats } from "../../iso/protocol";
import * as Filter from "./filters/filter";
import { MeasureId } from "../../iso/measures";
import * as typestyle from "typestyle";
import * as csstips from "csstips";

export type ToggleableFilter = immer.Immutable<{
  enabled: boolean;
  model: Filter.Model;
}>;

export type FilterMapping = {
  [id: Identifier]: {
    measureId: MeasureId;
    unit: UnitType;
  };
};

export type Model = immer.Immutable<{
  measureStats: MeasureStats;
  filters: ToggleableFilter[];
}>;

export type Msg =
  | { type: "TOGGLE_FILTER"; measureId: MeasureId; enabled: boolean }
  | { type: "FILTER_MSG"; measureId: MeasureId; msg: Filter.Msg };

export type InitialFilters = {
  [measureId: MeasureId]: InitialFilter & { enabled: boolean };
};

export function initModel({
  initialFilters,
  measureStats,
}: {
  initialFilters: InitialFilters;
  measureStats: MeasureStats;
}): Model {
  const filters: ToggleableFilter[] = [];
  for (const measureIdStr in initialFilters) {
    const measureId = measureIdStr as MeasureId;
    const initialFilter = initialFilters[measureId];
    filters.push({
      enabled: initialFilter.enabled,
      model: Filter.initModel(initialFilter),
    });
  }
  return { measureStats, filters };
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "TOGGLE_FILTER":
      return [
        immer.produce(model, (draft) => {
          const filter = draft.filters.find(
            (f) => f.model.model.measureId === msg.measureId,
          );
          if (!filter) {
            throw new Error(`Filter not found for measureId ${msg.measureId}`);
          } else {
            filter.enabled = msg.enabled;
          }
        }),
      ];
    case "FILTER_MSG":
      return [
        immer.produce(model, (draft) => {
          const filter = draft.filters.find(
            (f) => f.model.model.measureId === msg.measureId,
          );
          if (!filter) {
            throw new Error(`Filter not found for measureId ${msg.measureId}`);
          }

          const [next] = Filter.update(msg.msg, filter.model);
          filter.model = immer.castDraft(next);
        }),
      ];
    default:
      assertUnreachable(msg);
  }
};

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div>
      {model.filters.map((filter) => (
        <FilterView
          key={filter.model.model.measureId}
          filter={filter}
          dispatch={dispatch}
          model={model}
        />
      ))}
    </div>
  );
};

const styles = typestyle.stylesheet({
  filterView: {
    ...csstips.horizontal,
    margin: "10px 0",
    gap: "8px",
    flexWrap: "wrap",
  },
  filterItem: {
    ...csstips.content,
  },
});

const FilterView = ({
  model,
  filter,
  dispatch,
}: {
  model: Model;
  filter: ToggleableFilter;
  dispatch: Dispatch<Msg>;
}) => {
  return (
    <div className={styles.filterView}>
      <div className={styles.filterItem}>
        <input
          type="checkbox"
          checked={filter.enabled}
          onChange={(e) =>
            dispatch({
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
            dispatch({
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
