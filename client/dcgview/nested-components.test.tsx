import * as DCGView from 'dcgview';

import { mount, node, view } from './root-view-helper.test';

const { If, Switch, For } = DCGView.Components;

QUnit.module('DCGViewCore::Nested components');

QUnit.test('complicated nested structure', (assert) => {
  assert.expect(7);

  let _predicateRoot = true;
  let _predicate = false;
  let _items = [1, 2, 4];
  let _key: number | undefined = 5;

  class View extends DCGView.View {
    template() {
      return (
        <If predicate={() => _predicateRoot}>
          {() => (
            <div id="id-root">
              <If predicate={() => _predicate}>
                {() => <span id="id-if">if</span>}
              </If>
              <ul id="id-ul">
                <For.Simple each={() => _items}>
                  {(item) => (
                    <li id={this.const(`id-li-${item}`)}>{this.const(item)}</li>
                  )}
                </For.Simple>
              </ul>
              <Switch key={() => _key}>
                {(name) => {
                  if (name != null) {
                    return (
                      <span id={this.const(`id-switch-${name}`)}>
                        {this.const(name)}
                      </span>
                    );
                  }

                  return undefined;
                }}
              </Switch>
            </div>
          )}
        </If>
      );
    }
  }

  mount(View, () => {
    assert.htmlEqual(
      node.innerHTML,
      [
        '<div id="id-root">',
        '<ul id="id-ul">',
        '<li id="id-li-1">1</li>',
        '<li id="id-li-2">2</li>',
        '<li id="id-li-4">4</li>',
        '</ul>',
        '<span id="id-switch-5">5</span>',
        '</div>'
      ].join('')
    );

    // hide all components
    _predicateRoot = false;
    view.update();
    assert.equal(node.childNodes.length, 1);
    assert.equal(node.firstChild?.nodeName, '#text');

    // update with all components hidden
    _predicate = true;
    view.update();
    assert.equal(node.childNodes.length, 1);
    assert.equal(node.firstChild?.nodeName, '#text');

    // update with main if false
    _predicateRoot = true;
    _key = undefined;
    _items.push(3);
    view.update();
    assert.htmlEqual(
      node.innerHTML,
      [
        '<div id="id-root">',
        '<span id="id-if">if</span>',
        '<ul id="id-ul">',
        '<li id="id-li-1">1</li>',
        '<li id="id-li-2">2</li>',
        '<li id="id-li-4">4</li>',
        '<li id="id-li-3">3</li>',
        '</ul>',
        '</div>'
      ].join('')
    );

    _predicateRoot = true;
    _key = 2;
    _items = [];
    view.update();
    assert.htmlEqual(
      node.innerHTML,
      [
        '<div id="id-root">',
        '<span id="id-if">if</span>',
        '<ul id="id-ul">',
        '</ul>',
        '<span id="id-switch-2">2</span>',
        '</div>'
      ].join('')
    );
  });
});
