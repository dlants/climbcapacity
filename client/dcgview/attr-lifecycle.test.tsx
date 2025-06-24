import * as DCGView from 'dcgview';
import { type SinonStatic } from 'sinon';

import { AttrLifeCycle } from './attr-lifecycle';
import * as Const from './const';
import { mount, view } from './root-view-helper.test';

QUnit.module('DCGViewCore::AttrLifeCycle');

const { makeConst } = Const;

QUnit.test('undefined', (assert) => {
  assert.expect(1);
  assert.throws(
    // @ts-expect-error
    () => AttrLifeCycle('abc')(undefined),
    new Error('The abc attribute expects a function for the value')
  );
});

QUnit.test('a string', (assert) => {
  assert.expect(1);
  assert.throws(
    // @ts-expect-error
    () => AttrLifeCycle('abc')('string'),
    new Error('The abc attribute expects a function for the value')
  );
});

QUnit.test('an object', (assert) => {
  assert.expect(1);
  assert.throws(
    // @ts-expect-error
    () => AttrLifeCycle('abc')({}),
    new Error('The abc attribute expects a function for the value')
  );
});

QUnit.test('undefined constant', (assert) => {
  assert.expect(1);
  assert.throws(
    () => AttrLifeCycle('abc')(makeConst(undefined)),
    new Error('The abc attribute does not expect a const for the value')
  );
});

QUnit.test('defined constant', (assert) => {
  assert.expect(1);
  assert.throws(
    () => AttrLifeCycle('abc')(makeConst('string')),
    new Error('The abc attribute does not expect a const for the value')
  );
});

QUnit.test('a getter', function (this: { sinon: SinonStatic }, assert) {
  assert.expect(6);

  const spy = this.sinon.spy();
  const info = AttrLifeCycle('abc')(spy);
  assert.deepEqual(Object.keys(info), ['bindings']);
  assert.deepEqual(Object.keys(info.bindings), ['abc']);
  assert.equal(typeof info.bindings.abc, 'function');

  const domNodeMock = {};
  assert.equal(spy.callCount, 0);

  info.bindings.abc(domNodeMock as unknown as HTMLElement);
  assert.deepEqual(spy.args, [[domNodeMock]]);
  assert.deepEqual(domNodeMock, {});
});

QUnit.test('lifecycle events in the real world', (assert) => {
  assert.expect(3);

  const classes = {
    class1: true,
    class2: false,
    class3: true
  };

  let events: unknown[] = [];
  const makeProps = function (name: string) {
    const pushEvent = (type: string, pushNodeClass?: boolean) =>
      function (...children: HTMLElement[]) {
        if (children.length === 0) {
          events.push([type, name]);
        } else if (children.length === 1) {
          const node = children[0];
          if (pushNodeClass) {
            events.push([
              type,
              name,
              node.id,
              node.className.split(' ').sort().join(' ')
            ]);
          } else {
            events.push([type, name, node.id]);
          }
        } else {
          throw new Error('we do not expect more than 1 arg');
        }
      };
    return {
      willMount: pushEvent('willMount'),
      onMount: pushEvent('onMount'),
      didMount: pushEvent('didMount'),
      willUnmount: pushEvent('willUnmount'),
      onUnmount: pushEvent('onUnmount'),
      didUnmount: pushEvent('didUnmount'),
      willUpdate: pushEvent('willUpdate', true),
      onUpdate: pushEvent('onUpdate', true),
      didUpdate: pushEvent('didUpdate', true)
    };
  };

  const makeAttrs = (name: string) => {
    return {
      class() {
        return classes;
      },
      id: DCGView.const(name),
      ...makeProps(name)
    };
  };

  class Subview extends DCGView.View<{ children: DCGView.Child }> {
    init() {
      Object.assign(this, makeProps.call(this, 'Subview'));
    }

    template() {
      return <div {...makeAttrs('subview-root')} />;
    }
  }

  class View extends DCGView.View {
    init() {
      Object.assign(this, makeProps.call(this, 'View'));
    }

    template() {
      return (
        <div {...makeAttrs('view-root')}>
          <div {...makeAttrs('view-child-1')} />
          <Subview {...makeAttrs('view-subview')}>
            <div {...makeAttrs('view-orphan')} />
          </Subview>
          <div {...makeAttrs('view-child-2')} />
        </div>
      );
    }
  }

  class Root extends DCGView.View {
    template() {
      return <View />;
    }
  }

  mount(Root, () => {
    assert.deepEqual(events, [
      ['willMount', 'View'],
      ['willMount', 'view-root'],
      ['willMount', 'view-child-1'],
      ['willMount', 'view-child-2'],
      ['willMount', 'Subview'],
      ['willMount', 'subview-root'],
      ['onMount', 'View'],
      ['onMount', 'view-root', 'view-root'],
      ['onMount', 'view-child-1', 'view-child-1'],
      ['onMount', 'view-child-2', 'view-child-2'],
      ['onMount', 'Subview'],
      ['onMount', 'subview-root', 'subview-root'],
      ['didMount', 'View'],
      ['didMount', 'view-root', 'view-root'],
      ['didMount', 'view-child-1', 'view-child-1'],
      ['didMount', 'view-child-2', 'view-child-2'],
      ['didMount', 'Subview'],
      ['didMount', 'subview-root', 'subview-root']
    ]);
    events = [];

    classes.class2 = true;
    view.update();
    assert.deepEqual(events, [
      ['willUpdate', 'View'],
      ['willUpdate', 'view-root', 'view-root', 'class1 class3'],
      ['willUpdate', 'view-child-1', 'view-child-1', 'class1 class3'],
      ['willUpdate', 'view-child-2', 'view-child-2', 'class1 class3'],
      ['onUpdate', 'view-root', 'view-root', 'class1 class2 class3'],
      ['onUpdate', 'view-child-1', 'view-child-1', 'class1 class2 class3'],
      ['onUpdate', 'view-child-2', 'view-child-2', 'class1 class2 class3'],
      ['onUpdate', 'View'],

      ['willUpdate', 'Subview'],
      ['willUpdate', 'subview-root', 'subview-root', 'class1 class3'],
      ['onUpdate', 'subview-root', 'subview-root', 'class1 class2 class3'],
      ['onUpdate', 'Subview'],
      ['didUpdate', 'subview-root', 'subview-root', 'class1 class2 class3'],
      ['didUpdate', 'Subview'],

      ['didUpdate', 'view-root', 'view-root', 'class1 class2 class3'],
      ['didUpdate', 'view-child-1', 'view-child-1', 'class1 class2 class3'],
      ['didUpdate', 'view-child-2', 'view-child-2', 'class1 class2 class3'],
      ['didUpdate', 'View']
    ]);
    events = [];
  });
  // Root view is unmount

  assert.deepEqual(events, [
    ['willUnmount', 'View'],
    ['willUnmount', 'view-root', 'view-root'],
    ['willUnmount', 'view-child-1', 'view-child-1'],
    ['willUnmount', 'view-child-2', 'view-child-2'],
    ['willUnmount', 'Subview'],
    ['willUnmount', 'subview-root', 'subview-root'],

    ['onUnmount', 'subview-root'],
    ['onUnmount', 'Subview'],
    ['onUnmount', 'view-root'],
    ['onUnmount', 'view-child-1'],
    ['onUnmount', 'view-child-2'],
    ['onUnmount', 'View'],

    ['didUnmount', 'subview-root'],
    ['didUnmount', 'Subview'],
    ['didUnmount', 'view-root'],
    ['didUnmount', 'view-child-1'],
    ['didUnmount', 'view-child-2'],
    ['didUnmount', 'View']
  ]);
});
