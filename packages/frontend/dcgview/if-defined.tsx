import { createSpec, type Spec } from './create-spec';
import { Switch } from './switch';

export function IfDefined<T>(
  getter: () => T,
  callback: (getter: () => NonNullable<T>) => Spec,
  fallback?: () => Spec
) {
  const spec = createSpec<typeof Switch<boolean>>(Switch, {
    key: () => {
      const key = getter();
      return key !== null && key !== undefined;
    },
    children: (isDefined) =>
      isDefined ? callback(getter as () => NonNullable<T>) : fallback?.()
  });

  return {
    ...spec,
    viewName: 'IfDefined'
  };
}
