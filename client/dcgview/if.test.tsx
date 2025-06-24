import * as DCGView from 'dcgview';

import { mount, node, view } from './root-view-helper.test';

const { If } = DCGView.Components;

QUnit.module('DCGViewCore::DCGView.Components.If');

QUnit.test('signature validation', (assert) => {
  assert.expect(10);

  class View extends DCGView.View {
    template() {
      return <div />;
    }
  }

  const assertSignature = (template: Function, error?: string) =>
    assert.throws(
      () =>
        mount(
          class _ extends DCGView.View {
            template() {
              return template.call(this);
            }
          }
        ),
      error ? new Error(error) : undefined
    );

  // `<If>` expects a child.
  // @ts-expect-error
  assertSignature(() => <If predicate={DCGView.const(true)} />);

  assertSignature(() => (
    // `<If>` expects a single child.
    // @ts-expect-error
    <If predicate={DCGView.const(true)}>
      <div />
      <div />
    </If>
  ));

  assertSignature(() => (
    // `<If>` expects a single child.
    // @ts-expect-error
    <If predicate={DCGView.const(true)}>
      {() => <div />}
      {() => <div />}
    </If>
  ));

  // TypeScript won't allow this, but we want to make sure we throw an error if a predicate isn't provided.
  // @ts-expect-error ts(2741)
  assertSignature(() => <If />, '<If predicate={}> must be a function');

  assertSignature(
    () => (
      <If predicate={DCGView.const(true)}>
        {/* @ts-expect-error */}
        <span />
      </If>
    ),
    '<If> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(
    () => (
      <If predicate={DCGView.const(true)}>
        {/* @ts-expect-error */}
        <View />
      </If>
    ),
    '<If> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(
    () => (
      <If predicate={DCGView.const(true)}>
        {/* @ts-expect-error */}
        <span>hello world</span>
      </If>
    ),
    '<If> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(
    () => (
      <If predicate={DCGView.const(true)}>
        {/* @ts-expect-error */}
        <span>
          <span />
        </span>
      </If>
    ),
    '<If> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(
    () => (
      <If predicate={DCGView.const(true)}>
        {/* @ts-expect-error */}
        <span>
          <View />
        </span>
      </If>
    ),
    '<If> expects a function that constructs a DCGElement. You passed a DCGElement directly'
  );

  assertSignature(() => {
    return (
      // @ts-expect-error
      <If predicate={DCGView.const(true)}>{DCGView.const('hello world')}</If>
    );
  }, '<If> expects a function that constructs a DCGElement. You passed a constant');
});

QUnit.test('false predicate mounts a placeholder', (assert) => {
  assert.expect(2);
  class View extends DCGView.View {
    template() {
      return (
        <If predicate={DCGView.const(false)}>
          {function () {
            throw new Error('should not call this');
          }}
        </If>
      );
    }
  }
  mount(View, () => {
    assert.equal(node.childNodes.length, 1);
    assert.equal(node.firstChild?.nodeName, '#text');
  });
});

QUnit.test('true predicate builds the actual child view', (assert) => {
  assert.expect(1);
  class View extends DCGView.View {
    template() {
      return <If predicate={DCGView.const(true)}>{() => <div>foo</div>}</If>;
    }
  }
  mount(View, () => {
    return assert.htmlEqual(node.innerHTML, '<div>foo</div>');
  });
});

QUnit.test('must return JSX', (assert) => {
  assert.expect(1);
  class View extends DCGView.View {
    template() {
      // @ts-expect-error
      return <If predicate={DCGView.const(true)}>{() => ({})}</If>;
    }
  }

  // @ts-expect-error Expected function child returning JSX
  <If predicate={DCGView.const(true)}>{() => undefined}</If>;

  assert.throws(
    () => mount(View),
    new Error('template() must return a DCGElement')
  );
});

QUnit.test('dom not updated if predicate stays the same', (assert) => {
  assert.expect(3);

  let name: string | number = 1;
  class View extends DCGView.View {
    template() {
      return (
        <If predicate={DCGView.const(true)}>{() => <div>{() => name}</div>}</If>
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

QUnit.test('dom node added if element specified', (assert) => {
  assert.expect(3);

  let predicate = false;
  class View extends DCGView.View {
    template() {
      return (
        <If predicate={() => predicate}>{() => <span>hello world</span>}</If>
      );
    }
  }

  mount(View, () => {
    assert.equal(node.childNodes.length, 1);
    assert.equal(node.firstChild?.nodeName, '#text');

    predicate = true;
    view.update();

    assert.htmlEqual(node.innerHTML, '<span>hello world</span>');
  });
});

QUnit.test('all falsy predicates are the same', (assert) => {
  const cases = [false, '', null, undefined, 0] as const;
  assert.expect(cases.length * 2);

  let predicate: (typeof cases)[number] = false;
  class View extends DCGView.View {
    template() {
      return (
        <If predicate={() => predicate as boolean}>
          {function () {
            throw new Error('should not call this');
          }}
        </If>
      );
    }
  }

  mount(View, () => {
    return (() => {
      const result = [];
      for (const f of Array.from(cases)) {
        predicate = f;
        view.update();
        result.push(
          assert.equal(node.childNodes.length, 1),
          assert.equal(node.firstChild?.nodeName, '#text')
        );
      }
      return result;
    })();
  });
});

QUnit.test('all truthy cases are the same', (assert) => {
  const cases = [true, 1, 'abc', {}, []] as const;
  assert.expect(cases.length + 1);

  let toViewCalls = 0;
  let predicate: (typeof cases)[number] = true;
  class View extends DCGView.View {
    template() {
      return (
        <If predicate={() => predicate as boolean}>
          {function () {
            toViewCalls++;
            return <div>hello world</div>;
          }}
        </If>
      );
    }
  }

  mount(View, () => {
    return (() => {
      const result = [];
      for (const t of Array.from(cases)) {
        predicate = t;
        view.update();
        result.push(assert.equal(node.innerHTML, '<div>hello world</div>'));
      }
      return result;
    })();
  });

  assert.equal(toViewCalls, 1);
});
