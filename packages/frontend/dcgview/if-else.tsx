import type { Spec } from './create-spec';
import { SwitchUnion } from './switch-union';

export function IfElse(
  predicate: () => boolean,
  cases: {
    true: () => Spec;
    false: () => Spec;
  }
) {
  const spec = SwitchUnion(() => (predicate() ? 'true' : 'false'), cases);
  return {
    ...spec,
    viewName: 'IfElse'
  };
}
