import mongodb from "mongodb";
import { SnapshotDoc } from "../backend/models/snapshots.js";
import { MeasureId } from "../iso/units.js";

type MeasureStatsDoc = {
  stats: { [measureId: MeasureId]: number };
};

async function aggregateMeasureStats() {
  const client = new mongodb.MongoClient(process.env.MONGODB_URL!);

  try {
    await client.connect();
    const db = client.db();
    const snapshotsCollection = db.collection<SnapshotDoc>("snapshots");
    const measureStatsCollection =
      db.collection<MeasureStatsDoc>("measureStats");

    const cursor = snapshotsCollection.find(
      {},
      { projection: { measures: 1 } },
    );
    const measureStatsDoc: MeasureStatsDoc = {
      stats: {},
    };
    while (true) {
      const next = await cursor.next();
      if (!next) {
        break;
      }

      for (const measureIdStr in next.measures) {
        const measureId = measureIdStr as MeasureId;
        if (!measureStatsDoc.stats[measureId]) {
          measureStatsDoc.stats[measureId] = 0;
        }
        measureStatsDoc.stats[measureId]++;
      }
    }

    await measureStatsCollection.findOneAndReplace({}, measureStatsDoc, {
      upsert: true,
    });

    console.log(JSON.stringify(measureStatsDoc, null, 2));
  } catch (error) {
    console.error("Error aggregating measure stats:", error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the aggregation
aggregateMeasureStats().then(
  () => {
    console.log("Successfully completed measure stats aggregation");
    process.exit(0);
  },
  (err) => {
    console.error("Failed to aggregate measure stats:", err);
    process.exit(1);
  },
);
