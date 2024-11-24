import React from "react";
import {
  createApp,
  wrapThunk,
  Update,
  View,
  SubscriptionManager,
  chainThunks,
  Dispatch,
} from "./tea";
import * as SendLinkPage from "./pages/send-link";
import * as UserSnapshotsPage from "./pages/users-snapshots";
import * as SnapshotPage from "./pages/snapshot";
import * as ExplorePage from "./pages/explore";
import * as ReportCardPage from "./pages/report-card";
import {
  assertUnreachable,
  ExtractFromDisjointUnion,
  RequestStatus,
} from "./util/utils";
import { NavigateMsg, parseRoute, Router } from "./router";
import { AuthStatus, MeasureStats, SnapshotId } from "../iso/protocol";
import { Nav } from "./views/navigation";
import * as immer from "immer";
import * as typestyle from "typestyle";
import * as csx from "csx";

const produce = immer.produce;

const styles = typestyle.stylesheet({
  root: {
    maxWidth: csx.px(1200),
    marginLeft: "auto",
    marginRight: "auto",
    fontSize: csx.em(1),
    $nest: {
      "& input": {
        maxWidth: csx.em(4),
      },
      "@media (max-width: 600px)": {
        fontSize: csx.em(0.9),
        padding: csx.rem(0.2),
        $nest: {
          "& input": {
            maxWidth: csx.em(3.5),
          },
        },
      },
    },
  },
  page: {
    margin: "0 auto",
  },
});

export type Model = {
  auth: RequestStatus<AuthStatus>;
  measureStats: MeasureStats;
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
        route: "/report-card";
        reportCardModel: ReportCardPage.Model;
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
    }
  | {
      type: "REPORT_CARD_MSG";
      msg: ReportCardPage.Msg;
    };

const navigate: Update<Msg, Model> = (msg, model) => {
  if (msg.type != "NAVIGATE") {
    throw new Error(`Unexpected msg passed to navigate fn ${msg.type}`);
  }

  const user =
    model.auth.status == "loaded" &&
    model.auth.response.status == "logged in" &&
    model.auth.response.user;

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

    case "/report-card":
      if (user) {
        const [reportCardModel, reportCardThunk] = ReportCardPage.initModel({
          userId: user.id,
          measureStats: model.measureStats,
        });
        return [
          produce(model, (draft) => {
            draft.page = {
              route: "/report-card",
              reportCardModel: immer.castDraft(reportCardModel),
            };
          }),
          wrapThunk("REPORT_CARD_MSG", reportCardThunk),
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
        const [snapshotModel, snapshotThunk] = SnapshotPage.initModel({
          snapshotId: msg.target.snapshotId,
          measureStats: model.measureStats,
        });
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
      const [exploreModel, exploreThunk] = ExplorePage.initModel({
        measureStats: model.measureStats,
      });
      return [
        produce(model, (draft) => {
          draft.page = {
            route: "/explore",
            exploreModel: immer.castDraft(exploreModel),
          };
        }),
        wrapThunk("EXPLORE_MSG", exploreThunk),
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
        const snapshotId = msg.msg.snapshot.snapshot._id as SnapshotId;
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

    case "REPORT_CARD_MSG": {
      if (model.page.route != "/report-card") {
        console.warn(
          `Got unexpected ${msg.type} msg when model is in ${model.page.route} state. Ingoring.`,
        );
        return [model];
      }
      const [reportCardModel, reportCardThunk] = ReportCardPage.update(
        msg.msg,
        model.page.reportCardModel,
      );
      return [
        produce(model, (draft) => {
          (
            draft.page as ExtractFromDisjointUnion<
              Model["page"],
              "route",
              "/report-card"
            >
          ).reportCardModel = immer.castDraft(reportCardModel);
        }),
        wrapThunk("REPORT_CARD_MSG", reportCardThunk),
      ];
    }

    default:
      return assertUnreachable(msg);
  }
};

function Page({ model, dispatch }: { model: Model; dispatch: Dispatch<Msg> }) {
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

    case "/report-card":
      return (
        <ReportCardPage.view
          model={model.page.reportCardModel}
          dispatch={(msg) => dispatch({ type: "REPORT_CARD_MSG", msg })}
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

const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div className={styles.root}>
      <Nav
        loggedIn={
          model.auth.status == "loaded" &&
          model.auth.response.status == "logged in"
        }
      />
      <div className={styles.page}>
        <Page model={model} dispatch={dispatch} />
      </div>
    </div>
  );
};

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
      case "/report-card":
        newUrl = "/report-card";
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
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  let auth: Model["auth"] = { status: "loading" };
  if (response.ok) {
    const status = (await response.json()) as AuthStatus;
    auth = { status: "loaded", response: status };
  } else {
    auth = { status: "error", error: await response.text() };
  }

  const measureStatsResponse = await fetch("/api/measure-stats");
  let measureStats: MeasureStats;
  if (measureStatsResponse.ok) {
    measureStats = (await measureStatsResponse.json()) as MeasureStats;
  } else {
    measureStats = {
      stats: {},
    };
  }

  let initialModel: Model = {
    auth,
    measureStats,
    page:
      auth.status == "loaded" && auth.response.status == "logged in"
        ? {
            route: "/",
          }
        : {
            route: "/send-link",
            sendLinkModel: SendLinkPage.initModel(),
          },
  };

  const app = createApp<Model, Msg, "router">({
    initialModel,
    update,
    View: view,
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
