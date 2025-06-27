import { isConst } from './const';
import {
  initDCGElementFromSpec,
  isSpec,
  type NormalizedChildren
} from './create-spec';
import type { HTMLProps } from './jsx';
import { type View, type ViewInstance } from './view';

export type DCGElementRenderTarget = DocumentFragment | HTMLElement;

export abstract class DCGElement {
  _parentElement: DCGElement;

  abstract findFirstRootDOMNode(): ChildNode;
  abstract findLastRootDOMNode(): ChildNode;
  abstract renderTo(target: DCGElementRenderTarget, view: ViewInstance): void;
}

export class DCGHTMLElement extends DCGElement {
  private _element: HTMLElement;

  constructor(
    private readonly tagName: string,
    private readonly props: HTMLProps
  ) {
    super();
  }

  findFirstRootDOMNode() {
    return this._element;
  }

  findLastRootDOMNode() {
    return this._element;
  }

  renderTo(target: DCGElementRenderTarget, view: View) {
    this._element = document.createElement(this.tagName);

    view.bindAttributesTo(this._element, this.props);
    target.appendChild(this._element);

    if ('children' in this.props) {
      const children = Array.isArray(this.props.children)
        ? this.props.children
        : [this.props.children];
      renderChildrenTo(children, view, this._element, this);
    }
  }
}

export class DCGFragmentElement extends DCGElement {
  private readonly _startPlaceholder: Text;
  private readonly _endPlaceholder: Text;

  constructor(private readonly children: NormalizedChildren = []) {
    super();

    this._startPlaceholder = document.createTextNode('');
    if (children.length) {
      this._endPlaceholder = document.createTextNode('');
    } else {
      this._endPlaceholder = this._startPlaceholder;
    }
  }

  findFirstRootDOMNode() {
    return this._startPlaceholder;
  }

  findLastRootDOMNode() {
    return this._endPlaceholder;
  }

  renderTo(target: DCGElementRenderTarget, view: View) {
    target.appendChild(this._startPlaceholder);

    renderChildrenTo(this.children, view, target, this);

    if (this._endPlaceholder !== this._startPlaceholder) {
      target.appendChild(this._endPlaceholder);
    }
  }
}

function renderChildrenTo(
  children: NormalizedChildren,
  view: View,
  target: DCGElementRenderTarget,
  parentElement: DCGElement
) {
  children.forEach((child) => {
    if (isSpec(child)) {
      const childElement = initDCGElementFromSpec(child);
      childElement.renderTo(target, view);
      childElement._parentElement = parentElement;
      return;
    }

    if (isConst(child)) {
      target.appendChild(document.createTextNode(String(child())));
      return;
    }

    if (typeof child === 'function') {
      view.bindText(target, () => {
        const value = child();
        if (value === null || value === undefined) {
          return '';
        }

        if (typeof value === 'string') {
          return value;
        }

        return String(value);
      });
      return;
    }

    target.appendChild(document.createTextNode(String(child)));
  });
}
