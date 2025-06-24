import * as DCGView from 'dcgview';

import { mount, node, view } from './root-view-helper.test';

QUnit.module('DCGViewCore::JSX Automatic');

QUnit.test('ref still work from root', (assert) => {
  assert.expect(3);

  class View extends DCGView.View<{ ref: string | (() => string) }> {
    template() {
      return <div>{this.props.ref}</div>;
    }
  }

  mount(View, { ref: 'static-ref' }, () => {
    assert.htmlEqual(node.innerHTML, '<div>static-ref</div>');
  });

  let dynamicRef = 'dynamic-ref';
  mount(View, { ref: () => dynamicRef }, () => {
    assert.htmlEqual(node.innerHTML, '<div>dynamic-ref</div>');

    dynamicRef = 'updated-ref';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>updated-ref</div>');
  });
});

QUnit.test('ref still work from parent', (assert) => {
  assert.expect(3);

  class Child extends DCGView.View<{ ref: string | (() => string) }> {
    template() {
      return <div>{this.props.ref}</div>;
    }
  }

  class View extends DCGView.View<{ ref: string | (() => string) }> {
    template() {
      return <Child ref={this.props.ref} />;
    }
  }

  mount(View, { ref: 'static-ref' }, () => {
    assert.htmlEqual(node.innerHTML, '<div>static-ref</div>');
  });

  let dynamicRef = 'dynamic-ref';
  mount(View, { ref: () => dynamicRef }, () => {
    assert.htmlEqual(node.innerHTML, '<div>dynamic-ref</div>');

    dynamicRef = 'updated-ref';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>updated-ref</div>');
  });
});

QUnit.test('ref still work from spread', (assert) => {
  assert.expect(3);

  class Child extends DCGView.View<{ ref: string | (() => string) }> {
    template() {
      return <div>{this.props.ref}</div>;
    }
  }

  class View extends DCGView.View<{ ref: string | (() => string) }> {
    template() {
      return <Child {...this.props} />;
    }
  }

  mount(View, { ref: 'static-ref' }, () => {
    assert.htmlEqual(node.innerHTML, '<div>static-ref</div>');
  });

  let dynamicRef = 'dynamic-ref';
  mount(View, { ref: () => dynamicRef }, () => {
    assert.htmlEqual(node.innerHTML, '<div>dynamic-ref</div>');

    dynamicRef = 'updated-ref';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>updated-ref</div>');
  });
});

QUnit.test('key still work from root', (assert) => {
  assert.expect(3);

  class View extends DCGView.View<{ key: string | (() => string) }> {
    template() {
      return <div>{this.props.key}</div>;
    }
  }

  mount(View, { key: 'static-key' }, () => {
    assert.htmlEqual(node.innerHTML, '<div>static-key</div>');
  });

  let dynamicKey = 'dynamic-key';
  mount(View, { key: () => dynamicKey }, () => {
    assert.htmlEqual(node.innerHTML, '<div>dynamic-key</div>');

    dynamicKey = 'updated-key';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>updated-key</div>');
  });
});

QUnit.test('key still work from parent', (assert) => {
  assert.expect(3);

  class Child extends DCGView.View<{ key: string | (() => string) }> {
    template() {
      return <div>{this.props.key}</div>;
    }
  }

  class View extends DCGView.View<{ key: string | (() => string) }> {
    template() {
      return <Child key={this.props.key} />;
    }
  }

  mount(View, { key: 'static-key' }, () => {
    assert.htmlEqual(node.innerHTML, '<div>static-key</div>');
  });

  let dynamicKey = 'dynamic-key';
  mount(View, { key: () => dynamicKey }, () => {
    assert.htmlEqual(node.innerHTML, '<div>dynamic-key</div>');

    dynamicKey = 'updated-key';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>updated-key</div>');
  });
});

QUnit.test('key still works from spread (no children)', (assert) => {
  assert.expect(3);

  class Child extends DCGView.View<{ key: string | (() => string) }> {
    template() {
      return <div>{this.props.key}</div>;
    }
  }

  class View extends DCGView.View<{ key: string | (() => string) }> {
    template() {
      return <Child {...this.props} />;
    }
  }

  mount(View, { key: 'static-key' }, () => {
    assert.htmlEqual(node.innerHTML, '<div>static-key</div>');
  });

  let dynamicKey = 'dynamic-key';
  mount(View, { key: () => dynamicKey }, () => {
    assert.htmlEqual(node.innerHTML, '<div>dynamic-key</div>');

    dynamicKey = 'updated-key';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>updated-key</div>');
  });
});

QUnit.test('key still works from spread (with children)', (assert) => {
  assert.expect(3);

  class Child extends DCGView.View<{
    key: string | (() => string);
    children?: unknown;
  }> {
    template() {
      return (
        <div>
          {this.props.key}
          {this.props.children}
        </div>
      );
    }
  }

  class View extends DCGView.View<{ key: string | (() => string) }> {
    template() {
      return <Child {...this.props}>::child_content::</Child>;
    }
  }

  mount(View, { key: 'static-key' }, () => {
    assert.htmlEqual(node.innerHTML, '<div>static-key::child_content::</div>');
  });

  let dynamicKey = 'dynamic-key';
  mount(View, { key: () => dynamicKey }, () => {
    assert.htmlEqual(node.innerHTML, '<div>dynamic-key::child_content::</div>');

    dynamicKey = 'updated-key';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>updated-key::child_content::</div>');
  });
});

