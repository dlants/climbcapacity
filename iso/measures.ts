import { MeasureId, MeasureSpec, Grip, GRIPS_ARR } from "./units.js";

export const MEASURES: MeasureSpec[] = [
  {
    id: "height" as MeasureId,
    name: "height",
    description: "Your height",
    defaultUnit: "m",
  },
  {
    id: "weight" as MeasureId,
    name: "weight",
    description: "Your weight",
    defaultUnit: "kg",
  },
  {
    id: "armspan" as MeasureId,
    name: "Arm Span",
    description: `Your arm span.`,
    defaultUnit: "m",
  },
  {
    id: "sex-at-birth" as MeasureId,
    name: "Sex assigned at birth",
    description: "The sex that was assigned to you at birth",
    defaultUnit: "sex-at-birth",
  },
  {
    id: "years-climbing" as MeasureId,
    name: "How long have you been climbing?",
    description: `Count time during which you've been going at least once a week.

For example, if you climbed for a year, then took a year off, then climbed for another half a year, you'd report 1.5
`,
    defaultUnit: "year",
  },
  {
    id: "years-training" as MeasureId,
    name: "How long have you been training?",
    description: `Count time during which you've been engaging in consistent deliberate practice at least once a week.

Examples that count as deliberate practice:
 - hangboarding as part of your warmup
 - doing supplemental stretching or strength training exercise
 - choosing one day a week to work on climbs of a specific style or difficulty level
`,
    defaultUnit: "year",
  },
  {
    id: "max-pullup-reps" as MeasureId,
    name: "How many bodyweight pullups can you do?",
    description: `Avoid kipping. A successful rep means your chin reaches above the bar.`,
    defaultUnit: "count",
  },
  {
    id: "2-rep-max-weighted-pull" as MeasureId,
    name: "2 Rep Max Weighted Pullup",
    description: `Avoid kipping. A successful rep means your chin reaches above the bar.

Record total weight. For example, if you weigh 70kg and had to remove 10kg, record 60kg. If you weigh 70kg and added 10kg, record 80kg`,
    defaultUnit: "kg",
  },
  {
    id: "5-rep-max-weighted-pull" as MeasureId,
    name: "5 Rep Max Pullup added weight",
    description: `Avoid kipping. A successful rep means your chin reaches above the bar.

Record total weight. For example, if you weigh 70kg and had to remove 10kg, record 60kg. If you weigh 70kg and added 10kg, record 80kg`,
    defaultUnit: "kg",
  },
  {
    id: "max-pushup-reps" as MeasureId,
    name: "How many bodyweight pushups can you do?",
    description: `Keep your glutes engaged so your hips don't sag. A successful rep means your chest reaches within a fist of the floor. At the top, elbows should be fully extended.`,
    defaultUnit: "count",
  },
  {
    id: "max-l-sit" as MeasureId,
    name: "How long can you hold an L sit?",
    description: `Hang from a bar with straight hands. Raise your straight legs to approximately 90 degrees and hold.`,
    defaultUnit: "second",
  },
];

function maxHangMeasure({
  edgeSize,
  duration,
  gripType,
}: {
  edgeSize: number;
  duration: number;
  gripType: Grip;
}): MeasureSpec {
  return {
    id: `maxhang-${edgeSize}mm-${duration}s-${gripType}` as MeasureId,
    name: `MaxHang: ${edgeSize}mm, ${duration}s, ${gripType} grip`,
    description: `\
Warm up thoroughly.

Find a ${edgeSize}mm edge. Using a ${gripType} grip, hang for ${duration}s. If the hang is successful, increase weight and try again after at least a 5m rest.

If you cannot hang your bodyweight, use a pulley system to remove weight.

Record the maximum successful hang weight, including your bodyweight.

So for example, if you weigh 70kg, and you removed 20kg, you would record 50kg.
If you weigh 70kg, and you added 30kg, you'd record 100kg.
`,
    defaultUnit: "kg",
  };
}

