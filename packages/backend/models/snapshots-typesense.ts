import { SnapshotTypesenseDoc } from "../db/typesense-types.js";
import { Client } from "typesense";
import {
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
import { SearchParams } from "typesense/lib/Typesense/Documents.js";

/**
 * Typesense-based data access layer for snapshots
 * Implements faceted search using Typesense faceting capabilities
 */
export class SnapshotsTypesense {
  private collectionName: string;

  constructor(
    private client: Client,
    collectionName: string,
  ) {
    this.collectionName = collectionName;
  }

  /**
   * Get a single snapshot by ID
   */
  async getSnapshot(snapshotId: string): Promise<Snapshot | undefined> {
    try {
      const doc = (await this.client
        .collections(this.collectionName)
        .documents(snapshotId)
        .retrieve()) as SnapshotTypesenseDoc;
      return this.convertTypesenseDocToSnapshot(doc);
    } catch {
      // Typesense throws error for not found, return undefined instead
      return undefined;
    }
  }

  /**
   * Get all snapshots for a user
   */
  async getUsersSnapshots(userId: string): Promise<Snapshot[]> {
    const searchParams: SearchParams = {
      q: "*",
      filter_by: `userId:=${userId}`,
      per_page: 250, // Typesense limit
      sort_by: "lastUpdated:desc",
    };

    const searchResult = await this.client
      .collections(this.collectionName)
      .documents()
      .search(searchParams);

    return searchResult.hits!.map((hit) =>
      this.convertTypesenseDocToSnapshot(hit.document as SnapshotTypesenseDoc),
    );
  }

  /**
   * Get latest snapshot for a user
   */
  async getLatestSnapshot(userId: string): Promise<Snapshot | undefined> {
    const searchParams: SearchParams = {
      q: "*",
      filter_by: `userId:=${userId}`,
      per_page: 1,
      sort_by: "createdAt:desc",
    };

    const searchResult = await this.client
      .collections(this.collectionName)
      .documents()
      .search(searchParams);

    if (!searchResult.hits || searchResult.hits.length === 0) {
      return undefined;
    }

    return this.convertTypesenseDocToSnapshot(
      searchResult.hits[0].document as SnapshotTypesenseDoc,
    );
  }

  /**
   * Create a new snapshot
   */
  async newSnapshot(user: User, importSource?: Dataset): Promise<string> {
    const now = Date.now();
    const snapshotId = randomUUID();

    const doc: SnapshotTypesenseDoc = {
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

    await this.client.collections(this.collectionName).documents().create(doc);
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
  }): Promise<void> {
    // Get the existing document
    const existingDoc = (await this.client
      .collections(this.collectionName)
      .documents(requestParams.snapshotId)
      .retrieve()) as SnapshotTypesenseDoc;

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

    const updatedDoc: SnapshotTypesenseDoc = {
      ...existingDoc,
      measures: updatedMeasures,
      normedMeasures: updatedNormedMeasures,
      ...facets,
      lastUpdated: Date.now(),
    };

    await this.client
      .collections(this.collectionName)
      .documents()
      .upsert(updatedDoc);
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
    // Verify ownership before deletion
    const doc = (await this.client
      .collections(this.collectionName)
      .documents(snapshotId)
      .retrieve()) as SnapshotTypesenseDoc;

    if (doc.userId !== userId) {
      throw new HandledError({
        status: 403,
        message: "No permission to delete this snapshot",
      });
    }

    await this.client
      .collections(this.collectionName)
      .documents(snapshotId)
      .delete();
    return 1;
  }

  /**
   * Convert Typesense document to frontend Snapshot type
   */
  private convertTypesenseDocToSnapshot(doc: SnapshotTypesenseDoc): Snapshot {
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
        (filterStr) => `anthro_facets:=${filterStr}`,
      );
      if (groupFilters.length > 0) {
        const groupFilter = groupFilters.join(" || ");
        filters.push(`(${groupFilter})`);
      }
    }

    // Add output measure filter
    if (query.output_measure_id) {
      filters.push(`output_measure_ids:=${query.output_measure_id}`);
    }

    // Add input measure filter
    if (query.input_measure_id) {
      filters.push(`input_measure_ids:=${query.input_measure_id}`);
    }

    const filter_by = filters.length > 0 ? filters.join(" && ") : undefined;

    const searchParams: SearchParams = {
      q: "*",
      filter_by,
      per_page: 250, // Typesense limit
    };

    const searchResult = await this.client
      .collections(this.collectionName)
      .documents()
      .search(searchParams);

    const snapshots = searchResult.hits!.map((hit) =>
      this.convertTypesenseDocToSnapshot(hit.document as SnapshotTypesenseDoc),
    );

    return {
      snapshots,
      totalHits: searchResult.found || searchResult.hits!.length,
    };
  }

  /**
   * Get anthro facets for the faceted search UI
   */
  async getAnthroFacets(
    query: AnthroFacetsQuery,
  ): Promise<Backend<AnthroFacetsResult>> {
    const filters: string[] = [];

    for (const filterGroup of query.anthro_filters) {
      if (filterGroup.length === 0) continue;
      const groupFilters = filterGroup.map(
        (filterStr) => `anthro_facets:=${filterStr}`,
      );
      if (groupFilters.length > 0) {
        const groupFilter = groupFilters.join(" || ");
        filters.push(`(${groupFilter})`);
      }
    }

    // Add output measure filter
    if (query.output_measure_id) {
      filters.push(`output_measure_ids:=${query.output_measure_id}`);
    }

    // Add input measure filter
    if (query.input_measure_id) {
      filters.push(`input_measure_ids:=${query.input_measure_id}`);
    }

    const filter_by = filters.length > 0 ? filters.join(" && ") : undefined;

    const searchParams: SearchParams = {
      q: "*",
      filter_by,
      per_page: 0, // We only want facets, not results
      facet_by: "anthro_facets",
      max_facet_values: 100, // Get all facet values
    };

    const searchResult = await this.client
      .collections(this.collectionName)
      .documents()
      .search(searchParams);

    const facetCounts =
      searchResult.facet_counts?.find((f) => f.field_name === "anthro_facets")
        ?.counts || [];

    const anthroDistribution: Record<string, number> = {};
    for (const count of facetCounts) {
      anthroDistribution[count.value] = count.count;
    }

    return {
      anthroDistribution,
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
        (filterStr) => `anthro_facets:=${filterStr}`,
      );
      if (groupFilters.length > 0) {
        const groupFilter = groupFilters.join(" || ");
        filters.push(`(${groupFilter})`);
      }
    }

    // Add input measure filter
    if (query.input_measure_id) {
      filters.push(`input_measure_ids:=${query.input_measure_id}`);
    }

    const filter_by = filters.length > 0 ? filters.join(" && ") : undefined;

    const searchParams: SearchParams = {
      q: "*",
      filter_by,
      per_page: 0, // We only want facets, not results
      facet_by: "output_measure_ids",
      max_facet_values: 100, // Get all facet values
    };

    const searchResult = await this.client
      .collections(this.collectionName)
      .documents()
      .search(searchParams);

    const facetCounts =
      searchResult.facet_counts?.find(
        (f) => f.field_name === "output_measure_ids",
      )?.counts || [];

    const outputMeasureDistribution: Record<string, number> = {};
    for (const count of facetCounts) {
      outputMeasureDistribution[count.value] = count.count;
    }

    return {
      outputMeasureDistribution,
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
        (filterStr) => `anthro_facets:=${filterStr}`,
      );
      if (groupFilters.length > 0) {
        const groupFilter = groupFilters.join(" || ");
        filters.push(`(${groupFilter})`);
      }
    }

    // Add output measure filter
    if (query.output_measure_id) {
      filters.push(`output_measure_ids:=${query.output_measure_id}`);
    }

    const filter_by = filters.length > 0 ? filters.join(" && ") : undefined;

    const searchParams: SearchParams = {
      q: "*",
      filter_by,
      per_page: 0, // We only want facets, not results
      facet_by: "input_measure_classes",
      max_facet_values: 100, // Get all facet values
    };

    const searchResult = await this.client
      .collections(this.collectionName)
      .documents()
      .search(searchParams);

    const facetCounts =
      searchResult.facet_counts?.find(
        (f) => f.field_name === "input_measure_classes",
      )?.counts || [];

    const measureClassDistribution: Record<string, number> = {};
    for (const count of facetCounts) {
      measureClassDistribution[count.value] = count.count;
    }

    return {
      measureClassDistribution,
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
        (filterStr) => `anthro_facets:=${filterStr}`,
      );
      if (groupFilters.length > 0) {
        const groupFilter = groupFilters.join(" || ");
        filters.push(`(${groupFilter})`);
      }
    }

    // Add measure class filter
    filters.push(`input_measure_classes:=${query.input_measure_class}`);

    // Add output measure filter
    if (query.output_measure_id) {
      filters.push(`output_measure_ids:=${query.output_measure_id}`);
    }

    const filter_by = filters.length > 0 ? filters.join(" && ") : undefined;

    const searchParams: SearchParams = {
      q: "*",
      filter_by,
      per_page: 0, // We only want facets, not results
      facet_by: "input_measure_ids",
      max_facet_values: 100, // Get all facet values
    };

    const searchResult = await this.client
      .collections(this.collectionName)
      .documents()
      .search(searchParams);

    const facetCounts =
      searchResult.facet_counts?.find(
        (f) => f.field_name === "input_measure_ids",
      )?.counts || [];

    const inputMeasureDistribution: Record<string, number> = {};
    for (const count of facetCounts) {
      inputMeasureDistribution[count.value] = count.count;
    }

    return {
      inputMeasureDistribution,
    };
  }
}
