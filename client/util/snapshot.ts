import {
  convertToStandardUnit,
  MeasureId,
  UnitValue,
} from "../../iso/units";
import { HydratedSnapshot, Snapshot } from "../types";

/** Hydrate the snapshot
 */
export function hydrateSnapshot(snapshot: Snapshot): HydratedSnapshot {
  const normalizedMeasures: HydratedSnapshot["normalizedMeasures"] = {};

  for (const measureId in snapshot.measures) {
    const value = snapshot.measures[measureId as MeasureId];
    const normalizedValue = convertToStandardUnit({
      id: measureId as MeasureId,
      value: value as UnitValue
    });
    normalizedMeasures[measureId as MeasureId] = normalizedValue;
  }
  return {
    ...snapshot,
    normalizedMeasures,
  };
}
