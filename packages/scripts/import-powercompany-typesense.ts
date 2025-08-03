import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  encodeMeasureValue,
  UnitValue,
  createFacetsForMeasures,
  FacetString,
} from "../iso/units.js";
import { VGrade, YDS, VGRADE } from "../iso/grade.js";
import { MeasureId, generateId } from "../iso/measures/index.js";
import * as Fingers from "../iso/measures/fingers.js";
import * as Movement from "../iso/measures/movement.js";
import * as Power from "../iso/measures/power.js";
import * as Grades from "../iso/measures/grades.js";
import {
  SnapshotTypesenseDoc,
  SNAPSHOTS_COLLECTION_SCHEMA,
} from "../backend/db/typesense-types.js";
import { Client } from "typesense";

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

const documents: SnapshotTypesenseDoc[] = [];

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
  const measures: Record<MeasureId, UnitValue> = {};
  const normedMeasures: Record<MeasureId, number> = {};

  function addMeasure(measureId: MeasureId, value: UnitValue) {
    measures[measureId] = value;
    const encoded = encodeMeasureValue({ id: measureId, value });
    normedMeasures[measureId] = encoded.value;
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

  function parseSportGrade(gradeStr: string): YDS | undefined {
    // Handle cases like "<5.10"
    if (gradeStr.startsWith("<5.10")) {
      return "5.9";
    }

    // Handle ranges like "5.10a/b" by taking the first part
    if (gradeStr.includes("/")) {
      gradeStr = gradeStr.split("/")[0];
    }

    // Check if it's a valid YDS grade
    if (YDS.includes(gradeStr as YDS)) {
      return gradeStr as YDS;
    }

    // Skip invalid entries
    return undefined;
  }

  const maxSportStr = row[TSV_COLS.findIndex((c) => c == "max_sport")];
  const sportGrade = parseSportGrade(maxSportStr);
  if (sportGrade) {
    addMeasure(
      generateId(Grades.sportGradeClass, {
        sportLocation: "gym",
        stat: "max",
      }),
      {
        unit: "yds",
        value: sportGrade,
      },
    );
  }

  function parseVgrade(maxBoulderStr: string): VGrade | undefined {
    // Handle "<V3" case
    if (maxBoulderStr === "<V3") {
      return 2 as VGrade;
    }

    // Extract number from "V3", "V4", etc.
    if (maxBoulderStr.startsWith("V")) {
      const gradeNum = parseInt(maxBoulderStr.slice(1), 10);
      if (!isNaN(gradeNum) && VGRADE.includes(gradeNum as VGrade)) {
        return gradeNum as VGrade;
      }
    }

    // Skip invalid entries
    return undefined;
  }

  const maxBoulderStr = row[TSV_COLS.findIndex((c) => c == "max_boulder")];
  const boulderGrade = parseVgrade(maxBoulderStr);
  if (boulderGrade !== undefined) {
    addMeasure(
      generateId(Grades.boulderGradeClass, {
        boulderLocation: "gym",
        stat: "max",
      }),
      {
        unit: "vermin",
        value: boulderGrade,
      },
    );
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

  const facets = createFacetsForMeasures(measures);

  const document: SnapshotTypesenseDoc = {
    id: `powercompany-row-${idx}`,
    userId: `powercompany-row-${idx}`,
    measures,
    normedMeasures,
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    importSource: "powercompany",
    ...facets,
  };

  documents.push(document);
});

async function run() {
  const client = new Client({
    nodes: [
      {
        host: "localhost",
        port: 8108,
        protocol: "http",
      },
    ],
    apiKey: "development-api-key",
    connectionTimeoutSeconds: 2,
  });

  // Get or create the snapshots collection
  const collectionName = SNAPSHOTS_COLLECTION_SCHEMA.name;

  try {
    // Try to get collection first
    await client.collections(collectionName).retrieve();
    console.log("Collection already exists");
  } catch {
    // Collection doesn't exist, create it
    console.log("Creating snapshots collection...");
    await client.collections().create(SNAPSHOTS_COLLECTION_SCHEMA);
  }

  // Delete existing PowerCompany documents
  console.log("Deleting existing PowerCompany documents...");
  try {
    await client.collections(collectionName).documents().delete({
      filter_by: "importSource:=powercompany",
    });
  } catch (error) {
    console.log("No existing documents to delete (or error):", error);
  }

  // Add new documents
  console.log(`Importing ${documents.length} PowerCompany documents...`);
  const result = await client
    .collections(collectionName)
    .documents()
    .import(documents);

  console.log(`Import completed: ${result.length} documents processed`);

  return documents.length;
}

run().then(
  (nSnapshots) => {
    console.log(`Success: ${nSnapshots} snapshots imported to Typesense`);
    process.exit(0);
  },
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
