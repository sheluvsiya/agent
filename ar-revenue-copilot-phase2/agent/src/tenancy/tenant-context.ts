import type { TenantContext } from '../invoices/types';

/**
 * Every service method that touches tenant data must receive a TenantContext
 * derived from the authenticated session, never from client-supplied fields
 * in the request body. This guard fails closed if the context is incomplete.
 */
export function requireTenant(ctx: TenantContext | undefined | null): TenantContext {
  if (!ctx || !ctx.orgId || !ctx.userId) {
    throw new TenantError('Missing tenant context');
  }
  return ctx;
}

export class TenantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantError';
  }
}
