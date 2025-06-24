import type { EmptyObject } from '@knox/common';

import {
  type DCGElement,
  DCGFragmentElement,
  DCGHTMLElement
} from './dcg-element';
import type { HTMLElementName, HTMLProps } from './jsx';
import { type PropsOf, View, type ViewClass, type ViewInstance } from './view';

export const FRAGMENT_SYMBOL = Symbol();

export type Child = unknown;
export type Children = unknown[];

export type ValidChildren = Children | Child;

type NormalizedChild = NonNullable<Child>;
export type NormalizedChildren = NormalizedChild[];

type ViewChildren = NormalizedChild | NormalizedChildren | undefined;

export type ValidProp<T> = T | (() => T | undefined);
export type ValidProps = Record<PropertyKey, unknown>;

export type DefaultProps = EmptyObject;

type FragmentProps = EmptyObject;

/**
 * Removes `null` and `undefined` values, and flattens nested arrays.
 */
const normalizeChildren = (item: ValidChildren, pushTo: NormalizedChildren) => {
  if (item === null || item === undefined) {
    return;
  }

  if (Array.isArray(item)) {
    item.forEach((child) => normalizeChildren(child, pushTo));
  } else {
    pushTo.push(item);
  }
};

export type ViewSpec = {
  isDCGElementSpec: true;
  type: 'view';
  viewClass: ViewClass;
  viewName?: string;
  props: { children: ViewChildren };
};

export type HTMLSpec = {
  isDCGElementSpec: true;
  type: 'element';
  tagName: HTMLElementName;
  props: Omit<HTMLProps, 'children'> & { children: NormalizedChildren };
};

export type FragmentSpec = {
  isDCGElementSpec: true;
  type: 'fragment';
  children: NormalizedChildren;
};

export type Spec = ViewSpec | HTMLSpec | FragmentSpec;

export function isSpec(arg: unknown): arg is Spec {
  return !!(arg as any)?.isDCGElementSpec;
}

export function initDCGElementFromSpec(spec: FragmentSpec): DCGFragmentElement;
export function initDCGElementFromSpec(spec: HTMLSpec): DCGHTMLElement;
export function initDCGElementFromSpec(spec: ViewSpec): ViewInstance;
export function initDCGElementFromSpec(spec: Spec): DCGElement;
export function initDCGElementFromSpec(spec: Spec): DCGElement {
  switch (spec.type) {
    case 'fragment':
      return new DCGFragmentElement(spec.children);

    case 'element':
      return new DCGHTMLElement(spec.tagName, spec.props);

    case 'view':
      const view = new spec.viewClass(spec.props)._construct();
      if (spec.viewName) {
        view._viewName = spec.viewName;
      }
      return view;

    default:
      spec satisfies never;
  }

  throw new Error('could not init DCGElementSpec.');
}

export function createSpec(
  type: typeof FRAGMENT_SYMBOL,
  props?: { children?: ValidChildren }
): FragmentSpec;

export function createSpec<Name extends HTMLElementName>(
  name: Name,
  props?: HTMLProps<HTMLElementTagNameMap[Name]>
): ViewSpec;

export function createSpec<
  Class extends ViewClass,
  Props extends PropsOf<Class> = PropsOf<Class>
>(type: Class, props: Props): ViewSpec;

export function createSpec<
  Props extends FragmentProps | HTMLProps | ValidProps
>(
  type: typeof FRAGMENT_SYMBOL | HTMLElementName | ViewClass,
  props: Props = {} as Props
): Spec {
  const normalizedChildren: NormalizedChildren = [];
  if ('children' in props) {
    const children = Array.isArray(props.children)
      ? props.children
      : [props.children];
    children.forEach((arg) => normalizeChildren(arg, normalizedChildren));
  }

  if (type === FRAGMENT_SYMBOL) {
    return {
      isDCGElementSpec: true,
      type: 'fragment',
      children: normalizedChildren
    };
  }

  if (typeof type === 'string') {
    return {
      isDCGElementSpec: true,
      type: 'element',
      tagName: type,
      props: { ...props, children: normalizedChildren }
    };
  }

  if (type === View || type.prototype instanceof View) {
    let viewChildren: ViewChildren;
    if (normalizedChildren.length === 1) {
      viewChildren = normalizedChildren[0];
    } else if (normalizedChildren.length > 1) {
      viewChildren = normalizedChildren;
    }

    return {
      isDCGElementSpec: true,
      type: 'view',
      viewClass: type,
      props: { ...props, children: viewChildren }
    };
  }

  throw new Error(
    `Expected type to be a Fragment symbol, string, or View class, but got ${type}.`
  );
}
