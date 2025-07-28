# Search system design considerations

## Data Organization

I have users (really just emails). I have snapshots associated with those users. In those snapshots are a variety of measures:

- **Anthropomorphic measures**: height, weight, gender, wingspan, etc. (filter-only)
- **Performance measures**: indoor/outdoor climbing grades, boulder/sport grades, etc. (output selection)
- **Capacity measures**: deadlift, pullups, max jump, etc. (visualization data)

## Faceted Search Interface

We're building a faceted search interface allowing exploration of these measures:

1. **Anthropomorphic filters**: Select subsets like "women between 5'1 and 5'3"
2. **Performance measure selection**: Choose one output measure for analysis
3. **Visualization**: Show capacity measures plotted against the selected performance measure
4. **Data availability**: Show how many snapshots have each measure defined

## Unit Normalization

All measures are stored in search using standardized units for consistency and efficient querying:

- **Climbing grades**: IRCRA (0-52 scale) - converts from V-grades, Font, YDS, French Sport, etc.
- **Distance/Height**: Meters - converts from cm, inches, feet
- **Weight**: Kilograms - converts from pounds
- **Time**: Seconds - converts from minutes, hours
- **Other units**: As defined in `packages/iso/units.ts`

The `convertToStandardUnit()` function in `iso/units.ts` handles all conversions to normalized values for search indexing.

## Binning Strategy

Bins are chosen to make sense in both metric and imperial units:

**Height bins** (every 5cm / ~2 inches):

- Boundaries align with common imperial ranges: 5'2"-5'4", 5'4"-5'6", 5'6"-5'8", etc.
- Example bins: `150-155cm`, `155-160cm`, `160-165cm`, `165-170cm`

**Weight bins** (~2kg / 5lb increments):

- Example bins: `45-47kg`, `47-50kg`, `50-52kg`, `52-55kg`, `55-57kg`, `57-60kg`

**Climbing grade bins**:

- Use IRCRA values with logical groupings that correspond to grade boundaries
- Example: `ircra_10-12` (roughly V3-V4), `ircra_13-15` (roughly V4-V5)

## Document Structure

Each snapshot is indexed as a document with both raw values (for filtering/sorting) and a flattened facet array:

```typescript
interface SnapshotDocument {
  id: string;
  userId: string;

  // Raw values for filtering and sorting
  gender?: "male" | "female" | "other";
  height_cm?: number;
  weight_kg?: number;
  wingspan_cm?: number;
  deadlift_kg?: number;
  pullups_max?: number;
  indoor_boulder_max_grade?: number;

  // Single flattened facet array containing all binned/categorical values
  facets: string[]; // ['gender_female', 'height_bin_160-165', 'weight_bin_50-55', 'has_measure_deadlift', 'has_measure_pullups']
}
```

## Facet Array Construction

The `facets` array contains:

- **Categorical facets**: `gender_female`, `gender_male`, etc.
- **Binned linear measures**: `height_bin_160-165`, `weight_bin_50-55`, etc.
- **Data availability**: `has_measure_deadlift`, `has_measure_pullups`, etc.

```typescript
function createSnapshotDocument(snapshot: Snapshot): SnapshotDocument {
  const facets = [];

  // Add categorical facets
  if (snapshot.gender) facets.push(`gender_${snapshot.gender}`);

  // Add binned facets
  if (snapshot.height_cm) {
    const bin = createBin(snapshot.height_cm, "height");
    facets.push(`height_bin_${bin}`);
  }

  if (snapshot.weight_kg) {
    const bin = createBin(snapshot.weight_kg, "weight");
    facets.push(`weight_bin_${bin}`);
  }

  // Add availability facets for sparse measures
  if (snapshot.deadlift_kg !== undefined) facets.push("has_measure_deadlift");
  if (snapshot.pullups_max !== undefined) facets.push("has_measure_pullups");
  if (snapshot.max_jump_cm !== undefined) facets.push("has_measure_max_jump");

  return {
    ...snapshot,
    facets,
  };
}
```

## Single Query Pattern

With this structure, a single facet query provides complete information about:

- Current filter selections and their counts
- Available options within current filters
- Data availability for all measures

```typescript
// Get complete facet landscape with current filters
const results = await meiliClient.index("snapshots").search("", {
  filter: buildFilterFromState(currentFilters),
  facets: ["facets"], // Single facet field gives us everything
  limit: 0,
});

console.log(results.facetDistribution.facets);
// {
//   "gender_female": 127,        // Current selection
//   "height_bin_160-165": 127,   // Current selection
//   "weight_bin_45-50": 67,      // Available within current filters
//   "weight_bin_50-55": 89,      // Available within current filters
//   "has_measure_deadlift": 89,  // Data availability within current filters
//   "has_measure_pullups": 67,   // Data availability within current filters
//   // ... all options available within current filter scope
// }
```

