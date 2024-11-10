import React from "react";
import { HydratedSnapshot } from "../types";
import * as Plot from "./plot";
import * as immer from "immer";
import { Dispatch } from "../tea";
import { INPUT_MEASURES, OUTPUT_MEASURES } from "../../iso/measures";
import { extractDataPoint, MeasureId, UnitType } from "../../iso/units";
import { assertUnreachable } from "../util/utils";
import { Result } from "../../iso/utils";
const { produce } = immer;

const INPUT_MEASURE_IDS = INPUT_MEASURES.map((s) => s.id);
const OUTPUT_MEASURE_IDS = OUTPUT_MEASURES.map((s) => s.id);

type PlotId = string & { __brand: "PlotId" };

type PlotModel = { id: PlotId; model: Plot.Model };

type MeasureWithUnit = {
  id: MeasureId;
  unit: UnitType;
};

export type Model = immer.Immutable<{
  mySnapshot: HydratedSnapshot;
  snapshots: HydratedSnapshot[];
  outputMeasure: MeasureWithUnit;
  outputMeasures: MeasureWithUnit[];
  plots: PlotModel[];
}>;

export type Msg = {
  type: "SELECT_OUTPUT_MEASURE";
  measureId: MeasureId;
};

export function initModel({
  mySnapshot,
  snapshots,
}: {
  mySnapshot: HydratedSnapshot;
  snapshots: HydratedSnapshot[];
}): Result<Model> {
  const outputMeasures: MeasureWithUnit[] = [];
  for (const id in mySnapshot.measures) {
    const measureId = id as MeasureId;
    if (OUTPUT_MEASURE_IDS.includes(measureId)) {
      outputMeasures.push({
        id: measureId,
        unit: mySnapshot.measures[measureId].unit,
      });
    }
  }

  if (outputMeasures.length == 0) {
    return {
      status: "fail",
      error: `No output measures found. Try adding some grade data to your snapshot.`,
    };
  }
  const outputMeasure = outputMeasures[0];

  const model: Model = produce<Model>(
    {
      mySnapshot,
      snapshots,
      outputMeasure,
      outputMeasures,
      plots: [],
    },
    (draft) => {
      draft.plots = immer.castDraft(getPlots(draft));
    },
  );

  return { status: "success", value: model };
}

function getPlots(model: Model) {
  const otherMeasures: MeasureWithUnit[] = [];

  for (const id in model.mySnapshot.measures) {
    const measureId = id as MeasureId;
    if (
      !(
        INPUT_MEASURE_IDS.includes(id as MeasureId) ||
        OUTPUT_MEASURE_IDS.includes(id as MeasureId)
      )
    ) {
      otherMeasures.push({
        id: measureId,
        unit: model.mySnapshot.measures[measureId].unit,
      });
    }
  }

  const plots: PlotModel[] = [];
  for (const inputMeasure of otherMeasures) {
    plots.push({
      id: inputMeasure.id as unknown as PlotId,
      model: getPlot({
        inputMeasure,
        outputMeasure: model.outputMeasure,
        snapshots: model.snapshots,
        mySnapshot: model.mySnapshot,
      }),
    });
  }

  return plots;
}

function getPlot({
  inputMeasure,
  outputMeasure,
  snapshots,
  mySnapshot,
}: {
  inputMeasure: MeasureWithUnit;
  outputMeasure: MeasureWithUnit;
  snapshots: readonly HydratedSnapshot[];
  mySnapshot: HydratedSnapshot;
}): Plot.Model {
  const data: { x: number; y: number }[] = [];

  const myData = extractDataPoint({
    measures: mySnapshot.measures as any,
    inputMeasure,
    outputMeasure,
  });

  const minYValue = myData ? myData.y - 1 : undefined;
  const maxYValue = myData ? myData.y + 3 : undefined;

  for (const snapshot of snapshots) {
    const dataPoint = extractDataPoint({
      measures: snapshot.measures as any,
      inputMeasure,
      outputMeasure,
    });

    if (!dataPoint) {
      continue;
    }

    if (minYValue != undefined && dataPoint.y < minYValue) {
      continue;
    }

    if (maxYValue != undefined && maxYValue < dataPoint.y) {
      continue;
    }

    data.push(dataPoint);
  }

  if (data.length < 20) {
    return {
      style: "dotplot",
      data,
      myData,
      xLabel: inputMeasure.id,
      xUnit: inputMeasure.unit,
      yLabel: outputMeasure.id,
      yUnit: outputMeasure.unit,
    };
  } else {
    return {
      style: "heatmap",
      data,
      myData,
      xLabel: inputMeasure.id,
      xUnit: inputMeasure.unit,
      yLabel: outputMeasure.id,
      yUnit: outputMeasure.unit,
    };
  }
}

export function update(msg: Msg, model: Model): [Model] {
  switch (msg.type) {
    case "SELECT_OUTPUT_MEASURE":
      const index = model.outputMeasures.findIndex(
        (m) => m.id == msg.measureId,
      );
      if (index == -1) {
        throw new Error(`Cannot select output measure ${msg.measureId}`);
      }
      return [
        produce(model, (draft) => {
          draft.outputMeasure = draft.outputMeasures[index];
          draft.plots = immer.castDraft(getPlots(draft));
        }),
      ];
    default:
      assertUnreachable(msg.type);
  }
}

export function view({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: Dispatch<Msg>;
}) {
  return (
    <div>
      <select
        value={model.outputMeasure.id}
        onChange={(e) =>
          dispatch({
            type: "SELECT_OUTPUT_MEASURE",
            measureId: e.target.value as MeasureId,
          })
        }
      >
        {model.outputMeasures.map((m) => (
          <option key={m.id} value={m.id}>
            {m.id}
          </option>
        ))}
      </select>

      {model.plots.map((plot) => (
        <div key={plot.id}>
          <Plot.view model={plot.model} dispatch={dispatch} />
        </div>
      ))}
    </div>
  );
}
