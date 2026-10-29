# AR Revenue Copilot

AI-assisted accounts receivable and collections for small businesses.
Every organisation's data is isolated; AI suggestions are never authoritative.

## Status: Phase 2 foundation

Implemented and tested:
- Money as integer minor units (no floating point for stored amounts)
- CSV invoice import with row-level validation and per-row rejection
- Duplicate detection: exact invoice number (within a file and against stored data), and possible-duplicate warnings
- Deterministic days-overdue and aging buckets
- Explainable collections priority (`hold`, `monitor`, `high`, `medium`, `low`, `none`)
- Tenant guard: all tenant data access requires an orgId from the session context
- PostgreSQL schema with org-scoped unique keys and balance constraints

Not yet implemented: HTTP API, authentication, PostgreSQL repository adapter, AI gateway, email, reply classification, reporting.

## Layout

```
src/money.ts                    minor-unit parsing and formatting
src/dates.ts                    ISO date validation and day arithmetic (UTC)
src/csv.ts                      CSV parser (quotes, escapes, CRLF)
src/invoices/validation.ts      row validation, header checks
src/invoices/import-service.ts  import orchestration and duplicate policy
src/invoices/aging.ts           days overdue and aging buckets
src/invoices/repository.ts      persistence port (orgId required on every call)
src/collections/prioritisation.ts  explainable priority rules
src/tenancy/tenant-context.ts   fail-closed tenant guard
db/migrations/0001_invoices.sql PostgreSQL schema
tests/                          node:test suites
```

## Running

```bash
npm install
npm run typecheck
npm test
```

Requires Node 20 or later. Tests use only the in-memory repository; no database is needed yet.

## Import format

Required columns: `invoice_number, customer_ref, issue_date, due_date, currency, total`
Optional columns: `customer_name, paid`

Dates are `YYYY-MM-DD`. Amounts are decimal strings with at most two decimal places, with no thousands separators.

Policy: a file with missing required headers is rejected entirely. Otherwise bad rows are rejected individually and good rows are stored.

## Decisions to confirm

1. **Backend framework.** The domain core is framework-free so it can sit behind NestJS. Confirm before adding HTTP.
2. **ORM.** The migration is raw SQL. Prisma or TypeORM can generate from it or replace it. Confirm the choice.
3. **Priority thresholds** (`10,000.00` and `1,000.00`) are in each invoice's own currency with no conversion. Multi-currency needs a rate source before this is trusted.
4. **Partial import.** Good rows are stored even when others fail. Some teams want all-or-nothing; say so if that's the requirement.
