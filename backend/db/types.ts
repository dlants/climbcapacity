import mongodb from 'mongodb'
import { Unit } from '../types.js';

export type AccountDoc = {
  email: string;
}

export type ProtocolIdStr = {
  __brand: 'protocol-id'
} & string;

export type ProtocolDoc = {
  unit: Unit;
  name: string;
  description: string;
}

export type SnapshotDoc= {
  accountId: mongodb.ObjectId
  measurements: {
    [protocolId: ProtocolIdStr]: number
  }
}
