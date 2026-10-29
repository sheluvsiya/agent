import type { StoredInvoice, ValidInvoice } from './types';

/**
 * Persistence port for invoices. Every method takes orgId explicitly so that
 * tenant scoping cannot be forgotten. The PostgreSQL adapter must add
 * `WHERE org_id = $1` to every query.
 */
export interface InvoiceRepository {
  listAll(orgId: string): Promise<StoredInvoice[]>;
  findByInvoiceKeys(orgId: string, keys: string[]): Promise<StoredInvoice[]>;
  insertMany(orgId: string, invoices: ValidInvoice[]): Promise<void>;
}
