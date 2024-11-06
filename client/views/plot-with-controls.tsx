import React from "react";
import * as MeasureExpressionBox from "./measure-expression-box";
import * as Plot from "./plot";
import { HydratedSnapshot } from "../types";
import { Update, View } from "../tea";
import { assertUnreachable } from "../util/utils";
import * as immer from "immer";
import { EvalPoint, Identifier } from "../parser/types";
import { FilterMapping } from "./select-filters";
import { Result } from "../../iso/utils";
import { convertToTargetUnit } from "../../iso/units";
const produce = immer.produce;
import lodash from "lodash";

export type Model = immer.Immutable<{
  snapshots: HydratedSnapshot[];
  mySnapshot: HydratedSnapshot | undefined;
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
  mySnapshot
}: {
  filterMapping: FilterMapping;
  userId: string | undefined;
  snapshots: HydratedSnapshot[];
  mySnapshot: HydratedSnapshot | undefined;
}): Model {
  const ids = Object.keys(filterMapping).sort();
  const model: Model = {
    filterMapping,
    snapshots,
    mySnapshot,
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
  const xAxisValid = model.xAxis.evalResult.status == "success";
  const yAxisValid = model.yAxis.evalResult.status == "success";

  const snapshotDataById = model.snapshots.map((s) => {
    const idValues: EvalPoint = {};
    for (const id in model.filterMapping) {
      const filter = model.filterMapping[id as Identifier];

      idValues[id as Identifier] = {
        unit: filter.unit,
        value: convertToTargetUnit(
          s.normalizedMeasures[filter.measureId],
          filter.unit,
        ),
      };
    }
    return { userId: s.userId, idValues, lastUpdated: new Date(s.lastUpdated) };
  });

  const myLatestSnapshot = lodash.sortBy(
    snapshotDataById.filter((s) => s.userId == model.userId),
    "lastUpdated",
  ).reverse()[0];

  if (xAxisValid) {
    const evalX = model.xAxis.evalResult.value;
    const xResult = evalX(snapshotDataById.map(({ idValues }) => idValues));
    if (xResult.status == "fail") {
      return xResult;
    }
    const xData = xResult.value;

    const myXResult = evalX([myLatestSnapshot.idValues]);

    if (yAxisValid) {
      const evalY = model.yAxis.evalResult.value;
      const yResult = evalY(snapshotDataById.map(({ idValues }) => idValues));
      if (yResult.status == "fail") {
        return yResult;
      }
      const yData = yResult.value;

      const myYResult = evalY([myLatestSnapshot.idValues]);

      const data: { x: number; y: number }[] = [];
      for (let i = 0; i < xData.values.length; i += 1) {
        data.push({
          x: xData.values[i],
          y: yData.values[i],
        });
      }

      let myData: { x: number; y: number } | undefined;
      if (
        myXResult.status == "success" &&
        myXResult.value.values.length &&
        myYResult.status == "success" &&
        myYResult.value.values.length
      ) {
        myData = {
          x: myXResult.value.values[0],
          y: myYResult.value.values[0],
        };
      }

      if (data.length < 100) {
        return {
          status: "success",
          value: {
            style: "dotplot",
            data,
            myData,
            xLabel: model.xAxis.expression,
            xUnit: xData.unit,
            yLabel: model.yAxis.expression,
            yUnit: yData.unit,
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
            xUnit: xData.unit,
            yLabel: model.yAxis.expression,
            yUnit: yData.unit,
          },
        };
      }
    } else {
      return {
        status: "success",
        value: {
          style: "histogram",
          data: xData.values,
          myData:
            myXResult.status == "success"
              ? myXResult.value.values[0]
              : undefined,
          xLabel: model.xAxis.expression,
          xUnit: xData.unit,
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
      <div
        className="plot-container"
        style={{
          height: "300px",
          width: "400px",
        }}
      >
        {model.plot.status == "success" ? (
          <Plot.view model={model.plot.value} dispatch={dispatch} />
        ) : (
          <div>Error: {model.plot.error}</div>
        )}
      </div>
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
