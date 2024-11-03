import { UnitType } from "../../iso/units";

export type Token = {
  type: "number" | "identifier" | "operator" | "lparen" | "rparen" | "eof";
  value: string;
};

/** Something like "a", "b", "aa", etc... Should be mapped to a measure via the filter selection box
 */
export type Identifier = string & { __id: "identifier" };

export type Expr =
  | { type: "number"; value: number }
  | { type: "identifier"; name: Identifier }
  | { type: "binary"; op: string; left: Expr; right: Expr };

export type EvalPoint = {
  [id: Identifier]: { unit: UnitType; value: number };
};

export type EvalResult = { unit: UnitType | undefined; values: number[] };
