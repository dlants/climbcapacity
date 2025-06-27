/**
 * Select the first type when it isn't `never`, otherwise use the fallback type. Equivalent to the nullish coalescing
 * operator (`??`) where `never` is equivalent to `null` or `undefined`.
 *
 * @example
 * // Given a union type for different message formats
 * type Message =
 *   | { type: 'text'; content: string }
 *   | { type: 'image'; url: string };
 *
 * // Extract works for the first case
 * type TextMessage = Coalesce
 *   Extract<Message, { type: 'text' }>,  // { type: 'text'; content: string }
 *   never                                // Not used (fallback)
 * >; // Result: { type: 'text'; content: string }
 *
 * // But if we try to extract a non-existent type, it falls back
 * type AudioMessage = Coalesce
 *   Extract<Message, { type: 'audio' }>, // never (no match)
 *   { type: 'audio'; src: string }       // Fallback used
 * >; // Result: { type: 'audio'; src: string }
 */
export type Coalesce<Preferred, Fallback> = [Preferred] extends [never]
  ? Fallback
  : Preferred;

import { createSpec, EmptyObject, type Spec, type ViewSpec } from './create-spec';
import { Switch } from './switch';

export function SwitchUnion<
  Union extends { [_ in DiscriminantKey]: string },
  DiscriminantKey extends PropertyKey,
  ChildByDiscriminant = {
    [Discriminant in Union[DiscriminantKey]]: (
      /**
       * When `Union` is a union of objects, extract an object discriminated by `Discriminant`.
       * - `Union`: `{ type: 'a'; data: number } | { type: 'b'; data: number }`
       * - `DiscriminantKey`: `'type'`
       * - `Discriminant`: `'a' | 'b'`
       * - `getMember` for `'a'`: `() => { type: 'a'; data: number }`
       *
       * When `Union` is a single object with a property discriminated by `Discriminant`, re-map `Union` with that
       * discriminant.
       * - `Union`: `{ type: 'a' | 'b'; data: number }`
       * - `DiscriminantKey`: `'type'`
       * - `Discriminant`: `'a' | 'b'`
       * - `getMember` for `'a'`: `() => { type: 'a'; data: number }`
       */
      getMember: () => Coalesce<
        Extract<Union, { [_ in DiscriminantKey]: Discriminant }>,
        {
          [Key in keyof Union]: Key extends DiscriminantKey
          ? Discriminant
          : Union[Key];
        }
      >
    ) => Spec;
  }
>(
  getUnion: () => Union,
  key: DiscriminantKey,
  childByDiscriminant: [string] extends [keyof NoInfer<ChildByDiscriminant>]
    ? EmptyObject // Disallow `Union` when its discriminant is not a subset of `string`.
    : NoInfer<ChildByDiscriminant>
): ViewSpec;

export function SwitchUnion<Union extends string>(
  getUnion: () => Union,
  childByMember: string extends Union
    ? EmptyObject // Disallow `Union` when not a subset of `string`.
    : {
      [Member in Union]: (getMember: () => Member) => Spec;
    }
): ViewSpec;

export function SwitchUnion(
  getUnion: (() => Record<PropertyKey, unknown>) | (() => string), // Object | string
  secondParameter:
    | PropertyKey // Key
    | Record<string, (getMember: () => string) => Spec>, // Child by member
  thirdParameter?: Record<
    string,
    (getMember: () => Record<PropertyKey, unknown>) => Spec
  > // Child by discriminant
) {
  const isStringUnion = typeof thirdParameter === 'undefined';

  let key: () => string;
  let children: (value: string) => Spec | undefined;

  if (isStringUnion) {
    key = getUnion as () => string;
    children = (member) => {
      // `childByMember[member]` can be `null` or `undefined` within tests.
      const childByMember = secondParameter as Record<
        string,
        (getMember: () => string) => Spec
      >;
      return childByMember[member]?.(() => member);
    };
  } else {
    key = () => {
      const union = (getUnion as () => Record<string, string>)();
      const key = secondParameter as string;

      // Union can be `null` or `undefined` within tests.
      return union && union[key];
    };
    children = (discriminant) => {
      // `childByDiscriminant[discriminant]` can be `null` or `undefined` within tests.
      const childByDiscriminant = thirdParameter!;
      return childByDiscriminant[discriminant]?.(
        getUnion as () => Record<PropertyKey, unknown>
      );
    };
  }

  return {
    ...createSpec<typeof Switch<string>>(Switch, {
      key,
      children
    }),
    viewName: 'SwitchUnion'
  };
}
