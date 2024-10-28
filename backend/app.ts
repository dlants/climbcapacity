import express from "express";
import { connect } from "./db/connect.js";
import { readEnv } from "./env.js";
import { Auth } from "./auth.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path, { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

async function run() {
  console.log("Starting up...");
  const env = readEnv();
  const { db, client } = await connect(env.MONGODB_URL);

  const app = express();

  new Auth({ app, client });
  const staticDir = path.join(__dirname, "../../dist/js");
  console.log(`Serving files from ${staticDir}`);
  app.use("/js", express.static(staticDir));

  app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="app"></div>
        <script src="/js/main.js"></script>
      </body>
    </html>
  `);
  });

  app.listen(80, () => {
    console.log("Server running on port 80");
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
