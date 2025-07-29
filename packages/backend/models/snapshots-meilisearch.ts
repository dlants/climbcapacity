import {
  SnapshotMeiliDoc,
  SNAPSHOTS_INDEX_CONFIG,
} from "../db/meilisearch-types.js";
import { MeiliSearch, Index } from "meilisearch";
import {
  MeiliFilterQuery,
  Dataset,
  SnapshotUpdateRequest,
  SnapshotQueryResult,
} from "../../iso/protocol.js";
import { User } from "lucia";
import { MeasureId } from "../../iso/measures/index.js";
import { encodeMeasureValue, createMeasureFacets } from "../../iso/units.js";
import { HandledError } from "../utils.js";
import { Backend, Snapshot } from "../types.js";
import { randomUUID } from "crypto";

/**
 * MeiliSearch-based data access layer for snapshots
 * Implements faceted search using single-query pattern from design document
 */
export class SnapshotsMeiliSearch {
  private index: Index;

  constructor(
    private client: MeiliSearch,
    private indexName: string,
  ) {
    this.index = this.client.index(this.indexName);
    // Initialize index configuration if needed
    this.ensureIndexConfiguration();
  }

  private async ensureIndexConfiguration() {
    try {
      // Update index settings to match our configuration
      await this.index.updateSettings({
        searchableAttributes: [...SNAPSHOTS_INDEX_CONFIG.searchableAttributes],
        filterableAttributes: [...SNAPSHOTS_INDEX_CONFIG.filterableAttributes],
        sortableAttributes: [...SNAPSHOTS_INDEX_CONFIG.sortableAttributes],
      });
    } catch (error) {
      console.warn("Could not update MeiliSearch index settings:", error);
    }
  }

  /**
   * Get a single snapshot by ID
   */
  async getSnapshot(snapshotId: string): Promise<Snapshot | undefined> {
    try {
      const doc = await this.index.getDocument<SnapshotMeiliDoc>(snapshotId);
      return this.convertMeiliDocToSnapshot(doc);
    } catch {
      // MeiliSearch throws error for not found, return undefined instead
      return undefined;
    }
  }

  /**
   * Get all snapshots for a user
   */
  async getUsersSnapshots(userId: string): Promise<Snapshot[]> {
    const searchResult = await this.index.search<SnapshotMeiliDoc>("", {
      filter: `userId = "${userId}"`,
      limit: 1000, // Reasonable limit for user snapshots
      sort: ["lastUpdated:desc"],
    });

    return searchResult.hits.map((doc) => this.convertMeiliDocToSnapshot(doc));
  }

  /**
   * Get latest snapshot for a user
   */
  async getLatestSnapshot(userId: string): Promise<Snapshot | undefined> {
    const searchResult = await this.index.search<SnapshotMeiliDoc>("", {
      filter: `userId = "${userId}"`,
      limit: 1,
      sort: ["createdAt:desc"],
    });

    if (searchResult.hits.length === 0) {
      return undefined;
    }

    return this.convertMeiliDocToSnapshot(searchResult.hits[0]);
  }

  /**
   * Create a new snapshot
   */
  async newSnapshot(user: User, importSource?: Dataset): Promise<string> {
    const now = Date.now();
    const snapshotId = randomUUID();

    const doc: SnapshotMeiliDoc = {
      id: snapshotId,
      userId: user.id,
      measures: {},
      normedMeasures: {},
      facets: [],
      createdAt: now,
      lastUpdated: now,
      ...(importSource && { importSource }),
    };

    const task = await this.index.addDocuments([doc]);
    await this.index.tasks.waitForTask(task.taskUid);
    return snapshotId;
  }

