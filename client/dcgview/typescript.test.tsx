import * as DCGView from 'dcgview';

import * as RootViewHelper from './root-view-helper.test.js';

const { If, Textarea } = DCGView.Components;

QUnit.module('DCGViewCore::TSX tests');

QUnit.test('generally seems to work', (assert) => {
  assert.expect(1);

  class View extends DCGView.View<{ c: () => number }> {
    attrs: { 'data-b': () => number; 'data-c': () => number };
    boundProp = 'is-bound';

    getBoundProp() {
      return this.boundProp;
    }

    getABC(i: number) {
      return this.const('abc' + i);
    }

    createElementZ() {
      return this.const('yup');
    }

    init() {
      this.attrs = {
        'data-b': this.const(5),
        'data-c': this.props.c
      };
    }

    template() {
      const staticList = [1, 2, 3].map((i) => (
        <div>
          {this.getABC(i)} {} {() => true}{' '}
        </div>
      ));
      return (
        <div
          class={() => ({
            class1: true,
            class2: false,
            class3: true
          })}
        >
          {this.createElementZ()}
          <span data-a="1" {...this.attrs} data-d={0}>
            {this.getABC(0)}
          </span>
          {staticList}
          <div>{this.bindFn(this.getBoundProp)}</div>
        </div>
      );
    }
  }

  RootViewHelper.mount(View, { c: () => 2 }, () => {
    assert.htmlEqual(
      RootViewHelper.node.innerHTML,
      [
        '<div class="class1 class3">',
        'yup',
        '<span data-a="1" data-b="5" data-c="2" data-d="0">abc0</span>',
        '<div>abc1  true </div>',
        '<div>abc2  true </div>',
        '<div>abc3  true </div>',
        '<div>is-bound</div>',
        '</div>'
      ].join('')
    );
  });
});

QUnit.test('renders literal children', (assert) => {
  assert.expect(1);

  class View extends DCGView.View<{ c: () => number }> {
    template() {
      return <div>this is text</div>;
    }
  }

  RootViewHelper.mount(View, { c: () => 2 }, () => {
    assert.htmlEqual(RootViewHelper.node.innerHTML, '<div>this is text</div>');
  });
});

QUnit.test('const wraps attributes', (assert) => {
  assert.expect(1);

  class View extends DCGView.View {
    template() {
      return (
        <div
          id="this is text"
          data-number={1}
          data-positive-number={+1}
          data-negative-number={-1}
          data-decimal={0.1}
          data-scientific-notation={10e1}
        />
      );
    }
  }

  RootViewHelper.mount(View, {}, () => {
    assert.htmlEqual(
      RootViewHelper.node.innerHTML,
      '<div id="this is text" data-number="1" data-positive-number="1" data-negative-number="-1" data-decimal="0.1" data-scientific-notation="100"></div>'
    );
  });
});

