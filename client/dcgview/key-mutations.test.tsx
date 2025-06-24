import { computeKeyMutations } from './compute-key-mutations';

QUnit.module('DCGViewCore::key-mutations');

type Insert = {
  key: number;
  beforeKey?: number;
};

const applyMutations = function (
  oldKeys: number[],
  mutations: { removes: number[]; inserts: Insert[] }
) {
  const mutatedKeys = oldKeys.slice();
  mutations.removes.forEach((key) => {
    // simulate pulling it out of the DOM
    const index = mutatedKeys.indexOf(key);
    mutatedKeys.splice(index, 1);
  });
  mutations.inserts.forEach((insert) => {
    // simulate pulling it out of the DOM
    let index = mutatedKeys.indexOf(insert.key);
    if (index !== -1) mutatedKeys.splice(index, 1);

    // simualate moving it into the DOM
    if (insert.beforeKey === undefined) {
      mutatedKeys.push(insert.key);
    } else {
      index = mutatedKeys.indexOf(insert.beforeKey);
      mutatedKeys.splice(index, 0, insert.key);
    }
  });
  return mutatedKeys;
};

function verifyMutations(assert: Assert, oldKeys: number[], newKeys: number[]) {
  const mutations = computeKeyMutations(oldKeys, newKeys);
  const mutated = applyMutations(oldKeys, mutations);
  assert.deepEqual(mutated, newKeys, 'mutated version matches target newKeys');
}

function testMutations(a: number[], b: number[]) {
  QUnit.test(
    'Key mutation from ' + JSON.stringify(a) + ' to ' + JSON.stringify(b),
    (assert) => {
      assert.expect(1);

      verifyMutations(assert, a, b);
    }
  );
}

const keyLists = [
  [],
  [1],
  [2],
  [4],
  [1, 2],
  [2, 1],
  [1, 3],
  [1, 2, 3],
  [2, 3, 1],
  [3, 1, 2],
  [4, 3, 2],
  [4, 1, 2, 3],
  [1, 3, 5, 7, 9],
  [2, 4, 6, 8, 10],
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [1, 2, 3, 4, 5, 10, 9, 8, 7, 6]
];
let tmpList = [];
let i;
for (i = 0; i < 500; i++) {
  tmpList.push(i);
}
keyLists.push(tmpList);
tmpList = [];
for (i = 0; i < 500; i++) {
  tmpList.push(i % 2 ? i : i + 10);
}
keyLists.push(tmpList);

for (i = 0; i < keyLists.length; i++) {
  const a = keyLists[i];
  for (let j = 0; j < keyLists.length; j++) {
    const b = keyLists[j];
    testMutations(a, b);
  }
}
