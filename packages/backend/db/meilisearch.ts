import { MeiliSearch } from "meilisearch";

export function createMeiliSearchClient() {
  const client = new MeiliSearch({
    host: "http://localhost:7700",
    apiKey: "development-master-key",
  });
  
  console.log("MeiliSearch client created");
  return client;
}

export const meiliClient = createMeiliSearchClient();