## Filtering with Facet Array

Range filters are translated into multiple bin filters:

```typescript
// Height range 160-170cm becomes multiple bin filters
const heightBins = ["height_bin_160-165", "height_bin_165-170"];
const heightFilter = heightBins.map((bin) => `facets = ${bin}`).join(" OR ");

// Combined filter
const filter = `(facets = gender_female) AND (${heightFilter}) AND (facets = has_measure_deadlift)`;
```

## UX Design: Remove-to-Explore Pattern

Instead of "alternative queries" (showing what would happen if you switched filters), we use a remove-to-explore pattern:

**User Flow:**

1. Current state: `female, 160-165cm height`
2. User clicks "✕" to remove gender filter
3. New state: `160-165cm height only` - now shows all gender options available
4. User clicks `male` to apply new gender filter
5. New state: `male, 160-165cm height`

**Benefits:**

- Single query pattern: always just current filters + available options within those filters
- Intuitive UX: matches user mental model of removing constraints to see more options
- No complex alternate queries needed
- Works perfectly with single facet array approach

## Sample Queries

The system supports queries like:

- **Basic filtering**: "Female climbers between 5'3-5'5 who weigh 100-120lb"
- **Data availability**: "How many climbers in this subset have deadlift data?"
- **Exploration**: "What other height ranges are available if I remove the current height filter?"
- **Sampling**: "Give me 1000 random snapshots matching these filters for visualization"

## Implementation Advantages

1. **Storage efficiency**: Single facet array instead of ~100 boolean availability fields
2. **Query efficiency**: One facet query gets complete landscape
3. **Scalable**: Works well with ~100 measures and large datasets
4. **Flexible**: Can filter and sort using either raw values or facet array
5. **User-friendly**: Intuitive remove-to-explore interaction pattern

# assistant:

💭 [Thinking]
Looking at your search requirements, Meilisearch is a good choice for this faceted search system. Here's how I'd approach it:

## Document Structure

Index each snapshot as a document with flattened measure values:

```typescript
interface SnapshotDocument {
  id: string;
  userId: string;

  // Anthropomorphic measures (with bins for linear ones)
  gender?: 'male' | 'female' | 'other';
  height_cm?: number;
  height_bin?: '150-155' | '155-160' | '160-165' | ...;  // Pre-computed bins
  weight_kg?: number;
  weight_bin?: '50-55' | '55-60' | '60-65' | ...;
  wingspan_cm?: number;
  wingspan_bin?: '150-155' | '155-160' | ...;

  // Performance measures
  indoor_boulder_max_grade?: number;
  outdoor_sport_max_grade?: number;

  // Capacity measures
  deadlift_kg?: number;
  pullups_max?: number;
  max_jump_cm?: number;

  // Availability flags for sparse measures
  has_deadlift: boolean;
  has_pullups: boolean;
  has_max_jump: boolean;
}
```

## Faceting Configuration

Configure all potential filter fields as facets:

```typescript
await meiliClient.index("snapshots").updateFilterableAttributes([
  "gender",
  "height_bin",
  "weight_bin",
  "wingspan_bin", // Binned linear measures
  "height_cm",
  "weight_kg",
  "wingspan_cm", // Raw values for range filters
  "has_deadlift",
  "has_pullups",
  "has_max_jump", // Availability
  // ... all other measures
]);

await meiliClient.index("snapshots").updateSortableAttributes([
  "height_cm",
  "weight_kg",
  "deadlift_kg",
  "pullups_max", // For sampling
]);
```

## Query Strategy

For your sample queries:

```typescript
// Query 1: Effect of adding wingspan filter
const baseFilters =
  "gender = female AND height_cm >= 160 AND height_cm <= 165 AND weight_kg >= 45 AND weight_kg <= 54";

const currentResults = await meiliClient.index("snapshots").search("", {
  filter: baseFilters,
  facets: ["wingspan_bin"],
  limit: 0, // Just want facet counts
});

// Shows wingspan distribution within current filters
currentResults.facetDistribution.wingspan_bin;
// { '160-165': 45, '165-170': 32, '155-160': 28 }
```

```typescript
// Query 2: Effect of choosing different output measures
const results = await meiliClient.index("snapshots").search("", {
  filter: baseFilters,
  facets: ["has_indoor_boulder_max_grade", "has_outdoor_sport_max_grade"],
  limit: 0,
});

// Shows availability of different performance measures
results.facetDistribution.has_indoor_boulder_max_grade; // { true: 127 }
results.facetDistribution.has_outdoor_sport_max_grade; // { true: 89 }
```

## Binning Strategy

Pre-compute bins during indexing to avoid complex range queries:

