import { VNode, h } from "snabbdom";
import { Dispatch, Update } from "./tea";

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
                email: model.email
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

export function view(model: Model, dispatch: (msg: Msg) => void): VNode {
  return h("div", [
    h("input", {
      props: { type: "email", value: model.email },
      on: {
        input: (e) =>
          dispatch({
            type: "SET_EMAIL",
            email: (e.target as HTMLInputElement).value,
          }),
      },
    }),
    h(
      "button",
      {
        props: { disabled: model.signinStatus.status == "loading" },
        on: { click: () => dispatch({ type: "SEND_MAGIC_LINK" }) },
      },
      "Send Magic Link",
    ),
    model.signinStatus.status == "success" ? h("p", "Check your email!") : undefined,
    model.signinStatus.status == "error" ? h("p", model.signinStatus.error): undefined,
  ]);
}
