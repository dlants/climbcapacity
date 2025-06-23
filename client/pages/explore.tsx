import React from "react";
import { Dispatch } from "../tea";
import { assertUnreachable } from "../util/utils";
import * as LoadedReportCard from "../views/reportcard/main";
import { MeasureStats } from "../../iso/protocol";
import { InitialFilters } from "../views/edit-query";
import { MEASURES } from "../constants";

export type Model = {
  measureStats: MeasureStats;
  model: LoadedReportCard.Model;
};

export type Msg = {
  type: "LOADED_MSG";
  msg: LoadedReportCard.Msg;
};

export class Explore {
  state: Model;

  constructor(
    initialParams: { measureStats: MeasureStats },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    const initialFilters: InitialFilters = {};
    for (const measure of MEASURES.filter((s) => s.type == "anthro")) {
      const count = initialParams.measureStats[measure.id] || 0;
      if (count < 100) {
        continue;
      }
      initialFilters[measure.id] = measure.initialFilter;
    }

    const [loadedModel, loadedThunk] = LoadedReportCard.initModel({
      initialFilters,
      measureStats: initialParams.measureStats,
      mySnapshot: undefined,
    });

    this.state = {
      measureStats: initialParams.measureStats,
      model: loadedModel,
    };

    if (loadedThunk) {
      (async () => {
        await loadedThunk((msg) => this.context.myDispatch({ type: "LOADED_MSG", msg }));
      })().catch(console.error);
    }
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "LOADED_MSG": {
        const [nextModel, thunk] = LoadedReportCard.update(msg.msg, this.state.model);
        this.state.model = nextModel;

        if (thunk) {
          (async () => {
            await thunk((msg) => this.context.myDispatch({ type: "LOADED_MSG", msg }));
          })().catch(console.error);
        }
        break;
      }

      default:
        assertUnreachable(msg.type);
    }
  }

  view() {
    return (
      <LoadedReportCard.view
        model={this.state.model}
        dispatch={(msg) => this.context.myDispatch({ type: "LOADED_MSG", msg })}
      />
    );
  }
}
