import React from "react";
import { Update, View } from "../tea";
import { createRequestThunk, RequestStatus } from "../util/utils";
import * as immer from "immer";
const produce = immer.produce;

export type Model = immer.Immutable<{
  email: string;
  signinRequest: RequestStatus<void>;
}>;

export function initModel(): Model {
  return { email: "", signinRequest: { status: "not-sent" } };
}

export type Msg =
  | { type: "SET_EMAIL"; email: string }
  | { type: "SEND_MAGIC_LINK" }
  | { type: "UPDATE_STATUS"; request: RequestStatus<void> };

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "SET_EMAIL":
      return [
        produce(model, (draft) => {
          draft.email = msg.email;
        }),
      ];
    case "SEND_MAGIC_LINK":
      return [
        produce(model, (draft) => {
          draft.signinRequest = { status: "loading" };
        }),
        createRequestThunk<void, { email: string }, "UPDATE_STATUS">({
          url: "/api/send-login-link",
          body: { email: model.email },
          msgType: "UPDATE_STATUS",
        }),
      ];

    case "UPDATE_STATUS":
      return [
        produce(model, (draft) => {
          draft.signinRequest = msg.request;
        }),
        undefined,
      ];

    default:
      msg satisfies never;
      return msg;
  }
};

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div>
      <input
        key="email"
        type="email"
        value={model.email}
        onChange={(e) =>
          dispatch({
            type: "SET_EMAIL",
            email: e.target.value,
          })
        }
      />
      <button
        disabled={model.signinRequest.status === "loading"}
        onClick={() => dispatch({ type: "SEND_MAGIC_LINK" })}
      >
        Send Magic Link
      </button>
      {model.signinRequest.status === "loaded" && <p>Check your email!</p>}
      {model.signinRequest.status === "error" && (
        <p>{model.signinRequest.error}</p>
      )}
    </div>
  );
};
