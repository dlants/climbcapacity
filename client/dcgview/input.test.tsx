import * as DCGView from 'dcgview';
import { type SinonStatic } from 'sinon';

import { mount, node, view } from './root-view-helper.test';

const { Input } = DCGView.Components;

QUnit.module('DCGViewCore::DCGView.Components.Input');

QUnit.test('requires value prop', (assert) => {
  assert.expect(1);
  assert.throws(() => {
    class View extends DCGView.View {
      template() {
        // We are intentionally omitting the `value` prop here to test an error is thrown.
        // @ts-expect-error ts(2322)
        return <Input />;
      }
    }

    mount(View);
  }, new Error('<Input> expects a "value={}" prop'));
});

const cases = [
  [undefined, ''],
  [null, ''],
  ['', ''],
  ['abc 123', 'abc 123'],
  ['  ', '  '],
  [5, '5'],
  [false, 'false'],
  [true, 'true'],
  [{}, '[object Object]']
] as const;

QUnit.test('starts off with correct value', (assert) => {
  assert.expect(cases.length * 2);

  let data: (typeof cases)[number][0] = '';
  class View extends DCGView.View {
    template() {
      return (
        <Input
          value={() => data as string}
          onInput={() => {
            throw new Error('called onInput and should not have');
          }}
        />
      );
    }
  }

  Array.from(cases).map((c) =>
    (function (c) {
      data = c[0];
      return mount(View, () => {
        const input = node.children[0] as HTMLInputElement;

        assert.strictEqual(input.value, c[1]);
        assert.htmlEqual(
          node.innerHTML,
          `<input value='${c[1]}' tabindex='0' />`
        );
      });
    })(c)
  );
});

QUnit.test('updates to correct value', (assert) => {
  assert.expect(cases.length * 2);

  let data: (typeof cases)[number][0] = '';
  class View extends DCGView.View {
    template() {
      return (
        <Input
          value={() => data as string}
          onInput={() => {
            throw new Error('called onInput and should not have');
          }}
        />
      );
    }
  }

  Array.from(cases).map((c) =>
    (function (c) {
      data = 'starting value';
      mount(View, () => {
        const input = node.children[0] as HTMLInputElement;

        data = c[0];
        view.update();
        assert.strictEqual(input.value, c[1]);
        assert.htmlEqual(
          node.innerHTML,
          "<input value='starting value' tabindex='0' />"
        );
      });
    })(c)
  );
});

QUnit.test('keeps value synced', (assert) => {
  assert.expect(4);

  let data: (typeof cases)[number][0] = 'abc';
  class View extends DCGView.View {
    template() {
      return (
        <Input
          value={() => (data as string).toUpperCase()}
          onInput={(val) => (data = val)}
        />
      );
    }
  }
  mount(View, () => {
    const input = node.children[0] as HTMLInputElement;

    assert.strictEqual(input.value, 'ABC');
    assert.htmlEqual(node.innerHTML, "<input value='ABC' tabindex='0' />");

    input.value = 'efg - 123';
    input.dispatchEvent(new Event('input'));

    assert.strictEqual(input.value, 'EFG - 123');
    assert.htmlEqual(node.innerHTML, "<input value='ABC' tabindex='0' />");
  });
});

QUnit.test(
  'attrs pass through',
  function (this: { sinon: SinonStatic }, assert) {
    assert.expect(6);

    const focusSpy = this.sinon.spy();
    const didMountSpy = this.sinon.spy();

    class View extends DCGView.View {
      template() {
        return (
          <Input
            value={this.const('foo')}
            placeholder={this.const('bar')}
            type={this.const('password')}
            onInput={() => void 0}
            onFocus={focusSpy}
            didMount={didMountSpy}
            class={() => ({
              a: true,
              b: false,
              c: true
            })}
          />
        );
      }
    }
    mount(View, () => {
      const input = node.children[0] as HTMLInputElement;

      assert.equal(didMountSpy.callCount, 1);
      assert.deepEqual(didMountSpy.args[0], [input]);

      assert.strictEqual(input.value, 'foo');
      assert.htmlEqual(
        node.innerHTML,
        "<input value='foo' placeholder='bar' type='password' class='a c' tabindex='0' />"
      );

      assert.equal(focusSpy.callCount, 0);
      input.focus();
      assert.equal(focusSpy.callCount, 1, 'onFocus called');
    });
  }
);

QUnit.test('disabled accepts truthy prop', (assert) => {
  assert.expect(4);

  let isDisabled: boolean = true;

  class View extends DCGView.View {
    template() {
      return (
        <Input
          value={this.const('foo')}
          disabled={() => isDisabled}
          onInput={() => void 0}
        />
      );
    }
  }
  mount(View, () => {
    const input = node.children[0] as HTMLInputElement;
    assert.equal(input.disabled, true);

    isDisabled = false;
    view.update();
    assert.equal(input.disabled, false);

    isDisabled = true;
    view.update();
    assert.equal(input.disabled, true);

    isDisabled = false;
    view.update();
    assert.equal(input.disabled, false);
  });
});

QUnit.test('tabIndex not supplied and updates with disabled prop', (assert) => {
  assert.expect(2);

  let isDisabled = true;

  class View extends DCGView.View {
    template() {
      return (
        <Input
          value={this.const('foo')}
          disabled={() => isDisabled}
          onInput={() => void 0}
        />
      );
    }
  }
  mount(View, () => {
    assert.htmlEqual(
      node.innerHTML,
      "<input value='foo' disabled='true' tabindex='-1' />"
    );

    isDisabled = false;
    view.update();
    assert.htmlEqual(node.innerHTML, "<input value='foo' tabindex='0' />");
  });
});

QUnit.test(
  'tabIndex is supplied and does not update with disabled prop',
  (assert) => {
    assert.expect(2);

    let isDisabled = true;

    class View extends DCGView.View {
      template() {
        return (
          <Input
            value={this.const('foo')}
            disabled={() => isDisabled}
            onInput={() => void 0}
            tabIndex={this.const(0)}
          />
        );
      }
    }
    mount(View, () => {
      assert.htmlEqual(
        node.innerHTML,
        "<input value='foo' disabled='true' tabindex='0' />"
      );

      isDisabled = false;
      view.update();
      assert.htmlEqual(node.innerHTML, "<input value='foo' tabindex='0' />");
    });
  }
);

QUnit.test('disallows children', (assert) => {
  assert.expect(0);

  // @ts-expect-error
  <Input value={DCGView.const('')}>foo</Input>;
});
