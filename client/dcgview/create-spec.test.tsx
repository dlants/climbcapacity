// @ts-nocheck
import * as DCGView from 'dcgview';

import * as Const from './const';
import { createSpec } from './create-spec';

QUnit.module('DCGViewCore::DCGView().createElement()');

function toHTML(view) {
  const docFrag = document.createDocumentFragment();
  view.renderTo(docFrag);
  return docFrag.firstChild.outerHTML;
}

QUnit.test(
  'it throws errors if type is not String or DCGView class',
  (assert) => {
    assert.expect(3);

    assert.throws(() => {
      class View extends DCGView.View {
        template() {
          return createSpec();
        }
      }

      new View({})._construct();
    });

    assert.throws(() => {
      class View extends DCGView.View {
        template() {
          createSpec(2);
        }
      }

      new View({})._construct();
    });

    assert.throws(() => {
      class View extends DCGView.View {
        template() {
          createSpec({});
        }
      }

      new View({})._construct();
    });
  }
);

QUnit.test('it renders when type is a string', (assert) => {
  assert.expect(2);

  class View extends DCGView.View {
    template() {
      const result = createSpec('one', {
        height: this.const('23px'),
        cat: this.const('meow'),
        children: [
          createSpec('twoa'),
          [
            createSpec('twob', {
              hello: this.const('world'),
              children: this.const('hello world')
            }),
            createSpec('twoc', {
              hello: this.const('world2'),
              children: createSpec('three')
            })
          ]
        ]
      });

      return result;
    }
  }

  const parts = [];
  parts.push('<one height="23px" cat="meow">');
  parts.push('<twoa></twoa>');
  parts.push('<twob hello="world">hello world</twob>');
  parts.push('<twoc hello="world2">');
  parts.push('<three></three>');
  parts.push('</twoc>');
  parts.push('</one>');

  const view = new View({})._construct();
  assert.equal(toHTML(view), parts.join(''));
  assert.equal(view._childViews.length, 0);
});

QUnit.test('it renders when type is a DCGView.View', (assert) => {
  assert.expect(3);

  class BasicView extends DCGView.View {
    template() {
      const result = createSpec('one', {
        height: this.const('23px'),
        cat: this.const('meow'),
        children: [
          createSpec('twoa'),
          [
            createSpec('twob', {
              hello: this.const('world'),
              children: this.const('hello world')
            }),
            createSpec('twoc', {
              hello: this.const('world2'),
              children: createSpec('three')
            })
          ]
        ]
      });

      return result;
    }
  }

  class View extends DCGView.View {
    template() {
      return createSpec(BasicView);
    }
  }

  const parts = [];
  parts.push('<one height="23px" cat="meow">');
  parts.push('<twoa></twoa>');
  parts.push('<twob hello="world">hello world</twob>');
  parts.push('<twoc hello="world2">');
  parts.push('<three></three>');
  parts.push('</twoc>');
  parts.push('</one>');

  const view = new View({})._construct();
  assert.equal(toHTML(view), parts.join(''));
  assert.equal(view._childViews.length, 1);
  assert.equal(view._childViews[0] instanceof BasicView, true);
});

QUnit.test('it can pass children through', (assert) => {
  assert.expect(3);

  class FirstAndLastChildView extends DCGView.View {
    template() {
      const attrs = {
        props: this.const(
          Object.keys(this.props)
            .filter((key) => key !== 'children')
            .join(',')
        )
      };
      const firstChild = this.props.children[0];
      const lastChild = this.props.children[this.props.children.length - 1];
      return createSpec('div', {
        ...attrs,
        children: [firstChild, lastChild]
      });
    }
  }

  class View extends DCGView.View {
    template() {
      const result = createSpec(FirstAndLastChildView, {
        height: this.const('23px'),
        cat: this.const('meow'),
        children: [
          createSpec('twoa'),
          [
            createSpec('twob', {
              hello: this.const('world'),
              children: this.const('hello world')
            }),
            createSpec('twoc', {
              hello: this.const('world2'),
              children: createSpec('three')
            })
          ]
        ]
      });

      return result;
    }
  }

  const parts = [];
  parts.push('<div props="height,cat">');
  parts.push('<twoa></twoa>');
  parts.push('<twoc hello="world2">');
  parts.push('<three></three>');
  parts.push('</twoc>');
  parts.push('</div>');

  const view = new View({})._construct();
  assert.equal(toHTML(view), parts.join(''));
  assert.equal(view._childViews.length, 1);
  assert.equal(view._childViews[0] instanceof FirstAndLastChildView, true);
});

