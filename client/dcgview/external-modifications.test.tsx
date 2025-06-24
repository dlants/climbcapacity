import * as DCGView from 'dcgview';

import * as RootViewHelper from './root-view-helper.test';

QUnit.module('DCGViewCore::ExternalModifications');

QUnit.test('externally modified attributes', (assert) => {
  assert.expect(12);

  let className = 'a b c';
  let ariaLabel = 'label1';

  class View extends DCGView.View {
    template() {
      return <div class={() => className} aria-label={() => ariaLabel}></div>;
    }
  }

  RootViewHelper.mount(View, () => {
    const view = RootViewHelper.view;
    const rootNode = RootViewHelper.node;
    const node = rootNode.firstElementChild!;

    assert.equal(node.className, 'a b c', 'initial className correct');

    assert.equal(
      node.getAttribute('aria-label'),
      'label1',
      'initial aria-label correct'
    );

    className = 'b c d';
    ariaLabel = 'label2';
    view.update();

    assert.equal(node.className, 'b c d', 'className updates');

    assert.equal(
      node.getAttribute('aria-label'),
      'label2',
      'aria-label updates'
    );

    node.classList.remove('c');
    node.setAttribute('aria-label', 'label3');

    assert.equal(node.className, 'b d', 'className updates from dom mutation');

    assert.equal(
      node.getAttribute('aria-label'),
      'label3',
      'aria-label updates from dom mutation'
    );

    view.update();

    assert.equal(
      node.className,
      'b d',
      'className does not update on view.update() because getter value is same'
    );

    assert.equal(
      node.getAttribute('aria-label'),
      'label3',
      'aria-label does not update on view.update() because getter value is same'
    );

    className = 'b c';
    ariaLabel = 'label4';
    view.update();

    assert.equal(
      node.className,
      'b',
      'className removes "d" but does not add back "c" because "c" was present in getter value last time'
    );

    assert.equal(
      node.getAttribute('aria-label'),
      'label4',
      'aria-label updates now that the request getter value has changed'
    );

    className = 'd';
    view.update();

    assert.equal(node.className, 'd', 'className removes "b" and adds "d".');

    className = 'c d';
    view.update();

    assert.equal(node.className, 'd c', 'className adds back "c"');
  });
});
