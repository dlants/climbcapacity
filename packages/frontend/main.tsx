import * as DCGView from "dcgview";
import { SendLinkController, SendLinkView } from "./pages/send-link";
import {
  UsersSnapshotsController,
  UsersSnapshotsView,
} from "./pages/users-snapshots";
import { SnapshotPageController, SnapshotPageView } from "./pages/snapshot";
import { ExploreController, ExploreView } from "./pages/explore";
import { ReportCardController, ReportCardView } from "./pages/report-card";
import {
  assertUnreachable,
  ExtractFromDisjointUnion,
  RequestStatus,
} from "./util/utils";
import { NavigateMsg, parseRoute, Router } from "./router";
import { AuthStatus, MeasureStats, SnapshotId } from "../iso/protocol";
import { Nav } from "./views/navigation";
import { Locale, detectBrowserLocale } from "../iso/locale";
import * as typestyle from "typestyle";
import * as csx from "csx";
import * as csstips from "csstips";
import { Dispatch } from "./types";

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
  locale: Locale;
  page:
    | {
        route: "/send-link";
        sendLinkPage: SendLinkController;
      }
    | {
        route: "/snapshots";
        userSnapshotsPage: UsersSnapshotsController;
      }
    | {
        route: "/snapshot";
        snapshotPage: SnapshotPageController;
      }
    | {
        route: "/explore";
        explorePage: ExploreController;
      }
    | {
        route: "/report-card";
        reportCardPage: ReportCardController;
      }
    | {
        route: "/";
      };
};

import { Msg as SendLinkMsg } from "./pages/send-link";
import { Msg as UsersSnapshotsMsg } from "./pages/users-snapshots";
import { Msg as SnapshotPageMsg } from "./pages/snapshot";
import { Msg as ExploreMsg } from "./pages/explore";
import { Msg as ReportCardMsg } from "./pages/report-card";
import {
  Msg as LocaleSelectorMsg,
  LocaleSelectorController,
} from "./views/locale-selector";

type Msg =
  | {
      type: "AUTH_RESOLVED";
      status: AuthStatus;
    }
  | NavigateMsg
  | {
      type: "SEND_LINK_MSG";
      msg: SendLinkMsg;
    }
  | {
      type: "USER_SNAPSHOTS_MSG";
      msg: UsersSnapshotsMsg;
    }
  | {
      type: "SNAPSHOT_MSG";
      msg: SnapshotPageMsg;
    }
  | {
      type: "EXPLORE_MSG";
      msg: ExploreMsg;
    }
  | {
      type: "REPORT_CARD_MSG";
      msg: ReportCardMsg;
    }
  | {
      type: "LOCALE_MSG";
      msg: LocaleSelectorMsg;
    };

export class MainAppController {
  state: Model;
  error: string | null = null;
  public localeSelectorController: LocaleSelectorController;

  constructor(
    auth: RequestStatus<AuthStatus>,
    measureStats: MeasureStats,
    public myDispatch: Dispatch<Msg>,
  ) {
    const locale = detectBrowserLocale();

    if (auth.status == "loaded" && auth.response.status == "logged in") {
      this.state = {
        auth,
        measureStats,
        locale,
        page: { route: "/" },
      };
    } else {
      const sendLinkPage = new SendLinkController((msg: SendLinkMsg) =>
        this.myDispatch({ type: "SEND_LINK_MSG", msg }),
      );
      this.state = {
        auth,
        measureStats,
        locale,
        page: {
          route: "/send-link",
          sendLinkPage,
        },
      };
    }

    // Create locale selector controller
    this.localeSelectorController = new LocaleSelectorController(
      locale,
      (msg: LocaleSelectorMsg) => this.myDispatch({ type: "LOCALE_MSG", msg }),
    );
  }

