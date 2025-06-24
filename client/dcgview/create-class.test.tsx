import * as DCGView from 'dcgview';

QUnit.module('DCGViewCore::DCGView.Class');

function toHTML(view: DCGView.ViewInstance) {
  const docFrag = document.createDocumentFragment();
  view.renderTo(docFrag);
  return (docFrag.firstChild as HTMLElement).outerHTML;
}

QUnit.test('you can instantiate a DCGView', (assert) => {
  assert.expect(3);

  class View extends DCGView.View {
    c: number;

    template() {
      return <div />;
    }
    sum(a: number, b: number) {
      return a + b;
    }
    setData(p: 'c', v: number) {
      this[p] = v;
    }
  }
  const view = new View({})._construct();

  assert.equal(view.sum(2, 5), 7);
  view.setData('c', 99);
  assert.equal(view.c, 99);

  assert.equal(toHTML(view), '<div></div>');
});

QUnit.test(
  'it should throw an error if template does not return a DCGElement',
  (assert) => {
    assert.expect(1);
    assert.throws(() => {
      class View extends DCGView.View {
        // @ts-expect-error
        template() {
          return {};
        }
      }
      new View({})._construct();
    }, new Error('template() must return a DCGElement'));
  }
);

QUnit.test('you can create independent DCGView classes', (assert) => {
  assert.expect(10);

  class View1 extends DCGView.View<{ a: () => string }> {
    template() {
      return <span />;
    }
    method1() {
      return 'abc1';
    }
  }
  class View2 extends DCGView.View<{ b: () => string }> {
    template() {
      return <aside />;
    }
    method2() {
      return 'abc2';
    }
  }

  const view1 = new View1({ a: DCGView.const('1') })._construct();
  const view2 = new View2({ b: DCGView.const('2') })._construct();

  assert.equal(toHTML(view1), '<span></span>');
  assert.equal(toHTML(view2), '<aside></aside>');

  assert.equal(view1.props.a(), '1');
  assert.equal(view2.props.b(), '2');
  assert.equal((view1 as unknown as View2).props.b, undefined);
  assert.equal((view2 as unknown as View1).props.a, undefined);
  assert.equal(view1.method1(), 'abc1');
  assert.equal(view2.method2(), 'abc2');
  assert.equal((view1 as unknown as View2).method2, undefined);
  assert.equal((view2 as unknown as View1).method1, undefined);
});

// TODO - would be good to keep this, but in practice we haven't had this protection.
// We stopped using createClass() for all views in knox a long time ago. What we do is
// instantiate a base class through createClass() and just extend it. So this protection
// doesn't even run. We could easily create a update() method on one our Views and it
// completely bork things. We just seem not to. If we can mark our critical methods as
// non-overridable in typescript that'd be awesome.
/*
QUnit.test(
  'errors when trying to override an internal method',
  function (assert) {
    QUnit.expect(1);

    assert.throws(function () {
      DCGView.createClass({
        template: function () {
          return this.createElement('abc');
        },
        update: function () {}
      });
    }, new Error('Cannot override the update() method'));
  }
);
*/

QUnit.test('can create const() getters', (assert) => {
  assert.expect(1);

  class View extends DCGView.View {
    someConst: () => string;
    template() {
      this.someConst = this.const('hello world');
      return <div />;
    }
  }

  const view = new View({})._construct();
  assert.equal(view.someConst(), 'hello world');
});
