import mongodb from "mongodb";

export async function connect(mongodbUrl: string) {
  const client = new mongodb.MongoClient(mongodbUrl);
  console.log('connecting to mongodb...')
  await client.connect();
  console.log('connected.')
  const db = client.db();
  return {client, db}
}
