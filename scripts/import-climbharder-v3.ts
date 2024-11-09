import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SnapshotDoc } from "../backend/models/snapshots.js";
import {
  convertToStandardUnit,
  encodeMeasureValue,
  MeasureId,
  UnitValue,
} from "../iso/units.js";
import { Grip } from "../iso/measures/fingers.js";
import { VGrade, EWBANK, EwbankGrade } from "../iso/grade.js";
import mongodb from "mongodb";

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
    importSource: "climbharderv3",
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
      value: "male",
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
    addMeasure("years-climbing" as MeasureId, {
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
    addMeasure("grade:boulder:gym:max" as MeasureId, {
      unit: "vermin",
      value: grade,
    });
  } catch {}

  const p90VGradeStr = row[9];
  try {
    const grade = parseVgrade(p90VGradeStr);
    addMeasure("grade:boulder:gym:projectp90" as MeasureId, {
      unit: "vermin",
      value: grade,
    });
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
    addMeasure("grade:sport:gym:max" as MeasureId, {
      unit: "ewbank",
      value: grade,
    });
  } catch {}

  const p90RouteGradeStr = row[12];
  try {
    const grade = parseEwbankGrade(p90RouteGradeStr);
    addMeasure("grade:sport:gym:projectp90" as MeasureId, {
      unit: "ewbank",
      value: grade,
    });
  } catch {}

  const hangboardWeekFreqStr = row[16];
  const hangboardWeekFreq = parseFloat(hangboardWeekFreqStr);
  const hangboardGripsStr = row[17];
  const gripsUsed: Grip[] = [];
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
      addMeasure(`time-training:open` as MeasureId, { unit: "year", value: 0 });
      addMeasure(`time-training:half-crimp` as MeasureId, {
        unit: "year",
        value: 0,
      });
      addMeasure(`time-training:full-crimp` as MeasureId, {
        unit: "year",
        value: 0,
      });
      addMeasure(`time-training:pinch` as MeasureId, {
        unit: "year",
        value: 0,
      });
      addMeasure(`time-training:repeaters:open` as MeasureId, {
        unit: "year",
        value: 0,
      });
      addMeasure(`time-training:repeaters:half-crimp` as MeasureId, {
        unit: "year",
        value: 0,
      });
      addMeasure(`time-training:repeaters:full-crimp` as MeasureId, {
        unit: "year",
        value: 0,
      });
    } else {
      const trainingAge = climbingAge / 2;
      if (hangboardStyle.includes("maxweight") && gripsUsed.includes("open")) {
        addMeasure(`time-training:open` as MeasureId, {
          unit: "year",
          value: trainingAge,
        });
      } else {
        addMeasure(`time-training:open` as MeasureId, {
          unit: "year",
          value: 0,
        });
      }

      if (
        hangboardStyle.includes("maxweight") &&
        gripsUsed.includes("half-crimp")
      ) {
        addMeasure(`time-training:half-crimp` as MeasureId, {
          unit: "year",
          value: trainingAge,
        });
      } else {
        addMeasure(`time-training:half-crimp` as MeasureId, {
          unit: "year",
          value: 0,
        });
      }

      if (
        hangboardStyle.includes("maxweight") &&
        gripsUsed.includes("full-crimp")
      ) {
        addMeasure(`time-training:full-crimp` as MeasureId, {
          unit: "year",
          value: trainingAge,
        });
      } else {
        addMeasure(`time-training:full-crimp` as MeasureId, {
          unit: "year",
          value: 0,
        });
      }

      if (hangboardStyle.includes("maxweight") && gripsUsed.includes("pinch")) {
        addMeasure(`time-training:pinch` as MeasureId, {
          unit: "year",
          value: trainingAge,
        });
      } else {
        addMeasure(`time-training:pinch` as MeasureId, {
          unit: "year",
          value: 0,
        });
      }

      if (hangboardStyle.includes("repeater") && gripsUsed.includes("open")) {
        addMeasure(`time-training:repeaters:open` as MeasureId, {
          unit: "year",
          value: trainingAge,
        });
      } else {
        addMeasure(`time-training:repeaters:open` as MeasureId, {
          unit: "year",
          value: 0,
        });
      }

      if (
        hangboardStyle.includes("repeater") &&
        gripsUsed.includes("half-crimp")
      ) {
        addMeasure(`time-training:repeaters:half-crimp` as MeasureId, {
          unit: "year",
          value: trainingAge,
        });
      } else {
        addMeasure(`time-training:repeaters:half-crimp` as MeasureId, {
          unit: "year",
          value: 0,
        });
      }

      if (
        hangboardStyle.includes("repeater") &&
        gripsUsed.includes("full-crimp")
      ) {
        addMeasure(`time-training:repeaters:full-crimp` as MeasureId, {
          unit: "year",
          value: trainingAge,
        });
      } else {
        addMeasure(`time-training:repeaters:full-crimp` as MeasureId, {
          unit: "year",
          value: 0,
        });
      }
    }
  }

  const maxWeight18mmHalfStr = row[19];
  {
    const addedWeight = parseFloat(maxWeight18mmHalfStr);
    if (!isNaN(addedWeight)) {
      addMeasure("maxhang:18mm:10s:half-crimp" as MeasureId, {
        unit: "kg",
        value: addedWeight,
      });
    }
  }

  const maxWeight18mmOpenStr = row[20];
  {
    const addedWeight = parseFloat(maxWeight18mmOpenStr);
    if (!isNaN(addedWeight)) {
      addMeasure("maxhang:18mm:10s:open" as MeasureId, {
        unit: "kg",
        value: addedWeight,
      });
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
      addMeasure("min-edge-hang:10s:half-crimp" as MeasureId, {
        unit: "mm",
        value: edgeSize,
      });
    }
  }

  const minEdgeOpenStr = row[22];
  {
    const edgeSize = parseEdgeSize(minEdgeOpenStr);
    if (!isNaN(edgeSize)) {
      addMeasure("min-edge-hang:10s:open" as MeasureId, {
        unit: "mm",
        value: edgeSize,
      });
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
    addMeasure(`time-training:press` as MeasureId, { unit: "year", value: 0 });
    addMeasure(`time-training:pull` as MeasureId, { unit: "year", value: 0 });
    addMeasure(`time-training:hinge` as MeasureId, { unit: "year", value: 0 });
    addMeasure(`time-training:squat` as MeasureId, { unit: "year", value: 0 });
    addMeasure(`time-training:core:frontal` as MeasureId, {
      unit: "year",
      value: 0,
    });
    addMeasure(`time-training:core:sagittal` as MeasureId, {
      unit: "year",
      value: 0,
    });
  } else if (!isNaN(climbingAge)) {
    const trainingAge = climbingAge / 2;
    if (
      strengthTrainingStyle.includes("antagonist") ||
      strengthTrainingStyle.includes("push")
    ) {
      addMeasure(`time-training:press` as MeasureId, {
        unit: "year",
        value: trainingAge,
      });
    } else {
      addMeasure(`time-training:press` as MeasureId, {
        unit: "year",
        value: trainingAge,
      });
    }

    if (strengthTrainingStyle.includes("pull")) {
      addMeasure(`time-training:pull` as MeasureId, {
        unit: "year",
        value: trainingAge,
      });
    } else {
      addMeasure(`time-training:pull` as MeasureId, {
        unit: "year",
        value: trainingAge,
      });
    }

    if (strengthTrainingStyle.includes("legs")) {
      addMeasure(`time-training:squat` as MeasureId, {
        unit: "year",
        value: trainingAge,
      });
      addMeasure(`time-training:hinge` as MeasureId, {
        unit: "year",
        value: trainingAge,
      });
    } else {
      addMeasure(`time-training:squat` as MeasureId, {
        unit: "year",
        value: 0,
      });
      addMeasure(`time-training:hinge` as MeasureId, {
        unit: "year",
        value: 0,
      });
    }

    if (strengthTrainingStyle.includes("core")) {
      addMeasure(`time-training:core:frontal` as MeasureId, {
        unit: "year",
        value: trainingAge,
      });
    } else {
      addMeasure(`time-training:core:frontal` as MeasureId, {
        unit: "year",
        value: 0,
      });
      addMeasure(`time-training:core:sagittal` as MeasureId, {
        unit: "year",
        value: 0,
      });
    }
  }

  const maxPullRepStr = row[31];
  const maxPulls = parseFloat(maxPullRepStr);
  if (!isNaN(maxPulls)) {
    addMeasure("max-rep:pullup" as MeasureId, {
      unit: "count",
      value: maxPulls,
    });
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
      addMeasure("weighted:pullup" as MeasureId, {
        unit: "5RMkg",
        value: weightedPull5rm + weight,
      });
    }
  }

  const maxPushupsStr = row[33];
  const maxPushups = parseFloat(maxPushupsStr);
  if (!isNaN(maxPushups)) {
    addMeasure("max-rep:pushup" as MeasureId, {
      unit: "count",
      value: maxPushups,
    });
  }

  const maxLsitStr = row[34];
  const maxLsit = parseFloat(maxLsitStr);
  if (!isNaN(maxLsit)) {
    addMeasure("duration:lsit" as MeasureId, {
      unit: "second",
      value: maxLsit,
    });
  }

  snapshots.push(snapshot);
});

async function run() {
  const client = new mongodb.MongoClient(process.env.MONGODB_URL!);
  await client.connect();
  const db = client.db();
  const snapshotsCollection = db.collection<SnapshotDoc>("snapshots");
  await snapshotsCollection.deleteMany({ importSource: "climbharderv3" });
  await snapshotsCollection.insertMany(snapshots as SnapshotDoc[]);
}

run().then(
  () => {
    console.log("success");
    process.exit(0);
  },
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
