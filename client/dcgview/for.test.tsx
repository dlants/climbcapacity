import * as DCGView from 'dcgview';
import { type SinonStatic } from 'sinon';

import { type ForKey, type ForProps } from './for';
import {
  findSingleRootTestNode,
  mount,
  node,
  view
} from './root-view-helper.test';

const { For } = DCGView.Components;

QUnit.module('DCGViewCore::DCGView.Components.For');

QUnit.test('signature validation', (assert) => {
  assert.expect(9);

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

  // `<For>` expects a child.
  // @ts-expect-error
  assertSignature(() => <For each={() => void 0} />);

  assertSignature(() => (
    // `<For>` expects a single child.
    // @ts-expect-error
    <For each={() => []}>
      {() => <div></div>}
      {() => <div></div>}
    </For>
  ));

  assertSignature(
    () => (
      <For each={() => []}>
        {/* @ts-expect-error */}
        <span />
      </For>
    ),
    '<For> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(
    () => (
      <For each={() => []}>
        {/* @ts-expect-error */}
        <span>{() => <div></div>}</span>
      </For>
    ),
    '<For> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(
    () => (
      <For each={() => []}>
        {/* @ts-expect-error */}
        <View />
      </For>
    ),
    '<For> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(
    () => (
      <For each={() => []}>
        {/* @ts-expect-error */}
        <span>hello world</span>
      </For>
    ),
    '<For> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(
    () => (
      <For each={() => []}>
        {/* @ts-expect-error */}
        <span>
          <span />
        </span>
      </For>
    ),
    '<For> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(
    () => (
      <For each={() => []}>
        {/* @ts-expect-error */}
        <span>
          <View />
        </span>
      </For>
    ),
    '<For> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(
    // @ts-expect-error
    () => <For each={() => []}>{DCGView.const(2)}</For>,
    '<For> expects a function that constructs a DCGElement. You passed a constant'
  );

  <>
    {/* Key must be a string or number */}
    {/* @ts-expect-error */}
    <For each={() => []} key={() => ({})}></For>

    {/* @ts-expect-error */}
    <For each={() => []} key={() => false}></For>
  </>;
});

QUnit.test(
  'key={} function is called with (item, index, array)',
  function (this: { sinon: SinonStatic }, assert) {
    assert.expect(2);

    const data = { items: ['a', 'b'] };
    const key = this.sinon.spy((item: unknown) => item);

    class View extends DCGView.View {
      template() {
        return (
          <For each={() => data.items} key={key}>
            {() => <div />}
          </For>
        );
      }
    }

    mount(View, () => {
      assert.deepEqual(key.args, [
        ['a', 0, data.items],
        ['b', 1, data.items]
      ]);
      key.reset();

      data.items = ['x', 'y', 'z'];
      view.update();
      assert.deepEqual(key.args, [
        ['x', 0, data.items],
        ['y', 1, data.items],
        ['z', 2, data.items]
      ]);
    });
  }
);

QUnit.test('each={}', (assert) => {
  assert.expect(8);

  const createView = <
    Items extends unknown[] | readonly unknown[],
    Key extends ForKey = Items[number] extends ForKey ? Items[number] : ForKey
  >(
    props: Omit<ForProps<Items, Key>, 'children' | 'key'>
  ) =>
    class View extends DCGView.View<typeof props> {
      template() {
        return (
          <span>
            <For {...props} key={(item) => item}>
              {(getItem) => <span>{this.const(getItem())}</span>}
            </For>
          </span>
        );
      }
    };

  const assertEach = (errString: string, each: unknown, func?: () => unknown) =>
    assert.throws(() => {
      if (each === undefined) {
        // We are intentionally passing an incorrect `props` type here to test an error is thrown.
        // @ts-expect-error ts(2345)
        return mount(createView({}), func);
      } else {
        // We are intentionally passing an incorrect `props` type here to test an error is thrown.
        // @ts-expect-error ts(2345)
        return mount(createView({ each }), func);
      }
    }, new Error(errString));

  assertEach('<For each={}> must be a function', undefined);
  assertEach('<For each={}> must be a function', []);
  assertEach('<For each={}> must return an array', () => ({}));

  mount(createView({ each: () => ['foo', 1] }));
  assert.ok(true, 'mixed keys are allowed');

  assertEach('The key: "2" is not unique', () => ['1', '2', '2']);
  assertEach('The key: 2 is not unique', () => [1, 2, 2]);

  let items: unknown[] = [1, 2];
  assertEach(
    'The key: 1 is not unique',
    () => items,
    () => {
      items.push(3);
      view.update();
      items.push(1);
      view.update();
    }
  );

  items = [];
  mount(createView({ each: () => items }), () => {
    ['bar', 2].forEach((item) => {
      items.push(item);
      view.update();
    });
    assert.ok(true, 'mixed keys are allowed');
  });
});

