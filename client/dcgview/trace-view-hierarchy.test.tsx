import * as DCGView from 'dcgview';

import * as RootViewHelper from './root-view-helper.test.js';

const { If, Switch, For, SwitchUnion, IfDefined, IfElse } = DCGView.Components;

QUnit.module('DCGViewCore::traceViewHierarchy');

QUnit.test('traceViewHierarchy() prints ancestor chain', (assert) => {
  assert.expect(2);

  class InnerView extends DCGView.View {
    _viewName = 'InnerView';

    didMount() {
      assert.equal(this.traceViewHierarchy().ancestors.length, 17);
      assert.equal(
        this.traceViewHierarchy().formatted,
        `\
<RootView>
  <If>
    <Switch>
      <For.Simple>
        <For>
          <IfDefined>
            <SwitchUnion>
              <IfElse>
                <InnerView>`
      );
    }

    template() {
      return <div />;
    }
  }

  class RootView extends DCGView.View {
    _viewName = 'RootView';

    template() {
      return (
        <div>
          <If predicate={() => true}>
            {() => (
              <div>
                <Switch key={() => 'key'}>
                  {() => (
                    <div>
                      <For.Simple each={() => [1]}>
                        {() =>
                          IfDefined(
                            () => 1 as any,
                            () =>
                              SwitchUnion(() => 'key', {
                                key: () =>
                                  IfElse(() => true, {
                                    false: () => <div />,
                                    true: () => <InnerView />
                                  })
                              })
                          )
                        }
                      </For.Simple>
                    </div>
                  )}
                </Switch>
              </div>
            )}
          </If>
        </div>
      );
    }
  }

  RootViewHelper.mount(RootView, {}, () => undefined);
});
