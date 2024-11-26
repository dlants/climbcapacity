import { MEASURES as ISO_MEASURES } from "../iso/measures";
import * as immer from "immer";

/** Start with an immutable object. This should help react views to maintain state
 */
export const MEASURES = immer.produce(ISO_MEASURES, (d) => d);
