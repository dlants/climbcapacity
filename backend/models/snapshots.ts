import mongodb from "mongodb";
import { Filter } from "../../iso/protocol.js";
import { User } from "lucia";
import {
  encodeMeasureValue,
  MeasureId,
  NormedMeasure,
  UnitValue,
} from "../../iso/units.js";

export type SnapshotDoc = {
  _id: mongodb.ObjectId;
  userId: string;

  /** these are as the user entered them
   */
  measures: {
    [measureId: MeasureId]: UnitValue;
  };

  /** these are indexed as an array to allow for index use
   */
  normedMeasures: NormedMeasure[];

  createdAt: Date;
  lastUpdated: Date;
  importSource?: "climbharderv3";
};

export type MeasureStatsDoc = {
  stats: { [measureId: MeasureId]: number };
};

export type MeasurementQuery = {
  [measureId: MeasureId]: Filter;
};

export class SnapshotsModel {
  private snapshotCollection: mongodb.Collection<SnapshotDoc>;
  private statsCollection: mongodb.Collection<MeasureStatsDoc>;

  constructor({ client }: { client: mongodb.MongoClient }) {
    this.snapshotCollection = client.db().collection<SnapshotDoc>("snapshots");
    this.statsCollection = client
      .db()
      .collection<MeasureStatsDoc>("measureStats");
  }

  async newSnapshot(user: User): Promise<void> {
    await (
      this.snapshotCollection as unknown as mongodb.Collection<
        Omit<SnapshotDoc, "_id">
      >
    ).insertOne({
      userId: user.id,
      measures: {},
      normedMeasures: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
    });
  }

  async updateMeasure({
    snapshotId,
    userId,
    updates,
  }: {
    snapshotId: mongodb.ObjectId;
    userId: string;
    updates: {
      [measureId: MeasureId]: UnitValue;
    };
  }) {
    for (const measureIdStr in updates) {
      const measureId = measureIdStr as MeasureId;
      const value = updates[measureId];

      await this.snapshotCollection.findOneAndUpdate(
        { _id: snapshotId, userId },
        [
          {
            $set: {
              [`measures.${measureId}`]: value,
              normedMeasures: {
                $concatArrays: [
                  {
                    $filter: {
                      input: "$normedMeasures",
                      cond: {
                        $ne: ["$$this.measureId", measureId],
                      },
                    },
                  },
                  [
                    encodeMeasureValue({
                      id: measureId,
                      value,
                    }),
                  ],
                ],
              } as unknown as NormedMeasure[],
            },
          },
        ],
      );
    }

    return true;
  }

  async deleteSnapshot({
    userId,
    snapshotId,
  }: {
    userId: string;
    snapshotId: mongodb.ObjectId;
  }) {
    const result = await this.snapshotCollection.deleteOne({
      _id: snapshotId,
      userId,
    });
    return result.deletedCount;
  }

  async getSnapshot(
    snapshotId: mongodb.ObjectId,
  ): Promise<SnapshotDoc | undefined> {
    return (
      (await this.snapshotCollection.findOne({ _id: snapshotId })) || undefined
    );
  }

  private statsDocCache:
    | { doc: MeasureStatsDoc; timestamp: number }
    | undefined = undefined;
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  async getMeasureStats(): Promise<MeasureStatsDoc> {
    const now = Date.now();

    if (
      this.statsDocCache &&
      now - this.statsDocCache.timestamp < this.CACHE_TTL
    ) {
      return this.statsDocCache.doc;
    }

    const statsDoc = await this.statsCollection.findOne({});
    if (!statsDoc) {
      throw new Error(`No stats document found.`);
    }

    this.statsDocCache = {
      doc: statsDoc,
      timestamp: now,
    };

    return statsDoc;
  }

  async getUsersSnapshots(userId: string): Promise<SnapshotDoc[]> {
    return this.snapshotCollection.find({ userId }).toArray();
  }

  async getLatestSnapshot(userId: string): Promise<SnapshotDoc | undefined> {
    return (
      (await this.snapshotCollection.findOne(
        { userId },
        { sort: { createdAt: "desc" } },
      )) || undefined
    );
  }

  async querySnapshots(query: MeasurementQuery): Promise<SnapshotDoc[]> {
    const findQueryClauses: mongodb.Filter<SnapshotDoc>[] = [];
    for (const measureIdStr in query) {
      const measureId = measureIdStr as MeasureId;
      const queryParams = query[measureId];
      if (queryParams.min == undefined && queryParams.max == undefined) {
        findQueryClauses.push({ [`measures.${measureId}`]: { $exists: true } });
      } else {
        const minMaxQuery: mongodb.FilterOperations<NormedMeasure> = {
          measureId,
          value: {},
        };
        if (queryParams.min) {
          minMaxQuery.value![`$gte`] = encodeMeasureValue({
            id: measureId,
            value: queryParams.min,
          }).value;
        }

        if (queryParams.max) {
          minMaxQuery.value![`$lte`] = encodeMeasureValue({
            id: measureId as MeasureId,
            value: queryParams.max,
          }).value;
        }
        findQueryClauses.push({ normedMeasures: { $elemMatch: minMaxQuery } });
      }
    }

    const findQuery: mongodb.Filter<SnapshotDoc> = {
      $and: findQueryClauses,
    };

    return this.snapshotCollection.find(findQuery).toArray();
  }
}
