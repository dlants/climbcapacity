import * as DCGView from 'dcgview';

import { mount, view } from './root-view-helper.test';

declare global {
  interface Window {
    xss_calls: number;
    xss: () => void;
  }
}

QUnit.module('DCGViewCore::XSS', {
  beforeEach() {
    Object.defineProperties(window, {
      xss_calls: {
        value: 0,
        writable: true
      },
      xss: {
        value: () => window.xss_calls++,
        writable: true
      }
    });
  },
  afterEach() {
    Reflect.deleteProperty(window, 'xss_calls');
    Reflect.deleteProperty(window, 'xss');
  }
});

const attrVector = '"><img src=x onerror=window.xss()>';
const bodyVector = '<img src=x onerror=window.xss()>';

// checks if we can execute malicious code. Has a timeout because
// it might take some time for the image load to fail and the
// onerror callback to fire.
const checkForXSS = function (assert: Assert, expected: number) {
  const done = assert.async();
  return setTimeout(() => {
    assert.equal(window.xss_calls, expected);
    return done();
  }, 1000);
};

const VulnerableAttrView = (prop: () => string) =>
  class View extends DCGView.View {
    template() {
      return <div didMount={this.didMountRoot.bind(this)} />;
    }
    didMountRoot(node: HTMLElement) {
      node.innerHTML = '<div data-attr="' + prop() + '"></div>';
    }
  };

const VulnerableBodyView = (prop: () => string) =>
  class View extends DCGView.View {
    template() {
      return <div didMount={this.didMountRoot.bind(this)} />;
    }
    didMountRoot(node: HTMLElement) {
      node.innerHTML = prop();
    }
  };

const SecureBodyView = (prop: () => string) =>
  class View extends DCGView.View {
    template() {
      return <div>{prop}</div>;
    }
  };

const SecureAttrView = (prop: () => string) =>
  class View extends DCGView.View {
    template() {
      return <div data-attr={prop} />;
    }
  };

QUnit.test('body text DOES allow XSS if using .innerHTML', (assert) => {
  assert.expect(1);
  const getText = DCGView.const(bodyVector);

  mount(VulnerableBodyView(getText));
  checkForXSS(assert, 1);
});

QUnit.test('constant body text DOES NOT allow XSS', (assert) => {
  assert.expect(1);
  const getText = DCGView.const(bodyVector);

  mount(SecureBodyView(getText));
  checkForXSS(assert, 0);
});

QUnit.test('original body text DOES NOT allow XSS', (assert) => {
  assert.expect(1);
  const getText = () => bodyVector;

  mount(SecureBodyView(getText));
  checkForXSS(assert, 0);
});

QUnit.test('updated body text DOES NOT allow XSS', (assert) => {
  assert.expect(1);
  let text = '';
  const getText = () => text;

  mount(SecureBodyView(getText), () => {
    text = bodyVector;
    view.update();
  });
  checkForXSS(assert, 0);
});

QUnit.test('attr text DOES allow XSS if using .innerHTML', (assert) => {
  assert.expect(1);
  const getText = DCGView.const(attrVector);

  mount(VulnerableAttrView(getText));
  checkForXSS(assert, 1);
});

QUnit.test('constant attr text DOES NOT allow XSS', (assert) => {
  assert.expect(1);
  const getText = DCGView.const(attrVector);

  mount(SecureAttrView(getText));
  checkForXSS(assert, 0);
});

QUnit.test('original attr text DOES NOT allow XSS', (assert) => {
  assert.expect(1);
  const getText = () => attrVector;

  mount(SecureAttrView(getText));
  checkForXSS(assert, 0);
});

QUnit.test('updated attr text DOES NOT allow XSS', (assert) => {
  assert.expect(1);
  let text = '';
  const getText = () => text;

  mount(SecureAttrView(getText), () => {
    text = attrVector;
    view.update();
  });
  checkForXSS(assert, 0);
});
