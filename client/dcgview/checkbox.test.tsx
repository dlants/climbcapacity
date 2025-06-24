import * as DCGView from 'dcgview';
import { type SinonStatic } from 'sinon';

import { mount, node, view } from './root-view-helper.test';

const { Checkbox } = DCGView.Components;

const getTypeCoercedBoolean = (value: unknown): value is boolean =>
  value as boolean;

QUnit.module('DCGViewCore::DCGView.Components.Checkbox');

QUnit.test('requires checked prop', (assert) => {
  assert.expect(1);
  assert.throws(() => {
    class View extends DCGView.View {
      template() {
        // We are intentionally omitting `checked` here to ensure an error is thrown.
        // @ts-expect-error ts(2322)
        return <Checkbox />;
      }
    }

    mount(View);
  }, new Error('<Checkbox> expects a "checked={}" prop'));
});

QUnit.test('requires onChange prop', (assert) => {
  assert.expect(1);
  assert.throws(() => {
    class View extends DCGView.View {
      template() {
        // We are intentionally omitting `onChange` here to ensure an error is thrown.
        // @ts-expect-error ts(2322)
        return <Checkbox checked={DCGView.const(false)} />;
      }
    }
    mount(View);
  }, new Error('<Checkbox> expects an "onChange={}" prop'));
});

const cases = [
  [undefined, ''],
  [null, ''],
  ['', ''],
  ['abc 123', 'checked="true"'],
  ['  ', 'checked="true"'],
  [5, 'checked="true"'],
  [false, ''],
  [true, 'checked="true"'],
  [{}, 'checked="true"']
] as const;

QUnit.test('starts off with correct value', (assert) => {
  assert.expect(cases.length * 2);

  let data: (typeof cases)[number][0] = '';

  class View extends DCGView.View {
    template() {
      return (
        <Checkbox
          checked={() => getTypeCoercedBoolean(data)}
          onChange={function () {
            throw new Error('called onChange and should not have');
          }}
        />
      );
    }
  }

  Array.from(cases).map((c) =>
    (function (c) {
      data = c[0];
      mount(View, () => {
        const input = node.children[0] as HTMLInputElement;

        assert.strictEqual(input.checked, !!c[0]);
        assert.htmlEqual(node.innerHTML, `<input type='checkbox' ${c[1]} />`);
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
        <Checkbox
          checked={() => getTypeCoercedBoolean(data)}
          onChange={function () {
            throw new Error('called onChange and should not have');
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
        assert.strictEqual(input.checked, !!c[0]);
        assert.htmlEqual(
          node.innerHTML,
          "<input type='checkbox' checked='true' />"
        );
      });
    })(c)
  );
});

QUnit.test(
  'can reject changes',
  function (this: { sinon: SinonStatic }, assert) {
    assert.expect(6);

    const onChangeSpy = this.sinon.spy();

    class View extends DCGView.View {
      template() {
        return (
          <Checkbox checked={DCGView.const(true)} onChange={onChangeSpy} />
        );
      }
    }

    mount(View, () => {
      const input = node.children[0] as HTMLInputElement;

      assert.strictEqual(input.checked, true);
      assert.htmlEqual(
        node.innerHTML,
        "<input type='checkbox' checked='true' />"
      );

      assert.equal(onChangeSpy.callCount, 0);
      input.checked = false;
      input.dispatchEvent(new Event('change'));
      assert.deepEqual(onChangeSpy.args, [[false]]);

      assert.strictEqual(input.checked, true);
      assert.htmlEqual(
        node.innerHTML,
        "<input type='checkbox' checked='true' />"
      );
    });
  }
);

QUnit.test('rejects type={} attr', (assert) => {
  assert.expect(2);

  class View extends DCGView.View {
    template() {
      return (
        <Checkbox checked={DCGView.const(false)} onChange={() => void 0} />
      );
    }
  }

  mount(View, () => {
    const input = node.children[0] as HTMLInputElement;

    assert.strictEqual(input.checked, false);
    assert.htmlEqual(node.innerHTML, "<input type='checkbox' />");
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
          <Checkbox
            checked={this.const(false)}
            onChange={() => void 0}
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

      assert.strictEqual(input.checked, false);
      assert.htmlEqual(node.innerHTML, "<input type='checkbox' class='a c' />");

      assert.equal(focusSpy.callCount, 0);
      input.focus();
      assert.equal(focusSpy.callCount, 1, 'onFocus called');
    });
  }
);
