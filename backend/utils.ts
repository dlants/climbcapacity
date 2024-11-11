import express from "express";
import assert from "assert";
import { addSyntheticTrailingComment } from "typescript";

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

export function asyncRoute(
  fn: (
    req: express.Request,
    res: express.Response,
  ) => Promise<express.Response>,
): express.Handler {
  const handler: express.Handler = async (req, res) => {
    try {
      await fn(req, res);
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

export function apiRoute<T>(
  fn: (req: express.Request, res: express.Response) => Promise<T>,
): express.Handler {
  return asyncRoute(async (req, res) => {
    const val = await fn(req, res);
    res.json(val);
    return res;
  });
}
