export function update(node: HTMLElement, attribute: string, value: unknown) {
  return value === undefined
    ? node.removeAttribute(attribute)
    : node.setAttribute(attribute, `${value}`);
}
