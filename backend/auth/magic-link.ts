import mongodb from "mongodb";
import { generateRandomString, alphabet } from "oslo/crypto";
import { isWithinExpirationDate } from "oslo";
import { HandledError } from "../utils.js";
import { Resend } from "resend";

export class MagicLink {
  private magicLinkCollection: mongodb.Collection<MagicLinkDoc>;
  private resend: Resend;
  private BASE_URL: string;

  constructor({
    client,
    env,
  }: {
    client: mongodb.MongoClient;
    env: {
      RESEND_API_KEY: string;
      BASE_URL: string;
    };
  }) {
    this.magicLinkCollection = client
      .db()
      .collection<MagicLinkDoc>("magicLinks");
    this.resend = new Resend(env.RESEND_API_KEY);
    this.BASE_URL = env.BASE_URL;
  }

  async generateMagicLink({
    userId,
    email,
  }: {
    userId: string;
    email: string;
  }): Promise<string> {
    await this.magicLinkCollection.deleteMany({ userId });
    const code = generateRandomString(16, alphabet("a-z", "A-Z", "0-9"));
    await this.magicLinkCollection.insertOne({
      userId,
      email,
      code,
      expiresAt: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes
    });
    return code;
  }

  async sendMagicLink({
    userId,
    email,
  }: {
    userId: string;
    email: string;
  }): Promise<void> {
    const code = await this.generateMagicLink({ userId, email });
    const loginUrl = `${this.BASE_URL}/api/login?code=${code}`;

    await this.resend.emails.send({
      from: `ClimbingData <noreply@${this.BASE_URL}>`,
      to: email,
      subject: `Login to ${this.BASE_URL}`,
      html: `
        <p>Click the link below to log in:</p>
        <p><a href="${loginUrl}">${loginUrl}</a></p>
        <p>This link will expire in 15 minutes.</p>
      `,
    });
  }

  async verifyMagicLink({ code }: { code: string }) {
    const res = await this.magicLinkCollection.findOneAndDelete({ code });
    if (!res) {
      throw new HandledError({
        status: 400,
        message: `Invalid code`,
      });
    }

    if (isWithinExpirationDate(res.expiresAt)) {
      return res.userId;
    } else {
      throw new HandledError({
        status: 400,
        message: "link expired",
      });
    }
  }
}

export type MagicLinkDoc = {
  code: string;
  userId: string;
  email: string;
  expiresAt: Date;
};
