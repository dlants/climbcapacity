import * as DCGView from "dcgview";
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

export class SendLinkController {
  state: Model;

  constructor(public myDispatch: Dispatch<Msg>) {
    this.state = {
      email: "",
      signinRequest: { status: "not-sent" },
    };
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "SET_EMAIL":
        this.state.email = msg.email;
        break;

      case "SEND_MAGIC_LINK": {
        this.state.signinRequest = { status: "loading" };

        this.sendLink().catch(console.error);
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

  async sendLink() {
    const response = await fetch("/api/send-login-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: this.state.email }),
    });

    if (response.ok) {
      this.myDispatch({
        type: "UPDATE_STATUS",
        request: { status: "loaded", response: undefined },
      });
    } else {
      this.myDispatch({
        type: "UPDATE_STATUS",
        request: { status: "error", error: await response.text() },
      });
    }
  }
}
export class SendLinkView extends DCGView.View<{
  controller: () => SendLinkController;
}> {
  template() {
    const stateProp = () => this.props.controller().state;
    const { SwitchUnion } = DCGView.Components;

    return (
      <div>
        <input
          type="email"
          value={() => stateProp().email}
          onChange={(e) =>
            this.props.controller().myDispatch({
              type: "SET_EMAIL",
              email: (e.target as HTMLInputElement).value,
            })
          }
        />
        <button
          disabled={() => stateProp().signinRequest.status === "loading"}
          onPointerDown={() =>
            this.props.controller().myDispatch({ type: "SEND_MAGIC_LINK" })
          }
        >
          Send Magic Link
        </button>
        {SwitchUnion(() => stateProp().signinRequest, "status", {
          "not-sent": () => <div />,
          loading: () => <div />,
          loaded: () => <div>Check your email!</div>,
          error: (errorRequest: () => { status: "error"; error: string }) => (
            <div>{() => errorRequest().error}</div>
          ),
        })}
      </div>
    );
  }
}
