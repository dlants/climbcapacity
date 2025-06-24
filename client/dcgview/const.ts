export type Const<T> = {
  (): T;
  isDCGViewConst: true;
};

export function makeConst<T = undefined>(value: T = undefined as T): Const<T> {
  const returnFunction = () => value;
  returnFunction.isDCGViewConst = true;
  return returnFunction as Const<T>;
}

export function isConst(value: unknown): value is Const<unknown> {
  return (
    typeof value === 'function' && !!(value as Const<unknown>).isDCGViewConst
  );
}
