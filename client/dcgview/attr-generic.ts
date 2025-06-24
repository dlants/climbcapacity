import { update } from './attr';
import { isConst } from './const';

export function AttrGeneric(name: string, getter: (...args: any[]) => any) {
  let value = getter();
  let bindings;

  if (!isConst(getter)) {
    bindings = {
      onUpdate(node?: HTMLElement) {
        if (!node) {
          return;
        }

        const newValue = getter();
        if (newValue === value) {
          return;
        }

        value = newValue;
        update(node, name, newValue);
      }
    };
  }

  return { value, bindings };
}
