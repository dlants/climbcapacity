import React from "react";
import {
  createApp,
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
import {
  assertUnreachable,
  ExtractFromDisjointUnion,
  RequestStatus,
} from "./utils";
import { NavigateMsg, parseRoute, Router } from "./router";
import { SnapshotId } from "../iso/protocol";
import { Nav } from "./views/navigation";
import * as immer from "immer";
const produce = immer.produce;

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
      return [
        produce(model, (draft) => {
          draft.page = { route: "/" };
        }),
      ];
    case "/send-link":
      if (user) {
        return [
          produce(model, (draft) => {
            draft.page = { route: "/" };
          }),
        ];
      } else {
        return [
          produce(model, (draft) => {
            draft.page = {
              route: "/send-link",
              sendLinkModel: SendLinkPage.initModel(),
            };
          }),
        ];
      }
    case "/snapshots":
      if (user) {
        const [userSnapshotsModel, userSnapshotsThunk] =
          UserSnapshotsPage.initModel(user.id);
        return [
          produce(model, (draft) => {
            draft.page = {
              route: "/snapshots",
              userSnapshotsModel: immer.castDraft(userSnapshotsModel),
            };
          }),
          wrapThunk("USER_SNAPSHOTS_MSG", userSnapshotsThunk),
        ];
      } else {
        return [
          produce(model, (draft) => {
            draft.page = {
              route: "/send-link",
              sendLinkModel: SendLinkPage.initModel(),
            };
          }),
        ];
      }
    case "/snapshot":
      if (user) {
        const [snapshotModel, snapshotThunk] = SnapshotPage.initModel(
          msg.target.snapshotId,
        );
        return [
          produce(model, (draft) => {
            draft.page = {
              route: "/snapshot",
              snapshotModel: immer.castDraft(snapshotModel),
            };
          }),
          wrapThunk("SNAPSHOT_MSG", snapshotThunk),
        ];
      } else {
        return [
          produce(model, (draft) => {
            draft.page = {
              route: "/send-link",
              sendLinkModel: SendLinkPage.initModel(),
            };
          }),
        ];
      }
    case "/explore":
      const [exploreModel] = ExplorePage.initModel();
      return [
        produce(model, (draft) => {
          draft.page = {
            route: "/explore",
            exploreModel: immer.castDraft(exploreModel),
          };
        }),
      ];
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
        produce(model, (draft) => {
          draft.auth = { status: "loaded", response: msg.status };
        }),
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
        produce(model, (draft) => {
          (
            draft.page as ExtractFromDisjointUnion<
              Model["page"],
              "route",
              "/send-link"
            >
          ).sendLinkModel = immer.castDraft(sendLinkModel);
        }),
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
        produce(model, (draft) => {
          (
            draft.page as ExtractFromDisjointUnion<
              Model["page"],
              "route",
              "/snapshots"
            >
          ).userSnapshotsModel = immer.castDraft(userSnapshotsModel);
        }),
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
        produce(model, (draft) => {
          (
            draft.page as ExtractFromDisjointUnion<
              Model["page"],
              "route",
              "/snapshot"
            >
          ).snapshotModel = immer.castDraft(snapshotModel);
        }),
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
        produce(model, (draft) => {
          (
            draft.page as ExtractFromDisjointUnion<
              Model["page"],
              "route",
              "/explore"
            >
          ).exploreModel = immer.castDraft(exploreModel);
        }),
        wrapThunk("EXPLORE_MSG", exploreThunk),
      ];
    }

    default:
      return assertUnreachable(msg);
  }
};

const view: View<Msg, Model> = ({ model, dispatch }) => {
  function Page() {
    switch (model.page.route) {
      case "/send-link":
        return (
          <SendLinkPage.view
            model={model.page.sendLinkModel}
            dispatch={(msg) => dispatch({ type: "SEND_LINK_MSG", msg })}
          />
        );

      case "/snapshots":
        return (
          <UserSnapshotsPage.view
            model={model.page.userSnapshotsModel}
            dispatch={(msg) => dispatch({ type: "USER_SNAPSHOTS_MSG", msg })}
          />
        );

      case "/snapshot":
        return (
          <SnapshotPage.view
            model={model.page.snapshotModel}
            dispatch={(msg) => dispatch({ type: "SNAPSHOT_MSG", msg })}
          />
        );

      case "/explore":
        return (
          <ExplorePage.view
            model={model.page.exploreModel}
            dispatch={(msg) => dispatch({ type: "EXPLORE_MSG", msg })}
          />
        );

      case "/":
        return <div>TODO: add homepage content</div>;

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
        newUrl = `/snapshot/${model.page.snapshotModel.snapshotId}`;
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
  const response = await fetch("/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const status = (await response.json()) as AuthStatus;
  let initialModel: Model = {
    auth: { status: "loaded", response: status },
    page: {
      route: "/",
    },
  };

  const app = createApp<Model, Msg, "router">({
    initialModel,
    update,
    view,
    sub: {
      subscriptions: () => [{ id: "router" }],
      subscriptionManager,
    },
  });
  const { dispatchRef } = app.mount(document.getElementById("app")!);

  const navMsg = parseRoute(window.location.pathname);
  if (navMsg) {
    dispatchRef.current!(navMsg);
  }
}

run().catch((err) => {
  console.error(err);
});
