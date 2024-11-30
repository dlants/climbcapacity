import { IRCRAGrade } from "../grade.js";
import {
  BOULDER_LOCATION,
  MeasureClassSpec,
  ParamValue,
  SPORT_LOCATION,
  STAT,
} from "./index.js";

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
  units: ["ircra", "yds", "frenchsport", "ewbank"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "ircra", value: 1 as IRCRAGrade },
    maxValue: { unit: "ircra", value: 33 as IRCRAGrade },
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
  units: ["ircra", "vermin", "font"],
  initialFilter: {
    type: "minmax",
    minValue: { unit: "ircra", value: 1 as IRCRAGrade },
    maxValue: { unit: "ircra", value: 33 as IRCRAGrade },
  },
  generateDescription: (params: {
    boulderLocation: BoulderLocation;
    stat: Stat;
  }) => {
    return `${statDesc[params.stat]} ${locationDesc[params.boulderLocation]}.`;
  },
};
