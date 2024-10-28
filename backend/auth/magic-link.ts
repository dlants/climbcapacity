import mongodb from "mongodb";
import { generateRandomString, alphabet } from "oslo/crypto";
import { isWithinExpirationDate } from "oslo";
import { HandledError } from "../utils.js";

export class MagicLink {
  private magicLinkCollection: mongodb.Collection<MagicLinkDoc>;

  constructor({ client }: { client: mongodb.MongoClient }) {
    this.magicLinkCollection = client
      .db()
      .collection<MagicLinkDoc>("magicLinks");
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
    // TODO: email code
    console.log(`code: ${code}`)
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