  private navigate(msg: NavigateMsg) {
    if (msg.type != "NAVIGATE") {
      throw new Error(`Unexpected msg passed to navigate fn ${msg.type}`);
    }

    let user: { id: string } | false = false;
    if (
      this.state.auth.status == "loaded" &&
      this.state.auth.response.status == "logged in"
    ) {
      user = this.state.auth.response.user;
    }

    switch (msg.target.route) {
      case "/":
        this.state.page = { route: "/" };
        break;

      case "/send-link":
        if (user) {
          this.state.page = { route: "/" };
        } else {
          const sendLinkPage = new SendLinkController((msg: SendLinkMsg) =>
            this.myDispatch({ type: "SEND_LINK_MSG", msg }),
          );
          this.state.page = {
            route: "/send-link",
            sendLinkPage,
          };
        }
        break;

      case "/snapshots": {
        if (user) {
          const userSnapshotsPage = new UsersSnapshotsController(
            user.id,
            (msg: UsersSnapshotsMsg) =>
              this.myDispatch({ type: "USER_SNAPSHOTS_MSG", msg }),
          );
          this.state.page = {
            route: "/snapshots",
            userSnapshotsPage,
          };
        } else {
          const sendLinkPage = new SendLinkController((msg: SendLinkMsg) =>
            this.myDispatch({ type: "SEND_LINK_MSG", msg }),
          );
          this.state.page = {
            route: "/send-link",
            sendLinkPage,
          };
        }
        break;
      }

      case "/report-card": {
        if (user) {
          const reportCardPage = new ReportCardController(
            user.id,
            this.state.measureStats,
            {
              locale: this.localeSelectorController.state.selectedLocale,
              myDispatch: (msg: ReportCardMsg) =>
                this.myDispatch({ type: "REPORT_CARD_MSG", msg }),
            },
          );
          this.state.page = {
            route: "/report-card",
            reportCardPage,
          };
        } else {
          const sendLinkPage = new SendLinkController((msg: SendLinkMsg) =>
            this.myDispatch({ type: "SEND_LINK_MSG", msg }),
          );
          this.state.page = {
            route: "/send-link",
            sendLinkPage,
          };
        }
        break;
      }

      case "/snapshot": {
        if (user) {
          const snapshotPage = new SnapshotPageController(
            msg.target.snapshotId,
            this.state.measureStats,
            (msg: SnapshotPageMsg) =>
              this.myDispatch({ type: "SNAPSHOT_MSG", msg }),
          );
          this.state.page = {
            route: "/snapshot",
            snapshotPage,
          };
        } else {
          const sendLinkPage = new SendLinkController((msg: SendLinkMsg) =>
            this.myDispatch({ type: "SEND_LINK_MSG", msg }),
          );
          this.state.page = {
            route: "/send-link",
            sendLinkPage,
          };
        }
        break;
      }

      case "/explore": {
        const explorePage = new ExploreController(this.state.measureStats, {
          myDispatch: (msg: ExploreMsg) =>
            this.myDispatch({ type: "EXPLORE_MSG", msg }),
          locale: this.state.locale,
        });
        this.state.page = {
          route: "/explore",
          explorePage,
        };
        break;
      }

      default:
        assertUnreachable(msg.target);
    }

    this.navigationThunk().catch(console.error);
  }

