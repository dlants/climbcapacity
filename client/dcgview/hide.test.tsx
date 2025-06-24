import * as DCGView from 'dcgview';

import { Hide } from './hide';
import { mount, node, view } from './root-view-helper.test';

QUnit.module('DCGViewCore::Hide');

QUnit.test('true predicate renders nothing', (assert) => {
  assert.expect(3);

  class TestView extends DCGView.View {
    template() {
      return (
        <Hide when={DCGView.const(true)}>
          <div>Content should not be rendered</div>
        </Hide>
      );
    }
  }

  mount(TestView, () => {
    assert.equal(node.innerHTML, '');
    assert.equal(node.childNodes.length, 1);
    assert.equal(node.firstChild?.nodeName, '#text');
  });
});

QUnit.test('false predicate renders children', (assert) => {
  assert.expect(1);

  class TestView extends DCGView.View {
    template() {
      return (
        <Hide when={DCGView.const(false)}>
          <div>Content should be rendered</div>
        </Hide>
      );
    }
  }

  mount(TestView, () => {
    assert.htmlEqual(node.innerHTML, '<div>Content should be rendered</div>');
  });
});

QUnit.test('updates correctly when predicate changes', (assert) => {
  assert.expect(2);

  let shouldHide = true;

  class TestView extends DCGView.View {
    template() {
      return (
        <Hide when={() => shouldHide}>
          <div>Dynamic content</div>
        </Hide>
      );
    }
  }

  mount(TestView, () => {
    assert.equal(node.innerHTML.includes('Dynamic content'), false);

    shouldHide = false;
    view.update();

    assert.htmlEqual(node.innerHTML, '<div>Dynamic content</div>');
  });
});

QUnit.test('handles undefined predicates correctly', (assert) => {
  assert.expect(1);

  class TestView extends DCGView.View {
    template() {
      return (
        <Hide when={() => undefined}>
          <div>Content should be rendered</div>
        </Hide>
      );
    }
  }

  mount(TestView, () => {
    assert.htmlEqual(node.innerHTML, '<div>Content should be rendered</div>');
  });
});

QUnit.test('requires fragment for non-JSX children', (assert) => {
  assert.expect(0);

  <>
    {/* @ts-expect-error */}
    <Hide when={DCGView.const(true)}>Text</Hide>
  </>;
});
