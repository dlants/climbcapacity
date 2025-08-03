import express from "express";
import { connect } from "./db/connect.js";
import { createTypesenseClient } from "./db/typesense.js";
import { SNAPSHOTS_COLLECTION_SCHEMA } from "./db/typesense-types.js";
import { readEnv } from "./env.js";
import { Auth } from "./auth/lucia.js";
import dotenv from "dotenv";
import { SnapshotsTypesense } from "./models/snapshots-typesense.js";
import { Backend, Snapshot } from "./types.js";
import assert from "assert";
import { MeasureId, MEASURES } from "../iso/measures/index.js";
import {
  SnapshotUpdateRequest,
  SnapshotQueryResult,
  SnapshotId,
  SnapshotQuery,
  AnthroFacetsQuery,
  OutputMeasureFacetsQuery,
  InputMeasureClassFacetsQuery,
  InputMeasureFacetsForClassQuery,
  AnthroFacetsResult,
  OutputMeasureFacetsResult,
  InputMeasureClassFacetsResult,
  InputMeasureFacetsForClassResult,
} from "../iso/protocol.js";
import { HandledError } from "./utils.js";
import { UnitValue } from "../iso/units.js";
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
  const typesenseClient = await createTypesenseClient();

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
  const snapshotsTypesense = new SnapshotsTypesense(
    typesenseClient,
    SNAPSHOTS_COLLECTION_SCHEMA.name,
  );

  // New faceted search API routes based on UI design plan
  app.post(
    "/api/snapshots/query",
    apiRoute<Backend<SnapshotQueryResult>>(async (req) => {
      const query: SnapshotQuery = req.body.query;

      // Validate query structure
      assert.equal(typeof query, "object", "query must be an object");
      assert.ok(
        Array.isArray(query.anthro_filters),
        "query must contain anthro_filters array",
      );

      // Validate anthro filters structure
      for (const filterGroup of query.anthro_filters) {
        assert.ok(
          Array.isArray(filterGroup),
          "each anthro filter group must be an array",
        );

        for (const filter of filterGroup) {
          assert.equal(typeof filter, "string", "each filter must be a string");
          assert.ok(
            filter.includes(";"),
            `filter "${filter}" must be in format 'category;value' or 'category;unit;value'`,
          );
        }
      }

      // Validate optional measure IDs
      if (query.output_measure_id) {
        assert.equal(
          typeof query.output_measure_id,
          "string",
          "output_measure_id must be a string",
        );
      }

      if (query.input_measure_id) {
        assert.equal(
          typeof query.input_measure_id,
          "string",
          "input_measure_id must be a string",
        );
      }

      const result = await snapshotsTypesense.querySnapshots(query);
      return result;
    }),
  );

  app.post(
    "/api/snapshots/facets/anthro",
    apiRoute<Backend<AnthroFacetsResult>>(async (req) => {
      const query: AnthroFacetsQuery = req.body.query;

      // Validate query structure
      assert.equal(typeof query, "object", "query must be an object");

      assert.ok(
        Array.isArray(query.anthro_filters),
        "query must contain anthro_filters array",
      );

      // Validate anthro filters structure
      for (const filterGroup of query.anthro_filters) {
        assert.ok(
          Array.isArray(filterGroup),
          "each anthro filter group must be an array",
        );

        for (const filter of filterGroup) {
          assert.equal(typeof filter, "string", "each filter must be a string");
          assert.ok(
            filter.includes(";"),
            `filter "${filter}" must be in format 'category;value' or 'category;unit;value'`,
          );
        }
      }

      // Validate optional measure IDs
      if (query.output_measure_id) {
        assert.equal(
          typeof query.output_measure_id,
          "string",
          "output_measure_id must be a string",
        );
      }

      if (query.input_measure_id) {
        assert.equal(
          typeof query.input_measure_id,
          "string",
          "input_measure_id must be a string",
        );
      }

      const result = await snapshotsTypesense.getAnthroFacets(query);
      return result;
    }),
  );

  app.post(
    "/api/snapshots/facets/output_measure",
    apiRoute<Backend<OutputMeasureFacetsResult>>(async (req) => {
      const query: OutputMeasureFacetsQuery = req.body.query;

      // Validate query structure
      assert.equal(typeof query, "object", "query must be an object");
      assert.ok(
        Array.isArray(query.anthro_filters),
        "query must contain anthro_filters array",
      );

      // Validate anthro filters structure
      for (const filterGroup of query.anthro_filters) {
        assert.ok(
          Array.isArray(filterGroup),
          "each anthro filter group must be an array",
        );

        for (const filter of filterGroup) {
          assert.equal(typeof filter, "string", "each filter must be a string");
          assert.ok(
            filter.includes(";"),
            `filter "${filter}" must be in format 'category;value' or 'category;unit;value'`,
          );
        }
      }

      // Validate optional input measure ID
      if (query.input_measure_id) {
        assert.equal(
          typeof query.input_measure_id,
          "string",
          "input_measure_id must be a string",
        );
      }

      const result = await snapshotsTypesense.getOutputMeasureFacets(query);
      return result;
    }),
  );

  app.post(
    "/api/snapshots/facets/input_measure_classes",
    apiRoute<Backend<InputMeasureClassFacetsResult>>(async (req) => {
      const query: InputMeasureClassFacetsQuery = req.body.query;

      // Validate query structure
      assert.equal(typeof query, "object", "query must be an object");
      assert.ok(
        Array.isArray(query.anthro_filters),
        "query must contain anthro_filters array",
      );

      // Validate anthro filters structure
      for (const filterGroup of query.anthro_filters) {
        assert.ok(
          Array.isArray(filterGroup),
          "each anthro filter group must be an array",
        );

        for (const filter of filterGroup) {
          assert.equal(typeof filter, "string", "each filter must be a string");
          assert.ok(
            filter.includes(";"),
            `filter "${filter}" must be in format 'category;value' or 'category;unit;value'`,
          );
        }
      }

      // Validate optional output measure ID
      if (query.output_measure_id) {
        assert.equal(
          typeof query.output_measure_id,
          "string",
          "output_measure_id must be a string",
        );
      }

      const result = await snapshotsTypesense.getInputMeasureClassFacets(query);
      return result;
    }),
  );

  app.post(
    "/api/snapshots/facets/input_measure_for_class",
    apiRoute<Backend<InputMeasureFacetsForClassResult>>(async (req) => {
      const query: InputMeasureFacetsForClassQuery = req.body.query;

      // Validate query structure
      assert.equal(typeof query, "object", "query must be an object");
      assert.ok(
        Array.isArray(query.anthro_filters),
        "query must contain anthro_filters array",
      );
      assert.equal(
        typeof query.input_measure_class,
        "string",
        "input_measure_class must be a string",
      );

      // Validate anthro filters structure
      for (const filterGroup of query.anthro_filters) {
        assert.ok(
          Array.isArray(filterGroup),
          "each anthro filter group must be an array",
        );

        for (const filter of filterGroup) {
          assert.equal(typeof filter, "string", "each filter must be a string");
          assert.ok(
            filter.includes(";"),
            `filter "${filter}" must be in format 'category;value' or 'category;unit;value'`,
          );
        }
      }

      // Validate optional output measure ID
      if (query.output_measure_id) {
        assert.equal(
          typeof query.output_measure_id,
          "string",
          "output_measure_id must be a string",
        );
      }

      const result =
        await snapshotsTypesense.getInputMeasureFacetsForClass(query);
      return result;
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
      const result = await snapshotsTypesense.deleteSnapshot({
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
      const result = await snapshotsTypesense.deleteSnapshot({
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
      const snapshots: Snapshot[] = await snapshotsTypesense.getUsersSnapshots(
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
        await snapshotsTypesense.getLatestSnapshot(user.id);
      return { snapshot };
    }),
  );

  app.post(
    "/api/snapshots/new",
    apiRoute(async (req, res) => {
      const user = await auth.assertLoggedIn(req, res);
      await snapshotsTypesense.newSnapshot(user);
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

      await snapshotsTypesense.updateMeasure({
        userId: user.id,
        requestParams: {
          snapshotId: body.snapshotId,
          updates: body.updates,
          deletes: body.deletes,
        },
      });

      return "OK";
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
