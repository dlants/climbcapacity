import * as DCGView from 'dcgview';

import * as RootViewHelper from './root-view-helper.test';

const { If, For } = DCGView.Components;

QUnit.module('DCGViewCore::Fragments');

QUnit.test('fragment sanity check', (assert) => {
  assert.expect(2);

  let variable = 5;

  class View extends DCGView.View {
    template() {
      return (
        <div>
          <>
            <span>{() => variable}</span>
            <span>2</span>
            {() => variable}
            true
          </>
        </div>
      );
    }
  }

  RootViewHelper.mount(View, () => {
    const { node, view } = RootViewHelper;

    assert.htmlEqual(
      node.innerHTML,
      ['<div>', '<span>5</span>', '<span>2</span>', '5', 'true', '</div>'].join(
        ''
      )
    );

    variable = 10;
    view.update();

    assert.htmlEqual(
      node.innerHTML,
      [
        '<div>',
        '<span>10</span>',
        '<span>2</span>',
        '10',
        'true',
        '</div>'
      ].join('')
    );
  });
});

QUnit.test('fragment without parent element', (assert) => {
  assert.expect(2);

  let variable = 5;

  class View extends DCGView.View<{ children: DCGView.Child }> {
    template() {
      return <>{this.props.children}</>;
    }
  }

  class RootView extends DCGView.View<{ children: DCGView.Child }> {
    template() {
      return (
        <View>
          <>
            <span>{() => variable}</span>
            <span>2</span>
            {() => variable}
            true
          </>
        </View>
      );
    }
  }

  RootViewHelper.mount(RootView, () => {
    const { node, view } = RootViewHelper;

    assert.htmlEqual(
      node.innerHTML,
      ['<span>5</span>', '<span>2</span>', '5', 'true'].join('')
    );

    variable = 10;
    view.update();

    assert.htmlEqual(
      node.innerHTML,
      ['<span>10</span>', '<span>2</span>', '10', 'true'].join('')
    );
  });
});

QUnit.test('fragment within If', (assert) => {
  assert.expect(3);

  let variable = 5;
  let showIf = true;

  class View extends DCGView.View<{ children: DCGView.Child }> {
    template() {
      return (
        <If predicate={() => showIf}>
          {() => (
            <>
              <span>{() => variable}</span>
              <span>2</span>
              {() => variable}
              true
            </>
          )}
        </If>
      );
    }
  }

  RootViewHelper.mount(View, () => {
    const { node, view } = RootViewHelper;

    assert.htmlEqual(
      node.innerHTML,
      ['<span>5</span>', '<span>2</span>', '5', 'true'].join('')
    );

    variable = 10;
    showIf = false;
    view.update();

    assert.htmlEqual(node.innerHTML, '');

    showIf = true;
    view.update();

    assert.htmlEqual(
      node.innerHTML,
      ['<span>10</span>', '<span>2</span>', '10', 'true'].join('')
    );
  });
});

QUnit.test('fragment within For', (assert) => {
  assert.expect(5);

  const items = [
    { key: 1, value: 1 },
    { key: 2, value: 2 },
    { key: 3, value: 3 }
  ];

  class View extends DCGView.View<{ children: DCGView.Child }> {
    template() {
      return (
        <For each={() => items} key={(item) => item.key}>
          {(getItem) => (
            <>
              key: <span>{getItem().key}</span> value: {() => getItem().value}
              <br />
            </>
          )}
        </For>
      );
    }
  }

  RootViewHelper.mount(View, () => {
    const { node, view } = RootViewHelper;

    assert.htmlEqual(
      node.innerHTML,
      [
        'key: <span>1</span> value: 1<br>',
        'key: <span>2</span> value: 2<br>',
        'key: <span>3</span> value: 3<br>'
      ].join('')
    );

    items.splice(1, 1);
    view.update();
    assert.htmlEqual(
      node.innerHTML,
      [
        'key: <span>1</span> value: 1<br>',
        'key: <span>3</span> value: 3<br>'
      ].join('')
    );

    items.splice(1, 0, { key: 4, value: 4 });
    view.update();
    assert.htmlEqual(
      node.innerHTML,
      [
        'key: <span>1</span> value: 1<br>',
        'key: <span>4</span> value: 4<br>',
        'key: <span>3</span> value: 3<br>'
      ].join('')
    );

    items.reverse();
    view.update();
    assert.htmlEqual(
      node.innerHTML,
      [
        'key: <span>3</span> value: 3<br>',
        'key: <span>4</span> value: 4<br>',
        'key: <span>1</span> value: 1<br>'
      ].join('')
    );

    items[0].value = -1;
    view.update();
    assert.htmlEqual(
      node.innerHTML,
      [
        'key: <span>3</span> value: -1<br>',
        'key: <span>4</span> value: 4<br>',
        'key: <span>1</span> value: 1<br>'
      ].join('')
    );
  });
});

QUnit.test('nested fragments (no elements)', (assert) => {
  assert.expect(2);

  const staticVariable = 'static';
  let dynamiVariable = 'dynamic';

  class View extends DCGView.View<{ children: DCGView.Child }> {
    template() {
      return (
        <>
          <>
            {staticVariable}
            <>
              <> </>
            </>
            <>{() => dynamiVariable}</>
          </>
        </>
      );
    }
  }

  RootViewHelper.mount(View, () => {
    const { node, view } = RootViewHelper;

    assert.htmlEqual(node.innerHTML, 'static dynamic');

    dynamiVariable = 'updated';
    view.update();
    assert.htmlEqual(node.innerHTML, 'static updated');
  });
});

QUnit.test('nested fragments (elements)', (assert) => {
  assert.expect(2);

  const staticVariable = 'static';
  let dynamiVariable = 'dynamic';

  class View extends DCGView.View<{ children: DCGView.Child }> {
    template() {
      return (
        <>
          <>
            {staticVariable}
            <>
              <> </>
            </>
            <span>
              <>
                {() => dynamiVariable}
                <>
                  <>
                    <span> </span>
                    <>{staticVariable}</>
                  </>
                </>
              </>
            </span>
            <></>
          </>
        </>
      );
    }
  }

  RootViewHelper.mount(View, () => {
    const { node, view } = RootViewHelper;

    assert.htmlEqual(
      node.innerHTML,
      'static <span>dynamic<span> </span>static</span>'
    );

    dynamiVariable = 'updated';
    view.update();
    assert.htmlEqual(
      node.innerHTML,
      'static <span>updated<span> </span>static</span>'
    );
  });
});