QUnit.test('.bindIfMounted works', async (assert) => {
  assert.expect(7);

  const calls: string[] = [];
  let innerView!: InnerView;
  let shouldShowInnerView = true;
  let promise: Promise<unknown>;
  let resolvePromise!: (a: string) => void;

  class InnerView extends DCGView.View {
    didMount() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      innerView = this;
    }

    template() {
      return <div />;
    }

    testThis() {
      return 'this works';
    }

    onResolve(str: string) {
      // tests that both `this` is correct and that we can pass in arguments
      calls.push(this.testThis() + '|' + str);
    }

    buildPromise() {
      return new Promise<string>((resolve) => {
        resolvePromise = resolve;
      }).then(this.bindIfMounted(this.onResolve));
    }
  }

  class View extends DCGView.View<{ showView: () => boolean }> {
    template() {
      return (
        <If predicate={() => this.props.showView()}>{() => <InnerView />}</If>
      );
    }
  }

  const qunitFixture = document.getElementById('qunit-fixture')!;
  const view = DCGView.mountToNode(View, qunitFixture, {
    showView: () => shouldShowInnerView
  });

  assert.deepEqual(calls, [], 'no calls yet');

  promise = innerView.buildPromise();
  view.update();
  assert.deepEqual(calls, [], 'still no calls yet');
  resolvePromise('1');
  await promise;
  assert.deepEqual(calls, ['this works|1'], 'resolve called');

  promise = innerView.buildPromise();
  view.update();
  assert.deepEqual(calls, ['this works|1'], 'still only 1 call');
  resolvePromise('2');
  await promise;
  assert.deepEqual(
    calls,
    ['this works|1', 'this works|2'],
    'resolve called again'
  );

  shouldShowInnerView = false;
  promise = innerView.buildPromise();
  view.update();
  assert.deepEqual(
    calls,
    ['this works|1', 'this works|2'],
    'still only 2 calls'
  );
  resolvePromise('3');
  await promise;
  assert.deepEqual(
    calls,
    ['this works|1', 'this works|2'],
    'resolve not called after unmounting'
  );

  DCGView.unmountFromNode(qunitFixture);
});

QUnit.test('disallowed elements cause error', (assert) => {
  assert.expect(1);
  class View extends DCGView.View {
    template() {
      return (
        <div>
          {/* @ts-expect-error ts(2339) */}
          <textarea />
          {/* @ts-expect-error ts(2339) */}
          <p />
        </div>
      );
    }
  }
  assert.ok(View);
});

QUnit.test('invalid attributes cause error', (assert) => {
  assert.expect(1);
  class View extends DCGView.View {
    template() {
      return (
        <div>
          {/* Invalid attribute */}
          {/* @ts-expect-error ts(2322) */}
          <div invalid="true" />

          {/* Invalid attribute for element */}
          {/* @ts-expect-error ts(2322) */}
          <div src="test" />

          {/* Invalid attribute value */}
          {/* @ts-expect-error ts(2322) */}
          <img src={1} />

          {/* Invalid style attribute due to invalid CSS property */}
          {/* @ts-expect-error ts(2322) */}
          <span style={() => ({ 'accent-color': false })} />

          {/* Style attribute supports CSS variables */}
          <span style={() => ({ '--variable': 'string' })} />

          {/* TODO: Expect an error and update the type to not accept any string
           * once Knox only uses standard CSS properties.
           */}
          {/* Style attribute supports non-standard properties */}
          <span style={() => ({ foo: 'string' })} />

          {/* Invalid attribute due to non-standard value */}
          {/* @ts-expect-error ts(2322) */}
          <span style={() => ({ color: 1 })} />

          {/* Style attribute supports string getter */}
          <span style={() => 'color: red'} />

          {/* Style attribute supports string */}
          <span style="color: red" />

          {/* Class attribute supports Record */}
          <span class={() => ({ class1: true, class2: false })} />

          {/* Invalid class attribute Record values */}
          {/* @ts-expect-error ts(2322) */}
          <span class={() => ({ class1: 'string' })} />

          {/* Class attribute supports string getter */}
          <span class={() => 'class1 class2'} />

          {/* Class attribute supports string */}
          <span class="class1 class2" />

          {/* Invalid attribute name and literal value for HTML component */}
          {/* @ts-expect-error ts(2322) */}
          <Textarea foo="bar" />

          {/* Invalid attribute name and getter value for HTML component */}
          {/* @ts-expect-error ts(2322) */}
          <Textarea foo={() => 'bar'} />

          {/* Invalid attribute name and constant value for HTML component */}
          {/* @ts-expect-error ts(2322) */}
          <Textarea foo={DCGView.const('bar')} />

          {/* Invalid attribute value for HTML component */}
          {/* @ts-expect-error ts(2322) */}
          <Textarea value={1} />

          {/* Invalid attribute value getter for HTML component */}
          {/* @ts-expect-error ts(2322) */}
          <Textarea value={DCGView.const(1)} />

          {/* Missing required attribute for HTML component */}
          {/* @ts-expect-error ts(2322) */}
          <Textarea onInput={() => void 0} />

          {/* Valid HTML component attributes */}
          <Textarea value={DCGView.const('foo')} onInput={() => void 0} />
          <Textarea value={() => 'foo'} onInput={() => void 0} />

          {/* Invalid HTML component attribute on DCGElement */}
          {/* @ts-expect-error ts(2322) */}
          <div readOnly />
          {/* @ts-expect-error ts(2322) */}
          <div readOnly="true" />
          {/* @ts-expect-error ts(2322) */}
          <div readOnly={this.const(true)} />
          {/* @ts-expect-error ts(2322) */}
          <div readOnly={() => true} />
        </div>
      );
    }
  }
  assert.ok(View);
});

