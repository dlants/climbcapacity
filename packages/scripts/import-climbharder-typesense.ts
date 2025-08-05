import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  UnitValue,
  createFacetsForMeasures,
  convertToStandardUnit,
} from "../iso/units.js";
import * as Fingers from "../iso/measures/fingers.js";
import { VGrade, EWBANK, EwbankGrade, VGRADE } from "../iso/grade.js";
import {
  generateTrainingMeasureId,
  MeasureId,
  generateId,
} from "../iso/measures/index.js";
import * as Grades from "../iso/measures/grades.js";
import * as Movement from "../iso/measures/movement.js";
import {
  SnapshotTypesenseDoc,
  SNAPSHOTS_COLLECTION_SCHEMA,
} from "../backend/db/typesense-types.js";
import { Client } from "typesense";

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

const documents: SnapshotTypesenseDoc[] = [];

// starting at row 1 since row 0 is the column headers
table.slice(1).forEach((row, idx) => {
  const measures: Record<MeasureId, UnitValue> = {};

  function addMeasure(measureId: MeasureId, value: UnitValue) {
    measures[measureId] = value;
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

  function parseVgrade(vgradeStr: string): VGrade | undefined {
    // Extract number from "V0", "V1", etc.
    if (vgradeStr.startsWith("V")) {
      const gradeNum = parseInt(vgradeStr.slice(1), 10);
      if (!isNaN(gradeNum) && VGRADE.includes(gradeNum as VGrade)) {
        return gradeNum as VGrade;
      }
    }
    return undefined;
  }

  const hardestVGradeStr = row[7];
  const hardestVGrade = parseVgrade(hardestVGradeStr);
  if (hardestVGrade !== undefined) {
    addMeasure(
      generateId(Grades.boulderGradeClass, {
        boulderLocation: "gym",
        stat: "max",
      }),
      {
        unit: "vermin",
        value: hardestVGrade,
      },
    );
  }

  const p90VGradeStr = row[9];
  const p90VGrade = parseVgrade(p90VGradeStr);
  if (p90VGrade !== undefined) {
    addMeasure(
      generateId(Grades.boulderGradeClass, {
        boulderLocation: "gym",
        stat: "projectp90",
      }),
      {
        unit: "vermin",
        value: p90VGrade,
      },
    );
  }

  function parseEwbankGrade(str: string): EwbankGrade | undefined {
    const grade = parseFloat(str);
    if (EWBANK.includes(grade as EwbankGrade)) {
      return grade as EwbankGrade;
    }
    return undefined;
  }

  const hardestRouteGrade = row[10];
  const hardestRoute = parseEwbankGrade(hardestRouteGrade);
  if (hardestRoute !== undefined) {
    addMeasure(
      generateId(Grades.sportGradeClass, {
        sportLocation: "gym",
        stat: "max",
      }),
      {
        unit: "ewbank",
        value: hardestRoute,
      },
    );
  }

  const p90RouteGradeStr = row[12];
  const p90Route = parseEwbankGrade(p90RouteGradeStr);
  if (p90Route !== undefined) {
    addMeasure(
      generateId(Grades.sportGradeClass, {
        sportLocation: "gym",
        stat: "projectp90",
      }),
      {
        unit: "ewbank",
        value: p90Route,
      },
    );
  }

  const maxWeight18mmHalfStr = row[19];
  {
    const addedWeight = parseFloat(maxWeight18mmHalfStr);
    if (!isNaN(addedWeight) && !isNaN(weight)) {
      addMeasure(
        generateId(Fingers.maxhangClass, {
          edgeSize: "18",
          duration: "10",
          extendedGripType: "half-crimp",
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
          extendedGripType: "open",
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
    const cleaned = firstVal.replace("mm", "");
    return parseFloat(cleaned);
  }

  const minEdgeHalfStr = row[21];
  {
    const edgeSize = parseEdgeSize(minEdgeHalfStr);
    if (!isNaN(edgeSize)) {
      addMeasure(
        generateId(Fingers.minEdgeClass, {
          duration: "10",
          basicGripType: "half-crimp",
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
          basicGripType: "open",
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
        maxRepsMovement: "pullup",
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
          weightedMovement: "pullup",
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
        maxRepsMovement: "pushup",
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
        isometricMovement: "lhang",
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
            extendedGripType: "open",
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
            extendedGripType: "half-crimp",
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
            basicGripType: "open",
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
            basicGripType: "half-crimp",
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
              extendedGripType: "open",
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
              extendedGripType: "open",
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
              extendedGripType: "half-crimp",
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
              extendedGripType: "half-crimp",
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
          maxRepsMovement: "pushup",
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
          maxRepsMovement: "pullup",
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
          weightedMovement: "pullup",
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
          isometricMovement: "lhang",
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
            maxRepsMovement: "pushup",
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
            maxRepsMovement: "pushup",
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
            maxRepsMovement: "pullup",
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
            weightedMovement: "pullup",
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
            maxRepsMovement: "pullup",
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
            weightedMovement: "pullup",
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
            isometricMovement: "lhang",
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
            isometricMovement: "lhang",
          }),
        ),
        {
          unit: "training",
          value: 1,
        },
      );
    }
  }

  // Convert measures to string values for Typesense compatibility
  const stringifiedMeasures: SnapshotTypesenseDoc["measures"] = {};
  for (const [measureId, unitValue] of Object.entries(measures)) {
    stringifiedMeasures[measureId as MeasureId] = {
      unit: unitValue.unit,
      value: unitValue.value.toString(),
    };
  }

  const facets = createFacetsForMeasures(measures);

  const document: SnapshotTypesenseDoc = {
    id: `climbharder-v3-row-${idx}`,
    userId: `climbharder-v3-row-${idx}`,
    measures: stringifiedMeasures,
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    importSource: "climbharder",
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

  // Delete existing ClimbHarder documents
  console.log("Deleting existing ClimbHarder documents...");
  try {
    await client.collections(collectionName).documents().delete({
      filter_by: "importSource:=climbharder",
    });
  } catch (error) {
    console.log("No existing documents to delete (or error):", error);
  }

  // Add new documents
  console.log(`Importing ${documents.length} ClimbHarder documents...`);
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
