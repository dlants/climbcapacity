import { AttrEventHandler } from './attr-event-handler';
import { AttrGeneric } from './attr-generic';
import { isCustomAttribute, parseCustomAttribute } from './custom-attributes';
import { isEventHandler } from './is-event-handler';
import type { HTMLProps } from './jsx';

export function parseAttr(name: string, value: HTMLProps[keyof HTMLProps]) {
  if (typeof value !== 'function') {
    throw new Error(
      `Expected the "${name}" attribute to be a function, but got ${JSON.stringify(value)} instead.`
    );
  }

  if (isCustomAttribute(name)) {
    return parseCustomAttribute(name, value);
  }

  if (isEventHandler(name)) {
    return AttrEventHandler(name, value);
  }

  return AttrGeneric(name, value);
}
