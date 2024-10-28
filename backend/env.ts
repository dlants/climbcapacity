import { assertEnv } from "./utils.js";

export function readEnv() {
  return {
    AUTH_SECRET: assertEnv('AUTH_SECRET'),
    RELEASE_STAGE: assertEnv('RELEASE_STAGE'),
    RESEND_API_KEY: assertEnv('RESEND_API_KEY'),
    MONGODB_URL: assertEnv('MONGODB_URL')
  }
}
