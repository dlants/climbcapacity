import {
  Grip,
  GRIPS,
  synthesizeBlockPullMeasure,
  synthesizeMaxHangMeasure,
  synthesizeMinEdgeMeasure,
} from "./measures/fingers.js";
import {
  BOULDER_LOCATION,
  SPORT_LOCATION,
  STAT,
  synthesizeGradeMeasure,
} from "./measures/grades.js";
import { MeasureId, MeasureSpec } from "./units.js";

export const MEASURES: MeasureSpec[] = [
  {
    id: "height" as MeasureId,
    name: "height",
    description: "Your height",
    units: ["m", "cm", "inches"],
  },
  {
    id: "weight" as MeasureId,
    name: "weight",
    description: "Your weight",
    units: ["kg", "lb"],
  },
  {
    id: "armspan" as MeasureId,
    name: "Arm Span",
    description: `Your arm span.`,
    units: ["m", "cm", "inches"],
  },
  {
    id: "sex-at-birth" as MeasureId,
    name: "Sex assigned at birth",
    description: "The sex that was assigned to you at birth",
    units: ["sex-at-birth"],
  },
  {
    id: "years-climbing" as MeasureId,
    name: "How long have you been climbing?",
    description: `Count time during which you've been going at least once a week.

For example, if you climbed for a year, then took a year off, then climbed for another half a year, you'd report 1.5
`,
    units: ["year"],
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
    units: ["year"],
  },
  {
    id: "max-pullup-reps" as MeasureId,
    name: "How many bodyweight pullups can you do?",
    description: `Avoid kipping. A successful rep means your chin reaches above the bar.`,
    units: ["count"],
  },
  {
    id: "2-rep-max-weighted-pull" as MeasureId,
    name: "2 Rep Max Weighted Pullup",
    description: `Avoid kipping. A successful rep means your chin reaches above the bar.

Record total weight. For example, if you weigh 70kg and had to remove 10kg, record 60kg. If you weigh 70kg and added 10kg, record 80kg`,
    units: ["kg", "lb"],
  },
  {
    id: "5-rep-max-weighted-pull" as MeasureId,
    name: "5 Rep Max Pullup added weight",
    description: `Avoid kipping. A successful rep means your chin reaches above the bar.

Record total weight. For example, if you weigh 70kg and had to remove 10kg, record 60kg. If you weigh 70kg and added 10kg, record 80kg`,
    units: ["kg", "lb"],
  },
  {
    id: "max-pushup-reps" as MeasureId,
    name: "How many bodyweight pushups can you do?",
    description: `Keep your glutes engaged so your hips don't sag. A successful rep means your chest reaches within a fist of the floor. At the top, elbows should be fully extended.`,
    units: ["count"],
  },
  {
    id: "max-l-sit" as MeasureId,
    name: "How long can you hold an L sit?",
    description: `Hang from a bar with straight hands. Raise your straight legs to approximately 90 degrees and hold.`,
    units: ["second"],
  },
];

for (const edgeSize of [18, 20]) {
  for (const duration of [7, 10]) {
    for (const gripType of GRIPS) {
      MEASURES.push(
        synthesizeMaxHangMeasure({
          type: "maxhang",
          edgeSize,
          duration,
          gripType,
        }),
      );
    }
  }
}

for (const edgeSize of [18, 20]) {
  for (const duration of [7, 10]) {
    for (const gripType of GRIPS) {
      MEASURES.push(
        synthesizeBlockPullMeasure({
          type: "blockpull",
          edgeSize,
          duration,
          gripType,
        }),
      );
    }
  }
}

for (const duration of [7, 10]) {
  for (const gripType of GRIPS) {
    MEASURES.push(
      synthesizeMinEdgeMeasure({ type: "min-edge", duration, gripType }),
    );
  }
}

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

function edgePullups({
  edgeSize,
  gripType,
}: {
  edgeSize: number;
  gripType: Grip;
}): MeasureSpec {
  return {
    id: `max-pullups-${edgeSize}mm-edge-${gripType}` as MeasureId,
    name: `Max pullups on a ${edgeSize}mm edge using ${gripType} grip type`,
    description: `On a ${edgeSize}mm edge, using a ${gripType} grip, do as many pullups as you can.

If you need to reset your grip at the bottom that's ok, but you must control the descent. Avoid "jumping off" at the end of the pullup.`,
    units: ["count"],
  };
}

for (const edgeSize of [5, 6, 7, 8, 9, 10, 14, 18, 20] as const) {
  for (const gripType of GRIPS) {
    MEASURES.push(edgePullups({ edgeSize, gripType }));
  }
}

export const MEASURE_MAP: {
  [measureId: MeasureId]: MeasureSpec;
} = {};

for (const measure of MEASURES) {
  MEASURE_MAP[measure.id] = measure;
}
