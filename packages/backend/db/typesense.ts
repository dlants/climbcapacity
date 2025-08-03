import { Client } from "typesense";
import { SNAPSHOTS_COLLECTION_SCHEMA } from "./typesense-types.js";

export async function createTypesenseClient() {
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

  console.log("Typesense client created, ensuring collection exists...");

  // Ensure the snapshots collection exists
  try {
    // Check if collection exists
    await client.collections(SNAPSHOTS_COLLECTION_SCHEMA.name).retrieve();
    console.log(
      `Collection '${SNAPSHOTS_COLLECTION_SCHEMA.name}' already exists`,
    );
  } catch {
    // Collection doesn't exist, create it
    try {
      await client.collections().create(SNAPSHOTS_COLLECTION_SCHEMA);
      console.log(`Created collection '${SNAPSHOTS_COLLECTION_SCHEMA.name}'`);
    } catch (createError) {
      console.error("Failed to create Typesense collection:", createError);
      throw createError;
    }
  }

  return client;
}

// Create the client instance - this will be initialized in app.ts
export let typesenseClient: Client;

