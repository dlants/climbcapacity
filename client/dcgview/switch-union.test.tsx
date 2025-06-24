import * as DCGView from 'dcgview';
import { type SinonStatic } from 'sinon';

import { mount, node, view } from './root-view-helper.test';
import { type Switch } from './switch';

const { SwitchUnion } = DCGView.Components;

QUnit.module('DCGViewCore::DCGView.Components.SwitchUnion');

QUnit.test('string union must be finite', (assert) => {
  assert.expect(3);
  let item: string = '1';

  class View extends DCGView.View {
    template() {
      return SwitchUnion(() => item, {
        // @ts-expect-error
        1: (thing) => <div>{() => thing()}</div>,
        // @ts-expect-error
        foo: (thing) => <span>{() => thing()}</span>
      });
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<div>1</div>');

    item = 'foo';
    view.update();

    assert.htmlEqual(node.innerHTML, '<span>foo</span>');

    // handles missing case gracefully by not showing anything
    item = 'bar';
    view.update();

    assert.htmlEqual(node.innerHTML, '');
  });
});

QUnit.test('object discriminate must be finite', (assert) => {
  assert.expect(3);
  let item: { type: string } = { type: '1' };

  class View extends DCGView.View {
    template() {
      return SwitchUnion(() => item, 'type', {
        // @ts-expect-error
        1: (thing) => <div>{() => thing().type}</div>,
        // @ts-expect-error
        foo: (thing) => <span>{() => thing().type}</span>
      });
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<div>1</div>');

    item = { type: 'foo' };
    view.update();

    assert.htmlEqual(node.innerHTML, '<span>foo</span>');

    // handles missing case gracefully by not showing anything
    item = { type: 'bar' };
    view.update();

    assert.htmlEqual(node.innerHTML, '');
  });
});

QUnit.test(
  'string union complains if you do not supply all cases',
  (assert) => {
    assert.expect(3);
    let item: 'a' | 'foo' | 'bar' = 'a';

    class View extends DCGView.View {
      template() {
        // @ts-expect-error
        return SwitchUnion(() => item, {
          a: (thing) => <div>{() => thing()}</div>,
          foo: (thing) => <span>{() => thing()}</span>
        });
      }
    }

    mount(View, () => {
      assert.htmlEqual(node.innerHTML, '<div>a</div>');

      item = 'foo';
      view.update();

      assert.htmlEqual(node.innerHTML, '<span>foo</span>');

      // handles missing case gracefully by not showing anything
      item = 'bar';
      view.update();

      assert.htmlEqual(node.innerHTML, '');
    });
  }
);

QUnit.test(
  'object discriminate complains if you do not supply all cases',
  (assert) => {
    assert.expect(3);
    let item: { type: 'a' } | { type: 'foo' } | { type: 'bar' } = { type: 'a' };

    class View extends DCGView.View {
      template() {
        // @ts-expect-error
        return SwitchUnion(() => item, 'type', {
          a: (thing) => <div>{() => thing().type}</div>,
          foo: (thing) => <span>{() => thing().type}</span>
        });
      }
    }

    mount(View, () => {
      assert.htmlEqual(node.innerHTML, '<div>a</div>');

      item = { type: 'foo' };
      view.update();

      assert.htmlEqual(node.innerHTML, '<span>foo</span>');

      // handles missing case gracefully by not showing anything
      item = { type: 'bar' };
      view.update();

      assert.htmlEqual(node.innerHTML, '');
    });
  }
);

QUnit.test('string union complains if you pass too many cases', (assert) => {
  assert.expect(3);
  let item: 'a' | 'foo' = 'a';

  class View extends DCGView.View {
    template() {
      return SwitchUnion(() => item, {
        a: (thing) => <div>{() => thing()}</div>,
        foo: (thing) => <span>{() => thing()}</span>,
        // @ts-expect-error
        baz: (thing: () => 'baz') => <>{thing()}</>
      });
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<div>a</div>');

    item = 'foo';
    view.update();

    assert.htmlEqual(node.innerHTML, '<span>foo</span>');

    item = 'a';
    view.update();

    assert.htmlEqual(node.innerHTML, '<div>a</div>');
  });
});

