import { MeasureId } from "./measures/index.js";
import type { UnitValue } from "./units.js";

export type Snapshot = {
  _id: ProtocolObjectId;
  userId: string;

  /** these are as the user entered them
   */
  measures: {
    [measureId: MeasureId]: UnitValue;
  };

  createdAt: ProtocolDate;
  lastUpdated: ProtocolDate;
};

export type SnapshotId = string & { __brand: "SnapshotId" };

export class ProtocolTimestamp {
  __brand: "ProtocolObjectTimestamp";

  constructor() {
    throw new Error(
      "This class is a protocol placeholder. It should never be instantiated.",
    );
  }
}

export class ProtocolObjectId {
  __brand: "ProtocolObjectId";

  constructor() {
    throw new Error(
      "This class is a protocol placeholder. It should never be instantiated.",
    );
  }
}

export class ProtocolDate {
  __brand: "ProtocolDate";

  constructor() {
    throw new Error(
      "This class is a protocol placeholder. It should never be instantiated.",
    );
  }
}

export type Filter = {
  min?: UnitValue;
  max?: UnitValue;
};

export type FilterQuery = { [measureId: MeasureId]: Filter };

export type AuthStatus =
  | { status: "logged out" }
  | { status: "logged in"; user: { id: string } };

export type SnapshotUpdateRequest = {
  snapshotId: SnapshotId;
  updates?: {
    [measureId: MeasureId]: UnitValue;
  };
  deletes?: {
    [measureId: MeasureId]: true;
  };
};

export type MeasureStats = {
  [measureId: MeasureId]: number;
};

export type Dataset = "climbharderv3" | "powercompany";