QUnit.test('each items must build a DCGElement', (assert) => {
  assert.expect(1);
  const items = [1];

  class View extends DCGView.View {
    template() {
      return (
        <span>
          <For each={() => items} key={(item) => item}>
            {/* @ts-expect-error */}
            {() => ({})}
          </For>
        </span>
      );
    }
  }

  assert.throws(
    () => mount(View),
    new Error('template() must return a DCGElement')
  );
});

QUnit.test('dom nodes are moved rather than recreated', (assert) => {
  assert.expect(11);
  const items: unknown[] = [
    1,
    'two',
    { name: 'foo' },
    Symbol(),
    { name: 'bar' }
  ];

  function itemToContent(item: unknown) {
    return typeof item === 'symbol' || (typeof item === 'number' && isNaN(item))
      ? item
      : JSON.stringify(item);
  }

  class View extends DCGView.View {
    template() {
      return (
        <For each={() => items} key={(item) => item}>
          {(getItem) => <div>{this.const(itemToContent(getItem()))}</div>}
        </For>
      );
    }
  }

  mount(View, () => {
    const getChildren = () => Array.from(node.children);

    const initialChildren = getChildren();
    const oneDiv = initialChildren[0];
    const twoDiv = initialChildren[1];
    const fooDiv = initialChildren[2];
    const symbolDiv = initialChildren[3];
    const barDiv = initialChildren[4];

    assert.equal(oneDiv.textContent, '1', '1 div has correct text');
    assert.equal(twoDiv.textContent, '"two"', 'two div has correct text');
    assert.equal(
      fooDiv.textContent,
      JSON.stringify({ name: 'foo' }),
      'foo div has correct text'
    );
    assert.equal(
      symbolDiv.textContent,
      'Symbol()',
      'symbol div has correct text'
    );
    assert.equal(
      barDiv.textContent,
      JSON.stringify({ name: 'bar' }),
      'bar div has correct text'
    );

    items[0] = 'two';
    items[1] = 1;
    const fooItem = items[2];
    const barItem = items[4];
    items[2] = barItem;
    items[4] = fooItem;
    items.push(NaN); // Add NaN

    view.update();

    const updatedChildren = getChildren();
    const nanDiv = updatedChildren[5];

    assert.strictEqual(twoDiv, updatedChildren[0], 'two div moved');
    assert.strictEqual(oneDiv, updatedChildren[1], '1 div moved');
    assert.strictEqual(barDiv, updatedChildren[2], 'bar div moved');
    assert.strictEqual(symbolDiv, updatedChildren[3], 'symbol div remains');
    assert.strictEqual(fooDiv, updatedChildren[4], 'foo div moved');
    assert.strictEqual(nanDiv.textContent, 'NaN', 'NaN div added');
  });
});

