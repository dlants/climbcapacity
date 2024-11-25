import React from "react";
import * as immer from "immer";
const produce = immer.produce;

import type { HydratedSnapshot } from "../../types";
import { Update, View, Dispatch } from "../../tea";
import { UnitValue, unitValueToString } from "../../../iso/units";
import { MEASURES, MEASURE_MAP } from "../../constants";
import { isSubsequence } from "../../util/utils";
import { MeasureStats } from "../../../iso/protocol";
import { MeasureClass, MeasureId, MeasureSpec } from "../../../iso/measures";
import { assertUnreachable } from "../../../iso/utils";

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
  const mapSpecToItem = (s: MeasureSpec) => ({
    type: "measure-item" as const,
    spec: s,
  });

  return [
    ...MEASURES.filter((s) => s.type.type == "anthro").map(mapSpecToItem),
    {
      type: "measure-group",
      measureClass: "performance",
      items: MEASURES.filter((s) => s.type.type == "performance").map(
        mapSpecToItem,
      ),
    },
    {
      type: "measure-group",
      measureClass: "maxhang",
      items: MEASURES.filter(
        (s) => s.type.type === "input" && s.type.measureClass === "maxhang",
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      measureClass: "blockpull",
      items: MEASURES.filter(
        (s) => s.type.type === "input" && s.type.measureClass === "blockpull",
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      measureClass: "minedge",
      items: MEASURES.filter(
        (s) => s.type.type === "input" && s.type.measureClass === "minedge",
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      measureClass: "repeaters",
      items: MEASURES.filter(
        (s) => s.type.type === "input" && s.type.measureClass === "repeaters",
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      measureClass: "edgepullups",
      items: MEASURES.filter(
        (s) => s.type.type === "input" && s.type.measureClass === "edgepullups",
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      measureClass: "weightedmovement",
      items: MEASURES.filter(
        (s) =>
          s.type.type === "input" && s.type.measureClass === "weightedmovement",
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      measureClass: "maxrepsmovement",
      items: MEASURES.filter(
        (s) =>
          s.type.type === "input" && s.type.measureClass === "maxrepsmovement",
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      measureClass: "isometrichold",
      items: MEASURES.filter(
        (s) =>
          s.type.type === "input" && s.type.measureClass === "isometrichold",
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      measureClass: "powermovement",
      items: MEASURES.filter(
        (s) =>
          s.type.type === "input" && s.type.measureClass === "powermovement",
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      measureClass: "continuoushang",
      items: MEASURES.filter(
        (s) =>
          s.type.type === "input" && s.type.measureClass === "continuoushang",
      ).map(mapSpecToItem),
    },
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
    }
  | {
      type: "DELETE_MEASURE";
      measureId: MeasureId;
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
    case "DELETE_MEASURE":
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
        {measure.name} ({measureStatsCount || 0} snapshots)
      </label>{" "}
      {unitValue ? unitValueToString(unitValue as UnitValue) : "N / A"}{" "}
      <button
        onPointerDown={() => {
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
      {model.snapshot.measures[measure.id] ? (
        <button
          onPointerDown={() => {
            dispatch({
              type: "DELETE_MEASURE",
              measureId: measure.id,
            });
          }}
        >
          Delete
        </button>
      ) : undefined}
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
          onPointerDown={() => {
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
            measureStatsCount={model.measureStats.stats[item.spec.id] || 0}
            dispatch={dispatch}
            measure={item.spec}
          />
        ))}
      </div>
    </div>
  );
};
