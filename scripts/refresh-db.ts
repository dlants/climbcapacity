import { $ } from "zx";
$.verbose = true;

async function run() {
  if (!process.env.MONGODB_URL) {
    throw new Error(`Must define MONGODB_URL`);
  }
  await $`npx tsx ./import-climbharder-v3.ts`;
  await $`npx tsx ./import-powercompany.ts`;
  await $`npx tsx ./update-measure-stats.ts`;
}

run().then(
  () => {
    console.log("success");
    process.exit(0);
  },
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
