import { assertEnv } from "./utils.js";

export function readEnv() {
  const RELEASE_STAGE: "prod" | "dev" = assertEnv("RELEASE_STAGE") as
    | "prod"
    | "dev";
  if (["prod", "dev"].indexOf(RELEASE_STAGE) == -1) {
    throw new Error(
      `RELEASE_STAGE must be prod | dev but it was ${RELEASE_STAGE}`,
    );
  }
  return {
    AUTH_SECRET: assertEnv("AUTH_SECRET"),
    RELEASE_STAGE,
    RESEND_API_KEY: assertEnv("RESEND_API_KEY"),
    MONGODB_URL: assertEnv("MONGODB_URL"),
  };
}
