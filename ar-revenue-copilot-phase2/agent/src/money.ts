/**
 * Money is stored as integer minor units (e.g. cents). Floating point is never
 * used for stored or compared amounts.
 */

const DECIMAL_AMOUNT = /^-?\d+(\.\d{1,2})?$/;

/** Parses "1234.5" or "1234.50" into integer minor units. Returns null if invalid. */
export function parseAmountToMinor(raw: string): number | null {
  const s = raw.trim();
  if (!DECIMAL_AMOUNT.test(s)) return null;
  const negative = s.startsWith('-');
  const unsigned = negative ? s.slice(1) : s;
  const [whole, fraction = ''] = unsigned.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor)) return null;
  return negative ? -minor : minor;
}

/** Formats integer minor units as a plain decimal string, e.g. 12345 -> "123.45". */
export function formatMinor(minor: number): string {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100);
  const cents = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${cents}`;
}
