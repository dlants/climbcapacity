import { computeKeyMutations } from './compute-key-mutations';
import { isConst } from './const';
import { createSpec } from './create-spec';
import {
  FRAGMENT_SYMBOL,
  type FragmentSpec,
  type HTMLSpec,
  initDCGElementFromSpec,
  isSpec,
  type Spec
} from './create-spec';
import {
  type DCGElementRenderTarget,
  type DCGFragmentElement
} from './dcg-element';
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

const validateChildren = (children: unknown) => {
  if (Array.isArray(children)) {
    throw new Error(
      `<For> expects a single child. You passed ${children.length}.`
    );
  }

  if (isSpec(children)) {
    throw new Error(
      '<For> expects a function that constructs a DCGElement. You passed a DCGElement directly'
    );
  }

  if (typeof children !== 'function') {
    const json = JSON.stringify(children);
    throw new Error(
      `<For> expects a function that constructs a DCGElement. You passed ${json}`
    );
  }

  if (isConst(children)) {
    throw new Error(
      '<For> expects a function that constructs a DCGElement. You passed a constant'
    );
  }
};

type SimpleForProps<Items extends ForKey[] | readonly ForKey[]> = Omit<
  ForProps<Items, Items[number]>,
  'children' | 'key'
> & {
  children: (item: Items[number], getIndex: () => number) => Spec;
};

class SimpleFor<Items extends ForKey[] | readonly ForKey[]> extends View<
  SimpleForProps<Items>
> {
  override _viewName = 'For.Simple';

  override template() {
    const { children } = this.props;
    validateChildren(children);

    return (
      <For each={this.props.each} key={(item) => item}>
        {(getItem, getIndex) => children(getItem(), getIndex)}
      </For>
    );
  }
}

type ForCountProps = {
  from?: () => number;
  count: () => number;
  children: (index: number) => Spec;
};

class ForCount extends View<ForCountProps> {
  override _viewName = 'For.Count';

  makeStepsArray() {
    const from = this.props.from ? this.props.from() : 0;
    const count = Math.floor(this.props.count());

    if (!isFinite(from) || !isFinite(count)) return [];

    return Array.from({ length: count }, (_, index) => from + index);
  }

  override template() {
    return (
      <For each={() => this.makeStepsArray()} key={(item) => item}>
        {(getItem) => this.props.children(getItem())}
      </For>
    );
  }
}

class Wrapper extends View<{
  children: HTMLSpec | FragmentSpec;
}> {
  override _viewName = 'ForWrapper';

  override template() {
    return this.props.children;
  }
}

export type ForKey = string | number;

export type ForProps<Items extends unknown[] | readonly unknown[], Key> = {
  each: () => Items;
  key: (item: Items[number], index: number, items: Items) => Key;
  children: (item: () => Items[number], getIndex: () => number) => Spec;
};

export class For<
  Items extends unknown[] | readonly unknown[],
  Key
