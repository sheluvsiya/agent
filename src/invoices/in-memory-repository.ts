import type { InvoiceRepository } from './repository';
import type { StoredInvoice, ValidInvoice } from './types';

/** Test and development adapter. Data is partitioned by org so cross-tenant reads are impossible. */
export class InMemoryInvoiceRepository implements InvoiceRepository {
  private readonly byOrg = new Map<string, StoredInvoice[]>();

  async listAll(orgId: string): Promise<StoredInvoice[]> {
    return [...(this.byOrg.get(orgId) ?? [])];
  }

  async findByInvoiceKeys(orgId: string, keys: string[]): Promise<StoredInvoice[]> {
    const wanted = new Set(keys);
    return (this.byOrg.get(orgId) ?? []).filter((inv) => wanted.has(inv.invoiceKey));
  }

  async insertMany(orgId: string, invoices: ValidInvoice[]): Promise<void> {
    const list = this.byOrg.get(orgId) ?? [];
    for (const inv of invoices) {
      if (list.some((existing) => existing.invoiceKey === inv.invoiceKey)) {
        throw new Error(`Unique violation for invoice ${inv.invoiceNumber}`);
      }
      list.push({ ...inv, orgId });
    }
    this.byOrg.set(orgId, list);
  }
}
