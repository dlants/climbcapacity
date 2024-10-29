import React from "react";
import { Update, View } from "../tea";
import { createRequestThunk, RequestStatus } from "../utils";

export type Model = {
  email: string;
  signinRequest: RequestStatus<void>;
};

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
      return [{ ...model, email: msg.email }, undefined];
    case "SEND_MAGIC_LINK":
      return [
        { ...model, signinRequest: { status: "loading" } },
        createRequestThunk<void, { email: string }, "UPDATE_STATUS">({
          url: "/send-login-link",
          body: { email: model.email },
          msgType: "UPDATE_STATUS",
        }),
      ];

    case "UPDATE_STATUS":
      return [{ ...model, signinRequest: msg.request }, undefined];

    default:
      msg satisfies never;
      return msg;
  }
};

export const view: View<Msg, Model> = (model, dispatch) => {
  return (
    <div>
      <input
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
