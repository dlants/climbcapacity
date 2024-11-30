import { MeasureId, ParamMap } from "../../../iso/measures";
import { ParamName } from "../../../iso/measures/params";
import { MeasureStats } from "../../../iso/protocol";

export type CountTree = {
  count: number;
  children: { [key: string]: CountTree };
};

/** bins the stats into a descending tree of counts.
 * at each leaf, we maintain a count of the subtree
 *
 * @param measureStats
 * @param parseMeasureId
 * @param params
 * @returns
 */
export function measureStatsToCountTree(
  measureStats: MeasureStats,
  parseMeasureId: (measureId: MeasureId) => ParamMap,
  params: ParamName[],
): CountTree {
  const root: CountTree = { count: 0, children: {} };

  for (const [measureId, count] of Object.entries(measureStats)) {
    let currentNode = root;
    try {
      const parsed = parseMeasureId(measureId as MeasureId);
      currentNode.count += count;

      for (const prop of params) {
        const value = String(parsed[prop]);

        if (!currentNode.children[value]) {
          currentNode.children[value] = { count: 0, children: {} };
        }

        currentNode = currentNode.children[value];
        currentNode.count += count;
      }
    } catch { }
  }

  return root;
}

export function getFromCountTree(tree: CountTree, keys: string[]) {
  let root = tree;
  for (const key of keys) {
    if (!root.children[key]) {
      return 0;
    }
    root = root.children[key];
  }
  return root.count;
}
