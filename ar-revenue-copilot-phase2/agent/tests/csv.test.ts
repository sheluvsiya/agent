import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../src/csv';

test('parses simple rows', () => {
  assert.deepEqual(parseCsv('a,b\n1,2\n'), [['a', 'b'], ['1', '2']]);
});

test('handles quoted commas, escaped quotes and CRLF', () => {
  const rows = parseCsv('name,note\r\n"Smith, J","said ""hi"""\r\n');
  assert.deepEqual(rows, [['name', 'note'], ['Smith, J', 'said "hi"']]);
});

test('throws on unterminated quotes', () => {
  assert.throws(() => parseCsv('a,"b\n'), /unterminated/);
});
