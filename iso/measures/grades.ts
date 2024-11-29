import { IRCRAGrade } from "../grade.js";
import { MeasureClassSpec } from "./index.js";

// Type definitions for parameters
export type SportLocation = "gym" | "outside";
export type BoulderLocation = "gym" | "outside" | "kilter" | "tensionboard1" | "tensionboard2" | "moonboard";
export type Stat = "max" | "top5" | "projectp50" | "projectp90" | "onsitep50" | "onsitep90";

const locationDesc: { [key in BoulderLocation]: string } = {
  "gym": "in a gym",
  "outside": "outdoors",
  "kilter": "Kilter Board",
  "tensionboard1": "Tension Board 1",
  "tensionboard2": "Tension Board 2",
  "moonboard": "Moon Board"
};

const statDesc: { [key in Stat]: string } = {
  "max": "hardest grade you've ever climbed",
  "top5": "minimum of your hardest 5 grades climbed",
  "projectp50": "grade you can project with 50% success rate",
  "projectp90": "grade you can project with 90% success rate",
  "onsitep50": "grade you can onsight with 50% success rate",
  "onsitep90": "grade you can onsight with 90% success rate"
};

export const sportGradeClass: MeasureClassSpec = {
  className: "grade-sport",
  params: [
    {
      name: "location",
      values: ["gym", "outside"] as SportLocation[],
      suffix: "",
    },
    {
      name: "stat",
      values: Object.keys(statDesc) as Stat[],
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
  generateDescription: (params: { location: SportLocation; stat: Stat }) => {
    return `${statDesc[params.stat]} ${locationDesc[params.location]}.`
  }
};

export const boulderGradeClass: MeasureClassSpec = {
  className: "grade-boulder",
  params: [
    {
      name: "location",
      values: Object.keys(locationDesc) as BoulderLocation[],
      suffix: "",
    },
    {
      name: "stat",
      values: Object.keys(statDesc) as Stat[],
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
  generateDescription: (params: { location: BoulderLocation; stat: Stat }) => {
    return `${statDesc[params.stat]} ${locationDesc[params.location]}.`
  }
};
