import { MeasureId } from "../../iso/measures/index.js";
import { UnitValue, FacetString } from "../../iso/units.js";
import { Dataset, MeasureClassName } from "../../iso/protocol.js";

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

  anthro_facets: FacetString[]; // Full facets for anthro measures including bins
  output_measure_ids: MeasureId[]; // List of output measureIds present in this snapshot
  input_measure_classes: (MeasureClassName | MeasureId)[]; // Measure classes or standalone measure IDs for input measures
  input_measure_ids: MeasureId[]; // All input measureIds present in this snapshot
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
    "anthro_facets",
    "output_measure_ids",
    "input_measure_classes",
    "input_measure_ids",
  ],
  sortableAttributes: ["createdAt", "lastUpdated"],
} as const;
