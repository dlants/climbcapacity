import * as DCGView from 'dcgview';

import * as Const from './const';
import * as RootViewHelper from './root-view-helper.test';

QUnit.module('DCGViewCore::Const');

QUnit.test('const is globally available on DCGView', (assert) => {
  assert.expect(1);
  assert.strictEqual(DCGView.const, Const.makeConst);
});

QUnit.test('isConst is globally available on DCGView', (assert) => {
  assert.expect(1);
  assert.strictEqual(DCGView.isConst, Const.isConst);
});

QUnit.test('const is available on each DCGView', (assert) => {
  assert.expect(1);

  class View extends DCGView.View {
    template() {
      return <div />;
    }
  }

  RootViewHelper.mount(View, () => {
    const view = RootViewHelper.view;
    assert.strictEqual(view.const, DCGView.const);
  });
});

QUnit.test(
  'makeConst returns a function wrapping the passed in value',
  (assert) => {
    assert.expect(6);
    assert.strictEqual(Const.makeConst(undefined)(), undefined);
    assert.strictEqual(Const.makeConst(false)(), false);
    assert.strictEqual(Const.makeConst(5)(), 5);
    assert.strictEqual(Const.makeConst('')(), '');
    assert.strictEqual(Const.makeConst('a string')(), 'a string');

    const obj = {};
    assert.strictEqual(Const.makeConst(obj)(), obj);
  }
);

QUnit.test(
  'isConst identifies functions that came out of makeConst',
  (assert) => {
    assert.expect(6);

    assert.equal(Const.isConst(Const.makeConst()), true);
    assert.equal(Const.makeConst().isDCGViewConst, true);

    assert.equal(Const.isConst(false), false);
    assert.equal(Const.isConst(5), false);
    assert.equal(Const.isConst('a string'), false);

    const obj = {};
    (obj as Const.Const<unknown>).isDCGViewConst = true;
    assert.equal(Const.isConst(obj), false, 'must be a function');
  }
);
