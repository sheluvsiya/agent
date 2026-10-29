import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMinor, parseAmountToMinor } from '../src/money';

test('parses decimal amounts into integer minor units without float error', () => {
  assert.equal(parseAmountToMinor('0.1'), 10);
  assert.equal(parseAmountToMinor('0.10'), 10);
  assert.equal(parseAmountToMinor('1234.5'), 123450);
  assert.equal(parseAmountToMinor('19.99'), 1999);
  assert.equal(parseAmountToMinor('-5.00'), -500);
});

test('rejects malformed amounts', () => {
  assert.equal(parseAmountToMinor('1,000.00'), null);
  assert.equal(parseAmountToMinor('12.345'), null);
  assert.equal(parseAmountToMinor('abc'), null);
  assert.equal(parseAmountToMinor(''), null);
});

test('formats minor units back to decimals', () => {
  assert.equal(formatMinor(12345), '123.45');
  assert.equal(formatMinor(5), '0.05');
  assert.equal(formatMinor(-500), '-5.00');
});
