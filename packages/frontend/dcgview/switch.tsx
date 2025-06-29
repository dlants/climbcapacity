import { isConst } from './const';
import {
  createSpec,
  initDCGElementFromSpec,
  isSpec,
  type Spec
} from './create-spec';
import {
  createNodesForView,
  didMount,
  didUnmount,
  onMount,
  onUnmount,
  willMount,
  willUnmount
} from './mounting';
import { View, type ViewInstance } from './view';

class Wrapper extends View<{ children: Spec }> {
  _viewName = 'SwitchWrapper';

  template() {
    return this.props.children;
  }
}

type SwitchProps<Key = unknown> = {
  key: () => Key;
  children: (key: Key) => Spec | undefined;
};

export class Switch<Key = unknown> extends View<SwitchProps<Key>> {
  _viewName = 'Switch';
  private _key: Key;
  private _viewFunction: SwitchProps<Key>['children'];
  declare _element: ViewInstance; // in this View we know _element is a view

  // Map from item to key if a method is provided.
  // Otherwise use the item itself as the key.
  updateKey() {
    this._key = this.props.key();
  }

  createViewSpec() {
    const child = this._viewFunction(this._key) ?? <></>;

    return createSpec(Wrapper, { children: child });
  }

  createView() {
    const viewSpec = this.createViewSpec();
    const view = initDCGElementFromSpec(viewSpec);
    view._parentElement = this;
    return view;
  }

  template() {
    if (typeof this.props.key !== 'function') {
      throw new Error('<Switch key={}> must be a function');
    }

    if (!('children' in this.props)) {
      throw new Error('<Switch> expects a child.');
    }

    const { children } = this.props;

    if (Array.isArray(children)) {
      throw new Error(
        `<Switch> expects a single child. You passed ${children.length}.`
      );
    }

    if (isSpec(children)) {
      throw new Error(
        '<Switch> expects a function that constructs a DCGElement. You passed a DCGElement directly'
      );
    }

    if (typeof children !== 'function') {
      const json = JSON.stringify(children);
      throw new Error(
        '<Switch> expects a function that constructs a DCGElement. You passed ' +
          json
      );
    }

    if (isConst(children)) {
      throw new Error(
        '<Switch> expects a function that constructs a DCGElement. You passed a constant'
      );
    }

    this._viewFunction = children;

    // Generate and return the initial view
    this.updateKey();

    return this.createViewSpec();
  }

  updateChildren() {
    const oldKey = this._key;
    this.updateKey();
    const newKey = this._key;

    if (oldKey === newKey) {
      this._element.update();
      return;
    }

    // Would be simpler if we didn't unmount before mounting but we've built
    // code on that assumption and this is the order <For> does it. It's not
    // that much extra work to keep unmounting before
    const rootNodes = this.findAllRootDOMNodes();
    const placeholderNode = document.createTextNode('');
    rootNodes[0].before(placeholderNode);

    willUnmount(this._element);
    this._childViews = [];
    rootNodes.forEach((node) => node.remove());
    onUnmount(this._element);
    didUnmount(this._element);

    this._element = this.createView();
    const newDocFragment = createNodesForView(this._element, this)!;

    willMount(this._element);
    placeholderNode.before(newDocFragment);
    placeholderNode.remove();
    onMount(this._element);
    didMount(this._element);
  }
}
