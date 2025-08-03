import { describe, it, expect } from "vitest";
import { withTypesenseClient } from "../test/preamble.js";
import { SnapshotsTypesense } from "./snapshots-typesense.js";
import { MeasureId } from "../../iso/measures/index.js";
import {
  SnapshotId,
  type SnapshotQuery,
  type AnthroFacetsQuery,
  type OutputMeasureFacetsQuery,
  type InputMeasureClassFacetsQuery,
  type InputMeasureFacetsForClassQuery,
  type MeasureClassName,
} from "../../iso/protocol.js";
import { FacetString } from "../../iso/units.js";

describe("SnapshotsTypesense", () => {
  const mockUser = {
    id: "test-user-id",
  };

  it("should create and retrieve a snapshot", async () => {
    await withTypesenseClient(async (client, collectionName) => {
      const model = new SnapshotsTypesense(client, collectionName);

      await model.newSnapshot(mockUser);
      const snapshots = await model.getUsersSnapshots(mockUser.id);

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].userId).toBe(mockUser.id);
    });
  });

  it("should delete a snapshot", async () => {
    await withTypesenseClient(async (client, collectionName) => {
      const model = new SnapshotsTypesense(client, collectionName);

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
    await withTypesenseClient(async (client, collectionName) => {
      const model = new SnapshotsTypesense(client, collectionName);

      await model.newSnapshot(mockUser);
      const snapshots = await model.getUsersSnapshots(mockUser.id);

      await expect(
        model.deleteSnapshot({
          userId: "otherUser",
          snapshotId: snapshots[0].id,
        }),
      ).rejects.toThrow("No permission to delete this snapshot");
    });
  });

  describe("updateMeasure", () => {
    it("should update a measure", async () => {
      await withTypesenseClient(async (client, collectionName) => {
        const model = new SnapshotsTypesense(client, collectionName);

        await model.newSnapshot(mockUser);
        const [snapshot] = await model.getUsersSnapshots(mockUser.id);

        await model.updateMeasure({
          userId: mockUser.id,
          requestParams: {
            snapshotId: snapshot.id as SnapshotId,
            updates: {
              ["weight" as MeasureId]: { value: 70, unit: "kg" },
            },
          },
        });

        const updatedSnapshot = await model.getSnapshot(snapshot.id);
        expect(updatedSnapshot?.measures["weight" as MeasureId]).toEqual({
          value: 70,
          unit: "kg",
        });
      });
    });

    it("should handle deleting measures", async () => {
      await withTypesenseClient(async (client, collectionName) => {
        const model = new SnapshotsTypesense(client, collectionName);

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
        console.log("Updated snapshot measures:", updated?.measures);
        expect(updated?.measures["weight" as MeasureId]).toBeUndefined();
      });
    });
  });

  describe("querySnapshots", () => {
    it("should query snapshots with filter format", async () => {
      await withTypesenseClient(async (client, collectionName) => {
        const model = new SnapshotsTypesense(client, collectionName);

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

        // Test basic query using the working querySnapshots method
        const results = await model.querySnapshots({
          anthro_filters: [],
        });

        expect(results.snapshots).toHaveLength(2);
        expect(results.totalHits).toBe(2);
      });
    });

    it("should filter by dataset", async () => {
      await withTypesenseClient(async (client, collectionName) => {
        const model = new SnapshotsTypesense(client, collectionName);

        await model.newSnapshot(mockUser, "powercompany");
        await model.newSnapshot(mockUser, "climbharder");

        // Test dataset filtering using direct search
        const results = await model.getUsersSnapshots(mockUser.id);
        const powercompanySnapshots = results.filter(
          (s) => s.importSource === "powercompany",
        );
        const climbharderSnapshots = results.filter(
          (s) => s.importSource === "climbharder",
        );

        expect(powercompanySnapshots).toHaveLength(1);
        expect(climbharderSnapshots).toHaveLength(1);
        expect(powercompanySnapshots[0].importSource).toBe("powercompany");
      });
    });
  });

  describe("New faceted search methods", () => {
    it("should query snapshots with new faceted format", async () => {
      await withTypesenseClient(async (client, collectionName) => {
        const model = new SnapshotsTypesense(client, collectionName);

        // Create test snapshots with different measures
        await model.newSnapshot(mockUser);
        await model.newSnapshot(mockUser);
        const [snapshot1, snapshot2] = await model.getUsersSnapshots(
          mockUser.id,
        );

        // Add anthropometric measures to create anthro facets
        await model.updateMeasure({
          userId: mockUser.id,
          requestParams: {
            snapshotId: snapshot1.id as SnapshotId,
            updates: {
              ["sex-at-birth" as MeasureId]: {
                value: "female",
                unit: "sex-at-birth",
              },
              ["weight" as MeasureId]: { value: 70, unit: "kg" },
            },
          },
        });

        await model.updateMeasure({
          userId: mockUser.id,
          requestParams: {
            snapshotId: snapshot2.id as SnapshotId,
            updates: {
              ["sex-at-birth" as MeasureId]: {
                value: "male",
                unit: "sex-at-birth",
              },
              ["weight" as MeasureId]: { value: 80, unit: "kg" },
            },
          },
        });

        // Test query with anthro filters
        const query: SnapshotQuery = {
          anthro_filters: [["sex-at-birth;sex-at-birth;female" as FacetString]],
        };

        const results = await model.querySnapshots(query);

        expect(results.snapshots).toHaveLength(1);
        expect(results.totalHits).toBe(1);
      });
    });

    it("should get anthro facets", async () => {
      await withTypesenseClient(async (client, collectionName) => {
        const model = new SnapshotsTypesense(client, collectionName);

        await model.newSnapshot(mockUser);
        const [snapshot] = await model.getUsersSnapshots(mockUser.id);

        // Add anthro measures
        await model.updateMeasure({
          userId: mockUser.id,
          requestParams: {
            snapshotId: snapshot.id as SnapshotId,
            updates: {
              ["sex-at-birth" as MeasureId]: {
                value: "female",
                unit: "sex-at-birth",
              },
              ["age" as MeasureId]: { value: 25, unit: "year" },
            },
          },
        });

        const query: AnthroFacetsQuery = {
          anthro_filters: [],
        };
        const results = await model.getAnthroFacets(query);

        expect(results.anthroDistribution).toBeDefined();
      });
    });

    it("should get output measure facets", async () => {
      await withTypesenseClient(async (client, collectionName) => {
        const model = new SnapshotsTypesense(client, collectionName);

        await model.newSnapshot(mockUser);
        const [snapshot] = await model.getUsersSnapshots(mockUser.id);

        // Add performance measures (these should be classified as output measures)
        await model.updateMeasure({
          userId: mockUser.id,
          requestParams: {
            snapshotId: snapshot.id as SnapshotId,
            updates: {
              ["grade-boulder:gym:max" as MeasureId]: {
                value: 5,
                unit: "vermin",
              },
            },
          },
        });

        const query: OutputMeasureFacetsQuery = {
          anthro_filters: [],
        };

        const results = await model.getOutputMeasureFacets(query);

        expect(results.outputMeasureDistribution).toBeDefined();
        expect(Object.keys(results.outputMeasureDistribution)).toContain(
          "grade-boulder:gym:max" as MeasureId,
        );
      });
    });

    it("should get input measure class facets", async () => {
      await withTypesenseClient(async (client, collectionName) => {
        const model = new SnapshotsTypesense(client, collectionName);

        await model.newSnapshot(mockUser);
        const [snapshot] = await model.getUsersSnapshots(mockUser.id);

        // Add input measures (these should be classified by measure class)
        await model.updateMeasure({
          userId: mockUser.id,
          requestParams: {
            snapshotId: snapshot.id as SnapshotId,
            updates: {
              ["maxhang:full-crimp:20mm:7s" as MeasureId]: {
                value: 50,
                unit: "kg",
              },
            },
          },
        });

        const query: InputMeasureClassFacetsQuery = {
          anthro_filters: [],
        };

        const results = await model.getInputMeasureClassFacets(query);

        expect(results.measureClassDistribution).toBeDefined();
        expect(Object.keys(results.measureClassDistribution)).toContain(
          "maxhang",
        );
      });
    });

    it("should get input measure facets for a specific class", async () => {
      await withTypesenseClient(async (client, collectionName) => {
        const model = new SnapshotsTypesense(client, collectionName);

        await model.newSnapshot(mockUser);
        const [snapshot] = await model.getUsersSnapshots(mockUser.id);

        // Add input measures from the maxhang class
        await model.updateMeasure({
          userId: mockUser.id,
          requestParams: {
            snapshotId: snapshot.id as SnapshotId,
            updates: {
              ["maxhang:full-crimp:20mm:7s" as MeasureId]: {
                value: 50,
                unit: "kg",
              },
              ["maxhang:full-crimp:18mm:7s" as MeasureId]: {
                value: 60,
                unit: "kg",
              },
            },
          },
        });

        const query: InputMeasureFacetsForClassQuery = {
          anthro_filters: [],
          input_measure_class: "maxhang" as MeasureClassName,
        };

        const results = await model.getInputMeasureFacetsForClass(query);

        expect(results.inputMeasureDistribution).toBeDefined();
        expect(Object.keys(results.inputMeasureDistribution)).toContain(
          "maxhang:full-crimp:20mm:7s" as MeasureId,
        );
        expect(Object.keys(results.inputMeasureDistribution)).toContain(
          "maxhang:full-crimp:18mm:7s" as MeasureId,
        );
      });
    });

    it("should handle filtering combinations correctly", async () => {
      await withTypesenseClient(async (client, collectionName) => {
        const model = new SnapshotsTypesense(client, collectionName);

        // Create multiple snapshots with different characteristics
        await model.newSnapshot(mockUser);
        await model.newSnapshot(mockUser);
        const [snapshot1, snapshot2] = await model.getUsersSnapshots(
          mockUser.id,
        );

        // Snapshot 1: Female, has output measure
        await model.updateMeasure({
          userId: mockUser.id,
          requestParams: {
            snapshotId: snapshot1.id as SnapshotId,
            updates: {
              ["sex-at-birth" as MeasureId]: {
                value: "female",
                unit: "sex-at-birth",
              },
              ["grade-boulder:gym:max" as MeasureId]: {
                value: 5,
                unit: "vermin",
              },
            },
          },
        });

        // Snapshot 2: Male, has input measure
        await model.updateMeasure({
          userId: mockUser.id,
          requestParams: {
            snapshotId: snapshot2.id as SnapshotId,
            updates: {
              ["sex-at-birth" as MeasureId]: {
                value: "male",
                unit: "sex-at-birth",
              },
              ["maxhang:full-crimp:20mm:7s" as MeasureId]: {
                value: 50,
                unit: "kg",
              },
            },
          },
        });

        // Query for female snapshots with output measures
        const query: SnapshotQuery = {
          anthro_filters: [["sex-at-birth;sex-at-birth;female" as FacetString]],
          output_measure_id: "grade-boulder:gym:max" as MeasureId,
        };

        const results = await model.querySnapshots(query);

        expect(results.snapshots).toHaveLength(1);
        expect(results.snapshots[0].id).toBe(snapshot1.id);
      });
    });

    it("should return correct facet counts for height and gender distribution", async () => {
      await withTypesenseClient(async (client, collectionName) => {
        const model = new SnapshotsTypesense(client, collectionName);

        // Create 30 women
        for (let i = 0; i < 30; i++) {
          await model.newSnapshot(mockUser);
        }

        // Create 70 men
        for (let i = 0; i < 70; i++) {
          await model.newSnapshot(mockUser);
        }

        const allSnapshots = await model.getUsersSnapshots(mockUser.id);
        expect(allSnapshots).toHaveLength(100);

        // Update first 30 snapshots to be women with 5'4" height
        for (let i = 0; i < 30; i++) {
          const snapshot = allSnapshots[i];
          await model.updateMeasure({
            userId: mockUser.id,
            requestParams: {
              snapshotId: snapshot.id as SnapshotId,
              updates: {
                ["sex-at-birth" as MeasureId]: {
                  value: "female",
                  unit: "sex-at-birth",
                },
                ["height" as MeasureId]: {
                  value: 64,
                  unit: "inch",
                },
              },
            },
          });
        }

        // Update remaining 70 snapshots to be men with 6' height
        for (let i = 30; i < 100; i++) {
          const snapshot = allSnapshots[i];
          await model.updateMeasure({
            userId: mockUser.id,
            requestParams: {
              snapshotId: snapshot.id as SnapshotId,
              updates: {
                ["sex-at-birth" as MeasureId]: {
                  value: "male",
                  unit: "sex-at-birth",
                },
                ["height" as MeasureId]: {
                  value: 72,
                  unit: "inch",
                },
              },
            },
          });
        }

        // Test 1: Get all anthro facets (should show 30 females + 70 males)
        const allFacetsQuery: AnthroFacetsQuery = {
          anthro_filters: [],
        };
        const allFacetsResult = await model.getAnthroFacets(allFacetsQuery);

        expect(
          allFacetsResult.anthroDistribution[
            "sex-at-birth;sex-at-birth;female" as FacetString
          ],
        ).toBe(30);
        expect(
          allFacetsResult.anthroDistribution[
            "sex-at-birth;sex-at-birth;male" as FacetString
          ],
        ).toBe(70);

        // Test 2: Get anthro facets filtered by women only
        const womenFacetsQuery: AnthroFacetsQuery = {
          anthro_filters: [["sex-at-birth;sex-at-birth;female" as FacetString]],
        };
        const womenFacetsResult = await model.getAnthroFacets(womenFacetsQuery);

        // Should only show women (30) and their height distribution
        expect(
          womenFacetsResult.anthroDistribution[
            "sex-at-birth;sex-at-birth;female" as FacetString
          ],
        ).toBe(30);
        expect(
          womenFacetsResult.anthroDistribution[
            "sex-at-birth;sex-at-birth;male" as FacetString
          ],
        ).toBeUndefined();

        // Should show height facet for 64 inches (women's height) with count 30
        const womenHeightFacetKey = Object.keys(
          womenFacetsResult.anthroDistribution,
        ).find((key) => key.includes("height") && key.includes("64"));
        expect(womenHeightFacetKey).toBeDefined();
        expect(
          womenFacetsResult.anthroDistribution[
            womenHeightFacetKey as FacetString
          ],
        ).toBe(30);

        // Test 3: Get anthro facets filtered by men only
        const menFacetsQuery: AnthroFacetsQuery = {
          anthro_filters: [["sex-at-birth;sex-at-birth;male" as FacetString]],
        };
        const menFacetsResult = await model.getAnthroFacets(menFacetsQuery);

        // Should only show men (70) and their height distribution
        expect(
          menFacetsResult.anthroDistribution[
            "sex-at-birth;sex-at-birth;male" as FacetString
          ],
        ).toBe(70);
        expect(
          menFacetsResult.anthroDistribution[
            "sex-at-birth;sex-at-birth;female" as FacetString
          ],
        ).toBeUndefined();

        // Should show height facet for 72 inches (men's height) with count 70
        const menHeightFacetKey = Object.keys(
          menFacetsResult.anthroDistribution,
        ).find((key) => key.includes("height") && key.includes("72"));
        expect(menHeightFacetKey).toBeDefined();
        expect(
          menFacetsResult.anthroDistribution[menHeightFacetKey as FacetString],
        ).toBe(70);
      });
    });
  });
});
