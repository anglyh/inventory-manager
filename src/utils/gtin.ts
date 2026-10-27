/** Lengths of the GS1 codes printed on retail products: EAN-8, UPC-A, EAN-13 and GTIN-14. */
export const GTIN_LENGTHS = [8, 12, 13, 14] as const;

/**
 * True when `code` is a GTIN with a valid GS1 check digit.
 * The last digit is the check digit; the others are weighted 3,1,3,1… starting from the right.
 */
export function isValidGtin(code: string): boolean {
  if (!/^\d+$/.test(code) || !(GTIN_LENGTHS as readonly number[]).includes(code.length)) return false;

  const digits = [...code].map(Number);
  const checkDigit = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);

  return (10 - (sum % 10)) % 10 === checkDigit;
}
