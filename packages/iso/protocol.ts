import { MeasureId } from "./measures/index.js";
import type { FacetString, UnitValue } from "./units.js";

export type Snapshot = {
  id: string;
  userId: string;

  /** these are as the user entered them
   */
  measures: {
    [measureId: MeasureId]: UnitValue;
  };

  createdAt: ProtocolDate;
  lastUpdated: ProtocolDate;
  importSource?: Dataset;
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

export type MeasureFilter = {
  min?: UnitValue;
  max?: UnitValue;
};

export type FilterQuery = {
  [measureId: MeasureId]: {
    min?: number;
    max?: number;
  };
};

export type SnapshotQuery = {
  datasets: {
    [dataset in Dataset]: boolean;
  };
  measures: { [measureId: MeasureId]: MeasureFilter };
};

export type MeiliFilterQuery = {
  datasets: {
    [dataset in Dataset]: boolean;
  };
  /**
   * Array of filter groups. Top-level arrays are ANDed together, inner arrays are ORed.
   * Each filter string is in format: 'category;value' or 'category;unit;value'
   * Example: [['gender;male'], ['height;cm;150-155', 'height;cm;155-160']]
   * Means: gender=male AND (height=150-155 OR height=155-160)
   */
  filters: FacetString[][];
};

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

export const DATASETS = ["climbharder", "powercompany"];
export type Dataset = (typeof DATASETS)[number];
