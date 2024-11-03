import React from "react";
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
import { MeasureId, UnitType, UnitValue } from "../../iso/units";
import { assertUnreachable, Result, Success } from "../../iso/utils";
import { MEASURE_MAP } from "../constants";
import { Update, View } from "../tea";

type UnitInputMap = {
  second: string;
  year: string;
  lb: string;
  kg: string;
  m: string;
  cm: string;
  mm: string;
  feetinches: {
    feet: string;
    inches: string;
  };
  inches: string;
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

export function initModel(measureId: MeasureId): Model {
  const measureSpec = MEASURE_MAP[measureId];
  if (!measureSpec) {
    throw new Error(`Unexpected measureId ${measureId}`);
  }

  const defaultUnit = measureSpec.units[0];
  const initialInput = getInitialInput(defaultUnit);
  return {
    measureId,
    selectedUnit: defaultUnit,
    possibleUnits: measureSpec.units,
    unitInput: initialInput,
    parseResult: parseUnitValue(defaultUnit, initialInput),
  };
}

function getInitialInput(unitType: UnitType): UnitInput {
  switch (unitType) {
    case "second":
    case "year":
    case "lb":
    case "kg":
    case "m":
    case "cm":
    case "mm":
    case "inches":
    case "vermin":
    case "font":
    case "frenchsport":
    case "yds":
    case "ewbank":
    case "ircra":
    case "count":
      return "";
    case "feetinches":
      return { feet: "", inches: "" };
    case "sex-at-birth":
      return "female";
    default:
      assertUnreachable(unitType);
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
          draft.unitInput = getInitialInput(msg.unit);
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
      case "year":
      case "lb":
      case "kg":
      case "m":
      case "cm":
      case "mm":
      case "inches":
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
              | "inches"
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
      case "feetinches": {
        const { feet: feetStr, inches: inchesStr } =
          input as UnitInputMap["feetinches"];
        const feet = Number(feetStr);
        const inches = Number(inchesStr);

        if (isNaN(feet) || isNaN(inches))
          return { status: "fail", error: "Invalid feet/inches format" };
        return {
          status: "success",
          value: { unit, value: { feet, inches } } as Extract<
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
        if (!((input as UnitInputMap["vermin"]) in VGRADE)) {
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
        if (!((input as UnitInputMap["ewbank"]) in EWBANK)) {
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
        if (!((input as UnitInputMap["font"]) in FONT)) {
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
        if (!((input as UnitInputMap["frenchsport"]) in FRENCH_SPORT)) {
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
        if (!((input as UnitInputMap["yds"]) in YDS)) {
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

// export const view: View<Msg, Model> = ({
//   model,
//   dispatch,
// }: {
//   model: Model;
//   dispatch: (msg: Msg) => void;
// }): JSX.Element => {
//   return (
//     <span>
//       <UnitInput model={model} dispatch={dispatch} />
//       {model.possibleUnits.length > 1 && (
//         <UnitToggle model={model} dispatch={dispatch} />
//       )}
//     </span>
//   );
// };

export const UnitToggle = ({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: (msg: Msg) => void;
}) => {
  return (
    <span>
      {model.possibleUnits.map((unit) => (
        <span>
          <input
            type="radio"
            id={model.measureId + ":" + unit}
            name={model.measureId + ":" + unit}
            value={unit}
            checked={unit === model.selectedUnit}
            onChange={() => dispatch({ type: "SELECT_UNIT", unit })}
          />
          <label key={unit}>{unit}</label>
        </span>
      ))}
    </span>
  );
};

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
      return (
        <span>
          <input
            type="number"
            value={model.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          />
          <span>s</span>
        </span>
      );

    case "year":
      return (
        <span>
          <input
            type="number"
            value={model.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          />
          <span>yr</span>
        </span>
      );

    case "lb":
      return (
        <span >
          <input
            type="number"
            value={model.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          />
          <span>lb</span>
        </span>
      );

    case "kg":
      return (
        <span >
          <input
            type="number"
            value={model.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          />
          <span>kg</span>
        </span>
      );

    case "m":
      return (
        <span >
          <input
            type="number"
            value={model.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          />
          <span>m</span>
        </span>
      );

    case "cm":
      return (
        <span >
          <input
            type="number"
            value={model.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          />
          <span>cm</span>
        </span>
      );

    case "mm":
      return (
        <span >
          <input
            type="number"
            value={model.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          />
          <span>mm</span>
        </span>
      );

    case "inches":
      return (
        <span >
          <input
            type="number"
            value={model.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          />
          <span>in</span>
        </span>
      );

    case "count":
      return (
        <span >
          <input
            type="number"
            value={model.unitInput as string}
            onChange={(e) => handleChange(e.target.value)}
          />
        </span>
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

    case "feetinches": {
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

    case "vermin":
      return (
        <select
          value={model.unitInput as string}
          onChange={(e) => handleChange(e.target.value)}
        >
          {Object.keys(VGRADE).map((grade) => (
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
          {Object.keys(EWBANK).map((grade) => (
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
          {Object.keys(FONT).map((grade) => (
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
          {Object.keys(FRENCH_SPORT).map((grade) => (
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
          {Object.keys(YDS).map((grade) => (
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