for (const edgeSize of [18, 20]) {
  for (const duration of [7, 10]) {
    for (const gripType of GRIPS_ARR) {
      MEASURES.push(maxHangMeasure({ edgeSize, duration, gripType }));
    }
  }
}

function minEdgeHangMeasure({
  duration,
  gripType,
}: {
  duration: number;
  gripType: Grip;
}): MeasureSpec {
  return {
    id: `min-edge-hang-${duration}s-${gripType}` as MeasureId,
    name: `Min Edge Hang: ${duration}s, ${gripType} grip`,
    description: `\
Warm up thoroughly.

Find the smallest edge you can hang your bodyweight for ${duration}s using a ${gripType}.
`,
    defaultUnit: "mm",
  };
}

for (const duration of [7, 10]) {
  for (const gripType of GRIPS_ARR) {
    MEASURES.push(minEdgeHangMeasure({ duration, gripType }));
  }
}

function climbMeasure({
  sportOrBoulder,
  gymOrOutside,
  stat,
}: {
  sportOrBoulder: "sport" | "boulder";
  gymOrOutside:
    | "gym"
    | "outside"
    | "kilter"
    | "tensionboard1"
    | "tensionboard2"
    | "moonboard";
  stat: "max" | "top5" | "p50" | "p90";
}): MeasureSpec {
  return {
    id: `grade-${sportOrBoulder}-${gymOrOutside}-${stat}` as MeasureId,
    name: `${stat} ${sportOrBoulder} grade, ${gymOrOutside}`,
    description: (() => {
      switch (stat) {
        case "max":
          return `What's the absolute highest grade that you've climbed?
Record the grade even if you've only ever climbed it once.`;
        case "top5":
          return `What's the lowest grade of your 5 hardest completed climbs?
For example, if you've only ever done one V5, 2V4s and 2V3s, this would be V3`;
        case "p50":
          return `What's the hardest grade that you have at least a 50% chance of completing?`;
        case "p90":
          return `What's the hardest grade that you have at least a 90% chance of completing?`;
        default:
          stat satisfies never;
          throw new Error(`Unexpected stat ${stat}`);
      }
    })(),
    defaultUnit: sportOrBoulder == "sport" ? "yds" : "vermin",
  };
}

for (const stat of ["max", "top5", "p50", "p90"] as const) {
  for (const gymOrOutside of ["gym", "outside"] as const) {
    MEASURES.push(
      climbMeasure({ sportOrBoulder: "sport", gymOrOutside, stat }),
    );
  }
}

for (const stat of ["max", "top5", "p50", "p90"] as const) {
  for (const gymOrOutside of [
    "gym",
    "outside",
    "kilter",
    "tensionboard1",
    "tensionboard2",
    "moonboard",
  ] as const) {
    MEASURES.push(
      climbMeasure({ sportOrBoulder: "boulder", gymOrOutside, stat }),
    );
  }
}

function edgePullups({
  edgeSize,
  gripType,
}: {
  edgeSize: number;
  gripType: Grip;
}): MeasureSpec {
  return {
    id: `max-pullups-${edgeSize}-mm-edge-${gripType}` as MeasureId,
    name: `Max pullups on a ${edgeSize}mm edge using ${gripType} grip type`,
    description: `On a ${edgeSize}mm edge, using a ${gripType} grip, do as many pullups as you can.`,
    defaultUnit: "count",
  };
}

for (const edgeSize of [5, 6, 7, 8, 9, 10, 14, 18, 20] as const) {
  for (const gripType of GRIPS_ARR) {
    MEASURES.push(edgePullups({ edgeSize, gripType }));
  }
}

export const MEASURE_MAP: {
  [measureId: MeasureId]: MeasureSpec;
} = {};

for (const measure of MEASURES) {
  MEASURE_MAP[measure.id] = measure;
}
