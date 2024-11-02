import React from "react";
import * as MeasureExpressionBox from "./measure-expression-box";
import * as Plot from "./plot";
import { Snapshot } from "../types";
import { Update, View } from "../tea";
import { assertUnreachable } from "../util/utils";
import * as immer from "immer";
import { Identifier } from "../parser/types";
import { FilterMapping } from "./select-filters";
const produce = immer.produce;

export type Model = immer.Immutable<{
  snapshots: Snapshot[];
  filterMapping: FilterMapping;
  xAxis: MeasureExpressionBox.Model;
  yAxis: MeasureExpressionBox.Model;
  plot: Plot.Model | undefined;
}>;

export type Msg =
  | {
      type: "X_AXIS_MSG";
      msg: MeasureExpressionBox.Msg;
    }
  | {
      type: "Y_AXIS_MSG";
      msg: MeasureExpressionBox.Msg;
    };

export function initModel({
  filterMapping,
  snapshots,
}: {
  filterMapping: FilterMapping;
  snapshots: Snapshot[];
}): Model {
  const ids = Object.keys(filterMapping).sort();
  const model: Model = {
    filterMapping,
    snapshots,
    xAxis: MeasureExpressionBox.initModel(ids[0] || ""),
    yAxis: MeasureExpressionBox.initModel(ids[1] || ""),
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
          MeasureExpressionBox.update(msg.msg, model.xAxis)[0],
        );
        draft.plot = immer.castDraft(updatePlot(draft));
      });
      return [nextModel];
    }
    case "Y_AXIS_MSG": {
      const nextModel: Model = produce(model, (draft) => {
        draft.yAxis = immer.castDraft(
          MeasureExpressionBox.update(msg.msg, model.yAxis)[0],
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
  const xAxisValid = model.xAxis.evalResult.isValid;
  const yAxisValid = model.yAxis.evalResult.isValid;

  const snapshotDataById = model.snapshots.map((s) => {
    const idValues: { [id: Identifier]: number } = {};
    for (const id in model.filterMapping) {
      idValues[id as Identifier] =
        s.measures[model.filterMapping[id as Identifier]];
    }
    return idValues;
  });

  if (xAxisValid) {
    const evalX = model.xAxis.evalResult.fn;
    const xData = snapshotDataById.map(evalX);

    if (yAxisValid) {
      const evalY = model.yAxis.evalResult.fn;
      const yData = snapshotDataById.map(evalY);

      const data = [];
      for (let i = 0; i < xData.length; i += 1) {
        if (xData[i] && yData[i]) {
          data.push({
            x: xData[i],
            y: yData[i],
          });
        }
      }

      return {
        style: "dotplot",
        data,
        xLabel: model.xAxis.expression,
        yLabel: model.yAxis.expression,
      };
    } else {
      return {
        style: "histogram",
        data: xData.filter((val) => val != undefined),
        xLabel: model.xAxis.expression,
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
        <MeasureExpressionBox.view
          model={model.xAxis}
          dispatch={(msg) => dispatch({ type: "X_AXIS_MSG", msg })}
        />
      </div>
      <div>
        yAxis:{" "}
        <MeasureExpressionBox.view
          model={model.yAxis}
          dispatch={(msg) => dispatch({ type: "Y_AXIS_MSG", msg })}
        />
      </div>
    </div>
  );
};
