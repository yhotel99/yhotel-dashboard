/** Max digits for VND input (999.999.999.999 — well within Number.MAX_SAFE_INTEGER). */
export const MAX_VND_DIGITS = 12;

/**
 * Extract only digit characters from any user input (typed, pasted, formatted).
 * Handles "1.500.000", "1,500,000", "1 500 000", "1500000", etc.
 */
export function extractVndDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normalize a raw digit string for VND amount storage.
 * Strips leading zeros and caps length to avoid precision loss.
 */
export function normalizeVndDigits(value: string): string {
  const digits = extractVndDigits(value);
  if (digits === "") return "";

  const withoutLeadingZeros = digits.replace(/^0+/, "");
  if (withoutLeadingZeros === "") return "0";

  return withoutLeadingZeros.slice(0, MAX_VND_DIGITS);
}

/**
 * Parse a digit string to a safe integer amount (0 when empty/invalid).
 */
export function parseVndDigits(digits: string): number {
  const normalized = normalizeVndDigits(digits);
  if (normalized === "" || normalized === "0") return 0;

  const parsed = parseInt(normalized, 10);
  return Number.isSafeInteger(parsed) ? parsed : 0;
}

/**
 * Display value for a VND amount input.
 * Shows raw digits while focused; formatted with thousand separators when blurred.
 */
export function formatVndAmountDisplay(
  digits: string,
  isFocused: boolean,
  formatFn: (value: string) => string
): string {
  if (digits === "") return "";
  return isFocused ? digits : formatFn(digits);
}
