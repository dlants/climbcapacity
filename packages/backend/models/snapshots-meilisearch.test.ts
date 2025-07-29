import { describe, it, expect } from "vitest";
import { withMeiliClient } from "../test/preamble.js";
import { SnapshotsMeiliSearch } from "./snapshots-meilisearch.js";
import { MeasureId } from "../../iso/measures/index.js";
import { SnapshotId } from "../../iso/protocol.js";

describe("SnapshotsMeiliSearch", () => {
  const mockUser = {
    id: "test-user-id",
  };

  it("should create and retrieve a snapshot", async () => {
    await withMeiliClient(async (client, indexName) => {
      const model = new SnapshotsMeiliSearch(client, indexName);

      await model.newSnapshot(mockUser);
      const snapshots = await model.getUsersSnapshots(mockUser.id);

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].userId).toBe(mockUser.id);
    });
  });

  it("should delete a snapshot", async () => {
    await withMeiliClient(async (client, indexName) => {
      const model = new SnapshotsMeiliSearch(client, indexName);

      await model.newSnapshot(mockUser);
      const snapshots = await model.getUsersSnapshots(mockUser.id);

      const deleteCount = await model.deleteSnapshot({
        userId: mockUser.id,
        snapshotId: snapshots[0].id,
      });

      expect(deleteCount).toBe(1);

      const remainingSnapshots = await model.getUsersSnapshots(mockUser.id);
      expect(remainingSnapshots).toHaveLength(0);
    });
  });

  it("should not delete snapshot of another user", async () => {
    await withMeiliClient(async (client, indexName) => {
      const model = new SnapshotsMeiliSearch(client, indexName);

      await model.newSnapshot(mockUser);
      const snapshots = await model.getUsersSnapshots(mockUser.id);

      const deleteCount = await model.deleteSnapshot({
        userId: "otherUser",
        snapshotId: snapshots[0].id,
      });

      expect(deleteCount).toBe(0);
    });
  });

  describe("updateMeasure", () => {
    it("should update a measure", async () => {
      await withMeiliClient(async (client, indexName) => {
        const model = new SnapshotsMeiliSearch(client, indexName);

        await model.newSnapshot(mockUser);
        const [snapshot] = await model.getUsersSnapshots(mockUser.id);

        const updated = await model.updateMeasure({
          userId: mockUser.id,
          requestParams: {
            snapshotId: snapshot.id as SnapshotId,
            updates: {
              ["weight" as MeasureId]: { value: 70, unit: "kg" },
            },
          },
        });

        expect(updated).toBe(true);

        const updatedSnapshot = await model.getSnapshot(snapshot.id);
        expect(updatedSnapshot?.measures["weight" as MeasureId]).toEqual({
          value: 70,
          unit: "kg",
        });
      });
    });

    it("should handle deleting measures", async () => {
      await withMeiliClient(async (client, indexName) => {
        const model = new SnapshotsMeiliSearch(client, indexName);

        await model.newSnapshot(mockUser);
        const [snapshot] = await model.getUsersSnapshots(mockUser.id);

        // First add a measure
        await model.updateMeasure({
          userId: mockUser.id,
          requestParams: {
            snapshotId: snapshot.id as SnapshotId,
            updates: {
              ["weight" as MeasureId]: { value: 70, unit: "kg" },
            },
          },
        });

        // Then delete it
        await model.updateMeasure({
          userId: mockUser.id,
          requestParams: {
            snapshotId: snapshot.id as SnapshotId,
            deletes: {
              ["weight" as MeasureId]: true,
            },
          },
        });

        const updated = await model.getSnapshot(snapshot.id);
        expect(updated?.measures["weight" as MeasureId]).toBeUndefined();
      });
    });
  });

  describe("querySnapshotsWithFilters", () => {
    it("should query snapshots with filter format", async () => {
      await withMeiliClient(async (client, indexName) => {
        const model = new SnapshotsMeiliSearch(client, indexName);

        // Create test snapshots
        await model.newSnapshot(mockUser);
        await model.newSnapshot(mockUser);
        const [snapshot1, snapshot2] = await model.getUsersSnapshots(
          mockUser.id,
        );

        expect(snapshot1).toBeDefined();
        expect(snapshot2).toBeDefined();

        // Add measures to create facets
        await model.updateMeasure({
          userId: mockUser.id,
          requestParams: {
            snapshotId: snapshot1.id as SnapshotId,
            updates: {
              ["weight" as MeasureId]: { value: 70, unit: "kg" },
            },
          },
        });

        await model.updateMeasure({
          userId: mockUser.id,
          requestParams: {
            snapshotId: snapshot2.id as SnapshotId,
            updates: {
              ["weight" as MeasureId]: { value: 80, unit: "kg" },
            },
          },
        });

        // Test basic query - should find both snapshots (no filters)
        const results = await model.querySnapshotsWithFilters({
          datasets: {},
          filters: [],
        });

        expect(results.snapshots).toHaveLength(2);
        expect(results.totalHits).toBe(2);
        expect(results.facetDistribution).toBeDefined();
      });
    });

    it("should filter by dataset", async () => {
      await withMeiliClient(async (client, indexName) => {
        const model = new SnapshotsMeiliSearch(client, indexName);

        await model.newSnapshot(mockUser, "powercompany");
        await model.newSnapshot(mockUser, "climbharder");

        const results = await model.querySnapshotsWithFilters({
          datasets: {
            powercompany: true,
            climbharder: false,
          },
          filters: [],
        });

        expect(results.snapshots).toHaveLength(1);
        expect(results.snapshots[0].importSource).toBe("powercompany");
      });
    });
  });
});
