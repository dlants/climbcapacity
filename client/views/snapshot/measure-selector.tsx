import React from "react";

import type { HydratedSnapshot } from "../../types";
import { Dispatch } from "../../tea";
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
import {
  peakloadClass,
  avgLoadClass,
  rfdClass,
  criticalForceClass,
} from "../../../iso/measures/forcemeter";
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

export type Model = {
  query: string;
  snapshot: HydratedSnapshot;
  measureStats: MeasureStats;
  items: Item[];
};

export class MeasureSelector {
  state: Model;

  constructor(
    {
      snapshot,
      measureStats,
    }: {
      snapshot: HydratedSnapshot;
      measureStats: MeasureStats;
    },
    private context: { myDispatch: Dispatch<Msg> }
  ) {
    this.state = {
      query: "",
      measureStats,
      snapshot: snapshot,
      items: [],
    };

    this.state.items = getItems(this.state);
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "UPDATE_QUERY":
        this.state.query = msg.query;
        this.state.items = getItems(this.state);
        break;
      case "DELETE_MEASURE":
      case "INIT_UPDATE":
        // do nothing since we will cover this in the parent component
        break;
      default:
        assertUnreachable(msg);
    }
  }

  view() {
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

    const MeasureView = ({
      measureStatsCount,
      measure,
    }: {
      measureStatsCount: number;
      measure: MeasureSpec;
    }) => {
      const unitValue = this.state.snapshot.measures[measure.id];
      return (
        <div key={measure.id} className="measure-item">
          <label>
            {measure.name} ({measureStatsCount || 0} snapshots)
          </label>{" "}
          {unitValue ? unitValueToString(unitValue as UnitValue) : "N / A"}{" "}
          <button
            onPointerDown={() => {
              this.context.myDispatch({
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
          {this.state.snapshot.measures[measure.id] ? (
            <button
              onPointerDown={() => {
                this.context.myDispatch({
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
      measureGroup,
    }: {
      measureGroup: MeasureGroup;
    }) => {
      return (
        <div className="measure-class">
          <div>
            <strong>{measureGroup.name}</strong>{" "}
            <button
              onPointerDown={() => {
                this.context.myDispatch({
                  type: "INIT_UPDATE",
                  update: {
                    type: "measureClasses",
                    measureClasses: measureGroup.measureClasses,
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
                measureStatsCount={this.state.measureStats[item.spec.id] || 0}
                measure={item.spec}
              />
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="measure-selector">
        <FilterInput
          value={this.state.query}
          onChange={(e) =>
            this.context.myDispatch({ type: "UPDATE_QUERY", query: e.target.value })
          }
        />
        {this.state.items.map((i) => {
          switch (i.type) {
            case "measure-item":
              return (
                <MeasureView
                  key={i.spec.id}
                  measureStatsCount={this.state.measureStats[i.spec.id]}
                  measure={i.spec}
                />
              );
            case "measure-group":
              return (
                <MeasureGroupView
                  key={i.name}
                  measureGroup={i}
                />
              );
            default:
              assertUnreachable(i);
          }
        })}
      </div>
    );
  }
}

export function getAllItems(): Item[] {
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
    {
      type: "measure-group",
      name: "force meter",
      measureClasses: [peakloadClass, avgLoadClass, rfdClass, criticalForceClass],
      items: MEASURES.filter(
        (s) =>
          s.spec?.className === peakloadClass.className ||
          s.spec?.className === avgLoadClass.className ||
          s.spec?.className === rfdClass.className ||
          s.spec?.className === criticalForceClass.className,
      ).map(mapSpecToItem),
    },
  ];
}
export function getItemsForSnapshot(snapshot: HydratedSnapshot) {
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

export function getItems(model: Omit<Model, "items">): Item[] {
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






