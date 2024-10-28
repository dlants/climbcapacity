export type RequestStatus<T> =
  | {
      status: "loading";
    }
  | {
      status: "loaded";
      response: T;
    }
  | {
      status: "error";
      error: string;
    };

export function assertUnreachable(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
