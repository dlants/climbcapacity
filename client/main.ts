import { init, VNode, h } from 'snabbdom';

// Patches
const patch = init([]);

// Model
type Model = {
  count: number;
}

// Msg
type Msg =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' };

// Update
function update(msg: Msg, model: Model): Model {
  switch (msg.type) {
    case 'INCREMENT':
      return { ...model, count: model.count + 1 };
    case 'DECREMENT':
      return { ...model, count: model.count - 1 };
  }
}

// View
function view(model: Model, dispatch: (msg: Msg) => void): VNode {
  return h('div', [
    h('button', { on: { click: () => dispatch({ type: 'DECREMENT' }) } }, '-'),
    h('span', ` ${model.count} `),
    h('button', { on: { click: () => dispatch({ type: 'INCREMENT' }) } }, '+'),
  ]);
}

// App
class App {
  private model: Model = { count: 0 };
  private element: Element;
  private vnode: VNode;

  constructor(element: Element) {
    this.element = element;
    this.vnode = view(this.model, this.dispatch.bind(this));
    patch(element, this.vnode);
  }

  private dispatch(msg: Msg) {
    this.model = update(msg, this.model);
    const newVnode = view(this.model, this.dispatch.bind(this));
    this.vnode = patch(this.vnode, newVnode);
  }
}

// Mount
new App(document.getElementById('app')!);
