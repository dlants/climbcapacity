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
  state:
    | {
        state: "typing";
        query: string;
        measures: MeasureSpec[];
      }
    | {
        state: "selected";
        model: MinMaxFilter.Model;
      };
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
}>;

function castToSelectionModel({
  filter,
  measureStats,
}: {
  filter: immer.Immutable<Filter>;
  measureStats: MeasureStats;
}): MeasureSelectionBox.Model {
  return filter.state.state == "typing"
    ? {
        id: filter.id,
        state: "typing",
        measureStats,
        query: filter.state.query,
        measures: filter.state.measures,
      }
    : {
        id: filter.id,
        measureStats,
        state: "selected",
        measureId: filter.state.model.measureId,
      };
}

export type Msg =
  | { type: "ADD_FILTER" }
  | { type: "REMOVE_FILTER"; id: Identifier }
  | {
      type: "MEASURE_SELECTOR_MSG";
      id: Identifier;
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
      state: {
        state: "selected",
        model: MinMaxFilter.initModel({
          measureId,
          minValue,
          maxValue,
        }),
      },
    });
  }
  return { measureStats, filters };
}

export function generateFiltersMap(model: Model): FilterMapping {
  const filterMapping: FilterMapping = {};
  for (const filter of model.filters) {
    if (filter.state.state == "selected") {
      filterMapping[filter.id] = {
        measureId: filter.state.model.measureId,
        unit: filter.state.model.minInput.selectedUnit,
      };
    }
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
          const id = getNextId(draft);
          const measureModel = MeasureSelectionBox.initModel({
            measureStats: model.measureStats,
            id,
          });
          if (measureModel.state == "typing") {
            draft.filters.push({
              id,
              state: immer.castDraft({
                state: "typing",
                query: measureModel.query,
                measures: measureModel.measures,
              }),
            });
          } else {
            const spec = MEASURES.find(
              (spec) => spec.id == measureModel.measureId,
            );
            if (!spec) {
              throw new Error(`Unexpected measureId ${measureModel.measureId}`);
            }

            draft.filters.push({
              id,
              state: immer.castDraft({
                state: "selected",
                model: MinMaxFilter.initModel({
                  measureId: measureModel.measureId,
                  minValue: spec.defaultMinValue,
                  maxValue: spec.defaultMaxValue,
                }),
              }),
            });
          }
          draft.filters = lodash.sortBy(draft.filters, (f) => f.id);
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
          const filter = draft.filters.find((f) => f.id === msg.id);
          if (filter) {
            const [newModel] = MeasureSelectionBox.update(
              msg.msg,
              castToSelectionModel({
                filter,
                measureStats: model.measureStats,
              }),
            );
            if (newModel.state == "typing") {
              filter.state = immer.castDraft({
                state: "typing",
                query: newModel.query,
                measures: newModel.measures,
              });
            } else {
              const spec = MEASURES.find(
                (spec) => spec.id == newModel.measureId,
              );
              if (!spec) {
                throw new Error(`Unexpected measureId ${newModel.measureId}`);
              }

              filter.state = immer.castDraft({
                state: "selected",
                model: MinMaxFilter.initModel({
                  measureId: newModel.measureId,
                  minValue: spec.defaultMinValue,
                  maxValue: spec.defaultMaxValue,
                }),
              });
            }
          }
        }),
      ];

    case "MIN_MAX_FILTER_MSG":
      return [
        immer.produce(model, (draft) => {
          const filter = draft.filters.find((f) => f.id === msg.id);
          if (!(filter && filter.state.state == "selected")) {
            throw new Error(
              `Unexpected filter state when handling input msg ${filter?.state.state}`,
            );
          }

          const [next] = MinMaxFilter.update(msg.msg, filter.state.model);
          filter.state.model = immer.castDraft(next);
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
      <button onClick={() => dispatch({ type: "ADD_FILTER" })}>
        Add Filter
      </button>
    </div>
  );
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
      <strong>[{filter.id}]</strong>{" "}
      <MeasureSelectionBox.view
        model={castToSelectionModel({
          filter,
          measureStats: model.measureStats,
        })}
        dispatch={(msg) =>
          dispatch({ type: "MEASURE_SELECTOR_MSG", id: filter.id, msg })
        }
      />{" "}
      {filter.state.state == "selected" && (
        <MinMaxFilter.view
          model={filter.state.model}
          dispatch={(msg) =>
            dispatch({ type: "MIN_MAX_FILTER_MSG", id: filter.id, msg })
          }
        />
      )}
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
