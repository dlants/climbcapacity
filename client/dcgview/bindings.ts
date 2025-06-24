import { type ViewInstance } from './view';

export function addBinding(view: ViewInstance, name: string, fn: () => void) {
  const bindings = view._bindings[name];
  view._bindings[name] = bindings ? [...bindings, fn] : [fn];
}

export function invokeBinding(view: ViewInstance, name: string) {
  const bindings = view._bindings[name] ?? [];
  bindings.forEach((fn) => fn());
}
