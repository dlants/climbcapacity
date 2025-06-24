/**
 * Finds the longest subsequence of an input array.
 * Used for computing efficient set of DOM manipulations.
 * @see https://en.wikipedia.org/wiki/Longest_increasing_subsequence
 */
export const getLongestSubsequence = (X: number[]) => {
  const n = X.length;
  const P = new Array(n);
  const M = new Array(n + 1);
  let L = 0; // Length of longest subsequence found so far
  let newL;
  for (let index = 0; index < n; index++) {
    // Knuth modification that first checks if we can extend longest run, before doing
    // the full binary search
    if (X[M[L]] < X[index]) {
      newL = L + 1;
    } else {
      // Binary Search for a value of j between 0 and L, such that X[M[j]] < X[i]
      // j is the length of the subsequence which we will extend, and we want
      // to extend the longest subsequence which we can extend
      let lo = 1;
      let hi = L - 1;
      while (lo <= hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (X[M[mid]] < X[index]) {
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      // lo will end up 1 greater than the length of the longest prefix of X[i]
      newL = lo;
    }

    P[index] = M[newL - 1]; //Store the predecessor of X[i]

    M[newL] = index; // If there were a smaller way to get a sequence of this length, we would have extended it instead

    if (newL > L) {
      // If we set a new record, record that.
      L = newL;
    }
  }

  const subsequence = new Array(L);
  let k = M[L];
  for (let index = L - 1; index >= 0; index--) {
    subsequence[index] = X[k];
    k = P[k];
  }

  return subsequence;
};
