import * as DCGView from 'dcgview';
import { type SinonStatic } from 'sinon';

import * as RootViewHelper from './root-view-helper.test';
import { type View } from './view';

type MountableHTMLElement = HTMLElement & {
  _mountedDCGView?: View;
};

QUnit.module('DCGViewCore::DCGView mounting');

QUnit.test('it should throw correct errors', (assert) => {
  assert.expect(7);

  const node = document.getElementById('qunit-fixture')!;
  class NoPropsView extends DCGView.View {
    template() {
      return <div />;
    }
  }

  class PropsView extends DCGView.View<{ foo: () => string }> {
    template() {
      return <div>{this.props.foo?.()}</div>;
    }
  }

  assert.throws(() => {
    // @ts-expect-error
    DCGView.mountToNode(null, node, {});
  });

  assert.throws(() => {
    // @ts-expect-error
    DCGView.mountToNode({}, node, {});
  });

  assert.throws(() => {
    // @ts-expect-error
    DCGView.mountToNode(NoPropsView);
  }, new Error('Must pass an HTMLElement for the node'));

  assert.throws(() => {
    // @ts-expect-error
    DCGView.mountToNode(NoPropsView, {});
  }, new Error('Must pass an HTMLElement for the node'));

  assert.throws(() => {
    DCGView.mountToNode(NoPropsView, node, {});
    DCGView.mountToNode(NoPropsView, node, {});
  }, new Error('This node is already mounted by a view'));

  // last call left a mounted node
  DCGView.unmountFromNode(node);

  assert.throws(() => {
    DCGView.unmountFromNode(node);
  }, new Error('This node is not mounted by a DCGView'));

  assert.throws(() => {
    // @ts-expect-error Views with required properties require properties object.
    DCGView.mountToNode(PropsView, node);
  });

  // @ts-expect-error Views with required properties require properties.
  DCGView.mountToNode(PropsView, node, {});

  DCGView.unmountFromNode(node);

  // @ts-expect-error Views with specific properties require exact properties.
  DCGView.mountToNode(PropsView, node, { bar: () => 'foo' });
  DCGView.unmountFromNode(node);

  // @ts-expect-error Views with specific properties do not accept extra properties.
  DCGView.mountToNode(PropsView, node, { foo: () => 'bar', bar: () => 'foo' });
  DCGView.unmountFromNode(node);

  DCGView.mountToNode(PropsView, node, { foo: () => 'bar' });

  DCGView.unmountFromNode(node);
});

QUnit.test(
  'views should mount and unmount',
  function (this: { sinon: SinonStatic }, assert) {
    assert.expect(7);

    const callOrder: string[] = [];
    const node = document.getElementById('qunit-fixture')!;
    class BasicView extends DCGView.View {
      template() {
        return <div>{this.const('Mocked Node')}</div>;
      }
    }

    BasicView.prototype.didMount = this.sinon.spy(() => {
      callOrder.push('didMount');
      assert.htmlEqual(
        node.innerHTML,
        '<div>Mocked Node</div>',
        'innerHTML is set before didMount'
      );
    });

    BasicView.prototype.willUnmount = this.sinon.spy(() => {
      callOrder.push('willUnmount');
      assert.htmlEqual(
        node.innerHTML,
        '<div>Mocked Node</div>',
        'innerHTML is still set before willUnmount'
      );
    });

    BasicView.prototype.didUnmount = this.sinon.spy(() => {
      callOrder.push('didUnmount');
      assert.htmlEqual(
        node.innerHTML,
        '',
        'innerHTML is unset before didUnmount'
      );
    });

    const view = DCGView.mountToNode(BasicView, node, {});
    assert.strictEqual((node as MountableHTMLElement)._mountedDCGView, view);
    assert.htmlEqual(node.innerHTML, '<div>Mocked Node</div>');

    DCGView.unmountFromNode(node);
    assert.strictEqual(
      (node as MountableHTMLElement)._mountedDCGView,
      undefined
    );

    assert.deepEqual(callOrder, ['didMount', 'willUnmount', 'didUnmount']);
  }
);

//       1
//     /   \
//    2     3
//   / \   / \
//  4   5 6   7
function getCallOrder(funcName: string, dontDefineForRoot = false) {
  const reports: number[] = [];
  class ChildViewClass extends DCGView.View<{
    name: () => number;
    children?: DCGView.Children;
  }> {
    template() {
      return <div>{this.props.children}</div>;
    }
  }

  class RootViewClass extends DCGView.View<{
    name: () => number;
    children: DCGView.Children;
  }> {
    template() {
      return <div>{this.props.children}</div>;
    }
  }

  (ChildViewClass as any).prototype[funcName] = function () {
    reports.push(this.props.name());
  };

  if (!dontDefineForRoot) {
    (RootViewClass as any).prototype[funcName] = function () {
      reports.push(this.props.name());
    };
  }

  class View extends DCGView.View {
    template() {
      return (
        <RootViewClass name={this.const(1)}>
          <ChildViewClass name={this.const(2)}>
            <div>
              <ChildViewClass name={this.const(4)} />
            </div>
            <ChildViewClass name={this.const(5)} />
          </ChildViewClass>
          <div>
            <ChildViewClass name={this.const(3)}>
              <ChildViewClass name={this.const(6)} />
              <ChildViewClass name={this.const(7)} />
            </ChildViewClass>
          </div>
        </RootViewClass>
      );
    }
  }

  RootViewHelper.mount(View);

  return reports;
}

