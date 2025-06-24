import * as DCGView from 'dcgview';
import { type SinonStatic } from 'sinon';

import * as RootViewHelper from './root-view-helper.test.js';

QUnit.module('DCGViewCore::Mount update regression');

QUnit.test(
  'Regression: update() from within didMount causes element to be mounted twice',
  function (this: { sinon: SinonStatic }, assert) {
    assert.expect(2);

    const warningSpy = this.sinon.spy();
    DCGView.addWarningHandler(warningSpy);

    let innerElementMounted = 0;
    class View extends DCGView.View {
      private showInnerView = false;
      _viewName = 'View';

      template() {
        return (
          <div
            didMount={() => {
              this.showInnerView = true;
              this.update();
            }}
          >
            <DCGView.Components.If predicate={() => this.showInnerView}>
              {() => (
                <div
                  didMount={() => {
                    innerElementMounted++;
                  }}
                >
                  Blah
                </div>
              )}
            </DCGView.Components.If>
          </div>
        );
      }
    }

    RootViewHelper.mount(View, {}, () => {
      assert.equal(innerElementMounted, 1, 'inner element mounted only once');
      assert.deepEqual(
        warningSpy.args.map((e) => e.toString()),
        [
          'Error: didMount is a one-time binding but was called multiple times [SwitchWrapper]\n' +
            'View Hierarchy:\n<View>\n  <If>'
        ]
      );
      DCGView.removeWarningHandler(warningSpy);
    });
  }
);
