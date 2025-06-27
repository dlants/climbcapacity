import { parseAttr } from './bind-attrs';
import { addBinding, invokeBinding } from './bindings';
import { makeConst } from './const';
import {
  type DefaultProps,
  initDCGElementFromSpec,
  isSpec,
  type Spec,
  type ValidProps
} from './create-spec';
import { DCGElement, type DCGElementRenderTarget } from './dcg-element';
import type { HTMLProps } from './jsx';
import { warn } from './warnings';

export const isView = (arg: unknown): arg is View => arg instanceof View;

type FunctionProps<Props extends ValidProps> = Props extends DefaultProps
  ? DefaultProps
  : {
      [Key in keyof Props]: Key extends 'children'
        ? Props[Key]
        : ((...args: any[]) => any) extends Props[Key]
          ? Props[Key]
          : () => Props[Key];
    };

export class View<Props extends ValidProps = DefaultProps> extends DCGElement {
  _viewName: string;
  _childViews: ViewInstance[] = [];
  _bindings: Record<string, ((...args: any[]) => any)[]> = {};
  _element: DCGElement;
  _elementSpec: Spec;
  _isMounted = false;
  _willBeUnmounted = false;
  willMount?(): void;
  onMount?(): void;
  didMount?(): void;
  willUnmount?(): void;
  onUnmount?(): void;
  didUnmount?(): void;

  protected shouldUpdate?(): boolean;
  protected willUpdate?(): void;
  protected onUpdate?(): void;
  protected didUpdate?(): void;

  protected init() {}

  protected template(): Spec {
    throw new Error('template() must be implemented');
  }

  constructor(readonly props: FunctionProps<Props>) {
    super();

    this._viewName = this.constructor?.name ?? 'Anonymous DCGView';
  }

  _construct() {
    this.init?.();

    const template = this.template();
    if (!isSpec(template)) {
      throw new Error('template() must return a DCGElement');
    }

    this._elementSpec = template;

    return this;
  }

  bindFn<Fn extends (...args: any) => any>(fn: Fn) {
    return fn.bind(this) as Fn;
  }

  bindIfMounted<Fn extends (...args: any) => any>(fn: Fn) {
    return this.bindFn((...args: Parameters<Fn>) => {
      if (!this._isMounted) {
        return;
      }

      return fn.apply(this, args) as Fn;
    });
  }

  traceViewHierarchy() {
    const ancestors = [];
    let view = this._parentElement;
    while (view) {
      ancestors.unshift(view);
      view = view._parentElement;
    }

    const isViewValid = (view: unknown): view is View =>
      isView(view) &&
      !(
        view._viewName === 'Switch' &&
        isView(view._parentElement) &&
        view._parentElement._viewName === 'If'
      ) &&
      !['ForWrapper', 'SwitchWrapper'].includes(view._viewName);

    const formatted = [...ancestors, this]
      .filter(isViewValid)
      .map((view, index) => '  '.repeat(index) + '<' + view._viewName + '>')
      .join('\n');

    return { ancestors, formatted };
  }

  renderTo(target: DCGElementRenderTarget, view?: ViewInstance) {
    if (view) {
      view._childViews.push(this);
    }

    this._element = initDCGElementFromSpec(this._elementSpec);
    this._element._parentElement = this;

    this._element.renderTo(target, this);
  }

  findFirstRootDOMNode(): ChildNode {
    return this._element.findFirstRootDOMNode();
  }

  /**
   * Can be overriden by views like <For>. Otherwise will return the same thing as findFirstRootDOMNode.
   */
  findLastRootDOMNode(): ChildNode {
    return this._element.findLastRootDOMNode();
  }

  findAllRootDOMNodes(): ChildNode[] {
    const firstNode = this.findFirstRootDOMNode();
    const lastNode = this.findLastRootDOMNode();

    const nodes = [];
    let currentNode: ChildNode | null = firstNode;
    while (currentNode) {
      nodes.push(currentNode);
      if (currentNode === lastNode) break;
      currentNode = currentNode.nextSibling;
    }

    return nodes;
  }

  update() {
    if (!this._isMounted) {
      return warn(
        'Trying to update view that is not mounted. Ignoring update.',
        this
      );
    }

    if (this.shouldUpdate && !this.shouldUpdate()) {
      return;
    }

    this.willUpdate?.();
    invokeBinding(this, 'willUpdate');

    invokeBinding(this, 'onUpdate');
    this.onUpdate?.();

    this.updateChildren();

    invokeBinding(this, 'didUpdate');
    this.didUpdate?.();
  }

  updateChildren() {
    this._childViews.forEach((view) => view.update());
  }

  bindText(target: DCGElementRenderTarget, getter: () => string) {
    let previousValue = getter();
    const textNode = document.createTextNode(previousValue);

    target.appendChild(textNode);

    addBinding(this, 'onUpdate', () => {
      const newValue = getter();
      if (previousValue === newValue) {
        return;
      }

      textNode.nodeValue = newValue;
      previousValue = newValue;
    });
  }

  private addAttributeBindingsTo(
    node: HTMLElement,
    bindings: Exclude<
      Exclude<ReturnType<typeof parseAttr>, void>['bindings'],
      undefined
    >
  ) {
    Object.entries(bindings).forEach(([name, fn]) => {
      if (!fn) {
        return;
      }

      const nodeBindings = [
        'onMount',
        'didMount',
        'willUnmount',
        'willUpdate',
        'onUpdate',
        'didUpdate'
      ];
      if (nodeBindings.includes(name)) {
        fn = fn.bind(null, node);
      }

      const oneTimeBindings = [
        'willMount',
        'onMount',
        'didMount',
        'willUnmount',
        'onUnmount',
        'didUnmount'
      ];
      if (oneTimeBindings.includes(name)) {
        let hasBeenCalled = false;
        const fnCopy = fn as (...args: unknown[]) => void;
        fn = (...args: unknown[]) => {
          if (hasBeenCalled) {
            warn(
              `${name} is a one-time binding but was called multiple times`,
              this
            );
            return;
          }

          hasBeenCalled = true;
          fnCopy(...args);
        };
      }

      const binding = this._bindings[name];
      this._bindings[name] = binding ? [...binding, fn] : [fn];
    });
  }

  bindAttributesTo(node: HTMLElement, props: HTMLProps) {
    (
      Object.keys(props).filter(
        (key) => key !== 'children'
      ) as (keyof HTMLProps)[]
    ).forEach((key) => {
      const attribute = parseAttr(key, props[key]);
      if (!attribute) {
        return;
      }

      if ('value' in attribute && attribute.value !== undefined) {
        node.setAttribute(key, String(attribute.value));
      }

      if (attribute.bindings) {
        this.addAttributeBindingsTo(node, attribute.bindings);
      }
    });
  }

  const = makeConst as <T>(value: T) => () => T;
}

export type ViewClass = typeof View<ValidProps>;
export type ViewInstance = InstanceType<typeof View<ValidProps>>;
export type PropsOf<Class extends ViewClass> = Class extends {
  new (...args: any[]): InstanceType<Class>;
}
  ? InstanceType<Class>['props']
  : DefaultProps;
