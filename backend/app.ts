import express from "express";
import { connect } from "./db/connect.js";
import { readEnv } from "./env.js";
import { Auth } from "./auth/lucia.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import { SnapshotsModel } from "./models/snapshots.js";
import { Snapshot } from "./types.js";
import assert from "assert";
import { MEASURES } from "../iso/measures.js";
import { MeasureId } from "../iso/protocol.js";
import mongodb from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

async function run() {
  console.log("Starting up...");
  const env = readEnv();
  const { client } = await connect(env.MONGODB_URL);

  const app = express();
  app.use(express.json());

  const auth = new Auth({ app, client, env });
  const snapshotModel = new SnapshotsModel({ client });

  const staticDir = path.join(__dirname, "../../../dist/js");
  console.log(`Serving files from ${staticDir}`);
  app.use("/js", express.static(staticDir));

  app.get("/", (_req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="app"></div>
        <script src="/js/main.js"></script>
      </body>
    </html>
  `);
  });

  app.post("/snapshots", async (req, res) => {
    const user = await auth.assertLoggedIn(req, res);
    const snapshots: Snapshot[] = await snapshotModel.getUsersSnapshots(
      user.id,
    );
    res.json(snapshots);
    return;
  });

  app.post("/snapshots/new", async (req, res) => {
    const user = await auth.assertLoggedIn(req, res);
    await snapshotModel.newSnapshot(user);
    res.json("OK");
    return;
  });

  app.post("/snapshots/update", async (req, res) => {
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

    const value: number = req.body.value;
    assert.equal(
      typeof value,
      "number",
      "Must provide value which is a number",
    );

    const numUpdated = await snapshotModel.updateMeasure({
      userId: user.id,
      snapshotId: new mongodb.ObjectId(snapshotId),
      measure: {
        measureId,
        value,
      },
    });

    if (numUpdated  == 1) {
      res.json("OK");
      return;
    } else {
      res.status(400).json("Unable to update snapshot.")
    }
  });

  app.listen(80, () => {
    console.log("Server running on port 80");
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
