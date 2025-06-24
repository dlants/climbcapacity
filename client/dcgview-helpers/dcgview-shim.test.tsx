import * as DCGView from 'dcgview';
import DCGViewHelper from 'test/dcgview-helper';

type TestExtras = {
  mount: (template: any) => void;
  helper: DCGViewHelper;
  sinon: any;
};

type MountThis = {
  props: any;
};

QUnit.module('DCGView Shim', {
  beforeEach: function (this: TestExtras) {
    this.mount = (template) => {
      class View extends DCGView.View {
        template = template;
      }

      this.helper = new DCGViewHelper({
        class: View,
        callbacks: {
          cb: this.sinon.spy()
        }
      });
      this.helper.mountView();
    };
  },

  afterEach: function (this: TestExtras) {
    this.helper.unmountView();
  }
});

QUnit.test('onTap attribute', function (this: TestExtras) {
  QUnit.expect(2);
  this.mount(function (this: MountThis) {
    return <div class="btn" onTap={this.props.cb} />;
  });

  QUnit.strictEqual(
    this.helper.findNodeByInput('.btn')!.getAttribute('ontap'),
    ''
  );
  this.helper.trigger('.btn', 'dcg-tap');
  QUnit.equal(this.helper.props.cb.callCount, 1, 'cb called');
});

QUnit.test('onTapStart attribute', function (this: TestExtras) {
  QUnit.expect(2);
  this.mount(function (this: MountThis) {
    return <div class="btn" onTapStart={this.props.cb} />;
  });

  QUnit.strictEqual(
    this.helper.findNodeByInput('.btn')!.getAttribute('ontapstart'),
    null
  );
  this.helper.trigger('.btn', 'dcg-tapstart');
  QUnit.equal(this.helper.props.cb.callCount, 1, 'cb called');
});

QUnit.test('onTapMove attribute', function (this: TestExtras) {
  QUnit.expect(2);
  this.mount(function (this: MountThis) {
    return <div class="btn" onTapMove={this.props.cb} />;
  });

  QUnit.strictEqual(
    this.helper.findNodeByInput('.btn')!.getAttribute('ontapmove'),
    null
  );
  this.helper.trigger('.btn', 'dcg-tapmove');
  QUnit.equal(this.helper.props.cb.callCount, 1, 'cb called');
});

QUnit.test('onTapEnd attribute', function (this: TestExtras) {
  QUnit.expect(2);
  this.mount(function (this: MountThis) {
    return <div class="btn" onTapEnd={this.props.cb} />;
  });

  QUnit.strictEqual(
    this.helper.findNodeByInput('.btn')!.getAttribute('ontapend'),
    null
  );
  this.helper.trigger('.btn', 'dcg-tapend');
  QUnit.equal(this.helper.props.cb.callCount, 1, 'cb called');
});

QUnit.test('onLongHold attribute', function (this: TestExtras) {
  QUnit.expect(2);
  this.mount(function (this: MountThis) {
    return <div class="btn" onLongHold={this.props.cb} />;
  });

  QUnit.strictEqual(
    this.helper.findNodeByInput('.btn')!.getAttribute('onlonghold'),
    null
  );
  this.helper.trigger('.btn', 'dcg-longhold');
  QUnit.equal(this.helper.props.cb.callCount, 1, 'cb called');
});
