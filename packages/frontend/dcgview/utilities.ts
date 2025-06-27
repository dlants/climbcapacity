/**
 * Converts a union type `Union` to an intersection type.
 *
 * @template Union - The union type to convert.
 * @returns The resulting intersection type.
 */
export type UnionToIntersection<Union> = (
  Union extends unknown ? (x: Union) => void : never
) extends (x: infer Intersection) => void
  ? Intersection
  : never;

/**
 * Conditional type that checks if two types `X` and `Y` are equal. If they
 * are equal, type `A` is returned, otherwise type `B` is returned.
 *
 * Utilizes distributive conditional types and conditional type inference to
 * achieve the comparison.
 *
 * @template X The first type to compare.
 * @template Y The second type to compare.
 * @template A The type to return if `X` and `Y` are equal. Defaults to `X`.
 * @template B The type to return if `X` and `Y` are not equal. Defaults to `never`.
 *
 * @returns `A` if `X` is equal to `Y`, otherwise `B`.
 */
export type IfEquals<X, Y, A = X, B = never> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

/**
 * Constructs a type consisting of the set of keys of `Value` that are writable
 * (not readonly). This type iterates over each property key `Key` of type `Value`,
 * and uses `IfEquals` to check if making the property `Key` writable changes
 * the type. If it does not, the key `Key` is included in the resultant type.
 *
 * @template Value The object type to determine writable keys from.
 *
 * @returns A union type of the keys of `Value` that are writable.
 */
export type WritableKeys<Value> = {
  [Key in keyof Value]-?: IfEquals<
    { [K in Key]: Value[Key] },
    { -readonly [K in Key]: Value[Key] },
    Key
  >;
}[keyof Value];

/**
 * Converts a camelCase string to kebab-case.
 * @template String - The input string type.
 * @template Accumulator - The accumulator for the resulting string.
 */
export type CamelCaseToKebabCase<
  String extends string,
  Accumulator extends string = ''
> = String extends `${infer FirstCharacter}${infer RemainingCharacters}`
  ? CamelCaseToKebabCase<
      RemainingCharacters,
      `${Accumulator}${FirstCharacter extends Lowercase<FirstCharacter> ? '' : '-'}${Lowercase<FirstCharacter>}`
    >
  : Accumulator;

/**
 * Converts the keys of an object from camelCase to kebab-case.
 * @template CamelCase - The input object type with camelCase keys.
 */
export type CamelCaseObjectToKebabCaseObject<
  CamelCase extends Record<string, unknown> | CSSStyleDeclaration
> = {
  [Key in CamelCase extends CSSStyleDeclaration
    ? Extract<keyof CamelCase, string>
    : keyof CamelCase as CamelCaseToKebabCase<Key>]: CamelCase[Key];
};

/**
 * A string representation of a type.
 * @template Value - The input type to be converted to a string.
 */
export type StringLike<Value> = Value extends string | number | boolean | bigint
  ? `${Value}`
  : never;

/**
 * A `StringLike` or `Value` when `Value` matches `Like`, otherwise `Value`.
 *
 * @template Value - The input type.
 * @template Like - The type to compare against. Defaults to `Value`.
 */
export type MaybeStringLike<Value, Like = Value> = Like extends Like
  ? Value extends Like
    ? Value | StringLike<Like>
    : Value
  : never;
