import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryInvoiceRepository } from '../src/invoices/in-memory-repository';
import { InvoiceImportService, InvoiceImportError } from '../src/invoices/import-service';
import { TenantError } from '../src/tenancy/tenant-context';

const HEADER = 'invoice_number,customer_ref,customer_name,issue_date,due_date,currency,total,paid';
const ORG_A = { orgId: 'org-a', userId: 'user-a' };
const ORG_B = { orgId: 'org-b', userId: 'user-b' };

test('imports valid rows and rejects bad rows without discarding good ones', async () => {
  const repo = new InMemoryInvoiceRepository();
  const svc = new InvoiceImportService(repo);
  const csv = [
    HEADER,
    'INV-1,C1,Acme,2026-01-01,2026-01-31,USD,100.00,0',
    'INV-2,C1,Acme,2026-01-01,2026-01-05,USD,abc,0',
    'INV-3,C2,Beta,2026-01-02,2026-02-01,USD,250.00,50.00',
  ].join('\n');

  const result = await svc.importCsv(ORG_A, csv);
  assert.equal(result.inserted, 2);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0]!.row, 2);
  assert.equal(result.rejected[0]!.field, 'total');
  assert.equal((await repo.listAll(ORG_A.orgId)).length, 2);
});

test('rejects duplicates within a file and against stored invoices', async () => {
  const repo = new InMemoryInvoiceRepository();
  const svc = new InvoiceImportService(repo);
  await svc.importCsv(ORG_A, [HEADER, 'INV-1,C1,,2026-01-01,2026-01-31,USD,10.00,0'].join('\n'));

  const result = await svc.importCsv(
    ORG_A,
    [HEADER, 'inv-1,C1,,2026-01-01,2026-01-31,USD,10.00,0', 'INV-9,C3,,2026-01-01,2026-01-31,USD,20.00,0', 'INV-9,C3,,2026-01-01,2026-01-31,USD,20.00,0'].join('\n'),
  );
  assert.equal(result.inserted, 1);
  assert.equal(result.rejected.length, 2);
  assert.match(result.rejected[0]!.message, /already exists/);
  assert.match(result.rejected[1]!.message, /Duplicate of row 2/);
});

test('flags possible duplicates as warnings but still stores them', async () => {
  const repo = new InMemoryInvoiceRepository();
  const svc = new InvoiceImportService(repo);
  const result = await svc.importCsv(
    ORG_A,
    [HEADER, 'INV-1,C1,,2026-01-01,2026-01-31,USD,75.00,0', 'INV-2,C1,,2026-01-01,2026-01-31,USD,75.00,0'].join('\n'),
  );
  assert.equal(result.inserted, 2);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0]!.message, /Possible duplicate of invoice INV-1/);
});

test('rejects the whole file when required headers are missing', async () => {
  const svc = new InvoiceImportService(new InMemoryInvoiceRepository());
  await assert.rejects(
    svc.importCsv(ORG_A, 'invoice_number,customer_ref\nINV-1,C1'),
    (err: unknown) => err instanceof InvoiceImportError && err.problems.some((p) => p.includes('issue_date')),
  );
});

test('tenant isolation: one organisation cannot see or collide with another', async () => {
  const repo = new InMemoryInvoiceRepository();
  const svc = new InvoiceImportService(repo);
  await svc.importCsv(ORG_A, [HEADER, 'INV-1,C1,,2026-01-01,2026-01-31,USD,10.00,0'].join('\n'));

  assert.equal((await repo.listAll(ORG_B.orgId)).length, 0);
  assert.equal((await repo.findByInvoiceKeys(ORG_B.orgId, ['inv-1'])).length, 0);

  const result = await svc.importCsv(ORG_B, [HEADER, 'INV-1,C1,,2026-01-01,2026-01-31,USD,10.00,0'].join('\n'));
  assert.equal(result.inserted, 1);
  assert.equal(result.rejected.length, 0);
});

test('refuses to run without a complete tenant context', async () => {
  const svc = new InvoiceImportService(new InMemoryInvoiceRepository());
  await assert.rejects(
    svc.importCsv({ orgId: '', userId: 'user-a' }, HEADER),
    TenantError,
  );
  await assert.rejects(
    svc.importCsv(undefined as unknown as { orgId: string; userId: string }, HEADER),
    TenantError,
  );
});