```typescript
function createBins(value: number, measure: string): string {
  const binConfigs = {
    height_cm: { min: 140, max: 200, binSize: 5 },
    weight_kg: { min: 40, max: 120, binSize: 5 },
    wingspan_cm: { min: 140, max: 220, binSize: 5 },
  };

  const config = binConfigs[measure];
  const binStart =
    Math.floor((value - config.min) / config.binSize) * config.binSize +
    config.min;
  return `${binStart}-${binStart + config.binSize}`;
}
```

## Sampling Implementation

For random sampling of matching snapshots:

```typescript
async function getSampleSnapshots(filters: string, sampleSize: number = 1000) {
  // Get total count first
  const countResult = await meiliClient.index("snapshots").search("", {
    filter: filters,
    limit: 0,
  });

  const totalHits = countResult.estimatedTotalHits;

  if (totalHits <= sampleSize) {
    // Return all if sample size is larger than total
    return meiliClient.index("snapshots").search("", {
      filter: filters,
      limit: totalHits,
    });
  }

  // Random sampling by using random offset
  const randomOffset = Math.floor(
    Math.random() * Math.max(0, totalHits - sampleSize),
  );

  return meiliClient.index("snapshots").search("", {
    filter: filters,
    limit: sampleSize,
    offset: randomOffset,
  });
}
```

## Advantages of This Approach

1. **Fast facet queries**: Meilisearch handles facet distribution efficiently
2. **Flexible filtering**: Can combine categorical and range filters
3. **Sparse data handling**: `has_*` flags make data availability transparent
4. **Scalable**: Works well with ~100 measures and large datasets
5. **Histogram support**: Pre-computed bins give you histogram-like facets for linear measures

The main tradeoff is storage overhead from binning and availability flags, but this gives you much faster query performance than computing bins on-the-fly.

# user:

how would one do something like: "I have female selected currently, how many snapshots would there be if i switched to filtering by men"

# assistant:

💭 [Thinking]
Great question! To show alternative values for a currently selected filter, you need to query **without** that specific filter but **with** all other filters, then look at the facet distribution.

## Implementation

```typescript
async function getAlternativeFilterCounts(
  currentFilters: FilterState,
  fieldToExplore: string,
) {
  // Build filter string excluding the field we want to explore
  const otherFilters = Object.entries(currentFilters)
    .filter(([key]) => key !== fieldToExplore)
    .map(([key, value]) => buildFilterString(key, value))
    .filter(Boolean)
    .join(" AND ");

  const results = await meiliClient.index("snapshots").search("", {
    filter: otherFilters || undefined,
    facets: [fieldToExplore],
    limit: 0, // We only want facet counts
  });

  return results.facetDistribution[fieldToExplore];
}
```

## Example Usage

```typescript
// Current state: female climbers, 5'3"-5'5", 100-120lb
const currentFilters = {
  gender: "female",
  height_cm: { min: 160, max: 165 },
  weight_kg: { min: 45, max: 54 },
};

// "What if I switched to men instead?"
const genderAlternatives = await getAlternativeFilterCounts(
  currentFilters,
  "gender",
);

console.log(genderAlternatives);
// { "female": 127, "male": 89, "other": 12 }
// Shows: currently 127 female, but 89 male would match other criteria
```

## UI Implementation

This enables powerful "what-if" interactions:

```typescript
// Show counts for all gender options
<FilterOption
  value="female"
  count={127}
  selected={true}
  onClick={() => updateFilter('gender', 'female')}
/>
<FilterOption
  value="male"
  count={89}  // Shows potential count if switched
  selected={false}
  onClick={() => updateFilter('gender', 'male')}
/>
```

## For Range Filters (Height, Weight, etc.)

For binned measures, you can show the full histogram:

```typescript
// "What's the height distribution if I remove height filter?"
const heightAlternatives = await getAlternativeFilterCounts(
  currentFilters,
  "height_bin",
);

console.log(heightAlternatives);
// {
//   "150-155": 23,
//   "155-160": 45,
//   "160-165": 127,  // Current selection
//   "165-170": 89,
//   "170-175": 34
// }
```

## Optimized Batch Query

To update multiple facets efficiently, query for all at once:

```typescript
async function getAllAlternativeCounts(currentFilters: FilterState) {
  const results = await Promise.all(
    ["gender", "height_bin", "weight_bin", "wingspan_bin"].map((field) =>
      getAlternativeFilterCounts(currentFilters, field),
    ),
  );

  return {
    gender: results[0],
    height_bin: results[1],
    weight_bin: results[2],
    wingspan_bin: results[3],
  };
}
```

This approach gives users real-time feedback about how changing any filter would affect their result set size, which is perfect for exploratory data analysis!
