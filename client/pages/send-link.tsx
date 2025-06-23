import React from "react";
import { Dispatch } from "../types";
import { RequestStatus } from "../util/utils";

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

      case "SEND_MAGIC_LINK": {
        this.state.signinRequest = { status: "loading" };

        (this.sendLink()).catch(console.error);
        break;
      }

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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
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

  async sendLink() {
    const response = await fetch("/api/send-login-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: this.state.email }),
    });

    if (response.ok) {
      this.context.myDispatch({
        type: "UPDATE_STATUS",
        request: { status: "loaded", response: undefined },
      });
    } else {
      this.context.myDispatch({
        type: "UPDATE_STATUS",
        request: { status: "error", error: await response.text() },
      });
    }
  };
}

