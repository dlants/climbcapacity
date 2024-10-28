import * as Protocol from "../iso/protocol";
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
