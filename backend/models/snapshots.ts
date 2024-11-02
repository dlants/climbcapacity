import mongodb from "mongodb";
import { Filter } from "../../iso/protocol.js";
import { User } from "lucia";
import {
  encodeMeasureValue,
  MeasureId,
  MeasureStr,
  MeasureValue,
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

  /** these are indexed as padded strings to enable filtering / searching.
   */
  measureStrs: MeasureStr[];

  createdAt: Date;
  lastUpdated: Date;
};

export type MeasurementQuery = {
  [measureId: MeasureId]: Filter;
};

export class SnapshotsModel {
  private snapshotCollection: mongodb.Collection<SnapshotDoc>;

  constructor({ client }: { client: mongodb.MongoClient }) {
    this.snapshotCollection = client.db().collection<SnapshotDoc>("snapshots");
  }

  async newSnapshot(user: User): Promise<void> {
    await (
      this.snapshotCollection as unknown as mongodb.Collection<
        Omit<SnapshotDoc, "_id">
      >
    ).insertOne({
      userId: user.id,
      measures: {},
      measureStrs: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
    });
  }

  async updateMeasure({
    snapshotId,
    userId,
    measure,
  }: {
    snapshotId: mongodb.ObjectId;
    userId: string;
    measure: MeasureValue;
  }) {
    const res = await this.snapshotCollection.findOneAndUpdate(
      { _id: snapshotId, userId },
      [
        {
          $set: {
            [`measures.${measure.id}`]: measure.value,
            measureStrs: {
              $concatArrays: [
                {
                  $filter: {
                    input: "$measureStrs",
                    cond: {
                      $not: {
                        $regexMatch: {
                          input: "$$this",
                          regex: `^${measure.id}:`,
                        },
                      },
                    },
                  },
                },
                [encodeMeasureValue(measure)],
              ],
            } as unknown as MeasureStr[],
          },
        },
      ],
    );

    return res != null;
  }

  async deleteSnapshot(snapshotId: mongodb.ObjectId) {
    const result = await this.snapshotCollection.deleteOne({ _id: snapshotId });
    return result.deletedCount;
  }

  async getSnapshot(snapshotId: mongodb.ObjectId): Promise<SnapshotDoc | null> {
    return this.snapshotCollection.findOne({ _id: snapshotId });
  }

  async getUsersSnapshots(userId: string): Promise<SnapshotDoc[]> {
    return this.snapshotCollection.find({ userId }).toArray();
  }

  async querySnapshots(query: MeasurementQuery): Promise<SnapshotDoc[]> {
    const findQuery: mongodb.Filter<SnapshotDoc> = {};
    for (const protocolId in query) {
      const queryParams = query[protocolId as MeasureId];
      if (queryParams.min == undefined && queryParams.max == undefined) {
        findQuery[`measures.${protocolId}`] = { $exists: true };
      } else {
        const minMaxQuery: mongodb.FilterOperations<number> = {};
        if (queryParams.min) {
          minMaxQuery[`$gte`] = queryParams.min;
        }

        if (queryParams.max) {
          minMaxQuery[`$lte`] = queryParams.min;
        }

        findQuery[`measures.${protocolId}`] = minMaxQuery;
      }
    }

    console.log(`findQuery: ${JSON.stringify(findQuery)}`);
    return this.snapshotCollection.find(findQuery).toArray();
  }
}
