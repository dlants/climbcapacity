import * as DCGView from 'dcgview';

import { mount, node, view } from './root-view-helper.test';
import { type Switch } from './switch';

const { IfDefined } = DCGView.Components;

QUnit.module('DCGViewCore::DCGView.Components.IfDefined');

QUnit.test('handles null and undefined correctly', (assert) => {
  assert.expect(11);
  let item: string | undefined | null | false | 0 | '' | typeof NaN = '1';

  class View extends DCGView.View {
    template() {
      return IfDefined(
        () => item,
        (thing) => {
          return <div>{() => thing()}</div>;
        }
      );
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<div>1</div>');

    item = undefined;
    view.update();
    assert.equal(node.childNodes.length, 1);
    assert.equal(node.firstChild?.nodeName, '#text');

    item = null;
    view.update();
    assert.equal(node.childNodes.length, 1);
    assert.equal(node.firstChild?.nodeName, '#text');

    item = false;
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>false</div>');

    item = 0;
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>0</div>');

    item = '';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div></div>');

    item = null;
    view.update();
    assert.equal(node.childNodes.length, 1);
    assert.equal(node.firstChild?.nodeName, '#text');

    item = NaN;
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>NaN</div>');
  });
});

QUnit.test('must return JSX', (assert) => {
  assert.expect(1);
  const item = { type: 'dog' };

  class View extends DCGView.View {
    template() {
      return IfDefined(
        () => item,
        // @ts-expect-error
        () => {
          return 2;
        }
      );
    }
  }

  IfDefined(
    () => '',
    // @ts-expect-error Expected function child returning JSX
    () => undefined
  );

  assert.throws(
    () => mount(View),
    new Error('template() must return a DCGElement')
  );
});

QUnit.test('dom node removed if stops being defined', (assert) => {
  assert.expect(3);

  let item: Record<PropertyKey, string | number> | undefined = {
    type: 'dog',
    data: 1
  };

  class View extends DCGView.View {
    template() {
      return IfDefined(
        () => item,
        (thing) => {
          return <span>{this.const(thing().data)}</span>;
        }
      );
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<span>1</span>');

    item = undefined;
    view.update();

    assert.equal(node.childNodes.length, 1);
    assert.equal(node.firstChild?.nodeName, '#text');
  });
});

