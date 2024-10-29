import { SnapshotId } from "../iso/protocol";

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
        snapshotId: SnapshotId;
      }
    | {
        route: "/";
      };
};


export function parseRoute(pathname: string): NavigateMsg {
}
