import React, { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { SendLink } from "./pages/send-link";
import * as UserSnapshotsPage from "./pages/users-snapshots";
import { SnapshotPage } from "./pages/snapshot";
import { Explore } from "./pages/explore";
import { ReportCard } from "./pages/report-card";
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
    sendLinkPage: SendLink;
  }
  | {
    route: "/snapshots";
    userSnapshotsPage: UserSnapshotsPage.UsersSnapshotsPage;
  }
  | {
    route: "/snapshot";
    snapshotPage: SnapshotPage;
  }
  | {
    route: "/explore";
    explorePage: Explore;
  }
  | {
    route: "/report-card";
    reportCardPage: ReportCard;
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
    msg: any;
  }
  | {
    type: "USER_SNAPSHOTS_MSG";
    msg: UserSnapshotsPage.Msg;
  }
  | {
    type: "SNAPSHOT_MSG";
    msg: any;
  }
  | {
    type: "EXPLORE_MSG";
    msg: any;
  }
  | {
    type: "REPORT_CARD_MSG";
    msg: any;
  };

export type Dispatch<Msg> = (msg: Msg) => void;

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
          const sendLinkPage = new SendLink(
            { myDispatch: (msg) => this.context.myDispatch({ type: "SEND_LINK_MSG", msg }) }
          );
          this.state.page = {
            route: "/send-link",
            sendLinkPage,
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
          const sendLinkPage = new SendLink(
            { myDispatch: (msg) => this.context.myDispatch({ type: "SEND_LINK_MSG", msg }) }
          );
          this.state.page = {
            route: "/send-link",
            sendLinkPage,
          };
        }
        break;

      case "/report-card":
        if (user) {
          const reportCardPage = new ReportCard(
            {
              userId: user.id,
              measureStats: this.state.measureStats,
            },
            { myDispatch: (msg) => this.context.myDispatch({ type: "REPORT_CARD_MSG", msg }) }
          );
          this.state.page = {
            route: "/report-card",
            reportCardPage,
          };
        } else {
          const sendLinkPage = new SendLink(
            { myDispatch: (msg) => this.context.myDispatch({ type: "SEND_LINK_MSG", msg }) }
          );
          this.state.page = {
            route: "/send-link",
            sendLinkPage,
          };
        }
        break;

      case "/snapshot":
        if (user) {
          const snapshotPage = new SnapshotPage(
            {
              snapshotId: msg.target.snapshotId,
              measureStats: this.state.measureStats,
            },
            { myDispatch: (msg) => this.context.myDispatch({ type: "SNAPSHOT_MSG", msg }) }
          );
          this.state.page = {
            route: "/snapshot",
            snapshotPage,
          };
        } else {
          const sendLinkPage = new SendLink(
            { myDispatch: (msg) => this.context.myDispatch({ type: "SEND_LINK_MSG", msg }) }
          );
          this.state.page = {
            route: "/send-link",
            sendLinkPage,
          };
        }
        break;

      case "/explore":
        const explorePage = new Explore(
          {
            measureStats: this.state.measureStats,
          },
          { myDispatch: (msg) => this.context.myDispatch({ type: "EXPLORE_MSG", msg }) }
        );
        this.state.page = {
          route: "/explore",
          explorePage,
        };
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
        (
          this.state.page as ExtractFromDisjointUnion<
            Model["page"],
            "route",
            "/send-link"
          >
        ).sendLinkPage.update(msg.msg);
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
        (
          this.state.page as ExtractFromDisjointUnion<
            Model["page"],
            "route",
            "/snapshot"
          >
        ).snapshotPage.update(msg.msg);
        break;

      case "EXPLORE_MSG":
        if (this.state.page.route != "/explore") {
          console.warn(
            `Got unexpected ${msg.type} msg when model is in ${this.state.page.route} state. Ingoring.`,
          );
          return;
        }
        (
          this.state.page as ExtractFromDisjointUnion<
            Model["page"],
            "route",
            "/explore"
          >
        ).explorePage.update(msg.msg);
        break;

      case "REPORT_CARD_MSG":
        if (this.state.page.route != "/report-card") {
          console.warn(
            `Got unexpected ${msg.type} msg when model is in ${this.state.page.route} state. Ingoring.`,
          );
          return;
        }
        (
          this.state.page as ExtractFromDisjointUnion<
            Model["page"],
            "route",
            "/report-card"
          >
        ).reportCardPage.update(msg.msg);
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
        newUrl = `/snapshot/${this.state.page.snapshotPage.state.snapshotId}`;
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
          return this.state.page.sendLinkPage.view();

        case "/snapshots":
          return this.state.page.userSnapshotsPage.view();

        case "/report-card":
          return this.state.page.reportCardPage.view();

        case "/snapshot":
          return this.state.page.snapshotPage.view();

        case "/explore":
          return this.state.page.explorePage.view();

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


