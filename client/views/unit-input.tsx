import React from "react";
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
import { Dispatch } from "../main";
import { getSpec, MeasureId } from "../../iso/measures";
import { ExtractFromDisjointUnion } from "../util/utils";

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
  selectedUnit: UnitType;
  possibleUnits: UnitType[];
  unitInput: UnitInput;
  parseResult: Result<UnitValue>;
};

export type HasParseResultModel = Omit<Model, "parseResult"> & {
  parseResult: Success<UnitValue>;
};

export class UnitInputComponent {
  state: Model;

  constructor(
    measureId: MeasureId,
    private context: { myDispatch: Dispatch<Msg> },
    initialValue?: UnitValue,
  ) {
    const measureSpec = getSpec(measureId);
    const defaultUnit = initialValue ? initialValue.unit : measureSpec.units[0];
    const initialInput = getInitialInput(defaultUnit, initialValue);

    this.state = {
      measureId,
      selectedUnit: defaultUnit,
      possibleUnits: measureSpec.units,
      unitInput: initialInput,
      parseResult: parseUnitValue(defaultUnit, initialInput),
    };
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "MEASURE_TYPED": {
        const parseResult = parseUnitValue(this.state.selectedUnit, msg.unitInput);
        this.state.unitInput = msg.unitInput;
        this.state.parseResult = parseResult;
        break;
      }
      case "SELECT_UNIT": {
        if (!this.state.possibleUnits.includes(msg.unit)) {
          throw new Error(
            `${msg.unit} is not a possible unit for measure ${this.state.measureId}`,
          );
        }

        this.state.selectedUnit = msg.unit;
        this.state.unitInput = getInitialInput(
          msg.unit,
          this.state.parseResult.status == "success"
            ? this.state.parseResult.value
            : getDefaultValueFromUnitType(msg.unit),
        );
        this.state.parseResult = parseUnitValue(
          this.state.selectedUnit,
          this.state.unitInput,
        );
        break;
      }
      default:
        assertUnreachable(msg);
    }
  }

  view() {
    return (
      <span className={"unitInput"}>
        {this.innerUnitInput()}
      </span>
    );
  }

  private innerUnitInput() {
    const handleChange = (unitInput: typeof this.state.unitInput) => {
      this.context.myDispatch({
        type: "MEASURE_TYPED",
        measureId: this.state.measureId,
        unitInput,
      });
    };

    switch (this.state.selectedUnit) {
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
      case "count":
      case "strengthtoweightratio":
        return (
          <span>
            <input
              type="number"
              value={this.state.unitInput as string}
              onChange={(e) => handleChange(e.target.value)}
            />
            <span>{this.state.selectedUnit}</span>
          </span>
        );

      case "training":
        return (
          <span>
            <select
              value={this.state.unitInput as string}
              onChange={(e) => handleChange(e.target.value)}
            >
              {["", "1", "2", "3", "4"].map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
            <span>{this.state.selectedUnit}</span>
          </span>
        );

      case "inch": {
        const value = this.state.unitInput as { feet: string; inches: string };
        return (
          <span>
            <input
              type="number"
              value={value.feet}
              onChange={(e) => handleChange({ ...value, feet: e.target.value })}
            />
            <span>'</span>
            <input
              type="number"
              value={value.inches}
              onChange={(e) => handleChange({ ...value, inches: e.target.value })}
            />
            <span>"</span>
          </span>
        );
      }

      case "sex-at-birth":
        return (
          <select
            value={this.state.unitInput as "female" | "male" | ""}
            onChange={(e) =>
              handleChange(e.target.value as "" | "female" | "male")
            }
          >
            <option value=""></option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        );

      case "ircra":
        return (
          <span>
            <input
              type="number"
              value={this.state.unitInput as string}
              onChange={(e) => handleChange(e.target.value)}
            />
            <span>IRCRA</span>
          </span>
        );

      case "vermin":
        return (
          <select
            value={this.state.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          >
            {VGRADE.map((grade) => (
              <option key={grade} value={grade}>
                V{grade}
              </option>
            ))}
          </select>
        );

      case "ewbank":
        return (
          <select
            value={this.state.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          >
            {EWBANK.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        );

      case "font":
        return (
          <select
            value={this.state.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          >
            {FONT.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        );

      case "frenchsport":
        return (
          <select
            value={this.state.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          >
            {FRENCH_SPORT.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        );

      case "yds":
        return (
          <select
            value={this.state.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          >
            {YDS.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        );

      default:
        assertUnreachable(this.state.selectedUnit);
    }
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
    case "inch":
      const { feet, inches } = inchesToFeetAndInches(
        targetValue ? (targetValue.value as number) : 0,
      );
      return { feet: feet.toString(), inches: inches.toString() };
    case "sex-at-birth":
      return targetValue
        ? (
          targetValue as ExtractFromDisjointUnion<
            UnitValue,
            "unit",
            "sex-at-birth"
          >
        ).value
        : "";
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
            | "strengthtoweightratio"
            ]
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
          debugger;
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


