import mongodb from "mongodb";
import { Filter } from "../../iso/protocol.js";
import { User } from "lucia";
import {
  encodeMeasureValue,
  MeasureId,
  MeasureValue,
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
      normedMeasures: [],
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
            normedMeasures: {
              $concatArrays: [
                {
                  $filter: {
                    input: "$normedMeasures",
                    cond: {
                      $ne: ["$$this.measureId", measure.id],
                    },
                  },
                },
                [encodeMeasureValue(measure)],
              ],
            } as unknown as NormedMeasure[],
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
