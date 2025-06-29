import * as DCGView from "../dcgview";
const { For, SwitchUnion } = DCGView.Components;
import {
  EWBANK,
  EwbankGrade,
  FONT,
  Font,
  FRENCH_SPORT,
  FrenchSport,
  IRCRAGrade,
  VGRADE,
  VGrade,
  YDS,
} from "../../iso/grade";
import {
  UnitType,
  UnitValue,
  convertToStandardUnit,
  convertToTargetUnit,
  inchesToFeetAndInches,
} from "../../iso/units";
import { assertUnreachable, Result, Success } from "../../iso/utils";
import { Dispatch } from "../types";
import {
  getSpec,
  MeasureId,
  getPreferredUnitForMeasure,
} from "../../iso/measures";
import { ExtractFromDisjointUnion } from "../util/utils";
import { Locale } from "../../iso/locale";

type UnitInputMap = {
  second: string;
  month: string;
  year: string;
  lb: string;
  "lb/s": string;
  kg: string;
  "kg/s": string;
  ["1RMkg"]: string;
  ["2RMkg"]: string;
  ["5RMkg"]: string;
  m: string;
  cm: string;
  mm: string;
  inch: {
    feet: string;
    inches: string;
  };
  vermin: string;
  font: string;
  frenchsport: string;
  yds: string;
  ewbank: string;
  ircra: string;
  "sex-at-birth": "female" | "male";
  count: string;
  training: string;
  strengthtoweightratio: string;
};

type UnitInput = UnitInputMap[UnitType];

export type Model = {
  measureId: MeasureId;
  preferredUnit: UnitType;
  possibleUnits: UnitType[];
  unitInput: UnitInput;
  parseResult: Result<UnitValue>;
};

export type Msg =
  | {
      type: "MEASURE_TYPED";
      measureId: MeasureId;
      unitInput: UnitInput;
    }
  | {
      type: "SELECT_UNIT";
      unit: UnitType;
    };

export type HasParseResultModel = Omit<Model, "parseResult"> & {
  parseResult: Success<UnitValue>;
};

export class UnitInputController {
  state: Model;
  context: { myDispatch: Dispatch<Msg>; locale: () => Locale };

  constructor(
    measureId: MeasureId,
    context: { myDispatch: Dispatch<Msg>; locale: () => Locale },
    initialValue?: UnitValue,
  ) {
    this.context = context;
    const measureSpec = getSpec(measureId);
    const preferredUnit = getPreferredUnitForMeasure(
      measureId,
      context.locale(),
    );
    const initialInput = getInitialInput(preferredUnit, initialValue);

    this.state = {
      measureId,
      preferredUnit,
      possibleUnits: measureSpec.units,
      unitInput: initialInput,
      parseResult: parseUnitValue(preferredUnit, initialInput),
    };
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "MEASURE_TYPED": {
        const parseResult = parseUnitValue(
          this.state.preferredUnit,
          msg.unitInput,
        );
        this.state.unitInput = msg.unitInput;
        this.state.parseResult = parseResult;
        break;
      }
      case "SELECT_UNIT": {
        // In the new locale-based system, we ignore manual unit selection
        // Unit selection is now handled automatically via locale preferences
        // This case is kept for backward compatibility during the transition
        break;
      }
      default:
        assertUnreachable(msg);
    }
  }

  // Method to update the preferred unit when locale changes
  updatePreferredUnit() {
    const newPreferredUnit = getPreferredUnitForMeasure(
      this.state.measureId,
      this.context.locale(),
    );
    if (newPreferredUnit !== this.state.preferredUnit) {
      this.state.preferredUnit = newPreferredUnit;
      this.state.unitInput = getInitialInput(
        newPreferredUnit,
        this.state.parseResult.status === "success"
          ? this.state.parseResult.value
          : getDefaultValueFromUnitType(newPreferredUnit),
      );
      this.state.parseResult = parseUnitValue(
        this.state.preferredUnit,
        this.state.unitInput,
      );
    }
  }
}

