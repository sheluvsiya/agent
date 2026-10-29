export interface TenantContext {
  orgId: string;
  userId: string;
}

export interface ValidInvoice {
  invoiceNumber: string;
  invoiceKey: string;
  customerRef: string;
  customerName: string | null;
  issueDate: string;
  dueDate: string;
  currency: string;
  totalMinor: number;
  paidMinor: number;
  outstandingMinor: number;
}

export interface StoredInvoice extends ValidInvoice {
  orgId: string;
}

export interface RowIssue {
  /** 1-based row number in the data (header excluded). */
  row: number;
  field?: string;
  message: string;
}

export interface ImportResult {
  /** Invoices accepted and stored. */
  inserted: number;
  /** Rows rejected, with reasons. Valid rows in the same file are still imported. */
  rejected: RowIssue[];
  /** Non-blocking notices, e.g. possible duplicates that need a human look. */
  warnings: RowIssue[];
}
