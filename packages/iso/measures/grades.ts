import { MeasureClassSpec } from "./index.js";
import {
  ParamValue,
  BOULDER_LOCATION,
  SPORT_LOCATION,
  STAT,
} from "./params.js";

type BoulderLocation = ParamValue<"boulderLocation">;
type SportLocation = ParamValue<"sportLocation">;
type Stat = ParamValue<"stat">;

const locationDesc: { [key in BoulderLocation]: string } = {
  gym: "in a gym",
  outside: "outdoors",
  kilter: "Kilter Board",
  tensionboard1: "Tension Board 1",
  tensionboard2: "Tension Board 2",
  moonboard: "Moon Board",
};

const statDesc: { [key in Stat]: string } = {
  max: "hardest grade you've ever climbed",
  top5: "minimum of your hardest 5 grades climbed",
  projectp50: "grade you can project with 50% success rate",
  projectp90: "grade you can project with 90% success rate",
  onsitep50: "grade you can onsight with 50% success rate",
  onsitep90: "grade you can onsight with 90% success rate",
};

export const sportGradeClass: MeasureClassSpec = {
  className: "grade-sport",
  params: [
    {
      name: "sportLocation",
      values: SPORT_LOCATION,
      suffix: "",
    },
    {
      name: "stat",
      values: STAT,
      suffix: "",
    },
  ],
  measureType: "performance",
  units: ["yds", "ircra", "frenchsport", "ewbank"],
  initialFilter: {
    type: "minmax",
    localeRanges: {
      US: {
        minValue: { unit: "yds", value: "5.6" },
        maxValue: { unit: "yds", value: "5.15a" },
      },
      UK: {
        minValue: { unit: "frenchsport", value: "5" },
        maxValue: { unit: "frenchsport", value: "9a+" },
      },
      Europe: {
        minValue: { unit: "frenchsport", value: "5" },
        maxValue: { unit: "frenchsport", value: "9a+" },
      },
      Australia: {
        minValue: { unit: "ewbank", value: 12 },
        maxValue: { unit: "ewbank", value: 36 },
      },
    },
  },
  generateDescription: (params: {
    sportLocation: SportLocation;
    stat: Stat;
  }) => {
    return `${statDesc[params.stat]} ${locationDesc[params.sportLocation]}.`;
  },
};

export const boulderGradeClass: MeasureClassSpec = {
  className: "grade-boulder",
  params: [
    {
      name: "boulderLocation",
      values: BOULDER_LOCATION,
      suffix: "",
    },
    {
      name: "stat",
      values: STAT,
      suffix: "",
    },
  ],
  measureType: "performance",
  units: ["vermin", "ircra", "font"],
  initialFilter: {
    type: "minmax",
    localeRanges: {
      US: {
        minValue: { unit: "vermin", value: 0 },
        maxValue: { unit: "vermin", value: 8 },
      },
      UK: {
        minValue: { unit: "font", value: "3" },
        maxValue: { unit: "font", value: "8C+" },
      },
      Europe: {
        minValue: { unit: "font", value: "3" },
        maxValue: { unit: "font", value: "8C+" },
      },
      Australia: {
        minValue: { unit: "vermin", value: 0 },
        maxValue: { unit: "vermin", value: 8 },
      },
    },
  },
  generateDescription: (params: {
    boulderLocation: BoulderLocation;
    stat: Stat;
  }) => {
    return `${statDesc[params.stat]} ${locationDesc[params.boulderLocation]}.`;
  },
};
