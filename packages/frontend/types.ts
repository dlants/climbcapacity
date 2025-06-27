import * as Protocol from "../iso/protocol";
import { MeasureId } from "../iso/measures";
import { UnitValue } from "../iso/units";
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

export type HydratedSnapshot = Omit<Snapshot, 'measures'> & {
  /** We don't need to wrap measures in Frontend since they don't get changed during JSON serialization and it
   * confuses the type checker
   */
  measures: {
    [measureId: MeasureId]: UnitValue
  }
  /** When we load a snapshot, populate these with the appropriate values in default units
   */
  normalizedMeasures: {
    [measureId: MeasureId]: number;
  };
};

export type Dispatch<Msg> = (msg: Msg) => void;
