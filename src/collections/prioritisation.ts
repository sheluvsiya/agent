import { agingBucket, daysOverdue, type AgingBucket } from '../invoices/aging';
import type { StoredInvoice } from '../invoices/types';

/**
 * Explainable, deterministic collections priority. No AI is involved: the
 * model may later summarise these reasons, but never decides the priority.
 */

export type Priority = 'hold' | 'monitor' | 'high' | 'medium' | 'low' | 'none';

export interface PriorityInput {
  invoice: StoredInvoice;
  asOf: string;
  openDisputes: number;
  /** Date a customer promised to pay, if a promise is on record. */
  promiseDate: string | null;
}

export interface PriorityResult {
  invoiceNumber: string;
  priority: Priority;
  score: number;
  bucket: AgingBucket;
  daysOverdue: number;
  outstandingMinor: number;
  reasons: string[];
}

const HIGH_AMOUNT_MINOR = 1_000_000; // 10,000.00 in the invoice's own currency
const MEDIUM_AMOUNT_MINOR = 100_000; // 1,000.00

const BUCKET_POINTS: Record<AgingBucket, number> = {
  current: 0,
  '1-30': 1,
  '31-60': 2,
  '61-90': 3,
  '90+': 4,
};

export function prioritise(input: PriorityInput): PriorityResult {
  const { invoice, asOf } = input;
  const overdue = daysOverdue(invoice.dueDate, asOf);
  const bucket = agingBucket(overdue);
  const base = {
    invoiceNumber: invoice.invoiceNumber,
    bucket,
    daysOverdue: overdue,
    outstandingMinor: invoice.outstandingMinor,
  };

  if (invoice.outstandingMinor <= 0) {
    return { ...base, priority: 'none', score: 0, reasons: ['Nothing outstanding'] };
  }

  if (input.openDisputes > 0) {
    return {
      ...base,
      priority: 'hold',
      score: 0,
      reasons: ['Open dispute: resolve before chasing payment'],
    };
  }

  if (input.promiseDate !== null && input.promiseDate >= asOf) {
    return {
      ...base,
      priority: 'monitor',
      score: 0,
      reasons: [`Customer promised payment by ${input.promiseDate}`],
    };
  }

  if (overdue <= 0) {
    return {
      ...base,
      priority: 'none',
      score: 0,
      reasons: [`Not yet due (due ${invoice.dueDate})`],
    };
  }

  const reasons: string[] = [`${overdue} day(s) overdue (${bucket})`];
  let score = BUCKET_POINTS[bucket];

  if (invoice.outstandingMinor >= HIGH_AMOUNT_MINOR) {
    score += 2;
    reasons.push('Large outstanding amount');
  } else if (invoice.outstandingMinor >= MEDIUM_AMOUNT_MINOR) {
    score += 1;
    reasons.push('Medium outstanding amount');
  }

  const priority: Priority = score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';
  return { ...base, priority, score, reasons };
}

const ORDER: Record<Priority, number> = { hold: 0, high: 1, medium: 2, low: 3, monitor: 4, none: 5 };

/** Sorts so the most urgent work appears first; ties broken by the larger balance. */
export function sortForCollections(results: PriorityResult[]): PriorityResult[] {
  return [...results].sort(
    (a, b) =>
      ORDER[a.priority] - ORDER[b.priority] ||
      b.score - a.score ||
      b.outstandingMinor - a.outstandingMinor,
  );
}
