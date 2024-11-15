import React, { useId } from "react";
import * as immer from "immer";
const produce = immer.produce;
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
  MeasureId,
  UnitType,
  UnitValue,
  convertToStandardUnit,
  convertToTargetUnit,
  inchesToFeetAndInches,
} from "../../iso/units";
import { assertUnreachable, Result, Success } from "../../iso/utils";
import { MEASURE_MAP } from "../constants";
import { Update } from "../tea";

type UnitInputMap = {
  second: string;
  month: string;
  year: string;
  lb: string;
  ["1RMlb"]: string;
  ["2RMlb"]: string;
  ["5RMlb"]: string;
  kg: string;
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
};

type UnitInput = UnitInputMap[UnitType];

export type Model = immer.Immutable<{
  measureId: MeasureId;
  selectedUnit: UnitType;
  possibleUnits: UnitType[];
  unitInput: UnitInput;
  parseResult: Result<UnitValue>;
}>;

export type HasParseResultModel = immer.Immutable<
  Omit<Model, "parseResult"> & {
    parseResult: Success<UnitValue>;
  }
>;

export function initModel(
  measureId: MeasureId,
  initialValue?: UnitValue,
): Model {
  const measureSpec = MEASURE_MAP[measureId];
  if (!measureSpec) {
    throw new Error(`Unexpected measureId ${measureId}`);
  }

  const defaultUnit = initialValue ? initialValue.unit : measureSpec.units[0];
  const initialInput = getInitialInput(defaultUnit, initialValue);

  return {
    measureId,
    selectedUnit: defaultUnit,
    possibleUnits: measureSpec.units,
    unitInput: initialInput,
    parseResult: parseUnitValue(defaultUnit, initialInput),
  };
}

function getDefaultValueFromUnitType(unit: UnitType): UnitValue {
  switch (unit) {
    case "second":
    case "month":
    case "year":
    case "lb":
    case "1RMlb":
    case "2RMlb":
    case "5RMlb":
    case "kg":
    case "1RMkg":
    case "2RMkg":
    case "5RMkg":
    case "m":
    case "cm":
    case "mm":
    case "inch":
    case "count":
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
    default:
      assertUnreachable(unit);
  }
}

function getInitialInput(
  targetUnit: UnitType,
  initialValue?: UnitValue,
): UnitInput {
  const targetValue =
    initialValue &&
    (initialValue.unit == targetUnit
      ? initialValue.value
      : convertToTargetUnit(convertToStandardUnit(initialValue), targetUnit));

  switch (targetUnit) {
    case "second":
    case "month":
    case "year":
    case "lb":
    case "1RMlb":
    case "2RMlb":
    case "5RMlb":
    case "kg":
    case "1RMkg":
    case "2RMkg":
    case "5RMkg":
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
      return targetValue ? targetValue.toString() : "";
    case "inch":
      const { feet, inches } = inchesToFeetAndInches(
        (targetValue as number) || 0,
      );
      return { feet: feet.toString(), inches: inches.toString() };
    case "sex-at-birth":
      return targetValue as "female" | "male";
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

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "MEASURE_TYPED": {
      const measureSpec = MEASURE_MAP[msg.measureId];
      if (!measureSpec) {
        throw new Error(`Unexpected measureId ${msg.measureId}`);
      }

      const parseResult = parseUnitValue(model.selectedUnit, msg.unitInput);
      return [
        produce(model, (draft) => {
          draft.unitInput = msg.unitInput;
          draft.parseResult = parseResult;
        }),
      ];
    }
    case "SELECT_UNIT": {
      if (!model.possibleUnits.includes(msg.unit)) {
        throw new Error(
          `${msg.unit} is not a possible unit for measure ${model.measureId}`,
        );
      }

      return [
        produce(model, (draft) => {
          draft.selectedUnit = msg.unit;
          draft.unitInput = getInitialInput(
            msg.unit,
            draft.parseResult.status == "success"
              ? draft.parseResult.value
              : getDefaultValueFromUnitType(msg.unit),
          );
        }),
      ];
    }
    default:
      assertUnreachable(msg);
  }
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
      case "1RMlb":
      case "2RMlb":
      case "5RMlb":
      case "kg":
      case "1RMkg":
      case "2RMkg":
      case "5RMkg":
      case "m":
      case "cm":
      case "mm":
      case "count": {
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
              | "count"]
          ).length
        ) {
          return { status: "fail", error: "Nothing provided" };
        }
        const num = Number(input);
        if (isNaN(num)) return { status: "fail", error: "Invalid number" };
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
          return { status: "fail", error: "Invalid feet/inches format" };
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
          return { status: "fail", error: "Invalid sex" };
        return {
          status: "success",
          value: { unit, value: input } as Extract<
            UnitValue,
            { unit: UnitName }
          >,
        };
      }
      case "vermin": {
        if (
          !VGRADE.includes(
            parseFloat(input as UnitInputMap["vermin"]) as VGrade,
          )
        ) {
          return { status: "fail", error: "Invalid V grade" };
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
          return { status: "fail", error: "Invalid Ewbank grade" };
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
          return { status: "fail", error: "Invalid Font grade" };
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
          return { status: "fail", error: "Invalid French Sport grade" };
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
          return { status: "fail", error: "Invalid YDS grade" };
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
        if (isNaN(num) || num < 6 || num > 32) {
          return { status: "fail", error: "Invalid IRCRA grade" };
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
    return {
      status: "fail",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export const UnitInput = ({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: (msg: Msg) => void;
}) => {
  return (
    <span className={"unitInput"}>
      {<InnerUnitInput model={model} dispatch={dispatch} />}
    </span>
  );
};

const InnerUnitInput = ({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: (msg: Msg) => void;
}) => {
  const handleChange = (unitInput: typeof model.unitInput) => {
    dispatch({
      type: "MEASURE_TYPED",
      measureId: model.measureId,
      unitInput,
    });
  };

  switch (model.selectedUnit) {
    case "second":
    case "month":
    case "year":
    case "lb":
    case "1RMlb":
    case "2RMlb":
    case "5RMlb":
    case "kg":
    case "1RMkg":
    case "2RMkg":
    case "5RMkg":
    case "m":
    case "cm":
    case "mm":
    case "count":
      return (
        <span>
          <input
            type="number"
            value={model.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          />
          <span>{model.selectedUnit}</span>
        </span>
      );

    case "inch": {
      const value = model.unitInput as { feet: string; inches: string };
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
          value={model.unitInput as "female" | "male"}
          onChange={(e) => handleChange(e.target.value as "female" | "male")}
        >
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
      );

    case "ircra":
      return (
        <span>
          <input
            type="number"
            value={model.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          />
          <span>IRCRA</span>
        </span>
      );

    case "vermin":
      return (
        <select
          value={model.unitInput as string}
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
          value={model.unitInput as string}
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
          value={model.unitInput as string}
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
          value={model.unitInput as string}
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
          value={model.unitInput as string}
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
      assertUnreachable(model.selectedUnit);
  }
};
