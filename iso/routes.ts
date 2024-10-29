export const ROUTES = {
  "/": {},
  "/send-link": {},
  "/snapshots": {},
  "/snapshot": {},
  "/explore": {}
} as const;

export type Route = keyof typeof ROUTES;
