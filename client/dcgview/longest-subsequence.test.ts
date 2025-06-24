import { getLongestSubsequence } from './longest-subsequence';

QUnit.module('DCGViewCore::longest-subsequence');

QUnit.test('Known subsequences', (assert) => {
  assert.expect(5);

  assert.deepEqual(getLongestSubsequence([]), [], 'empty');
  assert.deepEqual(getLongestSubsequence([1]), [1], 'single element');
  assert.deepEqual(
    getLongestSubsequence([1, 2, 3]),
    [1, 2, 3],
    'all increasing'
  );
  assert.deepEqual(getLongestSubsequence([3, 2, 1]), [1], 'all decreasing');
  assert.deepEqual(
    getLongestSubsequence([1, 2, 3, 6, 4, 5]),
    [1, 2, 3, 4, 5],
    'single outlier'
  );
});

QUnit.test('Longer subsequences', (assert) => {
  assert.expect(3);

  const n = 1000;
  let i;
  let testData = new Array(n);
  for (i = 0; i < n; i++) {
    testData[i] = i;
  }
  assert.deepEqual(
    getLongestSubsequence(testData),
    testData,
    'Increasing list of length ' + n
  );

  testData = new Array(n);
  for (i = 0; i < n; i++) {
    testData[i] = n - i;
  }
  assert.deepEqual(
    getLongestSubsequence(testData),
    [1],
    'Decreasing list of length ' + n
  );

  testData = new Array(n);
  const answerData = [];
  for (i = 0; i < n; i++) {
    const val = i % 2 ? i : -i;
    testData[i] = val;
    if (val >= 0) {
      answerData.push(val);
    }
  }
  assert.deepEqual(
    getLongestSubsequence(testData),
    answerData,
    'Decreasing list of length ' + n
  );
});
