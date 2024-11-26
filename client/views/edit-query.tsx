import React, { Dispatch } from "react";
import { Update, View } from "../tea";
import * as immer from "immer";
import * as MeasureSelectionBox from "./measure-selection-box";
import { InitialFilter, UnitType } from "../../iso/units";
import { assertUnreachable } from "../util/utils";
import { MEASURES } from "../constants";
import { MeasureStats } from "../../iso/protocol";
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

export type Model = immer.Immutable<{
  measureStats: MeasureStats;
  filters: Filter.Model[];
  measureSelectionBox: MeasureSelectionBox.Model;
}>;

export type Msg =
  | { type: "REMOVE_FILTER"; measureId: MeasureId }
  | {
      type: "MEASURE_SELECTOR_MSG";
      msg: MeasureSelectionBox.Msg;
    }
  | { type: "FILTER_MSG"; measureId: MeasureId; msg: Filter.Msg };

export type InitialFilters = {
  [measureId: MeasureId]: InitialFilter;
};

export function initModel({
  initialFilters,
  measureStats,
}: {
  initialFilters: InitialFilters;
  measureStats: MeasureStats;
}): Model {
  const filters: Filter.Model[] = [];
  for (const measureIdStr in initialFilters) {
    const measureId = measureIdStr as MeasureId;
    const initialFilter = initialFilters[measureId];
    filters.push(Filter.initModel({ measureId, initialFilter }));
  }

  return {
    measureStats,
    filters,
    measureSelectionBox: MeasureSelectionBox.initModel({
      measureStats,
    }),
  };
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

function nextChar(char: string) {
  return String.fromCharCode(char.charCodeAt(0) + 1);
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "REMOVE_FILTER":
      return [
        immer.produce(model, (draft) => {
          draft.filters = draft.filters.filter(
            (f) => f.model.measureId !== msg.measureId,
          );
        }),
      ];

    case "MEASURE_SELECTOR_MSG":
      return [
        immer.produce(model, (draft) => {
          const [newModel] = MeasureSelectionBox.update(
            msg.msg,
            model.measureSelectionBox,
          );
          if (newModel.state == "selected") {
            const spec = MEASURES.find((spec) => spec.id == newModel.measureId);
            if (!spec) {
              throw new Error(`Unexpected measureId ${newModel.measureId}`);
            }

            draft.filters.push(
              immer.castDraft(
                Filter.initModel({
                  measureId: newModel.measureId,
                  initialFilter: spec.initialFilter,
                }),
              ),
            );

            draft.measureSelectionBox = immer.castDraft(
              MeasureSelectionBox.initModel({
                measureStats: model.measureStats,
              }),
            );
          } else {
            draft.measureSelectionBox = immer.castDraft(newModel);
          }
        }),
      ];

    case "FILTER_MSG":
      return [
        immer.produce(model, (draft) => {
          const filterIndex = draft.filters.findIndex(
            (f) => f.model.measureId === msg.measureId,
          );
          const filter = draft.filters[filterIndex];
          if (!filter) {
            throw new Error(`Unexpected filter id ${msg.measureId}`);
          }
          const [next] = Filter.update(msg.msg, filter);
          draft.filters[filterIndex] = immer.castDraft(next);
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
          key={filter.model.measureId}
          filter={filter}
          dispatch={dispatch}
          model={model}
        />
      ))}
      <MeasureSelectionBox.view
        model={model.measureSelectionBox}
        dispatch={(msg) => dispatch({ type: "MEASURE_SELECTOR_MSG", msg })}
      />{" "}
    </div>
  );
};

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

const FilterView = ({
  model,
  filter,
  dispatch,
}: {
  model: Model;
  filter: Filter.Model;
  dispatch: Dispatch<Msg>;
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.item}>
        <strong>{filter.model.measureId}</strong>(
        {model.measureStats[filter.model.measureId] || 0} snapshots)
      </div>
      <div className={styles.item}>
        <Filter.view
          model={filter}
          dispatch={(msg) =>
            dispatch({
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
            dispatch({
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
