import React from "react";
import type { Snapshot } from "../types";
import { Update, Thunk, View, Dispatch } from "../tea";

export type Model = {
  userId: string;
  snapshot: Snapshot;
};

export type Msg = never;

export const update: Update<Msg, Model> = (msg, model) => {
  return [model];
};

export const view: View<Msg, Model> = (model, dispatch) => {
  return (
    <div className="snapshot-view">
      <pre>{JSON.stringify(model.snapshot, null, 2)}</pre>
    </div>
  );
};
