import mongodb from "mongodb";
import { Filter, MeasureId } from "../../iso/protocol.js";
import { User } from "lucia";

export type SnapshotDoc = {
  _id: mongodb.ObjectId;
  userId: string;
  measures: {
    [measureId: MeasureId]: number;
  };
  createdAt: Date;
  lastUpdated: Date;
};

export type Measure = {
  measureId: MeasureId;
  value: number;
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
    measure: Measure;
  }) {
    const res = await this.snapshotCollection.updateOne(
      { _id: snapshotId, userId },
      {
        $set: {
          [`measures.${measure.measureId}`]: measure.value,
        },
      },
    );

    return res.modifiedCount;
  }

  async deleteSnapshot(snapshotId: mongodb.ObjectId) {
    const result = await this.snapshotCollection.deleteOne({ _id: snapshotId });
    return result.deletedCount;
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

    return this.snapshotCollection.find(query).toArray();
  }
}
