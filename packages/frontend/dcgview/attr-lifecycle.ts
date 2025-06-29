import { isConst } from './const';

type Callback = (node: HTMLElement) => void;
type ReturnBindings<T extends string> = {
  bindings: Record<T, Callback>;
};

export function AttrLifeCycle<T extends string>(
  event: T
): (c: Callback) => ReturnBindings<T> {
  return (callback: Callback) => {
    if (typeof callback !== 'function') {
      throw new Error(
        `The ${event} attribute expects a function for the value`
      );
    }

    if (isConst(callback)) {
      throw new Error(
        `The ${event} attribute does not expect a const for the value`
      );
    }

    return { bindings: { [event]: callback } } as ReturnBindings<T>;
  };
}