function App({ initialModel }: { initialModel: Model }) {
  const [appState, setAppState] = useState<{ status: "running"; model: Model } | { status: "error"; error: string }>({
    status: "running",
    model: initialModel,
  });

  const [mainApp, setMainApp] = useState<MainApp | null>(null);

  const dispatch = useCallback((msg: Msg) => {
    setAppState((currentState) => {
      if (currentState.status === "error") {
        return currentState;
      }

      try {
        if (!mainApp) {
          return currentState;
        }

        mainApp.update(msg);
        return { status: "running", model: mainApp.state };
      } catch (e) {
        console.error(e);
        return { status: "error", error: (e as Error).message };
      }
    });
  }, [mainApp]);

  // Initialize mainApp once
  React.useEffect(() => {
    if (!mainApp) {
      const app = new MainApp(initialModel, { myDispatch: dispatch });
      setMainApp(app);
    }
  }, [initialModel, dispatch, mainApp]);

  if (appState.status === "error") {
    return <div>Error: {appState.error}</div>;
  }

  if (!mainApp) {
    return <div>Loading...</div>;
  }

  return mainApp.view();
}

async function run() {
  const router = new Router();
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

  let initialModel: Model;
  let dispatchRef: { current: Dispatch<Msg> | undefined } = { current: undefined };

  // We'll create a temporary dispatch function that will be replaced later
  const tempDispatch = (msg: Msg) => {
    if (dispatchRef.current) {
      dispatchRef.current(msg);
    }
  };

  if (auth.status == "loaded" && auth.response.status == "logged in") {
    initialModel = {
      auth,
      measureStats,
      page: { route: "/" },
    };
  } else {
    const sendLinkPage = new SendLink(
      { myDispatch: (msg) => tempDispatch({ type: "SEND_LINK_MSG", msg }) }
    );
    initialModel = {
      auth,
      measureStats,
      page: {
        route: "/send-link",
        sendLinkPage,
      },
    };
  }

  const root = createRoot(document.getElementById("app")!);

  // Create a wrapper component to capture dispatch
  function AppWrapper() {
    const [appState, setAppState] = useState<{ status: "running"; model: Model } | { status: "error"; error: string }>({
      status: "running",
      model: initialModel,
    });

    const [mainApp, setMainApp] = useState<MainApp | null>(null);

    const dispatch = useCallback((msg: Msg) => {
      setAppState((currentState) => {
        if (currentState.status === "error") {
          return currentState;
        }

        try {
          if (!mainApp) {
            return currentState;
          }

          mainApp.update(msg);
          return { status: "running", model: mainApp.state };
        } catch (e) {
          console.error(e);
          return { status: "error", error: (e as Error).message };
        }
      });
    }, [mainApp]);

    // Set the dispatch reference for external use
    React.useEffect(() => {
      dispatchRef.current = dispatch;
    }, [dispatch]);

    // Initialize mainApp once
    React.useEffect(() => {
      if (!mainApp) {
        const app = new MainApp(initialModel, { myDispatch: dispatch });
        setMainApp(app);
      }
    }, [dispatch, mainApp]);

    if (appState.status === "error") {
      return <div>Error: {appState.error}</div>;
    }

    if (!mainApp) {
      return <div>Loading...</div>;
    }

    return mainApp.view();
  }

  flushSync(() => root.render(<AppWrapper />));

  router.subscribe((msg) => {
    if (dispatchRef.current) {
      dispatchRef.current(msg);
    }
  });

  const navMsg = parseRoute(window.location.pathname);
  if (navMsg && dispatchRef.current) {
    dispatchRef.current(navMsg);
  }
}

run().catch((err) => {
  console.error(err);
});
