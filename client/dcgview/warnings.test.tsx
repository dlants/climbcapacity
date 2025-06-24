import * as DCGView from 'dcgview';
import { type SinonStatic } from 'sinon';

import { warn } from './warnings';

QUnit.module('DCGViewCore::Warnings');

QUnit.test(
  'warnings call handlers with all props',
  function (this: { sinon: SinonStatic }, assert) {
    assert.expect(7);
    warn('nothing should happen!');

    const spy1 = this.sinon.spy();
    DCGView.addWarningHandler(spy1);

    warn('warn 1');
    // @ts-expect-error
    warn('warn 2', 'second prop');

    const spy2 = this.sinon.spy();
    DCGView.addWarningHandler(spy2);

    warn('warn 3');

    assert.deepEqual(
      spy1.args.map((e) => e.toString()),
      ['Error: warn 1', 'Error: warn 2', 'Error: warn 3']
    );
    assert.deepEqual(
      spy2.args.map((e) => e.toString()),
      ['Error: warn 3']
    );
    assert.ok(spy2.args[0][0].stack.split('\n').length > 3, 'has stacktrace');
    spy1.reset();
    spy2.reset();

    DCGView.removeWarningHandler(spy1);
    warn('warn 4');

    assert.deepEqual(
      spy1.args.map((e) => e.toString()),
      []
    );
    assert.deepEqual(
      spy2.args.map((e) => e.toString()),
      ['Error: warn 4']
    );
    spy1.reset();
    spy2.reset();

    DCGView.removeWarningHandler(spy2);
    warn('warn 5');

    assert.deepEqual(
      spy1.args.map((e) => e.toString()),
      []
    );
    assert.deepEqual(
      spy2.args.map((e) => e.toString()),
      []
    );
  }
);
