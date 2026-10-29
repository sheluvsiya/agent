import { parseCsv } from '../csv';
import { requireTenant } from '../tenancy/tenant-context';
import { isPossibleDuplicate } from './duplicates';
import type { InvoiceRepository } from './repository';
import { checkHeaders, validateInvoiceRecord } from './validation';
import type { ImportResult, RowIssue, TenantContext, ValidInvoice } from './types';

export class InvoiceImportError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invoice file rejected: ${problems.join('; ')}`);
    this.name = 'InvoiceImportError';
  }
}

/**
 * Imports a CSV of invoices for one organisation.
 *
 * Policy: a file with a bad header is rejected outright. Within the data rows,
 * invalid rows are rejected individually and the valid ones are still stored.
 * Rows that duplicate an invoice number already in the batch or already stored
 * are rejected. Possible duplicates (same customer, total and date, different
 * number) are stored but reported as warnings for human review.
 */
export class InvoiceImportService {
  constructor(private readonly invoices: InvoiceRepository) {}

  async importCsv(ctx: TenantContext, csvText: string): Promise<ImportResult> {
    const tenant = requireTenant(ctx);

    const table = parseCsv(csvText);
    if (table.length === 0) throw new InvoiceImportError(['File is empty']);

    const headers = table[0]!.map((h) => h.trim().toLowerCase());
    const headerProblems = checkHeaders(headers);
    if (headerProblems.length > 0) throw new InvoiceImportError(headerProblems);

    const rejected: RowIssue[] = [];
    const warnings: RowIssue[] = [];
    const accepted: ValidInvoice[] = [];
    const seenKeys = new Map<string, number>();

    const existing = await this.invoices.listAll(tenant.orgId);
    const existingKeys = new Set(existing.map((i) => i.invoiceKey));

    for (let r = 1; r < table.length; r++) {
      const cells = table[r]!;
      const rowNumber = r;

      if (cells.length !== headers.length) {
        rejected.push({ row: rowNumber, message: `Expected ${headers.length} columns, found ${cells.length}` });
        continue;
      }

      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        record[h] = cells[idx] ?? '';
      });

      const result = validateInvoiceRecord(record, rowNumber);
      if (!result.ok) {
        rejected.push(...result.issues);
        continue;
      }

      const invoice = result.invoice;

      if (existingKeys.has(invoice.invoiceKey)) {
        rejected.push({ row: rowNumber, field: 'invoice_number', message: `Invoice ${invoice.invoiceNumber} already exists` });
        continue;
      }
      const firstRow = seenKeys.get(invoice.invoiceKey);
      if (firstRow !== undefined) {
        rejected.push({ row: rowNumber, field: 'invoice_number', message: `Duplicate of row ${firstRow} in this file` });
        continue;
      }

      const possible = [...existing, ...accepted].find((other) => isPossibleDuplicate(other, invoice));
      if (possible) {
        warnings.push({
          row: rowNumber,
          message: `Possible duplicate of invoice ${possible.invoiceNumber} (same customer, total and issue date)`,
        });
      }

      seenKeys.set(invoice.invoiceKey, rowNumber);
      accepted.push(invoice);
    }

    if (accepted.length > 0) {
      await this.invoices.insertMany(tenant.orgId, accepted);
    }

    return { inserted: accepted.length, rejected, warnings };
  }
}