QUnit.test(
  'properties that normally only accept numbers or booleans can accept string versions',
  (assert) => {
    assert.expect(1);
    class View extends DCGView.View {
      template() {
        return (
          <div>
            <img height={40} />
            <img height="40" />

            {/* Invalid string */}
            {/* @ts-expect-error ts(2322) */}
            <img height="foo" />

            <img hidden />
            <img hidden={true} />
            <img hidden={false} />
            <img hidden="true" />
            <img hidden="false" />

            {/* Invalid string */}
            {/* @ts-expect-error ts(2322) */}
            <img hidden="foo" />

            <div tabIndex="0" />
            <div tabIndex={0} />

            {/* Invalid string */}
            {/* @ts-expect-error ts(2322) */}
            <div tabIndex="foo" />
          </div>
        );
      }
    }
    assert.ok(View);
  }
);

QUnit.test('void elements disallow children', (assert) => {
  assert.expect(0);

  <>
    {/* @ts-expect-error */}
    <img>foo</img>
    {/* @ts-expect-error */}
    <input>foo</input>
    {/* @ts-expect-error */}
    <area>foo</area>
    {/* @ts-expect-error */}
    <br>foo</br>
    {/* @ts-expect-error */}
    <col>foo</col>
    {/* @ts-expect-error */}
    <embed>foo</embed>
    {/* @ts-expect-error */}
    <hr>foo</hr>
    {/* @ts-expect-error */}
    <link>foo</link>
    {/* @ts-expect-error */}
    <meta>foo</meta>
    {/* @ts-expect-error */}
    <param>foo</param>
    {/* @ts-expect-error */}
    <source>foo</source>
    {/* @ts-expect-error */}
    <track>foo</track>
  </>;
});

QUnit.test('view properties types convert to functions', (assert) => {
  assert.expect(3);

  class View extends DCGView.View<{
    foo: string;
    bar: () => string;
    baz: (value: number) => void;
  }> {
    didMount() {
      this.props.baz(0);
    }

    template() {
      return (
        <>
          {this.props.foo()}
          {this.props.bar()}
        </>
      );
    }
  }

  // @ts-expect-error `foo` is not a function
  new View({ foo: 'bar', bar: () => 'foo', baz: (value) => {} });

  // @ts-expect-error `bar` is not a function
  new View({ foo: () => 'bar', bar: 'foo', baz: (value) => {} });

  // @ts-expect-error `baz` is not a function
  new View({ foo: () => 'bar', bar: () => 'foo', baz: 1 });

  assert.throws(
    () =>
      // @ts-expect-error Sanity check mounting types
      RootViewHelper.mount(View, { foo: 'bar', bar: 'foo', baz: 'baz' }),
    'this.props.foo is not a function'
  );

  RootViewHelper.mount(
    View,
    {
      foo: () => 'bar',
      bar: () => 'foo',
      baz: (value) => {
        assert.equal(value, 0);
      }
    },
    () => {
      assert.htmlEqual(RootViewHelper.node.innerHTML, 'barfoo');
    }
  );
});
