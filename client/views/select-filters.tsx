import React, { Dispatch } from "react";
import { Update, View } from "../tea";
import * as immer from "immer";
import * as MeasureSelectionBox from "./measure-selection-box";
import { Identifier } from "../parser/types";
import { MeasureId, MeasureSpec, UnitType, UnitValue } from "../../iso/units";
import lodash from "lodash";
import { assertUnreachable } from "../util/utils";
import { MEASURES } from "../constants";
import { MeasureStats } from "../../iso/protocol";
import * as MinMaxFilter from "./min-max-filter";

export type Filter = immer.Immutable<{
  id: Identifier;
  model: MinMaxFilter.Model;
}>;

export type FilterMapping = {
  [id: Identifier]: {
    measureId: MeasureId;
    unit: UnitType;
  };
};

export type Model = immer.Immutable<{
  measureStats: MeasureStats;
  filters: Filter[];
  measureSelectionBox: MeasureSelectionBox.Model;
}>;

export type Msg =
  | { type: "ADD_FILTER"; measureId: MeasureId }
  | { type: "REMOVE_FILTER"; id: Identifier }
  | {
      type: "MEASURE_SELECTOR_MSG";
      msg: MeasureSelectionBox.Msg;
    }
  | { type: "MIN_MAX_FILTER_MSG"; id: Identifier; msg: MinMaxFilter.Msg };

export type InitialFilters = {
  [measureId: MeasureId]: {
    minValue: UnitValue;
    maxValue: UnitValue;
  };
};

export function initModel({
  initialFilters: initialMeasures,
  measureStats,
}: {
  initialFilters: InitialFilters;
  measureStats: MeasureStats;
}): Model {
  const filters: Filter[] = [];
  for (const measureIdStr in initialMeasures) {
    const measureId = measureIdStr as MeasureId;
    const { minValue, maxValue } = initialMeasures[measureId];
    filters.push({
      id: getNextId({ filters }),
      model: MinMaxFilter.initModel({
        measureId,
        minValue,
        maxValue,
      }),
    });
  }
  return {
    measureStats,
    filters,
    measureSelectionBox: MeasureSelectionBox.initModel({
      measureStats,
      id: getNextId({ filters }),
    }),
  };
}

export function generateFiltersMap(model: Model): FilterMapping {
  const filterMapping: FilterMapping = {};
  for (const filter of model.filters) {
    filterMapping[filter.id] = {
      measureId: filter.model.measureId,
      unit: filter.model.minInput.selectedUnit,
    };
  }
  return filterMapping;
}

function nextChar(char: string) {
  return String.fromCharCode(char.charCodeAt(0) + 1);
}

function getNextId(model: Pick<Model, "filters">): Identifier {
  const ids = new Set<string>(model.filters.map((m) => m.id));
  let id = "a";

  while (true) {
    if (!ids.has(id)) {
      return id as Identifier;
    }

    const lastchar = id.slice(-1);
    if (lastchar == "z") {
      id = id.slice(0, -1) + "aa";
    } else {
      id = id.slice(0, -1) + nextChar(lastchar);
    }
  }
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "ADD_FILTER":
      return [
        immer.produce(model, (draft) => {
          const spec = MEASURES.find((spec) => spec.id == msg.measureId);
          if (!spec) {
            throw new Error(`Unexpected measureId ${msg.measureId}`);
          }

          draft.filters.push({
            id: model.measureSelectionBox.id as Identifier,
            model: immer.castDraft(
              MinMaxFilter.initModel({
                measureId: msg.measureId,
                minValue: spec.defaultMinValue,
                maxValue: spec.defaultMaxValue,
              }),
            ),
          });

          const id = getNextId(draft);
          draft.measureSelectionBox = immer.castDraft(
            MeasureSelectionBox.initModel({
              measureStats: model.measureStats,
              id,
            }),
          );
        }),
      ];

    case "REMOVE_FILTER":
      return [
        immer.produce(model, (draft) => {
          draft.filters = draft.filters.filter((f) => f.id !== msg.id);
        }),
      ];

    case "MEASURE_SELECTOR_MSG":
      return [
        immer.produce(model, (draft) => {
          const [newModel] = MeasureSelectionBox.update(
            msg.msg,
            model.measureSelectionBox,
          );
          draft.measureSelectionBox = immer.castDraft(newModel);
        }),
      ];

    case "MIN_MAX_FILTER_MSG":
      return [
        immer.produce(model, (draft) => {
          const filter = draft.filters.find((f) => f.id === msg.id);
          if (!filter) {
            throw new Error(`Unexpected filter id ${msg.id}`);
          }
          const [next] = MinMaxFilter.update(msg.msg, filter.model);
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
          key={filter.id}
          filter={filter}
          dispatch={dispatch}
          model={model}
        />
      ))}
      <MeasureSelectionBox.view
        model={model.measureSelectionBox}
        dispatch={(msg) => dispatch({ type: "MEASURE_SELECTOR_MSG", msg })}
      />{" "}
      <AddFilterButton model={model} dispatch={dispatch} />
    </div>
  );
};

export const AddFilterButton: View<Msg, Model> = ({ model, dispatch }) => {
  if (model.measureSelectionBox.state == "selected") {
    const measureId = model.measureSelectionBox.measureId;
    return (
      <button onClick={() => dispatch({ type: "ADD_FILTER", measureId })}>
        Add Filter
      </button>
    );
  } else {
    return <button disabled>Add Filter</button>;
  }
};

const FilterView = ({
  model,
  filter,
  dispatch,
}: {
  model: Model;
  filter: Filter;
  dispatch: Dispatch<Msg>;
}) => {
  return (
    <div
      key={filter.id}
      style={{
        margin: "10px 0",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <strong>{filter.model.measureId}</strong>(
      {model.measureStats.stats[filter.model.measureId] || 0} snapshots)
      <MinMaxFilter.view
        model={filter.model}
        dispatch={(msg) =>
          dispatch({ type: "MIN_MAX_FILTER_MSG", id: filter.id, msg })
        }
      />
      <button
        onClick={() =>
          dispatch({
            type: "REMOVE_FILTER",
            id: filter.id,
          })
        }
      >
        Remove
      </button>
    </div>
  );
};
