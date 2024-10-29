import * as React from "react";
import { Thunk } from "./tea";

export type RequestStatus<T> =
  | {
      status: "not-sent";
    }
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

export function RequestStatusView<T>({
  request,
  viewMap,
}: {
  request: RequestStatus<T>;
  viewMap: {
    "not-sent": () => JSX.Element;
    loading: () => JSX.Element;
    loaded: ({ response }: { response: T }) => JSX.Element;
    error: ({ error }: { error: string }) => JSX.Element;
  };
}): JSX.Element {
  switch (request.status) {
    case "not-sent": {
      const View = viewMap["not-sent"];
      return <View />;
    }
    case "loading": {
      const View = viewMap["loading"];
      return <View />;
    }
    case "error": {
      const View = viewMap["error"];
      return <View error={request.error} />;
    }
    case "loaded":
      const View = viewMap["loaded"];
      return <View response={request.response} />;
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
