import * as DCGView from 'dcgview';

import { AttrEventHandler } from './attr-event-handler';
import * as RootViewHelper from './root-view-helper.test';

QUnit.module('DCGViewCore::AttrEventHanlder');

QUnit.test('undefined or null arg returns undefined', (assert) => {
  assert.expect(3);
  // @ts-expect-error
  assert.strictEqual(AttrEventHandler(), undefined);
  assert.strictEqual(AttrEventHandler('', undefined), undefined);
  assert.strictEqual(AttrEventHandler('', null), undefined);
});

QUnit.test('must pass string for event name', (assert) => {
  assert.expect(6);
  const func = function () {};

  assert.throws(() => {
    // @ts-expect-error
    AttrEventHandler(0, func);
  }, new Error('Must pass a string for an EventHandler name'));

  assert.throws(() => {
    // @ts-expect-error
    AttrEventHandler(NaN, func);
  }, new Error('Must pass a string for an EventHandler name'));

  assert.throws(() => {
    // @ts-expect-error
    AttrEventHandler(true, func);
  }, new Error('Must pass a string for an EventHandler name'));

  assert.throws(() => {
    // @ts-expect-error
    AttrEventHandler(false, func);
  }, new Error('Must pass a string for an EventHandler name'));

  assert.throws(() => {
    // @ts-expect-error
    AttrEventHandler({}, func);
  }, new Error('Must pass a string for an EventHandler name'));

  assert.throws(() => {
    // @ts-expect-error
    AttrEventHandler(() => {}, func);
  }, new Error('Must pass a string for an EventHandler name'));
});

QUnit.test('must pass function for callback', (assert) => {
  assert.expect(6);

  assert.throws(() => {
    // @ts-expect-error
    AttrEventHandler('', 0);
  }, new Error('Must pass a function for an EventHandler callback'));

  assert.throws(() => {
    // @ts-expect-error
    AttrEventHandler('', NaN);
  }, new Error('Must pass a function for an EventHandler callback'));

  assert.throws(() => {
    // @ts-expect-error
    AttrEventHandler('', true);
  }, new Error('Must pass a function for an EventHandler callback'));

  assert.throws(() => {
    // @ts-expect-error
    AttrEventHandler('', false);
  }, new Error('Must pass a function for an EventHandler callback'));

  assert.throws(() => {
    // @ts-expect-error
    AttrEventHandler('', {});
  }, new Error('Must pass a function for an EventHandler callback'));

  assert.throws(() => {
    // @ts-expect-error
    AttrEventHandler('', 'string');
  }, new Error('Must pass a function for an EventHandler callback'));
});

QUnit.test('returns a bindings.mount', (assert) => {
  assert.expect(1);

  const evts: unknown[] = [];

  class View extends DCGView.View {
    template() {
      // @ts-expect-error
      return <div onSomeEvent={(evt) => evts.push(evt)}></div>;
    }
  }

  RootViewHelper.mount(View, () => {
    const node = RootViewHelper.findSingleRootTestNode() as unknown as {
      onsomeevent: (evt?: unknown) => void;
    };
    node.onsomeevent('a');
    node.onsomeevent();
    node.onsomeevent(undefined);
    node.onsomeevent(0);
    node.onsomeevent(false);
    node.onsomeevent('b');

    assert.deepEqual(
      evts,
      ['a', 'b'],
      'event handlers only called if evt is defined'
    );
  });
});
