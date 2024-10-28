import React from "react";
import { Dispatch, Update, View } from "../tea";

export type Model = {
  email: string;
  signinStatus:
    | { status: "pending" }
    | {
        status: "loading";
      }
    | {
        status: "success";
      }
    | {
        status: "error";
        error: string;
      };
};

export type Msg =
  | { type: "SET_EMAIL"; email: string }
  | { type: "SEND_MAGIC_LINK" }
  | { type: "UPDATE_STATUS"; status: Model["signinStatus"] };

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "SET_EMAIL":
      return [{ ...model, email: msg.email }, undefined];
    case "SEND_MAGIC_LINK":
      return [
        { ...model, signinStatus: { status: "loading" } },
        async (dispatch: Dispatch<Msg>) => {
          try {
            await fetch("/send-login-link", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: model.email,
              }),
            });
            dispatch({
              type: "UPDATE_STATUS",
              status: { status: "success" },
            });
          } catch (e) {
            dispatch({
              type: "UPDATE_STATUS",
              status: {
                status: "error",
                error: (e as any).message
                  ? (e as any).message
                  : "Unexpected error.",
              },
            });
          }
        },
      ];

    case "UPDATE_STATUS":
      return [{ ...model, signinStatus: msg.status }, undefined];

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
        disabled={model.signinStatus.status === "loading"}
        onClick={() => dispatch({ type: "SEND_MAGIC_LINK" })}
      >
        Send Magic Link
      </button>
      {model.signinStatus.status === "success" && <p>Check your email!</p>}
      {model.signinStatus.status === "error" && (
        <p>{model.signinStatus.error}</p>
      )}
    </div>
  );
};
