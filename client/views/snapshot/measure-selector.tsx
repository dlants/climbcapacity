import React from "react";
import * as immer from "immer";
const produce = immer.produce;

import type { HydratedSnapshot } from "../../types";
import { Update, View, Dispatch } from "../../tea";
import { UnitValue, unitValueToString } from "../../../iso/units";
import { MEASURES } from "../../constants";
import { isSubsequence } from "../../util/utils";
import { MeasureStats } from "../../../iso/protocol";
import {
  MeasureClassSpec,
  MeasureId,
  MeasureSpec,
} from "../../../iso/measures";
import { assertUnreachable } from "../../../iso/utils";
import {
  boulderGradeClass,
  sportGradeClass,
} from "../../../iso/measures/grades";
import {
  blockPullClass,
  continuousHangClass,
  maxhangClass,
  minEdgeClass,
  minEdgePullupsClass,
  repeatersClass,
  unilateralMaxhangClass,
} from "../../../iso/measures/fingers";
import {
  enduranceClass,
  isometricClass,
  maxRepsClass,
  unilateralIsometricClass,
  unilateralMaxRepsClass,
  unilateralWeightedClass,
  weightedClass,
} from "../../../iso/measures/movement";
import { powerClass, unilateralPowerClass } from "../../../iso/measures/power";
import { InitOptions } from "./edit-measure-or-class";

type MeasureItem = {
  type: "measure-item";
  spec: MeasureSpec;
};

type MeasureGroup = {
  type: "measure-group";
  name: string;
  measureClasses: MeasureClassSpec[];
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
    ...MEASURES.filter((s) => s.type == "anthro").map(mapSpecToItem),
    {
      type: "measure-group",
      name: "performance",
      measureClasses: [boulderGradeClass, sportGradeClass],
      items: MEASURES.filter((s) => s.type == "performance").map(mapSpecToItem),
    },
    {
      type: "measure-group",
      name: "maxhangs",
      measureClasses: [maxhangClass, unilateralMaxhangClass],
      items: MEASURES.filter(
        (s) =>
          s.spec?.className === maxhangClass.className ||
          s.spec?.className === unilateralMaxhangClass.className,
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      name: "block pulls",
      measureClasses: [blockPullClass],
      items: MEASURES.filter(
        (s) => s.spec?.className === blockPullClass.className,
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      name: "minimum edge",
      measureClasses: [minEdgeClass],
      items: MEASURES.filter(
        (s) => s.spec?.className === minEdgeClass.className,
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      name: "repeaters",
      measureClasses: [repeatersClass],
      items: MEASURES.filter(
        (s) => s.spec?.className === repeatersClass.className,
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      name: "minimum edge pullups",
      measureClasses: [minEdgePullupsClass],
      items: MEASURES.filter(
        (s) => s.spec?.className === minEdgePullupsClass.className,
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      name: "weighted",
      measureClasses: [weightedClass, unilateralWeightedClass],
      items: MEASURES.filter(
        (s) =>
          s.spec?.className === weightedClass.className ||
          s.spec?.className === unilateralWeightedClass.className,
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      name: "max reps",
      measureClasses: [maxRepsClass, unilateralMaxRepsClass],
      items: MEASURES.filter(
        (s) =>
          s.spec?.className === maxRepsClass.className ||
          s.spec?.className === unilateralMaxRepsClass.className,
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      name: "isometric",
      measureClasses: [isometricClass, unilateralIsometricClass],
      items: MEASURES.filter(
        (s) =>
          s.spec?.className === isometricClass.className ||
          s.spec?.className === unilateralIsometricClass.className,
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      name: "power",
      measureClasses: [powerClass, unilateralPowerClass],
      items: MEASURES.filter(
        (s) => s.spec?.className === powerClass.className,
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      name: "continuous hang",
      measureClasses: [continuousHangClass],
      items: MEASURES.filter(
        (s) => s.spec?.className === continuousHangClass.className,
      ).map(mapSpecToItem),
    },
    {
      type: "measure-group",
      name: "endurance",
      measureClasses: [enduranceClass],
      items: MEASURES.filter(
        (s) => s.spec?.className === enduranceClass.className,
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
        const measureClasses = item.measureClasses;
        const types = measureClasses.map((c) => c.className.toLowerCase());
        const matchingChildren = item.items.filter((i) => specMatches(i.spec));

        const isMatch =
          matchingChildren.length ||
          queryTerms.every((term) =>
            types.some((type) => isSubsequence(term, type)),
          );

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
      update: InitOptions;
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
                measureStatsCount={model.measureStats[i.spec.id]}
                dispatch={dispatch}
                measure={i.spec}
              />
            );
          case "measure-group":
            return (
              <MeasureGroupView
                key={i.name}
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
        <strong>{measureGroup.name}</strong>{" "}
        <button
          onPointerDown={() => {
            dispatch({
              type: "INIT_UPDATE",
              update: {
                type: "measureClasses",
                measureClasses: immer.castDraft(measureGroup.measureClasses),
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
            measureStatsCount={model.measureStats[item.spec.id] || 0}
            dispatch={dispatch}
            measure={item.spec}
          />
        ))}
      </div>
    </div>
  );
};
