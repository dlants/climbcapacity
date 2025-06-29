import { update } from './attr';
import { isConst } from './const';

export type StyleGetter = () => string | Record<string, unknown>;

function getterToString(getter: StyleGetter) {
  const data = getter();
  if (typeof data === 'string') {
    return data;
  }

  if (!data || typeof data !== 'object') {
    throw new Error(
      `Unsupported type returned from style getter: ${typeof data}`
    );
  }

  return Object.entries(data)
    .filter(
      ([prop, value]) =>
        data.hasOwnProperty(prop) && value !== null && value !== undefined
    )
    .map(([prop, val]) => `${prop}:${val}`)
    .join(';');
}

export function AttrStyle(getter: StyleGetter) {
  let previousStyles = getterToString(getter);
  const bindings = isConst(getter)
    ? undefined
    : {
        onUpdate: (node: HTMLElement) => {
          const newStyles = getterToString(getter);
          if (previousStyles !== newStyles) {
            update(node, 'style', newStyles);
            previousStyles = newStyles;
          }
        }
      };

  return {
    value: previousStyles,
    bindings
  };
}
