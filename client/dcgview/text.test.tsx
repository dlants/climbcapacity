import * as DCGView from 'dcgview';
import { type SinonStatic } from 'sinon';

import * as RootViewHelper from './root-view-helper.test';

QUnit.module('DCGViewCore::BindText');

QUnit.test('Basic text binding works', (assert) => {
  assert.expect(2);

  let name = 'Joe';
  const getName = function () {
    return name;
  };
  class View extends DCGView.View {
    template() {
      return <div>hello {getName}</div>;
    }
  }

  RootViewHelper.mount(View, () => {
    const view = RootViewHelper.view;
    const rootNode = RootViewHelper.node;
    const textNode = rootNode.firstChild!;

    assert.equal(
      textNode.textContent,
      'hello Joe',
      'initial string interpolation works'
    );
    name = 'Bob';
    view.update();
    assert.equal(
      textNode.textContent,
      'hello Bob',
      'updating string interpolation works'
    );
  });
});

QUnit.test("Only updates text if it's changed", (assert) => {
  assert.expect(3);

  let name = 'Joe';
  const getName = function () {
    return name;
  };
  class View extends DCGView.View {
    template() {
      return <div>hello {getName}</div>;
    }
  }

  RootViewHelper.mount(View, () => {
    const view = RootViewHelper.view;
    const rootNode = RootViewHelper.node;
    const textNode = rootNode.firstChild as HTMLElement;

    assert.equal(
      textNode.textContent,
      'hello Joe',
      'initial string interpolation works'
    );

    name = 'Bob';
    view.update();
    assert.equal(
      textNode.textContent,
      'hello Bob',
      'updating string interpolation works'
    );

    textNode.innerHTML = 'Oops';
    view.update();
    assert.equal(
      textNode.textContent,
      'Oops',
      'data has not changed so no change triggered'
    );
  });
});

QUnit.test(
  "Warning dispatched if you don't pass in a function",
  function (this: { sinon: SinonStatic }, assert) {
    assert.expect(3);

    let name = 'Joe';
    const getName = function () {
      return name;
    };
    class View extends DCGView.View {
      _viewName = 'View';
      template() {
        return <div>hello {getName}</div>;
      }
    }

    const spy = this.sinon.spy();
    DCGView.addWarningHandler(spy);

    RootViewHelper.mount(View, () => {
      const view = RootViewHelper.view;
      const rootNode = RootViewHelper.node;
      const textNode = rootNode.firstChild as HTMLElement;

      assert.equal(
        textNode.textContent,
        'hello Joe',
        'initial string interpolation works'
      );

      name = 'Bob';
      view.update();
      assert.equal(
        textNode.textContent,
        'hello Bob',
        'updating string interpolation works'
      );
    });

    assert.equal(spy.callCount, 0);
    DCGView.removeWarningHandler(spy);
  }
);

QUnit.test('handles undefined and null correctly', (assert) => {
  assert.expect(10);

  let name: any = undefined;

  const getName = function () {
    return name;
  };
  class View extends DCGView.View {
    template() {
      return <div>{getName}</div>;
    }
  }

  RootViewHelper.mount(View, () => {
    const view = RootViewHelper.view;
    const rootNode = RootViewHelper.node;
    const textNode = rootNode.firstChild as HTMLElement;

    assert.equal(textNode.textContent, '');

    name = 'Bob';
    view.update();
    assert.equal(textNode.textContent, 'Bob');

    name = null;
    view.update();
    assert.equal(textNode.textContent, '');

    name = 'Joe';
    view.update();
    assert.equal(textNode.textContent, 'Joe');

    name = undefined;
    view.update();
    assert.equal(textNode.textContent, '');

    name = null;
    view.update();
    assert.equal(textNode.textContent, '');

    name = {};
    view.update();
    assert.equal(textNode.textContent, '[object Object]');

    name = false;
    view.update();
    assert.equal(textNode.textContent, 'false');

    name = 0;
    view.update();
    assert.equal(textNode.textContent, '0');

    name = null;
    view.update();
    assert.equal(textNode.textContent, '');
  });
});