QUnit.test(
  'object discriminate complains if you pass too many cases',
  (assert) => {
    assert.expect(3);
    let item: { type: 'a' } | { type: 'foo' } = { type: 'a' };

    class View extends DCGView.View {
      template() {
        return SwitchUnion(() => item, 'type', {
          a: (thing) => <div>{() => thing().type}</div>,
          foo: (thing) => <span>{() => thing().type}</span>,
          // @ts-expect-error
          baz: (thing: () => { type: 'baz' }) => <>{thing()}</>
        });
      }
    }

    mount(View, () => {
      assert.htmlEqual(node.innerHTML, '<div>a</div>');

      item = { type: 'foo' };
      view.update();

      assert.htmlEqual(node.innerHTML, '<span>foo</span>');

      // handles missing case gracefully by not showing anything
      item = { type: 'a' };
      view.update();

      assert.htmlEqual(node.innerHTML, '<div>a</div>');
    });
  }
);

QUnit.test('object discriminate narrows getter type', (assert) => {
  assert.expect(3);
  let item:
    | { type: 'a'; propA: string }
    | { type: 'b'; propB: string }
    | { type: 'c'; propC: string } = { type: 'a', propA: 'Prop A' };

  class View extends DCGView.View {
    template() {
      return SwitchUnion(() => item, 'type', {
        a: (thing) => <div>{() => thing().propA}</div>,
        b: (thing) => <span>{() => thing().propB}</span>,
        // @ts-expect-error
        c: (thing) => <b>{() => thing().propB}</b>
      });
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<div>Prop A</div>');

    item = { type: 'b', propB: 'Prop B' };
    view.update();

    assert.htmlEqual(node.innerHTML, '<span>Prop B</span>');

    item = { type: 'c', propC: 'Prop C' };
    view.update();

    // view pulls propB but it's undefined. Should ultimately be no inner text
    assert.htmlEqual(node.innerHTML, '<b></b>');
  });
});

QUnit.test('can use simple unions that are only strings', (assert) => {
  assert.expect(2);
  let item: '1' | 'foo' = '1';

  class View extends DCGView.View {
    template() {
      return SwitchUnion(() => item, {
        1: (thing) => <div>{() => thing()}</div>,
        foo: (thing) => <span>{() => thing()}</span>
      });
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<div>1</div>');

    item = 'foo';
    view.update();

    assert.htmlEqual(node.innerHTML, '<span>foo</span>');
  });
});

QUnit.test('can choose property to switch on', (assert) => {
  assert.expect(3);
  const item: { foo: 'dog'; name: string } = { foo: 'dog', name: '1' };

  class View extends DCGView.View {
    template() {
      return SwitchUnion(() => item, 'foo', {
        dog: (thing) => <div>{() => thing().name}</div>
      });
    }
  }

  mount(View, () => {
    const div = node.firstChild;

    assert.strictEqual(node.textContent, '1');

    item.name = 'abc';
    view.update();

    assert.strictEqual(node.textContent, 'abc');
    assert.strictEqual(div, node.firstChild);
  });
});

QUnit.test('must return JSX', (assert) => {
  assert.expect(1);
  const item = { type: 'dog' };

  class View extends DCGView.View {
    template() {
      return SwitchUnion(() => item, 'type', {
        // @ts-expect-error
        dog: () => 2
      });
    }
  }

  assert.throws(
    () => mount(View),
    new Error('template() must return a DCGElement')
  );
});

QUnit.test('dom updated if key stays the same', (assert) => {
  assert.expect(3);
  const item: { type: 'dog'; name: string } = { type: 'dog', name: '1' };

  class View extends DCGView.View {
    template() {
      return SwitchUnion(() => item, 'type', {
        dog: (thing) => <div>{() => thing().name}</div>
      });
    }
  }

  mount(View, () => {
    const div = node.firstChild;

    assert.strictEqual(node.textContent, '1');

    item.name = 'abc';
    view.update();

    assert.strictEqual(node.textContent, 'abc');
    assert.strictEqual(div, node.firstChild);
  });
});

