import * as DCGView from 'dcgview';

import { mount, node, view } from './root-view-helper.test';

const { IfElse } = DCGView.Components;

QUnit.module('DCGViewCore::DCGView.Components.IfElse');

const getTypeCoercedBoolean = (value: unknown): value is boolean =>
  value as boolean;

QUnit.test('handles all return values correctly', (assert) => {
  assert.expect(5);
  let item: string | number | null | {} = '1';

  class View extends DCGView.View {
    template() {
      return IfElse(() => getTypeCoercedBoolean(item), {
        true: () => <div>true</div>,
        false: () => <span>false</span>
      });
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<div>true</div>');

    item = 0;
    view.update();
    assert.htmlEqual(node.innerHTML, '<span>false</span>');

    item = 1;
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>true</div>');

    item = null;
    view.update();
    assert.htmlEqual(node.innerHTML, '<span>false</span>');

    item = {};
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>true</div>');
  });
});

QUnit.test('must return JSX', (assert) => {
  assert.expect(1);
  const item = { type: 'dog' };

  class View extends DCGView.View {
    template() {
      return IfElse(() => getTypeCoercedBoolean(item), {
        // @ts-expect-error
        true: () => 2,
        // @ts-expect-error
        false: () => 2
      });
    }
  }

  IfElse(() => true, {
    // @ts-expect-error Expected function child returning JSX
    true: () => undefined,
    // @ts-expect-error Expected function child returning JSX
    false: () => undefined
  });

  assert.throws(
    () => mount(View),
    new Error('template() must return a DCGElement')
  );
});

QUnit.test('dom updated if key stays the same', (assert) => {
  assert.expect(3);
  const item = { type: 'dog', name: '1' };

  class View extends DCGView.View {
    template() {
      return IfElse(() => getTypeCoercedBoolean(item), {
        true: () => <div>{() => item.name}</div>,
        false: () => <span>false</span>
      });
    }
  }

  mount(View, () => {
    const div = node.firstChild;

    assert.strictEqual(node.textContent, '1');

    item.name = 'abc';
    view.update();

    assert.strictEqual(node.textContent, 'abc');
    return assert.strictEqual(div, node.firstChild);
  });
});

QUnit.test('dom node added if element specified', (assert) => {
  assert.expect(2);

  let item: Record<PropertyKey, string | number> | undefined = undefined;

  class View extends DCGView.View {
    template() {
      return IfElse(() => getTypeCoercedBoolean(item), {
        true: () => <span>{() => item?.data}</span>,
        false: () => <div style="display:none" />
      });
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<div style="display:none"></div>');

    item = { type: 'dog', data: 1 };
    view.update();

    assert.htmlEqual(node.innerHTML, '<span>1</span>');
  });
});
