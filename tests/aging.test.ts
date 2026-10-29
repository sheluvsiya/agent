import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agingBucket, daysOverdue } from '../src/invoices/aging';

test('calculates days overdue across a month boundary', () => {
  assert.equal(daysOverdue('2026-01-31', '2026-03-01'), 29);
});

test('not-yet-due invoices are negative or zero and bucket as current', () => {
  assert.equal(daysOverdue('2026-03-10', '2026-03-01'), -9);
  assert.equal(agingBucket(-9), 'current');
  assert.equal(agingBucket(0), 'current');
});

test('bucket boundaries are inclusive at the upper edge', () => {
  assert.equal(agingBucket(1), '1-30');
  assert.equal(agingBucket(30), '1-30');
  assert.equal(agingBucket(31), '31-60');
  assert.equal(agingBucket(60), '31-60');
  assert.equal(agingBucket(61), '61-90');
  assert.equal(agingBucket(90), '61-90');
  assert.equal(agingBucket(91), '90+');
});
