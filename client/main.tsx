import React from "react";
import {
  createApp,
  SubscriptionManager,
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
import * as typestyle from "typestyle";
import * as csx from "csx";
import * as csstips from "csstips";



const styles = typestyle.stylesheet({
  root: {
    ...csstips.vertical,
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    marginTop: csx.em(1),
    fontSize: csx.em(1),
    $nest: {
      "@media (max-width: 600px)": {
        fontSize: csx.em(0.9),
      },
    },
  },
  page: {
    ...csstips.vertical,
    ...csstips.flex,
    minHeight: 0,
    width: csx.px(800),
    marginLeft: "auto",
    marginRight: "auto",
    $nest: {
      "@media (max-width: 800px)": {
        width: csx.percent(100),
      },
    },
  },
  pageItem: {
    ...csstips.content,
  },
  lastPageItem: {
    ...csstips.flex,
    minHeight: 0,
    position: "relative",
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
    userSnapshotsPage: UserSnapshotsPage.UsersSnapshotsPage;
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

export class MainApp {
  state: Model;

  constructor(
    initialModel: Model,
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    this.state = initialModel;
  }

  private navigate(msg: NavigateMsg) {
    if (msg.type != "NAVIGATE") {
      throw new Error(`Unexpected msg passed to navigate fn ${msg.type}`);
    }

    const user =
      this.state.auth.status == "loaded" &&
      this.state.auth.response.status == "logged in" &&
      this.state.auth.response.user;

    switch (msg.target.route) {
      case "/":
        this.state.page = { route: "/" };
        break;

      case "/send-link":
        if (user) {
          this.state.page = { route: "/" };
        } else {
          this.state.page = {
            route: "/send-link",
            sendLinkModel: SendLinkPage.initModel(),
          };
        }
        break;

      case "/snapshots":
        if (user) {
          const userSnapshotsPage = new UserSnapshotsPage.UsersSnapshotsPage(
            user.id,
            { myDispatch: (msg) => this.context.myDispatch({ type: "USER_SNAPSHOTS_MSG", msg }) }
          );
          this.state.page = {
            route: "/snapshots",
            userSnapshotsPage,
          };
        } else {
          this.state.page = {
            route: "/send-link",
            sendLinkModel: SendLinkPage.initModel(),
          };
        }
        break;

      case "/report-card":
        if (user) {
          const [reportCardModel, reportCardThunk] = ReportCardPage.initModel({
            userId: user.id,
            measureStats: this.state.measureStats,
          });
          this.state.page = {
            route: "/report-card",
            reportCardModel,
          };

          (async () => {
            const wrappedThunk = async (dispatch: Dispatch<ReportCardPage.Msg>) => {
              await reportCardThunk(dispatch);
            };
            await wrappedThunk((msg) => this.context.myDispatch({ type: "REPORT_CARD_MSG", msg }));
          })().catch(console.error);
        } else {
          this.state.page = {
            route: "/send-link",
            sendLinkModel: SendLinkPage.initModel(),
          };
        }
        break;

      case "/snapshot":
        if (user) {
          const [snapshotModel, snapshotThunk] = SnapshotPage.initModel({
            snapshotId: msg.target.snapshotId,
            measureStats: this.state.measureStats,
          });
          this.state.page = {
            route: "/snapshot",
            snapshotModel,
          };

          (async () => {
            const wrappedThunk = async (dispatch: Dispatch<SnapshotPage.Msg>) => {
              await snapshotThunk(dispatch);
            };
            await wrappedThunk((msg) => this.context.myDispatch({ type: "SNAPSHOT_MSG", msg }));
          })().catch(console.error);
        } else {
          this.state.page = {
            route: "/send-link",
            sendLinkModel: SendLinkPage.initModel(),
          };
        }
        break;

      case "/explore":
        const [exploreModel, exploreThunk] = ExplorePage.initModel({
          measureStats: this.state.measureStats,
        });
        this.state.page = {
          route: "/explore",
          exploreModel,
        };

        (async () => {
          const wrappedThunk = async (dispatch: Dispatch<ExplorePage.Msg>) => {
            await exploreThunk(dispatch);
          };
          await wrappedThunk((msg) => this.context.myDispatch({ type: "EXPLORE_MSG", msg }));
        })().catch(console.error);
        break;

      default:
        assertUnreachable(msg.target);
    }

    this.navigationThunk().catch(console.error);
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "NAVIGATE":
        this.navigate(msg);
        break;

      case "AUTH_RESOLVED":
        this.state.auth = { status: "loaded", response: msg.status };
        break;

      case "SEND_LINK_MSG":
        if (this.state.page.route != "/send-link") {
          console.warn(
            `Got unexpected ${msg.type} msg when model is in ${this.state.page.route} state. Ingoring.`,
          );
          return;
        }
        const [sendLinkModel, sendLinkThunk] = SendLinkPage.update(
          msg.msg,
          this.state.page.sendLinkModel,
        );
        (
          this.state.page as ExtractFromDisjointUnion<
            Model["page"],
            "route",
            "/send-link"
          >
        ).sendLinkModel = sendLinkModel;

        (async () => {
          const wrappedThunk = async (dispatch: Dispatch<SendLinkPage.Msg>) => {
            await sendLinkThunk(dispatch);
          };
          await wrappedThunk((msg) => this.context.myDispatch({ type: "SEND_LINK_MSG", msg }));
        })().catch(console.error);
        break;

      case "USER_SNAPSHOTS_MSG":
        if (this.state.page.route != "/snapshots") {
          console.warn(
            `Got unexpected ${msg.type} msg when model is in ${this.state.page.route} state. Ingoring.`,
          );
          return;
        }

        if (msg.msg.type == "SELECT_SNAPSHOT") {
          const snapshotId = msg.msg.snapshot.snapshot._id as SnapshotId;
          (async () => {
            this.context.myDispatch({
              type: "NAVIGATE",
              target: {
                route: "/snapshot",
                snapshotId,
              },
            });
          })().catch(console.error);
          return;
        }

        (
          this.state.page as ExtractFromDisjointUnion<
            Model["page"],
            "route",
            "/snapshots"
          >
        ).userSnapshotsPage.update(msg.msg);
        break;

      case "SNAPSHOT_MSG":
        if (this.state.page.route != "/snapshot") {
          console.warn(
            `Got unexpected ${msg.type} msg when model is in ${this.state.page.route} state. Ingoring.`,
          );
          return;
        }
        const [snapshotModel, snapshotThunk] = SnapshotPage.update(
          msg.msg,
          this.state.page.snapshotModel,
        );
        (
          this.state.page as ExtractFromDisjointUnion<
            Model["page"],
            "route",
            "/snapshot"
          >
        ).snapshotModel = snapshotModel;

        (async () => {
          const wrappedThunk = async (dispatch: Dispatch<SnapshotPage.Msg>) => {
            await snapshotThunk(dispatch);
          };
          await wrappedThunk((msg) => this.context.myDispatch({ type: "SNAPSHOT_MSG", msg }));
        })().catch(console.error);
        break;

      case "EXPLORE_MSG":
        if (this.state.page.route != "/explore") {
          console.warn(
            `Got unexpected ${msg.type} msg when model is in ${this.state.page.route} state. Ingoring.`,
          );
          return;
        }
        const [exploreModel, exploreThunk] = ExplorePage.update(
          msg.msg,
          this.state.page.exploreModel,
        );
        (
          this.state.page as ExtractFromDisjointUnion<
            Model["page"],
            "route",
            "/explore"
          >
        ).exploreModel = exploreModel;

        (async () => {
          const wrappedThunk = async (dispatch: Dispatch<ExplorePage.Msg>) => {
            await exploreThunk(dispatch);
          };
          await wrappedThunk((msg) => this.context.myDispatch({ type: "EXPLORE_MSG", msg }));
        })().catch(console.error);
        break;

      case "REPORT_CARD_MSG":
        if (this.state.page.route != "/report-card") {
          console.warn(
            `Got unexpected ${msg.type} msg when model is in ${this.state.page.route} state. Ingoring.`,
          );
          return;
        }
        const [reportCardModel, reportCardThunk] = ReportCardPage.update(
          msg.msg,
          this.state.page.reportCardModel,
        );
        (
          this.state.page as ExtractFromDisjointUnion<
            Model["page"],
            "route",
            "/report-card"
          >
        ).reportCardModel = reportCardModel;

        (async () => {
          const wrappedThunk = async (dispatch: Dispatch<ReportCardPage.Msg>) => {
            await reportCardThunk(dispatch);
          };
          await wrappedThunk((msg) => this.context.myDispatch({ type: "REPORT_CARD_MSG", msg }));
        })().catch(console.error);
        break;

      default:
        assertUnreachable(msg);
    }
  }

  private async navigationThunk() {
    let newUrl = "/";
    switch (this.state.page.route) {
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
        newUrl = `/snapshot/${this.state.page.snapshotModel.snapshotId}`;
        break;
      case "/explore":
        newUrl = "/explore";
        break;
      case "/":
        newUrl = "/";
        break;
      default:
        assertUnreachable(this.state.page);
    }

    window.history.replaceState({}, "", newUrl);
  }

  view() {
    const Page = () => {
      switch (this.state.page.route) {
        case "/send-link":
          return (
            <SendLinkPage.view
              model={this.state.page.sendLinkModel}
              dispatch={(msg) => this.context.myDispatch({ type: "SEND_LINK_MSG", msg })}
            />
          );

        case "/snapshots":
          return this.state.page.userSnapshotsPage.view();

        case "/report-card":
          return (
            <ReportCardPage.view
              model={this.state.page.reportCardModel}
              dispatch={(msg) => this.context.myDispatch({ type: "REPORT_CARD_MSG", msg })}
            />
          );

        case "/snapshot":
          return (
            <SnapshotPage.view
              model={this.state.page.snapshotModel}
              dispatch={(msg) => this.context.myDispatch({ type: "SNAPSHOT_MSG", msg })}
            />
          );

        case "/explore":
          return (
            <ExplorePage.view
              model={this.state.page.exploreModel}
              dispatch={(msg) => this.context.myDispatch({ type: "EXPLORE_MSG", msg })}
            />
          );

        case "/":
          return <div>TODO: add homepage content</div>;

        default:
          assertUnreachable(this.state.page);
      }
    };

    return (
      <div className={styles.root}>
        <div className={styles.page}>
          <div className={styles.pageItem}>
            <Nav
              loggedIn={
                this.state.auth.status == "loaded" &&
                this.state.auth.response.status == "logged in"
              }
            />
          </div>
          <div className={styles.lastPageItem}>
            <Page />
          </div>
        </div>
      </div>
    );
  }
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
    measureStats = {};
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

  let mainApp: MainApp;

  let dispatchFn: Dispatch<Msg>;

  const app = createApp<Model, Msg, "router">({
    initialModel,
    update: (msg, model) => {
      mainApp.update(msg);
      return mainApp.state;
    },
    View: ({ model }) => {
      return mainApp.view();
    },
    sub: {
      subscriptions: () => [{ id: "router" }],
      subscriptionManager,
    },
  });
  const { dispatchRef } = app.mount(document.getElementById("app")!);

  dispatchFn = dispatchRef.current!;
  mainApp = new MainApp(initialModel, { myDispatch: dispatchFn });

  const navMsg = parseRoute(window.location.pathname);
  if (navMsg) {
    dispatchRef.current!(navMsg);
  }
}

run().catch((err) => {
  console.error(err);
});
