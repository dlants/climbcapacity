import * as DCGView from 'dcgview';

import { mount, node, view } from './root-view-helper.test';

const { If } = DCGView.Components;

QUnit.module('DCGViewCore::Remount');

QUnit.test('can remount an element', (assert) => {
  assert.expect(7);

  let visible = true;
  let variable = 'abc';

  class InnerView extends DCGView.View {
    updates = 0;

    willUpdate() {
      this.updates += 1;
    }

    template() {
      return (
        <div>
          variable: {() => variable} updates: {() => this.updates}
        </div>
      );
    }
  }

  class ConditionalView extends DCGView.View<{
    visible: () => boolean;
    children: DCGView.Child;
  }> {
    template() {
      return (
        <If predicate={this.props.visible}>
          {() => {
            return <>{this.props.children}</>;
          }}
        </If>
      );
    }
  }

  class View extends DCGView.View {
    updates = 0;

    willUpdate() {
      this.updates += 1;
    }

    template() {
      return (
        <ConditionalView visible={() => visible}>
          <InnerView />
        </ConditionalView>
      );
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<div>variable: abc updates: 0</div>');

    variable = '123';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>variable: 123 updates: 1</div>');

    view.update();
    view.update();
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>variable: 123 updates: 4</div>');

    visible = false;
    view.update();
    assert.htmlEqual(node.innerHTML, '');

    visible = true;
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>variable: 123 updates: 0</div>');

    visible = false;
    view.update();
    assert.htmlEqual(node.innerHTML, '');

    visible = true;
    variable = '!@#';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>variable: !@# updates: 0</div>');
  });
});

QUnit.test('can remount a view', (assert) => {
  assert.expect(6);

  let visible = true;
  let variable = 'abc';

  class InnerView extends DCGView.View {
    template() {
      return <div>{() => variable}</div>;
    }
  }

  class ConditionalView extends DCGView.View<{
    visible: () => boolean;
    children: DCGView.Child;
  }> {
    template() {
      return (
        <If predicate={this.props.visible}>
          {() => {
            return <div>{this.props.children}</div>;
          }}
        </If>
      );
    }
  }

  class View extends DCGView.View {
    template() {
      return (
        <ConditionalView visible={() => visible}>
          <InnerView />
        </ConditionalView>
      );
    }
  }

  mount(View, () => {
    assert.htmlEqual(node.innerHTML, '<div><div>abc</div></div>');

    variable = '123';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div><div>123</div></div>');

    visible = false;
    view.update();
    assert.htmlEqual(node.innerHTML, '');

    visible = true;
    view.update();
    assert.htmlEqual(node.innerHTML, '<div><div>123</div></div>');

    visible = false;
    view.update();
    assert.htmlEqual(node.innerHTML, '');

    visible = true;
    variable = '!@#';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div><div>!@#</div></div>');
  });
});

QUnit.test('same spec can be used multiple times', (assert) => {
  assert.expect(2);

  let variable = 'abc';

  class ReusedView extends DCGView.View<{
    children: DCGView.Child;
  }> {
    template() {
      return <>{this.props.children}</>;
    }
  }

  const elementSpec = <div>element: {() => variable}</div>;
  const viewSpec = (
    <ReusedView>
      <span>view: {() => variable}</span>
    </ReusedView>
  );

  class View extends DCGView.View {
    template() {
      return (
        <>
          {elementSpec}
          {viewSpec}
          {elementSpec}
          {viewSpec}
        </>
      );
    }
  }

  mount(View, () => {
    assert.htmlEqual(
      node.innerHTML,
      '<div>element: abc</div><span>view: abc</span><div>element: abc</div><span>view: abc</span>'
    );

    variable = '123';
    view.update();
    assert.htmlEqual(
      node.innerHTML,
      '<div>element: 123</div><span>view: 123</span><div>element: 123</div><span>view: 123</span>'
    );
  });
});
