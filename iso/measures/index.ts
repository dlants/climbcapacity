import {
  Grip,
  GRIPS,
  synthesizeBlockPullMeasure,
  synthesizeDurationMeasure,
  synthesizeMaxHangMeasure,
  synthesizeMinEdgeMeasure,
} from "./fingers.js";
import {
  BOULDER_LOCATION,
  SPORT_LOCATION,
  STAT as GRADE_STAT,
  synthesizeGradeMeasure,
} from "./grades.js";
import {
  DOMINANT_SIDE,
  MAX_DURATION_MOVEMENT,
  MAX_REP_MOVEMENT,
  MAX_REP_UNITLATERAL_MOVEMENT,
  synthesizeMaxDurationMeasure,
  synthesizeMaxRepMeasure,
  synthesizeUnilateralMaxDurationMeasure,
  synthesizeUnilateralMaxrepMeasure,
  synthesizeWeightedMovementMeasure,
  synthesizeWeightedUnilateralMovementMeasure,
  UNILATERAL_MAX_DURATION_MOVEMENT,
  WEIGHTED_MOVEMENT,
  STAT as WEIGHTED_MOVEMENT_STAT,
  WEIGHTED_UNILATERAL_MOVEMENT,
} from "./movement.js";
import { MeasureId, MeasureSpec } from "../units.js";
import {
  DISTANCE_MOVEMENT,
  synthesizeDistanceMeasure,
  synthesizeUnilateralDistanceMeasure,
  UNILATERAL_DISTANCE_MOVEMENT,
} from "./distance.js";

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
];

for (const movement of DISTANCE_MOVEMENT) {
  MEASURES.push(
    synthesizeDistanceMeasure({
      movement,
    }),
  );
}

for (const movement of UNILATERAL_DISTANCE_MOVEMENT) {
  for (const dominantSide of DOMINANT_SIDE) {
    MEASURES.push(
      synthesizeUnilateralDistanceMeasure({
        movement,
        dominantSide,
      }),
    );
  }
}

for (const movement of WEIGHTED_MOVEMENT) {
  for (const stat of WEIGHTED_MOVEMENT_STAT) {
    MEASURES.push(
      synthesizeWeightedMovementMeasure({
        type: "weighted",
        movement,
        stat,
      }),
    );
  }
}

for (const movement of WEIGHTED_UNILATERAL_MOVEMENT) {
  for (const stat of WEIGHTED_MOVEMENT_STAT) {
    for (const dominantSide of DOMINANT_SIDE) {
      MEASURES.push(
        synthesizeWeightedUnilateralMovementMeasure({
          movement,
          stat,
          dominantSide,
        }),
      );
    }
  }
}

for (const movement of MAX_REP_MOVEMENT) {
  MEASURES.push(
    synthesizeMaxRepMeasure({
      movement,
    }),
  );
}

for (const movement of MAX_REP_UNITLATERAL_MOVEMENT) {
  for (const dominantSide of DOMINANT_SIDE) {
    MEASURES.push(
      synthesizeUnilateralMaxrepMeasure({
        movement,
        dominantSide,
      }),
    );
  }
}

for (const movement of MAX_DURATION_MOVEMENT) {
  MEASURES.push(
    synthesizeMaxDurationMeasure({
      movement,
    }),
  );
}

for (const movement of UNILATERAL_MAX_DURATION_MOVEMENT) {
  for (const dominantSide of DOMINANT_SIDE) {
    MEASURES.push(
      synthesizeUnilateralMaxDurationMeasure({ movement, dominantSide }),
    );
  }
}

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
  for (const gripType of GRIPS) {
    MEASURES.push(
      synthesizeDurationMeasure({
        movement: "7-3repeaters",
        edgeSize,
        gripType,
      }),
    );
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

for (const stat of GRADE_STAT) {
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

for (const stat of GRADE_STAT) {
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
    id: `max-pullups:${edgeSize}:${gripType}` as MeasureId,
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

export const INPUT_MEASURES: MeasureSpec[] = MEASURES.filter((m) =>
  ["height", "weight", "sex-at-birth", "armspan", "vertical-reach"].some(
    (idPrefix) => m.id.startsWith(idPrefix),
  ),
);

export const OUTPUT_MEASURES: MeasureSpec[] = MEASURES.filter((m) =>
  ["grade:"].some(
    (idPrefix) => m.id.startsWith(idPrefix),
  ),
);
