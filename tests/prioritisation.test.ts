import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prioritise, sortForCollections, type PriorityInput } from '../src/collections/prioritisation';
import type { StoredInvoice } from '../src/invoices/types';

function invoice(overrides: Partial<StoredInvoice> = {}): StoredInvoice {
  return {
    orgId: 'org-a',
    invoiceNumber: 'INV-1',
    invoiceKey: 'inv-1',
    customerRef: 'C1',
    customerName: null,
    issueDate: '2026-01-01',
    dueDate: '2026-01-31',
    currency: 'USD',
    totalMinor: 50000,
    paidMinor: 0,
    outstandingMinor: 50000,
    ...overrides,
  };
}

const base: Omit<PriorityInput, 'invoice'> = { asOf: '2026-03-15', openDisputes: 0, promiseDate: null };

test('open disputes put the invoice on hold regardless of age', () => {
  const r = prioritise({ ...base, invoice: invoice(), openDisputes: 1 });
  assert.equal(r.priority, 'hold');
});

test('a promise still in the future is monitored, not chased', () => {
  const r = prioritise({ ...base, invoice: invoice(), promiseDate: '2026-03-20' });
  assert.equal(r.priority, 'monitor');
  assert.match(r.reasons[0]!, /promised payment by 2026-03-20/);
});

test('a broken promise falls through to normal priority', () => {
  const r = prioritise({ ...base, invoice: invoice(), promiseDate: '2026-03-01' });
  assert.notEqual(r.priority, 'monitor');
});

test('paid-in-full invoices are excluded', () => {
  const r = prioritise({ ...base, invoice: invoice({ outstandingMinor: 0, paidMinor: 50000 }) });
  assert.equal(r.priority, 'none');
});

test('not-yet-due invoices are excluded from chasing', () => {
  const r = prioritise({ ...base, asOf: '2026-01-15', invoice: invoice() });
  assert.equal(r.priority, 'none');
});

test('older and larger balances rank higher', () => {
  const old = prioritise({ ...base, invoice: invoice({ dueDate: '2025-10-01', outstandingMinor: 2_000_000 }) });
  const recent = prioritise({ ...base, invoice: invoice({ dueDate: '2026-03-01', outstandingMinor: 5000 }) });
  assert.equal(old.priority, 'high');
  assert.equal(recent.priority, 'low');
});

test('sortForCollections puts holds first and monitored items near the end', () => {
  const results = [
    prioritise({ ...base, invoice: invoice({ invoiceNumber: 'A', dueDate: '2025-10-01', outstandingMinor: 2_000_000 }) }),
    prioritise({ ...base, invoice: invoice({ invoiceNumber: 'B' }), openDisputes: 1 }),
    prioritise({ ...base, invoice: invoice({ invoiceNumber: 'C' }), promiseDate: '2026-04-01' }),
  ];
  const sorted = sortForCollections(results).map((r) => r.invoiceNumber);
  assert.deepEqual(sorted, ['B', 'A', 'C']);
});
