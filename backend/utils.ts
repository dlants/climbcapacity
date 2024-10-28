export function assertEnv(varName: string) {
  const value = process.env[varName];
  if (value == undefined) {
    throw new Error(`Expected env var ${varName} to be defined.`);
  }

  return value;
}
