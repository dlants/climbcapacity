import React from "react";
import { App, wrapThunk, Update, View } from "./tea";
import * as SendLinkPage from "./pages/send-link";
import * as UserSnapshotsPage from "./pages/users-snapshots";
import * as SnapshotPage from "./pages/snapshot";
import { assertUnreachable } from "./utils";

type Model =
  | {
      state: "send-link";
      sendLinkModel: SendLinkPage.Model;
    }
  | {
      state: "user-snapshots";
      userSnapshotsModel: UserSnapshotsPage.Model;
    }
  | {
      state: "snapshot";
      snapshotModel: SnapshotPage.Model;
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
      msg: SendLinkPage.Msg;
    }
  | {
      type: "USER_SNAPSHOTS_MSG";
      msg: UserSnapshotsPage.Msg;
    }
  | {
      type: "SNAPSHOT_MSG";
      msg: SnapshotPage.Msg;
    };

const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "AUTH_RESOLVED": {
      if (msg.status.status == "logged in") {
        const [userSnapshotsModel, userSnapshotsThunk] =
          UserSnapshotsPage.initModel(msg.status.user.id);
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
      const [sendLinkModel, sendLinkThunk] = SendLinkPage.update(
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

      if (msg.msg.type == "SELECT_SNAPSHOT") {
        return [
          {
            state: "snapshot",
            snapshotModel: {
              userId: model.userSnapshotsModel.userId,
              snapshot: msg.msg.snapshot,
            },
          },
        ];
      }

      const [userSnapshotsModel, userSnapshotsThunk] = UserSnapshotsPage.update(
        msg.msg,
        model.userSnapshotsModel,
      );
      return [
        { ...model, userSnapshotsModel },
        wrapThunk("USER_SNAPSHOTS_MSG", userSnapshotsThunk),
      ];
    }

    case "SNAPSHOT_MSG": {
      if (model.state != "snapshot") {
        console.warn(
          `Got unexpected ${msg.type} msg when model is in ${model.state} state. Ingoring.`,
        );
        return [model];
      }
      const [snapshotModel, snapshotThunk] = SnapshotPage.update(
        msg.msg,
        model.snapshotModel,
      );
      return [
        { ...model, snapshotModel },
        wrapThunk("SNAPSHOT_MSG", snapshotThunk),
      ];
    }

    default:
      return assertUnreachable(msg);
  }
};

const view: View<Msg, Model> = (model, dispatch) => {
  switch (model.state) {
    case "send-link":
      return SendLinkPage.view(model.sendLinkModel, (msg) =>
        dispatch({ type: "SEND_LINK_MSG", msg }),
      );

    case "user-snapshots":
      return UserSnapshotsPage.view(model.userSnapshotsModel, (msg) =>
        dispatch({ type: "USER_SNAPSHOTS_MSG", msg }),
      );

    case "snapshot":
      return SnapshotPage.view(model.snapshotModel, (msg) =>
        dispatch({ type: "SNAPSHOT_MSG", msg }),
      );

    case "loading":
      return <div>Loading...</div>;

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
