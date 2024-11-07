import * as React from "react";
import { Dispatch, Thunk } from "../tea";
import { MeasureSpec } from "../../iso/units";

export type LoadedRequest<T> = {
  status: "loaded";
  response: T;
};

export type RequestStatus<T> =
  | {
      status: "not-sent";
    }
  | {
      status: "loading";
    }
  | LoadedRequest<T>
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

export type RequestStatusViewMap<T, Msg = never> = {
  "not-sent": (props: { dispatch: Dispatch<Msg> }) => JSX.Element;
  loading: (props: { dispatch: Dispatch<Msg> }) => JSX.Element;
  loaded: ({
    response,
    dispatch,
  }: {
    response: T;
    dispatch: Dispatch<Msg>;
  }) => JSX.Element;
  error: (props: { error: string; dispatch: Dispatch<Msg> }) => JSX.Element;
};

export function RequestStatusView<T, Msg = never>({
  request,
  dispatch,
  viewMap,
}: {
  request: RequestStatus<T>;
  dispatch: Dispatch<Msg>;
  viewMap: RequestStatusViewMap<T, Msg>;
}): JSX.Element {
  switch (request.status) {
    case "not-sent": {
      const View = viewMap["not-sent"];
      return <View dispatch={dispatch} />;
    }
    case "loading": {
      const View = viewMap["loading"];
      return <View dispatch={dispatch} />;
    }
    case "error": {
      const View = viewMap["error"];
      return <View dispatch={dispatch} error={request.error} />;
    }
    case "loaded":
      const View = viewMap["loaded"];
      return <View response={request.response} dispatch={dispatch} />;
    default:
      assertUnreachable(request);
  }
}

export function assertUnreachable(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

export function createRequestThunk<T, Body, MsgType extends string>({
  url,
  method,
  body,
  msgType,
}: {
  url: string;
  body: Body;
  method?: "GET" | "POST";
  msgType: MsgType;
}): Thunk<{ type: MsgType; request: RequestStatus<T> }> {
  return async (
    dispatch: (msg: { type: MsgType; request: RequestStatus<T> }) => void,
  ) => {
    const response = await fetch(url, {
      method: method || "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const value = (await response.json()) as T;
      dispatch({
        type: msgType,
        request: { status: "loaded", response: value },
      });
    } else {
      dispatch({
        type: msgType,
        request: { status: "error", error: response.statusText },
      });
    }
  };
}

export type ExtractFromDisjointUnion<
  T,
  K extends keyof T,
  V extends T[K],
> = T extends { [key in K]: V } ? T : never;

export function filterMeasures(measures: MeasureSpec[], query: string) {
  return measures.filter(
    (m) =>
      m.id.toLowerCase().includes(query.toLowerCase()) ||
      m.name.toLowerCase().includes(query.toLowerCase()),
  );
}