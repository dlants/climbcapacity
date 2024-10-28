import express from "express";
import mongodb from "mongodb";
import { Lucia, verifyRequestOrigin, generateIdFromEntropySize } from "lucia";
import { MongodbAdapter } from "@lucia-auth/adapter-mongodb";
import { HandledError } from "../utils.js";
import assert from "assert";
import { MagicLink } from "./magic-link.js";

export class Auth {
  private lucia: Lucia;
  private magicLink: MagicLink;
  private userCollection: mongodb.Collection<UserDoc>;

  constructor({
    app,
    client,
    env,
  }: {
    app: express.Application;
    // magicSecretKey: string,
    client: mongodb.MongoClient;
    env: {
      RELEASE_STAGE: "prod" | "dev";
    };
  }) {
    const db = client.db();
    const sessionCollection = db.collection<SessionDoc>("sessions");
    this.userCollection = db.collection<UserDoc>("users");

    const adapter = new MongodbAdapter(sessionCollection, this.userCollection);

    this.magicLink = new MagicLink({ client });

    this.lucia = new Lucia(adapter, {
      sessionCookie: {
        attributes: {
          // set to `true` when using HTTPS
          secure: env.RELEASE_STAGE === "prod",
        },
      },
    });

    app.use((req, res, next) => {
      if (req.method === "GET") {
        return next();
      }
      const originHeader = req.headers.origin ?? null;
      // NOTE: You may need to use `X-Forwarded-Host` instead
      const hostHeader = req.headers.host ?? null;
      if (
        !originHeader ||
        !hostHeader ||
        !verifyRequestOrigin(originHeader, [hostHeader])
      ) {
        res.status(403).end();
        return;
      }
      return next();
    });

    app.post("/send-login-link", async (req, res) => {
      const email: string = req.body.email;
      assert.equal(typeof email, "string");

      const user = await this.findOrCreateUser(email);

      await this.magicLink.sendMagicLink({
        userId: user._id,
        email,
      });
      res.send("OK");
      return;
    });

    app.get("/login", async (req, res) => {
      const code = req.query.code;
      if (typeof code !== "string") {
        throw new HandledError({ status: 401, message: `No token provided` });
      }

      const userId = await this.magicLink.verifyMagicLink({ code });

      await this.lucia.invalidateUserSessions(userId);

      const session = await this.lucia.createSession(userId, {});
      const sessionCookie = this.lucia.createSessionCookie(session.id);
      res
        .status(302)
        .setHeader("Set-Cookie", sessionCookie.serialize())
        .setHeader("Location", "/")
        .send("OK");

      return;
    });
  }

  async assertLoggedIn(req: express.Request, res: express.Response) {
    const sessionId = this.lucia.readSessionCookie(req.headers.cookie ?? "");
    if (!sessionId) {
      throw new HandledError({
        status: 401,
        message: "Expected user to be logged in but no session found.",
      });
    }

    const { session, user } = await this.lucia.validateSession(sessionId);

    if (session && session.fresh) {
      res.appendHeader(
        "Set-Cookie",
        this.lucia.createSessionCookie(session.id).serialize(),
      );
    }
    if (!session) {
      res.appendHeader(
        "Set-Cookie",
        this.lucia.createBlankSessionCookie().serialize(),
      );
    }

    return user;
  }

  async findOrCreateUser(email: string) {
    const user = await this.userCollection.findOne({ email });
    if (user) {
      return user;
    } else {
      const res = await this.userCollection.insertOne({
        _id: generateIdFromEntropySize(10),
        email,
      });
      return {
        _id: res.insertedId,
        email,
      };
    }
  }
}

declare module "lucia" {
  interface Register {
    Lucia: Lucia;
    DatabaseUserAttributes: {
      email: string;
    };
  }
}

interface UserDoc {
  _id: string;
  email: string;
}

interface SessionDoc {
  _id: string;
  expires_at: Date;
  user_id: string;
}
