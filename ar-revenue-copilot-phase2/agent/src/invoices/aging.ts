import { daysBetween } from '../dates';

export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';

/** Days past due. Zero or negative means not yet due. Calculated, never estimated by AI. */
export function daysOverdue(dueDate: string, asOf: string): number {
  return daysBetween(dueDate, asOf);
}

export function agingBucket(overdueDays: number): AgingBucket {
  if (overdueDays <= 0) return 'current';
  if (overdueDays <= 30) return '1-30';
  if (overdueDays <= 60) return '31-60';
  if (overdueDays <= 90) return '61-90';
  return '90+';
}
