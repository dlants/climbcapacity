import React from "react";
import { Update, Thunk, View, wrapThunk } from "../tea";
import { assertUnreachable } from "../util/utils";
import * as immer from "immer";
import * as LoadedReportCard from "../views/loaded-report-card";
import { MeasureStats } from "../../iso/protocol";
import { InitialFilters } from "../views/select-filters";
import { INPUT_MEASURES } from "../../iso/measures";
const produce = immer.produce;

export type Model = {
  measureStats: MeasureStats;
  model: LoadedReportCard.Model;
};

export type Msg = {
  type: "LOADED_MSG";
  msg: LoadedReportCard.Msg;
};

export function initModel({
  measureStats,
}: {
  measureStats: MeasureStats;
}): [Model] | [Model, Thunk<Msg> | undefined] {
  const initialFilters: InitialFilters = {};
  for (const measure of INPUT_MEASURES) {
    const count = measureStats.stats[measure.id] || 0;
    if (count < 100) {
      continue;
    }
    initialFilters[measure.id] = {
      minValue: measure.defaultMinValue,
      maxValue: measure.defaultMaxValue,
    };
  }

  const [loadedModel, loadedThunk] = LoadedReportCard.initModel({
    initialFilters,
    measureStats: measureStats,
    mySnapshot: undefined,
  });
  return [
    {
      measureStats,
      model: loadedModel,
    },
    wrapThunk("LOADED_MSG", loadedThunk),
  ];
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "LOADED_MSG": {
      const [nextModel, thunk] = LoadedReportCard.update(msg.msg, model.model);
      return [
        produce(model, (draft) => {
          draft.model = immer.castDraft(nextModel);
        }),
        wrapThunk("LOADED_MSG", thunk),
      ];
    }

    default:
      assertUnreachable(msg.type);
  }
};

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div>
      <LoadedReportCard.view
        model={model.model}
        dispatch={(msg) => dispatch({ type: "LOADED_MSG", msg })}
      />
    </div>
  );
};
