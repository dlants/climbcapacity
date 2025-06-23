import React from "react";
import { Dispatch } from "../tea";
import { createRequestThunk, RequestStatus } from "../util/utils";

export type Model = {
  email: string;
  signinRequest: RequestStatus<void>;
};

export type Msg =
  | { type: "SET_EMAIL"; email: string }
  | { type: "SEND_MAGIC_LINK" }
  | { type: "UPDATE_STATUS"; request: RequestStatus<void> };

export class SendLink {
  state: Model;

  constructor(
    initialParams: any,
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    this.state = {
      email: "",
      signinRequest: { status: "not-sent" }
    };
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "SET_EMAIL":
        this.state.email = msg.email;
        break;

      case "SEND_MAGIC_LINK":
        this.state.signinRequest = { status: "loading" };

        (async () => {
          const thunk = createRequestThunk<void, { email: string }, "UPDATE_STATUS">({
            url: "/api/send-login-link",
            body: { email: this.state.email },
            msgType: "UPDATE_STATUS",
          });

          if (thunk) {
            await thunk(this.context.myDispatch);
          }
        })().catch(console.error);
        break;

      case "UPDATE_STATUS":
        this.state.signinRequest = msg.request;
        break;

      default:
        msg satisfies never;
        return msg;
    }
  }

  view() {
    return (
      <div>
        <input
          key="email"
          type="email"
          value={this.state.email}
          onChange={(e) =>
            this.context.myDispatch({
              type: "SET_EMAIL",
              email: e.target.value,
            })
          }
        />
        <button
          disabled={this.state.signinRequest.status === "loading"}
          onPointerDown={() => this.context.myDispatch({ type: "SEND_MAGIC_LINK" })}
        >
          Send Magic Link
        </button>
        {this.state.signinRequest.status === "loaded" && <p>Check your email!</p>}
        {this.state.signinRequest.status === "error" && (
          <p>{this.state.signinRequest.error}</p>
        )}
      </div>
    );
  }
}
