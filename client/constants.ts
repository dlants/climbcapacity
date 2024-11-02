import {MEASURES as ISO_MEASURES, MEASURE_MAP as ISO_MEASURE_MAP} from '../iso/measures'
import * as immer from 'immer'

/** Start with an immutable object. This should help react views to maintain state
 */
export const MEASURES = immer.produce(ISO_MEASURES, (d) => d);
export const MEASURE_MAP = immer.produce(ISO_MEASURE_MAP, (d) => d);
