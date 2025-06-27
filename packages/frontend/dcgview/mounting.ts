import { invokeBinding } from './bindings';
import type { ValidProps } from './create-spec';
import { type PropsOf, type ViewClass, type ViewInstance } from './view';

type MountableHTMLElement = HTMLElement & {
  _mountedDCGView?: ViewInstance;
};

export function mountToNode<Class extends ViewClass>(
  ViewClass: Class,
  node: HTMLElement,
  props: PropsOf<Class>
): InstanceType<Class>;
export function mountToNode(
  ViewClass: ViewClass,
  node: HTMLElement,
  props: ValidProps
): ViewInstance {
  if (!node || node.nodeType !== 1) {
    throw new Error('Must pass an HTMLElement for the node');
  }

  if ((node as MountableHTMLElement)._mountedDCGView) {
    throw new Error('This node is already mounted by a view');
  }

  const view = new ViewClass(props)._construct();
  const documentFragment = document.createDocumentFragment();
  view.renderTo(documentFragment);

  node.innerHTML = '';

  willMount(view);
  (node as MountableHTMLElement)._mountedDCGView = view;
  node.appendChild(documentFragment);
  onMount(view);
  didMount(view);

  return view;
}

export function unmountFromNode(node: HTMLElement) {
  const view = (node as MountableHTMLElement)._mountedDCGView;
  if (!view) {
    throw new Error('This node is not mounted by a DCGView');
  }

  willUnmount(view);
  node.innerHTML = '';
  delete (node as MountableHTMLElement)._mountedDCGView;
  onUnmount(view);
  didUnmount(view);
}

export function willMount(view: ViewInstance) {
  if (view.willMount) {
    view.willMount();
  }

  invokeBinding(view, 'willMount');
  view._childViews.forEach(willMount);
}

export function onMount(view: ViewInstance) {
  view._isMounted = true;

  if (view.onMount) {
    view.onMount();
  }

  invokeBinding(view, 'onMount');
  view._childViews.forEach(onMount);
}

export function didMount(view: ViewInstance) {
  if (view.didMount) {
    view.didMount();
  }

  invokeBinding(view, 'didMount');
  view._childViews.forEach(didMount);
}

export function willUnmount(view: ViewInstance) {
  if (view.willUnmount) {
    view.willUnmount();
  }

  invokeBinding(view, 'willUnmount');
  view._childViews.forEach(willUnmount);
}

export function onUnmount(view: ViewInstance) {
  view._isMounted = false;
  view._childViews.forEach(onUnmount);
  invokeBinding(view, 'onUnmount');

  if (view.onUnmount) {
    view.onUnmount();
  }
}

export function didUnmount(view: ViewInstance) {
  view._childViews.forEach(didUnmount);
  invokeBinding(view, 'didUnmount');

  if (view.didUnmount) {
    view.didUnmount();
  }
}

export function createNodesForView(
  view: ViewInstance,
  parentView: ViewInstance
) {
  const documentFragment = document.createDocumentFragment();
  view.renderTo(documentFragment, parentView);
  return documentFragment;
}
