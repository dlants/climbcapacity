import { Unit } from "../types.js";

export type ProtocolId = string & { __brand: "protocolId" };

export type Protocol = {
  title: string;
  description: string;
  unit: Unit;
}