QUnit.test('parent of <For> updates correctly', (assert) => {
  assert.expect(2);

  const items = [1, 2, 3];

  let class3 = true;
  class View extends DCGView.View {
    template() {
      return (
        <ul
          data-dog="woof"
          style={() => ({
            margin: '1px',
            left: '2px'
          })}
          class={() => ({
            class1: true,
            class2: false,
            class3
          })}
        >
          <For.Simple each={() => items}>
            {(item: (typeof items)[number]) => <li>{this.const(item)}</li>}
          </For.Simple>
        </ul>
      );
    }
  }

  mount(View, () => {
    assert.htmlEqual(
      node.innerHTML,
      [
        '<ul data-dog="woof" style="margin:1px;left:2px" class="class1 class3">',
        '<li>1</li>',
        '<li>2</li>',
        '<li>3</li>',
        '</ul>'
      ].join('')
    );

    class3 = false;
    view.update();
    assert.htmlEqual(
      node.innerHTML,
      [
        '<ul data-dog="woof" style="margin:1px;left:2px" class="class1">',
        '<li>1</li>',
        '<li>2</li>',
        '<li>3</li>',
        '</ul>'
      ].join('')
    );
  });
});

const buildAssertState = (assert: Assert) =>
  function (expected: readonly unknown[]) {
    const implementationView = view._childViews[0]._childViews[0];

    // @ts-expect-error TODO: Avoid accessing `_keyToView` or refactor to use public interface.
    const actualKeys = [...implementationView._keyToView.keys()].map(
      (i) => i + ''
    );
    const expectedKeys = expected.map((i) => i + '');
    actualKeys.sort();
    expectedKeys.sort();
    assert.deepEqual(actualKeys, expectedKeys);

    const keyToHTML = (key: unknown) =>
      '<div id="div-' + key + '">' + key + '</div>';

    let expectedHTML = '<span id="root">';
    expectedHTML += expected.map(keyToHTML).join('');
    expectedHTML += '</span>';
    assert.htmlEqual(node.innerHTML, expectedHTML);
  };

