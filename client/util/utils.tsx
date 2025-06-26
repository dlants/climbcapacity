import { MeasureSpec } from "../../iso/measures";

export type LoadedRequest<T> = {
  status: "loaded";
  response: T;
};

export type RequestStatus<T, Ext = {}> =
  | {
    status: "not-sent";
  }
  | ({
    status: "loading";
  } & Ext)
  | (LoadedRequest<T> & Ext)
  | {
    status: "error";
    error: string;
  };

export type GetLoadedRequest<T extends RequestStatus<any>> =
  T extends LoadedRequest<infer U> ? LoadedRequest<U> : never;

export function assertLoaded<T>(request: RequestStatus<T>): LoadedRequest<T> {
  if (request.status != "loaded") {
    throw new Error(`Expected request to be loaded.`);
  }
  return request;
}

export function assertUnreachable(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

export type ExtractFromDisjointUnion<
  T,
  K extends keyof T,
  V extends T[K],
> = T extends { [key in K]: V } ? T : never;

export function filterMeasures(
  measures: MeasureSpec[],
  query: string,
): MeasureSpec[] {
  const queryTerms = query
    .toLowerCase()
    .split(" ")
    .filter((t: string) => t.length > 0);
  if (queryTerms.length === 0) return measures;

  return measures.filter((measure) => {
    const measureNameLower = measure.name.toLowerCase();
    const measureIdLower = measure.id.toLowerCase();
    return queryTerms.every(
      (term) =>
        isSubsequence(term, measureNameLower) ||
        isSubsequence(term, measureIdLower),
    );
  });
}

export function isSubsequence(query: string, str: string): boolean {
  let i = 0;
  let j = 0;
  while (i < str.length && j < query.length) {
    if (str[i] === query[j]) {
      i++;
      j++;
    } else {
      i++;
    }
  }

  return j === query.length;
}
