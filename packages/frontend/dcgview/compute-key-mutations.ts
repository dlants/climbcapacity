import { getLongestSubsequence } from './longest-subsequence';

export function computeKeyMutations<Key>(oldKeys: Key[], newKeys: Key[]) {
  const newKeyMap = new Map<Key, number>(
    newKeys.map((key, index) => [key, index])
  );

  const removes = oldKeys.filter((key) => !newKeyMap.has(key));

  // Indices into new list which exist in old list.
  const sharedIndices = oldKeys
    .filter((key) => newKeyMap.has(key))
    .map((key) => newKeyMap.get(key)!);

  // Find subset of `sharedIndices` which are already sorted. Other elements will be moved around them. Indices into
  // `newKeys`.
  const unmovedIndices = getLongestSubsequence(sharedIndices);
  const unmovedSet = new Set<Key>(
    unmovedIndices.map((index) => newKeys[index])
  );

  // Insert from end to start.
  const inserts = newKeys.reduceRight<
    {
      key: Key;
      beforeKey?: Key;
    }[]
  >((accumulator, key, index) => {
    if (!unmovedSet.has(key)) {
      const beforeKeyIndex = index + 1;
      accumulator.push({
        key,
        ...(beforeKeyIndex in newKeys
          ? { beforeKey: newKeys[beforeKeyIndex] }
          : {})
      });
    }
    return accumulator;
  }, []);

  return { removes, inserts };
}
