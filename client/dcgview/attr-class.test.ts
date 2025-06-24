import { AttrClass, type GetClassName } from './attr-class';
import { makeConst } from './const';

QUnit.module('DCGViewCore::AttrClass');

function makeGetter<T>(value: T) {
  return () => value;
}

function AssertAttr(
  assert: Assert,
  getter: GetClassName,
  expected: { value: string; bindings: Record<string, string> | undefined }
) {
  const info = AttrClass(getter);
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

QUnit.test('truthy properties are returned as classes', (assert) => {
  assert.expect(6);

  let obj = {};
  AssertAttr(assert, makeConst(obj), {
    value: '',
    bindings: undefined
  });

  obj = { a: true };
  AssertAttr(assert, makeConst(obj), {
    value: 'a',
    bindings: undefined
  });

  obj = { a: false };
  AssertAttr(assert, makeConst(obj), {
    value: '',
    bindings: undefined
  });

  obj = { a: 0, b: 5 };
  AssertAttr(assert, makeGetter(obj), {
    value: 'b',
    bindings: { onUpdate: 'function' }
  });

  obj = { a: {}, b: 'blue' };
  AssertAttr(assert, makeConst(obj), {
    value: 'a b',
    bindings: undefined
  });

  obj = { a: 'hi', b: NaN, c: -1 };
  AssertAttr(assert, makeConst(obj), {
    value: 'a c',
    bindings: undefined
  });
});

QUnit.test('bindings.onUpdate() mutates the dom', (assert) => {
  assert.expect(3);

  let toggle = false;
  const getter = function () {
    return {
      fixed: true,
      class1: toggle,
      class2: true
    };
  };

  const attrInfo = AttrClass(getter);
  if (!attrInfo.bindings) throw new Error('expected bindings to be defined');

  assert.equal(attrInfo.value, 'fixed class2');
  const element = document.createElement('span');
  element.className = 'fixed class2';

  toggle = true;
  attrInfo.bindings.onUpdate(element);
  assert.equal(element.className, 'fixed class2 class1');

  toggle = false;
  attrInfo.bindings.onUpdate(element);
  assert.equal(element.className, 'fixed class2');
});

QUnit.test(
  'class attrs do smart diffing when getter returns object',
  (assert) => {
    assert.expect(7);

    let toggle = false;
    const getter = function () {
      return {
        fixed: true,
        class1: toggle,
        class2: true
      };
    };

    const attrInfo = AttrClass(getter);
    if (!attrInfo.bindings) throw new Error('expected bindings to be defined');

    assert.equal(attrInfo.value, 'fixed class2');

    const element = document.createElement('span');
    element.className = ' FIRST   fixed    class2 LAST   ';

    toggle = true;
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, 'FIRST fixed class2 LAST class1');

    toggle = false;
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, 'FIRST fixed class2 LAST');

    // We are modifying the 'fixed' class both internally and externally to
    // DCGView. DCGView notices that the classes it wants to generate:
    //
    // 'fixed class2'
    //
    // hasn't changed since last time. So, it doesn't do anything. We have both
    // a class that shouldn't be here 'class1' and a class is missing 'fixed'.
    // This is the expected behavior at this point. There simply can't be collisions
    // between the classes DCGView handles and the classes that external libraries handle.
    element.className = 'class2 class1';
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, 'class2 class1');

    // classList.add() doesn't add duplicates, so we get deduplication
    toggle = true;
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, 'class2 class1');

    toggle = false;
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, 'class2');

    toggle = true;
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, 'class2 class1');
  }
);

QUnit.test(
  'class attrs do smart diffing when getter returns string',
  (assert) => {
    assert.expect(7);

    let toggle = false;
    const getter = function () {
      return 'fixed' + (toggle ? ' class1 ' : ' ') + 'class2';
    };

    const attrInfo = AttrClass(getter);
    if (!attrInfo.bindings) throw new Error('expected bindings to be defined');

    assert.equal(attrInfo.value, 'fixed class2');

    const element = document.createElement('span');
    element.className = ' FIRST   fixed    class2 LAST   ';

    toggle = true;
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, 'FIRST fixed class2 LAST class1');

    toggle = false;
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, 'FIRST fixed class2 LAST');

    // We are modifying the 'fixed' class both internally and externally to
    // DCGView. DCGView notices that the classes it wants to generate:
    //
    // 'fixed class2'
    //
    // hasn't changed since last time. So, it doesn't do anything. We have both
    // a class that shouldn't be here 'class1' and a class is missing 'fixed'.
    // This is the expected behavior at this point. There simply can't be collisions
    // between the classes DCGView handles and the classes that external libraries handle.
    element.className = 'class2 class1';
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, 'class2 class1');

    // classList.add() doesn't add duplicates, so we get deduplication
    toggle = true;
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, 'class2 class1');

    toggle = false;
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, 'class2');

    toggle = true;
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, 'class2 class1');
  }
);

QUnit.test(
  'smart diffing works if all View-controlled classes disappear',
  (assert) => {
    assert.expect(4);

    let toggle = false;
    const getter = function () {
      return {
        class1: toggle,
        class2: toggle
      };
    };
    const attrInfo = AttrClass(getter);
    if (!attrInfo.bindings) throw new Error('expected bindings to be defined');

    assert.equal(attrInfo.value, '');

    const element = document.createElement('span');
    element.className = ' FIRST   LAST   ';

    // nothing has changed, so the class isn't updated
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, ' FIRST   LAST   ');

    toggle = true;
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, 'FIRST LAST class1 class2');

    element.className = '     ';
    toggle = false;
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, '');
  }
);

QUnit.test(
  'ignores external DOM mutations and only tracks its own state',
  (assert) => {
    assert.expect(6);

    let showClass = false;
    const getter = function () {
      return {
        'my-class': showClass
      };
    };

    const attrInfo = AttrClass(getter);
    if (!attrInfo.bindings) throw new Error('expected bindings to be defined');

    const element = document.createElement('div');
    element.className = 'external-class';

    // Initial state: AttrClass wants no classes
    assert.equal(attrInfo.value, '');

    // First update - AttrClass adds its class
    showClass = true;
    attrInfo.bindings.onUpdate(element);
    assert.equal(element.className, 'external-class my-class');

    // External code removes AttrClass's class
    element.classList.remove('my-class');
    assert.equal(element.className, 'external-class');

    // AttrClass state hasn't changed, so it does nothing (doesn't restore the class)
    attrInfo.bindings.onUpdate(element);
    assert.equal(
      element.className,
      'external-class',
      'AttrClass should not restore externally removed classes'
    );

    // Only when AttrClass's own state changes does it update the DOM
    showClass = false;
    attrInfo.bindings.onUpdate(element);
    assert.equal(
      element.className,
      'external-class',
      'AttrClass removes its classes when state changes'
    );

    showClass = true;
    attrInfo.bindings.onUpdate(element);
    assert.equal(
      element.className,
      'external-class my-class',
      'AttrClass adds its classes when state changes'
    );
  }
);
