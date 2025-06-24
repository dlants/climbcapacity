import * as DCGView from 'dcgview';

import { mount, node, view } from './root-view-helper.test';
import { Show } from './show';

QUnit.module('DCGViewCore::Show');

QUnit.test('false predicate renders nothing', (assert) => {
  assert.expect(3);

  class TestView extends DCGView.View {
    template() {
      return (
        <Show when={DCGView.const(false)}>
          <div>Content should not be rendered</div>
        </Show>
      );
    }
  }

  mount(TestView, () => {
    assert.equal(node.innerHTML, '');
    assert.equal(node.childNodes.length, 1);
    assert.equal(node.firstChild?.nodeName, '#text');
  });
});

QUnit.test('true predicate renders children', (assert) => {
  assert.expect(1);

  class TestView extends DCGView.View {
    template() {
      return (
        <Show when={DCGView.const(true)}>
          <div>Content should be rendered</div>
        </Show>
      );
    }
  }

  mount(TestView, () => {
    assert.htmlEqual(node.innerHTML, '<div>Content should be rendered</div>');
  });
});

QUnit.test('updates correctly when predicate changes', (assert) => {
  assert.expect(2);

  let shouldShow = false;

  class TestView extends DCGView.View {
    template() {
      return (
        <Show when={() => shouldShow}>
          <div>Dynamic content</div>
        </Show>
      );
    }
  }

  mount(TestView, () => {
    assert.equal(node.innerHTML.includes('Dynamic content'), false);

    shouldShow = true;
    view.update();

    assert.htmlEqual(node.innerHTML, '<div>Dynamic content</div>');
  });
});

QUnit.test('handles undefined predicates correctly', (assert) => {
  assert.expect(2);

  class TestView extends DCGView.View {
    template() {
      return (
        <Show when={() => undefined}>
          <div>Content should not be rendered</div>
        </Show>
      );
    }
  }

  mount(TestView, () => {
    assert.equal(node.childNodes.length, 1);
    assert.equal(node.firstChild?.nodeName, '#text');
  });
});

QUnit.test('requires fragment for non-JSX children', (assert) => {
  assert.expect(0);

  <>
    {/* @ts-expect-error */}
    <Show when={DCGView.const(true)}>Text</Show>
  </>;
});
