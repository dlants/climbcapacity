export function assertUnreachable(val: never, message?: string): never {
  throw new Error(`Unreachable case of val ${val} detected. ${message}`);
}

export type Success<T> = {
  status: 'success'
  value: T
}

export type Fail = {
  status: 'fail'
  error: string
}

export type Result<T> = Success<T> | Fail
