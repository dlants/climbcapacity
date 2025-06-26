import { Dispatch } from "./types";
import { SnapshotId } from "../iso/protocol";
import { Snapshot } from "./types";

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
    route: "/report-card";
  }
  | {
    route: "/snapshot";
    snapshotId: SnapshotId;
  }
  | {
    route: "/explore";
    mySnapshot?: Snapshot;
  }
  | {
    route: "/";
  };
};

export class Router {
  private onpopstate: ((e: PopStateEvent) => void) | undefined;
  private onhrefclick: ((e: MouseEvent) => void) | undefined;

  constructor() { }

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
    const msg = parseRoute(pathname);
    if (msg) {
      dispatch(msg);
      return true;
    } else {
      return false;
    }
  }
}

export function parseRoute(pathname: string): NavigateMsg | undefined {
  if (pathname == "/send-link") {
    return {
      type: "NAVIGATE",
      target: {
        route: "/send-link",
      },
    };
  }

  if (pathname == "/snapshots") {
    return {
      type: "NAVIGATE",
      target: {
        route: "/snapshots",
      },
    };
  }

  if (pathname == "/report-card") {
    return {
      type: "NAVIGATE",
      target: {
        route: "/report-card",
      },
    };
  }

  {
    const regex = /^\/snapshot\/([a-zA-Z0-9]+)$/;
    const match = pathname.match(regex);

    if (match) {
      const snapshotId = match[1] as SnapshotId;
      return {
        type: "NAVIGATE",
        target: {
          route: "/snapshot",
          snapshotId,
        },
      };
    }
  }

  if (pathname == "/explore") {
    return {
      type: "NAVIGATE",
      target: {
        route: "/explore",
      },
    };
  }

  if (pathname == "/send-link") {
    return {
      type: "NAVIGATE",
      target: {
        route: "/send-link",
      },
    };
  }
}