QUnit.test(
  'typical usage when building DCGView for items',
  function (this: { sinon: SinonStatic }, assert) {
    assert.expect(25);
    const assertState = buildAssertState(assert);

    let events: unknown[] = [];

    const toView = this.sinon.spy((name: string) => {
      events.push(['toView', name]);
      return <Item name={DCGView.const(name)} />;
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

    const makeAttrs = (func: () => string) => {
      return {
        id: DCGView.const(func.call(DCGView)),
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
        const forProps = makeProps(() => 'For');
        const rootAttrs = makeAttrs(() => 'root');

        return (
          <span {...rootAttrs}>
            <For.Simple each={() => items} {...forProps}>
              {toView}
            </For.Simple>
          </span>
        );
      }
    }

    const assertEvents = function (expected: unknown[][], msg?: string) {
      const flattenedExpected = [];
      for (const a of Array.from(expected)) {
        if (typeof a[0] === 'string') {
          flattenedExpected.push(a);
        } else {
          flattenedExpected.push(...a);
        }
      }

      assert.deepEqual(events, flattenedExpected, msg);
      return (events = []);
    };

    const buildExpectedEvent = function (eventName: string, id: unknown) {
      const make = function (expectNode: boolean) {
        if (typeof id === 'string' && id[0].toLowerCase() === id[0]) {
          // lowercase id means it's a dom node.
          if (expectNode) {
            return [eventName, id, id];
          } else {
            return [eventName, id];
          }
        } else {
          // Uppercase id means it's a View.
          return [eventName, id];
        }
      };

      switch (eventName) {
        case 'toView':
          return [eventName, id];
        case 'willMount':
          return make(false);
        case 'onMount':
          return make(true);
        case 'didMount':
          return make(true);
        case 'willUnmount':
          return make(true);
        case 'onUnmount':
          return make(false);
        case 'didUnmount':
          return make(false);
        case 'willUpdate':
          return make(true);
        case 'onUpdate':
          return make(true);
        case 'didUpdate':
          return make(true);
        default:
          throw Error(`Unknown event name: ${eventName}.`);
      }
    };

    const expectEvents = function (eventNames: string[], args: unknown[]) {
      const expected_events = [];
      for (const eventName of Array.from(eventNames)) {
        for (const arg of Array.from(args)) {
          expected_events.push(buildExpectedEvent(eventName, arg));
        }
      }
      return expected_events;
    };

    let items = [1, 2];
    mount(View, () => {
      // initial rendering
      assertState([1, 2]);
      assertEvents(
        [
          expectEvents(['toView'], [1, 2]),
          expectEvents(
            ['willMount', 'onMount', 'didMount'],
            ['View', 'root', 'Item-1', 'div-1', 'Item-2', 'div-2']
          )
        ],
        'initial render'
      );

      // remove an element
      items.splice(0, 1);
      view.update();
      assertState([2]);

      assertEvents(
        [
          expectEvents(['willUpdate'], ['View', 'root']),
          expectEvents(['onUpdate'], ['root', 'View']),
          expectEvents(['willUnmount'], ['Item-1', 'div-1']),
          expectEvents(['onUnmount', 'didUnmount'], ['div-1', 'Item-1']),
          expectEvents(['willUpdate'], ['Item-2', 'div-2']),
          expectEvents(['onUpdate', 'didUpdate'], ['div-2', 'Item-2']),
          expectEvents(['didUpdate'], ['root', 'View'])
        ],
        'remove an element'
      );

      // add an element
      items.push(3);
      view.update();

      assertState([2, 3]);
      assertEvents(
        [
          expectEvents(['willUpdate'], ['View', 'root']),
          expectEvents(['onUpdate'], ['root', 'View']),
          expectEvents(['toView'], [3]),
          expectEvents(
            ['willMount', 'onMount', 'didMount'],
            ['Item-3', 'div-3']
          ),
          expectEvents(['willUpdate'], ['Item-2', 'div-2']),
          expectEvents(['onUpdate', 'didUpdate'], ['div-2', 'Item-2']),
          expectEvents(['didUpdate'], ['root', 'View'])
        ],
        'add an element'
      );

      // add 3 elements
      items.push(4);
      items.push(5);
      items.push(6);
      view.update();
      assertState([2, 3, 4, 5, 6]);
      assertEvents(
        [
          expectEvents(['willUpdate'], ['View', 'root']),
          expectEvents(['onUpdate'], ['root', 'View']),
          expectEvents(['toView'], [4, 5, 6]),
          expectEvents(
            ['willMount', 'onMount', 'didMount'],
            ['Item-4', 'div-4', 'Item-5', 'div-5', 'Item-6', 'div-6']
          ),
          expectEvents(['willUpdate'], ['Item-2', 'div-2']),
          expectEvents(['onUpdate', 'didUpdate'], ['div-2', 'Item-2']),
          expectEvents(['willUpdate'], ['Item-3', 'div-3']),
          expectEvents(['onUpdate', 'didUpdate'], ['div-3', 'Item-3']),
          expectEvents(['didUpdate'], ['root', 'View'])
        ],
        'add 3 elements'
      );

      // reverse all elements
      items.reverse();
      view.update();
      assertState([6, 5, 4, 3, 2]);
      assertEvents(
        [
          expectEvents(['willUpdate'], ['View', 'root']),
          expectEvents(['onUpdate'], ['root', 'View']),
          expectEvents(['willUpdate'], ['Item-2', 'div-2']),
          expectEvents(['onUpdate', 'didUpdate'], ['div-2', 'Item-2']),
          expectEvents(['willUpdate'], ['Item-3', 'div-3']),
          expectEvents(['onUpdate', 'didUpdate'], ['div-3', 'Item-3']),
          expectEvents(['willUpdate'], ['Item-4', 'div-4']),
          expectEvents(['onUpdate', 'didUpdate'], ['div-4', 'Item-4']),
          expectEvents(['willUpdate'], ['Item-5', 'div-5']),
          expectEvents(['onUpdate', 'didUpdate'], ['div-5', 'Item-5']),
          expectEvents(['willUpdate'], ['Item-6', 'div-6']),
          expectEvents(['onUpdate', 'didUpdate'], ['div-6', 'Item-6']),
          expectEvents(['didUpdate'], ['root', 'View'])
        ],
        'reverse all elements'
      );

      // remove all elements
      items.splice(0, 5);
      view.update();
      assertState([]);
      assertEvents(
        [
          expectEvents(['willUpdate'], ['View', 'root']),
          expectEvents(['onUpdate'], ['root', 'View']),
          expectEvents(
            ['willUnmount'],
            [
              'Item-2',
              'div-2',
              'Item-3',
              'div-3',
              'Item-4',
              'div-4',
              'Item-5',
              'div-5',
              'Item-6',
              'div-6'
            ]
          ),
          expectEvents(
            ['onUnmount', 'didUnmount'],
            [
              'div-2',
              'Item-2',
              'div-3',
              'Item-3',
              'div-4',
              'Item-4',
              'div-5',
              'Item-5',
              'div-6',
              'Item-6'
            ]
          ),
          expectEvents(['didUpdate'], ['root', 'View'])
        ],
        'remove all elements'
      );

      // add an element to a blank list
      items.push(1);
      view.update();
      assertState([1]);
      assertEvents(
        [
          expectEvents(['willUpdate'], ['View', 'root']),
          expectEvents(['onUpdate'], ['root', 'View']),
          expectEvents(['toView'], [1]),
          expectEvents(
            ['willMount', 'onMount', 'didMount'],
            ['Item-1', 'div-1']
          ),
          expectEvents(['didUpdate'], ['root', 'View'])
        ],
        'add an element to a blank list'
      );

      // remove only element AND add an element
      items = [2];
      view.update();
      assertState([2]);
      assertEvents(
        [
          expectEvents(['willUpdate'], ['View', 'root']),
          expectEvents(['onUpdate'], ['root', 'View']),
          expectEvents(['willUnmount'], ['Item-1', 'div-1']),
          expectEvents(['onUnmount', 'didUnmount'], ['div-1', 'Item-1']),
          expectEvents(['toView'], [2]),
          expectEvents(
            ['willMount', 'onMount', 'didMount'],
            ['Item-2', 'div-2']
          ),
          expectEvents(['didUpdate'], ['root', 'View'])
        ],
        'remove only element and add an element'
      );
    });

    // the entire for component is unmounted
    assertEvents(
      [
        expectEvents(['willUnmount'], ['View', 'root', 'Item-2', 'div-2']),
        expectEvents(
          ['onUnmount', 'didUnmount'],
          ['div-2', 'Item-2', 'root', 'View']
        )
      ],
      'the entire for component is unmounted'
    );
  }
);

QUnit.test(
  'typical usage when building DCGElement for items',
  function (this: { sinon: SinonStatic }, assert) {
    assert.expect(24);
    const assertState = buildAssertState(assert);

    const toView = this.sinon.spy((item: string) => (
      <div id={DCGView.const(`div-${item}`)}>{DCGView.const(item)}</div>
    ));

    const assertToView = (expected: readonly unknown[]) => {
      expected.forEach((item) => {
        assert.ok(
          toView.calledWithMatch(item, this.sinon.match.func),
          `toView called with ${item}`
        );
      });
      return toView.reset();
    };

    class View extends DCGView.View {
      template() {
        return (
          <span id="root">
            <For.Simple each={() => items}>{toView}</For.Simple>
          </span>
        );
      }
    }

    let items = [1, 2];
    mount(View, () => {
      // initial rendering
      assertState([1, 2]);
      assertToView([1, 2]);

      // remove an element
      items.splice(0, 1);
      view.update();
      assertState([2]);
      assertToView([]);

      // add an element
      items.push(3);
      view.update();
      assertState([2, 3]);
      assertToView([3]);

      // add 3 elements
      items.push(4);
      items.push(5);
      items.push(6);
      view.update();
      assertState([2, 3, 4, 5, 6]);
      assertToView([4, 5, 6]);

      // reverse all elements
      items.reverse();
      view.update();
      assertState([6, 5, 4, 3, 2]);
      assertToView([]);

      // remove all elements
      items.splice(0, 5);
      view.update();
      assertState([]);
      assertToView([]);

      // add an element
      items.push(1);
      view.update();
      assertState([1]);
      assertToView([1]);

      // add an element and remove an element
      items = [2];
      view.update();
      assertState([2]);
      assertToView([2]);
    });
  }
);

QUnit.test('For within For', (assert) => {
  assert.expect(3);

  type CharacterList = { key: string; characters: string[] };
  const letters: CharacterList = {
    key: 'letters',
    characters: ['a', 'b', 'c']
  };
  const numbers: CharacterList = {
    key: 'numbers',
    characters: ['1', '2', '3']
  };
  const punctuation: CharacterList = {
    key: 'punctuation',
    characters: ['!', '@', '#']
  };

  let listOfLists = [letters, numbers, punctuation];

  class View extends DCGView.View {
    template() {
      return (
        <span id="root">
          <For each={() => listOfLists} key={(list) => list.key}>
            {(getItem) => (
              <For.Simple each={() => getItem().characters}>
                {(character) => <span>{() => character}</span>}
              </For.Simple>
            )}
          </For>
        </span>
      );
    }
  }

  mount(View, () => {
    // initial rendering
    assert.equal(findSingleRootTestNode().textContent, 'abc123!@#');

    // move letters to after numbers
    listOfLists = [numbers, letters, punctuation];
    view.update();
    assert.equal(findSingleRootTestNode().textContent, '123abc!@#');

    // reverse all numbers
    const originalNumbers = numbers.characters.slice();
    numbers.characters[0] = originalNumbers[2];
    numbers.characters[1] = originalNumbers[1];
    numbers.characters[2] = originalNumbers[0];

    view.update();
    assert.equal(findSingleRootTestNode().textContent, '321abc!@#');
  });
});

QUnit.test('duplicate keys throw errors', (assert) => {
  assert.expect(1);

  const { For } = DCGView.Components;

  const items = [
    { id: 1, value: 'a' },
    { id: 2, value: 'b' },
    { id: 3, value: 'c' }
  ];

  class View extends DCGView.View {
    template() {
      return (
        <For each={() => items} key={(item) => item.id}>
          {(getItem) => <div>{getItem().value}</div>}
        </For>
      );
    }
  }

  mount(View, () => {
    items.push({ id: 2, value: 'd' });
    assert.throws(
      () => view.update(),
      /The key: 2 is not unique/,
      'Throws error for duplicate key'
    );
  });
});

QUnit.test(
  'reflects item updated in-place when keyed and not destructured',
  (assert) => {
    assert.expect(2);

    const items = [{ name: 'Foo' }, { name: 'Bar' }];

    class View extends DCGView.View {
      template() {
        return (
          <For each={() => items} key={(_, index) => index}>
            {(getItem) => <>{() => getItem().name}</>}
          </For>
        );
      }
    }

    mount(View, () => {
      assert.deepEqual(node.textContent, 'FooBar');
      items[0].name = 'Baz';
      view.update();
      assert.deepEqual(node.textContent, 'BazBar');
    });
  }
);

QUnit.test('reflects item updated immutably when keyed', (assert) => {
  assert.expect(2);

  const items = [{ name: 'Foo' }, { name: 'Bar' }];

  class View extends DCGView.View {
    template() {
      return (
        <For each={() => items} key={(_, index) => index}>
          {(getItem) => <>{() => getItem().name}</>}
        </For>
      );
    }
  }

  mount(View, () => {
    assert.deepEqual(node.textContent, 'FooBar');
    items[0] = { name: 'Baz' };
    view.update();
    assert.deepEqual(node.textContent, 'BazBar');
  });
});

QUnit.test(
  'number and string keys with same meaning are distinct',
  (assert) => {
    assert.expect(4);

    const items = [1, '1'];

    class View extends DCGView.View {
      template() {
        return (
          <For each={() => items} key={(item) => item}>
            {(getItem) => <div>{() => getItem()}</div>}
          </For>
        );
      }
    }

    mount(View, () => {
      const getChildren = () => Array.from(node.children);

      const initialChildren = getChildren();
      const numberDiv = initialChildren[0];
      const stringDiv = initialChildren[1];

      assert.equal(numberDiv.textContent, '1', 'number div has correct text');
      assert.equal(stringDiv.textContent, '1', 'string div has correct text');

      items[0] = '1';
      items[1] = 1;

      view.update();

      const updatedChildren = getChildren();

      assert.strictEqual(stringDiv, updatedChildren[0], 'string div moved');
      assert.strictEqual(numberDiv, updatedChildren[1], 'number div moved');
    });
  }
);

QUnit.test('beforeKey is checked for existence, not value', (assert) => {
  assert.expect(2);

  const items = [
    { name: 'Foo', key: 0 },
    { name: 'Bar', key: 1 }
  ];

  class View extends DCGView.View {
    template() {
      return (
        <For each={() => items} key={(item) => item.key}>
          {(getItem) => <>{() => getItem().name}</>}
        </For>
      );
    }
  }

  mount(View, () => {
    assert.deepEqual(node.textContent, 'FooBar');
    items.splice(0, 0, { name: 'Baz', key: 2 });
    view.update();
    assert.deepEqual(node.textContent, 'BazFooBar');
  });
});

QUnit.test(
  'getItem() and getIndex() return last known value even if item is removed from the array',
  (assert) => {
    assert.expect(13);

    const items = [
      { name: 'Foo', key: 0 },
      { name: 'Bar', key: 1 }
    ];

    const viewFuncParams: {
      getItem: () => { name: string; key: number };
      getIndex: () => number;
    }[] = [];

    class View extends DCGView.View {
      template() {
        return (
          <For each={() => items} key={(item) => item.key}>
            {(getItem, getIndex) => {
              viewFuncParams.push({ getItem, getIndex });
              return <>{() => getItem().name}</>;
            }}
          </For>
        );
      }
    }

    mount(View, () => {
      assert.equal(viewFuncParams.length, 2, 'view function called twice');
      const fooParams = viewFuncParams[0];
      const barParams = viewFuncParams[1];
      assert.equal(fooParams.getItem().name, 'Foo', 'foo item name correct');
      assert.equal(fooParams.getIndex(), 0, 'foo index correct');
      assert.equal(
        viewFuncParams[1].getItem().name,
        'Bar',
        'bar item name correct'
      );
      assert.equal(viewFuncParams[1].getIndex(), 1, 'bar index correct');

      const tmp = items[0];
      items[0] = items[1];
      items[1] = tmp;

      view.update();
      assert.equal(
        fooParams.getItem().name,
        'Foo',
        'foo item name correct after swap'
      );
      assert.equal(fooParams.getIndex(), 1, 'foo index correct after swap');
      assert.equal(
        barParams.getItem().name,
        'Bar',
        'bar item name correct after swap'
      );
      assert.equal(barParams.getIndex(), 0, 'bar index correct after swap');

      const removedItem = items.splice(0, 1)[0];
      removedItem.name = 'Removed';
      view.update();

      assert.equal(
        fooParams.getItem().name,
        'Foo',
        'remaining item still finds item after remove'
      );
      assert.equal(
        fooParams.getIndex(),
        0,
        'remaining index returns 0 after remove'
      );
      assert.equal(
        barParams.getItem().name,
        'Removed',
        'removed item name correct after remove'
      );
      assert.equal(
        barParams.getIndex(),
        0,
        'removed item index still 0 after remove'
      );
    });
  }
);
