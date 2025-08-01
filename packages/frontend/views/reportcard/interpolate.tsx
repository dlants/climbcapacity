import * as DCGView from "dcgview";
import { Dispatch } from "../../types";
import { assertUnreachable } from "../../util/utils";
import { generateId, getSpec, MeasureId, parseId } from "../../../iso/measures";
import * as typestyle from "typestyle";
import * as csstips from "csstips";
import * as csx from "csx";
import { FacetDistribution } from "../../../iso/protocol";
import {
  ParamName,
  ParamValue,
  REPS,
  EDGE_SIZES,
} from "../../../iso/measures/params";

export type Model = {
  paramName: ParamName;
  availableVariants: {
    paramValue: ParamValue<ParamName>;
    measureId: MeasureId;
    count: number;
  }[];
  selectedMeasureId: MeasureId;
  selectedParamValue: ParamValue<ParamName>;
  enabled: boolean;
};

export type Msg =
  | {
      type: "TOGGLE_INTERPOLATION";
      paramName: ParamName;
      enabled: boolean;
    }
  | {
      type: "SELECT_VARIANT";
      paramName: ParamName;
      measureId: MeasureId;
      paramValue: ParamValue<ParamName>;
    };

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

/**
 * Extract the count for a specific measure from facet distribution
 * Sums up all facet counts that belong to the given measure
 */
function getMeasureCountFromFacets(
  measureId: MeasureId,
  facetDistribution: FacetDistribution,
): number {
  let count = 0;
  for (const [facetString, facetCount] of Object.entries(facetDistribution)) {
    // Facet strings are in format: measureId;unit;value
    if (facetString.startsWith(`${measureId};`)) {
      count += facetCount;
    }
  }
  return count;
}

export class InterpolateController {
  state: Model;

  constructor(
    initialParams: {
      baseMeasureId: MeasureId;
      facetDistribution: FacetDistribution;
    },
    public myDispatch: Dispatch<Msg>,
  ) {
    const { baseMeasureId, facetDistribution } = initialParams;
    const measureSpec = getSpec(baseMeasureId);
    const measureClass = measureSpec.classSpec;

    let interpolationOption: Model;

    if (measureClass) {
      const params = parseId(baseMeasureId, measureClass);

      // Check if this is a rep max measure - prioritize repMax over edgeSize
      const hasRepMax = measureClass.params.some((p) => p.name === "repMax");
      const hasEdgeSize = measureClass.params.some(
        (p) => p.name === "edgeSize",
      );

      if (hasRepMax) {
        // Get all available rep max variants
        const availableVariants = REPS.map((repMax) => {
          const measureId = generateId(measureClass, { ...params, repMax });
          return {
            paramValue: repMax as ParamValue<ParamName>,
            measureId,
            count: getMeasureCountFromFacets(measureId, facetDistribution),
          };
        });

        // Sort by count descending and select the one with most data
        availableVariants.sort((a, b) => b.count - a.count);
        const selected = availableVariants[0];

        interpolationOption = {
          paramName: "repMax",
          availableVariants,
          selectedMeasureId: selected.measureId,
          selectedParamValue: selected.paramValue,
          enabled: false,
        };
      } else if (hasEdgeSize) {
        // Get all available edge size variants
        const availableVariants = EDGE_SIZES.map((edgeSize) => {
          const measureId = generateId(measureClass, { ...params, edgeSize });
          return {
            paramValue: edgeSize as ParamValue<ParamName>,
            measureId,
            count: getMeasureCountFromFacets(measureId, facetDistribution),
          };
        });

        // Sort by count descending and select the one with most data
        availableVariants.sort((a, b) => b.count - a.count);
        const selected = availableVariants[0];

        interpolationOption = {
          paramName: "edgeSize",
          availableVariants,
          selectedMeasureId: selected.measureId,
          selectedParamValue: selected.paramValue,
          enabled: false,
        };
      } else {
        // No interpolatable parameters, create a default option
        interpolationOption = {
          paramName: "repMax", // Default, won't be used
          availableVariants: [],
          selectedMeasureId: baseMeasureId,
          selectedParamValue: "" as ParamValue<ParamName>,
          enabled: false,
        };
      }
    } else {
      // No measure class, create a default option
      interpolationOption = {
        paramName: "repMax", // Default, won't be used
        availableVariants: [],
        selectedMeasureId: baseMeasureId,
        selectedParamValue: "" as ParamValue<ParamName>,
        enabled: false,
      };
    }

    this.state = interpolationOption;
  }

  getCurrentMeasureId(): MeasureId {
    return this.state.selectedMeasureId;
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "TOGGLE_INTERPOLATION": {
        if (this.state.paramName === msg.paramName) {
          this.state.enabled = msg.enabled;
        }
        break;
      }
      case "SELECT_VARIANT": {
        if (this.state.paramName === msg.paramName) {
          this.state.selectedMeasureId = msg.measureId;
          this.state.selectedParamValue = msg.paramValue;
        }
        break;
      }
      default:
        assertUnreachable(msg);
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

    // If no available variants, don't render anything
    if (stateProp().availableVariants.length === 0) {
      return <div></div>;
    }

    const paramDisplayName =
      stateProp().paramName === "repMax" ? "Rep Max" : "Edge Size";
    const unitSuffix = stateProp().paramName === "edgeSize" ? "mm" : "RM";

    return (
      <div>
        <div class={DCGView.const(styles.container)}>
          {/* Parameter Selection */}
          <div class={DCGView.const(styles.row)}>
            <label class={DCGView.const(styles.label)}>
              <span class={DCGView.const(styles.text)}>
                {paramDisplayName}:
              </span>
              <select
                value={() => stateProp().selectedParamValue}
                onChange={(e) => {
                  const selectedValue = (e.target as HTMLSelectElement).value;
                  const selectedVariant = stateProp().availableVariants.find(
                    (v) => v.paramValue === selectedValue,
                  );
                  if (selectedVariant) {
                    this.props.controller().myDispatch({
                      type: "SELECT_VARIANT",
                      paramName: stateProp().paramName,
                      measureId: selectedVariant.measureId,
                      paramValue: selectedVariant.paramValue,
                    });
                  }
                }}
                style={DCGView.const({ marginLeft: "8px" })}
              >
                <For
                  each={() => stateProp().availableVariants}
                  key={(variant) => variant.paramValue}
                >
                  {(variantProp) => {
                    const variant = variantProp();
                    return (
                      <option value={() => variant.paramValue}>
                        {() => variant.paramValue}
                        {unitSuffix} ({() => variant.count} entries)
                      </option>
                    );
                  }}
                </For>
              </select>
            </label>
          </div>

          {/* Interpolation Option */}
          <div class={DCGView.const(styles.row)}>
            <label class={DCGView.const(styles.label)}>
              <input
                type="checkbox"
                checked={() => stateProp().enabled}
                onChange={(e) =>
                  this.props.controller().myDispatch({
                    type: "TOGGLE_INTERPOLATION",
                    paramName: stateProp().paramName,
                    enabled: (e.target as HTMLInputElement).checked,
                  })
                }
              />

              <span class={DCGView.const(styles.text)}>
                Interpolate {() => stateProp().paramName}{" "}
                {() =>
                  stateProp()
                    .availableVariants.filter(
                      (v) => v.paramValue !== stateProp().selectedParamValue,
                    )
                    .map((v) => `${v.paramValue} (${v.count})`)
                    .join(", ")
                }
              </span>
            </label>
          </div>
        </div>
      </div>
    );
  }
}
