import { Dispatch } from "react";
import { SnapshotId } from "../iso/protocol";
import { assertUnreachable } from "./utils";

export type NavigateMsg = {
  type: "NAVIGATE";
  target:
    | {
        route: "/send-link";
      }
    | {
        route: "/snapshots";
      }
    | {
        route: "/snapshot";
        snapshotId: SnapshotId;
      }
    | {
        route: "/explore";
      }
    | {
        route: "/";
      };
};

export class Router {
  private onpopstate: ((e: PopStateEvent) => void) | undefined;
  private onhrefclick: ((e: MouseEvent) => void) | undefined;

  constructor() {}

  subscribe(dispatch: Dispatch<NavigateMsg>) {
    if (this.onpopstate || this.onhrefclick) {
      throw new Error(`Unsubscribe router before resubscribing`);
    }
    this.onpopstate = (e) => {
      const routed = this.routePathName(window.location.pathname, dispatch);
      if (routed) {
        e.preventDefault();
      }
    };

    this.onhrefclick = (e) => {
      const link = (e.target as HTMLElement)?.closest("a");
      if (link) {
        const routed = this.routePathName(
          new URL(link.href).pathname,
          dispatch,
        );
        if (routed) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener("popstate", this.onpopstate);
    document.addEventListener("click", this.onhrefclick);
  }

  unsubscribe(): void {
    if (this.onpopstate) {
      window.removeEventListener("popstate", this.onpopstate);
      delete this.onpopstate;
    }

    if (this.onhrefclick) {
      document.removeEventListener("click", this.onhrefclick);
      delete this.onhrefclick;
    }
  }

  private routePathName(
    pathname: string,
    dispatch: Dispatch<NavigateMsg>,
  ): boolean {
    if (pathname == "/send-link") {
      dispatch({
        type: "NAVIGATE",
        target: {
          route: "/send-link",
        },
      });
      return true;
    }

    if (pathname == "/snapshots") {
      dispatch({
        type: "NAVIGATE",
        target: {
          route: "/snapshots",
        },
      });
      return true;
    }

    if (pathname == "/explore") {
      dispatch({
        type: "NAVIGATE",
        target: {
          route: "/explore",
        },
      });
      return true;
    }

    return false;
  }
}
