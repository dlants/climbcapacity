import { MeiliSearch } from "meilisearch";
import { SNAPSHOTS_INDEX_CONFIG } from "../db/meilisearch-types.js";

/**
 * Test helper that sets up a fresh MeiliSearch index for testing
 * and cleans it up afterward
 */
export async function withMeiliClient(
  testFn: (client: MeiliSearch, indexName: string) => Promise<void>,
): Promise<void> {
  // Connect to test MeiliSearch instance
  const client = new MeiliSearch({
    host: "http://localhost:7700",
    apiKey: "development-master-key",
  });

  // Create a unique test index name
  const testIndexName = `test_${SNAPSHOTS_INDEX_CONFIG.indexName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  try {
    // Create the test index
    await client.createIndex(testIndexName, {
      primaryKey: SNAPSHOTS_INDEX_CONFIG.primaryKey,
    });

    // Wait for index creation to complete
    const index = client.index(testIndexName);
    await index.tasks.waitForTasks(
      (await index.tasks.getTasks()).results.map((r) => r.uid),
    );

    // Configure the index with proper settings
    await index.updateSettings({
      searchableAttributes: [...SNAPSHOTS_INDEX_CONFIG.searchableAttributes],
      filterableAttributes: [...SNAPSHOTS_INDEX_CONFIG.filterableAttributes],
      sortableAttributes: [...SNAPSHOTS_INDEX_CONFIG.sortableAttributes],
    });

    // Wait for settings update to complete
    await index.tasks.waitForTasks(
      (await index.tasks.getTasks()).results.map((r) => r.uid),
    );

    // Run the test function
    await testFn(client, testIndexName);
  } finally {
    // Clean up: delete the test index
    try {
      await client.deleteIndex(testIndexName);
    } catch (error) {
      console.warn(`Failed to clean up test index ${testIndexName}:`, error);
    }
  }
}