QUnit.test('dom node removed if no element specified', (assert) => {
  assert.expect(3);

  let item: { type: 'dog'; data: number } | { type: 'none' } = {
    type: 'dog',
    data: 1
  };

  class View extends DCGView.View {
    template() {
      return SwitchUnion(() => item, 'type', {
        dog: (thing) => <span>{this.const(thing()?.data)}</span>,
        none: () => <></>
      });
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<span>1</span>');

    item = { type: 'none' };
    view.update();

    assert.equal(node.childNodes.length, 1);
    assert.equal(node.firstChild?.nodeName, '#text');
  });
});

QUnit.test('dom node added if element specified', (assert) => {
  assert.expect(3);

  let item: { type: 'dog'; data: number } | { type: 'none' } = { type: 'none' };

  class View extends DCGView.View {
    template() {
      return SwitchUnion(() => item, 'type', {
        dog: (thing) => <span>{this.const(thing()?.data)}</span>,
        none: () => <></>
      });
    }
  }

  mount(View, () => {
    assert.equal(node.childNodes.length, 1);
    assert.equal(node.firstChild?.nodeName, '#text');

    item = { type: 'dog', data: 1 };
    view.update();

    assert.htmlEqual(node.innerHTML, '<span>1</span>');
  });
});

QUnit.test('dom node is replaced', (assert) => {
  assert.expect(2);

  let item:
    | { type: 'div'; dataDiv: number }
    | { type: 'span'; dataSpan: number } = {
    type: 'div',
    dataDiv: 1
  };

  class View extends DCGView.View {
    template() {
      return SwitchUnion(() => item, 'type', {
        div: (thing) => <div>{() => thing().dataDiv}</div>,
        span: (thing) => <span>{() => thing().dataSpan}</span>
      });
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<div>1</div>');

    item = { type: 'span', dataSpan: 2 };
    view.update();

    assert.htmlEqual(node.innerHTML, '<span>2</span>');
  });
});

QUnit.test(
  'typical usage (simple union)',
  function (this: { sinon: SinonStatic }, assert) {
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
        return SwitchUnion(() => item as '1' | '2' | '3', {
          '1': (thing) => toView.call(this, thing()),
          '2': (thing) => toView.call(this, thing()),
          '3': (thing) => toView.call(this, thing())
        });
      }
    }

    const assertState = function (expectedCase: unknown, expectedId?: string) {
      const _switch = view._childViews[0];
      assert.strictEqual(
        // eslint-disable-next-line dot-notation
        (_switch as unknown as Switch)['_key'],
        expectedCase
      );
      if (expectedCase != null) {
        assert.htmlEqual(
          node.innerHTML,
          `<div id='${expectedId}'>${expectedCase}</div>`
        );
        return;
      }

      assert.equal(node.childNodes.length, 1);
      assert.equal(node.firstChild?.nodeName, '#text');
    };

    const assertEvents = function (expectedEvents: unknown[][]) {
      assert.deepEqual(events, expectedEvents);
      events = [];
    };

    // just making sure that bad input doesn't throw an error
    let item: string | undefined | null = null;
    mount(View, () => {
      // initial rendering
      assertState(null);
      assertEvents([
        ['willMount', 'View'],
        ['onMount', 'View'],
        ['didMount', 'View']
      ]);

      // change element
      item = '3';
      view.update();
      assertState('3', 'id-div-3');
      assertEvents([
        ['willUpdate', 'View'],
        ['onUpdate', 'View'],
        ['toView', '3'],
        ['willMount', 'Item-3'],
        ['willMount', 'div-3'],
        ['onMount', 'Item-3'],
        ['onMount', 'div-3', 'id-div-3'],
        ['didMount', 'Item-3'],
        ['didMount', 'div-3', 'id-div-3'],
        ['didUpdate', 'View']
      ]);

      // update element
      item = '3';
      view.update();
      assertState('3', 'id-div-3');
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
      item = '2';
      view.update();
      assertState('2', 'id-div-2');
      assertEvents([
        ['willUpdate', 'View'],
        ['onUpdate', 'View'],
        ['willUnmount', 'Item-3'],
        ['willUnmount', 'div-3', 'id-div-3'],
        ['onUnmount', 'div-3'],
        ['onUnmount', 'Item-3'],
        ['didUnmount', 'div-3'],
        ['didUnmount', 'Item-3'],
        ['toView', '2'],
        ['willMount', 'Item-2'],
        ['willMount', 'div-2'],
        ['onMount', 'Item-2'],
        ['onMount', 'div-2', 'id-div-2'],
        ['didMount', 'Item-2'],
        ['didMount', 'div-2', 'id-div-2'],
        ['didUpdate', 'View']
      ]);

      // update that element
      item = '2';
      view.update();
      assertState('2', 'id-div-2');
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
        ['didUpdate', 'View']
      ]);

      // add a previously used item
      item = '3';
      view.update();
      assertState('3', 'id-div-3');
      assertEvents([
        ['willUpdate', 'View'],
        ['onUpdate', 'View'],
        ['toView', '3'],
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
  }
);

