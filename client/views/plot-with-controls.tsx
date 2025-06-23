import React from "react";
import * as MeasureExpressionBox from "./measure-expression-box";
import * as Plot from "./plot";
import { HydratedSnapshot } from "../types";
import { Dispatch } from "../tea";
import { assertUnreachable } from "../util/utils";
import { EvalPoint, Identifier } from "../parser/types";
import { FilterMapping } from "./select-filters";
import { Result } from "../../iso/utils";
import { convertToTargetUnit } from "../../iso/units";

export type Model = {
  snapshots: HydratedSnapshot[];
  mySnapshot: HydratedSnapshot | undefined;
  userId: string | undefined;
  filterMapping: FilterMapping;
  xAxis: MeasureExpressionBox.Model;
  yAxis: MeasureExpressionBox.Model;
  plot: Result<Plot.Model>;
};

export type Msg =
  | {
    type: "X_AXIS_MSG";
    msg: MeasureExpressionBox.Msg;
  }
  | {
    type: "Y_AXIS_MSG";
    msg: MeasureExpressionBox.Msg;
  };

export class PlotWithControls {
  state: Model;

  constructor(
    initialParams: {
      filterMapping: FilterMapping;
      userId: string | undefined;
      snapshots: HydratedSnapshot[];
      mySnapshot: HydratedSnapshot | undefined;
    },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    const ids = Object.keys(initialParams.filterMapping).sort();
    this.state = {
      filterMapping: initialParams.filterMapping,
      snapshots: initialParams.snapshots,
      mySnapshot: initialParams.mySnapshot,
      userId: initialParams.userId,
      xAxis: MeasureExpressionBox.initModel(ids[0] || ""),
      yAxis: MeasureExpressionBox.initModel(ids[1] || ""),
      plot: { status: "fail", error: "Please enter an expression to proceed" },
    };

    this.state.plot = this.updatePlot();
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "X_AXIS_MSG":
        this.state.xAxis = MeasureExpressionBox.update(msg.msg, this.state.xAxis)[0];
        this.state.plot = this.updatePlot();
        break;
      case "Y_AXIS_MSG":
        this.state.yAxis = MeasureExpressionBox.update(msg.msg, this.state.yAxis)[0];
        this.state.plot = this.updatePlot();
        break;
      default:
        assertUnreachable(msg);
    }
  }

  private updatePlot(): Result<Plot.Model> {
    const xAxisValid = this.state.xAxis.evalResult.status == "success";
    const yAxisValid = this.state.yAxis.evalResult.status == "success";

    const mapSnapshot = (s: HydratedSnapshot) => {
      const idValues: EvalPoint = {};
      for (const id in this.state.filterMapping) {
        const filter = this.state.filterMapping[id as Identifier];

        idValues[id as Identifier] = {
          unit: filter.unit,
          value: convertToTargetUnit(
            s.normalizedMeasures[filter.measureId],
            filter.unit,
          ),
        };
      }
      return { userId: s.userId, idValues, lastUpdated: new Date(s.lastUpdated) };
    };
    const snapshotDataById = this.state.snapshots.map(mapSnapshot);

    const myLatestSnapshot = this.state.mySnapshot
      ? mapSnapshot(this.state.mySnapshot)
      : undefined;

    if (xAxisValid) {
      const evalX = this.state.xAxis.evalResult.value;
      const xResult = evalX(snapshotDataById.map(({ idValues }) => idValues));
      if (xResult.status == "fail") {
        return xResult;
      }
      const xData = xResult.value;

      const myXResult = myLatestSnapshot
        ? evalX([myLatestSnapshot.idValues])
        : undefined;

      if (yAxisValid) {
        const evalY = this.state.yAxis.evalResult.value;
        const yResult = evalY(snapshotDataById.map(({ idValues }) => idValues));
        if (yResult.status == "fail") {
          return yResult;
        }
        const yData = yResult.value;

        const myYResult = myLatestSnapshot
          ? evalY([myLatestSnapshot.idValues])
          : undefined;

        const data: { x: number; y: number }[] = [];
        for (let i = 0; i < xData.values.length; i += 1) {
          data.push({
            x: xData.values[i],
            y: yData.values[i],
          });
        }

        let myData: { x: number; y: number } | undefined;
        if (
          myXResult &&
          myXResult.status == "success" &&
          myXResult.value.values.length &&
          myYResult &&
          myYResult.status == "success" &&
          myYResult.value.values.length
        ) {
          myData = {
            x: myXResult.value.values[0],
            y: myYResult.value.values[0],
          };
        }

        if (data.length < 20) {
          return {
            status: "success",
            value: {
              style: "dotplot",
              data,
              myData,
              xLabel: this.state.xAxis.expression,
              xUnit: xData.unit,
              yLabel: this.state.yAxis.expression,
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
              xLabel: this.state.xAxis.expression,
              xUnit: xData.unit,
              yLabel: this.state.yAxis.expression,
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
              myXResult && myXResult.status == "success"
                ? myXResult.value.values[0]
                : undefined,
            xLabel: this.state.xAxis.expression,
            xUnit: xData.unit,
          },
        };
      }
    } else {
      return { status: "fail", error: `x expression is not valid` };
    }
  }

  view() {
    return (
      <div>
        <div
          className="plot-container"
          style={{
            height: "400px",
            width: "600px",
          }}
        >
          {this.state.plot.status == "success" ? (
            <Plot.view model={this.state.plot.value} dispatch={this.context.myDispatch} />
          ) : (
            <div>Error: {this.state.plot.error}</div>
          )}
        </div>
        <div>
          xAxis:{" "}
          <MeasureExpressionBox.view
            model={this.state.xAxis}
            dispatch={(msg) => this.context.myDispatch({ type: "X_AXIS_MSG", msg })}
          />
        </div>
        <div>
          yAxis:{" "}
          <MeasureExpressionBox.view
            model={this.state.yAxis}
            dispatch={(msg) => this.context.myDispatch({ type: "Y_AXIS_MSG", msg })}
          />
        </div>
      </div>
    );
  }
}
