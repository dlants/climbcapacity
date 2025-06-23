import * as Protocol from "../iso/protocol";
import { MeasureId } from "../iso/measures";
type FrontendObject<T> = { [K in keyof T]: Frontend<T[K]> };

export type Frontend<T> = T extends Protocol.ProtocolObjectId
  ? string
  : T extends Protocol.ProtocolDate
    ? string
    : T extends Protocol.ProtocolTimestamp
      ? string
      : T extends string
        ? T
        : T extends object
          ? FrontendObject<T>
          : T;

export type Snapshot = Frontend<Protocol.Snapshot>;

export type HydratedSnapshot = Snapshot & {
  /** When we load a snapshot, populate these with the appropriate values in default units
   */
  normalizedMeasures: {
    [measureId: MeasureId]: number;
  };
};

export type Dispatch<Msg> = (msg: Msg) => void;
