import mongodb from "mongodb";
import { SnapshotDoc } from "../backend/models/snapshots.js";

async function run() {
  const client = new mongodb.MongoClient(process.env.MONGODB_URL!);
  await client.connect();
  const db = client.db();
  const snapshotsCollection = db.collection<SnapshotDoc>("snapshots");
  await snapshotsCollection.createIndex(
    { userId: 1, createdAt: -1 },
    { background: true },
  );
  await snapshotsCollection.createIndex(
    { normedMeasures: 1 },
    { background: true },
  );
}

run().then(
  () => {
    console.log("Created index successfully");
    process.exit(0);
  },
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
