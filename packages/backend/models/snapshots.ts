import mongodb from "mongodb";
import {
  Dataset,
  SnapshotQuery,
  SnapshotUpdateRequest,
} from "../../iso/protocol.js";
import { User } from "lucia";
import {
  encodeMeasureValue,
  NormedMeasure,
  UnitValue,
} from "../../iso/units.js";
import { MeasureId } from "../../iso/measures/index.js";

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
  importSource?: Dataset;
};

export type MeasureStatsDoc = {
  stats: { [measureId: MeasureId]: number };
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

  async newSnapshot(
    user: User,
    importSource?: Dataset | undefined,
  ): Promise<void> {
    const doc: Omit<SnapshotDoc, "_id"> = {
      userId: user.id,
      measures: {},
      normedMeasures: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    // it's important to not set importSource if it's undefined, since we're going to be using an $exists query later
    if (importSource) {
      doc.importSource = importSource;
    }

    await (
      this.snapshotCollection as unknown as mongodb.Collection<
        Omit<SnapshotDoc, "_id">
      >
    ).insertOne(doc);
  }
  async updateMeasure({
    userId,
    requestParams,
  }: {
    userId: string;
    requestParams: SnapshotUpdateRequest;
  }) {
    const updates: mongodb.MatchKeysAndValues<SnapshotDoc> = {};
    const normedUpdates: NormedMeasure[] = [];
    const unsets: string[] = [];

    for (const measureIdStr in requestParams.updates || {}) {
      const measureId = measureIdStr as MeasureId;
      const value = requestParams.updates![measureId];
      updates[`measures.${measureId}`] = value;
      normedUpdates.push(encodeMeasureValue({ id: measureId, value }));
    }

    for (const measureIdStr in requestParams.deletes || {}) {
      const measureId = measureIdStr as MeasureId;
      updates[`measures.${measureId}`] = null;
      unsets.push(`measures.${measureId}`);
    }

    await this.snapshotCollection.findOneAndUpdate(
      { _id: new mongodb.ObjectId(requestParams.snapshotId), userId },
      [
        {
          $set: {
            ...updates,
            normedMeasures: {
              $concatArrays: [
                {
                  $filter: {
                    input: "$normedMeasures",
                    cond: {
                      $not: {
                        $in: [
                          "$$this.measureId",
                          [
                            ...Object.keys(requestParams.updates || {}),
                            ...Object.keys(requestParams.deletes || {}),
                          ],
                        ],
                      },
                    },
                  },
                },
                normedUpdates,
              ],
            },
          },
        },
        ...(unsets.length ? [{ $unset: unsets }] : []),
      ],
    );

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

  async querySnapshots(query: SnapshotQuery): Promise<SnapshotDoc[]> {
    const findQueryClauses: mongodb.Filter<SnapshotDoc>[] = [];
    for (const measureIdStr in query.measures) {
      const measureId = measureIdStr as MeasureId;
      const queryParams = query.measures[measureId];
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

    const datasets = Object.entries(query.datasets)
      .filter(([, isSelected]) => isSelected)
      .map(([dataset]) => dataset);

    const findQuery: mongodb.Filter<SnapshotDoc> = {
      $and: [
        ...findQueryClauses,
        {
          $or: [
            { importSource: { $in: datasets } },
            { importSource: { $exists: false } },
          ],
        },
      ].filter(Boolean),
    };

    return this.snapshotCollection.find(findQuery).toArray();
  }
}
