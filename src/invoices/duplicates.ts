import type { ValidInvoice } from './types';

/** Same customer, total and issue date under a different invoice number. */
export function isPossibleDuplicate(a: ValidInvoice, b: ValidInvoice): boolean {
  return (
    a.invoiceKey !== b.invoiceKey &&
    a.customerRef.toLowerCase() === b.customerRef.toLowerCase() &&
    a.totalMinor === b.totalMinor &&
    a.issueDate === b.issueDate
  );
}
