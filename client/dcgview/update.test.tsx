import * as DCGView from 'dcgview';
import { type SinonStatic } from 'sinon';

import * as RootViewHelper from './root-view-helper.test';

QUnit.module('DCGViewCore::Update');

QUnit.test('user specefied ids pass through', (assert) => {
  assert.expect(1);
  class View extends DCGView.View {
    template() {
      return <div id="hi"></div>;
    }
  }

  RootViewHelper.mount(View, () => {
    const node = RootViewHelper.node;
    assert.htmlEqual(node.innerHTML, '<div id="hi"></div>');
  });
});

QUnit.test('attrs are updated', (assert) => {
  assert.expect(5);

  let highlight = false;
  let small = false;
  let world = false;

  const styles = function () {
    return {
      color: highlight ? 'blue' : 'black',
      hello: world ? 'world' : undefined
    };
  };
  const classes = function () {
    return {
      selected: !!highlight,
      big: !small
    };
  };
  const cat = function () {
    return highlight ? 'meow' : 'sleep';
  };
  class View extends DCGView.View {
    template() {
      return <div style={styles} class={classes} data-cat={cat}></div>;
    }
  }

  RootViewHelper.mount(View, () => {
    const node = RootViewHelper.node;
    const view = RootViewHelper.view;

    assert.htmlEqual(
      node.innerHTML,
      '<div style="color:black" class="big" data-cat="sleep"></div>'
    );

    highlight = true;
    view.update();
    assert.htmlEqual(
      node.innerHTML,
      '<div style="color:blue" class="selected big" data-cat="meow"></div>'
    );

    small = true;
    view.update();
    assert.htmlEqual(
      node.innerHTML,
      '<div style="color:blue" class="selected" data-cat="meow"></div>'
    );

    highlight = false;
    small = false;
    world = true;
    view.update();
    assert.htmlEqual(
      node.innerHTML,
      '<div style="color:black;hello:world" class="big" data-cat="sleep"></div>'
    );

    highlight = false;
    small = false;
    world = false;
    view.update();
    assert.htmlEqual(
      node.innerHTML,
      '<div style="color:black" class="big" data-cat="sleep"></div>'
    );
  });
});

QUnit.test('shouldUpdate()', (assert) => {
  assert.expect(8);

  let className = '0';
  let shouldUpdate = true;
  let events: string[] = [];

  const classes = function () {
    return {
      0: className === '0',
      1: className === '1',
      2: className === '2',
      3: className === '3'
    };
  };
  class View extends DCGView.View {
    template() {
      return <div class={classes}></div>;
    }
    shouldUpdate() {
      return shouldUpdate;
    }
    willUpdate() {
      events.push('willUpdate');
    }
    didUpdate() {
      events.push('didUpdate');
    }
  }

  RootViewHelper.mount(View, () => {
    const node = RootViewHelper.node;
    const view = RootViewHelper.view;

    assert.htmlEqual(node.innerHTML, '<div class="0"></div>');
    assert.deepEqual(events, []);
    events = [];

    className = '1';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div class="1"></div>');
    assert.deepEqual(events, ['willUpdate', 'didUpdate']);
    events = [];

    className = '2';
    shouldUpdate = false;
    view.update();
    assert.htmlEqual(node.innerHTML, '<div class="1"></div>');
    assert.deepEqual(events, []);
    events = [];

    className = '3';
    shouldUpdate = true;
    view.update();
    assert.htmlEqual(node.innerHTML, '<div class="3"></div>');
    assert.deepEqual(events, ['willUpdate', 'didUpdate']);
  });
});

QUnit.test('willUpdate', function (this: { sinon: SinonStatic }, assert) {
  assert.expect(5);

  let updateValue = false;
  const classes = function () {
    return {
      oldValue: !updateValue,
      newValue: updateValue
    };
  };

  const willUpdateSpy = this.sinon.spy(() => {
    const node = RootViewHelper.node;

    assert.htmlEqual(node.innerHTML, '<div class="oldValue"></div>');
  });

  class View extends DCGView.View {
    template() {
      return <div class={classes}></div>;
    }
  }
  Reflect.set(View.prototype, 'willUpdate', willUpdateSpy);

  RootViewHelper.mount(View, () => {
    const node = RootViewHelper.node;
    const view = RootViewHelper.view;

    assert.htmlEqual(node.innerHTML, '<div class="oldValue"></div>');
    assert.equal(willUpdateSpy.callCount, 0);

    updateValue = true;
    view.update();

    assert.htmlEqual(node.innerHTML, '<div class="newValue"></div>');
    assert.equal(willUpdateSpy.callCount, 1);
  });
});

QUnit.test('didUpdate', function (this: { sinon: SinonStatic }, assert) {
  assert.expect(5);

  let updateValue = false;
  const classes = function () {
    return {
      oldValue: !updateValue,
      newValue: updateValue
    };
  };

  const didUpdateSpy = this.sinon.spy(() => {
    const node = RootViewHelper.node;

    assert.htmlEqual(node.innerHTML, '<div class="newValue"></div>');
  });

  class View extends DCGView.View {
    template() {
      return <div class={classes}></div>;
    }
  }
  Reflect.set(View.prototype, 'didUpdate', didUpdateSpy);

  RootViewHelper.mount(View, () => {
    const node = RootViewHelper.node;
    const view = RootViewHelper.view;

    assert.htmlEqual(node.innerHTML, '<div class="oldValue"></div>');
    assert.equal(didUpdateSpy.callCount, 0);

    updateValue = true;
    view.update();

    assert.htmlEqual(node.innerHTML, '<div class="newValue"></div>');
    assert.equal(didUpdateSpy.callCount, 1);
  });
});

