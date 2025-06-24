import * as DCGView from 'dcgview';
import { type SinonStatic } from 'sinon';

import { mount, node, view } from './root-view-helper.test';

const { Switch } = DCGView.Components;

QUnit.module('DCGViewCore::DCGView.Components.Switch');

QUnit.test('signature validation', (assert) => {
  assert.expect(10);

  class View extends DCGView.View {
    template() {
      return <div />;
    }
  }

  const assertSignature = (template: () => DCGView.Child, error?: string) =>
    assert.throws(
      () =>
        mount(
          class View extends DCGView.View {
            template() {
              return <>{template()}</>;
            }
          }
        ),
      error ? new Error(error) : undefined
    );

  // `<Switch>` expects a child.
  // @ts-expect-error
  assertSignature(() => <Switch key={() => void 0} />);

  assertSignature(() => (
    // `<Switch>` expects a single child.
    // @ts-expect-error
    <Switch key={() => void 0}>
      <span />
      <span />
    </Switch>
  ));

  assertSignature(() => (
    // `<Switch>` expects a single child.
    // @ts-expect-error
    <Switch key={() => void 0}>
      {() => <span />}
      {() => <span />}
    </Switch>
  ));

  // We intentionally omit props to test that an error is thrown.
  // @ts-expect-error ts(2741)
  assertSignature(() => <Switch />, '<Switch key={}> must be a function');

  assertSignature(
    () => (
      <Switch key={() => void 0}>
        {/* @ts-expect-error */}
        <span />
      </Switch>
    ),
    '<Switch> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(
    () => (
      <Switch key={() => void 0}>
        {/* @ts-expect-error */}
        <View />
      </Switch>
    ),
    '<Switch> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(
    () => (
      <Switch key={() => void 0}>
        {/* @ts-expect-error */}
        <span>hello world</span>
      </Switch>
    ),
    '<Switch> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(
    () => (
      <Switch key={() => void 0}>
        {/* @ts-expect-error */}
        <span>
          <span />
        </span>
      </Switch>
    ),
    '<Switch> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(
    () => (
      <Switch key={() => void 0}>
        {/* @ts-expect-error */}
        <span>
          <View />
        </span>
      </Switch>
    ),
    '<Switch> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(
    // @ts-expect-error
    () => <Switch key={() => void 0}>{DCGView.const('hello world')}</Switch>,
    '<Switch> expects a function that constructs a DCGElement. You passed a constant'
  );
});

QUnit.test('key={}', function (this: { sinon: SinonStatic }, assert) {
  assert.expect(3);

  let item = 1;

  const itemToView = this.sinon.spy(() => <div />);

  class View extends DCGView.View {
    template() {
      return <Switch key={() => '_' + item}>{itemToView}</Switch>;
    }
  }

  mount(View, () => {
    assert.deepEqual(itemToView.args, [['_1']]);
    itemToView.reset();

    item = 2;
    view.update();
    assert.deepEqual(itemToView.args, [['_2']]);
    itemToView.reset();

    view.update();
    item = 2;
    view.update();
    assert.deepEqual(itemToView.args, []);
  });
});

QUnit.test(
  'returning null or undefined mounts a placeholder element',
  (assert) => {
    assert.expect(2);
    const item = 1;

    class View extends DCGView.View {
      template() {
        return <Switch key={() => item}>{() => void 0}</Switch>;
      }
    }

    mount(View, () => {
      assert.equal(node.childNodes.length, 1);
      assert.equal(node.firstChild?.nodeName, '#text');
    });
  }
);

QUnit.test('must return JSX', (assert) => {
  assert.expect(1);
  const item = 1;

  class View extends DCGView.View {
    template() {
      // @ts-expect-error
      return <Switch key={() => item}>{() => ({})}</Switch>;
    }
  }

  assert.throws(
    () => mount(View),
    new Error('template() must return a DCGElement')
  );
});

QUnit.test('dom not updated if key stays the same', (assert) => {
  assert.expect(3);
  let name: string | number = 1;

  class View extends DCGView.View {
    template() {
      return (
        <Switch key={this.const(5)}>{() => <div>{() => name}</div>}</Switch>
      );
    }
  }

  mount(View, () => {
    const div = node.firstChild;

    assert.strictEqual(node.textContent, '1');

    name = 'abc';
    view.update();

    assert.strictEqual(node.textContent, 'abc');
    assert.strictEqual(div, node.firstChild);
  });
});

