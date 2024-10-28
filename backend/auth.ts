import express from "express";
import { ExpressAuth } from "@auth/express";
import Resend from "@auth/express/providers/resend";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import mongodb from "mongodb";

export class Auth {
  constructor({
    app,
    client,
  }: {
    app: express.Application;
    // magicSecretKey: string,
    client: mongodb.MongoClient;
  }) {
    app.set("trust proxy", true);
    app.use(
      "/auth/*",
      ExpressAuth({ providers: [Resend], adapter: MongoDBAdapter(client) }),
    );
  }
}
