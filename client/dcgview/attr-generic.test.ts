import { type SinonStatic } from 'sinon';

import { AttrGeneric } from './attr-generic';
import { makeConst } from './const';

QUnit.module('DCGViewCore::AttrGeneric');

type Spy = ReturnType<SinonStatic['spy']>;

function makeGetter<T>(val: T) {
  return () => val;
}

function AssertAttr(
  assert: Assert,
  getter: () => unknown,
  expected: { value: unknown; bindings: Record<string, string> | undefined }
) {
  const info = AttrGeneric('abc', getter);
  let bindingTypes: Record<string, string> | undefined;
  if (info.bindings) {
    bindingTypes = {};
    for (const i in info.bindings) {
      bindingTypes[i] = typeof info.bindings[i as keyof typeof info.bindings];
    }
  }

  const actual = { ...info, bindings: bindingTypes };
  assert.deepEqual(actual, expected);
  return info;
}

QUnit.test('undefined constant', (assert) => {
  assert.expect(1);

  AssertAttr(assert, makeConst(undefined), {
    value: undefined,
    bindings: undefined
  });
});

QUnit.test('defined constant', (assert) => {
  assert.expect(1);

  AssertAttr(assert, makeConst('string'), {
    value: 'string',
    bindings: undefined
  });
});

QUnit.test('undefined getter', function (this: { sinon: SinonStatic }, assert) {
  assert.expect(6);

  let val: unknown;
  const getter = function () {
    return val;
  };

  const info = AssertAttr(assert, getter, {
    value: undefined,
    bindings: { onUpdate: 'function' }
  });
  if (!info.bindings) throw new Error('expected bindings to be defined');

  // value does not change. still undefined
  let domNodeMock: { removeAttribute?: Spy; setAttribute?: Spy } = {};
  info.bindings.onUpdate(domNodeMock as unknown as HTMLElement);
  assert.deepEqual(domNodeMock, {}, 'did not modify properties on node');

  val = '123';
  let spy = this.sinon.spy();
  domNodeMock = { setAttribute: spy };
  info.bindings.onUpdate(domNodeMock as unknown as HTMLElement);
  assert.deepEqual(
    domNodeMock,
    { setAttribute: spy },
    'did not modify properties on node'
  );
  assert.deepEqual(
    spy.args,
    [['abc', '123']],
    'setAttribute called once with correct args'
  );

  val = undefined;
  spy = this.sinon.spy();
  domNodeMock = { removeAttribute: spy };
  info.bindings.onUpdate(domNodeMock as unknown as HTMLElement);
  assert.deepEqual(
    domNodeMock,
    { removeAttribute: spy },
    'did not modify properties on node'
  );
  assert.deepEqual(
    domNodeMock.removeAttribute?.args,
    [['abc']],
    'removeAttribute called once with correct args'
  );
});

QUnit.test('defined getter', function (this: { sinon: SinonStatic }, assert) {
  assert.expect(4);

  let val = 'string';
  const getter = function () {
    return val;
  };

  const info = AssertAttr(assert, getter, {
    value: 'string',
    bindings: { onUpdate: 'function' }
  });
  if (!info.bindings) throw new Error('expected bindings to be defined');

  // value does not change. still "string"
  let domNodeMock: { setAttribute?: Spy } = {};
  info.bindings.onUpdate(domNodeMock as unknown as HTMLElement);
  assert.deepEqual(domNodeMock, {}, 'did not modify properties on node');

  val = 'changed';
  const spy = this.sinon.spy();
  domNodeMock = { setAttribute: spy };
  info.bindings.onUpdate(domNodeMock as unknown as HTMLElement);
  assert.deepEqual(
    domNodeMock,
    { setAttribute: spy },
    'did not modify properties on node'
  );
  assert.deepEqual(
    domNodeMock.setAttribute?.args,
    [['abc', 'changed']],
    'setAttribute called once with correct args'
  );
});

QUnit.test('constants work', (assert) => {
  assert.expect(4);

  AssertAttr(assert, makeConst('def'), {
    value: 'def',
    bindings: undefined
  });

  AssertAttr(assert, makeConst(5), {
    value: 5,
    bindings: undefined
  });

  AssertAttr(assert, makeConst(null), {
    value: null,
    bindings: undefined
  });

  AssertAttr(assert, makeConst({}), {
    value: {},
    bindings: undefined
  });
});

QUnit.test('getters work', function (this: { sinon: SinonStatic }, assert) {
  assert.expect(6);

  AssertAttr(assert, makeGetter('def'), {
    value: 'def',
    bindings: { onUpdate: 'function' }
  });

  AssertAttr(assert, makeGetter(null), {
    value: null,
    bindings: { onUpdate: 'function' }
  });

  AssertAttr(assert, makeGetter({}), {
    value: {},
    bindings: { onUpdate: 'function' }
  });

  let val = 5;
  const getter = function () {
    return val;
  };
  const info = AssertAttr(assert, getter, {
    value: 5,
    bindings: { onUpdate: 'function' }
  });
  if (!info.bindings) throw new Error('expected bindings to be defined');

  val = 6;
  const spy = this.sinon.spy();
  const domNodeMock = { setAttribute: spy };
  info.bindings.onUpdate(domNodeMock as unknown as HTMLElement);
  assert.deepEqual(
    domNodeMock,
    { setAttribute: spy },
    'did not modify properties of node'
  );
  assert.deepEqual(
    spy.args,
    [['abc', '6']],
    'the call to setAttribute casts the attr value to string'
  );
});
