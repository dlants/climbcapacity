import { MeasureId } from "../../iso/measures";
import { UnitValue } from "../../iso/units";
import { HydratedSnapshot, Snapshot } from "../types";

/** Hydrate the snapshot
 */
export function hydrateSnapshot(snapshot: Snapshot): HydratedSnapshot {
  return {
    ...snapshot,
    measures: snapshot.measures as { [measureId: MeasureId]: UnitValue },
  };
}
