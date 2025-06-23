import React from "react";
import { Dispatch } from "../../tea";
import { assertUnreachable } from "../../util/utils";
import { generateId, getSpec, MeasureId, parseId, } from "../../../iso/measures";
import * as typestyle from "typestyle";
import * as csstips from "csstips";
import * as csx from "csx";
import { MeasureStats } from "../../../iso/protocol";
import { ParamName, ParamValue, REPS } from "../../../iso/measures/params";

type InterpolationOptions = Partial<{
  [paramName in ParamName]: {
    interpolationMeasures: {
      sourceParamValue: ParamValue<ParamName>;
      targetParamValue: ParamValue<ParamName>;
      sourceMeasureId: MeasureId,
      count: number
    }[];

    enabled: boolean
  }
}>

export type Model = {
  measureId: MeasureId;
  interpolationOptions: InterpolationOptions
};

export type Msg =
  | { type: "TOGGLE_INTERPOLATION"; paramName: ParamName; enabled: boolean };

const styles = typestyle.stylesheet({
  container: {
    ...csstips.vertical,
    width: csx.percent(100),
    margin: "10px 0",
  },
  row: {
    ...csstips.horizontal,
    ...csstips.center,
    marginBottom: 8,
  },
  label: {
    ...csstips.horizontal,
    ...csstips.center,
    cursor: "pointer",
  },
  text: {
    marginLeft: 8,
  },
});

export class Interpolate {
  state: Model;

  constructor(
    initialParams: {
      measureId: MeasureId;
      measureStats: MeasureStats
    },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    const { measureId, measureStats } = initialParams;
    const measureSpec = getSpec(measureId);
    const measureClass = measureSpec.spec;

    const interpolationOptions: InterpolationOptions = {}

    if (measureClass) {
      const params = parseId(measureId, measureClass);
      for (const param of measureClass?.params || []) {
        if (param.name == 'repMax' && measureClass.units.includes('kg')) {
          const possibleValues = REPS.filter((r) => r != params.repMax);

          interpolationOptions['repMax'] = {
            interpolationMeasures: possibleValues.map((r) => {
              const sourceMeasureId = generateId(measureClass, { ...params, repMax: r })
              return {
                sourceMeasureId,
                sourceParamValue: r as ParamValue<"repMax">,
                targetParamValue: params.repMax as ParamValue<'repMax'>,
                count: measureStats[sourceMeasureId] || 0
              }
            }),
            enabled: false
          };
        }

        if (param.name == 'edgeSize' && ['18', '20'].includes(params.edgeSize!) && measureClass.units.includes('kg')) {
          const possibleValues = (['18', '20'] as const).filter((r) => r != params.edgeSize);
          interpolationOptions['edgeSize'] = {
            interpolationMeasures: possibleValues.map((size) => {
              const sourceMeasureId = generateId(measureClass, { ...params, edgeSize: size })
              return {
                sourceMeasureId,
                sourceParamValue: size as ParamValue<"edgeSize">,
                targetParamValue: params.edgeSize as ParamValue<'edgeSize'>,
                count: measureStats[sourceMeasureId] || 0
              }
            }),
            enabled: false
          };
        }
      }
    }

    this.state = {
      measureId,
      interpolationOptions
    };
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "TOGGLE_INTERPOLATION":
        if (this.state.interpolationOptions[msg.paramName]) {
          this.state.interpolationOptions[msg.paramName]!.enabled = msg.enabled;
        }
        break;
      default:
        assertUnreachable(msg.type);
    }
  }

  view() {
    return (
      <div>
        <div className={styles.container}>
          {Object.entries(this.state.interpolationOptions).map(([paramName, options]) => (
            <div key={paramName} className={styles.row}>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={options.enabled}
                  onChange={(e) =>
                    this.context.myDispatch({
                      type: "TOGGLE_INTERPOLATION",
                      paramName: paramName as ParamName,
                      enabled: e.target.checked,
                    })
                  }
                />

                <span className={styles.text}>
                  Interpolate {paramName} {options.interpolationMeasures.map((m) => `${m.sourceParamValue} (${m.count})`).join(", ")}
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  }
}
