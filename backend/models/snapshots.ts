import mongodb from "mongodb";
import { ProtocolId } from "./protocols.js";
import { User } from "lucia";

export type SnapshotDoc = {
  userId: string;
  measurements: {
    [protocolId: ProtocolId]: number;
  };
  createdAt: Date;
  lastUpdated: Date;
};

export type Measurement = {
  protocolId: ProtocolId;
  value: number;
};

export type MeasurementQuery = {
  [protocolId: ProtocolId]: {
    min?: number;
    max?: number;
  };
};

export class SnapshotsModel {
  private snapshotCollection: mongodb.Collection<SnapshotDoc>;

  constructor({ client }: { client: mongodb.MongoClient }) {
    this.snapshotCollection = client.db().collection<SnapshotDoc>("snapshots");
  }

  async newSnapshot(user: User): Promise<void> {
    await this.snapshotCollection.insertOne({
      userId: user.id,
      measurements: {},
      createdAt: new Date(),
      lastUpdated: new Date(),
    });
  }

  async addMeasurement(snapshotId: mongodb.ObjectId, measurement: Measurement) {
    const res = await this.snapshotCollection.updateOne(
      { _id: snapshotId },
      {
        $set: {
          [`measurements.${measurement.protocolId}`]: measurement.value,
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
      const queryParams = query[protocolId as ProtocolId];
      if (queryParams.min == undefined && queryParams.max == undefined) {
        findQuery[`measurements.${protocolId}`] = { $exists: true };
      } else {
        const minMaxQuery: mongodb.FilterOperations<number> = {};
        if (queryParams.min) {
          minMaxQuery[`$gte`] = queryParams.min;
        }

        if (queryParams.max) {
          minMaxQuery[`$lte`] = queryParams.min;
        }

        findQuery[`measurements.${protocolId}`] = minMaxQuery;
      }
    }

    return this.snapshotCollection.find(query).toArray();
  }
}
