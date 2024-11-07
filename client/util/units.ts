export function inchesToFeetAndInches(inches: number) {
  const feet = Math.floor(inches / 12);
  const outInches = inches % 12;
  return { feet, inches: outInches };
}
