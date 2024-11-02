import React from "react";
import * as MeasureExpressionBox from "./measure-expression-box";
import * as Plot from "./plot";
import { HydratedSnapshot } from "../types";
import { Update, View } from "../tea";
import { assertUnreachable } from "../util/utils";
import * as immer from "immer";
import { Identifier } from "../parser/types";
import { FilterMapping } from "./select-filters";
const produce = immer.produce;

export type Model = immer.Immutable<{
  snapshots: HydratedSnapshot[];
  userId: string | undefined;
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
  userId,
  snapshots,
}: {
  filterMapping: FilterMapping;
  userId: string | undefined;
  snapshots: HydratedSnapshot[];
}): Model {
  const ids = Object.keys(filterMapping).sort();
  const model: Model = {
    filterMapping,
    snapshots,
    userId,
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
        s.normalizedMeasures[model.filterMapping[id as Identifier]];
    }
    return { userId: s.userId, idValues };
  });

  if (xAxisValid) {
    const evalX = model.xAxis.evalResult.fn;
    const xData = snapshotDataById.map(({ userId, idValues }) => ({
      userId,
      x: evalX(idValues),
    }));

    if (yAxisValid) {
      const evalY = model.yAxis.evalResult.fn;
      const yData = snapshotDataById.map(({ userId, idValues }) => ({
        userId,
        y: evalY(idValues),
      }));

      const data = [];
      let myData;
      for (let i = 0; i < xData.length; i += 1) {
        if (xData[i].x && yData[i].y) {
          data.push({
            x: xData[i].x,
            y: yData[i].y,
          });

          if (xData[i].userId == model.userId) {
            myData = {
              x: xData[i].x,
              y: yData[i].y,
            };
          }
        }
      }

      if (data.length < 100) {
        return {
          style: "dotplot",
          data,
          myData,
          xLabel: model.xAxis.expression,
          yLabel: model.yAxis.expression,
        };
      } else {
        return {
          style: "heatmap",
          data,
          myData,
          xLabel: model.xAxis.expression,
          yLabel: model.yAxis.expression,
        };
      }
    } else {
      return {
        style: "histogram",
        data: xData.map((data) => data.x).filter((val) => val != undefined),
        myData: xData.find((val) => val.userId == model.userId)?.x,
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