QUnit.test(
  "childViews apply their bindings before parent's didUpdate",
  (assert) => {
    assert.expect(2);
    const order: number[] = [];

    class ChildView extends DCGView.View<{ key: () => number }> {
      template() {
        return <div />;
      }
      didUpdate() {
        order.push(this.props.key());
      }
    }

    class View extends DCGView.View {
      template() {
        return (
          <div>
            <ChildView key={this.const(1)} />
            <ChildView key={this.const(2)} />
          </div>
        );
      }
      didUpdate() {
        order.push(0);
      }
    }

    RootViewHelper.mount(View, () => {
      const view = RootViewHelper.view;

      assert.deepEqual(order, []);

      view.update();
      assert.deepEqual(order, [1, 2, 0]);
    });
  }
);

QUnit.test('shouldUpdate respects parent/child relationships', (assert) => {
  assert.expect(4);

  let shouldAUpdate = true;
  let shouldBUpdate = true;
  let shouldCUpdate = true;
  let updates: string[] = [];

  class A extends DCGView.View<{ children: DCGView.Child }> {
    template() {
      return <div>{this.props.children}</div>;
    }
    shouldUpdate() {
      return !!shouldAUpdate;
    }
    didUpdate() {
      updates.push('A');
    }
  }
  class B extends DCGView.View<{ children: DCGView.Child }> {
    template() {
      return <div>{this.props.children}</div>;
    }
    shouldUpdate() {
      return !!shouldBUpdate;
    }
    didUpdate() {
      updates.push('B');
    }
  }
  class C extends DCGView.View {
    template() {
      return <div>{this.props.children}</div>;
    }
    shouldUpdate() {
      return !!shouldCUpdate;
    }
    didUpdate() {
      updates.push('C');
    }
  }
  class View extends DCGView.View {
    template() {
      return (
        <A>
          <B>
            <C></C>
          </B>
        </A>
      );
    }
  }

  RootViewHelper.mount(View, () => {
    const view = RootViewHelper.view;

    updates = [];
    view.update();
    assert.deepEqual(updates, ['C', 'B', 'A']);

    updates = [];
    shouldAUpdate = false;
    view.update();
    assert.deepEqual(updates, []);

    updates = [];
    shouldAUpdate = true;
    shouldBUpdate = false;
    view.update();
    assert.deepEqual(updates, ['A']);

    updates = [];
    shouldBUpdate = true;
    shouldCUpdate = false;
    view.update();
    assert.deepEqual(updates, ['B', 'A']);
  });
});

QUnit.test(
  'externally defined children add bindings to parentView',
  (assert) => {
    assert.expect(5);

    let reports: string[] = [];
    const report = function (n: string) {
      reports.push(n);
    };

    let shouldAUpdate = true;
    let shouldBUpdate = true;

    class A extends DCGView.View<{ children: DCGView.Child }> {
      template() {
        return <div data-n={() => report('A')}>{this.props.children}</div>;
      }
      shouldUpdate() {
        return !!shouldAUpdate;
      }
    }

    class B extends DCGView.View<{ children: DCGView.Child }> {
      template() {
        return <div data-n={() => report('B')}>{this.props.children}</div>;
      }
      shouldUpdate() {
        return !!shouldBUpdate;
      }
    }

    class View extends DCGView.View<{ children: DCGView.Child }> {
      template() {
        return (
          <A>
            <B>
              <div data-n={() => report('C')}></div>
            </B>
          </A>
        );
      }
    }

    RootViewHelper.mount(View, () => {
      const view = RootViewHelper.view;

      assert.deepEqual(reports, ['A', 'B', 'C']);

      reports = [];
      view.update();
      assert.deepEqual(reports, ['A', 'B', 'C']);

      reports = [];
      shouldAUpdate = false;
      view.update();
      assert.deepEqual(reports, []);

      reports = [];
      shouldAUpdate = true;
      shouldBUpdate = false;
      view.update();
      assert.deepEqual(reports, ['A']);

      reports = [];
      shouldBUpdate = true;
      view.update();
      assert.deepEqual(reports, ['A', 'B', 'C']);
    });
  }
);

QUnit.test(
  'update does not work when unmounted',
  function (this: { sinon: SinonStatic }, assert) {
    assert.expect(4);

    const shouldUpdate = this.sinon.spy(() => {
      return true;
    });

    const warningSpy = this.sinon.spy();
    DCGView.addWarningHandler(warningSpy);

    class ViewNameHere extends DCGView.View {
      _viewName = 'ViewNameHere';

      template() {
        return <div />;
      }

      shouldUpdate = shouldUpdate;
    }

    let view: DCGView.ViewInstance;
    RootViewHelper.mount(ViewNameHere, () => {
      view = RootViewHelper.view;
    });

    assert.equal(warningSpy.callCount, 0);
    view!.update();
    assert.equal(shouldUpdate.callCount, 0);
    assert.equal(warningSpy.callCount, 1);
    assert.equal(
      warningSpy.args[0][0].toString(),
      'Error: Trying to update view that is not mounted. Ignoring update. [ViewNameHere]'
    );
  }
);
