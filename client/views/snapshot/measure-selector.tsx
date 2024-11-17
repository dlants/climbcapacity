import React from "react";
import * as immer from "immer";
const produce = immer.produce;

import type { HydratedSnapshot } from "../../types";
import { Update, View, Dispatch } from "../../tea";
import { UnitValue, unitValueToString } from "../../../iso/units";
import { MEASURES, MEASURE_MAP } from "../../constants";
import { isSubsequence } from "../../util/utils";
import { MeasureStats } from "../../../iso/protocol";
import { MeasureId, MeasureSpec } from "../../../iso/measures";
import { assertUnreachable } from "../../../iso/utils";
import { MeasureClass } from "./edit-measure-class";

type MeasureItem = {
  type: "measure-item";
  spec: MeasureSpec;
};

type MeasureGroup = {
  type: "measure-group";
  measureClass: MeasureClass;
  items: MeasureItem[];
};

type Item = MeasureItem | MeasureGroup;

export type Model = immer.Immutable<{
  query: string;
  snapshot: HydratedSnapshot;
  measureStats: MeasureStats;
  items: Item[];
}>;

export function initModel({
  snapshot,
  measureStats,
}: {
  snapshot: HydratedSnapshot;
  measureStats: MeasureStats;
}): Model {
  const model: Model = {
    query: "",
    measureStats,
    snapshot: snapshot,
    items: [],
  };
  return produce(model, (draft) => {
    draft.items = getItems(draft);
  });
}

function getAllItems(): Item[] {
  let rest;
  const maxhangMeasures = MEASURES.filter((m) => m.id.startsWith("maxhang:"));
  rest = MEASURES.filter((m) => !m.id.startsWith("maxhang:"));

  const blockPullMeasures = rest.filter((m) => m.id.startsWith("blockpull:"));
  rest = rest.filter((m) => !m.id.startsWith("blockpull:"));

  const minedgeMeasures = rest.filter((m) => m.id.startsWith("min-edge-hang:"));
  rest = rest.filter((m) => !m.id.startsWith("min-edge-hang:"));

  return [
    {
      type: "measure-group",
      measureClass: "maxhang",
      items: maxhangMeasures.map((s) => ({ type: "measure-item", spec: s })),
    },
    {
      type: "measure-group",
      measureClass: "blockpull",
      items: blockPullMeasures.map((s) => ({ type: "measure-item", spec: s })),
    },
    {
      type: "measure-group",
      measureClass: "minedge",
      items: minedgeMeasures.map((s) => ({ type: "measure-item", spec: s })),
    },
    ...rest.map((s) => ({
      type: "measure-item" as const,
      spec: s,
    })),
  ];
}

function getItemsForSnapshot(snapshot: HydratedSnapshot) {
  const allItems = getAllItems();
  const outItems: Item[] = [];
  for (const item of allItems) {
    switch (item.type) {
      case "measure-item":
        outItems.push(item);
        break;
      case "measure-group":
        const matchingChildren = item.items.filter(
          (i) => snapshot.measures[i.spec.id],
        );
        outItems.push({
          ...item,
          items: matchingChildren,
        });

        break;

      default:
        assertUnreachable(item);
    }
  }
  return outItems;
}

function getItems(model: Omit<Model, "items">): Item[] {
  const allItems = getItemsForSnapshot(model.snapshot);
  const outItems: Item[] = [];
  const queryTerms = model.query
    .toLowerCase()
    .split(" ")
    .filter((t) => t.length > 0);

  function specMatches(spec: MeasureSpec) {
    const name = spec.name.toLowerCase();
    const id = spec.id.toLowerCase();
    return queryTerms.every(
      (term) => isSubsequence(term, name) || isSubsequence(term, id),
    );
  }

  for (const item of allItems) {
    switch (item.type) {
      case "measure-item": {
        if (specMatches(item.spec)) {
          outItems.push(item);
        }
        break;
      }

      case "measure-group": {
        const measureClass = item.measureClass;
        const type = measureClass.toLowerCase();
        const matchingChildren = item.items.filter((i) => specMatches(i.spec));

        const isMatch =
          matchingChildren.length ||
          queryTerms.every((term) => isSubsequence(term, type));
        if (isMatch) {
          outItems.push({
            ...item,
            items: matchingChildren,
          });
        }
        break;
      }
      default:
        assertUnreachable(item);
    }
  }

  return outItems;
}

