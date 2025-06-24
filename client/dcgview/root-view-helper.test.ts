import * as DCGView from 'dcgview';

export let node: HTMLElement;
export let view: DCGView.ViewInstance;

export function mount<Class extends DCGView.ViewClass>(
  View: Class,
  cb?: Function
): void;

export function mount<Class extends DCGView.ViewClass>(
  View: Class,
  props: DCGView.PropsOf<Class>,
  cb: Function
): void;

export function mount<Class extends DCGView.ViewClass>(
  View: Class,
  secondParameter: Function | DCGView.PropsOf<Class> = () => {},
  thirdParameter?: Function
): void {
  if (typeof secondParameter === 'function') {
    thirdParameter = secondParameter;
    secondParameter = {} as DCGView.PropsOf<Class>;
  }

  const maybeNode = document.getElementById('qunit-fixture');
  if (!maybeNode) {
    return;
  }

  node = maybeNode;

  view = DCGView.mountToNode(View, node, secondParameter);

  try {
    if (thirdParameter) {
      thirdParameter();
    }
  } finally {
    const prevNode = node;
    node = undefined as any;
    view = undefined as any;

    DCGView.unmountFromNode(prevNode);
  }
}

export function findSingleRootTestNode() {
  const nodes = node.childNodes;
  if (nodes.length !== 1) {
    throw new Error(`expected exactly 1 root node but got: ${nodes.length}`);
  }
  return nodes[0];
}
