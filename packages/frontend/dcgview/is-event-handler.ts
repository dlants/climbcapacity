export function isEventHandler(string: string) {
  return string.startsWith('on') && string[2] === string[2].toUpperCase();
}
