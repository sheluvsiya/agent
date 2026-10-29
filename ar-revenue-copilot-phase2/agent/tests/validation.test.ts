import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateInvoiceRecord } from '../src/invoices/validation';

const good = {
  invoice_number: ' INV-001 ',
  customer_ref: 'CUST-9',
  customer_name: 'Acme',
  issue_date: '2026-01-10',
  due_date: '2026-02-09',
  currency: 'usd',
  total: '1500.00',
  paid: '500.00',
};

test('accepts a valid row and computes outstanding balance in minor units', () => {
  const result = validateInvoiceRecord(good, 1);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.invoice.invoiceNumber, 'INV-001');
  assert.equal(result.invoice.invoiceKey, 'inv-001');
  assert.equal(result.invoice.currency, 'USD');
  assert.equal(result.invoice.outstandingMinor, 100000);
});

test('rejects invalid dates, due-before-issue, bad currency and paid over total', () => {
  const result = validateInvoiceRecord(
    { ...good, issue_date: '2026-13-01', due_date: '2026-02-30', currency: 'DOLLARS', paid: '9999.00' },
    7,
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  const fields = result.issues.map((i) => i.field);
  assert.ok(fields.includes('issue_date'));
  assert.ok(fields.includes('due_date'));
  assert.ok(fields.includes('currency'));
  assert.ok(fields.includes('paid'));
  assert.ok(result.issues.every((i) => i.row === 7));
});

test('rejects due date before issue date', () => {
  const result = validateInvoiceRecord({ ...good, due_date: '2025-12-01' }, 2);
  assert.equal(result.ok, false);
});
