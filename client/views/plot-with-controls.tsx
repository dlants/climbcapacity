import React from "react";
import * as MeasureExpressionBox from "./measure-expression-box";
import * as Plot from "./plot";
import { HydratedSnapshot } from "../types";
import { Update, View } from "../tea";
import { assertUnreachable } from "../util/utils";
import * as immer from "immer";
import { Identifier } from "../parser/types";
import { FilterMapping } from "./select-filters";
import { Result } from "../../iso/utils";
const produce = immer.produce;

export type Model = immer.Immutable<{
  snapshots: HydratedSnapshot[];
  userId: string | undefined;
  filterMapping: FilterMapping;
  xAxis: MeasureExpressionBox.Model;
  yAxis: MeasureExpressionBox.Model;
  plot: Result<Plot.Model>;
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
    plot: { status: "fail", error: "Please enter an expression to proceed" },
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

function updatePlot(model: Model): Result<Plot.Model> {
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
    const xResult = evalX(snapshotDataById.map(({ idValues }) => idValues));
    if (xResult.status == "fail") {
      return xResult;
    }
    const xData = xResult.value;

    const myXResult = evalX(
      snapshotDataById
        .filter(({ userId }) => userId == model.userId)
        .map(({ idValues }) => idValues),
    );
    if (myXResult.status == "fail") {
      return myXResult;
    }
    const myXData = myXResult.value;

    if (yAxisValid) {
      const evalY = model.yAxis.evalResult.fn;
      const yResult = evalY(snapshotDataById.map(({ idValues }) => idValues));
      if (yResult.status == "fail") {
        return yResult;
      }
      const yData = yResult.value;

      const myYResult = evalY(
        snapshotDataById
          .filter(({ userId }) => userId == model.userId)
          .map(({ idValues }) => idValues),
      );
      if (myYResult.status == "fail") {
        return myYResult;
      }
      const myYData = myYResult.value;

      const data: { x: number; y: number }[] = [];
      for (let i = 0; i < xData.length; i += 1) {
        data.push({
          x: xData[i],
          y: yData[i],
        });
      }

      const myData: { x: number; y: number }[] = [];
      for (let i = 0; i < myXData.length; i += 1) {
        myData.push({
          x: myXData[i],
          y: myYData[i],
        });
      }

      if (data.length < 100) {
        return {
          status: "success",
          value: {
            style: "dotplot",
            data,
            myData,
            xLabel: model.xAxis.expression,
            yLabel: model.yAxis.expression,
          },
        };
      } else {
        return {
          status: "success",
          value: {
            style: "heatmap",
            data,
            myData,
            xLabel: model.xAxis.expression,
            yLabel: model.yAxis.expression,
          },
        };
      }
    } else {
      return {
        status: "success",
        value: {
          style: "histogram",
          data: xData,
          myData: myXData,
          xLabel: model.xAxis.expression,
        },
      };
    }
  } else {
    return { status: "fail", error: `x expression is not valid` };
  }
}

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div>
      {model.plot.status == "success" ? (
        <Plot.view model={model.plot.value} dispatch={dispatch} />
      ) : (
        <div>Error: {model.plot.error}</div>
      )}
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
