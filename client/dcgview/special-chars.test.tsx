import * as DCGView from 'dcgview';

import { mount, node } from './root-view-helper.test';

QUnit.module('DCGViewCore::special characters');

QUnit.test('renders unicode characters and \'"', (assert) => {
  assert.expect(1);

  class View extends DCGView.View {
    template() {
      return <div>'"&rarr;</div>;
    }
  }

  // eslint-disable-next-line no-useless-escape
  mount(View, () => assert.equal(node.textContent, `'"\u2192`));
});