QUnit.test('dom node removed if no element specified', (assert) => {
  assert.expect(3);

  let key: number | undefined = 1;
  class View extends DCGView.View {
    template() {
      return (
        <Switch key={() => key}>
          {(key: number | undefined) => {
            if (key) {
              return <span>{this.const(key)}</span>;
            }

            return undefined;
          }}
        </Switch>
      );
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<span>1</span>');

    key = undefined;
    view.update();

    assert.equal(node.childNodes.length, 1);
    assert.equal(node.firstChild?.nodeName, '#text');
  });
});

QUnit.test('dom node added if element specified', (assert) => {
  assert.expect(3);

  let key: number;
  class View extends DCGView.View {
    template() {
      return (
        <Switch key={() => key}>
          {(key: number) => {
            if (key) {
              return <span>{this.const(key)}</span>;
            }

            return undefined;
          }}
        </Switch>
      );
    }
  }

  mount(View, () => {
    assert.equal(node.childNodes.length, 1);
    assert.equal(node.firstChild?.nodeName, '#text');

    key = 1;
    view.update();

    assert.htmlEqual(node.innerHTML, '<span>1</span>');
  });
});

QUnit.test('dom node is replaced', (assert) => {
  assert.expect(2);

  let key = 1;

  class View extends DCGView.View {
    template() {
      return (
        <Switch key={() => key}>
          {(key: number) => {
            if (key) {
              return <span>{this.const(key)}</span>;
            }

            return undefined;
          }}
        </Switch>
      );
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<span>1</span>');

    key = 2;
    view.update();

    assert.htmlEqual(node.innerHTML, '<span>2</span>');
  });
});

