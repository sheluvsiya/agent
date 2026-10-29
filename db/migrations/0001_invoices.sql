-- Phase 2: organisations and invoices with tenant isolation.
-- Every tenant-owned table carries org_id and every unique key includes it.

CREATE TABLE organisations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  invoice_number    text NOT NULL,
  invoice_key       text NOT NULL,              -- normalised invoice number (trimmed, lower case)
  customer_ref      text NOT NULL,
  customer_name     text,
  issue_date        date NOT NULL,
  due_date          date NOT NULL,
  currency          char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  total_minor       bigint NOT NULL CHECK (total_minor >= 0),
  paid_minor        bigint NOT NULL DEFAULT 0 CHECK (paid_minor >= 0),
  outstanding_minor bigint GENERATED ALWAYS AS (total_minor - paid_minor) STORED,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_paid_not_over_total CHECK (paid_minor <= total_minor),
  CONSTRAINT invoices_due_after_issue CHECK (due_date >= issue_date),
  CONSTRAINT invoices_org_key_unique UNIQUE (org_id, invoice_key)
);

CREATE INDEX invoices_org_due_idx ON invoices (org_id, due_date);
CREATE INDEX invoices_org_customer_idx ON invoices (org_id, customer_ref);