> extends View<ForProps<Items, Key>> {
  static readonly Simple = SimpleFor;
  static readonly Count = ForCount;

  override _viewName = 'For';
  private _keys: Key[];
  private readonly _keyToData = new Map<
    Key,
    { item: Items[number]; index: number }
  >();
  private readonly _keyToView = new Map<Key, ViewInstance>();
  private _viewFunction: ForProps<Items, Key>['children'];

  // TODO - would be great to just have the _element be a single DCGFragmentElement
  // rather than putting an empty one at the start and end as
  private _startPlaceholder: DCGFragmentElement;
  private _endPlaceholder: DCGFragmentElement;

  private getKeys() {
    this._keyToData.clear();

    const items = this.props.each();
    if (!Array.isArray(items)) {
      throw new Error('<For each={}> must return an array');
    }

    // Map from item to key if a method is provided. Otherwise use the item itself as the key.
    const keys = items.map((item, index) => this.props.key(item, index, items));

    keys.forEach((key, index) => {
      if (this._keyToData.has(key)) {
        throw new Error(`The key: ${JSON.stringify(key)} is not unique`);
      }

      this._keyToData.set(key, {
        item: items[index],
        index
      });
    });

    return keys as Key[];
  }

  private createViewForKey(key: Key) {
    // TODO: Don't accept items and only accept keys. This will make code that
    // uses <For/> more robust to subtle mistakes, and it'll minimize the work
    // that <For/> has to do.
    let lastKnownValue = this._keyToData.get(key)!;
    const element = this._viewFunction.call(
      this,
      () => {
        if (this._keyToData.has(key)) {
          lastKnownValue = this._keyToData.get(key)!;
        }
        return lastKnownValue.item;
      },
      () => {
        if (this._keyToData.has(key)) {
          lastKnownValue = this._keyToData.get(key)!;
        }
        return lastKnownValue.index;
      }
    );
    if (isSpec(element) && element.type === 'view') {
      const view = initDCGElementFromSpec(element);
      this._keyToView.set(key, view);
      return view;
    }

    // If we didn't return a view, wrap it up. It's important that this is
    // actually a view because we call methods only available on views.
    const view = initDCGElementFromSpec(
      createSpec(Wrapper, { children: element })
    );
    this._keyToView.set(key, view);

    return view;
  }

  // Updates childViews to not include any of the removed views, in O(n) time
  // and in place without copying the array.
  private detachAllRemovedViews() {
    const childViews = this._childViews;
    let r = 0;

    // Runs through each item in childViews and compacts the array. It'll shift
    // existing views into the spots of the views that got removed.
    // childViews = [0,1,2,3,4,5]
    // removing 1 and 3
    // ---> [0,2,4,5,4,5]
    for (let index = 0; index < childViews.length; index++) {
      const view = childViews[index];
      if (view._willBeUnmounted) {
        r++;
      } else {
        childViews[index - r] = view;
      }
    }

    // Removes the last r items from the end of the array
    // r=2, childViews = [0,2,4,5,4,5]
    // --> [0,2,4, 5]
    childViews.splice(childViews.length - r, r);
  }

  override findFirstRootDOMNode() {
    return this._startPlaceholder.findFirstRootDOMNode();
  }

  override findLastRootDOMNode() {
    return this._endPlaceholder.findLastRootDOMNode();
  }

  // Overrides the update method to have deep control over how to update.
  override updateChildren() {
    const oldKeys = this._keys;
    const newKeys = this.getKeys();
    this._keys = newKeys;

    const mutations = computeKeyMutations(oldKeys, newKeys);

    const removedViews = [];
    for (let index = mutations.removes.length - 1; index >= 0; index--) {
      const key = mutations.removes[index];
      const view = this._keyToView.get(key)!;

      willUnmount(view);

      this._keyToView.delete(key);
      view._willBeUnmounted = true;
      view.findAllRootDOMNodes().forEach((node) => node.remove());

      removedViews.push(view);
    }

    if (removedViews.length > 0) {
      this.detachAllRemovedViews();
      removedViews.forEach(onUnmount);
      removedViews.forEach(didUnmount);
    }

    const newViews = [];
    for (let index = mutations.inserts.length - 1; index >= 0; index--) {
      const key = mutations.inserts[index].key;

      if (this._keyToView.has(key)) {
        continue;
      }

      const view = this.createViewForKey(key);

      createNodesForView(view, this);
      newViews.push(view);
    }

    // Mount the new views and move any old views
    newViews.forEach(willMount);
    mutations.inserts.forEach((insert) => {
      const fromNodes = this._keyToView.get(insert.key)!.findAllRootDOMNodes();
      let endNode: ChildNode;
      if ('beforeKey' in insert) {
        endNode = this._keyToView
          .get(insert.beforeKey!)!
          .findFirstRootDOMNode();
      } else {
        endNode = this.findLastRootDOMNode();
      }
      fromNodes.forEach((node) => {
        endNode.before(node);
      });
    });
    newViews.forEach(onMount);
    newViews.forEach(didMount);

    // We don't need to update the most recently added views, so we reimplement
    // updateChildViews here and skip the end of the list
    for (
      let index = 0;
      index < this._childViews.length - newViews.length;
      index++
    ) {
      this._childViews[index].update();
    }
  }

  override renderTo(target: DCGElementRenderTarget, view: View) {
    // automatically renders the _startPlaceholder
    super.renderTo(target, view);
    this._startPlaceholder = this._element as DCGFragmentElement;

    // render initial set of children
    for (const key of this._keys) {
      const childView = this._keyToView.get(key)!;
      childView.renderTo(target, this);
    }

    this._endPlaceholder = initDCGElementFromSpec(createSpec(FRAGMENT_SYMBOL));
    this._endPlaceholder.renderTo(target, view);
  }

  override template() {
    if (typeof this.props.each !== 'function') {
      throw new Error('<For each={}> must be a function');
    }

    if (!('children' in this.props)) {
      throw new Error('<For> expects a child.');
    }

    const { children } = this.props;

    validateChildren(children);

    this._viewFunction = children;

    this._keys = this.getKeys();

    this._keys.map((key) => {
      const child = this.createViewForKey(key);
      child._parentElement = this;
      return child;
    });

    return <></>;
  }
}
