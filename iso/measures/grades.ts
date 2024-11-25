import { IRCRAGrade } from "../grade.js";
import { MeasureId, MeasureSpec } from "./index.js";

export const BOULDER_LOCATION = [
  "gym",
  "outside",
  "kilter",
  "tensionboard1",
  "tensionboard2",
  "moonboard",
] as const;

export type BoulderLocation = (typeof BOULDER_LOCATION)[number];

export const SPORT_LOCATION = ["gym", "outside"];
export type SportLocation = (typeof SPORT_LOCATION)[number];

export const STAT = [
  "max",
  "top5",
  "projectp50",
  "projectp90",
  "onsitep50",
  "onsitep90",
] as const;
export type Stat = (typeof STAT)[number];

export type Context =
  | {
      type: "sport";
      location: SportLocation;
    }
  | {
      type: "boulder";
      location: BoulderLocation;
    };

export type GradeMeasureType = {
  type: "grade";
  context: Context;
  stat: Stat;
};

export function generateGradeMeasureId({
  context,
  stat,
}: {
  context: Context;
  stat: Stat;
}): MeasureId {
  return `grade:${context.type}:${context.location}:${stat}` as MeasureId;
}

export function parseGradeMeasureId(id: MeasureId): {
  context: Context;
  stat: Stat;
} {
  const [_, type, location, stat] = id.split(":");

  if (type === "sport" && SPORT_LOCATION.includes(location as SportLocation)) {
    const context: Context = { type, location: location as SportLocation };
    return { context, stat: stat as Stat };
  } else if (
    type === "boulder" &&
    BOULDER_LOCATION.includes(location as BoulderLocation)
  ) {
    const context: Context = { type, location: location as BoulderLocation };
    return { context, stat: stat as Stat };
  }

  throw new Error(`Invalid MeasureId: ${id}`);
}

export function synthesizeGradeMeasure(
  measureType: GradeMeasureType,
): MeasureSpec {
  const { context, stat } = measureType;

  const measureId = generateGradeMeasureId({ context, stat });

  return {
    id: measureId,
    includeTrainingMeasure: false,
    name: `${stat} ${context.type} grade, ${context.location}`,
    description: (() => {
      switch (stat) {
        case "max":
          return `What's the absolute highest grade that you've climbed?
Record the grade even if you've only ever climbed it once.`;
        case "top5":
          return `What's the lowest grade of your 5 hardest completed climbs?
For example, if you've only ever done one V5, 2V4s and 2V3s, this would be V3`;
        case "projectp50":
          return `What's the hardest grade that you have at least a 50% chance of completing?`;
        case "projectp90":
          return `What's the hardest grade that you have at least a 90% chance of completing?`;
        case "onsitep50":
          return `What's the hardest grade that you have at least a 50% chance of doing on your first attempt?`;
        case "onsitep90":
          return `What's the hardest grade that you have at least a 90% chance of doing on your first attempt?`;
        default:
          stat satisfies never;
          throw new Error(`Unexpected stat ${stat}`);
      }
    })(),
    units:
      context.type == "sport"
        ? ["ircra", "yds", "frenchsport", "ewbank"]
        : ["ircra", "vermin", "font"],
    initialFilter: {
      type: "minmax",
      minValue: { unit: "ircra", value: 1 as IRCRAGrade },
      maxValue: { unit: "ircra", value: 33 as IRCRAGrade },
    },
  };
}

export const MEASURES: MeasureSpec[] = [];

for (const stat of STAT) {
  for (const location of SPORT_LOCATION) {
    MEASURES.push(
      synthesizeGradeMeasure({
        type: "grade",
        context: { type: "sport", location },
        stat,
      }),
    );
  }
}

for (const stat of STAT) {
  for (const location of BOULDER_LOCATION) {
    MEASURES.push(
      synthesizeGradeMeasure({
        type: "grade",
        context: { type: "boulder", location },
        stat,
      }),
    );
  }
}