QUnit.test('class and style attrs are parsed', (assert) => {
  assert.expect(3);

  const classes = Const.makeConst({
    selected: true,
    highlight: false,
    haha: 'lol'
  });

  const styles = Const.makeConst({
    transform: 'yup'
  });

  class ChildView extends DCGView.View {
    template() {
      const appendedStyles = {
        position: 'relative'
      };
      const propStyles = this.props.style();
      for (const i in propStyles) {
        appendedStyles[i] = propStyles[i];
      }

      return createSpec('div', {
        style: this.const(appendedStyles),
        children: createSpec('span', { class: this.const('d e') })
      });
    }
  }

  class View extends DCGView.View {
    template() {
      return createSpec('div', {
        class: classes,
        style: this.const('a;b;c'),
        cat: this.const('meow'),
        children: createSpec(ChildView, { style: styles })
      });
    }
  }

  const parts = [];
  parts.push('<div class="selected haha" style="a;b;c" cat="meow">');
  parts.push('<div style="position:relative;transform:yup">');
  parts.push('<span class="d e"></span>');
  parts.push('</div>');
  parts.push('</div>');

  const view = new View({})._construct();
  assert.equal(toHTML(view), parts.join(''));
  assert.equal(view._childViews.length, 1);
  assert.equal(view._childViews[0] instanceof ChildView, true);
});

QUnit.test('childViews nest correctly', (assert) => {
  assert.expect(1);

  class Wrapper1 extends DCGView.View {
    init() {
      this.type = 'Wrapper1';
    }
    template() {
      return createSpec('div', { children: this.props.children });
    }
  }
  class Wrapper2 extends DCGView.View {
    init() {
      this.type = 'Wrapper2';
    }
    template() {
      return createSpec('span', { children: this.props.children });
    }
  }
  class Wrapper3 extends DCGView.View {
    init() {
      this.type = 'Wrapper3';
    }
    template() {
      return createSpec('span', { children: this.props.children });
    }
  }
  class Nested extends DCGView.View {
    init() {
      this.type = 'Nested';
    }
    template() {
      return createSpec(Wrapper3, {
        children: [
          createSpec('div'),
          createSpec('div', {
            children: [
              createSpec(Wrapper1),
              createSpec('div'),
              createSpec(Wrapper2)
            ]
          }),
          createSpec(Wrapper1, {
            children: [
              createSpec(Wrapper3, {
                children: [createSpec(Wrapper2), createSpec(Wrapper2)]
              }),
              createSpec('div'),
              createSpec(Wrapper1)
            ]
          })
        ]
      });
    }
  }
  class View extends DCGView.View {
    init() {
      this.type = 'Main';
    }
    template() {
      return createSpec('div', {
        children: [
          createSpec(Wrapper1, {
            children: [
              createSpec('div'),
              createSpec('div', {
                children: [
                  createSpec(Wrapper2),
                  createSpec('div'),
                  createSpec(Wrapper2)
                ]
              })
            ]
          }),
          createSpec(Nested),
          createSpec('div', {
            children: [
              createSpec('div'),
              createSpec('div', {
                children: [
                  createSpec(Wrapper2),
                  createSpec('div'),
                  createSpec(Wrapper1),
                  createSpec(Wrapper3)
                ]
              })
            ]
          })
        ]
      });
    }
  }

  const view = new View({})._construct();
  toHTML(view);

  function getChildStruct(view) {
    return {
      type: view.type,
      childViews: view._childViews.map(getChildStruct)
    };
  }

  assert.deepEqual(getChildStruct(view), {
    type: 'Main',
    childViews: [
      {
        type: 'Wrapper1',
        childViews: [
          { type: 'Wrapper2', childViews: [] },
          { type: 'Wrapper2', childViews: [] }
        ]
      },
      {
        type: 'Nested',
        childViews: [
          {
            type: 'Wrapper3',
            childViews: [
              { type: 'Wrapper1', childViews: [] },
              { type: 'Wrapper2', childViews: [] },
              {
                type: 'Wrapper1',
                childViews: [
                  {
                    type: 'Wrapper3',
                    childViews: [
                      { type: 'Wrapper2', childViews: [] },
                      { type: 'Wrapper2', childViews: [] }
                    ]
                  },
                  { type: 'Wrapper1', childViews: [] }
                ]
              }
            ]
          }
        ]
      },
      { type: 'Wrapper2', childViews: [] },
      { type: 'Wrapper1', childViews: [] },
      { type: 'Wrapper3', childViews: [] }
    ]
  });
});
