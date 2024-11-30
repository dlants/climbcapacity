import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SnapshotDoc } from "../backend/models/snapshots.js";
import {
  convertToStandardUnit,
  encodeMeasureValue,
  UnitValue,
} from "../iso/units.js";
import * as Fingers from "../iso/measures/fingers.js";
import { VGrade, EWBANK, EwbankGrade } from "../iso/grade.js";
import mongodb from "mongodb";
import {
  generateTrainingMeasureId,
  MeasureId,
  generateId,
} from "../iso/measures/index.js";
import * as Grades from "../iso/measures/grades.js";
import * as Movement from "../iso/measures/movement.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fileContent = fs.readFileSync(
  path.join(__dirname, "./climbharder.tsv"),
  "utf-8",
);

const table = fileContent
  .trim()
  .split("\n")
  .map((line) => line.split("\t"))
  .filter((row) => row.length > 1);

const snapshots: Omit<SnapshotDoc, "_id">[] = [];

// starting at row 1 since row 0 is the column headers
table.slice(1).forEach((row, idx) => {
  const snapshot: Omit<SnapshotDoc, "_id"> = {
    userId: `climbharder-v3-row-${idx}`,
    measures: {},
    normedMeasures: [],
    createdAt: new Date(),
    lastUpdated: new Date(),
    importSource: "climbharder",
  };

  function addMeasure(measureId: MeasureId, value: UnitValue) {
    snapshot.measures[measureId] = value;
    snapshot.normedMeasures.push(encodeMeasureValue({ id: measureId, value }));
  }

  const sexStr = row[1];
  if (sexStr == "Male") {
    addMeasure("sex-at-birth" as MeasureId, {
      unit: "sex-at-birth",
      value: "male",
    });
  } else if (sexStr == "Female") {
    addMeasure("sex-at-birth" as MeasureId, {
      unit: "sex-at-birth",
      value: "female",
    });
  }

  const heightStr = row[2];
  const height = Number(heightStr);
  if (!isNaN(height)) {
    addMeasure("height" as MeasureId, {
      unit: "cm",
      value: height,
    });
  }

  const weightStr = row[3];
  const weight = Number(weightStr);
  if (!isNaN(weight)) {
    addMeasure("weight" as MeasureId, {
      unit: "kg",
      value: weight,
    });
  }

  const spanStr = row[4];
  const span = Number(spanStr);
  if (!isNaN(span)) {
    addMeasure("armspan" as MeasureId, {
      unit: "cm",
      value: span,
    });
  }

  const climbingAgeStr = row[5];

  const rangePattern = /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/;
  const match = climbingAgeStr.match(rangePattern);
  let climbingAge = NaN;
  if (match) {
    const [start, end] = [parseFloat(match[1]), parseFloat(match[2])];
    climbingAge = (start + end) / 2;
  }

  if (climbingAgeStr == "More than 15 years") {
    climbingAge = 15;
  }

  if (!isNaN(climbingAge)) {
    addMeasure("time-climbing" as MeasureId, {
      unit: "year",
      value: climbingAge,
    });
  }

  function parseVgrade(vgradeStr: string): VGrade {
    switch (vgradeStr) {
      case "V0":
        return 0;
      case "V1":
        return 1;
      case "V2":
        return 2;
      case "V3":
        return 3;
      case "V4":
        return 4;
      case "V5":
        return 5;
      case "V6":
        return 6;
      case "V7":
        return 7;
      case "V8":
        return 8;
      case "V9":
        return 9;
      case "V10":
        return 10;
      case "V11":
        return 11;
      case "V12":
        return 12;
      case "V13":
        return 13;
      case "V14":
        return 14;
      case "V15":
        return 15;
      case "V16":
        return 16;
      case "V17":
        return 17;
      default:
        throw new Error("Invalid V grade");
    }
  }
  const hardestVGradeStr = row[7];
  try {
    const grade = parseVgrade(hardestVGradeStr);
    addMeasure(
      generateId(Grades.boulderGradeClass, {
        location: "gym",
        stat: "max",
      }),
      {
        unit: "vermin",
        value: grade,
      },
    );
  } catch {}

  const p90VGradeStr = row[9];
  try {
    const grade = parseVgrade(p90VGradeStr);
    addMeasure(
      generateId(Grades.boulderGradeClass, {
        location: "gym",
        stat: "projectp90",
      }),
      {
        unit: "vermin",
        value: grade,
      },
    );
  } catch {}

  function parseEwbankGrade(str: string) {
    const grade = parseFloat(str);
    if (EWBANK.includes(grade as EwbankGrade)) {
      return grade as EwbankGrade;
    }
    throw new Error(`Unexpected EWBANK grade ${str}`);
  }

  const hardestRouteGrade = row[10];
  try {
    const grade = parseEwbankGrade(hardestRouteGrade);
    addMeasure(
      generateId(Grades.sportGradeClass, {
        location: "gym",
        stat: "max",
      }),
      {
        unit: "ewbank",
        value: grade,
      },
    );
  } catch {}

  const p90RouteGradeStr = row[12];
  try {
    const grade = parseEwbankGrade(p90RouteGradeStr);
    addMeasure(
      generateId(Grades.sportGradeClass, {
        location: "gym",
        stat: "projectp90",
      }),
      {
        unit: "ewbank",
        value: grade,
      },
    );
  } catch {}

  const maxWeight18mmHalfStr = row[19];
  {
    const addedWeight = parseFloat(maxWeight18mmHalfStr);
    if (!isNaN(addedWeight) && !isNaN(weight)) {
      addMeasure(
        generateId(Fingers.maxhangClass, {
          edgeSize: "18",
          duration: "10",
          gripType: "half-crimp",
        }),
        {
          unit: "kg",
          value: addedWeight + weight,
        },
      );
    }
  }
  const maxWeight18mmOpenStr = row[20];
  {
    const addedWeight = parseFloat(maxWeight18mmOpenStr);
    if (!isNaN(addedWeight) && !isNaN(weight)) {
      addMeasure(
        generateId(Fingers.maxhangClass, {
          edgeSize: "18",
          duration: "10",
          gripType: "open",
        }),
        {
          unit: "kg",
          value: addedWeight + weight,
        },
      );
    }
  }

  function parseEdgeSize(str: string) {
    const firstVal = str.split(/[,+ ]/)[0];
    firstVal.replace("mm", "");
    return parseFloat(minEdgeHalfStr);
  }

  const minEdgeHalfStr = row[21];
  {
    const edgeSize = parseEdgeSize(minEdgeHalfStr);
    if (!isNaN(edgeSize)) {
      addMeasure(
        generateId(Fingers.minEdgeClass, {
          duration: "10",
          gripType: "half-crimp",
        }),
        {
          unit: "mm",
          value: edgeSize,
        },
      );
    }
  }

  const minEdgeOpenStr = row[22];
  {
    const edgeSize = parseEdgeSize(minEdgeOpenStr);
    if (!isNaN(edgeSize)) {
      addMeasure(
        generateId(Fingers.minEdgeClass, {
          duration: "10",
          gripType: "open",
        }),
        {
          unit: "mm",
          value: edgeSize,
        },
      );
    }
  }

  const maxPullRepStr = row[31];
  const maxPulls = parseFloat(maxPullRepStr);
  if (!isNaN(maxPulls)) {
    addMeasure(
      generateId(Movement.maxRepsClass, {
        movement: "pullup",
      }),
      {
        unit: "count",
        value: maxPulls,
      },
    );
  }

  const weightedPull5rmStr = row[32];
  let weightedPull5rm = parseFloat(
    (weightedPull5rmStr.match(/\d+[.,]?\d*/)?.[0] || "NaN").replace(",", "."),
  );

  if (!isNaN(weightedPull5rm)) {
    if (weightedPull5rmStr.includes("lb")) {
      weightedPull5rm = convertToStandardUnit({
        unit: "lb",
        value: weightedPull5rm,
      });
    }

    if (weight) {
      addMeasure(
        generateId(Movement.weightedClass, {
          movement: "pullup",
          repMax: "5",
        }),
        {
          unit: "kg",
          value: weightedPull5rm + weight,
        },
      );
    }
  }

  const maxPushupsStr = row[33];
  const maxPushups = parseFloat(maxPushupsStr);
  if (!isNaN(maxPushups)) {
    addMeasure(
      generateId(Movement.maxRepsClass, {
        movement: "pushup",
      }),
      {
        unit: "count",
        value: maxPushups,
      },
    );
  }

  const maxLhangStr = row[34];
  const maxLhang = parseFloat(maxLhangStr);
  if (!isNaN(maxLhang)) {
    addMeasure(
      generateId(Movement.isometricClass, {
        movement: "lhang",
      }),
      {
        unit: "second",
        value: maxLhang,
      },
    );
  }

  const hangboardWeekFreqStr = row[16];
  const hangboardWeekFreq = parseFloat(hangboardWeekFreqStr);
  const hangboardGripsStr = row[17];
  const gripsUsed = [];
  if (hangboardGripsStr.match(/open/i)) {
    gripsUsed.push("open");
  }

  if (hangboardGripsStr.match(/half/i)) {
    gripsUsed.push("half-crimp");
  }

  if (hangboardGripsStr.match(/full/i)) {
    gripsUsed.push("full-crimp");
  }

  if (hangboardGripsStr.match(/pinch/i)) {
    gripsUsed.push("pinch");
  }

  const hangboardStyleStr = row[18];
  const hangboardStyle: ("maxweight" | "minedge" | "repeater")[] = [];
  if (hangboardStyleStr.match(/weight/i)) {
    hangboardStyle.push("maxweight");
  }
  if (hangboardStyleStr.match(/min/i)) {
    hangboardStyle.push("minedge");
  }
  if (hangboardStyleStr.match(/repeater/i)) {
    hangboardStyle.push("repeater");
  }

  if (!isNaN(hangboardWeekFreq)) {
    if (hangboardWeekFreq == 0 || isNaN(climbingAge)) {
      addMeasure(
        generateTrainingMeasureId(
          generateId(Fingers.maxhangClass, {
            edgeSize: "18",
            duration: "10",
            gripType: "open",
          }),
        ),
        {
          unit: "training",
          value: 1,
        },
      );
      addMeasure(
        generateTrainingMeasureId(
          generateId(Fingers.maxhangClass, {
            edgeSize: "18",
            duration: "10",
            gripType: "half-crimp",
          }),
        ),
        {
          unit: "training",
          value: 1,
        },
      );
      addMeasure(
        generateTrainingMeasureId(
          generateId(Fingers.repeatersClass, {
            edgeSize: "18",
            gripType: "open",
            timing: "7-3",
          }),
        ),
        {
          unit: "training",
          value: 1,
        },
      );
      addMeasure(
        generateTrainingMeasureId(
          generateId(Fingers.repeatersClass, {
            edgeSize: "18",
            gripType: "half-crimp",
            timing: "7-3",
          }),
        ),
        {
          unit: "training",
          value: 1,
        },
      );
    } else {
      const trainingLevel = 2; // Assuming a default training level of 2 for simplicity
      if (hangboardStyle.includes("maxweight") && gripsUsed.includes("open")) {
        addMeasure(
          generateTrainingMeasureId(
            generateId(Fingers.maxhangClass, {
              edgeSize: "18",
              duration: "10",
              gripType: "open",
            }),
          ),
          {
            unit: "training",
            value: trainingLevel,
          },
        );
      } else {
        addMeasure(
          generateTrainingMeasureId(
            generateId(Fingers.maxhangClass, {
              edgeSize: "18",
              duration: "10",
              gripType: "open",
            }),
          ),
          {
            unit: "training",
            value: 1,
          },
        );
      }

      if (
        hangboardStyle.includes("maxweight") &&
        gripsUsed.includes("half-crimp")
      ) {
        addMeasure(
          generateTrainingMeasureId(
            generateId(Fingers.maxhangClass, {
              edgeSize: "18",
              duration: "10",
              gripType: "half-crimp",
            }),
          ),
          {
            unit: "training",
            value: trainingLevel,
          },
        );
      } else {
        addMeasure(
          generateTrainingMeasureId(
            generateId(Fingers.maxhangClass, {
              edgeSize: "18",
              duration: "10",
              gripType: "half-crimp",
            }),
          ),
          {
            unit: "training",
            value: 1,
          },
        );
      }
    }
  }

  const strengthTrainingTypeStr = row[29];
  const strengthTrainingStyle: (
    | "antagonist"
    | "pull"
    | "push"
    | "legs"
    | "core"
  )[] = [];
  if (strengthTrainingTypeStr.match(/antagonist/i)) {
    strengthTrainingStyle.push("antagonist");
  }
  if (strengthTrainingTypeStr.match(/pulling/i)) {
    strengthTrainingStyle.push("pull");
  }
  if (strengthTrainingTypeStr.match(/pushing/i)) {
    strengthTrainingStyle.push("push");
  }
  if (strengthTrainingTypeStr.match(/legs/i)) {
    strengthTrainingStyle.push("legs");
  }
  if (strengthTrainingTypeStr.match(/core/i)) {
    strengthTrainingStyle.push("core");
  }

  if (strengthTrainingStyle.length == 0) {
    addMeasure(
      generateTrainingMeasureId(
        generateId(Movement.maxRepsClass, {
          movement: "pushup",
        }),
      ),
      {
        unit: "training",
        value: 1,
      },
    );
    addMeasure(
      generateTrainingMeasureId(
        generateId(Movement.maxRepsClass, {
          movement: "pullup",
        }),
      ),
      {
        unit: "training",
        value: 1,
      },
    );
    addMeasure(
      generateTrainingMeasureId(
        generateId(Movement.weightedClass, {
          movement: "pullup",
          repMax: "5",
        }),
      ),
      {
        unit: "training",
        value: 1,
      },
    );
    addMeasure(
      generateTrainingMeasureId(
        generateId(Movement.isometricClass, {
          movement: "lhang",
        }),
      ),
      {
        unit: "training",
        value: 1,
      },
    );
  } else if (!isNaN(climbingAge)) {
    const trainingLevel = 2; // Assuming a default training level of 2 for simplicity

    if (
      strengthTrainingStyle.includes("antagonist") ||
      strengthTrainingStyle.includes("push")
    ) {
      addMeasure(
        generateTrainingMeasureId(
          generateId(Movement.maxRepsClass, {
            movement: "pushup",
          }),
        ),
        {
          unit: "training",
          value: trainingLevel,
        },
      );
    } else {
      addMeasure(
        generateTrainingMeasureId(
          generateId(Movement.maxRepsClass, {
            movement: "pushup",
          }),
        ),
        {
          unit: "training",
          value: 1,
        },
      );
    }

    if (strengthTrainingStyle.includes("pull")) {
      addMeasure(
        generateTrainingMeasureId(
          generateId(Movement.maxRepsClass, {
            movement: "pullup",
          }),
        ),
        {
          unit: "training",
          value: trainingLevel,
        },
      );
      addMeasure(
        generateTrainingMeasureId(
          generateId(Movement.weightedClass, {
            movement: "pullup",
            repMax: "5",
          }),
        ),
        {
          unit: "training",
          value: trainingLevel,
        },
      );
    } else {
      addMeasure(
        generateTrainingMeasureId(
          generateId(Movement.maxRepsClass, {
            movement: "pullup",
          }),
        ),
        {
          unit: "training",
          value: 1,
        },
      );
      addMeasure(
        generateTrainingMeasureId(
          generateId(Movement.weightedClass, {
            movement: "pullup",
            repMax: "5",
          }),
        ),
        {
          unit: "training",
          value: 1,
        },
      );
    }

    if (strengthTrainingStyle.includes("core")) {
      addMeasure(
        generateTrainingMeasureId(
          generateId(Movement.isometricClass, {
            movement: "lhang",
          }),
        ),
        {
          unit: "training",
          value: trainingLevel,
        },
      );
    } else {
      addMeasure(
        generateTrainingMeasureId(
          generateId(Movement.isometricClass, {
            movement: "lhang",
          }),
        ),
        {
          unit: "training",
          value: 1,
        },
      );
    }
  }

  snapshots.push(snapshot);
});

async function run() {
  const client = new mongodb.MongoClient(process.env.MONGODB_URL!);
  await client.connect();
  const db = client.db();
  const snapshotsCollection = db.collection<SnapshotDoc>("snapshots");
  await snapshotsCollection.deleteMany({ importSource: "climbharder" });
  const res = await snapshotsCollection.insertMany(snapshots as SnapshotDoc[]);
  return res.insertedCount;
}

run().then(
  (insertedCount) => {
    console.log(`success. ${insertedCount} docs inserted`);
    process.exit(0);
  },
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
