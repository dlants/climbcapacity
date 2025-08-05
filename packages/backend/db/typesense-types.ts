import { MeasureId } from "../../iso/measures/index.js";
import { UnitValue, FacetString } from "../../iso/units.js";
import { Dataset, MeasureClassName } from "../../iso/protocol.js";
import { CollectionCreateSchema } from "typesense/lib/Typesense/Collections.js";

/**
 * Typesense document representing a climbing performance snapshot
 */
export interface SnapshotTypesenseDoc {
  /** Primary key - string version of MongoDB ObjectId */
  id: string;

  /** User ID who owns this snapshot */
  userId: string;

  /** Raw measures with values converted to strings for Typesense compatibility */
  measures: {
    [measureId: MeasureId]: {
      unit: string;
      value: string; // All values stored as strings to avoid type conflicts
    };
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
 * Collection schema for snapshots in Typesense
 */
export const SNAPSHOTS_COLLECTION_SCHEMA: CollectionCreateSchema = {
  name: "snapshots",
  enable_nested_fields: true,
  fields: [
    { name: "id", type: "string" },
    { name: "userId", type: "string", facet: true },
    { name: "measures", type: "object" },
    { name: "anthro_facets", type: "string[]", facet: true },
    { name: "output_measure_ids", type: "string[]", facet: true },
    { name: "input_measure_classes", type: "string[]", facet: true },
    { name: "input_measure_ids", type: "string[]", facet: true },
    { name: "createdAt", type: "int64", sort: true },
    { name: "lastUpdated", type: "int64", sort: true },
    { name: "importSource", type: "string", facet: true, optional: true },
  ],
};
