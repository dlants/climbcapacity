import React from "react";
import * as MinMaxFilter from "./min-max-filter";
import * as ToggleFilter from "./toggle-filter";
import { InitialFilter, MeasureId, UnitValue } from "../../../iso/units";
import { assertUnreachable } from "../../util/utils";

export type Model =
  | {
      type: "minmax";
      model: MinMaxFilter.Model;
    }
  | {
      type: "toggle";
      model: ToggleFilter.Model;
    };

export function getUnit(model: Model) {
  switch (model.type) {
    case "minmax":
      return model.model.unitToggle.selectedUnit;

    case "toggle":
      return model.model.unitToggle.selectedUnit;
  }
}

export function filterApplies(model: Model, value: UnitValue) {
  switch (model.type) {
    case "minmax":
      return MinMaxFilter.filterApplies(model.model, value);

    case "toggle":
      return ToggleFilter.filterApplies(model.model, value);

    default:
      assertUnreachable(model);
  }
}

export function getQuery(model: Model) {
  switch (model.type) {
    case "minmax":
      return MinMaxFilter.getQuery(model.model);

    case "toggle":
      return ToggleFilter.getQuery(model.model);

    default:
      assertUnreachable(model);
  }
}

export type Msg =
  | { type: "MINMAX_FILTER_MSG"; msg: MinMaxFilter.Msg }
  | { type: "TOGGLE_FILTER_MSG"; msg: ToggleFilter.Msg };

export function initModel(initialFilter: InitialFilter): Model {
  switch (initialFilter.type) {
    case "minmax":
      return { type: "minmax", model: MinMaxFilter.initModel(initialFilter) };

    case "toggle":
      return { type: "toggle", model: ToggleFilter.initModel(initialFilter) };

    default:
      assertUnreachable(initialFilter);
  }
}

export const update = (msg: Msg, model: Model) => {
  switch (model.type) {
    case "minmax":
      if (msg.type !== "MINMAX_FILTER_MSG") {
        throw new Error("Unexpected message type");
      }
      const [minMaxModel] = MinMaxFilter.update(msg.msg, model.model);
      return [{ ...model, model: minMaxModel }];

    case "toggle":
      if (msg.type !== "TOGGLE_FILTER_MSG") {
        throw new Error("Unexpected message type");
      }
      const [toggleModel] = ToggleFilter.update(msg.msg, model.model);
      return [{ ...model, model: toggleModel }];
  }
};

export const view = ({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: (msg: Msg) => void;
}) => {
  switch (model.type) {
    case "minmax":
      return (
        <MinMaxFilter.view
          model={model.model}
          dispatch={(msg) => dispatch({ type: "MINMAX_FILTER_MSG", msg })}
        />
      );

    case "toggle":
      return (
        <ToggleFilter.view
          model={model.model}
          dispatch={(msg) => dispatch({ type: "TOGGLE_FILTER_MSG", msg })}
        />
      );
  }
};
