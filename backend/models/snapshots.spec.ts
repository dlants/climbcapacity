import assert from "assert";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import { SnapshotsModel } from "./snapshots.js";
import { MeasureId } from "../../iso/units.js";

describe("SnapshotsModel", () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let model: SnapshotsModel;

  const mockUser = {
    id: "test-user-id",
  };

  beforeEach(async function () {
    this.timeout(10000);
    mongoServer = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongoServer.getUri());
    model = new SnapshotsModel({ client });
  });

  afterEach(async () => {
    await client.close();
    await mongoServer.stop();
  });

  it("should create and retrieve a snapshot", async () => {
    await model.newSnapshot(mockUser);
    const snapshots = await model.getUsersSnapshots(mockUser.id);
    assert.strictEqual(snapshots.length, 1);
    assert.strictEqual(snapshots[0].userId, mockUser.id);
  });

  it("should delete a snapshot", async () => {
    await model.newSnapshot(mockUser);
    const snapshots = await model.getUsersSnapshots(mockUser.id);
    const deleteCount = await model.deleteSnapshot(snapshots[0]._id);
    assert.strictEqual(deleteCount, 1);
  });

  it("should update a measure", async () => {
    await model.newSnapshot(mockUser);
    const [snapshot] = await model.getUsersSnapshots(mockUser.id);

    const updateCount = await model.updateMeasure({
      snapshotId: snapshot._id,
      userId: mockUser.id,
      measure: {
        id: "weight" as MeasureId,
        value: { value: 70, unit: "kg" },
      },
    });

    assert.strictEqual(updateCount, true, 'snapshot updated');

    const updated = await model.getSnapshot(snapshot._id);
    assert.deepStrictEqual(updated?.measures["weight" as MeasureId], {
      value: 70,
      unit: "kg",
    });
  });

  it("should update measure and measureStr", async () => {
    await model.newSnapshot(mockUser);
    const [snapshot] = await model.getUsersSnapshots(mockUser.id);

    const updateCount = await model.updateMeasure({
      snapshotId: snapshot._id,
      userId: mockUser.id,
      measure: {
        id: "weight" as MeasureId,
        value: { value: 70, unit: "kg" },
      },
    });

    assert.strictEqual(updateCount, true, 'snapshot updated');

    const updated = await model.getSnapshot(snapshot._id);
    assert.deepStrictEqual(updated?.measures["weight" as MeasureId], {
      value: 70,
      unit: "kg",
    });
    // Verify measureStr array contains encoded value
    assert.strictEqual(updated?.measureStrs.length, 1);
    assert.match(updated?.measureStrs[0], /^weight:00000070$/);
  });

  it("should replace existing measureStr when updating", async () => {
    await model.newSnapshot(mockUser);
    const [snapshot] = await model.getUsersSnapshots(mockUser.id);

    // First update
    await model.updateMeasure({
      snapshotId: snapshot._id,
      userId: mockUser.id,
      measure: {
        id: "weight" as MeasureId,
        value: { value: 70, unit: "kg" },
      },
    });

    // Second update
    await model.updateMeasure({
      snapshotId: snapshot._id,
      userId: mockUser.id,
      measure: {
        id: "weight" as MeasureId,
        value: { value: 75, unit: "kg" },
      },
    });

    const updated = await model.getSnapshot(snapshot._id);
    assert.strictEqual(updated?.measureStrs.length, 1);
    assert.match(updated?.measureStrs[0], /^weight:00000075$/);
  });
});
