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

    assert.strictEqual(updateCount, true, "snapshot updated");

    const updated = await model.getSnapshot(snapshot._id);
    assert.deepStrictEqual(updated?.measures["weight" as MeasureId], {
      value: 70,
      unit: "kg",
    });
  });

  it("should update measure and normedMeasures", async () => {
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

    assert.strictEqual(updateCount, true, "snapshot updated");

    const updated = await model.getSnapshot(snapshot._id);
    assert.deepStrictEqual(updated?.measures["weight" as MeasureId], {
      value: 70,
      unit: "kg",
    });
    // Verify normedMeasures array contains encoded value
    assert.strictEqual(updated?.normedMeasures.length, 1);
    assert.deepStrictEqual(updated?.normedMeasures[0], {
      measureId: "weight",
      value: 70, // assuming encodeMeasureValue returns this format
    });
  });

  it("should replace existing normedMeasures when updating", async () => {
    await model.newSnapshot(mockUser);
    const [snapshot] = await model.getUsersSnapshots(mockUser.id);

    await model.updateMeasure({
      snapshotId: snapshot._id,
      userId: mockUser.id,
      measure: {
        id: "weight" as MeasureId,
        value: { value: 70, unit: "kg" },
      },
    });

    await model.updateMeasure({
      snapshotId: snapshot._id,
      userId: mockUser.id,
      measure: {
        id: "height" as MeasureId,
        value: { value: 1.7, unit: "m" },
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
    assert.strictEqual(updated?.normedMeasures.length, 2);
    assert.deepStrictEqual(updated?.normedMeasures[0], {
      measureId: "height",
      value: 1.7,
    });

    assert.deepStrictEqual(updated?.normedMeasures[1], {
      measureId: "weight",
      value: 75,
    });
  });

  describe("querySnapshots", () => {
    it("should query snapshots by measure values", async () => {
      // Create test snapshots
      await model.newSnapshot(mockUser);
      await model.newSnapshot(mockUser);
      await model.newSnapshot(mockUser);
      const [snapshot1, snapshot2, snapshot3] = await model.getUsersSnapshots(
        mockUser.id,
      );
      await model.updateMeasure({
        snapshotId: snapshot1._id,
        userId: mockUser.id,
        measure: {
          id: "weight" as MeasureId,
          value: { value: 70, unit: "kg" },
        },
      });

      await model.updateMeasure({
        snapshotId: snapshot2._id,
        userId: mockUser.id,
        measure: {
          id: "weight" as MeasureId,
          value: { value: 80, unit: "kg" },
        },
      });

      await model.updateMeasure({
        snapshotId: snapshot3._id,
        userId: mockUser.id,
        measure: {
          id: "weight" as MeasureId,
          value: { value: 90, unit: "kg" },
        },
      });

      // Test existence query
      let results = await model.querySnapshots({
        ["weight" as MeasureId]: {},
      });
      assert.strictEqual(results.length, 3);

      // Test min/max query
      results = await model.querySnapshots({
        ["weight" as MeasureId]: {
          min: { unit: "kg", value: 75 },
          max: { unit: "kg", value: 85 },
        },
      });
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].measures["weight" as MeasureId].value, 80);
    });

    it("should query snapshots with different units and negative values", async () => {
      await model.newSnapshot(mockUser);
      await model.newSnapshot(mockUser);
      const [snapshot1, snapshot2] = await model.getUsersSnapshots(mockUser.id);

      await model.updateMeasure({
        snapshotId: snapshot1._id,
        userId: mockUser.id,
        measure: {
          id: "weight" as MeasureId,
          value: { value: 154, unit: "lb" },
        },
      });

      await model.updateMeasure({
        snapshotId: snapshot2._id,
        userId: mockUser.id,
        measure: {
          id: "weight" as MeasureId,
          value: { value: -5, unit: "kg" },
        },
      });

      // Query by weight in kg (should convert from lb)
      let results = await model.querySnapshots({
        ["weight" as MeasureId]: {
          min: { unit: "kg", value: 69 },
          max: { unit: "kg", value: 71 },
        }, // ~70kg = 154lb
      });
      assert.strictEqual(results.length, 1);

      // Query by negative temperature
      results = await model.querySnapshots({
        ["weight" as MeasureId]: {
          min: { unit: "kg", value: -10 },
          max: { unit: "kg", value: 0 },
        },
      });
      assert.strictEqual(results.length, 1);
    });
  });

  it("should handle combined measure queries", async () => {
    await model.newSnapshot(mockUser);
    const [snapshot1] = await model.getUsersSnapshots(mockUser.id);

    await model.updateMeasure({
      snapshotId: snapshot1._id,
      userId: mockUser.id,
      measure: {
        id: "weight" as MeasureId,
        value: { value: 70, unit: "kg" },
      },
    });

    await model.updateMeasure({
      snapshotId: snapshot1._id,
      userId: mockUser.id,
      measure: {
        id: "height" as MeasureId,
        value: { value: 180, unit: "cm" },
      },
    });

    // Create another snapshot with different values
    await model.newSnapshot(mockUser);
    const [_, snapshot2] = await model.getUsersSnapshots(mockUser.id);
    await model.updateMeasure({
      snapshotId: snapshot2._id,
      userId: mockUser.id,
      measure: {
        id: "weight" as MeasureId,
        value: { value: 70, unit: "kg" },
      },
    });
    await model.updateMeasure({
      snapshotId: snapshot2._id,
      userId: mockUser.id,
      measure: {
        id: "height" as MeasureId,
        value: { value: 170, unit: "cm" }, // Different height
      },
    });

    // Query matching both measures
    let results = await model.querySnapshots({
      ["weight" as MeasureId]: {
        min: { unit: "kg", value: 65 },
        max: { unit: "kg", value: 75 },
      },
      ["height" as MeasureId]: {
        min: { unit: "cm", value: 175 },
        max: { unit: "cm", value: 185 },
      },
    });

    assert.strictEqual(
      results.length,
      1,
      "one snapshot satisfies both queries",
    );
    assert.strictEqual(results[0].measures["height" as MeasureId].value, 180);

    results = await model.querySnapshots({
      ["weight" as MeasureId]: {
        min: { unit: "kg", value: 65 },
        max: { unit: "kg", value: 75 },
      },
      ["height" as MeasureId]: {
        min: { unit: "cm", value: 185 },
        max: { unit: "cm", value: 190 },
      },
    });
    assert.strictEqual(results.length, 0, "no snapshot satisfies both queries");
  });
});
