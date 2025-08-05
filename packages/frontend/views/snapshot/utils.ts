import { MeasureId, ParamMap } from "../../../iso/measures";
import { ParamName } from "../../../iso/measures/params";

export type CountTree = {
  count: number;
  children: { [key: string]: CountTree };
};

/** bins the measure distribution into a descending tree of counts.
 * at each leaf, we maintain a count of the subtree
 *
 * @param measureDistribution
 * @param parseMeasureId
 * @param params
 * @returns
 */
export function measureDistributionToCountTree(
  measureDistribution: Record<MeasureId, number>,
  parseMeasureId: (measureId: MeasureId) => ParamMap,
  params: ParamName[],
): CountTree {
  const root: CountTree = { count: 0, children: {} };

  for (const [measureId, count] of Object.entries(measureDistribution)) {
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
    } catch {
      // do nothing
    }
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
