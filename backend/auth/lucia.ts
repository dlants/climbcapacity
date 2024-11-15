import express from "express";
import mongodb from "mongodb";
import { Lucia, verifyRequestOrigin, generateIdFromEntropySize } from "lucia";
import { MongodbAdapter } from "@lucia-auth/adapter-mongodb";
import { HandledError } from "../utils.js";
import assert from "assert";
import { MagicLink } from "./magic-link.js";
import rateLimit from "express-rate-limit";
import { apiRoute } from "../utils.js";
import { AuthStatus } from "../../iso/protocol.js";

export class Auth {
  private lucia: Lucia;
  private magicLink: MagicLink;
  private userCollection: mongodb.Collection<UserDoc>;
  private emailAttempts: Map<string, number>;
  private emailLastAttempt: Map<string, number>;

  constructor({
    app,
    client,
    env,
  }: {
    app: express.Application;
    client: mongodb.MongoClient;
    env: {
      RELEASE_STAGE: "prod" | "dev";
      RESEND_API_KEY: string;
      BASE_URL: string;
    };
  }) {
    const db = client.db();
    const sessionCollection = db.collection<SessionDoc>("sessions");
    this.userCollection = db.collection<UserDoc>("users");

    const adapter = new MongodbAdapter(sessionCollection, this.userCollection);

    this.magicLink = new MagicLink({ client, env });

    this.lucia = new Lucia(adapter, {
      sessionCookie: {
        attributes: {
          // set to `true` when using HTTPS
          secure: env.RELEASE_STAGE === "prod",
        },
      },
    });

    // we are sitting behind the render proxy. This should help the rate limiter work properly.
    app.set("trust proxy", true);
    const loginLinkIpLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5, // 5 requests per IP
      message:
        "Too many login attempts from this IP, please try again in an hour",
    });

    this.emailAttempts = new Map<string, number>();
    this.emailLastAttempt = new Map<string, number>();

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

    app.post(
      "/api/send-login-link",
      loginLinkIpLimiter,
      apiRoute(async (req, _res) => {
        const email: string = req.body.email;
        assert.equal(typeof email, "string");

        if (this.shouldRateLimitLogin(email)) {
          throw new HandledError({
            status: 429,
            message:
              "Too many login attempts for this email, please try again later",
          });
        }

        const user = await this.findOrCreateUser(email);

        await this.magicLink.sendMagicLink({
          userId: user._id,
          email,
        });
        return "OK";
      }),
    );

    app.get("/api/login", async (req, res) => {
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

    app.get("/api/logout", async (req, res) => {
      // Get current session
      const sessionId = this.lucia.readSessionCookie(req.headers.cookie ?? "");
      if (sessionId) {
        // Invalidate the session
        await this.lucia.invalidateSession(sessionId);
      }

      // Clear the session cookie
      const sessionCookie = this.lucia.createBlankSessionCookie();

      res
        .status(302)
        .setHeader("Set-Cookie", sessionCookie.serialize())
        .setHeader("Location", "/")
        .send("OK");
    });

    app.post(
      "/api/auth",
      apiRoute<AuthStatus>(async (req, res) => {
        try {
          const user = await this.assertLoggedIn(req, res);
          return {
            status: "logged in",
            user: { id: user.id },
          };
        } catch {
          return {
            status: "logged out",
          };
        }
      }),
    );
  }

  shouldRateLimitLogin(email: string): boolean {
    const now = Date.now();
    const lastAttempt = this.emailLastAttempt.get(email) || 0;
    const attempts = this.emailAttempts.get(email) || 0;

    if (now - lastAttempt > 60 * 60 * 1000) {
      this.emailAttempts.set(email, 1);
      this.emailLastAttempt.set(email, now);
      return false;
    }

    if (attempts >= 3) {
      return true;
    }

    this.emailAttempts.set(email, attempts + 1);
    this.emailLastAttempt.set(email, now);
    return false;
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

    if (!user) {
      throw new HandledError({
        status: 401,
        message: "Session validation failed",
      });
    }

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
