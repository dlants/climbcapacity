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

// New faceted search query types based on UI design plan
export type SnapshotQuery = {
  anthro_filters: FacetString[][];
  output_measure_id?: MeasureId;
  input_measure_id?: MeasureId;
};

export type AnthroFacetsQuery = {
  output_measure_id?: MeasureId;
  input_measure_id?: MeasureId;
};

export type OutputMeasureFacetsQuery = {
  anthro_filters: FacetString[][];
  input_measure_id?: MeasureId;
};

export type InputMeasureClassFacetsQuery = {
  anthro_filters: FacetString[][];
  output_measure_id?: MeasureId;
};

export type MeasureClassName = string & { __brand: "MeasureClassName" };

export type InputMeasureFacetsForClassQuery = {
  anthro_filters: FacetString[][];
  input_measure_class: MeasureClassName;
  output_measure_id?: MeasureId;
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

export type FacetDistribution = Record<FacetString, number>;
export type MeasureClassDistribution = Record<
  MeasureClassName | MeasureId,
  number
>;
export type MeasureIdDistribution = Record<MeasureId, number>;

export type SnapshotQueryResult = {
  snapshots: Snapshot[];
  totalHits: number;
};

// New facet response types
export type AnthroFacetsResult = {
  anthroDistribution: FacetDistribution;
};

export type OutputMeasureFacetsResult = {
  outputMeasureDistribution: MeasureIdDistribution;
};

export type InputMeasureClassFacetsResult = {
  measureClassDistribution: MeasureClassDistribution;
};

export type InputMeasureFacetsForClassResult = {
  inputMeasureDistribution: MeasureIdDistribution;
};

export const DATASETS = ["climbharder", "powercompany"];
export type Dataset = (typeof DATASETS)[number];
