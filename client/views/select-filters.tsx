import React, { Dispatch } from "react";
import { Update, View } from "../tea";
import * as immer from "immer";
import * as MeasureSelectionBox from "./measure-selection-box";
import * as UnitInput from "./unit-input";
import { Identifier } from "../parser/types";
import { MeasureId, MeasureSpec, UnitType, UnitValue } from "../../iso/units";
import lodash from "lodash";
import { Snapshot } from "../types";
import {
  EWBANK,
  FONT,
  FRENCH_SPORT,
  IRCRAGrade,
  VGRADE,
  YDS,
} from "../../iso/grade";
import { assertUnreachable } from "../util/utils";
import { MEASURES } from "../constants";
import { MeasureStats } from "../../iso/protocol";

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

export type InitialMeasures = {
  [measureId: MeasureId]: {
    minValue: UnitValue;
    maxValue: UnitValue;
  };
};

export function initModel({
  initialMeasures,
  measureStats,
}: {
  initialMeasures: InitialMeasures;
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
        measureId: measureId,
        minInput: UnitInput.initModel(measureId, minValue),
        maxInput: UnitInput.initModel(measureId, maxValue),
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
        measureId: filter.state.measureId,
        unit: filter.state.minInput.selectedUnit,
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
                measureId: measureModel.measureId,
                minInput: UnitInput.initModel(
                  measureModel.measureId,
                  spec.defaultMinValue,
                ),
                maxInput: UnitInput.initModel(
                  measureModel.measureId,
                  spec.defaultMaxValue,
                ),
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
                measureId: newModel.measureId,
                minInput: UnitInput.initModel(
                  newModel.measureId,
                  spec.defaultMinValue,
                ),
                maxInput: UnitInput.initModel(
                  newModel.measureId,
                  spec.defaultMaxValue,
                ),
              });
            }
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
        <span>
          min:{" "}
          <UnitInput.UnitInput
            model={filter.state.minInput}
            dispatch={(msg) =>
              dispatch({ type: "MIN_INPUT_MSG", id: filter.id, msg })
            }
          />{" "}
          max:{" "}
          <UnitInput.UnitInput
            model={filter.state.maxInput}
            dispatch={(msg) =>
              dispatch({ type: "MAX_INPUT_MSG", id: filter.id, msg })
            }
          />{" "}
          {filter.state.minInput.possibleUnits.length > 1 && (
            <UnitInput.UnitToggle
              model={filter.state.maxInput}
              dispatch={(msg) => {
                dispatch({ type: "MIN_INPUT_MSG", id: filter.id, msg });
                dispatch({ type: "MAX_INPUT_MSG", id: filter.id, msg });
              }}
            />
          )}
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
