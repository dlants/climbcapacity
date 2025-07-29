# ClimbCapacity MongoDB to MeiliSearch Migration Plan

## Executive Summary

This migration involves moving ClimbCapacity entirely from MongoDB to MeiliSearch as the single data store.

**Related Documentation:**

- [Search System Design Document](../notes/search-design-doc.md) - Detailed faceted search design patterns and query strategies

- [Current Mongodb Usage Analysis](../notes/mongodb-usage-analysis.md) - Details on how mongodb is being used currently

## Notes:

** IMPORTANT ** as you implement this plan, clearly mark when each phase is completed

## Implementation Phases

### Phase 1: MeiliSearch Setup ✅ COMPLETED

**Objective**: Get MeiliSearch running locally alongside MongoDB

**Tasks**:

- [x] Add MeiliSearch to `docker-compose.yml`
- [x] Configure MeiliSearch container with proper settings
- [x] Verify MeiliSearch is accessible via Docker
- [x] Update development documentation

**Deliverables**:

- MeiliSearch running on `http://localhost:7700`
- MeiliSearch reachable via bash command

### Phase 2: MeiliSearch SDK Integration ✅ COMPLETED

**Objective**: Set up MeiliSearch connection and verify server integration

**Tasks**:

- [x] Install MeiliSearch JavaScript SDK (`meilisearch` package)
- [x] Create basic MeiliSearch client setup
- [x] Add MeiliSearch connection to backend configuration
- [x] Create test route (`/api/test-meilisearch`) with dummy query
- [x] Verify server starts successfully with MeiliSearch connection

**Deliverables**:

- MeiliSearch SDK integrated
- Test route returning successful connection status
- Server starts without errors

### Phase 3: Document Schema and Index Configuration

**Objective**: Implement single facet array document structure for efficient faceted search

**Tasks**:

- [ ] Create `SnapshotMeiliDoc` interface in `packages/backend/db/meilisearch-types.ts`
- [ ] Implement document structure with:
  - Raw `measures` object with original unit values
  - Normalized `normedMeasures` for filtering/comparison
  - Single `facets` array containing all categorical and binned values
  - Pre-computed demographic and grade level buckets
- [ ] Configure snapshots index with filterable/sortable attributes
- [ ] Create measure normalization utilities using `convertToStandardUnit()`
- [ ] Implement facet array generation (categorical, binned, availability facets)

**Deliverables**:

- `SnapshotMeiliDoc` TypeScript interface
- Index configuration with proper filterable attributes
- Facet generation utilities
- Document transformation functions

### Phase 4: PowerCompany Dataset Import

**Objective**: Import PowerCompany dataset using single facet array structure

**Tasks**:

- [ ] Copy `import-powercompany.ts` → `import-powercompany-meili.ts`
- [ ] Implement document transformation pipeline:
  - Convert raw measures to normalized units using `convertToStandardUnit()`
  - Generate categorical facets (`gender_female`, `gender_male`, etc.)
  - Create binned facets for linear measures (`height_bin_160-165`, `weight_bin_50-55`)
  - Add availability facets for sparse measures (`has_measure_deadlift`)
- [ ] Import PowerCompany dataset to snapshots index
- [ ] Update test route to demonstrate single-query faceted search
- [ ] Validate facet distribution queries work correctly

**Deliverables**:

- PowerCompany dataset imported with facet array structure
- Document transformation pipeline working
- Test route showing facet distributions and counts

### Phase 5: ClimbHarder Dataset Import

**Objective**: Import ClimbHarder dataset to verify index structure with multiple datasets

**Tasks**:

- [ ] Copy `import-climbharder-v3.ts` → `import-climbharder-v3-meili.ts`
- [ ] Update script to use same document transformation pipeline
- [ ] Import ClimbHarder dataset to snapshots index
- [ ] Update test route to show data from both datasets
- [ ] Validate consistent facet structure across datasets
- [ ] Test dataset filtering via `importSource` field

**Deliverables**:

- ClimbHarder dataset imported with consistent facet structure
- Both datasets queryable with unified facet interface
- Dataset-specific filtering working

### Phase 6: Faceted Search API Implementation

**Objective**: Implement faceted search API using single-query pattern from design document

**Tasks**:

- [ ] Create MeiliSearch data access layer (`packages/backend/data-access/`)
- [ ] Implement faceted search functions:
  - `getFacetDistribution()` - single query for complete facet landscape
  - `getAlternativeFilterCounts()` - "what-if" queries for filter exploration
  - `getSampleSnapshots()` - random sampling for visualization
- [ ] Update `/api/meili/snapshots/query` to support faceted search with remove-to-explore pattern
- [ ] Implement efficient filter building from facet selections
- [ ] Add support for range filters via multiple bin selection
- [ ] Maintain existing API response formats

**Deliverables**:

- MeiliSearch-based faceted search implementation
- Single-query pattern for complete facet information
- Remove-to-explore interaction pattern working

### Phase 7: Remaining API Route Migration

**Objective**: Migrate remaining snapshot-related API routes to use MeiliSearch

**Tasks**:

- [ ] Update `/api/my-snapshots` to use MeiliSearch
- [ ] Update `/api/meili/snapshot` (single snapshot fetch) to use MeiliSearch
- [ ] Update `/api/measure-stats` to use MeiliSearch aggregations
- [ ] Implement snapshot CRUD operations (create, update, delete) in MeiliSearch
- [ ] Add MeiliSearch document ID mapping for existing functionality
- [ ] Maintain existing API response formats and error handling

**Deliverables**:

- All snapshot routes using MeiliSearch
- CRUD operations working correctly
- API compatibility fully maintained

---

## Pause Point

**At this point, pause for developer verification:**

- Review MeiliSearch integration and data quality
- Set up backend test harness
- Write tests for snapshot functionality
- Verify end-to-end functionality works as expected

**Next phases will address**:

- Authentication system migration
- Remaining API routes (users, sessions, magic links)
- MongoDB removal
- Production deployment considerations
