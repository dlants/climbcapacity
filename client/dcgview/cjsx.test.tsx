import * as DCGView from 'dcgview';

import { mount, node } from './root-view-helper.test';

QUnit.module('DCGViewCore::CJSX tests');

QUnit.test('generally seems to work', (assert) => {
  assert.expect(1);

  const attrs = {
    'data-b': DCGView.const(5),
    'data-c': DCGView.const(2)
  };

  class View extends DCGView.View {
    getABC(i: number) {
      return this.const('abc' + i);
    }
    createElementZ() {
      return this.const('yup');
    }
    template() {
      return (
        <div>
          {this.createElementZ()}
          <span data-a="1" {...attrs} data-d="0">
            {this.getABC(0)}
          </span>
          {[1, 2, 3].map((i) =>
            ((i) => {
              return <div>{this.getABC(i)}</div>;
            })(i)
          )}
        </div>
      );
    }
  }

  mount(View, () =>
    assert.htmlEqual(
      node.innerHTML,
      [
        '<div>',
        'yup',
        '<span data-a="1" data-b="5" data-c="2" data-d="0">abc0</span>',
        '<div>abc1</div>',
        '<div>abc2</div>',
        '<div>abc3</div>',
        '</div>'
      ].join('')
    )
  );
});

QUnit.test('extending class with init property assignment works', (assert) => {
  assert.expect(1);

  class View extends DCGView.View {
    private text: string;

    init() {
      this.text = 'can extend class';
    }
    getText() {
      return this.text;
    }
    template() {
      return <div>{this.getText()}</div>;
    }
  }

  mount(View, () =>
    assert.htmlEqual(node.innerHTML, '<div>can extend class</div>')
  );
});

QUnit.test('extending class with field initializer works', (assert) => {
  assert.expect(1);

  class View extends DCGView.View {
    private text = 'can extend class';
    getText() {
      return this.text;
    }
    template() {
      return <div>{this.getText()}</div>;
    }
  }

  mount(View, () =>
    assert.htmlEqual(node.innerHTML, '<div>can extend class</div>')
  );
});

QUnit.test('extending class with constructor works', (assert) => {
  assert.expect(1);

  class View extends DCGView.View {
    private text: string;

    constructor(props: {}) {
      super(props);
      this.text = 'can extend class';
    }
    getText() {
      return this.text;
    }
    template() {
      return <div>{this.getText()}</div>;
    }
  }

  mount(View, () =>
    assert.htmlEqual(node.innerHTML, '<div>can extend class</div>')
  );
});

QUnit.test('field initializer gets overwritten by init', (assert) => {
  assert.expect(1);

  class View extends DCGView.View {
    private text = 'field initializer';
    init() {
      this.text = 'init';
    }
    getText() {
      return this.text;
    }
    template() {
      return <div>{this.getText()}</div>;
    }
  }

  mount(View, () => assert.htmlEqual(node.innerHTML, '<div>init</div>'));
});

QUnit.test('constructor can use values from field initializers', (assert) => {
  assert.expect(1);

  class View extends DCGView.View {
    private text = 'field initializer';
    constructor(props: {}) {
      super(props);
      assert.equal(this.text, 'field initializer');
    }
    template() {
      return <div>constructor</div>;
    }
  }

  mount(View, () => {});
});

QUnit.test('field initializer can use value from props', function (assert) {
  assert.expect(1);

  class View extends DCGView.View<{ text: () => string }> {
    private text = this.props.text();
    getText() {
      return this.text;
    }
    template() {
      return <div>{this.getText()}</div>;
    }
  }

  mount(View, { text: DCGView.const('foo') }, () =>
    assert.htmlEqual(node.innerHTML, '<div>foo</div>')
  );
});

QUnit.test('constructor can use value from props', (assert) => {
  assert.expect(1);

  class View extends DCGView.View<{ text: () => string }> {
    private text: string;

    constructor(props: { text: () => string }) {
      super(props);
      this.text = props.text();
    }
    getText() {
      return this.text;
    }
    template() {
      return <div>{this.getText()}</div>;
    }
  }

  mount(View, { text: DCGView.const('foo') }, () =>
    assert.htmlEqual(node.innerHTML, '<div>foo</div>')
  );
});
