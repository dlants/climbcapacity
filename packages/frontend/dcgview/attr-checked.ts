import { isConst } from "./const";

export type CheckedGetter = () => boolean;

export function AttrChecked(getter: CheckedGetter) {
  let previousChecked = getter();
  const bindings = isConst(getter)
    ? undefined
    : {
        onUpdate: (node: HTMLElement) => {
          const newChecked = getter();
          if (previousChecked !== newChecked) {
            if (newChecked) {
              node.setAttribute("checked", "");
            } else {
              node.removeAttribute("checked");
            }
            previousChecked = newChecked;
          }
        },
      };

  return {
    // HTML boolean attributes like 'checked' are present when true (with any value, even empty string)
    // and absent when false. Using "" follows HTML convention for boolean attributes.
    value: previousChecked ? "" : undefined,
    bindings,
  };
}