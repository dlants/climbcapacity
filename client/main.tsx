import React from "react";
import {
  App,
  wrapThunk,
  Update,
  View,
  SubscriptionManager,
  chainThunks,
} from "./tea";
import * as SendLinkPage from "./pages/send-link";
import * as UserSnapshotsPage from "./pages/users-snapshots";
import * as SnapshotPage from "./pages/load-snapshot";
import * as ExplorePage from "./pages/explore";
import { assertUnreachable, RequestStatus } from "./utils";
import { NavigateMsg, Router } from "./router";
import { SnapshotId } from "../iso/protocol";
import { Nav } from "./views/navigation";

export type Model = {
  auth: RequestStatus<AuthStatus>;
  page:
    | {
        route: "/send-link";
        sendLinkModel: SendLinkPage.Model;
      }
    | {
        route: "/snapshots";
        userSnapshotsModel: UserSnapshotsPage.Model;
      }
    | {
        route: "/snapshot";
        snapshotModel: SnapshotPage.Model;
      }
    | {
        route: "/explore";
        exploreModel: ExplorePage.Model;
      }
    | {
        route: "/";
      };
};

type Msg =
  | {
      type: "AUTH_RESOLVED";
      status: AuthStatus;
    }
  | NavigateMsg
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
    }
  | {
      type: "EXPLORE_MSG";
      msg: ExplorePage.Msg;
    };

const navigate: Update<Msg, Model> = (msg, model) => {
  const user =
    model.auth.status == "loaded" &&
    model.auth.response.status == "logged in" &&
    model.auth.response.user;

  if (msg.type != "NAVIGATE") {
    return [model];
  }

  switch (msg.target.route) {
    case "/":
      return [{ ...model, page: { route: "/" } }];
    case "/send-link":
      if (user) {
        return [{ ...model, page: { route: "/" } }];
      } else {
        return [
          {
            ...model,
            page: {
              route: "/send-link",
              sendLinkModel: SendLinkPage.initModel(),
            },
          },
        ];
      }
    case "/snapshots":
      if (user) {
        const [userSnapshotsModel, userSnapshotsThunk] =
          UserSnapshotsPage.initModel(user.id);
        return [
          { ...model, page: { route: "/snapshots", userSnapshotsModel } },
          wrapThunk("USER_SNAPSHOTS_MSG", userSnapshotsThunk),
        ];
      } else {
        return [
          {
            ...model,
            page: {
              route: "/send-link",
              sendLinkModel: SendLinkPage.initModel(),
            },
          },
        ];
      }
    case "/snapshot":
      if (user) {
        const [snapshotModel, snapshotThunk] = SnapshotPage.initModel(
          msg.target.snapshotId,
        );
        return [
          { ...model, page: { route: "/snapshot", snapshotModel } },
          wrapThunk("SNAPSHOT_MSG", snapshotThunk),
        ];
      } else {
        return [
          {
            ...model,
            page: {
              route: "/send-link",
              sendLinkModel: SendLinkPage.initModel(),
            },
          },
        ];
      }
    case "/explore":
      const [exploreModel] = ExplorePage.initModel();
      return [{ ...model, page: { route: "/explore", exploreModel } }];
    default:
      assertUnreachable(msg.target);
  }
};

