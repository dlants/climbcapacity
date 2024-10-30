import React from "react";
import * as MeasureSelectionBox from "./measure-selection-box";
import * as Plot from "./plot";
import { Snapshot } from "../types";
import { Update, View } from "../tea";
import { assertUnreachable } from "../utils";
import * as immer  from "immer";
const produce = immer.produce

export type Model = immer.Immutable<{
  snapshots: Snapshot[];
  xAxis: MeasureSelectionBox.Model;
  yAxis: MeasureSelectionBox.Model;
  plot: Plot.Model | undefined;
}>;

export type Msg =
  | {
      type: "X_AXIS_MSG";
      msg: MeasureSelectionBox.Msg;
    }
  | {
      type: "Y_AXIS_MSG";
      msg: MeasureSelectionBox.Msg;
    };

export function initModel(snapshots: Snapshot[]): Model {
  const model: Model = {
    snapshots,
    xAxis: {
      state: "typing",
      query: "",
      measures: [],
    },
    yAxis: {
      state: "typing",
      query: "",
      measures: [],
    },

    plot: undefined,
  };
  return produce(model, (draft) => {
    draft.plot = immer.castDraft(updatePlot(draft));
  });
}
export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "X_AXIS_MSG": {
      const nextModel: Model = produce(model, (draft) => {
        draft.xAxis = immer.castDraft(
          MeasureSelectionBox.update(msg.msg, model.xAxis)[0],
        );
        draft.plot = immer.castDraft(updatePlot(draft));
      });
      return [nextModel];
    }
    case "Y_AXIS_MSG": {
      const nextModel: Model = produce(model, (draft) => {
        draft.yAxis = immer.castDraft(
          MeasureSelectionBox.update(msg.msg, model.yAxis)[0],
        );
        draft.plot = immer.castDraft(updatePlot(draft));
      });
      return [nextModel];
    }
    default:
      assertUnreachable(msg);
  }
};

function updatePlot(model: Model): Plot.Model | undefined {
  const xAxisMeasure = model.xAxis.state == "selected" && model.xAxis.measureId;
  const yAxisMeasure = model.yAxis.state == "selected" && model.yAxis.measureId;

  if (xAxisMeasure) {
    if (yAxisMeasure) {
      return {
        style: "dotplot",
        data: model.snapshots
          .map((s) => ({
            x: s.measures[xAxisMeasure],
            y: s.measures[yAxisMeasure],
          }))
          .filter((val) => val.x != undefined && val.y != undefined),
        xLabel: xAxisMeasure,
        yLabel: yAxisMeasure,
      };
    } else {
      return {
        style: "histogram",
        data: model.snapshots
          .map((s) => s.measures[xAxisMeasure])
          .filter((val) => val != undefined),
        xLabel: xAxisMeasure,
      };
    }
  } else {
    return undefined;
  }
}

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div>
      {model.plot && <Plot.view model={model.plot} dispatch={dispatch} />}
      <div>
        xAxis:{" "}
        <MeasureSelectionBox.view
          model={model.xAxis}
          dispatch={(msg) => dispatch({ type: "X_AXIS_MSG", msg })}
        />
      </div>
      <div>
        yAxis:{" "}
        <MeasureSelectionBox.view
          model={model.yAxis}
          dispatch={(msg) => dispatch({ type: "Y_AXIS_MSG", msg })}
        />
      </div>
    </div>
  );
};
