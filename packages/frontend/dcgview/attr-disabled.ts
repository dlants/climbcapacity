import { isConst } from "./const";

export type DisabledGetter = () => boolean;

export function AttrDisabled(getter: DisabledGetter) {
  let previousDisabled = getter();
  const bindings = isConst(getter)
    ? undefined
    : {
        onUpdate: (node: HTMLElement) => {
          const newDisabled = getter();
          if (previousDisabled !== newDisabled) {
            if (newDisabled) {
              node.setAttribute("disabled", "");
            } else {
              node.removeAttribute("disabled");
            }
            previousDisabled = newDisabled;
          }
        },
      };

  return {
    // HTML boolean attributes like 'disabled' are present when true (with any value, even empty string)
    // and absent when false. Using "" follows HTML convention for boolean attributes.
    value: previousDisabled ? "" : undefined,
    bindings,
  };
}