const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "NAVIGATE": {
      const [nextModel, thunk] = navigate(msg, model);
      return [nextModel, chainThunks(thunk, navigationThunk(nextModel))];
    }

    case "AUTH_RESOLVED": {
      return [
        {
          ...model,
          auth: { status: "loaded", response: msg.status },
        },
        async (dispatch) => {
          dispatch({ type: "NAVIGATE", target: { route: "/snapshots" } });
        },
      ];
    }

    case "SEND_LINK_MSG": {
      if (model.page.route != "/send-link") {
        console.warn(
          `Got unexpected ${msg.type} msg when model is in ${model.page.route} state. Ingoring.`,
        );
        return [model];
      }
      const [sendLinkModel, sendLinkThunk] = SendLinkPage.update(
        msg.msg,
        model.page.sendLinkModel,
      );
      return [
        {
          ...model,
          page: {
            ...model.page,
            sendLinkModel,
          },
        },
        wrapThunk("SEND_LINK_MSG", sendLinkThunk),
      ];
    }

    case "USER_SNAPSHOTS_MSG": {
      if (model.page.route != "/snapshots") {
        console.warn(
          `Got unexpected ${msg.type} msg when model is in ${model.page.route} state. Ingoring.`,
        );
        return [model];
      }

      if (msg.msg.type == "SELECT_SNAPSHOT") {
        const snapshotId = msg.msg.snapshot._id as SnapshotId;
        return [
          model,
          async (dispatch) => {
            dispatch({
              type: "NAVIGATE",
              target: {
                route: "/snapshot",
                snapshotId,
              },
            });
          },
        ];
      }

      const [userSnapshotsModel, userSnapshotsThunk] = UserSnapshotsPage.update(
        msg.msg,
        model.page.userSnapshotsModel,
      );
      return [
        {
          ...model,
          page: {
            ...model.page,
            userSnapshotsModel,
          },
        },
        wrapThunk("USER_SNAPSHOTS_MSG", userSnapshotsThunk),
      ];
    }

    case "SNAPSHOT_MSG": {
      if (model.page.route != "/snapshot") {
        console.warn(
          `Got unexpected ${msg.type} msg when model is in ${model.page.route} state. Ingoring.`,
        );
        return [model];
      }
      const [snapshotModel, snapshotThunk] = SnapshotPage.update(
        msg.msg,
        model.page.snapshotModel,
      );
      return [
        { ...model, snapshotModel },
        wrapThunk("SNAPSHOT_MSG", snapshotThunk),
      ];
    }

    case "EXPLORE_MSG": {
      if (model.page.route != "/explore") {
        console.warn(
          `Got unexpected ${msg.type} msg when model is in ${model.page.route} state. Ingoring.`,
        );
        return [model];
      }
      const [exploreModel, exploreThunk] = ExplorePage.update(
        msg.msg,
        model.page.exploreModel,
      );
      return [
        { ...model, exploreModel },
        wrapThunk("EXPLORE_MSG", exploreThunk),
      ];
    }

    default:
      return assertUnreachable(msg);
  }
};

const view: View<Msg, Model> = (model, dispatch) => {
  function Page() {
    switch (model.page.route) {
      case "/send-link":
        return SendLinkPage.view(model.page.sendLinkModel, (msg) =>
          dispatch({ type: "SEND_LINK_MSG", msg }),
        );

      case "/snapshots":
        return UserSnapshotsPage.view(model.page.userSnapshotsModel, (msg) =>
          dispatch({ type: "USER_SNAPSHOTS_MSG", msg }),
        );

      case "/snapshot":
        return SnapshotPage.view(model.page.snapshotModel, (msg) =>
          dispatch({ type: "SNAPSHOT_MSG", msg }),
        );

      case "/explore":
        return ExplorePage.view(model.page.exploreModel, (msg) =>
          dispatch({ type: "EXPLORE_MSG", msg }),
        );

      case "/":
        return <div>Loading...</div>;

      default:
        assertUnreachable(model.page);
    }
  }

  return (
    <div>
      <Nav />
      <Page />
    </div>
  );
};

type AuthStatus =
  | { status: "logged out" }
  | { status: "logged in"; user: { id: string } };

function navigationThunk(model: Model) {
  return async function () {
    let newUrl = "/";
    switch (model.page.route) {
      case "/send-link":
        newUrl = "/send-link";
        break;
      case "/snapshots":
        newUrl = "/snapshots";
        break;
      case "/snapshot":
        newUrl = "/snapshot";
        break;
      case "/explore":
        newUrl = "/explore";
        break;
      case "/":
        newUrl = "/";
        break;
      default:
        assertUnreachable(model.page);
    }

    window.history.replaceState({}, "", newUrl);
  };
}
async function run() {
  const router = new Router();
  const subscriptionManager: SubscriptionManager<"router", Msg> = {
    router: router,
  };

  const app = new App<Model, Msg, "router">({
    initialModel: {
      auth: { status: "loading" },
      page: {
        route: "/",
      },
    },
    update,
    view,
    element: document.getElementById("app")!,
    sub: {
      subscriptions: () => [{ id: "router" }],
      subscriptionManager,
    },
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
