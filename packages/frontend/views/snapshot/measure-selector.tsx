import * as DCGView from "dcgview";

import type { HydratedSnapshot } from "../../types";
import { Dispatch } from "../../types";
import { UnitValue, unitValueToString } from "../../../iso/units";
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
import { MEASURES } from '../../../iso/measures'

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

export class MeasureSelectorController {
  state: Model;

  constructor(
    { snapshot, measureStats }: {
      snapshot: HydratedSnapshot,
      measureStats: MeasureStats,
    },
    public context: {
      myDispatch: Dispatch<Msg>
    }
  ) {
    this.state = {
      query: "",
      measureStats,
      snapshot,
      items: [],
    };

    this.state.items = getItems(this.state);
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "UPDATE_QUERY":
        this.state.query = msg.query;
        this.state.items = getItems(this.state);
        break;
      case "DELETE_MEASURE":
      case "INIT_UPDATE":
        this.context.myDispatch(msg);
        break;
      default:
        assertUnreachable(msg);
    }
  }
}


export class MeasureSelectorView extends DCGView.View<{
  controller: MeasureSelectorController;
}> {
  template() {
    const { For } = DCGView.Components;
    const stateProp = () => this.props.controller().state;

    return (
      <div class="measure-selector">
        <input
          type="text"
          placeholder="Filter measures..."
          value={() => stateProp().query}
          onChange={(e) =>
            this.props.controller().handleDispatch({
              type: "UPDATE_QUERY",
              query: (e.target as HTMLInputElement).value
            })
          }
        />
        <For each={() => stateProp().items} key={(item, idx) => item.type + '_' + idx}>
          {(item) =>
            DCGView.Components.SwitchUnion(() => item().type, {
              "measure-item": () => this.renderMeasureItem(item() as MeasureItem, stateProp),
              "measure-group": () => this.renderMeasureGroup(item() as MeasureGroup, stateProp)
            })
          }
        </For>
      </div>
    );
  }

  private renderMeasureItem(item: MeasureItem, stateProp: () => Model) {
    const measureStatsCount = stateProp().measureStats[item.spec.id] || 0;
    const unitValue = stateProp().snapshot.measures[item.spec.id];

    return (
      <div class="measure-item">
        <label>
          {item.spec.name} ({measureStatsCount} snapshots)
        </label>{" "}
        {unitValue ? unitValueToString(unitValue as UnitValue) : "N / A"}{" "}
        <button
          onPointerDown={() => {
            this.props.controller().handleDispatch({
              type: "INIT_UPDATE",
              update: {
                type: "measure",
                measureId: item.spec.id,
              },
            });
          }}
        >
          Edit
        </button>
        {unitValue ? (
          <button
            onPointerDown={() => {
              this.props.controller().handleDispatch({
                type: "DELETE_MEASURE",
                measureId: item.spec.id,
              });
            }}
          >
            Delete
          </button>
        ) : undefined}
      </div>
    );
  }

  private renderMeasureGroup(item: MeasureGroup, stateProp: () => Model) {
    const { For } = DCGView.Components;

    return (
      <div class="measure-class">
        <div>
          <strong>{item.name}</strong>{" "}
          <button
            onPointerDown={() => {
              this.props.controller().handleDispatch({
                type: "INIT_UPDATE",
                update: {
                  type: "measureClasses",
                  measureClasses: item.measureClasses,
                },
              });
            }}
          >
            Add New
          </button>
        </div>

        <div class="measure-class-items" style={DCGView.const({ "padding-left": "10px" })}>
          <For each={() => item.items} key={(item) => item.spec.id}>
            {(measureItem) => {
              const measureStatsCount = stateProp().measureStats[measureItem().spec.id] || 0;
              const unitValue = stateProp().snapshot.measures[measureItem().spec.id];

              return (
                <div class="measure-item">
                  <label>
                    {measureItem().spec.name} ({measureStatsCount} snapshots)
                  </label>{" "}
                  {unitValue ? unitValueToString(unitValue as UnitValue) : "N / A"}{" "}
                  <button
                    onPointerDown={() => {
                      this.props.controller().handleDispatch({
                        type: "INIT_UPDATE",
                        update: {
                          type: "measure",
                          measureId: measureItem().spec.id,
                        },
                      });
                    }}
                  >
                    Edit
                  </button>
                  {unitValue ? (
                    <button
                      onPointerDown={() => {
                        this.props.controller().handleDispatch({
                          type: "DELETE_MEASURE",
                          measureId: measureItem().spec.id,
                        });
                      }}
                    >
                      Delete
                    </button>
                  ) : undefined}
                </div>
              );
            }}
          </For>
        </div>
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
      case "measure-group": {
        const matchingChildren = item.items.filter(
          (i) => snapshot.measures[i.spec.id],
        );
        outItems.push({
          ...item,
          items: matchingChildren,
        });

        break;
      }

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