export type Msg =
  | {
      type: "UPDATE_QUERY";
      query: string;
    }
  | {
      type: "INIT_UPDATE";
      update:
        | {
            type: "measure";
            measureId: MeasureId;
          }
        | {
            type: "measureClass";
            measureClass: MeasureClass;
          };
    };

export const update: Update<Msg, Model> = (msg, model) => {
  switch (msg.type) {
    case "UPDATE_QUERY":
      return [
        produce(model, (draft) => {
          draft.query = msg.query;
          draft.items = getItems(draft);
        }),
      ];
    case "INIT_UPDATE":
      // do nothing since we will cover this in the parent component
      return [model];
    default:
      assertUnreachable(msg);
  }
};

const FilterInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <input
    type="text"
    placeholder="Filter measures..."
    value={value}
    onChange={onChange}
  />
);

export const view: View<Msg, Model> = ({ model, dispatch }) => {
  return (
    <div className="measure-selector">
      <FilterInput
        value={model.query}
        onChange={(e) =>
          dispatch({ type: "UPDATE_QUERY", query: e.target.value })
        }
      />
      {model.items.map((i) => {
        switch (i.type) {
          case "measure-item":
            return (
              <MeasureView
                key={i.spec.id}
                model={model}
                measureStatsCount={model.measureStats.stats[i.spec.id]}
                dispatch={dispatch}
                measure={i.spec}
              />
            );
          case "measure-group":
            return (
              <MeasureGroupView
                key={i.measureClass}
                model={model}
                measureGroup={i}
                dispatch={dispatch}
              />
            );
          default:
            assertUnreachable(i);
        }
      })}
    </div>
  );
};

const MeasureView = ({
  model,
  measureStatsCount,
  dispatch,
  measure,
}: {
  model: Model;
  measureStatsCount: number;
  dispatch: Dispatch<Msg>;
  measure: immer.Immutable<MeasureSpec>;
}) => {
  const unitValue = model.snapshot.measures[measure.id];
  return (
    <div key={measure.id} className="measure-item">
      <label>
        {measure.name} ({measureStatsCount} snapshots)
      </label>{" "}
      {unitValue ? unitValueToString(unitValue as UnitValue) : "N / A"}{" "}
      <button
        onClick={() => {
          dispatch({
            type: "INIT_UPDATE",
            update: {
              type: "measure",
              measureId: measure.id,
            },
          });
        }}
      >
        Edit
      </button>
    </div>
  );
};

const MeasureGroupView = ({
  model,
  measureGroup,
  dispatch,
}: {
  model: Model;
  measureGroup: immer.Immutable<MeasureGroup>;
  dispatch: Dispatch<Msg>;
}) => {
  return (
    <div className="measure-class">
      <div>
        <strong>{measureGroup.measureClass}</strong>{" "}
        <button
          onClick={() => {
            dispatch({
              type: "INIT_UPDATE",
              update: {
                type: "measureClass",
                measureClass: measureGroup.measureClass,
              },
            });
          }}
        >
          Add New
        </button>
      </div>

      <div className="measure-class-items" style={{ paddingLeft: "10px" }}>
        {measureGroup.items.map((item) => (
          <MeasureView
            key={item.spec.id}
            model={model}
            measureStatsCount={model.measureStats.stats[item.spec.id]}
            dispatch={dispatch}
            measure={item.spec}
          />
        ))}
      </div>
    </div>
  );
};
