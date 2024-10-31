import React from "react";
import { Update, View } from "../tea";
import * as immer from "immer";
import * as MeasureSelectionBox from "./measure-selection-box";
import { Identifier } from "../parser/types";
import { MeasureId } from "../../iso/protocol";

export type Filter = {
  id: Identifier;
  measureSelector: MeasureSelectionBox.Model;
  minStr: string;
  min: number | undefined;
  maxStr: string;
  max: number | undefined;
};

export type FilterMapping = {
  [id: Identifier]: MeasureId;
};

export type Model = immer.Immutable<{
  filters: Filter[];
}>;

export type Msg =
  | { type: "ADD_FILTER" }
  | { type: "REMOVE_FILTER"; id: string }
  | { type: "MEASURE_SELECTOR_MSG"; id: string; msg: MeasureSelectionBox.Msg }
  | { type: "UPDATE_MIN"; id: string; value: string }
  | { type: "UPDATE_MAX"; id: string; value: string };

export function initModel(): Model {
  return { filters: [] };
}

export function generateFiltersMap(model: Model): FilterMapping {
  const filterMapping: FilterMapping = {};
  for (const filter of model.filters) {
    if (filter.measureSelector.state == "selected") {
      filterMapping[filter.id] = filter.measureSelector.measureId;
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
          draft.filters.push({
            id,
            measureSelector: immer.castDraft(MeasureSelectionBox.initModel(id)),
            minStr: "",
            min: undefined,
            maxStr: "",
            max: undefined,
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
              filter.measureSelector,
            );
            filter.measureSelector = immer.castDraft(newModel);
          }
        }),
      ];

    case "UPDATE_MIN":
      return [
        immer.produce(model, (draft) => {
          const filter = draft.filters.find((f) => f.id === msg.id);
          if (filter) {
            filter.minStr = msg.value;
            filter.min = msg.value.length ? Number(msg.value) : undefined;
          }
        }),
      ];

    case "UPDATE_MAX":
      return [
        immer.produce(model, (draft) => {
          const filter = draft.filters.find((f) => f.id === msg.id);
          if (filter) {
            filter.maxStr = msg.value;
            filter.max = msg.value.length ? Number(msg.value) : undefined;
          }
        }),
      ];
  }
};

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div>
      <button onClick={() => dispatch({ type: "ADD_FILTER" })}>
        Add Filter
      </button>

      {model.filters.map((filter) => (
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
            model={filter.measureSelector}
            dispatch={(msg) =>
              dispatch({ type: "MEASURE_SELECTOR_MSG", id: filter.id, msg })
            }
          />{" "}
          min:{" "}
          <input
            type="number"
            value={filter.minStr}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_MIN",
                id: filter.id,
                value: e.target.value,
              })
            }
          />{" "}
          max:{" "}
          <input
            type="number"
            value={filter.maxStr}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_MAX",
                id: filter.id,
                value: e.target.value,
              })
            }
          />{" "}
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
      ))}
    </div>
  );
};
