import React, { Dispatch } from "react";
import { Update, View } from "../tea";
import * as immer from "immer";
import * as MeasureSelectionBox from "./measure-selection-box";
import * as UnitInput from "./unit-input";
import { Identifier } from "../parser/types";
import { MeasureId, MeasureSpec } from "../../iso/units";

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
        measureId: MeasureId;
        minInput: UnitInput.Model;
        maxInput: UnitInput.Model;
      };
}>;

export type FilterMapping = {
  [id: Identifier]: MeasureId;
};

export type Model = immer.Immutable<{
  filters: Filter[];
}>;

function castToSelectionModel(
  filter: immer.Immutable<Filter>,
): MeasureSelectionBox.Model {
  return filter.state.state == "typing"
    ? {
        id: filter.id,
        state: "typing",
        query: filter.state.query,
        measures: filter.state.measures,
      }
    : {
        id: filter.id,
        state: "selected",
        measureId: filter.state.measureId,
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
  | { type: "MAX_INPUT_MSG"; id: Identifier; msg: UnitInput.Msg }
  | { type: "MIN_INPUT_MSG"; id: Identifier; msg: UnitInput.Msg };

export function initModel(): Model {
  return { filters: [] };
}

export function generateFiltersMap(model: Model): FilterMapping {
  const filterMapping: FilterMapping = {};
  for (const filter of model.filters) {
    if (filter.state.state == "selected") {
      filterMapping[filter.id] = filter.state.measureId;
    }
  }
  return filterMapping;
}

function nextChar(char: string) {
  return String.fromCharCode(char.charCodeAt(0) + 1);
}

function getNextId(model: Model): Identifier {
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
          const measureModel = MeasureSelectionBox.initModel(id);
          draft.filters.push({
            id,
            state: immer.castDraft(
              measureModel.state == "typing"
                ? {
                    state: "typing",
                    query: measureModel.query,
                    measures: measureModel.measures,
                  }
                : {
                    state: "selected",
                    measureId: measureModel.measureId,
                    minInput: UnitInput.initModel(measureModel.measureId),
                    maxInput: UnitInput.initModel(measureModel.measureId),
                  },
            ),
          });
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
              castToSelectionModel(filter),
            );
            filter.state = immer.castDraft(
              newModel.state == "typing"
                ? {
                    state: "typing",
                    query: newModel.query,
                    measures: newModel.measures,
                  }
                : {
                    state: "selected",
                    measureId: newModel.measureId,
                    minInput: UnitInput.initModel(newModel.measureId),
                    maxInput: UnitInput.initModel(newModel.measureId),
                  },
            );
          }
        }),
      ];

    case "MIN_INPUT_MSG":
      return [
        immer.produce(model, (draft) => {
          const filter = draft.filters.find((f) => f.id === msg.id);
          if (!(filter && filter.state.state == "selected")) {
            throw new Error(
              `Unexpected filter state when handling input msg ${filter?.state.state}`,
            );
          }

          const [newModel] = UnitInput.update(msg.msg, filter.state.minInput);
          filter.state.minInput = immer.castDraft(newModel);
        }),
      ];

    case "MAX_INPUT_MSG":
      return [
        immer.produce(model, (draft) => {
          const filter = draft.filters.find((f) => f.id === msg.id);
          if (!(filter && filter.state.state == "selected")) {
            throw new Error(
              `Unexpected filter state when handling input msg ${filter?.state.state}`,
            );
          }

          const [newModel] = UnitInput.update(msg.msg, filter.state.maxInput);
          filter.state.maxInput = immer.castDraft(newModel);
        }),
      ];
  }
};

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div>
      {model.filters.map((filter) => (
        <FilterView filter={filter} dispatch={dispatch} />
      ))}
      <button onClick={() => dispatch({ type: "ADD_FILTER" })}>
        Add Filter
      </button>
    </div>
  );
};

const FilterView = ({
  filter,
  dispatch,
}: {
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
        model={castToSelectionModel(filter)}
        dispatch={(msg) =>
          dispatch({ type: "MEASURE_SELECTOR_MSG", id: filter.id, msg })
        }
      />{" "}
      {filter.state.state == "selected" && (
        <span>
          min:{" "}
          <UnitInput.view
            model={filter.state.minInput}
            dispatch={(msg) =>
              dispatch({ type: "MIN_INPUT_MSG", id: filter.id, msg })
            }
          />
          max:{" "}
          <UnitInput.view
            model={filter.state.maxInput}
            dispatch={(msg) =>
              dispatch({ type: "MAX_INPUT_MSG", id: filter.id, msg })
            }
          />{" "}
        </span>
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
