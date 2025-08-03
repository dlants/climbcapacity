import { Client } from "typesense";
import { SNAPSHOTS_COLLECTION_SCHEMA } from "../db/typesense-types.js";

/**
 * Test helper that sets up a fresh Typesense collection for testing
 * and cleans it up afterward
 */
export async function withTypesenseClient(
  testFn: (client: Client, collectionName: string) => Promise<void>,
): Promise<void> {
  // Connect to test Typesense instance
  const client = new Client({
    nodes: [
      {
        host: "localhost",
        port: 8108,
        protocol: "http",
      },
    ],
    apiKey: "development-api-key",
    connectionTimeoutSeconds: 2,
  });

  // Create a unique test collection name
  const testCollectionName = `test_${SNAPSHOTS_COLLECTION_SCHEMA.name}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  try {
    // Create the test collection with updated schema
    const testSchema = {
      ...SNAPSHOTS_COLLECTION_SCHEMA,
      name: testCollectionName,
    };
    
    await client.collections().create(testSchema);

    // Run the test function
    await testFn(client, testCollectionName);
  } finally {
    // Clean up: delete the test collection
    try {
      await client.collections(testCollectionName).delete();
    } catch (error) {
      console.warn(`Failed to clean up test collection ${testCollectionName}:`, error);
    }
  }
}