QUnit.test('typical usage', function (this: { sinon: SinonStatic }, assert) {
  assert.expect(32);

  let events: unknown[] = [];

  const toView = this.sinon.spy((name: string) => {
    events.push(['toView', name]);
    if (name != null) {
      return <Item name={DCGView.const(name)} />;
    } else {
      return undefined;
    }
  });

  const makeProps = function (func: () => string) {
    const pushEvent = (type: string) =>
      function (...children: HTMLElement[]) {
        if (children.length === 0) {
          return events.push([type, func.call(DCGView)]);
        } else if (children.length === 1) {
          const node = children[0];
          return events.push([type, func.call(DCGView), node.id]);
        } else {
          throw new Error('we do not expect more than 1 arg');
        }
      };
    return {
      willMount: pushEvent('willMount'),
      onMount: pushEvent('onMount'),
      didMount: pushEvent('didMount'),
      willUnmount: pushEvent('willUnmount'),
      onUnmount: pushEvent('onUnmount'),
      didUnmount: pushEvent('didUnmount'),
      willUpdate: pushEvent('willUpdate'),
      onUpdate: pushEvent('onUpdate'),
      didUpdate: pushEvent('didUpdate')
    };
  };

  const makeAttrs = function (func: () => string) {
    return {
      id: DCGView.const('id-' + func.call(DCGView)),
      ...makeProps(func)
    };
  };

  class Item extends DCGView.View<{ readonly name: () => string }> {
    init() {
      Object.assign(
        this,
        makeProps.call(this, () => 'Item-' + this.props.name())
      );
    }

    template() {
      const divAttrs = makeAttrs(() => 'div-' + this.props.name());
      return <div {...divAttrs}>{this.props.name}</div>;
    }
  }

  class View extends DCGView.View {
    init() {
      Object.assign(
        this,
        makeProps(() => 'View')
      );
    }

    template() {
      const switchProps = makeProps(() => 'Switch');
      return (
        <Switch key={() => item} {...switchProps}>
          {toView}
        </Switch>
      );
    }
  }

  const assertState = function (expectedKey: unknown, expectedId?: string) {
    const _switch = view._childViews[0];
    assert.strictEqual((_switch as any)._key, expectedKey);
    if (expectedKey == null) {
      assert.equal(node.childNodes.length, 1);
      assert.equal(node.firstChild?.nodeName, '#text');
      return;
    }

    assert.htmlEqual(
      node.innerHTML,
      `<div id='${expectedId}'>${expectedKey}</div>`
    );
  };

  const assertEvents = function (expectedEvents: unknown[][]) {
    assert.deepEqual(events, expectedEvents);
    events = [];
  };

  let item: unknown = null;
  mount(View, () => {
    // initial rendering
    assertState(null);
    assertEvents([
      ['toView', null],
      ['willMount', 'View'],
      ['onMount', 'View'],
      ['didMount', 'View']
    ]);

    // change element
    item = 3;
    view.update();
    assertState(3, 'id-div-3');
    assertEvents([
      ['willUpdate', 'View'],
      ['onUpdate', 'View'],
      ['toView', 3],
      ['willMount', 'Item-3'],
      ['willMount', 'div-3'],
      ['onMount', 'Item-3'],
      ['onMount', 'div-3', 'id-div-3'],
      ['didMount', 'Item-3'],
      ['didMount', 'div-3', 'id-div-3'],
      ['didUpdate', 'View']
    ]);

    // update element
    item = 3;
    view.update();
    assertState(3, 'id-div-3');
    assertEvents([
      ['willUpdate', 'View'],
      ['onUpdate', 'View'],
      ['willUpdate', 'Item-3'],
      ['willUpdate', 'div-3', 'id-div-3'],
      ['onUpdate', 'div-3', 'id-div-3'],
      ['onUpdate', 'Item-3'],
      ['didUpdate', 'div-3', 'id-div-3'],
      ['didUpdate', 'Item-3'],
      ['didUpdate', 'View']
    ]);

    // swap an element
    item = 2;
    view.update();
    assertState(2, 'id-div-2');
    assertEvents([
      ['willUpdate', 'View'],
      ['onUpdate', 'View'],
      ['willUnmount', 'Item-3'],
      ['willUnmount', 'div-3', 'id-div-3'],
      ['onUnmount', 'div-3'],
      ['onUnmount', 'Item-3'],
      ['didUnmount', 'div-3'],
      ['didUnmount', 'Item-3'],
      ['toView', 2],
      ['willMount', 'Item-2'],
      ['willMount', 'div-2'],
      ['onMount', 'Item-2'],
      ['onMount', 'div-2', 'id-div-2'],
      ['didMount', 'Item-2'],
      ['didMount', 'div-2', 'id-div-2'],
      ['didUpdate', 'View']
    ]);

    // update that element
    item = 2;
    view.update();
    assertState(2, 'id-div-2');
    assertEvents([
      ['willUpdate', 'View'],
      ['onUpdate', 'View'],
      ['willUpdate', 'Item-2'],
      ['willUpdate', 'div-2', 'id-div-2'],
      ['onUpdate', 'div-2', 'id-div-2'],
      ['onUpdate', 'Item-2'],
      ['didUpdate', 'div-2', 'id-div-2'],
      ['didUpdate', 'Item-2'],
      ['didUpdate', 'View']
    ]);

    // remove an element
    item = undefined;
    view.update();
    assertState(undefined);
    assertEvents([
      ['willUpdate', 'View'],
      ['onUpdate', 'View'],
      ['willUnmount', 'Item-2'],
      ['willUnmount', 'div-2', 'id-div-2'],
      ['onUnmount', 'div-2'],
      ['onUnmount', 'Item-2'],
      ['didUnmount', 'div-2'],
      ['didUnmount', 'Item-2'],
      ['toView', undefined],
      ['didUpdate', 'View']
    ]);

    // update the non-existent item
    item = undefined;
    view.update();
    assertState(undefined);
    assertEvents([
      ['willUpdate', 'View'],
      ['onUpdate', 'View'],
      ['didUpdate', 'View']
    ]);

    // change to another non-existent item
    item = null;
    view.update();
    assertState(null);
    assertEvents([
      ['willUpdate', 'View'],
      ['onUpdate', 'View'],
      ['toView', null],
      ['didUpdate', 'View']
    ]);

    // add a previously used item
    item = 3;
    view.update();
    assertState(3, 'id-div-3');
    assertEvents([
      ['willUpdate', 'View'],
      ['onUpdate', 'View'],
      ['toView', 3],
      ['willMount', 'Item-3'],
      ['willMount', 'div-3'],
      ['onMount', 'Item-3'],
      ['onMount', 'div-3', 'id-div-3'],
      ['didMount', 'Item-3'],
      ['didMount', 'div-3', 'id-div-3'],
      ['didUpdate', 'View']
    ]);
  });

  // the entire component is unmounted
  assertEvents([
    ['willUnmount', 'View'],
    ['willUnmount', 'Item-3'],
    ['willUnmount', 'div-3', 'id-div-3'],
    ['onUnmount', 'div-3'],
    ['onUnmount', 'Item-3'],
    ['onUnmount', 'View'],
    ['didUnmount', 'div-3'],
    ['didUnmount', 'Item-3'],
    ['didUnmount', 'View']
  ]);
});
