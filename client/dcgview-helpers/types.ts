import type * as DCGView from 'dcgview';

/**
 * Adds a `controller` property of a given type to the given DCGView properties type.
 */
export type PropsWithController<
  Controller,
  Props extends DCGView.Props = DCGView.DefaultProps
> = Props & {
  readonly controller: () => Controller;
};
