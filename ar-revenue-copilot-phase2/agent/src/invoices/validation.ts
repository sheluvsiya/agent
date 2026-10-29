import { isIsoDate } from '../dates';
import { parseAmountToMinor } from '../money';
import { invoiceKeyOf } from './normalise';
import type { RowIssue, ValidInvoice } from './types';

export const REQUIRED_HEADERS = [
  'invoice_number',
  'customer_ref',
  'issue_date',
  'due_date',
  'currency',
  'total',
] as const;

export const OPTIONAL_HEADERS = ['customer_name', 'paid'] as const;

export type RowResult =
  | { ok: true; invoice: ValidInvoice; warnings: RowIssue[] }
  | { ok: false; issues: RowIssue[] };

/**
 * Validates one CSV row. `record` maps lower-case header names to raw cell values.
 * Pure function: no I/O, no dates from the system clock.
 */
export function validateInvoiceRecord(record: Record<string, string>, row: number): RowResult {
  const issues: RowIssue[] = [];
  const get = (name: string): string => (record[name] ?? '').trim();

  const invoiceNumber = get('invoice_number');
  if (!invoiceNumber) issues.push({ row, field: 'invoice_number', message: 'Invoice number is required' });

  const customerRef = get('customer_ref');
  if (!customerRef) issues.push({ row, field: 'customer_ref', message: 'Customer reference is required' });

  const issueDate = get('issue_date');
  if (!isIsoDate(issueDate)) {
    issues.push({ row, field: 'issue_date', message: 'Issue date must be a valid YYYY-MM-DD date' });
  }

  const dueDate = get('due_date');
  if (!isIsoDate(dueDate)) {
    issues.push({ row, field: 'due_date', message: 'Due date must be a valid YYYY-MM-DD date' });
  }

  if (isIsoDate(issueDate) && isIsoDate(dueDate) && dueDate < issueDate) {
    issues.push({ row, field: 'due_date', message: 'Due date cannot be before the issue date' });
  }

  const currency = get('currency').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    issues.push({ row, field: 'currency', message: 'Currency must be a three-letter ISO code, e.g. USD' });
  }

  const totalMinor = parseAmountToMinor(get('total'));
  if (totalMinor === null || totalMinor < 0) {
    issues.push({ row, field: 'total', message: 'Total must be a non-negative amount with up to two decimals' });
  }

  const paidRaw = get('paid');
  let paidMinor = 0;
  if (paidRaw !== '') {
    const parsed = parseAmountToMinor(paidRaw);
    if (parsed === null || parsed < 0) {
      issues.push({ row, field: 'paid', message: 'Paid must be a non-negative amount with up to two decimals' });
    } else {
      paidMinor = parsed;
    }
  }

  if (totalMinor !== null && totalMinor >= 0 && paidMinor > totalMinor) {
    issues.push({ row, field: 'paid', message: 'Paid amount cannot exceed the invoice total' });
  }

  if (issues.length > 0 || totalMinor === null) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    warnings: [],
    invoice: {
      invoiceNumber,
      invoiceKey: invoiceKeyOf(invoiceNumber),
      customerRef,
      customerName: get('customer_name') || null,
      issueDate,
      dueDate,
      currency,
      totalMinor,
      paidMinor,
      outstandingMinor: totalMinor - paidMinor,
    },
  };
}

/** Returns the header problems for a CSV file, or an empty list if it is usable. */
export function checkHeaders(headers: string[]): string[] {
  const normalised = headers.map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter((h) => !normalised.includes(h));
  return missing.map((h) => `Missing required column: ${h}`);
}