export class UnitInputView extends DCGView.View<{
  controller: UnitInputController;
}> {
  template() {
    const controller = this.props.controller;
    const stateProp = () => controller().state;
    const handleChange = (unitInput: UnitInput) =>
      controller().context.myDispatch({
        type: "MEASURE_TYPED",
        measureId: stateProp().measureId,
        unitInput,
      });

    return (
      <span class="unitInput">
        {SwitchUnion(() => stateProp().preferredUnit, {
          second: () => this.renderNumberInput(stateProp, handleChange),
          month: () => this.renderNumberInput(stateProp, handleChange),
          year: () => this.renderNumberInput(stateProp, handleChange),
          lb: () => this.renderNumberInput(stateProp, handleChange),
          "lb/s": () => this.renderNumberInput(stateProp, handleChange),
          kg: () => this.renderNumberInput(stateProp, handleChange),
          "kg/s": () => this.renderNumberInput(stateProp, handleChange),
          m: () => this.renderNumberInput(stateProp, handleChange),
          cm: () => this.renderNumberInput(stateProp, handleChange),
          mm: () => this.renderNumberInput(stateProp, handleChange),
          count: () => this.renderNumberInput(stateProp, handleChange),
          strengthtoweightratio: () =>
            this.renderNumberInput(stateProp, handleChange),
          training: () => (
            <span>
              <select
                value={() => stateProp().unitInput as string}
                onChange={(e) =>
                  handleChange((e.target as HTMLSelectElement).value)
                }
              >
                <For.Simple each={() => ["", "1", "2", "3", "4"]}>
                  {(val: string) => (
                    <option value={DCGView.const(val)}>{val}</option>
                  )}
                </For.Simple>
              </select>
              <span>{() => stateProp().preferredUnit}</span>
            </span>
          ),
          inch: () => {
            const value = () =>
              stateProp().unitInput as { feet: string; inches: string };
            return (
              <span>
                <input
                  type="number"
                  value={() => value().feet}
                  onChange={(e) =>
                    handleChange({
                      ...value(),
                      feet: (e.target as HTMLInputElement).value,
                    })
                  }
                />
                <span>'</span>
                <input
                  type="number"
                  value={() => value().inches}
                  onChange={(e) =>
                    handleChange({
                      ...value(),
                      inches: (e.target as HTMLInputElement).value,
                    })
                  }
                />
                <span>"</span>
              </span>
            );
          },
          "sex-at-birth": () => (
            <select
              value={() => stateProp().unitInput as "female" | "male" | ""}
              onChange={(e) =>
                handleChange(
                  (e.target as HTMLSelectElement).value as
                    | ""
                    | "female"
                    | "male",
                )
              }
            >
              <option value="" />
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          ),
          ircra: () => (
            <span>
              <input
                type="number"
                value={() => stateProp().unitInput as string}
                onChange={(e) =>
                  handleChange((e.target as HTMLInputElement).value)
                }
              />
              <span>IRCRA</span>
            </span>
          ),
          vermin: () => (
            <select
              value={() => stateProp().unitInput as string}
              onChange={(e) =>
                handleChange((e.target as HTMLSelectElement).value)
              }
            >
              <For.Simple each={() => VGRADE}>
                {(grade: VGrade) => (
                  <option value={() => grade.toString()}>V{grade}</option>
                )}
              </For.Simple>
            </select>
          ),
          ewbank: () => (
            <select
              value={() => stateProp().unitInput as string}
              onChange={(e) =>
                handleChange((e.target as HTMLSelectElement).value)
              }
            >
              <For.Simple each={() => EWBANK}>
                {(grade: EwbankGrade) => (
                  <option value={() => grade.toString()}>{grade}</option>
                )}
              </For.Simple>
            </select>
          ),
          font: () => (
            <select
              value={() => stateProp().unitInput as string}
              onChange={(e) =>
                handleChange((e.target as HTMLSelectElement).value)
              }
            >
              <For.Simple each={() => FONT}>
                {(grade: Font) => <option value={() => grade}>{grade}</option>}
              </For.Simple>
            </select>
          ),
          frenchsport: () => (
            <select
              value={() => stateProp().unitInput as string}
              onChange={(e) =>
                handleChange((e.target as HTMLSelectElement).value)
              }
            >
              <For.Simple each={() => FRENCH_SPORT}>
                {(grade: FrenchSport) => (
                  <option value={() => grade}>{grade}</option>
                )}
              </For.Simple>
            </select>
          ),
          yds: () => (
            <select
              value={() => stateProp().unitInput as string}
              onChange={(e) =>
                handleChange((e.target as HTMLSelectElement).value)
              }
            >
              <For.Simple each={() => YDS}>
                {(grade: string) => (
                  <option value={() => grade}>{grade}</option>
                )}
              </For.Simple>
            </select>
          ),
        })}
      </span>
    );
  }

  private renderNumberInput(
    stateProp: () => Model,
    handleChange: (unitInput: UnitInput) => void,
  ) {
    return (
      <span>
        <input
          type="number"
          value={() => stateProp().unitInput as string}
          onChange={(e) => handleChange((e.target as HTMLInputElement).value)}
        />
        <span>{() => stateProp().preferredUnit}</span>
      </span>
    );
  }
}

