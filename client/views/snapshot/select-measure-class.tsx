import * as DCGView from "dcgview";
import {
  generateId,
  MeasureClassSpec,
  MeasureId,
  parseId,
} from "../../../iso/measures";
import { Dispatch } from "../../types";
import { MeasureStats } from "../../../iso/protocol";
import { CountTree, measureStatsToCountTree, getFromCountTree } from "./utils";

const { For } = DCGView.Components;

type Selected = {
  measureClass: MeasureClassSpec;
  measureId: MeasureId;
  params: {
    [name: string]: string;
  };
};

export type Model = {
  measureStats: MeasureStats;
  measureClasses: {
    spec: MeasureClassSpec;
    countTree: CountTree;
  }[];
  selected: Selected;
};

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

export class SelectMeasureClassController {
  state: Model;

  constructor(
    {
      measureStats,
      measureClasses,
      measureId,
    }: {
      measureClasses: MeasureClassSpec[];
      measureId?: MeasureId;
      measureStats: MeasureStats;
    },
    public context: { myDispatch: Dispatch<Msg> }
  ) {
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

    this.state = {
      measureStats,
      measureClasses: hydratedMeasureClasses,
      selected: this.initSelected({ measureClasses, measureId }),
    };
  }

  private initSelected({
    measureClasses,
    measureId,
  }: {
    measureClasses: MeasureClassSpec[];
    measureId?: MeasureId;
  }): Selected {
    let selectedParams: { [name: string]: string } | undefined;
    let selectedSpec: MeasureClassSpec | undefined;
    let selectedMeasureId: MeasureId | undefined;

    if (measureId) {
      selectedMeasureId = measureId;
      for (const spec of measureClasses) {
        try {
          selectedParams = parseId(measureId, spec);
          selectedSpec = spec;
        } catch { }
      }
    }

    if (!(selectedParams && selectedSpec && selectedMeasureId)) {
      selectedSpec = measureClasses[0];
      selectedParams = {};
      for (const param of selectedSpec.params) {
        selectedParams[param.name] = param.values[0];
      }
      selectedMeasureId = generateId(selectedSpec, selectedParams);
    }

    return {
      measureClass: selectedSpec,
      measureId: selectedMeasureId,
      params: selectedParams,
    };
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "SELECT_MEASURE_CLASS_MSG":
        const selected = this.state.selected;
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
        selected.measureId = generateId(selected.measureClass, selected.params);
        break;

      case "UPDATE_PARAM_MSG":
        const selectedForParam = this.state.selected;
        const param = selectedForParam.measureClass.params.find(
          (p) => p.name === msg.param,
        );
        if (!param) {
          throw new Error(
            `Invalid param ${msg.param} for measure class ${selectedForParam.measureClass.className}`,
          );
        }
        if (!(param.values as any).includes(msg.value)) {
          throw new Error(
            `invalid value ${msg.value} for param ${param.name}`,
          );
        }
        selectedForParam.params[msg.param] = msg.value;
        selectedForParam.measureId = generateId(
          selectedForParam.measureClass,
          selectedForParam.params,
        );
        break;
    }
  }

  getCountForMeasureClass(measureClass: MeasureClassSpec) {
    const m = this.state.measureClasses.find((mc) => mc.spec === measureClass);
    return m ? getFromCountTree(m.countTree, []) : 0;
  }

  getCountForParam(paramName: string, paramValue: string) {
    const measureClass = this.state.measureClasses.find(
      (mc) => mc.spec === this.state.selected.measureClass,
    );
    if (!measureClass) return 0;

    const paramIndex = this.state.selected.measureClass.params.findIndex(
      (p) => p.name === paramName,
    );
    const paramValues = this.state.selected.measureClass.params
      .slice(0, paramIndex)
      .map((p) => this.state.selected.params[p.name]);
    paramValues.push(paramValue);

    return getFromCountTree(measureClass.countTree, paramValues);
  }
}

export class SelectMeasureClassView extends DCGView.View<{
  controller: SelectMeasureClassController;
}> {
  template() {
    const stateProp = () => this.props.controller().state;

    return (
      <div>
        <select
          onChange={(e) => {
            const measureClass = stateProp().measureClasses.find(
              (c) => c.spec.className == (e.target as HTMLSelectElement).value,
            );
            if (!measureClass) {
              throw new Error(`Unexpected measure class ${(e.target as HTMLSelectElement).value}`);
            }

            this.props.controller().context.myDispatch({
              type: "SELECT_MEASURE_CLASS_MSG",
              measureClass: measureClass.spec,
            });
          }}
          value={() => stateProp().selected.measureClass.className}
        >
          <For each={() => stateProp().measureClasses} key={(mc) => mc.spec.className}>
            {(getMeasureClass) => (
              <option
                value={() => getMeasureClass().spec.className}
              >
                {() => getMeasureClass().spec.className} (
                {() => this.props.controller().getCountForMeasureClass(getMeasureClass().spec)})
              </option>
            )}
          </For>
        </select>

        <For each={() => stateProp().selected.measureClass.params} key={(param) => param.name}>
          {(getParam) => (
            <select
              onChange={(e) =>
                this.props.controller().context.myDispatch({
                  type: "UPDATE_PARAM_MSG",
                  param: getParam().name,
                  value: (e.target as HTMLSelectElement).value,
                })
              }
              value={() => stateProp().selected.params[getParam().name]}
            >
              <For each={() => getParam().values} key={(value) => value}>
                {(getValue) => (
                  <option value={() => getValue()}>
                    {() => getValue()}
                    {() => getParam().suffix} ({() => this.props.controller().getCountForParam(getParam().name, getValue())})
                  </option>
                )}
              </For>
            </select>
          )}
        </For>
      </div>
    );
  }
}