QUnit.test('dom node added if starts being defined', (assert) => {
  assert.expect(3);

  let item: Record<PropertyKey, string | number> | undefined = undefined;
  class View extends DCGView.View {
    template() {
      return IfDefined(
        () => item,
        (thing) => {
          return <span>{this.const(thing().data)}</span>;
        }
      );
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

QUnit.test('getter can return primitives', (assert) => {
  assert.expect(2);

  let item = '1';
  class View extends DCGView.View {
    template() {
      return IfDefined(
        () => item,
        (thing) => {
          return <div>{() => thing()}</div>;
        }
      );
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<div>1</div>');

    item = '2';
    view.update();

    assert.htmlEqual(node.innerHTML, '<div>2</div>');
  });
});

QUnit.test('typical usage', (assert) => {
  assert.expect(32);

  let events: unknown[] = [];
  const makeProps = function (func: () => unknown) {
    let originalValue: string;

    const pushEvent = (type: string) =>
      function (...children: HTMLElement[]) {
        let propValue;
        if (type === 'willMount') {
          originalValue = JSON.parse(JSON.stringify(func.call(DCGView)));
        }

        // it's not safe to call the prop during unmounting. At that point the
        // prop will turn undefined.
        if (
          type === 'willUnmount' ||
          type === 'onUnmount' ||
          type === 'didUnmount'
        ) {
          propValue = originalValue;
        } else {
          propValue = func.call(DCGView);
        }

        if (children.length === 0) {
          return events.push([type, propValue]);
        } else if (children.length === 1) {
          const node = children[0];
          return events.push([type, propValue, node.id]);
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

  const makeAttrs = function (func: () => unknown) {
    return {
      id() {
        return 'id-' + func.call(this);
      },
      ...makeProps(func)
    };
  };

  class Item extends DCGView.View<{ readonly type: () => string }> {
    init() {
      Object.assign(
        this,
        makeProps.call(this, () => 'Item-' + this.props.type())
      );
    }

    template() {
      const divAttrs = makeAttrs(() => 'div-' + this.props.type());
      return <div {...divAttrs}>{this.props.type}</div>;
    }
  }

  class View extends DCGView.View {
    init() {
      Object.assign(
        this,
        makeProps.call(this, () => 'View')
      );
    }

    template() {
      return IfDefined(
        () => item,
        (thing) => {
          // TODO: Use better types for `thing` and `thing().type`.
          // @ts-expect-error ts(2339)
          events.push(['toView', thing().type]);
          // TODO: Use better types for `thing` and `thing().type`.
          // @ts-expect-error ts(2339)
          return <Item type={() => thing().type} />;
        }
      );
    }
  }

  const assertState = function (expectedCase: unknown, expectedId?: string) {
    const _if = view._childViews[0];
    assert.strictEqual(
      // eslint-disable-next-line dot-notation
      (_if as unknown as Switch)['_key'],
      expectedCase != null
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

  const assertEvents = function (expectedEvents: string[][]) {
    assert.deepEqual(events, expectedEvents);
    events = [];
  };

  let item: string | null | undefined | { type: string } = null;
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

    // update element
    item = { type: '2' };
    view.update();
    assertState('2', 'id-div-2');
    assertEvents([
      ['willUpdate', 'View'],
      ['onUpdate', 'View'],
      ['willUpdate', 'Item-2'],
      ['willUpdate', 'div-2', 'id-div-3'],
      ['onUpdate', 'div-2', 'id-div-2'],
      ['onUpdate', 'Item-2'],
      ['didUpdate', 'div-2', 'id-div-2'],
      ['didUpdate', 'Item-2'],
      ['didUpdate', 'View']
    ]);

    // update that element
    item.type = '1';
    view.update();
    assertState('1', 'id-div-1');
    assertEvents([
      ['willUpdate', 'View'],
      ['onUpdate', 'View'],
      ['willUpdate', 'Item-1'],
      ['willUpdate', 'div-1', 'id-div-2'],
      ['onUpdate', 'div-1', 'id-div-1'],
      ['onUpdate', 'Item-1'],
      ['didUpdate', 'div-1', 'id-div-1'],
      ['didUpdate', 'Item-1'],
      ['didUpdate', 'View']
    ]);

    // remove an element
    item = undefined;
    view.update();
    assertState(undefined);
    assertEvents([
      ['willUpdate', 'View'],
      ['onUpdate', 'View'],
      ['willUnmount', 'Item-3'],
      ['willUnmount', 'div-3', 'id-div-1'],
      ['onUnmount', 'div-3'],
      ['onUnmount', 'Item-3'],
      ['didUnmount', 'div-3'],
      ['didUnmount', 'Item-3'],
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
});

QUnit.test('renders fallback when item is null or undefined', (assert) => {
  assert.expect(3);
  let item: string | undefined | null = '1';

  class View extends DCGView.View {
    template() {
      return IfDefined(
        () => item,
        (thing) => {
          return <div>{() => thing()}</div>;
        },
        () => {
          return <span>Fallback</span>;
        }
      );
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<div>1</div>');

    item = undefined;
    view.update();
    assert.htmlEqual(node.innerHTML, '<span>Fallback</span>');

    item = '2';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>2</div>');
  });
});

QUnit.test('fallback function must return a DCGElement', (assert) => {
  assert.expect(2);
  const item: string | undefined = undefined;

  class ValidView extends DCGView.View {
    template() {
      return IfDefined(
        () => item,
        (thing) => {
          return <div>{() => thing()}</div>;
        },
        () => {
          return <></>;
        }
      );
    }
  }

  class InvalidView extends DCGView.View {
    template() {
      return IfDefined(
        () => item,
        (thing) => {
          return <div>{() => thing()}</div>;
        },
        // @ts-expect-error
        () => {
          return 2;
        }
      );
    }
  }

  mount(ValidView, () => {
    assert.equal(
      node.firstChild?.nodeName,
      '#text',
      'Undefined fallback renders text node'
    );
  });

  assert.throws(
    () => mount(InvalidView),
    new Error('template() must return a DCGElement'),
    'Non-DCGElement fallback throws error'
  );
});

QUnit.test('lifecycle events for fallback component', (assert) => {
  assert.expect(1);
  let events: string[] = [];
  let item: string | undefined = '1';

  class FallbackView extends DCGView.View {
    init() {
      this.willMount = () => events.push('fallback:willMount');
      this.didMount = () => events.push('fallback:didMount');
    }

    template() {
      return <div>Fallback</div>;
    }
  }

  class RegularView extends DCGView.View {
    init() {
      this.willMount = () => events.push('regular:willMount');
      this.didMount = () => events.push('regular:didMount');
      this.willUnmount = () => events.push('regular:willUnmount');
    }

    template() {
      return <div>Regular</div>;
    }
  }

  class View extends DCGView.View {
    template() {
      return IfDefined(
        () => item,
        () => {
          return <RegularView />;
        },
        () => {
          return <FallbackView />;
        }
      );
    }
  }

  mount(View, () => {
    events = [];
    item = undefined;
    view.update();

    assert.deepEqual(
      events,
      ['regular:willUnmount', 'fallback:willMount', 'fallback:didMount'],
      'Correct lifecycle events when switching to fallback'
    );
  });
});

QUnit.test('fallback is optional', (assert) => {
  assert.expect(2);
  let item: string | undefined = '1';

  class View extends DCGView.View {
    template() {
      // No fallback parameter provided
      return IfDefined(
        () => item,
        (thing) => {
          return <div>{() => thing()}</div>;
        }
      );
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<div>1</div>');

    item = undefined;
    view.update();
    assert.equal(
      node.firstChild?.nodeName,
      '#text',
      'Renders placeholder without fallback'
    );
  });
});
