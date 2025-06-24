import { type SinonStatic } from 'sinon';

import { AttrStyle, type StyleGetter } from './attr-style';
import { makeConst } from './const';

QUnit.module('DCGViewCore::AttrStyle');

function makeGetter<T>(val: T) {
  return () => val;
}

function AssertAttr(
  assert: Assert,
  getter: StyleGetter,
  expected: { value: unknown; bindings: Record<string, string> | undefined }
) {
  const info = AttrStyle(getter);
  let bindingTypes: Record<string, string> | undefined;
  if (info.bindings) {
    bindingTypes = {};
    for (const i in info.bindings) {
      bindingTypes[i] = typeof info.bindings[i as keyof typeof info.bindings];
    }
  }

  const actual = { ...info, bindings: bindingTypes };
  assert.deepEqual(actual, expected);
}

QUnit.test('a constant string passes through without validation', (assert) => {
  assert.expect(2);

  AssertAttr(assert, makeConst('a b c'), {
    value: 'a b c',
    bindings: undefined
  });

  AssertAttr(assert, makeConst('a;b;c'), {
    value: 'a;b;c',
    bindings: undefined
  });
});

QUnit.test('a constant string passes through without validation', (assert) => {
  assert.expect(2);

  AssertAttr(assert, makeGetter('a b c'), {
    value: 'a b c',
    bindings: { onUpdate: 'function' }
  });

  AssertAttr(assert, makeGetter('a;b;c'), {
    value: 'a;b;c',
    bindings: { onUpdate: 'function' }
  });
});

QUnit.test('existent properties are returned as styles', (assert) => {
  assert.expect(6);

  let obj = {};
  AssertAttr(assert, makeConst(obj), {
    value: '',
    bindings: undefined
  });

  obj = { a: '' };
  AssertAttr(assert, makeConst(obj), {
    value: 'a:',
    bindings: undefined
  });

  obj = { a: null };
  AssertAttr(assert, makeConst(obj), {
    value: '',
    bindings: undefined
  });

  obj = { a: null, b: true };
  AssertAttr(assert, makeGetter(obj), {
    value: 'b:true',
    bindings: { onUpdate: 'function' }
  });

  obj = { a: '-1px', b: "'string'" };
  AssertAttr(assert, makeConst(obj), {
    value: "a:-1px;b:'string'",
    bindings: undefined
  });

  obj = { a: 0, b: undefined, c: '5px' };
  AssertAttr(assert, makeGetter(obj), {
    value: 'a:0;c:5px',
    bindings: { onUpdate: 'function' }
  });
});

QUnit.test(
  'bindings.onUpdate() mutates the dom',
  function (this: { sinon: SinonStatic }, assert) {
    assert.expect(3);

    const domNodeMock = {
      setAttribute: this.sinon.spy()
    };

    let transition: string | null;
    const getter = function () {
      return {
        fixed: '...',
        transition: transition,
        position: 'relative'
      };
    };

    const attrInfo = AttrStyle(getter);
    if (!attrInfo.bindings) throw new Error('expected bindings to be defined');

    assert.equal(attrInfo.value, 'fixed:...;position:relative');

    transition = 'abc';
    attrInfo.bindings.onUpdate(domNodeMock as unknown as HTMLElement);
    assert.deepEqual(domNodeMock.setAttribute.args, [
      ['style', 'fixed:...;transition:abc;position:relative']
    ]);
    domNodeMock.setAttribute.reset();

    transition = null;
    attrInfo.bindings.onUpdate(domNodeMock as unknown as HTMLElement);
    assert.deepEqual(domNodeMock.setAttribute.args, [
      ['style', 'fixed:...;position:relative']
    ]);
  }
);

QUnit.test(
  'only sets style attribute if something has changed',
  function (this: { sinon: SinonStatic }, assert) {
    assert.expect(3);

    const domNodeMock = {
      setAttribute: this.sinon.spy()
    };

    let returnedStyleString = '1';
    const getter = function () {
      return returnedStyleString;
    };

    const attrInfo = AttrStyle(getter);
    if (!attrInfo.bindings) throw new Error('expected bindings to be defined');

    assert.equal(attrInfo.value, '1');

    returnedStyleString = '2';
    attrInfo.bindings.onUpdate(domNodeMock as unknown as HTMLElement);
    assert.deepEqual(domNodeMock.setAttribute.args, [['style', '2']]);
    domNodeMock.setAttribute.reset();

    attrInfo.bindings.onUpdate(domNodeMock as unknown as HTMLElement);
    assert.deepEqual(domNodeMock.setAttribute.args, []);
  }
);
