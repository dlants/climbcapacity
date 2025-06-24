import * as DCGView from 'dcgview';

import { mount, node, view } from './root-view-helper.test';

const { For } = DCGView.Components;

QUnit.module('DCGViewCore::DCGView.Components.For.Count');

QUnit.test('from is optional. starts at 0', (assert) => {
  assert.expect(2);

  let count = 5;
  class View extends DCGView.View {
    template() {
      return (
        <For.Count count={() => count}>
          {(index) => <div>{() => index}</div>}
        </For.Count>
      );
    }
  }

  mount(View, () => {
    assert.equal(node.textContent, '01234');

    count = 3;
    view.update();
    assert.equal(node.textContent, '012');
  });
});

QUnit.test('can supply props.from', (assert) => {
  assert.expect(2);

  let count = 5;
  let from = 2;
  class View extends DCGView.View {
    template() {
      return (
        <For.Count from={() => from} count={() => count}>
          {(index) => <div>{() => index}</div>}
        </For.Count>
      );
    }
  }

  mount(View, () => {
    assert.equal(node.textContent, '23456');

    from = -3;
    count = 2;
    view.update();
    assert.equal(node.textContent, '-3-2');
  });
});

QUnit.test('edge case counts work', (assert) => {
  assert.expect(8);

  let count = 0;
  class View extends DCGView.View {
    template() {
      return (
        <For.Count count={() => count}>
          {(index) => <div>{() => index}</div>}
        </For.Count>
      );
    }
  }

  mount(View, () => {
    assert.equal(node.textContent, '');

    count = 2;
    view.update();
    assert.equal(node.textContent, '01');

    count = 3.5;
    view.update();
    assert.equal(node.textContent, '012');

    count = NaN;
    view.update();
    assert.equal(node.textContent, '');

    count = 8;
    view.update();
    assert.equal(node.textContent, '01234567');

    count = Infinity;
    view.update();
    assert.equal(node.textContent, '');

    count = 1;
    view.update();
    assert.equal(node.textContent, '0');

    count = -2;
    view.update();
    assert.equal(node.textContent, '');
  });
});

QUnit.test('edge case froms work', (assert) => {
  assert.expect(6);

  let from = 4;
  const count = 2;

  class View extends DCGView.View {
    template() {
      return (
        <For.Count from={() => from} count={() => count}>
          {(index) => <div>{() => index}</div>}
        </For.Count>
      );
    }
  }

  mount(View, () => {
    assert.equal(node.textContent, '45');

    from = NaN;
    view.update();
    assert.equal(node.textContent, '');

    from = 3.5;
    view.update();
    assert.equal(node.textContent, '3.54.5');

    from = -Infinity;
    view.update();
    assert.equal(node.textContent, '');

    from = Infinity;
    view.update();
    assert.equal(node.textContent, '');

    from = -3.5;
    view.update();
    assert.equal(node.textContent, '-3.5-2.5');
  });
});

QUnit.test('dom nodes are moved rather than recreated', (assert) => {
  assert.expect(8);

  let from = 1;
  let count = 2;

  class View extends DCGView.View {
    template() {
      return (
        <For.Count from={() => from} count={() => count}>
          {(index) => (
            <div>
              from: {() => from}; value: {() => index}
            </div>
          )}
        </For.Count>
      );
    }
  }

  mount(View, () => {
    const div1 = node.children[0];
    const div2 = node.children[1];
    assert.equal(div1.textContent, 'from: 1; value: 1');
    assert.equal(div2.textContent, 'from: 1; value: 2');

    from = 0;
    view.update();

    const div0 = node.children[0];
    assert.strictEqual(div0.textContent, 'from: 0; value: 0', 'adds new view');

    const div1_new = node.children[1];
    assert.strictEqual(div1, div1_new, 'we reuse the "1" view');
    assert.equal(div1.textContent, 'from: 0; value: 1');
    assert.equal(
      div2.textContent,
      'from: 1; value: 2',
      'did not update now removed view'
    );

    count = 3;
    view.update();
    const div2_new = node.children[2];
    assert.notEqual(div2_new, div2, 'creates a new div for "2"');
    assert.equal(
      div2_new.textContent,
      'from: 0; value: 2',
      'new div2 has correct value'
    );
  });
});
