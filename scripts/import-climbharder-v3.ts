import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url'
import { SnapshotDoc } from "../backend/models/snapshots";
import { encodeMeasureValue, MeasureId, UnitValue } from "../iso/units";
import { VGrade, EWBANK, EwbankGrade } from "../iso/grade";
import mongodb from "mongodb";

const __dirname = path.dirname(fileURLToPath(import.meta.url))
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
    importSource: 'climbharderv3'
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
  if (match) {
    const [start, end] = [parseFloat(match[1]), parseFloat(match[2])];
    addMeasure("years-climbing" as MeasureId, {
      unit: "year",
      value: (start + end) / 2,
    });
  }

  if (climbingAgeStr == "More than 15 years") {
    addMeasure("years-climbing" as MeasureId, {
      unit: "year",
      value: 15,
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
    if (EWBANK[grade as EwbankGrade]) {
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

  const maxWeight18mmHalfStr = row[19];
  {
    const addedWeight = parseFloat(maxWeight18mmHalfStr);
    if (!isNaN(addedWeight)) {
      addMeasure("maxhang:18:10:half-crimp" as MeasureId, {
        unit: "kg",
        value: addedWeight,
      });
    }
  }

  const maxWeight18mmOpenStr = row[20];
  {
    const addedWeight = parseFloat(maxWeight18mmOpenStr);
    if (!isNaN(addedWeight)) {
      addMeasure("maxhang:18:10:open" as MeasureId, {
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
      addMeasure("ming-edge-hang:10:half-crimp" as MeasureId, {
        unit: "mm",
        value: edgeSize,
      });
    }
  }

  const minEdgeOpenStr = row[22];
  {
    const edgeSize = parseEdgeSize(minEdgeOpenStr);
    if (!isNaN(edgeSize)) {
      addMeasure("ming-edge-hang:10:open" as MeasureId, {
        unit: "mm",
        value: edgeSize,
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
