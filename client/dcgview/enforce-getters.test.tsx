import * as DCGView from 'dcgview';

import * as RootViewHelper from './root-view-helper.test';

QUnit.module('DCGViewCore::Enforce Prop Getters');

QUnit.test('all other attrs', (assert) => {
  const list = ['height', 'blah', 'key', 'yo', 'src'];
  assert.expect(list.length * 3);

  const testAttrView = function (attrs: Record<string, unknown>) {
    class AttrView extends DCGView.View {
      template() {
        return <div {...attrs} />;
      }
    }

    RootViewHelper.mount(AttrView, () => {
      for (const attrName in attrs) {
        assert.equal(
          RootViewHelper.node.firstElementChild?.getAttribute(attrName),
          '23'
        );
      }
    });
  };

  list.forEach((attrName) => {
    const obj: Record<string, unknown> = {};

    // can be a const
    obj[attrName] = DCGView.const(23);
    testAttrView(obj);

    // can be a getter
    obj[attrName] = () => 23;
    testAttrView(obj);

    assert.throws(
      () => {
        // cannot be a literal
        obj[attrName] = 23;
        testAttrView(obj);
      },
      `Expected the "${attrName}" attribute to be a function, but got ${JSON.stringify(23)} instead.`
    );
  });
});

QUnit.test('all other props', (assert) => {
  assert.expect(5);

  type ViewProps = {
    height: string | (() => string);
    class: DCGView.HTMLProps<HTMLElement>['class'];
    style: DCGView.HTMLProps<HTMLElement>['style'];
  };

  class View extends DCGView.View<ViewProps> {
    template() {
      return <div {...this.props}></div>;
    }
  }

  const testTestPropView = function (props: ViewProps) {
    class PropView extends DCGView.View {
      template() {
        return <View {...props} />;
      }
    }

    RootViewHelper.mount(PropView, () => {
      assert.htmlEqual(
        RootViewHelper.node.innerHTML,
        '<div height="23" class="some-class" style="height:23px"></div>'
      );
    });
  };

  // cannot be literals
  assert.throws(
    () =>
      testTestPropView({
        height: '23',
        class: 'some-class',
        style: 'height: 23px'
      }),
    'Expected the "height" prop to be a function, but got "23" instead.'
  );

  testTestPropView({
    height: DCGView.const('23'),
    class: DCGView.const('some-class'),
    style: DCGView.const('height: 23px')
  });

  testTestPropView({
    height: () => '23',
    class: () => 'some-class',
    style: () => 'height:23px'
  });

  // cannot be literals
  assert.throws(
    () =>
      testTestPropView({
        height: () => '23',
        class: { 'some-class': true },
        style: { height: '23px' }
      }),
    'Expected the "class" prop to be a function, but got {"some-class":true} instead.'
  );

  testTestPropView({
    height: () => '23',
    class: () => ({ 'some-class': true }),
    style: () => ({ height: '23px' })
  });
});
