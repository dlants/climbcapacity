import type { NonstandardEventHandlers } from './jsx';

type AttributeHandlerReturn = {
  value?: string;
  bindings?: NonstandardEventHandlers;
};

type CustomAttributeHandler<
  Fn extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown
> = (fn: Fn) => AttributeHandlerReturn;

const customAttributes: Record<string, CustomAttributeHandler> = {};

export function addCustomAttribute<Fn extends (...args: unknown[]) => unknown>(
  name: string,
  handler: CustomAttributeHandler<Fn>
): void {
  customAttributes[name] = handler as CustomAttributeHandler;
}

export function isCustomAttribute(name: string): boolean {
  return customAttributes.hasOwnProperty(name);
}

export function parseCustomAttribute<Fn extends (...args: any[]) => any>(
  name: string,
  value: Fn
): AttributeHandlerReturn {
  const handler = customAttributes[name] as CustomAttributeHandler<Fn>;
  return handler(value);
}
