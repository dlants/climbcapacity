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
  SnapshotQuery,
  AnthroFacetsQuery,
  AnthroFacetsResult,
  OutputMeasureFacetsQuery,
  OutputMeasureFacetsResult,
  InputMeasureClassFacetsQuery,
  InputMeasureClassFacetsResult,
  InputMeasureFacetsForClassQuery,
  InputMeasureFacetsForClassResult,
} from "../../iso/protocol.js";
import { User } from "lucia";
import { MeasureId } from "../../iso/measures/index.js";
import {
  encodeMeasureValue,
  createFacetsForMeasures,
} from "../../iso/units.js";
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
      anthro_facets: [],
      output_measure_ids: [],
      input_measure_classes: [],
      input_measure_ids: [],
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

      const facets = createFacetsForMeasures(updatedMeasures);

      // Update the document
      const updatedDoc: SnapshotMeiliDoc = {
        ...existingDoc,
        measures: updatedMeasures,
        normedMeasures: updatedNormedMeasures,
        ...facets,
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

      // Convert each filter in the group to anthro_facets format
      const groupFilters = filterGroup.map((filterStr) => {
        return `anthro_facets = "${filterStr}"`;
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
    });

    // Convert results to snapshots
    const snapshots = searchResult.hits.map((doc) =>
      this.convertMeiliDocToSnapshot(doc),
    );

    return {
      snapshots,
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

  /**
   * Query snapshots using new faceted search format
   */
  async querySnapshots(
    query: SnapshotQuery,
  ): Promise<Backend<SnapshotQueryResult>> {
    const filters: string[] = [];

    // Add anthro filters
    for (const filterGroup of query.anthro_filters) {
      if (filterGroup.length === 0) continue;

      const groupFilters = filterGroup.map(
        (filterStr) => `anthro_facets = "${filterStr}"`,
      );
      if (groupFilters.length > 0) {
        const groupFilter = groupFilters.join(" OR ");
        filters.push(`(${groupFilter})`);
      }
    }

    // Add output measure filter
    if (query.output_measure_id) {
      filters.push(`output_measure_ids = "${query.output_measure_id}"`);
    }

    // Add input measure filter
    if (query.input_measure_id) {
      filters.push(`input_measure_ids = "${query.input_measure_id}"`);
    }

    const filter = filters.length > 0 ? filters.join(" AND ") : undefined;

    const searchResult = await this.index.search<SnapshotMeiliDoc>("", {
      filter,
      limit: 1000,
    });

    const snapshots = searchResult.hits.map((doc) =>
      this.convertMeiliDocToSnapshot(doc),
    );

    return {
      snapshots,
      totalHits: searchResult.estimatedTotalHits || searchResult.hits.length,
    };
  }

  /**
   * Get anthro facets for the faceted search UI
   */
  async getAnthroFacets(
    query: AnthroFacetsQuery,
  ): Promise<Backend<AnthroFacetsResult>> {
    const filters: string[] = [];

    // Add anthro filters
    for (const filterGroup of query.anthro_filters) {
      if (filterGroup.length === 0) continue;

      const groupFilters = filterGroup.map(
        (filterStr) => `anthro_facets = "${filterStr}"`,
      );
      if (groupFilters.length > 0) {
        const groupFilter = groupFilters.join(" OR ");
        filters.push(`(${groupFilter})`);
      }
    }

    // Add output measure filter
    if (query.output_measure_id) {
      filters.push(`output_measure_ids = "${query.output_measure_id}"`);
    }

    // Add input measure filter
    if (query.input_measure_id) {
      filters.push(`input_measure_ids = "${query.input_measure_id}"`);
    }

    const filter = filters.length > 0 ? filters.join(" AND ") : undefined;

    const searchResult = await this.index.search<SnapshotMeiliDoc>("", {
      filter,
      limit: 0, // We only want facets, not results
      facets: ["anthro_facets"],
    });

    if (
      !(
        searchResult.facetDistribution &&
        searchResult.facetDistribution["anthro_facets"]
      )
    ) {
      throw new Error("No facet distribution found");
    }

    return {
      anthroDistribution: searchResult.facetDistribution["anthro_facets"],
    };
  }

  /**
   * Get output measure facets
   */
  async getOutputMeasureFacets(
    query: OutputMeasureFacetsQuery,
  ): Promise<Backend<OutputMeasureFacetsResult>> {
    const filters: string[] = [];

    // Add anthro filters
    for (const filterGroup of query.anthro_filters) {
      if (filterGroup.length === 0) continue;

      const groupFilters = filterGroup.map(
        (filterStr) => `anthro_facets = "${filterStr}"`,
      );
      if (groupFilters.length > 0) {
        const groupFilter = groupFilters.join(" OR ");
        filters.push(`(${groupFilter})`);
      }
    }

    // Add input measure filter
    if (query.input_measure_id) {
      filters.push(`input_measure_ids = "${query.input_measure_id}"`);
    }

    const filter = filters.length > 0 ? filters.join(" AND ") : undefined;

    const searchResult = await this.index.search<SnapshotMeiliDoc>("", {
      filter,
      limit: 0, // We only want facets, not results
      facets: ["output_measure_ids"],
    });

    if (
      !(
        searchResult.facetDistribution &&
        searchResult.facetDistribution["output_measure_ids"]
      )
    ) {
      throw new Error("No facet distribution found");
    }

    return {
      outputMeasureDistribution:
        searchResult.facetDistribution["output_measure_ids"],
    };
  }

  /**
   * Get input measure class facets
   */
  async getInputMeasureClassFacets(
    query: InputMeasureClassFacetsQuery,
  ): Promise<Backend<InputMeasureClassFacetsResult>> {
    const filters: string[] = [];

    // Add anthro filters
    for (const filterGroup of query.anthro_filters) {
      if (filterGroup.length === 0) continue;

      const groupFilters = filterGroup.map(
        (filterStr) => `anthro_facets = "${filterStr}"`,
      );
      if (groupFilters.length > 0) {
        const groupFilter = groupFilters.join(" OR ");
        filters.push(`(${groupFilter})`);
      }
    }

    // Add output measure filter
    if (query.output_measure_id) {
      filters.push(`output_measure_ids = "${query.output_measure_id}"`);
    }

    const filter = filters.length > 0 ? filters.join(" AND ") : undefined;

    const searchResult = await this.index.search<SnapshotMeiliDoc>("", {
      filter,
      limit: 0, // We only want facets, not results
      facets: ["input_measure_classes"],
    });
    if (
      !(
        searchResult.facetDistribution &&
        searchResult.facetDistribution["input_measure_classes"]
      )
    ) {
      throw new Error("No facet distribution found");
    }

    return {
      measureClassDistribution:
        searchResult.facetDistribution["input_measure_classes"],
    };
  }

  /**
   * Get input measure facets for a specific class
   */
  async getInputMeasureFacetsForClass(
    query: InputMeasureFacetsForClassQuery,
  ): Promise<Backend<InputMeasureFacetsForClassResult>> {
    const filters: string[] = [];

    // Add anthro filters
    for (const filterGroup of query.anthro_filters) {
      if (filterGroup.length === 0) continue;

      const groupFilters = filterGroup.map(
        (filterStr) => `anthro_facets = "${filterStr}"`,
      );
      if (groupFilters.length > 0) {
        const groupFilter = groupFilters.join(" OR ");
        filters.push(`(${groupFilter})`);
      }
    }

    // Add measure class filter
    filters.push(`input_measure_classes = "${query.input_measure_class}"`);

    // Add output measure filter
    if (query.output_measure_id) {
      filters.push(`output_measure_ids = "${query.output_measure_id}"`);
    }

    const filter = filters.length > 0 ? filters.join(" AND ") : undefined;

    const searchResult = await this.index.search<SnapshotMeiliDoc>("", {
      filter,
      limit: 0, // We only want facets, not results
      facets: ["input_measure_ids"],
    });

    if (
      !(
        searchResult.facetDistribution &&
        searchResult.facetDistribution["input_measure_ids"]
      )
    ) {
      throw new Error("No facet distribution found");
    }

    return {
      inputMeasureDistribution:
        searchResult.facetDistribution["input_measure_ids"],
    };
  }
}
