import { MeasureId } from "../../iso/measures/index.js";
import { UnitValue, NormedMeasure, FacetString } from "../../iso/units.js";
import { Dataset } from "../../iso/protocol.js";

/**
 * MeiliSearch document representing a climbing performance snapshot
 */
export interface SnapshotMeiliDoc {
  /** Primary key - string version of MongoDB ObjectId */
  id: string;

  /** User ID who owns this snapshot */
  userId: string;

  /** Raw measures as entered by user */
  measures: {
    [measureId: MeasureId]: UnitValue;
  };

  /** Normalized measures for filtering/comparison */
  normedMeasures: {
    [measureId: MeasureId]: number;
  };

  /** Timestamp fields */
  createdAt: number; // Unix timestamp
  lastUpdated: number; // Unix timestamp

  /** Import source for dataset filtering */
  importSource?: Dataset;

  /** Single flattened facet array containing all binned/categorical values for efficient faceted search */
  facets: FacetString[]; // ['gender_female', 'height_bin_160-165', 'weight_bin_50-55', 'has_measure_deadlift', 'has_measure_pullups']
}

/**
 * Index configuration for snapshots
 */
export const SNAPSHOTS_INDEX_CONFIG = {
  indexName: "snapshots",
  primaryKey: "id",
  searchableAttributes: ["userId", "importSource"],
  filterableAttributes: [
    "userId",
    "importSource",
    "createdAt",
    "lastUpdated",
    "facets", // Single facet array enables all faceted search functionality
  ],
  sortableAttributes: ["createdAt", "lastUpdated"],
} as const;