QUnit.test(
  'typical usage (discriminate + getter)',
  function (this: { sinon: SinonStatic }, assert) {
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
        return SwitchUnion(
          // TODO: Update `item` type or account for `undefined` and `null` cases.
          // @ts-expect-error ts(2769)
          () => item,
          'type',
          {
            '1': (thing: () => { readonly type: string }) =>
              toView.call(this, thing().type),
            '2': (thing: () => { readonly type: string }) =>
              toView.call(this, thing().type),
            '3': (thing: () => { readonly type: string }) =>
              toView.call(this, thing().type)
          }
        );
      }
    }

    const assertState = function (expectedCase: unknown, expectedId?: string) {
      const _switch = view._childViews[0];
      assert.strictEqual(
        // eslint-disable-next-line dot-notation
        (_switch as unknown as Switch)['_key'],
        expectedCase
      );
      if (expectedCase != null) {
        assert.htmlEqual(
          node.innerHTML,
          `<div id='${expectedId}'>${expectedCase}</div>`
        );
        return;
      }
      assert.equal(node.childNodes.length, 1);
      assert.equal(node.firstChild?.nodeName, '#text');
    };

    const assertEvents = function (expectedEvents: unknown[][]) {
      assert.deepEqual(events, expectedEvents);
      events = [];
    };

    let item: { readonly type: string } | null | undefined = null;
    mount(View, () => {
      // initial rendering
      assertState(null);
      assertEvents([
        ['willMount', 'View'],
        ['onMount', 'View'],
        ['didMount', 'View']
      ]);

      // change element
      item = { type: '3' };
      view.update();
      assertState('3', 'id-div-3');
      assertEvents([
        ['willUpdate', 'View'],
        ['onUpdate', 'View'],
        ['toView', '3'],
        ['willMount', 'Item-3'],
        ['willMount', 'div-3'],
        ['onMount', 'Item-3'],
        ['onMount', 'div-3', 'id-div-3'],
        ['didMount', 'Item-3'],
        ['didMount', 'div-3', 'id-div-3'],
        ['didUpdate', 'View']
      ]);

      // update element
      item = { type: '3' };
      view.update();
      assertState('3', 'id-div-3');
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
      item = { type: '2' };
      view.update();
      assertState('2', 'id-div-2');
      assertEvents([
        ['willUpdate', 'View'],
        ['onUpdate', 'View'],
        ['willUnmount', 'Item-3'],
        ['willUnmount', 'div-3', 'id-div-3'],
        ['onUnmount', 'div-3'],
        ['onUnmount', 'Item-3'],
        ['didUnmount', 'div-3'],
        ['didUnmount', 'Item-3'],
        ['toView', '2'],
        ['willMount', 'Item-2'],
        ['willMount', 'div-2'],
        ['onMount', 'Item-2'],
        ['onMount', 'div-2', 'id-div-2'],
        ['didMount', 'Item-2'],
        ['didMount', 'div-2', 'id-div-2'],
        ['didUpdate', 'View']
      ]);

      // update that element
      item = { type: '2' };
      view.update();
      assertState('2', 'id-div-2');
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
        ['didUpdate', 'View']
      ]);

      // add a previously used item
      item = { type: '3' };
      view.update();
      assertState('3', 'id-div-3');
      assertEvents([
        ['willUpdate', 'View'],
        ['onUpdate', 'View'],
        ['toView', '3'],
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
  }
);
