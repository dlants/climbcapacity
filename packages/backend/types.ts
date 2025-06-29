import * as Protocol from "../iso/protocol.js";
import mongodb from 'mongodb'

/* This generic type converts environment-agnostic protocol definitions in shared-types
 * into backend type definitions, which use mongo ObjectIds, timestamps, and other things
 * generally only available on the backend.
 *
 * There is a paired generic type Frontend<T> in shared-types that does the same transformation
 * for frontend. Together these two types represent the serialization of data, and ensure
 * that we are sending and expecting the same stuff between frontend and backend definitions of
 * routes.
 */
export type Backend<T> = T extends Protocol.ProtocolObjectId
  ? mongodb.ObjectId
  : T extends Protocol.ProtocolDate
    ? Date
    : T extends Protocol.ProtocolTimestamp
      ? mongodb.Timestamp
      : T extends object
        ? BackendObject<T>
        : T;

export type BackendObject<T> = { [K in keyof T]: Backend<T[K]> };

export type Snapshot = Backend<Protocol.Snapshot>;
