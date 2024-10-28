import { h } from "snabbdom";
import { App, wrapThunk, Update, View } from "./tea";
import {
  Model as SendLinkModel,
  Msg as SendLinkMsg,
  update as sendLinkUpdate,
  view as sendLinkView,
} from "./send-link";

type Model =
  | {
      state: "send-link";
      sendLinkModel: SendLinkModel;
    }
  | {
      state: "logged-in";
      userId: string;
    }
  | {
      state: "loading";
    };

type Msg =
  | {
      type: "AUTH_RESOLVED";
      status: AuthStatus;
    }
  | {
      type: "SEND_LINK_MSG";
      msg: SendLinkMsg;
    };

const update: Update<Msg, Model> = (msg, model) => {
  console.log(`msg: `, JSON.stringify(msg))
  switch (msg.type) {
    case "AUTH_RESOLVED":
      if (msg.status.status == "logged in") {
        return [{ state: "logged-in", userId: msg.status.user.id }];
      } else {
        return [
          {
            state: "send-link",
            sendLinkModel: { email: "", signinStatus: { status: "pending" } },
          },
        ];
      }
    case "SEND_LINK_MSG":
      if (model.state != "send-link") {
        console.warn(
          `Got unexpected ${msg.type} msg when model is in ${model.state} state. Ingoring.`,
        );
        return [model];
      }
      const [sendLinkModel, sendLinkThunk] = sendLinkUpdate(
        msg.msg,
        model.sendLinkModel,
      );
      let outThunk;
      if (sendLinkThunk) {
        outThunk = wrapThunk("SEND_LINK_MSG", sendLinkThunk);
      }
      return [{ ...model, sendLinkModel }, outThunk];

    default:
      msg satisfies never;
      throw new Error(`Missed exhaustive switch`);
  }
};

const view: View<Msg, Model> = (model, dispatch) => {
  switch (model.state) {
    case "send-link":
      return sendLinkView(model.sendLinkModel, (msg) =>
        dispatch({ type: "SEND_LINK_MSG", msg }),
      );

    case "logged-in":
      return h("div", {}, model.userId);

    case "loading":
      return h("div", {}, "Loading...");

    default:
      model satisfies never;
      throw new Error(`Missed exhaustive switch`);
  }
};

type AuthStatus =
  | { status: "logged out" }
  | { status: "logged in"; user: { id: string } };

async function run() {
  const app = new App<Model, Msg>({
    initialModel: {
      state: "loading",
    },
    update,
    view,
    element: document.getElementById("app")!,
  });

  const response = await fetch("/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const status = (await response.json()) as AuthStatus;
  app.dispatch({ type: "AUTH_RESOLVED", status });
}

run().catch((err) => {
  console.error(err);
});