function testTopDown(event: string) {
  return function (assert: Assert) {
    assert.expect(2);
    assert.deepEqual(getCallOrder(event), [1, 2, 4, 5, 3, 6, 7]);
    assert.deepEqual(getCallOrder(event, true), [2, 4, 5, 3, 6, 7]);
  };
}

function testBottomUp(event: string) {
  return function (assert: Assert) {
    assert.expect(2);
    assert.deepEqual(getCallOrder(event), [4, 5, 2, 6, 7, 3, 1]);
    assert.deepEqual(getCallOrder(event, true), [4, 5, 2, 6, 7, 3]);
  };
}

QUnit.test(
  'willMount calls top-down and is optional',
  testTopDown('willMount')
);
QUnit.test('onMount calls top-down and is optional', testTopDown('onMount'));
QUnit.test('didMount calls top-down and is optional', testTopDown('didMount'));
QUnit.test(
  'willUnmount calls top-down and is optional',
  testTopDown('willUnmount')
);
QUnit.test(
  'onUnmount calls bottom-up and is optional',
  testBottomUp('onUnmount')
);
QUnit.test(
  'didUnmount calls bottom-up and is optional',
  testBottomUp('didUnmount')
);

QUnit.test('.findAllRootDOMNodes() works on nested views', (assert) => {
  assert.expect(5);

  class LeafView extends DCGView.View<{ children: JSX.Element }> {
    template() {
      return this.props.children;
    }
  }

  class ChildView extends DCGView.View<{ children: JSX.Element }> {
    template() {
      return <LeafView>{this.props.children}</LeafView>;
    }
  }

  class View extends DCGView.View {
    template() {
      return (
        <ChildView>
          <ChildView>
            <div>{this.const('hello world')}</div>
          </ChildView>
        </ChildView>
      );
    }
  }

  RootViewHelper.mount(View, () => {
    const view = RootViewHelper.view;
    const firstChild = RootViewHelper.node.firstChild;
    const rootNodes = view.findAllRootDOMNodes();

    assert.deepEqual(rootNodes, [firstChild], 'found correct node');
    assert.equal((rootNodes[0] as HTMLElement).innerHTML, 'hello world');

    assert.deepEqual(view._childViews[0].findAllRootDOMNodes(), rootNodes);
    assert.deepEqual(
      view._childViews[0]._childViews[0].findAllRootDOMNodes(),
      rootNodes
    );
    assert.deepEqual(
      view._childViews[0]._childViews[0]._childViews[0].findAllRootDOMNodes(),
      rootNodes
    );
  });
});

QUnit.test('Passing props to mountToNode', (assert) => {
  assert.expect(1);

  class View extends DCGView.View<{ text: () => string }> {
    template() {
      return <div>{this.props.text()}</div>;
    }
  }

  RootViewHelper.mount(View, { text: DCGView.const('hello world') }, () => {
    assert.strictEqual(
      RootViewHelper.findSingleRootTestNode().textContent,
      'hello world'
    );
  });
});

QUnit.test('Wipes innerHTML on mount and unmount', (assert) => {
  assert.expect(3);
  const node = document.getElementById('qunit-fixture')!;
  node.innerHTML = '<div>existing</div><div>content</div>';
  assert.htmlEqual(node.innerHTML, '<div>existing</div><div>content</div>');

  class View extends DCGView.View {
    template() {
      return <span>{this.const('view is mounted')}</span>;
    }
  }
  DCGView.mountToNode(View, node, {});
  assert.htmlEqual(node.innerHTML, '<span>view is mounted</span>');

  DCGView.unmountFromNode(node);
  assert.htmlEqual(node.innerHTML, '');
});

QUnit.test(
  'browser restructures div element inside paragraph element',
  (assert) => {
    assert.expect(1);
    const node = document.getElementById('qunit-fixture')!;

    class InvalidView extends DCGView.View {
      template() {
        return (
          // @ts-expect-error Paragraph elements aren't allowed by DCGView's JSX types
          <p>
            prefix text
            <div>div content</div>
            suffix text
            {/* @ts-expect-error Paragraph elements aren't allowed by DCGView's JSX types */}
          </p>
        );
      }
    }

    DCGView.mountToNode(InvalidView, node, {});

    assert.htmlEqual(
      node.innerHTML,
      '<p>prefix text</p><div>div content</div>suffix text<p></p>',
      "HTML reflects the browser's restructuring of a <div> placed inside a <p> element"
    );

    DCGView.unmountFromNode(node);
  }
);
