import express from "express";
import { connect } from "./db/connect.js";
import { meiliClient } from "./db/meilisearch.js";
import { SNAPSHOTS_INDEX_CONFIG } from "./db/meilisearch-types.js";
import { readEnv } from "./env.js";
import { Auth } from "./auth/lucia.js";
import dotenv from "dotenv";
import { SnapshotsMeiliSearch } from "./models/snapshots-meilisearch.js";
import { Snapshot } from "./types.js";
import assert from "assert";
import { MEASURES } from "../iso/measures/index.js";
import {
  MeiliFilterQuery,
  MeasureStats,
  SnapshotId,
  SnapshotUpdateRequest,
  DATASETS,
  Dataset,
} from "../iso/protocol.js";
import { asyncRoute, HandledError } from "./utils.js";
import { UnitValue } from "../iso/units.js";
import { MeasureId } from "../iso/measures/index.js";
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

  // we are sitting behind the render proxy. This should help the rate limiter work properly.
  app.set("trust proxy", 2);
  app.get("/api/ip", (req, res) => {
    res.send(req.ip);
  });

  app.use(express.json());
  // once built, this file will be in /app/packages/backend/dist/backend/app.js
  // the built frontend assets will be in /app/packages/frontend/dist/
  app.use(express.static(path.join(__dirname, "../../../frontend/dist")));

  const auth = new Auth({ app, client, env });
  const snapshotsMeili = new SnapshotsMeiliSearch(
    meiliClient,
    SNAPSHOTS_INDEX_CONFIG.indexName,
  );

  app.get(
    "/api/measure-stats",
    asyncRoute(async (req, res) => {
      // TODO: Implement measure stats in MeiliSearch model
      const stats: MeasureStats = {};

      const etag = `"${Buffer.from(JSON.stringify(stats)).toString("base64")}"`;
      if (req.header("If-None-Match") === etag) {
        res.status(304).send();
        return res;
      }

      res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
      res.setHeader("ETag", etag);

      res.json(stats);
      return res;
    }),
  );

  app.post(
    "/api/meili/snapshots/query",
    apiRoute(async (req) => {
      const query: MeiliFilterQuery = req.body.query;

      // Validate query structure
      assert.equal(typeof query, "object", "query must be an object");
      assert.equal(
        typeof query.datasets,
        "object",
        "query must contain datasets object",
      );
      assert.ok(
        Array.isArray(query.filters),
        "query must contain filters array",
      );

      // Validate datasets
      for (const dataset in query.datasets) {
        assert.ok(
          DATASETS.includes(dataset),
          `dataset ${dataset} is not valid`,
        );

        const enabled = query.datasets[dataset as Dataset];
        assert.equal(
          typeof enabled,
          "boolean",
          `dataset ${dataset} must be enabled or disabled with boolean`,
        );
      }

      // Validate filters structure
      for (const filterGroup of query.filters) {
        assert.ok(
          Array.isArray(filterGroup),
          "each filter group must be an array",
        );

        for (const filter of filterGroup) {
          assert.equal(typeof filter, "string", "each filter must be a string");

          // Basic validation that filter contains semicolons for proper format
          assert.ok(
            filter.includes(";"),
            `filter "${filter}" must be in format 'category;value' or 'category;unit;value'`,
          );
        }
      }

      const result = await snapshotsMeili.querySnapshotsWithFilters(query);
      return {
        snapshots: result.snapshots,
        facetDistribution: result.facetDistribution,
        totalHits: result.totalHits,
      };
    }),
  );

  app.post(
    "/api/meili/snapshot",
    apiRoute(async (req, res) => {
      const user = await auth.assertLoggedIn(req, res);
      const snapshotId: SnapshotId = req.body.snapshotId;
      assert.equal(
        typeof snapshotId,
        "string",
        "Must provide snapshotId in body",
      );
      const snapshot: Snapshot | undefined =
        await snapshotsMeili.getSnapshot(snapshotId);

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

  app.post(
    "/api/meili/my-snapshots",
    apiRoute(async (req, res) => {
      const user = await auth.assertLoggedIn(req, res);
      const snapshots: Snapshot[] = await snapshotsMeili.getUsersSnapshots(
        user.id,
      );
      return snapshots;
    }),
  );

  app.post(
    "/api/meili/snapshots/new",
    apiRoute(async (req, res) => {
      const user = await auth.assertLoggedIn(req, res);
      await snapshotsMeili.newSnapshot(user);
      return "OK";
    }),
  );

  app.post(
    "/api/meili/snapshots/update",
    apiRoute(async (req, res) => {
      const user = await auth.assertLoggedIn(req, res);
      const body = req.body as SnapshotUpdateRequest;

      assert.equal(
        typeof body.snapshotId,
        "string",
        "Must provide snapshotId of type string",
      );

      if (body.updates) {
        assert.equal(
          typeof body.updates,
          "object",
          "updates must be an object",
        );
      }

      if (body.deletes) {
        assert.equal(
          typeof body.deletes,
          "object",
          "deletes must be an object",
        );
      }

      assert.ok(
        body.updates || body.deletes,
        "must provide either updates or deletes object",
      );

      for (const measureId in body.updates || {}) {
        assert.ok(
          MEASURES.findIndex((m) => m.id == measureId) > -1,
          `updates has invalid key ${measureId}`,
        );

        const update = body.updates![measureId as MeasureId];
        const value: UnitValue = update;
        assert.equal(
          typeof value,
          "object",
          "Must provide valid measure value",
        );
      }

      for (const measureId in body.deletes || {}) {
        assert.ok(
          MEASURES.findIndex((m) => m.id == measureId) > -1,
          `deletes has invalid key ${measureId}`,
        );

        const value = body.deletes![measureId as MeasureId];
        assert.equal(value, true, "all deletes keys must be 'true'");
      }

      const updated = await snapshotsMeili.updateMeasure({
        userId: user.id,
        requestParams: {
          snapshotId: body.snapshotId,
          updates: body.updates,
          deletes: body.deletes,
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

  app.delete(
    "/api/meili/snapshot",
    apiRoute(async (req, res) => {
      const user = await auth.assertLoggedIn(req, res);
      const snapshotId: SnapshotId = req.body.snapshotId;
      assert.equal(
        typeof snapshotId,
        "string",
        "Must provide snapshotId in body",
      );
      const result = await snapshotsMeili.deleteSnapshot({
        userId: user.id,
        snapshotId: snapshotId,
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
      const snapshot: Snapshot | undefined =
        await snapshotsMeili.getSnapshot(snapshotId);

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
      const result = await snapshotsMeili.deleteSnapshot({
        userId: user.id,
        snapshotId: snapshotId,
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
      const snapshots: Snapshot[] = await snapshotsMeili.getUsersSnapshots(
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
        await snapshotsMeili.getLatestSnapshot(user.id);
      return { snapshot };
    }),
  );

  app.post(
    "/api/snapshots/new",
    apiRoute(async (req, res) => {
      const user = await auth.assertLoggedIn(req, res);
      await snapshotsMeili.newSnapshot(user);
      return "OK";
    }),
  );

  app.post(
    "/api/snapshots/update",
    apiRoute(async (req, res) => {
      const user = await auth.assertLoggedIn(req, res);
      const body = req.body as SnapshotUpdateRequest;

      assert.equal(
        typeof body.snapshotId,
        "string",
        "Must provide snapshotId of type string",
      );

      if (body.updates) {
        assert.equal(
          typeof body.updates,
          "object",
          "updates must be an object",
        );
      }

      if (body.deletes) {
        assert.equal(
          typeof body.deletes,
          "object",
          "deletes must be an object",
        );
      }

      assert.ok(
        body.updates || body.deletes,
        "must provide either updates or deletes object",
      );

      for (const measureId in body.updates || {}) {
        assert.ok(
          MEASURES.findIndex((m) => m.id == measureId) > -1,
          `updates has invalid key ${measureId}`,
        );

        const update = body.updates![measureId as MeasureId];
        const value: UnitValue = update;
        assert.equal(
          typeof value,
          "object",
          "Must provide valid measure value",
        );
      }

      for (const measureId in body.deletes || {}) {
        assert.ok(
          MEASURES.findIndex((m) => m.id == measureId) > -1,
          `deletes has invalid key ${measureId}`,
        );

        const value = body.deletes![measureId as MeasureId];
        assert.equal(value, true, "all deletes keys must be 'true'");
      }

      const updated = await snapshotsMeili.updateMeasure({
        userId: user.id,
        requestParams: {
          snapshotId: body.snapshotId,
          updates: body.updates,
          deletes: body.deletes,
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
      res.sendFile(path.join(__dirname, "../../../frontend/dist/index.html"));
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
