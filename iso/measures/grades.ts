import { IRCRAGrade } from "../grade.js";
import { MeasureClassSpec } from "./index.js";

export const sportGradeClass: MeasureClassSpec = {
  className: "grade-sport",
  params: [
    {
      name: "location",
      values: ["gym", "outside"],
      suffix: "",
    },
    {
      name: "stat",
      values: [
        "max",
        "top5",
        "projectp50",
        "projectp90",
        "onsitep50",
        "onsitep90",
      ],
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
};

export const boulderGradeClass: MeasureClassSpec = {
  className: "grade-boulder",
  params: [
    {
      name: "location",
      values: [
        "gym",
        "outside",
        "kilter",
        "tensionboard1",
        "tensionboard2",
        "moonboard",
      ],
      suffix: "",
    },
    {
      name: "stat",
      values: [
        "max",
        "top5",
        "projectp50",
        "projectp90",
        "onsitep50",
        "onsitep90",
      ],
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
};
