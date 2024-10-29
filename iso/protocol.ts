export type Snapshot = {
  _id: ProtocolObjectId;
  userId: string;
  measures: {
    [measureId: MeasureId]: number;
  };
  createdAt: ProtocolDate;
  lastUpdated: ProtocolDate;
};

export type MeasureId = string & { __brand: "measureId" };

export type Protocol = {
  title: string;
  description: string;
  unit: Unit;
}

export type Unit = "m" | "s" | "kg" | "count" | "percent" | "category";

export class ProtocolTimestamp {
  __brand: "ProtocolObjectTimestamp";

  constructor() {
    throw new Error(
      "This class is a protocol placeholder. It should never be instantiated.",
    );
  }
}

export class ProtocolObjectId {
  __brand: "ProtocolObjectId";

  constructor() {
    throw new Error(
      "This class is a protocol placeholder. It should never be instantiated.",
    );
  }
}

export class ProtocolDate {
  __brand: "ProtocolDate";

  constructor() {
    throw new Error(
      "This class is a protocol placeholder. It should never be instantiated.",
    );
  }
}


