import { AttrClass } from "./attr-class";
import { AttrLifeCycle } from "./attr-lifecycle";
import { AttrStyle } from "./attr-style";
import { AttrDisabled } from "./attr-disabled";
import { AttrChecked } from "./attr-checked";
import { AttrSelected } from "./attr-selected";
import { addCustomAttribute } from "./custom-attributes";

export * as Components from "./components";
export { makeConst as const, isConst } from "./const";
export {
  type Child,
  type Children,
  type DefaultProps,
  type FragmentSpec,
  type HTMLSpec,
  isSpec,
  type ValidProp as Prop,
  type ValidProps as Props,
  type Spec,
  type ViewSpec,
} from "./create-spec";
export { addCustomAttribute } from "./custom-attributes";
export type { HTMLProps } from "./jsx";
export { mountToNode, unmountFromNode } from "./mounting";
export { type PropsOf, View, type ViewClass, type ViewInstance } from "./view";
export { addWarningHandler, removeWarningHandler } from "./warnings";

addCustomAttribute("style", AttrStyle);
addCustomAttribute("class", AttrClass);
addCustomAttribute("disabled", AttrDisabled);
addCustomAttribute("checked", AttrChecked);
addCustomAttribute("selected", AttrSelected);

[
  "willMount",
  "onMount",
  "didMount",
  "willUnmount",
  "onUnmount",
  "didUnmount",
  "willUpdate",
  "onUpdate",
  "didUpdate",
].forEach((event) => addCustomAttribute(event, AttrLifeCycle(event)));
