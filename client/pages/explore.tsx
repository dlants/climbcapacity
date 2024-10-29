import React from "react";
import type { Snapshot } from "../types";
import { Update, Thunk, View, Dispatch } from "../tea";
import { assertUnreachable, RequestStatus } from "../utils";
import { MeasureId, Filter } from "../../iso/protocol";

export type Model = {
  query: {
    [measureId: MeasureId]: Filter;
  };
  dataRequest: RequestStatus<Snapshot[]>;
};

export type Msg =
  | {
      type: "UPDATE_QUERY";
    }
  | {
      type: "REQUEST_DATA";
    }
  | {
      type: "SNAPSHOT_RESPONSE";
      request: RequestStatus<Snapshot[]>;
    };

function generateFetchThunk(model: Model) {
  return async (dispatch: Dispatch<Msg>) => {
    const response = await fetch("/snapshots/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: model.query,
      }),
    });
    if (response.ok) {
      const snapshots = (await response.json()) as Snapshot[];
      dispatch({
        type: "SNAPSHOT_RESPONSE",
        request: { status: "loaded", response: snapshots },
      });
    } else {
      dispatch({
        type: "SNAPSHOT_RESPONSE",
        request: { status: "error", error: response.statusText },
      });
    }
  };
}

export function initModel(): [Model] | [Model, Thunk<Msg> | undefined] {
  return [
    {
      query: {},
      dataRequest: { status: "not-sent" },
    },
  ];
}

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "SNAPSHOT_RESPONSE":
      return [{ ...model, dataRequest: msg.request }];

    case "UPDATE_QUERY":
      return [{ ...model }];

    case "REQUEST_DATA":
      return [
        { ...model, dataRequest: { status: "loading" } },
        generateFetchThunk(model),
      ];

    default:
      msg satisfies never;
      return msg;
  }
};

export const view: View<Msg, Model> = (model, dispatch) => {
  const FetchButton = () => {
    const FetchButton = () => (
      <button onClick={() => dispatch({ type: "REQUEST_DATA" })}>
        Fetch Data
      </button>
    );

    if (model.dataRequest.status == "not-sent") {
      return <FetchButton />;
    }

    switch (model.dataRequest.status) {
      case "loading":
        return <div>Fetching...</div>;
      case "loaded":
        return (
          <div>
            {model.dataRequest.response.length} snapshots loaded.{" "}
            <FetchButton />
          </div>
        );
      case "error":
        return <div>error when fetching data: {model.dataRequest.error}</div>;
      default:
        assertUnreachable(model.dataRequest);
    }
  };

  return (
    <div>
      <h2>Your Snapshots</h2>
      <div className="new-snapshot">
        <FetchButton />
      </div>
    </div>
  );
};
