/**
 * This file is used in conjunction with the `"jsx": "react-jsx"` TypeScript configuration to enable auto-importing of
 * the DCGView JSX runtime. `react-jsx` is a React-specific implementation, so there are some differences in both its
 * runtime and type-level behavior.
 *
 * - `jsx` and `jsxs` are the runtime functions used to create elements. `jsxs` is used when there are multiple
 *  children, whereas `jsx` is used when there is one or fewer children.
 * - `key` has special meaning in React and is stripped from the `props` object, passed as a separate argument to `jsx`
 *  and `jsxs`. `key` is not special in DCGView and is therefore re-added to `props`.
 * - `children` are included in the `props` object in React, but are a separate argument in DCGView, so `children` is
 *  manually stripped from the `props` object and used as its own argument.
 * - `Fragment` is instantiable in React and is thus expected to have a construct signature. In DCGView, `Fragment` is a
 *  symbol for what kind of element to create, so it is asserted as a constructor to satisfy TypeScript.
 * - `createElement` is still output in certain scenarios, e.g., when the `key` prop is used after spread attributes.
 *  Aliasing `jsx` to `createElement` in this runtime ensures that such transformed code correctly utilizes DCGView's
 *  element creation function.
 *
 * @see {@link https://github.com/reactjs/rfcs/blob/createlement-rfc/text/0000-create-element-changes.md}
 * @see {@link https://github.com/facebook/react/issues/20031}
 * @see {@link https://esbuild.github.io/api/#jsx-import-source}
 */

import {
  type Children,
  createSpec,
  FRAGMENT_SYMBOL,
  type ValidChildren
} from '../create-spec';

export function jsx<Props extends { key?: unknown; children?: ValidChildren }>(
  type: Parameters<typeof createSpec>[0],
  props: Props,
  ...args: unknown[]
) {
  return createSpec(
    type,
    !('key' in props) && args.length >= 1 ? { ...props, key: args[0] } : props
  );
}

export function jsxs<Props extends { key?: unknown; children: Children }>(
  type: Parameters<typeof createSpec>[0],
  props: Props,
  ...args: unknown[]
) {
  return jsx(type, props, ...args);
}

export const createElement = <Props extends { key?: unknown }>(
  type: Parameters<typeof createSpec>[0],
  props: Props,
  ...args: Children
) =>
  createSpec(type, {
    ...props,
    ...(args.length > 0 ? { children: args } : {})
  });

export const Fragment = FRAGMENT_SYMBOL as unknown as new (
  ...args: unknown[]
) => unknown;
