import * as DCGView from "dcgview";
import { Dispatch } from "../../types";
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

export class InterpolateController {
  state: Model;

  constructor(
    initialParams: {
      measureId: MeasureId;
      measureStats: MeasureStats
    },
    public myDispatch: Dispatch<Msg>
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

  handleDispatch(msg: Msg) {
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

  // Legacy view method for backward compatibility
  view() {
    const view = new InterpolateView({ controller: () => this });
    return view.template();
  }
}

export class InterpolateView extends DCGView.View<{
  controller: () => InterpolateController;
}> {
  template() {
    const { For } = DCGView.Components;
    const stateProp = () => this.props.controller().state;

    return (
      <div>
        <div class={styles.container}>
          <For each={() => Object.entries(stateProp().interpolationOptions)} key={(item) => item[0]}>
            {(entryProp) => {
              const [paramName, options] = entryProp();

              return (
                <div class={styles.row}>
                  <label class={styles.label}>
                    <input
                      type="checkbox"
                      checked={() => options.enabled}
                      onChange={(e) =>
                        this.props.controller().myDispatch({
                          type: "TOGGLE_INTERPOLATION",
                          paramName: paramName as ParamName,
                          enabled: (e.target as HTMLInputElement).checked,
                        })
                      }
                    />

                    <span class={styles.text}>
                      Interpolate {paramName} {() => options.interpolationMeasures.map((m) => `${m.sourceParamValue} (${m.count})`).join(", ")}
                    </span>
                  </label>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    );
  }
}
