import express from "express";
import { connect } from "./db/connect.js";
import { readEnv } from "./env.js";
import { Auth } from "./auth/lucia.js";
import dotenv from "dotenv";
import { SnapshotsModel } from "./models/snapshots.js";
import { Snapshot } from "./types.js";
import assert from "assert";
import { MEASURES } from "../iso/measures.js";
import { FilterQuery, SnapshotId } from "../iso/protocol.js";
import mongodb from "mongodb";
import { HandledError } from "./utils.js";
import { MeasureId, UnitValue } from "../iso/units.js";

dotenv.config();

async function run() {
  console.log("Starting up...");
  const env = readEnv();
  const { client } = await connect(env.MONGODB_URL);

  const app = express();
  app.use(express.json());

  const auth = new Auth({ app, client, env });
  const snapshotModel = new SnapshotsModel({ client });

  app.post("/api/snapshot", async (req, res) => {
    const user = await auth.assertLoggedIn(req, res);
    const snapshotId: SnapshotId = req.body.snapshotId;
    assert.equal(
      typeof snapshotId,
      "string",
      "Must provide snapshotId in body",
    );
    const snapshot: Snapshot | null = await snapshotModel.getSnapshot(
      new mongodb.ObjectId(snapshotId),
    );

    if (!snapshot) {
      throw new HandledError({
        status: 404,
        message: `Snapshot not found`,
      });
    }

    if (snapshot.userId != user.id) {
      throw new HandledError({
        status: 403,
        message: `You can only look at your own snapshots`,
      });
    }
    res.json(snapshot);
    return;
  });

  app.delete("/api/snapshot", async (req, res) => {
    const user = await auth.assertLoggedIn(req, res);
    const snapshotId: SnapshotId = req.body.snapshotId;
    assert.equal(
      typeof snapshotId,
      "string",
      "Must provide snapshotId in body",
    );
    const result = await snapshotModel.deleteSnapshot({
      userId: user.id,
      snapshotId: new mongodb.ObjectId(snapshotId),
    });

    if (result == 0) {
      throw new HandledError({
        status: 404,
        message: `Unable to delete snapshot`,
      });
    }

    res.json("OK");
    return;
  });

  app.post("/api/snapshots", async (req, res) => {
    const user = await auth.assertLoggedIn(req, res);
    const snapshots: Snapshot[] = await snapshotModel.getUsersSnapshots(
      user.id,
    );
    res.json(snapshots);
    return;
  });

  app.post("/api/snapshots/query", async (req, res) => {
    const query: FilterQuery = req.body.query;

    assert.equal(typeof query, "object", "filter must be an object");
    for (const measureId in query) {
      assert.ok(
        MEASURES.findIndex((m) => m.id == measureId) > -1,
        `Measure has invalid id ${measureId}`,
      );

      const val = query[measureId as MeasureId];
      assert.equal(
        typeof val,
        "object",
        `query measure ${measureId} must be an object.`,
      );

      for (const valKey in val) {
        assert.ok(
          ["min", "max"].indexOf(valKey) > -1,
          `query ${measureId} can only define min and max but it defined ${valKey}`,
        );

        assert.equal(
          typeof val[valKey as "min" | "max"],
          "object",
          `query ${measureId}:${valKey} must be a UnitValue`,
        );
      }
    }

    const snapshots: Snapshot[] = await snapshotModel.querySnapshots(query);
    res.json(snapshots);
    return;
  });

  app.post("/api/snapshots/new", async (req, res) => {
    const user = await auth.assertLoggedIn(req, res);
    await snapshotModel.newSnapshot(user);
    res.json("OK");
    return;
  });

  app.post("/api/snapshots/update", async (req, res) => {
    const user = await auth.assertLoggedIn(req, res);
    const snapshotId: string = req.body.snapshotId;
    assert.equal(
      typeof snapshotId,
      "string",
      "Must provide snapshotId of type string",
    );
    const measureId: MeasureId = req.body.measureId;
    assert.equal(
      typeof measureId,
      "string",
      "Must provide measureId which is a string",
    );

    assert.ok(
      MEASURES.findIndex((m) => m.id == measureId) > -1,
      `Measure had invalid id ${measureId}`,
    );

    const value: UnitValue = req.body.value;
    assert.equal(typeof value, "object", "Must provide valid measure value");

    const updated = await snapshotModel.updateMeasure({
      userId: user.id,
      snapshotId: new mongodb.ObjectId(snapshotId),
      measure: {
        id: measureId,
        value,
      },
    });

    if (updated) {
      res.json("OK");
      return;
    } else {
      res.status(400).json("Unable to update snapshot.");
    }
  });

  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
