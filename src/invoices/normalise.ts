/** Canonical key used for duplicate detection: trimmed and lower-cased. */
export function invoiceKeyOf(invoiceNumber: string): string {
  return invoiceNumber.trim().toLowerCase();
}
