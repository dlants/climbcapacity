import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SnapshotDoc } from "../backend/models/snapshots.js";
import { encodeMeasureValue, UnitValue } from "../iso/units.js";
import { VGrade, YDS } from "../iso/grade.js";
import mongodb from "mongodb";
import { MeasureId, generateId } from "../iso/measures/index.js";
import * as Fingers from "../iso/measures/fingers.js";
import * as Movement from "../iso/measures/movement.js";
import * as Power from "../iso/measures/power.js";
import * as Grades from "../iso/measures/grades.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fileContent = fs.readFileSync(
  path.join(__dirname, "./powercompany.tsv"),
  "utf-8",
);

const table = fileContent
  .trim()
  .split("\n")
  .map((line) => line.split("\t"))
  .filter((row) => row.length > 1);

const snapshots: Omit<SnapshotDoc, "_id">[] = [];

const TSV_COLS = [
  "age",
  "sex",
  "max_boulder",
  "max_sport",
  "exp",
  "trainexp",
  "country",
  "state",
  "rock",
  "season",
  "days",
  "height",
  "weight",
  "span",
  "pullup",
  "pushup",
  "continuous",
  "maxhang",
  "weightedpull",
  "repeaters1",
  "longcamp",
  "shortcamp",
  "ohpr",
  "ohpl",
  "dl",
  "sportgrade",
  "bouldergrade",
  "powl",
  "powr",
  "lhang",
  "armjump",
  "hipjump",
] as const;