QUnit.test('key still works before spread (no children)', (assert) => {
  assert.expect(3);

  class Child extends DCGView.View<{ key: string | (() => string) }> {
    template() {
      return <div>{this.props.key}</div>;
    }
  }

  class View extends DCGView.View<{ key: string | (() => string) }> {
    template() {
      return <Child key="ignored" {...(this.props as any)} />;
    }
  }

  mount(View, { key: 'static-key' }, () => {
    assert.htmlEqual(node.innerHTML, '<div>static-key</div>');
  });

  let dynamicKey = 'dynamic-key';
  mount(View, { key: () => dynamicKey }, () => {
    assert.htmlEqual(node.innerHTML, '<div>dynamic-key</div>');

    dynamicKey = 'updated-key';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>updated-key</div>');
  });
});

QUnit.test('key still works before spread (with children)', (assert) => {
  assert.expect(3);

  class Child extends DCGView.View<{
    key: string | (() => string);
    children?: unknown;
  }> {
    template() {
      return (
        <div>
          {this.props.key}
          {this.props.children}
        </div>
      );
    }
  }

  class View extends DCGView.View<{ key: string | (() => string) }> {
    template() {
      return (
        <Child key="ignored" {...(this.props as any)}>
          ::child_content::
        </Child>
      );
    }
  }

  mount(View, { key: 'static-key' }, () => {
    assert.htmlEqual(node.innerHTML, '<div>static-key::child_content::</div>');
  });

  let dynamicKey = 'dynamic-key';
  mount(View, { key: () => dynamicKey }, () => {
    assert.htmlEqual(node.innerHTML, '<div>dynamic-key::child_content::</div>');

    dynamicKey = 'updated-key';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>updated-key::child_content::</div>');
  });
});

QUnit.test('key still works after spread (no children)', (assert) => {
  assert.expect(3);

  class Child extends DCGView.View<{ key: string | (() => string) }> {
    template() {
      return <div>{this.props.key}</div>;
    }
  }

  class View extends DCGView.View<{ key: string | (() => string) }> {
    template() {
      return <Child {...(this.props as any)} key="forced" />;
    }
  }

  mount(View, { key: 'static-key' }, () => {
    assert.htmlEqual(node.innerHTML, '<div>forced</div>');
  });

  let dynamicKey = 'dynamic-key';
  mount(View, { key: () => dynamicKey }, () => {
    assert.htmlEqual(node.innerHTML, '<div>forced</div>');

    dynamicKey = 'updated-key';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>forced</div>');
  });
});

QUnit.test('key still works after spread (with children)', (assert) => {
  assert.expect(3);

  class Child extends DCGView.View<{
    key: string | (() => string);
    children?: unknown;
  }> {
    template() {
      return (
        <div>
          {this.props.key}
          {this.props.children}
        </div>
      );
    }
  }

  class View extends DCGView.View<{ key: string | (() => string) }> {
    template() {
      return (
        <Child {...(this.props as any)} key="forced">
          ::child_content::
        </Child>
      );
    }
  }

  mount(View, { key: 'static-key' }, () => {
    assert.htmlEqual(node.innerHTML, '<div>forced::child_content::</div>');
  });

  let dynamicKey = 'dynamic-key';
  mount(View, { key: () => dynamicKey }, () => {
    assert.htmlEqual(node.innerHTML, '<div>forced::child_content::</div>');

    dynamicKey = 'updated-key';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>forced::child_content::</div>');
  });
});

QUnit.test('key still works between spreads (no children)', (assert) => {
  assert.expect(3);

  class Child extends DCGView.View<{ key: string | (() => string) }> {
    template() {
      return <div>{this.props.key}</div>;
    }
  }

  class View extends DCGView.View<{ key: string | (() => string) }> {
    template() {
      return (
        <Child
          {...(this.props as any)}
          key="ignored"
          {...(this.props as any)}
        />
      );
    }
  }

  mount(View, { key: 'static-key' }, () => {
    assert.htmlEqual(node.innerHTML, '<div>static-key</div>');
  });

  let dynamicKey = 'dynamic-key';
  mount(View, { key: () => dynamicKey }, () => {
    assert.htmlEqual(node.innerHTML, '<div>dynamic-key</div>');

    dynamicKey = 'updated-key';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>updated-key</div>');
  });
});

QUnit.test('key still works between spreads (with children)', (assert) => {
  assert.expect(3);

  class Child extends DCGView.View<{
    key: string | (() => string);
    children?: unknown;
  }> {
    template() {
      return (
        <div>
          {this.props.key}
          {this.props.children}
        </div>
      );
    }
  }

  class View extends DCGView.View<{ key: string | (() => string) }> {
    template() {
      return (
        <Child {...(this.props as any)} key="ignored" {...(this.props as any)}>
          ::child_content::
        </Child>
      );
    }
  }

  mount(View, { key: 'static-key' }, () => {
    assert.htmlEqual(node.innerHTML, '<div>static-key::child_content::</div>');
  });

  let dynamicKey = 'dynamic-key';
  mount(View, { key: () => dynamicKey }, () => {
    assert.htmlEqual(node.innerHTML, '<div>dynamic-key::child_content::</div>');

    dynamicKey = 'updated-key';
    view.update();
    assert.htmlEqual(node.innerHTML, '<div>updated-key::child_content::</div>');
  });
});
