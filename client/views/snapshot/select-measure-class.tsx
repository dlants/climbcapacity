import React from "react";
import {
  generateId,
  MeasureClassSpec,
  MeasureId,
  parseId,
} from "../../../iso/measures";
import * as immer from "immer";
import { Dispatch } from "../../tea";
const produce = immer.produce;
import { MeasureStats } from "../../../iso/protocol";
import { CountTree, measureStatsToCountTree, getFromCountTree } from "./utils";

type Selected = {
  measureClass: MeasureClassSpec;
  measureId: MeasureId;
  params: {
    [name: string]: string;
  };
};

export type Model = immer.Immutable<{
  measureStats: MeasureStats;
  measureClasses: {
    spec: MeasureClassSpec;
    countTree: CountTree;
  }[];
  selected: Selected;
}>;

export const initModel = ({
  measureStats,
  measureClasses,
  measureId,
}: {
  measureClasses: MeasureClassSpec[];
  measureId?: MeasureId;
  measureStats: MeasureStats;
}): Model => {
  const hydratedMeasureClasses = measureClasses.map((c) => {
    const countTree = measureStatsToCountTree(
      measureStats,
      (measureId) => parseId(measureId, c),
      c.params.map((s) => s.name),
    );

    return {
      spec: c,
      countTree,
    };
  });
  return {
    measureStats,
    measureClasses: hydratedMeasureClasses,
    selected: initSelected({ measureStats, measureClasses, measureId }),
  };
};

function initSelected({
  measureStats,
  measureClasses,
  measureId,
}: {
  measureStats: MeasureStats;
  measureClasses: MeasureClassSpec[];
  measureId?: MeasureId;
}): immer.Immutable<Selected> {
  let selectedParams: { [name: string]: string } | undefined;
  let selectedSpec: immer.Immutable<MeasureClassSpec> | undefined;
  let selectedMeasureId: MeasureId | undefined;

  if (measureId) {
    selectedMeasureId = measureId;
    for (const spec of measureClasses) {
      try {
        selectedParams = parseId(measureId, immer.castDraft(spec));
        selectedSpec = spec;
      } catch {}
    }
  }

  if (!(selectedParams && selectedSpec && selectedMeasureId)) {
    selectedSpec = measureClasses[0];
    selectedParams = {};
    for (const param of selectedSpec.params) {
      selectedParams[param.name] = param.values[0];
    }
    selectedMeasureId = generateId(
      immer.castDraft(selectedSpec),
      selectedParams,
    );
  }

  return immer.produce(
    {
      measureClass: selectedSpec,
      measureId: selectedMeasureId,
      params: selectedParams,
    },
    (d) => d,
  );
}

export type Msg =
  | {
      type: "SELECT_MEASURE_CLASS_MSG";
      measureClass: MeasureClassSpec;
    }
  | {
      type: "UPDATE_PARAM_MSG";
      param: string;
      value: string;
    };

export const update = (msg: Msg, model: Model): [Model] => {
  switch (msg.type) {
    case "SELECT_MEASURE_CLASS_MSG":
      return [
        produce(model, (draft) => {
          const selected = draft.selected;
          const oldParams = { ...selected.params };

          const paramMap: { [key: string]: string } = {};
          for (const param of msg.measureClass.params) {
            if (oldParams[param.name]) {
              paramMap[param.name] = oldParams[param.name];
            } else {
              paramMap[param.name] = param.values[0];
            }
          }

          selected.measureClass = immer.castDraft(msg.measureClass);
          selected.params = paramMap;
          selected.measureId = generateId(
            selected.measureClass,
            selected.params,
          );
        }),
      ];

    case "UPDATE_PARAM_MSG":
      return [
        produce(model, (draft) => {
          const selected = draft.selected;
          const param = selected.measureClass.params.find(
            (p) => p.name === msg.param,
          );
          if (!param) {
            throw new Error(
              `Invalid param ${msg.param} for measure class ${selected.measureClass.className}`,
            );
          }
          if (!(param.values as any).includes(msg.value)) {
            throw new Error(
              `invalid value ${msg.value} for param ${param.name}`,
            );
          }
          selected.params[msg.param] = msg.value;
          selected.measureId = generateId(
            selected.measureClass,
            selected.params,
          );
        }),
      ];

    default:
      return [model];
  }
};

export function view({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: Dispatch<Msg>;
}) {
  const getCountForMeasureClass = (measureClass: MeasureClassSpec) => {
    const m = model.measureClasses.find((mc) => mc.spec === measureClass);
    return m ? getFromCountTree(m.countTree, []) : 0;
  };

  const getCountForParam = (paramName: string, paramValue: string) => {
    const measureClass = model.measureClasses.find(
      (mc) => mc.spec === model.selected.measureClass,
    );
    if (!measureClass) return 0;

    const paramIndex = model.selected.measureClass.params.findIndex(
      (p) => p.name === paramName,
    );
    const paramValues = model.selected.measureClass.params
      .slice(0, paramIndex)
      .map((p) => model.selected.params[p.name]);
    paramValues.push(paramValue);

    return getFromCountTree(measureClass.countTree, paramValues);
  };

  return (
    <div>
      <select
        onChange={(e) => {
          const measureClass = model.measureClasses.find(
            (c) => c.spec.className == e.target.value,
          );
          if (!measureClass) {
            throw new Error(`Unexpected measure class ${e.target.value}`);
          }

          dispatch({
            type: "SELECT_MEASURE_CLASS_MSG",
            measureClass: immer.castDraft(measureClass.spec),
          });
        }}
        value={model.selected.measureClass.className}
      >
        {model.measureClasses.map((measureClass) => (
          <option
            key={measureClass.spec.className}
            value={measureClass.spec.className}
          >
            {measureClass.spec.className} (
            {getCountForMeasureClass(immer.castDraft(measureClass.spec))})
          </option>
        ))}
      </select>

      {model.selected.measureClass.params.map((param) => (
        <select
          key={param.name}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_PARAM_MSG",
              param: param.name,
              value: e.target.value,
            })
          }
          value={model.selected.params[param.name]}
        >
          {param.values.map((value) => (
            <option key={value} value={value}>
              {value}
              {param.suffix} ({getCountForParam(param.name, value)})
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
