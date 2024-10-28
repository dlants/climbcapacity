import { h } from "snabbdom";
import { App, wrapThunk, Update, View } from "./tea";
import {
  Model as SendLinkModel,
  Msg as SendLinkMsg,
  update as sendLinkUpdate,
  view as sendLinkView,
} from "./pages/send-link";

import {
  initModel as userSnapshotsInitModel,
  Model as UserSnapshotsModel,
  Msg as UserSnapshotsMsg,
  update as userSnapshotsUpdate,
  view as userUpdateView,
} from "./pages/users-snapshots";

type Model =
  | {
      state: "send-link";
      sendLinkModel: SendLinkModel;
    }
  | {
      state: "user-snapshots";
      userSnapshotsModel: UserSnapshotsModel;
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
    }
  | {
      type: "USER_SNAPSHOTS_MSG";
      msg: UserSnapshotsMsg;
    };

const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "AUTH_RESOLVED": {
      if (msg.status.status == "logged in") {
        const [userSnapshotsModel, userSnapshotsThunk] = userSnapshotsInitModel(
          msg.status.user.id,
        );
        return [
          { state: "user-snapshots", userSnapshotsModel },
          wrapThunk("USER_SNAPSHOTS_MSG", userSnapshotsThunk),
        ];
      } else {
        return [
          {
            state: "send-link",
            sendLinkModel: { email: "", signinStatus: { status: "pending" } },
          },
        ];
      }
    }
    case "SEND_LINK_MSG": {
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
      return [
        { ...model, sendLinkModel },
        wrapThunk("SEND_LINK_MSG", sendLinkThunk),
      ];
    }

    case "USER_SNAPSHOTS_MSG": {
      if (model.state != "user-snapshots") {
        console.warn(
          `Got unexpected ${msg.type} msg when model is in ${model.state} state. Ingoring.`,
        );
        return [model];
      }
      const [userSnapshotsModel, userSnapshotsThunk] = userSnapshotsUpdate(
        msg.msg,
        model.userSnapshotsModel,
      );
      return [
        { ...model, userSnapshotsModel },
        wrapThunk("USER_SNAPSHOTS_MSG", userSnapshotsThunk),
      ];
    }

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

    case "user-snapshots":
      return userUpdateView(model.userSnapshotsModel, (msg) =>
        dispatch({ type: "USER_SNAPSHOTS_MSG", msg }),
      );

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
