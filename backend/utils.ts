import express from "express";
import assert from "assert";

export function assertEnv(varName: string) {
  const value = process.env[varName];
  if (value == undefined) {
    throw new Error(`Expected env var ${varName} to be defined.`);
  }

  return value;
}

export class HandledError extends Error {
  status: number;
  constructor(opts: { status: number; message: string }) {
    super(opts.message);
    this.status = opts.status;
  }
}

export function apiRoute<T>(
  fn: (req: express.Request, res: express.Response) => Promise<T>,
): express.Handler {
  const handler: express.Handler = async (req, res) => {
    try {
      const response = await fn(req, res);
      res.json(response);
    } catch (e) {
      console.error(e);
      if (e instanceof HandledError) {
        res.status(e.status).send(e.message);
        return;
      }

      if (e instanceof assert.AssertionError) {
        res.status(400).send(e.message);
        return;
      }

      res.status(500).send((e as Error).message || "Unexpected error");
    }
  };

  return handler;
}