  /**
   * Update measures in a snapshot
   */
  async updateMeasure({
    userId,
    requestParams,
  }: {
    userId: string;
    requestParams: SnapshotUpdateRequest;
  }): Promise<boolean> {
    try {
      // Get the existing document
      const existingDoc = await this.index.getDocument<SnapshotMeiliDoc>(
        requestParams.snapshotId,
      );

      // Verify ownership
      if (existingDoc.userId !== userId) {
        throw new HandledError({
          status: 403,
          message: "You can only update your own snapshots",
        });
      }

      // Create updated measures and normalized measures
      const updatedMeasures = { ...existingDoc.measures };
      const updatedNormedMeasures = { ...existingDoc.normedMeasures };

      // Apply updates
      for (const measureIdStr in requestParams.updates || {}) {
        const measureId = measureIdStr as MeasureId;
        const value = requestParams.updates![measureId];
        updatedMeasures[measureId] = value;

        // Normalize the value
        const encoded = encodeMeasureValue({ id: measureId, value });
        updatedNormedMeasures[measureId] = encoded.value;
      }

      // Apply deletes
      for (const measureIdStr in requestParams.deletes || {}) {
        const measureId = measureIdStr as MeasureId;
        delete updatedMeasures[measureId];
        delete updatedNormedMeasures[measureId];
      }

      // Regenerate facets based on updated measures
      const updatedFacets = createMeasureFacets(updatedMeasures);

      // Update the document
      const updatedDoc: SnapshotMeiliDoc = {
        ...existingDoc,
        measures: updatedMeasures,
        normedMeasures: updatedNormedMeasures,
        facets: updatedFacets,
        lastUpdated: Date.now(),
      };

      const task = await this.index.updateDocuments([updatedDoc]);
      await this.index.tasks.waitForTask(task);
      return true;
    } catch (error) {
      if (error instanceof HandledError) {
        throw error;
      }
      console.error("Error updating snapshot:", error);
      return false;
    }
  }

  /**
   * Delete a snapshot
   */
  async deleteSnapshot({
    userId,
    snapshotId,
  }: {
    userId: string;
    snapshotId: string;
  }): Promise<number> {
    try {
      // Verify ownership before deletion
      const doc = await this.index.getDocument<SnapshotMeiliDoc>(snapshotId);
      if (doc.userId !== userId) {
        return 0; // No permission to delete
      }

      const taskPromise = this.index.deleteDocument(snapshotId);
      await taskPromise.waitTask();
      return 1;
    } catch {
      // Document not found or other error
      return 0;
    }
  }

  /**
   * Query snapshots using new filter format with faceted search support
   * Implements single-query pattern for complete facet landscape
   */
  async querySnapshotsWithFilters(
    query: MeiliFilterQuery,
  ): Promise<Backend<SnapshotQueryResult>> {
    // Build filters from query
    const filters: string[] = [];

    // Dataset filters
    const enabledDatasets = Object.entries(query.datasets)
      .filter(([, isEnabled]) => isEnabled)
      .map(([dataset]) => dataset);

    if (enabledDatasets.length > 0) {
      const datasetFilter = enabledDatasets
        .map((dataset) => `importSource = "${dataset}"`)
        .join(" OR ");
      filters.push(`(${datasetFilter})`);
    }

    // Convert filter groups to MeiliSearch filter syntax
    for (const filterGroup of query.filters) {
      if (filterGroup.length === 0) continue;

      // Convert each filter in the group to facet format
      const groupFilters = filterGroup.map((filterStr) => {
        // Convert 'category;value' or 'category;unit;value' to 'category_value' facet format
        const facetString = filterStr.replace(/;/g, "_");
        return `facets = "${facetString}"`;
      });

      // OR the filters within this group, then wrap in parentheses
      if (groupFilters.length > 0) {
        const groupFilter = groupFilters.join(" OR ");
        filters.push(`(${groupFilter})`);
      }
    }

    // Combine all filters with AND
    const filter = filters.length > 0 ? filters.join(" AND ") : undefined;

    // Perform search with facet distribution
    const searchResult = await this.index.search<SnapshotMeiliDoc>("", {
      filter,
      limit: 1000, // Reasonable limit for query results
      facets: ["facets"], // Get facet distribution for the facets field
    });

    // Convert results to snapshots
    const snapshots = searchResult.hits.map((doc) =>
      this.convertMeiliDocToSnapshot(doc),
    );

    return {
      snapshots,
      facetDistribution: searchResult.facetDistribution || {},
      totalHits: searchResult.estimatedTotalHits || searchResult.hits.length,
    };
  }

  /**
   * Convert MeiliSearch document to frontend Snapshot type
   */
  private convertMeiliDocToSnapshot(doc: SnapshotMeiliDoc): Snapshot {
    return {
      ...doc,
      createdAt: new Date(doc.createdAt),
      lastUpdated: new Date(doc.lastUpdated),
    };
  }
}
