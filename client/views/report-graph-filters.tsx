import React, { Dispatch } from "react";
import { Update, View } from "../tea";
import * as immer from "immer";
import { Identifier } from "../parser/types";
import { MeasureId, UnitType, UnitValue } from "../../iso/units";
import { assertUnreachable } from "../util/utils";
import { MeasureStats } from "../../iso/protocol";
import * as MinMaxFilter from "./min-max-filter";

export type Filter = immer.Immutable<{
  enabled: boolean;
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
}>;

export type Msg =
  | { type: "TOGGLE_FILTER"; measureId: MeasureId; enabled: boolean }
  | { type: "MIN_MAX_FILTER_MSG"; measureId: MeasureId; msg: MinMaxFilter.Msg };

export type InitialMeasures = {
  [measureId: MeasureId]: {
    enabled: boolean;
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
    const { enabled, minValue, maxValue } = initialMeasures[measureId];
    filters.push({
      enabled,
      model: MinMaxFilter.initModel({
        measureId,
        minValue,
        maxValue,
      }),
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
            (f) => f.model.measureId === msg.measureId,
          );
          if (!filter) {
            throw new Error(`Filter not found for measureId ${msg.measureId}`);
          } else {
            filter.enabled = msg.enabled;
          }
        }),
      ];
    case "MIN_MAX_FILTER_MSG":
      return [
        immer.produce(model, (draft) => {
          const filter = draft.filters.find(
            (f) => f.model.measureId === msg.measureId,
          );
          if (!filter) {
            throw new Error(`Filter not found for measureId ${msg.measureId}`);
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
          key={filter.model.measureId}
          filter={filter}
          dispatch={dispatch}
          model={model}
        />
      ))}
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
      style={{
        margin: "10px 0",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <input
        type="checkbox"
        checked={filter.enabled}
        onChange={(e) =>
          dispatch({
            type: "TOGGLE_FILTER",
            measureId: filter.model.measureId,
            enabled: e.target.checked,
          })
        }
      />
      <strong>{filter.model.measureId}</strong>{" "}
      <MinMaxFilter.view
        model={filter.model}
        dispatch={(msg) =>
          dispatch({
            type: "MIN_MAX_FILTER_MSG",
            measureId: filter.model.measureId,
            msg,
          })
        }
      />
    </div>
  );
};
