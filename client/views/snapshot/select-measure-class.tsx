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
import { CountTree, measureStatsToCountTree } from "./utils";

type Selected = {
  countTree: CountTree;
  measureClass: MeasureClassSpec;
  measureId: MeasureId;
  params: {
    [name: string]: string;
  };
};

export type Model = immer.Immutable<{
  measureStats: MeasureStats;
  measureClasses: MeasureClassSpec[];
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
  return {
    measureStats,
    measureClasses,
    selected: initSelected({ measureStats, measureClasses }, measureId),
  };
};

function initSelected(
  model: Omit<Model, "selected">,
  measureId?: MeasureId,
): immer.Immutable<Selected> {
  let selectedParams: { [name: string]: string } | undefined;
  let selectedSpec: immer.Immutable<MeasureClassSpec> | undefined;
  let selectedMeasureId: MeasureId | undefined;

  if (measureId) {
    selectedMeasureId = measureId;
    for (const spec of model.measureClasses) {
      try {
        selectedParams = parseId(measureId, immer.castDraft(spec));
        selectedSpec = spec;
      } catch {}
    }
  }

  if (!(selectedParams && selectedSpec && selectedMeasureId)) {
    selectedSpec = model.measureClasses[0];
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
      countTree: measureStatsToCountTree(
        model.measureStats,
        (measureId) => parseId(measureId, immer.castDraft(selectedSpec)),
        selectedSpec.params.map((s) => s.name),
      ),
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

          selected.measureClass = msg.measureClass;
          selected.params = paramMap;
          selected.measureId = generateId(
            selected.measureClass,
            selected.params,
          );
          selected.countTree = measureStatsToCountTree(
            draft.measureStats,
            (measureId) => parseId(measureId, selected.measureClass),
            selected.measureClass.params.map((s) => s.name),
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
          if (!param.values.includes(msg.value)) {
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
  return (
    <div>
      <select
        onChange={(e) =>
          dispatch({
            type: "SELECT_MEASURE_CLASS_MSG",
            measureClass: JSON.parse(e.target.value),
          })
        }
        value={JSON.stringify(model.selected.measureClass)}
      >
        {model.measureClasses.map((measureClass) => (
          <option
            key={measureClass.className}
            value={JSON.stringify(measureClass)}
          >
            {measureClass.className}
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
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
