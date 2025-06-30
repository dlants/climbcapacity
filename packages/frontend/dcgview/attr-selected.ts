import { isConst } from "./const";

export type SelectedGetter = () => boolean;

export function AttrSelected(getter: SelectedGetter) {
  let previousSelected = getter();
  const bindings = isConst(getter)
    ? undefined
    : {
        onUpdate: (node: HTMLElement) => {
          const newSelected = getter();
          if (previousSelected !== newSelected) {
            if (newSelected) {
              node.setAttribute("selected", "");
            } else {
              node.removeAttribute("selected");
            }
            previousSelected = newSelected;
          }
        },
      };

  return {
    // HTML boolean attributes like 'selected' are present when true (with any value, even empty string)
    // and absent when false. Using "" follows HTML convention for boolean attributes.
    value: previousSelected ? "" : undefined,
    bindings,
  };
}