// starting at row 1 since row 0 is the column headers
table.slice(1).forEach((row, idx) => {
  const snapshot: Omit<SnapshotDoc, "_id"> = {
    userId: `powercompany-row-${idx}`,
    measures: {},
    normedMeasures: [],
    createdAt: new Date(),
    lastUpdated: new Date(),
    importSource: "powercompany",
  };

  function addMeasure(measureId: MeasureId, value: UnitValue) {
    snapshot.measures[measureId] = value;
    snapshot.normedMeasures.push(encodeMeasureValue({ id: measureId, value }));
  }

  const ageStr = row[TSV_COLS.findIndex((c) => c == "age")];
  const age = Number(ageStr);
  if (!isNaN(age)) {
    addMeasure("age" as MeasureId, { unit: "year", value: age });
  }

  const sexStr = row[TSV_COLS.findIndex((c) => c == "sex")];
  if (sexStr.toLowerCase() === "male") {
    addMeasure("sex-at-birth" as MeasureId, {
      unit: "sex-at-birth",
      value: "male",
    });
  } else if (sexStr.toLowerCase() === "female") {
    addMeasure("sex-at-birth" as MeasureId, {
      unit: "sex-at-birth",
      value: "female",
    });
  }

  function parseSportGrade(gradeStr: string): YDS {
    if (gradeStr.startsWith("<5.10")) {
      return "5.9";
    }

    if (gradeStr.startsWith("5.10a")) {
      return "5.10b";
    }

    if (gradeStr.startsWith("5.10c")) {
      return "5.10d";
    }

    if (gradeStr.startsWith("5.11a")) {
      return "5.11b";
    }

    if (gradeStr.startsWith("5.11c")) {
      return "5.11d";
    }

    if (gradeStr.startsWith("5.11c")) {
      return "5.11d";
    }

    if (gradeStr.startsWith("5.12a")) {
      return "5.12b";
    }

    if (gradeStr.startsWith("5.12c")) {
      return "5.12d";
    }

    if (gradeStr.startsWith("5.13a")) {
      return "5.13b";
    }

    if (gradeStr.startsWith("5.13c")) {
      return "5.13d";
    }

    if (gradeStr.startsWith("5.14a")) {
      return "5.14b";
    }

    if (gradeStr.startsWith("5.14c")) {
      return "5.14d";
    }

    throw new Error(`Unexpected sport grade: ${gradeStr}`);
  }

  const maxSportStr = row[TSV_COLS.findIndex((c) => c == "max_sport")];
  try {
    const grade = parseSportGrade(maxSportStr);
    addMeasure(
      generateId(Grades.sportGradeClass, {
        sportLocation: "gym",
        stat: "max",
      }),
      {
        unit: "yds",
        value: grade,
      },
    );
  } catch {
    // do nothing
  }

  function parseVgrade(maxBoulderStr: string): VGrade {
    switch (maxBoulderStr) {
      case "<V3":
        return 2 as VGrade;
      case "V3":
        return 3 as VGrade;
      case "V4":
        return 4 as VGrade;
      case "V5":
        return 5 as VGrade;
      case "V6":
        return 6 as VGrade;
      case "V7":
        return 7 as VGrade;
      case "V8":
        return 8 as VGrade;
      case "V9":
        return 9 as VGrade;
      case "V10":
        return 10 as VGrade;
      case "V11":
        return 11 as VGrade;
      case "V12":
        return 12 as VGrade;
      case "V13":
        return 13 as VGrade;
      case "V14":
        return 14 as VGrade;
      case "V15":
        return 15 as VGrade;
      default:
        throw new Error(`Unexpected boulder grade: ${maxBoulderStr}`);
    }
  }

  const maxBoulderStr = row[TSV_COLS.findIndex((c) => c == "max_boulder")];
  try {
    const grade = parseVgrade(maxBoulderStr);
    addMeasure(
      generateId(Grades.boulderGradeClass, {
        boulderLocation: "gym",
        stat: "max",
      }),
      {
        unit: "vermin",
        value: grade,
      },
    );
  } catch {
    // do nothing
  }

  const parseAge = (climbingExpStr: string) => {
    switch (climbingExpStr) {
      case "<1 year":
        return 0.5;
      case "1-2 years":
        return 2;
      case "3-4 years":
        return 4;
      case "5-6 years":
        return 6;
      case "7-8 years":
        return 8;
      case "9-10 years":
        return 10;
      case ">10 years":
        return 11;
      default:
        throw new Error(`Unexpected climbing experience: ${climbingExpStr}`);
    }
  };

  const climbingExpStr = row[TSV_COLS.findIndex((c) => c == "exp")];
  try {
    addMeasure("time-climbing" as MeasureId, {
      unit: "year",
      value: parseAge(climbingExpStr),
    });
  } catch {
    // do nothing
  }

  let trainAge: number | undefined;
  try {
    trainAge = parseAge(climbingExpStr);
    addMeasure("time-training" as MeasureId, {
      unit: "year",
      value: trainAge,
    });
  } catch {
    // do nothing
  }

  const heightStr = row[TSV_COLS.findIndex((c) => c == "height")];
  const height = Number(heightStr);
  if (!isNaN(height)) {
    addMeasure("height" as MeasureId, {
      unit: "inch",
      value: height,
    });
  }

  const weightStr = row[TSV_COLS.findIndex((c) => c == "weight")];
  const weight = Number(weightStr);
  if (!isNaN(weight)) {
    addMeasure("weight" as MeasureId, {
      unit: "lb",
      value: weight,
    });
  }

  const spanStr = row[TSV_COLS.findIndex((c) => c == "span")];
  const span = Number(spanStr);
  if (!isNaN(span)) {
    addMeasure("armspan" as MeasureId, {
      unit: "inch",
      value: span,
    });
  }

  const maxPullRepStr = row[TSV_COLS.findIndex((c) => c == "pullup")];
  const maxPulls = parseFloat(maxPullRepStr);
  if (!isNaN(maxPulls)) {
    addMeasure(
      generateId(Movement.maxRepsClass, {
        maxRepsMovement: "pullup",
      }),
      {
        unit: "count",
        value: maxPulls,
      },
    );
  }

  const maxPushupsStr = row[TSV_COLS.findIndex((c) => c == "pushup")];
  const maxPushups = parseFloat(maxPushupsStr);
  if (!isNaN(maxPushups)) {
    addMeasure(
      generateId(Movement.maxRepsClass, {
        maxRepsMovement: "pushup",
      }),
      {
        unit: "count",
        value: maxPushups,
      },
    );
  }

  const continuousHangStr = row[TSV_COLS.findIndex((c) => c == "continuous")];
  const continuousHang = parseFloat(continuousHangStr);
  if (!isNaN(continuousHang)) {
    addMeasure(
      generateId(Fingers.continuousHangClass, {
        basicGripType: "half-crimp",
        edgeSize: "20",
      }),
      {
        unit: "second",
        value: continuousHang,
      },
    );
  }

  const maxHangStr = row[TSV_COLS.findIndex((c) => c == "maxhang")];
  const maxHang = parseFloat(maxHangStr);
  if (!isNaN(maxHang) && !isNaN(weight)) {
    addMeasure(
      generateId(Fingers.maxhangClass, {
        extendedGripType: "half-crimp",
        edgeSize: "20",
        duration: "10",
      }),
      {
        unit: "lb",
        value: maxHang + weight,
      },
    );
  }

  const weightedPullStr = row[TSV_COLS.findIndex((c) => c == "weightedpull")];
  let weightedPull = parseFloat(weightedPullStr);
  if (!isNaN(weightedPull)) {
    if (weight) {
      addMeasure(
        generateId(Movement.weightedClass, {
          weightedMovement: "pullup",
          repMax: "1",
        }),
        {
          unit: "lb",
          value: weightedPull + weight,
        },
      );
    }
  }

  const repeatersStr = row[TSV_COLS.findIndex((c) => c == "repeaters1")];
  const repeaters = parseFloat(repeatersStr);
  if (!isNaN(repeaters)) {
    if (weight) {
      addMeasure(
        generateId(Fingers.repeatersClass, {
          timing: "7-3",
          edgeSize: "20",
          basicGripType: "half-crimp",
        }),
        {
          unit: "second",
          value: repeaters,
        },
      );
    }
  }

  const longCampStr = row[TSV_COLS.findIndex((c) => c == "longcamp")];
  const longCamp = parseFloat(longCampStr);
  if (!isNaN(longCamp)) {
    addMeasure(
      generateId(Movement.enduranceClass, {
        enduranceMovement: "footoncampuslong",
      }),
      {
        unit: "second",
        value: longCamp,
      },
    );
  }

  const shortCampStr = row[TSV_COLS.findIndex((c) => c == "shortcamp")];
  const shortCamp = parseFloat(shortCampStr);
  if (!isNaN(shortCamp)) {
    addMeasure(
      generateId(Movement.enduranceClass, {
        enduranceMovement: "footoncampusshort",
      }),
      {
        unit: "second",
        value: shortCamp,
      },
    );
  }

  const ohplStr = row[TSV_COLS.findIndex((c) => c == "ohpl")];
  const ohprStr = row[TSV_COLS.findIndex((c) => c == "ohpr")];
  const ohpl = parseFloat(ohplStr);
  const ohpr = parseFloat(ohprStr);

  if (!isNaN(ohpl) && !isNaN(ohpr)) {
    if (ohpl > ohpr) {
      addMeasure(
        generateId(Movement.unilateralWeightedClass, {
          unilateralMovement: "overheadpress",
          repMax: "1",
          dominantSide: "dominant",
        }),
        { unit: "lb", value: ohpl },
      );
      addMeasure(
        generateId(Movement.unilateralWeightedClass, {
          unilateralMovement: "overheadpress",
          repMax: "1",
          dominantSide: "nondominant",
        }),
        { unit: "lb", value: ohpr },
      );
    } else {
      addMeasure(
        generateId(Movement.unilateralWeightedClass, {
          unilateralMovement: "overheadpress",
          repMax: "1",
          dominantSide: "dominant",
        }),
        { unit: "lb", value: ohpr },
      );
      addMeasure(
        generateId(Movement.unilateralWeightedClass, {
          unilateralMovement: "overheadpress",
          repMax: "1",
          dominantSide: "nondominant",
        }),
        { unit: "lb", value: ohpl },
      );
    }
  }

  const powlStr = row[TSV_COLS.findIndex((c) => c == "powl")];
  const powrStr = row[TSV_COLS.findIndex((c) => c == "powr")];
  const powl = parseFloat(powlStr);
  const powr = parseFloat(powrStr);

  if (!isNaN(powl) && !isNaN(powr)) {
    if (powl > powr) {
      addMeasure(
        generateId(Power.unilateralPowerClass, {
          unilateralPowerMovement: "campusreach",
          dominantSide: "dominant",
        }),
        {
          unit: "inch",
          value: powl,
        },
      );
      addMeasure(
        generateId(Power.unilateralPowerClass, {
          unilateralPowerMovement: "campusreach",
          dominantSide: "nondominant",
        }),
        { unit: "inch", value: powr },
      );
    } else {
      addMeasure(
        generateId(Power.unilateralPowerClass, {
          unilateralPowerMovement: "campusreach",
          dominantSide: "dominant",
        }),
        {
          unit: "inch",
          value: powr,
        },
      );
      addMeasure(
        generateId(Power.unilateralPowerClass, {
          unilateralPowerMovement: "campusreach",
          dominantSide: "nondominant",
        }),
        { unit: "inch", value: powl },
      );
    }
  }

  const dlStr = row[TSV_COLS.findIndex((c) => c == "dl")];
  const dl = parseFloat(dlStr);
  if (!isNaN(dl)) {
    addMeasure(
      generateId(Movement.weightedClass, {
        weightedMovement: "deadlift",
        repMax: "1",
      }),
      {
        unit: "lb",
        value: dl,
      },
    );
  }

  const lhangStr = row[TSV_COLS.findIndex((c) => c == "lhang")];
  const lhang = parseFloat(lhangStr);
  if (!isNaN(lhang)) {
    addMeasure(
      generateId(Movement.isometricClass, {
        isometricMovement: "lhang",
      }),
      {
        unit: "second",
        value: lhang,
      },
    );
  }

  snapshots.push(snapshot);
});

async function run() {
  const client = new mongodb.MongoClient(process.env.MONGODB_URL!);
  await client.connect();
  const db = client.db();
  const snapshotsCollection = db.collection<SnapshotDoc>("snapshots");
  await snapshotsCollection.deleteMany({ importSource: "powercompany" });
  await snapshotsCollection.insertMany(snapshots as SnapshotDoc[]);
  return snapshots.length;
}

run().then(
  (nSnapshots) => {
    console.log(`Success: ${nSnapshots} snapshots imported`);
    process.exit(0);
  },
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
