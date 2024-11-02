import { readFileSync } from "fs";
import { Snapshot } from "../backend/types";

const filePath = "climbharder.csv";
const fileContent = readFileSync(filePath, "utf-8");

const table = fileContent
  .split("\n")
  .map((line) => line.split(","))
  .filter((row) => row.length > 1);

const snapshots: Snapshot[] = {};

// row 0 is the column headers
table.slice(1).forEach((row, idx) => {
  const snapshot: Omit<Snapshot, '_id'> = {
    userId: `climbharder-v3-row-${idx}`,
    measures: {},
    measureIndex: [],
  }
})
