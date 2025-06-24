import * as DCGView from 'dcgview';
import { type SinonStatic } from 'sinon';

import { mount, node, view } from './root-view-helper.test';

const { Textarea } = DCGView.Components;

QUnit.module('DCGViewCore::DCGView.Components.Textarea');

QUnit.test('requires value prop', (assert) => {
  assert.expect(1);
  return assert.throws(() => {
    class View extends DCGView.View {
      template() {
        // We are intentionally not passing props to test that an error is thrown.
        // @ts-expect-error ts(2322)
        return <Textarea />;
      }
    }

    mount(View);
  }, new Error('<Textarea> expects a "value={}" prop'));
});

QUnit.test('requires onInput prop', (assert) => {
  assert.expect(1);
  assert.throws(() => {
    class View extends DCGView.View {
      template() {
        // We are intentionally passing an incorrect value to the `value` prop to test that an error is thrown.
        // @ts-expect-error ts(2322)
        return <Textarea value={() => void 0} />;
      }
    }
    mount(View);
  }, new Error('<Textarea> expects an "onInput={}" prop'));
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
        <Textarea
          value={() => data as string}
          onInput={function () {
            throw new Error('called onInput and should not have');
          }}
        />
      );
    }
  }

  Array.from(cases).map((c) =>
    (function (c) {
      data = c[0];
      mount(View, () => {
        const textarea = node.children[0] as HTMLTextAreaElement;

        assert.strictEqual(textarea.value, c[1]);
        assert.htmlEqual(node.innerHTML, `<textarea>${c[1]}</textarea>`);
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
        <Textarea
          value={() => data as string}
          onInput={function () {
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
        const textarea = node.children[0] as HTMLTextAreaElement;

        data = c[0];
        view.update();
        assert.strictEqual(textarea.value, c[1]);
        assert.htmlEqual(node.innerHTML, '<textarea>starting value</textarea>');
      });
    })(c)
  );
});

QUnit.test('keeps value synced', (assert) => {
  assert.expect(4);

  let data = 'abc';

  class View extends DCGView.View {
    template() {
      return (
        <Textarea
          value={() => data.toUpperCase()}
          onInput={(val) => (data = val)}
        />
      );
    }
  }

  mount(View, () => {
    const textarea = node.children[0] as HTMLTextAreaElement;

    assert.strictEqual(textarea.value, 'ABC');
    assert.htmlEqual(node.innerHTML, '<textarea>ABC</textarea>');

    textarea.value = 'efg - 123';
    textarea.dispatchEvent(new Event('input'));

    assert.strictEqual(textarea.value, 'EFG - 123');
    assert.htmlEqual(node.innerHTML, '<textarea>ABC</textarea>');
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
          <Textarea
            value={this.const('foo')}
            placeholder={this.const('bar')}
            rows={this.const(3)}
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
      const textarea = node.children[0] as HTMLTextAreaElement;

      assert.equal(didMountSpy.callCount, 1);
      assert.deepEqual(didMountSpy.args[0], [textarea]);

      assert.strictEqual(textarea.value, 'foo');
      assert.htmlEqual(
        node.innerHTML,
        "<textarea placeholder='bar' rows='3' class='a c'>foo</textarea>"
      );

      assert.equal(focusSpy.callCount, 0);
      textarea.focus();
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
        <Textarea
          value={this.const('foo')}
          disabled={() => isDisabled}
          onInput={() => void 0}
        />
      );
    }
  }

  mount(View, () => {
    const input = node.children[0] as HTMLTextAreaElement;
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

QUnit.test('disallows children', (assert) => {
  assert.expect(0);

  // @ts-expect-error
  <Textarea value={DCGView.const('')}>foo</Textarea>;
});