  handleDispatch(msg: Msg) {
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
            `Got unexpected ${msg.type} msg when model is in ${this.state.page.route} state. Ignoring.`,
          );
          return;
        }
        (
          this.state.page as ExtractFromDisjointUnion<
            Model["page"],
            "route",
            "/send-link"
          >
        ).sendLinkPage.handleDispatch(msg.msg);
        break;

      case "USER_SNAPSHOTS_MSG":
        if (this.state.page.route != "/snapshots") {
          console.warn(
            `Got unexpected ${msg.type} msg when model is in ${this.state.page.route} state. Ignoring.`,
          );
          return;
        }

        if (msg.msg.type == "SELECT_SNAPSHOT") {
          const snapshotId = msg.msg.snapshot.snapshot._id as SnapshotId;
          (async () => {
            this.myDispatch({
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
        ).userSnapshotsPage.handleDispatch(msg.msg);
        break;

      case "SNAPSHOT_MSG":
        if (this.state.page.route != "/snapshot") {
          console.warn(
            `Got unexpected ${msg.type} msg when model is in ${this.state.page.route} state. Ignoring.`,
          );
          return;
        }
        (
          this.state.page as ExtractFromDisjointUnion<
            Model["page"],
            "route",
            "/snapshot"
          >
        ).snapshotPage.handleDispatch(msg.msg);
        break;

      case "EXPLORE_MSG":
        if (this.state.page.route != "/explore") {
          console.warn(
            `Got unexpected ${msg.type} msg when model is in ${this.state.page.route} state. Ignoring.`,
          );
          return;
        }
        (
          this.state.page as ExtractFromDisjointUnion<
            Model["page"],
            "route",
            "/explore"
          >
        ).explorePage.handleDispatch(msg.msg);
        break;

      case "REPORT_CARD_MSG":
        if (this.state.page.route != "/report-card") {
          console.warn(
            `Got unexpected ${msg.type} msg when model is in ${this.state.page.route} state. Ignoring.`,
          );
          return;
        }
        (
          this.state.page as ExtractFromDisjointUnion<
            Model["page"],
            "route",
            "/report-card"
          >
        ).reportCardPage.handleDispatch(msg.msg);
        break;

      case "LOCALE_MSG": {
        if (!this.localeSelectorController) {
          throw new Error("Locale selector controller not initialized");
        }
        this.localeSelectorController.handleDispatch(msg.msg);
        break;
      }

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
}

export class MainAppView extends DCGView.View<{
  controller: () => MainAppController;
}> {
  template() {
    const stateProp = () => this.props.controller().state;

    if (this.props.controller().error) {
      return <div>Error: {this.props.controller().error}</div>;
    }

    return (
      <div class={DCGView.const(styles.root)}>
        <div class={DCGView.const(styles.page)}>
          <div class={DCGView.const(styles.pageItem)}>
            <Nav
              loggedIn={() => {
                const auth = stateProp().auth;
                return (
                  auth.status == "loaded" && auth.response.status == "logged in"
                );
              }}
              localeSelectorController={() =>
                this.props.controller().localeSelectorController!
              }
            />
          </div>
          <div class={DCGView.const(styles.lastPageItem)}>
            {this.renderPage(stateProp)}
          </div>
        </div>
      </div>
    );
  }

  private renderPage(stateProp: () => Model) {
    const { SwitchUnion } = DCGView.Components;

    return SwitchUnion(() => stateProp().page, "route", {
      "/send-link": (pageProp) => (
        <SendLinkView controller={() => pageProp().sendLinkPage} />
      ),

      "/snapshots": (pageProp) => (
        <UsersSnapshotsView controller={() => pageProp().userSnapshotsPage} />
      ),

      "/report-card": (pageProp) => (
        <ReportCardView controller={() => pageProp().reportCardPage} />
      ),

      "/snapshot": (pageProp) => (
        <SnapshotPageView controller={() => pageProp().snapshotPage} />
      ),

      "/explore": (pageProp) => (
        <ExploreView controller={() => pageProp().explorePage} />
      ),

      "/": () => <div>TODO: add homepage content</div>,
    });
  }
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

  let mainAppController: MainAppController;
  let mainAppView: MainAppView;

  const dispatch = (msg: Msg) => {
    if (!mainAppController || mainAppController.error) {
      return;
    }

    try {
      mainAppController.handleDispatch(msg);
      mainAppView.update();
    } catch (e) {
      console.error(e);
      mainAppController.error = (e as Error).message;
      mainAppView.update();
    }
  };

  mainAppController = new MainAppController(auth, measureStats, dispatch);
  mainAppView = DCGView.mountToNode(
    MainAppView,
    document.getElementById("app")!,
    {
      controller: () => mainAppController,
    },
  );

  router.subscribe(dispatch);

  const navMsg = parseRoute(window.location.pathname);
  if (navMsg) {
    dispatch(navMsg);
  }
}

run().catch((err) => {
  console.error(err);
});

// Legacy compatibility export
export const MainApp = MainAppController;