export function parseUnitValue<UnitName extends keyof UnitInputMap>(
  unit: UnitName,
  input: UnitInputMap[UnitName],
): Result<Extract<UnitValue, { unit: UnitName }>> {
  try {
    switch (unit) {
      case "second":
      case "month":
      case "year":
      case "lb":
      case "lb/s":
      case "kg":
      case "kg/s":
      case "1RMkg":
      case "2RMkg":
      case "5RMkg":
      case "m":
      case "cm":
      case "mm":
      case "count":
      case "strengthtoweightratio": {
        if (
          !(
            input as UnitInputMap[
              | "second"
              | "year"
              | "lb"
              | "kg"
              | "m"
              | "cm"
              | "mm"
              | "count"
              | "strengthtoweightratio"]
          ).length
        ) {
          return { status: "fail", error: "Nothing provided" };
        }
        const num = Number(input);
        if (isNaN(num))
          return { status: "fail", error: `Invalid number ${input}` };
        return {
          status: "success",
          value: { unit, value: num } as Extract<UnitValue, { unit: UnitName }>,
        };
      }
      case "inch": {
        const { feet: feetStr, inches: inchesStr } =
          input as UnitInputMap["inch"];
        const feet = Number(feetStr);
        const inches = Number(inchesStr);

        if (isNaN(feet) || isNaN(inches))
          return {
            status: "fail",
            error: `Invalid feet/inches format ${input}`,
          };
        return {
          status: "success",
          value: { unit, value: feet * 12 + inches } as Extract<
            UnitValue,
            { unit: UnitName }
          >,
        };
      }
      case "sex-at-birth": {
        if (input !== "male" && input !== "female")
          return { status: "fail", error: `Invalid sex ${input}` };
        return {
          status: "success",
          value: { unit, value: input } as Extract<
            UnitValue,
            { unit: UnitName }
          >,
        };
      }

      case "training": {
        if (![1, 2, 3, 4].includes(parseInt(input as UnitInputMap["training"])))
          return { status: "fail", error: `Invalid training value ${input}` };
        return {
          status: "success",
          value: {
            unit,
            value: parseInt(input as UnitInputMap["training"]),
          } as Extract<UnitValue, { unit: UnitName }>,
        };
      }

      case "vermin": {
        if (
          !VGRADE.includes(
            parseFloat(input as UnitInputMap["vermin"]) as VGrade,
          )
        ) {
          return { status: "fail", error: `Invalid V grade ${input}` };
        }
        return {
          status: "success",
          value: { unit, value: Number(input) as VGrade } as Extract<
            UnitValue,
            { unit: UnitName }
          >,
        };
      }
      case "ewbank": {
        if (
          !EWBANK.includes(
            parseFloat(input as UnitInputMap["ewbank"]) as EwbankGrade,
          )
        ) {
          return { status: "fail", error: `Invalid Ewbank grade ${input}` };
        }
        return {
          status: "success",
          value: { unit, value: Number(input) as EwbankGrade } as Extract<
            UnitValue,
            { unit: UnitName }
          >,
        };
      }

      case "font": {
        if (!FONT.includes(input as UnitInputMap["font"] as Font)) {
          return { status: "fail", error: `Invalid Font grade ${input}` };
        }
        return {
          status: "success",
          value: { unit, value: input as Font } as Extract<
            UnitValue,
            { unit: UnitName }
          >,
        };
      }
      case "frenchsport": {
        if (
          !FRENCH_SPORT.includes(
            input as UnitInputMap["frenchsport"] as FrenchSport,
          )
        ) {
          return {
            status: "fail",
            error: `Invalid French Sport grade ${input}`,
          };
        }
        return {
          status: "success",
          value: { unit, value: input as FrenchSport } as Extract<
            UnitValue,
            { unit: UnitName }
          >,
        };
      }
      case "yds": {
        if (!YDS.includes(input as UnitInputMap["yds"] as YDS)) {
          return { status: "fail", error: `Invalid YDS grade ${input}` };
        }
        return {
          status: "success",
          value: { unit, value: input as YDS } as Extract<
            UnitValue,
            { unit: UnitName }
          >,
        };
      }
      case "ircra": {
        const num = Number(input);
        if (isNaN(num) || num < 1 || num > 33) {
          return { status: "fail", error: `Invalid IRCRA grade ${num}` };
        }
        return {
          status: "success",
          value: { unit, value: num as IRCRAGrade } as Extract<
            UnitValue,
            { unit: UnitName }
          >,
        };
      }
      default:
        assertUnreachable(unit);
    }
  } catch (e) {
    console.warn(e);
    return {
      status: "fail",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

function getDefaultValueFromUnitType(unit: UnitType): UnitValue {
  switch (unit) {
    case "second":
    case "month":
    case "year":
    case "lb":
    case "lb/s":
    case "kg":
    case "kg/s":
    case "m":
    case "cm":
    case "mm":
    case "inch":
    case "count":
    case "strengthtoweightratio":
      return {
        unit,
        value: 0,
      };
    case "vermin":
      return {
        unit,
        value: 0,
      };
    case "font":
      return {
        unit,
        value: "3",
      };
    case "frenchsport":
      return {
        unit,
        value: "5",
      };

    case "yds":
      return {
        unit,
        value: "5.6",
      };
    case "ewbank":
      return {
        unit,
        value: 1,
      };
    case "ircra":
      return {
        unit,
        value: 1 as IRCRAGrade,
      };
    case "sex-at-birth":
      return {
        unit,
        value: "female",
      };

    case "training":
      return {
        unit,
        value: 1,
      };
    default:
      assertUnreachable(unit);
  }
}

function getInitialInput(
  targetUnit: UnitType,
  initialValue?: UnitValue,
): UnitInput {
  const targetValue: UnitValue | undefined =
    initialValue &&
    (initialValue.unit == targetUnit
      ? initialValue
      : convertToTargetUnit(convertToStandardUnit(initialValue), targetUnit));

  switch (targetUnit) {
    case "second":
    case "month":
    case "year":
    case "lb":
    case "lb/s":
    case "kg":
    case "kg/s":
    case "m":
    case "cm":
    case "mm":
    case "vermin":
    case "font":
    case "frenchsport":
    case "yds":
    case "ewbank":
    case "ircra":
    case "count":
    case "training":
    case "strengthtoweightratio":
      return targetValue ? targetValue.value.toString() : "";
    case "inch": {
      const { feet, inches } = inchesToFeetAndInches(
        targetValue ? (targetValue.value as number) : 0,
      );
      return { feet: feet.toString(), inches: inches.toString() };
    }
    case "sex-at-birth": {
      return targetValue
        ? (
            targetValue as ExtractFromDisjointUnion<
              UnitValue,
              "unit",
              "sex-at-birth"
            >
          ).value
        : "";
    }
    default:
      assertUnreachable(targetUnit);
  }
}

export type HasParseResult = Omit<Model, "parseResult"> & {
  parseResult: Success<UnitValue>;
};

export function hasParseResult(
  model: Model | undefined,
): model is HasParseResult {
  return !!(model && model.parseResult.status == "success");
}
