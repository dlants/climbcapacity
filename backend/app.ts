import express from "express";
import { connect } from "./db/connect.js";
import { readEnv } from "./env.js";
import { Auth } from "./auth/lucia.js";
import dotenv from "dotenv";
import { SnapshotsModel } from "./models/snapshots.js";
import { Snapshot } from "./types.js";
import assert from "assert";
import { MEASURES } from "../iso/measures/index.js";
import { FilterQuery, SnapshotId } from "../iso/protocol.js";
import mongodb from "mongodb";
import { HandledError } from "./utils.js";
import { MeasureId, UnitValue } from "../iso/units.js";
import { fileURLToPath } from "url";
import { apiRoute } from "./utils.js";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function run() {
  console.log("Starting up...");
  const env = readEnv();
  const { client } = await connect(env.MONGODB_URL);

  const app = express();
  app.use(express.json());

  // once built, this file will be in /app/backend/dist/backend/app.js
  // the built client assets will be in /app/client/dist/
  app.use(express.static(path.join(__dirname, "../../../client/dist")));

  const auth = new Auth({ app, client, env });
  const snapshotModel = new SnapshotsModel({ client });

  app.post(
    "/api/snapshot",
    apiRoute(async (req, res) => {
      const user = await auth.assertLoggedIn(req, res);
      const snapshotId: SnapshotId = req.body.snapshotId;
      assert.equal(
        typeof snapshotId,
        "string",
        "Must provide snapshotId in body",
      );
      const snapshot: Snapshot | undefined = await snapshotModel.getSnapshot(
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
      return snapshot;
    }),
  );

  app.delete(
    "/api/snapshot",
    apiRoute(async (req, res) => {
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

      return "OK";
    }),
  );

  /** Lists out the snapshots for user
   */
  app.post(
    "/api/my-snapshots",
    apiRoute(async (req, res) => {
      const user = await auth.assertLoggedIn(req, res);
      const snapshots: Snapshot[] = await snapshotModel.getUsersSnapshots(
        user.id,
      );
      return snapshots;
    }),
  );

  /** Lists out the snapshots for user
   */
  app.post(
    "/api/my-latest-snapshot",
    apiRoute(async (req, res) => {
      const user = await auth.assertLoggedIn(req, res);
      const snapshot: Snapshot | undefined =
        await snapshotModel.getLatestSnapshot(user.id);
      return { snapshot };
    }),
  );

  app.post(
    "/api/snapshots/query",
    apiRoute(async (req, _res) => {
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

      return await snapshotModel.querySnapshots(query);
    }),
  );

  app.post(
    "/api/snapshots/new",
    apiRoute(async (req, res) => {
      const user = await auth.assertLoggedIn(req, res);
      await snapshotModel.newSnapshot(user);
      return "OK";
    }),
  );

  app.post(
    "/api/snapshots/update",
    apiRoute(async (req, res) => {
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
        return "OK";
      } else {
        throw new HandledError({
          status: 400,
          message: "Unable to update snapshot.",
        });
      }
    }),
  );

  // Serve index.html for all non-API routes that don't match static files
  // (for SPA)
  app.use("/*", (req, res, next) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(__dirname, "../../../client/dist/index.html"));
    } else {
      next();
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
